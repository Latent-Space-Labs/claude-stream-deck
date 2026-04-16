# Stream Deck Mini Configuration

Configure buttons on the user's Elgato Stream Deck Mini (3 columns x 2 rows = 6 buttons per page).

## User's Argument

$ARGUMENTS

## Two approaches

### 1. Claude Runner Plugin (preferred for commands/skills)
The **Claude Runner** plugin (`com.lsl.claude-runner`) should already be installed. It provides a "Run Command" action with live button animation (idle/running/done/error states) and a settings GUI.

To use it, tell the user to:
1. Open the Stream Deck app
2. Find "Claude Runner" in the right panel action list
3. Drag "Run Command" onto a button
4. Click the button to configure: mode (script/terminal/claude-skill), command, title, working dir

If the plugin isn't installed, run from the repo:
```bash
cd /Users/bryan/Code/lsl/claude-stream-deck
npm run build && npm run link
```
Then restart the Stream Deck app.

### 2. Direct config editing (for non-plugin actions like URLs, folders, page nav)
For built-in Stream Deck actions (Website, Open, Folders, Page navigation), edit the config files directly.

## Stream Deck Config Location

All config lives under:
```
~/Library/Application Support/com.elgato.StreamDeck/ProfilesV3/
```

Find the `.sdProfile` directory inside `ProfilesV3/`. Inside that:
- `manifest.json` — root profile with device info and page list
- `Profiles/<PAGE_UUID>/manifest.json` — per-page button layout

## Grid Layout

The Stream Deck Mini is a 3x2 grid. Button positions use `"row,col"` format:

```
+----------+----------+
|  0,0     |  0,1     |
+----------+----------+
|  1,0     |  1,1     |
+----------+----------+
|  2,0     |  2,1     |
+----------+----------+
```

## Built-in Action Templates

### Open a URL (Website)
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

### Run a file/app (System Open)
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

### Claude Runner Plugin action
```json
{
  "ActionID": "<generate-uuid>",
  "LinkedTitle": true,
  "Name": "Run Command",
  "Plugin": {"Name": "Claude Runner", "UUID": "com.lsl.claude-runner", "Version": "1.0"},
  "Resources": null,
  "Settings": {"mode": "claude-skill", "command": "commit", "title": "Commit", "workingDir": "~/Code/Jori", "resetDelay": "3"},
  "State": 0,
  "States": [{}],
  "UUID": "com.lsl.claude-runner.run"
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
- **Recommend plugin**: For command/skill buttons, suggest using the Claude Runner plugin via the GUI

If the argument is unclear, ask the user what they want to configure.

### Step 3: Apply config changes
1. **Quit** the Stream Deck app: `osascript -e 'tell application "Elgato Stream Deck" to quit'`
2. Wait 1-2 seconds for the app to fully close
3. Edit the page's `manifest.json`
4. **Relaunch** the Stream Deck app: `open -a "Elgato Stream Deck" 2>/dev/null || open -a "Stream Deck"`
5. Tell the user which page and position the button is on

### UUID Generation
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
