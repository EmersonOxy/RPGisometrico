import type { Point, PartyOrder } from "../core/types";
import { icon } from "./Icons";

export type RadialPage = "orders" | "pings";

export interface RadialOption {
  id: string;
  label: string;
  iconName: string;
  description: string;
}

export const ORDER_OPTIONS: RadialOption[] = [
  { id: "follow", label: "Seguir", iconName: "follow", description: "Tropas acompanham seus passos." },
  { id: "hold", label: "Manter", iconName: "hold", description: "Tropas mantêm a posição atual." },
  { id: "focus", label: "Focar", iconName: "focus", description: "Tropas atacam o alvo marcado." },
  { id: "passive", label: "Passivo", iconName: "passive", description: "Tropas não atacam por iniciativa própria." },
  { id: "aggressive", label: "Agressivo", iconName: "aggressive", description: "Tropas atacam ameaças próximas com prioridade." },
  { id: "regroup", label: "Reagrupar", iconName: "regroup", description: "Tropas retornam imediatamente ao líder." },
];

export const PING_OPTIONS: RadialOption[] = [
  { id: "attack-here", label: "Atacar", iconName: "target", description: "Sinaliza ponto prioritário de combate." },
  { id: "move-here", label: "Mover", iconName: "move", description: "Sinaliza destino de movimentação." },
  { id: "defend-here", label: "Defender", iconName: "shield", description: "Sinaliza área a ser resguardada." },
  { id: "danger", label: "Perigo", iconName: "danger", description: "Sinaliza perigo iminente no terreno." },
  { id: "regroup-here", label: "Reunir", iconName: "regroup", description: "Sinaliza ponto de encontro tático." },
  { id: "clear-targets", label: "Limpar", iconName: "close", description: "Limpa todos os alvos da fila." },
  { id: "investigate", label: "Explorar", iconName: "eye", description: "Sinaliza local para investigação." },
  { id: "marker", label: "Marcador", iconName: "marker", description: "Marca ponto no minimapa e bússola." },
];

export class RadialWheel {
  private container: HTMLElement;
  private active = false;
  private page: RadialPage = "orders";
  private origin = { x: 0, y: 0 };
  private hovered = -1;
  private readonly deadzone = 78;
  private readonly radius = 165;
  private onSelect?: (page: RadialPage, optionId: string) => void;
  private troopContext = { total: 0, marked: 0 };
  private boundWheel: (ev: WheelEvent) => void;

  constructor(root: HTMLElement, onSelect: (page: RadialPage, id: string) => void) {
    this.onSelect = onSelect;
    this.container = document.createElement("div");
    this.container.className = "radial-wheel";
    this.container.hidden = true;
    root.appendChild(this.container);

    this.boundWheel = (ev: WheelEvent) => {
      if (this.active) {
        ev.preventDefault();
        ev.stopPropagation();
        this.togglePage();
      }
    };
    window.addEventListener("wheel", this.boundWheel, { passive: false });
  }

  get isActive() { return this.active; }
  get currentPage() { return this.page; }

  open(x: number, y: number, troopInfo?: { total: number; marked: number }) {
    this.active = true;
    this.page = "orders";
    this.hovered = -1;
    this.troopContext = troopInfo ?? { total: 0, marked: 0 };

    // Clamp wheel to keep entire circle safely within screen
    const margin = 200;
    const clampedX = Math.max(margin, Math.min(window.innerWidth - margin, x));
    const clampedY = Math.max(margin, Math.min(window.innerHeight - margin, y));

    this.origin = { x: clampedX, y: clampedY };
    this.container.hidden = false;
    this.container.style.left = clampedX + "px";
    this.container.style.top = clampedY + "px";
    this.render();
  }

  close(): string | null {
    if (!this.active) return null;
    this.active = false;
    this.container.hidden = true;
    const opts = this.currentOptions();
    if (this.hovered >= 0 && this.hovered < opts.length) {
      const id = opts[this.hovered].id;
      this.onSelect?.(this.page, id);
      return id;
    }
    return null;
  }

  cancel() {
    this.active = false;
    this.container.hidden = true;
    this.hovered = -1;
  }

  togglePage() {
    this.page = this.page === "orders" ? "pings" : "orders";
    this.hovered = -1;
    this.render();
  }

  updatePointer(x: number, y: number) {
    if (!this.active) return;
    const dx = x - this.origin.x;
    const dy = y - this.origin.y;
    const dist = Math.hypot(dx, dy);
    if (dist < this.deadzone) {
      if (this.hovered !== -1) {
        this.hovered = -1;
        this.updateSelectionDisplay(-1);
      }
      return;
    }
    const angle = Math.atan2(dy, dx);
    const opts = this.currentOptions();
    const segmentSize = (Math.PI * 2) / opts.length;
    let adjusted = angle + Math.PI / 2;
    if (adjusted < 0) adjusted += Math.PI * 2;
    const idx = Math.floor((adjusted + segmentSize / 2) / segmentSize) % opts.length;
    if (idx !== this.hovered) {
      this.hovered = idx;
      this.updateSelectionDisplay(idx);
    }
  }

  private currentOptions(): RadialOption[] {
    return this.page === "orders" ? ORDER_OPTIONS : PING_OPTIONS;
  }

  private updateSelectionDisplay(idx: number) {
    const items = this.container.querySelectorAll<HTMLElement>(".radial-item");
    items.forEach((el, i) => {
      el.classList.toggle("hovered", i === idx);
    });

    const preview = this.container.querySelector<HTMLElement>(".radial-center-preview");
    if (!preview) return;

    const opts = this.currentOptions();
    if (idx >= 0 && idx < opts.length) {
      const opt = opts[idx];
      preview.innerHTML = `
        <span class="preview-icon">${icon(opt.iconName)}</span>
        <b class="preview-title">${opt.label}</b>
        <p class="preview-desc">${opt.description}</p>
      `;
      preview.classList.add("has-option");
    } else {
      preview.innerHTML = `
        <span class="preview-cancel-icon">${icon("close")}</span>
        <b class="preview-cancel-title">Centro</b>
        <p class="preview-desc">Solte aqui para cancelar</p>
      `;
      preview.classList.remove("has-option");
    }
  }

  private render() {
    const opts = this.currentOptions();
    const isOrders = this.page === "orders";
    const pageLabel = isOrders ? "Ordens de Tropa" : "Sinais Táticos";

    let targetDesc = "";
    if (isOrders) {
      if (this.troopContext.marked > 0) {
        targetDesc = `${this.troopContext.marked} personagem(ns)`;
      } else if (this.troopContext.total > 0) {
        targetDesc = `Todas as tropas (${this.troopContext.total})`;
      } else {
        targetDesc = "Sem aliados subordinados";
      }
    } else {
      targetDesc = "Comunicação no terreno";
    }

    let html = `
      <div class="radial-backdrop"></div>
      <div class="radial-center">
        <div class="radial-center-header">
          <span class="radial-mode-tag">${pageLabel}</span>
          <small class="radial-sub-tag">${targetDesc}</small>
        </div>
        <div class="radial-center-preview">
          <span class="preview-cancel-icon">${icon("close")}</span>
          <b class="preview-cancel-title">Centro</b>
          <p class="preview-desc">Solte aqui para cancelar</p>
        </div>
        <div class="radial-center-footer">
          <kbd>TAB</kbd> ou <kbd>Scroll</kbd> alternar
        </div>
      </div>
    `;

    const segSize = (Math.PI * 2) / opts.length;
    for (let i = 0; i < opts.length; i++) {
      const angle = -Math.PI / 2 + segSize * i;
      const px = Math.cos(angle) * this.radius;
      const py = Math.sin(angle) * this.radius;
      html += `<div class="radial-item${i === this.hovered ? " hovered" : ""}" style="transform:translate(${px}px,${py}px)">
        <span class="radial-icon">${icon(opts[i].iconName)}</span>
        <span class="radial-label">${opts[i].label}</span>
      </div>`;
    }

    // High fidelity dial compass lines and tick rings
    const viewSize = 400;
    const half = viewSize / 2;
    html += `<svg class="radial-lines" viewBox="-${half} -${half} ${viewSize} ${viewSize}">
      <circle cx="0" cy="0" r="${this.radius}" fill="none" stroke="#79816922" stroke-width="2" stroke-dasharray="4 6"/>
      <circle cx="0" cy="0" r="${this.deadzone + 2}" fill="none" stroke="#cbb58044" stroke-width="1.5"/>
    `;
    for (let i = 0; i < opts.length; i++) {
      const angle = -Math.PI / 2 + segSize * i;
      const x1 = Math.cos(angle) * (this.deadzone + 4);
      const y1 = Math.sin(angle) * (this.deadzone + 4);
      const x2 = Math.cos(angle) * (this.radius - 28);
      const y2 = Math.sin(angle) * (this.radius - 28);
      html += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#a89c7040" stroke-width="1.5"/>`;
    }
    html += "</svg>";

    this.container.innerHTML = html;
  }

  destroy() {
    window.removeEventListener("wheel", this.boundWheel);
    this.container.remove();
  }
}
