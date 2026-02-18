export function $id(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el;
}

export function setTextSafe(el: HTMLElement, text: string) {
  el.textContent = text;
}
