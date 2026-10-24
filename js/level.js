// level.js - level data only. To change the level, edit the lists below and refresh.
// Everything here is in TILES (16 x 16 art pixels, TILE_PX world px), so platforms always line up with the
// tile art. The level is 29 tiles wide (the camera scrolls sideways) and 89 tall. col goes right, row goes DOWN.
// plat(col, row, width, surface, options) makes a ledge whose top is at that row, half a tile thick (LEDGE_TILES).
//   surface is one of the five materials in SURFACES (plastic, ceramic, wet, seat, towel), or 'wall'.
//   options.push = sideways push in px/s^2 (+ right, - left), for a slope.
//   options.h    = thickness in tiles (default LEDGE_TILES; whole tiles for pillars and walls).
// deco(kind, col, row, options) is scenery with no collision: col = centre (halves are fine), row = the
// surface it stands on. Kinds are drawn in draw.js (drawDeco). options.w / options.h size the big background
// props in tiles, options.text is the text on a sign (or the material on a 'material' board),
// options.wall = true hangs the sign on the wall (no post).
// The soap is 1 tile wide and 3/4 of a tile tall. Every side of every platform ricochets.
// The layout follows the team's sketches (level1-2 to level4-5): 1 tile = 32 px of the drawings.

function plat(col, row, w, surface, o) {
  o = o || {};
  return { x: col * TILE_PX, y: row * TILE_PX, w: w * TILE_PX, h: (o.h || LEDGE_TILES) * TILE_PX, surface: surface, push: o.push || 0 };
}
function deco(kind, col, row, o) {
  o = o || {};
  return { kind: kind, x: col * TILE_PX, y: row * TILE_PX, w: (o.w || 0) * TILE_PX, h: (o.h || 0) * TILE_PX, text: o.text || '', wall: !!o.wall };
}
function at(col, row) { return { x: col * TILE_PX, y: row * TILE_PX }; }

const LEVEL = {
  // soap start: centre and bottom (inside the dustbin)
  start: at(4, 88),

  // Zones from the bottom up. top/bottom are world y. There are no checkpoints. A drop taller than the zone
  // it started in is a fall: the soap flops (see onLand in soap.js).
  // One new material per zone: plastic, ceramic, wet and toilet seat, towel, then ceramic and wet mixed.
  // spawn = where the debug keys 1 to 5 put the soap (centre, bottom).
  // bg = wall colours, dusk at the bottom to dawn at the top: upper band, lower band, light line, props.
  zones: [
    { name: 'Dustbin',     top: 70 * TILE_PX, bottom: 89 * TILE_PX, spawn: at(4, 88),     bg: ['#7f76a3', '#6f6694', '#9d95c2', '#5e5582'] },
    { name: 'Floor tiles', top: 54 * TILE_PX, bottom: 70 * TILE_PX, spawn: at(16, 67),    bg: ['#7cc4a4', '#6ab394', '#a2dcc0', '#589c80'] },
    { name: 'Toilet',      top: 34 * TILE_PX, bottom: 54 * TILE_PX, spawn: at(15.5, 52),  bg: ['#a48fc9', '#9480bb', '#c2b0e0', '#7d6aa6'] },
    { name: 'Towel rack',  top: 18 * TILE_PX, bottom: 34 * TILE_PX, spawn: at(11, 32),    bg: ['#7d97dc', '#6c84cc', '#a3b8ee', '#5a70b8'] },
    { name: 'Sink',        top: 0,            bottom: 18 * TILE_PX, spawn: at(15.5, 16),  bg: ['#c4a9de', '#b597d2', '#e2cdf0', '#9a7fbd'] },
  ],

  blocks: [
    // ---- Zone 1: dustbin. PLASTIC (2 bars). (rows 70 to 88) ----
    plat(0, 88, 29, 'plastic', { h: 1 }),   // floor (the bin is between the first two pillars)
    plat(1, 84, 1, 'plastic', { h: 4 }),   // bin wall, left
    plat(6, 84, 1, 'plastic', { h: 4 }),   // bin wall, right
    plat(11, 86, 1, 'plastic', { h: 2 }),   // pillar
    plat(16, 83, 1, 'plastic', { h: 5 }),   // pillar
    plat(20, 86, 1, 'plastic', { h: 2 }),   // pillar
    plat(23, 81, 1, 'plastic', { h: 7 }),   // pillar
    plat(28, 84, 1, 'plastic', { h: 4 }),   // pillar
    plat(16, 79, 5, 'plastic'),
    plat(10, 76, 3, 'plastic'),
    plat(23, 76, 1, 'plastic'),
    plat(6, 74, 1, 'plastic'),
    plat(1, 71, 3, 'plastic'),
    plat(10, 71, 3, 'plastic'),
    plat(24, 72, 3, 'plastic'),

    // ---- Zone 2: bathroom floor. CERAMIC (3 bars). (rows 54 to 69) ----
    plat(4, 66, 2, 'ceramic'),
    plat(5, 65, 1, 'ceramic', { h: 1 }),   // wall on the right end
    plat(10, 65, 2, 'ceramic'),
    plat(15, 67, 2, 'ceramic'),
    plat(21, 66, 3, 'ceramic'),
    plat(23, 64, 1, 'ceramic', { h: 2 }),   // wall on the right end
    plat(27, 67, 1, 'ceramic'),
    plat(3, 61, 2, 'ceramic'),
    plat(8, 62, 2, 'ceramic'),
    plat(8, 61, 1, 'ceramic', { h: 1 }),   // wall on the left end
    plat(15, 62, 3, 'ceramic'),
    plat(17, 60, 1, 'ceramic', { h: 2 }),   // wall on the right end
    plat(26, 61, 1, 'ceramic'),
    plat(1, 58, 1, 'ceramic'),
    plat(9, 57, 1, 'ceramic', { h: 1 }),   // pillar
    plat(11, 59, 2, 'ceramic'),
    plat(21, 60, 3, 'ceramic'),
    plat(21, 58, 1, 'ceramic', { h: 2 }),   // wall on the left end
    plat(4, 56, 2, 'ceramic'),
    plat(4, 55, 1, 'ceramic', { h: 1 }),   // wall on the left end
    plat(11, 55, 2, 'ceramic'),
    plat(17, 55, 1, 'ceramic', { h: 2 }),   // pillar
    plat(23, 56, 2, 'ceramic'),

    // ---- Zone 3: toilet. WET (5 bars) and TOILET SEAT (2.5 bars). (rows 34 to 53) ----
    plat(14, 52, 3, 'wet'),
    plat(20, 52, 2, 'wet'),
    plat(7, 51, 2, 'seat'),
    plat(9, 51, 2, 'wet'),
    plat(18, 49, 1, 'seat'),
    plat(26, 50, 1, 'seat'),
    plat(1, 48, 1, 'seat'),
    plat(2, 48, 2, 'wet'),
    plat(0, 45, 2, 'wet'),
    plat(12, 45, 1, 'seat', { h: 2 }),   // wall
    plat(13, 47, 3, 'wet'),
    plat(22, 46, 3, 'wet'),
    plat(25, 44, 1, 'seat', { h: 3 }),   // wall
    plat(28, 46, 1, 'seat'),
    plat(6, 42, 1, 'wet', { h: 2 }),   // toilet bowl, left side
    plat(7, 44, 2, 'seat'),   // toilet bowl, bottom
    plat(9, 42, 1, 'wet', { h: 2 }),   // toilet bowl, right side
    plat(22, 41, 2, 'wet'),
    plat(12, 40, 3, 'seat'),
    plat(18, 38, 2, 'seat'),
    plat(14, 35, 3, 'seat'),
    plat(21, 35, 3, 'seat'),

    // ---- Zone 4: towel rack. TOWEL (1 bar), with wet. (rows 18 to 33) ----
    plat(10, 32, 2, 'towel'),
    plat(18, 32, 1, 'towel'),
    plat(25, 31, 2, 'towel'),
    plat(6, 30, 2, 'towel'),
    plat(14, 29, 2, 'towel'),
    plat(22, 29, 2, 'towel'),
    plat(9, 27, 1, 'towel'),
    plat(2, 26, 2, 'towel'),
    plat(26, 26, 1, 'towel'),
    plat(14, 24, 1, 'towel'),
    plat(0, 23, 1, 'towel'),
    plat(7, 23, 1, 'towel'),
    plat(17, 23, 1, 'towel'),
    plat(21, 22, 2, 'towel'),
    plat(23, 22, 1, 'wet'),
    plat(2, 20, 2, 'wet'),
    plat(4, 20, 1, 'towel'),
    plat(9, 19, 2, 'towel'),
    plat(19, 19, 2, 'towel'),

    // ---- Zone 5: sink. CERAMIC and WET. (rows 0 to 17) ----
    plat(14, 16, 3, 'ceramic'),
    plat(9, 14, 2, 'ceramic'),
    plat(9, 13, 1, 'ceramic', { h: 1 }),   // wall on the left end
    plat(12, 12, 1, 'ceramic'),
    plat(17, 12, 2, 'ceramic'),
    plat(18, 11, 1, 'ceramic', { h: 1 }),   // wall on the right end
    plat(24, 11, 1, 'ceramic'),
    plat(25, 11, 1, 'wet'),
    plat(28, 8, 1, 'wet'),
    plat(22, 7, 2, 'wet'),
    plat(17, 6, 3, 'wet'),
    plat(11, 5, 3, 'wet'),
    plat(2, 4, 1, 'ceramic', { h: 2 }),   // sink: left lip
    plat(3, 5, 5, 'ceramic', { h: 1 }),   //   basin: slide in over the right lip and into the pump soap
    plat(8, 4, 1, 'ceramic', { h: 2 }),   //   right lip
    plat(0, 0, 29, 'wall'),                 // ceiling
  ],

  // Scenery, drawn behind the soap. A little board marks where each new material first turns up.
  decor: [
    deco('bin', 4, 88, { w: 4, h: 4 }), deco('paperball', 8.5, 88), deco('paperball', 13.5, 88),
    deco('plant', 25.5, 88), deco('peel', 18, 88),
    deco('sign', 6, 81.9, { text: 'SLIPPERY? ESC = MANUAL', wall: true }),
    deco('material', 6, 83.3, { text: 'plastic' }),

    deco('material', 13, 69.6, { text: 'ceramic' }),

    deco('material', 17, 53.7, { text: 'wet' }), deco('material', 5, 53.7, { text: 'seat' }),
    deco('lid', 7.5, 42, { w: 3, h: 3 }),

    deco('material', 14, 33.8, { text: 'towel' }),
    deco('window', 26.5, 25, { w: 4, h: 4 }),

    deco('toothbrush', 15, 16), deco('tap', 8.3, 4), deco('lamp', 5, 0.5),
  ],

  // The pump soap stands in the sink basin. Touch it to win: it goes flying (a ragdoll, see knockPump in soap.js).
  pump: { x: 3 * TILE_PX, y: 5 * TILE_PX - 40 * PIXEL, w: 24 * PIXEL, h: 40 * PIXEL },   // 24 x 40 art pixels
  // Intro: the pump soap starts at pumpIntroX and shoves the soap left against the lip at sinkEdge, the soap
  // pops over it out to dropX and falls all the way down into the bin.
  pumpIntroX: 6.5 * TILE_PX,
  sinkEdge: 3 * TILE_PX,
  dropX: 0.5 * TILE_PX,
};

// Builds the list of solid shapes the physics uses: level blocks and world edges.
function buildSolids() {
  const out = [];
  for (const b of LEVEL.blocks) out.push({ x: b.x, y: b.y, w: b.w, h: b.h, surface: b.surface, push: b.push });
  // world edges (bouncy walls)
  out.push({ x: -400, y: -800, w: 400, h: WORLD_H + 1600, surface: 'wall', push: 0 });
  out.push({ x: WORLD_W, y: -800, w: 400, h: WORLD_H + 1600, surface: 'wall', push: 0 });
  out.push({ x: -400, y: -800, w: WORLD_W + 800, h: 800, surface: 'wall', push: 0 });
  return out;
}
