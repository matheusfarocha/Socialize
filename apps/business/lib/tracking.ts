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
