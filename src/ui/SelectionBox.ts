import type { Point } from "../core/types";

export class SelectionBox {
  private container: HTMLElement;
  private active = false;
  private start = { x: 0, y: 0 };
  private end = { x: 0, y: 0 };

  constructor(root: HTMLElement) {
    this.container = document.createElement("div");
    this.container.className = "selection-box";
    this.container.hidden = true;
    root.appendChild(this.container);
  }

  get isActive() { return this.active; }

  begin(x: number, y: number) {
    this.active = true;
    this.start = { x, y };
    this.end = { x, y };
    this.container.hidden = false;
    this.updateRect();
  }

  update(x: number, y: number) {
    if (!this.active) return;
    this.end = { x, y };
    this.updateRect();
  }

  finish(): { left: number; top: number; right: number; bottom: number } | null {
    if (!this.active) return null;
    this.active = false;
    this.container.hidden = true;
    const left = Math.min(this.start.x, this.end.x);
    const top = Math.min(this.start.y, this.end.y);
    const right = Math.max(this.start.x, this.end.x);
    const bottom = Math.max(this.start.y, this.end.y);
    if (right - left < 8 && bottom - top < 8) return null;
    return { left, top, right, bottom };
  }

  cancel() {
    this.active = false;
    this.container.hidden = true;
  }

  private updateRect() {
    const left = Math.min(this.start.x, this.end.x);
    const top = Math.min(this.start.y, this.end.y);
    const w = Math.abs(this.end.x - this.start.x);
    const h = Math.abs(this.end.y - this.start.y);
    this.container.style.left = left + "px";
    this.container.style.top = top + "px";
    this.container.style.width = w + "px";
    this.container.style.height = h + "px";
  }

  destroy() {
    this.container.remove();
  }
}
