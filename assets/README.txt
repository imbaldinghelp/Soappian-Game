Put the PNGs here, then set USE_ART = true in js/config.js.
Transparent PNGs, lowercase names, exact sizes. Missing files fall back to flat shapes.
The game is 8-bit: it draws on a 320 x 180 pixel grid, shown 4x (1280 x 720). Sizes below are in art pixels.
The look is soft and gentle: use the pastel colours in PAL and SURFACES (js/config.js), coloured
outlines rather than black, calm backgrounds. No anti-aliasing, no blur.

soap.png           16 x 12     the soap (squashes and stretches in code)
pump_soap.png      24 x 40     the rival. Rows 0 to 10 are the pump head, 11 to 39 the bottle: they come
                               apart into a ragdoll when it is knocked over
tile_plastic.png   16 x 16     zone 1 (mint). Tiles seamlessly. Ledges are half a tile thick and show the
                               top 8 rows. Keep each material in its colour: the colour is how players
                               tell how slippery it is.
tile_ceramic.png   16 x 16     zone 2 and the sink (white)
tile_wet.png       16 x 16     zones 3 to 5 (blue)
tile_seat.png      16 x 16     toilet seat, zone 3 (butter yellow)
tile_towel.png     16 x 16     zone 4 (pink)
tile_wall.png      16 x 16     the ceiling (coral)
bg_bin.png         320 x 180   zone backdrops, repeated down the zone
bg_floor.png
bg_toilet.png
bg_towel.png
bg_sink.png
title.png          320 x 180   title screen backdrop (the logo and START button are drawn on top)

Sounds live in audio/ and are listed in SOUND_FILES in js/config.js (WAV, OGG or MP3, any file name).
In use: Hitting ground (flops only; ordinary landings are silent), Hitting pump soap (the win),
falling (free-fall loop), sliding on wet (loop). Still synthesised until a file is added: jump, click, push, whistle, clang, bounce, bonk.

Do not use any AI image features, including generative fill. The jam disqualifies AI-made art.
The same goes for sound: no AI voice or audio generators.
Credit every outside asset in CREDITS.md.
