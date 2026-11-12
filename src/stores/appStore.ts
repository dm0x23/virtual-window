import { atom } from 'nanostores';

export type WeatherType = 'sunny' | 'sunset' | 'cloudy' | 'rainy' | 'thunder' | 'snowy' | 'night';
export type SceneryType = 'countryside' | 'ocean' | 'mountains' | 'city';

export interface SceneProps {
  plant: boolean;
  mug: boolean;
  cat: boolean;
  pet?: boolean; // legacy alias
  birds: boolean;
  trees: boolean;
  leaves: boolean;
}

export interface PomodoroConfig {
  focusMinutes: number;
  breakMinutes: number;
}

export interface SoundChannels {
  rain: boolean;
  thunder: boolean;
  trees: boolean;
  birds: boolean;
  waves: boolean;
}

export interface SoundVolumes {
  rain: number;
  thunder: number;
  trees: number;
  birds: number;
  waves: number;
}

export interface TaskItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

// Auto-Linked Weather Sound Presets
export const WEATHER_SOUND_PRESETS: Record<WeatherType, SoundChannels> = {
  sunny: { rain: false, thunder: false, trees: true, birds: true, waves: false },
  sunset: { rain: false, thunder: false, trees: true, birds: true, waves: false },
  cloudy: { rain: false, thunder: false, trees: true, birds: false, waves: false },
  rainy: { rain: true, thunder: false, trees: false, birds: false, waves: false },
  thunder: { rain: true, thunder: true, trees: false, birds: false, waves: false },
  snowy: { rain: false, thunder: false, trees: true, birds: false, waves: false },
  night: { rain: false, thunder: false, trees: false, birds: false, waves: false },
};

// Helper to safely read from localStorage
const getStored = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

// State Atoms
export const $weather = atom<WeatherType>('sunny');
export const $scenery = atom<SceneryType>('countryside');
export const $sceneProps = atom<SceneProps>({
  plant: true,
  mug: true,
  cat: true,
  pet: true,
  birds: true,
  trees: true,
  leaves: true,
});
export const $zenMode = atom<boolean>(false);
export const $pomodoroConfig = atom<PomodoroConfig>({
  focusMinutes: 25,
  breakMinutes: 5,
});

export const $soundChannels = atom<SoundChannels>({
  rain: false,
  thunder: false,
  trees: true,
  birds: true,
  waves: false,
});

export const $soundVolumes = atom<SoundVolumes>({
  rain: 0.65,
  thunder: 0.75,
  trees: 0.5,
  birds: 0.55,
  waves: 0.6,
});

export const $isSettingsOpen = atom<boolean>(false);
export type MusicTabType = 'lofi' | 'youtube' | 'spotify';
export const $musicTab = atom<MusicTabType>('lofi');

// Working default Lofi Girl Playlist Embed (Full length, embed-enabled, nocookie)
export const DEFAULT_YOUTUBE_EMBED = 'https://www.youtube-nocookie.com/embed/videoseries?list=PL6NdkXsPL07KN01gH2vucrHCEyyV-ajHz&rel=0&modestbranding=1';
export const $youtubeEmbedUrl = atom<string>(DEFAULT_YOUTUBE_EMBED);

export const $tasks = atom<TaskItem[]>([
  { id: '1', text: 'Sip warm coffee & plan the day', completed: true, createdAt: Date.now() - 3600000 },
  { id: '2', text: 'Deep work focus block (50 min)', completed: false, createdAt: Date.now() - 1800000 },
  { id: '3', text: 'Stretch & gaze out the window', completed: false, createdAt: Date.now() },
]);

export const $spotifyUri = atom<string>('playlist/37i9dQZF1DXdLEN7aqioXM'); // Lo-Fi Beats default

// Helper to parse any YouTube video or playlist link with youtube-nocookie
export function parseYouTubeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Direct embed already
  if (trimmed.includes('youtube.com/embed/') || trimmed.includes('youtube-nocookie.com/embed/')) {
    return trimmed;
  }

  // Playlist link: ?list=PLAYLIST_ID
  const listMatch = trimmed.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  if (listMatch) {
    return `https://www.youtube-nocookie.com/embed/videoseries?list=${listMatch[1]}&rel=0&modestbranding=1`;
  }

  // Standard video link: watch?v=VIDEO_ID or live/VIDEO_ID or youtu.be/ID
  const videoMatch = trimmed.match(/(?:v=|\/live\/|\/v\/|youtu\.be\/|\/shorts\/)([a-zA-Z0-9_-]{11})/);
  if (videoMatch) {
    return `https://www.youtube-nocookie.com/embed/${videoMatch[1]}?rel=0&modestbranding=1`;
  }

  // Raw 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return `https://www.youtube-nocookie.com/embed/${trimmed}?rel=0&modestbranding=1`;
  }

  return null;
}

// Sync & Hydration
export function initStore() {
  if (typeof window === 'undefined') return;

  let savedWeather = getStored<WeatherType>('vw_weather', 'sunny');
  if (!savedWeather || savedWeather === 'night') {
    savedWeather = 'sunny';
  }
  $weather.set(savedWeather);

  const savedScenery = getStored<SceneryType>('vw_scenery', 'countryside');
  $scenery.set(savedScenery);

  const rawProps = getStored<Partial<SceneProps>>('vw_sceneProps', {});
  const catVal = rawProps.cat !== undefined ? rawProps.cat : (rawProps.pet !== undefined ? rawProps.pet : true);
  const savedProps: SceneProps = {
    plant: rawProps.plant !== undefined ? rawProps.plant : true,
    mug: rawProps.mug !== undefined ? rawProps.mug : true,
    cat: catVal,
    pet: catVal,
    birds: rawProps.birds !== undefined ? rawProps.birds : true,
    trees: rawProps.trees !== undefined ? rawProps.trees : true,
    leaves: rawProps.leaves !== undefined ? rawProps.leaves : true,
  };
  $sceneProps.set(savedProps);

  const savedPomo = getStored<PomodoroConfig>('vw_pomoconfig', { focusMinutes: 25, breakMinutes: 5 });
  $pomodoroConfig.set(savedPomo);

  const savedTasks = getStored<TaskItem[]>('vw_tasks', $tasks.get());
  $tasks.set(savedTasks);

  const savedSpotify = getStored<string>('vw_spotify', 'playlist/37i9dQZF1DXdLEN7aqioXM');
  $spotifyUri.set(savedSpotify);

  const savedSounds = getStored<SoundChannels>('vw_sounds', WEATHER_SOUND_PRESETS[savedWeather]);
  $soundChannels.set(savedSounds);

  const savedVolumes = getStored<SoundVolumes>('vw_soundvols', {
    rain: 0.65,
    thunder: 0.75,
    trees: 0.5,
    birds: 0.55,
    waves: 0.6,
  });
  $soundVolumes.set(savedVolumes);

  let savedTab = getStored<any>('vw_musictab', 'lofi');
  if (savedTab === 'radio') savedTab = 'youtube';
  if (savedTab !== 'lofi' && savedTab !== 'youtube' && savedTab !== 'spotify') {
    savedTab = 'lofi';
  }
  $musicTab.set(savedTab);

  let savedYt = getStored<string>('vw_youtube', DEFAULT_YOUTUBE_EMBED);
  // Auto-upgrade if previous broken stream URL is stored
  if (!savedYt || savedYt.includes('jfKfPfyJRdk')) {
    savedYt = DEFAULT_YOUTUBE_EMBED;
  }
  $youtubeEmbedUrl.set(savedYt);

  // Auto-persist on changes
  $weather.subscribe((w) => {
    try { localStorage.setItem('vw_weather', JSON.stringify(w)); } catch {}
  });
  $scenery.subscribe((s) => {
    try { localStorage.setItem('vw_scenery', JSON.stringify(s)); } catch {}
  });
  $sceneProps.subscribe((p) => {
    try { localStorage.setItem('vw_sceneProps', JSON.stringify(p)); } catch {}
  });
  $pomodoroConfig.subscribe((c) => {
    try { localStorage.setItem('vw_pomoconfig', JSON.stringify(c)); } catch {}
  });
  $tasks.subscribe((t) => {
    try { localStorage.setItem('vw_tasks', JSON.stringify(t)); } catch {}
  });
  $spotifyUri.subscribe((s) => {
    try { localStorage.setItem('vw_spotify', JSON.stringify(s)); } catch {}
  });
  $soundChannels.subscribe((sc) => {
    try { localStorage.setItem('vw_sounds', JSON.stringify(sc)); } catch {}
  });
  $soundVolumes.subscribe((sv) => {
    try { localStorage.setItem('vw_soundvols', JSON.stringify(sv)); } catch {}
  });
  $musicTab.subscribe((mt) => {
    try { localStorage.setItem('vw_musictab', JSON.stringify(mt)); } catch {}
  });
  $youtubeEmbedUrl.subscribe((yt) => {
    try { localStorage.setItem('vw_youtube', JSON.stringify(yt)); } catch {}
  });

  // Global Fullscreen change & F11 key listeners
  const onFsChange = () => {
    $isFullscreen.set(!!(document.fullscreenElement || (document as any).webkitFullscreenElement));
  };
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'F11') {
      e.preventDefault();
      toggleFullscreen();
    }
  });
}

// Action helpers
export function setWeather(weather: WeatherType) {
  $weather.set(weather);
  const linked = WEATHER_SOUND_PRESETS[weather];
  if (linked) {
    const isOcean = $scenery.get() === 'ocean';
    $soundChannels.set({
      ...linked,
      waves: isOcean ? true : linked.waves,
    });
    // Boost volume if enabled channel was at 0
    const vols = $soundVolumes.get();
    let updated = false;
    const newVols = { ...vols };
    (Object.keys(linked) as (keyof SoundChannels)[]).forEach((ch) => {
      if (linked[ch] && newVols[ch] <= 0.05) {
        newVols[ch] = 0.6;
        updated = true;
      }
    });
    if (updated) {
      $soundVolumes.set(newVols);
    }
  }
}

export function setScenery(scenery: SceneryType) {
  $scenery.set(scenery);
  if (scenery === 'ocean') {
    const currentChannels = $soundChannels.get();
    $soundChannels.set({
      ...currentChannels,
      waves: true,
    });
    const vols = $soundVolumes.get();
    if (vols.waves <= 0.05) {
      $soundVolumes.set({ ...vols, waves: 0.65 });
    }
  }
}

export function toggleSoundChannel(channel: keyof SoundChannels) {
  const current = $soundChannels.get();
  $soundChannels.set({
    ...current,
    [channel]: !current[channel],
  });
}

export function setChannelVolume(channel: keyof SoundVolumes, vol: number) {
  const current = $soundVolumes.get();
  $soundVolumes.set({
    ...current,
    [channel]: Math.max(0, Math.min(1, vol)),
  });
}

export function toggleSceneProp(prop: keyof SceneProps) {
  const current = $sceneProps.get();
  const nextVal = !current[prop];
  const updated: SceneProps = {
    ...current,
    [prop]: nextVal,
  };
  if (prop === 'cat') {
    updated.pet = nextVal;
  } else if (prop === 'pet') {
    updated.cat = nextVal;
  }
  $sceneProps.set(updated);
}

export function toggleZenMode() {
  $zenMode.set(!$zenMode.get());
}

export function setPomodoroConfig(config: PomodoroConfig) {
  $pomodoroConfig.set(config);
}

export function addTask(text: string) {
  if (!text.trim()) return;
  const current = $tasks.get();
  const newTask: TaskItem = {
    id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
    text: text.trim(),
    completed: false,
    createdAt: Date.now(),
  };
  $tasks.set([newTask, ...current]);
}

export function toggleTask(id: string) {
  const current = $tasks.get();
  $tasks.set(
    current.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
  );
}

export function deleteTask(id: string) {
  const current = $tasks.get();
  $tasks.set(current.filter((t) => t.id !== id));
}

export function setSpotifyEmbed(uri: string) {
  $spotifyUri.set(uri);
}

export function setMusicTab(tab: MusicTabType) {
  $musicTab.set(tab);
}

export function setCustomYoutubeEmbed(embedUrl: string) {
  $youtubeEmbedUrl.set(embedUrl);
}

// Fullscreen state & toggle action
export const $isFullscreen = atom<boolean>(false);

export function toggleFullscreen() {
  if (typeof document === 'undefined') return;

  if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else if ((document.documentElement as any).webkitRequestFullscreen) {
      (document.documentElement as any).webkitRequestFullscreen();
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    } else if ((document as any).webkitExitFullscreen) {
      (document as any).webkitExitFullscreen();
    }
  }
}

// Widget layout reset trigger
export const $layoutResetTrigger = atom<number>(0);

export function resetWidgetPositions() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('vw_drag_tasks');
      localStorage.removeItem('vw_drag_pomodoro');
      localStorage.removeItem('vw_drag_music');
    } catch {}
  }
  $layoutResetTrigger.set(Date.now());
}

// Auto-hydrate when loaded in the browser
if (typeof window !== 'undefined') {
  initStore();
}
