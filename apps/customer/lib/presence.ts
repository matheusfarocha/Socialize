export type PresenceStatus = "active" | "idle";

export interface PresenceProfile {
  userId: string;
  sessionId: string;
  initials: string;
  occupation: string;
  interests: string;
  tableId: string | null;
}

export interface ActiveUserRecord extends PresenceProfile {
  id: string;
  venueId: string;
  lastSeen: string;
  status: PresenceStatus;
}

export interface VenueSummary {
  id: string;
  slug: string;
  name: string;
  branchName: string;
}

export interface TableSummary {
  id: string;
  label: string;
  seats: number;
  zoneId: string;
  zoneName: string;
}

export const HEARTBEAT_INTERVAL_MS = 12_000;
export const STALE_AFTER_MS = 30_000;
export const IDLE_AFTER_MS = 60_000;
export const PEOPLE_PAGE_SIZE = 24;

const PROFILE_STORAGE_PREFIX = "socialize:presence";

function formatTableCoordinate(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : "na";
}

export function buildPresenceStorageKey(venueSlug: string) {
  return `${PROFILE_STORAGE_PREFIX}:${venueSlug}`;
}

export function buildPresenceTableId({
  zoneId,
  identifier,
  x,
  y,
}: {
  zoneId: string;
  identifier: string;
  x: number | null | undefined;
  y: number | null | undefined;
}) {
  return `${zoneId}:${identifier}:${formatTableCoordinate(x)}:${formatTableCoordinate(y)}`;
}

export function createPresenceProfile(options?: {
  sessionId?: string | null;
  tableId?: string | null;
}): PresenceProfile {
  return {
    userId: crypto.randomUUID(),
    sessionId: options?.sessionId ?? crypto.randomUUID(),
    initials: "",
    occupation: "",
    interests: "",
    tableId: options?.tableId ?? null,
  };
}

export function sanitizeProfile(profile: PresenceProfile): PresenceProfile {
  return {
    ...profile,
    initials: profile.initials.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 4),
    occupation: profile.occupation.trim().slice(0, 80),
    interests: profile.interests.trim().slice(0, 120),
    tableId: profile.tableId?.trim() ? profile.tableId.trim() : null,
  };
}

export function isProfileComplete(profile: PresenceProfile | null): profile is PresenceProfile {
  if (!profile) return false;
  return Boolean(profile.initials && profile.occupation && profile.interests);
}

export function readStoredProfile(venueSlug: string): PresenceProfile | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(buildPresenceStorageKey(venueSlug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PresenceProfile>;
    if (!parsed.userId || !parsed.sessionId) return null;

    return sanitizeProfile({
      userId: parsed.userId,
      sessionId: parsed.sessionId,
      initials: parsed.initials ?? "",
      occupation: parsed.occupation ?? "",
      interests: parsed.interests ?? "",
      tableId: parsed.tableId ?? null,
    });
  } catch {
    return null;
  }
}

export function writeStoredProfile(venueSlug: string, profile: PresenceProfile) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(buildPresenceStorageKey(venueSlug), JSON.stringify(sanitizeProfile(profile)));
}

export function getPresenceStatus(lastInteractionAt: number, isHidden: boolean): PresenceStatus {
  if (isHidden || Date.now() - lastInteractionAt > IDLE_AFTER_MS) {
    return "idle";
  }

  return "active";
}

export function isPresenceFresh(lastSeen: string) {
  return Date.now() - new Date(lastSeen).getTime() <= STALE_AFTER_MS;
}

export function sortActiveUsers(users: ActiveUserRecord[]) {
  return [...users].sort((left, right) => {
    if (left.status !== right.status) {
      return left.status === "active" ? -1 : 1;
    }

    const lastSeenDiff = new Date(right.lastSeen).getTime() - new Date(left.lastSeen).getTime();
    if (lastSeenDiff !== 0) return lastSeenDiff;

    return left.initials.localeCompare(right.initials);
  });
}

export function countTableOccupancy(users: ActiveUserRecord[]) {
  return users.reduce<Record<string, number>>((counts, user) => {
    if (!user.tableId) return counts;
    counts[user.tableId] = (counts[user.tableId] ?? 0) + 1;
    return counts;
  }, {});
}

export function findTableSummary(tables: TableSummary[], tableId: string | null | undefined) {
  if (!tableId) return null;
  return tables.find((table) => table.id === tableId || table.label === tableId) ?? null;
}

export function getTableDisplayLabel(tables: TableSummary[], tableId: string | null | undefined) {
  return findTableSummary(tables, tableId)?.label ?? tableId ?? null;
}

export function isPresenceBackendMissing(message?: string | null) {
  if (!message) return false;

  const normalized = message.toLowerCase();
  const referencesPresence =
    normalized.includes("active_users") || normalized.includes("cleanup_active_users");
  const indicatesMissing =
    normalized.includes("schema cache") ||
    normalized.includes("does not exist") ||
    normalized.includes("relation") ||
    normalized.includes("function");

  return referencesPresence && indicatesMissing;
}

export function getPresenceErrorMessage(message?: string | null) {
  if (isPresenceBackendMissing(message)) {
    return "People At The Cafe is not provisioned in Supabase yet. The live presence tables are missing, so guests cannot go visible.";
  }

  return message?.trim() || "People At The Cafe is unavailable right now.";
}
