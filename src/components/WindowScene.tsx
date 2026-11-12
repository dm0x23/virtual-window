import { useEffect, useRef, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import {
  $weather,
  $scenery,
  $sceneProps,
  $soundChannels,
  $soundVolumes,
  type WeatherType,
  type SceneryType,
} from '../stores/appStore';
import { audioService } from '../services/audioService';

interface WeatherPalette {
  skyGradient: string;
  sunMoonType: 'sun' | 'sunset' | 'moon' | 'cloud' | 'none';
  sunMoonStyle: Record<string, string>;
  distantHills: string;
  nearHills: string;
  treesColor: string;
  cloudColor: string;
  cloudOpacity: number;
  frameWood: string;
  sillWood: string;
  sillHighlight: string;
}

const WEATHER_PALETTES: Record<WeatherType, WeatherPalette> = {
  sunny: {
    skyGradient: 'linear-gradient(180deg, #FDE68A 0%, #FDBA74 45%, #F472B6 100%)',
    sunMoonType: 'sun',
    sunMoonStyle: {
      backgroundColor: '#FEF3C7',
      boxShadow: '0 0 110px 45px rgba(251, 191, 36, 0.75)',
    },
    distantHills: '#D97706',
    nearHills: '#047857',
    treesColor: '#064E3B',
    cloudColor: '#FFFFFF',
    cloudOpacity: 0.75,
    frameWood: '#452A1B',
    sillWood: '#543322',
    sillHighlight: '#78462C',
  },
  sunset: {
    skyGradient: 'linear-gradient(180deg, #3B0764 0%, #831843 35%, #EA580C 70%, #FDE047 100%)',
    sunMoonType: 'sunset',
    sunMoonStyle: {
      backgroundColor: '#FED7AA',
      boxShadow: '0 0 130px 50px rgba(249, 115, 22, 0.85)',
    },
    distantHills: '#581C87',
    nearHills: '#7C2D12',
    treesColor: '#431407',
    cloudColor: '#F472B6',
    cloudOpacity: 0.65,
    frameWood: '#382015',
    sillWood: '#482B1D',
    sillHighlight: '#683F2B',
  },
  cloudy: {
    skyGradient: 'linear-gradient(180deg, #94A3B8 0%, #CBD5E1 55%, #E2E8F0 100%)',
    sunMoonType: 'cloud',
    sunMoonStyle: {
      backgroundColor: 'rgba(255, 255, 255, 0.5)',
      boxShadow: '0 0 80px 30px rgba(255, 255, 255, 0.4)',
    },
    distantHills: '#64748B',
    nearHills: '#475569',
    treesColor: '#334155',
    cloudColor: '#FFFFFF',
    cloudOpacity: 0.85,
    frameWood: '#3A2B22',
    sillWood: '#48352A',
    sillHighlight: '#5E4638',
  },
  rainy: {
    skyGradient: 'linear-gradient(180deg, #334155 0%, #1E293B 50%, #0F172A 100%)',
    sunMoonType: 'cloud',
    sunMoonStyle: {
      backgroundColor: 'rgba(148, 163, 184, 0.25)',
      boxShadow: '0 0 50px 15px rgba(148, 163, 184, 0.2)',
    },
    distantHills: '#1E293B',
    nearHills: '#0F172A',
    treesColor: '#090D16',
    cloudColor: '#334155',
    cloudOpacity: 0.8,
    frameWood: '#27201C',
    sillWood: '#332A24',
    sillHighlight: '#4A3D34',
  },
  thunder: {
    skyGradient: 'linear-gradient(180deg, #090D16 0%, #111827 50%, #030712 100%)',
    sunMoonType: 'none',
    sunMoonStyle: {},
    distantHills: '#0F172A',
    nearHills: '#030712',
    treesColor: '#020408',
    cloudColor: '#1E293B',
    cloudOpacity: 0.9,
    frameWood: '#1C1613',
    sillWood: '#241B17',
    sillHighlight: '#382B24',
  },
  snowy: {
    skyGradient: 'linear-gradient(180deg, #94A3B8 0%, #BAE6FD 50%, #E0E7FF 100%)',
    sunMoonType: 'cloud',
    sunMoonStyle: {
      backgroundColor: '#FFFFFF',
      boxShadow: '0 0 70px 25px rgba(255, 255, 255, 0.6)',
    },
    distantHills: '#64748B',
    nearHills: '#3B82F6',
    treesColor: '#334155',
    cloudColor: '#FFFFFF',
    cloudOpacity: 0.7,
    frameWood: '#382F29',
    sillWood: '#443A33',
    sillHighlight: '#5A4E45',
  },
  night: {
    skyGradient: 'linear-gradient(180deg, #020617 0%, #0F172A 50%, #1E1B4B 100%)',
    sunMoonType: 'moon',
    sunMoonStyle: {
      backgroundColor: '#FEF3C7',
      boxShadow: '0 0 70px 25px rgba(254, 243, 199, 0.4)',
    },
    distantHills: '#1E1B4B',
    nearHills: '#090D16',
    treesColor: '#030712',
    cloudColor: '#1E293B',
    cloudOpacity: 0.6,
    frameWood: '#1C1613',
    sillWood: '#261F1B',
    sillHighlight: '#382D26',
  },
};

export default function WindowScene() {
  const weather = useStore($weather);
  const scenery = useStore($scenery);
  const sceneProps = useStore($sceneProps);
  const soundChannels = useStore($soundChannels);
  const soundVolumes = useStore($soundVolumes);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [lightningAlpha, setLightningAlpha] = useState(0);

  // Sync procedural audio when channels or individual channel volumes change
  useEffect(() => {
    audioService.syncChannels(soundChannels, soundVolumes);
  }, [soundChannels, soundVolumes]);

  // Listen for lightning flash events synced with multi-stage thunder
  useEffect(() => {
    const handleLightning = () => {
      setLightningAlpha(0.95);
      setTimeout(() => setLightningAlpha(0.2), 50);
      setTimeout(() => setLightningAlpha(0.85), 110);
      setTimeout(() => setLightningAlpha(0), 280);
    };

    window.addEventListener('virtual-window-lightning', handleLightning);
    return () => window.removeEventListener('virtual-window-lightning', handleLightning);
  }, []);

  const p = WEATHER_PALETTES[weather] || WEATHER_PALETTES.sunny;

  // Particle Canvas for Raindrops, Snow, Cloudy Leaves, or Night Stars
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    interface RainDrop {
      x: number;
      y: number;
      length: number;
      speed: number;
      opacity: number;
    }
    const dropCount = weather === 'thunder' ? 220 : 140;
    const rainDrops: RainDrop[] = Array.from({ length: dropCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      length: Math.random() * 22 + 15,
      speed: Math.random() * (weather === 'thunder' ? 18 : 12) + (weather === 'thunder' ? 22 : 18),
      opacity: Math.random() * 0.45 + 0.25,
    }));

    interface Ripple {
      x: number;
      y: number;
      r: number;
      maxR: number;
      opacity: number;
    }
    const ripples: Ripple[] = [];

    interface Leaf {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      rotation: number;
      vRot: number;
      color: string;
    }
    const leafColors = ['#ca8a04', '#b45309', '#ea580c', '#854d0e', '#65a30d'];
    const leaves: Leaf[] = Array.from({ length: 22 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: Math.random() * 2 + 1.5,
      vy: Math.random() * 1.5 + 1,
      size: Math.random() * 10 + 8,
      rotation: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.05,
      color: leafColors[Math.floor(Math.random() * leafColors.length)],
    }));

    interface Snowflake {
      x: number;
      y: number;
      r: number;
      speed: number;
      drift: number;
      opacity: number;
    }
    const snowflakes: Snowflake[] = Array.from({ length: 110 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 3 + 1.2,
      speed: Math.random() * 1.5 + 0.8,
      drift: Math.random() * 0.8 - 0.4,
      opacity: Math.random() * 0.6 + 0.4,
    }));

    interface Star {
      x: number;
      y: number;
      r: number;
      alpha: number;
      pulseSpeed: number;
    }
    const stars: Star[] = Array.from({ length: 90 }, () => ({
      x: Math.random() * width,
      y: Math.random() * (height * 0.6),
      r: Math.random() * 1.6 + 0.6,
      alpha: Math.random() * 0.8 + 0.2,
      pulseSpeed: Math.random() * 0.02 + 0.005,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      if (weather === 'rainy' || weather === 'thunder') {
        const angle = weather === 'thunder' ? 0.35 : 0.22;
        ctx.strokeStyle = weather === 'thunder' ? 'rgba(224, 242, 254, 0.7)' : 'rgba(186, 230, 253, 0.55)';
        ctx.lineWidth = weather === 'thunder' ? 1.8 : 1.4;
        ctx.lineCap = 'round';

        for (let i = 0; i < rainDrops.length; i++) {
          const d = rainDrops[i];
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x + Math.sin(angle) * d.length, d.y + Math.cos(angle) * d.length);
          ctx.stroke();

          d.x += Math.sin(angle) * d.speed;
          d.y += Math.cos(angle) * d.speed;

          if (d.y > height - 70 && Math.random() < 0.12) {
            ripples.push({
              x: d.x,
              y: height - 60 + (Math.random() * 20 - 10),
              r: 1,
              maxR: Math.random() * 14 + 6,
              opacity: 0.7,
            });
          }

          if (d.y > height) {
            d.y = -d.length;
            d.x = Math.random() * width;
          }
          if (d.x > width) d.x = 0;
        }

        for (let i = ripples.length - 1; i >= 0; i--) {
          const rp = ripples[i];
          rp.r += 0.6;
          rp.opacity -= 0.025;
          if (rp.opacity <= 0) {
            ripples.splice(i, 1);
            continue;
          }
          ctx.beginPath();
          ctx.ellipse(rp.x, rp.y, rp.r * 1.8, rp.r * 0.6, 0, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(186, 230, 253, ${rp.opacity})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      } else if (weather === 'snowy') {
        ctx.fillStyle = '#FFFFFF';
        for (let i = 0; i < snowflakes.length; i++) {
          const sn = snowflakes[i];
          ctx.beginPath();
          ctx.arc(sn.x, sn.y, sn.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${sn.opacity})`;
          ctx.fill();

          sn.y += sn.speed;
          sn.x += sn.drift + Math.sin(sn.y * 0.01) * 0.5;

          if (sn.y > height) {
            sn.y = -5;
            sn.x = Math.random() * width;
          }
        }
      } else if (weather === 'cloudy' && sceneProps.leaves) {
        for (let i = 0; i < leaves.length; i++) {
          const lf = leaves[i];
          ctx.save();
          ctx.translate(lf.x, lf.y);
          ctx.rotate(lf.rotation);
          ctx.fillStyle = lf.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, lf.size, lf.size * 0.45, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          lf.x += lf.vx;
          lf.y += lf.vy + Math.sin(lf.x * 0.02) * 0.6;
          lf.rotation += lf.vRot;

          if (lf.x > width + 30 || lf.y > height + 30) {
            lf.x = -20;
            lf.y = Math.random() * (height * 0.7);
          }
        }
      } else if (weather === 'night') {
        for (let i = 0; i < stars.length; i++) {
          const st = stars[i];
          st.alpha += st.pulseSpeed;
          if (st.alpha > 1 || st.alpha < 0.2) {
            st.pulseSpeed = -st.pulseSpeed;
          }
          ctx.beginPath();
          ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.1, Math.min(1, st.alpha))})`;
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [weather, sceneProps.leaves]);

  return (
    <div className="relative w-full h-full w-screen h-screen overflow-hidden select-none bg-slate-950">
      {/* ======================================================== */}
      {/* LAYER 0: SKY BACKGROUND + SCENERY CONTAINER (Z-INDEX: 0) */}
      {/* Explicit inline dimensions so it NEVER collapses */}
      {/* ======================================================== */}
      <div
        className="pointer-events-none transition-all duration-1000 ease-in-out overflow-hidden"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          background: p.skyGradient,
        }}
      >
        {/* LIGHTNING FLASH OVERLAY (Thunder Weather) */}
        {weather === 'thunder' && (
          <div
            className="absolute inset-0 bg-cyan-100 pointer-events-none transition-opacity duration-75"
            style={{ opacity: lightningAlpha }}
          />
        )}

        {/* SUN / MOON / SKY GLOW */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {p.sunMoonType === 'sun' && (
            <div
              className="absolute top-[14%] right-[22%] w-28 h-28 rounded-full transition-all duration-1000"
              style={p.sunMoonStyle}
            >
              <div className="absolute -left-48 top-16 w-[600px] h-96 bg-gradient-to-b from-amber-200/25 to-transparent rotate-45 pointer-events-none blur-2xl" />
            </div>
          )}

          {p.sunMoonType === 'sunset' && (
            <div
              className="absolute top-[28%] right-[25%] w-32 h-32 rounded-full transition-all duration-1000"
              style={p.sunMoonStyle}
            >
              <div className="absolute -inset-16 bg-gradient-to-r from-rose-500/30 via-orange-400/40 to-amber-300/30 rounded-full blur-2xl pointer-events-none" />
            </div>
          )}

          {p.sunMoonType === 'moon' && (
            <div
              className="absolute top-[12%] right-[24%] w-20 h-20 rounded-full transition-all duration-1000"
              style={p.sunMoonStyle}
            >
              <div className="absolute -top-1 -right-1 w-16 h-16 rounded-full bg-indigo-950/90" />
            </div>
          )}

          {p.sunMoonType === 'cloud' && (
            <div
              className="absolute top-[16%] right-[30%] w-32 h-32 rounded-full blur-xl transition-all duration-1000"
              style={p.sunMoonStyle}
            />
          )}
        </div>

        {/* CLOUDS (PARALLAX DRIFTING LAYERS) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[8%] -left-[10%] w-[120%] flex gap-24 animate-clouds-slow" style={{ opacity: p.cloudOpacity * 0.85 }}>
            <svg className="w-96 h-36" style={{ fill: p.cloudColor }} viewBox="0 0 100 40">
              <path d="M10,35 Q15,10 40,15 Q60,5 80,18 Q95,20 90,35 Z" />
            </svg>
            <svg className="w-80 h-32" style={{ fill: p.cloudColor }} viewBox="0 0 100 40">
              <path d="M15,35 Q20,12 45,16 Q65,8 85,22 Q95,25 90,35 Z" />
            </svg>
          </div>

          <div className="absolute top-[16%] -left-[15%] w-[130%] flex gap-32 animate-clouds-mid" style={{ opacity: p.cloudOpacity }}>
            <svg className="w-80 h-28" style={{ fill: p.cloudColor }} viewBox="0 0 100 40">
              <path d="M10,35 Q25,8 50,14 Q75,10 88,25 Q95,30 90,35 Z" />
            </svg>
            <svg className="w-72 h-24" style={{ fill: p.cloudColor }} viewBox="0 0 100 40">
              <path d="M20,35 Q30,15 55,18 Q75,12 85,26 Q95,30 90,35 Z" />
            </svg>
          </div>

          {(weather === 'cloudy' || weather === 'rainy' || weather === 'thunder' || weather === 'snowy') && (
            <div className="absolute top-[22%] -left-[20%] w-[140%] flex gap-40 animate-clouds-fast" style={{ opacity: Math.min(1, p.cloudOpacity * 1.1) }}>
              <svg className="w-96 h-32" style={{ fill: p.cloudColor }} viewBox="0 0 100 40">
                <path d="M10,35 Q30,12 55,18 Q78,14 90,26 Q98,30 90,35 Z" />
              </svg>
            </div>
          )}
        </div>

        {/* FLYING BIRDS (Controlled by sceneProps.birds) */}
        {sceneProps.birds && (weather === 'sunny' || weather === 'sunset') && (
          <div className="absolute top-[20%] left-0 pointer-events-none animate-birds">
            <svg className="w-24 h-16" style={{ fill: weather === 'sunset' ? '#451a03' : '#78350f' }} viewBox="0 0 100 60">
              <path className="animate-wing origin-center" d="M10,25 Q20,10 30,22 Q40,10 50,25 Q40,28 30,24 Q20,28 10,25 Z" />
              <path className="animate-wing origin-center" d="M60,15 Q68,5 75,13 Q82,5 90,15 Q82,18 75,15 Q68,18 60,15 Z" />
              <path className="animate-wing origin-center" d="M35,40 Q42,32 48,38 Q55,32 62,40 Q55,43 48,40 Q42,43 35,40 Z" />
            </svg>
          </div>
        )}

        {/* ======================================================== */}
        {/* OUTDOOR SCENERIES (Countryside, Ocean, Mountains, City)   */}
        {/* ======================================================== */}

        {/* --- SCENERY 1: COUNTRYSIDE (Default) --- */}
        {scenery === 'countryside' && (
          <>
            {/* Distant Mountain Silhouette */}
            <div className="absolute bottom-[20%] inset-x-0 pointer-events-none transition-all duration-1000">
              <svg className="w-full h-64" style={{ fill: p.distantHills, opacity: 0.65 }} preserveAspectRatio="none" viewBox="0 0 1200 300">
                <path d="M0,300 L0,180 Q160,80 320,170 Q500,40 700,160 Q900,90 1050,150 Q1150,120 1200,170 L1200,300 Z" />
              </svg>
            </div>

            {/* Near Rolling Green Hills & Distant Cottages */}
            <div className="absolute bottom-[10%] inset-x-0 pointer-events-none transition-all duration-1000">
              <svg className="w-full h-56" style={{ fill: p.nearHills, opacity: 0.88 }} preserveAspectRatio="none" viewBox="0 0 1200 250">
                <path d="M0,250 L0,110 Q200,40 450,120 Q700,30 950,100 Q1100,50 1200,85 L1200,250 Z" />
              </svg>

              {/* Cozy Distant House with glowing window */}
              <div className="absolute bottom-20 right-[35%] pointer-events-none">
                <svg className="w-16 h-12" viewBox="0 0 60 45">
                  <polygon points="30,5 5,22 55,22" style={{ fill: weather === 'night' || weather === 'thunder' ? '#0f172a' : '#78350f' }} />
                  <rect x="12" y="22" width="36" height="20" style={{ fill: weather === 'night' || weather === 'thunder' ? '#020617' : '#451a03' }} />
                  <rect
                    x="22"
                    y="26"
                    width="14"
                    height="10"
                    style={{
                      fill: '#FBBF24',
                      boxShadow: '0 0 15px rgba(251, 191, 36, 0.9)',
                    }}
                  />
                </svg>
              </div>
            </div>

            {/* Proper Exterior Trees with Wooden Trunks & Layered Canopies (sceneProps.trees) */}
            {sceneProps.trees && (
              <div className="absolute bottom-[80px] inset-x-0 pointer-events-none flex justify-between px-8 z-0">
                {/* Left Tree Group */}
                <div className="flex items-end gap-2 origin-bottom animate-tree-slow">
                  <svg className="w-32 h-64 drop-shadow-md" viewBox="0 0 100 180">
                    <rect x="44" y="115" width="12" height="65" rx="3" fill="#382015" />
                    <path d="M50,15 L78,65 L64,65 L84,105 L68,105 L88,140 L12,140 L32,105 L16,105 L36,65 L22,65 Z" fill={p.treesColor} />
                    <path d="M50,15 L78,65 L50,65 Z" fill="#047857" opacity="0.25" />
                    <path d="M50,65 L84,105 L50,105 Z" fill="#047857" opacity="0.25" />
                    <path d="M50,105 L88,140 L50,140 Z" fill="#047857" opacity="0.25" />
                  </svg>
                  <svg className="w-24 h-48 -ml-6 drop-shadow-md animate-tree-fast" viewBox="0 0 100 180">
                    <rect x="45" y="115" width="10" height="65" rx="2" fill="#451a03" />
                    <path d="M50,25 L75,70 L62,70 L80,110 L66,110 L84,145 L16,145 L34,110 L20,110 L38,70 L25,70 Z" fill={p.treesColor} />
                  </svg>
                </div>

                {/* Right Tree Group */}
                <div className="flex items-end gap-2 origin-bottom animate-tree-slow">
                  <svg className="w-28 h-52 drop-shadow-md" viewBox="0 0 100 180">
                    <rect x="45" y="115" width="10" height="65" rx="2" fill="#382015" />
                    <path d="M50,20 L76,68 L64,68 L82,108 L20,108 L38,68 L26,68 Z" fill={p.treesColor} />
                    <path d="M50,68 L86,145 L14,145 L50,68 Z" fill={p.treesColor} />
                  </svg>
                  <svg className="w-36 h-64 -ml-6 drop-shadow-md animate-tree-fast" viewBox="0 0 100 180">
                    <rect x="43" y="110" width="14" height="70" rx="3" fill="#291409" />
                    <path d="M50,10 L82,60 L68,60 L88,100 L72,100 L92,145 L8,145 L28,100 L12,100 L32,60 L18,60 Z" fill={p.treesColor} />
                  </svg>
                </div>
              </div>
            )}
          </>
        )}

        {/* --- SCENERY 2: OCEAN --- */}
        {scenery === 'ocean' && (
          <>
            {/* Deep Ocean Water Base Layer */}
            <div
              className="absolute bottom-0 inset-x-0 h-[40%] pointer-events-none transition-all duration-1000"
              style={{
                background:
                  weather === 'night' || weather === 'thunder'
                    ? 'linear-gradient(180deg, #0f172a 0%, #020617 65%, #000000 100%)'
                    : weather === 'sunset'
                    ? 'linear-gradient(180deg, #9a3412 0%, #431407 45%, #1c1917 100%)'
                    : weather === 'snowy'
                    ? 'linear-gradient(180deg, #64748b 0%, #334155 50%, #1e293b 100%)'
                    : 'linear-gradient(180deg, #0284c7 0%, #0369a1 40%, #075985 80%, #0c4a6e 100%)',
              }}
            >
              {/* Horizon Glow Line */}
              <div className="absolute top-0 inset-x-0 h-1 bg-white/20 blur-[1px]" />

              {/* Ocean Shimmer Waves & Highlights */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
                <svg className="w-full h-full animate-ocean-shimmer" preserveAspectRatio="none" viewBox="0 0 800 200">
                  <path d="M0,20 Q100,10 200,20 T400,20 T600,20 T800,20" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" fill="none" />
                  <path d="M0,45 Q120,35 240,45 T480,45 T720,45 T800,45" stroke="rgba(255,255,255,0.3)" strokeWidth="2" fill="none" />
                  <path d="M0,75 Q80,65 180,75 T380,75 T580,75 T800,75" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" fill="none" />
                  <path d="M0,115 Q140,105 280,115 T560,115 T800,115" stroke="rgba(255,255,255,0.35)" strokeWidth="3" fill="none" />
                  <path d="M0,155 Q100,145 200,155 T400,155 T600,155 T800,155" stroke="rgba(255,255,255,0.5)" strokeWidth="3.5" fill="none" />
                </svg>
              </div>
            </div>

            {/* Distant Drifting Sailboat */}
            <div className="absolute bottom-[36%] left-[28%] pointer-events-none animate-sail">
              <svg className="w-10 h-12 drop-shadow-md" viewBox="0 0 40 45">
                <path d="M4,34 Q20,38 36,34 L32,40 Q20,43 8,40 Z" fill={weather === 'night' || weather === 'thunder' ? '#0f172a' : '#451a03'} />
                <line x1="20" y1="8" x2="20" y2="34" stroke="#ffffff" strokeWidth="1.5" />
                <path d="M20,10 L34,30 L20,32 Z" fill="#ffffff" opacity="0.95" />
                <path d="M18,14 L8,31 L18,31 Z" fill="#f1f5f9" opacity="0.85" />
              </svg>
            </div>

            {/* Rocky Headland & Coastal Lighthouse with Pinned Lantern Pivot */}
            <div className="absolute bottom-[80px] right-0 w-[720px] h-[280px] pointer-events-none z-10 overflow-visible">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 720 280">
                <defs>
                  <linearGradient id="ocean-lighthouse-beam-grad" x1="640" y1="60" x2="0" y2="80" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95" style={{ stopColor: '#ffffff', stopOpacity: 0.95 }} />
                    <stop offset="20%" stop-color="#f8fafc" stop-opacity="0.75" style={{ stopColor: '#f8fafc', stopOpacity: 0.75 }} />
                    <stop offset="55%" stop-color="#e2e8f0" stop-opacity="0.30" style={{ stopColor: '#e2e8f0', stopOpacity: 0.30 }} />
                    <stop offset="100%" stop-color="#ffffff" stop-opacity="0" style={{ stopColor: '#ffffff', stopOpacity: 0 }} />
                  </linearGradient>
                </defs>

                {/* 1. Rotating Lighthouse Light Beam (Night, Sunset, Thunder) */}
                {/* Narrow tip pinned directly at lantern coordinates (640, 60) with luminous white tone */}
                {(weather === 'night' || weather === 'sunset' || weather === 'thunder') && (
                  <polygon
                    points="640,58 640,62 0,160 0,0"
                    fill="url(#ocean-lighthouse-beam-grad)"
                    className="animate-lighthouse-beam"
                    style={{
                      transformOrigin: '640px 60px',
                      transformBox: 'view-box',
                      mixBlendMode: 'screen',
                    }}
                  />
                )}

                {/* 2. Rocky Headland Bluff */}
                <path
                  d="M480,280 L480,220 Q520,170 570,165 Q600,140 640,150 Q680,130 720,140 L720,280 Z"
                  fill={weather === 'night' || weather === 'thunder' ? '#090d16' : weather === 'sunset' ? '#290e05' : '#1e293b'}
                />
                <path
                  d="M540,280 L550,210 Q585,190 630,180 Q670,165 720,170 L720,280 Z"
                  fill={weather === 'night' || weather === 'thunder' ? '#020617' : weather === 'sunset' ? '#1c0a03' : '#0f172a'}
                />

                {/* 3. Lighthouse Tower Structure */}
                {/* Tapered White Tower */}
                <polygon points="631,70 649,70 658,170 622,170" fill="#ffffff" />
                {/* Red Bands */}
                <polygon points="633,92 647,92 650,116 630,116" fill="#dc2626" />
                <polygon points="628,138 652,138 655,162 625,162" fill="#dc2626" />
                {/* Entrance Door */}
                <path d="M637,170 L637,156 Q640,153 643,156 L643,170 Z" fill="#451a03" />

                {/* 4. Lighthouse Lantern Room & Glow (Exact center at x=640, y=60) */}
                <rect x="626" y="68" width="28" height="3" rx="1" fill="#0f172a" />
                <rect
                  x="632"
                  y="52"
                  width="16"
                  height="17"
                  rx="2"
                  fill={weather === 'night' || weather === 'sunset' || weather === 'thunder' ? 'rgba(255, 255, 255, 0.92)' : 'rgba(226, 232, 240, 0.7)'}
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                />
                <path d="M630,52 Q640,42 650,52 Z" fill="#1e293b" />
                <circle cx="640" cy="41" r="2" fill="#1e293b" />

                {/* Lantern Bulb & Luminous White Halos */}
                <circle
                  cx="640"
                  cy="60"
                  r="18"
                  fill="#ffffff"
                  opacity={weather === 'night' || weather === 'sunset' || weather === 'thunder' ? 0.45 : 0.15}
                />
                <circle
                  cx="640"
                  cy="60"
                  r="8"
                  fill="#f8fafc"
                  opacity={weather === 'night' || weather === 'sunset' || weather === 'thunder' ? 0.85 : 0.3}
                />
                <circle cx="640" cy="60" r="4" fill="#ffffff" />
              </svg>
            </div>
          </>
        )}

        {/* --- SCENERY 3: MOUNTAINS --- */}
        {scenery === 'mountains' && (
          <>
            {/* Far Distant Majestic Alpine Peaks (High Elevation with Snow Caps) */}
            <div className="absolute bottom-[22%] inset-x-0 pointer-events-none transition-all duration-1000">
              <svg className="w-full h-80" preserveAspectRatio="none" viewBox="0 0 1200 400">
                <path
                  d="M0,400 L0,220 L180,60 L360,250 L520,40 L700,230 L880,50 L1060,220 L1200,110 L1200,400 Z"
                  style={{ fill: p.distantHills, opacity: 0.7 }}
                />
                <polygon points="180,60 145,120 215,120" fill="#ffffff" opacity="0.9" />
                <polygon points="520,40 475,115 565,115" fill="#ffffff" opacity="0.95" />
                <polygon points="880,50 840,115 920,115" fill="#ffffff" opacity="0.9" />
                <polygon points="1200,110 1150,165 1200,175" fill="#ffffff" opacity="0.85" />
              </svg>
            </div>

            {/* Valley Mist Layer 1 */}
            <div className="absolute bottom-[25%] -left-[10%] w-[120%] h-24 bg-gradient-to-r from-transparent via-white/20 to-transparent blur-md pointer-events-none animate-mist" />

            {/* Mid-Ground Mountain Slopes & Ridges */}
            <div className="absolute bottom-[14%] inset-x-0 pointer-events-none transition-all duration-1000">
              <svg className="w-full h-64" preserveAspectRatio="none" viewBox="0 0 1200 300">
                <path
                  d="M0,300 L0,160 L140,90 L320,210 L500,100 L720,220 L940,80 L1100,180 L1200,120 L1200,300 Z"
                  style={{ fill: p.nearHills, opacity: 0.88 }}
                />
                <polygon points="140,90 115,130 165,130" fill="#ffffff" opacity="0.6" />
                <polygon points="500,100 470,140 530,140" fill="#ffffff" opacity="0.6" />
                <polygon points="940,80 910,125 970,125" fill="#ffffff" opacity="0.6" />
              </svg>
            </div>

            {/* Valley Mist Layer 2 */}
            <div className="absolute bottom-[16%] -right-[10%] w-[120%] h-20 bg-gradient-to-r from-transparent via-white/15 to-transparent blur-lg pointer-events-none animate-mist" />

            {/* Alpine Foothill Pine Trees (sceneProps.trees) */}
            {sceneProps.trees && (
              <div className="absolute bottom-[80px] inset-x-0 pointer-events-none flex justify-around px-4">
                {[40, 180, 320, 500, 680, 840, 980, 1120].map((pos, idx) => (
                  <svg key={idx} className="w-16 h-36 drop-shadow-sm" viewBox="0 0 60 120">
                    <rect x="27" y="85" width="6" height="35" rx="1.5" fill="#382015" />
                    <polygon points="30,10 50,55 42,55 54,85 6,85 18,55 10,55" fill={p.treesColor} />
                  </svg>
                ))}
              </div>
            )}
          </>
        )}

        {/* --- SCENERY 4: COHESIVE AESTHETIC LO-FI CITY SKYLINE --- */}
        {scenery === 'city' && (() => {
          const isNightOrDark =
            weather === 'night' || weather === 'sunset' || weather === 'rainy' || weather === 'thunder';

          const cityDistantColor =
            weather === 'night' || weather === 'thunder'
              ? '#1b1d2c'
              : weather === 'sunset'
              ? '#523a4f'
              : '#4a4e69';

          const cityMidColor =
            weather === 'night' || weather === 'thunder'
              ? '#141622'
              : weather === 'sunset'
              ? '#382e3f'
              : '#3d354b';

          const cityForeColor =
            weather === 'night' || weather === 'thunder'
              ? '#0d0f18'
              : weather === 'sunset'
              ? '#23202d'
              : '#2b3040';

          return (
            <div className="absolute inset-0 pointer-events-none transition-all duration-1000">
              {/* 1. Distant Skyline Layer (Soft atmospheric silhouettes & spires) */}
              <div className="absolute bottom-[20%] inset-x-0 h-80 pointer-events-none">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1200 320">
                  {/* Stepped crown skyscrapers & towers */}
                  <g fill={cityDistantColor} opacity="0.75">
                    {/* Tower 1 */}
                    <rect x="30" y="90" width="75" height="230" />
                    <rect x="45" y="60" width="45" height="30" />
                    <rect x="62" y="30" width="12" height="30" />
                    <line x1="68" y1="30" x2="68" y2="10" stroke={cityDistantColor} strokeWidth="2" />

                    {/* Skyscraper 2 */}
                    <rect x="135" y="110" width="90" height="210" />
                    <rect x="155" y="80" width="50" height="30" />

                    {/* Central Highrise 3 */}
                    <rect x="250" y="70" width="85" height="250" />
                    <rect x="270" y="45" width="45" height="25" />
                    <line x1="292" y1="45" x2="292" y2="15" stroke={cityDistantColor} strokeWidth="2.5" />

                    {/* Tower 4 */}
                    <rect x="360" y="120" width="110" height="200" />
                    <rect x="390" y="95" width="50" height="25" />

                    {/* Tall Stepped Spire 5 */}
                    <rect x="500" y="55" width="95" height="265" />
                    <rect x="520" y="30" width="55" height="25" />
                    <rect x="540" y="15" width="15" height="15" />
                    <line x1="547" y1="15" x2="547" y2="-5" stroke={cityDistantColor} strokeWidth="2.5" />

                    {/* Tower 6 */}
                    <rect x="625" y="100" width="80" height="220" />
                    <rect x="645" y="75" width="40" height="25" />

                    {/* Skyscraper 7 */}
                    <rect x="735" y="65" width="105" height="255" />
                    <rect x="760" y="40" width="55" height="25" />
                    <line x1="787" y1="40" x2="787" y2="15" stroke={cityDistantColor} strokeWidth="2" />

                    {/* Highrise 8 */}
                    <rect x="870" y="85" width="90" height="235" />
                    <rect x="895" y="60" width="40" height="25" />

                    {/* Tower 9 */}
                    <rect x="990" y="60" width="100" height="260" />
                    <rect x="1015" y="35" width="50" height="25" />
                    <line x1="1040" y1="35" x2="1040" y2="10" stroke={cityDistantColor} strokeWidth="2.5" />

                    {/* End Tower 10 */}
                    <rect x="1115" y="110" width="75" height="210" />
                  </g>
                </svg>

                {/* Blinking Red Aviation Warning Beacons on Tall Masts */}
                <div className="absolute top-[3%] left-[5.6%] w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444] animate-ping" />
                <div className="absolute top-[4.5%] left-[24.3%] w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444] animate-ping" />
                <div className="absolute -top-[1%] left-[45.6%] w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444] animate-ping" />
                <div className="absolute top-[4.5%] left-[65.6%] w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444] animate-ping" />
                <div className="absolute top-[3%] left-[86.7%] w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444] animate-ping" />
              </div>

              {/* 2. Mid-Ground Buildings Layer (Warm terracotta / plum-grey architectural tone) */}
              <div className="absolute bottom-[13%] inset-x-0 h-72 pointer-events-none">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1200 300">
                  <g fill={cityMidColor} opacity="0.92">
                    {/* Flat-roof Building 1 */}
                    <rect x="15" y="70" width="160" height="230" />
                    <rect x="35" y="55" width="40" height="15" /> {/* Stair bulkhead */}

                    {/* Wide Flat-roof Building 2 (Water Tower 1 sits squarely on this flat roof) */}
                    <rect x="205" y="80" width="220" height="220" />
                    <rect x="345" y="65" width="45" height="15" />

                    {/* Flat-roof Building 3 */}
                    <rect x="455" y="60" width="180" height="240" />
                    <rect x="480" y="45" width="40" height="15" />

                    {/* Wide Flat-roof Building 4 (Water Tower 2 sits squarely on this flat roof) */}
                    <rect x="665" y="75" width="230" height="225" />
                    <rect x="805" y="60" width="50" height="15" />

                    {/* Building 5 */}
                    <rect x="925" y="65" width="170" height="235" />
                    <rect x="950" y="50" width="40" height="15" />

                    {/* Edge Building 6 */}
                    <rect x="1120" y="85" width="75" height="215" />
                  </g>
                </svg>
              </div>

              {/* 3. Foreground Apartment Buildings with Clean Grids of Windows & Squarely-Seated Water Towers */}
              <div className="absolute bottom-[80px] inset-x-0 h-64 pointer-events-none">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1200 280">
                  {/* Building Solid Facades in Muted Slate-Blue / Charcoal */}
                  <g fill={cityForeColor}>
                    {/* Apartment Block A (Left) */}
                    <rect x="0" y="50" width="250" height="230" />
                    {/* Apartment Block B (Center-Left) */}
                    <rect x="270" y="30" width="270" height="250" />
                    {/* Apartment Block C (Center-Right) */}
                    <rect x="560" y="45" width="280" height="235" />
                    {/* Apartment Block D (Right) */}
                    <rect x="860" y="25" width="340" height="255" />

                    {/* Rooftop Parapet Ledges & Bulkheads */}
                    <rect x="265" y="26" width="280" height="5" fill={isNightOrDark ? '#1a1d28' : '#373e52'} />
                    <rect x="285" y="12" width="45" height="15" />
                    <rect x="555" y="41" width="290" height="5" fill={isNightOrDark ? '#1a1d28' : '#373e52'} />
                    <rect x="855" y="21" width="350" height="5" fill={isNightOrDark ? '#1a1d28' : '#373e52'} />
                    <rect x="1110" y="8" width="55" height="14" />
                  </g>

                  {/* Rooftop Water Tower 1 (Sitting squarely on Block B's wide flat roof at y=26) */}
                  <g>
                    {/* Sturdy 4-leg wooden frame standing squarely on wide flat roof */}
                    <line x1="432" y1="26" x2="435" y2="-6" stroke="#451a03" strokeWidth="2.5" />
                    <line x1="478" y1="26" x2="475" y2="-6" stroke="#451a03" strokeWidth="2.5" />
                    <line x1="442" y1="26" x2="444" y2="-6" stroke="#381703" strokeWidth="2" />
                    <line x1="468" y1="26" x2="466" y2="-6" stroke="#381703" strokeWidth="2" />
                    {/* Cross braces */}
                    <line x1="434" y1="20" x2="476" y2="0" stroke="#522206" strokeWidth="1.5" />
                    <line x1="476" y1="20" x2="434" y2="0" stroke="#522206" strokeWidth="1.5" />
                    {/* Base Platform on stilts */}
                    <rect x="428" y="-9" width="54" height="4" rx="1" fill="#2d1204" />
                    {/* Barrel Tank Body */}
                    <rect x="432" y="-36" width="46" height="28" rx="2" fill="#78350f" />
                    {/* Steel Hoops */}
                    <line x1="432" y1="-30" x2="478" y2="-30" stroke="#1c1917" strokeWidth="1.5" />
                    <line x1="432" y1="-22" x2="478" y2="-22" stroke="#1c1917" strokeWidth="1.5" />
                    <line x1="432" y1="-14" x2="478" y2="-14" stroke="#1c1917" strokeWidth="1.5" />
                    {/* Conical Wooden Roof */}
                    <polygon points="426,-36 484,-36 455,-54" fill="#54240a" />
                    <circle cx="455" cy="-55" r="2.5" fill="#1c1917" />
                  </g>

                  {/* Rooftop Water Tower 2 (Sitting squarely on Block D's wide flat roof at y=21) */}
                  <g>
                    <line x1="972" y1="21" x2="975" y2="-11" stroke="#451a03" strokeWidth="2.5" />
                    <line x1="1018" y1="21" x2="1015" y2="-11" stroke="#451a03" strokeWidth="2.5" />
                    <line x1="982" y1="21" x2="984" y2="-11" stroke="#381703" strokeWidth="2" />
                    <line x1="1008" y1="21" x2="1006" y2="-11" stroke="#381703" strokeWidth="2" />
                    <line x1="974" y1="15" x2="1016" y2="-5" stroke="#522206" strokeWidth="1.5" />
                    <line x1="1016" y1="15" x2="974" y2="-5" stroke="#522206" strokeWidth="1.5" />
                    <rect x="968" y="-14" width="54" height="4" rx="1" fill="#2d1204" />
                    <rect x="972" y="-41" width="46" height="28" rx="2" fill="#78350f" />
                    <line x1="972" y1="-35" x2="1018" y2="-35" stroke="#1c1917" strokeWidth="1.5" />
                    <line x1="972" y1="-27" x2="1018" y2="-27" stroke="#1c1917" strokeWidth="1.5" />
                    <line x1="972" y1="-19" x2="1018" y2="-19" stroke="#1c1917" strokeWidth="1.5" />
                    <polygon points="966,-41 1024,-41 995,-59" fill="#54240a" />
                    <circle cx="995" cy="-60" r="2.5" fill="#1c1917" />
                  </g>

                  {/* Rooftop Details (Vent pipes & Antennas) */}
                  <rect x="355" y="10" width="16" height="17" fill="#1e293b" rx="1" />
                  <line x1="363" y1="10" x2="363" y2="-4" stroke="#475569" strokeWidth="2" />
                  <rect x="620" y="25" width="22" height="17" fill="#1e293b" rx="1" />
                  <rect x="710" y="30" width="18" height="12" fill="#334155" rx="1" />
                  <line x1="880" y1="21" x2="880" y2="2" stroke="#64748b" strokeWidth="2" />
                  <line x1="875" y1="8" x2="885" y2="8" stroke="#64748b" strokeWidth="1.5" />

                  {/* Evenly Aligned Grids of Apartment Windows across Block A, B, C, D */}
                  <g>
                    {/* Block A Windows: 4 cols x 5 rows */}
                    {[
                      { c: 0, r: 0, lit: true },
                      { c: 1, r: 0, lit: false },
                      { c: 2, r: 0, lit: true },
                      { c: 3, r: 0, lit: false },
                      { c: 0, r: 1, lit: false },
                      { c: 1, r: 1, lit: true },
                      { c: 2, r: 1, lit: false },
                      { c: 3, r: 1, lit: true },
                      { c: 0, r: 2, lit: true },
                      { c: 1, r: 2, lit: false },
                      { c: 2, r: 2, lit: true },
                      { c: 3, r: 2, lit: false },
                      { c: 0, r: 3, lit: false },
                      { c: 1, r: 3, lit: true },
                      { c: 2, r: 3, lit: false },
                      { c: 3, r: 3, lit: false },
                      { c: 0, r: 4, lit: true },
                      { c: 1, r: 4, lit: false },
                      { c: 2, r: 4, lit: true },
                      { c: 3, r: 4, lit: true },
                    ].map((w, i) => {
                      const wx = 30 + w.c * 50;
                      const wy = 75 + w.r * 38;
                      const isLit = isNightOrDark && w.lit;
                      return (
                        <rect
                          key={`a-${i}`}
                          x={wx}
                          y={wy}
                          width="18"
                          height="22"
                          rx="2"
                          fill={
                            isLit
                              ? '#FBBF24'
                              : isNightOrDark
                              ? 'rgba(15, 23, 42, 0.85)'
                              : 'rgba(255, 255, 255, 0.18)'
                          }
                          style={isLit ? { filter: 'drop-shadow(0 0 6px rgba(251, 191, 36, 0.9))' } : {}}
                        />
                      );
                    })}

                    {/* Block B Windows: 5 cols x 6 rows */}
                    {[
                      { c: 0, r: 0, lit: false },
                      { c: 1, r: 0, lit: true },
                      { c: 2, r: 0, lit: false },
                      { c: 3, r: 0, lit: true },
                      { c: 4, r: 0, lit: false },
                      { c: 0, r: 1, lit: true },
                      { c: 1, r: 1, lit: false },
                      { c: 2, r: 1, lit: true },
                      { c: 3, r: 1, lit: false },
                      { c: 4, r: 1, lit: true },
                      { c: 0, r: 2, lit: false },
                      { c: 1, r: 2, lit: true },
                      { c: 2, r: 2, lit: false },
                      { c: 3, r: 2, lit: true },
                      { c: 4, r: 2, lit: false },
                      { c: 0, r: 3, lit: true },
                      { c: 1, r: 3, lit: false },
                      { c: 2, r: 3, lit: true },
                      { c: 3, r: 3, lit: false },
                      { c: 4, r: 3, lit: true },
                      { c: 0, r: 4, lit: false },
                      { c: 1, r: 4, lit: false },
                      { c: 2, r: 4, lit: true },
                      { c: 3, r: 4, lit: true },
                      { c: 4, r: 4, lit: false },
                      { c: 0, r: 5, lit: true },
                      { c: 1, r: 5, lit: true },
                      { c: 2, r: 5, lit: false },
                      { c: 3, r: 5, lit: false },
                      { c: 4, r: 5, lit: true },
                    ].map((w, i) => {
                      const wx = 300 + w.c * 46;
                      const wy = 55 + w.r * 36;
                      const isLit = isNightOrDark && w.lit;
                      return (
                        <rect
                          key={`b-${i}`}
                          x={wx}
                          y={wy}
                          width="16"
                          height="20"
                          rx="2"
                          fill={
                            isLit
                              ? '#FDE68A'
                              : isNightOrDark
                              ? 'rgba(15, 23, 42, 0.85)'
                              : 'rgba(255, 255, 255, 0.18)'
                          }
                          style={isLit ? { filter: 'drop-shadow(0 0 6px rgba(253, 230, 138, 0.9))' } : {}}
                        />
                      );
                    })}

                    {/* Block C Windows: 5 cols x 5 rows */}
                    {[
                      { c: 0, r: 0, lit: true },
                      { c: 1, r: 0, lit: false },
                      { c: 2, r: 0, lit: true },
                      { c: 3, r: 0, lit: false },
                      { c: 4, r: 0, lit: true },
                      { c: 0, r: 1, lit: false },
                      { c: 1, r: 1, lit: true },
                      { c: 2, r: 1, lit: false },
                      { c: 3, r: 1, lit: true },
                      { c: 4, r: 1, lit: false },
                      { c: 0, r: 2, lit: true },
                      { c: 1, r: 2, lit: false },
                      { c: 2, r: 2, lit: true },
                      { c: 3, r: 2, lit: false },
                      { c: 4, r: 2, lit: true },
                      { c: 0, r: 3, lit: false },
                      { c: 1, r: 3, lit: true },
                      { c: 2, r: 3, lit: false },
                      { c: 3, r: 3, lit: true },
                      { c: 4, r: 3, lit: false },
                      { c: 0, r: 4, lit: true },
                      { c: 1, r: 4, lit: false },
                      { c: 2, r: 4, lit: true },
                      { c: 3, r: 4, lit: false },
                      { c: 4, r: 4, lit: true },
                    ].map((w, i) => {
                      const wx = 590 + w.c * 48;
                      const wy = 70 + w.r * 38;
                      const isLit = isNightOrDark && w.lit;
                      return (
                        <rect
                          key={`c-${i}`}
                          x={wx}
                          y={wy}
                          width="18"
                          height="22"
                          rx="2"
                          fill={
                            isLit
                              ? '#FBBF24'
                              : isNightOrDark
                              ? 'rgba(15, 23, 42, 0.85)'
                              : 'rgba(255, 255, 255, 0.18)'
                          }
                          style={isLit ? { filter: 'drop-shadow(0 0 6px rgba(251, 191, 36, 0.9))' } : {}}
                        />
                      );
                    })}

                    {/* Block D Windows: 6 cols x 6 rows */}
                    {[
                      { c: 0, r: 0, lit: false },
                      { c: 1, r: 0, lit: true },
                      { c: 2, r: 0, lit: false },
                      { c: 3, r: 0, lit: true },
                      { c: 4, r: 0, lit: false },
                      { c: 5, r: 0, lit: true },
                      { c: 0, r: 1, lit: true },
                      { c: 1, r: 1, lit: false },
                      { c: 2, r: 1, lit: true },
                      { c: 3, r: 1, lit: false },
                      { c: 4, r: 1, lit: true },
                      { c: 5, r: 1, lit: false },
                      { c: 0, r: 2, lit: false },
                      { c: 1, r: 2, lit: true },
                      { c: 2, r: 2, lit: false },
                      { c: 3, r: 2, lit: true },
                      { c: 4, r: 2, lit: false },
                      { c: 5, r: 2, lit: true },
                      { c: 0, r: 3, lit: true },
                      { c: 1, r: 3, lit: false },
                      { c: 2, r: 3, lit: true },
                      { c: 3, r: 3, lit: false },
                      { c: 4, r: 3, lit: true },
                      { c: 5, r: 3, lit: false },
                      { c: 0, r: 4, lit: false },
                      { c: 1, r: 4, lit: true },
                      { c: 2, r: 4, lit: false },
                      { c: 3, r: 4, lit: true },
                      { c: 4, r: 4, lit: false },
                      { c: 5, r: 4, lit: true },
                      { c: 0, r: 5, lit: true },
                      { c: 1, r: 5, lit: false },
                      { c: 2, r: 5, lit: true },
                      { c: 3, r: 5, lit: false },
                      { c: 4, r: 5, lit: true },
                      { c: 5, r: 5, lit: false },
                    ].map((w, i) => {
                      const wx = 890 + w.c * 48;
                      const wy = 50 + w.r * 36;
                      const isLit = isNightOrDark && w.lit;
                      return (
                        <rect
                          key={`d-${i}`}
                          x={wx}
                          y={wy}
                          width="16"
                          height="20"
                          rx="2"
                          fill={
                            isLit
                              ? '#FDE68A'
                              : isNightOrDark
                              ? 'rgba(15, 23, 42, 0.85)'
                              : 'rgba(255, 255, 255, 0.18)'
                          }
                          style={isLit ? { filter: 'drop-shadow(0 0 6px rgba(253, 230, 138, 0.9))' } : {}}
                        />
                      );
                    })}
                  </g>
                </svg>
              </div>

              {/* 4. Near Foreground Rooftop Parapet Coping Ledge */}
              <div
                className="absolute bottom-[80px] inset-x-0 h-6 pointer-events-none border-t shadow-md flex items-center justify-between px-16"
                style={{
                  backgroundColor: isNightOrDark ? '#11131c' : '#232734',
                  borderColor: isNightOrDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.15)',
                }}
              >
                <div className="w-16 h-3 bg-slate-700/40 rounded-t-xs" />
                <div className="w-12 h-3 bg-slate-700/40 rounded-t-xs" />
                <div className="w-20 h-3 bg-slate-700/40 rounded-t-xs" />
              </div>
            </div>
          );
        })()}
      </div>

      {/* ======================================================== */}
      {/* LAYER 5: DYNAMIC WEATHER PARTICLES CANVAS (Z-INDEX: 5)   */}
      {/* ======================================================== */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 5,
        }}
      />

      {/* ======================================================== */}
      {/* LAYER 10: 4-PANE WINDOW FRAME & GLASS REFLECTIONS (Z: 10)*/}
      {/* ======================================================== */}
      <div
        className="pointer-events-none"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 10,
        }}
      >
        {/* Glass Reflections */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.03] to-white/[0.08]" />

        {weather === 'night' && (
          <div className="absolute bottom-28 right-32 w-64 h-64 rounded-full bg-gradient-to-tr from-amber-500/15 via-amber-300/5 to-transparent blur-2xl pointer-events-none animate-pulse" style={{ animationDuration: '6s' }}>
            <div className="absolute bottom-6 right-12 w-16 h-28 border-t-2 border-amber-300/20 rounded-t-full opacity-40 blur-xs" />
          </div>
        )}

        {/* Outer Window Casement Frame */}
        <div
          className="absolute inset-0 border-[16px] md:border-[24px] pointer-events-none shadow-2xl"
          style={{ borderColor: p.frameWood }}
        />

        {/* Center Vertical Mullion */}
        <div
          className="absolute top-0 bottom-20 md:bottom-24 left-1/2 -translate-x-1/2 w-3 md:w-5 shadow-lg pointer-events-none"
          style={{ backgroundColor: p.frameWood }}
        />

        {/* Center Horizontal Transom */}
        <div
          className="absolute top-[42%] left-0 right-0 h-3 md:h-5 shadow-md pointer-events-none"
          style={{ backgroundColor: p.frameWood }}
        />

        {weather === 'snowy' && (
          <div className="absolute top-[41.5%] left-0 right-0 h-2 bg-gradient-to-b from-white/90 to-white/30 rounded-full blur-[0.5px] pointer-events-none" />
        )}
      </div>

      {/* ======================================================== */}
      {/* LAYER 15: WOODEN WINDOWSILL (BOTTOM LEDGE) (Z-INDEX: 15) */}
      {/* ======================================================== */}
      <div
        className="shadow-[0_-8px_24px_rgba(0,0,0,0.6)] pointer-events-none"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '80px',
          backgroundColor: p.sillWood,
          borderTop: `4px solid ${p.sillHighlight}`,
          zIndex: 15,
        }}
      >
        <div className="absolute top-1 inset-x-0 h-0.5 bg-white/10" />
        {weather === 'snowy' && (
          <div className="absolute -top-1.5 inset-x-0 h-3.5 bg-gradient-to-b from-white/95 via-white/80 to-transparent rounded-t-lg blur-[0.8px] pointer-events-none" />
        )}
      </div>

      {/* ======================================================== */}
      {/* LAYER 20: WINDOWSILL PROPS (RESTING SQUARELY ON TOP SILL)*/}
      {/* Anchored at bottom: 80px (top of sill) with Z-INDEX: 20   */}
      {/* ======================================================== */}
      <div
        className="pointer-events-auto select-none"
        style={{
          position: 'absolute',
          bottom: '80px',
          left: 0,
          right: 0,
          height: '0px',
          zIndex: 20,
        }}
      >
        {/* -------------------------------------------------------- */}
        {/* PROP 1: COMPLETE SELF-CONTAINED POTTED PLANT WITH POT    */}
        {/* Single self-contained SVG: visible pot #c26d4a + leaves  */}
        {/* Strictly hidden when sceneProps.plant is false           */}
        {/* -------------------------------------------------------- */}
        {sceneProps.plant && (
          <div className="absolute bottom-0 left-8 md:left-14 select-none">
            <svg className="w-28 h-32 md:w-32 md:h-36 drop-shadow-xl overflow-visible" viewBox="0 0 120 130">
              {/* 1. Lush Layered Leaves Group */}
              <g className="animate-leaf origin-bottom">
                {/* Dark back leaves */}
                <path d="M60,70 C35,48 20,28 32,12 C44,0 58,26 60,70 Z" fill="#064E3B" />
                <path d="M60,70 C85,48 100,28 88,12 C76,0 62,26 60,70 Z" fill="#047857" />

                {/* Left Monstera / Pothos Leaf with veins */}
                <path d="M60,70 C28,60 5,46 12,22 C24,6 46,32 60,70 Z" fill="#059669" />
                <path d="M35,36 Q22,34 16,28" stroke="#047857" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                <path d="M46,50 Q32,48 24,44" stroke="#047857" strokeWidth="1.8" strokeLinecap="round" fill="none" />

                {/* Right Leaf with veins */}
                <path d="M60,70 C92,60 115,46 108,22 C96,6 74,32 60,70 Z" fill="#10B981" />
                <path d="M85,36 Q98,34 104,28" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                <path d="M74,50 Q88,48 96,44" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" fill="none" />

                {/* Center Top Vibrant Leaf with main stem and veins */}
                <path d="M60,70 C44,38 46,6 60,0 C74,6 76,38 60,70 Z" fill="#34D399" />
                <line x1="60" y1="65" x2="60" y2="8" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
                <path d="M60,26 Q50,18 44,15" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                <path d="M60,38 Q70,30 76,27" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" fill="none" />

                {/* Cascading Spilling Leaves over pot rim */}
                <path d="M52,72 C36,70 28,88 34,98 C44,103 56,86 52,72 Z" fill="#10B981" />
                <path d="M44,78 Q36,88 38,94" stroke="#047857" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                <path d="M68,72 C84,70 92,88 86,98 C76,103 64,86 68,72 Z" fill="#34D399" />
              </g>

              {/* 2. Terracotta Pot Body (#c26d4a) & Soil Rim */}
              {/* Dark Rich Soil Rim */}
              <ellipse cx="60" cy="74" rx="34" ry="8" fill="#3b2214" />
              <ellipse cx="60" cy="73" rx="32" ry="6" fill="#24140b" />

              {/* Pot Rolled Rim (#c26d4a) */}
              <rect x="22" y="68" width="76" height="12" rx="4" fill="#c26d4a" />
              <rect x="24" y="69" width="72" height="3" rx="1.5" fill="#e08a67" opacity="0.6" />

              {/* Pot Body Tapering Down (#c26d4a with 3D gradient/shadow) */}
              <polygon points="28,80 92,80 80,126 40,126" fill="#c26d4a" />
              {/* Shading on right side */}
              <polygon points="60,80 92,80 80,126 60,126" fill="#a45535" opacity="0.35" />
              {/* Glaze highlight line on left */}
              <line x1="38" y1="84" x2="46" y2="120" stroke="#f0a587" strokeWidth="2.5" strokeLinecap="round" opacity="0.45" />

              {/* Pot Base shadow */}
              <ellipse cx="60" cy="126" rx="20" ry="3" fill="#884226" />
            </svg>
          </div>
        )}

        {/* -------------------------------------------------------- */}
        {/* PROP 2: COZY SLEEPING CAT (CENTER SILL)                  */}
        {/* Strictly hidden when sceneProps.cat / sceneProps.pet is false */}
        {/* -------------------------------------------------------- */}
        {(sceneProps.cat ?? (sceneProps as any).pet) && (
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 select-none">
            <div className="relative flex items-center justify-center">
              {/* Ambient sunbeam glow */}
              {weather === 'sunny' && (
                <div className="absolute -inset-6 bg-amber-300/35 rounded-full blur-xl pointer-events-none" />
              )}
              {weather === 'sunset' && (
                <div className="absolute -inset-6 bg-orange-400/30 rounded-full blur-xl pointer-events-none" />
              )}

              {/* Sleeping Cat with breathing ribcage and tail animations */}
              <div className="relative animate-breathe flex flex-col items-center">
                {/* Zzz floating sleep bubbles */}
                <div className="absolute -top-8 -right-3 text-xs font-mono font-bold text-amber-200/90 animate-bounce">
                  z<span className="text-[10px]">z</span><span className="text-[8px]">z</span>
                </div>

                <svg className="w-28 md:w-32 h-18 md:h-20 drop-shadow-2xl" viewBox="0 0 130 85">
                  <ellipse cx="65" cy="74" rx="55" ry="8" fill="rgba(0, 0, 0, 0.45)" />

                  {/* Twitching Tail */}
                  <g className="animate-tail origin-bottom-right">
                    <path
                      d="M102,60 C122,55 124,32 110,38 C102,42 108,52 112,48"
                      fill="none"
                      stroke="#C2410C"
                      strokeWidth="8"
                      strokeLinecap="round"
                    />
                    <path
                      d="M102,60 C122,55 124,32 110,38"
                      fill="none"
                      stroke="#F97316"
                      strokeWidth="6"
                      strokeLinecap="round"
                    />
                    <circle cx="111" cy="38" r="4" fill="#FFF7ED" />
                  </g>

                  {/* Curled Body Flank */}
                  <ellipse cx="66" cy="54" rx="42" ry="24" fill="#EA580C" />
                  <ellipse cx="66" cy="50" rx="38" ry="20" fill="#F97316" />

                  {/* Tabby Stripes */}
                  <path d="M52,38 Q58,45 54,54" stroke="#9A3412" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.6" />
                  <path d="M66,35 Q72,44 68,55" stroke="#9A3412" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.6" />
                  <path d="M80,38 Q86,46 82,54" stroke="#9A3412" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.6" />

                  {/* Belly Patch */}
                  <ellipse cx="64" cy="62" rx="26" ry="12" fill="#FFF7ED" />
                  <ellipse cx="94" cy="64" rx="9" ry="6" fill="#FDBA74" />
                  <path d="M96,62 L96,66" stroke="#C2410C" strokeWidth="1" strokeLinecap="round" />

                  {/* Head */}
                  <circle cx="34" cy="48" r="21" fill="#EA580C" />
                  <circle cx="34" cy="47" r="19" fill="#F97316" />

                  {/* Ears */}
                  <polygon points="18,36 24,14 34,29" fill="#C2410C" />
                  <polygon points="21,33 25,18 31,28" fill="#FDA4AF" />
                  <polygon points="34,28 44,14 49,34" fill="#C2410C" />
                  <polygon points="36,28 43,18 47,32" fill="#FDA4AF" />

                  {/* Peaceful Sleeping Eyes */}
                  <path d="M22,48 Q27,53 31,48" fill="none" stroke="#7C2D12" strokeWidth="2.2" strokeLinecap="round" />
                  <path d="M35,48 Q40,53 44,48" fill="none" stroke="#7C2D12" strokeWidth="2.2" strokeLinecap="round" />

                  {/* Pink Nose & Whisker Contours */}
                  <polygon points="33,54 30,57 36,57" fill="#F43F5E" />
                  <path d="M33,57 L33,60 M33,60 Q30,63 26,61 M33,60 Q36,63 40,61" fill="none" stroke="#7C2D12" strokeWidth="1.2" strokeLinecap="round" />
                  <path d="M25,56 Q14,54 8,56 M25,58 Q14,58 7,62" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" opacity="0.75" />
                  <path d="M41,56 Q52,54 58,56 M41,58 Q52,58 59,62" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" opacity="0.75" />

                  {/* Front Paws */}
                  <ellipse cx="36" cy="66" rx="9" ry="6" fill="#FFF7ED" />
                  <ellipse cx="24" cy="65" rx="8" ry="5.5" fill="#FED7AA" />
                  <path d="M24,63 L24,67" stroke="#EA580C" strokeWidth="1" strokeLinecap="round" />
                  <path d="M36,64 L36,68" stroke="#EA580C" strokeWidth="1" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------- */}
        {/* PROP 3: STEAMING COFFEE MUG (CENTER-RIGHT SILL)          */}
        {/* Strictly hidden when sceneProps.mug is false             */}
        {/* -------------------------------------------------------- */}
        {sceneProps.mug && (
          <div className="absolute bottom-0 right-[30%] md:right-[32%] select-none">
            <div className="relative flex flex-col items-center">
              {/* Animated Curling Steam Wisps */}
              <div className="absolute -top-12 inset-x-0 flex justify-center pointer-events-none">
                <svg className="w-10 h-14 text-white/60" viewBox="0 0 50 70">
                  <path
                    d="M18,65 C12,45 32,32 18,15 C14,8 24,0 20,-2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    className="animate-steam-1"
                  />
                  <path
                    d="M32,65 C38,48 20,35 32,18 C36,10 26,0 30,-2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    className="animate-steam-2"
                  />
                </svg>
              </div>

              {/* Ceramic Mug with Handle & Latte Foam Art */}
              <svg className="w-16 md:w-18 h-16 drop-shadow-2xl" viewBox="0 0 65 55">
                <ellipse cx="28" cy="50" rx="22" ry="4" fill="rgba(0, 0, 0, 0.4)" />
                <path
                  d="M44,17 C56,17 56,38 44,40"
                  fill="none"
                  stroke="#0369A1"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                <path
                  d="M44,18 C54,18 54,37 44,39"
                  fill="none"
                  stroke="#38BDF8"
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity="0.4"
                />

                <rect x="10" y="14" width="36" height="34" rx="6" fill="#0284C7" />
                <rect x="12" y="15" width="8" height="32" rx="3" fill="#38BDF8" opacity="0.3" />

                <ellipse cx="28" cy="14" rx="18" ry="4.5" fill="#0369A1" />
                <ellipse cx="28" cy="14" rx="16" ry="3.8" fill="#1E293B" />
                <ellipse cx="28" cy="14" rx="14" ry="3.2" fill="#451A03" />

                {/* Latte Art Foam Heart */}
                <path
                  d="M28,15.5 C28,15.5 25,13.5 25,12 C25,11 26.5,10.5 27.5,11.2 C28,11.6 28,12 28,12 C28,12 28,11.6 28.5,11.2 C29.5,10.5 31,11 31,12 C31,13.5 28,15.5 28,15.5 Z"
                  fill="#FEF3C7"
                  opacity="0.85"
                />

                {/* Heart Emblem on Mug Body */}
                <path
                  d="M28,32 C28,32 23,27 23,24.5 C23,22.5 25,21.5 26.8,22.6 C27.5,23.1 28,23.8 28,23.8 C28,23.8 28.5,23.1 29.2,22.6 C31,21.5 33,22.5 33,24.5 C33,27 28,32 28,32 Z"
                  fill="#BAE6FD"
                  opacity="0.9"
                />
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
