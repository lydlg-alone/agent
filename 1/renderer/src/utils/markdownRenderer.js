/**
 * Markdown 渲染管线
 * raw text → marked (GFM) → highlight.js (code) → katex (math) → DOMPurify → safe HTML
 *
 * 依赖：marked, highlight.js, katex, dompurify
 * 安装：npm install marked highlight.js katex dompurify
 */
import { marked } from "marked";
import hljs from "highlight.js";
import katex from "katex";
import DOMPurify from "dompurify";

// ============================================================
// KaTeX 预处理 — 在 marked 解析前将 $...$ / $$...$$ 替换为占位符
// 解析完成后再替换回 katex 渲染的 HTML，避免 marked 误解析
// ============================================================

const MATH_PLACEHOLDER_PREFIX = "__KATEX_";
let mathCache = new Map();
let mathCounter = 0;

function resetMathCache() {
  mathCache = new Map();
  mathCounter = 0;
}

function cacheMath(html) {
  const id = `${MATH_PLACEHOLDER_PREFIX}${mathCounter++}__`;
  mathCache.set(id, html);
  return id;
}

/**
 * 预处理：将 LaTeX 公式替换为占位符
 */
function preprocessMath(raw) {
  // 先处理块级 $$...$$（多行），再处理行内 $...$（单行）
  let processed = raw;

  // $$ ... $$ 块级公式
  processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (_match, formula) => {
    try {
      const html = katex.renderToString(formula.trim(), {
        throwOnError: false,
        displayMode: true
      });
      return cacheMath(html);
    } catch {
      return _match; // fallback: keep original
    }
  });

  // $ ... $ 行内公式（不跨行）
  processed = processed.replace(/(?<!\\)\$([^$\n]+?)(?<!\\)\$/g, (_match, formula) => {
    try {
      const html = katex.renderToString(formula.trim(), {
        throwOnError: false,
        displayMode: false
      });
      return cacheMath(html);
    } catch {
      return _match;
    }
  });

  return processed;
}

/**
 * 后处理：将占位符替换回 katex HTML
 */
function postprocessMath(html) {
  let result = html;
  for (const [id, mathHtml] of mathCache) {
    result = result.replace(id, mathHtml);
  }
  return result;
}

// ============================================================
// Marked 配置
// ============================================================

marked.setOptions({
  gfm: true,
  breaks: false,
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value;
      } catch {
        // fall through
      }
    }
    try {
      return hljs.highlightAuto(code).value;
    } catch {
      return code;
    }
  }
});

// ============================================================
// DOMPurify 安全白名单（允许 KaTeX 输出的 SVG/MathML 标签）
// ============================================================

const SANITIZE_CONFIG = {
  ADD_TAGS: [
    "svg", "path", "math", "semantics", "annotation",
    "mrow", "mi", "mo", "mn", "msup", "msub", "mfrac",
    "mspace", "mtable", "mtr", "mtd", "munder", "mover",
    "msqrt", "mroot", "mstyle", "merror", "mpadded",
    "mphantom", "mtext", "menclose"
  ],
  ADD_ATTR: [
    "viewBox", "d", "xmlns", "width", "height", "style",
    "class", "id", "aria-hidden", "display", "overflow",
    "transform", "stroke", "fill", "stroke-width"
  ]
};

// ============================================================
// 公开 API
// ============================================================

/**
 * 渲染 Markdown 文本为安全 HTML
 * @param {string} raw - 原始 Markdown 文本
 * @returns {string} - 安全 HTML 字符串
 */
export function renderMarkdown(raw) {
  if (!raw) {
    return "<p></p>";
  }

  const source = String(raw).replace(/\r\n/g, "\n").trim();
  if (!source) {
    return "<p></p>";
  }

  resetMathCache();

  // 1. 预处理 LaTeX
  const preprocessed = preprocessMath(source);

  // 2. marked 解析 GFM
  let html;
  try {
    html = marked.parse(preprocessed, { gfm: true, breaks: false });
  } catch {
    // 降级：返回转义后的纯文本
    return `<p>${escapeHtml(source)}</p>`;
  }

  // 3. 替换 katex 占位符
  html = postprocessMath(html);

  // 4. DOMPurify 安全过滤
  try {
    html = DOMPurify.sanitize(html, SANITIZE_CONFIG);
  } catch {
    // 降级
    html = `<p>${escapeHtml(source)}</p>`;
  }

  return html;
}

/**
 * 渲染纯文本（仅 escape，无 markdown）
 */
export function renderPlainText(text) {
  return `<p>${escapeHtml(String(text || ""))}</p>`;
}

// ============================================================
// 工具
// ============================================================

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
