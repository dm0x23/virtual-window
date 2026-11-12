# Cozy Virtual Window 🪟✨

A cozy, lo-fi ambient productivity web application inspired by **Virtual Cottage** and **LifeAt.io**, built with **Astro**, **Bun**, and **Tailwind CSS**.

---

## Features & Upgrades

### 🪟 1. The 4-Pane Window Scene (7 Atmospheric Weather Presets)
- **7 Dynamic Weather States**:
  - ☀️ **Sunny**: Warm golden-hour dawn gradient, drifting layered clouds, flying bird flock, and sleeping cat in a sunbeam.
  - 🌅 **Sunset**: Warm amber/peach horizon gradient, glowing clouds, and evening sky radiance.
  - ☁️ **Cloudy**: Diffused overcast sky, multi-layer parallax clouds, swaying trees, and drifting autumn leaves.
  - 🌧️ **Rainy**: Moody slate-blue sky, angled falling rain streaks, and puddle ripples on the windowsill.
  - ⚡ **Thunder**: Dark storm clouds, heavy rain, and occasional brief lightning flashes in the sky.
  - ❄️ **Snowy**: Crisp pale winter sky, soft drifting snowflakes, and a delicate layer of snow resting along the windowsill ledge.
  - 🌙 **Night**: Deep midnight indigo sky, glowing crescent moon, twinkling starfield, and warm lights in the distant cottage.

### 🐱 2. Cozy, Detailed Windowsill Props Artwork
- 🐱 **Sleeping Cat (Center)**: Hand-crafted curled-up illustrated orange tabby with multi-tone fur shading, subtle tabby stripes, tucked front and back paws, pointed ears with soft pink inner tints, peaceful closed eyes, white whiskers, gently rising/falling ribcage breathing animation (`animate-breathe`), and softly twitching tail tip (`animate-tail`).
- 🌿 **Potted Plant (Left)**: Textured terracotta pot with rolled rim highlight, glaze sheen, dark soil, layered trailing pothos/monstera leaves with distinct vein lines and cascading leaf spilling over the pot lip, swaying gently in the breeze (`animate-leaf`).
- ☕ **Steaming Mug (Right)**: Cozy ceramic mug with ergonomic handle, rim highlights, rich dark roast coffee surface with cute latte foam heart art, and two curving animated steam wisps rising smoothly into the window light (`animate-steam-1`, `animate-steam-2`).

### 🎛️ 3. Sounds Mixer (4 Independent Channel Sliders + Multi-Stage Thunder)
- **4 Dedicated Channel Gain Controls**:
  - 🌧️ **Rain**: Low-pass filtered pink/brown noise rainfall with dedicated `0–100%` volume slider and mute toggle.
  - ⚡ **Thunder**: Dramatic **multi-stage Web Audio engine**:
    - *Initial Crack / Clap*: Fast 15ms attack, 250ms decay bandpass-filtered white noise burst (400Hz–1200Hz).
    - *Rolling Echoes & Sub-Bass Rumble*: Overlapping secondary noise bursts (120Hz–350Hz) and sub-bass sine resonance (35Hz–55Hz) with realistic 3.5s–4.5s decay.
    - *Lightning Sync*: Realistic 0.4s–1.0s speed-of-sound delay between visual sky flash and thunder rumble.
  - 🌲 **Trees**: Gentle bandpass-filtered wind rustling through leaves with organic LFO modulation and dedicated volume slider.
  - 🐦 **Birds**: Soft FM-synthesized natural bird chirps at random intervals with dedicated volume slider.
- **Auto-Linked Presets with Independent Mixing**:
  - Switching weathers automatically activates matching channels, while allowing complete freedom to mix exact volumes (e.g. loud rain + subtle distant thunder + gentle wind).

### 📻 4. Music Player (Custom YouTube Videos & Playlists + Spotify)
- **Lo-Fi Radio / YouTube Tab**:
  - 3 quick preset buttons: *Lofi Girl*, *Chillhop*, *Rainy Jazz*.
  - **Custom URL Input**: Paste any YouTube link format (`youtube.com/watch?v=...`, `youtu.be/...`, or `youtube.com/playlist?list=...`) to load custom video streams or playlists with full continuous playback.
- **Spotify Tab**:
  - Quick presets: *Lo-Fi Beats*, *Peaceful Piano*, *Deep Focus*, plus custom link loader.

### ⏱️ 5. Productivity & Minimalist Tools
- **Pomodoro Timer (Top-Center Pill)**:
  - Strictly renders **ONLY the digital countdown clock** (`MM:SS`) and minimal Play/Pause/Reset icon buttons (**zero circular rings or progress bars**).
  - Web Audio harmonic completion chime (528 Hz Solfeggio fundamental) when timer reaches `00:00`.
- **Task List (Left Panel)**:
  - Add tasks with `Enter`, toggle complete with smooth strikethrough, filter by `All / Active / Done`, and delete with automatic `localStorage` synchronization.
- **Zen Mode**:
  - Minimal one-click toggle to hide all floating widgets for distraction-free view gazing, with floating restore pill.

---

## How to Run

```bash
# Start development server on port 4322
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview
```
