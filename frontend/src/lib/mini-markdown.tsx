import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/**
 * Markdown mínimo para las respuestas del agente: **negrita**, [links](/ruta) y listas "- ".
 * Arma nodos de React (sin dangerouslySetInnerHTML), así que no hay riesgo de XSS.
 */
const INLINE = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) return <strong key={key}>{bold[1]}</strong>;

    const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link) {
      const [, label, href] = link;
      if (href.startsWith("/")) return <Link key={key} to={href}>{label}</Link>;
      if (/^https?:\/\//.test(href)) {
        return (
          <a key={key} href={href} target="_blank" rel="noreferrer">
            {label}
          </a>
        );
      }
      return label;
    }
    return part;
  });
}

export function MiniMarkdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];

  const flushList = () => {
    if (list.length) {
      const items = list;
      blocks.push(
        <ul key={`ul-${blocks.length}`}>
          {items.map((item, i) => (
            <li key={i}>{renderInline(item, `li-${blocks.length}-${i}`)}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };

  text.split("\n").forEach((raw) => {
    const line = raw.trim();
    const item = line.match(/^[-*•]\s+(.*)$/);
    if (item) {
      list.push(item[1]);
      return;
    }
    flushList();
    if (line) blocks.push(<p key={`p-${blocks.length}`}>{renderInline(line, `p-${blocks.length}`)}</p>);
  });
  flushList();

  return <>{blocks}</>;
}
