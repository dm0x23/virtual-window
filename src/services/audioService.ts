// Web Audio API Procedural Synthesizer: 5 Independent Channels (Rain, Thunder, Trees, Birds, Waves) + Multi-Stage Thunder

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

class AudioService {
  private ctx: AudioContext | null = null;

  // Channel Master Gain Nodes
  private rainChannelGain: GainNode | null = null;
  private thunderChannelGain: GainNode | null = null;
  private treesChannelGain: GainNode | null = null;
  private birdsChannelGain: GainNode | null = null;
  private wavesChannelGain: GainNode | null = null;

  // Rain channel sources
  private rainSource: AudioBufferSourceNode | null = null;

  // Trees channel sources
  private treesSource: AudioBufferSourceNode | null = null;
  private treesLfo: OscillatorNode | null = null;

  // Waves channel sources
  private wavesSource: AudioBufferSourceNode | null = null;
  private wavesLfo: OscillatorNode | null = null;

  // Thunder channel state
  private thunderActive: boolean = false;
  private thunderTimeout: ReturnType<typeof setTimeout> | null = null;

  // Birds channel state
  private birdsActive: boolean = false;
  private birdsTimeout: ReturnType<typeof setTimeout> | null = null;

  // Active states & volumes
  private activeChannels: SoundChannels = {
    rain: false,
    thunder: false,
    trees: false,
    birds: false,
    waves: false,
  };

  private channelVolumes: SoundVolumes = {
    rain: 0.65,
    thunder: 0.75,
    trees: 0.5,
    birds: 0.55,
    waves: 0.6,
  };

  private initContext() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    if (!this.rainChannelGain && this.ctx) {
      this.rainChannelGain = this.ctx.createGain();
      this.rainChannelGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      this.rainChannelGain.connect(this.ctx.destination);
    }

    if (!this.thunderChannelGain && this.ctx) {
      this.thunderChannelGain = this.ctx.createGain();
      this.thunderChannelGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      this.thunderChannelGain.connect(this.ctx.destination);
    }

    if (!this.treesChannelGain && this.ctx) {
      this.treesChannelGain = this.ctx.createGain();
      this.treesChannelGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      this.treesChannelGain.connect(this.ctx.destination);
    }

    if (!this.birdsChannelGain && this.ctx) {
      this.birdsChannelGain = this.ctx.createGain();
      this.birdsChannelGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      this.birdsChannelGain.connect(this.ctx.destination);
    }

    if (!this.wavesChannelGain && this.ctx) {
      this.wavesChannelGain = this.ctx.createGain();
      this.wavesChannelGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      this.wavesChannelGain.connect(this.ctx.destination);
    }
  }

  // Create White Noise Buffer
  private createWhiteNoiseBuffer(duration: number = 3): AudioBuffer {
    if (!this.ctx) throw new Error('No audio context');
    const sampleRate = this.ctx.sampleRate;
    const bufferSize = sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // Create Pink Noise Buffer
  private createPinkNoiseBuffer(): AudioBuffer {
    if (!this.ctx) throw new Error('No audio context');
    const sampleRate = this.ctx.sampleRate;
    const bufferSize = sampleRate * 5;
    const buffer = this.ctx.createBuffer(2, bufferSize, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.07;
        b6 = white * 0.115926;
      }
    }
    return buffer;
  }

  // Create Brown Noise Buffer
  private createBrownNoiseBuffer(): AudioBuffer {
    if (!this.ctx) throw new Error('No audio context');
    const sampleRate = this.ctx.sampleRate;
    const bufferSize = sampleRate * 5;
    const buffer = this.ctx.createBuffer(2, bufferSize, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 1.8;
      }
    }
    return buffer;
  }

  // Set individual channel volume directly
  public setChannelVolume(channel: keyof SoundVolumes, vol: number) {
    this.initContext();
    this.channelVolumes[channel] = vol;
    const now = this.ctx ? this.ctx.currentTime : 0;
    const isChannelActive = this.activeChannels[channel];
    const targetGain = isChannelActive ? vol : 0.0001;

    if (!this.ctx) return;

    if (channel === 'rain' && this.rainChannelGain) {
      this.rainChannelGain.gain.setTargetAtTime(targetGain * 0.5, now, 0.08);
    } else if (channel === 'thunder' && this.thunderChannelGain) {
      this.thunderChannelGain.gain.setTargetAtTime(targetGain * 0.85, now, 0.08);
    } else if (channel === 'trees' && this.treesChannelGain) {
      this.treesChannelGain.gain.setTargetAtTime(targetGain * 0.45, now, 0.08);
    } else if (channel === 'birds' && this.birdsChannelGain) {
      this.birdsChannelGain.gain.setTargetAtTime(targetGain * 0.35, now, 0.08);
    } else if (channel === 'waves' && this.wavesChannelGain) {
      this.wavesChannelGain.gain.setTargetAtTime(targetGain * 0.55, now, 0.08);
    }
  }

  // 1. RAIN CHANNEL
  private startRain() {
    this.initContext();
    if (!this.ctx || !this.rainChannelGain) return;
    if (this.rainSource) return;

    const buffer = this.createPinkNoiseBuffer();
    this.rainSource = this.ctx.createBufferSource();
    this.rainSource.buffer = buffer;
    this.rainSource.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, this.ctx.currentTime);
    filter.Q.setValueAtTime(0.8, this.ctx.currentTime);

    this.rainSource.connect(filter);
    filter.connect(this.rainChannelGain);

    this.rainChannelGain.gain.setTargetAtTime(this.channelVolumes.rain * 0.5, this.ctx.currentTime, 0.2);
    this.rainSource.start();
  }

  private stopRain() {
    if (this.rainChannelGain && this.ctx) {
      this.rainChannelGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.2);
    }
    setTimeout(() => {
      if (this.rainSource) {
        try {
          this.rainSource.stop();
          this.rainSource.disconnect();
        } catch {}
        this.rainSource = null;
      }
    }, 300);
  }

  // 2. TREES CHANNEL (Wind rustling leaves)
  private startTrees() {
    this.initContext();
    if (!this.ctx || !this.treesChannelGain) return;
    if (this.treesSource) return;

    const buffer = this.createPinkNoiseBuffer();
    this.treesSource = this.ctx.createBufferSource();
    this.treesSource.buffer = buffer;
    this.treesSource.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(520, this.ctx.currentTime);
    filter.Q.setValueAtTime(1.6, this.ctx.currentTime);

    this.treesLfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    this.treesLfo.type = 'sine';
    this.treesLfo.frequency.setValueAtTime(0.18, this.ctx.currentTime);
    lfoGain.gain.setValueAtTime(220, this.ctx.currentTime);

    this.treesLfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    this.treesLfo.start();

    this.treesSource.connect(filter);
    filter.connect(this.treesChannelGain);

    this.treesChannelGain.gain.setTargetAtTime(this.channelVolumes.trees * 0.45, this.ctx.currentTime, 0.3);
    this.treesSource.start();
  }

  private stopTrees() {
    if (this.treesChannelGain && this.ctx) {
      this.treesChannelGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.2);
    }
    if (this.treesLfo) {
      try {
        this.treesLfo.stop();
        this.treesLfo.disconnect();
      } catch {}
      this.treesLfo = null;
    }
    setTimeout(() => {
      if (this.treesSource) {
        try {
          this.treesSource.stop();
          this.treesSource.disconnect();
        } catch {}
        this.treesSource = null;
      }
    }, 300);
  }

  // 3. WAVES CHANNEL (Gentle ocean surf swell & foam)
  private startWaves() {
    this.initContext();
    if (!this.ctx || !this.wavesChannelGain) return;
    if (this.wavesSource) return;

    const buffer = this.createBrownNoiseBuffer();
    this.wavesSource = this.ctx.createBufferSource();
    this.wavesSource.buffer = buffer;
    this.wavesSource.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(420, this.ctx.currentTime);
    filter.Q.setValueAtTime(1.4, this.ctx.currentTime);

    // LFO to swell the ocean surf (8-second natural tide cycle)
    this.wavesLfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    this.wavesLfo.type = 'sine';
    this.wavesLfo.frequency.setValueAtTime(0.12, this.ctx.currentTime);
    lfoGain.gain.setValueAtTime(280, this.ctx.currentTime);

    this.wavesLfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    this.wavesLfo.start();

    this.wavesSource.connect(filter);
    filter.connect(this.wavesChannelGain);

    this.wavesChannelGain.gain.setTargetAtTime(this.channelVolumes.waves * 0.55, this.ctx.currentTime, 0.4);
    this.wavesSource.start();
  }

  private stopWaves() {
    if (this.wavesChannelGain && this.ctx) {
      this.wavesChannelGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.2);
    }
    if (this.wavesLfo) {
      try {
        this.wavesLfo.stop();
        this.wavesLfo.disconnect();
      } catch {}
      this.wavesLfo = null;
    }
    setTimeout(() => {
      if (this.wavesSource) {
        try {
          this.wavesSource.stop();
          this.wavesSource.disconnect();
        } catch {}
        this.wavesSource = null;
      }
    }, 300);
  }

  // 4. REALISTIC MULTI-STAGE PROCEDURAL THUNDER ENGINE
  private playMultiStageThunder() {
    if (!this.ctx || !this.thunderChannelGain || !this.thunderActive) return;

    // 1. Dispatch lightning flash immediately
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('virtual-window-lightning'));
    }

    // 2. Realistic speed-of-sound delay between flash and thunder sound (400ms to 1000ms)
    const soundDelay = Math.random() * 0.6 + 0.4;

    setTimeout(() => {
      if (!this.ctx || !this.thunderChannelGain || !this.thunderActive) return;

      const now = this.ctx.currentTime;

      // STAGE 1: Initial Sharp Crack / Clap (15ms attack, 250ms decay)
      const clapBuffer = this.createWhiteNoiseBuffer(1);
      const clapSource = this.ctx.createBufferSource();
      clapSource.buffer = clapBuffer;

      const clapFilter = this.ctx.createBiquadFilter();
      clapFilter.type = 'bandpass';
      clapFilter.frequency.setValueAtTime(750, now);
      clapFilter.Q.setValueAtTime(1.2, now);

      const clapGain = this.ctx.createGain();
      clapGain.gain.setValueAtTime(0.0001, now);
      clapGain.gain.exponentialRampToValueAtTime(0.85, now + 0.015);
      clapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      clapSource.connect(clapFilter);
      clapFilter.connect(clapGain);
      clapGain.connect(this.thunderChannelGain);

      clapSource.start(now);
      clapSource.stop(now + 0.35);

      // STAGE 2: Secondary Rolling Echoes (120Hz–350Hz)
      const echoDelay = now + 0.18;
      const echoBuffer = this.createBrownNoiseBuffer();
      const echoSource = this.ctx.createBufferSource();
      echoSource.buffer = echoBuffer;

      const echoFilter = this.ctx.createBiquadFilter();
      echoFilter.type = 'bandpass';
      echoFilter.frequency.setValueAtTime(240, echoDelay);
      echoFilter.Q.setValueAtTime(2.0, echoDelay);

      const echoGain = this.ctx.createGain();
      echoGain.gain.setValueAtTime(0.0001, echoDelay);
      echoGain.gain.exponentialRampToValueAtTime(0.65, echoDelay + 0.12);
      echoGain.gain.exponentialRampToValueAtTime(0.35, echoDelay + 1.2);
      echoGain.gain.exponentialRampToValueAtTime(0.0001, echoDelay + 3.2);

      echoSource.connect(echoFilter);
      echoFilter.connect(echoGain);
      echoGain.connect(this.thunderChannelGain);

      echoSource.start(echoDelay);
      echoSource.stop(echoDelay + 3.4);

      // STAGE 3: Deep Sub-Bass Rumble (45Hz–90Hz lowpass + 50Hz sub-oscillator)
      const rumbleDelay = now + 0.12;
      const rumbleBuffer = this.createBrownNoiseBuffer();
      const rumbleSource = this.ctx.createBufferSource();
      rumbleSource.buffer = rumbleBuffer;

      const rumbleFilter = this.ctx.createBiquadFilter();
      rumbleFilter.type = 'lowpass';
      rumbleFilter.frequency.setValueAtTime(80, rumbleDelay);
      rumbleFilter.Q.setValueAtTime(2.5, rumbleDelay);

      const rumbleGain = this.ctx.createGain();
      const rumbleDuration = 4.2;
      rumbleGain.gain.setValueAtTime(0.0001, rumbleDelay);
      rumbleGain.gain.exponentialRampToValueAtTime(0.7, rumbleDelay + 0.35);
      rumbleGain.gain.exponentialRampToValueAtTime(0.45, rumbleDelay + 1.8);
      rumbleGain.gain.exponentialRampToValueAtTime(0.0001, rumbleDelay + rumbleDuration);

      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(54, rumbleDelay);
      subOsc.frequency.exponentialRampToValueAtTime(34, rumbleDelay + rumbleDuration);

      subGain.gain.setValueAtTime(0.0001, rumbleDelay);
      subGain.gain.exponentialRampToValueAtTime(0.45, rumbleDelay + 0.3);
      subGain.gain.exponentialRampToValueAtTime(0.0001, rumbleDelay + rumbleDuration);

      rumbleSource.connect(rumbleFilter);
      rumbleFilter.connect(rumbleGain);
      rumbleGain.connect(this.thunderChannelGain);

      subOsc.connect(subGain);
      subGain.connect(this.thunderChannelGain);

      rumbleSource.start(rumbleDelay);
      rumbleSource.stop(rumbleDelay + rumbleDuration);
      subOsc.start(rumbleDelay);
      subOsc.stop(rumbleDelay + rumbleDuration);
    }, soundDelay * 1000);
  }

  private scheduleNextThunder() {
    if (!this.thunderActive) return;
    const nextInterval = (Math.random() * 8 + 9) * 1000;
    this.thunderTimeout = setTimeout(() => {
      if (this.thunderActive) {
        this.playMultiStageThunder();
        this.scheduleNextThunder();
      }
    }, nextInterval);
  }

  private startThunder() {
    this.initContext();
    if (this.thunderActive) return;
    this.thunderActive = true;
    if (this.thunderChannelGain && this.ctx) {
      this.thunderChannelGain.gain.setTargetAtTime(this.channelVolumes.thunder * 0.85, this.ctx.currentTime, 0.1);
    }
    setTimeout(() => {
      if (this.thunderActive) {
        this.playMultiStageThunder();
        this.scheduleNextThunder();
      }
    }, 800);
  }

  private stopThunder() {
    this.thunderActive = false;
    if (this.thunderTimeout) {
      clearTimeout(this.thunderTimeout);
      this.thunderTimeout = null;
    }
    if (this.thunderChannelGain && this.ctx) {
      this.thunderChannelGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.2);
    }
  }

  // 5. BIRDS CHANNEL
  private playBirdChirp() {
    if (!this.ctx || !this.birdsChannelGain || !this.birdsActive) return;

    const now = this.ctx.currentTime;
    const chirpCount = Math.floor(Math.random() * 3) + 2;

    for (let i = 0; i < chirpCount; i++) {
      const noteStart = now + i * 0.15 + Math.random() * 0.03;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      const baseFreq = 2900 + Math.random() * 400;
      osc.frequency.setValueAtTime(baseFreq, noteStart);
      osc.frequency.exponentialRampToValueAtTime(baseFreq + 1300, noteStart + 0.04);
      osc.frequency.exponentialRampToValueAtTime(baseFreq + 250, noteStart + 0.11);

      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.14, noteStart + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.12);

      osc.connect(gain);
      gain.connect(this.birdsChannelGain);

      osc.start(noteStart);
      osc.stop(noteStart + 0.13);
    }
  }

  private scheduleNextBird() {
    if (!this.birdsActive) return;
    const nextInterval = (Math.random() * 5 + 4) * 1000;
    this.birdsTimeout = setTimeout(() => {
      if (this.birdsActive) {
        this.playBirdChirp();
        this.scheduleNextBird();
      }
    }, nextInterval);
  }

  private startBirds() {
    this.initContext();
    if (this.birdsActive) return;
    this.birdsActive = true;
    if (this.birdsChannelGain && this.ctx) {
      this.birdsChannelGain.gain.setTargetAtTime(this.channelVolumes.birds * 0.35, this.ctx.currentTime, 0.1);
    }
    setTimeout(() => {
      if (this.birdsActive) {
        this.playBirdChirp();
        this.scheduleNextBird();
      }
    }, 1200);
  }

  private stopBirds() {
    this.birdsActive = false;
    if (this.birdsTimeout) {
      clearTimeout(this.birdsTimeout);
      this.birdsTimeout = null;
    }
    if (this.birdsChannelGain && this.ctx) {
      this.birdsChannelGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.2);
    }
  }

  // SYNC ALL 5 CHANNELS & VOLUMES
  public syncChannels(channels: SoundChannels, volumes: SoundVolumes) {
    this.initContext();
    this.channelVolumes = { ...volumes };

    // Rain
    if (channels.rain && !this.activeChannels.rain) {
      this.startRain();
    } else if (!channels.rain && this.activeChannels.rain) {
      this.stopRain();
    } else if (channels.rain && this.rainChannelGain && this.ctx) {
      this.rainChannelGain.gain.setTargetAtTime(volumes.rain * 0.5, this.ctx.currentTime, 0.05);
    }

    // Trees
    if (channels.trees && !this.activeChannels.trees) {
      this.startTrees();
    } else if (!channels.trees && this.activeChannels.trees) {
      this.stopTrees();
    } else if (channels.trees && this.treesChannelGain && this.ctx) {
      this.treesChannelGain.gain.setTargetAtTime(volumes.trees * 0.45, this.ctx.currentTime, 0.05);
    }

    // Waves
    if (channels.waves && !this.activeChannels.waves) {
      this.startWaves();
    } else if (!channels.waves && this.activeChannels.waves) {
      this.stopWaves();
    } else if (channels.waves && this.wavesChannelGain && this.ctx) {
      this.wavesChannelGain.gain.setTargetAtTime(volumes.waves * 0.55, this.ctx.currentTime, 0.05);
    }

    // Thunder
    if (channels.thunder && !this.activeChannels.thunder) {
      this.startThunder();
    } else if (!channels.thunder && this.activeChannels.thunder) {
      this.stopThunder();
    } else if (channels.thunder && this.thunderChannelGain && this.ctx) {
      this.thunderChannelGain.gain.setTargetAtTime(volumes.thunder * 0.85, this.ctx.currentTime, 0.05);
    }

    // Birds
    if (channels.birds && !this.activeChannels.birds) {
      this.startBirds();
    } else if (!channels.birds && this.activeChannels.birds) {
      this.stopBirds();
    } else if (channels.birds && this.birdsChannelGain && this.ctx) {
      this.birdsChannelGain.gain.setTargetAtTime(volumes.birds * 0.35, this.ctx.currentTime, 0.05);
    }

    this.activeChannels = { ...channels };
  }

  // Pomodoro Completion Chime (528Hz Solfeggio Harmonics)
  public playCompletionChime() {
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const freqs = [528, 1056, 1584, 2112];
    const gains = [0.22, 0.12, 0.06, 0.02];

    freqs.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(gains[idx], now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 3.3);
    });
  }
}

export const audioService = new AudioService();
