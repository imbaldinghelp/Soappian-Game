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
// The soap is about 1.4 tiles wide and 3/4 of a tile tall. Every side of every platform ricochets.
// Foddian layout: each zone is a staircase that crosses the level, so a missed jump drops past the ledges
// below instead of onto them. Slippery ledges sit under the hard jumps, grippy ones are the reward, and little
// walls on ledge ends stop a slide where the route needs it. Each zone teaches its material, then tests it.
// The old layout (from the team's sketches) is in level.backup.js.

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
    { name: 'Floor tiles', top: 54 * TILE_PX, bottom: 70 * TILE_PX, spawn: at(22, 67),    bg: ['#7cc4a4', '#6ab394', '#a2dcc0', '#589c80'] },
    { name: 'Toilet',      top: 34 * TILE_PX, bottom: 54 * TILE_PX, spawn: at(9, 53),  bg: ['#a48fc9', '#9480bb', '#c2b0e0', '#7d6aa6'] },
    { name: 'Towel rack',  top: 18 * TILE_PX, bottom: 34 * TILE_PX, spawn: at(11.5, 33),    bg: ['#7d97dc', '#6c84cc', '#a3b8ee', '#5a70b8'] },
    { name: 'Sink',        top: 0,            bottom: 18 * TILE_PX, spawn: at(18.5, 16),  bg: ['#c4a9de', '#b597d2', '#e2cdf0', '#9a7fbd'] },
  ],

  blocks: [
    // ---- Zone 1: dustbin. PLASTIC (2 bars). (rows 70 to 88) ----
    // Learn to aim: a staircase to the right, three to four tiles up a step. The floor catches every fall here.
    plat(0, 88, 29, 'plastic', { h: 1 }),   // floor (the bin is between the first two walls)
    plat(1, 84, 1, 'plastic', { h: 4 }),    // bin wall, left
    plat(6, 84, 1, 'plastic', { h: 4 }),    // bin wall, right
    plat(17, 86, 1, 'plastic', { h: 2 }),   // pillar
    plat(22, 85, 1, 'plastic', { h: 3 }),   // pillar
    plat(9, 85, 3, 'plastic'),
    plat(14, 82, 3, 'plastic'),
    plat(19, 78, 3, 'plastic'),
    plat(23, 75, 3, 'plastic'),
    plat(26, 71, 3, 'plastic'),             // rest point at the top of the zone

    // ---- Zone 2: bathroom floor. CERAMIC (3 bars). (rows 54 to 69) ----
    // Learn to slide: a staircase back to the left. Little walls stop the first slides; slide off the far
    // left one and it is a long drop back to the bin.
    plat(20, 67, 4, 'ceramic'),
    plat(20, 66, 1, 'ceramic', { h: 1 }),   // wall on the left end
    plat(12, 64, 5, 'ceramic'),
    plat(8, 61, 3, 'ceramic'),
    plat(1, 57, 5, 'ceramic'),
    plat(1, 56, 1, 'ceramic', { h: 1 }),    // wall on the left end

    // ---- Zone 3: toilet. WET (5 bars) and TOILET SEAT (2.5 bars). (rows 34 to 53) ----
    // Wet slides almost forever: land where it runs into seat, into a wall, or into the toilet bowl.
    plat(7, 53, 4, 'seat'),                 // rest point at the bottom of the zone
    plat(13, 50, 2, 'wet'), plat(15, 50, 3, 'seat'),
    plat(21, 47, 3, 'seat'),
    plat(25, 42, 1, 'seat', { h: 1 }),      // wet trough against the wall: hop over the lip
    plat(26, 43, 3, 'wet'),
    plat(21, 38, 1, 'wet', { h: 1 }),       // toilet bowl, left side
    plat(22, 39, 3, 'seat'),                // toilet bowl, bottom
    plat(25, 38, 1, 'wet', { h: 1 }),       // toilet bowl, right side
    plat(16, 36, 3, 'seat'),

    // ---- Zone 4: towel rack. TOWEL (1 bar), with wet. (rows 18 to 33) ----
    // Towel grips, so the ledges are small and far apart. Then a long leap back to the left.
    plat(10, 33, 3, 'towel'),
    plat(16, 30, 2, 'towel'),
    plat(21, 27, 2, 'towel'),
    plat(24, 23, 2, 'wet'), plat(26, 23, 2, 'towel'),   // land on the wet end, slide onto the towel
    plat(18, 20, 2, 'towel'),
    plat(11, 18, 3, 'towel'),
    plat(4, 21, 3, 'towel'),               // rest point: catches a missed jump at the sink, hop back to the right

    // ---- Zone 5: sink. CERAMIC and WET. (rows 0 to 17) ----
    // Up the right side, a long leap onto a wet runway, then over the sink's lip.
    plat(17, 16, 3, 'ceramic'),
    plat(23, 13, 3, 'ceramic'),
    plat(26, 9, 3, 'ceramic'),
    plat(18, 6, 2, 'wet'), plat(15, 6, 3, 'ceramic'),   // wet runway onto ceramic
    plat(15, 5, 1, 'ceramic', { h: 1 }),    // wall on the left end
    plat(2, 4, 1, 'ceramic', { h: 2 }),     // sink: left lip
    plat(3, 5, 5, 'ceramic', { h: 1 }),     //   basin: slide in over the right lip and into the pump soap
    plat(8, 4, 1, 'ceramic', { h: 2 }),     //   right lip
    plat(0, 0, 29, 'wall'),                 // ceiling
  ],

  // Scenery, drawn behind the soap. A little board marks where each new material first turns up.
  decor: [
    deco('bin', 4, 88, { w: 4, h: 4 }), deco('paperball', 8.5, 88), deco('paperball', 13.5, 88),
    deco('plant', 25.5, 88), deco('peel', 18, 88),
    deco('sign', 6, 81.9, { text: 'SURFACE MANUAL: PRESS ESC', wall: true }),
    deco('material', 6, 83.3, { text: 'plastic' }),

    deco('material', 21.5, 69.6, { text: 'ceramic' }),

    deco('material', 17, 53.7, { text: 'wet' }), deco('material', 3.5, 53.7, { text: 'seat' }),
    deco('lid', 23.5, 39, { w: 3, h: 3 }),

    deco('material', 17, 33.8, { text: 'towel' }),
    deco('window', 5, 27, { w: 4, h: 4 }),

    deco('toothbrush', 17.5, 16), deco('tap', 8.3, 4), deco('lamp', 5, 0.5),
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
