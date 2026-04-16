# Claude Stream Deck

Stream Deck plugin for running Claude Code skills with live animated button feedback.

## Quick Start (for Claude Code users)

This is a Stream Deck plugin that lets you trigger Claude Code skills by pressing physical buttons. Here's how to get it running:

### 1. Install the plugin

```bash
# Install the Elgato Stream Deck CLI (one-time)
npm install -g @elgato/cli

# Clone, build, and link
git clone https://github.com/Latent-Space-Labs/claude-stream-deck.git
cd claude-stream-deck
npm install
npm run build
npm run link
```

After linking, restart the Stream Deck app. The "Claude Runner" action will appear in the action list.

### 2. Install the `/streamdeck` slash command

This gives you a Claude Code skill for managing buttons via natural language:

```bash
ln -sf "$(pwd)/.claude/commands/streamdeck.md" ~/.claude/commands/streamdeck.md
```

### 3. Set up buttons

**Option A — GUI**: Open Stream Deck app, drag "Run Command" from the Claude Runner section onto buttons, click each to configure.

**Option B — Claude Code**: Say things like:
- "run local-dev on my stream deck" — triggers edit mode, tap a button to assign
- "put deploy on top right" — directly assigns to a position
- "/streamdeck list buttons" — shows current layout

### 4. Using edit mode

Edit mode is the fastest way to assign skills. When triggered:
1. All Claude Runner buttons pulse with "TAP for [skill]"
2. Tap the button you want
3. It's configured instantly

Edit mode can be triggered by:
- Telling Claude: "add [skill] to my stream deck"
- The `/streamdeck` slash command
- Writing `~/.streamdeck/pending-config.json` manually

## Architecture

```
src/
├── plugin.ts                  # Entry point — registers actions with SD SDK
└── actions/
    └── run-command.ts         # Core action: run commands, edit mode, state management

com.lsl.claude-runner.sdPlugin/
├── manifest.json              # Plugin manifest (SDK v3, Node.js 20)
├── imgs/                      # SVG icons for plugin and action states
├── ui/
│   └── run-command.html       # Property Inspector (settings GUI in SD app)
└── bin/
    └── plugin.js              # Built output (esbuild bundle)

.claude/commands/
└── streamdeck.md              # /streamdeck slash command
```

## Key Concepts

- **Plugin SDK**: Uses `@elgato/streamdeck` v2 (Node.js). The Stream Deck app runs a local WebSocket server; plugins connect to it and exchange JSON events.
- **Actions**: Each button on the deck runs an "action". Our action is `com.lsl.claude-runner.run`. The action handles `keyDown`, `willAppear`, `willDisappear`, and `didReceiveSettings` events.
- **Settings**: Per-button config (mode, command, title, workingDir, resetDelay) persisted by the Stream Deck app. Editable via Property Inspector or `setSettings()` API.
- **Edit mode**: Polls `~/.streamdeck/pending-config.json` every 500ms. When found, all action instances enter edit mode. On tap, the pending config is applied to that button's settings.
- **SVG icons**: Dynamic state icons (idle, running, done, error, edit, empty, assigned) are inline SVGs converted to data URIs via `setImage()`.

## Build & Dev Commands

```bash
npm run build      # Bundle src/ → com.lsl.claude-runner.sdPlugin/bin/plugin.js
npm run watch      # Build + watch for changes
npm run dev        # Build + link + restart plugin
npm run restart    # Restart plugin without rebuilding
npm run pack       # Create .streamDeckPlugin distributable file
```

## Run Modes

| Mode | Behavior | Completion |
|------|----------|------------|
| `script` | Spawns child process, tracks exit code | Yes |
| `terminal` | Opens Terminal.app tab via osascript | Fire-and-forget |
| `claude-skill` | Opens Terminal, runs `claude -p "/skill"` | Fire-and-forget |

## Button States

Buttons cycle through visual states using inline SVGs:

1. **Idle** (purple play icon) — ready to run
2. **Empty** (dashed circle with +) — no command configured
3. **Running** (amber spinner) — command in progress
4. **Done** (green checkmark) — command succeeded
5. **Error** (red X) — command failed
6. **Edit** (pulsing purple border) — waiting for tap to assign
7. **Assigned** (green border + checkmark) — just assigned, briefly shown

## Pending Config File Format

`~/.streamdeck/pending-config.json`:

```json
{
  "mode": "claude-skill",
  "command": "skill-name",
  "title": "Button\nTitle",
  "workingDir": "/path/to/dir"
}
```

- `mode`: `"script"`, `"terminal"`, or `"claude-skill"`
- `command`: skill name (without slash), script path, or shell command
- `title`: button display text (`\n` for line break)
- `workingDir`: optional working directory

## Stream Deck Config Files

The Stream Deck app stores button layouts in:
```
~/Library/Application Support/com.elgato.StreamDeck/ProfilesV3/<profile>.sdProfile/
```

Each page has a `Profiles/<PAGE_UUID>/manifest.json` with button actions keyed by `"row,col"` (e.g., `"0,0"` is top-left). The `/streamdeck` slash command can read and edit these directly.

## Important Notes

- macOS only (uses Terminal.app and osascript)
- The Stream Deck app must be running for the plugin to work
- The plugin's Node.js runtime is provided by the Stream Deck app (Node 20)
- `npm run link` creates a symlink in `~/Library/Application Support/com.elgato.StreamDeck/Plugins/`
- Edit mode times out after 30 seconds
