export interface ViewTransform {
  x: number;
  y: number;
  zoom: number;
}
export class PanZoom {
  private abort = new AbortController();
  private start?: { x: number; y: number; panX: number; panY: number };
  private dragged = false;
  constructor(
    private viewport: HTMLElement,
    public state: ViewTransform,
    private changed: () => void,
    private min = 0.55,
    private max = 1.8,
    private threshold = 6,
  ) {
    const opts = { signal: this.abort.signal };
    viewport.addEventListener(
      "pointerdown",
      (e) => {
        if (e.button !== 0 && e.button !== 1) return;
        if ((e.target as HTMLElement).closest("button,input,select,textarea,a")) return;
        this.start = {
          x: e.clientX,
          y: e.clientY,
          panX: state.x,
          panY: state.y,
        };
        this.dragged = false;
        viewport.classList.remove("panning");
        try {
          viewport.setPointerCapture(e.pointerId);
        } catch {
          // captura indisponível: o pan segue pelo pointermove na janela
        }
        // Evita seleção de texto/drag nativo desde o primeiro pixel.
        e.preventDefault();
      },
      opts,
    );
    viewport.addEventListener(
      "pointermove",
      (e) => {
        if (!this.start) return;
        const dx = e.clientX - this.start.x, dy = e.clientY - this.start.y;
        if (!this.dragged && Math.hypot(dx, dy) >= this.threshold) {
          this.dragged = true;
          viewport.classList.add("panning");
        }
        if (!this.dragged) return;
        state.x = this.start.panX + dx;
        state.y = this.start.panY + dy;
        changed();
      },
      opts,
    );
    const finish = () => {
      this.start = undefined;
      viewport.classList.remove("panning");
      // O clique do gesto chega de forma síncrona logo depois; se não vier
      // nenhum, a bandeira se limpa sozinha para não engolir o próximo clique.
      if (this.dragged) setTimeout(() => (this.dragged = false), 0);
    };
    viewport.addEventListener("pointerup", finish, opts);
    viewport.addEventListener("pointercancel", finish, opts);
    // Suprime o clique fantasma quando um arraste terminou sobre um nó.
    viewport.addEventListener(
      "click",
      (e) => {
        if (!this.dragged) return;
        this.dragged = false;
        e.stopPropagation();
        e.preventDefault();
      },
      { ...opts, capture: true },
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
