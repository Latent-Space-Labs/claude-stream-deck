# Stream Deck Configuration

Configure Stream Deck buttons via natural language. Supports the Claude Runner plugin for animated button states.

## User's Request

$ARGUMENTS

## Position Aliases

Map natural language positions to the 3x2 grid. If the user says a position like "top left", resolve it:

| Alias | Position |
|-------|----------|
| top left | 0,0 |
| top right | 0,1 |
| middle left, center left | 1,0 |
| middle right, center right | 1,1 |
| bottom left | 2,0 |
| bottom right | 2,1 |

Page aliases: "page 1" / "first page" = first page, "page 2" / "second page" = second page.

## Two Workflows

### Workflow A: Edit Mode (user says "run X on my stream deck" without specifying position)

When the user wants to assign a skill/command but doesn't specify which button:

1. Write `~/.streamdeck/pending-config.json`:
```json
{
  "mode": "claude-skill",
  "command": "skill-name-here",
  "title": "Button Title",
  "workingDir": "/path/to/working/dir"
}
```

Mode options: `"claude-skill"` (runs `claude -p "/skill"`), `"script"` (runs a command directly), `"terminal"` (opens in Terminal tab).

For Claude skills, set `command` to just the skill name without the slash (e.g., `"commit"` not `"/commit"`).

2. Tell the user: "I've queued the skill. Your Stream Deck buttons are now in edit mode — tap the button you want to assign it to. You have 30 seconds before it times out."

3. Done. The plugin handles the rest — it polls for the file, enters edit mode, and configures the tapped button.

### Workflow B: Direct Config (user specifies position, or needs non-plugin actions)

When the user specifies a position (e.g., "run commit on top left") or wants built-in actions (URLs, folders):

1. Find the `.sdProfile` directory:
```bash
ls ~/Library/Application\ Support/com.elgato.StreamDeck/ProfilesV3/
```

2. Read the root `manifest.json` to get page list, then read page manifests.

3. Quit Stream Deck: `osascript -e 'tell application "Elgato Stream Deck" to quit'`

4. Edit the page's `manifest.json` to add/update the action at the target position.

For Claude Runner plugin buttons, use this action template:
```json
{
  "ActionID": "<uuidgen>",
  "LinkedTitle": true,
  "Name": "Run Command",
  "Plugin": {"Name": "Claude Runner", "UUID": "com.lsl.claude-runner", "Version": "1.0"},
  "Resources": null,
  "Settings": {"mode": "claude-skill", "command": "skill-name", "title": "Title", "workingDir": "~/Code/Jori", "resetDelay": "3"},
  "State": 0,
  "States": [{}],
  "UUID": "com.lsl.claude-runner.run"
}
```

For website buttons:
```json
{
  "ActionID": "<uuidgen>",
  "LinkedTitle": true,
  "Name": "Website",
  "Plugin": {"Name": "Website", "UUID": "com.elgato.streamdeck.system.website", "Version": "1.0"},
  "Resources": null,
  "Settings": {"browser": "", "openInBrowser": true, "path": "https://example.com"},
  "State": 0,
  "States": [{"Title": "Label"}],
  "UUID": "com.elgato.streamdeck.system.website"
}
```

5. Relaunch: `open -a "Elgato Stream Deck" 2>/dev/null || open -a "Stream Deck"`

### Deciding which workflow

- No position specified -> Workflow A (edit mode)
- Position specified -> Workflow B (direct config)
- "list" / "show" -> Read and display current layout
- Non-plugin actions (URLs, folders) -> Always Workflow B

## Showing Current Layout

When listing buttons, read all page manifests and display as:

```
Page 1:
+---------------+---------------+
| [0,0] Title   | [0,1] Title   |
+---------------+---------------+
| [1,0] Title   | [1,1] Title   |
+---------------+---------------+
| [2,0] Title   | [2,1] Title   |
+---------------+---------------+

Page 2:
...
```

## Important Notes

- Generate UUIDs with: `uuidgen | tr '[:upper:]' '[:lower:]'`
- Always quit Stream Deck before editing config, relaunch after
- Button titles support `\n` for two-line display
- Keep titles short (max ~8 chars per line)
- The `~/.streamdeck/` directory is created automatically by the plugin
- Edit mode times out after 30 seconds
- The pending config file is deleted after a button is tapped or timeout
