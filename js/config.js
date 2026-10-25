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
const WORLD_W = 29 * TILE_PX;             // level size in tiles: 29 wide (the camera scrolls sideways too), 139 tall
const WORLD_H = 139 * TILE_PX;
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
const SOAP_W = 23 * PIXEL;               // hitbox: 23 x 12 art pixels, the bar in Aaron's soap.png (138 x 72 world px)
const SOAP_H = 12 * PIXEL;
const GRAVITY = 3040;                     // px/s^2
const MIN_SPEED = 455;                    // launch speed at meter 0 (px/s)
const MAX_SPEED = 2015;                   // launch speed at meter 1 (px/s)
const K = 13;                             // friction strength: speed *= exp(-K * friction * dt)
const STOP_SPEED = 13;                    // below this on a surface the soap counts as stopped
const LAND_ABSORB = 260;                  // landing slower than this never bounces
const HOP_MAX = 150;                      // a hard landing hops back up at most this fast (not on bouncy tops: those are trampolines)
const SIDE_BOUNCE = 0.6;                  // hitting the side of any platform or wall bounces back at least this much
// Slides (LEVEL.slides): tilted chutes that only catch from above. Landing on one keeps just the speed along
// it, so a fall becomes a sideways fling off the low end and a missed jump drops further. Nobody stands on one.
const SLIDE_COLORS = { light: '#fff6c9', body: '#ffe27a', band: '#f2c14e', edge: '#2b2c42' };   // yellow playground slide
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
// A fall = dropping further than the height of the zone the drop started in. The soap lands with a flop,
// lies there dazed for FLOP_TIME, then gets back up. Only a fall makes the pump soap taunt you.
const FLOP_TIME = 2.0;                    // seconds the soap lies flat after a fall
const TAUNT_TIME = 2.0;                   // seconds a taunt stays on screen
const DIRT_PER_FALL = 0.08;               // how much dirtier the soap gets per fall (max 1)
const DIRT_LOOK = false;                  // true = the soap looks dirtier after falls (off for now)

// ---- Free fall: wind on screen and in your ears once the soap drops fast ----
const WIND_START = 2200;                  // falling faster than this (px/s) starts the wind (a jump's own drop stays under it)
const WIND_FULL = 3400;                   // full wind at this speed
const WIND_VOLUME = 0.35;                 // loudness of the wind at full speed, 0 to 1

// ---- Surfaces: five materials, one new one per zone. Colour tells you the material. ----
// slip = how slippery, in bars (the manual in the Esc menu and the little boards show it). friction is what the
// physics uses: lower = slides further. Same material, same colour, same feel. The colours match Aaron's tiles
// (used when a tile PNG is missing, and for the little ledges in the manual).
// Drawn like soft 8-bit ground: a cap on top (light row + cap colour), a body with gentle bands, a tinted edge.
// 1 bar and less: fuzzy top. 3 bars and more: shiny top with a glint.
const SURFACES = {
  plastic: { name: 'PLASTIC', slip: 2,   friction: 0.50, bounce: 0.1, light: '#fcc999', cap: '#f8b67b', body: '#f6a35c', band: '#e08c47', edge: '#2b2c42' },  // orange
  ceramic: { name: 'CERAMIC', slip: 3,   friction: 0.28, bounce: 0.1, light: '#ffffff', cap: '#faf8f3', body: '#f4f1ea', band: '#dcd8cf', edge: '#2b2c42' },  // white
  wet:     { name: 'WET',     slip: 5,   friction: 0.06, bounce: 0.1, light: '#a9dff9', cap: '#7cc1ee', body: '#5aa9e6', band: '#4a92cf', edge: '#2b2c42' },  // blue
  seat:    { name: 'SEAT',    slip: 2.5, friction: 0.38, bounce: 0.1, light: '#ffffff', cap: '#a9def9', body: '#f4f1ea', band: '#dcd8cf', edge: '#2b2c42' },  // white, blue rim
  towel:   { name: 'TOWEL',   slip: 1,   friction: 0.85, bounce: 0.0, light: '#ece3d6', cap: '#e2d6c5', body: '#d8cbb8', band: '#c2b39e', edge: '#2b2c42' },  // beige
  wall:    { name: 'WALL',    slip: 0,   friction: 0.20, bounce: 0.75, light: '#a3aebb', cap: '#8d99a7', body: '#7d8a99', band: '#6a7686', edge: '#2b2c42' },  // grey brick: the ceiling and the level's sides
};
const MATERIALS = ['plastic', 'ceramic', 'wet', 'seat', 'towel'];   // in the order they turn up, as the manual lists them

// ---- The beaten pump soap: a floppy two piece ragdoll (bottle and pump head) flung by the hit ----
const RAG_FLING = 900;                    // sideways speed it is flung at, plus half the soap's speed (px/s)
const RAG_FLING_UP = 1400;                // upward speed it is flung at (px/s)
const RAG_SPIN = 9;                       // spin it is flung with (turns per second x 2 pi)
const RAG_BOUNCE = 0.55;                  // how bouncy the pump soap is
const RAG_GRAVITY = 3040;                 // px/s^2
const RAG_HUG_DRAG = 8;                   // once it touches the level's edge, how fast its sideways speed dies (it drops down the side)
const WIN_WATCH = 4.5;                    // seconds of watching it tumble (the camera follows it down) before the win panel

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
const INTRO_HOP = 1300;                   // how hard the soap pops over the sink's lip (px/s)
const INTRO_FALL_G = 3400;                // fall gravity (px/s^2)
const INTRO_FALL_MAX = 4200;              // top fall speed (px/s)
const INTRO_AFTER = 2.4;                  // time in the bin before play starts
const INTRO_LINES = ['Out of my sink, bar.', 'Enjoy the bin!', 'Climb back to the sink.'];

// ---- Sound ----
// The team's recordings (jam rules: no AI audio). A sound with no file here plays its synthesised
// placeholder from js/audio.js. Still synth for now: jump (launch, pitch rises with power), click,
// push (intro shove), whistle (intro fall), clang (intro bin), bounce (ricochet), bonk (flung pump soap).
// To add one, put the file in assets/audio/ and add a line below with that name.
const SOUND_VOLUME = 0.5;                 // master volume, 0 to 1
const LOOP_VOLUME = { wind: 1.0, slide: 0.9 };   // loudness of the looping recordings at full level
const SLIDE_FULL = 900;                   // sliding on wet this fast (px/s) plays the slide sound at full volume
const USE_SOUND_FILES = true;             // false = synth placeholders only
// Background music: the team's own song (jam rules: human-made), looped for the whole game. It plays through the
// same master volume and S mute as the effects, and ducks while the game is paused.
const MUSIC_FILE = 'assets/audio/Soappian_BGM.mp3';
const MUSIC_VOLUME = 0.35;                // loudness of the song under the effects, 0 to 1 (the song itself is loud)
const MUSIC_PAUSE_DUCK = 0.4;             // while paused the song drops to this fraction
const SFX = 'assets/audio/SFX/SFX/';
const SOUND_FILES = {
  flop: SFX + 'Hitting ground.mp3',       // landing flat after a fall (played lower and heavier). Ordinary landings are silent
  win: SFX + 'Hitting pump soap.mp3',     // knocking the pump soap over
  wind: SFX + 'falling.mp3',              // loops while free falling (replaces the synth wind)
  slide: SFX + 'sliding on wet.mp3',      // loops while sliding on wet
};

// ---- Art: Aaron's PNGs in assets/texture/ (sizes in art pixels, drawn 1:1 on the 320 x 180 grid) ----
// Anything without a file here is drawn in code. Slots still to draw: bg0 to bg4 (320 x 180 zone backdrops,
// repeated down the zone: bin, floor, toilet, towel, sink) and title (320 x 180 title backdrop).
const USE_ART = true;                     // false = code-drawn shapes only
const TEX = 'assets/texture/';
const ART = {
  soap: TEX + 'soap.png',                 // 24 x 16 (the bar inside it is the hitbox, SOAP_W x SOAP_H)
  pump: TEX + 'pump_soap.png',            // 24 x 40 (rows 0 to 10 come off as the head when it is knocked over)
  plastic: TEX + 'tile_plastic.png',      // 16 x 16 each, tiles seamlessly (ledges are half a tile thick and show its top 8 rows)
  ceramic: TEX + 'tile_ceramic.png',
  wet: TEX + 'tile_wet.png',
  seat: TEX + 'tile_seat.png',
  towel: TEX + 'tile_towel.png',
  wall: TEX + 'tile_wall.png',            // the ceiling
};
