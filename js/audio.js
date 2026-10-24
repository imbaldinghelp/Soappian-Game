// audio.js - sound effects. Placeholder sounds are synthesised with the Web Audio API, so the game
// needs no sound files. Set USE_SOUND_FILES in config.js to play human-made recordings from assets/
// instead (any file that is missing keeps its synth sound). Browsers only allow sound after the
// first click or tap, so main.js calls unlockAudio() from the first press.

const AUDIO = { ctx: null, master: null, noise: null, wind: null, windLevel: 0, files: {}, muted: false };

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
    fetch(SOUND_FILES[name])
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(function (b) { return AUDIO.ctx.decodeAudioData(b); })
      .then(function (buf) { AUDIO.files[name] = buf; })
      .catch(function () { /* missing file: keep the synth sound */ });
  });
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
  checkpoint: function () {                              // bubbly arpeggio
    [523, 659, 784, 1047].forEach(function (f, i) { tone('square', f, f, 0.09, 0.09, i * 0.07); });
    tone('triangle', 1047, 2093, 0.25, 0.12, 0.28);
  },
  fall: function () {                                    // sad trombone, short
    tone('triangle', 392, 370, 0.18, 0.18);
    tone('triangle', 349, 330, 0.18, 0.18, 0.2);
    tone('triangle', 311, 220, 0.4, 0.18, 0.4);
  },
  win: function () {
    [523, 659, 784, 1047, 784, 1047].forEach(function (f, i) { tone('square', f, f, 0.12, 0.1, i * 0.1); });
    tone('triangle', 1047, 1047, 0.6, 0.15, 0.6);
  },
  click: function () { tone('square', 880, 1320, 0.04, 0.1); },
  push: function () { hiss('bandpass', 400, 1, 0.9, 0.18, 0, 1400); },
  whistle: function () { tone('sine', 1500, 260, 1.6, 0.12); },
  clang: function () {
    [330, 513, 789, 1121].forEach(function (f) { tone('triangle', f, f * 0.98, 0.7, 0.12); });
    hiss('lowpass', 900, 1, 0.12, 0.4);
  },
};

// Free-fall wind: one looping noise, its pitch and volume follow level (0 to 1). Called every frame, but
// only reschedules the sound when the level has really changed.
function setWind(level) {
  if (!AUDIO.ctx) return;
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
    const g = AUDIO.ctx.createGain();
    g.gain.value = name === 'land' ? 0.3 + 0.7 * (strength || 0) : 1;
    src.connect(g); g.connect(AUDIO.master);
    src.start();
    return;
  }
  if (SYNTH[name]) SYNTH[name](strength || 0, surface);
}
