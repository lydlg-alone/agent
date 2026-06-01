export const NOTE_FORMAT_ACTIONS = [
  { key: "bold", label: "B", prefix: "**", suffix: "**", hint: "加粗" },
  { key: "italic", label: "I", prefix: "_", suffix: "_", hint: "斜体" },
  { key: "h1", label: "H1", prefix: "# ", suffix: "", hint: "一级标题" },
  { key: "h2", label: "H2", prefix: "## ", suffix: "", hint: "二级标题" },
  { key: "bullet", label: "•", prefix: "- ", suffix: "", hint: "项目符号" },
  { key: "numbered", label: "1.", prefix: "1. ", suffix: "", hint: "编号列表" },
  { key: "quote", label: "\"", prefix: "> ", suffix: "", hint: "引用" },
  { key: "highlight", label: "==", prefix: "==", suffix: "==", hint: "高亮" }
];

export function applyFormatting(text, selectionStart, selectionEnd, actionKey) {
  const action = NOTE_FORMAT_ACTIONS.find((item) => item.key === actionKey);
  if (!action) {
    return {
      value: text,
      selectionStart,
      selectionEnd
    };
  }

  const current = String(text || "");
  const start = Math.max(0, Number(selectionStart) || 0);
  const end = Math.max(start, Number(selectionEnd) || 0);
  const selected = current.slice(start, end);

  const value = `${current.slice(0, start)}${action.prefix}${selected}${action.suffix}${current.slice(end)}`;
  const nextStart = start + action.prefix.length;
  const nextEnd = nextStart + selected.length;

  return {
    value,
    selectionStart: nextStart,
    selectionEnd: nextEnd
  };
}
