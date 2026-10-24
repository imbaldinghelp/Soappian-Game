// level.js - level data only. To change the level, edit the lists below and refresh.
// Everything here is in TILES (16 x 16 art pixels, TILE_PX world px), so platforms always line up with the
// tile art. The level is 29 tiles wide (the camera scrolls sideways) and 139 tall. col goes right, row goes DOWN.
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
// slide(col0, row0, col1, row1) is a tilted chute from one point to the other (halves are fine): see LEVEL.slides.
function slide(c0, r0, c1, r1) { return { x0: c0 * TILE_PX, y0: r0 * TILE_PX, x1: c1 * TILE_PX, y1: r1 * TILE_PX }; }
function at(col, row) { return { x: col * TILE_PX, y: row * TILE_PX }; }

const LEVEL = {
  // soap start: centre and bottom (inside the dustbin)
  start: at(4, 138),

  // Zones from the bottom up. top/bottom are world y. There are no checkpoints. A drop taller than the zone
  // it started in is a fall: the soap flops (see onLand in soap.js).
  // One new material per zone: plastic, ceramic, wet and toilet seat, towel, then ceramic and wet mixed.
  // spawn = where the debug keys 1 to 5 put the soap (centre, bottom).
  // bg = wall colours, dusk at the bottom to dawn at the top: upper band, lower band, light line, props.
  zones: [
    { name: 'Dustbin',     top: 111 * TILE_PX, bottom: 139 * TILE_PX, spawn: at(4, 138),   bg: ['#7f76a3', '#6f6694', '#9d95c2', '#5e5582'] },
    { name: 'Floor tiles', top: 85 * TILE_PX,  bottom: 111 * TILE_PX, spawn: at(11, 110),  bg: ['#7cc4a4', '#6ab394', '#a2dcc0', '#589c80'] },
    { name: 'Toilet',      top: 53 * TILE_PX,  bottom: 85 * TILE_PX,  spawn: at(13.5, 85), bg: ['#a48fc9', '#9480bb', '#c2b0e0', '#7d6aa6'] },
    { name: 'Towel rack',  top: 28 * TILE_PX,  bottom: 53 * TILE_PX,  spawn: at(4, 52),    bg: ['#7d97dc', '#6c84cc', '#a3b8ee', '#5a70b8'] },
    { name: 'Sink',        top: 0,             bottom: 28 * TILE_PX,  spawn: at(10, 28),   bg: ['#c4a9de', '#b597d2', '#e2cdf0', '#9a7fbd'] },
  ],

  blocks: [
    // ---- Zone 1: dustbin. PLASTIC (2 bars). (rows 111 to 138) ----
    // Learn to aim: a staircase to the right, then back to the left. The floor catches every fall here.
    plat(0, 138, 29, 'plastic', { h: 1 }),  // floor (the bin is between the first two walls)
    plat(1, 134, 1, 'plastic', { h: 4 }),   // bin wall, left
    plat(6, 134, 1, 'plastic', { h: 4 }),   // bin wall, right
    plat(17, 136, 1, 'plastic', { h: 2 }),  // pillar
    plat(22, 135, 1, 'plastic', { h: 3 }),  // pillar
    plat(9, 135, 3, 'plastic'),
    plat(14, 132, 3, 'plastic'),
    plat(19, 128, 3, 'plastic'),
    plat(23, 125, 3, 'plastic'),
    plat(26, 121, 3, 'plastic'),
    plat(20, 118, 3, 'plastic'),
    plat(14, 114, 3, 'plastic'),            // rest point at the top of the zone

    // ---- Zone 2: bathroom floor. CERAMIC (3 bars). (rows 85 to 110) ----
    // Learn to slide: little walls stop the first slides on the way left. Then back right with no walls:
    // slide off up there and it is a long drop.
    plat(9, 110, 4, 'ceramic'),
    plat(9, 109, 1, 'ceramic', { h: 1 }),   // wall on the left end
    plat(3, 107, 4, 'ceramic'),
    plat(3, 106, 1, 'ceramic', { h: 1 }),   // wall on the left end
    plat(7, 103, 3, 'ceramic'),
    plat(13, 99, 3, 'ceramic'),
    plat(19, 96, 3, 'ceramic'),
    plat(24, 92, 4, 'ceramic'),
    plat(18, 89, 3, 'ceramic'),

    // ---- Zone 3: toilet. TOILET SEAT (2.5 bars) and WET (5 bars). (rows 53 to 84) ----
    // Mostly seat, narrow and far apart. Wet slides almost forever: land where it runs into seat or a wall.
    plat(12, 85, 4, 'seat'),                // rest point at the bottom of the zone
    plat(8, 82, 2, 'seat'),
    plat(1, 78, 1, 'wet', { h: 1 }),        // toilet bowl, left side
    plat(2, 79, 4, 'seat'),                 // toilet bowl, bottom
    plat(6, 78, 1, 'wet', { h: 1 }),        // toilet bowl, right side
    plat(9, 76, 2, 'seat'),
    plat(13, 72, 2, 'wet'), plat(15, 72, 3, 'seat'),   // land on the wet end, slide onto the seat
    plat(17, 71, 1, 'seat', { h: 1 }),      // wall on the right end
    plat(21, 68, 2, 'seat'),
    plat(25, 63, 1, 'seat', { h: 1 }),      // wet trough against the wall: hop over the lip
    plat(26, 64, 3, 'wet'),
    plat(20, 61, 2, 'seat'),
    plat(14, 58, 2, 'seat'),
    plat(8, 55, 2, 'seat'),

    // ---- Zone 4: towel rack. TOWEL (1 bar), with wet. (rows 28 to 52) ----
    // Towel grips, so the ledges are short and far apart: right across the level, then back left.
    plat(3, 52, 2, 'towel'),
    plat(8, 49, 1.5, 'towel'),
    plat(13, 46, 1.5, 'towel'),
    plat(18, 43, 1.5, 'towel'),
    plat(22, 40, 2, 'wet'), plat(24, 40, 1.5, 'towel'),   // land on the wet end, slide onto the towel
    plat(27, 36, 1.5, 'towel'),
    plat(21, 33, 1.5, 'towel'),
    plat(15, 30, 1.5, 'towel'),

    // ---- Zone 5: sink. CERAMIC and WET. (rows 0 to 27) ----
    // Zigzag up, a long leap onto a wet runway, then over the sink's lip.
    plat(8, 28, 4, 'ceramic'),              // rest point at the bottom of the zone
    plat(8, 27, 1, 'ceramic', { h: 1 }),    // wall on the left end
    plat(14, 24, 3, 'ceramic'),
    plat(19, 21, 4, 'ceramic'),
    plat(22, 20, 1, 'ceramic', { h: 1 }),   // wall on the right end
    plat(15, 17, 3, 'ceramic'),
    plat(21, 14, 3, 'ceramic'),
    plat(26, 10, 3, 'ceramic'),
    plat(18, 7, 4, 'wet'), plat(15, 7, 3, 'ceramic'),   // wet runway onto ceramic
    plat(15, 6, 1, 'ceramic', { h: 1 }),    // wall on the left end
    plat(3, 5, 5, 'ceramic', { h: 1 }),     // sink basin (open on the left, so the pump soap can fly off)
    plat(8, 4, 1, 'ceramic', { h: 2 }),     //   right lip: hop over it and into the pump soap
    plat(0, 0, 29, 'wall'),                 // ceiling
  ],

  // Slides: yellow chutes in the gaps under the hard jumps. They only catch from above and fling the soap
  // off the low end, so a missed jump does not just drop back onto the ledge it came from.
  slides: [
    slide(22, 122, 19, 124),
    slide(17, 91, 21, 93),
    slide(16, 63, 12, 65),
    slide(19, 64, 23, 66),
    slide(23, 36, 19, 38),
    slide(17, 20, 13, 22),
    slide(24, 11, 20, 13),
  ],

  // Scenery, drawn behind the soap. A little board marks where each new material first turns up.
  decor: [
    deco('bin', 4, 138, { w: 4, h: 4 }), deco('paperball', 8.5, 138), deco('paperball', 13.5, 138),
    deco('plant', 25.5, 138), deco('peel', 18, 138),
    deco('sign', 6, 131.9, { text: 'SURFACE MANUAL: PRESS ESC', wall: true }),
    deco('material', 6, 133.3, { text: 'plastic' }),

    deco('material', 8, 112.6, { text: 'ceramic' }),

    deco('material', 5.5, 86.6, { text: 'seat' }), deco('material', 24.5, 86.6, { text: 'wet' }),
    deco('lid', 4, 79, { w: 3, h: 3 }),

    deco('material', 9, 53.6, { text: 'towel' }),
    deco('window', 24, 48, { w: 4, h: 4 }),

    deco('toothbrush', 16.5, 24), deco('tap', 8.3, 4), deco('lamp', 5, 0.5),
  ],

  // The pump soap stands in the sink basin. Touch it to win: it goes flying (a ragdoll, see knockPump in soap.js).
  pump: { x: 3 * TILE_PX, y: 5 * TILE_PX - 40 * PIXEL, w: 24 * PIXEL, h: 40 * PIXEL },   // 24 x 40 art pixels
  // Intro: the pump soap starts at pumpIntroX and shoves the soap left to sinkEdge (the basin's open left end),
  // the soap pops off it out to dropX and falls all the way down into the bin.
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
