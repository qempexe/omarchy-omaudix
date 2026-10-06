import QtQuick
import Quickshell
import Quickshell.Io

// Local overrides for widget settings. Every write is also pushed to
// `omarchy bar set`, so the change survives a restart and shows up in
// Omarchy's own settings UI. Local overrides win over setting(...).
Item {
    id: root

    property string pluginId: "io.github.qempexe.omaudix"
    property string stateDir: (Quickshell.env("XDG_STATE_HOME")
        || Quickshell.env("HOME") + "/.local/state") + "/omarchy-omaudix"
    property string path: stateDir + "/settings.json"

    property var values: ({})
    property bool loaded: false

    signal changed()

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
        pushToOmarchy(key, value)
        changed()
    }

    function reset() {
        values = ({})
        persist()
        changed()
    }

    // Back to the given defaults. Pushed to omarchy too, otherwise the values
    // it already holds from earlier edits would simply show through again.
    function resetAll(defaults) {
        var next = {}
        for (var k in defaults) {
            next[k] = defaults[k]
            pushToOmarchy(k, defaults[k])
        }
        values = next
        persist()
        changed()
    }

    function persist() {
        file.setText(JSON.stringify(values, null, 2) + "\n")
    }

    // `omarchy bar set` calls are queued (one process at a time, newest value
    // per key wins) so rapid changes, like dragging a slider or resetting
    // everything, are never dropped.
    property var queue: []

    function pushToOmarchy(key, value) {
        if (!key || value === null || value === undefined) return
        var text = (typeof value === "boolean") ? (value ? "true" : "false") : String(value)
        var q = queue.filter(function(e) { return e.key !== key })
        q.push({ key: key, text: text })
        queue = q
        drain()
    }

    function drain() {
        if (setter.running || queue.length === 0) return
        var e = queue[0]
        queue = queue.slice(1)
        setter.command = ["omarchy", "bar", "set", pluginId, e.key, e.text]
        setter.running = true
    }

    function absorb(text) {
        try {
            var parsed = JSON.parse(String(text || "{}"))
            values = (parsed && typeof parsed === "object" && !Array.isArray(parsed))
                ? parsed : ({})
        } catch (e) {
            values = ({})
        }
        if (!loaded) loaded = true
    }

    Component.onCompleted: mkdir.running = true

    Process {
        id: mkdir
        command: ["mkdir", "-p", root.stateDir]
        onExited: file.reload()
    }

    Process { id: setter; running: false; onExited: root.drain() }

    FileView {
        id: file
        path: root.path
        watchChanges: true
        onFileChanged: reload()
        onTextChanged: root.absorb(text)
        onLoaded: root.absorb(text)
    }
}
