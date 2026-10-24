// level.js - level data only. To change the level, edit the lists below and refresh.
// Everything here is in TILES (16 x 16 art pixels, TILE_PX world px), so platforms always line up with the
// tile art. The level is 20 tiles wide and 120 tall. col goes right, row goes DOWN (row 0 is the top).
// plat(col, row, width, surface, options) makes a ledge whose top is at that row, half a tile thick (LEDGE_TILES).
//   options.push = sideways push in px/s^2 (+ right, - left). A slope: it only holds
//   the soap if the surface friction cancels the push (towel holds, seat and wet do not).
//   options.h    = thickness in tiles (default LEDGE_TILES; whole tiles for boxes, walls and stacked parts).
// deco(kind, col, row, options) is scenery with no collision: col = centre (halves are fine), row = the
// surface it stands on. Kinds are drawn in draw.js (drawDeco). options.w / options.h size the big background
// props in tiles, options.text is the text on a sign, options.wall = true hangs the sign on the wall (no post).
// The soap is 1 tile wide and 3/4 of a tile tall. Every side of every platform ricochets.

function plat(col, row, w, surface, o) {
  o = o || {};
  return { x: col * TILE_PX, y: row * TILE_PX, w: w * TILE_PX, h: (o.h || LEDGE_TILES) * TILE_PX, surface: surface, push: o.push || 0 };
}
function deco(kind, col, row, o) {
  o = o || {};
  return { kind: kind, x: col * TILE_PX, y: row * TILE_PX, w: (o.w || 0) * TILE_PX, h: (o.h || 0) * TILE_PX, text: o.text || '', wall: !!o.wall };
}
function at(col, row) { return { x: col * TILE_PX, y: row * TILE_PX }; }

// Columns 2 to 5 are a clear chute down the left side: the intro drops the soap off the end of the counter,
// down it, into the bin. Keep it clear.
const LEVEL = {
  // soap start: centre and bottom (inside the dustbin, right under the end of the sink counter)
  start: at(3.5, 119),

  // Zones from the bottom up, 24 rows each. top/bottom are world y. There are no checkpoints: a fall can go
  // all the way down. spawn = where the debug keys 1 to 5 put the soap (centre, bottom).
  // bg = wall colours, dusk at the bottom to dawn at the top: upper band, lower band, light line, props.
  zones: [
    { name: 'Dustbin',        top: 96 * TILE_PX, bottom: 120 * TILE_PX, spawn: at(3.5, 119), bg: ['#7f76a3', '#6f6694', '#9d95c2', '#5e5582'] },
    { name: 'Bathtub',        top: 72 * TILE_PX, bottom: 96 * TILE_PX,  spawn: at(18, 94),   bg: ['#7cc4a4', '#6ab394', '#a2dcc0', '#589c80'] },
    { name: 'Toilet',         top: 48 * TILE_PX, bottom: 72 * TILE_PX,  spawn: at(19, 70),   bg: ['#a48fc9', '#9480bb', '#c2b0e0', '#7d6aa6'] },
    { name: 'Towel rack',     top: 24 * TILE_PX, bottom: 48 * TILE_PX,  spawn: at(7, 46),    bg: ['#7d97dc', '#6c84cc', '#a3b8ee', '#5a70b8'] },
    { name: 'Sink',           top: 0,            bottom: 24 * TILE_PX,  spawn: at(14.5, 22), bg: ['#c4a9de', '#b597d2', '#e2cdf0', '#9a7fbd'] },
  ],

  // The surface kinds arrive one zone at a time (see KINDS in config.js):
  // zone 1 grip only, zone 2 adds normal, zone 3 slide, zone 4 ice, zone 5 bouncy.
  // Steps are about 3 rows apart and swap sides, so every jump goes up and across.
  blocks: [
    // ---- Zone 1: dustbin (rows 96 to 119). GRIP only: out of the bin, up the rubbish, up the towel shelves. ----
    plat(0, 119, 2, 'towel', { h: 1 }),             // bath rug, left of the bin
    plat(2, 119, 3, 'paper', { h: 1 }),             // bin floor
    plat(5, 119, 15, 'towel', { h: 1 }),            // bath rug, right of the bin
    plat(1, 115, 1, 'paper', { h: 4 }),             //   bin wall, left
    plat(5, 115, 1, 'paper', { h: 4 }),             //   bin wall, right
    plat(8, 117, 1, 'paper', { h: 2 }),             // tissue box
    plat(11, 114, 1, 'paper', { h: 5 }),            // stack of toilet rolls
    plat(15, 112, 1, 'towel', { h: 7 }),            // pile of laundry
    plat(9, 109, 4, 'towel'),                       // folded towels
    plat(16, 106, 3, 'paper'),                      // tissue shelf
    plat(10, 103, 4, 'towel'),                      // folded towels
    plat(6, 100, 3, 'paper'),                       // tissue shelf
    plat(12, 97, 4, 'towel'),                       // folded towels: a long way down if you miss the next one

    // ---- Zone 2: bathtub (rows 72 to 95). NORMAL arrives: the sandy ledges don't grip as much. ----
    plat(16, 94, 4, 'towel'),                       // bath mat
    plat(8, 91, 6, 'plastic'),                      // bathtub rim
    plat(15, 88, 3, 'plastic'),                     // soap caddy
    plat(7, 85, 4, 'tile'),                         // tiled shelf
    plat(12, 82, 2, 'towel'),                       // sponge
    plat(16, 79, 4, 'plastic'),                     // shampoo shelf
    plat(19, 76, 1, 'plastic', { h: 3 }),           //   a shampoo bottle standing on the end of it
    plat(8, 76, 4, 'tile'),                         // tiled shelf
    plat(13, 73, 3, 'plastic'),                     // shower caddy: top of the bathtub

    // ---- Zone 3: toilet (rows 48 to 71). SLIDE arrives: the shiny seat slides you into the bowl. ----
    plat(18, 70, 2, 'paper'),                       // toilet roll on its holder
    plat(9, 68, 2, 'ceramic', { h: 2 }),            // bowl, left side
    plat(9, 67, 2, 'seat', { h: 1, push: 120 }),    //   seat, slopes into the bowl
    plat(11, 69, 2, 'ceramic', { h: 3 }),           //   bottom of the bowl (a pit)
    plat(13, 68, 2, 'ceramic', { h: 2 }),           // bowl, right side
    plat(13, 67, 2, 'seat', { h: 1, push: -120 }),  //   seat, slopes into the bowl
    plat(15, 67, 3, 'plastic', { h: 1 }),           // cistern lid
    plat(15, 68, 3, 'ceramic', { h: 2 }),           //   cistern
    plat(6, 64, 3, 'plastic'),                      // shelf over the toilet
    plat(13, 61, 4, 'paper'),                       // spare toilet rolls
    plat(6, 58, 2, 'towel'), plat(8, 58, 3, 'metal'),     // air freshener shelf: shiny, slides you onto a towel
    plat(13, 55, 4, 'ceramic'),                     // ceramic ledge
    plat(7, 52, 4, 'ceramic'),                      // ceramic ledge
    plat(12, 49, 4, 'tile'),                        // window sill: top of the toilet

    // ---- Zone 4: heated towel ladder (rows 24 to 47). ICE arrives: wet ledges barely stop you. ----
    plat(6, 46, 2, 'towel'), plat(8, 46, 5, 'metal'),     // rail, towel on the left
    plat(10, 43, 5, 'metal'), plat(15, 43, 2, 'towel'),   // rail, towel on the right
    plat(6, 40, 2, 'towel'), plat(8, 40, 4, 'wet'),       // steamy window ledge, towel on the left
    plat(10, 37, 5, 'metal'), plat(15, 37, 2, 'towel'),   // rail, towel on the right
    plat(8, 34, 4, 'wet', { push: 100 }), plat(12, 34, 2, 'towel'),   // wet slope, pushes you onto a towel
    plat(6, 31, 2, 'towel'), plat(8, 31, 5, 'metal'),     // rail, towel on the left
    plat(12, 28, 4, 'wet'), plat(16, 28, 2, 'towel'),     // steamy window ledge, towel on the right
    plat(6, 25, 2, 'towel'), plat(8, 25, 4, 'metal'),     // top of the ladder

    // ---- Zone 5: sink (rows 0 to 23). BOUNCY arrives. Under the counter, up the chimney beside the mirror, slide home. ----
    plat(13, 22, 4, 'plastic'),                     // toothbrush cup
    plat(7, 19, 4, 'wall'),                         // rubber bath plug: a trampoline
    plat(13, 16, 4, 'paper'),                       // paper towels
    plat(8, 13, 4, 'plastic'),                      // shelf under the counter
    plat(14, 10, 5, 'ceramic'),                     // soap dish, under the chimney
    plat(14, 9, 1, 'wall', { h: 1 }),               //   rubber lip
    plat(18, 9, 1, 'wall', { h: 1 }),               //   rubber lip
    plat(17, 1, 3, 'mirror', { h: 6 }),             // mirror cabinet (the chimney is the 2 tile gap beside it)
    plat(6, 5, 9, 'ceramic'),                       // counter: land and slide into the pump soap
    plat(0, 0, 20, 'wall'),                         // ceiling
  ],

  // Scenery, drawn behind the soap. Big props (tub, window, lid, pipes, the guide board) sit back on the wall.
  decor: [
    deco('bin', 3.5, 119, { w: 3, h: 4 }), deco('paperball', 6.5, 119), deco('paperball', 13, 119),
    deco('board', 3.6, 114.7, { w: 7, h: 4 }),     // the surface guide, right above the bin
    deco('pipe', 19.5, 119, { h: 8 }), deco('plant', 18, 119), deco('peel', 10, 119), deco('bottle', 11.5, 114),

    deco('tub', 11, 95, { w: 6, h: 4 }), deco('duck', 10, 91), deco('bottle', 8, 85),
    deco('sign', 11, 89.5, { text: 'NEW! NORMAL', wall: true }),

    deco('lid', 12, 67, { w: 4, h: 3 }), deco('holder', 19.4, 70),
    deco('sign', 12, 65.5, { text: 'DON\'T FALL IN', wall: true }),
    deco('sign', 9.5, 60.5, { text: 'NEW! SLIDE', wall: true }),

    deco('window', 17.5, 47, { w: 4, h: 4 }),
    deco('sign', 9, 38.5, { text: 'NEW! ICE', wall: true }),
    deco('sign', 10.5, 32.5, { text: 'ARROWS PUSH', wall: true }),
    deco('drip', 9, 40.5), deco('drip', 11, 40.5), deco('drip', 14, 28.5),
    deco('bracket', 6.1, 46), deco('bracket', 16.9, 43), deco('bracket', 16.9, 37), deco('bracket', 6.1, 31), deco('bracket', 6.1, 25),

    deco('toothbrush', 14, 22), deco('pipe', 12, 22, { h: 9 }),
    deco('sign', 9, 17.5, { text: 'NEW! BOUNCY', wall: true }),
    deco('tap', 14.2, 5), deco('lotion', 14, 16), deco('lamp', 10, 0.5),
  ],

  // The pump soap stands on the counter. Touch it to win: it goes flying (a ragdoll, see knockPump in soap.js).
  pump: { x: 11 * TILE_PX, y: 5 * TILE_PX - 40 * PIXEL, w: 24 * PIXEL, h: 40 * PIXEL },   // 24 x 40 art pixels
  counterEdge: 6 * TILE_PX,                         // left end of the counter: the top of the chute
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
