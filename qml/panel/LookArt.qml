import QtQuick
import "../js/Draw.js" as Draw
import "../js/Visuals.js" as Visuals
import "../js/Colors.js" as Colors
import "../js/Style.js" as PlateStyle
import "../js/Paint.js" as Paint

// A tiny picture of the widget wearing a look: its visual on the side it sits,
// a hint of the title, and the cover when it shows. Used by the look tiles.
Canvas {
    id: root

    property var look: ({})            // values, as Schema.resolve gives them
    property color fg: "white"
    property var levels: []
    property var colorCtx: ({})
    property var pal: null             // the plate's colors: { bg, fg, ac, border, borderAngle }

    renderTarget: Canvas.Image
    readonly property string key: JSON.stringify([look, colorCtx, pal, String(fg), width, height])
    onKeyChanged: requestPaint()
    onVisibleChanged: if (visible) requestPaint()

    function vizIn(ctx, x, y, w, h, orient) {
        const v = root.look || ({})
        const style = Visuals.byKey[v.vizStyle] || Visuals.byKey.bars
        if (style.square) { x += (w - h) / 2; w = h }
        ctx.save()
        ctx.translate(x, y)
        const across = orient === "mirrored" || orient === "turned", upside = orient === "flipped" || orient === "turned"
        if (across || upside) { ctx.translate(across ? w : 0, upside ? h : 0); ctx.scale(across ? -1 : 1, upside ? -1 : 1) }
        const st = Draw.freshState()
        Draw.advance(st, root.levels)
        const cc = Object.assign({ fg: [root.fg.r * 255, root.fg.g * 255, root.fg.b * 255] }, root.colorCtx, { custom: Draw.hex(v.customColor), custom2: Draw.hex(v.customColor2), level: st.level })
        const g = Draw.make({ ctx: ctx, w: w, h: h, levels: root.levels, st: st, mem: {}, count: Math.min(14, v.barCount || 14),
                              colorCtx: cc, colorAt: (t, lv, c) => Colors.at(v.colorMode, t, lv, c) })
        try { style.draw(g) } catch (e) { }
        ctx.restore()
    }

    onPaint: {
        const ctx = getContext("2d")
        ctx.reset()
        const v = root.look || ({})
        let W = width, H = height
        if (W < 4 || H < 4) return
        // the plate first, then everything that sits on it a little further in
        if (v.plate === true && root.pal) {
            const d = Object.assign({}, v, { radius: Math.min(typeof v.radius === "number" ? v.radius : 8, 6) })
            if (d.shadow === "strong") d.shadow = "soft"
            try { Paint.paint(ctx, PlateStyle.params(d, root.pal, W, H, 2, "top")) } catch (e) { }
            ctx.save()
            ctx.translate(9, 0)
            W -= 18
        } else ctx.save()
        const vh = Math.min(H, 14), vy = (H - vh) / 2
        const side = v.vizSide || "left"
        const left = side === "left" || side === "both", right = side === "right" || side === "both"
        const cover = v.coverSide && v.coverSide !== "hidden"
        const vw = right && left ? W * 0.3 : W * 0.38
        const textW = W - (left ? vw + 4 : 0) - (right ? vw + 4 : 0) - (cover ? vh + 4 : 0)
        let x = 0
        if (cover && v.coverSide === "left") { drawCover(ctx, x, vy, vh); x += vh + 4 }
        if (left) { vizIn(ctx, x, vy, vw, vh, v.vizLeftOrient || "normal"); x += vw + 4 }
        if (cover && v.coverSide === "center") { drawCover(ctx, x, vy, vh); x += vh + 4 }
        // the title, as two soft lines of "text"
        ctx.fillStyle = Qt.rgba(root.fg.r, root.fg.g, root.fg.b, 0.35)
        const tw = Math.max(6, textW - (cover && v.coverSide === "right" ? vh + 4 : 0))
        ctx.beginPath()
        ctx.roundedRect(x, H / 2 - 1.5, tw * 0.62, 3, 1.5, 1.5)
        ctx.roundedRect(x + tw * 0.68, H / 2 - 1.5, tw * 0.28, 3, 1.5, 1.5)
        ctx.fill()
        x += tw + 4
        const ro = !v.vizRightOrient || v.vizRightOrient === "auto" ? (side === "both" ? "mirrored" : "normal") : v.vizRightOrient
        if (right) { vizIn(ctx, x, vy, vw, vh, ro); x += vw + 4 }
        if (cover && v.coverSide === "right") drawCover(ctx, x, vy, vh)
        ctx.restore()
    }

    function drawCover(ctx, x, y, s) {
        ctx.fillStyle = Qt.rgba(root.fg.r, root.fg.g, root.fg.b, 0.22)
        ctx.beginPath()
        if (root.look.coverShape === "circle") ctx.arc(x + s / 2, y + s / 2, s / 2, 0, 2 * Math.PI)
        else ctx.roundedRect(x, y, s, s, 2, 2)
        ctx.fill()
    }
}
