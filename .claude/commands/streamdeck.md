# Stream Deck Mini Configuration

Configure buttons on the user's Elgato Stream Deck Mini (3 columns × 2 rows = 6 buttons per page) to run shell scripts, open URLs, or trigger Claude Code skills.

## User's Argument

$ARGUMENTS

## Stream Deck Config Location

All config lives under:
```
~/Library/Application Support/com.elgato.StreamDeck/ProfilesV3/
```

Find the `.sdProfile` directory inside `ProfilesV3/`. Inside that:
- `manifest.json` — root profile with device info and page list
- `Profiles/<PAGE_UUID>/manifest.json` — per-page button layout

## Grid Layout

The Stream Deck Mini is a 3×2 grid. Button positions in config use `"row,col"` format:

```
┌─────────┬─────────┐
│  0,0    │  0,1    │
├─────────┼─────────┤
│  1,0    │  1,1    │
├─────────┼─────────┤
│  2,0    │  2,1    │
└─────────┴─────────┘
```

## Supported Actions

### 1. Run a shell script (System Open)
Used for launching dev environments, running commands, triggering Claude skills, etc.

```json
{
  "ActionID": "<generate-uuid>",
  "LinkedTitle": true,
  "Name": "Open",
  "Plugin": {"Name": "Open", "UUID": "com.elgato.streamdeck.system.open", "Version": "1.0"},
  "Resources": null,
  "Settings": {"openInBrowser": false, "path": "/absolute/path/to/script.sh"},
  "State": 0,
  "States": [{"FontFamily": "", "FontSize": 12, "FontStyle": "", "FontUnderline": false, "OutlineThickness": 2, "ShowTitle": true, "Title": "Button\nLabel", "TitleAlignment": "bottom", "TitleColor": "#ffffff"}],
  "UUID": "com.elgato.streamdeck.system.open"
}
```

### 2. Open a URL (Website)
```json
{
  "ActionID": "<generate-uuid>",
  "LinkedTitle": true,
  "Name": "Website",
  "Plugin": {"Name": "Website", "UUID": "com.elgato.streamdeck.system.website", "Version": "1.0"},
  "Resources": null,
  "Settings": {"browser": "", "openInBrowser": true, "path": "https://example.com"},
  "State": 0,
  "States": [{"Title": "Button\nLabel"}],
  "UUID": "com.elgato.streamdeck.system.website"
}
```

## Workflow

### Step 1: Read current state
1. Find the `.sdProfile` directory: `ls ~/Library/Application\ Support/com.elgato.StreamDeck/ProfilesV3/`
2. Read the root `manifest.json` to get the page list
3. Read each page's `manifest.json` to see current button assignments
4. Present the current layout to the user in a visual grid

### Step 2: Determine what to do
Based on the user's argument, figure out what they want:
- **Add/update a button**: Need position (page + row,col), action type, and settings
- **Remove a button**: Need position
- **List buttons**: Show current layout
- **Map a Claude skill**: Create a shell script wrapper, then assign the button

If the argument is unclear, ask the user what they want to configure.

### Step 3: For Claude Code skill buttons
When the user wants a button that triggers a Claude Code skill:

1. Create a shell script at `~/.streamdeck/scripts/<skill-name>.sh`:
```bash
#!/bin/bash
# Stream Deck: Run Claude Code skill "<skill-name>"
osascript -e '
tell application "Terminal"
    activate
    do script "cd <working-dir> && claude -p \"/<skill-name>\""
end tell'
```

2. Make it executable: `chmod +x ~/.streamdeck/scripts/<skill-name>.sh`
3. Point the Stream Deck button to this script using the "System Open" action template

### Step 4: Apply changes
1. **Quit** the Stream Deck app: `osascript -e 'tell application "Elgato Stream Deck" to quit'`
2. Wait 1-2 seconds for the app to fully close
3. Edit the page's `manifest.json` — add/update/remove the action at the target position
4. **Relaunch** the Stream Deck app: `open -a "Elgato Stream Deck" 2>/dev/null || open -a "Stream Deck"`
5. Tell the user which page and position the button is on

### UUID Generation
Generate unique UUIDs for `ActionID` fields. Use `uuidgen` on macOS:
```bash
uuidgen | tr '[:upper:]' '[:lower:]'
```

## Important Notes

- Always quit the Stream Deck app before editing config files, then relaunch after
- Button titles support `\n` for line breaks (renders as two lines on the button)
- The Stream Deck Mini has only 2 pages by default — check if there's room before adding
- If all slots on all pages are full, tell the user and ask which button to replace
- Positions are `row,col` where row 0 is top, col 0 is left
- Keep titles short (max ~8 chars per line, 2 lines max)
- When showing layouts, always show ALL pages so the user can pick where to put things
