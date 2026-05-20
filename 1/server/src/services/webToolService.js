import axios from "axios";

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AgentLearningWorkspace/1.0"
};

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripHtml(html) {
  return decodeHtmlEntities(
    String(html || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<header[\s\S]*?<\/header>/gi, " ")
      .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
      .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function extractTitle(html, fallbackUrl) {
  const title = String(html || "").match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const cleanTitle = stripHtml(title || "");
  if (cleanTitle) {
    return cleanTitle.slice(0, 180);
  }

  try {
    return new URL(fallbackUrl).hostname;
  } catch {
    return "网页资料";
  }
}

function normalizeUrl(url) {
  const parsed = new URL(String(url || "").trim());
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("仅支持导入 http 或 https 网页。");
  }
  return parsed.toString();
}

function extractDuckDuckGoUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    const uddg = parsed.searchParams.get("uddg");
    return uddg ? decodeURIComponent(uddg) : rawUrl;
  } catch {
    return rawUrl;
  }
}

export async function fetchUrlContent(url) {
  const normalizedUrl = normalizeUrl(url);
  const response = await axios.get(normalizedUrl, {
    headers: DEFAULT_HEADERS,
    timeout: 15000,
    maxContentLength: 5 * 1024 * 1024,
    responseType: "text",
    transformResponse: [(data) => data]
  });

  const contentType = String(response.headers?.["content-type"] || "");
  const raw = String(response.data || "");
  const text = contentType.includes("html") ? stripHtml(raw) : raw.replace(/\s+/g, " ").trim();

  if (!text) {
    throw new Error("网页没有可提取的文本内容。");
  }

  return {
    url: normalizedUrl,
    title: extractTitle(raw, normalizedUrl),
    mimeType: contentType.split(";")[0] || "text/html",
    text: text.slice(0, 120000)
  };
}

export async function searchWeb(query, { topK = 5 } = {}) {
  const keyword = String(query || "").trim();
  if (!keyword) {
    return [];
  }

  const searchUrl = `https://duckduckgo.com/html/?${new URLSearchParams({ q: keyword }).toString()}`;
  const response = await axios.get(searchUrl, {
    headers: DEFAULT_HEADERS,
    timeout: 12000,
    responseType: "text",
    transformResponse: [(data) => data]
  });

  const html = String(response.data || "");
  const results = [];
  const resultPattern = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
  let match = resultPattern.exec(html);

  while (match && results.length < topK) {
    const url = extractDuckDuckGoUrl(decodeHtmlEntities(match[1]));
    results.push({
      title: stripHtml(match[2]),
      url,
      snippet: stripHtml(match[3]).slice(0, 260)
    });
    match = resultPattern.exec(html);
  }

  if (results.length) {
    return results;
  }

  const linkPattern = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  match = linkPattern.exec(html);
  while (match && results.length < topK) {
    const title = stripHtml(match[2]);
    const url = extractDuckDuckGoUrl(decodeHtmlEntities(match[1]));
    if (title && /^https?:\/\//.test(url)) {
      results.push({ title, url, snippet: "" });
    }
    match = linkPattern.exec(html);
  }

  return results;
}

export function buildWebSearchPrompt(results) {
  if (!Array.isArray(results) || !results.length) {
    return "";
  }

  return [
    "以下是实时网页搜索结果，请结合可信来源回答，并在需要时标注网页标题：",
    ...results.map((item, index) => `[WEB:${index + 1}] ${item.title}\n${item.url}\n${item.snippet || "无摘要"}`)
  ].join("\n\n");
}
