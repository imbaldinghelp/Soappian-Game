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
const WORLD_W = 20 * TILE_PX;             // level size in tiles: 20 wide (one screen), 80 tall
const WORLD_H = 80 * TILE_PX;
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
const SOAP_W = 24 * PIXEL;               // hitbox: 24 x 16 art pixels (144 x 96 world px)
const SOAP_H = 16 * PIXEL;
const GRAVITY = 1800;                     // px/s^2
const MIN_SPEED = 350;                    // launch speed at meter 0 (px/s)
const MAX_SPEED = 1550;                   // launch speed at meter 1 (px/s)
const K = 10;                             // friction strength: speed *= exp(-K * friction * dt)
const STOP_SPEED = 10;                    // below this on a surface the soap counts as stopped
const LAND_ABSORB = 200;                  // landing slower than this never bounces
const HOP_MAX = 120;                      // a hard landing hops back up at most this fast (keeps the hop short)
const SUBSTEPS = 8;                       // physics steps per frame (stops fast shots tunnelling)

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
const ZONE_FLOORS = true;                 // false = no checkpoint floors: a fall can go all the way down (harder mode)
const FLOOR_T = TILE_PX;                  // thickness of a zone floor ledge (one tile)
const FALL_MIN_DROP = 2 * TILE_PX;        // landing this much lower than the last landing counts as a fall
const TAUNT_TIME = 2.0;                   // seconds a taunt stays on screen
const CHECKPOINT_TIME = 2.5;              // seconds the checkpoint banner stays on screen
const DIRT_PER_FALL = 0.08;               // how much dirtier the soap gets per fall (max 1)
const DIRT_LOOK = false;                  // true = the soap looks dirtier after falls (off for now)

// ---- Free fall: wind on screen and in your ears once the soap drops fast ----
const WIND_START = 1700;                  // falling faster than this (px/s) starts the wind (a jump's own drop stays under it)
const WIND_FULL = 2600;                   // full wind at this speed
const WIND_VOLUME = 0.35;                 // loudness of the wind at full speed, 0 to 1

// ---- Surfaces: friction, bounce, and the colours used until art is added ----
// Drawn like soft 8-bit ground: a cap on top (light row + cap colour), a body with gentle bands, a tinted edge.
const GRIP_FRICTION = 0.3;               // surfaces at least this grippy are drawn fuzzy; below it they look shiny
const SURFACES = {
  tile:    { friction: 0.40, bounce: 0.1, light: '#ffffff', cap: '#fff3df', body: '#ecc08e', band: '#ddab78', edge: '#7a5545' },  // dry floor
  plastic: { friction: 0.35, bounce: 0.1, light: '#e0f7f0', cap: '#b5e6d8', body: '#93cfc0', band: '#7fbcad', edge: '#3e6b68' },
  paper:   { friction: 0.70, bounce: 0.0, light: '#ffffff', cap: '#ffffff', body: '#f6ead6', band: '#e8d6bb', edge: '#8a7466' },  // tissues, rolls
  wet:     { friction: 0.05, bounce: 0.1, light: '#e3fbff', cap: '#9fe3f2', body: '#6cb4e0', band: '#5aa0cf', edge: '#2f5b8a' },
  towel:   { friction: 0.90, bounce: 0.0, light: '#ffdbe7', cap: '#ffb7cf', body: '#f497b9', band: '#e57fa5', edge: '#9a4870' },
  seat:    { friction: 0.10, bounce: 0.1, light: '#ffffff', cap: '#ffffff', body: '#eceff8', band: '#d9deec', edge: '#6f7396' },
  ceramic: { friction: 0.12, bounce: 0.1, light: '#ffffff', cap: '#ffffff', body: '#e8eef7', band: '#d4dceb', edge: '#6f7396' },
  metal:   { friction: 0.15, bounce: 0.2, light: '#ffffff', cap: '#eef2f8', body: '#c3cbdc', band: '#aab3c8', edge: '#5f6684' },  // chrome
  mirror:  { friction: 0.05, bounce: 0.3, light: '#ffffff', cap: '#d7dce8', body: '#a9dcf2', band: '#8fcbe6', edge: '#4f6f93' },
  wall:    { friction: 0.20, bounce: 0.6, light: '#ffd0c6', cap: '#ffa596', body: '#f0857a', band: '#dc7066', edge: '#8c4450' },  // bumpers
};

// ---- Pump soap taunts (one is picked after each fall; the pixel font is capitals only) ----
const TAUNTS = [
  'Liquid is the future.',
  'Back in the bin, bar.',
  'Bars are so last century.',
  'Do you even lather?',
  'I dispense. You dissolve.',
  'Squeeze harder. Oh wait.',
  'My refill is bigger than your ambition.',
  'Cute climb. Shame about the slope.',
  'Rinse and repeat, bar.',
  'Enjoy the view from the floor.',
];

// ---- Intro cutscene (seconds unless noted). Click skips it. ----
const INTRO_TALK = 1.6;                   // pump soap gloats before pushing
const INTRO_PUSH = 1.2;                   // the push along the counter
const INTRO_FALL_G = 2400;                // fall gravity (px/s^2)
const INTRO_FALL_MAX = 3200;              // top fall speed (px/s)
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
  checkpoint: 'assets/sfx_checkpoint.wav',
  fall: 'assets/sfx_fall.wav',
  win: 'assets/sfx_win.wav',
  click: 'assets/sfx_click.wav',
  push: 'assets/sfx_push.wav',            // intro: pump shoves the soap
  whistle: 'assets/sfx_whistle.wav',      // intro: the long fall
  clang: 'assets/sfx_clang.wav',          // intro: soap hits the bin
};

// ---- Art: set USE_ART to true once Aaron's PNGs are in the assets folder ----
// Sizes are in art pixels. They are drawn 1:1 on the 320 x 180 grid, so keep them small and crisp.
const USE_ART = false;
const ART = {
  soap: 'assets/soap.png',               // 24 x 16
  pump: 'assets/pump_soap.png',          // 24 x 40
  tile: 'assets/tile_floor.png',         // 16 x 16, tiles seamlessly (platforms are whole tiles)
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
