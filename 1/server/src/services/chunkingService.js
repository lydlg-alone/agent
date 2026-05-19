function splitSentences(text) {
  return text
    .split(/(?<=[。！？.!?\n])\s*/)
    .filter((s) => s.trim());
}

export function chunkText(text, { chunkSize = 500, overlap = 100 } = {}) {
  const source = String(text || "").replace(/\r\n/g, "\n").trim();
  if (!source) {
    return [];
  }

  const paragraphs = source
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks = [];
  let current = "";
  let carry = "";

  for (const paragraph of paragraphs) {
    if (paragraph.length > chunkSize) {
      if (current) {
        chunks.push(current.trim());
        current = "";
      }

      const sentences = splitSentences(paragraph);
      let sentenceChunk = "";
      for (const sentence of sentences) {
        if ((sentenceChunk + sentence).length > chunkSize && sentenceChunk) {
          chunks.push(sentenceChunk.trim());
          sentenceChunk = "";
        }
        sentenceChunk += sentence;
      }
      if (sentenceChunk.trim()) {
        chunks.push(sentenceChunk.trim());
      }
      continue;
    }

    if (current && (current + "\n" + paragraph).length > chunkSize) {
      chunks.push(current.trim());
      const overlapStart = Math.max(0, current.length - overlap);
      carry = current.slice(overlapStart);
      current = carry ? carry + "\n" + paragraph : paragraph;
    } else {
      current = current ? current + "\n" + paragraph : paragraph;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.map((content, index) => ({
    index,
    content
  }));
}
