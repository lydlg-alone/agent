function normalizeLines(content) {
  return String(content || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim());
}

export function extractNoteSections(content, fallbackTitle = "未命名笔记") {
  const lines = normalizeLines(content);
  const sections = [];
  let current = {
    title: fallbackTitle,
    items: [],
    paragraphs: []
  };
  let hasExplicitHeading = false;

  function commitCurrent() {
    const hasContent = current.items.length || current.paragraphs.length;
    if (hasContent || !sections.length) {
      sections.push({
        title: current.title || fallbackTitle,
        items: [...current.items],
        paragraphs: [...current.paragraphs]
      });
    }
  }

  for (const line of lines) {
    if (!line) {
      continue;
    }

    const headingMatch = line.match(/^#{1,6}\s+(.+)$/);
    if (headingMatch) {
      if (hasExplicitHeading || current.items.length || current.paragraphs.length) {
        commitCurrent();
      }

      current = {
        title: headingMatch[1].trim(),
        items: [],
        paragraphs: []
      };
      hasExplicitHeading = true;
      continue;
    }

    const bulletMatch = line.match(/^([-*+]|\d+\.)\s+(.+)$/);
    if (bulletMatch) {
      current.items.push(bulletMatch[2].trim());
      continue;
    }

    current.paragraphs.push(line);
  }

  commitCurrent();

  return sections.filter((section) => section.title || section.items.length || section.paragraphs.length);
}

export function buildMindMap(content, fallbackTitle = "未命名笔记") {
  const sections = extractNoteSections(content, fallbackTitle);

  return {
    title: fallbackTitle,
    branches: sections.map((section) => ({
      title: section.title,
      items: section.items.length ? section.items : section.paragraphs.slice(0, 4)
    }))
  };
}

export function buildPresentationSlides(content, fallbackTitle = "未命名笔记") {
  return extractNoteSections(content, fallbackTitle).map((section, index) => ({
    id: `${index}-${section.title}`,
    title: section.title,
    bullets: (section.items.length ? section.items : section.paragraphs)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 5)
  }));
}
