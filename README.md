# Claude Stream Deck

A Stream Deck plugin that runs [Claude Code](https://docs.anthropic.com/en/docs/claude-code) skills, shell scripts, and commands with live button state feedback.

Press a button and watch it animate through states: **Idle** -> **Running** -> **Done/Error** -> resets back.

## Features

- **3 modes**: Run Script (tracks exit code), Open in Terminal, Claude Code Skill
- **Live feedback**: Button icon + title update in real-time as your command runs
- **Visual states**: Idle (purple), Running (amber spinner), Done (green check), Error (red X)
- **Configurable**: Set command, working directory, button title, and reset delay per button
- **Property Inspector**: GUI settings panel in the Stream Deck app — no config files to edit

## Install

### From release (recommended)

1. Download `com.lsl.claude-runner.streamDeckPlugin` from [Releases](https://github.com/Latent-Space-Labs/claude-stream-deck/releases)
2. Double-click the file — Stream Deck app installs it automatically

### From source

```bash
# Prerequisites: Node.js 20+, Elgato Stream Deck CLI
npm install -g @elgato/cli

# Clone and build
git clone https://github.com/Latent-Space-Labs/claude-stream-deck.git
cd claude-stream-deck
npm install
npm run build

# Link plugin to Stream Deck (creates symlink)
npm run link

# Restart the plugin
npm run restart
```

## Usage

1. Open the **Stream Deck** app
2. Find **Claude Runner** in the action list (right panel)
3. Drag **Run Command** onto any button
4. Click the button to open settings:
   - **Mode**: Choose how to run your command
   - **Command**: The script path, shell command, or Claude skill name
   - **Button Title**: What shows on the button (supports `\n` for two lines)
   - **Working Directory**: Where to run the command
   - **Reset Delay**: Seconds to show Done/Error before resetting

### Modes

| Mode | What it does | Completion tracking |
|------|-------------|-------------------|
| **Run Script** | Executes a shell command directly | Yes — shows Done (exit 0) or Error |
| **Open in Terminal** | Opens a new Terminal tab with the command | No — shows "Launched" then resets |
| **Claude Code Skill** | Opens Terminal and runs `claude -p "/skill-name"` | No — shows "Launched" then resets |

### Examples

| Button | Mode | Command | Working Dir |
|--------|------|---------|-------------|
| Local Dev | Run Script | `/path/to/local-dev.sh` | |
| Deploy | Claude Code Skill | `sync-to-main` | `~/Code/Jori` |
| Run Tests | Run Script | `npm test` | `~/Code/my-app` |
| SSH Server | Open in Terminal | `ssh user@host` | |

## Claude Code Skill (bonus)

This repo also includes a `/streamdeck` Claude Code slash command for configuring Stream Deck buttons by editing config files directly. Install it by symlinking:

```bash
ln -sf "$(pwd)/.claude/commands/streamdeck.md" ~/.claude/commands/streamdeck.md
```

Then use `/streamdeck list buttons` or `/streamdeck add button` from any Claude Code session.

## Development

```bash
npm run watch    # Build + watch for changes
npm run dev      # Build + link + restart plugin
npm run pack     # Create .streamDeckPlugin distributable
```

## License

MIT
