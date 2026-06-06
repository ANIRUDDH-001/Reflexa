/**
 * Escapes a string for safe insertion into HTML as text content.
 * Use this whenever setting innerHTML with user-controlled or AI-controlled text
 * that should render as plain text (not as HTML markup).
 *
 * IMPORTANT: & must be replaced first to avoid double-encoding.
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitises HTML to a safe subset for display.
 * Use ONLY for traceData fields that intentionally contain <p><b><br> markup.
 * All other tags, attributes, and event handlers are stripped.
 *
 * This is a lightweight allowlist sanitiser — no external dependency required.
 */
export function sanitiseHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  const html = String(value);

  // Create a temporary element, set its innerHTML, then extract only safe content
  // This runs in the browser where DOMParser is available
  const template = document.createElement('template');
  template.innerHTML = html;

  // Walk the DOM tree and remove disallowed elements and attributes
  const allowedTags = new Set([
    'p',
    'b',
    'br',
    'span',
    'strong',
    'em',
    'div',
    'ul',
    'ol',
    'li',
    'code',
    'pre',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'a',
    'blockquote',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'hr',
    'img',
    'small',
    'sub',
    'sup',
  ]);
  const allowedAttrs = new Set(['class', 'href', 'target', 'rel', 'src', 'alt']);
  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT);

  const toRemove: Element[] = [];
  let node = walker.nextNode() as Element | null;
  while (node) {
    if (!allowedTags.has(node.tagName.toLowerCase())) {
      toRemove.push(node);
    } else {
      // Remove disallowed attributes from allowed tags
      Array.from(node.attributes).forEach((attr) => {
        const attrName = attr.name.toLowerCase();
        // Exception: allow style on syntax highlighting elements (as expected by Pass 3 logic)
        if (attrName === 'style' && ['code', 'pre', 'span'].includes(node!.tagName.toLowerCase())) {
          return;
        }
        if (!allowedAttrs.has(attrName)) {
          node!.removeAttribute(attr.name);
        }
      });
    }
    node = walker.nextNode() as Element | null;
  }

  // Replace disallowed elements with their text content
  toRemove.forEach((el) => {
    const text = document.createTextNode(el.textContent ?? '');
    el.replaceWith(text);
  });

  // ── Pass 2: Strip javascript: protocol from href and src ──────────────
  const linkedElements = Array.from(
    template.content.querySelectorAll<HTMLElement>('[href], [src]'),
  );
  for (const el of linkedElements) {
    const href = el.getAttribute('href');
    if (href && /^\s*javascript:/i.test(href.trim())) {
      el.removeAttribute('href');
    }
    const src = el.getAttribute('src');
    if (src && /^\s*javascript:/i.test(src.trim())) {
      el.removeAttribute('src');
    }
    // Also strip data: URIs from src (can embed malicious content)
    if (src && /^\s*data:/i.test(src.trim())) {
      el.removeAttribute('src');
    }
  }

  // ── Pass 3: Strip style attribute from non-preformatted elements ──────
  // Allow style only on <code>, <pre>, <span> (for syntax highlighting)
  const styledElements = Array.from(template.content.querySelectorAll<HTMLElement>('[style]'));
  for (const el of styledElements) {
    const tag = el.tagName.toLowerCase();
    if (!['code', 'pre', 'span'].includes(tag)) {
      el.removeAttribute('style');
    }
  }

  // ── Pass 4: Force safe attributes on all outbound links ───────────────
  const outboundLinks = Array.from(template.content.querySelectorAll<HTMLAnchorElement>('a[href]'));
  for (const link of outboundLinks) {
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
  }

  return template.innerHTML;
}
