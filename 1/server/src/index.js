import net from "node:net";
import { createApp } from "./app.js";
import { env } from "./config/env.js";

function canBindPort(port) {
  return new Promise((resolve, reject) => {
    const tester = net.createServer();

    tester.once("error", (error) => {
      if (error.code === "EADDRINUSE") {
        resolve(false);
        return;
      }
      reject(error);
    });

    tester.once("listening", () => {
      tester.close(() => resolve(true));
    });

    tester.listen(port, "::");
  });
}

async function hasReusableApiServer(port) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/health`);
    if (!response.ok) {
      return false;
    }

    const payload = await response.json();
    return payload?.status === "ok";
  } catch {
    return false;
  }
}

function holdProcessOpen() {
  setInterval(() => {}, 1 << 30);
}

async function main() {
  const port = env.port;
  const portAvailable = await canBindPort(port);

  if (!portAvailable) {
    const reusable = await hasReusableApiServer(port);

    if (reusable) {
      console.log(`API server already running at http://127.0.0.1:${port}, reusing existing process.`);
      holdProcessOpen();
      return;
    }

    throw new Error(`Port ${port} is already in use by another process.`);
  }

  const app = createApp();
  app.listen(port, () => {
    console.log(`API server listening at http://127.0.0.1:${port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
