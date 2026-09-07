export class AudioManager {
  constructor() {
    this.ctx = null;
    this.isInitialized = false;

    // Volume settings (0.0 to 1.0)
    this.masterVolume = 0.8;
    this.musicVolume = 0.5;
    this.engineVolume = 0.7;
    this.sfxVolume = 0.8;

    // Nodes
    this.masterGain = null;
    this.musicGain = null;
    this.engineGain = null;
    this.sfxGain = null;

    // Engine sound synth state
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineSub = null;
    this.engineFilter = null;
    this.engineDriveGain = null;

    // Tire Screech synth state
    this.screechNode = null;
    this.screechGain = null;
    this.screechFilter = null;

    // Wind synth state
    this.windGain = null;

    // Nitro synth state
    this.nitroGain = null;

    // Music Synth state
    this.musicInterval = null;
    this.musicStep = 0;
    this.isMusicPlaying = false;
  }

  init() {
    if (this.isInitialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Sub Gains
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(this.engineVolume, this.ctx.currentTime);
      this.engineGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.setupEngineSynth();
      this.setupTireScreech();
      this.setupWindSynth();
      this.setupNitroSynth();

      this.isInitialized = true;
    } catch (err) {
      console.warn('Web Audio API not supported or blocked:', err);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolumes({ master, music, engine, sfx }) {
    if (master !== undefined) {
      this.masterVolume = master;
      if (this.masterGain) this.masterGain.gain.setValueAtTime(master, this.ctx.currentTime);
    }
    if (music !== undefined) {
      this.musicVolume = music;
      if (this.musicGain) this.musicGain.gain.setValueAtTime(music, this.ctx.currentTime);
    }
    if (engine !== undefined) {
      this.engineVolume = engine;
      if (this.engineGain) this.engineGain.gain.setValueAtTime(engine, this.ctx.currentTime);
    }
    if (sfx !== undefined) {
      this.sfxVolume = sfx;
      if (this.sfxGain) this.sfxGain.gain.setValueAtTime(sfx, this.ctx.currentTime);
    }
  }

  // --- PROCEDURAL ENGINE SYNTHESIS ---
  setupEngineSynth() {
    const t = this.ctx.currentTime;

    // Filter to simulate throttle intake air
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(450, t);
    this.engineFilter.connect(this.engineGain);

    // Primary cylinder pulses (Sawtooth)
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.setValueAtTime(55, t);

    // Secondary harmonic (Triangle)
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.setValueAtTime(110, t);

    // Deep sub-bass exhaust thrum (Sine)
    this.engineSub = this.ctx.createOscillator();
    this.engineSub.type = 'sine';
    this.engineSub.frequency.setValueAtTime(27.5, t);

    this.engineDriveGain = this.ctx.createGain();
    this.engineDriveGain.gain.setValueAtTime(0.3, t);

    this.engineOsc1.connect(this.engineDriveGain);
    this.engineOsc2.connect(this.engineDriveGain);
    this.engineSub.connect(this.engineDriveGain);
    this.engineDriveGain.connect(this.engineFilter);

    this.engineOsc1.start();
    this.engineOsc2.start();
    this.engineSub.start();
  }

  updateEngine(rpm, throttle, speedKmh, gear) {
    if (!this.isInitialized || !this.ctx) return;
    const t = this.ctx.currentTime;

    // Base cylinder frequency: ~800 RPM = 45Hz, 8000 RPM = 450Hz
    const baseFreq = 40 + (rpm / 8500) * 420;
    this.engineOsc1.frequency.setTargetAtTime(baseFreq, t, 0.05);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.5, t, 0.05);
    this.engineSub.frequency.setTargetAtTime(baseFreq * 0.5, t, 0.05);

    // Filter cutoff opens wide under heavy throttle
    const targetCutoff = 350 + throttle * 2200 + (rpm / 8500) * 1200;
    this.engineFilter.frequency.setTargetAtTime(targetCutoff, t, 0.06);

    // Gain modulates slightly with throttle load
    const loadVol = 0.25 + throttle * 0.45 + (rpm / 8500) * 0.2;
    this.engineDriveGain.gain.setTargetAtTime(loadVol, t, 0.05);
  }

  // --- TIRE SCREECH SYNTHESIS ---
  setupTireScreech() {
    // Generate white noise buffer
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    this.screechFilter = this.ctx.createBiquadFilter();
    this.screechFilter.type = 'bandpass';
    this.screechFilter.frequency.setValueAtTime(1400, this.ctx.currentTime);
    this.screechFilter.Q.setValueAtTime(4.0, this.ctx.currentTime);

    this.screechGain = this.ctx.createGain();
    this.screechGain.gain.setValueAtTime(0, this.ctx.currentTime);

    whiteNoise.connect(this.screechFilter);
    this.screechFilter.connect(this.screechGain);
    this.screechGain.connect(this.sfxGain);

    whiteNoise.start();
  }

  updateTireScreech(slipAmount, isDrifting) {
    if (!this.isInitialized || !this.screechGain) return;
    const t = this.ctx.currentTime;
    let targetVol = 0;
    if (isDrifting || slipAmount > 4.0) {
      targetVol = Math.min(0.65, (slipAmount / 12) * 0.65);
    }
    this.screechGain.gain.setTargetAtTime(targetVol, t, 0.08);
  }

  // --- HIGH SPEED WIND SYNTHESIS ---
  setupWindSynth() {
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(280, this.ctx.currentTime);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0, this.ctx.currentTime);

    noise.connect(filter);
    filter.connect(this.windGain);
    this.windGain.connect(this.sfxGain);

    noise.start();
  }

  updateWind(speedKmh) {
    if (!this.isInitialized || !this.windGain) return;
    const t = this.ctx.currentTime;
    const windVol = speedKmh > 110 ? Math.min(0.4, (speedKmh - 110) / 220) : 0;
    this.windGain.gain.setTargetAtTime(windVol, t, 0.1);
  }

  // --- NITRO SYNTHESIS ---
  setupNitroSynth() {
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, this.ctx.currentTime);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(650, this.ctx.currentTime);

    this.nitroGain = this.ctx.createGain();
    this.nitroGain.gain.setValueAtTime(0, this.ctx.currentTime);

    osc.connect(filter);
    filter.connect(this.nitroGain);
    this.nitroGain.connect(this.sfxGain);

    osc.start();
  }

  setNitroActive(active) {
    if (!this.isInitialized || !this.nitroGain) return;
    const t = this.ctx.currentTime;
    this.nitroGain.gain.setTargetAtTime(active ? 0.45 : 0, t, 0.06);
  }

  // --- COLLISION SOUND ---
  playCollision(intensity = 0.5) {
    if (!this.isInitialized || !this.ctx) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.25);

    const vol = Math.min(0.8, intensity * 0.7);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.32);
  }

  // --- GEAR SHIFT POP ---
  playGearShift() {
    if (!this.isInitialized || !this.ctx) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.1);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.13);
  }

  // --- COUNTDOWN SOUNDS ---
  playCountdown(step) {
    if (!this.isInitialized || !this.ctx) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (step > 0) {
      // 3, 2, 1 beeps
      osc.type = 'sine';
      osc.frequency.setValueAtTime(650, t);
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    } else {
      // GO! High pitch fanfare
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, t);
      gain.gain.setValueAtTime(0.7, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    }

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + (step > 0 ? 0.28 : 0.55));
  }

  // --- FINISH CHEQUERED FLAG FANFARE ---
  playFinishFanfare() {
    if (!this.isInitialized || !this.ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t);
        osc.stop(t + 0.5);
      }, idx * 120);
    });
  }

  // --- UI SOUNDS ---
  playClick() {
    if (!this.isInitialized || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.05);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.07);
  }

  // --- PROCEDURAL SYNTHWAVE RACING MUSIC ---
  startMusic() {
    if (this.isMusicPlaying || !this.ctx) return;
    this.isMusicPlaying = true;

    // 130 BPM Synthwave Arp Bassline
    const bassline = [110, 110, 130.81, 146.83, 110, 98, 110, 164.81];
    const stepDuration = 60 / 130 / 2; // eighth notes

    this.musicInterval = setInterval(() => {
      if (!this.ctx || !this.isMusicPlaying) return;
      const t = this.ctx.currentTime;
      const noteFreq = bassline[this.musicStep % bassline.length];

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(noteFreq, t);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + stepDuration * 0.9);

      osc.connect(gain);
      gain.connect(this.musicGain);

      osc.start(t);
      osc.stop(t + stepDuration);

      this.musicStep++;
    }, stepDuration * 1000);
  }

  stopMusic() {
    this.isMusicPlaying = false;
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }
}

export const audioManager = new AudioManager();
