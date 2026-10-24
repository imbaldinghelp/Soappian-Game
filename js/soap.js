// soap.js - the soap and the rules around it: movement, collisions, friction, squeeze meter,
// launch, checkpoint floors, falls and winning. No drawing and no browser code in here.
// Things the player should hear or see (a launch, a landing, a checkpoint) are pushed onto
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
    checkpointT: 0,
    winT: 0,
    events: [],
    cam: { x: 0, y: 0 },
  };
}

function makeSoap(cx, bottom) {
  return { x: cx - SOAP_W / 2, y: bottom - SOAP_H, w: SOAP_W, h: SOAP_H,
           vx: 0, vy: 0, ground: null, hopped: false, restT: 0, still: false, airT: 0, wasAir: true, canAim: false, sq: 0, impact: 0 };
}

// Queue something for main.js to play or show. Capped so the level checker (which never reads it) stays small.
function emit(game, type, data) {
  if (game.events.length < 32) game.events.push({ type: type, data: data || {} });
}

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
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
    if (!b.on || !overlaps(s, b)) continue;
    s.x = s.vx > 0 ? b.x - s.w : b.x + b.w;
    s.vx = -s.vx * SURFACES[b.surface].bounce;                  // wall bounce
  }

  s.y += s.vy * dt;
  for (let i = 0; i < solids.length; i++) {
    const b = solids[i];
    if (!b.on || !overlaps(s, b)) continue;
    const bounce = SURFACES[b.surface].bounce;
    if (s.vy >= 0) {                                            // landing
      s.y = b.y - s.h;
      s.impact = Math.max(s.impact, s.vy);
      const up = -Math.min(HOP_MAX, s.vy * bounce);
      if (s.vy > LAND_ABSORB) s.sq = Math.min(0.35, s.vy / 3000);
      if (s.vy > LAND_ABSORB && up < -40) { s.vy = up; s.hopped = true; }   // small hop on a hard landing
      else { s.vy = 0; s.ground = b; }
    } else {                                                    // bumped a ceiling
      s.y = b.y + b.h;
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

  if (game.state === 'play' && overlaps(s, game.pump)) {        // knocked it: the soap stops dead and watches
    game.state = 'winning'; game.winT = 0; s.vx = 0;
    emit(game, 'win');
  }
}

// Called each time the soap lands on a surface after being in the air.
function onLand(game) {
  const s = game.soap;
  const z = zoneIndex(s.y + s.h / 2);
  emit(game, 'land', { speed: s.impact, surface: s.ground.surface, x: s.x + s.w / 2, y: s.y + s.h });
  s.impact = 0;
  if (z > game.maxZone) {
    game.maxZone = z;
    game.checkpointT = CHECKPOINT_TIME;
    emit(game, 'checkpoint', { zone: z });
  }

  // Soft floors: switch on the floor ledge of this zone and the ones below, if the soap is above it.
  if (ZONE_FLOORS) {
    for (const b of game.solids) {
      if (b.floor && b.floor <= z && !b.on && s.y + s.h <= b.y + 1) b.on = true;
    }
  }

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
