Put the PNGs here, then set USE_ART = true in js/config.js.
Transparent PNGs, lowercase names, exact sizes. Missing files fall back to flat shapes.
The game is 8-bit: it draws on a 320 x 180 pixel grid, shown 4x (1280 x 720). Sizes below are in art pixels.
The look is soft and gentle: use the pastel colours in PAL and SURFACES (js/config.js), coloured
outlines rather than black, calm backgrounds. No anti-aliasing, no blur.

soap.png           24 x 16     the soap (squashes and stretches in code)
pump_soap.png      24 x 40     the rival
tile_floor.png     16 x 16     tiles seamlessly (platforms are whole tiles on a 16 px grid). Dry floor tiles
tile_plastic.png   16 x 16     bin, basket, cup
tile_paper.png     16 x 16     tissue box, toilet rolls
tile_wet.png       16 x 16
tile_towel.png     16 x 16     also the sponge stoppers
tile_seat.png      16 x 16
tile_ceramic.png   16 x 16     toilet, counter
tile_metal.png     16 x 16     chrome rails, dish lips
tile_mirror.png    16 x 16     mirror cabinet
tile_wall.png      16 x 16     rubber bumpers, ceiling
bg_bin.png         320 x 180   zone backdrops, repeated down the zone
bg_floor.png
bg_toilet.png
bg_towel.png
bg_sink.png
title.png          320 x 180   title screen backdrop (the logo and START button are drawn on top)

Sounds (set USE_SOUND_FILES = true in js/config.js; WAV, OGG or MP3, names in SOUND_FILES):
sfx_jump.wav  sfx_land.wav  sfx_checkpoint.wav  sfx_fall.wav  sfx_win.wav
sfx_click.wav  sfx_push.wav  sfx_whistle.wav  sfx_clang.wav
Missing sound files keep the synthesised placeholder.

Do not use any AI image features, including generative fill. The jam disqualifies AI-made art.
The same goes for sound: no AI voice or audio generators.
Credit every outside asset in CREDITS.md.
