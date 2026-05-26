const { spawn } = require("node:child_process");

const electronBinary = require("electron");
const env = { ...process.env };

// Some Windows setups leave this flag behind globally, which makes Electron
// behave like plain Node and breaks app.whenReady().
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronBinary, ["."], {
  env,
  stdio: "inherit"
});

child.on("error", (error) => {
  console.error("Failed to launch Electron:", error);
  process.exit(1);
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
