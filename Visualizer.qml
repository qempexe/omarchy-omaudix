import QtQuick

// Draws one visualizer from an array of levels.
//   spectrum styles: levels are 0..1
//   scope style:     levels are -1..1
//
// Styles: bars mirror wave scope dots led ring area peaks capsules steps neon
//         lightning heartbeat ripple helix comet stellar meter orb
Item {
    id: root

    property var levels: []
    property string vizStyle: "bars"
    property string colorMode: "theme"  // theme fade rainbow custom
    property string customColor: "#7aa2f7"
    property color foreground: "white"
    property int count: 20              // bands drawn by bar-like styles
    property bool flip: false           // mirror horizontally (right-hand copy)

    // Motion state, advanced once per audio frame (so nothing moves while paused).
    property real phase: 0              // travelling phase for ripple / helix
    property real level: 0              // overall loudness 0..1 (eased)
    property real bassLevel: 0          // low end loudness 0..1 (eased)
    property real cometX: 0.5           // where the energy sits, 0 = lows, 1 = highs (eased)
    property real peakLevel: 0          // slowly falling max of `level`
    property var peaks: []              // slowly falling per-band maxima

    // Styles that animate between frames and so must repaint while easing.
    readonly property bool eased: vizStyle === "comet" || vizStyle === "meter" || vizStyle === "orb"

    implicitWidth: 72
    implicitHeight: 18

    Behavior on level { NumberAnimation { duration: 90 } }
    Behavior on bassLevel { NumberAnimation { duration: 90 } }
    Behavior on cometX { NumberAnimation { duration: 150; easing.type: Easing.OutCubic } }

    onLevelsChanged: { refresh(); canvas.requestPaint() }
    onVizStyleChanged: canvas.requestPaint()
    onColorModeChanged: canvas.requestPaint()
    onCustomColorChanged: canvas.requestPaint()
    onForegroundChanged: canvas.requestPaint()
    onCountChanged: canvas.requestPaint()
    onFlipChanged: canvas.requestPaint()
    onWidthChanged: canvas.requestPaint()
    onHeightChanged: canvas.requestPaint()
    onLevelChanged: if (eased) canvas.requestPaint()
    onBassLevelChanged: if (eased) canvas.requestPaint()
    onCometXChanged: if (eased) canvas.requestPaint()
    Component.onCompleted: { refresh(); canvas.requestPaint() }

    function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v) }

    // Level at slot i of n, linearly resampled from whatever the engine sent.
    function sample(data, i, n) {
        var m = data ? data.length : 0
        if (m === 0) return 0
        if (m === 1 || n <= 1) return Number(data[0]) || 0
        var pos = i * (m - 1) / (n - 1)
        var a = Math.floor(pos)
        var b = Math.min(m - 1, a + 1)
        var f = pos - a
        return (Number(data[a]) || 0) * (1 - f) + (Number(data[b]) || 0) * f
    }
    function at(i, n) { return sample(root.levels, i, n) }

    // Called on every new frame: update loudness, centre of energy, peaks, phase.
    function refresh() {
        var data = root.levels
        var m = data ? data.length : 0
        var sum = 0
        var weighted = 0
        var low = 0
        var lowN = 0
        var quarter = Math.max(1, Math.floor(m / 4))
        var i
        for (i = 0; i < m; i++) {
            var v = Math.abs(Number(data[i]) || 0)
            sum += v
            weighted += v * i
            if (i < quarter) { low += v; lowN++ }
        }
        var avg = m > 0 ? sum / m : 0
        var now = clamp(avg * 1.7, 0, 1)
        root.level = now
        root.bassLevel = clamp((lowN > 0 ? low / lowN : 0) * 1.3, 0, 1)
        if (m > 1 && sum > 0.05)
            root.cometX = clamp(weighted / sum / (m - 1) * 1.7, 0, 1)
        root.peakLevel = Math.max(now, root.peakLevel - 0.02)

        var np = 64
        var old = root.peaks
        var next = new Array(np)
        for (i = 0; i < np; i++) {
            var held = (old && old.length === np) ? old[i] : 0
            next[i] = Math.max(clamp(Math.abs(sample(data, i, np)), 0, 1), held - 0.03)
        }
        root.peaks = next
        root.phase = (root.phase + 0.3) % (2 * Math.PI)
    }

    function withAlpha(c, a) { return Qt.rgba(c.r, c.g, c.b, a) }

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

    function polyPath(ctx, xs, ys) {
        ctx.moveTo(xs[0], ys[0])
        for (var i = 1; i < xs.length; i++) ctx.lineTo(xs[i], ys[i])
    }

    // A line with a soft halo: two wide faint passes under a crisp core.
    function glowLine(ctx, w, xs, ys, smooth, core) {
        var passes = [[core * 3.4, 0.13], [core * 2.0, 0.25], [core, 1.0]]
        ctx.lineJoin = "round"
        ctx.lineCap = "round"
        ctx.strokeStyle = root.gradientFor(ctx, w)
        for (var k = 0; k < passes.length; k++) {
            ctx.globalAlpha = passes[k][1]
            ctx.lineWidth = passes[k][0]
            ctx.beginPath()
            if (smooth) root.smoothPath(ctx, xs, ys)
            else root.polyPath(ctx, xs, ys)
            ctx.stroke()
        }
        ctx.globalAlpha = 1.0
    }

    function bandGeometry(w) {
        var n = Math.max(2, Math.min(root.count, Math.floor(w / 2)))
        var gap = Math.max(1, Math.round(w / n * 0.22))
        var bw = Math.max(1, (w - gap * (n - 1)) / n)
        return { n: n, gap: gap, bw: bw }
    }

    // ---- the original styles ------------------------------------------------------
    function drawBars(ctx, w, h, mirrored) {
        var g = bandGeometry(w)
        for (var i = 0; i < g.n; i++) {
            var v = clamp(at(i, g.n), 0, 1)
            var bh = Math.max(2, v * h)
            ctx.fillStyle = colorAt(i / (g.n - 1))
            ctx.fillRect(i * (g.bw + g.gap), mirrored ? (h - bh) / 2 : h - bh, g.bw, bh)
        }
    }

    function drawDots(ctx, w, h) {
        var d = bandGeometry(w)
        var r = Math.max(1.2, Math.min(d.bw / 2, 3))
        for (var i = 0; i < d.n; i++) {
            var v = clamp(at(i, d.n), 0, 1)
            ctx.fillStyle = colorAt(i / (d.n - 1))
            ctx.beginPath()
            ctx.arc(i * (d.bw + d.gap) + d.bw / 2, h - r - v * (h - 2 * r), r, 0, 2 * Math.PI)
            ctx.fill()
        }
    }

    function drawLed(ctx, w, h) {
        var l = bandGeometry(w)
        var segs = Math.max(3, Math.floor(h / 3.5))
        var segH = h / segs
        for (var i = 0; i < l.n; i++) {
            var lit = Math.round(clamp(at(i, l.n), 0, 1) * segs)
            ctx.fillStyle = colorAt(i / (l.n - 1))
            for (var s = 0; s < segs; s++) {
                ctx.globalAlpha = s < lit ? 1.0 : 0.14
                ctx.fillRect(i * (l.bw + l.gap), h - (s + 1) * segH + 1, l.bw, Math.max(1, segH - 1))
            }
        }
        ctx.globalAlpha = 1.0
    }

    function drawWave(ctx, w, h) {
        var pts = 24
        var mid = h / 2
        var xs = []
        var ys = []
        var i
        for (i = 0; i < pts; i++) {
            xs.push(i * w / (pts - 1))
            ys.push(mid - Math.max(1, clamp(at(i, pts), 0, 1) * (mid - 1)))
        }
        for (i = pts - 1; i >= 0; i--) {
            xs.push(i * w / (pts - 1))
            ys.push(2 * mid - ys[i])
        }
        ctx.fillStyle = gradientFor(ctx, w)
        ctx.beginPath()
        smoothPath(ctx, xs, ys)
        ctx.closePath()
        ctx.fill()
    }

    function drawScope(ctx, w, h) {
        var cnt = 48
        var cy = h / 2
        var sx = []
        var sy = []
        for (var i = 0; i < cnt; i++) {
            sx.push(i * w / (cnt - 1))
            sy.push(cy - clamp(at(i, cnt), -1, 1) * (cy - 1))
        }
        ctx.strokeStyle = gradientFor(ctx, w)
        ctx.lineWidth = 1.6
        ctx.lineJoin = "round"
        ctx.lineCap = "round"
        ctx.beginPath()
        smoothPath(ctx, sx, sy)
        ctx.stroke()
    }

    function drawArea(ctx, w, h) {
        var apts = 24
        var axs = []
        var ays = []
        for (var i = 0; i < apts; i++) {
            axs.push(i * w / (apts - 1))
            ays.push(h - Math.max(1.5, clamp(at(i, apts), 0, 1) * (h - 1)))
        }
        ctx.fillStyle = gradientFor(ctx, w)
        ctx.globalAlpha = 0.4
        ctx.beginPath()
        smoothPath(ctx, axs, ays)
        ctx.lineTo(w, h)
        ctx.lineTo(0, h)
        ctx.closePath()
        ctx.fill()
        ctx.globalAlpha = 1.0
        ctx.strokeStyle = gradientFor(ctx, w)
        ctx.lineWidth = 1.5
        ctx.lineJoin = "round"
        ctx.lineCap = "round"
        ctx.beginPath()
        smoothPath(ctx, axs, ays)
        ctx.stroke()
    }

    function drawRing(ctx, w, h) {
        var size = Math.min(w, h)
        var cx = w / 2
        var cyR = h / 2
        var r0 = size * 0.26
        var maxLen = size / 2 - r0 - 0.5
        var spokes = 24
        var half = spokes / 2
        ctx.lineWidth = Math.max(1.2, size * 0.07)
        ctx.lineCap = "round"
        for (var i = 0; i < spokes; i++) {
            var idx = i < half ? i : spokes - 1 - i
            var len = Math.max(1, clamp(at(idx, half), 0, 1) * maxLen)
            var ang = i / spokes * 2 * Math.PI - Math.PI / 2
            ctx.strokeStyle = colorAt(idx / (half - 1))
            ctx.beginPath()
            ctx.moveTo(cx + Math.cos(ang) * r0, cyR + Math.sin(ang) * r0)
            ctx.lineTo(cx + Math.cos(ang) * (r0 + len), cyR + Math.sin(ang) * (r0 + len))
            ctx.stroke()
        }
    }

    // ---- new styles -----------------------------------------------------------------
    // Bars with a small cap that hangs at the recent maximum and falls slowly.
    function drawPeaks(ctx, w, h) {
        var g = bandGeometry(w)
        var capH = Math.max(1.5, h * 0.1)
        for (var i = 0; i < g.n; i++) {
            var x = i * (g.bw + g.gap)
            var t = i / (g.n - 1)
            var v = clamp(at(i, g.n), 0, 1)
            var bh = Math.max(1.5, v * (h - capH - 1))
            ctx.fillStyle = withAlpha(colorAt(t), 0.8)
            ctx.fillRect(x, h - bh, g.bw, bh)
            var p = clamp(sample(root.peaks, i, g.n), 0, 1)
            ctx.fillStyle = colorAt(t)
            ctx.fillRect(x, h - Math.max(bh + 1, p * (h - capH - 1)) - capH, g.bw, capH)
        }
    }

    // Thin rounded pills, growing out from the middle.
    function drawCapsules(ctx, w, h) {
        var g = bandGeometry(w)
        var bw = Math.max(1.5, Math.min(g.bw, 5))
        var step = g.n > 1 ? (w - bw) / (g.n - 1) : 0
        ctx.lineWidth = bw
        ctx.lineCap = "round"
        for (var i = 0; i < g.n; i++) {
            var v = clamp(at(i, g.n), 0, 1)
            var len = Math.max(0, Math.max(bw, v * h) - bw)
            var x = bw / 2 + i * step
            ctx.strokeStyle = colorAt(i / (g.n - 1))
            ctx.beginPath()
            ctx.moveTo(x, h / 2 - len / 2)
            ctx.lineTo(x, h / 2 + len / 2)
            ctx.stroke()
        }
    }

    // Blocky staircase silhouette.
    function drawSteps(ctx, w, h) {
        var n = 16
        var sw = w / n
        var top = []
        var i, v
        ctx.fillStyle = gradientFor(ctx, w)
        ctx.globalAlpha = 0.35
        ctx.beginPath()
        ctx.moveTo(0, h)
        for (i = 0; i < n; i++) {
            v = h - Math.max(1.5, clamp(at(i, n), 0, 1) * (h - 1))
            top.push(v)
            ctx.lineTo(i * sw, v)
            ctx.lineTo((i + 1) * sw, v)
        }
        ctx.lineTo(w, h)
        ctx.closePath()
        ctx.fill()
        ctx.globalAlpha = 1.0
        ctx.strokeStyle = gradientFor(ctx, w)
        ctx.lineWidth = 1.4
        ctx.lineJoin = "miter"
        ctx.lineCap = "butt"
        ctx.beginPath()
        for (i = 0; i < n; i++) {
            if (i === 0) ctx.moveTo(0, top[0])
            else ctx.lineTo(i * sw, top[i])
            ctx.lineTo((i + 1) * sw, top[i])
        }
        ctx.stroke()
    }

    // Glowing spectrum line.
    function drawNeon(ctx, w, h) {
        var n = 28
        var xs = []
        var ys = []
        for (var i = 0; i < n; i++) {
            xs.push(i * w / (n - 1))
            ys.push(h - 2.5 - clamp(at(i, n), 0, 1) * (h - 5))
        }
        glowLine(ctx, w, xs, ys, true, 1.3)
    }

    // Jagged bolt through the middle.
    function drawLightning(ctx, w, h) {
        var n = 16
        var mid = h / 2
        var xs = [0]
        var ys = [mid]
        for (var i = 0; i < n; i++) {
            var v = Math.max(0.08, clamp(at(i, n), 0, 1))
            xs.push((i + 0.5) * w / n)
            ys.push(mid + (i % 2 === 0 ? -1 : 1) * v * (mid - 2.5))
        }
        xs.push(w)
        ys.push(mid)
        glowLine(ctx, w, xs, ys, false, 1.3)
    }

    // ECG trace: one beat per band, as tall as that band is loud.
    function drawHeartbeat(ctx, w, h) {
        var beats = Math.round(clamp(w / 14, 4, 14))
        var shape = [[0, 0], [0.18, 0], [0.26, -0.18], [0.34, 0], [0.42, 0], [0.47, 0.22],
                     [0.54, -1], [0.62, 0.55], [0.68, 0], [0.78, 0], [0.86, -0.25], [0.94, 0], [1, 0]]
        var mid = h / 2
        var amp = mid - 1.5
        var sw = w / beats
        var xs = []
        var ys = []
        for (var b = 0; b < beats; b++) {
            var v = Math.max(0.08, clamp(at(b, beats), 0, 1))
            for (var k = 0; k < shape.length; k++) {
                if (b > 0 && k === 0) continue
                xs.push(b * sw + shape[k][0] * sw)
                ys.push(mid + shape[k][1] * amp * v)
            }
        }
        glowLine(ctx, w, xs, ys, false, 1.3)
    }

    // Travelling sine whose height follows the spectrum, with a faint reflection.
    function drawRipple(ctx, w, h) {
        var n = Math.max(8, Math.min(80, Math.floor(w / 1.2)))
        var mid = h / 2
        var xs = []
        var up = []
        var down = []
        for (var i = 0; i < n; i++) {
            var t = i / (n - 1)
            var amp = (0.12 + 0.88 * clamp(at(i, n), 0, 1)) * (mid - 1.5)
            var s = Math.sin(t * 2 * Math.PI * 2.4 - root.phase) * amp
            xs.push(t * w)
            up.push(mid + s)
            down.push(mid - s)
        }
        ctx.lineJoin = "round"
        ctx.lineCap = "round"
        ctx.strokeStyle = gradientFor(ctx, w)
        ctx.lineWidth = 1.2
        ctx.globalAlpha = 0.3
        ctx.beginPath()
        smoothPath(ctx, xs, down)
        ctx.stroke()
        ctx.globalAlpha = 1.0
        ctx.lineWidth = 1.6
        ctx.beginPath()
        smoothPath(ctx, xs, up)
        ctx.stroke()
    }

    // Two twisting strands joined by rungs.
    function drawHelix(ctx, w, h) {
        var n = Math.max(12, Math.min(96, Math.floor(w / 1.5)))
        var mid = h / 2
        var xs = []
        var a = []
        var b = []
        var i
        for (i = 0; i < n; i++) {
            var t = i / (n - 1)
            var amp = (0.2 + 0.8 * clamp(at(i, n), 0, 1)) * (mid - 1.5)
            var s = Math.sin(t * 2 * Math.PI * 1.6 + root.phase) * amp
            xs.push(t * w)
            a.push(mid + s)
            b.push(mid - s)
        }
        ctx.strokeStyle = gradientFor(ctx, w)
        ctx.lineWidth = 1
        ctx.globalAlpha = 0.28
        ctx.beginPath()
        for (i = 2; i < n - 1; i += 4) {
            ctx.moveTo(xs[i], a[i])
            ctx.lineTo(xs[i], b[i])
        }
        ctx.stroke()
        ctx.globalAlpha = 1.0
        ctx.lineWidth = 1.5
        ctx.lineJoin = "round"
        ctx.lineCap = "round"
        ctx.beginPath()
        smoothPath(ctx, xs, a)
        ctx.stroke()
        ctx.globalAlpha = 0.7
        ctx.beginPath()
        smoothPath(ctx, xs, b)
        ctx.stroke()
        ctx.globalAlpha = 1.0
    }

    // A bright head that sits where the sound's energy is, dragging a tail.
    function drawComet(ctx, w, h) {
        var cy = h / 2
        var r = 1.5 + root.level * 2.6
        var hx = r + clamp(root.cometX, 0, 1) * Math.max(0, w - 2 * r)
        var tx = Math.max(0, hx - w * 0.5)
        ctx.lineCap = "round"
        ctx.lineWidth = 1
        ctx.strokeStyle = withAlpha(colorAt(0.5), 0.22)
        ctx.beginPath()
        ctx.moveTo(0, cy)
        ctx.lineTo(w, cy)
        ctx.stroke()
        if (hx - tx > 1) {
            var g = ctx.createLinearGradient(tx, 0, hx, 0)
            g.addColorStop(0, withAlpha(colorAt(0.2), 0))
            g.addColorStop(1, withAlpha(colorAt(0.8), 0.9))
            ctx.strokeStyle = g
            ctx.lineWidth = Math.max(1.2, r * 0.9)
            ctx.beginPath()
            ctx.moveTo(tx, cy)
            ctx.lineTo(hx, cy)
            ctx.stroke()
        }
        var halos = [[r * 2.3, 0.18], [r * 1.6, 0.32], [r, 1.0]]
        ctx.fillStyle = colorAt(1)
        for (var k = 0; k < halos.length; k++) {
            ctx.globalAlpha = halos[k][1]
            ctx.beginPath()
            ctx.arc(hx, cy, Math.min(halos[k][0], h / 2), 0, 2 * Math.PI)
            ctx.fill()
        }
        ctx.globalAlpha = 1.0
    }

    // Little stars, one per band from low to high, that swell and sparkle with the music.
    function frac(x) { return x - Math.floor(x) }
    function drawStellar(ctx, w, h) {
        var n = Math.max(8, Math.min(18, Math.floor(w / 5)))
        ctx.lineCap = "round"
        for (var i = 0; i < n; i++) {
            var v = clamp(at(i, n), 0, 1)
            var x = (i + 0.2 + 0.6 * frac(Math.sin(i * 12.9898) * 43758.5453)) * w / n
            var y = 2.5 + frac(Math.sin(i * 78.233) * 12345.6789) * (h - 5)
            var r = 0.7 + v * 2.0
            var c = colorAt(i / (n - 1))
            ctx.fillStyle = withAlpha(c, 0.25 + 0.75 * v)
            ctx.beginPath()
            ctx.arc(x, y, r, 0, 2 * Math.PI)
            ctx.fill()
            if (v > 0.65) {
                var len = r * 2.6
                ctx.strokeStyle = withAlpha(c, 0.85)
                ctx.lineWidth = 0.9
                ctx.beginPath()
                ctx.moveTo(x - len, y)
                ctx.lineTo(x + len, y)
                ctx.moveTo(x, Math.max(0.5, y - len))
                ctx.lineTo(x, Math.min(h - 0.5, y + len))
                ctx.stroke()
            }
        }
    }

    // Horizontal level meter with a falling peak marker.
    function drawMeter(ctx, w, h) {
        var th = Math.max(3, h * 0.34)
        var cy = h / 2
        var x0 = th / 2
        var span = Math.max(1, w - th)
        ctx.lineCap = "round"
        ctx.lineWidth = th
        ctx.strokeStyle = withAlpha(colorAt(0.5), 0.14)
        ctx.beginPath()
        ctx.moveTo(x0, cy)
        ctx.lineTo(x0 + span, cy)
        ctx.stroke()
        ctx.strokeStyle = gradientFor(ctx, w)
        ctx.beginPath()
        ctx.moveTo(x0, cy)
        ctx.lineTo(x0 + clamp(root.level, 0, 1) * span, cy)
        ctx.stroke()
        ctx.fillStyle = colorAt(1)
        ctx.globalAlpha = 0.9
        ctx.fillRect(x0 + clamp(root.peakLevel, 0, 1) * span - 1, cy - th / 2 - 1.5, 2, th + 3)
        ctx.globalAlpha = 1.0
    }

    // A pulsing sphere: the core swells with loudness, the rings with the bass.
    function drawOrb(ctx, w, h) {
        var size = Math.min(w, h)
        var cx = w / 2
        var cy = h / 2
        var lim = size / 2 - 0.5
        var r = Math.min(lim, size * 0.15 + clamp(root.level, 0, 1) * size * 0.26)
        var b = clamp(root.bassLevel, 0, 1)
        var rings = [[Math.min(lim, r + size * 0.07 + b * size * 0.06), 0.4],
                     [Math.min(lim, r + size * 0.15 + b * size * 0.1), 0.18]]
        ctx.lineWidth = 1
        for (var k = 0; k < rings.length; k++) {
            ctx.strokeStyle = withAlpha(colorAt(0.7), rings[k][1])
            ctx.beginPath()
            ctx.arc(cx, cy, rings[k][0], 0, 2 * Math.PI)
            ctx.stroke()
        }
        ctx.fillStyle = withAlpha(colorAt(0.3 + 0.6 * clamp(root.level, 0, 1)), 0.95)
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, 2 * Math.PI)
        ctx.fill()
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
            switch (root.vizStyle) {
            case "bars":      root.drawBars(ctx, w, h, false); break
            case "mirror":    root.drawBars(ctx, w, h, true); break
            case "dots":      root.drawDots(ctx, w, h); break
            case "led":       root.drawLed(ctx, w, h); break
            case "wave":      root.drawWave(ctx, w, h); break
            case "scope":     root.drawScope(ctx, w, h); break
            case "area":      root.drawArea(ctx, w, h); break
            case "ring":      root.drawRing(ctx, w, h); break
            case "peaks":     root.drawPeaks(ctx, w, h); break
            case "capsules":  root.drawCapsules(ctx, w, h); break
            case "steps":     root.drawSteps(ctx, w, h); break
            case "neon":      root.drawNeon(ctx, w, h); break
            case "lightning": root.drawLightning(ctx, w, h); break
            case "heartbeat": root.drawHeartbeat(ctx, w, h); break
            case "ripple":    root.drawRipple(ctx, w, h); break
            case "helix":     root.drawHelix(ctx, w, h); break
            case "comet":     root.drawComet(ctx, w, h); break
            case "stellar":   root.drawStellar(ctx, w, h); break
            case "meter":     root.drawMeter(ctx, w, h); break
            case "orb":       root.drawOrb(ctx, w, h); break
            default:          root.drawBars(ctx, w, h, false)
            }
        }
    }
}
