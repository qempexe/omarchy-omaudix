<p align="center">
  <picture>
    <source media="(prefers-color-scheme: light)" srcset="assets/logo-dark.png">
    <img src="assets/logo.png" alt="Omaudix logo" width="112">
  </picture>
</p>

<h1 align="center">Omaudix</h1>

<p align="center">The song that's playing, on your Omarchy bar: a live visualizer, the title, and the buttons to steer it.</p>

![Omaudix](preview.png)

Omaudix follows any MPRIS player (Spotify, a browser tab, mpv, a radio app) and draws what you hear right next to its title. Everything about it can be changed from its own settings panel: twenty-four visuals, eleven ways to color them, a plate behind the widget with its own ends, surface and edge, round covers that turn like records, and looks you can save and come back to.

## Getting it

```bash
omarchy plugin add https://github.com/qempexe/omarchy-omaudix.git --enable
omarchy restart shell
```

Then place it from the bar settings, or move it with `omarchy bar move io.github.qempexe.omaudix --section left` (or `center`, `right`). The settings panel opens from the gear on the widget, or a right click anywhere on it.

It needs PipeWire (`pw-record`), Python 3, `curl` and `vipsthumbnail` (from libvips), which Omarchy already has. Covers are never shown straight from the player: each one is fetched with a size and time limit and made into a small, clean copy in a separate, limited process first. [cava](https://github.com/karlstav/cava) is used for the spectrum when it's installed; without it a built-in analyzer takes over at about 3% of one core. Pasting into the panel's text fields goes through `wl-paste`.

## Visuals

Twenty-four of them, each in a file of its own. The four newest are **Waterfall**, a spectrogram that scrolls down, **Fountain**, sparks thrown up by each band, **Vinyl**, a record that turns faster when it gets loud, and **Skyline**, a city whose windows light up with the music.

![Visuals](screenshots/visuals.png)

The visualizer can sit left of the title, right of it, on both sides, or nowhere. Each side has its own orientation: normal, upside down, mirrored, or turned (both). With both sides showing, the right one mirrors the left on its own, so the two face each other; any other pairing is one click away.

## Colors

Theme, fade, rainbow and custom, plus a gradient between two colors of your choosing, your theme's palette, your active window border's gradient, colors taken from the song's cover (so every song paints it differently), heat (blue when quiet, red when loud), pulse (the accent flaring on the beat) and duotone.

![Color modes](screenshots/colors.png)

## Looks

Sixteen ready made looks set the visual, its colors, the text, the cover and the plate in one click, and leave everything else alone. The last change can be undone.

Twelve places of your own keep every setting there is, not only the look: the player, the mouse, the panel's colors, the effects, all of it. Choosing a place again brings every one of them back exactly as it was. The places live in their own file, so **Reset all** never touches them, and one of them can be worn at every login.

![Ready made looks](screenshots/looks.png)

## The plate

Off by default. Turned on, the widget gets a shape of its own behind the visualizer, the title and the buttons:

- **Shape**: 32 kinds of ends, from a capsule or an arrow to a cartouche or an onion dome, with their direction, square corners on one side, roundness, height, opacity and room at the ends.
- **Surface**: 29 materials (frost, velvet, marble, an old screen, a nebula...), solid, gradient or glass, a texture, depth and a shadow.
- **Edge**: 22 kinds of lines and 18 ornaments, from a hairline to a gilded frame with rosettes.

The plate's line can be drawn in your active window border's own gradient, at the border's own angle, and its fill can run from the border's first color to its last. Change theme and it follows.

## Covers, effects and the small things

![Details](screenshots/details.png)

- **Cover**: left of everything, right before the title, or at the very end, square or round. A round cover can spin like a record, to the left or to the right, and stops where it is when the music pauses. The panel's header shows it the same way.
- **Glow** around the visualizer, soft or strong.
- **While nothing plays**: the visualizer can stay still, breathe gently, or show a thin line.
- **On the beat**: the cover swells and the plate brightens with the bass.
- **New song**: the title can fade or slide in.
- **Progress line** under the title, on hover or always. Click it to jump, when the player allows it.
- **Mouse**: left click plays or pauses (or skips, or nothing), middle click skips, the wheel skips tracks, changes the player's volume, or steps through the visuals.
- **Text**: artist and title in either order, or just one of them, with your own separator. Long titles scroll left, right, bounce, or are cut short; short ones shrink the widget.

## The settings panel

![Settings](screenshots/settings.png)

Twelve tabs: **Looks**, **Player**, **Visual**, **Colors**, **Text**, **Cover**, **Shape**, **Surface**, **Edge**, **Effects**, **Behavior** and **About**. **Alt+←** and **Alt+→** step through them. **Ctrl+F** searches every setting at once, and **Changed only** lists what differs from the defaults. Rows that do nothing with the current choices are dimmed, and every changed row has its own arrow back to the default.

Everything applies at once and is saved to `~/.local/state/omarchy-omaudix/settings.json`. Your saved places go to `looks.json` next to it.

The **Player** tab lists every player with what it's playing. Players that all call themselves the same (mpv, a browser) are told apart by their track address: YouTube Music, Spotify, a radio stream, a local file. Picking one pauses the others and plays it; **Auto** follows whatever is playing. At login Omaudix can keep following the last player you picked or start on Auto, and can ask it to start playing.

<table>
<tr>
<td><img src="screenshots/settings-looks.png" alt="Looks"></td>
<td><img src="screenshots/settings-player.png" alt="Player"></td>
<td><img src="screenshots/settings-visual.png" alt="Visual"></td>
<td><img src="screenshots/settings-colors.png" alt="Colors"></td>
</tr>
<tr>
<td><img src="screenshots/settings-text.png" alt="Text"></td>
<td><img src="screenshots/settings-cover.png" alt="Cover"></td>
<td><img src="screenshots/settings-shape.png" alt="Shape"></td>
<td><img src="screenshots/settings-surface.png" alt="Surface"></td>
</tr>
<tr>
<td><img src="screenshots/settings-edge.png" alt="Edge"></td>
<td><img src="screenshots/settings-effects.png" alt="Effects"></td>
<td><img src="screenshots/settings-behavior.png" alt="Behavior"></td>
<td><img src="screenshots/settings-about.png" alt="About"></td>
</tr>
</table>

## In shell.json

The main settings can also go straight into the widget's entry in `~/.config/omarchy/shell.json`. Whatever is changed in the panel wins over them.

```json
{ "id": "io.github.qempexe.omaudix", "vizStyle": "vinyl", "vizSide": "both", "colorMode": "cover", "coverShape": "circle" }
```

| Setting | Values | Default |
| --- | --- | --- |
| `vizStyle` | bars, mirror, wave, scope, dots, led, ring, area, peaks, capsules, steps, neon, lightning, heartbeat, ripple, helix, comet, stellar, meter, orb, waterfall, fountain, vinyl, skyline | bars |
| `vizSide` | left, right, both, hidden | left |
| `vizLeftOrient` | normal, flipped, mirrored, turned | normal |
| `vizRightOrient` | auto, normal, flipped, mirrored, turned | auto |
| `vizWidth` | 24 to 240 | 72 |
| `barCount` | 6 to 64 | 20 |
| `colorMode` | theme, fade, rainbow, custom, gradient, palette, border, cover, heat, pulse, duotone | theme |
| `customColor`, `customColor2` | hex like `#7aa2f7` | #7aa2f7, #f7768e |
| `panelColor` | theme, custom, monochrome | theme |
| `panelCustomColor` | hex | #7aa2f7 |
| `sensitivity` | 25 to 400 (100 is normal) | 100 |
| `smoothing` | 0 to 100 | 60 |
| `fps` | 15 to 60 | 30 |
| `engine` | auto, cava, builtin | auto |
| `player` | auto, or a player's D-Bus name | auto |
| `showText` | true, false | true |
| `textFormat` | artist-title, title-artist, title, artist | artist-title |
| `separator` | up to 5 characters | ` - ` |
| `compactText` | true, false | true |
| `textWidth` | 60 to 400 | 160 |
| `scrollDirection` | left, right, bounce, off | left |
| `scrollSpeed` | 10 to 120 | 35 |
| `scrollPause` | 0 to 5000 (ms) | 1500 |
| `textAlign` | left, center, right | left |
| `showControls` | true, false | true |
| `controlsSide` | left, right | right |
| `hideWhenPaused` | true, false | false |
| `pauseOthers` | true, false | false |
| `coverSide` | hidden, left, center, right | hidden |
| `coverSize` | 10 to 36 | 16 |
| `coverShape` | square, circle | square |
| `coverSpin` | off, left, right | off |
| `clickAction` | playPause, next, none | playPause |
| `wheelAction` | track, volume, style, none | track |
| `showAlbumArt` | true, false (cover in the panel's header) | true |

The plate, the effects and the login options are set from the panel; `omarchy-shell io.github.qempexe.omaudix set <key> <value>` reaches every one of them.

## From the command line

```bash
omarchy-shell io.github.qempexe.omaudix status        # what's playing, the players, the audio helper, as JSON
omarchy-shell io.github.qempexe.omaudix look aurora   # a ready made look: classic studio pill neon glass aurora vinyl pulse
                                                      #   cosmos city arcade deco salon waterfall fountain minimal
omarchy-shell io.github.qempexe.omaudix nextLook      # the next ready made look
omarchy-shell io.github.qempexe.omaudix undo          # back to before the last look
omarchy-shell io.github.qempexe.omaudix save 3        # keep every setting in place 3 (1 to 12)
omarchy-shell io.github.qempexe.omaudix saveNew       # in the first free place
omarchy-shell io.github.qempexe.omaudix load 3        # bring all of it back
omarchy-shell io.github.qempexe.omaudix exportLook    # the current look as one line of JSON
omarchy-shell io.github.qempexe.omaudix importLook '{"vizStyle":"ring","colorMode":"rainbow"}'
omarchy-shell io.github.qempexe.omaudix set vizWidth 96
omarchy-shell io.github.qempexe.omaudix playPause     # also: next, previous
omarchy-shell io.github.qempexe.omaudix switchPlayer org.mpris.MediaPlayer2.spotify
omarchy-shell io.github.qempexe.omaudix cycleStyle    # step through the visuals until the shell restarts (resetStyle undoes it)
omarchy-shell io.github.qempexe.omaudix restart       # restart the audio helper
```

Imported looks carry look settings only, every value checked, so a look from someone else can never change which player you follow or what your mouse does.

## Good to know

- The visualizer listens to your system's output, not to one player, so a game or a video playing at the same time shows up in it too.
- The audio helper runs only while something plays and a visualizer is showing; one helper serves every screen.
- Cover colors are worked out from the cover the player already shows; nothing is downloaded or stored.
- The text fields read at most 1024 bytes from the clipboard, through Ctrl+V or Shift+Insert, so a huge clipboard can never stall the shell.
- Song titles are always shown as plain text.

## Inside

```
qml/
├── Service.qml          the player, the audio helper, settings and looks, the theme's colors, commands
├── BarWidget.qml        the widget on the bar
├── bar/                 Visualizer, Cover, Plate, Controls, MarqueeText
├── panel/               SettingsPopup, SettingRow, LooksPage, LookArt, AboutPage, SafeField
├── core/SettingsStore   saved settings, written a moment after the last change
└── js/
    ├── Schema.js        every setting: its tab, options and default; the ready made looks
    ├── Draw.js          what every visual draws with
    ├── visuals/         one file per visual
    ├── colors/          one file per color mode
    ├── Style.js, Paint.js, Trace.js
    └── parts/           the plate's ends, surfaces, lines and ornaments
helper/viz.py            cava, or a built-in analyzer over pw-record, one frame per line
assets/                  the logo, light and dark
tests/                   node tests/test_parts.js · python3 tests/test_manifest.py · python3 tests/test_viz.py
```

New visuals and color modes are one small file each. [CONTRIBUTING.md](CONTRIBUTING.md) shows how.

## Updating and removing

```bash
omarchy plugin update io.github.qempexe.omaudix
omarchy restart shell
```

```bash
omarchy plugin remove io.github.qempexe.omaudix
rm -rf ~/.local/state/omarchy-omaudix     # settings and saved looks
```

## Credits and thanks

- Inspired by **WaveBar**, the idea of a now-playing bar widget with a live visualizer.
- Thanks to the **Omarchy** project for the shell and plugin system this runs on.
- Thanks to **Quickshell** and **Qt** for the toolkit the widget is built with.
- Thanks to **PipeWire** for the audio capture, and to **cava** for its spectrum engine.
- Thanks to that banger song :)
- Thanks to everyone who tests it and reports issues.

## Disclaimer

Omaudix is an independent project. It is not affiliated with or endorsed by Omarchy, WaveBar, Spotify, YouTube Music or any other service or player mentioned here; those names are used only to describe what the widget can follow. Cover art is shown from the address the player provides and is never stored or redistributed.

## License

[MIT](LICENSE)
