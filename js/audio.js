// audio.js - sound effects. The team's recordings in assets/ (SOUND_FILES in config.js) play when
// USE_SOUND_FILES is on; any sound without a file falls back to a synthesised placeholder (Web Audio).
// Two sounds loop and follow the action: 'wind' (free fall) and 'slide' (sliding on wet).
// Browsers only allow sound after the first click or tap, so main.js calls unlockAudio() from the first press.

const AUDIO = { ctx: null, master: null, noise: null, wind: null, windLevel: 0, loops: {}, files: {}, muted: false };

try { AUDIO.muted = localStorage.getItem('soappian-muted') === '1'; } catch (e) { /* storage blocked: start unmuted */ }

function unlockAudio() {
  if (!AUDIO.ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    AUDIO.ctx = new AC();
    AUDIO.master = AUDIO.ctx.createGain();
    AUDIO.master.gain.value = AUDIO.muted ? 0 : SOUND_VOLUME;
    AUDIO.master.connect(AUDIO.ctx.destination);
    const n = AUDIO.ctx.createBuffer(1, AUDIO.ctx.sampleRate, AUDIO.ctx.sampleRate);   // 1 s of white noise
    const d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    AUDIO.noise = n;
    if (USE_SOUND_FILES) loadSoundFiles();
  }
  if (AUDIO.ctx.state === 'suspended') AUDIO.ctx.resume();
}

function loadSoundFiles() {
  Object.keys(SOUND_FILES).forEach(function (name) {
    fetch(encodeURI(SOUND_FILES[name]))                 // file names may have spaces
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(function (b) { return AUDIO.ctx.decodeAudioData(b); })
      .then(function (buf) { buf.trim = soundBounds(buf); AUDIO.files[name] = buf; })
      .catch(function () { /* missing file: keep the synth sound */ });
  });
}

// Where the sound in a recording starts and ends (skips silence), so loops repeat without a gap.
function soundBounds(buf) {
  const d = buf.getChannelData(0);
  let first = 0, last = d.length - 1;
  while (first < last && Math.abs(d[first]) < 0.02) first++;
  while (last > first && Math.abs(d[last]) < 0.02) last--;
  return { start: first / buf.sampleRate, end: (last + 1) / buf.sampleRate };
}

function isMuted() { return AUDIO.muted; }
function toggleMute() {
  AUDIO.muted = !AUDIO.muted;
  if (AUDIO.master) AUDIO.master.gain.value = AUDIO.muted ? 0 : SOUND_VOLUME;
  try { localStorage.setItem('soappian-muted', AUDIO.muted ? '1' : '0'); } catch (e) { /* not saved, fine */ }
}

// ---------- synth building blocks (times in seconds from now) ----------
function envGain(t0, peak, attack, decay) {
  const g = AUDIO.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  g.connect(AUDIO.master);
  return g;
}
// A pitch sweep from f0 to f1 Hz.
function tone(type, f0, f1, dur, vol, delay) {
  const t0 = AUDIO.ctx.currentTime + (delay || 0);
  const o = AUDIO.ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t0);
  o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  o.connect(envGain(t0, vol, 0.005, dur));
  o.start(t0); o.stop(t0 + dur + 0.05);
}
// Filtered noise: a squish, splash, thud or scrape depending on the filter.
function hiss(filter, freq, q, dur, vol, delay, freqEnd) {
  const t0 = AUDIO.ctx.currentTime + (delay || 0);
  const src = AUDIO.ctx.createBufferSource();
  src.buffer = AUDIO.noise;
  const f = AUDIO.ctx.createBiquadFilter();
  f.type = filter; f.Q.value = q;
  f.frequency.setValueAtTime(freq, t0);
  if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
  src.connect(f);
  f.connect(envGain(t0, vol, 0.005, dur));
  src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.05);
}

// ---------- the sounds ----------
// strength is 0 to 1 (launch power, landing speed). surface is the surface landed on.
const SYNTH = {
  jump: function (p) {                                   // soapy "bloop": a squeeze, then a rising bubble
    hiss('bandpass', 900 + 900 * p, 2, 0.07, 0.25 + 0.2 * p);
    tone('sine', 160 + 140 * p, 520 + 700 * p, 0.13, 0.35 + 0.25 * p);
    tone('triangle', 700 + 600 * p, 1500 + 900 * p, 0.05, 0.12, 0.09);
  },
  land: function (p, surface) {
    const v = 0.08 + 0.35 * p;
    if (surface === 'towel' || surface === 'paper') { hiss('lowpass', 500, 1, 0.08, v * 0.8); return; }
    tone('sine', 150, 60, 0.08, v);
    if (surface === 'wet' || surface === 'mirror') hiss('bandpass', 2400, 1.5, 0.14, v * 0.8);   // splish
    else if (surface === 'metal') tone('square', 1900, 1700, 0.05, v * 0.25);                      // tink
    else hiss('lowpass', 1200, 1, 0.05, v * 0.6);
  },
  flop: function () {                                    // a wet bar of soap hitting the floor flat
    tone('sine', 130, 45, 0.18, 0.6);
    hiss('lowpass', 900, 1, 0.12, 0.55);
    hiss('bandpass', 1600, 2, 0.08, 0.3, 0.02, 500);   // the slap
    tone('triangle', 330, 220, 0.25, 0.08, 0.2);       // a little groan
  },
  win: function () {
    [523, 659, 784, 1047, 784, 1047].forEach(function (f, i) { tone('square', f, f, 0.12, 0.1, i * 0.1); });
    tone('triangle', 1047, 1047, 0.6, 0.15, 0.6);
  },
  click: function () { tone('square', 880, 1320, 0.04, 0.1); },
  push: function () { hiss('bandpass', 400, 1, 0.9, 0.18, 0, 1400); },
  whistle: function () { tone('sine', 1500, 260, 1.6, 0.12); },
  bounce: function (p) {                                 // rubbery boing off a bumper
    tone('sine', 220 + 120 * p, 620 + 300 * p, 0.12, 0.25 + 0.2 * p);
    tone('triangle', 900, 500, 0.08, 0.1 * p, 0.02);
    hiss('bandpass', 1800, 2, 0.04, 0.15 + 0.15 * p);
  },
  bonk: function (p) {                                   // hollow plastic bottle bonk
    tone('square', 260 + 80 * Math.random(), 140, 0.09, 0.08 + 0.14 * p);
    hiss('lowpass', 700, 1, 0.06, 0.2 + 0.2 * p);
  },
  clang: function () {
    [330, 513, 789, 1121].forEach(function (f) { tone('triangle', f, f * 0.98, 0.7, 0.12); });
    hiss('lowpass', 900, 1, 0.12, 0.4);
  },
};

// A recording that loops while something lasts; its volume follows level (0 to 1). Called every frame,
// but only touches the sound when the level has really changed. Does nothing until the file has loaded.
function setLoop(name, level) {
  const buf = AUDIO.files[name];
  if (!AUDIO.ctx || !buf) return;
  if (level < 0.01) level = 0;
  let lp = AUDIO.loops[name];
  if (!lp) {
    if (level === 0) return;
    const src = AUDIO.ctx.createBufferSource();
    src.buffer = buf; src.loop = true; src.loopStart = buf.trim.start; src.loopEnd = buf.trim.end;
    const g = AUDIO.ctx.createGain();
    g.gain.value = 0;
    src.connect(g); g.connect(AUDIO.master);
    src.start(0, buf.trim.start);
    lp = AUDIO.loops[name] = { gain: g, level: 0 };
  }
  if (Math.abs(level - lp.level) < 0.01 && (level > 0 || lp.level === 0)) return;
  lp.level = level;
  lp.gain.gain.setTargetAtTime((LOOP_VOLUME[name] || 1) * level, AUDIO.ctx.currentTime, 0.06);
}

// Sliding on wet: level 0 (still) to 1 (fast).
function setSlide(level) { setLoop('slide', level); }

// Free-fall wind, level 0 to 1. The 'wind' recording if there is one, else one looping filtered noise
// whose pitch and volume follow the level. Called every frame.
function setWind(level) {
  if (!AUDIO.ctx) return;
  if (AUDIO.files.wind) { setLoop('wind', level); level = 0; }        // the recording takes over
  if (level < 0.01) level = 0;
  if (Math.abs(level - AUDIO.windLevel) < 0.01 && (level > 0 || AUDIO.windLevel === 0)) return;
  AUDIO.windLevel = level;
  if (!AUDIO.wind) {
    const src = AUDIO.ctx.createBufferSource();
    src.buffer = AUDIO.noise; src.loop = true;
    const band = AUDIO.ctx.createBiquadFilter();
    band.type = 'bandpass'; band.Q.value = 0.8; band.frequency.value = 300;
    const g = AUDIO.ctx.createGain();
    g.gain.value = 0;
    src.connect(band); band.connect(g); g.connect(AUDIO.master);
    src.start();
    AUDIO.wind = { band: band, gain: g };
  }
  const t = AUDIO.ctx.currentTime;
  AUDIO.wind.gain.gain.setTargetAtTime(WIND_VOLUME * level * level, t, 0.05);
  AUDIO.wind.band.frequency.setTargetAtTime(250 + 1100 * level, t, 0.05);
}

function playSound(name, strength, surface) {
  if (!AUDIO.ctx || AUDIO.muted) return;
  const buf = AUDIO.files[name];
  if (buf) {
    const src = AUDIO.ctx.createBufferSource();
    src.buffer = buf;
    if (name === 'jump') src.playbackRate.value = 0.85 + 0.4 * (strength || 0);   // higher pitch for harder shots
    if (name === 'flop') src.playbackRate.value = 0.75;                            // the landing sound, but heavier
    const g = AUDIO.ctx.createGain();
    g.gain.value = name === 'land' || name === 'bounce' || name === 'bonk' ? 0.25 + 0.75 * (strength || 0) : 1;
    src.connect(g); g.connect(AUDIO.master);
    src.start();
    return;
  }
  if (SYNTH[name]) SYNTH[name](strength || 0, surface);
}
