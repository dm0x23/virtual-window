import { useState, useRef, useEffect } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import {
  $spotifyUri,
  $zenMode,
  $musicTab,
  $youtubeEmbedUrl,
  setSpotifyEmbed,
  setMusicTab,
  setCustomYoutubeEmbed,
  parseYouTubeUrl,
  type MusicTabType,
} from '../stores/appStore';
import {
  Radio,
  Link as LinkIcon,
  ChevronDown,
  ChevronUp,
  Disc3,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Music,
} from 'lucide-preact';
import { useDraggable } from '../hooks/useDraggable';

interface AudioStation {
  id: string;
  name: string;
  genre: string;
  url: string;
}

const BUILTIN_STATIONS: AudioStation[] = [
  {
    id: 'chillhop',
    name: 'ChillHop Radio',
    genre: 'Lo-Fi Beats & Chill',
    url: 'https://streams.fluxfm.de/Chillhop/mp3-128/',
  },
  {
    id: 'fip-lofi',
    name: 'FIP Lo-Fi',
    genre: 'Parisian Lo-Fi Beats',
    url: 'https://icecast.radiofrance.fr/fip-lofi.mp3',
  },
  {
    id: 'groove-salad',
    name: 'Groove Salad',
    genre: 'Downtempo Ambient',
    url: 'https://ice2.somafm.com/groovesalad-128-mp3',
  },
  {
    id: 'lush',
    name: 'Lush Mellow',
    genre: 'Sensuous Chill & Beats',
    url: 'https://ice2.somafm.com/lush-128-mp3',
  },
  {
    id: 'drone-zone',
    name: 'Drone Zone',
    genre: 'Atmospheric Deep Focus',
    url: 'https://ice2.somafm.com/dronezone-128-mp3',
  },
];

const YOUTUBE_PRESETS = [
  { name: 'Chillhop', url: 'https://www.youtube-nocookie.com/embed/5yx6BWlEVcY?autoplay=1&rel=0&modestbranding=1' },
  { name: 'Lofi Girl', url: 'https://www.youtube-nocookie.com/embed/videoseries?list=PL6NdkXsPL07KN01gH2vucrHCEyyV-ajHz&autoplay=1&rel=0&modestbranding=1' },
  { name: 'Rainy Jazz', url: 'https://www.youtube-nocookie.com/embed/2gliGautom4?autoplay=1&rel=0&modestbranding=1' },
];

const SPOTIFY_PRESETS = [
  { name: 'Lo-Fi Beats', uri: 'playlist/37i9dQZF1DXdLEN7aqioXM' },
  { name: 'Peaceful Piano', uri: 'playlist/37i9dQZF1DX4sWSpwq3LiO' },
  { name: 'Deep Focus', uri: 'playlist/37i9dQZF1DWZeKCadgRdKQ' },
];

export default function SpotifyPlayer() {
  const currentSpotifyUri = useStore($spotifyUri);
  const currentYoutubeUrl = useStore($youtubeEmbedUrl);
  const zenMode = useStore($zenMode);
  const activeTab = useStore($musicTab);

  // Built-in HTML5 Audio state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentStationIdx, setCurrentStationIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  // YouTube / Spotify form inputs
  const [inputSpotifyUrl, setInputSpotifyUrl] = useState('');
  const [inputYoutubeUrl, setInputYoutubeUrl] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [spotifyError, setSpotifyError] = useState('');
  const [youtubeError, setYoutubeError] = useState('');

  const { position, handleMouseDown, isDragging, elementRef } = useDraggable({
    storageKey: 'vw_drag_music',
  });

  const activeStation = BUILTIN_STATIONS[currentStationIdx] || BUILTIN_STATIONS[0];

  // Initialize and handle built-in audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = isMuted ? 0 : volume;

    const onPlay = () => {
      setIsPlaying(true);
      setIsLoadingAudio(false);
    };
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setIsLoadingAudio(true);
    const onCanPlay = () => setIsLoadingAudio(false);
    const onError = () => {
      setIsPlaying(false);
      setIsLoadingAudio(false);
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('error', onError);
    };
  }, [volume, isMuted]);

  const togglePlayStation = (idx?: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    const targetIdx = idx !== undefined ? idx : currentStationIdx;
    const isNewStation = idx !== undefined && idx !== currentStationIdx;

    if (isNewStation) {
      setCurrentStationIdx(targetIdx);
      audio.src = BUILTIN_STATIONS[targetIdx].url;
      audio.load();
      setIsLoadingAudio(true);
      audio.play().catch(() => setIsPlaying(false));
      return;
    }

    if (isPlaying) {
      audio.pause();
    } else {
      if (!audio.src || audio.src === '') {
        audio.src = activeStation.url;
        audio.load();
      }
      setIsLoadingAudio(true);
      audio.play().catch(() => setIsPlaying(false));
    }
  };

  const handleNextStation = () => {
    const nextIdx = (currentStationIdx + 1) % BUILTIN_STATIONS.length;
    togglePlayStation(nextIdx);
  };

  const handlePrevStation = () => {
    const prevIdx = (currentStationIdx - 1 + BUILTIN_STATIONS.length) % BUILTIN_STATIONS.length;
    togglePlayStation(prevIdx);
  };

  const parseSpotifyLink = (raw: string): string | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    const urlMatch = trimmed.match(/open\.spotify\.com\/(playlist|track|album|artist)\/([a-zA-Z0-9]+)/);
    if (urlMatch) return `${urlMatch[1]}/${urlMatch[2]}`;

    const uriMatch = trimmed.match(/spotify:(playlist|track|album|artist):([a-zA-Z0-9]+)/);
    if (uriMatch) return `${uriMatch[1]}/${uriMatch[2]}`;

    if (/^(playlist|track|album|artist)\/[a-zA-Z0-9]+$/.test(trimmed)) return trimmed;

    return null;
  };

  const handleApplySpotify = (e?: Event) => {
    if (e) e.preventDefault();
    setSpotifyError('');
    const parsed = parseSpotifyLink(inputSpotifyUrl);
    if (parsed) {
      setSpotifyEmbed(parsed);
      setInputSpotifyUrl('');
    } else {
      setSpotifyError('Invalid link. Use open.spotify.com/playlist/... or track/...');
    }
  };

  const handleApplyYoutube = (e?: Event) => {
    if (e) e.preventDefault();
    setYoutubeError('');
    const parsed = parseYouTubeUrl(inputYoutubeUrl);
    if (parsed) {
      setCustomYoutubeEmbed(parsed);
      setInputYoutubeUrl('');
    } else {
      setYoutubeError('Invalid URL. Use youtube.com/watch?v=, youtu.be/, or playlist?list=');
    }
  };

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
              bottom: '24px',
              right: '24px',
              transition: 'all 0.3s cubic-bezier(0.2, 0, 0, 1)',
            }
      }
      className={`z-30 w-80 sm:w-88 rounded-[20px] bg-[#1C1D22] border border-white/10 shadow-2xl transition-shadow text-slate-100 flex flex-col select-none ${
        isDragging ? 'cursor-grabbing shadow-[0_20px_40px_rgba(0,0,0,0.6)]' : 'cursor-grab'
      } ${isCollapsed ? 'h-auto' : ''}`}
    >
      {/* Hidden Native HTML5 Audio Player */}
      <audio ref={audioRef} preload="none" crossOrigin="anonymous" />

      {/* Header & Tabs */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/10 select-none">
        <div className="flex items-center gap-1 bg-[#25272E] p-1 rounded-[14px] text-xs font-medium border border-white/5">
          {/* TAB 1: Built-in Lo-Fi (HTML5 Audio) */}
          <button
            onClick={() => setMusicTab('lofi')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[12px] transition-all cursor-pointer ${
              activeTab === 'lofi'
                ? 'bg-[#373A44] text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Music size={13} className={activeTab === 'lofi' ? 'text-amber-400' : 'text-slate-400'} />
            <span className="text-xs">Built-in</span>
          </button>

          {/* TAB 2: YouTube Embed */}
          <button
            onClick={() => setMusicTab('youtube')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[12px] transition-all cursor-pointer ${
              activeTab === 'youtube'
                ? 'bg-[#373A44] text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio size={13} className={activeTab === 'youtube' ? 'text-rose-400' : 'text-slate-400'} />
            <span className="text-xs">YouTube</span>
          </button>

          {/* TAB 3: Spotify Embed */}
          <button
            onClick={() => setMusicTab('spotify')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[12px] transition-all cursor-pointer ${
              activeTab === 'spotify'
                ? 'bg-[#373A44] text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Disc3 size={13} className={activeTab === 'spotify' ? 'text-emerald-400' : 'text-slate-400'} />
            <span className="text-xs">Spotify</span>
          </button>
        </div>

        {/* Uniform 28px x 28px Material UI chevron minimize button matching Tasks */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-7 h-7 flex items-center justify-center rounded-[10px] bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          title={isCollapsed ? 'Expand' : 'Collapse'}
          aria-label={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
        </button>
      </div>

      {!isCollapsed && (
        <div className="p-3.5 space-y-3">
          {/* ======================================================== */}
          {/* TAB 1: BUILT-IN LO-FI RADIO (NATIVE HTML5 AUDIO PLAYER) */}
          {/* ======================================================== */}
          {activeTab === 'lofi' && (
            <div className="space-y-3">
              {/* Station Info & Visualizer */}
              <div className="p-3 rounded-[16px] bg-[#25272E] border border-white/5 flex items-center justify-between">
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-white truncate block">
                      {activeStation.name}
                    </span>
                    {isPlaying && (
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 block truncate">
                    {isLoadingAudio ? 'Buffering stream...' : activeStation.genre}
                  </span>
                </div>

                {/* Animated Sound Wave Bars when Playing */}
                <div className="flex items-end gap-1 h-5 px-1">
                  <div className={`w-1 bg-amber-400 rounded-full transition-all duration-300 ${isPlaying ? 'h-5 animate-pulse' : 'h-1.5 opacity-40'}`} />
                  <div className={`w-1 bg-amber-400 rounded-full transition-all duration-300 ${isPlaying ? 'h-3 animate-pulse' : 'h-1.5 opacity-40'}`} style={{ animationDelay: '0.15s' }} />
                  <div className={`w-1 bg-amber-400 rounded-full transition-all duration-300 ${isPlaying ? 'h-4 animate-pulse' : 'h-1.5 opacity-40'}`} style={{ animationDelay: '0.3s' }} />
                  <div className={`w-1 bg-amber-400 rounded-full transition-all duration-300 ${isPlaying ? 'h-2 animate-pulse' : 'h-1.5 opacity-40'}`} style={{ animationDelay: '0.45s' }} />
                </div>
              </div>

              {/* Station Quick Chips (5 Channels) */}
              <div className="grid grid-cols-3 gap-1.5">
                {BUILTIN_STATIONS.map((station, idx) => {
                  const isActive = idx === currentStationIdx;
                  return (
                    <button
                      key={station.id}
                      onClick={() => togglePlayStation(idx)}
                      className={`px-2 py-1.5 rounded-[12px] text-xs font-medium truncate transition-all border ${
                        isActive
                          ? 'bg-[#2D313A] border-amber-400/80 text-amber-200 shadow-xs'
                          : 'bg-[#25272E] border-white/5 text-slate-400 hover:bg-[#2B2E37] hover:text-white'
                      }`}
                    >
                      {station.name.replace(' Radio', '')}
                    </button>
                  );
                })}
              </div>

              {/* Audio Playback Controls */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  {/* Prev */}
                  <button
                    onClick={handlePrevStation}
                    className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                    title="Previous Station"
                  >
                    <SkipBack size={15} />
                  </button>

                  {/* Play / Pause Main Button */}
                  <button
                    onClick={() => togglePlayStation()}
                    disabled={isLoadingAudio}
                    className="p-3 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause size={18} /> : <Play size={18} className="translate-x-0.5" />}
                  </button>

                  {/* Next */}
                  <button
                    onClick={handleNextStation}
                    className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                    title="Next Station"
                  >
                    <SkipForward size={15} />
                  </button>
                </div>

                {/* Volume Slider & Mute */}
                <div className="flex items-center gap-2 flex-1 max-w-[140px] ml-3">
                  <button
                    onClick={() => {
                      const nextMute = !isMuted;
                      setIsMuted(nextMute);
                      if (audioRef.current) {
                        audioRef.current.volume = nextMute ? 0 : volume;
                      }
                    }}
                    className="text-slate-400 hover:text-white transition-colors p-1"
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onInput={(e) => {
                      const val = Number((e.target as HTMLInputElement).value);
                      setVolume(val);
                      setIsMuted(false);
                      if (audioRef.current) {
                        audioRef.current.volume = val;
                      }
                    }}
                    className="w-full h-1.5 bg-[#16181D] rounded-lg appearance-none cursor-pointer accent-amber-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: YOUTUBE NO-COOKIE PLAYER + CUSTOM URL INPUT */}
          {/* ======================================================== */}
          {activeTab === 'youtube' && (
            <div className="space-y-2.5">
              {/* YouTube Quick Presets */}
              <div className="grid grid-cols-3 gap-1.5">
                {YOUTUBE_PRESETS.map((preset) => {
                  const isActive = currentYoutubeUrl.includes(preset.url.split('?')[0]);
                  return (
                    <button
                      key={preset.name}
                      onClick={() => {
                        setCustomYoutubeEmbed(preset.url);
                        setYoutubeError('');
                      }}
                      className={`px-2 py-1.5 rounded-[12px] text-xs font-medium truncate transition-all border ${
                        isActive
                          ? 'bg-[#2D313A] border-rose-400/80 text-rose-200 shadow-xs'
                          : 'bg-[#25272E] border-white/5 text-slate-400 hover:bg-[#2B2E37] hover:text-white'
                      }`}
                    >
                      {preset.name}
                    </button>
                  );
                })}
              </div>

              {/* Custom YouTube URL Input */}
              <form onSubmit={handleApplyYoutube} className="space-y-1">
                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      id="youtube-url-input"
                      name="youtube-url-input"
                      value={inputYoutubeUrl}
                      onInput={(e) => setInputYoutubeUrl((e.target as HTMLInputElement).value)}
                      placeholder="Paste YouTube video or playlist link..."
                      className="w-full bg-[#25272E] text-xs text-white placeholder-slate-500 pl-7 pr-2.5 py-1.5 rounded-[12px] border border-white/10 focus:outline-none focus:ring-1 focus:ring-rose-400/60"
                    />
                    <LinkIcon size={12} className="absolute left-2.5 top-2.5 text-slate-500" />
                  </div>
                  <button
                    type="submit"
                    disabled={!inputYoutubeUrl.trim()}
                    className="px-3 py-1.5 rounded-[12px] bg-rose-500 hover:bg-rose-400 disabled:opacity-40 text-white text-xs font-semibold transition-all shadow-xs"
                  >
                    Load
                  </button>
                </div>
                {youtubeError && <p className="text-[10px] text-rose-400 pl-1">{youtubeError}</p>}
              </form>

              {/* YouTube Iframe Player (Explicit full width aspect-video sizing) */}
              <div className="w-full aspect-video rounded-[14px] overflow-hidden shadow-inner border border-white/10 bg-black relative">
                <iframe
                  key={currentYoutubeUrl}
                  src={currentYoutubeUrl}
                  title="YouTube Music Player"
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    display: 'block',
                  }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full block"
                />
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: SPOTIFY EMBED */}
          {/* ======================================================== */}
          {activeTab === 'spotify' && (
            <div className="space-y-3">
              {/* Quick-Select Spotify Presets */}
              <div className="grid grid-cols-3 gap-1.5">
                {SPOTIFY_PRESETS.map((preset) => {
                  const isActive = currentSpotifyUri === preset.uri;
                  return (
                    <button
                      key={preset.uri}
                      onClick={() => {
                        setSpotifyEmbed(preset.uri);
                        setSpotifyError('');
                      }}
                      className={`px-2 py-1.5 rounded-[12px] text-xs font-medium truncate transition-all border ${
                        isActive
                          ? 'bg-[#2D313A] border-emerald-400/80 text-emerald-200 shadow-xs'
                          : 'bg-[#25272E] border-white/5 text-slate-400 hover:bg-[#2B2E37] hover:text-white'
                      }`}
                    >
                      {preset.name}
                    </button>
                  );
                })}
              </div>

              {/* Custom Spotify URL Input */}
              <form onSubmit={handleApplySpotify} className="space-y-1">
                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      id="spotify-url-input"
                      name="spotify-url-input"
                      value={inputSpotifyUrl}
                      onInput={(e) => setInputSpotifyUrl((e.target as HTMLInputElement).value)}
                      placeholder="Paste Spotify playlist / track link..."
                      className="w-full bg-[#25272E] text-xs text-white placeholder-slate-500 pl-7 pr-2.5 py-1.5 rounded-[12px] border border-white/10 focus:outline-none focus:ring-1 focus:ring-emerald-400/60"
                    />
                    <LinkIcon size={12} className="absolute left-2.5 top-2.5 text-slate-500" />
                  </div>
                  <button
                    type="submit"
                    disabled={!inputSpotifyUrl.trim()}
                    className="px-3 py-1.5 rounded-[12px] bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 text-xs font-semibold transition-all shadow-xs"
                  >
                    Load
                  </button>
                </div>
                {spotifyError && <p className="text-[10px] text-rose-400 pl-1">{spotifyError}</p>}
              </form>

              {/* Spotify iframe embed */}
              <div className="rounded-[14px] overflow-hidden shadow-inner border border-white/10 bg-black/40">
                <iframe
                  key={currentSpotifyUri}
                  src={`https://open.spotify.com/embed/${currentSpotifyUri}?utm_source=generator&theme=0`}
                  width="100%"
                  height="80"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  title="Spotify Ambient Player"
                  className="rounded-[14px]"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
