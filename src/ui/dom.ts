/**
 * Tiny element builder. Text is always set via text nodes (never innerHTML), so
 * model output and user input cannot inject markup.
 */
type Child = Node | string | null | undefined | false;
type Attrs = Record<string, string | boolean | undefined>;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: (Child | Child[])[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    el.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    el.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return el;
}

/** Paragraphs from text with blank-line separators; single newlines become line breaks. */
export function paragraphs(text: string): HTMLElement[] {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split('\n');
      const p = h('p');
      lines.forEach((line, i) => {
        if (i > 0) p.append(h('br'));
        p.append(document.createTextNode(line));
      });
      return p;
    });
}
