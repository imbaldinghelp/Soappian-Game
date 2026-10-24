// level.js - level data only. To change the level, edit the lists below and refresh.
// Everything here is in TILES (16 x 16 art pixels, TILE_PX world px), so platforms always line up with the
// tile art. The level is 20 tiles wide and 80 tall. col goes right, row goes DOWN (row 0 is the top).
// plat(col, row, width, surface, options) makes a ledge whose top is at that row, one tile thick.
//   options.push = sideways push in px/s^2 (+ right, - left). A slope: it only holds
//   the soap if the surface friction cancels the push (towel holds, seat and wet do not).
//   options.h    = thickness in tiles (default 1).
// deco(kind, col, row, options) is scenery with no collision: col = centre (halves are fine), row = the
// surface it stands on. Kinds are drawn in draw.js (drawDeco). options.w / options.h size the big background
// props in tiles, options.text is the text on a sign, options.wall = true hangs the sign on the wall (no post).
// The soap is 1.5 tiles wide and 1 tall: leave 2 tiles for it to squeeze through, and 3 above a ledge to jump.

function plat(col, row, w, surface, o) {
  o = o || {};
  return { x: col * TILE_PX, y: row * TILE_PX, w: w * TILE_PX, h: (o.h || 1) * TILE_PX, surface: surface, push: o.push || 0 };
}
function deco(kind, col, row, o) {
  o = o || {};
  return { kind: kind, x: col * TILE_PX, y: row * TILE_PX, w: (o.w || 0) * TILE_PX, h: (o.h || 0) * TILE_PX, text: o.text || '', wall: !!o.wall };
}
function at(col, row) { return { x: col * TILE_PX, y: row * TILE_PX }; }

// Columns 2 to 4 are a clear chute down the left side: the intro drops the soap down it into the bin,
// and the beaten pump soap slides off the counter into it. Keep it clear.
const LEVEL = {
  // soap start: centre and bottom (inside the dustbin, right under the end of the sink counter)
  start: at(3, 79),

  // Zones from the bottom up, 16 rows each. top/bottom are world y. floor = surface of the checkpoint floor
  // (it fills the zone's bottom row). spawn = where the debug keys 1 to 5 put the soap (centre, bottom).
  // bg = wall colours, dusk at the bottom to dawn at the top: upper band, lower band, light line, props.
  zones: [
    { name: 'Dustbin',        top: 64 * TILE_PX, bottom: 80 * TILE_PX, floor: 'tile', spawn: at(3, 79),    bg: ['#7f76a3', '#6f6694', '#9d95c2', '#5e5582'] },
    { name: 'Bathroom floor', top: 48 * TILE_PX, bottom: 64 * TILE_PX, floor: 'tile', spawn: at(13, 61), bg: ['#7cc4a4', '#6ab394', '#a2dcc0', '#589c80'] },
    { name: 'Toilet seat',    top: 32 * TILE_PX, bottom: 48 * TILE_PX, floor: 'tile', spawn: at(18.5, 47),   bg: ['#a48fc9', '#9480bb', '#c2b0e0', '#7d6aa6'] },
    { name: 'Towel rack',     top: 16 * TILE_PX, bottom: 32 * TILE_PX, floor: 'tile', spawn: at(6, 29),    bg: ['#7d97dc', '#6c84cc', '#a3b8ee', '#5a70b8'] },
    { name: 'Sink',           top: 0,            bottom: 16 * TILE_PX, floor: 'tile', spawn: at(9.5, 13),   bg: ['#c4a9de', '#b597d2', '#e2cdf0', '#9a7fbd'] },
  ],

  // Reading the level: fuzzy tops grip, shiny tops slide, arrows push, red rubber bounces.
  // Steps are 3 rows apart and swap sides, so every jump goes up and across. Falling only ever costs
  // one zone: its checkpoint floor switches on the first time the soap lands in the zone.
  blocks: [
    // ---- Zone 1: dustbin (rows 64 to 79). Tutorial: out of the bin, up a pile of rubbish, then wall shelves. ----
    plat(0, 79, 2, 'tile'),                         // floor, left of the bin
    plat(2, 79, 2, 'plastic'),                      // bin floor
    plat(4, 79, 16, 'tile'),                        // floor, right of the bin
    plat(1, 76, 1, 'plastic', { h: 3 }),            //   bin wall, left
    plat(4, 76, 1, 'plastic', { h: 3 }),            //   bin wall, right
    plat(6, 77, 3, 'paper', { h: 2 }),              // tissue box
    plat(10, 74, 2, 'paper', { h: 5 }),             // stack of toilet rolls
    plat(14, 71, 5, 'plastic', { h: 8 }),           // laundry basket
    plat(8, 68, 3, 'plastic'),                      // wall shelf
    plat(5, 65, 3, 'plastic'),                      // wall shelf: a long way down if you miss the next one

    // ---- Zone 2: bathtub (rows 48 to 63). Shiny tops slide: land soft, or shoot while sliding. ----
    plat(11, 61, 4, 'towel'),                       // bath mat (entry)
    plat(15, 59, 3, 'wet'),                         // bathtub rim: slides you right...
    plat(18, 59, 2, 'towel'),                       //   ...onto the sponge
    plat(11, 56, 3, 'metal'),                       // soap caddy: slides you left...
    plat(10, 55, 1, 'towel', { h: 2 }),             //   ...into a sponge stopper
    plat(5, 53, 3, 'plastic'),                      // shower shelf
    plat(10, 50, 4, 'wet', { push: 60 }),           // wet slope, pushes right...
    plat(14, 50, 2, 'towel'),                       //   ...onto a mat

    // ---- Zone 3: toilet (rows 32 to 47). The glossy seat slides you into the bowl; shoot before you drop in. ----
    plat(17, 47, 3, 'paper'),                       // toilet roll on its holder (entry)
    plat(5, 45, 2, 'ceramic', { h: 2 }),            // bowl, left side
    plat(5, 44, 2, 'seat', { push: 70 }),           //   seat, slopes into the bowl
    plat(7, 46, 2, 'wet'),                          //   water in the bowl (a pit)
    plat(9, 45, 2, 'ceramic', { h: 2 }),            // bowl, right side
    plat(9, 44, 2, 'seat', { push: -70 }),          //   seat, slopes into the bowl
    plat(11, 45, 3, 'ceramic', { h: 2 }),           // cistern
    plat(11, 44, 3, 'plastic'),                     //   cistern lid
    plat(5, 41, 3, 'plastic'),                      // shelf over the toilet
    plat(12, 38, 3, 'paper'),                       // spare toilet rolls
    plat(7, 35, 3, 'metal'),                        // air freshener shelf: shiny, slides you left...
    plat(6, 34, 1, 'towel', { h: 2 }),              //   ...into a sponge stopper
    plat(12, 33, 3, 'tile'),                        // window sill: a long way down if you miss

    // ---- Zone 4: heated towel ladder (rows 16 to 31). Bare rails slide you along; the towels at the ends catch you. ----
    plat(5, 29, 2, 'towel'), plat(7, 29, 5, 'metal'),     // rail, towel on the left
    plat(10, 26, 5, 'metal'), plat(15, 26, 2, 'towel'),   // rail, towel on the right
    plat(5, 23, 2, 'towel'), plat(7, 23, 5, 'metal'),
    plat(10, 20, 5, 'metal'), plat(15, 20, 2, 'towel'),
    plat(5, 17, 2, 'towel'), plat(7, 17, 5, 'metal'),     // top of the ladder

    // ---- Zone 5: sink (rows 0 to 15). Low shots under the counter, up the chimney beside the mirror cabinet, slide home. ----
    plat(8, 13, 3, 'plastic'),                      // toothbrush cup (entry)
    plat(5, 10, 3, 'paper'),                        // paper towels
    plat(11, 8, 3, 'plastic'),                      // shelf under the counter: keep your shots low
    plat(14, 8, 5, 'ceramic'),                      // soap dish, under the chimney
    plat(14, 7, 1, 'metal'),                        //   lip
    plat(18, 7, 1, 'metal'),                        //   lip
    plat(17, 1, 3, 'mirror', { h: 5 }),             // mirror cabinet (the chimney is the 2 tile gap beside it)
    plat(5, 4, 10, 'ceramic'),                      // counter: land and slide into the pump soap
    plat(0, 0, 20, 'wall'),                         // ceiling
  ],

  // Scenery, drawn behind the soap. Big props (tub, window, lid, pipes) sit back on the wall.
  decor: [
    deco('bin', 3, 79, { w: 2, h: 3 }), deco('paperball', 5.4, 79), deco('paperball', 12.6, 79),
    deco('pipe', 19.5, 79, { h: 7 }), deco('plant', 13, 79), deco('peel', 8.5, 79), deco('bottle', 10.6, 74),
    deco('sign', 15.5, 67, { text: 'FUZZY TOP = GRIP', wall: true }),

    deco('tub', 17.5, 63, { w: 5, h: 4 }), deco('duck', 16, 59), deco('bottle', 6.5, 53),
    deco('sign', 14.5, 58, { text: 'SHINY TOP = SLIDE', wall: true }),
    deco('sign', 7, 51.5, { text: 'ARROWS PUSH', wall: true }),
    deco('drip', 15.5, 60), deco('drip', 17, 60), deco('drip', 12, 51),

    deco('lid', 8, 44, { w: 4, h: 3 }), deco('holder', 18.4, 47),
    deco('sign', 7.5, 43.4, { text: 'DON\'T FALL IN', wall: true }),

    deco('window', 17.5, 31, { w: 4, h: 4 }),
    deco('bracket', 5.1, 29), deco('bracket', 16.9, 26), deco('bracket', 5.1, 23), deco('bracket', 16.9, 20), deco('bracket', 5.1, 17),

    deco('toothbrush', 9, 13), deco('pipe', 14, 15, { h: 7 }),
    deco('tap', 14.2, 4), deco('lotion', 6.5, 10), deco('lamp', 9.5, 1),
  ],

  // The pump soap stands on the counter. Touch it to win; it slides off the end into the chute.
  pump: { x: 11 * TILE_PX, y: 4 * TILE_PX - 40 * PIXEL, w: 24 * PIXEL, h: 40 * PIXEL },   // 24 x 40 art pixels
  counterEdge: 5 * TILE_PX,                         // left end of the counter: the top of the chute
};

// Builds the list of solid shapes the physics uses: level blocks, world edges and zone floors.
function buildSolids() {
  const out = [];
  // checkpoint floors first (so they are drawn behind anything sharing their row): off until the soap first lands in that zone
  LEVEL.zones.forEach(function (z, i) {
    if (i === 0) return;
    out.push({ x: 0, y: z.bottom - FLOOR_T, w: WORLD_W, h: FLOOR_T, surface: z.floor, push: 0, on: false, floor: i });
  });
  for (const b of LEVEL.blocks) out.push({ x: b.x, y: b.y, w: b.w, h: b.h, surface: b.surface, push: b.push, on: true });
  // world edges (bouncy walls)
  out.push({ x: -400, y: -800, w: 400, h: WORLD_H + 1600, surface: 'wall', push: 0, on: true });
  out.push({ x: WORLD_W, y: -800, w: 400, h: WORLD_H + 1600, surface: 'wall', push: 0, on: true });
  out.push({ x: -400, y: -800, w: WORLD_W + 800, h: 800, surface: 'wall', push: 0, on: true });
  return out;
}
