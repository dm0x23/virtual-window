import { atom } from 'nanostores';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

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

function getAvatarColor(name: string): string {
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

    // If switched back to Synced, check if other room members are running an active synced timer
    if (synced && current.members.length > 0) {
      const activeSyncedMember = current.members.find(
        (m) => !m.isSelf && m.isSynced && m.isRunning && m.endTime && m.endTime > Date.now()
      );
      if (activeSyncedMember) {
        $incomingTimerSync.set({
          isRunning: true,
          mode: activeSyncedMember.mode,
          endTime: activeSyncedMember.endTime,
          remainingSeconds: Math.max(0, Math.ceil((activeSyncedMember.endTime - Date.now()) / 1000)),
          updatedBy: activeSyncedMember.id,
          senderId: activeSyncedMember.id,
          timestamp: Date.now(),
        });
      } else {
        const pausedSyncedMember = current.members.find(
          (m) => !m.isSelf && m.isSynced && !m.isRunning && typeof m.remainingSeconds === 'number'
        );
        if (pausedSyncedMember) {
          $incomingTimerSync.set({
            isRunning: false,
            mode: pausedSyncedMember.mode,
            endTime: null,
            remainingSeconds: pausedSyncedMember.remainingSeconds,
            updatedBy: pausedSyncedMember.id,
            senderId: pausedSyncedMember.id,
            timestamp: Date.now(),
          });
        }
      }
    }
  }
}

export function toggleSynced() {
  setSyncedMode(!$studyRoom.get().isSynced);
}

// Extract presence state into clean members list
function parsePresenceMembers(
  presenceState: Record<string, any[]>,
  selfId: string
): StudyBuddy[] {
  const list: StudyBuddy[] = [];

  for (const [key, presences] of Object.entries(presenceState)) {
    if (!presences || presences.length === 0) continue;
    const latest = presences[presences.length - 1];
    list.push({
      id: key,
      username: latest.username || 'Anonymous',
      appType: latest.appType === 'patio' ? 'patio' : 'window',
      status: latest.status || 'Idle',
      mode: latest.mode || 'focus',
      remainingSeconds: typeof latest.remainingSeconds === 'number' ? latest.remainingSeconds : 25 * 60,
      isRunning: Boolean(latest.isRunning),
      endTime: latest.endTime || null,
      isSynced: latest.isSynced !== false,
      avatarColor: latest.avatarColor || getAvatarColor(latest.username || key),
      updatedAt: latest.updatedAt || Date.now(),
      isSelf: key === selfId,
    });
  }

  // Sort: Self first, then alphabetical
  return list.sort((a, b) => {
    if (a.isSelf) return -1;
    if (b.isSelf) return 1;
    return a.username.localeCompare(b.username);
  });
}

// Join room using unified Supabase Realtime channel
export async function joinRoom(targetRoom?: string, targetName?: string) {
  if (!isSupabaseConfigured || !supabase) {
    $studyRoom.set({
      ...$studyRoom.get(),
      connectionStatus: 'error',
      isConnected: false,
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

  // Clean up any existing connection
  if (activeChannel) {
    try {
      await activeChannel.untrack();
      await supabase.removeChannel(activeChannel);
    } catch {}
    activeChannel = null;
  }

  $studyRoom.set({
    ...current,
    roomCode: room,
    username: user,
    isConnecting: true,
    connectionStatus: 'connecting',
    error: null,
  });

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('vw_study_room', room);
      localStorage.setItem('vw_study_username', user);
    } catch {}
  }

  const sessionTabId = getSessionTabId();
  const avatarColor = getAvatarColor(user);

  try {
    // Standardized channel name: cozy-study-room:${cleanRoom}
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

    let hasInheritedInitialState = false;

    // Presence sync listener
    channel.on('presence', { event: 'sync' }, () => {
      const raw = channel.presenceState();
      const members = parsePresenceMembers(raw, sessionTabId);

      $studyRoom.set({
        ...$studyRoom.get(),
        members,
        isConnected: true,
        connectionStatus: 'connected',
        isConnecting: false,
        isFormOpen: false,
        error: null,
      });

      // Whenever a user joins (presence sync event) and isSynced === true,
      // if another synced user in the room already has an active isRunning timer, immediately adopt their endTime and mode
      if (!hasInheritedInitialState && $studyRoom.get().isSynced) {
        hasInheritedInitialState = true;
        const activeSyncedMember = members.find(
          (m) => !m.isSelf && m.isSynced && m.isRunning && m.endTime && m.endTime > Date.now()
        );
        if (activeSyncedMember) {
          $incomingTimerSync.set({
            isRunning: true,
            mode: activeSyncedMember.mode,
            endTime: activeSyncedMember.endTime,
            remainingSeconds: Math.max(0, Math.ceil((activeSyncedMember.endTime - Date.now()) / 1000)),
            updatedBy: activeSyncedMember.id,
            senderId: activeSyncedMember.id,
            timestamp: Date.now(),
          });
        } else {
          const pausedMember = members.find(
            (m) => !m.isSelf && m.isSynced && !m.isRunning && typeof m.remainingSeconds === 'number'
          );
          if (pausedMember) {
            $incomingTimerSync.set({
              isRunning: false,
              mode: pausedMember.mode,
              endTime: null,
              remainingSeconds: pausedMember.remainingSeconds,
              updatedBy: pausedMember.id,
              senderId: pausedMember.id,
              timestamp: Date.now(),
            });
          }
        }
      }
    });

    // Broadcast timer_sync listener
    channel.on('broadcast', { event: 'timer_sync' }, ({ payload }) => {
      if (!payload || payload.updatedBy === sessionTabId || payload.senderId === sessionTabId) {
        return;
      }

      const state = $studyRoom.get();
      // If user is in Synced mode, apply broadcast
      if (state.isSynced) {
        $incomingTimerSync.set(payload as TimerSyncPayload);
      }
    });

    // Subscribe to channel status callback
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        activeChannel = channel;

        const currentTimer = lastKnownTimerState;
        // Standardized Presence Track Payload:
        // { id: sessionTabId, username, appType: 'window', status: 'Focusing' | 'Break' | 'Idle', remainingSeconds, isSynced }
        const initialPresence = {
          id: sessionTabId,
          username: user,
          appType: 'window' as const,
          status: currentTimer.isRunning
            ? (currentTimer.mode === 'focus' ? 'Focusing' : 'Break')
            : 'Idle',
          remainingSeconds: currentTimer.remainingSeconds,
          isSynced: $studyRoom.get().isSynced,
          mode: currentTimer.mode,
          isRunning: currentTimer.isRunning,
          endTime: currentTimer.endTime,
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
          connectionStatus: 'connected',
          isConnecting: false,
          isFormOpen: false,
          error: null,
        });
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        $studyRoom.set({
          ...$studyRoom.get(),
          isConnected: false,
          connectionStatus: 'error',
          isConnecting: false,
          error: 'Offline / Check .env',
        });
      }
    });

    return true;
  } catch (err) {
    console.error('Failed to join study room:', err);
    $studyRoom.set({
      ...$studyRoom.get(),
      isConnected: false,
      connectionStatus: 'error',
      isConnecting: false,
      error: 'Offline / Check .env',
    });
    return false;
  }
}

// Leave room cleanly
export async function leaveRoom() {
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
    isConnecting: false,
    members: [],
    error: null,
  });
}

// Broadcast timer sync event
export async function broadcastTimerSync(payload: {
  isRunning: boolean;
  mode: 'focus' | 'break';
  endTime: number | null;
  remainingSeconds: number;
}) {
  setTimerSnapshot(payload);
  updatePresence(payload);

  const state = $studyRoom.get();
  if (!state.isConnected || !state.isSynced || !activeChannel) return;

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
export async function updatePresence(timerState: {
  isRunning: boolean;
  mode: 'focus' | 'break';
  endTime: number | null;
  remainingSeconds: number;
}) {
  setTimerSnapshot(timerState);

  const state = $studyRoom.get();
  if (!state.isConnected || !activeChannel) return;

  const sessionTabId = getSessionTabId();
  const avatarColor = getAvatarColor(state.username || sessionTabId);

  // Unified Presence Track Payload Schema
  const payload = {
    id: sessionTabId,
    username: state.username || 'StudyBuddy',
    appType: 'window' as const,
    status: timerState.isRunning
      ? (timerState.mode === 'focus' ? 'Focusing' : 'Break')
      : 'Idle',
    remainingSeconds: timerState.remainingSeconds,
    isSynced: state.isSynced,
    mode: timerState.mode,
    isRunning: timerState.isRunning,
    endTime: timerState.endTime,
    avatarColor,
    updatedAt: Date.now(),
  };

  try {
    await activeChannel.track(payload);
  } catch (err) {
    console.warn('Update presence error:', err);
  }
}
