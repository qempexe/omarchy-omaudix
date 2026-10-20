.pragma library
.import "Draw.js" as Draw
.import "colors/theme.js" as Theme
.import "colors/fade.js" as Fade
.import "colors/rainbow.js" as Rainbow
.import "colors/custom.js" as Custom
.import "colors/gradient.js" as Gradient
.import "colors/palette.js" as Palette
.import "colors/border.js" as Border
.import "colors/cover.js" as Cover
.import "colors/heat.js" as Heat
.import "colors/pulse.js" as Pulse
.import "colors/duotone.js" as Duotone

// Every color mode for the visualizer, in the order the settings show them. Each one
// lives in its own file under colors/ (see CONTRIBUTING.md).
//
// A mode is { key, label, about, uses?, at(t, v, c) }:
//   t  where the element sits, 0 (left) .. 1 (right)
//   v  how loud that element is, 0..1, or -1 when it has no loudness of its own
//   c  { fg, custom, custom2, accent, palette, border, cover, level } colors as
//      [r, g, b] (lists of them for palette, border and cover), level 0..1
// and returns [r, g, b] or [r, g, b, a].

var list = [
    Theme.color,
    Fade.color,
    Rainbow.color,
    Custom.color,
    Gradient.color,
    Palette.color,
    Border.color,
    Cover.color,
    Heat.color,
    Pulse.color,
    Duotone.color
];

var byKey = {};
var keys = [];
var labels = {};
var abouts = {};
for (var i = 0; i < list.length; i++) {
    byKey[list[i].key] = list[i];
    keys.push(list[i].key);
    labels[list[i].key] = list[i].label;
    abouts[list[i].key] = list[i].about;
}

// the color of mode `key` for one element; anything a mode can't use falls back to fg
function at(key, t, v, c) {
    const mode = byKey[key] || byKey.theme;
    let out = null;
    try { out = mode.at(t, v, c); } catch (e) { out = null; }
    return out && out.length >= 3 ? out : (c.fg || [255, 255, 255]);
}
