import QtQuick
import Quickshell
import Quickshell.Io

// Local overrides for widget settings, kept in memory (instant) and saved to
// settings.json in the state dir (survives restarts). Local overrides win over
// setting(...). Nothing is sent to `omarchy bar set`: that rewrites the shell
// config and makes the whole shell reload and freeze.
Item {
    id: root

    property string pluginId: "io.github.qempexe.omaudix"
    property string stateDir: (Quickshell.env("XDG_STATE_HOME")
        || Quickshell.env("HOME") + "/.local/state") + "/omarchy-omaudix"
    property string path: stateDir + "/settings.json"

    property var values: ({})
    property bool loaded: false

    signal changed()
    // Which key was just edited ("*" = many keys or an external edit).
    signal keyChanged(string key)

    function get(key) {
        var v = values[key]
        return v === undefined ? null : v
    }

    function set(key, value) {
        var next = {}
        for (var k in values) next[k] = values[k]
        if (value === null || value === undefined) delete next[key]
        else next[key] = value
        values = next
        persist()
        changed()
        keyChanged(key)
    }

    function reset() {
        values = ({})
        persist()
        changed()
        keyChanged("*")
    }

    // Back to the given defaults (stored explicitly, so nothing else shows through).
    function resetAll(defaults) {
        var next = {}
        for (var k in defaults) next[k] = defaults[k]
        values = next
        persist()
        changed()
        keyChanged("*")
    }

    // The last few texts we wrote ourselves. The file watcher reports each of our
    // own writes back a moment later; absorbing such an echo would roll the
    // settings back to an older state (a slider drag would stutter or jump back),
    // so echoes are recognised and skipped.
    property var recent: []

    // Disk writes are coalesced: the UI reads `values` from memory, so nothing
    // has to hit the disk per tick of a slider drag.
    property bool dirty: false

    property double lastWrite: 0

    // First change is written right away (so a click can never be lost); a burst
    // of changes after it is written once, shortly after the last one.
    function persist() {
        dirty = true
        if (Date.now() - lastWrite > 300) writeNow()
        else writeTimer.restart()
    }

    function writeNow() {
        if (!dirty) return
        dirty = false
        lastWrite = Date.now()
        var text = JSON.stringify(values, null, 2) + "\n"
        var r = recent.slice(-7)
        r.push(text)
        recent = r
        echoTimer.restart()
        file.setText(text)
    }

    function absorb(text) {
        var raw = String(text || "")
        if (loaded) {
            // While our own write is pending or still settling, whatever the file
            // watcher reports is ours (it can even be a half-written or empty
            // file). Taking it in would flash the old values back.
            if (dirty || writeTimer.running || echoTimer.running) return
            if (recent.indexOf(raw) >= 0) return
        }
        var next = null
        try {
            var parsed = JSON.parse(raw)
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) next = parsed
        } catch (e) { }
        var wasLoaded = loaded
        loaded = true
        if (next === null) return                  // empty or unreadable: keep what we have
        if (JSON.stringify(next) === JSON.stringify(values)) return
        values = next                              // edited elsewhere (another bar, by hand)
        if (wasLoaded) {
            changed()
            keyChanged("*")
        }
    }

    Component.onCompleted: mkdir.running = true
    Component.onDestruction: writeNow()

    Process {
        id: mkdir
        command: ["mkdir", "-p", root.stateDir]
        onExited: file.reload()
    }

    Timer { id: echoTimer; interval: 1500; onTriggered: root.recent = [] }
    Timer { id: writeTimer; interval: 250; onTriggered: root.writeNow() }

    FileView {
        id: file
        path: root.path
        watchChanges: true
        onFileChanged: reload()
        onTextChanged: root.absorb(text)
        onLoaded: root.absorb(text)
    }
}
