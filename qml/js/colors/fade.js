.pragma library

var color = {
    key: "fade",
    label: "Fade",
    about: "The bar's text color, faint on the left and solid on the right.",
    at(t, v, c) { return [c.fg[0], c.fg[1], c.fg[2], 0.3 + 0.7 * t]; }
};
