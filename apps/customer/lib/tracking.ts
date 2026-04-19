import { supabase } from "./supabase";

const SCAN_FLAG_PREFIX = "socialize:scan-logged:";
const SESSION_ID_KEY = "socialize:session-id";

function randomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `s_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

export function getSessionId(): string {
  if (typeof window === "undefined") return "server";
  let id = window.sessionStorage.getItem(SESSION_ID_KEY);
  if (!id) {
    id = randomId();
    window.sessionStorage.setItem(SESSION_ID_KEY, id);
  }
  return id;
}

export async function logScan(venueId: string, tableIdentifier?: string) {
  if (typeof window === "undefined") return;
  const flagKey = `${SCAN_FLAG_PREFIX}${venueId}`;
  if (window.sessionStorage.getItem(flagKey)) return;

  const sessionId = getSessionId();
  const { error } = await supabase.from("qr_scans").insert({
    venue_id: venueId,
    session_id: sessionId,
    table_identifier: tableIdentifier ?? null,
    user_agent: navigator.userAgent.slice(0, 500),
  });
  if (!error) {
    window.sessionStorage.setItem(flagKey, "1");
  }
}

export async function startSession(venueId: string, tableIdentifier: string | null): Promise<string | null> {
  const sessionId = getSessionId();
  const { data, error } = await supabase
    .from("customer_sessions")
    .insert({
      venue_id: venueId,
      table_identifier: tableIdentifier,
      session_id: sessionId,
    })
    .select("id")
    .single();
  if (error || !data) return null;
  return data.id as string;
}

interface EndSessionInput {
  startedAt: Date;
  orderTotal?: number;
  orderCount?: number;
}

export function endSession(sessionRowId: string, input: EndSessionInput) {
  if (typeof window === "undefined") return;
  const endedAt = new Date();
  const durationSeconds = Math.max(0, Math.round((endedAt.getTime() - input.startedAt.getTime()) / 1000));

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/customer_sessions?id=eq.${sessionRowId}`;
  const body = JSON.stringify({
    ended_at: endedAt.toISOString(),
    duration_seconds: durationSeconds,
    order_total: input.orderTotal ?? null,
    order_count: input.orderCount ?? 0,
  });

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  try {
    fetch(url, {
      method: "PATCH",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Prefer: "return=minimal",
      },
      body,
    }).catch(() => {});
  } catch {
    /* best-effort */
  }
}
