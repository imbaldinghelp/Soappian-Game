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
function cameraTarget() {
  const s = game.soap;
  const x = s.x + s.w / 2 - VIEW_WORLD_W / 2;
  const y = s.y + s.h / 2 - VIEW_WORLD_H * 0.62;
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
  if (game.state === 'won') { if (inButton(p, WIN_BTN)) { playSound('click'); startGame(); } return; }
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

function endAim(fire) {
  if (!input.aiming) return;
  input.aiming = false;
  if (!fire || game.state !== 'play') return;
  const dir = aimDirection(input);
  if (!dir) return;                                                  // too short a drag cancels the shot
  if (game.soap.canAim) launch(game, dir.x, dir.y);
  else input.queued = { x: dir.x, y: dir.y, p: game.meter.p, t: SHOT_BUFFER };   // fires on touchdown
}

// A shot let go in the air fires the moment the soap touches a surface, if that is soon enough.
function updateQueuedShot(dt) {
  const q = input.queued;
  if (!q) return;
  if (game.soap.canAim) { game.meter.p = q.p; launch(game, q.x, q.y); input.queued = null; }
  else if ((q.t -= dt) <= 0) input.queued = null;
}
canvas.addEventListener('pointerup', function (e) { const p = pointerPos(e); input.x = p.x; input.y = p.y; endAim(true); });
canvas.addEventListener('pointercancel', function () { endAim(false); });
window.addEventListener('blur', function () { input.aiming = false; });
canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

window.addEventListener('keydown', function (e) {
  const k = e.key.toLowerCase();
  unlockAudio();
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
      if (d.speed < LAND_ABSORB) continue;
      playSound('land', k, d.surface);
      fxBurst(d.surface === 'wet' || d.surface === 'mirror' ? 'drop' : 'dust', d.x, d.y, 3 + Math.round(k * 8),
        d.surface === 'wet' || d.surface === 'mirror' ? PAL.sky : PAL.silver);
      if (k > 0.7) fxShake(0.12);
    } else if (ev.type === 'checkpoint') {
      playSound('checkpoint');
      const fy = LEVEL.zones[d.zone].bottom - FLOOR_T;
      for (let x = game.cam.x; x < game.cam.x + VIEW_WORLD_W; x += 120) fxBurst('spark', x + 60, fy, 2, PAL.yellow);
    } else if (ev.type === 'fall') {
      playSound('fall');
      fxBurst('dust', game.soap.x + game.soap.w / 2, game.soap.y + game.soap.h, 10, PAL.brown);
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
    return;
  }
  if (game.tauntT > 0) game.tauntT -= dt;
  if (game.checkpointT > 0) game.checkpointT -= dt;

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
  if (game.state === 'winning') {
    game.winT += dt;
    if (game.winT > 2.4) { game.state = 'won'; input.aiming = false; }   // after the pump has gone down the chute
  }
  handleEvents();
  fxUpdate(game, dt);
  setWind(FX.wind);

  const t = cameraTarget();
  const k = 1 - Math.exp(-6 * dt);                                   // smooth follow
  game.cam.x += (t.x - game.cam.x) * k;
  game.cam.y += (t.y - game.cam.y) * k;
}

let last = performance.now(), acc = 0;
function frame(nowMs) {
  acc += Math.min(0.1, (nowMs - last) / 1000);
  last = nowMs;
  while (acc >= DT) { update(DT); acc -= DT; }
  drawFrame(game, input, flags);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
