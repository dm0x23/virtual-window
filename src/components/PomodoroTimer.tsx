import { useState, useEffect, useRef } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import {
  $pomodoroConfig,
  $zenMode,
} from '../stores/appStore';
import { audioService } from '../services/audioService';
import { Play, Pause, RotateCcw, Bell, BellOff } from 'lucide-preact';
import { useDraggable } from '../hooks/useDraggable';

// Background-safe inline Web Worker script for drift-free background countdowns
const WORKER_SCRIPT = `
let timer = null;
self.onmessage = function(e) {
  if (e.data === 'start') {
    if (timer) clearInterval(timer);
    timer = setInterval(function() {
      self.postMessage('tick');
    }, 250);
  } else if (e.data === 'stop') {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }
};
`;

export default function PomodoroTimer() {
  const config = useStore($pomodoroConfig);
  const zenMode = useStore($zenMode);

  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [timeLeft, setTimeLeft] = useState<number>(config.focusMinutes * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // Desktop notification permission state
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  // Target timestamp in epoch milliseconds (Date.now() + remainingMs)
  const endTimeRef = useRef<number | null>(null);
  const modeRef = useRef(mode);
  const configRef = useRef(config);
  modeRef.current = mode;
  configRef.current = config;

  // Web Worker ref
  const workerRef = useRef<Worker | null>(null);

  const { position, handleMouseDown, isDragging, elementRef } = useDraggable({
    storageKey: 'vw_drag_pomodoro',
  });

  // Sync timeLeft when config changes and timer is paused/stopped
  useEffect(() => {
    if (!isRunning) {
      if (mode === 'focus') {
        setTimeLeft(config.focusMinutes * 60);
      } else {
        setTimeLeft(config.breakMinutes * 60);
      }
    }
  }, [config, mode, isRunning]);

  // Initialize background-safe inline Web Worker
  useEffect(() => {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') return;

    try {
      const blob = new Blob([WORKER_SCRIPT], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      const worker = new Worker(workerUrl);

      worker.onmessage = (e) => {
        if (e.data === 'tick') {
          evaluateTick();
        }
      };

      workerRef.current = worker;

      return () => {
        worker.postMessage('stop');
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
      };
    } catch (err) {
      console.warn('Web Worker initialization failed, fallback will be used:', err);
    }
  }, []);

  // Helper to trigger native browser notification with focus-on-click
  const sendDesktopNotification = (title: string, body: string) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body,
          icon: '/favicon.svg',
          silent: false,
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch (err) {
        console.warn('Notification trigger failed:', err);
      }
    }
  };

  // Clock-accurate tick evaluation function
  const evaluateTick = () => {
    if (!endTimeRef.current) return;
    const now = Date.now();
    const diffMs = endTimeRef.current - now;

    if (diffMs <= 0) {
      // Time reached 00:00: trigger audio chime + native desktop notification
      audioService.playCompletionChime();

      const finishedMode = modeRef.current;
      if (finishedMode === 'focus') {
        sendDesktopNotification(
          'Focus session complete!',
          'Time to take a cozy break.'
        );
      } else {
        sendDesktopNotification(
          'Break is over!',
          'Ready to jump back into focus?'
        );
      }

      const nextMode = finishedMode === 'focus' ? 'break' : 'focus';
      setMode(nextMode);
      modeRef.current = nextMode;
      setIsRunning(false);
      endTimeRef.current = null;
      if (workerRef.current) {
        workerRef.current.postMessage('stop');
      }
      const nextDuration = (nextMode === 'focus' ? configRef.current.focusMinutes : configRef.current.breakMinutes) * 60;
      setTimeLeft(nextDuration);
    } else {
      const remainingSec = Math.max(0, Math.ceil(diffMs / 1000));
      setTimeLeft(remainingSec);
    }
  };

  // Manage worker & fallback interval when timer runs
  useEffect(() => {
    let fallbackInterval: ReturnType<typeof setInterval> | null = null;

    if (isRunning && endTimeRef.current) {
      evaluateTick();
      if (workerRef.current) {
        workerRef.current.postMessage('start');
      } else {
        fallbackInterval = setInterval(evaluateTick, 250);
      }
    } else {
      if (workerRef.current) {
        workerRef.current.postMessage('stop');
      }
    }

    return () => {
      if (fallbackInterval) clearInterval(fallbackInterval);
      if (workerRef.current) {
        workerRef.current.postMessage('stop');
      }
    };
  }, [isRunning]);

  // Instant sync on tab focus or un-minimize (visibilitychange & window focus)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isRunning && endTimeRef.current) {
        evaluateTick();
      }
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setNotifPermission(Notification.permission);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [isRunning]);

  // Request notification permission gracefully on user action
  const requestNotificationPermission = () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission()
        .then((perm) => {
          setNotifPermission(perm);
        })
        .catch(() => {});
    }
  };

  const handleTogglePlay = () => {
    if (!isRunning) {
      // Gracefully request notification permission on user-initiated Start
      requestNotificationPermission();

      // Start countdown
      const currentSeconds = timeLeft <= 0
        ? (mode === 'focus' ? config.focusMinutes : config.breakMinutes) * 60
        : timeLeft;
      endTimeRef.current = Date.now() + currentSeconds * 1000;
      setTimeLeft(currentSeconds);
      setIsRunning(true);
    } else {
      // Pause: capture exact remaining seconds from target timestamp
      if (endTimeRef.current) {
        const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
        setTimeLeft(remaining);
      }
      endTimeRef.current = null;
      setIsRunning(false);
      if (workerRef.current) {
        workerRef.current.postMessage('stop');
      }
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    endTimeRef.current = null;
    if (workerRef.current) {
      workerRef.current.postMessage('stop');
    }
    setTimeLeft((mode === 'focus' ? config.focusMinutes : config.breakMinutes) * 60);
  };

  const handleSwitchMode = (newMode: 'focus' | 'break') => {
    setIsRunning(false);
    endTimeRef.current = null;
    if (workerRef.current) {
      workerRef.current.postMessage('stop');
    }
    setMode(newMode);
    modeRef.current = newMode;
    setTimeLeft((newMode === 'focus' ? config.focusMinutes : config.breakMinutes) * 60);
  };

  const handleBellClick = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'default') {
      try {
        const perm = await Notification.requestPermission();
        setNotifPermission(perm);
        if (perm === 'granted') {
          sendDesktopNotification('Notifications enabled', 'You will be alerted when focus & break sessions end.');
        }
      } catch {}
    } else if (Notification.permission === 'granted') {
      sendDesktopNotification('Notifications active', 'Alerts are ready for session completion.');
    }
  };

  // Format MM:SS
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  if (zenMode) return null;

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
              left: '50%',
              transform: 'translateX(-50%)',
              transition: 'all 0.3s cubic-bezier(0.2, 0, 0, 1)',
            }
      }
      className={`z-40 flex items-center gap-3 px-5 py-2.5 rounded-full bg-[#1C1D22] border border-white/10 shadow-2xl text-slate-100 transition-shadow select-none ${
        isDragging ? 'cursor-grabbing shadow-[0_20px_40px_rgba(0,0,0,0.6)]' : 'cursor-grab'
      }`}
    >
      {/* Mode Toggle Chips */}
      <div className="flex items-center gap-1 bg-[#25272E] p-1 rounded-full border border-white/5 text-xs">
        <button
          onClick={() => handleSwitchMode('focus')}
          className={`px-3 py-1 rounded-full font-medium transition-all ${
            mode === 'focus'
              ? 'bg-[#373A44] text-amber-300 shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Focus
        </button>
        <button
          onClick={() => handleSwitchMode('break')}
          className={`px-3 py-1 rounded-full font-medium transition-all ${
            mode === 'break'
              ? 'bg-[#373A44] text-emerald-300 shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Break
        </button>
      </div>

      {/* STRICT UI RULE: Render ONLY the digital countdown clock */}
      <div className="font-mono text-2xl font-bold tracking-wider text-white px-1 select-none">
        {formattedTime}
      </div>

      {/* Minimal Icon Controls */}
      <div className="flex items-center gap-1.5 border-l border-white/10 pl-2">
        <button
          onClick={handleTogglePlay}
          className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all active:scale-95 cursor-pointer"
          title={isRunning ? 'Pause' : 'Start'}
          aria-label={isRunning ? 'Pause' : 'Start'}
        >
          {isRunning ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
        </button>

        <button
          onClick={handleReset}
          className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all active:scale-95 cursor-pointer"
          title="Reset timer"
          aria-label="Reset timer"
        >
          <RotateCcw size={15} />
        </button>

        {/* Desktop notification indicator & manual toggle */}
        <button
          onClick={handleBellClick}
          className={`p-2 rounded-full transition-all active:scale-95 cursor-pointer ${
            notifPermission === 'granted'
              ? 'bg-amber-400/15 text-amber-300 hover:bg-amber-400/25'
              : notifPermission === 'denied'
              ? 'bg-rose-500/15 text-rose-400 hover:bg-rose-500/25'
              : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
          }`}
          title={
            notifPermission === 'granted'
              ? 'Desktop alerts enabled (click to test)'
              : notifPermission === 'denied'
              ? 'Desktop alerts blocked in browser settings'
              : 'Click to enable desktop alerts'
          }
          aria-label="Desktop notifications"
        >
          {notifPermission === 'denied' ? (
            <BellOff size={15} />
          ) : (
            <Bell size={15} />
          )}
        </button>
      </div>
    </div>
  );
}
