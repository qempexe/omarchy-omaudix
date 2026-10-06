import QtQuick

// Draws one visualizer from an array of levels.
//   spectrum styles: levels are 0..1
//   scope style:     levels are -1..1
Item {
    id: root

    property var levels: []
    property string vizStyle: "bars"    // bars mirror wave scope dots led ring area
    property string colorMode: "theme"  // theme fade rainbow custom
    property string customColor: "#7aa2f7"
    property color foreground: "white"
    property int count: 20              // bands drawn by bar-like styles
    property bool flip: false           // mirror horizontally (right-hand copy)

    implicitWidth: 72
    implicitHeight: 18

    onLevelsChanged: canvas.requestPaint()
    onVizStyleChanged: canvas.requestPaint()
    onColorModeChanged: canvas.requestPaint()
    onCustomColorChanged: canvas.requestPaint()
    onForegroundChanged: canvas.requestPaint()
    onCountChanged: canvas.requestPaint()
    onFlipChanged: canvas.requestPaint()
    onWidthChanged: canvas.requestPaint()
    onHeightChanged: canvas.requestPaint()

    function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v) }

    // Level at slot i of n, linearly resampled from whatever the engine sent.
    function at(i, n) {
        var data = root.levels
        var m = data ? data.length : 0
        if (m === 0) return 0
        if (m === 1 || n <= 1) return Number(data[0]) || 0
        var pos = i * (m - 1) / (n - 1)
        var a = Math.floor(pos)
        var b = Math.min(m - 1, a + 1)
        var f = pos - a
        return (Number(data[a]) || 0) * (1 - f) + (Number(data[b]) || 0) * f
    }

    function colorAt(t) {
        var fg = root.foreground
        if (root.colorMode === "fade")
            return Qt.rgba(fg.r, fg.g, fg.b, 0.3 + 0.7 * clamp(t, 0, 1))
        if (root.colorMode === "rainbow")
            return Qt.hsla(0.85 * clamp(t, 0, 1), 0.7, 0.62, 1)
        if (root.colorMode === "custom"
                && /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(String(root.customColor)))
            return Qt.color(String(root.customColor))
        return fg
    }

    function gradientFor(ctx, w) {
        var g = ctx.createLinearGradient(0, 0, w, 0)
        g.addColorStop(0, colorAt(0))
        g.addColorStop(0.5, colorAt(0.5))
        g.addColorStop(1, colorAt(1))
        return g
    }

    // Smooth path through points using midpoint quadratic segments.
    function smoothPath(ctx, xs, ys) {
        var n = xs.length
        ctx.moveTo(xs[0], ys[0])
        for (var i = 1; i < n - 1; i++) {
            ctx.quadraticCurveTo(xs[i], ys[i], (xs[i] + xs[i + 1]) / 2, (ys[i] + ys[i + 1]) / 2)
        }
        ctx.lineTo(xs[n - 1], ys[n - 1])
    }

    function bandGeometry(w) {
        var n = Math.max(2, Math.min(root.count, Math.floor(w / 2)))
        var gap = Math.max(1, Math.round(w / n * 0.22))
        var bw = Math.max(1, (w - gap * (n - 1)) / n)
        return { n: n, gap: gap, bw: bw }
    }

    Canvas {
        id: canvas
        anchors.fill: parent
        renderTarget: Canvas.Image

        onPaint: {
            var ctx = getContext("2d")
            ctx.reset()
            var w = width
            var h = height
            if (w < 2 || h < 2) return
            if (root.flip) {
                ctx.translate(w, 0)
                ctx.scale(-1, 1)
            }
            var i, v, x

            if (root.vizStyle === "bars" || root.vizStyle === "mirror") {
                var g = root.bandGeometry(w)
                for (i = 0; i < g.n; i++) {
                    v = root.clamp(root.at(i, g.n), 0, 1)
                    var bh = Math.max(2, v * h)
                    x = i * (g.bw + g.gap)
                    ctx.fillStyle = root.colorAt(i / (g.n - 1))
                    ctx.fillRect(x, root.vizStyle === "bars" ? h - bh : (h - bh) / 2, g.bw, bh)
                }
            } else if (root.vizStyle === "dots") {
                var d = root.bandGeometry(w)
                var r = Math.max(1.2, Math.min(d.bw / 2, 3))
                for (i = 0; i < d.n; i++) {
                    v = root.clamp(root.at(i, d.n), 0, 1)
                    ctx.fillStyle = root.colorAt(i / (d.n - 1))
                    ctx.beginPath()
                    ctx.arc(i * (d.bw + d.gap) + d.bw / 2, h - r - v * (h - 2 * r), r, 0, 2 * Math.PI)
                    ctx.fill()
                }
            } else if (root.vizStyle === "led") {
                var l = root.bandGeometry(w)
                var segs = Math.max(3, Math.floor(h / 3.5))
                var segH = h / segs
                for (i = 0; i < l.n; i++) {
                    var lit = Math.round(root.clamp(root.at(i, l.n), 0, 1) * segs)
                    ctx.fillStyle = root.colorAt(i / (l.n - 1))
                    for (var s = 0; s < segs; s++) {
                        ctx.globalAlpha = s < lit ? 1.0 : 0.14
                        ctx.fillRect(i * (l.bw + l.gap), h - (s + 1) * segH + 1, l.bw, Math.max(1, segH - 1))
                    }
                }
                ctx.globalAlpha = 1.0
            } else if (root.vizStyle === "wave") {
                var pts = 24
                var mid = h / 2
                var xs = []
                var ys = []
                for (i = 0; i < pts; i++) {
                    v = root.clamp(root.at(i, pts), 0, 1)
                    xs.push(i * w / (pts - 1))
                    ys.push(mid - Math.max(1, v * (mid - 1)))
                }
                for (i = pts - 1; i >= 0; i--) {
                    xs.push(i * w / (pts - 1))
                    ys.push(2 * mid - ys[i])
                }
                ctx.fillStyle = root.gradientFor(ctx, w)
                ctx.beginPath()
                root.smoothPath(ctx, xs, ys)
                ctx.closePath()
                ctx.fill()
            } else if (root.vizStyle === "scope") {
                var cnt = 48
                var cy = h / 2
                var sx = []
                var sy = []
                for (i = 0; i < cnt; i++) {
                    v = root.clamp(root.at(i, cnt), -1, 1)
                    sx.push(i * w / (cnt - 1))
                    sy.push(cy - v * (cy - 1))
                }
                ctx.strokeStyle = root.gradientFor(ctx, w)
                ctx.lineWidth = 1.6
                ctx.lineJoin = "round"
                ctx.lineCap = "round"
                ctx.beginPath()
                root.smoothPath(ctx, sx, sy)
                ctx.stroke()
            } else if (root.vizStyle === "area") {
                var apts = 24
                var axs = []
                var ays = []
                for (i = 0; i < apts; i++) {
                    v = root.clamp(root.at(i, apts), 0, 1)
                    axs.push(i * w / (apts - 1))
                    ays.push(h - Math.max(1.5, v * (h - 1)))
                }
                // soft filled silhouette rising from the floor, with a crisp top edge
                ctx.fillStyle = root.gradientFor(ctx, w)
                ctx.globalAlpha = 0.4
                ctx.beginPath()
                root.smoothPath(ctx, axs, ays)
                ctx.lineTo(w, h)
                ctx.lineTo(0, h)
                ctx.closePath()
                ctx.fill()
                ctx.globalAlpha = 1.0
                ctx.strokeStyle = root.gradientFor(ctx, w)
                ctx.lineWidth = 1.5
                ctx.lineJoin = "round"
                ctx.lineCap = "round"
                ctx.beginPath()
                root.smoothPath(ctx, axs, ays)
                ctx.stroke()
            } else if (root.vizStyle === "ring") {
                var size = Math.min(w, h)
                var cx = w / 2
                var cyR = h / 2
                var r0 = size * 0.26
                var maxLen = size / 2 - r0 - 0.5
                var spokes = 24
                var half = spokes / 2
                ctx.lineWidth = Math.max(1.2, size * 0.07)
                ctx.lineCap = "round"
                for (i = 0; i < spokes; i++) {
                    var idx = i < half ? i : spokes - 1 - i
                    v = root.clamp(root.at(idx, half), 0, 1)
                    var len = Math.max(1, v * maxLen)
                    var ang = i / spokes * 2 * Math.PI - Math.PI / 2
                    ctx.strokeStyle = root.colorAt(idx / (half - 1))
                    ctx.beginPath()
                    ctx.moveTo(cx + Math.cos(ang) * r0, cyR + Math.sin(ang) * r0)
                    ctx.lineTo(cx + Math.cos(ang) * (r0 + len), cyR + Math.sin(ang) * (r0 + len))
                    ctx.stroke()
                }
            }
        }
    }
}
