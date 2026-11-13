import { useState, useEffect, useRef } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  $studyRoom,
  $incomingTimerSync,
  getSessionTabId,
  getAvatarColor,
  normalizeRoomCode,
  parsePresenceMembers,
  checkAndApplyRoomTimerCatchUp,
  getTimerSnapshot,
  setActiveChannel,
  type TimerSyncPayload,
} from '../stores/studyRoomStore';

export function useStudyRoom() {
  const room = useStore($studyRoom);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isJoined = Boolean(room.isConnected || room.isJoined);
  const roomCode = room.roomCode;

  // 1. Isolate channel subscription to [isJoined, roomCode, reconnectAttempt]
  useEffect(() => {
    if (!isJoined || !roomCode || !isSupabaseConfigured || !supabase) {
      if (channelRef.current && supabase) {
        try {
          channelRef.current.untrack();
          supabase.removeChannel(channelRef.current);
        } catch {}
        channelRef.current = null;
      }
      return;
    }

    const cleanRoom = normalizeRoomCode(roomCode);
    const sessionTabId = getSessionTabId();
    const user = (room.username || 'StudyBuddy').trim();
    const avatarColor = getAvatarColor(user);

    // Clean up previous channel before opening a fresh subscription
    if (channelRef.current) {
      try {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
      } catch {}
      channelRef.current = null;
    }

    const channel = supabase.channel(`cozy-study-room:${cleanRoom}`, {
      config: {
        presence: { key: sessionTabId },
        broadcast: { self: false },
      },
    });
    channelRef.current = channel;

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
      checkAndApplyRoomTimerCatchUp(members);
    };

    channel
      .on('presence', { event: 'sync' }, updateMembersFromPresence)
      .on('presence', { event: 'join' }, updateMembersFromPresence)
      .on('presence', { event: 'leave' }, updateMembersFromPresence);

    channel.on('broadcast', { event: 'timer_sync' }, ({ payload }) => {
      if (!payload) return;
      if (payload.updatedBy === sessionTabId || payload.senderId === sessionTabId) return;
      if ($studyRoom.get().isSynced) {
        $incomingTimerSync.set(payload as TimerSyncPayload);
      }
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setActiveChannel(channel);
        // Clear any pending retry timer
        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current);
          retryTimerRef.current = null;
        }

        const state = $studyRoom.get();
        const currentTimer = getTimerSnapshot();
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
          isSynced: Boolean(state.isSynced),
          synced: Boolean(state.isSynced),
          avatarColor,
          updatedAt: Date.now(),
        };

        try {
          await channel.track(initialPresence);
        } catch (err) {
          console.warn('Track presence error:', err);
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

        updateMembersFromPresence();
      } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR' || status === 'CLOSED') {
        const state = $studyRoom.get();
        if (state.isConnected || state.isJoined) {
          console.warn(`[useStudyRoom] Channel status '${status}', scheduling retry and removing dead channel...`);
          $studyRoom.set({
            ...state,
            isConnected: true,
            isJoined: true,
            connectionStatus: 'reconnecting',
            isConnecting: true,
          });

          // Schedule a 2-second retry that removes the dead channel and increments reconnectAttempt
          if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
          }
          retryTimerRef.current = setTimeout(async () => {
            retryTimerRef.current = null;
            if (channel && supabase) {
              try {
                await channel.untrack();
                await supabase.removeChannel(channel);
              } catch {}
            }
            if (channelRef.current === channel) {
              channelRef.current = null;
            }
            setReconnectAttempt((n) => n + 1);
          }, 2000);
        }
      }
    });

    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (channelRef.current && supabase) {
        try {
          channelRef.current.untrack();
          supabase.removeChannel(channelRef.current);
        } catch {}
        channelRef.current = null;
      }
    };
  }, [isJoined, roomCode, reconnectAttempt]);

  // 2. Immediate Health Check on Tab Focus (visibilitychange & online)
  useEffect(() => {
    const handleHealthCheck = () => {
      if (document.visibilityState === 'visible' && (room.isConnected || room.isJoined)) {
        if (!channelRef.current || channelRef.current.state !== 'joined') {
          console.log('[useStudyRoom] Visibility change / online health check: channel not joined, triggering reconnect immediately...');
          if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
          }
          if (channelRef.current && supabase) {
            try {
              supabase.removeChannel(channelRef.current);
            } catch {}
            channelRef.current = null;
          }
          setReconnectAttempt((n) => n + 1);
        }
      }
    };

    document.addEventListener('visibilitychange', handleHealthCheck);
    window.addEventListener('online', handleHealthCheck);
    window.addEventListener('focus', handleHealthCheck);

    return () => {
      document.removeEventListener('visibilitychange', handleHealthCheck);
      window.removeEventListener('online', handleHealthCheck);
      window.removeEventListener('focus', handleHealthCheck);
    };
  }, [room.isConnected, room.isJoined]);

  return {
    room,
    isJoined,
    reconnectAttempt,
    channelRef,
    triggerReconnect: () => setReconnectAttempt((n) => n + 1),
  };
}
