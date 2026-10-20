import QtQuick

// The song's cover, square or round. A round one can turn like a record while the
// music plays, to the left or to the right, and stops where it is when it pauses.
// Shows a music note while there is no cover; while a new cover loads it keeps a
// quiet tinted tile instead of flashing the note.
Item {
    id: root

    property string source: ""
    property color ink: "white"
    property string shape: "square"      // square | circle
    property string spin: "off"          // off | left | right (round covers only)
    property int spinTime: 8             // seconds per turn
    property bool playing: false
    property real corner: 3              // corner radius of a square cover

    readonly property bool round: shape === "circle"
    // only a real cover turns; the note that stands in for one stays upright
    readonly property bool spinning: round && spin !== "off" && source !== ""

    // the turning part: the picture and its tile, never the item's own box
    Item {
        id: disc
        anchors.fill: parent

        Rectangle {
            anchors.fill: parent
            radius: root.round ? width / 2 : root.corner
            color: Qt.rgba(root.ink.r, root.ink.g, root.ink.b, 0.10)
        }

        // a square cover: a plain image
        Image {
            id: img
            anchors.fill: parent
            visible: !root.round && root.source !== "" && status === Image.Ready
            source: root.round ? "" : root.source
            fillMode: Image.PreserveAspectCrop
            asynchronous: true
            cache: true
            sourceSize.width: 128
            sourceSize.height: 128
        }

        // a round cover: the image drawn inside a circle, with a small hole like a record
        Canvas {
            id: roundArt
            anchors.fill: parent
            visible: root.round && root.source !== ""
            renderTarget: Canvas.Image
            property string loaded: ""
            onImageLoaded: requestPaint()
            onWidthChanged: requestPaint()
            onVisibleChanged: if (visible) requestPaint()
            function take(url) {
                if (url === "" || !root.round) return
                if (!isImageLoaded(url)) loadImage(url)
                loaded = url
                requestPaint()
            }
            onPaint: {
                const ctx = getContext("2d")
                ctx.reset()
                const s = Math.min(width, height)
                if (s < 2 || loaded === "" || !isImageLoaded(loaded)) return
                ctx.save()
                ctx.beginPath()
                ctx.arc(width / 2, height / 2, s / 2, 0, 2 * Math.PI)
                ctx.clip()
                ctx.drawImage(loaded, (width - s) / 2, (height - s) / 2, s, s)
                ctx.restore()
                if (s >= 12) {
                    // the spindle hole, so it reads as a record when it turns
                    ctx.fillStyle = "rgba(0,0,0,0.55)"
                    ctx.beginPath()
                    ctx.arc(width / 2, height / 2, Math.max(1, s * 0.07), 0, 2 * Math.PI)
                    ctx.fill()
                }
            }
        }

        Text {
            textFormat: Text.PlainText  // metadata is untrusted: never auto-detect rich text
            anchors.centerIn: parent
            visible: root.source === ""
            text: "♫"
            color: root.ink
            opacity: 0.6
            font.pixelSize: Math.max(8, Math.round(root.height * 0.6))
        }

        RotationAnimation on rotation {
            id: turn
            running: root.spinning
            paused: running && !root.playing
            loops: Animation.Infinite
            from: 0
            to: root.spin === "left" ? -360 : 360
            duration: Math.max(2, root.spinTime) * 1000
            direction: root.spin === "left" ? RotationAnimation.Counterclockwise : RotationAnimation.Clockwise
        }
    }

    onSourceChanged: roundArt.take(source)
    onRoundChanged: roundArt.take(source)
    onSpinningChanged: if (!spinning) disc.rotation = 0
    // a new direction or speed starts the turn again
    onSpinChanged: if (spinning) turn.restart()
    onSpinTimeChanged: if (spinning) turn.restart()
    Component.onCompleted: roundArt.take(source)
}
