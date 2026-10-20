.pragma library
.import "../Draw.js" as Draw

var color = {
    key: "rainbow",
    label: "Rainbow",
    about: "Red through to violet, across the visual.",
    at(t, v, c) { return Draw.hsl(0.85 * t, 0.7, 0.62); }
};
