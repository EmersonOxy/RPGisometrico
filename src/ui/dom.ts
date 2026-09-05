/** Preserve live buttons, focus and pointer capture when only a counter changes. */
export function setHTML(id: string, html: string) {
  const root = document.getElementById(id);
  if (!root) return;
  const template = document.createElement("template");
  template.innerHTML = html;
  sync(root, template.content);
}
function sync(current: Node, next: Node) {
  const desired = Array.from(next.childNodes);
  for (let i = 0; i < desired.length; i++) {
    const src = desired[i],
      old = current.childNodes[i];
    if (!old) {
      current.appendChild(src.cloneNode(true));
      continue;
    }
    if (old.nodeType !== src.nodeType || old.nodeName !== src.nodeName) {
      current.replaceChild(src.cloneNode(true), old);
      continue;
    }
    if (src.nodeType === Node.TEXT_NODE) {
      if (old.textContent !== src.textContent)
        old.textContent = src.textContent;
      continue;
    }
    if (old instanceof Element && src instanceof Element) {
      for (const attr of Array.from(old.attributes))
        if (!src.hasAttribute(attr.name)) old.removeAttribute(attr.name);
      for (const attr of Array.from(src.attributes))
        if (old.getAttribute(attr.name) !== attr.value)
          old.setAttribute(attr.name, attr.value);
    }
    sync(old, src);
  }
  while (current.childNodes.length > desired.length)
    current.lastChild?.remove();
}
