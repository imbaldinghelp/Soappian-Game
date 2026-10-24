// config.js - every tunable number lives here. Edit, refresh the page, play.

// ---- Screen and look ----
// The game is drawn on a small 320 x 180 pixel grid (the canvas itself) and shown 4x (1280 x 720) with
// hard pixel edges, or a smaller whole step (3x, 2x) if the window is smaller. All art is drawn for 320 x 180.
const VIEW_W = 1280, VIEW_H = 720;        // virtual screen for input: drag lengths below are in these px
const LOW_W = 320, LOW_H = 180;           // the pixel grid the game is drawn on
const SCALE = 4;                          // how big the grid is shown (4 = 1280 x 720)
const PIXEL = 6;                          // world px per art pixel (sprite sizes are fixed in art pixels)
const VIEW_WORLD_W = LOW_W * PIXEL;       // how much of the world you see (1920 x 1080)
const VIEW_WORLD_H = LOW_H * PIXEL;
const TILE = 16;                          // tile size in art pixels: platforms sit on this grid
const TILE_PX = TILE * PIXEL;             // one tile in world px (96)
const WORLD_W = 20 * TILE_PX;             // level size in tiles: 20 wide (one screen), 120 tall
const WORLD_H = 120 * TILE_PX;
const DT = 1 / 60;                        // fixed physics step

// Colour palette: soft pastels, laid out like the PICO-8 palette. Everything is drawn with these.
// 'ink' is a dark indigo, not black: outlines and shadows stay gentle.
const PAL = {
  ink: '#2b2847', navy: '#3d4a80', plum: '#9a5a86', green: '#5fae78', brown: '#c4865e', slate: '#7a7699',
  silver: '#d4d7e6', white: '#fffaf2', red: '#ef6079', orange: '#f6b26b', yellow: '#ffe27a', lime: '#9adf86',
  sky: '#86ccf0', lilac: '#a8a0d4', pink: '#f7a6c4', peach: '#ffd5bd',
  deepbrown: '#5c4a5e', deepnavy: '#323a66', deepplum: '#5a3f63', teal: '#5f9fb0', rust: '#b06e5a', charcoal: '#6d6488',
  taupe: '#c9a98e', cream: '#fff1b8', crimson: '#d4506d', tangerine: '#f2955a', chartreuse: '#c5e88a', jade: '#6fc79a',
  blue: '#6a86d6', mauve: '#9a82b4', coral: '#f4917e', salmon: '#ffb59f',
};

// ---- Soap physics ----
// Pace: GRAVITY and the launch speeds go together. Speeds x k with GRAVITY x k^2 keeps the same arcs,
// just k times faster (these are the old values sped up 1.3x).
const SOAP_W = 16 * PIXEL;               // hitbox: 16 x 12 art pixels (96 x 72 world px), one tile wide
const SOAP_H = 12 * PIXEL;
const GRAVITY = 3040;                     // px/s^2
const MIN_SPEED = 455;                    // launch speed at meter 0 (px/s)
const MAX_SPEED = 2015;                   // launch speed at meter 1 (px/s)
const K = 13;                             // friction strength: speed *= exp(-K * friction * dt)
const STOP_SPEED = 13;                    // below this on a surface the soap counts as stopped
const LAND_ABSORB = 260;                  // landing slower than this never bounces
const HOP_MAX = 150;                      // a hard landing hops back up at most this fast (not on bouncy tops: those are trampolines)
const SIDE_BOUNCE = 0.6;                  // hitting the side of any platform or wall bounces back at least this much
const BOUNCE_FX_MIN = 300;                // a ricochet faster than this (px/s) makes a boing and sparks
const SUBSTEPS = 8;                       // physics steps per frame (stops fast shots tunnelling)
const CAMERA_FOLLOW = 10;                 // how fast the camera catches up with the soap (bigger = tighter)

// ---- Squeeze meter (p runs 0 to 1) ----
// Rise speed = RISE_START * (1 + RISE_ACCEL * p^2): quick from the start, quicker near the top.
// RISE_ACCEL = 0 gives a constant speed. With the values below:
// 0 to 0.5 takes 0.47 s, full rise 0.82 s, top 20% lasts 0.12 s, top 10% lasts 0.06 s, fall 0.7 s.
const RISE_START = 1.0;                   // meter speed at p = 0 (per second)
const RISE_ACCEL = 0.8;                   // how much faster it gets near the top
const FALL_RATE = 1.43;                   // meter speed while falling (per second)

// ---- Aiming ----
const AIM_MIN_DRAG = 24;                  // drag shorter than this (screen px) cancels the shot
const AIM_MAX_DRAG = 160;                 // drag length that gives the longest aim line
const AIM_GRACE = 0.08;                   // can still shoot this long after leaving a surface (seconds)
const SHOT_BUFFER = 0.2;                  // let go in the air: the shot fires if the soap touches down this soon
const AIM_REST_TIME = 0.12;               // "fully stopped" means still for this long (used by the level checker)

// ---- Rules ----
const LEDGE_TILES = 0.5;                  // default platform thickness in tiles (half a tile = 8 art px)
const FALL_MIN_DROP = 2 * TILE_PX;        // landing this much lower than the last landing counts as a fall
const TAUNT_TIME = 2.0;                   // seconds a taunt stays on screen
const DIRT_PER_FALL = 0.08;               // how much dirtier the soap gets per fall (max 1)
const DIRT_LOOK = false;                  // true = the soap looks dirtier after falls (off for now)

// ---- Free fall: wind on screen and in your ears once the soap drops fast ----
const WIND_START = 2200;                  // falling faster than this (px/s) starts the wind (a jump's own drop stays under it)
const WIND_FULL = 3400;                   // full wind at this speed
const WIND_VOLUME = 0.35;                 // loudness of the wind at full speed, 0 to 1

// ---- Surfaces: five kinds, and the colour tells you the kind ----
// Every surface of one kind feels the same and has the same colour. The board above the bin (and the Esc menu)
// explains them. They arrive one per zone, in this order: zone 1 is all grip, each zone up adds the next kind.
// Drawn like soft 8-bit ground: a cap on top (light row + cap colour), a body with gentle bands, a tinted edge.
const KINDS = {
  grip:   { name: 'GRIP',   friction: 0.85, bounce: 0.0,  light: '#ffdbe7', cap: '#ffb7cf', body: '#f497b9', band: '#e57fa5', edge: '#9a4870' },  // pink
  normal: { name: 'NORMAL', friction: 0.40, bounce: 0.1,  light: '#ffffff', cap: '#fff3df', body: '#ecc08e', band: '#ddab78', edge: '#7a5545' },  // sand
  slide:  { name: 'SLIDE',  friction: 0.12, bounce: 0.15, light: '#ffffff', cap: '#ffffff', body: '#e3e8f3', band: '#cdd4e6', edge: '#6f7396' },  // silver
  ice:    { name: 'ICE',    friction: 0.04, bounce: 0.1,  light: '#e3fbff', cap: '#9fe3f2', body: '#6cb4e0', band: '#5aa0cf', edge: '#2f5b8a' },  // blue
  bouncy: { name: 'BOUNCY', friction: 0.20, bounce: 0.75, light: '#ffd0c6', cap: '#ffa596', body: '#f0857a', band: '#dc7066', edge: '#8c4450' },  // coral
};
const GRIP_FRICTION = 0.6;                // this grippy or more: drawn with fuzzy tops
const SLIP_FRICTION = 0.2;                // this slippery or less: drawn shiny, with a glint
// What each surface in level.js is. The names stay so sounds can differ (towel thud, metal tink, wet splish).
const SURFACE_KIND = {
  towel: 'grip', paper: 'grip',
  tile: 'normal', plastic: 'normal',
  metal: 'slide', ceramic: 'slide', seat: 'slide',
  wet: 'ice', mirror: 'ice',
  wall: 'bouncy',                         // the level's sides, the ceiling and the red bumpers
};
const SURFACES = {};
Object.keys(SURFACE_KIND).forEach(function (k) { SURFACES[k] = Object.assign({ kind: SURFACE_KIND[k] }, KINDS[SURFACE_KIND[k]]); });

// ---- The beaten pump soap: a floppy two piece ragdoll (bottle and pump head) flung by the hit ----
const RAG_FLING = 900;                    // sideways speed it is flung at, plus half the soap's speed (px/s)
const RAG_FLING_UP = 1400;                // upward speed it is flung at (px/s)
const RAG_SPIN = 9;                       // spin it is flung with (turns per second x 2 pi)
const RAG_BOUNCE = 0.55;                  // how bouncy the pump soap is
const RAG_GRAVITY = 3040;                 // px/s^2
const WIN_WATCH = 3.0;                    // seconds of watching it tumble before the win panel

// ---- Pump soap taunts (one is picked after each fall; the pixel font is capitals only) ----
const TAUNTS = [
  'man you suck',
  'LOL',
  'try harder',
  'dont drop the soap',
  'just stop trying',
  'drop out',
  'go work at sinkdonalds',
  'your so cute',
  'enjoy the view from the floor',
];

// ---- Intro cutscene (seconds unless noted). Click skips it. ----
const INTRO_TALK = 1.6;                   // pump soap gloats before pushing
const INTRO_PUSH = 1.2;                   // the push along the counter
const INTRO_FALL_G = 3400;                // fall gravity (px/s^2)
const INTRO_FALL_MAX = 4200;              // top fall speed (px/s)
const INTRO_AFTER = 2.4;                  // time in the bin before play starts
const INTRO_LINES = ['Out of my sink, bar.', 'Enjoy the bin!', 'Climb back to the sink.'];

// ---- Sound ----
// Placeholder sounds are synthesised in js/audio.js. Set USE_SOUND_FILES to true to play human-made
// recordings from assets/ instead (jam rules: no AI audio). Missing files fall back to the synth.
const SOUND_VOLUME = 0.5;                 // master volume, 0 to 1
const USE_SOUND_FILES = false;
const SOUND_FILES = {
  jump: 'assets/sfx_jump.wav',            // launch (pitch rises with power)
  land: 'assets/sfx_land.wav',
  fall: 'assets/sfx_fall.wav',
  win: 'assets/sfx_win.wav',
  click: 'assets/sfx_click.wav',
  push: 'assets/sfx_push.wav',            // intro: pump shoves the soap
  whistle: 'assets/sfx_whistle.wav',      // intro: the long fall
  clang: 'assets/sfx_clang.wav',          // intro: soap hits the bin
  bounce: 'assets/sfx_bounce.wav',        // soap ricochets off a bouncy wall
  bonk: 'assets/sfx_bonk.wav',            // the flung pump soap hits something
};

// ---- Art: set USE_ART to true once Aaron's PNGs are in the assets folder ----
// Sizes are in art pixels. They are drawn 1:1 on the 320 x 180 grid, so keep them small and crisp.
const USE_ART = false;
const ART = {
  soap: 'assets/soap.png',               // 16 x 12
  pump: 'assets/pump_soap.png',          // 24 x 40
  tile: 'assets/tile_floor.png',         // 16 x 16, tiles seamlessly (ledges are half a tile thick and show its top 8 rows)
  plastic: 'assets/tile_plastic.png',
  paper: 'assets/tile_paper.png',
  wet: 'assets/tile_wet.png',
  towel: 'assets/tile_towel.png',
  seat: 'assets/tile_seat.png',
  ceramic: 'assets/tile_ceramic.png',
  metal: 'assets/tile_metal.png',
  mirror: 'assets/tile_mirror.png',
  wall: 'assets/tile_wall.png',
  bg0: 'assets/bg_bin.png',              // 320 x 180 each, repeated down the zone
  bg1: 'assets/bg_floor.png',
  bg2: 'assets/bg_toilet.png',
  bg3: 'assets/bg_towel.png',
  bg4: 'assets/bg_sink.png',
  title: 'assets/title.png',             // 320 x 180 title screen backdrop (the logo is drawn on top)
};
