import { useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import {
  $weather,
  $scenery,
  $sceneProps,
  $pomodoroConfig,
  $soundChannels,
  $soundVolumes,
  $isSettingsOpen,
  $zenMode,
  setWeather,
  setScenery,
  toggleSceneProp,
  toggleSoundChannel,
  setChannelVolume,
  setPomodoroConfig,
  resetWidgetPositions,
  type WeatherType,
  type SceneryType,
  type SoundChannels,
  type SoundVolumes,
} from '../stores/appStore';
import {
  Settings,
  X,
  Sun,
  Sunset,
  Cloud,
  CloudRain,
  CloudLightning,
  Snowflake,
  Moon,
  Volume2,
  TreePine,
  Bird,
  Waves,
  Mountain,
  Building2,
  Trees,
  RotateCcw,
} from 'lucide-preact';

export default function SettingsDrawer() {
  const weather = useStore($weather);
  const scenery = useStore($scenery);
  const sceneProps = useStore($sceneProps);
  const pomodoroConfig = useStore($pomodoroConfig);
  const soundChannels = useStore($soundChannels);
  const soundVolumes = useStore($soundVolumes);
  const isOpen = useStore($isSettingsOpen);
  const zenMode = useStore($zenMode);

  const [focusInput, setFocusInput] = useState(pomodoroConfig.focusMinutes);
  const [breakInput, setBreakInput] = useState(pomodoroConfig.breakMinutes);

  const sceneryOptions: Array<{ type: SceneryType; label: string; icon: typeof Trees }> = [
    { type: 'countryside', label: 'Countryside', icon: Trees },
    { type: 'ocean', label: 'Ocean', icon: Waves },
    { type: 'mountains', label: 'Mountains', icon: Mountain },
    { type: 'city', label: 'City', icon: Building2 },
  ];

  const weatherOptions: Array<{ type: WeatherType; label: string; icon: typeof Sun }> = [
    { type: 'sunny', label: 'Sunny', icon: Sun },
    { type: 'sunset', label: 'Sunset', icon: Sunset },
    { type: 'cloudy', label: 'Cloudy', icon: Cloud },
    { type: 'rainy', label: 'Rainy', icon: CloudRain },
    { type: 'thunder', label: 'Thunder', icon: CloudLightning },
    { type: 'snowy', label: 'Snowy', icon: Snowflake },
    { type: 'night', label: 'Night', icon: Moon },
  ];

  const soundRows: Array<{
    channel: keyof SoundChannels;
    label: string;
    icon: typeof Sun;
    accent: string;
    activeColor: string;
  }> = [
    { channel: 'rain', label: 'Rain', icon: CloudRain, accent: 'accent-blue-400', activeColor: 'text-blue-400' },
    { channel: 'thunder', label: 'Thunder', icon: CloudLightning, accent: 'accent-amber-400', activeColor: 'text-amber-400' },
    { channel: 'trees', label: 'Trees', icon: TreePine, accent: 'accent-emerald-400', activeColor: 'text-emerald-400' },
    { channel: 'birds', label: 'Birds', icon: Bird, accent: 'accent-teal-400', activeColor: 'text-teal-400' },
    { channel: 'waves', label: 'Waves', icon: Waves, accent: 'accent-cyan-400', activeColor: 'text-cyan-400' },
  ];

  const elementSwitches: Array<{ key: keyof typeof sceneProps; label: string }> = [
    { key: 'plant', label: 'Plant' },
    { key: 'mug', label: 'Mug' },
    { key: 'cat', label: 'Cat' },
    { key: 'birds', label: 'Birds' },
    { key: 'trees', label: 'Trees' },
    { key: 'leaves', label: 'Leaves' },
  ];

  if (zenMode) return null;

  return (
    <>
      {/* Floating Gear Trigger Button - Material M3 Elevated Button */}
      <div className="fixed top-6 right-6 z-40">
        <button
          onClick={() => $isSettingsOpen.set(true)}
          className="p-3 rounded-[18px] bg-[#1C1D22] hover:bg-[#25272E] border border-white/10 shadow-lg text-slate-200 hover:text-white transition-all active:scale-95"
          title="Settings"
          aria-label="Settings"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Slide-over Drawer Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            onClick={() => $isSettingsOpen.set(false)}
            className="fixed inset-0 bg-black/60 transition-opacity duration-200"
          />

          {/* Drawer Panel - Solid M3 Dark Tonal Card */}
          <div className="relative w-full max-w-sm h-full bg-[#1C1D22] border-l border-white/10 shadow-2xl flex flex-col text-slate-100 z-10 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 sticky top-0 bg-[#1C1D22] z-10">
              <h2 className="text-base font-semibold tracking-wide text-white">Settings</h2>
              <button
                onClick={() => $isSettingsOpen.set(false)}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1">
              {/* 0. SCENERY (2-column grid of icon + single-word chips) */}
              <div className="space-y-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Scenery
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {sceneryOptions.map((item) => {
                    const isActive = scenery === item.type;
                    const IconComp = item.icon;
                    return (
                      <button
                        key={item.type}
                        onClick={() => setScenery(item.type)}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[16px] text-xs font-medium transition-all border ${
                          isActive
                            ? 'bg-[#2D313A] border-amber-400/80 text-amber-200 shadow-sm'
                            : 'bg-[#25272E] border-white/5 text-slate-300 hover:bg-[#2B2E37] hover:text-white'
                        }`}
                      >
                        <IconComp size={16} className={isActive ? 'text-amber-400' : 'text-slate-400'} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 1. WEATHER (2-column grid of icon + single-word chips) */}
              <div className="space-y-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Weather
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {weatherOptions.map((item) => {
                    const isActive = weather === item.type;
                    const IconComp = item.icon;
                    return (
                      <button
                        key={item.type}
                        onClick={() => setWeather(item.type)}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[16px] text-xs font-medium transition-all border ${
                          isActive
                            ? 'bg-[#2D313A] border-amber-400/80 text-amber-200 shadow-sm'
                            : 'bg-[#25272E] border-white/5 text-slate-300 hover:bg-[#2B2E37] hover:text-white'
                        }`}
                      >
                        <IconComp size={16} className={isActive ? 'text-amber-400' : 'text-slate-400'} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. SOUNDS (4 Independent Channel Rows with Toggle + Individual Volume Sliders) */}
              <div className="space-y-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Sounds
                </span>
                <div className="space-y-2.5">
                  {soundRows.map((row) => {
                    const isEnabled = soundChannels[row.channel];
                    const volume = soundVolumes[row.channel];
                    const IconComp = row.icon;

                    return (
                      <div
                        key={row.channel}
                        className={`p-3 rounded-[16px] border transition-all ${
                          isEnabled
                            ? 'bg-[#25272E] border-white/15 shadow-sm'
                            : 'bg-[#202228] border-white/5 opacity-70 hover:opacity-100'
                        }`}
                      >
                        {/* Channel Header: Toggle Button & Percentage */}
                        <div className="flex items-center justify-between mb-2">
                          <button
                            onClick={() => toggleSoundChannel(row.channel)}
                            className="flex items-center gap-2 text-xs font-medium hover:text-white transition-colors"
                          >
                            <IconComp size={16} className={isEnabled ? row.activeColor : 'text-slate-500'} />
                            <span className={isEnabled ? 'text-white' : 'text-slate-400'}>{row.label}</span>
                          </button>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-slate-400">
                              {isEnabled ? `${Math.round(volume * 100)}%` : 'Muted'}
                            </span>
                            <button
                              onClick={() => toggleSoundChannel(row.channel)}
                              className={`w-3 h-3 rounded-full transition-all ${
                                isEnabled
                                  ? 'bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.8)]'
                                  : 'bg-slate-600'
                              }`}
                              title={isEnabled ? 'Mute channel' : 'Enable channel'}
                            />
                          </div>
                        </div>

                        {/* Channel Individual Volume Slider */}
                        <input
                          type="range"
                          id={`volume-slider-${row.channel}`}
                          name={`volume-slider-${row.channel}`}
                          min="0"
                          max="1"
                          step="0.05"
                          value={volume}
                          onInput={(e) => {
                            const val = Number((e.target as HTMLInputElement).value);
                            setChannelVolume(row.channel, val);
                            if (!isEnabled && val > 0) {
                              toggleSoundChannel(row.channel);
                            }
                          }}
                          className={`w-full h-1.5 bg-[#16181D] rounded-lg appearance-none cursor-pointer ${row.accent}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. ELEMENTS (Simple switches: Plant, Mug, Cat, Birds, Trees, Leaves) */}
              <div className="space-y-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Elements
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {elementSwitches.map((elem) => {
                    const isEnabled = sceneProps[elem.key];
                    return (
                      <button
                        key={elem.key}
                        onClick={() => toggleSceneProp(elem.key)}
                        className={`flex items-center justify-between px-3.5 py-2.5 rounded-[16px] text-xs font-medium transition-all border ${
                          isEnabled
                            ? 'bg-[#2D313A] border-emerald-400/80 text-emerald-200 shadow-sm'
                            : 'bg-[#25272E] border-white/5 text-slate-400 hover:bg-[#2B2E37] hover:text-slate-200'
                        }`}
                      >
                        <span>{elem.label}</span>
                        <div
                          className={`w-7 h-4 rounded-full flex items-center px-0.5 transition-colors ${
                            isEnabled ? 'bg-emerald-500' : 'bg-slate-600'
                          }`}
                        >
                          <div
                            className={`w-3 h-3 rounded-full bg-white transition-transform ${
                              isEnabled ? 'translate-x-3' : 'translate-x-0'
                            }`}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. POMODORO (Two compact numeric inputs: Focus & Break minutes) */}
              <div className="space-y-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Pomodoro
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-[16px] bg-[#25272E] border border-white/5">
                    <label htmlFor="focus-minutes-input" className="text-xs text-slate-400 block mb-1">
                      Focus
                    </label>
                    <input
                      type="number"
                      id="focus-minutes-input"
                      name="focus-minutes-input"
                      min="1"
                      max="120"
                      value={focusInput}
                      onInput={(e) => {
                        const val = Number((e.target as HTMLInputElement).value);
                        setFocusInput(val);
                        setPomodoroConfig({ ...pomodoroConfig, focusMinutes: Math.max(1, val) });
                      }}
                      className="w-full bg-[#1C1D22] border border-white/10 rounded-[12px] px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                  <div className="p-3 rounded-[16px] bg-[#25272E] border border-white/5">
                    <label htmlFor="break-minutes-input" className="text-xs text-slate-400 block mb-1">
                      Break
                    </label>
                    <input
                      type="number"
                      id="break-minutes-input"
                      name="break-minutes-input"
                      min="1"
                      max="60"
                      value={breakInput}
                      onInput={(e) => {
                        const val = Number((e.target as HTMLInputElement).value);
                        setBreakInput(val);
                        setPomodoroConfig({ ...pomodoroConfig, breakMinutes: Math.max(1, val) });
                      }}
                      className="w-full bg-[#1C1D22] border border-white/10 rounded-[12px] px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                  </div>
                </div>
              </div>

              {/* 5. WIDGET LAYOUT (Reset cards to standard corner positions) */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Layout
                </span>
                <button
                  type="button"
                  onClick={resetWidgetPositions}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-[14px] bg-[#25272E] hover:bg-[#323640] border border-white/10 text-slate-200 hover:text-white transition-all text-xs font-medium active:scale-98 cursor-pointer shadow-xs"
                >
                  <RotateCcw size={14} className="text-amber-400" />
                  <span>Reset Widget Positions</span>
                </button>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Snaps Tasks, Pomodoro, and Music cards back to their standard screen corners.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
