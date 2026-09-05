export interface ViewTransform {
  x: number;
  y: number;
  zoom: number;
}
export class PanZoom {
  private abort = new AbortController();
  private start?: { x: number; y: number; panX: number; panY: number };
  constructor(
    private viewport: HTMLElement,
    public state: ViewTransform,
    private changed: () => void,
    private min = 0.55,
    private max = 1.8,
  ) {
    const opts = { signal: this.abort.signal };
    viewport.addEventListener(
      "pointerdown",
      (e) => {
        if (e.button !== 0 && e.button !== 1) return;
        if ((e.target as HTMLElement).closest("button")) return;
        this.start = {
          x: e.clientX,
          y: e.clientY,
          panX: state.x,
          panY: state.y,
        };
        viewport.setPointerCapture(e.pointerId);
      },
      opts,
    );
    viewport.addEventListener(
      "pointermove",
      (e) => {
        if (!this.start) return;
        state.x = this.start.panX + e.clientX - this.start.x;
        state.y = this.start.panY + e.clientY - this.start.y;
        changed();
      },
      opts,
    );
    viewport.addEventListener(
      "pointerup",
      () => (this.start = undefined),
      opts,
    );
    viewport.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.zoom(Math.exp(-e.deltaY * 0.001));
      },
      { ...opts, passive: false },
    );
  }
  zoom(factor: number) {
    this.state.zoom = Math.max(
      this.min,
      Math.min(this.max, this.state.zoom * factor),
    );
    this.changed();
  }
  home() {
    this.state.x = 0;
    this.state.y = 0;
    this.state.zoom = 1;
    this.changed();
  }
  destroy() {
    this.abort.abort();
  }
}
