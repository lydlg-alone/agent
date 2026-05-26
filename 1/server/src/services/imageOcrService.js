import path from "node:path";
import { fileURLToPath } from "node:url";
import { createWorker } from "tesseract.js";

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(CURRENT_DIR, "..", "..", "..");
const DEFAULT_CACHE_ROOT = process.env.AGENT_DATA_DIR || path.join(PROJECT_ROOT, "data");
const OCR_CACHE_PATH = path.join(DEFAULT_CACHE_ROOT, "ocr-cache");
const OCR_CORE_PATH = path.join(PROJECT_ROOT, "node_modules", "tesseract.js-core");
const OCR_LANG_PATH = process.env.TESSERACT_LANG_PATH ? path.resolve(process.env.TESSERACT_LANG_PATH) : undefined;
const OCR_LANGS = ["chi_sim", "eng"];

let workerPromise = null;

function normalizeOcrText(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeImageDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:image\/[^;]+;base64,(.+)$/i);
  if (!match) {
    return null;
  }

  try {
    const buffer = Buffer.from(match[1], "base64");
    return buffer.length ? buffer : null;
  } catch {
    return null;
  }
}

async function getWorker() {
  if (!workerPromise) {
    const options = {
      corePath: OCR_CORE_PATH,
      cachePath: OCR_CACHE_PATH,
      logger: () => {}
    };

    if (OCR_LANG_PATH) {
      options.langPath = OCR_LANG_PATH;
    }

    workerPromise = createWorker(OCR_LANGS, 1, options);
  }

  return workerPromise;
}

async function resetWorker() {
  if (!workerPromise) {
    return;
  }

  try {
    const worker = await workerPromise;
    await worker.terminate();
  } catch {
    // Ignore worker shutdown errors so OCR failures do not break chat flows.
  } finally {
    workerPromise = null;
  }
}

export async function extractTextFromImageDataUrl(dataUrl) {
  const imageBuffer = decodeImageDataUrl(dataUrl);
  if (!imageBuffer || imageBuffer.length < 128) {
    return "";
  }

  try {
    const worker = await getWorker();
    const result = await worker.recognize(imageBuffer);
    return normalizeOcrText(result?.data?.text);
  } catch (error) {
    console.error("Failed to OCR image attachment:", error.message);
    await resetWorker();
    return "";
  }
}

export async function shutdownOcrWorker() {
  await resetWorker();
}
