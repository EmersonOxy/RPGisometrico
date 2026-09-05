export type CursorStyle = "classic" | "quill" | "rune" | "blade" | "system";

export class CursorManager {
  private currentStyle: CursorStyle = "classic";
  private rootElement: HTMLElement;
  private cursorLayer: HTMLElement;
  private targeting = false;
  private targetValid = true;
  private mouseX = -100;
  private mouseY = -100;
  private visible = true;
  private tracking = new AbortController();

  constructor(rootElement: HTMLElement, style: CursorStyle = "classic") {
    this.rootElement = rootElement;

    // Create custom cursor DOM element
    this.cursorLayer = document.createElement("div");
    this.cursorLayer.id = "custom-cursor";
    this.cursorLayer.className = "custom-cursor-layer";
    this.cursorLayer.style.position = "fixed";
    this.cursorLayer.style.pointerEvents = "none";
    this.cursorLayer.style.zIndex = "999999";
    this.cursorLayer.style.top = "0";
    this.cursorLayer.style.left = "0";
    this.cursorLayer.style.willChange = "transform";
    document.body.appendChild(this.cursorLayer);

    this.setupTracking();
    this.setStyle(style);
  }

  private setupTracking() {
    window.addEventListener(
      "mousemove",
      (e) => {
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
        this.updatePosition();
      },
      { passive: true, signal: this.tracking.signal },
    );

    document.addEventListener("mouseenter", () => {
      this.visible = true;
      this.cursorLayer.style.display =
        this.currentStyle === "system" ? "none" : "block";
    }, { signal: this.tracking.signal });

    document.addEventListener("mouseleave", () => {
      this.visible = false;
      this.cursorLayer.style.display = "none";
    }, { signal: this.tracking.signal });
  }

  private updatePosition() {
    if (!this.visible || this.currentStyle === "system") return;
    const { offsetHotspotX, offsetHotspotY } = this.getHotspot();
    this.cursorLayer.style.transform = `translate3d(${this.mouseX - offsetHotspotX}px, ${this.mouseY - offsetHotspotY}px, 0)`;
  }

  private getHotspot(): { offsetHotspotX: number; offsetHotspotY: number } {
    if (this.targeting) {
      return { offsetHotspotX: 16, offsetHotspotY: 16 };
    }
    switch (this.currentStyle) {
      case "quill":
        return { offsetHotspotX: 2, offsetHotspotY: 2 };
      case "blade":
        return { offsetHotspotX: 3, offsetHotspotY: 3 };
      case "rune":
        return { offsetHotspotX: 14, offsetHotspotY: 14 };
      case "classic":
      default:
        return { offsetHotspotX: 4, offsetHotspotY: 4 };
    }
  }

  setStyle(style: CursorStyle) {
    this.currentStyle = style === "system" ? "classic" : style;
    this.applyCursor();
  }

  getStyle(): CursorStyle {
    return this.currentStyle;
  }

  setTargeting(active: boolean, valid = true) {
    if (this.targeting === active && this.targetValid === valid) return;
    this.targeting = active;
    this.targetValid = valid;
    this.applyCursor();
  }

  private applyCursor() {
    if (this.currentStyle === "system") {
      this.cursorLayer.style.display = "none";
      document.body.classList.remove("custom-cursor-active");
      this.rootElement.style.cursor = this.targeting ? "crosshair" : "default";
      return;
    }

    document.body.classList.add("custom-cursor-active");
    this.cursorLayer.style.display = "block";
    this.cursorLayer.innerHTML = this.generateSvg(
      this.currentStyle,
      this.targeting,
      this.targetValid,
    );
    this.updatePosition();
  }

  private generateSvg(
    style: CursorStyle,
    targeting: boolean,
    valid: boolean,
  ): string {
    const strokeColor = valid ? "#d8c495" : "#e06c58";
    const fillColor = valid ? "#223528" : "#451c18";
    const accentColor = valid ? "#85a67c" : "#cf5544";

    if (targeting) {
      if (style === "rune") {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
          <polygon points="16,3 29,16 16,29 3,16" fill="none" stroke="${strokeColor}" stroke-width="1.8"/>
          <circle cx="16" cy="16" r="6" fill="none" stroke="${accentColor}" stroke-width="1.4"/>
          <circle cx="16" cy="16" r="2.5" fill="${strokeColor}"/>
          <line x1="16" y1="5" x2="16" y2="10" stroke="${strokeColor}" stroke-width="1.5"/>
          <line x1="16" y1="22" x2="16" y2="27" stroke="${strokeColor}" stroke-width="1.5"/>
          <line x1="5" y1="16" x2="10" y2="16" stroke="${strokeColor}" stroke-width="1.5"/>
          <line x1="22" y1="16" x2="27" y2="16" stroke="${strokeColor}" stroke-width="1.5"/>
        </svg>`;
      }
      if (style === "quill") {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="10" fill="none" stroke="${strokeColor}" stroke-width="1.4" stroke-dasharray="3 3"/>
          <path d="M16 4 L16 10 M16 22 L16 28 M4 16 L10 16 M22 16 L28 16" stroke="${strokeColor}" stroke-width="1.6"/>
          <circle cx="16" cy="16" r="2" fill="${accentColor}"/>
        </svg>`;
      }
      if (style === "blade") {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="11" fill="none" stroke="${strokeColor}" stroke-width="1.5"/>
          <polygon points="16,2 19,8 13,8" fill="${strokeColor}"/>
          <polygon points="16,30 19,24 13,24" fill="${strokeColor}"/>
          <polygon points="2,16 8,19 8,13" fill="${strokeColor}"/>
          <polygon points="30,16 24,19 24,13" fill="${strokeColor}"/>
          <circle cx="16" cy="16" r="2" fill="${accentColor}"/>
        </svg>`;
      }
      // Classic targeting
      return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="11" fill="none" stroke="${strokeColor}" stroke-width="1.8"/>
        <line x1="16" y1="1" x2="16" y2="9" stroke="${strokeColor}" stroke-width="2"/>
        <line x1="16" y1="23" x2="16" y2="31" stroke="${strokeColor}" stroke-width="2"/>
        <line x1="1" y1="16" x2="9" y2="16" stroke="${strokeColor}" stroke-width="2"/>
        <line x1="23" y1="16" x2="31" y2="16" stroke="${strokeColor}" stroke-width="2"/>
        <circle cx="16" cy="16" r="3" fill="${accentColor}"/>
      </svg>`;
    }

    // Default pointers
    if (style === "quill") {
      // Elegant calligraphy quill nib with brass accents
      return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
        <path d="M2,2 L10,6 L18,22 L14,24 L6,14 L2,2 Z" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M4,4 L16,20" stroke="${strokeColor}" stroke-width="1"/>
        <path d="M10,6 L14,9 L8,18 L6,14 Z" fill="#3a4d38"/>
        <circle cx="11" cy="11" r="1.5" fill="${strokeColor}"/>
      </svg>`;
    }

    if (style === "rune") {
      // Inscribed stone runic diamond pointer
      return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
        <polygon points="14,2 26,14 14,26 2,14" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1.8"/>
        <polygon points="14,6 22,14 14,22 6,14" fill="#2c3e2e" stroke="${accentColor}" stroke-width="1"/>
        <circle cx="14" cy="14" r="2.5" fill="${strokeColor}"/>
        <line x1="14" y1="2" x2="14" y2="6" stroke="${strokeColor}" stroke-width="1.5"/>
      </svg>`;
    }

    if (style === "blade") {
      // Forged steel dagger point with guard
      return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
        <path d="M3,3 L15,10 L13,16 L19,22 L16,25 L10,19 L4,21 L3,3 Z" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M3,3 L12,12" stroke="#e0d5b0" stroke-width="1.2"/>
        <line x1="11" y1="8" x2="6" y2="13" stroke="${strokeColor}" stroke-width="2"/>
        <polygon points="4,4 12,9 10,13 6,11" fill="#465c49"/>
      </svg>`;
    }

    // Classic: preserved artisan sword/arrow
    return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
      <path d="M4,4 L6,22 L11,16 L17,25 L20,23 L14,14 L22,11 Z" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M7,7 L8,18 L12,14 L17,21 L18,20 L13,13 L19,11 Z" fill="#384f3c"/>
    </svg>`;
  }

  destroy() {
    this.tracking.abort();
    this.cursorLayer.remove();
    document.body.classList.remove("custom-cursor-active");
  }
}
