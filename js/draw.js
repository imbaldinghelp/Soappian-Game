// draw.js - the world, drawn in soft 8-bit style. The game is drawn straight onto the page canvas at
// LOW_W x LOW_H (320 x 180) pixels, and main.js shows it SCALE times bigger with hard pixel edges. Flat pixel shapes by default; set USE_ART
// in config.js to use Aaron's PNGs from the assets folder (missing files fall back to shapes).
// Menus, HUD and the intro live in screens.js; this file draws the level, the soap, the pump and effects.

const low = document.getElementById('game');
low.width = LOW_W;
low.height = LOW_H;
const L = low.getContext('2d');
L.imageSmoothingEnabled = false;

const IMAGES = {};
const PATTERNS = {};

function loadArt() {
  if (!USE_ART) return;
  Object.keys(ART).forEach(function (k) {
    const im = new Image();
    im.onload = function () { IMAGES[k] = im; };
    im.src = ART[k];
  });
}

// ---------- tiny helpers (all in art pixels) ----------
function px(worldValue) { return Math.round(worldValue / PIXEL); }          // world px -> art pixel
function R(x, y, w, h, c) { L.fillStyle = c; L.fillRect(x, y, w, h); }       // filled rectangle
function box(x, y, w, h, fill) { R(x, y, w, h, PAL.ink); R(x + 1, y + 1, w - 2, h - 2, fill); }   // 1 px outline + fill
function outline(x, y, w, h, c) { R(x, y, w, 1, c); R(x, y + h - 1, w, 1, c); R(x, y, 1, h, c); R(x + w - 1, y, 1, h, c); }
function roundBox(x, y, w, h, fill) {                                         // rounded rectangle with a 1 px outline
  rr(x - 1, y - 1, w + 2, h + 2, PAL.ink);
  rr(x, y, w, h, fill);
}
function rr(x, y, w, h, c) {                                                  // rounded rectangle, 2 px corners
  L.fillStyle = c;
  L.fillRect(x + 2, y, w - 4, 1);
  L.fillRect(x + 1, y + 1, w - 2, 1);
  L.fillRect(x, y + 2, w, h - 4);
  L.fillRect(x + 1, y + h - 2, w - 2, 1);
  L.fillRect(x + 2, y + h - 1, w - 4, 1);
}
function now() { return performance.now() / 1000; }

function fmtTime(t) {
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return m + ':' + (s < 10 ? '0' : '') + s;
}

// Unit launch direction for the current drag (opposite to the drag), or null if too short.
function aimDirection(input) {
  const dx = input.x - input.ox, dy = input.y - input.oy;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < AIM_MIN_DRAG) return null;
  return { x: -dx / len, y: -dy / len, len: len };
}

// ---------- pixel font: 5 x 7, capitals, digits and a little punctuation ----------
const FONT = {};
(function () {
  const data = {
    'A': '0E 11 11 1F 11 11 11', 'B': '1E 11 11 1E 11 11 1E', 'C': '0E 11 10 10 10 11 0E', 'D': '1E 11 11 11 11 11 1E',
    'E': '1F 10 10 1E 10 10 1F', 'F': '1F 10 10 1E 10 10 10', 'G': '0E 11 10 17 11 11 0F', 'H': '11 11 11 1F 11 11 11',
    'I': '0E 04 04 04 04 04 0E', 'J': '07 02 02 02 02 12 0C', 'K': '11 12 14 18 14 12 11', 'L': '10 10 10 10 10 10 1F',
    'M': '11 1B 15 15 11 11 11', 'N': '11 11 19 15 13 11 11', 'O': '0E 11 11 11 11 11 0E', 'P': '1E 11 11 1E 10 10 10',
    'Q': '0E 11 11 11 15 12 0D', 'R': '1E 11 11 1E 14 12 11', 'S': '0F 10 10 0E 01 01 1E', 'T': '1F 04 04 04 04 04 04',
    'U': '11 11 11 11 11 11 0E', 'V': '11 11 11 11 11 0A 04', 'W': '11 11 11 15 15 15 0A', 'X': '11 11 0A 04 0A 11 11',
    'Y': '11 11 0A 04 04 04 04', 'Z': '1F 01 02 04 08 10 1F',
    '0': '0E 11 13 15 19 11 0E', '1': '04 0C 04 04 04 04 0E', '2': '0E 11 01 02 04 08 1F', '3': '1F 02 04 02 01 11 0E',
    '4': '02 06 0A 12 1F 02 02', '5': '1F 10 1E 01 01 11 0E', '6': '06 08 10 1E 11 11 0E', '7': '1F 01 02 04 08 08 08',
    '8': '0E 11 11 0E 11 11 0E', '9': '0E 11 11 0F 01 02 0C',
    '.': '00 00 00 00 00 0C 0C', ',': '00 00 00 00 0C 04 08', '!': '04 04 04 04 04 00 04', '?': '0E 11 01 02 04 00 04',
    ':': '00 0C 0C 00 0C 0C 00', "'": '0C 04 08 00 00 00 00', '-': '00 00 00 1F 00 00 00', '/': '01 01 02 04 08 10 10',
    '(': '02 04 08 08 08 04 02', ')': '08 04 02 02 02 04 08', '+': '00 04 04 1F 04 04 00', '%': '18 19 02 04 08 13 03',
    '^': '04 0E 15 04 04 04 04', '=': '00 00 1F 00 1F 00 00', '>': '08 04 02 01 02 04 08', '<': '02 04 08 10 08 04 02',
    ' ': '00 00 00 00 00 00 00',
  };
  Object.keys(data).forEach(function (k) { FONT[k] = data[k].split(' ').map(function (h) { return parseInt(h, 16); }); });
})();

function textWidth(str, size) { return str.length * 6 * size - size; }

// Draws text with its top-left at (x, y). Capitals only. A 1 px drop shadow keeps it readable.
function drawText(str, x, y, size, color, noShadow) {
  str = String(str).toUpperCase();
  for (let pass = noShadow ? 1 : 0; pass < 2; pass++) {
    L.fillStyle = pass === 0 ? PAL.ink : color;
    const ox = pass === 0 ? size : 0, oy = pass === 0 ? size : 0;
    for (let i = 0; i < str.length; i++) {
      const g = FONT[str[i]] || FONT['?'];
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 5; c++) {
          if (g[r] & (16 >> c)) L.fillRect(x + ox + (i * 6 + c) * size, y + oy + r * size, size, size);
        }
      }
    }
  }
}
function drawTextC(str, cx, y, size, color, noShadow) { drawText(str, Math.round(cx - textWidth(String(str), size) / 2), y, size, color, noShadow); }

// ---------- patterns (cached, anchored to the world so tiles do not swim) ----------
function patternOf(key, w, h, paint) {
  if (!PATTERNS[key]) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    paint(g, function (x, y, pw, ph, col) { g.fillStyle = col; g.fillRect(x, y, pw, ph); });
    PATTERNS[key] = L.createPattern(c, 'repeat');
  }
  return PATTERNS[key];
}
function fillPat(pat, x, y, w, h) { L.fillStyle = pat; L.fillRect(x, y, w, h); }

// ---------- platforms: soft 8-bit ground. A tinted edge, a cap on top, a body with gentle bands ----------
// The body texture is a pattern anchored to the world, so neighbouring blocks line up.
function bodyPattern(surface) {                         // one 16 x 16 tile, so it lines up with the level grid
  const sf = SURFACES[surface];
  return patternOf('body' + surface, TILE, TILE, function (g, f) {
    f(0, 0, 16, 16, sf.body);
    f(0, 10, 16, 2, sf.band);                           // soft horizontal band
    f(15, 5, 1, 11, sf.band);                           // a faint seam between tiles
    f(4, 3, 2, 2, sf.band); f(11, 14, 1, 1, sf.cap);    // a few speckles
  });
}

function chevron(x, y, dir, c) {                        // a little < or > made of 5 pixels
  const pts = dir < 0 ? [[2, 0], [1, 1], [0, 2], [1, 3], [2, 4]] : [[0, 0], [1, 1], [2, 2], [1, 3], [0, 4]];
  L.fillStyle = c;
  pts.forEach(function (p) { L.fillRect(x + p[0], y + p[1], 1, 1); });
}

function drawBlock(b) {
  const x0 = px(b.x), y0 = px(b.y), x1 = px(b.x + b.w), y1 = px(b.y + b.h);
  const w = x1 - x0, h = y1 - y0;
  const sf = SURFACES[b.surface];
  const img = IMAGES[b.surface];
  if (img) {
    if (!PATTERNS['art' + b.surface]) PATTERNS['art' + b.surface] = L.createPattern(img, 'repeat');
    fillPat(PATTERNS['art' + b.surface], x0, y0, w, h);
    return;
  }
  R(x0, y0, w, h, sf.edge);
  const x = x0 + 1, y = y0 + 1, iw = w - 2, ih = h - 2;
  if (iw <= 0 || ih <= 0) return;
  if (iw < ih && iw <= 4) {                             // thin upright post (dish lips): just shaded
    R(x, y, iw, ih, sf.body); R(x, y, 1, ih, sf.light);
    return;
  }
  fillPat(bodyPattern(b.surface), x, y, iw, ih);
  const capH = ih >= 8 ? 3 : ih >= 4 ? 2 : 1;           // the cap, like grass on a ledge
  R(x, y, iw, 1, sf.light);
  if (capH > 1) R(x, y + 1, iw, capH - 1, sf.cap);
  if (ih > capH + 1) R(x, y + capH, iw, 1, sf.band);

  // Reading the surface: grippy tops are fuzzy (little tufts), slippery tops are shiny (dashes and a glint).
  if (b.surface === 'wall') {                           // rubber bumper: two bolts
    if (iw > 3 && ih > 3) { R(x + 1, y + 2, 1, 1, sf.light); R(x + iw - 2, y + ih - 2, 1, 1, sf.band); }
  } else if (sf.friction >= GRIP_FRICTION) {
    for (let i = 1 + (x0 % 3); i < iw - 1; i += 4) { R(x + i, y0 - 1, 2, 1, sf.edge); R(x + i, y0, 2, 1, sf.cap); }
  } else if (iw > 6) {
    for (let i = 2 + (x0 % 5); i < iw - 4; i += 9) R(x + i, y + 1, 4, 1, sf.light);
    const g = Math.floor((now() * 40 + x0 * 7) % (iw + 60)) - 30;     // a glint sliding along now and then
    if (g >= 0 && g < iw - 2) { R(x + g, y, 3, 2, '#ffffff'); R(x + g + 1, y0 - 1, 1, 1, '#ffffff'); }
  }

  if (b.surface === 'towel' && ih > 12) {               // hanging towel: a stripe and a little fringe
    R(x, y1 - 6, iw, 1, sf.light);
    for (let i = 1; i < iw; i += 2) R(x + i, y1, 1, 1, sf.body);
  } else if (b.surface === 'wet') {                     // a couple of soft drips
    for (let i = 5 + (x0 % 13); i < iw - 2; i += 23) R(x + i, y1, 1, 1, sf.cap);
  } else if (b.surface === 'mirror' && ih > 8) {        // glass shine
    for (let d = 0; d < Math.min(ih - 4, iw - 8); d++) R(x + 4 + d, y + ih - 2 - d, 1, 1, sf.light);
  }
  if (b.push && h >= 4) {                               // slope: arrows show which way it pushes
    const dir = b.push > 0 ? 1 : -1;
    for (let i = 6; i < w - 6; i += 12) chevron(x0 + i, y0 + Math.floor((h - 5) / 2), dir, sf.band);
  }
}

// ---------- the wall behind each zone: calm colour bands, like a sky ----------
function drawBackground(i, vx0, vy0, vx1, vy1) {
  const z = LEVEL.zones[i];
  const y0 = px(z.top), y1 = px(z.bottom);
  if (y1 < vy0 || y0 > vy1) return;
  const x0 = Math.max(0, vx0), x1 = Math.min(px(WORLD_W), vx1), w = x1 - x0;
  const split = y0 + Math.round((y1 - y0) * 0.5);
  R(x0, y0, w, split - y0, z.bg[0]);
  R(x0, split, w, y1 - split, z.bg[1]);
  R(x0, split, w, 1, z.bg[2]);                                           // soft lines across, like the reference
  R(x0, split + 3, w, 1, z.bg[0]);
  R(x0, y0 + Math.round((y1 - y0) * 0.85), w, 1, z.bg[3]);
  const bg = IMAGES['bg' + i];
  if (bg) {                                                              // backdrop art, repeated down the zone
    L.save(); L.beginPath(); L.rect(0, y0, px(WORLD_W), y1 - y0); L.clip();
    for (let y = y0; y < y1; y += LOW_H) L.drawImage(bg, 0, y);
    L.restore();
  }
}

// A few slow twinkles on the wall (screen space, slower than the world: a little depth).
function drawAmbient(camX, camY) {
  const t = now();
  for (let i = 0; i < 7; i++) {
    const x = ((i * 97 - camX * 0.3) % (LOW_W + 20) + LOW_W + 20) % (LOW_W + 20) - 10;
    const y = ((i * 61 + 20 - camY * 0.3) % (LOW_H + 20) + LOW_H + 20) % (LOW_H + 20) - 10;
    const on = Math.floor(t * 0.8 + i * 0.37) % 3 === 0;
    R(x, y, 2, 2, PAL.cream);
    if (on) { R(x - 1, y, 4, 2, PAL.cream); R(x, y - 1, 2, 4, PAL.cream); R(x, y, 2, 2, PAL.white); }
  }
}

// ---------- scenery (no collision). x = centre, y = the surface it stands on, in art pixels ----------
const DECO = {
  sign: function (x, y, d) {
    const tw = textWidth(d.text, 1), bw = tw + 6, bx = x - Math.round(bw / 2), by = d.wall ? y - 11 : y - 18;
    if (!d.wall) R(x - 1, y - 7, 2, 7, PAL.rust);         // post
    box(bx, by, bw, 11, PAL.taupe);
    R(bx + 1, by + 1, bw - 2, 1, PAL.peach);
    drawText(d.text, bx + 3, by + 2, 1, PAL.ink, true);
  },
  paperball: function (x, y) { box(x - 3, y - 5, 7, 5, PAL.white); R(x - 1, y - 3, 2, 1, PAL.silver); R(x + 1, y - 2, 1, 1, PAL.silver); },
  peel: function (x, y) { R(x - 4, y - 2, 8, 2, PAL.yellow); R(x - 4, y - 3, 2, 1, PAL.yellow); R(x + 2, y - 3, 2, 1, PAL.yellow); R(x - 5, y - 1, 1, 1, PAL.brown); R(x + 4, y - 1, 1, 1, PAL.brown); R(x - 4, y - 1, 8, 1, PAL.orange); },
  plant: function (x, y) {
    box(x - 4, y - 6, 9, 6, PAL.rust); R(x - 3, y - 5, 7, 1, PAL.brown);
    R(x - 1, y - 14, 2, 8, PAL.green); R(x - 5, y - 12, 4, 2, PAL.jade); R(x + 2, y - 11, 4, 2, PAL.jade);
    R(x - 3, y - 16, 2, 3, PAL.lime); R(x + 1, y - 15, 3, 2, PAL.lime); R(x - 6, y - 10, 2, 2, PAL.green);
  },
  bottle: function (x, y) { box(x - 2, y - 9, 5, 9, PAL.coral); R(x - 1, y - 6, 3, 3, PAL.white); R(x - 1, y - 11, 3, 2, PAL.white); },
  lotion: function (x, y) { box(x - 3, y - 10, 7, 10, PAL.jade); R(x - 2, y - 7, 5, 3, PAL.cream); R(x - 1, y - 13, 2, 3, PAL.white); R(x, y - 14, 3, 1, PAL.white); },
  duck: function (x, y) {
    R(x - 4, y - 4, 8, 4, PAL.yellow); R(x, y - 7, 4, 3, PAL.yellow); R(x + 4, y - 6, 2, 1, PAL.orange);
    R(x + 2, y - 6, 1, 1, PAL.ink); R(x - 4, y - 1, 8, 1, PAL.orange); R(x - 5, y - 4, 1, 2, PAL.yellow);
  },
  drip: function (x, y) {                               // a drop that forms, falls and splashes
    const t = (now() * 0.7 + x * 0.013) % 1, fall = Math.max(0, t - 0.4) / 0.6;
    if (fall === 0) R(x, y, 1, 1 + Math.floor(t * 4), PAL.sky);
    else if (fall < 0.9) R(x, y + Math.round(fall * fall * 50), 1, 2, PAL.sky);
  },
  // Big wall props use their zone's colours (d.bg: upper, lower, light line, prop) so they sit back quietly.
  pipe: function (x, y, d) {                            // a drain pipe on the wall
    R(x - 3, y - d.h, 6, d.h, d.bg[3]); R(x - 2, y - d.h, 1, d.h, d.bg[2]);
    for (let j = y - d.h + 6; j < y - 2; j += 18) R(x - 4, j, 8, 2, d.bg[3]);
  },
  tub: function (x, y, d) {                             // bathtub body under the rim
    const x0 = x - Math.round(d.w / 2), top = y - d.h;
    rr(x0, top, d.w, d.h - 4, d.bg[3]);
    R(x0 + 3, top + 2, d.w - 6, 1, d.bg[2]);
    [x0 + 8, x0 + d.w - 14].forEach(function (fx) { R(fx, y - 5, 6, 5, d.bg[3]); });
  },
  bin: function (x, y, d) {                             // inside of the dustbin, between its walls
    const x0 = x - Math.round(d.w / 2), top = y - d.h;
    R(x0, top, d.w, d.h, d.bg[3]);
    R(x0 - 12, top - 2, d.w + 24, 2, SURFACES.plastic.cap);              // rim
    drawTextC('BIN', x, top + 14, 1, d.bg[2], true);
  },
  basin: function (x, y, d) {                           // the sink bowl, behind the basin floor
    const x0 = x - Math.round(d.w / 2), top = y - d.h;
    rr(x0, top, d.w, d.h + 3, d.bg[3]); rr(x0 + 2, top + 1, d.w - 4, d.h + 1, SURFACES.ceramic.band);
    R(x - 2, y - 1, 4, 1, d.bg[3]);                                                             // drain
  },
  lid: function (x, y, d) {                             // toilet lid, raised against the wall
    const x0 = x - Math.round(d.w / 2), top = y - d.h;
    rr(x0, top, d.w, d.h, d.bg[3]); rr(x0 + 4, top + 4, d.w - 8, d.h - 6, d.bg[1]);
  },
  holder: function (x, y) { R(x - 22, y - 7, 3, 4, PAL.silver); R(x - 22, y - 7, 1, 4, PAL.white); R(x - 19, y - 6, 2, 2, PAL.slate); },
  brush: function (x, y) { box(x - 3, y - 7, 7, 7, PAL.white); R(x, y - 14, 1, 7, PAL.silver); box(x - 1, y - 16, 3, 3, PAL.sky); },
  window: function (x, y, d) {                          // night window with the moon and a few stars
    const x0 = x - Math.round(d.w / 2), top = y - d.h, t = now();
    R(x0, top, d.w, d.h, d.bg[2]);
    R(x0 + 2, top + 2, d.w - 4, d.h - 4, PAL.navy);
    R(x0 + 2, top + Math.round(d.h * 0.6), d.w - 4, d.h - 4 - Math.round(d.h * 0.6), PAL.blue);
    rr(x0 + d.w - 20, top + 7, 9, 9, PAL.cream);
    [[7, 9], [16, 24], [30, 13], [11, 38], [44, 30]].forEach(function (s, i) {
      if (s[0] < d.w - 6 && s[1] < d.h - 6) R(x0 + s[0], top + s[1], 1, 1, Math.floor(t + i) % 4 ? PAL.cream : PAL.white);
    });
    R(x0 + Math.round(d.w / 2) - 1, top + 2, 2, d.h - 4, d.bg[2]); R(x0 + 2, top + Math.round(d.h / 2), d.w - 4, 2, d.bg[2]);
    R(x0 - 2, y - 1, d.w + 4, 2, d.bg[2]);
  },
  hook: function (x, y) { R(x - 1, y - 8, 3, 3, PAL.silver); R(x, y - 5, 1, 4, PAL.silver); R(x - 1, y - 2, 1, 1, PAL.silver); },
  bracket: function (x, y) { R(x - 1, y - 3, 3, 9, PAL.ink); R(x, y - 2, 1, 7, PAL.silver); },
  toothbrush: function (x, y) {
    R(x - 3, y - 9, 1, 9, PAL.sky); R(x - 4, y - 11, 3, 2, PAL.white);
    R(x + 2, y - 8, 1, 8, PAL.pink); R(x + 1, y - 10, 3, 2, PAL.white);
  },
  tap: function (x, y) {                                // faucet on the counter, spout over the basin
    box(x - 4, y - 6, 8, 6, PAL.silver); box(x - 2, y - 14, 4, 9, PAL.silver);
    box(x - 2, y - 15, 16, 4, PAL.silver); R(x - 1, y - 14, 14, 1, PAL.white); R(x + 11, y - 11, 2, 2, PAL.slate);
    box(x - 5, y - 18, 10, 3, PAL.red);
    const t = (now() * 0.9) % 1;
    if (t > 0.5) R(x + 12, y - 10 + Math.round((t - 0.5) * 30), 1, 2, PAL.sky);
  },
  lamp: function (x, y) {                               // light hanging from the ceiling, with a glow
    R(x, y, 1, 4, PAL.slate);
    R(x - 6, y + 10, 13, 2, PAL.cream);
    box(x - 4, y + 4, 9, 6, PAL.yellow); R(x - 3, y + 5, 7, 1, PAL.cream);
  },
};

// Big props on the wall are drawn before the platforms; small ones stand on the platforms, in front.
const BACK_DECO = { tub: true, window: true, lid: true, pipe: true, bin: true, basin: true };

function drawDeco(d, vx0, vy0, vx1, vy1) {
  const x = px(d.x), y = px(d.y);
  const rw = Math.max(40, px(d.w)), rh = Math.max(40, px(d.h));
  if (x + rw < vx0 || x - rw > vx1 || y < vy0 || y - rh > vy1) return;
  DECO[d.kind](x, y, { w: px(d.w), h: px(d.h), text: d.text, wall: d.wall, bg: LEVEL.zones[zoneIndex(d.y - 1)].bg });
}

// ---------- the pump soap ----------
// mood: 'smug' (default), 'push' (gritted, angry brows), 'talk' (mouth open)
function drawPumpSprite(x, y, mood) {                                    // 24 x 40 pixels, top-left at (x, y)
  box(x + 4, y + 1, 13, 5, PAL.white);            // pump head
  box(x + 16, y + 2, 8, 4, PAL.white);            // nozzle
  box(x + 8, y + 5, 6, 7, PAL.white);             // neck
  box(x + 1, y + 11, 22, 29, PAL.red);            // bottle
  R(x + 2, y + 12, 20, 1, PAL.pink);              // shine
  R(x + 2, y + 35, 20, 4, PAL.plum);              // shade
  R(x + 3, y + 30, 18, 4, PAL.crimson); R(x + 5, y + 31, 4, 1, PAL.white);   // label stripe
  R(x + 5, y + 17, 5, 5, PAL.white); R(x + 14, y + 17, 5, 5, PAL.white);     // eyes
  R(x + 7, y + 18, 2, 3, PAL.ink); R(x + 16, y + 18, 2, 3, PAL.ink);          // pupils
  if (mood === 'push') {                                                       // angry brows
    R(x + 5, y + 14, 2, 1, PAL.ink); R(x + 7, y + 15, 3, 1, PAL.ink);
    R(x + 17, y + 14, 2, 1, PAL.ink); R(x + 14, y + 15, 3, 1, PAL.ink);
  } else { R(x + 5, y + 15, 5, 1, PAL.ink); R(x + 14, y + 15, 5, 1, PAL.ink); } // smug brows
  if (mood === 'talk') { R(x + 10, y + 24, 5, 4, PAL.ink); R(x + 11, y + 27, 3, 1, PAL.pink); }
  else if (mood === 'push') { R(x + 8, y + 25, 8, 3, PAL.white); R(x + 8, y + 26, 8, 1, PAL.ink); }
  else { R(x + 9, y + 26, 7, 1, PAL.ink); R(x + 8, y + 25, 1, 1, PAL.ink); R(x + 16, y + 25, 1, 1, PAL.ink); }   // smirk
}

function drawPump(game) {
  if (game.state === 'won') return;
  const x = px(game.pump.x), y = px(game.pump.y);
  if (game.state === 'winning') {                 // wobble, topple, slide off the counter, down the chute
    const t = game.winT, pw = px(LEVEL.pump.w), ph = px(LEVEL.pump.h), half = ph / 2;
    if (t < 0.3) { drawPumpSprite(x + (Math.floor(t * 30) % 2), y, 'talk'); return; }
    const u = t - 0.3, top = y + ph;              // top = the counter surface under the pump
    const lx0 = x + Math.round((pw - ph) / 2) - 6;                  // lying down, toppled to the left
    let lx = lx0 - Math.round(40 * u + 160 * u * u), ly = top;      // sliding left, faster and faster
    const edge = px(LEVEL.counterEdge);
    if (lx + half < edge) {                        // past the end of the counter: fall
      const tEdge = (-40 + Math.sqrt(1600 + 640 * (lx0 + half - edge))) / 320;
      const f = Math.max(0, u - tEdge);
      lx = edge - half - Math.round(30 * f); ly = top + Math.round(180 * f * f);
    }
    L.save();
    L.translate(lx, ly);
    L.transform(0, -1, 1, 0, 0, 0);               // turned 90 degrees (head to the left), no blur
    drawPumpSprite(0, 0, 'push');
    L.restore();
    return;
  }
  const img = IMAGES.pump;
  if (img) L.drawImage(img, x, y); else drawPumpSprite(x, y, game.pumpMood);   // pumpMood is set by the intro
}

// ---------- the soap ----------
// The soap's look after falls is switched off for now (DIRT_LOOK in config.js).
function shownDirt(game) { return DIRT_LOOK ? dirtOf(game) : 0; }
function soapColor(dirt) { return dirt < 0.25 ? PAL.yellow : dirt < 0.5 ? PAL.orange : dirt < 0.8 ? PAL.brown : PAL.slate; }

// The soap bar, about 24 x 16 pixels with its top-left at (x, y). face: 'smile', 'happy', 'shock', 'angry'
// or 'glum'. (lx, ly) is where the eyes look (-1 to 1). The title screen draws it too.
function drawSoapSprite(x, y, w, h, dirt, face, lx, ly) {
  roundBox(x, y, w, h, soapColor(dirt));
  R(x + 4, y + 1, 6, 1, dirt < 0.5 ? PAL.white : PAL.silver);            // shine
  R(x + 3, y + 2, 2, 1, dirt < 0.5 ? PAL.white : PAL.silver);
  R(x + 2, y + h - 2, w - 4, 1, dirt < 0.25 ? PAL.orange : PAL.brown);   // shade
  const ex = [x + 5, x + w - 9], ey = y + 3;
  const mx = x + Math.floor(w / 2) - 3, my = y + h - 6;
  for (let i = 0; i < 2; i++) {
    if (face === 'happy') { R(ex[i], ey + 3, 1, 1, PAL.ink); R(ex[i] + 1, ey + 2, 2, 1, PAL.ink); R(ex[i] + 3, ey + 3, 1, 1, PAL.ink); continue; }
    R(ex[i], ey, 4, 5, PAL.white);
    if (face === 'shock') R(ex[i] + 1, ey + 1, 2, 3, PAL.ink);
    else R(ex[i] + (lx > 0.3 ? 2 : lx < -0.3 ? 0 : 1), ey + (ly > 0.3 ? 2 : ly < -0.3 ? 0 : 1), 2, 3, PAL.ink);
  }
  if (face === 'angry') {                                                // brows slope down to the middle
    R(ex[0], ey - 2, 2, 1, PAL.ink); R(ex[0] + 2, ey - 1, 2, 1, PAL.ink);
    R(ex[1] + 2, ey - 2, 2, 1, PAL.ink); R(ex[1], ey - 1, 2, 1, PAL.ink);
    R(mx, my + 1, 6, 1, PAL.ink);
  } else if (face === 'shock') { R(mx + 1, my - 1, 4, 3, PAL.ink); }
  else if (face === 'glum') { R(mx, my + 1, 6, 1, PAL.ink); }
  else { R(mx, my, 1, 1, PAL.ink); R(mx + 1, my + 1, 4, 1, PAL.ink); R(mx + 5, my, 1, 1, PAL.ink); }
  if (dirt > 0.25) { R(x + 2, y + h - 4, 2, 2, PAL.brown); R(x + w - 6, y + 2, 2, 2, PAL.brown); }
  if (dirt > 0.6) { R(x + 12, y + h - 4, 2, 1, PAL.slate); }
}

// Returns where the soap was drawn (art pixels, world space) so the UI can sit next to it.
// s.face (set by the intro) can be 'shock', 'angry' or 'happy'; otherwise the face follows the dirt.
function drawSoap(game, aim) {
  const s = game.soap;
  const dirt = shownDirt(game);
  const SW = px(SOAP_W), SH = px(SOAP_H);                                // 24 x 16 art pixels
  const w = SW + Math.round(s.sq * 14), h = SH - Math.round(s.sq * 8);    // squash and stretch
  const cx = px(s.x) + Math.round(SW / 2), bottom = px(s.y + s.h);
  const x = cx - Math.round(w / 2), y = bottom - h;
  const img = IMAGES.soap;
  if (img) {
    L.drawImage(img, x, bottom - SH);
    return { x: px(s.x), y: bottom - SH, w: SW, h: SH };
  }
  let lx = 0, ly = 0;                                                    // eyes look where the soap aims or goes
  if (aim) { lx = aim.x; ly = aim.y; }
  else { const sp = Math.sqrt(s.vx * s.vx + s.vy * s.vy); if (sp > 30) { lx = s.vx / sp; ly = s.vy / sp; } }
  drawSoapSprite(x, y, w, h, dirt, s.face || (dirt > 0.5 ? 'glum' : 'smile'), lx, ly);
  return { x: x, y: y, w: w, h: h };
}

// ---------- effects: particles in world px, and screen shake ----------
const FX = { parts: [], shake: 0, trailT: 0, wind: 0 };   // wind: 0 to 1, how hard the soap is free falling

// kind: 'bubble' (floats up), 'dust' (puffs out), 'drop' (splashes and falls), 'spark' (twinkles in place)
function fxBurst(kind, x, y, n, color) {
  for (let i = 0; i < n && FX.parts.length < 300; i++) {
    const a = Math.random() * Math.PI * 2, sp = Math.random();
    const p = { kind: kind, x: x, y: y, vx: 0, vy: 0, t: 0, life: 0.5, c: color || PAL.white };
    if (kind === 'bubble') { p.x += (Math.random() - 0.5) * 60; p.vx = (Math.random() - 0.5) * 60; p.vy = -60 - sp * 100; p.life = 0.7 + sp * 0.8; p.big = Math.random() < 0.4; }
    else if (kind === 'dust') { p.vx = (Math.random() - 0.5) * 360; p.vy = -40 - sp * 80; p.life = 0.3 + sp * 0.3; }
    else if (kind === 'drop') { p.vx = (Math.random() - 0.5) * 300; p.vy = -200 - sp * 250; p.life = 0.6; }
    else { p.x += Math.cos(a) * sp * 40; p.y += Math.sin(a) * sp * 40; p.life = 0.4 + sp * 0.5; }
    FX.parts.push(p);
  }
}
function fxShake(t) { FX.shake = Math.max(FX.shake, t); }

function fxUpdate(game, dt) {
  FX.shake = Math.max(0, FX.shake - dt);
  const s0 = game.soap, falling = (game.state === 'play' || game.state === 'intro') && !s0.ground;
  const target = falling ? Math.max(0, Math.min(1, (s0.vy - WIND_START) / (WIND_FULL - WIND_START))) : 0;
  FX.wind += (target - FX.wind) * (1 - Math.exp(-(target > FX.wind ? 12 : 9) * dt));
  for (let i = FX.parts.length - 1; i >= 0; i--) {
    const p = FX.parts[i];
    p.t += dt;
    if (p.t >= p.life) { FX.parts.splice(i, 1); continue; }
    if (p.kind === 'drop') p.vy += GRAVITY * 0.6 * dt;
    if (p.kind === 'dust') { p.vx *= Math.exp(-6 * dt); p.vy *= Math.exp(-4 * dt); }
    if (p.kind === 'bubble') p.vx = Math.sin((p.t + i) * 6) * 30;
    p.x += p.vx * dt; p.y += p.vy * dt;
  }
  const s = game.soap;                                   // a trail of bubbles behind a fast soap
  if ((game.state === 'play' || game.state === 'intro') && !s.ground && Math.abs(s.vx) + Math.abs(s.vy) > 400) {
    FX.trailT += dt;
    if (FX.trailT > 0.05) { FX.trailT = 0; fxBurst('bubble', s.x + s.w / 2, s.y + s.h / 2, 1, PAL.white); }
  }
}

function fxDraw() {
  for (const p of FX.parts) {
    const x = px(p.x), y = px(p.y), k = p.t / p.life;
    if (p.kind === 'bubble') {
      if (p.big && k < 0.85) { R(x, y - 1, 1, 1, p.c); R(x - 1, y, 1, 1, p.c); R(x + 1, y, 1, 1, p.c); R(x, y + 1, 1, 1, p.c); }
      else if (k < 0.92) R(x, y, 1, 1, p.c);
      else { R(x - 1, y - 1, 1, 1, p.c); R(x + 1, y + 1, 1, 1, p.c); }              // pop
    } else if (p.kind === 'spark') {
      const on = Math.floor(p.t * 12) % 2 === 0;
      R(x, y, 1, 1, PAL.white);
      if (on && k < 0.7) { R(x - 1, y, 3, 1, p.c); R(x, y - 1, 1, 3, p.c); }
    } else if (k < 0.8 || Math.floor(p.t * 20) % 2) R(x, y, 1, 1, p.c);
  }
}

// ---------- the whole world ----------
function drawWorld(game, vx0, vy0, vx1, vy1, aim, camX, camY) {
  for (let i = 0; i < LEVEL.zones.length; i++) drawBackground(i, vx0, vy0, vx1, vy1);
  if (camX !== undefined) {                                // ambient bubbles are screen space (not on the map)
    L.save(); L.setTransform(1, 0, 0, 1, 0, 0); drawAmbient(camX, camY); L.restore();
  }
  for (const d of LEVEL.decor) if (BACK_DECO[d.kind]) drawDeco(d, vx0, vy0, vx1, vy1);

  for (const b of game.solids) {
    const x0 = px(b.x), y0 = px(b.y), x1 = px(b.x + b.w), y1 = px(b.y + b.h);
    if (x1 < vx0 || x0 > vx1 || y1 < vy0 || y0 > vy1) continue;
    if (b.surface === 'wall' && (b.x < 0 || b.x >= WORLD_W || b.y < 0)) continue;   // world edges stay invisible
    if (!b.on) continue;                                   // checkpoint floor not reached yet: not there
    drawBlock(b);
  }
  for (const d of LEVEL.decor) if (!BACK_DECO[d.kind]) drawDeco(d, vx0, vy0, vx1, vy1);
  drawPump(game);
  const sp = drawSoap(game, aim);
  fxDraw();
  return sp;
}

// Free fall: streaks of air rushing up past the screen, more and longer the faster you drop.
function drawWind() {
  const w = FX.wind;
  if (w < 0.03) return;
  const t = now(), n = Math.round(6 + 30 * w), len = Math.round(6 + 26 * w);
  for (let i = 0; i < n; i++) {
    const x = (i * 59 + Math.floor(i / 3) * 17) % LOW_W;
    const y = ((i * 37 - t * (500 + 900 * w) * (0.7 + (i % 4) * 0.15)) % (LOW_H + len) + LOW_H + len) % (LOW_H + len) - len;
    R(x, Math.round(y), 1, len, i % 3 ? PAL.white : PAL.cream);
  }
}

// ---------- gameplay overlays next to the soap ----------
function drawMeter(game, sp) {                              // sp = soap rectangle on screen, in art pixels
  const w = 7, h = 38;
  const x = sp.x + sp.w + 4 + w < LOW_W - 16 ? sp.x + sp.w + 4 : sp.x - 4 - w;
  const y = sp.y + sp.h - h;
  const p = game.meter.p;
  box(x, y, w, h, PAL.deepnavy);
  R(x - 1, y + 1, 1, h - 2, PAL.ink); R(x + w, y + 1, 1, h - 2, PAL.ink);
  const fh = Math.max(1, Math.round((h - 2) * p));
  const c = p < 0.55 ? PAL.lime : p < 0.82 ? PAL.yellow : PAL.red;
  R(x + 1, y + h - 1 - fh, w - 2, fh, c);
  R(x + 1, y + h - 1 - fh, 1, fh, PAL.white);
  for (let k = 1; k < 4; k++) R(x + w - 2, y + Math.round(h * k / 4), 1, 1, PAL.silver);   // ticks
  box(x + 1, y - 3, w - 2, 3, PAL.white);                   // cap: a squeeze bottle
}

// ready = the soap is touching a surface; if not, the dots are dimmed (letting go then waits for touchdown).
function drawAim(input, aim, sx, sy, sp, ready) {
  const ox = input.ox / SCALE_UP, oy = input.oy / SCALE_UP, mx = input.x / SCALE_UP, my = input.y / SCALE_UP;
  const n = Math.max(1, Math.floor(Math.hypot(mx - ox, my - oy) / 3));        // rubber band from the press point
  for (let i = 0; i <= n; i++) R(Math.round(ox + (mx - ox) * i / n), Math.round(oy + (my - oy) * i / n), 1, 1, PAL.silver);
  box(Math.round(ox) - 2, Math.round(oy) - 2, 5, 5, PAL.white);
  if (aim) {                                                                    // short dotted aim line
    const len = 16 + 22 * Math.min(1, (aim.len - AIM_MIN_DRAG) / (AIM_MAX_DRAG - AIM_MIN_DRAG));
    const cx = sx + sp.w / 2, cy = sy + sp.h / 2;
    for (let d = 18; d <= 18 + len; d += 4) {
      const ax = Math.round(cx + aim.x * d), ay = Math.round(cy + aim.y * d);
      R(ax - 1, ay - 1, 3, 3, PAL.ink); R(ax, ay, 1, 1, ready ? PAL.white : PAL.slate);
    }
  }
}

function drawDebug(game, camX, camY) {
  const s = game.soap;
  for (const b of game.solids) {
    const x0 = px(b.x) - camX, y0 = px(b.y) - camY, w = px(b.x + b.w) - px(b.x), h = px(b.y + b.h) - px(b.y);
    if (x0 + w < 0 || x0 > LOW_W || y0 + h < 0 || y0 > LOW_H) continue;
    outline(x0, y0, w, h, b.on ? PAL.lime : PAL.orange);
  }
  outline(px(s.x) - camX, px(s.y) - camY, px(s.x + s.w) - px(s.x), px(s.y + s.h) - px(s.y), PAL.pink);
  const lines = [
    'D OFF  M MAP  R RESTART  1-5 ZONE  SHIFT+CLICK MOVE',
    'POS ' + Math.round(s.x + s.w / 2) + ',' + Math.round(s.y + s.h) + '  SPEED ' + Math.round(s.vx) + ',' + Math.round(s.vy),
    'ON ' + (s.ground ? s.ground.surface + (s.ground.push ? ' PUSH ' + s.ground.push : '') : 'AIR') + '  CAN SHOOT ' + s.canAim + '  ZONE ' + (zoneIndex(s.y + s.h / 2) + 1),
    'METER ' + game.meter.p.toFixed(2) + '  SHOTS ' + game.shots + '  FLOORS ON ' + game.solids.filter(function (b) { return b.floor && b.on; }).length,
  ];
  R(2, 20, 262, 38, PAL.ink);
  lines.forEach(function (l, i) { drawText(l, 4, 22 + i * 9, 1, PAL.lime, true); });
}

// ---------- one whole frame ----------
function drawFrame(game, input, flags) {
  L.setTransform(1, 0, 0, 1, 0, 0);
  R(0, 0, LOW_W, LOW_H, PAL.ink);

  if (game.state === 'title') {
    drawTitle(game, input);
  } else if (flags.map) {                                    // whole level on one screen (press M)
    const sc = LOW_H / px(WORLD_H);
    L.save();
    L.translate(Math.round((LOW_W - px(WORLD_W) * sc) / 2), 0);
    L.scale(sc, sc);
    drawWorld(game, 0, 0, px(WORLD_W), px(WORLD_H), null);
    L.restore();
    drawText('MAP  PRESS M TO CLOSE', 4, 4, 1, PAL.white);
  } else {
    let camX = Math.round(game.cam.x / PIXEL), camY = Math.round(game.cam.y / PIXEL);
    if (FX.shake > 0 || FX.wind > 0.7) { camX += Math.round((Math.random() - 0.5) * 3); camY += Math.round((Math.random() - 0.5) * 3); }
    const aim = input.aiming ? aimDirection(input) : null;
    L.save();
    L.translate(-camX, -camY);
    const sp = drawWorld(game, camX, camY, camX + LOW_W, camY + LOW_H, aim, camX, camY);
    L.restore();

    const sx = sp.x - camX, sy = sp.y - camY;               // soap on screen, art pixels
    if (game.state === 'play' && game.soap.canAim && !input.aiming && Math.floor(now() * 2.8) % 2 === 0) {
      outline(sx - 2, sy - 2, sp.w + 4, sp.h + 4, PAL.white);   // blinking "ready" frame
    }
    if (input.aiming) {
      drawAim(input, aim, sx, sy, sp, game.soap.canAim);
      drawMeter(game, { x: sx, y: sy, w: sp.w, h: sp.h });
    }
    drawWind();
    drawOverlay(game, input, camX, camY);
    if (flags.debug) drawDebug(game, camX, camY);
  }
}

const SCALE_UP = VIEW_W / LOW_W;                             // virtual screen px (input space) per art pixel
