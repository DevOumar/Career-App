import React from "react";
// Rendu Markdown léger pour les textes générés par l'IA (énoncés, corrections).
// Construit uniquement des éléments React (aucun HTML injecté) : paragraphes,
// titres, listes, citations, **gras**, *italique*, `code` et blocs ```code```.

function renderInline(text, keyPrefix) {
  const parts = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;
  let last = 0;
  let match;
  let index = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${index++}`;
    if (token.startsWith("`")) parts.push(<code key={key}>{token.slice(1, -1)}</code>);
    else if (token.startsWith("**") || token.startsWith("__")) parts.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    else parts.push(<em key={key}>{token.slice(1, -1)}</em>);
    last = match.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function MarkdownText({ text, className = "" }) {
  const source = String(text || "").replace(/\r\n/g, "\n").trim();
  if (!source) return null;
  const lines = source.split("\n");
  const blocks = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Bloc de code ```langage
    const fence = trimmed.match(/^```\s*([\w+#.-]*)/);
    if (fence) {
      const lang = fence[1];
      const code = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push(
        <div className="md-code" key={key++}>
          {lang ? <span className="md-code-lang">{lang}</span> : null}
          <pre>
            <code>{code.join("\n")}</code>
          </pre>
        </div>
      );
      continue;
    }

    if (!trimmed) {
      i += 1;
      continue;
    }

    const heading = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      const Tag = heading[1].length <= 2 ? "h4" : "h5";
      blocks.push(
        <Tag className="md-heading" key={key++}>
          {renderInline(heading[2], `h${key}`)}
        </Tag>
      );
      i += 1;
      continue;
    }

    // Listes à puces ou numérotées (lignes consécutives)
    if (/^([-*•]|\d+[.)])\s+/.test(trimmed)) {
      const ordered = /^\d+[.)]\s+/.test(trimmed);
      const items = [];
      while (i < lines.length && /^\s*([-*•]|\d+[.)])\s+/.test(lines[i])) {
        items.push(lines[i].trim().replace(/^([-*•]|\d+[.)])\s+/, ""));
        i += 1;
      }
      const ListTag = ordered ? "ol" : "ul";
      blocks.push(
        <ListTag className="md-list" key={key++}>
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item, `l${key}-${itemIndex}`)}</li>
          ))}
        </ListTag>
      );
      continue;
    }

    if (trimmed.startsWith(">")) {
      const quote = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quote.push(lines[i].trim().replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push(
        <blockquote className="md-quote" key={key++}>
          {renderInline(quote.join(" "), `q${key}`)}
        </blockquote>
      );
      continue;
    }

    // Paragraphe : lignes consécutives jusqu'à une ligne vide ou un bloc
    const paragraph = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^```/.test(lines[i].trim()) &&
      !/^(#{1,4})\s+/.test(lines[i].trim()) &&
      !/^([-*•]|\d+[.)])\s+/.test(lines[i].trim()) &&
      !lines[i].trim().startsWith(">")
    ) {
      paragraph.push(lines[i].trim());
      i += 1;
    }
    blocks.push(
      <p className="md-p" key={key++}>
        {paragraph.map((part, partIndex) => (
          <React.Fragment key={partIndex}>
            {partIndex ? <br /> : null}
            {renderInline(part, `p${key}-${partIndex}`)}
          </React.Fragment>
        ))}
      </p>
    );
  }

  return <div className={`md-text ${className}`}>{blocks}</div>;
}
