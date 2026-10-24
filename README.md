# Soappian

A 2D Foddian climber for the SUTD Winter Game Jam 2026 (theme "Slide"). A discarded bar of soap
launches itself out of a dustbin and back up to the sink to knock the pump soap off.
Plain HTML5 canvas and JavaScript. No build step, no libraries.

## Run it

Double click `index.html`, or serve the folder (better, and needed once art is added):

```
python -m http.server 8000      then open http://localhost:8000
```

In VS Code you can also use the Live Server extension.

## Play

- Press and drag back (mouse or finger), like a slingshot. The soap launches the opposite way.
- While you hold, the squeeze meter cycles up and down. Release to launch. Launch power = meter value.
- You can shoot any time the soap touches a surface, even while sliding. No control in the air.
- Reach the sink and knock the pump soap down the drain. `R` restarts, `S` turns sound on and off.
- Five zones, bottom to top, and no checkpoints: a fall can take you all the way back down.
- Colour tells you the material. One new material per zone: plastic, ceramic, wet and toilet seat, towel, then
  ceramic and wet mixed at the sink. A little board marks each new one; `Esc` shows the whole manual.
- Drop further than a zone's height and the soap flops flat for 2 seconds. Only then does the pump soap taunt you.
- The title screen leads into a short intro (the pump soap shoves you into the bin). Click to skip it.

## Files

| File | What it does |
|---|---|
| `index.html` | One canvas, loads the scripts |
| `js/config.js` | **Every tunable number**: gravity, launch speeds, friction `K`, meter speeds, surfaces, taunts, art file names |
| `js/level.js` | **Level data only**, in tiles: the platforms, zones and pump soap position |
| `js/soap.js` | The soap: physics, friction, meter, launch, falls and flops, winning, the pump ragdoll. No drawing. Reports events (launch, land, bounce, flop, getup, win, bonk) for sound and effects |
| `js/audio.js` | Sound effects: synthesised placeholders, or recordings from `assets/` when `USE_SOUND_FILES` is on |
| `js/draw.js` | The world, soft 8-bit style on a 320x180 pixel grid: pixel font, platforms by surface, wall colours, scenery, pump, soap, particles, aim line, meter |
| `js/screens.js` | Everything on top of the world: title screen, intro cutscene, HUD, taunts, pause menu, win screen |
| `js/main.js` | Shows the canvas at 4x, input (mouse, touch, keys), game loop, camera, pause, restart, turns events into sounds and effects |
| `tools/check-level.js` | Optional. A bot that checks the level can be beaten (see below) |
| `assets/` | Put Aaron's PNGs here (see `assets/README.txt`) |
| `CREDITS.md` | Credits. Add every outside asset the moment it is added |

## Tuning

Everything in `js/config.js`, in this order of usefulness:

1. Surface feel: each material in `SURFACES` has `slip` (the bars shown to players), `friction` (what the physics
   uses), `bounce` and colours. `MATERIALS` is the order the manual lists them. `wall` is the ceiling and the sides.
   Falls: `FLOP_TIME`.
2. Overall slipperiness: `K` (bigger = everything stops sooner).
3. Pace and shot size: `GRAVITY`, `MIN_SPEED`, `MAX_SPEED`. Speeds x k with gravity x k squared keeps the same arcs, k times faster.
4. Screen: `LOW_W` / `LOW_H` (the 320x180 pixel grid the art is drawn for) and `SCALE` (4 = 1280x720).
5. Meter: `RISE_START`, `RISE_ACCEL` (0 = constant speed), `FALL_RATE`. `SHOT_BUFFER`: how long a shot let go in the air waits for a surface. `HOP_MAX`: how high a hard landing hops.
6. Ricochets: `SIDE_BOUNCE` (how hard every platform side and wall bounces you back).
7. Intro: `INTRO_*` timings and `INTRO_LINES`. Sound: `SOUND_VOLUME`. Free-fall wind: `WIND_START`, `WIND_FULL`, `WIND_VOLUME`.
8. The win: `RAG_*` (how hard the pump soap is flung, how bouncy it is) and `WIN_WATCH` (seconds before the panel).

## Editing the level

Open `js/level.js`. Everything is in tiles (16x16 art pixels), so platforms line up with the tile art.
One line per platform: `plat(col, row, width, 'surface')`, half a tile thick, or `{ h: 2 }` for a thicker one. Refresh the page.
Surfaces: `tile`, `plastic`, `paper`, `wet`, `towel`, `seat`, `ceramic`, `metal`, `mirror`, `wall` (bumpers).
Scenery with no collision goes in `decor`: `deco('duck', col, row)` (col = centre, halves are fine; row = what it stands on).
Signs take text: `deco('sign', col, row, { text: 'MATS GRIP' })`. The kinds are drawn in `DECO` in `js/draw.js`.
Mark a new material with `deco('material', col, row, { text: 'wet' })`.
Rows grow downward, row 0 is the top. The level is 29 tiles wide (the camera scrolls sideways) and 89 tall.
The soap is 1 tile wide and 3/4 of a tile tall.
The manual reads the zone each material first turns up from the level itself.
Grippy surfaces (friction 0.3 and up, `GRIP_FRICTION`) are drawn with fuzzy tops, slippery ones shiny.
Add `{ push: -80 }` to make a slope (negative = pushes left). A slope only holds the soap if the
surface friction cancels the push, so a towel holds and glossy seat or wet tile do not.

`Esc` pauses (resume or back to the title). Debug keys: `D` toggles debug (hitboxes, speeds). With debug on, `1` to `5` jump to a zone and
shift+click teleports the soap. `M` shows the whole level on one screen.

Check the level is still beatable after big edits: `node tools/check-level.js` (needs Node.js, takes a few minutes).

## Add the art

Art is 8-bit: small PNGs drawn 1:1 on a 320x180 grid shown 4x (soap 16x12, pump 24x40, tiles 16x16, backgrounds and title 320x180).
Each material keeps its colour (plastic mint, ceramic white, wet blue, seat butter yellow, towel pink). The look is soft and gentle: pastel colours from `PAL` in `js/config.js`, coloured outlines rather than black, calm backgrounds. Copy the PNGs into `assets/` with the file names in `assets/README.txt`, then set `USE_ART = true`
in `js/config.js`. Missing files fall back to flat shapes, so art can be added one file at a time.

## Add the sounds

Every sound is synthesised in `js/audio.js` as a placeholder. To use real recordings (needed for the jam:
no AI audio), put WAV/OGG/MP3 files in `assets/` with the names in `SOUND_FILES` in `js/config.js`, then
set `USE_SOUND_FILES = true`. Any file that is missing keeps its synth sound. The jump sound plays faster
for harder shots. Tip: record a real soap bottle being squeezed for the jump.

## Publish on itch.io

1. Select the **contents** of this folder (`index.html`, `js`, `assets`, `CREDITS.md`) and zip them,
   so `index.html` is at the top of the zip. Do not zip `tools/` or this file if you want it smaller.
2. On the jam's itch.io page: Upload files, pick the zip, tick **This file will be played in the browser**.
3. Set the embed size to 1280 x 720 (an exact 4x, so pixels stay crisp) and tick **Fullscreen button**. Tick mobile friendly if you want phones.
4. Add the other two team members as contributors, list each role in the description.
5. Test the draft page in a private window before the cutoff.
