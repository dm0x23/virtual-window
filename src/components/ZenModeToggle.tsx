import { useStore } from '@nanostores/preact';
import { $zenMode, toggleZenMode } from '../stores/appStore';
import { Eye, EyeOff } from 'lucide-preact';

export default function ZenModeToggle() {
  const zenMode = useStore($zenMode);

  if (zenMode) {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <button
          onClick={toggleZenMode}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-white/20 bg-[#1C1D22] text-white shadow-2xl hover:bg-[#25272E] hover:border-amber-400/60 transition-all text-xs font-medium group active:scale-95"
        >
          <EyeOff size={15} className="text-amber-400 group-hover:rotate-12 transition-transform" />
          <span>Exit Zen Mode</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-6 right-20 z-40">
      <button
        onClick={toggleZenMode}
        className="flex items-center gap-2 px-3.5 py-3 rounded-[18px] bg-[#1C1D22] hover:bg-[#25272E] border border-white/10 shadow-lg text-slate-200 hover:text-white transition-all active:scale-95 text-xs font-medium"
        title="Zen Mode"
        aria-label="Zen Mode"
      >
        <Eye size={16} className="text-amber-300" />
        <span className="hidden sm:inline">Zen Mode</span>
      </button>
    </div>
  );
}
