function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInlineMarkdown(text) {
  let html = escapeHtml(String(text || ""));
  html = html.replace(/`([^`]+)`/g, "<code class=\"md-inline-code\">$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>");
  return html;
}

function renderMarkdownBlock(block) {
  if (block.startsWith("```") && block.endsWith("```")) {
    const codeContent = block.replace(/^```[\w-]*\n?/, "").replace(/\n?```$/, "");
    return `<pre class="md-pre"><code>${escapeHtml(codeContent)}</code></pre>`;
  }

  const lines = block.split("\n");

  if (lines.every((line) => /^\s*[-*]\s+/.test(line))) {
    const items = lines
      .map((line) => line.replace(/^\s*[-*]\s+/, "").trim())
      .map((line) => `<li>${renderInlineMarkdown(line)}</li>`)
      .join("");
    return `<ul class="md-list">${items}</ul>`;
  }

  if (lines.every((line) => /^\s*\d+\.\s+/.test(line))) {
    const items = lines
      .map((line) => line.replace(/^\s*\d+\.\s+/, "").trim())
      .map((line) => `<li>${renderInlineMarkdown(line)}</li>`)
      .join("");
    return `<ol class="md-list md-list--ordered">${items}</ol>`;
  }

  if (lines.length === 1 && /^#{1,3}\s+/.test(lines[0])) {
    const level = Math.min((lines[0].match(/^#+/)?.[0].length || 1) + 2, 6);
    const text = lines[0].replace(/^#{1,3}\s+/, "");
    return `<h${level} class="md-heading">${renderInlineMarkdown(text)}</h${level}>`;
  }

  return `<p>${lines.map((line) => renderInlineMarkdown(line)).join("<br>")}</p>`;
}

export function renderMessageContent(content) {
  const source = String(content || "").replace(/\r\n/g, "\n").trim();
  if (!source) {
    return "<p></p>";
  }

  const blocks = source
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
  return blocks.map(renderMarkdownBlock).join("");
}

export function formatMessageTime(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function formatSize(bytes) {
  const size = Number(bytes) || 0;
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("zh-CN");
}

export function shouldReadAsText(file) {
  const binaryExtensions = [".pdf", ".docx", ".doc", ".pptx", ".xlsx"];
  const isBinary =
    binaryExtensions.some((ext) => file.name.toLowerCase().endsWith(ext)) ||
    file.type === "application/pdf" ||
    file.type.includes("wordprocessingml") ||
    file.type.includes("presentationml") ||
    file.type.includes("spreadsheetml");

  if (isBinary) {
    return false;
  }

  const textExtensions = [".md", ".txt", ".json", ".js", ".ts", ".html", ".css", ".csv"];
  return (
    file.type.startsWith("text/") ||
    textExtensions.some((extension) => file.name.toLowerCase().endsWith(extension))
  );
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error(`读取文件失败：${file.name}`));
    reader.readAsText(file, "utf-8");
  });
}

export function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error(`读取文件失败：${file.name}`));
    reader.readAsDataURL(file);
  });
}

export function normalizeBaseUrlDisplay(baseUrl) {
  return String(baseUrl || "").trim().replace(/\/+$/, "");
}

export function inferMessageSource(message, apiConfigured) {
  if (message.role !== "assistant") {
    return "local";
  }

  return apiConfigured ? "api" : "mock";
}

export function getAgentDisplayLetter(agent) {
  const role = String(agent.role || "").toLowerCase();
  if (role.includes("politics")) {
    return "政";
  }
  if (role.includes("coding")) {
    return "码";
  }
  return "学";
}

export function getAgentAccentClass(agent) {
  const role = String(agent.role || "").toLowerCase();
  if (role.includes("politics")) {
    return "market-card__icon--orange";
  }
  if (role.includes("coding")) {
    return "market-card__icon--emerald";
  }
  return "market-card__icon--blue";
}

export function getAgentTitle(agent) {
  const role = String(agent.role || "").toLowerCase();
  if (role.includes("politics")) {
    return "政治知识梳理";
  }
  if (role.includes("coding")) {
    return "编程训练";
  }
  return "综合学习规划";
}

export function getAgentDescription(agent) {
  const role = String(agent.role || "").toLowerCase();
  if (role.includes("politics")) {
    return "适合主观题框架拆解、观点提炼和记忆提纲整理。";
  }
  if (role.includes("coding")) {
    return "适合代码解释、错误定位、练习设计和学习路线规划。";
  }
  return "适合日常问答、知识梳理、计划拆解和学习总结。";
}

export function getAgentSpecialty(agent) {
  const scope = String(agent.knowledgeScope || "").trim();
  if (scope) {
    return `擅长范围：${scope}`;
  }

  const role = String(agent.role || "").toLowerCase();
  if (role.includes("politics")) {
    return "擅长总结答题模板和论述结构。";
  }
  if (role.includes("coding")) {
    return "擅长定位错误原因并给出改写建议。";
  }
  return "擅长把模糊任务拆成清晰步骤。";
}

export function renderCitations(citations) {
  if (!Array.isArray(citations) || !citations.length) {
    return "";
  }

  const items = citations
    .map(
      (c) =>
        `<li class="citation-item">
          <span class="citation-marker">[${escapeHtml(String(c.refId || ""))}]</span>
          <span class="citation-name">${escapeHtml(String(c.sourceName || ""))}</span>
          ${
            c.snippet
              ? `<span class="citation-snippet">${escapeHtml(String(c.snippet).slice(0, 120))}...</span>`
              : ""
          }
        </li>`
    )
    .join("");

  return `<div class="citation-block">
    <div class="citation-title">参考来源</div>
    <ul class="citation-list">${items}</ul>
  </div>`;
}
