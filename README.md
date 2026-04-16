# Claude Stream Deck

An [Elgato Stream Deck](https://www.elgato.com/stream-deck) plugin for running [Claude Code](https://docs.anthropic.com/en/docs/claude-code) skills, shell scripts, and commands — with live animated button feedback.

Press a button and watch it animate: **Idle** (purple) -> **Running** (amber spinner) -> **Done** (green check) or **Error** (red X) -> auto-resets.

![Stream Deck Plugin States](https://img.shields.io/badge/states-idle%20%E2%86%92%20running%20%E2%86%92%20done-7c3aed)

## Features

- **3 run modes** — Run Script (tracks exit code), Open in Terminal, Claude Code Skill
- **Live button feedback** — icon and title update in real-time as your command runs
- **Edit mode** — assign skills from Claude Code by tapping a button on your Stream Deck (no GUI needed)
- **Property Inspector** — GUI settings panel in the Stream Deck app for per-button configuration
- **Claude Code slash command** — `/streamdeck` skill for managing buttons via natural language

## Requirements

- macOS 12+
- [Elgato Stream Deck](https://www.elgato.com/stream-deck) (any model)
- [Stream Deck Software](https://www.elgato.com/downloads) 6.9+
- Node.js 20+
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (for the Claude Code Skill mode)

## Install

### From source

```bash
# Install the Stream Deck CLI
npm install -g @elgato/cli

# Clone and build
git clone https://github.com/Latent-Space-Labs/claude-stream-deck.git
cd claude-stream-deck
npm install
npm run build

# Link plugin into the Stream Deck app
npm run link

# Restart the Stream Deck app (or restart just the plugin)
npm run restart
```

## Usage

### Manual setup

1. Open the **Stream Deck** app
2. Find **Claude Runner** in the action list (right panel)
3. Drag **Run Command** onto any button
4. Click the button to configure:

| Setting | Description |
|---------|-------------|
| **Mode** | How to run the command (see table below) |
| **Command** | Script path, shell command, or Claude Code skill name |
| **Button Title** | Display text (use `\n` for two lines) |
| **Working Directory** | Where to run the command (defaults to `$HOME`) |
| **Reset Delay** | Seconds to show Done/Error before resetting (default: 3) |

### Modes

| Mode | What it does | Tracks completion? |
|------|-------------|-------------------|
| **Run Script** | Executes a shell command directly | Yes — Done on exit 0, Error otherwise |
| **Open in Terminal** | Opens a new Terminal.app tab | No — shows "Launched" |
| **Claude Code Skill** | Opens Terminal and runs `claude -p "/skill-name"` | No — shows "Launched" |

### Examples

| Button | Mode | Command | Working Dir |
|--------|------|---------|-------------|
| Local Dev | Run Script | `./start-dev.sh` | `~/Code/my-app` |
| Deploy | Claude Code Skill | `sync-to-main` | `~/Code/my-app` |
| Tests | Run Script | `npm test` | `~/Code/my-app` |
| SSH | Open in Terminal | `ssh user@host` | |

## Edit mode (assign buttons from Claude Code)

Instead of configuring buttons in the Stream Deck GUI, you can assign them directly from Claude Code.

### How it works

1. Write a JSON file to `~/.streamdeck/pending-config.json`:

```json
{
  "mode": "claude-skill",
  "command": "my-skill-name",
  "title": "My\nSkill",
  "workingDir": "~/Code/my-project"
}
```

2. All Claude Runner buttons on your Stream Deck immediately enter **edit mode** — they pulse with an animated border and show "TAP for [skill name]"
3. Tap the button you want to assign
4. The button gets configured, shows a green checkmark, and returns to normal
5. Edit mode auto-cancels after 30 seconds if no button is tapped

### Using the `/streamdeck` slash command

This repo includes a Claude Code slash command that makes this even easier. Install it:

```bash
ln -sf "$(pwd)/.claude/commands/streamdeck.md" ~/.claude/commands/streamdeck.md
```

Then from any Claude Code session:

```
# Triggers edit mode — tap a button to assign
/streamdeck run my-skill on my stream deck

# Direct assignment by position
/streamdeck put deploy on top right

# View current layout
/streamdeck list buttons
```

**Position aliases**: `top left`, `top right`, `middle left`, `middle right`, `bottom left`, `bottom right`

## Development

```bash
npm run build      # Build the plugin
npm run watch      # Build + watch for changes
npm run dev        # Build + link + restart plugin
npm run pack       # Create .streamDeckPlugin distributable
```

### Project structure

```
claude-stream-deck/
├── src/
│   ├── plugin.ts                  # Entry point — registers actions
│   └── actions/
│       └── run-command.ts         # Main action — run, edit mode, state management
├── com.lsl.claude-runner.sdPlugin/
│   ├── manifest.json              # Stream Deck plugin manifest
│   ├── imgs/                      # SVG icons (plugin, action states)
│   └── ui/
│       └── run-command.html       # Property Inspector (settings GUI)
├── .claude/commands/
│   └── streamdeck.md              # Claude Code slash command
├── esbuild.config.mjs             # Build config
├── package.json
└── tsconfig.json
```

### Architecture

The plugin uses the [Elgato Stream Deck SDK v2](https://docs.elgato.com/streamdeck) (`@elgato/streamdeck` on npm). Key concepts:

- **Actions** register with the Stream Deck WebSocket server and respond to button events
- **Settings** are persisted per-button instance by the Stream Deck app
- **Edit mode** polls `~/.streamdeck/pending-config.json` every 500ms for pending assignments
- **SVG icons** are generated as data URIs for dynamic state changes (idle, running, done, error, edit)

## Contributing

Contributions are welcome! Some ideas:

- **Windows support** — Terminal.app is macOS-only; add PowerShell/Windows Terminal support
- **More actions** — URL opener, multi-command sequences, conditional flows
- **Icon customization** — let users set custom icons per button via the Property Inspector
- **Status polling** — watch a URL or file and update the button state continuously

## License

MIT
