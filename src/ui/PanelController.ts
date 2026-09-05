export type PanelId =
  | "inventory"
  | "skills"
  | "map"
  | "shop"
  | "settings"
  | "pause"
  | "new"
  | "over";

const floatingPanels: ReadonlySet<PanelId> = new Set();

export class PanelController {
  stack: PanelId[] = [];
  private priorFocus?: HTMLElement;
  private abort = new AbortController();
  constructor(
    private root: HTMLElement,
    private onChange: () => void,
  ) {
    root.addEventListener(
      "pointerdown",
      (e) => {
        if ((e.target as HTMLElement).classList.contains("panel-shade")) {
          e.preventDefault();
          e.stopPropagation();
          this.close();
        }
      },
      { signal: this.abort.signal },
    );
    window.addEventListener(
      "keydown",
      (e) => {
        if (!this.top || e.code !== "Tab") return;
        const focusable = Array.from(
          root.querySelectorAll<HTMLElement>(
            '.panel-frame button:not(:disabled),.panel-frame input,.panel-frame select,.panel-frame [tabindex="0"]',
          ),
        ).filter((x) => x.getClientRects().length);
        const first = focusable[0],
          last = focusable.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      },
      { signal: this.abort.signal },
    );
  }
  get top() {
    return this.stack.at(-1);
  }
  isFloating(id?: PanelId): boolean {
    const target = id ?? this.top;
    return target ? floatingPanels.has(target) : false;
  }
  open(id: PanelId) {
    if (!this.top) this.priorFocus = document.activeElement as HTMLElement;
    if (id === "settings" && this.top) this.stack.push(id);
    else this.stack = [id];
    this.onChange();
    if (!this.isFloating(id)) {
      queueMicrotask(() =>
        this.root
          .querySelector<HTMLElement>(".panel-frame button,.panel-frame input")
          ?.focus(),
      );
    }
  }
  toggle(id: PanelId) {
    if (this.top === id) this.close();
    else this.open(id);
  }
  close() {
    if (this.top === "over") return;
    this.stack.pop();
    this.onChange();
    if (!this.top) this.priorFocus?.focus();
  }
  reset() {
    this.stack = [];
    this.onChange();
  }
  destroy() {
    this.abort.abort();
  }
}
