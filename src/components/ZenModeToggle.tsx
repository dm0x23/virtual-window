import { useStore } from '@nanostores/preact';
import { $zenMode, $isFullscreen, toggleZenMode, toggleFullscreen } from '../stores/appStore';
import { Eye, EyeOff, Maximize2, Minimize2 } from 'lucide-preact';

export default function ZenModeToggle() {
  const zenMode = useStore($zenMode);
  const isFullscreen = useStore($isFullscreen);

  if (zenMode) {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 select-none">
        <button
          type="button"
          onClick={toggleZenMode}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-white/20 bg-[#1C1D22] text-white shadow-2xl hover:bg-[#25272E] hover:border-amber-400/60 transition-all text-xs font-medium group active:scale-95 cursor-pointer"
        >
          <EyeOff size={15} className="text-amber-400 group-hover:rotate-12 transition-transform" />
          <span>Exit Zen Mode</span>
        </button>

        <button
          type="button"
          onClick={toggleFullscreen}
          className="p-2.5 rounded-full border border-white/20 bg-[#1C1D22] text-white shadow-2xl hover:bg-[#25272E] hover:border-sky-400/60 transition-all text-xs font-medium group active:scale-95 cursor-pointer"
          title={isFullscreen ? 'Exit Fullscreen (F11)' : 'Fullscreen (F11)'}
          aria-label={isFullscreen ? 'Exit Fullscreen (F11)' : 'Fullscreen (F11)'}
        >
          {isFullscreen ? (
            <Minimize2 size={15} className="text-sky-300" />
          ) : (
            <Maximize2 size={15} className="text-sky-300" />
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-6 right-[74px] z-40 flex items-center gap-2 select-none">
      {/* Fullscreen Button (next to Zen Mode, supports clicking or pressing F11) */}
      <button
        type="button"
        onClick={toggleFullscreen}
        className="flex items-center gap-2 px-3.5 py-3 rounded-[18px] bg-[#1C1D22] hover:bg-[#25272E] border border-white/10 shadow-lg text-slate-200 hover:text-white transition-all active:scale-95 text-xs font-medium cursor-pointer"
        title={isFullscreen ? 'Exit Fullscreen (F11)' : 'Fullscreen (F11)'}
        aria-label={isFullscreen ? 'Exit Fullscreen (F11)' : 'Fullscreen (F11)'}
      >
        {isFullscreen ? (
          <Minimize2 size={16} className="text-sky-300" />
        ) : (
          <Maximize2 size={16} className="text-sky-300" />
        )}
        <span className="hidden sm:inline">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
      </button>

      {/* Zen Mode Button */}
      <button
        type="button"
        onClick={toggleZenMode}
        className="flex items-center gap-2 px-3.5 py-3 rounded-[18px] bg-[#1C1D22] hover:bg-[#25272E] border border-white/10 shadow-lg text-slate-200 hover:text-white transition-all active:scale-95 text-xs font-medium cursor-pointer"
        title="Zen Mode"
        aria-label="Zen Mode"
      >
        <Eye size={16} className="text-amber-300" />
        <span className="hidden sm:inline">Zen Mode</span>
      </button>
    </div>
  );
}
