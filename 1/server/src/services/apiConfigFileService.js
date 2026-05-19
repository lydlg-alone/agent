import fs from "node:fs";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

const CONFIG_DIRECTORY_NAME = "agent API";
const CONFIG_FILE_NAME = "runtime-config.json";
const API_KEY_PROTECTION_MODE = "windows-dpapi-current-user";

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

function runPowerShell(command, extraEnv = {}) {
  return execFileSync("powershell.exe", ["-NoProfile", "-Command", command], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    env: {
      ...process.env,
      ...extraEnv
    }
  });
}

function protectApiKey(apiKey) {
  const normalized = String(apiKey || "").trim();
  if (!normalized) {
    return "";
  }

  if (process.platform !== "win32") {
    return normalized;
  }

  try {
    return String(
      runPowerShell(
        "$value = $env:AGENT_API_KEY_PLAIN; if ([string]::IsNullOrEmpty($value)) { '' } else { ConvertFrom-SecureString (ConvertTo-SecureString -String $value -AsPlainText -Force) }",
        { AGENT_API_KEY_PLAIN: normalized }
      )
    ).trim();
  } catch {
    const error = new Error("无法使用系统凭据机制加密保存 API Key。");
    error.statusCode = 500;
    throw error;
  }
}

function unprotectApiKey(protectedValue) {
  const normalized = String(protectedValue || "").trim();
  if (!normalized) {
    return "";
  }

  if (process.platform !== "win32") {
    return normalized;
  }

  try {
    return String(
      runPowerShell(
        "$value = $env:AGENT_API_KEY_PROTECTED; if ([string]::IsNullOrEmpty($value)) { '' } else { $secure = ConvertTo-SecureString -String $value; $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure); try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) } finally { if ($bstr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) } } }",
        { AGENT_API_KEY_PROTECTED: normalized }
      )
    ).replace(/\r?\n$/, "");
  } catch {
    return "";
  }
}

function buildPersistedConfig(config) {
  const normalizedApiKey = String(config?.apiKey || "").trim();
  const nextConfig = {
    provider: String(config?.provider || "").trim(),
    baseUrl: String(config?.baseUrl || "").trim(),
    systemPrompt: String(config?.systemPrompt || "").trim(),
    modelId: String(config?.modelId || "").trim(),
    updatedAt: String(config?.updatedAt || "").trim()
  };

  if (normalizedApiKey) {
    if (process.platform === "win32") {
      nextConfig.apiKeyProtected = protectApiKey(normalizedApiKey);
      nextConfig.apiKeyProtection = API_KEY_PROTECTION_MODE;
    } else {
      nextConfig.apiKey = normalizedApiKey;
      nextConfig.apiKeyProtection = "plaintext-fallback";
    }
  }

  return nextConfig;
}

function normalizeRuntimeConfig(rawConfig) {
  if (!rawConfig || typeof rawConfig !== "object" || Array.isArray(rawConfig)) {
    return null;
  }

  const plainApiKey = String(rawConfig.apiKey || "").trim();
  const protectedApiKey = String(rawConfig.apiKeyProtected || "").trim();
  const apiKey = protectedApiKey ? unprotectApiKey(protectedApiKey) : plainApiKey;

  return {
    provider: String(rawConfig.provider || "").trim(),
    baseUrl: String(rawConfig.baseUrl || "").trim(),
    apiKey,
    systemPrompt: String(rawConfig.systemPrompt || "").trim(),
    modelId: String(rawConfig.modelId || "").trim(),
    updatedAt: String(rawConfig.updatedAt || "").trim()
  };
}

function readStoredConfigFile() {
  const filePath = getApiConfigFilePath();
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function migrateLegacyPlaintextConfig(rawConfig) {
  const legacyApiKey = String(rawConfig?.apiKey || "").trim();
  if (!legacyApiKey || String(rawConfig?.apiKeyProtected || "").trim()) {
    return;
  }

  try {
    writeApiConfigFile({
      provider: rawConfig.provider,
      baseUrl: rawConfig.baseUrl,
      apiKey: legacyApiKey,
      systemPrompt: rawConfig.systemPrompt,
      modelId: rawConfig.modelId,
      updatedAt: rawConfig.updatedAt
    });
  } catch {
    // Keep legacy plaintext config readable if migration fails.
  }
}

export function getApiConfigDirectoryPath() {
  if (process.env.AGENT_CONFIG_DIR) {
    return path.resolve(process.env.AGENT_CONFIG_DIR);
  }

  return path.join(resolveDocumentsDirectory(), CONFIG_DIRECTORY_NAME);
}

export function getApiConfigFilePath() {
  return path.join(getApiConfigDirectoryPath(), CONFIG_FILE_NAME);
}

export function readApiConfigFile() {
  const rawConfig = readStoredConfigFile();
  if (!rawConfig) {
    return null;
  }

  migrateLegacyPlaintextConfig(rawConfig);
  return normalizeRuntimeConfig(rawConfig);
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
  const persistedConfig = buildPersistedConfig(config);
  fs.writeFileSync(getApiConfigFilePath(), `${JSON.stringify(persistedConfig, null, 2)}\n`, "utf8");
  notifyApiConfigChangeListeners();
}

export function subscribeApiConfigChanges(listener) {
  ensureApiConfigWatcher();
  configChangeListeners.add(listener);

  return () => {
    configChangeListeners.delete(listener);
  };
}
