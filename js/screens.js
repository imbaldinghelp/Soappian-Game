// screens.js - everything drawn on top of the world, and the scripted scenes: the title screen,
// the intro cutscene (the pump soap shoves the soap off the sink into the dustbin), the HUD,
// the taunts, the pause menu and the win screen. All coordinates are art pixels
// (LOW_W x LOW_H, 320 x 180).

// Panels and buttons (art pixels). main.js tests clicks against the buttons.
const WIN_LEFT = { x: 10, y: 26, w: 140, h: 116 }, WIN_RIGHT = { x: 160, y: 26, w: 150, h: 116 };   // your run | the board
const WIN_SAVE_BTN = { x: WIN_LEFT.x + 8, y: WIN_LEFT.y + 94, w: WIN_LEFT.w - 16, h: 15 };
const WIN_BTN = { x: WIN_LEFT.x, y: 150, w: WIN_LEFT.w, h: 20 };
const WIN_MENU_BTN = { x: WIN_RIGHT.x, y: 150, w: WIN_RIGHT.w, h: 20 };
const START_BTN = { x: Math.round(LOW_W / 2) - 38, y: 76, w: 76, h: 20 };
const RESTART_BTN = { x: LOW_W - 52, y: 3, w: 48, h: 13 };
const SOUND_BTN = { x: LOW_W - 69, y: 3, w: 14, h: 13 };
const TITLE_SOUND_BTN = { x: LOW_W - 18, y: 4, w: 14, h: 13 };
const RESUME_BTN = { x: Math.round(LOW_W / 2) - 65, y: 24, w: 130, h: 20 };
const MENU_BTN = { x: Math.round(LOW_W / 2) - 65, y: 130, w: 130, h: 20 };

function inRect(x, y, r) { return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }
function hovering(input, r) { return inRect(input.hx / SCALE_UP, input.hy / SCALE_UP, r); }

function drawButton(r, text, size, hover) {
  const lift = hover ? 1 : 0;
  R(r.x, r.y + 2, r.w, r.h, PAL.ink);                                     // drop shadow
  box(r.x, r.y - lift, r.w, r.h, hover ? PAL.cream : PAL.yellow);
  R(r.x + 1, r.y - lift + 1, r.w - 2, 1, PAL.white);
  R(r.x + 1, r.y - lift + r.h - 3, r.w - 2, 2, PAL.orange);
  drawTextC(text, r.x + r.w / 2, r.y - lift + Math.floor((r.h - 7 * size) / 2), size, PAL.ink, true);
}

function drawSoundButton(r) {                                            // a little speaker, crossed out when muted
  box(r.x, r.y, r.w, r.h, PAL.navy);
  const x = r.x + 3, y = r.y + 3;
  R(x, y + 2, 2, 3, PAL.white); R(x + 2, y + 1, 1, 5, PAL.white); R(x + 3, y, 1, 7, PAL.white);
  if (isMuted()) { for (let i = 0; i < 5; i++) { R(x + 5 + i, y + 1 + i, 1, 1, PAL.red); R(x + 9 - i, y + 1 + i, 1, 1, PAL.red); } }
  else { R(x + 5, y + 2, 1, 3, PAL.sky); R(x + 7, y + 1, 1, 5, PAL.sky); }
}

// Speech bubble with a tail pointing down at (tx, ty).
function drawBubble(text, tx, ty) {
  const w = textWidth(text, 1) + 8, h = 13;
  const x = Math.max(2, Math.min(LOW_W - w - 2, Math.round(tx - w / 2))), y = ty - h - 4;
  rr(x - 1, y - 1, w + 2, h + 2, PAL.ink); rr(x, y, w, h, PAL.white);
  R(tx - 2, y + h, 5, 1, PAL.ink); R(tx - 1, y + h - 1, 3, 2, PAL.white); R(tx - 1, y + h + 1, 3, 1, PAL.ink); R(tx, y + h + 1, 1, 2, PAL.ink);
  drawText(text, x + 4, y + 3, 1, PAL.ink, true);
}

// ---------- logo: chunky letters with an outline, two tones and a gentle wave ----------
function drawLogo(text, cx, y, size, t) {
  const w = textWidth(text, size), x0 = Math.round(cx - w / 2);
  const layers = [[PAL.plum, 2, 2, 1], [PAL.ink, 0, 0, 1], [null, 0, 0, 0]];   // shadow, outline, fill
  layers.forEach(function (ly) {
    for (let i = 0; i < text.length; i++) {
      const g = FONT[text[i]], dy = Math.round(Math.sin(t * 2 + i * 0.7) * 1.5);
      const gx = x0 + i * 6 * size + ly[1], gy = y + dy + ly[2];
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 5; c++) {
          if (!(g[r] & (16 >> c))) continue;
          const pxl = gx + c * size, pyl = gy + r * size, e = ly[3];
          if (ly[0]) { R(pxl - e, pyl - e, size + 2 * e, size + 2 * e, ly[0]); continue; }
          R(pxl, pyl, size, size, r < 3 ? PAL.yellow : r < 5 ? PAL.orange : PAL.tangerine);
          if (r === 0 || !(g[r - 1] & (16 >> c))) R(pxl, pyl, size, 1, PAL.cream);   // top highlight
        }
      }
    }
  });
}

// ---------- title screen: a calm evening bathroom, the soap in the bin, the pump soap on the sink ----------
const TITLE_SKY = ['#7d97dc', '#6c84cc', '#a3b8ee', '#5a70b8'];          // same colours as the towel rack zone
const TITLE_TAUNTS = TAUNTS.filter(function (s) { return s.length <= 22; });   // short ones fit beside the logo
const TITLE_BIN = { light: '#e0f7f0', cap: '#b5e6d8', body: '#93cfc0', edge: '#3e6b68' };   // a mint bin (just scenery here)
const TITLE_FLOOR = { light: '#ffffff', cap: '#fff3df', body: '#ecc08e', band: '#ddab78', edge: '#7a5545' };   // soft sandy floor

function drawTitleScene(t) {
  const gy = LOW_H - 30;                                                  // top of the floor
  R(0, 0, LOW_W, 100, TITLE_SKY[0]);
  R(0, 100, LOW_W, gy - 100, TITLE_SKY[1]);
  R(0, 100, LOW_W, 1, TITLE_SKY[2]); R(0, 103, LOW_W, 1, TITLE_SKY[0]); R(0, gy - 12, LOW_W, 1, TITLE_SKY[3]);
  DECO.window(34, 92, { w: 44, h: 50, bg: TITLE_SKY });
  [[96, 14], [262, 10], [300, 52], [16, 104], [222, 66]].forEach(function (p, i) {   // a few twinkles
    R(p[0], p[1], 2, 2, PAL.cream);
    if (Math.floor(t * 0.8 + i * 0.4) % 3 === 0) { R(p[0] - 1, p[1], 4, 2, PAL.cream); R(p[0], p[1] - 1, 2, 4, PAL.cream); R(p[0], p[1], 2, 2, PAL.white); }
  });
  const fl = TITLE_FLOOR;                                                 // the floor, like soft ground
  R(0, gy, LOW_W, LOW_H - gy, fl.edge);
  R(0, gy + 1, LOW_W, LOW_H - gy - 1, fl.body); R(0, gy + 14, LOW_W, 2, fl.band);
  R(0, gy + 1, LOW_W, 1, fl.light); R(0, gy + 2, LOW_W, 2, fl.cap); R(0, gy + 4, LOW_W, 1, fl.band);

  // the dustbin, with our soap peeking out and glaring at the pump soap
  const pl = TITLE_BIN, bx = 22, peek = Math.round(Math.sin(t * 2) * 1.5), look = Math.floor(t) % 4 === 0 ? 0 : 1;
  R(bx, gy - 50, 6, 24, pl.edge); R(bx + 1, gy - 49, 4, 22, pl.cap);    // open lid, standing up behind
  drawSoapSprite(bx + 10, gy - 37 + peek, px(SOAP_W), px(SOAP_H), 0, 'angry', look, 0);   // determined
  R(bx, gy - 26, 44, 27, pl.edge); R(bx + 1, gy - 25, 42, 25, pl.body);
  R(bx - 2, gy - 29, 48, 4, pl.edge); R(bx - 1, gy - 28, 46, 1, pl.light); R(bx - 1, gy - 27, 46, 1, pl.cap);
  drawTextC('BIN', bx + 22, gy - 16, 1, pl.edge, true);

  // the sink, with the pump soap on top
  const ce = SURFACES.ceramic, sx = LOW_W - 66;
  R(sx + 17, gy - 23, 20, 24, ce.edge); R(sx + 18, gy - 22, 18, 23, ce.body); R(sx + 18, gy - 22, 1, 23, ce.light);
  rr(sx, gy - 35, 54, 13, ce.edge); rr(sx + 1, gy - 34, 52, 11, ce.body); R(sx + 3, gy - 34, 48, 1, ce.light);
  drawPumpSprite(sx + 15, gy - 75, Math.floor(t * 2) % 6 === 0 ? 'talk' : 'smug');
  drawBubble(TITLE_TAUNTS[Math.floor(t / 3.5) % TITLE_TAUNTS.length], sx + 27, gy - 74);
}

function drawTitle(game, input) {
  const t = now();
  const art = IMAGES.title;
  if (art) L.drawImage(art, 0, 0); else drawTitleScene(t);
  drawLogo('SOAPPIAN', LOW_W / 2, 22, 4, t);
  drawButton(START_BTN, 'START', 2, hovering(input, START_BTN));
  if (Math.floor(t * 1.5) % 2 === 0) { drawText('>', START_BTN.x - 9, START_BTN.y + 6, 1, PAL.cream); drawText('<', START_BTN.x + START_BTN.w + 4, START_BTN.y + 6, 1, PAL.cream); }
  drawTextC('DRAG. SQUEEZE. SLIDE. CLIMB.', LOW_W / 2, 106, 1, PAL.white);
  drawTextC('SUTD WINTER GAME JAM 2026', LOW_W / 2, LOW_H - 16, 1, TITLE_FLOOR.edge, true);
  drawSoundButton(TITLE_SOUND_BTN);
}

// ---------- intro cutscene ----------
// Runs on the real level: the pump soap shoves the soap left across the sink, the soap pops off the
// sink's open left end and drops all the way down into the dustbin. updateIntro moves the soap and the pump;
// it returns true when it is over.
function startIntro(game) {
  game.state = 'intro';
  game.pump.x = LEVEL.pumpIntroX;
  const s = game.soap;
  s.x = LEVEL.pumpIntroX - s.w - TILE_PX; s.y = LEVEL.pump.y + LEVEL.pump.h - s.h; s.vx = 0; s.vy = 0;
  game.intro = { t: 0, phase: 'talk', fallX: 0, fallY: 0, landed: false };
}

function updateIntro(game, dt) {
  const it = game.intro, s = game.soap, p = game.pump;
  it.t += dt;
  if (it.phase === 'talk') {
    s.face = 'happy';
    game.pumpMood = Math.floor(it.t * 6) % 2 ? 'talk' : 'smug';
    if (it.t >= INTRO_TALK) { it.phase = 'push'; it.t = 0; playSound('push'); }
  } else if (it.phase === 'push') {
    const k = Math.min(1, it.t / INTRO_PUSH), e = k * k;                  // speeds up as it shoves
    const edge = LEVEL.sinkEdge;                                          // the basin's open left end
    p.x = LEVEL.pumpIntroX - e * (LEVEL.pumpIntroX - (edge + s.w));       // shoves the soap up against the lip
    if (p.x < s.x + s.w) { s.x = p.x - s.w; s.face = 'shock'; }
    game.pumpMood = 'push';
    if (s.x <= edge + 1 || k >= 1) {                                      // against the lip: pops over it
      it.phase = 'fall'; it.t = 0; it.fallX = s.x; it.fallY = s.y; s.vy = -INTRO_HOP;
      playSound('whistle');
    }
  } else if (it.phase === 'fall') {
    s.vy = Math.min(INTRO_FALL_MAX, s.vy + INTRO_FALL_G * dt);
    s.y += s.vy * dt;
    const smooth = function (k) { return k * k * (3 - 2 * k); };
    const over = smooth(Math.min(1, it.t / 0.4));                         // over the lip and out to the drop line
    const outX = it.fallX + (LEVEL.dropX - s.w / 2 - it.fallX) * over;
    const endY = LEVEL.start.y - s.h, k = Math.max(0, Math.min(1, (s.y - it.fallY) / (endY - it.fallY)));
    s.x = outX + (LEVEL.start.x - s.w / 2 - outX) * smooth(k);           // settles over the bin
    s.sq = -0.3; s.vx = 0;
    game.pumpMood = it.t < 1.2 ? 'talk' : 'smug';
    if (s.y >= endY) {
      s.y = endY; s.vy = 0; s.sq = 0.35; s.face = 'shock';
      p.x = LEVEL.pump.x; game.pumpMood = undefined;
      it.phase = 'after'; it.t = 0;
      playSound('clang'); fxShake(0.35); fxBurst('dust', s.x + s.w / 2, s.y + s.h, 14, PAL.silver);
    }
  } else {
    s.sq = Math.max(0, s.sq - 2.5 * dt);
    if (it.t > 0.7) s.face = 'angry';
    if (it.t >= INTRO_AFTER) return true;
  }
  return false;
}

// 8-bit style dialogue box along the bottom: portrait, name, and text that types itself out.
function drawDialogue(text, t, mood) {
  const y = LOW_H - 36;
  R(0, y, LOW_W, 36, PAL.ink); R(0, y + 1, LOW_W, 1, PAL.lilac);
  box(4, y + 4, 30, 29, PAL.deepnavy);
  L.save(); L.beginPath(); L.rect(5, y + 5, 28, 27); L.clip();
  drawPumpSprite(7, y + 4, mood);
  L.restore();
  drawText('PUMP SOAP', 40, y + 5, 1, PAL.red);
  drawText(text.slice(0, Math.floor(t * 32)), 40, y + 16, 2, PAL.white);
}

function drawIntro(game, camX, camY) {
  const it = game.intro, s = game.soap;
  if (it.phase === 'push' && it.t > 0.2) drawTextC('!', px(s.x + s.w / 2) - camX, px(s.y) - camY - 12, 1, PAL.yellow);
  if (it.phase === 'talk') drawDialogue(INTRO_LINES[0], it.t, game.pumpMood);
  else if (it.phase === 'push') drawDialogue(INTRO_LINES[0], 9, 'push');
  else if (it.phase === 'fall' && it.t < 1.4) drawDialogue(INTRO_LINES[1], it.t, game.pumpMood);
  if (it.phase === 'after' && it.t > 0.7) {
    const k = Math.min(1, (it.t - 0.7) / 0.25);
    drawTextC(INTRO_LINES[2], LOW_W / 2, Math.round(36 - (1 - k) * 20), 2, PAL.yellow);
  }
  drawText('CLICK TO SKIP', LOW_W - 82, 4, 1, PAL.silver);
}

// ---------- HUD ----------
function drawHud(game, input) {
  drawText(fmtTime(game.time), 5, 5, 1, PAL.white);                       // a quiet timer, nothing else
  drawSoundButton(SOUND_BTN);
  drawButton(RESTART_BTN, 'RESTART', 1, hovering(input, RESTART_BTN));

  // height bar: one coloured segment per zone, lit once reached
  const bx = LOW_W - 12, top = 24, bot = LOW_H - 8, bh = bot - top;
  R(bx - 1, top - 1, 7, bh + 2, PAL.ink);
  LEVEL.zones.forEach(function (z, i) {
    const yTop = top + Math.round((z.top / WORLD_H) * bh), yBot = top + Math.round((z.bottom / WORLD_H) * bh);
    R(bx, yTop, 5, yBot - yTop, game.maxZone >= i ? z.bg[0] : PAL.deepnavy);
    R(bx, yTop, 5, 1, PAL.ink);
  });
  const s = game.soap;
  const dotY = top + Math.round(((s.y + s.h / 2) / WORLD_H) * bh);
  R(bx - 2, dotY - 2, 9, 5, PAL.ink); R(bx - 1, dotY - 1, 7, 3, PAL.yellow);
  const pumpY = top + Math.round((LEVEL.pump.y / WORLD_H) * bh);
  R(bx + 1, pumpY, 3, 3, PAL.red);

  if (game.state === 'play' && game.shots === 0) {                      // first-shot hint
    const msg = input.aiming ? 'LET GO WHEN THE METER IS HIGH' : 'PRESS AND DRAG BACK TO AIM';
    const w = textWidth(msg, 1) + 10, x = LOW_W - 18 - w;                // right side: clear of the board over the bin
    box(x, 22, w, 13, PAL.deepnavy); drawText(msg, x + 5, 25, 1, PAL.cream);
  }

  if (game.tauntT > 0) {                                                 // taunt from the pump soap, up top, clear of the soap
    const tw = textWidth(game.taunt, 1), bw = tw + 26, bx2 = Math.round((LOW_W - bw) / 2), by = 22;
    rr(bx2 - 1, by - 1, bw + 2, 18, PAL.ink); rr(bx2, by, bw, 16, PAL.white);
    box(bx2 + 3, by + 2, 9, 12, PAL.red); R(bx2 + 5, by + 5, 2, 2, PAL.white); R(bx2 + 8, by + 5, 2, 2, PAL.white);
    R(bx2 + 5, by + 9, 5, 1, PAL.ink);
    drawText(game.taunt, bx2 + 17, by + 5, 1, PAL.ink, true);
  }
}

// ---------- win screen: your run and a name to save it under (left), the leaderboard (right) ----------
// The board is local for now (scores.js). Type a name (letters, digits), Enter or SAVE SCORE saves it.
const WIN = { name: '', saved: false, entry: null, scores: [] };

function openWinScreen(game) {
  WIN.name = lastName().toUpperCase().slice(0, NAME_MAX);
  WIN.saved = false; WIN.entry = null;
  WIN.scores = loadScores();
}

function saveWinEntry(game) {
  if (WIN.saved) return false;
  const name = WIN.name.trim() || 'SOAP';
  WIN.entry = { name: name, time: Math.round(game.time * 100) / 100, falls: game.falls, shots: game.shots, date: Date.now() };
  addScore(WIN.entry);
  rememberName(name);
  WIN.saved = true;
  WIN.scores = loadScores();
  return true;
}

// Keys on the win screen. Before saving they type the name; after, Enter plays again and Esc goes to the title.
function winKey(game, key) {
  if (WIN.saved) {
    if (key === 'Enter' || key === ' ') startGame();
    else if (key === 'Escape') backToTitle();
    return;
  }
  if (key === 'Enter') { if (saveWinEntry(game)) playSound('click'); }
  else if (key === 'Backspace') WIN.name = WIN.name.slice(0, -1);
  else if (/^[a-z0-9 ]$/i.test(key) && WIN.name.length < NAME_MAX && !(key === ' ' && !WIN.name)) WIN.name += key.toUpperCase();
}

function card(r) { R(r.x + 2, r.y + 2, r.w, r.h, PAL.ink); box(r.x, r.y, r.w, r.h, PAL.deepnavy); R(r.x + 1, r.y + 1, r.w - 2, 1, PAL.lilac); }

function drawWin(game, input) {
  L.globalAlpha = 0.6; R(0, 0, LOW_W, LOW_H, PAL.ink); L.globalAlpha = 1;   // soft shade over the world
  drawTextC('INTO THE BIN!', LOW_W / 2, 6, 2, PAL.yellow);

  const a = WIN_LEFT, ax = a.x + 8;                                       // your run
  card(a);
  drawText('YOUR CLIMB', ax, a.y + 6, 1, PAL.sky);
  drawText(fmtTime(game.time), ax, a.y + 18, 2, PAL.white);
  drawText('FALLS ' + game.falls, ax, a.y + 38, 1, PAL.cream);
  drawText('SHOTS ' + game.shots, ax + 64, a.y + 38, 1, PAL.cream);
  drawText(WIN.saved ? 'SAVED AS' : 'TYPE YOUR NAME', ax, a.y + 56, 1, PAL.silver);
  box(ax, a.y + 66, a.w - 16, 15, WIN.saved ? PAL.deepnavy : PAL.ink);
  drawText(WIN.saved ? WIN.entry.name : WIN.name, ax + 4, a.y + 70, 1, PAL.white, true);
  if (!WIN.saved) {
    if (Math.floor(now() * 2) % 2 && WIN.name.length < NAME_MAX) R(ax + 4 + WIN.name.length * 6, a.y + 70, 5, 7, PAL.yellow);   // cursor
    drawButton(WIN_SAVE_BTN, 'SAVE SCORE', 1, hovering(input, WIN_SAVE_BTN));
  } else {
    const place = WIN.scores.indexOf(WIN.scores.find(function (e) { return e.date === WIN.entry.date && e.time === WIN.entry.time; }));
    drawTextC(place >= 0 ? 'PLACE ' + (place + 1) + ' OF ' + WIN.scores.length : 'SAVED', a.x + a.w / 2, WIN_SAVE_BTN.y + 4, 1, PAL.yellow);
  }

  const b = WIN_RIGHT, bx = b.x + 6;                                      // the board
  card(b);
  drawText('BEST CLIMBS', bx, b.y + 6, 1, PAL.sky);
  drawText('THIS PC', b.x + b.w - 6 - textWidth('THIS PC', 1), b.y + 6, 1, PAL.slate);
  drawText('NAME', bx + 14, b.y + 18, 1, PAL.slate);
  drawText('TIME', bx + 76, b.y + 18, 1, PAL.slate);
  drawText('FALL', bx + 110, b.y + 18, 1, PAL.slate);
  R(bx, b.y + 27, b.w - 12, 1, PAL.navy);
  if (!WIN.scores.length) drawTextC('NO CLIMBS YET', b.x + b.w / 2, b.y + 50, 1, PAL.silver);
  WIN.scores.slice(0, SCORES_SHOWN).forEach(function (e, i) {
    const y = b.y + 31 + i * 10, mine = WIN.entry && e.date === WIN.entry.date && e.time === WIN.entry.time;
    if (mine) R(bx - 2, y - 2, b.w - 8, 10, PAL.navy);
    const c = mine ? PAL.yellow : i === 0 ? PAL.cream : PAL.white;
    drawText((i + 1) + '.', bx, y, 1, PAL.slate, true);
    drawText(String(e.name).slice(0, NAME_MAX), bx + 14, y, 1, c, true);
    drawText(fmtTime(e.time), bx + 76, y, 1, c, true);
    drawText(String(e.falls), bx + 110, y, 1, c, true);
  });

  drawButton(WIN_BTN, 'PLAY AGAIN', 2, hovering(input, WIN_BTN));
  drawButton(WIN_MENU_BTN, 'TITLE MENU', 2, hovering(input, WIN_MENU_BTN));
}

// Esc menu: the world stays frozen behind a dark see-through layer. The surface guide sits between the buttons.
function drawPause(input) {
  L.globalAlpha = 0.6; R(0, 0, LOW_W, LOW_H, PAL.ink); L.globalAlpha = 1;
  drawTextC('PAUSED', LOW_W / 2, 7, 2, PAL.yellow);
  drawButton(RESUME_BTN, 'RESUME', 2, hovering(input, RESUME_BTN));
  drawSurfaceGuide(Math.round((LOW_W - GUIDE_W) / 2), RESUME_BTN.y + RESUME_BTN.h + 8);
  drawButton(MENU_BTN, 'TITLE MENU', 2, hovering(input, MENU_BTN));
  drawTextC('ESC TO RESUME', LOW_W / 2, 163, 1, PAL.silver);
}

// Everything drawn over the world, by game state.
function drawOverlay(game, input, camX, camY) {
  if (game.state === 'intro') drawIntro(game, camX, camY);
  else if (game.state === 'play' || game.state === 'winning') drawHud(game, input);
  else if (game.state === 'paused') { drawHud(game, input); drawPause(input); }
  else if (game.state === 'won') drawWin(game, input);
}
