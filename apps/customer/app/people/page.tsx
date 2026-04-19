"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  ArrowLeft,
  ArrowRight,
  Coffee,
  MapPin,
  MessageCircle,
  Mic,
  MicOff,
  Navigation,
  PhoneOff,
  Users,
  Wifi,
} from "lucide-react";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PresenceProfileModal } from "@/components/social/presence-profile-modal";
import {
  buildPresenceTableId,
  findTableSummary,
  getPresenceErrorMessage,
  isPresenceBackendMissing,
  PEOPLE_PAGE_SIZE,
  countTableOccupancy,
  isPresenceFresh,
  normalizeActiveUsers,
  sortActiveUsers,
  type ActiveUserRecord,
  type PresenceProfile,
  type TableSummary,
  type VenueSummary,
} from "@/lib/presence";
import { createPublicSupabaseClient } from "@/lib/supabase";
import { useVenuePresence } from "@/lib/use-venue-presence";

interface ChatInvitePayload {
  roomId: string;
  fromSessionId: string;
  toSessionId: string;
  fromUserId: string;
  fromInitials: string;
  fromOccupation: string;
  fromInterests: string;
}

interface ChatInvite extends ChatInvitePayload {
  peer: ActiveUserRecord;
}

interface ChatSignalPayload {
  roomId: string;
  fromSessionId: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

interface ChatResponsePayload {
  roomId: string;
  fromSessionId: string;
  toSessionId: string;
  reason?: string;
}

interface ChatMessage {
  id: string;
  author: "self" | "peer" | "system";
  text: string;
}

type ChatStatus = "idle" | "inviting" | "ringing" | "connecting" | "connected" | "error";

function subscribeRealtimeChannel(channel: RealtimeChannel) {
  return new Promise<RealtimeChannel>((resolve, reject) => {
    let settled = false;
    const timeoutId = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error("Realtime channel timed out."));
      }
    }, 8_000);

    channel.subscribe((status) => {
      if (settled) return;

      if (status === "SUBSCRIBED") {
        settled = true;
        window.clearTimeout(timeoutId);
        resolve(channel);
        return;
      }

      if (status === "TIMED_OUT" || status === "CHANNEL_ERROR" || status === "CLOSED") {
        settled = true;
        window.clearTimeout(timeoutId);
        reject(new Error(`Realtime channel failed with status ${status}.`));
      }
    });
  });
}

async function sendBroadcast(channel: RealtimeChannel, event: string, payload: Record<string, unknown>) {
  await channel.send({
    type: "broadcast",
    event,
    payload,
  });
}

function createSyntheticPeer(
  venueId: string,
  sessionId: string,
  fallback?: Partial<ActiveUserRecord>,
): ActiveUserRecord {
  return {
    id: `synthetic-${sessionId}`,
    venueId,
    userId: fallback?.userId ?? crypto.randomUUID(),
    sessionId,
    initials: fallback?.initials ?? "CA",
    occupation: fallback?.occupation ?? "Cafe guest",
    interests: fallback?.interests ?? "Ready to chat",
    tableId: fallback?.tableId ?? null,
    status: fallback?.status ?? "active",
    lastSeen: fallback?.lastSeen ?? new Date().toISOString(),
  };
}

export default function PeoplePage() {
  return (
    <Suspense fallback={<PeoplePageFallback />}>
      <PeoplePageContent />
    </Suspense>
  );
}

function PeoplePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const requestedVenueSlug = searchParams.get("venue");
  const requestedTable = searchParams.get("table");
  const forcedSessionId = searchParams.get("session");

  const [venue, setVenue] = useState<VenueSummary | null>(null);
  const [tables, setTables] = useState<TableSummary[]>([]);
  const [loadingVenue, setLoadingVenue] = useState(true);
  const [pageError, setPageError] = useState("");
  const [presenceRosterReady, setPresenceRosterReady] = useState(true);
  const [activeUsers, setActiveUsers] = useState<ActiveUserRecord[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<ActiveUserRecord | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatPeer, setChatPeer] = useState<ActiveUserRecord | null>(null);
  const [chatStatus, setChatStatus] = useState<ChatStatus>("idle");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatDraft, setChatDraft] = useState("");
  const [chatError, setChatError] = useState("");
  const [incomingInvite, setIncomingInvite] = useState<ChatInvite | null>(null);
  const [muted, setMuted] = useState(false);
  const [hasLocalAudio, setHasLocalAudio] = useState(false);

  const userCacheRef = useRef<{ timestamp: number; data: ActiveUserRecord[] }>({
    timestamp: 0,
    data: [],
  });
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const directChannelRef = useRef<RealtimeChannel | null>(null);
  const roomChannelRef = useRef<RealtimeChannel | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const inviteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roomIdRef = useRef<string | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const profileRef = useRef<PresenceProfile | null>(null);
  const activeUsersRef = useRef<ActiveUserRecord[]>([]);
  const chatBusyRef = useRef(false);
  const supabaseRef = useRef<ReturnType<typeof createPublicSupabaseClient> | null>(null);

  const getSupabase = useCallback(() => {
    if (!supabaseRef.current) {
      supabaseRef.current = createPublicSupabaseClient();
    }

    return supabaseRef.current;
  }, []);

  const {
    profile,
    profileReady,
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
  } = useVenuePresence({
    venue,
    defaultTableId: requestedTable,
    forcedSessionId,
  });

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    chatBusyRef.current = chatOpen && chatStatus !== "idle" && chatStatus !== "error";
  }, [chatOpen, chatStatus]);

  useEffect(() => {
    async function loadVenue() {
      const supabase = getSupabase();
      setLoadingVenue(true);
      setPeopleLoading(true);
      setPageError("");

      const venueRequest = supabase
        .from("venues")
        .select("id, slug, name, branch_name");

      const venueQuery = requestedVenueSlug
        ? venueRequest.eq("slug", requestedVenueSlug)
        : venueRequest.order("name", { ascending: true }).limit(1);

      const { data: venueRows, error: venueError } = await venueQuery;
      const venueRow = venueRows?.[0];

      if (venueError || !venueRow) {
        setVenue(null);
        setTables([]);
        setLoadingVenue(false);
        setPageError("We couldn't find that cafe.");
        return;
      }

      if (!requestedVenueSlug && venueRow.slug) {
        router.replace(`/people?venue=${encodeURIComponent(venueRow.slug)}`);
      }

      const { data: zoneRows, error: zoneError } = await supabase
        .from("zones")
        .select("id, name")
        .eq("venue_id", venueRow.id)
        .order("sort_order", { ascending: true });

      if (zoneError) {
        setPageError(zoneError.message);
      }

      const zoneIds = (zoneRows ?? []).map((zone) => zone.id);
      const zoneNames = new Map((zoneRows ?? []).map((zone) => [zone.id, zone.name]));
      setPresenceRosterReady(true);

      let mappedTables: TableSummary[] = [];
      if (zoneIds.length > 0) {
        const { data: tableRows, error: tableError } = await supabase
          .from("tables")
          .select("identifier, seat_count, zone_id, pos_x, pos_y")
          .in("zone_id", zoneIds);

        if (tableError) {
          setPageError(tableError.message);
        } else {
          mappedTables = (tableRows ?? []).map((table) => ({
            id: buildPresenceTableId({
              zoneId: table.zone_id,
              identifier: table.identifier,
              x: table.pos_x,
              y: table.pos_y,
            }),
            label: table.identifier,
            seats: table.seat_count ?? 0,
            zoneId: table.zone_id,
            zoneName: zoneNames.get(table.zone_id) ?? "Floor",
          }));
        }
      }

      setVenue({
        id: venueRow.id,
        slug: venueRow.slug,
        name: venueRow.name,
        branchName: venueRow.branch_name ?? "Main Floor",
      });
      setTables(mappedTables);
      setLoadingVenue(false);
    }

    loadVenue().catch(() => {
      setLoadingVenue(false);
      setPageError("We couldn't load the live cafe roster.");
    });
  }, [getSupabase, requestedVenueSlug, router]);

  const refreshUsers = useCallback(
    async (force = false) => {
      if (!venue) return;
      const supabase = getSupabase();

      const now = Date.now();
      if (!force && now - userCacheRef.current.timestamp < 5_000) {
        setActiveUsers(userCacheRef.current.data);
        setPeopleLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("active_users")
        .select("id, venue_id, user_id, session_id, initials, occupation, interests, table_id, last_seen, status")
        .eq("venue_id", venue.id);

      if (error) {
        setPresenceRosterReady(!isPresenceBackendMissing(error.message));
        setPageError(getPresenceErrorMessage(error.message));
        setActiveUsers([]);
        setPeopleLoading(false);
        return;
      }

      const nextUsers = sortActiveUsers(
        (data ?? [])
          .map((user) => ({
            id: user.id,
            venueId: user.venue_id,
            userId: user.user_id,
            sessionId: user.session_id,
            initials: user.initials,
            occupation: user.occupation,
            interests: user.interests,
            tableId: user.table_id,
            lastSeen: user.last_seen,
            status: user.status,
          }))
          .filter((user) => isPresenceFresh(user.lastSeen)),
      );

      userCacheRef.current = {
        timestamp: now,
        data: nextUsers,
      };
      setPresenceRosterReady(true);
      setPageError("");
      setActiveUsers(nextUsers);
      setPeopleLoading(false);
    },
    [getSupabase, venue],
  );

  useEffect(() => {
    if (!venue) return;
    refreshUsers(true).catch(() => {
      setPeopleLoading(false);
      setPageError("We couldn't refresh the live cafe roster.");
    });
  }, [refreshUsers, venue]);

  useEffect(() => {
    if (!venue || !presenceRosterReady) return;
    const supabase = getSupabase();

    const channel = supabase
      .channel(`active_users:${venue.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "active_users",
          filter: `venue_id=eq.${venue.id}`,
        },
        () => {
          if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current);
          }

          refreshTimerRef.current = setTimeout(() => {
            refreshUsers(true).catch(() => undefined);
          }, 250);
        },
      );

    subscribeRealtimeChannel(channel).catch(() => {
      setPageError("Realtime cafe updates are unavailable right now.");
    });

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      void supabase.removeChannel(channel);
    };
  }, [getSupabase, presenceRosterReady, refreshUsers, venue]);

  const pushChatMessage = useCallback((author: ChatMessage["author"], text: string) => {
    setChatMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        author,
        text,
      },
    ]);
  }, []);

  const tearDownRoom = useCallback(
    (resetPanel = false) => {
      if (inviteTimeoutRef.current) {
        clearTimeout(inviteTimeoutRef.current);
        inviteTimeoutRef.current = null;
      }

      if (dataChannelRef.current) {
        dataChannelRef.current.close();
        dataChannelRef.current = null;
      }

      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      if (roomChannelRef.current) {
        void getSupabase().removeChannel(roomChannelRef.current);
        roomChannelRef.current = null;
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }

      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = null;
      }

      roomIdRef.current = null;
      setMuted(false);
      setHasLocalAudio(false);

      if (resetPanel) {
        setChatOpen(false);
        setChatPeer(null);
        setChatStatus("idle");
        setChatMessages([]);
        setChatDraft("");
        setChatError("");
        setIncomingInvite(null);
      }
    },
    [getSupabase],
  );

  const attachDataChannel = useCallback(
    (channel: RTCDataChannel) => {
      dataChannelRef.current = channel;

      channel.onopen = () => {
        setChatStatus("connected");
      };

      channel.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as { text?: string };
          if (payload.text) {
            pushChatMessage("peer", payload.text);
          }
        } catch {
          if (typeof event.data === "string" && event.data.trim()) {
            pushChatMessage("peer", event.data);
          }
        }
      };

      channel.onclose = () => {
        setChatStatus("error");
        setChatError("The chat connection closed.");
      };
    },
    [pushChatMessage],
  );

  const openRoom = useCallback(
    async (roomId: string, initiator: boolean, peer: ActiveUserRecord) => {
      const supabase = getSupabase();
      tearDownRoom(false);
      setChatOpen(true);
      setChatPeer(peer);
      setChatStatus("connecting");
      setChatError("");
      setChatMessages([
        {
          id: crypto.randomUUID(),
          author: "system",
          text: initiator ? "Invite accepted. Connecting audio + chat..." : "Connecting to the caller...",
        },
      ]);

      const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      roomIdRef.current = roomId;
      peerConnectionRef.current = peerConnection;

      peerConnection.onicecandidate = (event) => {
        if (!event.candidate || !roomChannelRef.current || !profileRef.current) return;
        sendBroadcast(roomChannelRef.current, "ice-candidate", {
          roomId,
          fromSessionId: profileRef.current.sessionId,
          candidate: event.candidate.toJSON(),
        }).catch(() => undefined);
      };

      peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === "connected") {
          setChatStatus("connected");
          return;
        }

        if (peerConnection.connectionState === "failed" || peerConnection.connectionState === "disconnected") {
          setChatStatus("error");
          setChatError("The audio link dropped. You can try again.");
        }
      };

      peerConnection.ontrack = (event) => {
        const [stream] = event.streams;
        if (remoteAudioRef.current && stream) {
          remoteAudioRef.current.srcObject = stream;
          void remoteAudioRef.current.play().catch(() => undefined);
        }
      };

      peerConnection.ondatachannel = (event) => {
        attachDataChannel(event.channel);
      };

      try {
        const localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        localStreamRef.current = localStream;
        setHasLocalAudio(true);
        localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));
      } catch {
        setHasLocalAudio(false);
        pushChatMessage("system", "Microphone access is blocked, so this room will continue as text-only chat.");
      }

      const roomChannel = supabase.channel(`people-room:${roomId}`, {
        config: {
          broadcast: {
            self: true,
          },
        },
      });

      roomChannel.on("broadcast", { event: "offer" }, async ({ payload }) => {
        const signal = payload as ChatSignalPayload;
        if (!profileRef.current || signal.fromSessionId === profileRef.current.sessionId || !signal.sdp) return;

        const connection = peerConnectionRef.current;
        if (!connection) return;

        await connection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        const answer = await connection.createAnswer();
        await connection.setLocalDescription(answer);

        await sendBroadcast(roomChannel, "answer", {
          roomId,
          fromSessionId: profileRef.current.sessionId,
          sdp: answer,
        });
      });

      roomChannel.on("broadcast", { event: "answer" }, async ({ payload }) => {
        const signal = payload as ChatSignalPayload;
        if (!profileRef.current || signal.fromSessionId === profileRef.current.sessionId || !signal.sdp) return;

        const connection = peerConnectionRef.current;
        if (!connection) return;
        await connection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      });

      roomChannel.on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
        const signal = payload as ChatSignalPayload;
        if (!profileRef.current || signal.fromSessionId === profileRef.current.sessionId || !signal.candidate) return;

        const connection = peerConnectionRef.current;
        if (!connection) return;
        await connection.addIceCandidate(new RTCIceCandidate(signal.candidate));
      });

      roomChannel.on("broadcast", { event: "chat-end" }, ({ payload }) => {
        const signal = payload as ChatResponsePayload;
        if (!profileRef.current || signal.fromSessionId === profileRef.current.sessionId) return;
        pushChatMessage("system", "The other guest ended the conversation.");
        tearDownRoom(true);
      });

      await subscribeRealtimeChannel(roomChannel);
      roomChannelRef.current = roomChannel;

      if (initiator) {
        const channel = peerConnection.createDataChannel("socialize-chat");
        attachDataChannel(channel);
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        await sendBroadcast(roomChannel, "offer", {
          roomId,
          fromSessionId: profileRef.current?.sessionId,
          sdp: offer,
        });
      }
    },
    [attachDataChannel, getSupabase, pushChatMessage, tearDownRoom],
  );

  useEffect(() => {
    if (!venue || !presenceVisible || !profile) return;
    const supabase = getSupabase();

    const channel = supabase.channel(`people-direct:${venue.id}`, {
      config: {
        broadcast: {
          self: true,
        },
      },
    });

    channel.on("broadcast", { event: "chat-invite" }, ({ payload }) => {
      const invite = payload as ChatInvitePayload;
      if (invite.toSessionId !== profile.sessionId || invite.fromSessionId === profile.sessionId) return;

      if (chatBusyRef.current) {
        sendBroadcast(channel, "chat-declined", {
          roomId: invite.roomId,
          fromSessionId: profile.sessionId,
          toSessionId: invite.fromSessionId,
          reason: "busy",
        }).catch(() => undefined);
        return;
      }

      const peer =
        activeUsersRef.current.find((user) => user.sessionId === invite.fromSessionId) ??
        createSyntheticPeer(venue.id, invite.fromSessionId, {
          userId: invite.fromUserId,
          initials: invite.fromInitials,
          occupation: invite.fromOccupation,
          interests: invite.fromInterests,
        });

      setIncomingInvite({ ...invite, peer });
      setChatPeer(peer);
      setChatOpen(true);
      setChatStatus("ringing");
      setChatMessages([
        {
          id: crypto.randomUUID(),
          author: "system",
          text: `${peer.initials} wants to start a live cafe chat.`,
        },
      ]);
      setChatDraft("");
      setChatError("");
    });

    channel.on("broadcast", { event: "chat-accepted" }, ({ payload }) => {
      const response = payload as ChatResponsePayload;
      if (response.toSessionId !== profile.sessionId || response.roomId !== roomIdRef.current) return;

      if (inviteTimeoutRef.current) {
        clearTimeout(inviteTimeoutRef.current);
        inviteTimeoutRef.current = null;
      }

      const peer =
        activeUsersRef.current.find((user) => user.sessionId === response.fromSessionId) ??
        chatPeer ??
        createSyntheticPeer(venue.id, response.fromSessionId);

      openRoom(response.roomId, true, peer).catch(() => {
        setChatStatus("error");
        setChatError("We couldn't establish the WebRTC room.");
      });
    });

    channel.on("broadcast", { event: "chat-declined" }, ({ payload }) => {
      const response = payload as ChatResponsePayload;
      if (response.toSessionId !== profile.sessionId || response.roomId !== roomIdRef.current) return;

      if (inviteTimeoutRef.current) {
        clearTimeout(inviteTimeoutRef.current);
        inviteTimeoutRef.current = null;
      }

      tearDownRoom(false);
      setChatOpen(true);
      setChatStatus("error");
      setChatError(
        response.reason === "busy"
          ? "That guest is already in another live chat."
          : "The chat request was declined.",
      );
      setChatMessages([
        {
          id: crypto.randomUUID(),
          author: "system",
          text:
            response.reason === "busy"
              ? "That guest is already in another room."
              : "The chat request was declined.",
        },
      ]);
    });

    directChannelRef.current = channel;
    subscribeRealtimeChannel(channel).catch(() => {
      setChatError("Direct chat signaling is unavailable.");
    });

    return () => {
      directChannelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [chatPeer, getSupabase, openRoom, presenceVisible, profile, tearDownRoom, venue]);

  useEffect(() => {
    return () => {
      tearDownRoom(true);
    };
  }, [tearDownRoom]);

  const normalizedUsers = useMemo(
    () => normalizeActiveUsers(activeUsers, tables),
    [activeUsers, tables],
  );
  const tableOccupancy = useMemo(() => countTableOccupancy(normalizedUsers), [normalizedUsers]);
  const otherUsers = useMemo(
    () => normalizedUsers.filter((user) => user.sessionId !== profile?.sessionId),
    [normalizedUsers, profile?.sessionId],
  );
  const totalPages = Math.max(1, Math.ceil(otherUsers.length / PEOPLE_PAGE_SIZE));
  const currentPageIndex = Math.min(pageIndex, totalPages - 1);

  const visibleUsers = useMemo(() => {
    const start = currentPageIndex * PEOPLE_PAGE_SIZE;
    return otherUsers.slice(start, start + PEOPLE_PAGE_SIZE);
  }, [currentPageIndex, otherUsers]);
  const selectedUserResolved = useMemo(() => {
    if (!selectedUser) return null;
    return normalizedUsers.find((user) => user.sessionId === selectedUser.sessionId) ?? null;
  }, [normalizedUsers, selectedUser]);
  const chatPeerResolved = useMemo(() => {
    if (!chatPeer) return null;
    return normalizedUsers.find((user) => user.sessionId === chatPeer.sessionId) ?? chatPeer;
  }, [chatPeer, normalizedUsers]);
  const profileTable = useMemo(
    () => findTableSummary(tables, profile?.tableId ?? null),
    [profile?.tableId, tables],
  );
  const selectedUserTable = useMemo(
    () => findTableSummary(tables, selectedUserResolved?.tableId ?? null),
    [selectedUserResolved?.tableId, tables],
  );
  const chatPeerTable = useMemo(
    () => findTableSummary(tables, chatPeerResolved?.tableId ?? null),
    [chatPeerResolved?.tableId, tables],
  );
  const selectedUserTableId = selectedUserTable?.id ?? selectedUserResolved?.tableId ?? null;

  useEffect(() => {
    activeUsersRef.current = normalizedUsers;
  }, [normalizedUsers]);

  const startChat = useCallback(
    async (targetUser: ActiveUserRecord) => {
      if (!presenceVisible || !profile || !directChannelRef.current) {
        setEditorOpen(true);
        return;
      }

      tearDownRoom(true);
      setSelectedUser(null);
      setChatPeer(targetUser);
      setChatOpen(true);
      setChatStatus("inviting");
      setChatMessages([
        {
          id: crypto.randomUUID(),
          author: "system",
          text: `Calling ${targetUser.initials}...`,
        },
      ]);
      setChatDraft("");
      setChatError("");

      const roomId = crypto.randomUUID();
      roomIdRef.current = roomId;

      if (inviteTimeoutRef.current) {
        clearTimeout(inviteTimeoutRef.current);
      }

      inviteTimeoutRef.current = setTimeout(() => {
        roomIdRef.current = null;
        setChatStatus("error");
        setChatError("The chat request expired before the other guest responded.");
        setChatMessages([
          {
            id: crypto.randomUUID(),
            author: "system",
            text: "The other guest did not answer in time.",
          },
        ]);
      }, 20_000);

      await sendBroadcast(directChannelRef.current, "chat-invite", {
        roomId,
        fromSessionId: profile.sessionId,
        toSessionId: targetUser.sessionId,
        fromUserId: profile.userId,
        fromInitials: profile.initials,
        fromOccupation: profile.occupation,
        fromInterests: profile.interests,
      });
    },
    [presenceVisible, profile, setEditorOpen, tearDownRoom],
  );

  const acceptInvite = useCallback(async () => {
    if (!incomingInvite || !profile || !directChannelRef.current) return;

    setIncomingInvite(null);
    await openRoom(incomingInvite.roomId, false, incomingInvite.peer);
    await sendBroadcast(directChannelRef.current, "chat-accepted", {
      roomId: incomingInvite.roomId,
      fromSessionId: profile.sessionId,
      toSessionId: incomingInvite.fromSessionId,
    });
  }, [incomingInvite, openRoom, profile]);

  const declineInvite = useCallback(async () => {
    if (!incomingInvite || !profile || !directChannelRef.current) return;

    await sendBroadcast(directChannelRef.current, "chat-declined", {
      roomId: incomingInvite.roomId,
      fromSessionId: profile.sessionId,
      toSessionId: incomingInvite.fromSessionId,
      reason: "declined",
    });
    setIncomingInvite(null);
    setChatOpen(false);
    setChatPeer(null);
    setChatStatus("idle");
    setChatMessages([]);
    setChatError("");
  }, [incomingInvite, profile]);

  const sendChatMessage = useCallback(() => {
    const nextMessage = chatDraft.trim();
    if (!nextMessage || !dataChannelRef.current || dataChannelRef.current.readyState !== "open") return;

    dataChannelRef.current.send(JSON.stringify({ text: nextMessage }));
    pushChatMessage("self", nextMessage);
    setChatDraft("");
  }, [chatDraft, pushChatMessage]);

  const endChat = useCallback(async () => {
    if (roomChannelRef.current && profileRef.current && roomIdRef.current) {
      await sendBroadcast(roomChannelRef.current, "chat-end", {
        roomId: roomIdRef.current,
        fromSessionId: profileRef.current.sessionId,
        toSessionId: chatPeer?.sessionId,
      }).catch(() => undefined);
    }

    tearDownRoom(true);
  }, [chatPeer?.sessionId, tearDownRoom]);

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const nextMuted = !muted;
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setMuted(nextMuted);
  }, [muted]);

  const handleJoinTable = useCallback(async () => {
    if (!selectedUserResolved?.tableId || !venue) return;

    await setProfileTable(selectedUserResolved.tableId);
    router.push(`/v/${venue.slug}?table=${encodeURIComponent(selectedUserResolved.tableId)}`);
  }, [router, selectedUserResolved, setProfileTable, venue]);

  const venueHref = venue ? `/v/${encodeURIComponent(venue.slug)}` : "/";
  const joinTargetIsFull =
    selectedUserTableId
      ? Boolean(
          selectedUserTable?.seats &&
            (tableOccupancy[selectedUserTableId] ?? 0) >=
              (selectedUserTable?.seats ?? 0),
        )
      : false;

  return (
    <div className="min-h-screen bg-surface">
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      <header className="bg-primary px-6 py-5 text-on-primary">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link
              href={venueHref}
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-on-primary/80 transition-colors hover:text-on-primary"
            >
              <ArrowLeft size={14} />
              Back to venue
            </Link>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-on-primary/20">
                <Users size={18} />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">People at the Cafe</h1>
                <p className="text-sm text-on-primary/80">
                  {venue?.name ?? "Loading cafe"} - {venue?.branchName ?? "Live presence"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 text-right">
            <span className="inline-flex items-center gap-2 rounded-full bg-on-primary/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-on-primary/80">
              <Wifi size={12} />
              Heartbeat live
            </span>
            <span className="text-sm text-on-primary/80">
              {Math.max(activeUsers.length, 0)} guest{activeUsers.length === 1 ? "" : "s"} visible now
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-on-primary/80">
          <span className="flex items-center gap-1">
            <Coffee size={12} />
            Stateless WebRTC chat
          </span>
          <span className="flex items-center gap-1">
            <MapPin size={12} />
            Join tables through the existing floor plan
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5">
        <section className="rounded-[1.8rem] bg-surface-container-low p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Your Presence</p>
              <h2 className="mt-1 text-xl font-bold text-on-surface">
                {presenceVisible && profile
                  ? `${profile.initials} is visible at ${venue?.name ?? "the cafe"}`
                  : profileReady && profile
                    ? presenceAvailable
                      ? `Syncing ${profile.initials} into the live roster`
                      : "Your profile is ready, but live presence is offline"
                    : "Create your cafe profile to appear in the live roster"}
              </h2>
              <p className="mt-2 text-sm text-on-surface-variant">
                {presenceVisible && profile
                  ? `${profile.occupation} - ${profile.interests}${profileTable ? ` - Table ${profileTable.label}` : ""}`
                  : profileReady && profile
                    ? presenceAvailable
                      ? "Your profile is saved on this device. We are finishing the live presence sync now."
                      : "Your profile is saved on this device, but the live presence backend is unavailable right now."
                    : "The app only shares initials, occupation, interests, and your current table."}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-sm font-semibold text-on-surface">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    !presenceAvailable
                      ? "bg-rose-500"
                      : presenceVisible && presenceStatus === "active"
                        ? "bg-green-500"
                        : presenceVisible
                          ? "bg-amber-500"
                          : "bg-slate-400"
                  }`}
                />
                {!presenceAvailable
                  ? "Offline"
                  : presenceVisible
                    ? presenceStatus === "active"
                      ? "Active"
                      : "Idle"
                    : "Not visible"}
              </span>
              <button
                type="button"
                onClick={() => setEditorOpen(true)}
                className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90"
              >
                {presenceVisible ? "Edit my profile" : profileReady ? "Retry visibility" : "Go visible"}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-[1.8rem] bg-surface-container-low p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Live Roster</p>
              <h2 className="mt-1 text-xl font-bold text-on-surface">Discover who is around right now</h2>
              <p className="mt-2 text-sm text-on-surface-variant">
                Tap a card to chat or jump to that guest&apos;s table on the current floor plan.
              </p>
            </div>

            {otherUsers.length > PEOPLE_PAGE_SIZE ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPageIndex((current) => Math.max(current - 1, 0))}
                  disabled={currentPageIndex === 0}
                  className="rounded-full bg-surface px-4 py-2 text-sm font-semibold text-on-surface disabled:opacity-50"
                >
                  Prev
                </button>
                <span className="min-w-[5rem] text-center text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                  {currentPageIndex + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPageIndex((current) => Math.min(current + 1, totalPages - 1))}
                  disabled={currentPageIndex >= totalPages - 1}
                  className="rounded-full bg-surface px-4 py-2 text-sm font-semibold text-on-surface disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            ) : null}
          </div>

          {pageError ? (
            <p className="mt-4 rounded-2xl bg-secondary-container px-4 py-3 text-sm text-on-secondary-container">
              {pageError}
            </p>
          ) : null}

          {loadingVenue || peopleLoading ? (
            <div className="mt-5 flex gap-4 overflow-x-auto pb-2">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="min-w-[260px] flex-1 rounded-[1.6rem] bg-surface p-5 shadow-sm"
                >
                  <div className="h-12 w-12 animate-pulse rounded-full bg-surface-container-high" />
                  <div className="mt-4 h-4 w-28 animate-pulse rounded-full bg-surface-container-high" />
                  <div className="mt-3 h-3 w-40 animate-pulse rounded-full bg-surface-container-high" />
                  <div className="mt-2 h-3 w-32 animate-pulse rounded-full bg-surface-container-high" />
                </div>
              ))}
            </div>
          ) : otherUsers.length === 0 ? (
            <div className="mt-5 rounded-[1.6rem] bg-surface p-6 text-center shadow-sm">
              <p className="text-lg font-bold text-on-surface">
                {presenceRosterReady ? "No one else is visible yet." : "Live roster unavailable."}
              </p>
              <p className="mt-2 text-sm text-on-surface-variant">
                {presenceRosterReady
                  ? "Stay visible and check back in a moment. The roster updates automatically through Supabase Realtime."
                  : "The presence backend has not been provisioned in Supabase yet, so the live roster cannot load."}
              </p>
            </div>
          ) : (
            <div className="mt-5 flex gap-4 overflow-x-auto pb-2">
              {visibleUsers.map((user) => {
                const table = findTableSummary(tables, user.tableId);
                const seats = table?.seats ?? 0;
                const occupancy = table?.id ? tableOccupancy[table.id] ?? 0 : 0;
                const tableFull = Boolean(user.tableId && seats > 0 && occupancy >= seats);

                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelectedUser(user)}
                    className="min-w-[270px] snap-start rounded-[1.7rem] bg-surface p-5 text-left shadow-sm transition-transform hover:-translate-y-0.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary-container text-lg font-bold text-on-secondary-container">
                        {user.initials}
                      </div>
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                          user.status === "active"
                            ? "bg-green-50 text-green-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            user.status === "active" ? "bg-green-500" : "bg-amber-500"
                          }`}
                        />
                        {user.status}
                      </span>
                    </div>

                    <div className="mt-4">
                      <h3 className="text-lg font-bold text-on-surface">{user.occupation}</h3>
                      <p className="mt-2 text-sm leading-6 text-on-surface-variant">{user.interests}</p>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {user.tableId ? (
                        <span className="rounded-full bg-surface-container-high px-3 py-1 text-xs font-semibold text-on-surface">
                          Table {table?.label ?? user.tableId}
                        </span>
                      ) : (
                        <span className="rounded-full bg-surface-container-high px-3 py-1 text-xs font-semibold text-on-surface">
                          Not seated yet
                        </span>
                      )}

                      <span className="rounded-full bg-surface-container-high px-3 py-1 text-xs font-semibold text-on-surface">
                        {tableFull ? "Table full" : "Open to join"}
                      </span>
                    </div>

                    <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                      View actions
                      <ArrowRight size={14} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <PresenceProfileModal
        open={editorOpen}
        venueName={venue?.name ?? "the cafe"}
        draft={draft}
        tables={tables}
        tableOccupancy={tableOccupancy}
        saving={syncing}
        error={saveError}
        onClose={() => setEditorOpen(false)}
        onChange={updateDraft}
        onSave={() => {
          void saveProfile();
        }}
      />

      {selectedUserResolved ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-on-surface/35 px-4 py-6 backdrop-blur-sm md:items-center">
          <div className="w-full max-w-lg rounded-[2rem] bg-surface p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Guest Actions</p>
                <h2 className="mt-1 text-2xl font-bold text-on-surface">{selectedUserResolved.initials}</h2>
                <p className="mt-2 text-sm text-on-surface-variant">
                  {selectedUserResolved.occupation} - {selectedUserResolved.interests}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="rounded-full bg-surface-container-high px-4 py-2 text-sm font-semibold text-on-surface"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              <button
                type="button"
                onClick={() => {
                  void startChat(selectedUserResolved);
                }}
                className="flex items-center justify-between rounded-[1.4rem] bg-surface-container-low px-5 py-4 text-left transition-colors hover:bg-surface-container-high"
              >
                <div>
                  <p className="text-base font-bold text-on-surface">Chat now</p>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    Start a stateless WebRTC room with live audio + text.
                  </p>
                </div>
                <MessageCircle size={20} className="text-primary" />
              </button>

              <button
                type="button"
                onClick={() => {
                  void handleJoinTable();
                }}
                disabled={!selectedUserResolved.tableId || joinTargetIsFull}
                className="flex items-center justify-between rounded-[1.4rem] bg-surface-container-low px-5 py-4 text-left transition-colors hover:bg-surface-container-high disabled:opacity-50"
              >
                <div>
                  <p className="text-base font-bold text-on-surface">
                    {joinTargetIsFull ? "Table full" : "Join table"}
                  </p>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      {selectedUserResolved.tableId
                      ? `Jump to table ${selectedUserTable?.label ?? selectedUserResolved.tableId} on the current floor plan.`
                      : "This guest has not selected a table yet."}
                    </p>
                </div>
                <Navigation size={20} className="text-primary" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {chatOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-on-surface/35 px-4 py-6 backdrop-blur-sm md:items-center">
          <div className="w-full max-w-3xl rounded-[2rem] bg-surface p-5 shadow-2xl">
            <div className="flex flex-col gap-4 border-b border-outline-variant/30 pb-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Live Cafe Chat</p>
                <h2 className="mt-1 text-2xl font-bold text-on-surface">
                  {chatPeerResolved ? `${chatPeerResolved.initials} - ${chatPeerResolved.occupation}` : "Preparing room"}
                </h2>
                <p className="mt-2 text-sm text-on-surface-variant">
                  {incomingInvite
                    ? "Incoming request"
                    : chatStatus === "connected"
                      ? "WebRTC connected. Audio and chat stay live only for this session."
                      : chatStatus === "inviting"
                        ? "Waiting for the other guest to answer..."
                        : "Setting up the peer connection..."}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void toggleMute();
                  }}
                  disabled={!hasLocalAudio}
                  className="inline-flex items-center gap-2 rounded-full bg-surface-container-high px-4 py-2 text-sm font-semibold text-on-surface disabled:opacity-50"
                >
                  {muted ? <MicOff size={16} /> : <Mic size={16} />}
                  {muted ? "Unmute" : "Mute"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void endChat();
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary"
                >
                  <PhoneOff size={16} />
                  End call
                </button>
              </div>
            </div>

            {chatError ? (
              <p className="mt-4 rounded-2xl bg-secondary-container px-4 py-3 text-sm text-on-secondary-container">
                {chatError}
              </p>
            ) : null}

            {incomingInvite ? (
              <div className="mt-5 rounded-[1.6rem] bg-surface-container-low p-5">
                <p className="text-base font-bold text-on-surface">
                  {incomingInvite.peer.initials} is inviting you to chat.
                </p>
                <p className="mt-2 text-sm text-on-surface-variant">
                  Accept to open a live room, or decline to stay in the roster.
                </p>
                <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      void declineInvite();
                    }}
                    className="rounded-full bg-surface px-5 py-3 text-sm font-semibold text-on-surface"
                  >
                    Decline
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void acceptInvite();
                    }}
                    className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-on-primary"
                  >
                    Accept
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 grid gap-5 md:grid-cols-[0.95fr_1.05fr]">
                <div className="rounded-[1.6rem] bg-surface-container-low p-5">
                  <div className="rounded-[1.4rem] bg-surface px-4 py-5 text-center shadow-sm">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                      {chatStatus === "connected" ? "Audio ready" : "Connecting"}
                    </p>
                    <div className="mt-4 flex items-center justify-center">
                      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-secondary-container text-3xl font-bold text-on-secondary-container">
                        {chatPeerResolved?.initials ?? "??"}
                      </div>
                    </div>
                    <p className="mt-4 text-base font-bold text-on-surface">
                      {chatPeerResolved?.tableId ? `Near table ${chatPeerTable?.label ?? chatPeerResolved.tableId}` : "Walking the room"}
                    </p>
                    <p className="mt-2 text-sm text-on-surface-variant">
                      {hasLocalAudio ? "Microphone connected." : "Text-only fallback active."}
                    </p>
                  </div>
                </div>

                <div className="rounded-[1.6rem] bg-surface-container-low p-5">
                  <div className="flex h-[22rem] flex-col">
                    <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                      {chatMessages.length === 0 ? (
                        <p className="text-sm text-on-surface-variant">Messages will appear here once the room opens.</p>
                      ) : (
                        chatMessages.map((message) => (
                          <div
                            key={message.id}
                            className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                              message.author === "self"
                                ? "ml-auto bg-primary text-on-primary"
                                : message.author === "peer"
                                  ? "bg-surface text-on-surface"
                                  : "bg-secondary-container text-on-secondary-container"
                            }`}
                          >
                            {message.text}
                          </div>
                        ))
                      )}
                    </div>

                    <div className="mt-4 flex items-end gap-3">
                      <textarea
                        value={chatDraft}
                        onChange={(event) => setChatDraft(event.target.value)}
                        className="min-h-24 flex-1 rounded-2xl border border-outline-variant/40 bg-surface px-4 py-3 text-sm outline-none transition focus:border-primary"
                        placeholder="Send a quick hello, ask where they're sitting, or suggest a shared table."
                      />
                      <button
                        type="button"
                        onClick={sendChatMessage}
                        disabled={chatStatus !== "connected" || !chatDraft.trim()}
                        className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-on-primary disabled:opacity-50"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PeoplePageFallback() {
  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-primary px-6 py-5 text-on-primary">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-on-primary/20">
            <Users size={18} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">People at the Cafe</h1>
            <p className="text-sm text-on-primary/80">Loading live roster...</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5">
        <div className="rounded-[1.8rem] bg-surface-container-low p-5 shadow-sm">
          <div className="h-6 w-48 animate-pulse rounded-full bg-surface-container-high" />
          <div className="mt-3 h-4 w-80 animate-pulse rounded-full bg-surface-container-high" />
          <div className="mt-6 flex gap-4 overflow-x-auto">
            {[0, 1, 2].map((index) => (
              <div key={index} className="min-w-[260px] rounded-[1.6rem] bg-surface p-5 shadow-sm">
                <div className="h-12 w-12 animate-pulse rounded-full bg-surface-container-high" />
                <div className="mt-4 h-4 w-28 animate-pulse rounded-full bg-surface-container-high" />
                <div className="mt-3 h-3 w-36 animate-pulse rounded-full bg-surface-container-high" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}


