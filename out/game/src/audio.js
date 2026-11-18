import { RADIO_STATIONS } from './config.js';

export function createAudio() {
  let ctx = null;
  let masterGain = null;
  let muted = false;
  let currentStation = 0;
  let melodyTimer = null;
  let engineOsc = null;
  let engineGain = null;
  let started = false;

  function start() {
    if (started) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      ctx = new AudioCtx();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.15;
      masterGain.connect(ctx.destination);

      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 60;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineGain);
      engineGain.connect(masterGain);
      engineOsc.start();

      started = true;
      startStationMelody(currentStation);
    } catch (e) {
      console.warn('Audio start failed', e);
    }
  }

  function startStationMelody(stationIndex) {
    if (!started || !ctx) return;
    stopStationMelody();
    const station = RADIO_STATIONS[stationIndex] || RADIO_STATIONS[0];
    const scale = station.scale;
    const tempo = station.tempo || 100;
    const intervalMs = (60 / tempo) * 500;

    let noteIndex = 0;
    melodyTimer = setInterval(() => {
      if (!started || !ctx || ctx.state !== 'running') return;
      try {
        const semitone = scale[noteIndex % scale.length];
        noteIndex++;
        const freq = 220 * Math.pow(2, (semitone + (Math.random() > 0.8 ? 12 : 0)) / 12);

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = station.wave || 'sawtooth';
        osc.frequency.value = freq;

        const now = ctx.currentTime;
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.35);
      } catch (e) {}
    }, intervalMs);
  }

  function stopStationMelody() {
    if (melodyTimer) {
      clearInterval(melodyTimer);
      melodyTimer = null;
    }
  }

  function setStation(i) {
    currentStation = ((i % RADIO_STATIONS.length) + RADIO_STATIONS.length) % RADIO_STATIONS.length;
    if (started) {
      startStationMelody(currentStation);
    }
  }

  function sfx(name) {
    if (!started || !ctx || ctx.state !== 'running') return;
    try {
      const now = ctx.currentTime;
      if (name === 'crash') {
        const bufferSize = ctx.sampleRate * 0.3;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, now);
        filter.frequency.linearRampToValueAtTime(80, now + 0.3);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        noise.start(now);
      } else if (name === 'siren') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.linearRampToValueAtTime(900, now + 0.25);
        osc.frequency.linearRampToValueAtTime(600, now + 0.5);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.5);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.5);
      } else if (name === 'gunshot') {
        const bufferSize = ctx.sampleRate * 0.15;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.03));
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        noise.connect(gain);
        gain.connect(masterGain);
        noise.start(now);
      } else if (name === 'pickup') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.1);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (name === 'mission') {
        [440, 554.37, 659.25].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.value = freq;
          const t = now + idx * 0.12;
          gain.gain.setValueAtTime(0.2, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(t);
          osc.stop(t + 0.22);
        });
      }
    } catch (e) {}
  }

  function setEngine(frac) {
    if (!started || !engineOsc || !engineGain) return;
    try {
      const freq = 60 + frac * 160;
      engineOsc.frequency.setTargetAtTime(freq, ctx.currentTime, 0.1);
      engineGain.gain.setTargetAtTime(frac > 0 ? 0.12 : 0, ctx.currentTime, 0.1);
    } catch (e) {}
  }

  function setMuted(m) {
    muted = m;
    if (masterGain && ctx) {
      masterGain.gain.setTargetAtTime(muted ? 0 : 0.15, ctx.currentTime, 0.05);
    }
  }

  return {
    start,
    setStation,
    sfx,
    setEngine,
    setMuted
  };
}
