import QtQuick
import Quickshell
import Quickshell.Io
import Quickshell.Services.Mpris

// Shared brain of Omaudix. Reads the active MPRIS player
// and runs ONE audio helper (viz.py) for every widget instance.
// The helper only runs while something is playing and a widget wants it.
Item {
    id: root

    property var shell: null
    property var manifest: null

    readonly property string pluginId: "io.github.qempexe.omaudix"
    readonly property var styleNames: ["bars", "mirror", "wave", "scope", "dots", "led", "ring", "area"]

    // ---- media -----------------------------------------------------------
    // Third-party plugins cannot reach omarchy.media (the shell only hands that
    // service to full bar plugins), so read MPRIS directly like the built-in does.
    readonly property var players: Mpris.players ? Mpris.players.values : []
    readonly property var player: pickPlayer(players)
    readonly property string title: player ? clean(player.trackTitle, "") : ""
    readonly property string artist: player ? clean(player.trackArtist, "") : ""
    readonly property bool hasMedia: !!player && (title !== "" || artist !== "")
    readonly property bool playing: !!player && !!player.isPlaying
    readonly property string albumArt: {
        if (!player || !player.trackArtUrl) return ""
        var url = String(player.trackArtUrl)
        return url.length > 2048 ? "" : url
    }

    // "auto" follows whatever is playing; otherwise the D-Bus name of the
    // player the user picked in the settings panel.
    property string preferred: "auto"

    function idOf(p) { return String(p.dbusName || p.identity || "") }
    function baseId(s) { return String(s).replace(/\.instance\d+$/, "") }

    // Exact D-Bus name wins. The instance-less fallback (browser / mpv ids change
    // on every launch) only applies when it is unambiguous.
    function findPlayer(id) {
        if (!id || id === "auto") return null
        var list = players
        var loose = null
        var count = 0
        for (var i = 0; i < list.length; i++) {
            var p = list[i]
            if (!p) continue
            var a = idOf(p)
            if (a === id) return p
            if (baseId(a) === baseId(id)) { loose = p; count++ }
        }
        return count === 1 ? loose : null
    }

    // ---- recognising what is really behind a generic player -------------------
    // mpv, vlc, browsers... all show up under one name. MPRIS carries the track
    // URL and cover URL, which say where the audio comes from.
    function metaOf(p) {
        try { return p.metadata || ({}) } catch (e) { return ({}) }
    }
    function urlOf(p) {
        var m = metaOf(p)
        return String(m["xesam:url"] || m["mpris:url"] || "")
    }
    function appOf(p) {
        var n = String(p.identity || "").trim()
        if (n === "")
            n = baseId(idOf(p)).replace(/^org\.mpris\.MediaPlayer2\./, "")
        return n !== "" ? n : "Unknown player"
    }
    function isGeneric(app) {
        return /^(mpv|vlc|mplayer|mpd|cmus|celluloid|haruna|firefox|mozilla firefox|chromium|google chrome|chrome|brave|vivaldi|zen|librewolf|microsoft edge)\b/i.test(app)
    }
    function sourceOf(p) {
        var sourceRules = [
            [/music\.youtube\.com|ytmusic|googleusercontent\.com/, "YouTube Music"],
            [/youtube\.com|youtu\.be|googlevideo|ytimg|ytdl:/, "YouTube"],
            [/spotify|scdn\.co/, "Spotify"],
            [/soundcloud|sndcdn/, "SoundCloud"],
            [/bandcamp|bcbits/, "Bandcamp"],
            [/tidal\.com/, "Tidal"],
            [/deezer|dzcdn/, "Deezer"],
            [/twitch\.tv|ttvnw/, "Twitch"],
            [/^file:/, "Local file"]
        ]
        var url = urlOf(p).toLowerCase()
        var art = String(p.trackArtUrl || "").toLowerCase()
        var hay = url + " " + art
        for (var i = 0; i < sourceRules.length; i++) {
            if (sourceRules[i][0].test(url) || (i < 2 && sourceRules[i][0].test(art)))
                return sourceRules[i][1]
        }
        // A web stream with no known length is a live station.
        var web = /^(https?|rtmps?|icy|mms):/.test(url)
        var live = !p.lengthSupported || !(Number(p.length) > 0)
        if (web && live) return "Radio"
        return ""
    }
    function nameOf(p) {
        var app = appOf(p)
        if (isGeneric(app)) {
            var src = sourceOf(p)
            if (src !== "") return src
        }
        return app
    }
    function trackOf(p) {
        var t = clean(p.trackTitle, "")
        var a = clean(p.trackArtist, "")
        return (t !== "" && a !== "") ? a + " \u2013 " + t : (t !== "" ? t : a)
    }

    // Everything the settings panel needs to list the players.
    // Only republished when the content really changes, so the settings panel
    // does not rebuild its rows on every MPRIS property tick.
    property var playerList: []
    property string playerListJson: "[]"
    onPlayerListRawChanged: {
        var s = JSON.stringify(playerListRaw)
        if (s === playerListJson) return
        playerListJson = s
        playerList = playerListRaw
    }

    readonly property var playerListRaw: {
        var out = []
        var list = players
        for (var i = 0; i < list.length; i++) {
            var p = list[i]
            if (!p) continue
            var app = appOf(p)
            var name = nameOf(p)
            out.push({ id: idOf(p), name: name, via: name !== app ? app : "",
                       track: trackOf(p), playing: !!p.isPlaying, url: urlOf(p) })
        }
        // identical names (two unrecognised mpv's): number them
        var seen = ({})
        var total = ({})
        for (var a = 0; a < out.length; a++) total[out[a].name] = (total[out[a].name] || 0) + 1
        for (var b = 0; b < out.length; b++) {
            var nm = out[b].name
            if (total[nm] > 1) {
                seen[nm] = (seen[nm] || 0) + 1
                out[b].name = nm + " #" + seen[nm]
            }
        }
        return out
    }
    readonly property string activeId: player ? idOf(player) : ""
    readonly property var chosen: findPlayer(preferred)
    readonly property string selectedId: chosen ? idOf(chosen) : ""

    function pickPlayer(list) {
        var c = findPlayer(preferred)
        // A chosen player that is still loading (no track yet) or idle must not
        // hide another player that is actually playing.
        if (c && (c.isPlaying || !!(c.trackTitle || c.trackArtist))) {
            if (c.isPlaying) return c
            for (var k = 0; k < list.length; k++) {
                var o = list[k]
                if (o && o !== c && o.isPlaying && (o.trackTitle || o.trackArtist)) return o
            }
            return c
        }
        var fallback = null
        for (var i = 0; i < list.length; i++) {
            var p = list[i]
            if (!p) continue
            var hasTrack = !!(p.trackTitle || p.trackArtist)
            if (p.isPlaying && hasTrack) return p
            if (!fallback && hasTrack) fallback = p
        }
        return fallback
    }

    // Follow `id` and make it the one playing: every other player that is
    // playing gets paused, then the chosen one is started.
    function switchTo(playerId) {
        preferred = playerId
        var target = findPlayer(playerId)
        var list = players
        if (!target) return false
        for (var j = 0; j < list.length; j++) {
            var p = list[j]
            if (!p || p === target || !p.isPlaying) continue
            try {
                if (p.canPause) p.pause()
                else if (p.canTogglePlaying) p.togglePlaying()
            } catch (e) { }
        }
        try {
            if (!target.isPlaying) {
                if (target.canPlay) target.play()
                else if (target.canTogglePlaying) target.togglePlaying()
            }
        } catch (e) { }
        return true
    }

    // ---- follow external changes ------------------------------------------------
    // When something else starts playing (another app, a keyboard media key, a
    // browser tab...), follow it right away instead of sticking to the old pick.
    signal followed(string playerId)
    property bool pauseOthers: false       // pause the previous player when a new one starts
    property var playingIds: ({})
    property bool playingSeeded: false

    function syncPlaying() {
        var now = ({})
        var started = ""
        var list = players
        for (var i = 0; i < list.length; i++) {
            var p = list[i]
            if (!p || !p.isPlaying) continue
            var id = idOf(p)
            now[id] = true
            if (playingSeeded && !playingIds[id]) started = id
        }
        playingIds = now
        playingSeeded = true
        if (started === "") return
        if (pauseOthers) {
            for (var j = 0; j < list.length; j++) {
                var o = list[j]
                if (!o || !o.isPlaying || idOf(o) === started) continue
                try {
                    if (o.canPause) o.pause()
                    else if (o.canTogglePlaying) o.togglePlaying()
                } catch (e) { }
            }
        }
        if (preferred === "auto") return
        var cur = findPlayer(preferred)
        if (cur && idOf(cur) === started) return
        preferred = started
        followed(started)
    }

    onPlayersChanged: syncPlaying()

    Timer {
        interval: 400
        repeat: true
        running: true
        onTriggered: root.syncPlaying()
    }

    function clean(primary, fallback) {
        var s = String(primary || fallback || "").replace(/[\r\n\t]+/g, " ").trim()
        return s.length > 300 ? s.substring(0, 300) : s
    }

    function runAction(action) {
        if (!player) return false
        try {
            if (action === "playPause") player.togglePlaying()
            else if (action === "next") player.next()
            else if (action === "previous") player.previous()
            else return false
            return true
        } catch (e) {
            return false
        }
    }

    // ---- shared visualizer state -------------------------------------------
    property string styleOverride: ""      // set by the wheel / IPC, cleared on shell restart
    property var levels: []                // 0..1 (spectrum) or -1..1 (scope)
    property bool receiving: false
    property string lastError: ""
    property bool fatal: false
    property bool shuttingDown: false
    property int failures: 0
    property bool stopping: false          // true while we are stopping the helper on purpose
    property int consumerCount: 0
    property var config: ({ style: "bars", bars: 20, fps: 30, gain: 100, smooth: 60, engine: "auto" })

    readonly property string mode: config.style === "scope" ? "scope" : "spectrum"
    readonly property int frameSize: mode === "scope" ? 64 : config.bars
    readonly property bool shouldRun: !shuttingDown && !fatal && consumerCount > 0 && playing

    readonly property string pluginSourceDir: {
        var source = manifest && manifest.__sourceDir ? String(manifest.__sourceDir) : ""
        if (source.length > 0 && source.length <= 4096 && source.charAt(0) === "/")
            return source.replace(/\/+$/, "")
        return Quickshell.env("HOME") + "/.config/omarchy/plugins/" + pluginId
    }
    readonly property string helperPath: pluginSourceDir + "/viz.py"
    readonly property string pythonPath: "/usr/bin/python3"

    function register() { consumerCount = consumerCount + 1 }
    function unregister() { consumerCount = Math.max(0, consumerCount - 1) }

    function cycleStyle(current, step) {
        var i = styleNames.indexOf(current)
        if (i < 0) i = 0
        var n = styleNames.length
        styleOverride = styleNames[(i + (step < 0 ? n - 1 : 1)) % n]
    }

    function bounded(value, lo, hi, fallback) {
        var v = Number(value)
        if (!isFinite(v)) return fallback
        return Math.max(lo, Math.min(hi, Math.round(v)))
    }

    function configure(cfg) {
        var engines = ["auto", "cava", "builtin"]
        var next = {
            style: styleNames.indexOf(cfg.style) >= 0 ? cfg.style : "bars",
            bars: bounded(cfg.bars, 6, 64, 20),
            fps: bounded(cfg.fps, 15, 60, 30),
            gain: bounded(cfg.gain, 25, 400, 100),
            smooth: bounded(cfg.smooth, 0, 100, 60),
            engine: engines.indexOf(cfg.engine) >= 0 ? cfg.engine : "auto"
        }
        if (JSON.stringify(next) === JSON.stringify(config)) return
        var modeChanged = (next.style === "scope") !== (config.style === "scope")
        config = next
        if (modeChanged) levels = []
        failures = 0
        fatal = false
        if (shouldRun) restartHelper()
    }

    // ---- helper process lifecycle -----------------------------------------
    onShouldRunChanged: {
        if (shouldRun) {
            startTimer.restart()
        } else {
            stopHelper()
            receiving = false
            decayTimer.restart()
        }
    }

    function stopHelper() {
        if (!helper.running) return
        stopping = true
        helper.running = false
    }

    function restartHelper() {
        stopHelper()
        receiving = false
        startTimer.restart()
    }

    function helperEnvironment() {
        return {
            "LANG": "C.UTF-8",
            "LC_ALL": "C.UTF-8",
            "PATH": "/usr/bin",
            "HOME": Quickshell.env("HOME") || "",
            "XDG_RUNTIME_DIR": Quickshell.env("XDG_RUNTIME_DIR") || "",
            "PYTHONDONTWRITEBYTECODE": "1"
        }
    }

    function startHelper() {
        if (!shouldRun) return
        if (helper.running) {            // previous one is still shutting down
            startTimer.restart()
            return
        }
        decayTimer.stop()
        helper.environment = helperEnvironment()
        helper.exec([
            pythonPath, "-I", "-S", helperPath,
            "--mode", mode,
            "--engine", config.engine,
            "--bars", String(config.bars),
            "--fps", String(config.fps),
            "--gain", String(config.gain),
            "--smooth", String(config.smooth)
        ])
    }

    function handleExit(exitCode) {
        receiving = false
        if (stopping) {                  // we asked for this exit, so it is not a failure
            stopping = false
            return
        }
        if (!shouldRun) return
        if (exitCode === 127) {
            fatal = true
            lastError = "Missing dependency: pw-record (pipewire-audio) or cava for the chosen engine"
            return
        }
        failures = failures + 1
        if (failures >= 6) {
            fatal = true
            lastError = "Audio helper kept failing (last exit code " + exitCode + ")"
            return
        }
        retryTimer.restart()
    }

    function consumeLine(line) {
        var text = String(line)
        if (text.length > 4096) return
        var parts = text.trim().split(" ")
        if (parts.length < 2 || parts.length > 128) return
        var out = new Array(parts.length)
        var scope = mode === "scope"
        for (var i = 0; i < parts.length; i++) {
            var v = parseInt(parts[i], 10)
            if (isNaN(v)) return
            v = v / 100
            out[i] = scope ? Math.max(-1, Math.min(1, v)) : Math.max(0, Math.min(1, v))
        }
        levels = out
        receiving = true
        failures = 0
        lastError = ""
        staleTimer.restart()
    }

    function decayStep() {
        var next = []
        var peak = 0
        for (var i = 0; i < levels.length; i++) {
            var v = levels[i] * 0.78
            next.push(v)
            peak = Math.max(peak, Math.abs(v))
        }
        levels = next
        if (peak < 0.01) {
            levels = []
            decayTimer.stop()
        }
    }

    function shutdown() {
        shuttingDown = true
        startTimer.stop()
        retryTimer.stop()
        staleTimer.stop()
        decayTimer.stop()
        stopHelper()
    }

    Component.onCompleted: helper.exited.connect(root.handleExit)
    Component.onDestruction: root.shutdown()

    Timer {
        id: startTimer
        interval: 150
        repeat: false
        onTriggered: root.startHelper()
    }

    Timer {
        id: retryTimer
        interval: 1500
        repeat: false
        onTriggered: root.startHelper()
    }

    // Quiet fall-off after pause instead of bars snapping to zero.
    Timer {
        id: decayTimer
        interval: 33
        repeat: true
        onTriggered: root.decayStep()
    }

    Timer {
        id: staleTimer
        interval: 900
        repeat: false
        onTriggered: root.receiving = false
    }

    // Safety net: if the process never reported back, try again.
    Timer {
        interval: 3000
        repeat: true
        running: root.shouldRun && !root.receiving && !helper.running
        onTriggered: root.startHelper()
    }

    Process {
        id: helper
        running: false
        clearEnvironment: true
        stdout: SplitParser {
            onRead: function(line) { root.consumeLine(line) }
        }
    }

    IpcHandler {
        target: root.pluginId

        function status(): string {
            return JSON.stringify({
                hasMedia: root.hasMedia,
                playing: root.playing,
                title: root.title,
                artist: root.artist,
                albumArt: root.albumArt,
                player: root.activeId,
                selected: root.selectedId,
                preferred: root.preferred,
                players: root.playerList,
                consumers: root.consumerCount,
                mode: root.mode,
                config: root.config,
                styleOverride: root.styleOverride,
                helperRunning: helper.running,
                receiving: root.receiving,
                failures: root.failures,
                fatal: root.fatal,
                lastError: root.lastError,
                helperPath: root.helperPath
            })
        }

        function restart(): string {
            root.fatal = false
            root.failures = 0
            root.lastError = ""
            if (root.shouldRun) root.restartHelper()
            return "ok"
        }

        function cycleStyle(): string {
            root.cycleStyle(root.styleOverride !== "" ? root.styleOverride : root.config.style, 1)
            return root.styleOverride
        }

        function resetStyle(): string {
            root.styleOverride = ""
            return "ok"
        }

        function switchPlayer(playerId: string): string { return root.switchTo(playerId) ? "ok" : "not found" }

        function playPause(): string { return root.runAction("playPause") ? "ok" : "unhandled" }
        function next(): string { return root.runAction("next") ? "ok" : "unhandled" }
        function previous(): string { return root.runAction("previous") ? "ok" : "unhandled" }
    }
}
