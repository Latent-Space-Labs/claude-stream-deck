import streamDeck, {
  action,
  KeyDownEvent,
  SingletonAction,
  WillAppearEvent,
  DidReceiveSettingsEvent,
  type Action,
} from "@elgato/streamdeck";
import { exec, spawn } from "child_process";

type RunMode = "script" | "terminal" | "claude-skill";

type Settings = {
  command: string;
  title: string;
  mode: RunMode;
  workingDir: string;
  resetDelay: string; // seconds as string (from PI text field)
};

const IDLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 144">
  <rect width="144" height="144" rx="20" fill="#1a1a2e"/>
  <circle cx="72" cy="62" r="28" fill="none" stroke="#7c3aed" stroke-width="4"/>
  <path d="M72 48 L72 62 L82 68" fill="none" stroke="#7c3aed" stroke-width="4" stroke-linecap="round"/>
  <rect x="30" y="100" width="84" height="6" rx="3" fill="#333"/>
</svg>`;

const RUNNING_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 144">
  <rect width="144" height="144" rx="20" fill="#1a1a2e"/>
  <circle cx="72" cy="62" r="28" fill="none" stroke="#f59e0b" stroke-width="4" stroke-dasharray="20 10">
    <animateTransform attributeName="transform" type="rotate" from="0 72 62" to="360 72 62" dur="1s" repeatCount="indefinite"/>
  </circle>
  <rect x="30" y="100" width="50" height="6" rx="3" fill="#f59e0b"/>
</svg>`;

const DONE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 144">
  <rect width="144" height="144" rx="20" fill="#1a1a2e"/>
  <circle cx="72" cy="62" r="28" fill="none" stroke="#10b981" stroke-width="4"/>
  <path d="M56 62 L67 73 L88 52" fill="none" stroke="#10b981" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="30" y="100" width="84" height="6" rx="3" fill="#10b981"/>
</svg>`;

const ERROR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 144">
  <rect width="144" height="144" rx="20" fill="#1a1a2e"/>
  <circle cx="72" cy="62" r="28" fill="none" stroke="#ef4444" stroke-width="4"/>
  <path d="M60 50 L84 74 M84 50 L60 74" fill="none" stroke="#ef4444" stroke-width="5" stroke-linecap="round"/>
  <rect x="30" y="100" width="84" height="6" rx="3" fill="#ef4444"/>
</svg>`;

function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const runningProcesses = new Map<string, boolean>();

@action({ UUID: "com.lsl.claude-runner.run" })
export class RunCommandAction extends SingletonAction<Settings> {
  override async onWillAppear(ev: WillAppearEvent<Settings>): Promise<void> {
    await this.setIdleState(ev.action, ev.payload.settings);
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<Settings>): Promise<void> {
    await this.setIdleState(ev.action, ev.payload.settings);
  }

  override async onKeyDown(ev: KeyDownEvent<Settings>): Promise<void> {
    const settings = ev.payload.settings;
    const actionId = ev.action.id;

    if (!settings.command) {
      await ev.action.showAlert();
      return;
    }

    // Prevent double-press while running
    if (runningProcesses.get(actionId)) {
      return;
    }
    runningProcesses.set(actionId, true);

    const mode = settings.mode || "script";
    const resetDelay = parseInt(settings.resetDelay || "3", 10) * 1000;

    // Show running state
    await ev.action.setImage(svgToDataUri(RUNNING_SVG));
    await ev.action.setTitle("Running...");

    try {
      if (mode === "terminal" || mode === "claude-skill") {
        // Open in Terminal — fire and forget
        const cmd =
          mode === "claude-skill"
            ? `cd ${this.escapeShell(settings.workingDir || "~")} && claude -p "/${settings.command}"`
            : settings.command;

        await this.runInTerminal(cmd);

        await ev.action.setImage(svgToDataUri(DONE_SVG));
        await ev.action.setTitle("Launched");
        await ev.action.showOk();
      } else {
        // Run script directly — track exit code
        await this.runScript(settings.command, settings.workingDir);
        await ev.action.setImage(svgToDataUri(DONE_SVG));
        await ev.action.setTitle("Done");
        await ev.action.showOk();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed";
      streamDeck.logger.error(`Command failed: ${msg}`);
      await ev.action.setImage(svgToDataUri(ERROR_SVG));
      await ev.action.setTitle("Error");
      await ev.action.showAlert();
    }

    // Reset to idle after delay
    setTimeout(async () => {
      runningProcesses.delete(actionId);
      await this.setIdleState(ev.action, settings);
    }, resetDelay);
  }

  private async setIdleState(action: Action<Settings>, settings: Settings): Promise<void> {
    const title = settings.title || settings.command || "No Cmd";
    await action.setImage(svgToDataUri(IDLE_SVG));
    await action.setTitle(title);
  }

  private runInTerminal(command: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = `tell application "Terminal"
        activate
        do script "${command.replace(/"/g, '\\"')}"
      end tell`;
      exec(`osascript -e '${script.replace(/'/g, "'\\''")}'`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private runScript(command: string, workingDir?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn("/bin/bash", ["-c", command], {
        cwd: workingDir || process.env.HOME,
        env: { ...process.env },
        stdio: "ignore",
      });
      child.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Exit code ${code}`));
      });
      child.on("error", reject);
    });
  }

  private escapeShell(s: string): string {
    return `'${s.replace(/'/g, "'\\''")}'`;
  }
}
