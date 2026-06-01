import { spawn } from "node:child_process";
import { createRequire } from "node:module";

import waitOn from "wait-on";

const require = createRequire(import.meta.url);
const electronBinary = require("electron");
const childEnv = { ...process.env };

delete childEnv.ELECTRON_RUN_AS_NODE;

await waitOn({
  resources: ["tcp:127.0.0.1:5173", "tcp:127.0.0.1:3001"],
  timeout: 30_000
});

const child = spawn(electronBinary, ["."], {
  stdio: "inherit",
  env: childEnv
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
