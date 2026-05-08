// Procedural Web Audio layer for Forest Guardian.
// CC0-equivalent: synthesized in-browser, zero downloads, no external files.
// Honors per-user mixer (music %, sfx %, muted) loaded from preferences.

export type SfxName =
  | "plant" | "water" | "harvest" | "harvest_ancient"
  | "threat" | "defend" | "levelup" | "ui";

export type AmbientName = "sunny" | "rain" | "storm" | "snow";

interface MixerState {
  music: number; // 0..1
  sfx: number;   // 0..1
  muted: boolean;
}

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let sfxGain: GainNode | null = null;
let mixer: MixerState = { music: 0.6, sfx: 0.8, muted: false };
let currentAmbient: { name: AmbientName; nodes: AudioNode[] } | null = null;
let initialized = false;

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = mixer.muted ? 0 : 1;
    masterGain.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = mixer.music;
    musicGain.connect(masterGain);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = mixer.sfx;
    sfxGain.connect(masterGain);
    initialized = true;
  } catch {
    return null;
  }
  return ctx;
}

// Browser autoplay: we must resume on user gesture.
export function unlockAudio() {
  const c = ensureCtx();
  if (c && c.state === "suspended") void c.resume();
}

export function setMixer(next: Partial<MixerState>) {
  mixer = { ...mixer, ...next };
  if (!initialized) return;
  if (masterGain) masterGain.gain.value = mixer.muted ? 0 : 1;
  if (musicGain) musicGain.gain.value = mixer.music;
  if (sfxGain) sfxGain.gain.value = mixer.sfx;
}

// ---------- SFX ----------
function tone(opts: {
  freq: number; dur: number; type?: OscillatorType;
  attack?: number; decay?: number; volume?: number; slideTo?: number;
}) {
  const c = ensureCtx();
  if (!c || !sfxGain) return;
  const now = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(opts.freq, now);
  if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slideTo), now + opts.dur);
  const vol = opts.volume ?? 0.25;
  const a = opts.attack ?? 0.01;
  const d = opts.decay ?? opts.dur;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(vol, now + a);
  g.gain.exponentialRampToValueAtTime(0.0001, now + a + d);
  osc.connect(g); g.connect(sfxGain);
  osc.start(now);
  osc.stop(now + opts.dur + 0.05);
}

function noiseBurst(opts: { dur: number; volume?: number; filter?: number }) {
  const c = ensureCtx();
  if (!c || !sfxGain) return;
  const now = c.currentTime;
  const buffer = c.createBuffer(1, Math.floor(c.sampleRate * opts.dur), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const g = c.createGain();
  g.gain.value = opts.volume ?? 0.15;
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = opts.filter ?? 1200;
  src.connect(filter); filter.connect(g); g.connect(sfxGain);
  src.start(now);
}

export function playSfx(name: SfxName) {
  if (mixer.muted) return;
  const c = ensureCtx();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  switch (name) {
    case "plant":
      tone({ freq: 220, slideTo: 440, dur: 0.18, type: "sine", volume: 0.18 });
      noiseBurst({ dur: 0.12, volume: 0.06, filter: 800 });
      break;
    case "water":
      noiseBurst({ dur: 0.35, volume: 0.12, filter: 2400 });
      tone({ freq: 600, slideTo: 300, dur: 0.25, type: "sine", volume: 0.08 });
      break;
    case "harvest":
      tone({ freq: 523, dur: 0.12, type: "triangle", volume: 0.18 });
      setTimeout(() => tone({ freq: 784, dur: 0.18, type: "triangle", volume: 0.18 }), 90);
      break;
    case "harvest_ancient":
      tone({ freq: 392, dur: 0.18, type: "triangle", volume: 0.20 });
      setTimeout(() => tone({ freq: 523, dur: 0.18, type: "triangle", volume: 0.20 }), 120);
      setTimeout(() => tone({ freq: 784, dur: 0.30, type: "sine", volume: 0.22 }), 240);
      break;
    case "threat":
      tone({ freq: 220, slideTo: 110, dur: 0.35, type: "sawtooth", volume: 0.14 });
      break;
    case "defend":
      noiseBurst({ dur: 0.18, volume: 0.10, filter: 3200 });
      tone({ freq: 880, slideTo: 1400, dur: 0.15, type: "square", volume: 0.10 });
      break;
    case "levelup":
      [523, 659, 784, 1047].forEach((f, i) =>
        setTimeout(() => tone({ freq: f, dur: 0.22, type: "triangle", volume: 0.20 }), i * 110));
      break;
    case "ui":
      tone({ freq: 660, dur: 0.06, type: "sine", volume: 0.10 });
      break;
  }
}

// ---------- Ambient ----------
function buildAmbient(name: AmbientName): AudioNode[] {
  const c = ensureCtx();
  if (!c || !musicGain) return [];
  const nodes: AudioNode[] = [];
  const env = c.createGain();
  env.gain.value = 0;
  env.connect(musicGain);
  nodes.push(env);

  if (name === "sunny") {
    // Warm pad + soft chirp
    [196, 261.63, 329.63].forEach((f) => {
      const o = c.createOscillator();
      o.type = "sine"; o.frequency.value = f;
      const g = c.createGain(); g.gain.value = 0.08;
      o.connect(g); g.connect(env); o.start();
      nodes.push(o, g);
    });
    // gentle chirp via LFO modulating a high tone
    const chirp = c.createOscillator(); chirp.type = "sine"; chirp.frequency.value = 1800;
    const chirpGain = c.createGain(); chirpGain.gain.value = 0;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.3; lfo.type = "sine";
    const lfoGain = c.createGain(); lfoGain.gain.value = 0.04;
    lfo.connect(lfoGain); lfoGain.connect(chirpGain.gain);
    chirp.connect(chirpGain); chirpGain.connect(env);
    chirp.start(); lfo.start();
    nodes.push(chirp, chirpGain, lfo, lfoGain);
  } else if (name === "rain") {
    const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
    const filt = c.createBiquadFilter(); filt.type = "lowpass"; filt.frequency.value = 1800;
    const g = c.createGain(); g.gain.value = 0.5;
    src.connect(filt); filt.connect(g); g.connect(env);
    src.start();
    nodes.push(src, filt, g);
  } else if (name === "storm") {
    const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
    const filt = c.createBiquadFilter(); filt.type = "lowpass"; filt.frequency.value = 900;
    const g = c.createGain(); g.gain.value = 0.7;
    src.connect(filt); filt.connect(g); g.connect(env);
    src.start();
    // periodic rumble
    const rumble = c.createOscillator(); rumble.type = "sine"; rumble.frequency.value = 55;
    const rg = c.createGain(); rg.gain.value = 0.18;
    rumble.connect(rg); rg.connect(env); rumble.start();
    nodes.push(src, filt, g, rumble, rg);
  } else if (name === "snow") {
    // Soft hush + low drone
    const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.6;
    const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
    const filt = c.createBiquadFilter(); filt.type = "lowpass"; filt.frequency.value = 600;
    const g = c.createGain(); g.gain.value = 0.25;
    src.connect(filt); filt.connect(g); g.connect(env);
    src.start();
    const drone = c.createOscillator(); drone.type = "sine"; drone.frequency.value = 110;
    const dg = c.createGain(); dg.gain.value = 0.06;
    drone.connect(dg); dg.connect(env); drone.start();
    nodes.push(src, filt, g, drone, dg);
  }

  // fade in
  const now = c.currentTime;
  env.gain.setValueAtTime(0.0001, now);
  env.gain.exponentialRampToValueAtTime(1, now + 2);
  return [env, ...nodes];
}

function teardownAmbient(nodes: AudioNode[]) {
  const c = ctx;
  if (!c) { nodes.forEach((n) => { try { n.disconnect(); } catch { /* ignore */ } }); return; }
  const env = nodes[0] as GainNode | undefined;
  const now = c.currentTime;
  if (env) {
    try {
      env.gain.cancelScheduledValues(now);
      env.gain.setValueAtTime(env.gain.value, now);
      env.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
    } catch { /* ignore */ }
  }
  setTimeout(() => {
    nodes.forEach((n) => {
      try {
        const src = n as AudioBufferSourceNode & { stop?: () => void };
        if (typeof src.stop === "function") src.stop();
      } catch { /* ignore */ }
      try { n.disconnect(); } catch { /* ignore */ }
    });
  }, 1700);
}

export function setAmbient(name: AmbientName | null) {
  if (mixer.muted && name) {
    // still init so when unmuted we have state; but skip building heavy nodes
  }
  ensureCtx();
  if (currentAmbient && currentAmbient.name === name) return;
  if (currentAmbient) {
    teardownAmbient(currentAmbient.nodes);
    currentAmbient = null;
  }
  if (!name) return;
  const nodes = buildAmbient(name);
  if (nodes.length) currentAmbient = { name, nodes };
}

export function isAudioInitialized() {
  return initialized;
}