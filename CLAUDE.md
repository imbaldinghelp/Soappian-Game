# Soappian

2D Foddian browser game (SUTD Winter Game Jam 2026, theme "Slide"), published on itch.io.
A soap thrown in the dustbin climbs back to the sink to knock the pump soap off.
Team: Brian (design), Aaron (hand-drawn art), code roles TBC.

## How it plays
Drag back to aim, a squeeze meter cycles while held, release to launch. The soap can shoot any time
it touches a surface, including while sliding and during the little hop off a hard landing (let go mid-air
and the shot fires on touchdown, SHOT_BUFFER). Esc opens a pause menu (resume, the surface guide, back to the title).
Surfaces are five materials (SURFACES and MATERIALS in config.js), colour = material, slipperiness in bars:
plastic 2 (zone 1), ceramic 3 (zone 2), wet 5 and toilet seat 2.5 (zone 3), towel 1 (zone 4), ceramic and wet
mixed in zone 5. A little board marks where each one first appears; the Esc menu has the full manual.
Every platform side and wall ricochets (SIDE_BOUNCE) with a boing and sparks. A drop taller than the zone it
started in is a fall: the soap flops (sound, dazed for FLOP_TIME, can't shoot) and only then does the pump
soap taunt. Fast falls bring wind (streaks and a roar). Hitting the pump soap flings it as a floppy two piece ragdoll.
The game draws on a 320 x 180 canvas shown 4x (1280 x 720) with smoothing off. The level is built on a
16 px tile grid: 29 tiles wide (the camera scrolls sideways as well as up) and 89 tall, five zones bottom to top
(dustbin, floor tiles, toilet, towel rack, sink), laid out from the team's sketches (1 tile = 32 sketch px), every
ledge one tile wider than drawn (3 at least) to keep it doable.
Ledges are half a tile thick. No checkpoints. The intro: the pump soap shoves the soap over the sink's left lip,
and it drops (in front of the level) into the bin.
Flow: title screen -> intro cutscene (pump shoves the soap off the sink into the bin, click skips) -> play -> win.

## Files
- index.html: one canvas, loads the scripts in order (no modules, shared globals)
- js/config.js: ALL tunable numbers, palette, surfaces, taunts, intro timing, sound and art file names
- js/level.js: level data only, in tiles (plat(col, row, w, surface, opts) for solids, deco(kind, col, row, opts) for scenery)
- js/soap.js: physics, meter, launch, falls, win, the pump ragdoll. No drawing, no DOM.
  Pushes events (launch, land, bounce, flop, getup, win, bonk) onto game.events instead of playing sounds
- js/audio.js: sound effects. The team's recordings (assets/audio, SOUND_FILES in config.js), synth placeholders for
  the rest. 'wind' (free fall) and 'slide' (sliding on wet) are loops whose volume follows the action.
  Ordinary landings make no sound (dust only); a flop does
- js/draw.js: the world, drawn straight on the 320x180 page canvas (soft 8-bit style): pixel font, platforms by surface, wall bands,
  scenery (DECO), pump, soap, particles (FX), aim and meter, and drawFrame which puts a frame together
- js/screens.js: drawn on top of the world: title, intro cutscene (updateIntro + drawIntro), HUD,
  taunts, pause menu (with the surface manual), win screen, and the button rectangles
- js/main.js: canvas scaling, input (mouse, touch, keys), state changes, loop, camera, and turning game.events into sound and FX
- tools/check-level.js: bot that checks the level is beatable (about 10 min). Run after level edits

## Rules
- Vanilla JS + canvas only. No libraries, no build step, no new files unless needed.
- Custom physics (AABB, friction `vx *= exp(-K*friction*dt)`). Do not add a physics engine.
- Tune numbers in config.js, not inline.
- Art and music must be human-made (jam rules). No AI images or audio. Credit assets in CREDITS.md.
- Art is in assets/texture/ (ART in config.js; USE_ART on). Sizes in art pixels: soap 24x16 (the bar inside it, 23x12,
  is the hitbox SOAP_W x SOAP_H), pump 24x40, bin prop 16x16, tiles 16x16, bg and title 320x180 (not drawn yet).
  Sprites are lined up by their non-transparent part, so empty margins in a PNG are fine. 1 art pixel = 6 world px.
- Platforms sit on the 16 px tile grid, half a tile thick by default. The soap is about 1.4 tiles wide and 3/4 tall.
- Look: soft and gentle, like the team's reference: pastel PAL, tinted outlines (no pure black), calm two-tone backgrounds, sparse props.
- No em dashes in text or comments.

## Run and test
- `python3 -m http.server 8000`, open localhost:8000. Keys: Esc pause, D debug, M map, R restart, S sound, 1-5 zone jump (debug on), Enter starts.
- `node tools/check-level.js` (quick: ANGLE_STEP=10 POWER_STEP=0.1).
- Check there are no console errors after every change.
- The visuals and sounds drawn or synthesised in code are placeholders. Final art and audio must be human-made.
