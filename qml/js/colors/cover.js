.pragma library
.import "../Draw.js" as Draw

var color = {
    key: "cover",
    label: "Cover",
    about: "Colors taken from the song's cover, so every song paints it differently.",
    at(t, v, c) { return Draw.along(c.cover, t) || c.accent || c.fg; }
};
