import QtQuick

// Fixed-width text slot. The parent decides the width; this item never
// resizes with its content. Text that fits is aligned; text that does not
// fit scrolls left, scrolls right, bounces, or is truncated ("off").
Item {
    id: root

    property string text: ""
    property color color: "white"
    property string fontFamily: ""
    property real fontPixelSize: 12
    property string direction: "left"   // left | right | bounce | off
    property real speed: 35             // pixels per second
    property int pause: 1500            // ms of rest before each scroll
    property string align: "left"       // left | center | right (when it fits)
    property bool running: true

    clip: true
    implicitHeight: measure.implicitHeight

    readonly property real gap: Math.max(24, fontPixelSize * 2)
    readonly property real naturalWidth: measure.implicitWidth
    readonly property real period: naturalWidth + gap
    readonly property real travel: Math.max(0, naturalWidth - width + 6)
    readonly property bool overflowing: width > 0 && naturalWidth > width + 0.5
    readonly property bool scrolling: overflowing && running && direction !== "off"
    readonly property bool looping: scrolling && direction !== "bounce"

    property real offset: 0

    Text {
        id: measure
        visible: false
        text: root.text
        textFormat: Text.PlainText
        font.family: root.fontFamily
        font.pixelSize: root.fontPixelSize
    }

    Text {
        id: primary
        text: root.text
        textFormat: Text.PlainText
        color: root.color
        font.family: root.fontFamily
        font.pixelSize: root.fontPixelSize
        elide: root.scrolling ? Text.ElideNone : Text.ElideRight
        width: root.scrolling ? root.naturalWidth : Math.min(root.naturalWidth, root.width)
        y: Math.round((root.height - height) / 2)
        x: root.scrolling ? root.offset
           : root.align === "center" ? Math.round((root.width - width) / 2)
           : root.align === "right" ? root.width - width
           : 0
    }

    // Second copy trails the first so a left/right loop has no visible seam.
    Text {
        text: root.text
        textFormat: Text.PlainText
        color: root.color
        font.family: root.fontFamily
        font.pixelSize: root.fontPixelSize
        visible: root.looping
        y: primary.y
        x: root.offset + root.period
    }

    function stepDuration(distance) {
        return Math.max(1, Math.round(distance / Math.max(1, speed) * 1000))
    }

    function restart() {
        loopAnim.stop()
        bounceAnim.stop()
        offset = 0
        if (!scrolling) return
        if (direction === "bounce") bounceAnim.start()
        else loopAnim.start()
    }

    onTextChanged: Qt.callLater(restart)
    onScrollingChanged: Qt.callLater(restart)
    onDirectionChanged: Qt.callLater(restart)
    onSpeedChanged: Qt.callLater(restart)
    onPauseChanged: Qt.callLater(restart)
    onWidthChanged: Qt.callLater(restart)
    onNaturalWidthChanged: Qt.callLater(restart)
    Component.onCompleted: restart()

    // left: 0 -> -period. right: -period -> 0. Both end on an image that is
    // identical to the rest position, so the jump back is invisible.
    SequentialAnimation {
        id: loopAnim
        loops: Animation.Infinite
        PauseAnimation { duration: root.pause }
        NumberAnimation {
            target: root
            property: "offset"
            from: root.direction === "right" ? -root.period : 0
            to: root.direction === "right" ? 0 : -root.period
            duration: root.stepDuration(root.period)
        }
    }

    SequentialAnimation {
        id: bounceAnim
        loops: Animation.Infinite
        PauseAnimation { duration: root.pause }
        NumberAnimation {
            target: root
            property: "offset"
            from: 0
            to: -root.travel
            duration: root.stepDuration(root.travel)
        }
        PauseAnimation { duration: root.pause }
        NumberAnimation {
            target: root
            property: "offset"
            from: -root.travel
            to: 0
            duration: root.stepDuration(root.travel)
        }
    }
}
