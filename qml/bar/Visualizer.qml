import QtQuick
import "../js/Draw.js" as Draw
import "../js/Visuals.js" as Visuals
import "../js/Colors.js" as Colors

// Draws one visualizer from an array of levels.
//   spectrum styles: levels are 0..1
//   scope style:     levels are -1..1
//
// The styles live in js/visuals/ and the color modes in js/colors/; this item only
// keeps the motion between frames and hands each frame to the chosen style.
Item {
    id: root

    property var levels: []
    property string vizStyle: "bars"
    property string colorMode: "theme"
    property string customColor: "#7aa2f7"
    property string customColor2: "#f7768e"
    property color foreground: "white"
    property color accent: foreground   // the theme's accent
    property var themeColors: []        // the theme's colors, "#rrggbb"
    property var borderColors: []       // the active window border's colors, "#rrggbb"
    property var coverColors: []        // the cover's main colors, [r, g, b]
    property int count: 20              // bands drawn by bar-like styles
    // normal | flipped (upside down) | mirrored (right to left) | turned (both)
    property string orient: "normal"
    property string glow: "none"         // none | soft | strong: a halo in the visual's own colors

    // loudness, bass, where the energy sits... advanced once per audio frame, so
    // nothing moves while the music is paused
    property var st: Draw.freshState()
    // what the current style keeps between frames
    property var mem: ({})

    implicitWidth: 72
    implicitHeight: 18

    function rgbOf(c) { return [c.r * 255, c.g * 255, c.b * 255] }

    function hexList(list) {
        const out = []
        for (const h of list || []) { const c = Draw.hex(h); if (c) out.push(c) }
        return out
    }

    readonly property var colorCtx: ({
        fg: rgbOf(root.foreground),
        accent: rgbOf(root.accent),
        custom: Draw.hex(root.customColor),
        custom2: Draw.hex(root.customColor2),
        palette: hexList(root.themeColors),
        border: hexList(root.borderColors),
        cover: root.coverColors || []
    })

    onLevelsChanged: { Draw.advance(root.st, root.levels); canvas.requestPaint() }
    onVizStyleChanged: { root.mem = ({}); canvas.requestPaint() }
    onColorModeChanged: canvas.requestPaint()
    onColorCtxChanged: canvas.requestPaint()
    onCountChanged: canvas.requestPaint()
    onOrientChanged: canvas.requestPaint()
    onGlowChanged: canvas.requestPaint()
    onHaloChanged: canvas.requestPaint()
    onWidthChanged: canvas.requestPaint()
    onHeightChanged: canvas.requestPaint()
    Component.onCompleted: { Draw.advance(root.st, root.levels); canvas.requestPaint() }

    // a glow needs room around the visual, or it ends in a hard box
    readonly property real halo: glow === "strong" ? 7 : (glow === "soft" ? 4 : 0)

    Canvas {
        id: canvas
        anchors.fill: parent
        anchors.margins: -root.halo
        renderTarget: Canvas.Image

        onPaint: {
            const ctx = getContext("2d")
            ctx.reset()
            const w = width - 2 * root.halo, h = height - 2 * root.halo
            if (w < 2 || h < 2) return
            ctx.translate(root.halo, root.halo)
            const across = root.orient === "mirrored" || root.orient === "turned"
            const upside = root.orient === "flipped" || root.orient === "turned"
            if (across || upside) {
                ctx.translate(across ? w : 0, upside ? h : 0)
                ctx.scale(across ? -1 : 1, upside ? -1 : 1)
            }
            const style = Visuals.byKey[root.vizStyle] || Visuals.byKey.bars
            const mode = root.colorMode
            const g = Draw.make({
                ctx: ctx, w: w, h: h, levels: root.levels, st: root.st, mem: root.mem,
                count: root.count, colorCtx: Object.assign({ level: root.st.level }, root.colorCtx),
                colorAt: (t, v, c) => Colors.at(mode, t, v, c)
            })
            if (root.glow === "soft" || root.glow === "strong") {
                ctx.shadowBlur = root.glow === "strong" ? 6 : 3
                ctx.shadowColor = g.color(0.5, -1, root.glow === "strong" ? 0.95 : 0.75)
            }
            try { style.draw(g) } catch (e) { console.warn("Omaudix: " + style.key + ": " + e) }
        }
    }
}
