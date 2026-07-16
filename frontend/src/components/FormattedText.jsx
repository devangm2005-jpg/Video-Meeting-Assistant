/**
 * Renders the LLM's plain-text numbered-list output (action items, decisions,
 * questions, summaries) as a clean, readable list rather than a raw text
 * blob. Falls back gracefully for any text shape.
 */
export default function FormattedText({ text, accent = "text-rec2" }) {
  if (!text) return null;

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // Group into items: a new item starts at a line beginning with "N." or "- "
  const itemStart = /^(\d+[.)]|[-*•])\s+/;
  const items = [];
  let current = null;

  for (const line of lines) {
    if (itemStart.test(line)) {
      if (current) items.push(current);
      current = [line.replace(itemStart, "")];
    } else if (current) {
      current.push(line);
    } else {
      current = [line];
    }
  }
  if (current) items.push(current);

  if (items.length <= 1) {
    return <p className="text-fog leading-relaxed whitespace-pre-line">{text}</p>;
  }

  return (
    <ol className="space-y-3">
      {items.map((lines, i) => (
        <li key={i} className="flex gap-3 rounded-lg border border-line bg-panel2/60 p-3.5">
          <span className={`font-display text-xl leading-none ${accent} shrink-0 w-7 text-right`}>
            {String(i + 1).padStart(2, "0")}
          </span>
          <div className="space-y-1 text-sm">
            {lines.map((l, j) => {
              const match = l.match(/^(Task|Owner|Deadline|Task description)\s*:\s*(.*)$/i);
              if (match) {
                return (
                  <p key={j} className="text-fog">
                    <span className="text-muted uppercase tracking-wide text-xs mr-1.5">{match[1]}</span>
                    {match[2]}
                  </p>
                );
              }
              return (
                <p key={j} className="text-fog leading-relaxed">
                  {l}
                </p>
              );
            })}
          </div>
        </li>
      ))}
    </ol>
  );
}
