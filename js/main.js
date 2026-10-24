// main.js - starts the game: canvas, mouse and touch input, game loop, camera, restart.
// Also the glue between the rules and the senses: events from soap.js become sounds and effects here.

const canvas = document.getElementById('game');                    // its pixel size is set by draw.js

// Show the 320 x 180 grid SCALE times bigger (1280 x 720), or the biggest whole step that fits the window,
// so every art pixel stays the same size. Only a window smaller than the grid gets an uneven scale.
function fitCanvas() {
  const fit = Math.min(window.innerWidth / LOW_W, window.innerHeight / LOW_H);
  const k = fit >= 1 ? Math.min(SCALE, Math.floor(fit)) : fit;
  canvas.style.width = Math.floor(LOW_W * k) + 'px';
  canvas.style.height = Math.floor(LOW_H * k) + 'px';
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

let game = newGame();
// ox, oy = press start; hx, hy = hover (virtual screen px). queued = a shot let go in the air, waiting to touch down.
const input = { aiming: false, ox: 0, oy: 0, x: 0, y: 0, hx: -1, hy: -1, queued: null };
const flags = { debug: false, map: false };

// Camera: soap sits a bit low on screen so there is more room to see where it is going.
// Stays inside the level. VIEW_WORLD_W / H come from PIXEL in config.js (bigger PIXEL = further away).
// After the win it follows the flung pump soap down instead.
function cameraTarget() {
  const s = game.soap, rag = game.rag && game.rag.bottle;
  const fx = rag ? rag.x : s.x + s.w / 2, fy = rag ? rag.y : s.y + s.h / 2;
  const x = fx - VIEW_WORLD_W / 2;
  const y = fy - VIEW_WORLD_H * (rag ? 0.5 : 0.62);
  return {
    x: Math.max(0, Math.min(WORLD_W - VIEW_WORLD_W, x)),
    y: Math.max(0, Math.min(WORLD_H - VIEW_WORLD_H, y)),
  };
}

function snapCamera() {
  const t = cameraTarget();
  game.cam.x = t.x; game.cam.y = t.y;
}

function startGame() {
  game = newGame();
  game.state = 'play';
  input.aiming = false; input.queued = null;
  snapCamera();
}

function playIntro() {
  game = newGame();
  startIntro(game);
  input.aiming = false; input.queued = null;
  snapCamera();
}

function backToTitle() {
  game = newGame();
  input.aiming = false; input.queued = null;
  FX.parts.length = 0;
  snapCamera();
}

// Esc menu. Pausing drops any half-made aim, so nothing fires on resume.
function pauseGame() { game.state = 'paused'; input.aiming = false; input.queued = null; }
function resumeGame() { game.state = 'play'; }

snapCamera();
loadArt();

// ---------- input (mouse and touch use the same pointer events) ----------
function pointerPos(e) {                                             // position in virtual screen px (0 to 1280, 0 to 720)
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * VIEW_W / r.width, y: (e.clientY - r.top) * VIEW_H / r.height };
}

function inButton(p, r) { return inRect(p.x / SCALE_UP, p.y / SCALE_UP, r); }   // buttons are laid out in art pixels

function teleport(s, x, y) {
  s.x = x - s.w / 2; s.y = y - s.h;
  s.vx = 0; s.vy = 0; s.ground = null; s.restT = 0; s.still = false; s.canAim = false; s.airT = 1; s.wasAir = true;
  s.peakY = s.y; s.flopT = 0;
}

canvas.addEventListener('pointerdown', function (e) {
  e.preventDefault();
  unlockAudio();                                                     // browsers only allow sound after a press
  const p = pointerPos(e);
  input.hx = p.x; input.hy = p.y;

  if (flags.debug && e.shiftKey && game.state === 'play') {          // debug: shift+click teleports
    const k = PIXEL / SCALE_UP;
    teleport(game.soap, game.cam.x + p.x * k, game.cam.y + p.y * k + game.soap.h / 2);
    return;
  }
  if (game.state === 'title') {
    if (inButton(p, TITLE_SOUND_BTN)) { toggleMute(); playSound('click'); return; }
    if (inButton(p, START_BTN)) { playSound('click'); playIntro(); }
    return;
  }
  if (game.state === 'intro') { startGame(); return; }                // click skips the cutscene
  if (game.state === 'paused') {
    if (inButton(p, RESUME_BTN)) { playSound('click'); resumeGame(); }
    else if (inButton(p, MENU_BTN)) { playSound('click'); backToTitle(); }
    return;
  }
  if (game.state === 'won') {
    if (inButton(p, WIN_BTN)) { playSound('click'); startGame(); }
    else if (inButton(p, WIN_MENU_BTN)) { playSound('click'); backToTitle(); }
    else if (inButton(p, WIN_SAVE_BTN) && saveWinEntry(game)) playSound('click');
    return;
  }
  if (game.state !== 'play') return;
  if (inButton(p, RESTART_BTN)) { playSound('click'); startGame(); return; }
  if (inButton(p, SOUND_BTN)) { toggleMute(); playSound('click'); return; }

  // Start aiming: press anywhere, any time. Pressing mid-hop is never ignored; the shot just waits for a surface.
  canvas.setPointerCapture(e.pointerId);
  input.aiming = true; input.queued = null;
  input.ox = input.x = p.x; input.oy = input.y = p.y;
  meterStart(game.meter);
});

canvas.addEventListener('pointermove', function (e) {
  const p = pointerPos(e);
  input.hx = p.x; input.hy = p.y;
  if (!input.aiming) return;
  input.x = p.x; input.y = p.y;
});
canvas.addEventListener('pointerleave', function () { input.hx = input.hy = -1; });

// What became of the last let-go (the debug overlay shows it): fired, waiting for touchdown, or why not.
const release = { what: '-', at: 0, ms: 0 };
function noteRelease(what) { release.what = what; release.at = performance.now(); release.ms = 0; }

function endAim(fire) {
  if (!input.aiming) return;
  input.aiming = false;
  if (!fire || game.state !== 'play') return;
  const dir = aimDirection(input), s = game.soap;
  if (!dir) { noteRelease('TOO SHORT'); return; }                    // too short a drag cancels the shot
  if (s.flopT > 0) {                                                 // still dazed: no shot, and show it
    noteRelease('DAZED');
    fxBurst('dust', s.x + s.w / 2, s.y, 6, PAL.slate);
    return;
  }
  if (s.canAim) { launch(game, dir.x, dir.y); noteRelease('FIRED'); }
  else { input.queued = { x: dir.x, y: dir.y, p: game.meter.p, t: SHOT_BUFFER }; noteRelease('IN AIR'); }   // fires on touchdown
}

// A shot let go in the air fires the moment the soap touches a surface, if that is soon enough.
function updateQueuedShot(dt) {
  const q = input.queued;
  if (!q) return;
  if (game.soap.canAim) {
    game.meter.p = q.p; launch(game, q.x, q.y); input.queued = null;
    release.what = 'FIRED ON TOUCHDOWN'; release.ms = Math.round(performance.now() - release.at);
  } else if ((q.t -= dt) <= 0) { input.queued = null; release.what = 'MISSED TOUCHDOWN'; }
}
function releaseAt(e) { const p = pointerPos(e); input.x = p.x; input.y = p.y; endAim(true); }
canvas.addEventListener('pointerup', releaseAt);
canvas.addEventListener('pointercancel', function () { endAim(false); });
// Backups so a let-go is never lost: the browser can drop the pointer capture (alt-tab, leaving the window,
// some trackpads), and then the canvas never hears the release and the aim hangs until the next click.
canvas.addEventListener('lostpointercapture', function (e) { if (input.aiming) releaseAt(e); });
window.addEventListener('pointerup', function (e) { if (input.aiming) releaseAt(e); });
window.addEventListener('blur', function () { input.aiming = false; });
canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

window.addEventListener('keydown', function (e) {
  const k = e.key.toLowerCase();
  unlockAudio();
  if (game.state === 'won') { winKey(game, e.key); return; }        // typing a name for the leaderboard
  if (game.state === 'title' && (k === 'enter' || k === ' ')) { playIntro(); return; }
  if (game.state === 'intro' && (k === 'enter' || k === ' ' || k === 'escape')) { startGame(); return; }
  if (k === 'escape') {                                              // Esc opens and closes the menu
    if (game.state === 'play') pauseGame(); else if (game.state === 'paused') resumeGame();
    return;
  }
  if (k === 'r') { startGame(); }
  else if (k === 's') { toggleMute(); }
  else if (k === 'd') { flags.debug = !flags.debug; }
  else if (k === 'm') { flags.map = !flags.map; }
  else if (flags.debug && k >= '1' && k <= '5' && game.state === 'play') {   // debug: jump to a zone
    const z = LEVEL.zones[Number(k) - 1];
    teleport(game.soap, z.spawn.x, z.spawn.y - 4);
  }
});

// ---------- events from soap.js -> sounds and effects ----------
function handleEvents() {
  for (const ev of game.events) {
    const d = ev.data;
    if (ev.type === 'launch') {
      playSound('jump', d.p);
      fxBurst('bubble', d.x, d.y, 4 + Math.round(d.p * 6), PAL.white);
    } else if (ev.type === 'land') {
      const k = Math.min(1, d.speed / MAX_SPEED);
      if (d.speed < LAND_ABSORB) continue;                          // landings are silent: dust only
      fxBurst(d.surface === 'wet' || d.surface === 'mirror' ? 'drop' : 'dust', d.x, d.y, 3 + Math.round(k * 8),
        d.surface === 'wet' || d.surface === 'mirror' ? PAL.sky : PAL.silver);
      if (k > 0.7) fxShake(0.12);
    } else if (ev.type === 'bounce') {                               // ricochet off a wall, a side or a bumper
      const k = Math.min(1, d.speed / MAX_SPEED);
      playSound('bounce', k);
      fxBurst('spark', d.x, d.y, 3 + Math.round(k * 6), SURFACES.wall.cap);
      fxBurst('dust', d.x, d.y, 2 + Math.round(k * 4), PAL.white);
      fxShake(0.06 + 0.08 * k);
    } else if (ev.type === 'bonk') {                                 // the flung pump soap hits something
      const k = Math.min(1, d.speed / 2500);
      playSound('bonk', k);
      fxBurst('dust', d.x, d.y, 2 + Math.round(k * 5), PAL.silver);
    } else if (ev.type === 'flop') {                                 // landed flat after a fall
      playSound('flop');
      fxBurst('dust', d.x, d.y, 14, PAL.silver);
      fxShake(0.3);
    } else if (ev.type === 'getup') {                                // back on its feet
      playSound('jump', 0);
      fxBurst('bubble', d.x, d.y, 4, PAL.white);
    } else if (ev.type === 'win') {
      playSound('win');
      fxBurst('spark', game.pump.x + game.pump.w / 2, game.pump.y + game.pump.h / 2, 16, PAL.yellow);
      fxBurst('bubble', game.pump.x, game.pump.y + game.pump.h, 20, PAL.white);
    }
  }
  game.events.length = 0;
}

// ---------- game loop ----------
function update(dt) {
  if (game.state === 'paused') {                                     // frozen: only the wind dies down
    fxUpdate(game, dt);
    setWind(FX.wind);
    setSlide(0);
    return;
  }
  if (game.tauntT > 0) game.tauntT -= dt;

  if (game.state === 'intro') {
    if (updateIntro(game, dt)) startGame();
    else snapCamera();                                               // the camera rides the fall
  }
  if (game.state === 'play' || game.state === 'winning') {
    if (game.state === 'play') game.time += dt;
    if (input.aiming) meterUpdate(game.meter, dt);
    physicsFrame(game, dt);
    if (game.state === 'play') updateQueuedShot(dt);
  }
  if (game.state === 'winning' || game.state === 'won') updateRagdoll(game, dt);   // the pump soap tumbles on
  if (game.state === 'winning') {
    game.winT += dt;
    if (game.winT > WIN_WATCH) { game.state = 'won'; input.aiming = false; openWinScreen(game); }
  }
  handleEvents();
  fxUpdate(game, dt);
  setWind(FX.wind);
  const g = game.soap.ground;                                        // sliding on wet: follows the speed
  setSlide(game.state === 'play' && g && g.surface === 'wet' ? Math.min(1, Math.abs(game.soap.vx) / SLIDE_FULL) : 0);

  const t = cameraTarget();
  const k = 1 - Math.exp(-CAMERA_FOLLOW * dt);                       // smooth follow
  game.cam.x += (t.x - game.cam.x) * k;
  game.cam.y += (t.y - game.cam.y) * k;
}

// PERF: frames per second and the slowest frame in the last second (debug overlay), to track down stutter.
const PERF = { fps: 0, worst: 0, n: 0, slow: 0, t0: performance.now() };
let last = performance.now(), acc = 0;
function frame(nowMs) {
  const gap = nowMs - last;
  PERF.n++; PERF.slow = Math.max(PERF.slow, gap);
  if (nowMs - PERF.t0 >= 1000) { PERF.fps = PERF.n; PERF.worst = Math.round(PERF.slow); PERF.n = 0; PERF.slow = 0; PERF.t0 = nowMs; }
  acc += Math.min(0.1, gap / 1000);
  last = nowMs;
  while (acc >= DT) { update(DT); acc -= DT; }
  drawFrame(game, input, flags);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
