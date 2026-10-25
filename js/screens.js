// screens.js - everything drawn on top of the world, and the scripted scenes: the title screen,
// the intro cutscene (the pump soap shoves the soap off the sink into the dustbin), the HUD,
// the taunts, the pause menu and the win screen. All coordinates are art pixels
// (LOW_W x LOW_H, 320 x 180).

// Panels and buttons (art pixels). main.js tests clicks against the buttons.
const WIN_LEFT = { x: 10, y: 26, w: 140, h: 116 }, WIN_RIGHT = { x: 160, y: 26, w: 150, h: 116 };   // your run | the board
const WIN_SAVE_BTN = { x: WIN_LEFT.x + 8, y: WIN_LEFT.y + 94, w: WIN_LEFT.w - 16, h: 15 };
const WIN_BTN = { x: WIN_LEFT.x, y: 150, w: WIN_LEFT.w, h: 20 };
const WIN_MENU_BTN = { x: WIN_RIGHT.x, y: 150, w: WIN_RIGHT.w, h: 20 };
const PLAY_BTN = { x: Math.round(LOW_W / 2) - 30, y: 74, w: 60, h: 18 };        // title menu items (the text inside)
const CREDITS_BTN = { x: Math.round(LOW_W / 2) - 48, y: 96, w: 96, h: 18 };
const CREDITS_CARD = { x: 60, y: 20, w: 200, h: 130 };
const CREDITS_BACK_BTN = { x: Math.round(LOW_W / 2) - 30, y: 156, w: 60, h: 16 };
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

// ---------- title screen: an evening bathroom, the soap in the bin, the pump soap on the sink ----------
// A big lathery logo with a ribbon, and a short menu (PLAY, CREDITS): click, or arrow keys and Enter.
const TITLE = { sel: 0, credits: false };
const TITLE_ITEMS = [
  { r: PLAY_BTN, text: 'PLAY', go: function () { playIntro(); } },
  { r: CREDITS_BTN, text: 'CREDITS', go: function () { TITLE.credits = true; } },
];
const TITLE_GY = LOW_H - 30;                                              // top of the floor
const TITLE_TRIM = 104;                                                   // where the tiled lower wall starts
const TITLE_WALL = ['#4f63a8', '#5a70b8', '#6c84cc', '#7d97dc'];          // evening wall, darker at the top
const TITLE_TILE = { body: '#a3b8ee', grout: '#8ea4e2', light: '#bccbf3' };
const TITLE_FLOOR = { a: '#fff3df', b: '#ecc08e', edge: '#7a5545' };    // soft sandy floor tiles
const TITLE_FOAM = { edge: '#8a83c4', shade: '#d9d6f2', body: '#f6f3ff', light: '#ffffff' };   // lather behind the logo
const TITLE_TOWEL = { edge: PAL.deepplum, body: PAL.pink, band: '#e98fb3', light: '#fbd3e2' };
const TITLE_BIN = { light: '#e0f7f0', cap: '#b5e6d8', body: '#93cfc0', edge: '#3e6b68' };   // a mint bin (just scenery here)
const TITLE_TAUNTS = TAUNTS.filter(function (s) { return s.length <= 22; });   // short ones fit beside the logo
// Rising bubbles: [x, speed (px/s), radius, phase]
const TITLE_BUBBLES = [[40, 14, 3, 0], [52, 19, 2, 0.3], [30, 11, 4, 0.55], [60, 16, 2, 0.8], [276, 13, 3, 0.15],
  [292, 17, 2, 0.45], [264, 12, 4, 0.7], [150, 9, 2, 0.25], [196, 10, 3, 0.6], [110, 12, 2, 0.9]];
// Lather puffs behind the logo, around its middle: [dx, dy, radius]
const TITLE_FOAM_PUFFS = [[-92, 4, 8], [-80, -4, 11], [-58, -9, 14], [-30, -12, 15], [0, -14, 16], [30, -12, 15],
  [58, -9, 14], [80, -4, 11], [92, 4, 8], [-70, 9, 11], [-36, 11, 13], [0, 12, 13], [36, 11, 13], [70, 9, 11]];

function bubble(x, y, r) {                                                // a see-through ring with a shine
  for (let dy = -r; dy <= r; dy++) {
    const hw = Math.round(Math.sqrt(r * r - dy * dy));
    const hi = Math.abs(dy) < r - 1 ? Math.round(Math.sqrt((r - 1) * (r - 1) - dy * dy)) : -1;
    if (hi < 0) { R(x - hw, y + dy, hw * 2 + 1, 1, PAL.white); continue; }
    R(x - hw, y + dy, hw - hi, 1, PAL.white); R(x + hi + 1, y + dy, hw - hi, 1, PAL.white);
  }
  R(x - Math.ceil(r / 2), y - Math.ceil(r / 2), 1, 1, PAL.white);
}

// Everything that never moves, painted once and kept: wall, tiles, floor, towel rack, mirror, shelf.
function paintTitleBackdrop() {
  const gy = TITLE_GY, trim = TITLE_TRIM, ce = SURFACES.ceramic;
  const bands = [0, 26, 52, 78, trim];                                     // the wall, an 8-bit gradient
  for (let i = 0; i < 4; i++) R(0, bands[i], LOW_W, bands[i + 1] - bands[i], TITLE_WALL[i]);
  for (let i = 1; i < 4; i++) {                                           // checker where two bands meet
    for (let y = bands[i] - 2; y < bands[i] + 2; y++) {
      for (let x = y & 1; x < LOW_W; x += 2) R(x, y, 1, 1, TITLE_WALL[y < bands[i] ? i : i - 1]);
    }
  }
  const tl = TITLE_TILE;                                                  // tiled lower wall
  R(0, trim, LOW_W, gy - trim, tl.body);
  for (let y = trim + 2; y < gy; y += 12) R(0, y, LOW_W, 1, tl.grout);
  for (let x = 6; x < LOW_W; x += 12) R(x, trim, 1, gy - trim, tl.grout);
  for (let y = trim + 3; y < gy; y += 12) for (let x = 7; x < LOW_W; x += 12) { R(x, y, 4, 1, tl.light); R(x, y, 1, 3, tl.light); }
  R(0, trim - 3, LOW_W, 5, ce.band); R(0, trim - 3, LOW_W, 1, ce.light); R(0, trim - 2, LOW_W, 2, ce.body);   // trim
  R(0, gy - 4, LOW_W, 4, ce.body); R(0, gy - 4, LOW_W, 1, ce.light); R(0, gy - 1, LOW_W, 1, ce.band);         // skirting

  const fl = TITLE_FLOOR, vy = gy - 40;                                   // floor tiles running back to the wall
  for (let y = gy; y < LOW_H; y++) {
    const z = 600 / (y - vy), row = Math.floor(z / 1.6);
    let x0 = 0, last = -1;
    for (let x = 0; x <= LOW_W; x++) {
      const c = x < LOW_W ? (Math.floor((x - LOW_W / 2) * z / 40 / 7) + row) & 1 : -1;
      if (c !== last) { if (last >= 0) R(x0, y, x - x0, 1, last ? fl.b : fl.a); x0 = x; last = c; }
    }
  }
  R(0, gy, LOW_W, 1, fl.edge);
  DECO.duck(234, 168);

  const tw = TITLE_TOWEL, rx = 12;                                        // towel rack with a pink towel
  R(rx, 66, 3, 6, PAL.slate); R(rx + 39, 66, 3, 6, PAL.slate); R(rx, 67, 42, 2, PAL.silver); R(rx, 67, 42, 1, PAL.white);
  R(rx + 5, 68, 32, 30, tw.edge); R(rx + 6, 69, 30, 28, tw.body);
  R(rx + 6, 69, 30, 3, tw.light); R(rx + 6, 84, 30, 2, tw.band); R(rx + 6, 89, 30, 2, tw.band); R(rx + 6, 95, 30, 2, tw.band);
  for (let x = rx + 7; x < rx + 36; x += 3) R(x, 98, 1, 2, tw.edge);    // fringe

  R(222, 98, 32, 3, ce.band); R(222, 98, 32, 1, ce.light); R(225, 101, 2, 4, PAL.slate); R(249, 101, 2, 4, PAL.slate);   // shelf
  DECO.lotion(231, 98); DECO.bottle(243, 98);

  const mx = 262, my = 8;                                                 // round-cornered mirror over the sink
  rr(mx - 1, my - 1, 42, 44, PAL.slate); rr(mx, my, 40, 42, PAL.silver); rr(mx + 2, my + 2, 36, 38, '#cfe0f7');
  for (let i = 0; i < 10; i++) { R(mx + 8 + i, my + 22 - i, 2, 1, PAL.white); R(mx + 16 + i, my + 30 - i, 1, 1, PAL.white); }
}

function drawTitleScene(t) {
  const gy = TITLE_GY;
  L.drawImage(spriteOf('title-backdrop', LOW_W, LOW_H, paintTitleBackdrop), 0, 0);
  DECO.window(34, 58, { w: 40, h: 46, bg: [TITLE_WALL[2], TITLE_WALL[1], TITLE_TILE.light] });   // night window, twinkling
  TITLE_BUBBLES.forEach(function (b, i) {                                 // bubbles drifting up from the bin and the sink
    const y = Math.round(LOW_H + 8 - ((t * b[1] + b[3] * 190) % 190));
    bubble(Math.round(b[0] + Math.sin(t * 1.3 + i * 2) * 3), y, b[2]);
  });

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
}

// The logo sits on a cloud of lather, with a ribbon under it.
function drawFoam(cx, cy, t) {
  const f = TITLE_FOAM, P = TITLE_FOAM_PUFFS;
  const bob = function (i) { return Math.round(Math.sin(t * 1.4 + i) * 0.8); };
  P.forEach(function (p, i) { disc(cx + p[0], cy + p[1] + bob(i), p[2] + 1, f.edge); });
  P.forEach(function (p, i) { disc(cx + p[0], cy + p[1] + bob(i), p[2], f.shade); });
  P.forEach(function (p, i) { disc(cx + p[0] - 1, cy + p[1] + bob(i) - 2, p[2] - 2, f.body); });
  P.forEach(function (p, i) { if (i % 2 === 0) R(cx + p[0] - Math.round(p[2] / 2), cy + p[1] + bob(i) - Math.round(p[2] / 2), 3, 2, f.light); });
}

function drawRibbon(text, cx, y) {
  const w = textWidth(text, 1) + 16, h = 13, x = Math.round(cx - w / 2);
  for (let side = 0; side < 2; side++) {                                  // tails tucked behind, with a notch
    const tx = side ? x + w - 6 : x - 12;
    for (let r = 0; r < h; r++) {
      const cut = Math.max(0, 3 - Math.abs(r - 6)), tw = 18 - cut, lx = side ? tx : tx + cut;
      R(lx, y + 4 + r, tw, 1, r === 0 || r === h - 1 ? PAL.deepplum : PAL.crimson);
      R(side ? lx + tw - 1 : lx, y + 4 + r, 1, 1, PAL.deepplum);
    }
    R(side ? x + w - 6 : x, y + h, 6, 4, PAL.deepplum);                    // the fold
  }
  R(x, y, w, h, PAL.deepplum); R(x + 1, y + 1, w - 2, h - 2, PAL.coral); R(x + 1, y + 1, w - 2, 1, PAL.salmon);
  R(x + 1, y + h - 2, w - 2, 1, PAL.crimson);
  drawTextC(text, cx, y + 3, 1, PAL.white, true);
}

// Text with a 1 px outline all round and a drop shadow, like the menu on a big game's title screen.
function drawOutlinedC(text, cx, y, size, color) {
  drawTextC(text, cx, y + 2, size, PAL.deepplum, true);
  [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (o) { drawTextC(text, cx + o[0], y + o[1], size, PAL.ink, true); });
  drawTextC(text, cx, y, size, color, true);
}

function drawMenu(t) {
  TITLE_ITEMS.forEach(function (it, i) {
    const r = it.r, sel = TITLE.sel === i, cx = r.x + r.w / 2, ty = r.y + 2;
    drawOutlinedC(it.text, cx, ty, 2, sel ? PAL.yellow : PAL.white);
    if (!sel) return;
    const k = Math.round(Math.sin(t * 6) * 1.5), half = textWidth(it.text, 2) / 2;   // little soap bars point at it
    [-1, 1].forEach(function (d) {
      const bx = Math.round(cx + d * (half + 9 + k)) - 4, by = ty + 4;
      rr(bx - 1, by - 1, 10, 8, PAL.ink); rr(bx, by, 8, 6, PAL.pink); R(bx + 2, by + 1, 2, 1, PAL.white);
    });
  });
}

function drawCredits(input) {
  L.globalAlpha = 0.6; R(0, 0, LOW_W, LOW_H, PAL.ink); L.globalAlpha = 1;
  const c = CREDITS_CARD;
  card(c);
  drawTextC('CREDITS', LOW_W / 2, c.y + 8, 2, PAL.yellow);
  CREDITS.forEach(function (row, i) {
    const y = c.y + 32 + i * 20;
    drawTextC(row[0], LOW_W / 2, y, 1, PAL.sky, true);
    drawTextC(row[1], LOW_W / 2, y + 9, 1, PAL.white, true);
  });
  drawTextC('SUTD WINTER GAME JAM 2026', LOW_W / 2, c.y + c.h - 12, 1, PAL.slate, true);
  drawButton(CREDITS_BACK_BTN, 'BACK', 1, hovering(input, CREDITS_BACK_BTN));
}

// Keys on the title screen. Returns true if it used the key.
function titleKey(k) {
  if (TITLE.credits) {
    if (k === 'escape' || k === 'enter' || k === ' ' || k === 'backspace') { TITLE.credits = false; playSound('click'); }
    return true;
  }
  const n = TITLE_ITEMS.length;
  if (k === 'arrowup') { TITLE.sel = (TITLE.sel + n - 1) % n; return true; }
  if (k === 'arrowdown') { TITLE.sel = (TITLE.sel + 1) % n; return true; }
  if (k === 'enter' || k === ' ') { playSound('click'); TITLE_ITEMS[TITLE.sel].go(); return true; }
  return false;
}

// A click on the title screen (p in virtual screen px). Any click closes the credits.
function titleClick(p) {
  if (TITLE.credits) { playSound('click'); TITLE.credits = false; return; }
  TITLE_ITEMS.forEach(function (it, i) { if (inButton(p, it.r)) { TITLE.sel = i; playSound('click'); it.go(); } });
}

function drawTitle(game, input) {
  const t = now();
  const art = IMAGES.title;
  if (art) L.drawImage(art, 0, 0); else drawTitleScene(t);
  drawFoam(LOW_W / 2, 26, t);
  drawLogo('SOAPPIAN', LOW_W / 2, 12, 4, t);
  drawRibbon('DRAG. SQUEEZE. SLIDE. CLIMB.', LOW_W / 2, 45);
  if (!TITLE.credits) TITLE_ITEMS.forEach(function (it, i) { if (hovering(input, it.r)) TITLE.sel = i; });
  drawMenu(t);
  drawBubble(TITLE_TAUNTS[Math.floor(t / 3.5) % TITLE_TAUNTS.length], LOW_W - 39, TITLE_GY - 74);
  drawTextC('SUTD WINTER GAME JAM 2026', LOW_W / 2, LOW_H - 10, 1, TITLE_FLOOR.edge, true);
  if (TITLE.credits) drawCredits(input);
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

  if (game.tauntT > 0) {                                                 // taunt from the pump soap, up top, clear of the soap
    const lines = game.taunt.split('|'), extra = (lines.length - 1) * 9;  // '|' splits lines (the whisper has two)
    const tw = Math.max.apply(null, lines.map(function (l) { return textWidth(l, 1); }));
    const bw = tw + 26, bx2 = Math.round((LOW_W - bw) / 2), by = 22, fy = by + 2 + Math.round(extra / 2);
    rr(bx2 - 1, by - 1, bw + 2, 18 + extra, PAL.ink); rr(bx2, by, bw, 16 + extra, PAL.white);
    box(bx2 + 3, fy, 9, 12, PAL.red); R(bx2 + 5, fy + 3, 2, 2, PAL.white); R(bx2 + 8, fy + 3, 2, 2, PAL.white);
    R(bx2 + 5, fy + 7, 5, 1, PAL.ink);
    lines.forEach(function (l, i) { drawText(l, bx2 + 17, by + 5 + i * 9, 1, i > 0 ? PAL.crimson : PAL.ink, true); });
  }
}

// ---------- starter checklist (top left) and a ghost mouse acting out a shot next to the soap ----------
// Each line ticks itself off (checkOff, called from main.js) and gets struck through; once both are done the
// list fades away. Kept for the whole visit, so a restart does not bring it back. The ghost shows until the first shot.
const CHECKLIST = [
  { key: 'aim', text: 'DRAG BACK TO AIM' },
  { key: 'manual', text: 'OPEN SURFACE MANUAL', cap: 'ESC' },
];
const CHECK = { aim: false, manual: false, seen: {}, goneAt: 0 };
const CHECK_HOLD = 1.5;                   // seconds the finished list stays up before it fades
const CHECK_FADE = 0.6;                   // seconds of fading
const TUT_LOOP = 2.6;                     // seconds per ghost demo: appear, press, drag back, hold, let go
const TUT_PRESS = { x: 70, y: -32 };      // where the ghost presses, art px from the soap's middle (open space to its right)
const TUT_DRAG = { x: -24, y: 20 };       // how far it drags back (down and left, so the shot goes up and right)
const CURSOR_ROWS = ['1', '11', '121', '1221', '12221', '122221', '1222221', '12222221', '1222111', '121121', '11 121', '   11'];

function checkOff(key) { CHECK[key] = true; }

function drawKeyCap(text, x, y) {                                         // a little keyboard key, top-left at (x, y)
  const w = textWidth(text, 1) + 6;
  R(x, y + 2, w, 10, PAL.ink); box(x, y, w, 11, PAL.white); R(x + 1, y + 9, w - 2, 1, PAL.silver);
  drawText(text, x + 3, y + 2, 1, PAL.ink, true);
  return w;
}

function drawChecklist() {
  if (CHECK.aim && CHECK.manual && !CHECK.goneAt) CHECK.goneAt = now() + CHECK_HOLD;
  const fade = CHECK.goneAt ? Math.max(0, Math.min(1, (CHECK.goneAt + CHECK_FADE - now()) / CHECK_FADE)) : 1;
  if (fade <= 0) return;
  const x = 4, y = 16, w = 160, h = 6 + CHECKLIST.length * 14;
  L.globalAlpha = 0.55 * fade; R(x, y, w, h, PAL.ink); L.globalAlpha = fade;   // see-through backing
  outline(x, y, w, h, PAL.lilac);
  CHECKLIST.forEach(function (it, i) {
    const done = CHECK[it.key], ry = y + 5 + i * 14, tx = x + 16;
    if (done && CHECK.seen[it.key] === undefined) CHECK.seen[it.key] = now();       // the strike draws itself from here
    box(x + 5, ry, 9, 9, done ? PAL.deepnavy : PAL.white);
    if (done) {                                                           // a tick
      R(x + 6, ry + 4, 1, 2, PAL.lime); R(x + 7, ry + 5, 1, 2, PAL.lime); R(x + 8, ry + 6, 1, 2, PAL.lime);
      R(x + 9, ry + 5, 1, 2, PAL.lime); R(x + 10, ry + 3, 1, 3, PAL.lime); R(x + 11, ry + 2, 1, 2, PAL.lime); R(x + 12, ry + 1, 1, 2, PAL.lime);
    }
    drawText(it.text, tx, ry + 1, 1, done ? PAL.slate : PAL.white);
    let tw = textWidth(it.text, 1);
    if (it.cap) tw += 4 + drawKeyCap(it.cap, tx + tw + 4, ry - 1);
    if (done) {                                                           // struck through
      const k = Math.min(1, (now() - CHECK.seen[it.key]) / 0.25);
      R(tx - 1, ry + 4, Math.round((tw + 2) * k), 1, PAL.cream);
    }
  });
  L.globalAlpha = 1;
}

function drawCursor(x, y) {                                               // a mouse pointer, tip at (x, y)
  CURSOR_ROWS.forEach(function (row, r) {
    for (let c = 0; c < row.length; c++) if (row[c] !== ' ') R(x + c, y + r, 1, 1, row[c] === '1' ? PAL.ink : PAL.white);
  });
}

// The ghost: same marks as real aiming (press box, rubber band, aim dots), on a loop, until the first shot.
function drawGhostShot(game, input, camX, camY) {
  const s = game.soap;
  if (CHECK.aim || input.aiming || !s.canAim) return;
  const sx = px(s.x + s.w / 2) - camX, sy = px(s.y + s.h / 2) - camY;
  const t = now() % TUT_LOOP;
  const k = Math.max(0, Math.min(1, (t - 0.6) / 0.9)), e = k * k * (3 - 2 * k);   // the drag, eased
  const x0 = sx + TUT_PRESS.x, y0 = sy + TUT_PRESS.y;
  const cx = Math.round(x0 + TUT_DRAG.x * e), cy = Math.round(y0 + TUT_DRAG.y * e);
  const pressed = t > 0.45 && t < 1.9, len = Math.hypot(TUT_DRAG.x, TUT_DRAG.y);
  if (t > 2.3) return;
  if (pressed) {
    const n = Math.max(1, Math.floor(Math.hypot(cx - x0, cy - y0) / 3));   // rubber band from the press point
    for (let i = 0; i <= n; i++) R(Math.round(x0 + (cx - x0) * i / n), Math.round(y0 + (cy - y0) * i / n), 1, 1, PAL.silver);
    box(x0 - 2, y0 - 2, 5, 5, PAL.white);
    if (t < 0.65) outline(x0 - 4, y0 - 4, 9, 9, PAL.yellow);            // the click
    const ax = -TUT_DRAG.x / len, ay = -TUT_DRAG.y / len;                // aim: away from the drag
    for (let d = 13; d <= 13 + 30 * e; d += 4) {
      const qx = Math.round(sx + ax * d), qy = Math.round(sy + ay * d);
      R(qx - 1, qy - 1, 3, 3, PAL.ink); R(qx, qy, 1, 1, PAL.yellow);
    }
  } else if (t >= 1.9) {                                                  // let go: a little burst where the shot goes
    const bx = Math.round(sx - TUT_DRAG.x / len * 70), by = Math.round(sy - TUT_DRAG.y / len * 70);
    R(bx - 3, by, 7, 1, PAL.yellow); R(bx, by - 3, 1, 7, PAL.yellow); R(bx - 2, by - 2, 1, 1, PAL.cream); R(bx + 2, by + 2, 1, 1, PAL.cream);
    drawText('GO!', bx + 5, by - 8, 1, PAL.yellow);
  }
  drawCursor(cx, cy);
  if (pressed) drawText('DRAG', cx + 9, cy + 3, 1, PAL.cream);
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
  drawTextC('ESC OR P TO RESUME', LOW_W / 2, 163, 1, PAL.silver);
}

// Everything drawn over the world, by game state.
function drawOverlay(game, input, camX, camY) {
  if (game.state === 'intro') drawIntro(game, camX, camY);
  else if (game.state === 'play' || game.state === 'winning') {
    if (game.state === 'play') { drawChecklist(); drawGhostShot(game, input, camX, camY); }
    drawHud(game, input);                                                // after the checklist: taunts sit on top of it
  }
  else if (game.state === 'paused') { drawHud(game, input); drawPause(input); }
  else if (game.state === 'won') drawWin(game, input);
}
