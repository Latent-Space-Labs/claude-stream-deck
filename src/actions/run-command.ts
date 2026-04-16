import streamDeck, {
  action,
  KeyDownEvent,
  SingletonAction,
  WillAppearEvent,
  WillDisappearEvent,
  DidReceiveSettingsEvent,
  type Action,
} from "@elgato/streamdeck";
import { exec, spawn } from "child_process";
import { readFileSync, unlinkSync, existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";

type RunMode = "script" | "terminal" | "claude-skill";

type Settings = {
  command: string;
  title: string;
  mode: RunMode;
  workingDir: string;
  resetDelay: string;
};

type PendingConfig = {
  mode: RunMode;
  command: string;
  title: string;
  workingDir?: string;
};

// --- SVG icons ---

const IDLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 144">
  <rect width="144" height="144" rx="20" fill="#1a1a2e"/>
  <circle cx="72" cy="62" r="28" fill="none" stroke="#7c3aed" stroke-width="4"/>
  <polygon points="64,48 64,76 88,62" fill="#7c3aed"/>
  <rect x="30" y="100" width="84" height="6" rx="3" fill="#333"/>
</svg>`;

const EMPTY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 144">
  <rect width="144" height="144" rx="20" fill="#1a1a2e"/>
  <circle cx="72" cy="62" r="28" fill="none" stroke="#333" stroke-width="3" stroke-dasharray="8 6"/>
  <line x1="60" y1="62" x2="84" y2="62" stroke="#444" stroke-width="3" stroke-linecap="round"/>
  <line x1="72" y1="50" x2="72" y2="74" stroke="#444" stroke-width="3" stroke-linecap="round"/>
</svg>`;

const EDIT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 144">
  <rect width="144" height="144" rx="20" fill="#1a1a2e"/>
  <rect x="8" y="8" width="128" height="128" rx="16" fill="none" stroke="#7c3aed" stroke-width="3" stroke-dasharray="12 6">
    <animate attributeName="stroke-dashoffset" from="0" to="36" dur="1.5s" repeatCount="indefinite"/>
  </rect>
  <circle cx="72" cy="56" r="20" fill="none" stroke="#a78bfa" stroke-width="3"/>
  <path d="M62 54 L70 62 L82 50" fill="none" stroke="#a78bfa" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
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

const ASSIGNED_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 144">
  <rect width="144" height="144" rx="20" fill="#1a1a2e"/>
  <rect x="8" y="8" width="128" height="128" rx="16" fill="none" stroke="#10b981" stroke-width="4"/>
  <path d="M48 72 L64 88 L96 56" fill="none" stroke="#10b981" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// --- Pending config file path ---
const STREAMDECK_DIR = join(homedir(), ".streamdeck");
const PENDING_CONFIG_PATH = join(STREAMDECK_DIR, "pending-config.json");

// --- Action ---

const runningProcesses = new Map<string, boolean>();

@action({ UUID: "com.lsl.claude-runner.run" })
export class RunCommandAction extends SingletonAction<Settings> {
  // Track all visible button instances
  private instances = new Map<string, Action<Settings>>();
  private instanceSettings = new Map<string, Settings>();
  private editMode = false;
  private pendingConfig: PendingConfig | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  override async onWillAppear(ev: WillAppearEvent<Settings>): Promise<void> {
    this.instances.set(ev.action.id, ev.action);
    this.instanceSettings.set(ev.action.id, ev.payload.settings);
    await this.setIdleState(ev.action, ev.payload.settings);

    // Start polling for pending config if not already
    if (!this.pollInterval) {
      this.startPolling();
    }
  }

  override async onWillDisappear(ev: WillDisappearEvent<Settings>): Promise<void> {
    this.instances.delete(ev.action.id);
    this.instanceSettings.delete(ev.action.id);

    if (this.instances.size === 0 && this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<Settings>): Promise<void> {
    this.instanceSettings.set(ev.action.id, ev.payload.settings);
    if (!this.editMode) {
      await this.setIdleState(ev.action, ev.payload.settings);
    }
  }

  override async onKeyDown(ev: KeyDownEvent<Settings>): Promise<void> {
    // --- EDIT MODE: tap to assign ---
    if (this.editMode && this.pendingConfig) {
      const config = this.pendingConfig;
      const newSettings: Settings = {
        mode: config.mode,
        command: config.command,
        title: config.title,
        workingDir: config.workingDir || "",
        resetDelay: "3",
      };

      // Apply to this button
      await ev.action.setSettings(newSettings);
      this.instanceSettings.set(ev.action.id, newSettings);

      // Show "assigned" confirmation on this button
      await ev.action.setImage(svgToDataUri(ASSIGNED_SVG));
      await ev.action.setTitle("Set!");
      await ev.action.showOk();

      // Exit edit mode for all buttons
      await this.exitEditMode();

      // Delete pending config file
      try { unlinkSync(PENDING_CONFIG_PATH); } catch {}

      // Reset this button to idle after a beat
      setTimeout(async () => {
        await this.setIdleState(ev.action, newSettings);
      }, 1500);

      return;
    }

    // --- NORMAL MODE: run the command ---
    const settings = ev.payload.settings;
    const actionId = ev.action.id;

    if (!settings.command) {
      await ev.action.showAlert();
      return;
    }

    if (runningProcesses.get(actionId)) return;
    runningProcesses.set(actionId, true);

    const mode = settings.mode || "script";
    const resetDelay = parseInt(settings.resetDelay || "3", 10) * 1000;

    await ev.action.setImage(svgToDataUri(RUNNING_SVG));
    await ev.action.setTitle("Running...");

    try {
      if (mode === "terminal" || mode === "claude-skill") {
        const cmd =
          mode === "claude-skill"
            ? `cd ${this.escapeShell(settings.workingDir || "~")} && claude -p "/${settings.command}"`
            : settings.command;

        await this.runInTerminal(cmd);
        await ev.action.setImage(svgToDataUri(DONE_SVG));
        await ev.action.setTitle("Launched");
        await ev.action.showOk();
      } else {
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

    setTimeout(async () => {
      runningProcesses.delete(actionId);
      await this.setIdleState(ev.action, settings);
    }, resetDelay);
  }

  // --- Edit mode ---

  private startPolling(): void {
    // Ensure ~/.streamdeck directory exists
    try {
      if (!existsSync(STREAMDECK_DIR)) {
        mkdirSync(STREAMDECK_DIR, { recursive: true });
      }
    } catch {}

    this.pollInterval = setInterval(() => {
      this.checkPendingConfig();
    }, 500);
  }

  private async checkPendingConfig(): Promise<void> {
    if (this.editMode) return;

    try {
      if (!existsSync(PENDING_CONFIG_PATH)) return;

      const raw = readFileSync(PENDING_CONFIG_PATH, "utf-8");
      const config = JSON.parse(raw) as PendingConfig;

      if (!config.command) {
        unlinkSync(PENDING_CONFIG_PATH);
        return;
      }

      this.pendingConfig = config;
      await this.enterEditMode(config);
    } catch {
      // Ignore parse errors, malformed files, etc.
    }
  }

  private async enterEditMode(config: PendingConfig): Promise<void> {
    this.editMode = true;
    streamDeck.logger.info(`Entering edit mode: assign "${config.command}" (${config.mode})`);

    for (const [, instance] of this.instances) {
      try {
        await instance.setImage(svgToDataUri(EDIT_SVG));
        await instance.setTitle(`TAP for\n${config.title || config.command}`);
      } catch {}
    }

    // Auto-exit edit mode after 30 seconds if no button is tapped
    setTimeout(async () => {
      if (this.editMode) {
        streamDeck.logger.info("Edit mode timed out after 30s");
        try { unlinkSync(PENDING_CONFIG_PATH); } catch {}
        await this.exitEditMode();
      }
    }, 30_000);
  }

  private async exitEditMode(): Promise<void> {
    this.editMode = false;
    this.pendingConfig = null;

    // Restore all buttons to their idle state
    for (const [id, instance] of this.instances) {
      const settings = this.instanceSettings.get(id);
      if (settings) {
        try {
          await this.setIdleState(instance, settings);
        } catch {}
      }
    }
  }

  // --- Helpers ---

  private async setIdleState(action: Action<Settings>, settings: Settings): Promise<void> {
    if (!settings.command) {
      await action.setImage(svgToDataUri(EMPTY_SVG));
      await action.setTitle("Empty");
      return;
    }
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
