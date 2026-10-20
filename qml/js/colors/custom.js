.pragma library

var color = {
    key: "custom",
    label: "Custom",
    about: "One color of your choice.",
    uses: ["customColor"],
    at(t, v, c) { return c.custom || c.fg; }
};
