"use client";

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPublicSupabaseClient } from "@/lib/supabase";
import {
  HEARTBEAT_INTERVAL_MS,
  type PresenceProfile,
  type PresenceStatus,
  type VenueSummary,
  createPresenceProfile,
  getPresenceErrorMessage,
  getPresenceStatus,
  isPresenceBackendMissing,
  isProfileComplete,
  readStoredProfile,
  sanitizeProfile,
  writeStoredProfile,
} from "@/lib/presence";

interface UseVenuePresenceOptions {
  venue: VenueSummary | null;
  defaultTableId?: string | null;
  forcedSessionId?: string | null;
}

export function useVenuePresence({
  venue,
  defaultTableId = null,
  forcedSessionId = null,
}: UseVenuePresenceOptions) {
  const [profile, setProfile] = useState<PresenceProfile | null>(null);
  const [draft, setDraft] = useState<PresenceProfile | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [presenceStatus, setPresenceStatus] = useState<PresenceStatus>("active");
  const [presenceVisible, setPresenceVisible] = useState(false);
  const [presenceAvailable, setPresenceAvailable] = useState(true);

  const lastInteractionRef = useRef(0);
  const cleanupRequestAtRef = useRef(0);
  const profileRef = useRef<PresenceProfile | null>(null);
  const supabaseRef = useRef<ReturnType<typeof createPublicSupabaseClient> | null>(null);

  const getSupabase = useCallback(() => {
    if (!supabaseRef.current) {
      supabaseRef.current = createPublicSupabaseClient();
    }

    return supabaseRef.current;
  }, []);

  useEffect(() => {
    lastInteractionRef.current = Date.now();
  }, []);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    if (!venue) {
      startTransition(() => {
        setProfile(null);
        setDraft(null);
        setEditorOpen(false);
        setSaveError("");
        setPresenceVisible(false);
        setPresenceAvailable(true);
      });
      return;
    }

    const storedProfile = readStoredProfile(venue.slug);
    let nextProfile = storedProfile ?? createPresenceProfile({
      sessionId: forcedSessionId,
      tableId: defaultTableId,
    });

    if (forcedSessionId && nextProfile.sessionId !== forcedSessionId) {
      nextProfile = { ...nextProfile, sessionId: forcedSessionId };
    }

    if (!nextProfile.tableId && defaultTableId) {
      nextProfile = { ...nextProfile, tableId: defaultTableId };
    }

    nextProfile = sanitizeProfile(nextProfile);
    startTransition(() => {
      setProfile(nextProfile);
      setDraft(nextProfile);
      setEditorOpen(!isProfileComplete(nextProfile));
      setSaveError("");
      setPresenceVisible(false);
      setPresenceAvailable(true);
    });
  }, [defaultTableId, forcedSessionId, venue]);

  const syncPresence = useCallback(
    async (nextProfile: PresenceProfile, options?: { quiet?: boolean; overrideStatus?: PresenceStatus }) => {
      if (!venue || !isProfileComplete(nextProfile)) return false;

      const quiet = options?.quiet ?? true;
      if (quiet && !presenceAvailable) return false;

      const status = options?.overrideStatus ?? getPresenceStatus(lastInteractionRef.current, document.hidden);
      setPresenceStatus(status);

      if (!quiet) {
        setSyncing(true);
      }

      const { error } = await getSupabase().from("active_users").upsert(
        {
          venue_id: venue.id,
          user_id: nextProfile.userId,
          session_id: nextProfile.sessionId,
          initials: nextProfile.initials,
          occupation: nextProfile.occupation,
          interests: nextProfile.interests,
          table_id: nextProfile.tableId,
          last_seen: new Date().toISOString(),
          status,
        },
        {
          onConflict: "session_id",
        },
      );

      if (!quiet) {
        setSyncing(false);
      }

      if (error) {
        setPresenceVisible(false);

        if (isPresenceBackendMissing(error.message)) {
          setPresenceAvailable(false);
        }

        if (!quiet || isPresenceBackendMissing(error.message)) {
          setSaveError(getPresenceErrorMessage(error.message));
        }

        return false;
      }

      setPresenceAvailable(true);
      setPresenceVisible(true);

      if (!error && Date.now() - cleanupRequestAtRef.current > 60_000) {
        cleanupRequestAtRef.current = Date.now();
        fetch("/api/presence/cleanup", { method: "POST", keepalive: true }).catch(() => undefined);
      }

      return true;
    },
    [getSupabase, presenceAvailable, venue],
  );

  useEffect(() => {
    if (!venue || !isProfileComplete(profile) || !presenceAvailable) return;

    const touch = () => {
      lastInteractionRef.current = Date.now();
      const currentProfile = profileRef.current;
      if (currentProfile && isProfileComplete(currentProfile)) {
        syncPresence(currentProfile, { quiet: true, overrideStatus: "active" }).catch(() => undefined);
      }
    };

    const handleVisibilityChange = () => {
      const currentProfile = profileRef.current;
      if (currentProfile && isProfileComplete(currentProfile)) {
        syncPresence(currentProfile, { quiet: true }).catch(() => undefined);
      }
    };

    syncPresence(profile, { quiet: true }).catch(() => undefined);

    const intervalId = window.setInterval(() => {
      const currentProfile = profileRef.current;
      if (currentProfile && isProfileComplete(currentProfile)) {
        syncPresence(currentProfile, { quiet: true }).catch(() => undefined);
      }
    }, HEARTBEAT_INTERVAL_MS);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pointerdown", touch);
    window.addEventListener("keydown", touch);
    window.addEventListener("touchstart", touch, { passive: true });

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pointerdown", touch);
      window.removeEventListener("keydown", touch);
      window.removeEventListener("touchstart", touch);
    };
  }, [presenceAvailable, profile, syncPresence, venue]);

  const updateDraft = useCallback(
    (field: keyof PresenceProfile, value: string | null) => {
      setDraft((current) => {
        if (!current) return current;
        return {
          ...current,
          [field]: value,
        };
      });
      setSaveError("");
    },
    [],
  );

  const saveProfile = useCallback(async () => {
    if (!venue || !draft) return false;

    const nextProfile = sanitizeProfile(draft);

    if (!nextProfile.initials || nextProfile.initials.length < 2) {
      setSaveError("Use 2 to 4 initials so other guests can recognize you.");
      return false;
    }

    if (!nextProfile.occupation) {
      setSaveError("Add a short occupation so the list feels useful.");
      return false;
    }

    if (!nextProfile.interests) {
      setSaveError("Add a few interests so people know how to start a conversation.");
      return false;
    }

    setSaveError("");
    const saved = await syncPresence(nextProfile, { quiet: false });
    if (saved) {
      setProfile(nextProfile);
      setDraft(nextProfile);
      writeStoredProfile(venue.slug, nextProfile);
      setEditorOpen(false);
    }
    return saved;
  }, [draft, syncPresence, venue]);

  const setProfileTable = useCallback(
    async (tableId: string | null) => {
      if (!venue || !profile) return;

      const nextProfile = sanitizeProfile({
        ...profile,
        tableId,
      });

      setProfile(nextProfile);
      setDraft(nextProfile);
      writeStoredProfile(venue.slug, nextProfile);

      if (isProfileComplete(nextProfile)) {
        await syncPresence(nextProfile, { quiet: true });
      }
    },
    [profile, syncPresence, venue],
  );

  const openPeopleHref = useMemo(() => {
    if (!venue) return "/people";
    return `/people?venue=${encodeURIComponent(venue.slug)}`;
  }, [venue]);

  return {
    profile,
    profileReady: isProfileComplete(profile),
    draft,
    editorOpen,
    setEditorOpen,
    updateDraft,
    saveProfile,
    saveError,
    syncing,
    presenceStatus,
    presenceVisible,
    presenceAvailable,
    setProfileTable,
    openPeopleHref,
  };
}
