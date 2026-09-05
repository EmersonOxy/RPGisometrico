export class Tooltip {
  private element = document.createElement("div");
  private timer?: ReturnType<typeof setTimeout>;
  private target?: HTMLElement;
  private abort = new AbortController();
  constructor(
    private root: HTMLElement,
    private content: (key: string) => string,
  ) {
    this.element.className = "game-tooltip";
    this.element.setAttribute("role", "tooltip");
    document.body.append(this.element);
    const opts = { signal: this.abort.signal };
    root.addEventListener(
      "pointerover",
      (e) => {
        const t = (e.target as HTMLElement).closest<HTMLElement>("[data-tip]");
        if (!t || t === this.target) return;
        this.hide();
        this.target = t;
        this.timer = setTimeout(() => {
          if (!t.isConnected) return;
          this.element.innerHTML = this.content(t.dataset.tip!);
          if (!this.element.innerHTML) return;
          this.element.classList.add("visible");
          const r = t.getBoundingClientRect(),
            w = this.element.offsetWidth,
            h = this.element.offsetHeight;
          this.element.style.left =
            Math.max(12, Math.min(window.innerWidth - w - 12, r.right + 14)) +
            "px";
          this.element.style.top =
            Math.max(12, Math.min(window.innerHeight - h - 12, r.top - 10)) +
            "px";
        }, 160);
      },
      opts,
    );
    root.addEventListener(
      "pointerout",
      (e) => {
        if (this.target && !this.target.contains(e.relatedTarget as Node))
          this.hide();
      },
      opts,
    );
    root.addEventListener("pointerdown", () => this.hide(), opts);
  }
  hide() {
    clearTimeout(this.timer);
    this.target = undefined;
    this.element.classList.remove("visible");
  }
  destroy() {
    this.abort.abort();
    this.element.remove();
    clearTimeout(this.timer);
  }
}
