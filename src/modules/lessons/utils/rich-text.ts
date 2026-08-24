const allowedTags = new Set([
  "b",
  "strong",
  "i",
  "em",
  "u",
  "p",
  "br",
  "ul",
  "ol",
  "li",
  "blockquote",
  "h3",
  "span",
  "font",
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
  // The editor supplies hex values. Keeping this deliberately narrow means a
  // lesson author can colour text without being able to inject arbitrary CSS.
  return /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/iu.test(color) ? color.toLowerCase() : null;
}

function safeInlineTextColor(value: string | null) {
  const match = value?.match(/^\s*color\s*:\s*(#[0-9a-f]{3}(?:[0-9a-f]{3})?)\s*;?\s*$/iu);
  return safeTextColor(match?.[1] ?? null);
}

/**
 * Theory is owner-authored but still crosses a database boundary before it is
 * rendered for learners. Keep formatting intentionally small and strip every
 * attribute so that saved HTML cannot execute code or load remote resources.
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
      const fontColor = safeTextColor(child.getAttribute("color"));
      const inlineColor = safeInlineTextColor(child.getAttribute("style"));
      for (const attribute of Array.from(child.attributes)) child.removeAttribute(attribute.name);
      if (tag === "font" && fontColor) child.setAttribute("color", fontColor);
      if (tag === "span" && inlineColor) child.setAttribute("style", `color: ${inlineColor}`);
    }
  };

  visit(document.body);
  return document.body.innerHTML.trim();
}
