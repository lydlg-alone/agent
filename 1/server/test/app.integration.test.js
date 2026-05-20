import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import test from "node:test";

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "agent-server-test-"));
const dataDir = path.join(tempRoot, "data");
const configDir = path.join(tempRoot, "config");
const configFilePath = path.join(configDir, "runtime-config.json");

process.env.AGENT_DATA_DIR = dataDir;
process.env.AGENT_CONFIG_DIR = configDir;

const [{ createApp }, { closeDb }] = await Promise.all([
  import("../src/app.js"),
  import("../src/config/database.js")
]);

let server;
let baseUrl = "";

async function startServer() {
  const app = createApp();
  server = app.listen(0);
  await once(server, "listening");
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
}

async function stopServer() {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  closeDb();
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

async function requestJson(url, options = {}) {
  const response = await fetch(`${baseUrl}${url}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const text = await response.text();
  const json = text ? JSON.parse(text) : null;
  return { response, json };
}

function clearRuntimeConfig() {
  fs.rmSync(configFilePath, { force: true });
}

test("server integration flows", async (t) => {
  await startServer();
  t.after(async () => {
    await stopServer();
  });

  await t.test("chat returns mock assistant reply when runtime config is absent", async () => {
    clearRuntimeConfig();

    const { response, json } = await requestJson("/api/chat/messages", {
      method: "POST",
      body: JSON.stringify({
        content: "帮我整理今天的复习重点"
      })
    });

    assert.equal(response.status, 201);
    assert.equal(json.assistantMessage.source, "mock");
    assert.match(json.assistantMessage.content, /本地演示回复/);
    assert.ok(json.sessionId);
  });

  await t.test("chat streaming endpoint emits start delta and done events", async () => {
    clearRuntimeConfig();

    const response = await fetch(`${baseUrl}/api/chat/messages/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream"
      },
      body: JSON.stringify({
        content: "基于知识库给我一个复习建议"
      })
    });

    assert.equal(response.status, 200);
    const text = await response.text();
    const events = text
      .split(/\r?\n\r?\n/)
      .map((block) =>
        block
          .split(/\r?\n/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trim())
          .join("\n")
      )
      .filter(Boolean)
      .map((line) => JSON.parse(line));

    assert.equal(events[0].type, "start");
    assert.ok(events.some((event) => event.type === "delta"));
    assert.equal(events.at(-1).type, "done");
    assert.match(events.at(-1).assistantMessage.content, /本地演示回复/);
  });

  await t.test("knowledge import persists documents and listing returns them", async () => {
    const { response, json } = await requestJson("/api/knowledge/import", {
      method: "POST",
      body: JSON.stringify({
        files: [
          {
            name: "线代提纲.md",
            mimeType: "text/markdown",
            sizeBytes: 128,
            contentText: "# 线性代数\n矩阵、向量、行列式"
          }
        ]
      })
    });

    assert.equal(response.status, 201);
    assert.equal(json.length, 1);
    assert.equal(json[0].name, "线代提纲.md");

    const listResult = await requestJson("/api/knowledge/documents");
    assert.equal(listResult.response.status, 200);
    assert.ok(listResult.json.some((item) => item.name === "线代提纲.md"));

    const basesResult = await requestJson("/api/knowledge-bases");
    const baseId = basesResult.json[0].id;
    const retrievalResult = await requestJson(`/api/knowledge-bases/${baseId}/retrieval-test`, {
      method: "POST",
      body: JSON.stringify({
        query: "矩阵和行列式",
        mode: "hybrid",
        topK: 2
      })
    });

    assert.equal(retrievalResult.response.status, 200);
    assert.ok(retrievalResult.json.results.some((item) => item.sourceName === "线代提纲.md"));
  });

  await t.test("chat image attachments are marked for vision messages", async () => {
    clearRuntimeConfig();

    const sessionResult = await requestJson("/api/chat/sessions", {
      method: "POST",
      body: JSON.stringify({ title: "图片识别测试" })
    });

    const uploadResult = await requestJson("/api/chat/attachments", {
      method: "POST",
      body: JSON.stringify({
        sessionId: sessionResult.json.id,
        name: "diagram.png",
        mimeType: "image/png",
        sizeBytes: 32,
        contentText: "data:image/png;base64,iVBORw0KGgo="
      })
    });

    assert.equal(uploadResult.response.status, 201);
    assert.equal(uploadResult.json.isImage, true);
    assert.match(uploadResult.json.contentExcerpt, /图片附件/);
  });

  await t.test("settings save writes runtime config file and current settings can be read back", async () => {
    const payload = {
      provider: "DeepSeek",
      baseUrl: "https://api.example.com/v1",
      apiKey: "sk-test-123456",
      systemPrompt: "你是学习助手",
      modelId: "deepseek-chat"
    };

    const saveResult = await requestJson("/api/models/current", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    assert.equal(saveResult.response.status, 200);
    assert.equal(saveResult.json.settings.baseUrl, payload.baseUrl);
    assert.equal(saveResult.json.settings.modelId, payload.modelId);
    assert.match(saveResult.json.settings.apiKeyMasked, /^sk-/);

    assert.ok(fs.existsSync(configFilePath));
    const persisted = JSON.parse(fs.readFileSync(configFilePath, "utf8"));
    if (process.platform === "win32") {
      assert.ok(persisted.apiKeyProtected);
      assert.equal("apiKey" in persisted, false);
    } else {
      assert.equal(persisted.apiKey, payload.apiKey);
    }

    const currentResult = await requestJson("/api/models/current");
    assert.equal(currentResult.response.status, 200);
    assert.equal(currentResult.json.settings.baseUrl, payload.baseUrl);
    assert.equal(currentResult.json.settings.systemPrompt, payload.systemPrompt);
  });

  await t.test("workspace can initialize after runtime config is saved", async () => {
    const { response, json } = await requestJson("/api/chat/workspace");

    assert.equal(response.status, 200);
    assert.ok(json.activeSessionId);
    assert.ok(json.activeSession);
    assert.equal(json.activeSession.id, json.activeSessionId);
  });

  await t.test("schema validation rejects empty chat messages", async () => {
    clearRuntimeConfig();

    const { response, json } = await requestJson("/api/chat/messages", {
      method: "POST",
      body: JSON.stringify({
        content: "",
        attachmentIds: []
      })
    });

    assert.equal(response.status, 400);
    assert.match(json.message, /消息内容和附件不能同时为空/);
  });
});
