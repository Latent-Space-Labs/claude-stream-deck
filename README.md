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

### Via Claude Code (recommended)

If you have [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed, just ask it:

> "Clone https://github.com/Latent-Space-Labs/claude-stream-deck and set it up"

Claude will read the `CLAUDE.md`, install dependencies, build the plugin, link it to your Stream Deck, and install the `/streamdeck` slash command. Then you can say things like:

> "Run deploy on my stream deck"

and Claude will trigger edit mode — tap a button to assign it.

### Manual install

```bash
# Install the Stream Deck CLI (one-time)
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

# Optional: install the /streamdeck Claude Code slash command
ln -sf "$(pwd)/.claude/commands/streamdeck.md" ~/.claude/commands/streamdeck.md
```

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
