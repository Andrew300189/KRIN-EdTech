const allowedTags = new Set([
  "b",
  "strong",
  "i",
  "em",
  "u",
  "s",
  "strike",
  "del",
  "mark",
  "small",
  "sub",
  "sup",
  "p",
  "div",
  "br",
  "ul",
  "ol",
  "li",
  "blockquote",
  "pre",
  "code",
  "hr",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "span",
  "font",
  "a",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "caption",
]);

const dropWithContents = new Set(["script", "style", "iframe", "object", "embed", "link", "meta"]);

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeTextColor(value: string | null) {
  const color = value?.trim() ?? "";
  // Word and Google Docs usually paste colours as hex or rgb(). Named colours
  // are also harmless CSS values; URLs and arbitrary CSS functions are not.
  return /^(?:#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%deg]+\)|transparent|currentcolor|[a-z]{3,20})$/iu.test(color)
    ? color.toLowerCase()
    : null;
}

function safeLength(value: string | null, { allowAuto = false, allowNegative = false }: { allowAuto?: boolean; allowNegative?: boolean } = {}) {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (allowAuto && normalized === "auto") return normalized;
  const sign = allowNegative ? "-?" : "";
  return new RegExp(`^${sign}(?:\\d+|\\d*\\.\\d+)(?:px|pt|pc|em|rem|ex|ch|vh|vw|vmin|vmax|%)?$`, "u").test(normalized)
    ? normalized
    : null;
}

function safeFontFamily(value: string | null) {
  const normalized = value?.trim() ?? "";
  return /^[a-z0-9 ,"'_-]{1,160}$/iu.test(normalized) ? normalized : null;
}

function safeTextAlign(value: string | null) {
  const normalized = value?.trim().toLowerCase() ?? "";
  return /^(?:left|right|center|justify|start|end)$/u.test(normalized) ? normalized : null;
}

function safeHref(value: string | null) {
  const href = value?.trim() ?? "";
  if (!href) return null;
  // Preserve safe in-app anchors and paths without accidentally allowing an
  // executable URL scheme through pasted document markup.
  if (/^(?:\/|#|\?|\.\.?\/)/u.test(href)) return href;
  try {
    const parsed = new URL(href);
    return /^(?:https:|http:|mailto:)$/u.test(parsed.protocol) ? href : null;
  } catch {
    return null;
  }
}

function safeStyle(element: Element) {
  const read = (property: string) => element.getAttribute("style")
    ? (element as HTMLElement).style.getPropertyValue(property)
    : "";
  const styles: string[] = [];
  const add = (property: string, value: string | null) => { if (value) styles.push(`${property}: ${value}`); };

  add("color", safeTextColor(read("color") || element.getAttribute("color")));
  add("background-color", safeTextColor(read("background-color") || element.getAttribute("bgcolor")));
  add("text-align", safeTextAlign(read("text-align") || element.getAttribute("align")));
  add("font-family", safeFontFamily(read("font-family") || element.getAttribute("face")));
  add("font-size", safeLength(read("font-size") || element.getAttribute("size")));
  add("line-height", safeLength(read("line-height")) || (/^(?:normal|[\d.]+)$/u.test(read("line-height").trim()) ? read("line-height").trim() : null));
  add("letter-spacing", read("letter-spacing").trim() === "normal" ? "normal" : safeLength(read("letter-spacing"), { allowNegative: true }));
  add("word-spacing", read("word-spacing").trim() === "normal" ? "normal" : safeLength(read("word-spacing"), { allowNegative: true }));
  add("text-indent", safeLength(read("text-indent"), { allowNegative: true }));
  add("margin-top", safeLength(read("margin-top"), { allowAuto: true, allowNegative: true }));
  add("margin-bottom", safeLength(read("margin-bottom"), { allowAuto: true, allowNegative: true }));
  add("margin-left", safeLength(read("margin-left"), { allowAuto: true, allowNegative: true }));
  add("padding-left", safeLength(read("padding-left")));
  add("padding-right", safeLength(read("padding-right")));
  add("vertical-align", /^(?:baseline|sub|super|top|middle|bottom|text-top|text-bottom)$/u.test(read("vertical-align").trim()) ? read("vertical-align").trim() : null);

  const weight = read("font-weight").trim().toLowerCase();
  add("font-weight", /^(?:normal|bold|bolder|lighter|[1-9]00)$/u.test(weight) ? weight : null);
  const fontStyle = read("font-style").trim().toLowerCase();
  add("font-style", /^(?:normal|italic|oblique)$/u.test(fontStyle) ? fontStyle : null);
  const decoration = read("text-decoration").trim().toLowerCase();
  add("text-decoration", /^(?:none|underline|line-through|underline line-through|line-through underline)$/u.test(decoration) ? decoration : null);

  const width = safeLength(read("width"), { allowAuto: true });
  add("width", width);
  if (element.tagName.toLowerCase() === "table") {
    add("border-collapse", /^(?:collapse|separate)$/u.test(read("border-collapse").trim()) ? read("border-collapse").trim() : null);
    add("border-spacing", safeLength(read("border-spacing")));
  }

  return styles.join("; ");
}

function safeSpan(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 50 ? String(parsed) : null;
}

/**
 * Theory is owner-authored but still crosses a database boundary before it is
 * rendered for learners. Preserve useful document formatting from Word/Docs,
 * while stripping executable markup, URLs and arbitrary CSS.
 */
export function sanitizeLessonRichText(value: string | null | undefined) {
  const source = value?.trim() ?? "";
  if (!source) return "";
  if (typeof DOMParser === "undefined") return escapeHtml(source).replace(/\r?\n/g, "<br>");

  const document = new DOMParser().parseFromString(source, "text/html");
  const visit = (parent: Element) => {
    for (const child of Array.from(parent.children)) {
      const tag = child.tagName.toLowerCase();
      if (dropWithContents.has(tag)) {
        child.remove();
        continue;
      }
      visit(child);
      if (!allowedTags.has(tag)) {
        child.replaceWith(...Array.from(child.childNodes));
        continue;
      }
      const style = safeStyle(child);
      const href = tag === "a" ? safeHref(child.getAttribute("href")) : null;
      const colSpan = tag === "td" || tag === "th" ? safeSpan(child.getAttribute("colspan")) : null;
      const rowSpan = tag === "td" || tag === "th" ? safeSpan(child.getAttribute("rowspan")) : null;
      const listStart = tag === "ol" ? safeSpan(child.getAttribute("start")) : null;
      for (const attribute of Array.from(child.attributes)) child.removeAttribute(attribute.name);
      if (style) child.setAttribute("style", style);
      if (href) {
        child.setAttribute("href", href);
        if (/^(?:https?:|mailto:)/iu.test(href)) {
          child.setAttribute("target", "_blank");
          child.setAttribute("rel", "noreferrer noopener");
        }
      }
      if (colSpan) child.setAttribute("colspan", colSpan);
      if (rowSpan) child.setAttribute("rowspan", rowSpan);
      if (listStart) child.setAttribute("start", listStart);
    }
  };

  visit(document.body);
  return document.body.innerHTML.trim();
}
