import mammoth from "mammoth";
import pdfParse from "pdf-parse";

export function isBinaryDocument(fileName, mimeType) {
  const ext = String(fileName || "").toLowerCase().split(".").pop() || "";
  if (["pdf", "docx"].includes(ext)) {
    return true;
  }
  if (String(mimeType || "").includes("pdf")) {
    return true;
  }
  if (String(mimeType || "").includes("wordprocessingml")) {
    return true;
  }
  return false;
}

export function detectDocumentType(fileName, mimeType) {
  const ext = String(fileName || "").toLowerCase().split(".").pop() || "";
  if (ext === "pdf" || String(mimeType || "").includes("pdf")) {
    return "pdf";
  }
  if (ext === "docx" || String(mimeType || "").includes("wordprocessingml")) {
    return "docx";
  }
  if (["md", "txt", "json", "js", "ts", "html", "css", "csv"].includes(ext)) {
    return "text";
  }
  if (String(mimeType || "").startsWith("text/")) {
    return "text";
  }
  return "unknown";
}

async function parsePdf(buffer) {
  const data = await pdfParse(buffer);
  return String(data.text || "").replace(/\r\n/g, "\n").trim();
}

async function parseDocx(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return String(result.value || "").replace(/\r\n/g, "\n").trim();
}

export async function parseDocumentBuffer(fileName, mimeType, buffer) {
  const docType = detectDocumentType(fileName, mimeType);

  if (docType === "pdf") {
    return parsePdf(buffer);
  }

  if (docType === "docx") {
    return parseDocx(buffer);
  }

  return buffer.toString("utf-8").replace(/\r\n/g, "\n").trim();
}

export async function parseDocumentFromUpload(fileName, mimeType, contentText) {
  const text = String(contentText || "").trim();
  if (!text) {
    return "";
  }

  const dataUrlPattern = /^data:[^;]*;base64,/i;
  if (dataUrlPattern.test(text)) {
    const base64 = text.split(",")[1] || "";
    const buffer = Buffer.from(base64, "base64");
    return parseDocumentBuffer(fileName, mimeType, buffer);
  }

  return text;
}
