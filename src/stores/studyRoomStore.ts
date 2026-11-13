import { atom } from 'nanostores';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'online' | 'reconnecting' | 'error';

export interface StudyBuddy {
  id: string;
  username: string;
  appType: 'window' | 'patio';
  status: 'Focusing' | 'Break' | 'Idle';
  mode: 'focus' | 'break';
  remainingSeconds: number;
  isRunning: boolean;
  endTime: number | null;
  isSynced: boolean;
  avatarColor: string;
  updatedAt: number;
  isSelf?: boolean;
}

export interface TimerSyncPayload {
  isRunning: boolean;
  mode: 'focus' | 'break';
  endTime: number | null;
  remainingSeconds: number;
  updatedBy: string;
  senderId?: string;
  timestamp: number;
}

export interface StudyRoomState {
  connectionStatus: ConnectionStatus;
  isConnected: boolean;
  isJoined?: boolean;
  isConnecting: boolean;
  isFormOpen: boolean;
  isCollapsed: boolean;
  roomCode: string;
  username: string;
  isSynced: boolean;
  members: StudyBuddy[];
  error: string | null;
}

const AVATAR_COLORS = [
  '#8EA2FF', // Periwinkle
  '#F472B6', // Pink
  '#FBBF24', // Amber
  '#34D399', // Emerald
  '#38BDF8', // Sky
  '#A78BFA', // Purple
  '#FB923C', // Orange
  '#2DD4BF', // Teal
];

export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

// Generate unique session tab ID stored strictly in sessionStorage (NOT localStorage)
export function getSessionTabId(): string {
  if (typeof window === 'undefined') return 'server';
  try {
    let id = sessionStorage.getItem('vw_session_tab_id');
    if (!id) {
      id = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'tab_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
      sessionStorage.setItem('vw_session_tab_id', id);
    }
    return id;
  } catch {
    return 'tab_' + Math.random().toString(36).substring(2, 11);
  }
}

// Normalize room code: trim, lowercase, strip leading '#'
export function normalizeRoomCode(code: string): string {
  return code.trim().toLowerCase().replace(/^#/, '').replace(/[^a-z0-9_-]/g, '');
}

// Read URL room parameter if present
function getInitialRoom(): string {
  if (typeof window !== 'undefined') {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const roomParam = urlParams.get('room');
      if (roomParam && roomParam.trim()) {
        return normalizeRoomCode(roomParam);
      }
      const saved = localStorage.getItem('vw_study_room');
      if (saved && saved.trim()) return normalizeRoomCode(saved);
    } catch {}
  }
  return 'study-lounge';
}

function getInitialUsername(): string {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('vw_study_username');
      if (saved && saved.trim()) return saved.trim();
    } catch {}
  }
  return '';
}

function getInitialSynced(): boolean {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('vw_study_synced');
      if (saved !== null) return saved !== 'false';
    } catch {}
  }
  return true;
}

export const $studyRoom = atom<StudyRoomState>({
  connectionStatus: 'disconnected',
  isConnected: false,
  isJoined: false,
  isConnecting: false,
  isFormOpen: false,
  isCollapsed: false,
  roomCode: getInitialRoom(),
  username: getInitialUsername(),
  isSynced: getInitialSynced(),
  members: [],
  error: null,
});

// Broadcast timer sync events to components
export const $incomingTimerSync = atom<TimerSyncPayload | null>(null);

let activeChannel: RealtimeChannel | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

export function getActiveChannel(): RealtimeChannel | null {
  return activeChannel;
}
let lastKnownTimerState = {
  isRunning: false,
  mode: 'focus' as 'focus' | 'break',
  endTime: null as number | null,
  remainingSeconds: 25 * 60,
};

export function setTimerSnapshot(state: {
  isRunning: boolean;
  mode: 'focus' | 'break';
  endTime: number | null;
  remainingSeconds: number;
}) {
  lastKnownTimerState = { ...state };
}

export function getTimerSnapshot() {
  return lastKnownTimerState;
}

export function setActiveChannel(channel: RealtimeChannel | null) {
  activeChannel = channel;
}

export function setFormOpen(open: boolean) {
  $studyRoom.set({ ...$studyRoom.get(), isFormOpen: open, error: null });
}

export function toggleFormOpen() {
  const current = $studyRoom.get();
  $studyRoom.set({ ...current, isFormOpen: !current.isFormOpen, error: null });
}

export function setCollapsed(collapsed: boolean) {
  $studyRoom.set({ ...$studyRoom.get(), isCollapsed: collapsed });
}

export function toggleCollapsed() {
  const current = $studyRoom.get();
  $studyRoom.set({ ...current, isCollapsed: !current.isCollapsed });
}

export function setRoomCode(code: string) {
  const sanitized = normalizeRoomCode(code);
  $studyRoom.set({ ...$studyRoom.get(), roomCode: sanitized });
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('vw_study_room', sanitized);
    } catch {}
  }
}

export function setUsername(name: string) {
  $studyRoom.set({ ...$studyRoom.get(), username: name });
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('vw_study_username', name);
    } catch {}
  }
}

// Instant catch-up check: inspect all online members where member.isSynced === true
export function checkAndApplyRoomTimerCatchUp(membersList?: StudyBuddy[]) {
  const state = $studyRoom.get();
  if (!state.isConnected || !state.isSynced) return;

  const members = membersList || state.members;
  if (!members || members.length === 0) return;

  // Inspect all online members where member.isSynced === true
  const syncedMembers = members.filter((m) => !m.isSelf && m.isSynced);
  if (syncedMembers.length === 0) return;

  const now = Date.now();
  // 1. If any synced member currently has member.isRunning === true and member.endTime > Date.now(),
  // immediately start the local Pomodoro timer synced to that exact member.endTime and member.mode.
  const activeRunning = syncedMembers.find(
    (m) => m.isRunning && m.endTime && m.endTime > now
  );

  if (activeRunning && activeRunning.endTime) {
    const isAlreadyRunningSameEnd =
      lastKnownTimerState.isRunning &&
      lastKnownTimerState.endTime &&
      Math.abs(lastKnownTimerState.endTime - activeRunning.endTime) < 500;

    if (!isAlreadyRunningSameEnd) {
      const remaining = Math.max(0, Math.ceil((activeRunning.endTime - now) / 1000));
      $incomingTimerSync.set({
        isRunning: true,
        mode: activeRunning.mode,
        endTime: activeRunning.endTime,
        remainingSeconds: remaining,
        updatedBy: activeRunning.id,
        senderId: activeRunning.id,
        timestamp: now,
      });
    }
    return;
  }

  // 2. If no synced member is running, adopt their paused remainingSeconds and mode
  if (!lastKnownTimerState.isRunning) {
    const pausedMember = syncedMembers.find(
      (m) => !m.isRunning && typeof m.remainingSeconds === 'number'
    );
    if (pausedMember) {
      const isAlreadyPausedSame =
        !lastKnownTimerState.isRunning &&
        lastKnownTimerState.mode === pausedMember.mode &&
        lastKnownTimerState.remainingSeconds === pausedMember.remainingSeconds;

      if (!isAlreadyPausedSame) {
        $incomingTimerSync.set({
          isRunning: false,
          mode: pausedMember.mode,
          endTime: null,
          remainingSeconds: pausedMember.remainingSeconds,
          updatedBy: pausedMember.id,
          senderId: pausedMember.id,
          timestamp: now,
        });
      }
    }
  }
}

export function setSyncedMode(synced: boolean) {
  const current = $studyRoom.get();
  $studyRoom.set({ ...current, isSynced: synced });
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('vw_study_synced', String(synced));
    } catch {}
  }

  // Update presence with new synced flag
  if (current.isConnected && activeChannel) {
    updatePresence(lastKnownTimerState);
  }

  // Instant catch-up on toggling Synced
  if (synced) {
    checkAndApplyRoomTimerCatchUp();
  }
}

export function toggleSynced() {
  setSyncedMode(!$studyRoom.get().isSynced);
}

// Extract presence state into clean members list
export function parsePresenceMembers(
  presenceState: Record<string, any[]>,
  selfId: string
): StudyBuddy[] {
  const byId = new Map<string, StudyBuddy>();

  for (const [key, presences] of Object.entries(presenceState)) {
    if (!presences || !Array.isArray(presences)) continue;

    for (const item of presences) {
      if (!item) continue;
      const id = String(item.id || key);

      // Read member.isSynced directly (never default another user to Solo if isSynced === true)
      let isMemberSynced = true;
      if (typeof item.isSynced === 'boolean') {
        isMemberSynced = item.isSynced;
      } else if (typeof item.synced === 'boolean') {
        isMemberSynced = item.synced;
      } else if (typeof item.is_synced === 'boolean') {
        isMemberSynced = item.is_synced;
      } else if (item.isSynced === 'false' || item.synced === 'false' || item.is_synced === 'false') {
        isMemberSynced = false;
      }

      const isRunning = Boolean(item.isRunning);
      const mode: 'focus' | 'break' = item.mode === 'break' ? 'break' : 'focus';
      const status: 'Focusing' | 'Break' | 'Idle' =
        item.status === 'Focusing' || item.status === 'Break' || item.status === 'Idle'
          ? item.status
          : isRunning
          ? (mode === 'focus' ? 'Focusing' : 'Break')
          : 'Idle';

      // Read all peers without filtering by appType ('patio', 'window', or undefined)
      const rawAppType = String(item.appType || '').toLowerCase();
      const appType: 'window' | 'patio' = rawAppType === 'patio' ? 'patio' : 'window';

      const candidate: StudyBuddy = {
        id,
        username: String(item.username || 'Anonymous'),
        appType,
        status,
        mode,
        remainingSeconds: typeof item.remainingSeconds === 'number' ? item.remainingSeconds : 25 * 60,
        isRunning,
        endTime: typeof item.endTime === 'number' ? item.endTime : null,
        isSynced: isMemberSynced,
        avatarColor: item.avatarColor || getAvatarColor(String(item.username || id)),
        updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : Date.now(),
        isSelf: id === selfId || key === selfId,
      };

      // Deduplicate only by member.id (falling back to Supabase presence key)
      const existing = byId.get(id);
      if (!existing || candidate.updatedAt >= existing.updatedAt) {
        byId.set(id, candidate);
      }
    }
  }

  const list = Array.from(byId.values());

  // Sort: Local user (sessionTabId) appears first with (You) and all other connected users right below
  return list.sort((a, b) => {
    if (a.isSelf && !b.isSelf) return -1;
    if (!a.isSelf && b.isSelf) return 1;
    return a.username.localeCompare(b.username);
  });
}

// Schedule automatic reconnect with debounce
function scheduleReconnect(delay = 2000) {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }
  const state = $studyRoom.get();
  // Do not reconnect if user has explicitly left
  if (!state.isConnected && !state.isJoined) return;

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    const currentState = $studyRoom.get();
    if (!currentState.isConnected && !currentState.isJoined) return;

    console.log('[StudyRoom] Attempting silent auto-reconnect to room:', currentState.roomCode);
    await connectChannel(currentState.roomCode, currentState.username);
  }, delay);
}

// Connect channel with robust error handling and silent auto-reconnect
async function connectChannel(room: string, user: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) {
    $studyRoom.set({
      ...$studyRoom.get(),
      connectionStatus: 'error',
      isConnected: false,
      isJoined: false,
      isConnecting: false,
      error: 'Offline / Check .env',
    });
    return false;
  }

  // Clear existing reconnect timer if any
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  // Clean up any existing channel cleanly
  if (activeChannel) {
    try {
      await activeChannel.untrack();
      await supabase.removeChannel(activeChannel);
    } catch {}
    activeChannel = null;
  }

  const sessionTabId = getSessionTabId();
  const avatarColor = getAvatarColor(user);

  try {
    // Standardized channel name across Window and Sliding Glass Doors apps:
    // cozy-study-room:${cleanRoom}
    const channel = supabase.channel(`cozy-study-room:${room}`, {
      config: {
        presence: {
          key: sessionTabId,
        },
        broadcast: {
          self: false,
        },
      },
    });

    const updateMembersFromPresence = () => {
      const raw = channel.presenceState();
      const members = parsePresenceMembers(raw, sessionTabId);

      $studyRoom.set({
        ...$studyRoom.get(),
        members,
        isConnected: true,
        isJoined: true,
        connectionStatus: 'online',
        isConnecting: false,
        isFormOpen: false,
        error: null,
      });

      // Instant Catch-Up on Room Join:
      // If another synced user in the room already has an active isRunning timer, immediately adopt their endTime and mode
      checkAndApplyRoomTimerCatchUp(members);
    };

    // Presence listeners for 'sync', 'join', and 'leave' events
    channel
      .on('presence', { event: 'sync' }, updateMembersFromPresence)
      .on('presence', { event: 'join' }, updateMembersFromPresence)
      .on('presence', { event: 'leave' }, updateMembersFromPresence);

    // Broadcast timer_sync listener
    channel.on('broadcast', { event: 'timer_sync' }, ({ payload }) => {
      if (!payload) return;
      // Ignore broadcast from our own tab
      if (payload.updatedBy === sessionTabId || payload.senderId === sessionTabId) {
        return;
      }

      const state = $studyRoom.get();
      // Whenever isSynced === true (and updatedBy !== myTabId), immediately apply
      if (state.isSynced) {
        $incomingTimerSync.set(payload as TimerSyncPayload);
      }
    });

    // Subscribe to channel status callback
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        activeChannel = channel;
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }

        const currentTimer = lastKnownTimerState;
        // Standardized Presence Track Payload:
        // { id, username, appType: 'window', status: isRunning ? (mode === 'focus' ? 'Focusing' : 'Break') : 'Idle', remainingSeconds, endTime: isRunning ? endTime : null, isRunning, mode, isSynced }
        const initialPresence = {
          id: sessionTabId,
          username: user,
          appType: 'window' as const,
          status: currentTimer.isRunning
            ? (currentTimer.mode === 'focus' ? 'Focusing' : 'Break')
            : 'Idle',
          remainingSeconds: currentTimer.remainingSeconds,
          endTime: currentTimer.isRunning ? currentTimer.endTime : null,
          isRunning: Boolean(currentTimer.isRunning),
          mode: currentTimer.mode,
          isSynced: Boolean($studyRoom.get().isSynced),
          synced: Boolean($studyRoom.get().isSynced),
          avatarColor,
          updatedAt: Date.now(),
        };

        try {
          await channel.track(initialPresence);
        } catch (err) {
          console.warn('Presence track error:', err);
        }

        $studyRoom.set({
          ...$studyRoom.get(),
          isConnected: true,
          isJoined: true,
          connectionStatus: 'online',
          isConnecting: false,
          isFormOpen: false,
          error: null,
        });

        // Trigger initial sync immediately after channel.track(...) so pre-existing peers are never missed
        updateMembersFromPresence();
      } else if (status === 'TIMED_OUT' || status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        const state = $studyRoom.get();
        // NEVER kick user out if they are joined to the room!
        if (state.isConnected || state.isJoined) {
          console.warn(`[StudyRoom] Channel status '${status}', scheduling retry and removing dead channel...`);
          $studyRoom.set({
            ...state,
            isConnected: true,
            isJoined: true,
            connectionStatus: 'reconnecting',
            isConnecting: true,
          });

          // 1. Immediately remove the dead channel from supabase client
          try {
            channel.untrack();
            supabase?.removeChannel(channel);
          } catch {}
          if (activeChannel === channel) {
            activeChannel = null;
          }

          // 2. Schedule a 2-second retry that opens a fresh channel
          if (reconnectTimer) {
            clearTimeout(reconnectTimer);
          }
          reconnectTimer = setTimeout(async () => {
            reconnectTimer = null;
            const currentState = $studyRoom.get();
            if (!currentState.isConnected && !currentState.isJoined) return;
            console.log(`[StudyRoom] Attempting silent auto-reconnect to room: ${currentState.roomCode}`);
            await connectChannel(currentState.roomCode, currentState.username);
          }, 2000);
        } else {
          $studyRoom.set({
            ...state,
            isConnected: false,
            isJoined: false,
            connectionStatus: 'error',
            isConnecting: false,
            error: 'Offline / Check .env',
          });
        }
      }
    });

    return true;
  } catch (err) {
    console.error('Failed to connect study room:', err);
    const state = $studyRoom.get();
    if (state.isConnected || state.isJoined) {
      $studyRoom.set({
        ...state,
        connectionStatus: 'reconnecting',
        isConnecting: true,
      });
      scheduleReconnect(2000);
    } else {
      $studyRoom.set({
        ...state,
        isConnected: false,
        isJoined: false,
        connectionStatus: 'error',
        isConnecting: false,
        error: 'Offline / Check .env',
      });
    }
    return false;
  }
}

// Join room using unified Supabase Realtime channel
export async function joinRoom(targetRoom?: string, targetName?: string) {
  if (!isSupabaseConfigured || !supabase) {
    $studyRoom.set({
      ...$studyRoom.get(),
      connectionStatus: 'error',
      isConnected: false,
      isJoined: false,
      isConnecting: false,
      error: 'Offline / Check .env',
    });
    return false;
  }

  const current = $studyRoom.get();
  const room = normalizeRoomCode(targetRoom || current.roomCode || 'study-lounge');
  const user = (targetName || current.username || 'StudyBuddy').trim();

  if (!room) {
    $studyRoom.set({ ...current, error: 'Please enter a room code' });
    return false;
  }
  if (!user) {
    $studyRoom.set({ ...current, error: 'Please enter a username' });
    return false;
  }

  // Clear existing reconnect timer if any
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  // Mark joined immediately so user is kept in room view
  $studyRoom.set({
    ...current,
    roomCode: room,
    username: user,
    isConnecting: true,
    isConnected: true,
    isJoined: true,
    connectionStatus: 'connecting',
    isFormOpen: false,
    error: null,
  });

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('vw_study_room', room);
      localStorage.setItem('vw_study_username', user);
    } catch {}
  }

  return await connectChannel(room, user);
}

// Leave room cleanly (user explicitly clicked Leave)
export async function leaveRoom() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (activeChannel && supabase) {
    try {
      await activeChannel.untrack();
      await supabase.removeChannel(activeChannel);
    } catch {}
  }
  activeChannel = null;

  $studyRoom.set({
    ...$studyRoom.get(),
    connectionStatus: 'disconnected',
    isConnected: false,
    isJoined: false,
    isConnecting: false,
    members: [],
    error: null,
  });
}

// Broadcast timer sync event (throttled to meaningful transitions: start/pause/reset/mode-change)
export async function broadcastTimerSync(payload: {
  isRunning: boolean;
  mode: 'focus' | 'break';
  endTime: number | null;
  remainingSeconds: number;
}) {
  setTimerSnapshot(payload);
  updatePresence(payload);

  const state = $studyRoom.get();
  if ((!state.isConnected && !state.isJoined) || !state.isSynced || !activeChannel) return;

  const sessionTabId = getSessionTabId();
  try {
    // Broadcast Event Name ('timer_sync'): { isRunning, mode, endTime, remainingSeconds, updatedBy: sessionTabId }
    await activeChannel.send({
      type: 'broadcast',
      event: 'timer_sync',
      payload: {
        isRunning: payload.isRunning,
        mode: payload.mode,
        endTime: payload.endTime,
        remainingSeconds: payload.remainingSeconds,
        updatedBy: sessionTabId,
        senderId: sessionTabId, // For compatibility
        timestamp: Date.now(),
      },
    });
  } catch (err) {
    console.warn('Broadcast timer_sync error:', err);
  }
}

// Update presence for self
export async function updatePresence(timerState?: {
  isRunning: boolean;
  mode: 'focus' | 'break';
  endTime: number | null;
  remainingSeconds: number;
}) {
  const currentState = timerState || lastKnownTimerState;
  setTimerSnapshot(currentState);

  const state = $studyRoom.get();
  if ((!state.isConnected && !state.isJoined) || !activeChannel) return;

  const sessionTabId = getSessionTabId();
  const avatarColor = getAvatarColor(state.username || sessionTabId);

  // Exact Presence Track Payload Schema
  const payload = {
    id: sessionTabId,
    username: state.username || 'StudyBuddy',
    appType: 'window' as const,
    status: currentState.isRunning
      ? (currentState.mode === 'focus' ? 'Focusing' : 'Break')
      : 'Idle',
    remainingSeconds: currentState.remainingSeconds,
    endTime: currentState.isRunning ? currentState.endTime : null,
    isRunning: Boolean(currentState.isRunning),
    mode: currentState.mode,
    isSynced: Boolean(state.isSynced),
    synced: Boolean(state.isSynced),
    avatarColor,
    updatedAt: Date.now(),
  };

  try {
    await activeChannel.track(payload);
  } catch (err) {
    console.warn('Update presence error:', err);
  }
}

// Background tab visibility & online recovery listeners
if (typeof document !== 'undefined') {
  const handleVisibilityRecovery = () => {
    if (document.visibilityState === 'visible') {
      const state = $studyRoom.get();
      if (state.isConnected || state.isJoined) {
        const channelState = activeChannel?.state;
        if (!activeChannel || channelState !== 'joined') {
          console.log('[StudyRoom] Tab visible / online: channel state is ' + channelState + ', reconnecting immediately...');
          if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
          }
          if (activeChannel && supabase) {
            try {
              supabase.removeChannel(activeChannel);
            } catch {}
            activeChannel = null;
          }
          connectChannel(state.roomCode, state.username);
        } else {
          console.log('[StudyRoom] Tab visible: channel is joined, re-tracking presence...');
          updatePresence();
          try {
            const raw = activeChannel.presenceState();
            const members = parsePresenceMembers(raw, getSessionTabId());
            $studyRoom.set({
              ...$studyRoom.get(),
              members,
              connectionStatus: 'online',
              isConnecting: false,
            });
            checkAndApplyRoomTimerCatchUp(members);
          } catch {}
        }
      }
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityRecovery);
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', handleVisibilityRecovery);
    window.addEventListener('online', handleVisibilityRecovery);
  }
}
