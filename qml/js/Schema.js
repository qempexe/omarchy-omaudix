.pragma library
.import "Visuals.js" as Visuals
.import "Colors.js" as Colors

// Every setting Omaudix has: where it shows in the settings panel, its options and its
// default, plus the ready made looks. Plain functions, so they can be tested.
//
// An item: { key, label, kind, fallback, hint, options?, labels?, min?, max?, step?,
//            divisor?, decimals?, presets?, maxLength?, when? }
//   kind   enum | viz | colors | scheme | int | bool | string | color
//   when   [{ key, is: [...] }]: the row is dimmed unless every one holds

var PALETTE = ["#7aa2f7", "#bb9af7", "#7dcfff", "#9ece6a", "#e0af68", "#ff9e64", "#f7768e", "#c0caf5"];
var SLOTS = 12;

function lr(extra) {
    const out = { left: "Left", right: "Right" };
    for (const k in extra || {}) out[k] = extra[k];
    return out;
}

var tabs = [
    { key: "looks", title: "Looks", kind: "looks", groups: [] },
    { key: "player", title: "Player", kind: "players", groups: [
        { title: "Players", items: [
            { key: "pauseOthers", label: "Pause the old player", kind: "bool", fallback: false,
              hint: "When another player starts playing, pause the one that was playing before." }
        ] },
        { title: "At login", items: [
            { key: "startPlayer", label: "Follow at login", kind: "enum", fallback: "last",
              options: ["last", "auto"], labels: { last: "The last one picked", auto: "Auto" },
              hint: "Keep following the player you picked last time, or start on Auto." },
            { key: "autoPlay", label: "Start playing at login", kind: "bool", fallback: false,
              hint: "Asks the followed player to play once the shell is up. Only works for players that are already open." }
        ] }
    ] },
    { key: "visual", title: "Visual", groups: [
        { title: "Style", items: [
            { key: "vizStyle", label: "Style", kind: "viz", fallback: "bars",
              options: Visuals.keys, labels: Visuals.labels, abouts: Visuals.abouts,
              hint: "How the music is drawn. Scroll the wheel over the widget to flip through them." },
            { key: "vizSide", label: "Placement", kind: "enum", fallback: "left",
              options: ["left", "right", "both", "hidden"], labels: lr({ both: "Both", hidden: "Hidden" }),
              hint: "Which side of the text it sits on. Both mirrors it." },
            { key: "vizWidth", label: "Width", kind: "int", fallback: 72, min: 24, max: 240, step: 4,
              hint: "How wide it is. Round styles always stay square.",
              when: [{ key: "vizSide", is: ["left", "right", "both"] }] },
            { key: "barCount", label: "Bar count", kind: "int", fallback: 20, min: 6, max: 64, step: 2,
              hint: "Fewer looks chunky, more looks fine. Used by bar-like styles." }
        ] },
        { title: "Response", items: [
            { key: "sensitivity", label: "Sensitivity", kind: "int", fallback: 100, min: 25, max: 400, step: 5,
              divisor: 100, decimals: 2, hint: "How tall it gets. 1 is normal, 2 is twice as tall." },
            { key: "smoothing", label: "Smoothing", kind: "int", fallback: 60, min: 0, max: 100, step: 5,
              hint: "Higher means bars fall more gently." },
            { key: "fps", label: "Frame rate", kind: "int", fallback: 30, min: 15, max: 60, step: 5,
              hint: "Smoother motion, but uses more CPU." },
            { key: "engine", label: "Engine", kind: "enum", fallback: "auto",
              options: ["auto", "cava", "builtin"], labels: { auto: "Auto", cava: "Cava", builtin: "Built-in" },
              hint: "Auto uses cava when installed, otherwise the built-in analyzer." }
        ] }
    ] },
    { key: "colors", title: "Colors", groups: [
        { title: "Visual", items: [
            { key: "colorMode", label: "Color", kind: "colors", fallback: "theme",
              options: Colors.keys, labels: Colors.labels, abouts: Colors.abouts,
              hint: "Theme follows your bar." },
            { key: "customColor", label: "Custom color", kind: "color", fallback: "#7aa2f7", presets: PALETTE,
              hint: "Pick one, or type a hex like #7aa2f7.",
              when: [{ key: "colorMode", is: ["custom"] }] }
        ] },
        { title: "This panel", items: [
            { key: "panelColor", label: "Panel colors", kind: "scheme", fallback: "theme",
              options: ["theme", "custom", "monochrome"],
              labels: { theme: "Follow theme", custom: "Custom", monochrome: "Monochrome" },
              hint: "Colors of this panel. Follow theme brings in your theme's accent." },
            { key: "panelCustomColor", label: "Panel accent color", kind: "color", fallback: "#7aa2f7", presets: PALETTE,
              hint: "Pick one, or type a hex like #7aa2f7.",
              when: [{ key: "panelColor", is: ["custom"] }] }
        ] }
    ] },
    { key: "text", title: "Text", groups: [
        { title: "What", items: [
            { key: "showText", label: "Show track text", kind: "bool", fallback: true,
              hint: "Artist and title next to the visualizer." },
            { key: "textFormat", label: "Format", kind: "enum", fallback: "artist-title",
              options: ["artist-title", "title-artist", "title", "artist"],
              labels: { "artist-title": "Artist – Title", "title-artist": "Title – Artist", title: "Title", artist: "Artist" },
              hint: "What to show, and in which order.",
              when: [{ key: "showText", is: [true] }] },
            { key: "separator", label: "Separator", kind: "string", fallback: " - ", maxLength: 5,
              presets: [" - ", " – ", " • ", " | ", " · "],
              hint: "Goes between artist and title.",
              when: [{ key: "showText", is: [true] }, { key: "textFormat", is: ["artist-title", "title-artist"] }] }
        ] },
        { title: "Size and motion", items: [
            { key: "compactText", label: "Shrink to short titles", kind: "bool", fallback: true,
              hint: "Short titles sit right next to the buttons. Off keeps a fixed width.",
              when: [{ key: "showText", is: [true] }] },
            { key: "textWidth", label: "Max text width", kind: "int", fallback: 160, min: 60, max: 400, step: 10,
              hint: "Longer titles scroll instead of growing the widget.",
              when: [{ key: "showText", is: [true] }] },
            { key: "scrollDirection", label: "Scroll", kind: "enum", fallback: "left",
              options: ["left", "right", "bounce", "off"], labels: lr({ bounce: "Bounce", off: "Off" }),
              hint: "How long titles move. Off cuts them short instead.",
              when: [{ key: "showText", is: [true] }] },
            { key: "scrollSpeed", label: "Scroll speed", kind: "int", fallback: 35, min: 10, max: 120, step: 5,
              hint: "Higher is faster.",
              when: [{ key: "showText", is: [true] }, { key: "scrollDirection", is: ["left", "right", "bounce"] }] },
            { key: "scrollPause", label: "Pause before scroll", kind: "int", fallback: 1500, min: 0, max: 5000, step: 250,
              divisor: 1000, decimals: 2, hint: "Seconds the text waits so you can read the start.",
              when: [{ key: "showText", is: [true] }, { key: "scrollDirection", is: ["left", "right", "bounce"] }] },
            { key: "textAlign", label: "Alignment", kind: "enum", fallback: "left",
              options: ["left", "center", "right"], labels: lr({ center: "Center" }),
              hint: "For text short enough to fit without scrolling.",
              when: [{ key: "showText", is: [true] }] }
        ] }
    ] },
    { key: "cover", title: "Cover", groups: [
        { title: "On the bar", items: [
            { key: "coverSide", label: "Cover on the bar", kind: "enum", fallback: "hidden",
              options: ["hidden", "left", "center", "right"], labels: lr({ hidden: "Hidden", center: "Center" }),
              hint: "Show the song's cover on the bar. Center puts it right before the text." },
            { key: "coverSize", label: "Cover size", kind: "int", fallback: 16, min: 10, max: 36, step: 2,
              hint: "How big the cover is on the bar.",
              when: [{ key: "coverSide", is: ["left", "center", "right"] }] }
        ] },
        { title: "In this panel", items: [
            { key: "showAlbumArt", label: "Cover in this panel", kind: "bool", fallback: true,
              hint: "Show the current cover in the header above." }
        ] }
    ] },
    { key: "behavior", title: "Behavior", groups: [
        { title: "Buttons", items: [
            { key: "showControls", label: "Playback buttons", kind: "bool", fallback: true,
              hint: "Previous, play/pause and next." },
            { key: "controlsSide", label: "Buttons side", kind: "enum", fallback: "right",
              options: ["left", "right"], labels: lr(),
              hint: "Which end of the widget holds them.",
              when: [{ key: "showControls", is: [true] }] }
        ] },
        { title: "Mouse", items: [
            { key: "clickAction", label: "Left click", kind: "enum", fallback: "playPause",
              options: ["playPause", "next", "none"], labels: { playPause: "Play / Pause", next: "Next track", none: "Nothing" },
              hint: "On the visualizer or text. Middle click always skips." },
            { key: "wheelAction", label: "Scroll wheel", kind: "enum", fallback: "track",
              options: ["track", "style", "none"], labels: { track: "Skip tracks", style: "Change style", none: "Nothing" },
              hint: "Style changes are saved as you scroll." }
        ] },
        { title: "Showing", items: [
            { key: "hideWhenPaused", label: "Hide when paused", kind: "bool", fallback: false,
              hint: "Remove the widget from the bar while nothing plays." },
            { key: "startLook", label: "Look at login", kind: "enum", fallback: "keep",
              options: ["keep", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
              labels: { keep: "As I left it" },
              hint: "Start every session with one of your saved looks, whatever was changed the day before." }
        ] }
    ] }
];

// ---- every item, by key --------------------------------------------------------------

var items = [];
var byKey = {};
for (var ti = 0; ti < tabs.length; ti++) {
    for (var gi = 0; gi < tabs[ti].groups.length; gi++) {
        var grp = tabs[ti].groups[gi];
        for (var ii = 0; ii < grp.items.length; ii++) {
            var it = grp.items[ii];
            it.tab = tabs[ti].key;
            it.group = grp.title;
            items.push(it);
            byKey[it.key] = it;
        }
    }
}
// kept but not shown as a row: the player picked in the Player tab
var hidden = { player: "auto" };

function defaults() {
    const out = {};
    for (const it of items) out[it.key] = it.fallback;
    for (const k in hidden) out[k] = hidden[k];
    return out;
}

// one value, checked against its item; anything unknown or broken gives the default
function cleanValue(key, v) {
    const it = byKey[key];
    if (!it) return hidden[key] !== undefined ? (typeof v === "string" && v.length <= 512 ? v : hidden[key]) : undefined;
    if (v === undefined || v === null) return it.fallback;
    switch (it.kind) {
    case "bool":
        return v === true || v === "true" ? true : (v === false || v === "false" ? false : it.fallback);
    case "int": {
        const n = typeof v === "number" ? v : parseFloat(v);
        return isFinite(n) ? Math.max(it.min, Math.min(it.max, Math.round(n))) : it.fallback;
    }
    case "color":
        return typeof v === "string" && /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v) ? v : it.fallback;
    case "string":
        return typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, "").substring(0, it.maxLength || 256) : it.fallback;
    default: {
        const s = typeof v === "number" ? String(v) : v;
        return typeof s === "string" && it.options.indexOf(s) >= 0 ? s : it.fallback;
    }
    }
}

// every setting, layered: defaults, then the shell's own widget settings, then what
// was changed in the panel. Each value checked.
function resolve(shellSettings, local) {
    const out = {};
    const keys = Object.keys(defaults());
    for (const k of keys) {
        let v;
        if (local && local[k] !== undefined && local[k] !== null) v = local[k];
        else if (shellSettings && shellSettings[k] !== undefined && shellSettings[k] !== null) v = shellSettings[k];
        out[k] = cleanValue(k, v);
    }
    return out;
}

// is an item's row in effect with these values?
function active(it, values) {
    if (!it.when) return true;
    return it.when.every((c) => c.is.map(String).indexOf(String(values[c.key])) >= 0);
}

// ---- looks ------------------------------------------------------------------------------
// A look is how the widget looks: the visual, its colors, the text and the cover. Which
// player it follows and what the mouse does are left alone.

var lookTabs = ["visual", "colors", "text", "cover"];
var lookExclude = { engine: true, fps: true, panelColor: true, panelCustomColor: true, showAlbumArt: true };
var lookKeys = [];
for (var lk = 0; lk < items.length; lk++)
    if (lookTabs.indexOf(items[lk].tab) >= 0 && !lookExclude[items[lk].key]) lookKeys.push(items[lk].key);

var looks = [
    { key: "classic", label: "Classic", set: {} },
    { key: "studio", label: "Studio", set: { vizStyle: "led", barCount: 24, vizWidth: 84 } },
    { key: "neon", label: "Neon", set: { vizStyle: "neon", colorMode: "rainbow", vizWidth: 96 } },
    { key: "mirror", label: "Mirror", set: { vizStyle: "capsules", vizSide: "both", barCount: 28, colorMode: "fade" } },
    { key: "waves", label: "Waves", set: { vizStyle: "wave", vizSide: "both", colorMode: "rainbow" } },
    { key: "pulse", label: "Pulse", set: { vizStyle: "heartbeat", vizWidth: 110, colorMode: "custom", customColor: "#f7768e" } },
    { key: "cosmos", label: "Cosmos", set: { vizStyle: "stellar", colorMode: "rainbow", vizWidth: 96 } },
    { key: "orbit", label: "Orbit", set: { vizStyle: "ring", vizSide: "both", colorMode: "rainbow", coverSide: "center", coverSize: 18 } },
    { key: "comet", label: "Comet", set: { vizStyle: "comet", vizWidth: 120, colorMode: "custom", customColor: "#e0af68" } },
    { key: "scope", label: "Scope", set: { vizStyle: "scope", vizWidth: 96, colorMode: "custom", customColor: "#9ece6a" } },
    { key: "helix", label: "Helix", set: { vizStyle: "helix", vizWidth: 110, colorMode: "rainbow" } },
    { key: "minimal", label: "Minimal", set: { vizStyle: "meter", vizWidth: 48, textFormat: "title", scrollDirection: "bounce" } }
];
var lookByKey = {};
var lookOptions = [];
var lookLabels = {};
for (var li = 0; li < looks.length; li++) {
    lookByKey[looks[li].key] = looks[li];
    lookOptions.push(looks[li].key);
    lookLabels[looks[li].key] = looks[li].label;
}

// a whole ready made look: every look key, from the defaults and the look's own settings
function lookSet(key) {
    const L = lookByKey[key];
    if (!L) return null;
    const d = defaults(), out = {};
    for (const k of lookKeys) out[k] = L.set[k] !== undefined ? cleanValue(k, L.set[k]) : d[k];
    return out;
}
// just the look part of a set of values (for saving, undo and export)
function lookOf(values) {
    const out = {};
    for (const k of lookKeys) if (values[k] !== undefined) out[k] = cleanValue(k, values[k]);
    return out;
}
// the ready made look these values are wearing, or ""
function lookNow(values) {
    for (const L of looks) {
        const want = lookSet(L.key);
        if (lookKeys.every((k) => String(values[k]) === String(want[k]))) return L.key;
    }
    return "";
}
// a look from outside (an import or a saved slot): only look keys, every one checked
function cleanLook(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const out = {};
    let any = false;
    for (const k of lookKeys) if (raw[k] !== undefined) { out[k] = cleanValue(k, raw[k]); any = true; }
    return any ? out : null;
}

// ---- your own saved places ------------------------------------------------------------------
// A place you save keeps every setting there is, not only the look: the player, the
// mouse, the panel, everything, so choosing it again brings all of it back. Only "Look
// at login" stays out, or a saved place would switch itself off at the next login.

var slotSkip = { startLook: true };

// every setting, checked, ready to be kept
function settingsOf(values) {
    const out = {};
    for (const k of Object.keys(defaults())) if (!slotSkip[k]) out[k] = cleanValue(k, values ? values[k] : undefined);
    return out;
}
// a saved set read back: every known setting in it, checked; null when there is none
function cleanSettings(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const out = {};
    let any = false;
    for (const k of Object.keys(defaults())) {
        if (slotSkip[k] || raw[k] === undefined) continue;
        out[k] = cleanValue(k, raw[k]);
        any = true;
    }
    return any ? out : null;
}

// ---- search -------------------------------------------------------------------------------

function matches(it, text) {
    const q = String(text || "").trim().toLowerCase();
    if (q === "") return true;
    const hay = (it.label + " " + (it.hint || "") + " " + it.group).toLowerCase();
    return q.split(/\s+/).every((w) => hay.indexOf(w) >= 0);
}
