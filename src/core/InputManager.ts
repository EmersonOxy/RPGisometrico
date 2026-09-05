export type InputAction =
  | "MOVE_UP"
  | "MOVE_DOWN"
  | "MOVE_LEFT"
  | "MOVE_RIGHT"
  | "ABILITY_1"
  | "ABILITY_2"
  | "ABILITY_3"
  | "ABILITY_4"
  | "SECONDARY_ABILITY"
  | "PARTY_1"
  | "PARTY_2"
  | "PARTY_3"
  | "PARTY_4"
  | "CYCLE_PARTY"
  | "INVENTORY"
  | "SKILLS"
  | "MAP"
  | "TACTICAL"
  | "HIGHLIGHT_CHARACTER"
  | "SHOW_LOOT"
  | "PAUSE_MENU";

export type InputContext =
  | "GAMEPLAY"
  | "TARGETING"
  | "RADIAL_ORDERS"
  | "RADIAL_PINGS"
  | "SELECTION_BOX"
  | "INVENTORY"
  | "SKILLS"
  | "MAP"
  | "MENU";

export const ACTION_NAMES: Record<InputAction, string> = {
  MOVE_UP: "Mover Cima",
  MOVE_DOWN: "Mover Baixo",
  MOVE_LEFT: "Mover Esquerda",
  MOVE_RIGHT: "Mover Direita",
  ABILITY_1: "Habilidade 1",
  ABILITY_2: "Habilidade 2",
  ABILITY_3: "Habilidade 3",
  ABILITY_4: "Habilidade 4",
  SECONDARY_ABILITY: "Ataque básico",
  PARTY_1: "Membro 1",
  PARTY_2: "Membro 2",
  PARTY_3: "Membro 3",
  PARTY_4: "Membro 4",
  CYCLE_PARTY: "Ciclar Grupo",
  INVENTORY: "Mochila / Inventário",
  SKILLS: "Árvore de Habilidades",
  MAP: "Atlas / Mapa",
  TACTICAL: "Modo Tático",
  HIGHLIGHT_CHARACTER: "Destacar Personagem",
  SHOW_LOOT: "Exibir Rótulos de Loot",
  PAUSE_MENU: "Pausar / Menu",
};

export const DEFAULT_KEYBINDINGS: Record<InputAction, string> = {
  MOVE_UP: "KeyW",
  MOVE_DOWN: "KeyS",
  MOVE_LEFT: "KeyA",
  MOVE_RIGHT: "KeyD",
  ABILITY_1: "KeyQ",
  ABILITY_2: "KeyW",
  ABILITY_3: "KeyE",
  ABILITY_4: "KeyR",
  SECONDARY_ABILITY: "Mouse2",
  PARTY_1: "Digit1",
  PARTY_2: "Digit2",
  PARTY_3: "Digit3",
  PARTY_4: "Digit4",
  CYCLE_PARTY: "Tab",
  INVENTORY: "KeyI",
  SKILLS: "KeyK",
  MAP: "KeyM",
  TACTICAL: "KeyT",
  HIGHLIGHT_CHARACTER: "AltLeft",
  SHOW_LOOT: "KeyL",
  PAUSE_MENU: "Escape",
};

export function formatKeyBinding(code: string | undefined): string {
  if (!code) return "—";
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code === "Space") return "Espaço";
  if (code === "Tab") return "Tab";
  if (code === "Escape") return "Esc";
  if (code === "AltLeft" || code === "AltRight") return "Alt";
  if (code === "ControlLeft" || code === "ControlRight") return "Ctrl";
  if (code === "ShiftLeft" || code === "ShiftRight") return "Shift";
  if (code === "Mouse0" || code === "Button0") return "Mouse 1";
  if (code === "Mouse1" || code === "Button1") return "Mouse 3";
  if (code === "Mouse2" || code === "Button2") return "Mouse 2";
  return code;
}

export const bindingLabel = (settings: {keybindings?: Partial<Record<InputAction,string>>}, action: InputAction) => formatKeyBinding(settings.keybindings?.[action] ?? DEFAULT_KEYBINDINGS[action]);
export const MOUSE_ACTIONS = {move:0, basic:2, target:1} as const;

export class InputManager {
  movementMode: "click" | "wasd" = "click";
  private bindings: Record<InputAction, string>;
  private pressedCodes = new Set<string>();
  private context: InputContext = "GAMEPLAY";
  private actionListeners: Array<(action: InputAction, down: boolean, ev: KeyboardEvent) => void> = [];

  constructor(initialBindings?: Partial<Record<InputAction, string>>) {
    this.bindings = { ...DEFAULT_KEYBINDINGS, ...initialBindings };
    this.setupListeners();
  }

  setContext(ctx: InputContext) {
    this.context = ctx;
  }

  getContext(): InputContext {
    return this.context;
  }

  getBindings(): Record<InputAction, string> {
    return { ...this.bindings };
  }

  getBinding(action: InputAction): string {
    return this.bindings[action] ?? "";
  }

  getFormattedBinding(action: InputAction): string {
    return formatKeyBinding(this.getBinding(action));
  }

  setBinding(action: InputAction, code: string) {
    this.bindings[action] = code;
  }

  resetBindings() {
    this.bindings = { ...DEFAULT_KEYBINDINGS };
    if (this.movementMode === "wasd") {
      ["KeyZ", "KeyX", "KeyC", "KeyV"].forEach((code, i) => this.setBinding(`ABILITY_${i+1}` as InputAction, code));
    }
  }

  findConflict(action: InputAction, code: string): InputAction | null {
    for (const [act, boundCode] of Object.entries(this.bindings)) {
      if (act.startsWith("MOVE_") && this.movementMode !== "wasd" && !action.startsWith("MOVE_")) continue;
      if (act !== action && boundCode === code) {
        return act as InputAction;
      }
    }
    return null;
  }

  isActionDown(action: InputAction): boolean {
    const code = this.bindings[action];
    if (!code) return false;
    if (code === "AltLeft" && (this.pressedCodes.has("AltLeft") || this.pressedCodes.has("AltRight"))) {
      return true;
    }
    return this.pressedCodes.has(code);
  }

  isCodeDown(code: string): boolean {
    return this.pressedCodes.has(code);
  }

  getActionForCode(code: string): InputAction | null {
    for (const [act, boundCode] of Object.entries(this.bindings)) {
      if(act.startsWith("MOVE_") && this.movementMode!=="wasd") continue;
      if (boundCode === code) return act as InputAction;
      if (boundCode === "AltLeft" && (code === "AltLeft" || code === "AltRight")) return act as InputAction;
    }
    return null;
  }

  onAction(listener: (action: InputAction, down: boolean, ev: KeyboardEvent) => void): () => void {
    this.actionListeners.push(listener);
    return () => {
      this.actionListeners = this.actionListeners.filter((l) => l !== listener);
    };
  }

  getScreenMovementVector(): { x: number; y: number } {
    const up = this.isActionDown("MOVE_UP") ? 1 : 0;
    const down = this.isActionDown("MOVE_DOWN") ? 1 : 0;
    const left = this.isActionDown("MOVE_LEFT") ? 1 : 0;
    const right = this.isActionDown("MOVE_RIGHT") ? 1 : 0;

    const sx = right - left;
    const sy = down - up;

    if (sx === 0 && sy === 0) return { x: 0, y: 0 };
    const len = Math.hypot(sx, sy);
    return { x: sx / len, y: sy / len };
  }

  getWorldMovementVector(tileWidth = 64, tileHeight = 32): { x: number; y: number } {
    const s = this.getScreenMovementVector();
    if (s.x === 0 && s.y === 0) return { x: 0, y: 0 };

    const wx = s.x / tileWidth + s.y / tileHeight;
    const wy = s.y / tileHeight - s.x / tileWidth;
    const wlen = Math.hypot(wx, wy);
    if (wlen < 1e-6) return { x: 0, y: 0 };
    return { x: wx / wlen, y: wy / wlen };
  }

  clear() {
    this.pressedCodes.clear();
  }

  simulateKeyDown(code: string) {
    this.pressedCodes.add(code);
  }

  simulateKeyUp(code: string) {
    this.pressedCodes.delete(code);
  }

  private setupListeners() {
    if (typeof window === "undefined") return;
    window.addEventListener("keydown", (ev) => {
      if ((ev.target as HTMLElement)?.matches?.("input,select,textarea")) return;

      if (
        (this.context === "GAMEPLAY" || this.context === "RADIAL_ORDERS" || this.context === "RADIAL_PINGS") &&
        ev.code === "Tab"
      ) {
        ev.preventDefault();
      }

      this.pressedCodes.add(ev.code);
      const action = this.getActionForCode(ev.code);
      if (action) {
        if ((this.context.startsWith("RADIAL_") && action!=="CYCLE_PARTY" && action!=="PAUSE_MENU") || this.context==="SELECTION_BOX") return;
        for (const listener of this.actionListeners) {
          listener(action, true, ev);
        }
      }
    });

    window.addEventListener("keyup", (ev) => {
      this.pressedCodes.delete(ev.code);
      const action = this.getActionForCode(ev.code);
      if (action) {
        for (const listener of this.actionListeners) {
          listener(action, false, ev);
        }
      }
    });

    window.addEventListener("blur", () => {
      this.pressedCodes.clear();
    });
  }
}
