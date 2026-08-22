import { memo } from "react";

/**
 * Minimal Markdown renderer supporting the subset used by motivational
 * guides: H1/H2/H3 headings (#, ##, ###), paragraphs, and plain text.
 * Inline markdown (bold/italic/links) is intentionally not parsed — the
 * guides are authored as plain prose with a few structural headings.
 *
 * Keeps the surrounding SoftCard spacing unchanged: each block is a child
 * of the same `space-y-4` container the old `<p>` list used.
 */

type Block =
  | { kind: "h1"; text: string }
  | { kind: "h2"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "p"; text: string };

function parseMarkdown(markdown: string): Block[] {
  const blocks: Block[] = [];

  // Split on one-or-more blank lines.
  const paragraphs = markdown
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  for (const paragraph of paragraphs) {
    // A paragraph may itself span multiple lines; collapse internal
    // single newlines into spaces for flowing text, but preserve the
    // leading heading marker if present.
    const headingMatch = /^(#{1,3})\s+(.*)$/s.exec(paragraph);

    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2].replace(/\n/g, " ").trim();
      if (level === 1) blocks.push({ kind: "h1", text });
      else if (level === 2) blocks.push({ kind: "h2", text });
      else blocks.push({ kind: "h3", text });
    } else {
      blocks.push({ kind: "p", text: paragraph.replace(/\n/g, " ") });
    }
  }

  return blocks;
}

export const MarkdownContent = memo(function MarkdownContent({
  content,
}: {
  content: string;
}) {
  const blocks = parseMarkdown(content);

  return (
    <>
      {blocks.map((block, i) => {
        switch (block.kind) {
          case "h1":
            return (
              <h2
                key={i}
                className="text-2xl font-semibold leading-tight tracking-tight text-foreground"
              >
                {block.text}
              </h2>
            );
          case "h2":
            return (
              <h3
                key={i}
                className="text-xl font-semibold leading-snug tracking-tight text-foreground"
              >
                {block.text}
              </h3>
            );
          case "h3":
            return (
              <h4
                key={i}
                className="text-lg font-semibold leading-snug tracking-tight text-foreground"
              >
                {block.text}
              </h4>
            );
          default:
            return (
              <p key={i} className="text-[1.0625rem] leading-8 text-foreground/90">
                {block.text}
              </p>
            );
        }
      })}
    </>
  );
});
