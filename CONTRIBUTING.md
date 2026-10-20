# Contributing

New visuals and color modes are welcome. Each one is a single small file, so adding one never means touching the drawing code of the others.

## A new visual

1. Copy a visual close to what you have in mind, for example `qml/js/visuals/bars.js`, to `qml/js/visuals/<key>.js`.
2. Give it a key (lowercase letters and digits), a label and a one-line `about`. The settings show the label on its tile and the `about` under the row.
3. Write `draw(g)`. Everything you need comes in `g`, described at the top of `qml/js/Draw.js`:
   - `g.ctx`, `g.w`, `g.h`: the canvas and its size. The bar is short, often 18 px, so test small.
   - `g.at(i, n)`: the level of slot `i` out of `n`, from 0 to 1. Ask for as many slots as you want to draw; the frame is resampled for you.
   - `g.st`: loudness, bass, where the energy sits, a falling peak and a phase that moves on each frame.
   - `g.mem`: an object of your own that is kept between frames, for trails or particles. It is emptied when someone picks another visual.
   - `g.color(t, v, a)`: the color for an element at position `t` (0 on the left, 1 on the right) as loud as `v`, with opacity `a`. Always ask for colors this way, so your visual works with every color mode.
4. Add one `.import` line and one entry to the list in `qml/js/Visuals.js`, where you want it to appear.
5. Add the key to the `vizStyle` options in `manifest.json`.
6. Run the tests.

Optional flags on the entry:

- `square: true` keeps the visual square whatever width is set (like Ring and Orb).
- `scope: true` asks for the raw sound wave (-1 to 1) instead of the spectrum.

## A new color mode

1. Add `qml/js/colors/<key>.js` with `key`, `label`, `about` and `at(t, v, c)`.
2. `at` returns `[r, g, b]` (0 to 255) or `[r, g, b, a]`. `c` holds the colors you can build from: the bar's text color, the custom colors, the theme's accent and palette, the window border colors, the cover's colors and the current loudness. Any of the lists can be empty, so always fall back to `c.fg`.
3. Add it to `qml/js/Colors.js` and to the `colorMode` options in `manifest.json`.
4. Run the tests.

## Tests

```bash
node tests/test_parts.js          # every visual and color mode, drawn at many sizes
python3 tests/test_manifest.py    # manifest against the code
python3 tests/test_viz.py         # the audio helper
```

`test_parts.js` draws every visual on a pretend canvas at several sizes, with loud, quiet and empty frames, and fails on any broken number. If it passes, the visual will at least never break the bar.

## Style

Modern JavaScript is fine inside functions (`const`, `let`, arrow functions, template strings). Keep the names other files read, such as `var visual` or `var list`, as top-level `var` or `function`: Qt only shares those with the files that import them.
