import { useState, useEffect, useRef } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import {
  $pomodoroConfig,
  $zenMode,
} from '../stores/appStore';
import { audioService } from '../services/audioService';
import { Play, Pause, RotateCcw } from 'lucide-preact';
import { useDraggable } from '../hooks/useDraggable';

export default function PomodoroTimer() {
  const config = useStore($pomodoroConfig);
  const zenMode = useStore($zenMode);

  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [timeLeft, setTimeLeft] = useState<number>(config.focusMinutes * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const { position, handleMouseDown, isDragging, elementRef } = useDraggable({
    storageKey: 'vw_drag_pomodoro',
  });

  // Sync timeLeft when config changes and timer is not running
  const prevConfigRef = useRef(config);
  useEffect(() => {
    if (!isRunning) {
      if (mode === 'focus') {
        setTimeLeft(config.focusMinutes * 60);
      } else {
        setTimeLeft(config.breakMinutes * 60);
      }
    }
    prevConfigRef.current = config;
  }, [config, mode, isRunning]);

  // Timer countdown
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isRunning) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Reached 00:00 - chime and switch mode
            audioService.playCompletionChime();
            const nextMode = mode === 'focus' ? 'break' : 'focus';
            setMode(nextMode);
            setIsRunning(false);
            return (nextMode === 'focus' ? config.focusMinutes : config.breakMinutes) * 60;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, mode, config]);

  const handleTogglePlay = () => {
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft((mode === 'focus' ? config.focusMinutes : config.breakMinutes) * 60);
  };

  const handleSwitchMode = (newMode: 'focus' | 'break') => {
    setMode(newMode);
    setIsRunning(false);
    setTimeLeft((newMode === 'focus' ? config.focusMinutes : config.breakMinutes) * 60);
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
          className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all active:scale-95"
          title={isRunning ? 'Pause' : 'Start'}
          aria-label={isRunning ? 'Pause' : 'Start'}
        >
          {isRunning ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
        </button>

        <button
          onClick={handleReset}
          className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all active:scale-95"
          title="Reset timer"
          aria-label="Reset timer"
        >
          <RotateCcw size={15} />
        </button>Working
        
        
        
      </div>
    </div>
  );
}
