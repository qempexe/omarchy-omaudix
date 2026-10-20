.pragma library
.import "../Draw.js" as Draw

var color = {
    key: "border",
    label: "Window border",
    about: "The colors of your theme's active window border, as the same gradient.",
    at(t, v, c) { return Draw.along(c.border, t) || c.accent || c.fg; }
};
