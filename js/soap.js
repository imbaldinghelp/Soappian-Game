// soap.js - the soap and the rules around it: movement, collisions, friction, squeeze meter,
// launch, falls and winning. No drawing and no browser code in here.
// Things the player should hear or see (a launch, a landing, a ricochet) are pushed onto
// game.events; main.js turns them into sounds and effects.

function newGame() {
  return {
    state: 'title',                  // title, intro, play, paused, winning, won
    solids: buildSolids(),
    soap: makeSoap(LEVEL.start.x, LEVEL.start.y),
    pump: { x: LEVEL.pump.x, y: LEVEL.pump.y, w: LEVEL.pump.w, h: LEVEL.pump.h },   // the intro moves it
    meter: { p: 0, dir: 1 },
    falls: 0, shots: 0, time: 0,
    maxZone: 0, lastY: LEVEL.start.y - SOAP_H,
    taunt: '', tauntT: 0, lastTaunt: -1,
    winT: 0,
    rag: null,                       // the beaten pump soap, tumbling (see knockPump)
    events: [],
    cam: { x: 0, y: 0 },
  };
}

function makeSoap(cx, bottom) {
  return { x: cx - SOAP_W / 2, y: bottom - SOAP_H, w: SOAP_W, h: SOAP_H,
           vx: 0, vy: 0, ground: null, hopped: false, bump: null, restT: 0, still: false, airT: 0, wasAir: true, canAim: false, sq: 0, impact: 0 };
}

// Queue something for main.js to play or show. Capped so the level checker (which never reads it) stays small.
function emit(game, type, data) {
  if (game.events.length < 32) game.events.push({ type: type, data: data || {} });
}

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// A ricochet: remember the hardest one this frame, physicsFrame reports it.
function noteBump(s, speed, x, y) {
  if (speed < BOUNCE_FX_MIN) return;
  if (!s.bump || speed > s.bump.speed) s.bump = { speed: speed, x: x, y: y };
}

// One small physics step. Order: gravity, ground friction and push, move in x, move in y.
function stepSoap(s, solids, dt) {
  const g = s.ground;               // what we stood on last step
  s.ground = null;
  s.vy += GRAVITY * dt;
  if (g) {
    s.vx += g.push * dt;                                        // slope push
    s.vx *= Math.exp(-K * SURFACES[g.surface].friction * dt);   // friction
  }

  s.x += s.vx * dt;
  for (let i = 0; i < solids.length; i++) {
    const b = solids[i];
    if (!overlaps(s, b)) continue;
    s.x = s.vx > 0 ? b.x - s.w : b.x + b.w;
    noteBump(s, Math.abs(s.vx), s.vx > 0 ? s.x + s.w : s.x, s.y + s.h / 2);
    s.vx = -s.vx * Math.max(SIDE_BOUNCE, SURFACES[b.surface].bounce);   // every side ricochets
  }

  s.y += s.vy * dt;
  for (let i = 0; i < solids.length; i++) {
    const b = solids[i];
    if (!overlaps(s, b)) continue;
    const bounce = SURFACES[b.surface].bounce, bouncy = SURFACES[b.surface].kind === 'bouncy';
    if (s.vy >= 0) {                                            // landing
      s.y = b.y - s.h;
      s.impact = Math.max(s.impact, s.vy);
      if (bouncy) noteBump(s, s.vy, s.x + s.w / 2, s.y + s.h);
      const up = -Math.min(bouncy ? Infinity : HOP_MAX, s.vy * bounce);
      if (s.vy > LAND_ABSORB) s.sq = Math.min(0.35, s.vy / 3000);
      if (s.vy > LAND_ABSORB && up < -40) { s.vy = up; s.hopped = true; }   // small hop on a hard landing
      else { s.vy = 0; s.ground = b; }
    } else {                                                    // bumped a ceiling
      s.y = b.y + b.h;
      if (bouncy) noteBump(s, -s.vy, s.x + s.w / 2, s.y);
      s.vy = -s.vy * bounce;
    }
  }
}

// Which zone (0 to 4, bottom to top) a world y falls in.
function zoneIndex(y) {
  for (let i = 0; i < LEVEL.zones.length; i++) {
    if (y >= LEVEL.zones[i].top && y < LEVEL.zones[i].bottom) return i;
  }
  return y < 0 ? LEVEL.zones.length - 1 : 0;
}

// Runs one 1/60 s frame of the world. Call only while playing.
function physicsFrame(game, dt) {
  const s = game.soap;
  for (let i = 0; i < SUBSTEPS; i++) stepSoap(s, game.solids, dt / SUBSTEPS);
  if (s.bump) {                                                 // ricochet: squish and tell main.js
    s.sq = -0.3;
    emit(game, 'bounce', s.bump);
    s.bump = null;
  }
  if (s.sq > 0) s.sq = Math.max(0, s.sq - 2.5 * dt);
  if (s.sq < 0) s.sq = Math.min(0, s.sq + 2.5 * dt);

  // Fully stopped? Not if a slope pushes harder than the surface friction can cancel.
  // (Only used for the level checker. The player can shoot while sliding.)
  let still = false;
  if (s.ground) {
    const slips = Math.abs(s.ground.push) / (K * SURFACES[s.ground.surface].friction) >= STOP_SPEED;
    still = !slips && Math.abs(s.vx) < STOP_SPEED && s.vy === 0;
  }
  if (still) { s.vx = 0; s.restT += dt; } else { s.restT = 0; }
  s.still = s.restT >= AIM_REST_TIME;

  // The soap can shoot whenever it touches a surface (plus a short grace after leaving one).
  // The little hop off a hard landing counts as touching, so a shot let go then is not held up.
  if (s.ground || s.hopped) s.airT = 0; else s.airT += dt;
  s.hopped = false;
  s.canAim = s.airT <= AIM_GRACE;
  if (s.ground && s.wasAir) onLand(game);
  s.wasAir = !s.ground;

  if (game.state === 'play' && overlaps(s, game.pump)) {        // knocked it: the pump soap goes flying, the soap watches
    game.state = 'winning'; game.winT = 0;
    knockPump(game);
    s.vx = 0;
    emit(game, 'win');
  }
}

// ---------- the beaten pump soap: a floppy ragdoll ----------
// Two pieces, the bottle and the pump head, each a spinning disc for collisions, held together at the neck
// by a stretchy joint. Verlet style: a piece's speed is how far it moved last step.
const RAG_STEPS = 4;                      // physics steps per frame for the ragdoll
const RAG_PIECES = {                      // in art pixels, from the top-left of the 24 x 40 sprite
  head: { top: 0, h: 11, neck: { x: 11, y: 11 }, mass: 1 },
  bottle: { top: 11, h: 29, neck: { x: 11, y: 11 }, mass: 3 },
};

function knockPump(game) {
  const s = game.soap, p = game.pump;
  const dir = s.vx < -1 ? -1 : s.vx > 1 ? 1 : (s.x + s.w / 2 < p.x + p.w / 2 ? 1 : -1);   // away from the soap
  const vx = dir * (RAG_FLING + 0.5 * Math.hypot(s.vx, s.vy)), vy = -RAG_FLING_UP, dt = DT / RAG_STEPS;
  const parts = {};
  Object.keys(RAG_PIECES).forEach(function (k) {
    const pc = RAG_PIECES[k], w = p.w, h = pc.h * PIXEL;
    const x = p.x + w / 2, y = p.y + pc.top * PIXEL + h / 2;
    const kick = k === 'head' ? { x: dir * 250, y: -300, spin: -0.6 } : { x: 0, y: 0, spin: 1 };   // the head lags, floppily
    const v = { x: vx + kick.x, y: vy + kick.y }, spin = dir * RAG_SPIN * kick.spin;
    parts[k] = { x: x, y: y, px: x - v.x * dt, py: y - v.y * dt, a: 0, pa: -spin * dt, w: w, h: h,
                 r: Math.min(w, h) / 2, neck: { x: (pc.neck.x - 12) * PIXEL, y: (pc.neck.y - pc.top) * PIXEL - h / 2 },
                 mass: pc.mass, bonkT: 0 };
  });
  game.rag = parts;
}

function rotated(pt, a) { return { x: pt.x * Math.cos(a) - pt.y * Math.sin(a), y: pt.x * Math.sin(a) + pt.y * Math.cos(a) }; }

// One piece against every solid: push out, bounce, and turn sliding into spin.
function ragCollide(game, q) {
  for (const b of game.solids) {
    const cx = Math.max(b.x, Math.min(q.x, b.x + b.w)), cy = Math.max(b.y, Math.min(q.y, b.y + b.h));
    let dx = q.x - cx, dy = q.y - cy, d = Math.hypot(dx, dy);
    if (d >= q.r) continue;
    if (d === 0) { dx = 0; dy = -1; d = 1; }                    // centre inside a block: pop out upward
    const nx = dx / d, ny = dy / d, vx = q.x - q.px, vy = q.y - q.py;
    q.x += nx * (q.r - d); q.y += ny * (q.r - d);
    const vn = vx * nx + vy * ny;
    if (vn >= 0) { q.px = q.x - vx; q.py = q.y - vy; continue; }
    const tx = vx - vn * nx, ty = vy - vn * ny;                 // the sliding part of the motion
    const out = -vn * RAG_BOUNCE;
    q.px = q.x - (tx * 0.8 + nx * out); q.py = q.y - (ty * 0.8 + ny * out);
    q.pa = q.a - ((q.a - q.pa) * 0.5 + (ty * nx - tx * ny) / q.r * 0.5);   // rolls along what it hit
    const speed = -vn * RAG_STEPS / DT;
    if (speed > 250 && q.bonkT <= 0) { emit(game, 'bonk', { speed: speed, x: q.x, y: q.y }); q.bonkT = 0.1; }
  }
}

// Moves the ragdoll by one frame. Runs while the win plays out.
function updateRagdoll(game, dt) {
  const rag = game.rag;
  if (!rag) return;
  const h = dt / RAG_STEPS, g = RAG_GRAVITY * h * h;
  for (let n = 0; n < RAG_STEPS; n++) {
    for (const k in rag) {
      const q = rag[k];
      const vx = q.x - q.px, vy = q.y - q.py;
      q.px = q.x; q.py = q.y;
      q.x += vx; q.y += vy + g;
      const va = (q.a - q.pa) * 0.998;
      q.pa = q.a; q.a += va;
      q.bonkT -= h;
      ragCollide(game, q);
    }
    for (let it = 0; it < 3; it++) {                             // the neck joint pulls the two pieces together
      const A = rag.bottle, B = rag.head;
      const na = rotated(A.neck, A.a), nb = rotated(B.neck, B.a);
      const dx = (B.x + nb.x) - (A.x + na.x), dy = (B.y + nb.y) - (A.y + na.y), m = A.mass + B.mass;
      A.x += dx * B.mass / m; A.y += dy * B.mass / m;
      B.x -= dx * A.mass / m; B.y -= dy * A.mass / m;
    }
    rag.head.a += (rag.bottle.a - rag.head.a) * 0.08;           // the head flops after the bottle
  }
}

// Called each time the soap lands on a surface after being in the air.
function onLand(game) {
  const s = game.soap;
  const z = zoneIndex(s.y + s.h / 2);
  emit(game, 'land', { speed: s.impact, surface: s.ground.surface, x: s.x + s.w / 2, y: s.y + s.h });
  s.impact = 0;
  game.maxZone = Math.max(game.maxZone, z);                     // highest zone reached (the height bar shows it)

  // A fall: this landing is much lower than the last one.
  if (s.y - game.lastY > FALL_MIN_DROP) {
    game.falls++;
    let t;
    do { t = Math.floor(Math.random() * TAUNTS.length); } while (t === game.lastTaunt && TAUNTS.length > 1);
    game.lastTaunt = t;
    game.taunt = TAUNTS[t];
    game.tauntT = TAUNT_TIME;
    emit(game, 'fall');
  }
  game.lastY = s.y;
}

// Squeeze meter: starts at 0, rises (faster near the top), then falls, then repeats.
function meterStart(m) { m.p = 0; m.dir = 1; }
function meterUpdate(m, dt) {
  if (m.dir > 0) {
    m.p += RISE_START * (1 + RISE_ACCEL * m.p * m.p) * dt;
    if (m.p >= 1) { m.p = 1; m.dir = -1; }
  } else {
    m.p -= FALL_RATE * dt;
    if (m.p <= 0) { m.p = 0; m.dir = 1; }
  }
}

function launchSpeed(p) { return MIN_SPEED + p * (MAX_SPEED - MIN_SPEED); }

// Fire the soap. (dx, dy) is the unit launch direction, power comes from the meter.
function launch(game, dx, dy) {
  const s = game.soap, v = launchSpeed(game.meter.p);
  s.vx = dx * v; s.vy = dy * v;
  s.ground = null; s.restT = 0; s.still = false; s.canAim = false; s.airT = 1; s.wasAir = true; s.sq = -0.2;
  game.shots++;
  emit(game, 'launch', { p: game.meter.p, x: s.x + s.w / 2, y: s.y + s.h });
}

// How dirty the soap is, 0 (clean) to 1.
function dirtOf(game) { return Math.min(1, game.falls * DIRT_PER_FALL); }
