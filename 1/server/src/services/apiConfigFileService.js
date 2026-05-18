import fs from "node:fs";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

const CONFIG_DIRECTORY_NAME = "agent API";
const CONFIG_FILE_NAME = "runtime-config.json";

let cachedDocumentsDirectory = "";
let configWatcher = null;
let lastConfigSignature = "";
const configChangeListeners = new Set();

function resolveWindowsDocumentsDirectory() {
  try {
    const output = execFileSync(
      "powershell.exe",
      ["-NoProfile", "-Command", "[Environment]::GetFolderPath('MyDocuments')"],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"]
      }
    );

    const resolved = String(output || "").trim();
    return resolved || "";
  } catch {
    return "";
  }
}

function resolveDocumentsDirectory() {
  if (cachedDocumentsDirectory) {
    return cachedDocumentsDirectory;
  }

  if (process.platform === "win32") {
    const windowsDocuments = resolveWindowsDocumentsDirectory();
    if (windowsDocuments) {
      cachedDocumentsDirectory = windowsDocuments;
      return cachedDocumentsDirectory;
    }
  }

  const fallbackDirectory =
    process.platform === "win32"
      ? path.join(process.env.USERPROFILE || os.homedir(), "Documents")
      : path.join(os.homedir(), "Documents");

  cachedDocumentsDirectory = fallbackDirectory;
  return cachedDocumentsDirectory;
}

export function getApiConfigDirectoryPath() {
  return path.join(resolveDocumentsDirectory(), CONFIG_DIRECTORY_NAME);
}

export function getApiConfigFilePath() {
  return path.join(getApiConfigDirectoryPath(), CONFIG_FILE_NAME);
}

export function readApiConfigFile() {
  const filePath = getApiConfigFilePath();
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function buildConfigSignature(config) {
  return JSON.stringify(config || null);
}

function notifyApiConfigChangeListeners() {
  const config = readApiConfigFile();
  const nextSignature = buildConfigSignature(config);

  if (nextSignature === lastConfigSignature) {
    return;
  }

  lastConfigSignature = nextSignature;
  for (const listener of configChangeListeners) {
    listener(config);
  }
}

function ensureApiConfigWatcher() {
  if (configWatcher) {
    return;
  }

  const directoryPath = getApiConfigDirectoryPath();
  fs.mkdirSync(directoryPath, { recursive: true });
  lastConfigSignature = buildConfigSignature(readApiConfigFile());

  configWatcher = fs.watch(directoryPath, (_eventType, filename) => {
    if (filename && String(filename) !== CONFIG_FILE_NAME) {
      return;
    }

    notifyApiConfigChangeListeners();
  });
}

export function writeApiConfigFile(config) {
  const directoryPath = getApiConfigDirectoryPath();
  fs.mkdirSync(directoryPath, { recursive: true });
  fs.writeFileSync(getApiConfigFilePath(), `${JSON.stringify(config, null, 2)}\n`, "utf8");
  notifyApiConfigChangeListeners();
}

export function subscribeApiConfigChanges(listener) {
  ensureApiConfigWatcher();
  configChangeListeners.add(listener);

  return () => {
    configChangeListeners.delete(listener);
  };
}
