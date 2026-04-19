import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI, Type } from "@google/genai";
import {
  computeSignals,
  loadInsightsDataset,
  signalsToTemplateCards,
  type InsightCard,
  type Signal,
} from "@/lib/insights-engine";

const CACHE_TTL_MS = 60 * 60 * 1000;

interface CacheEntry {
  expiresAt: number;
  payload: { cards: InsightCard[]; usedFallback: boolean; model: string };
}

const cache = new Map<string, CacheEntry>();

function authedSupabase(accessToken: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    },
  );
}

async function generateCardsWithGemini(signals: Signal[]): Promise<InsightCard[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are a business analyst for a small hospitality venue (coffee shop or restaurant).
You receive factual signals computed from live order, QR-scan, and presence data.

PREFER cross-signal insights over isolated metric summaries.
A strong insight connects at least TWO of these:
- customer cohort behavior (occupation tags like Founder, Designer, Engineer)
- menu item sales
- time of day
- table or seating behavior
- QR scan behavior
Use cohort_pattern signals as the backbone when they exist and combine them with other signals
(e.g. combine a cohort_growth signal with a peak_hour signal to suggest a targeted promotion).

Example of a strong insight (only if the data supports it):
"Founder check-ins are up 38% this week, and Founders ordered Matcha Latte 2.1x more often than
the average customer at their tables — promote Matcha during afternoon coworking hours."

HARD RULES:
- Use ONLY facts present in the signals. Do not invent numbers, item names, table labels, or
  occupations that aren't in the signals.
- Do not use outside knowledge about demographics (e.g. do not claim "founders are known to
  drink matcha in general" — only claim "in your venue data, founders ordered X more often").
- Keep language conversational, like a helpful coworker — no corporate buzzwords.
- Each card must be actionable, not descriptive.
- "tag" must be 2-3 words (e.g. "Founder Matcha Window", "Designer Lunch Pattern").
- "title" is one punchy sentence that states the cross-signal finding.
- "description" is 1-2 short sentences that weave in specific evidence strings from the signals.
- "cta" is 2-5 words, imperative (e.g. "Promote Matcha", "Create Lunch Combo").
- "severity" must be one of: info, warning, opportunity.
- Return 3-5 cards in total. Prioritize cohort_pattern-based combined insights when available.

Signals (JSON):
${JSON.stringify(signals, null, 2)}`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            tag: { type: Type.STRING },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            cta: { type: Type.STRING },
            severity: { type: Type.STRING, enum: ["info", "warning", "opportunity"] },
          },
          required: ["tag", "title", "description", "cta", "severity"],
        },
      },
    },
  });

  const text = response.text ?? "[]";
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error("Gemini returned non-array");
  return parsed as InsightCard[];
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
    }

    const supabase = authedSupabase(token);
    const { data: userRes, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userRes?.user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { data: venue, error: venueErr } = await supabase
      .from("venues")
      .select("id, slug")
      .eq("owner_id", userRes.user.id)
      .single();
    if (venueErr || !venue) {
      return NextResponse.json({ error: "No venue found for this user" }, { status: 404 });
    }

    const cacheKey = venue.id;
    const now = Date.now();
    const forceRefresh = new URL(req.url).searchParams.get("refresh") === "1";
    const cached = cache.get(cacheKey);
    if (!forceRefresh && cached && cached.expiresAt > now) {
      return NextResponse.json({ ...cached.payload, cached: true });
    }

    const dataset = await loadInsightsDataset(supabase, venue.id);
    const signals = computeSignals(dataset);

    let cards: InsightCard[];
    let model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    let usedFallback = dataset.usedFallback;
    let fallbackReason: string | null = null;

    try {
      cards = await generateCardsWithGemini(signals);
      if (cards.length === 0) throw new Error("Gemini returned 0 cards");
    } catch (error) {
      cards = signalsToTemplateCards(signals);
      fallbackReason = error instanceof Error ? error.message : "Gemini unavailable";
      model = "template-fallback";
    }

    const payload = {
      cards,
      usedFallback,
      windowFallback: dataset.usedFallback,
      model,
      fallbackReason,
      signalCount: signals.length,
    };

    cache.set(cacheKey, { expiresAt: now + CACHE_TTL_MS, payload });

    return NextResponse.json({ ...payload, cached: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
