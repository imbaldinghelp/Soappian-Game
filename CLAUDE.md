# Soappian

2D Foddian browser game (SUTD Winter Game Jam 2026, theme "Slide"), published on itch.io.
A soap thrown in the dustbin climbs back to the sink to knock the pump soap off.
Team: Brian (design), Aaron (hand-drawn art), code roles TBC.

## How it plays
Drag back to aim, a squeeze meter cycles while held, release to launch. The soap can shoot any time
it touches a surface, including while sliding and during the little hop off a hard landing (let go mid-air
and the shot fires on touchdown, SHOT_BUFFER). Esc opens a pause menu (resume or back to the title).
Surfaces have different friction: fuzzy tops grip, shiny tops slide, arrows push. Falls bring taunts, and
fast falls bring wind (streaks and a roar).
The game draws on a 320 x 180 canvas shown 4x (1280 x 720) with smoothing off. The level is built on a
16 px tile grid: 20 tiles wide (one screen) and 80 tall, five zones of 16 rows bottom to top (dustbin, bathtub,
toilet, towel ladder, sink), one set piece each. The first landing in a zone switches on its checkpoint floor
(the zone's bottom row), so a fall costs at most one zone. Columns 2 to 4 are a clear chute: the intro drops the
soap down it into the bin, and the beaten pump soap slides off the counter into it. Keep it clear.
Flow: title screen -> intro cutscene (pump shoves the soap off the sink into the bin, click skips) -> play -> win.

## Files
- index.html: one canvas, loads the scripts in order (no modules, shared globals)
- js/config.js: ALL tunable numbers, palette, surfaces, taunts, intro timing, sound and art file names
- js/level.js: level data only, in tiles (plat(col, row, w, surface, opts) for solids, deco(kind, col, row, opts) for scenery)
- js/soap.js: physics, meter, launch, checkpoint floors, falls, win. No drawing, no DOM.
  Pushes events (launch, land, checkpoint, fall, win) onto game.events instead of playing sounds
- js/audio.js: sound effects. Synth placeholders (Web Audio), or human-made files when USE_SOUND_FILES is on
- js/draw.js: the world, drawn straight on the 320x180 page canvas (soft 8-bit style): pixel font, platforms by surface, wall bands,
  scenery (DECO), pump, soap, particles (FX), aim and meter, and drawFrame which puts a frame together
- js/screens.js: drawn on top of the world: title, intro cutscene (updateIntro + drawIntro), HUD,
  checkpoint banner, taunts, pause menu, win screen, and the button rectangles
- js/main.js: canvas scaling, input (mouse, touch, keys), state changes, loop, camera, and turning game.events into sound and FX
- tools/check-level.js: bot that checks the level is beatable (about 10 min). Run after level edits

## Rules
- Vanilla JS + canvas only. No libraries, no build step, no new files unless needed.
- Custom physics (AABB, friction `vx *= exp(-K*friction*dt)`). Do not add a physics engine.
- Tune numbers in config.js, not inline.
- Art and music must be human-made (jam rules). No AI images or audio. Credit assets in CREDITS.md.
- Art sizes are in art pixels (soap 24x16, pump 24x40, tiles 16x16, bg and title/win 320x180). 1 art pixel = 6 world px.
- Platforms sit on the 16 px tile grid. The soap is 1.5 tiles wide: leave 2 tiles to squeeze through, 3 rows to jump.
- Look: soft and gentle, like the team's reference: pastel PAL, tinted outlines (no pure black), calm two-tone backgrounds, sparse props.
- No em dashes in text or comments.

## Run and test
- `python3 -m http.server 8000`, open localhost:8000. Keys: Esc pause, D debug, M map, R restart, S sound, 1-5 zone jump (debug on), Enter starts.
- `node tools/check-level.js` (quick: ANGLE_STEP=10 POWER_STEP=0.1).
- Check there are no console errors after every change.
- The visuals and sounds drawn or synthesised in code are placeholders. Final art and audio must be human-made.
