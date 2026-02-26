const ALLOWED_TAGS = new Set([
  "b", "strong", "i", "em", "u", "s", "strike", "del",
  "a", "br", "p", "div", "span",
  "ol", "ul", "li",
  "blockquote", "pre", "code",
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "target", "rel"]),
  span: new Set(["class", "data-mention-user", "contenteditable"]),
  code: new Set(["class"]),
  pre: new Set(["class"]),
};

/** Returns plain text from HTML (e.g. for notification previews). */
export function stripHtmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent?.trim().replace(/\s+/g, " ") ?? "";
}

/**
 * Simple HTML sanitizer that keeps only safe tags and attributes.
 * For production, use DOMPurify. This is sufficient for a demo.
 */
export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  cleanNode(doc.body);
  return doc.body.innerHTML;
}

function cleanNode(node: Node) {
  const toRemove: Node[] = [];

  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as Element;
      const tag = el.tagName.toLowerCase();

      if (!ALLOWED_TAGS.has(tag)) {
        const fragment = document.createDocumentFragment();
        while (el.firstChild) fragment.appendChild(el.firstChild);
        toRemove.push(el);
        node.insertBefore(fragment, el);
      } else {
        const allowedAttrs = ALLOWED_ATTRS[tag] ?? new Set();
        for (const attr of Array.from(el.attributes)) {
          if (!allowedAttrs.has(attr.name)) {
            el.removeAttribute(attr.name);
          }
        }
        if (tag === "a") {
          el.setAttribute("target", "_blank");
          el.setAttribute("rel", "noopener noreferrer");
        }
      }
    }
    cleanNode(child);
  });

  toRemove.forEach((n) => n.parentNode?.removeChild(n));
}
