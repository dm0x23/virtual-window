import { useState, useEffect } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import {
  $studyRoom,
  setRoomCode,
  setUsername,
  setFormOpen,
  toggleFormOpen,
  setCollapsed,
  toggleCollapsed,
  setSyncedMode,
  joinRoom,
  leaveRoom,
  normalizeRoomCode,
  type StudyBuddy,
} from '../stores/studyRoomStore';
import { $zenMode } from '../stores/appStore';
import { isSupabaseConfigured } from '../lib/supabase';
import { useDraggable } from '../hooks/useDraggable';
import {
  Users,
  Copy,
  Check,
  LogOut,
  ChevronUp,
  ChevronDown,
  Link2,
  Unlink2,
  Sparkles,
  AlertCircle,
  X,
  Compass,
} from 'lucide-preact';

export default function StudyRoomWidget() {
  const room = useStore($studyRoom);
  const zenMode = useStore($zenMode);

  const [copied, setCopied] = useState(false);
  const [, setTick] = useState(0);

  const { position, handleMouseDown, isDragging, elementRef } = useDraggable({
    storageKey: 'vw_drag_study_room',
  });

  // Re-render every second to smoothly decrement active buddy countdowns
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-fill room code from URL query param on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const roomParam = params.get('room');
        if (roomParam && roomParam.trim()) {
          setRoomCode(normalizeRoomCode(roomParam));
          // If room param is present and not connected, automatically open the form
          if (!room.isConnected) {
            setFormOpen(true);
          }
        }
      } catch {}
    }
  }, []);

  const handleCopyInvite = (e?: Event) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (typeof window === 'undefined') return;
    try {
      const clean = normalizeRoomCode(room.roomCode || 'study-lounge');
      const url = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(clean)}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleJoinSubmit = async (e: Event) => {
    e.preventDefault();
    await joinRoom();
  };

  const formatMemberTime = (buddy: StudyBuddy): string => {
    let seconds = buddy.remainingSeconds;
    if (buddy.isRunning && buddy.endTime) {
      seconds = Math.max(0, Math.ceil((buddy.endTime - Date.now()) / 1000));
    }
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (zenMode) return null;

  // =========================================================================
  // STATE 1: CONNECTED (Study Buddies Card)
  // =========================================================================
  if (room.isConnected) {
    return (
      <div
        ref={elementRef}
        onMouseDown={handleMouseDown}
        style={
          position
            ? {
                transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
                position: 'fixed',
                top: 0,
                left: 0,
                transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0, 0, 1)',
              }
            : {
                position: 'fixed',
                top: '24px',
                left: 'calc(50% + 185px)',
                transition: 'all 0.3s cubic-bezier(0.2, 0, 0, 1)',
              }
        }
        className={`z-40 w-80 md:w-84 rounded-[20px] bg-[#1C1D22] border border-white/10 shadow-2xl transition-shadow text-slate-100 flex flex-col select-none ${
          isDragging ? 'cursor-grabbing shadow-[0_20px_40px_rgba(0,0,0,0.6)]' : 'cursor-grab'
        } ${room.isCollapsed ? 'h-auto' : ''}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 select-none">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-[#8EA2FF]/20 text-[#8EA2FF] border border-[#8EA2FF]/30 shrink-0">
              <Users size={16} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-semibold text-white tracking-wide truncate">
                  #{room.roomCode}
                </span>

                {/* Real-time status dot: green ONLY when SUBSCRIBED */}
                {room.connectionStatus === 'connected' ? (
                  <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {room.members.length} online
                  </span>
                ) : room.connectionStatus === 'error' || !isSupabaseConfigured ? (
                  <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-rose-500/15 text-rose-300 border border-rose-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    Offline / Check .env
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    Connecting...
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Copy Invite Link */}
            <button
              onClick={handleCopyInvite}
              className="p-1.5 rounded-[10px] bg-white/5 hover:bg-white/10 text-slate-300 hover:text-[#8EA2FF] transition-colors cursor-pointer"
              title={copied ? 'Link copied!' : 'Copy invite link'}
              aria-label="Copy invite link"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>

            {/* Leave Room */}
            <button
              onClick={() => leaveRoom()}
              className="p-1.5 rounded-[10px] bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              title="Leave room"
              aria-label="Leave room"
            >
              <LogOut size={14} />
            </button>

            {/* Chevron minimize/expand button matching Tasks and Music cards */}
            <button
              onClick={() => toggleCollapsed()}
              className="w-7 h-7 flex items-center justify-center rounded-[10px] bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={room.isCollapsed ? 'Expand buddies' : 'Collapse buddies'}
              aria-label={room.isCollapsed ? 'Expand buddies' : 'Collapse buddies'}
            >
              {room.isCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
            </button>
          </div>
        </div>

        {/* Collapsed view summary */}
        {room.isCollapsed ? null : (
          <div className="p-3.5 space-y-3">
            {/* 2-Option Segmented Synced vs. Unsynced Toggle */}
            <div className="bg-[#25272E] p-1 rounded-xl border border-white/5 flex items-center gap-1">
              <button
                onClick={() => setSyncedMode(true)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  room.isSynced
                    ? 'bg-[#8EA2FF]/20 text-[#8EA2FF] border border-[#8EA2FF]/40 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Link2 size={13} />
                <span>Synced</span>
              </button>

              <button
                onClick={() => setSyncedMode(false)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  !room.isSynced
                    ? 'bg-white/10 text-slate-100 border border-white/20 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Unlink2 size={13} />
                <span>Unsynced</span>
              </button>
            </div>

            {/* Mode explanatory caption */}
            <p className="text-[11px] text-slate-400 px-1">
              {room.isSynced
                ? 'Timer is synchronized with everyone in the room.'
                : 'Timer is independent; still sharing live status.'}
            </p>

            {/* Connected Study Buddies List */}
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {room.members.map((buddy) => {
                const initial = (buddy.username || 'U')[0].toUpperCase();
                const displayTime = formatMemberTime(buddy);
                const isFocusing = buddy.status === 'Focusing';
                const isBreak = buddy.status === 'Break';

                return (
                  <div
                    key={buddy.id}
                    className={`flex items-center justify-between p-2 rounded-[14px] border transition-all ${
                      buddy.isSelf
                        ? 'bg-[#292D38] border-[#8EA2FF]/30'
                        : 'bg-[#25272E] border-white/5'
                    }`}
                  >
                    {/* Left: Avatar + Name + Tags */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-xs shrink-0"
                        style={{ backgroundColor: buddy.avatarColor }}
                      >
                        {initial}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-white truncate max-w-[95px]">
                            {buddy.username}
                          </span>
                          {buddy.isSelf && (
                            <span className="text-[10px] text-slate-400">(You)</span>
                          )}
                        </div>

                        {/* Synced vs Solo tag + App Type Tag */}
                        <div className="mt-0.5 flex items-center gap-1">
                          {buddy.isSynced ? (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full font-medium bg-[#8EA2FF]/15 text-[#8EA2FF] border border-[#8EA2FF]/25">
                              Synced
                            </span>
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full font-medium bg-white/5 text-slate-400 border border-white/10">
                              Solo
                            </span>
                          )}

                          <span className="text-[9px] px-1 py-0.2 rounded-full font-normal bg-white/5 text-slate-400 capitalize">
                            {buddy.appType}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Status badge & countdown */}
                    <div className="flex flex-col items-end shrink-0 pl-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isFocusing
                              ? 'bg-amber-400 animate-pulse'
                              : isBreak
                              ? 'bg-emerald-400 animate-pulse'
                              : 'bg-slate-500'
                          }`}
                        />
                        <span
                          className={`text-xs font-semibold ${
                            isFocusing
                              ? 'text-amber-300'
                              : isBreak
                              ? 'text-emerald-300'
                              : 'text-slate-400'
                          }`}
                        >
                          {buddy.status}
                        </span>
                      </div>

                      {(isFocusing || isBreak) && (
                        <span className="font-mono text-[11px] text-slate-300 tracking-wider">
                          {displayTime}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // STATE 2: DISCONNECTED (Compact Study Room Pill + Minimal Join Form)
  // =========================================================================
  return (
    <div
      ref={elementRef}
      onMouseDown={handleMouseDown}
      style={
        position
          ? {
              transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
              position: 'fixed',
              top: 0,
              left: 0,
              transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0, 0, 1)',
            }
          : {
              position: 'fixed',
              top: '24px',
              left: 'calc(50% + 185px)',
              transition: 'all 0.3s cubic-bezier(0.2, 0, 0, 1)',
            }
      }
      className={`z-40 transition-shadow select-none ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
    >
      {/* Closed State Pill */}
      {!room.isFormOpen && (
        <button
          onClick={() => toggleFormOpen()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#1C1D22] hover:bg-[#25272E] border border-white/10 hover:border-[#8EA2FF]/40 shadow-2xl text-slate-100 transition-all active:scale-95 cursor-pointer group"
          title="Join or create a study room"
          aria-label="Study Room"
        >
          <div className="p-1 rounded-full bg-[#8EA2FF]/20 text-[#8EA2FF] border border-[#8EA2FF]/30 group-hover:bg-[#8EA2FF]/30 transition-colors">
            <Users size={14} />
          </div>
          <span className="text-xs font-semibold tracking-wide text-slate-200 group-hover:text-white">
            Study Room
          </span>
          {!isSupabaseConfigured ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-rose-500/15 text-rose-400 border border-rose-500/30">
              Offline
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-[#8EA2FF]/15 text-[#8EA2FF] border border-[#8EA2FF]/25">
              Live
            </span>
          )}
        </button>
      )}

      {/* Open Minimal Form Card */}
      {room.isFormOpen && (
        <div className="w-80 rounded-[20px] bg-[#1C1D22] border border-white/10 shadow-2xl text-slate-100 flex flex-col p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#8EA2FF]/20 text-[#8EA2FF] border border-[#8EA2FF]/30">
                <Users size={16} />
              </div>
              <h3 className="text-sm font-semibold text-white tracking-wide">
                Join Study Room
              </h3>
            </div>

            <button
              onClick={() => setFormOpen(false)}
              className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Close"
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>

          {/* Missing Supabase keys subtle warning */}
          {(!isSupabaseConfigured || room.connectionStatus === 'error') && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-medium">
              <AlertCircle size={14} className="shrink-0 text-rose-400" />
              <span>Offline / Check .env</span>
            </div>
          )}

          {/* Join Form */}
          <form onSubmit={handleJoinSubmit} className="space-y-3">
            {/* Username input */}
            <div>
              <label
                htmlFor="study-username"
                className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1"
              >
                Your Name
              </label>
              <input
                id="study-username"
                type="text"
                value={room.username}
                onInput={(e) => setUsername((e.target as HTMLInputElement).value)}
                placeholder="e.g. Alex"
                className="w-full bg-[#25272E] text-xs text-white placeholder-slate-500 px-3 py-2 rounded-xl border border-white/10 focus:outline-none focus:border-[#8EA2FF]/60 transition-all"
                required
              />
            </div>

            {/* Room Code input + Copy invite button */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="study-room-code"
                  className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block"
                >
                  Room Code
                </label>
                <button
                  type="button"
                  onClick={handleCopyInvite}
                  className="flex items-center gap-1 text-[11px] text-[#8EA2FF] hover:underline cursor-pointer"
                  title="Copy invite link"
                >
                  {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                  <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>

              <div className="relative flex items-center">
                <input
                  id="study-room-code"
                  type="text"
                  value={room.roomCode}
                  onInput={(e) => setRoomCode((e.target as HTMLInputElement).value)}
                  placeholder="e.g. study-lounge"
                  className="w-full bg-[#25272E] text-xs text-white placeholder-slate-500 px-3 py-2 rounded-xl border border-white/10 focus:outline-none focus:border-[#8EA2FF]/60 transition-all font-mono"
                  required
                />
              </div>
            </div>

            {room.error && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2 rounded-lg">
                {room.error}
              </p>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={room.isConnecting}
              className="w-full mt-2 bg-[#8EA2FF] hover:bg-[#7D93FF] disabled:opacity-50 text-slate-950 font-bold text-xs py-2.5 px-4 rounded-xl transition-all active:scale-95 cursor-pointer shadow-md flex items-center justify-center gap-1.5"
            >
              <Sparkles size={14} />
              <span>{room.isConnecting ? 'Connecting...' : 'Join Room'}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
