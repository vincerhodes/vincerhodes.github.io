// Minimal Markdown -> HTML renderer, ported verbatim from the static site's
// assets/js/drill-builder.js (previously inline in components/DrillBuilder.tsx; lifted here in
// Phase 4 so the saved-drills page renders stored plans with the exact same output). No external
// dependencies, and it escapes ALL HTML in the model's output before applying its own tags.
// Covers exactly what the return_session_plan system prompt's OUTPUT FORMAT asks for: headings,
// a timeline table, paragraphs, bullet lists, bold/italic text.
function escapeHtml(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderInline(s: string): string {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

function renderTable(tableLines: string[]): string {
  const rows = tableLines
    .map((l) =>
      l
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((c) => c.trim())
    )
    .filter(
      // Drop a markdown separator row, e.g. | --- | --- |
      (cells) => !cells.every((c) => /^:?-{2,}:?$/.test(c))
    );

  if (rows.length === 0) return "";

  const [head, ...body] = rows;
  const out = ["<table>", "<thead><tr>"];
  head.forEach((c) => {
    out.push(`<th scope="col">${renderInline(c)}</th>`);
  });
  out.push("</tr></thead>", "<tbody>");
  body.forEach((r) => {
    out.push("<tr>");
    r.forEach((c) => {
      out.push(`<td>${renderInline(c)}</td>`);
    });
    out.push("</tr>");
  });
  out.push("</tbody>", "</table>");
  return out.join("");
}

export function renderMarkdown(markdown: string): string {
  const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let i = 0;
  let listOpen = false;

  const closeList = () => {
    if (listOpen) {
      html.push("</ul>");
      listOpen = false;
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      closeList();
      const level = heading[1].length;
      html.push(`<h${level}>${renderInline(heading[2].trim())}</h${level}>`);
      i += 1;
      continue;
    }

    if (/^\s*\|.*\|\s*$/.test(line)) {
      closeList();
      const tableLines: string[] = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        tableLines.push(lines[i]);
        i += 1;
      }
      html.push(renderTable(tableLines));
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      if (!listOpen) {
        html.push("<ul>");
        listOpen = true;
      }
      html.push(`<li>${renderInline(line.replace(/^\s*[-*]\s+/, ""))}</li>`);
      i += 1;
      continue;
    }

    closeList();

    if (line.trim() === "") {
      i += 1;
      continue;
    }

    // Paragraph: collect contiguous non-blank, non-special lines.
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !/^\s*\|.*\|\s*$/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i += 1;
    }
    html.push(`<p>${renderInline(paraLines.join(" "))}</p>`);
  }

  closeList();
  return html.join("\n");
}
