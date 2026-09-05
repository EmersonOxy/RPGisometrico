import type {
  ClassId,
  Command,
  MetaProgress,
  PartyOrder,
  RunState,
  Slot,
  StatPointType,
} from "../core/types";
import type { Engine } from "../core/Engine";
import { EventBus } from "../core/EventBus";
import { PanelController, type PanelId } from "./PanelController";
import { Tooltip } from "./Tooltip";
import { AtlasView, atlasMarkup, type AtlasState } from "./AtlasView";
import { SkillTreeView, skillTreeView } from "./SkillTreeView";
import type { ViewTransform } from "./PanZoom";
import { InventoryDrag, inventoryView } from "./InventoryView";
import { shopView } from "./ShopView";
import { hudMarkup, refreshHud } from "./Hud";
import {
  menuView,
  selectionView,
  settingsView,
  type SettingsTab,
} from "./MenuViews";
import { icon } from "./Icons";
import {
  esc,
  comparison,
  jewelDetails,
  gameButton,
  slotNames,
} from "./Components";
import { abilityRegistry } from "../data/abilities";
import { passiveRegistry } from "../data/passives";
import { xpRequiredForLevel, bindings } from "../data/balance";
import { activeAbilities, addExperience } from "../progression/Character";
import { chunkAt } from "../world/WorldCoordinates";
import { setHTML } from "./dom";
import {
  InputManager,
  type InputAction,
  ACTION_NAMES,
  bindingLabel,
} from "../core/InputManager";
import type { CursorManager } from "./CursorManager";
import { LootFeed } from "./LootFeed";
import { sandboxView, applySandbox, validateSandbox } from "./SandboxView";
import { statsFor } from "../progression/Character";
import type { RadialWheel } from "./RadialWheel";

interface App {
  sandbox: boolean;
  beginSandbox: () => void;
  endSandbox: (keep: boolean) => void;
  meta: MetaProgress;
  run: RunState | null;
  engine?: Engine;
  input: InputManager;
  cursor: CursorManager;
  radial?: () => RadialWheel | undefined;
  cancelGestures?: () => void;
  start: (seed: string, cls: ClassId) => void;
  resume: () => void;
  menu: () => void;
  save: () => Promise<void>;
  pointer: () => { x: number; y: number };
  screen: (p: { x: number; y: number }) => { x: number; y: number };
  fps: () => number;
}
export class UI {
  private root = document.getElementById("ui")!;
  private panels: PanelController;
  private tooltip: Tooltip;
  private lootFeed: LootFeed;
  private drag: InventoryDrag;
  private atlas?: AtlasView;
  private tree?: SkillTreeView;
  private atlasState: AtlasState = { x: 0, y: 0, zoom: 8, initialized: false };
  private treeState: ViewTransform = { x: 0, y: 0, zoom: 1 };
  private menuMode = true;
  private choice: ClassId = "fighter";
  private selectedItem?: string;
  private debug = false;
  private debugDirty = false;
  private lastPanelKey = "";
  private noticeTimer?: ReturnType<typeof setTimeout>;
  private settingsKey = "";
  private lastNotice = "";
  private currentSettingsTab: SettingsTab = "gameplay";
  private rebindingAction: InputAction | null = null;
  private conflictNotice = "";
  constructor(
    private app: App,
    private bus: EventBus,
  ) {
    this.panels = new PanelController(this.root, () => this.syncPanel());
    this.tooltip = new Tooltip(this.root, (key) => this.tip(key));
    this.lootFeed = new LootFeed(this.root,()=>app.meta.settings);
    this.drag = new InventoryDrag(
      this.root,
      () => app.engine,
      () => this.refreshPanel(),
    );

    bus.on("lootAcquired", (entry) => {
      if (app.meta.settings.lootFeed !== false) {
        if (entry.kind === "item" && entry.item) {
          this.lootFeed.addItem(entry.item, entry.amount);
        } else if (entry.kind === "silver" || entry.kind === "gold") {
          this.lootFeed.addCurrency(entry.kind, entry.amount);
        } else if (entry.kind === "jewel" && entry.jewel) {
          this.lootFeed.addJewel(entry.jewel, entry.amount);
        }
      }
    });

    bus.on("inputBindingsChanged", () => {
      this.refresh();
      if (this.panels.top) this.syncPanel();
    });

    bus.on("currency", (p) => {
      if (app.meta.settings.reducedMotion) return;
      const pos = app.screen(p),
        wallet = document.getElementById("wallet")?.getBoundingClientRect();
      if (!wallet) return;
      const fly = document.createElement("span");
      fly.className = "coin-flight";
      fly.innerHTML = icon(p.kind === "gold" ? "fortune" : "coin");
      fly.style.left = pos.x + "px";
      fly.style.top = pos.y + "px";
      document.body.append(fly);
      fly.animate(
        [
          { transform: "translate(0,0) scale(1)", opacity: 1 },
          {
            transform:
              "translate(" +
              (wallet.x + wallet.width / 2 - pos.x) +
              "px," +
              (wallet.y - pos.y) +
              "px) scale(.45)",
            opacity: 0.8,
          },
        ],
        { duration: 480, easing: "cubic-bezier(.25,.6,.6,1)" },
      ).onfinish = () => fly.remove();
    });
    bus.on("changed", () => this.refresh());
    bus.on("notice", (s) => this.notice(s));
    bus.on("shop", () => this.panels.open("shop"));
    bus.on("run:ended", () => this.panels.open("over"));
    this.root.addEventListener("click", (ev) => {
      const b = (ev.target as HTMLElement).closest<HTMLElement>(
        "[data-action]",
      );
      if (b) {
        this.bus.emit("audio", "click");
        this.action(b.dataset.action!, b.dataset.id ?? "");
      }
    });
    this.root.addEventListener("pointerover", (ev) => {
      if ((ev.target as HTMLElement).closest("button"))
        this.bus.emit("audio", "hover");
    });
    this.root.addEventListener("input", (ev) => {
      const t = ev.target as HTMLInputElement;
      if(t.dataset.sandbox){this.debugDirty=true;return;}
      if (t.type === "range" && t.dataset.setting) {
        (this.app.meta.settings as Record<string, unknown>)[t.dataset.setting] =
          Number(t.value);
        this.applySettings();
      }
    });
    this.root.addEventListener("change", (ev) => {
      const t = ev.target as HTMLInputElement | HTMLSelectElement,
        k = t.dataset.setting,
        s = this.app.meta.settings as Record<string, unknown>;
      if (!k) return;
      if (t.type === "checkbox") {
        s[k] = (t as HTMLInputElement).checked;
      } else if (t.type === "range") {
        s[k] = Number(t.value);
      } else {
        const val = t.value;
        if (val === "true") s[k] = true;
        else if (val === "false") s[k] = false;
        else if (
          !isNaN(Number(val)) &&
          val !== "" &&
          k !== "cursorStyle" &&
          k !== "xpDisplay" &&
          k !== "characterIndicator" &&
          k !== "movementMode" &&
          k !== "vfxQuality" &&
          k !== "minimapOrientation" &&
          k !== "highlightIntensity" &&
          k !== "highlightPalette" &&
          k !== "radialSlowMo" &&
          k !== "groundLootLabels" &&
          k !== "worldShadows"
        ) {
          s[k] = Number(val);
        } else {
          s[k] = val;
        }
      }
      if (k === "cursorStyle") {
        this.app.cursor.setStyle(this.app.meta.settings.cursorStyle ?? "classic");
      }
      if(k==="movementMode"){
        this.app.input.clear();
        const preset=this.app.meta.settings.movementMode==="wasd"?["KeyZ","KeyX","KeyC","KeyV"]:["KeyQ","KeyW","KeyE","KeyR"];
        preset.forEach((code,i)=>this.app.input.setBinding(`ABILITY_${i+1}` as InputAction,code));
        this.app.meta.settings.keybindings=this.app.input.getBindings();
        if(this.app.engine){this.app.engine.selected.path=[];this.app.engine.selected.target=undefined;this.app.engine.orders.delete(this.app.engine.selected.id);}
        this.bus.emit("inputBindingsChanged",undefined);
      }
      this.applySettings();
      void this.app.save();
      if (this.panels.top === "settings") {
        this.syncPanel();
      }
    });
    this.app.input.onAction((action, down, ev) =>
      this.handleInputAction(action, down, ev),
    );
    window.addEventListener("keydown", (ev) => this.key(ev));
    window.addEventListener("keyup", (ev) => {
      if (ev.code === "AltLeft" || ev.code === "AltRight") {
        if (this.app.engine && !this.app.meta.settings.alwaysShowLoot) {
          this.app.engine.showLootLabels = false;
        }
      }
    });
    this.showMenu();
  }
  showMenu() {
    this.lootFeed.clear();
    this.app.input.setContext("MENU");
    this.atlas?.destroy();
    this.tree?.destroy();
    this.root.classList.remove("panel-open");
    this.menuMode = true;
    this.panels.stack = [];
    this.choice = "fighter";
    this.root.innerHTML = menuView(this.app.run);
    this.applySettings();
  }
  showGame() {
    this.debugDirty=false;
    this.lootFeed.clear();
    this.treeState={x:0,y:0,zoom:1};
    this.atlasState={x:0,y:0,zoom:8,initialized:false};
    this.app.input.setContext("GAMEPLAY");
    this.root.classList.remove("panel-open");
    this.menuMode = false;
    this.panels.stack = [];
    this.root.innerHTML = hudMarkup();
    this.lootFeed.mount(this.root);
    this.applySettings();
    this.refresh();
  }
  private syncPanel() {
    this.atlas?.destroy();
    this.atlas = undefined;
    this.tree?.destroy();
    this.tree = undefined;
    this.tooltip.hide();
    this.lastPanelKey = "";
    const top = this.panels.top,
      e = this.app.engine;
    const isFloating = this.panels.isFloating(top);
    if (top && !isFloating) { this.app.cancelGestures?.(); this.app.input.clear(); e?.targeting.cancelPreview(); }
    this.app.input.setContext(
      isFloating
        ? (e?.targeting.state?.active ? "TARGETING" : "GAMEPLAY")
        : top==="skills"?"SKILLS":top==="map"?"MAP":top||this.menuMode?"MENU":"GAMEPLAY"
    );
    this.root.classList.toggle("panel-open", !!top);
    if (e) {
      if (!isFloating) e.paused = !!top;
      if (!top) e.shop.active = undefined;
    }
    const modal = document.getElementById("modal");
    if (!modal) return;
    if (!top) {
      const floating = modal.querySelector(".floating-panel") as HTMLElement | null;
      if (floating && !floating.classList.contains("closing")) {
        floating.classList.add("closing");
        floating.addEventListener("animationend", () => floating.remove(), { once: true });
        setTimeout(() => floating.remove(), 250);
      } else {
        modal.innerHTML = "";
      }
      return;
    }
    let content = "";
    if (top === "new") content = selectionView(this.app.meta, this.choice);
    else if (top === "settings")
      content = settingsView(
        this.app.meta,
        this.currentSettingsTab,
        this.rebindingAction ?? undefined,
        this.conflictNotice,
      );
    else if (top === "pause")
      content =
        '<section class="pause-sheet"><span class="pause-emblem">' +
        icon("compass") +
        "</span><h2>Um respiro no caminho</h2>" +
        gameButton("Retomar", "close") +
        gameButton("Salvar agora", "save") +
        gameButton("Configurações", "settings") +
        gameButton("Salvar e voltar ao início", "menu") +
        "<p>A jornada fica à sua espera.</p></section>";
    else if (e) {
      if (top === "inventory") content = inventoryView(e, this.selectedItem);
      if (top === "skills") content = skillTreeView(e);
      if (top === "map") content = atlasMarkup(e.run.seed);
      if (top === "shop") content = shopView(e);
      if (top === "over") {
        const s = e.run.stats;
        content =
          '<section class="loss-sheet"><small>Nem todos voltam</small><h2>A expedição se perdeu</h2><p>O caminho guarda seus nomes.<br>Seu legado permanece.</p><div class="run-summary">' +
          [
            [s.kills, "inimigos vencidos"],
            [Math.floor(s.distance), "passos explorados"],
            [s.highestLevel, "maior nível"],
            [s.biomes.length, "biomas"],
          ]
            .map(([v, k]) => "<b>" + v + "<small>" + k + "</small></b>")
            .join("") +
          "</div><p>" +
          e.meta.silver +
          " prata · " +
          e.meta.gold +
          " ouro nesta jornada. Um novo jogo reinicia a progressão.</p>" +
          (this.app.sandbox ? gameButton("Descartar experimento e voltar", "sandbox-discard") + gameButton("Incorporar resultado do experimento", "sandbox-keep") : "") +
          gameButton("Um novo horizonte", "menu") +
          "</section>";
      }
    }
    if (isFloating) {
      const prev = modal.querySelector(".floating-panel");
      if (prev) prev.remove();
      const panel = document.createElement("div");
      panel.className = "floating-panel inventory-panel";
      panel.addEventListener("pointerdown", (e) => e.stopPropagation());
      panel.innerHTML =
        '<section class="panel-frame inventory-frame" role="dialog" aria-label="inventário">' +
        '<button class="panel-close" data-action="close" aria-label="Fechar">' +
        icon("cross") +
        "<kbd>I</kbd></button>" +
        content +
        "</section>";
      modal.appendChild(panel);
      this.positionFloatingPanel(panel);
      requestAnimationFrame(() => panel.classList.add("open"));
    } else {
      const full = ["map", "skills", "shop", "settings"].includes(top);
      modal.innerHTML =
        '<div class="panel-shade ' +
        (full ? "wide" : "compact") +
        '"><section class="panel-frame ' +
        top +
        '-frame" role="dialog" aria-modal="true" aria-label="' +
        top +
        '">' +
        (top !== "over"
          ? '<button class="panel-close" data-action="close" aria-label="Fechar">' +
            icon("cross") +
            "<kbd>Esc</kbd></button>"
          : "") +
        content +
        "</section></div>";
    }
    if (top === "map" && e)
      this.atlas = new AtlasView(modal, e, this.atlasState);
    if (top === "skills" && e)
      this.tree = new SkillTreeView(modal, this.treeState);
    if (top === "inventory") this.app.meta.tutorials.inventory = true;
    this.root.style.setProperty(
      "--font-scale",
      String(this.app.meta.settings.fontScale),
    );
  }
  private refreshPanel() {
    this.lastPanelKey = "";
    this.syncPanel();
  }
  private positionFloatingPanel(panel: HTMLElement) {
    const e = this.app.engine;
    if (!e) return;
    const frame = panel.querySelector(".panel-frame") as HTMLElement | null;
    if (!frame) return;
    const pw = this.app.pointer();
    const screen = this.app.screen(pw);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 18;
    const panelW = frame.offsetWidth;
    const panelH = frame.offsetHeight;
    let x = screen.x + margin;
    let y = screen.y - panelH / 2;
    if (x + panelW > vw - 12) x = screen.x - panelW - margin;
    if (x < 12) x = 12;
    if (y < 12) y = 12;
    if (y + panelH > vh - 12) y = vh - panelH - 12;
    panel.style.left = x + "px";
    panel.style.top = y + "px";
  }
  private tip(key: string) {
    const [kind, ...rest] = key.split(":"),
      id = rest.join(":"),
      e = this.app.engine,
      c = e?.selected;
    if (kind === "order") {
      const orderTips: Record<string, string> = {
        follow:
          "<h3>Ordem: Seguir</h3><p>O aliado acompanha o líder e combate ameaças próximas à formação.</p><small>Shift + Clique aplica a toda a comitiva</small>",
        hold:
          "<h3>Ordem: Manter Posição</h3><p>O aliado permanece fixo no local e ataca apenas alvos em seu alcance.</p><small>Shift + Clique aplica a toda a comitiva</small>",
        focus:
          "<h3>Ordem: Focar Alvo</h3><p>O aliado prioriza o alvo marcado pelo líder (botão do meio do mouse no inimigo).</p><small>Shift + Clique aplica a toda a comitiva</small>",
        passive:
          "<h3>Ordem: Passivo</h3><p>O aliado não inicia ataques, priorizando fuga e sobrevivência.</p><small>Shift + Clique aplica a toda a comitiva</small>",
        aggressive:
          "<h3>Ordem: Agressivo</h3><p>O aliado avança ativamente contra qualquer ameaça na área.</p><small>Shift + Clique aplica a toda a comitiva</small>",
      };
      return orderTips[id] ?? "";
    }
    if (kind === "stat") {
      const statTips: Record<string, string> = {
        vitality:
          "<h3>Vitalidade</h3><p>Aumenta a Vida máxima (+15 HP por ponto) e acelera a recuperação entre combates.</p>",
        armor:
          "<h3>Armadura</h3><p>Reduz o dano físico sofrido (+2 de redução por ponto) e confere resistência a atordoamento.</p>",
        speed:
          "<h3>Velocidade</h3><p>Aumenta a velocidade de movimento (+0.12 por ponto) e reduz sutilmente o intervalo entre ataques.</p>",
        mana:
          "<h3>Recurso (Mana / Estamina / Foco)</h3><p>Aumenta a reserva do recurso (+15) e a taxa de regeneração contínua.</p>",
        luck:
          "<h3>Sorte</h3><p>Aumenta a chance de acerto crítico (+1.5%), a quantidade de moedas encontradas e a raridade dos saques.</p>",
        charisma:
          "<h3>Carisma</h3><p>Concede descontos em mercadores (-4% por ponto) e melhora a coordenação tática da comitiva.</p>",
      };
      return statTips[id] ?? "";
    }
    if (kind === "help")
      return (
        {
          inventory: `<h3>Mochila</h3><p>${bindingLabel(this.app.meta.settings, "INVENTORY")} abre e fecha seus pertences.</p>`,
          skills: `<h3>Disciplinas</h3><p>${bindingLabel(this.app.meta.settings, "SKILLS")} abre a árvore de habilidades.</p>`,
          pause: `<h3>Pausa</h3><p>${bindingLabel(this.app.meta.settings, "PAUSE_MENU")} abre o menu.</p>`,
        }[id] ?? ""
      );
    if (kind === "seed")
      return "<h3>Semente do mundo</h3><p>" + esc(id) + "</p>";
    if (kind === "empty")
      return (
        "<h3>" +
        slotNames[id] +
        "</h3><p>Arraste um equipamento compatível para este espaço.</p>"
      );
    if (kind === "socket")
      return "<h3>Receptáculo vazio</h3><p>Arraste uma joia da bolsa para formar um vínculo.</p>";
    if (kind === "ability") {
      const a = abilityRegistry[id];
      const slot = this.app.engine ? activeAbilities(this.app.engine.selected).indexOf(id) : -1;
      const key = slot >= 0 ? bindingLabel(this.app.meta.settings, `ABILITY_${slot+1}` as InputAction) : "Mouse 2";
      return a
        ? '<div class="tooltip-heading">' +
            icon(a.id) +
            "<h3>" +
            a.name +
            "</h3></div><p>" +
            a.description +
            "</p><p>" +
            a.cost +
            " recurso · " +
            a.cooldown +
            " s · alcance " +
            a.range +
            "</p><small>Nível " +
            a.level +
            (a.jewelRequirement ? " · requer Joia da Brasa" : "") +
            `</small><p>Atalho: ${key}</p>`
        : "";
    }
    if (kind === "passive") {
      const p = passiveRegistry[id];
      return (
        "<h3>" +
        p.name +
        "</h3><p>" +
        p.description +
        "</p><p>" +
        (c?.passives.includes(id)
          ? "Aprendido"
          : "Custo: 1 ponto · ligado ao núcleo da classe") +
        "</p>"
      );
    }
    if (kind === "mastery")
      return "<h3>Maestria</h3><p>Aumenta o dano com retornos decrescentes. Pode ser aprendida repetidamente.</p><p>Custo: 1 ponto</p>";
    if (!e || !c) return "";
    if (kind === "jewel") return jewelDetails(id, c);
    const item =
      kind === "stock"
        ? e.shop.stock().find((i) => i.baseId === id)
        : (e.run.inventory.find((i) => i.id === id) ??
          Object.values(c.equipment).find((i) => i?.id === id));
    return item ? comparison(item, c) : "";
  }
  refresh() {
    this.applySettings();
    const e = this.app.engine;
    if (!e || this.menuMode) return;
    if (!e.run.ended) refreshHud(e);
    if (this.panels.isFloating()) {
      const panel = document.getElementById("modal")?.querySelector(".floating-panel") as HTMLElement | null;
      if (panel) this.positionFloatingPanel(panel);
    }
    const debug = document.getElementById("debug");
    if (debug) {
      debug.hidden = !this.debug;
      if (this.debug && !this.debugDirty) {
        const c = e.selected,
          ch = chunkAt(c.x, c.y);
        setHTML(
          "debug",
          "<b>Observatório · F3</b><pre>FPS " +
            Math.round(this.app.fps()) +
            " | seed " +
            esc(e.run.seed) +
            "\nPosição " +
            c.x.toFixed(1) +
            ", " +
            c.y.toFixed(1) +
            " | chunk " +
            ch.x +
            "," +
            ch.y +
            "\n" +
            e.world.chunks.size +
            " chunks | " +
            e.enemies.size +
            " inimigos\n" +
            e.saveStatus +
            "</pre>" +
            [
              "silver",
              "gold",
              "fire",
              "fortune",
              "level",
              "elite",
              "teleport",
              "grid",
              "kill",
              "wipe",
            ]
              .map((id) => gameButton(({silver:"+100 prata",gold:"+10 ouro",fire:"Joia da Brasa",fortune:"Joia da Fortuna",level:"+1 nível",elite:"Criar elite",teleport:"Teleportar",grid:"Grade",kill:"Derrubar controlado",wipe:"Derrubar grupo"} as Record<string,string>)[id], "debug", id))
              .join("") + sandboxView(e,this.app.sandbox),
        );
      }
    }
    const top = this.panels.top;
    if (top && ["inventory", "shop", "skills"].includes(top)) {
      const c = e.selected,
        key = JSON.stringify([
          c.id,
          c.points,
          c.mastery,
          c.equipment,
          c.jewels,
          c.passives,
          e.run.inventory,
          e.run.jewels,
          e.meta.silver,
          e.meta.gold,
          e.meta.unlockedClasses,
          e.run.party.length,
        ]);
      if (this.lastPanelKey && this.lastPanelKey !== key) {
        this.syncPanel();
      }
      this.lastPanelKey = key;
    }
  }
  notice(s: string) {
    const el = document.getElementById("notice");
    if (!el) return;
    if (this.lastNotice === s && el.classList.contains("visible")) return;
    this.lastNotice = s;
    el.textContent = s;
    el.classList.add("visible");
    clearTimeout(this.noticeTimer);
    this.noticeTimer = setTimeout(() => el.classList.remove("visible"), 2500);
  }
  private applySettings() {
    const s = this.app.meta.settings,
      key = JSON.stringify(s);
    if (key === this.settingsKey) return;
    this.settingsKey = key;
    this.app.input.movementMode=s.movementMode??"click";
    this.root.style.setProperty("--ui-scale", String(s.uiScale));
    this.root.style.setProperty("--font-scale", String(s.fontScale));
    this.root.classList.toggle("reduced-motion", s.reducedMotion);
    document.body.classList.toggle("reduced-motion", s.reducedMotion);
  }
  private action(action: string, id: string) {
    const e = this.app.engine;
    if(action==="sandbox-apply" && e){
      const values:Record<string,number|boolean>={};
      this.root.querySelectorAll<HTMLInputElement|HTMLSelectElement>("[data-sandbox]").forEach(input=>{values[input.dataset.sandbox!]=input instanceof HTMLInputElement&&input.type==="checkbox"?input.checked:input.value.trim()===""?NaN:Number(input.value)});
      try { validateSandbox(values);this.app.beginSandbox();applySandbox(e,values);this.debugDirty=false;this.refresh();this.notice("Valores aplicados no sandbox."); } catch(error){this.notice((error as Error).message);}
      return;
    }
    if(action==="sandbox-discard" || action==="sandbox-keep"){
      this.app.endSandbox(action==="sandbox-keep");this.showGame();if(this.app.engine?.run.ended)this.panels.open("over");return;
    }
    switch (action) {
      case "new":
        this.panels.open("new");
        return;
      case "class": {
        const seed = (document.getElementById("seed") as HTMLInputElement)
          ?.value;
        this.choice = id as ClassId;
        this.syncPanel();
        if (seed)
          (document.getElementById("seed") as HTMLInputElement).value = seed;
        return;
      }
      case "embark": {
        this.debug=false;this.debugDirty=false;this.tooltip.hide();this.lastNotice="";
        const seed =
          (document.getElementById("seed") as HTMLInputElement).value.trim() ||
          "mundo-" + crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
        this.app.start(seed, this.choice);
        this.atlasState = { x: 0, y: 0, zoom: 8, initialized: false };
        this.showGame();
        return;
      }
      case "continue":
        this.app.resume();
        this.showGame();
        return;
      case "settings-tab":
        this.currentSettingsTab = id as SettingsTab;
        this.rebindingAction = null;
        this.conflictNotice = "";
        this.syncPanel();
        return;
      case "rebind":
        this.rebindingAction = id as InputAction;
        this.conflictNotice = "";
        this.syncPanel();
        return;
      case "reset-bindings":
        this.app.input.resetBindings();
        this.app.meta.settings.keybindings = this.app.input.getBindings();
        this.conflictNotice = "";
        void this.app.save();
        this.syncPanel();
        return;
      case "fullscreen":
        if (!document.fullscreenElement) {
          void document.documentElement.requestFullscreen?.();
        } else {
          void document.exitFullscreen?.();
        }
        return;
      case "party":
        if (e) {
          const nonControlled = e.run.party.filter((m) => m.alive && m.id !== e.selected.id);
          if (nonControlled.length === 0) {
            this.notice("Nenhuma tropa subordinada no grupo.");
            return;
          }
          const targetIds = (e.run.commandSelection && e.run.commandSelection.length > 0)
            ? e.run.commandSelection.filter((mid) => mid !== e.selected.id && e.run.party.some((p) => p.id === mid && p.alive))
            : nonControlled.map((m) => m.id);

          if (targetIds.length === 0) {
            this.notice("Nenhuma tropa selecionada.");
            return;
          }
          const orderId = id as PartyOrder;
          const orderLabels: Record<PartyOrder, string> = {
            follow: "Seguir",
            hold: "Manter Posição",
            focus: "Focar Alvo",
            passive: "Passivo",
            aggressive: "Agressivo",
            regroup: "Reagrupar",
          };
          if (orderId === "regroup") {
            for (const mId of targetIds) {
              const m = e.run.party.find((p) => p.id === mId);
              if (m) {
                e.move(m, { x: e.selected.x + (Math.random() - 0.5) * 2, y: e.selected.y + (Math.random() - 0.5) * 2 });
              }
            }
            this.notice(`${targetIds.length} tropa(s) reagrupando...`);
          } else {
            for (const mId of targetIds) {
              e.command({ type: "memberOrder", memberId: mId, order: orderId });
            }
            this.notice(`Ordem para ${targetIds.length} tropa(s): ${orderLabels[orderId] ?? orderId}`);
          }
          this.refresh();
        }
        return;
      case "member-order":
        if (e) {
          const member = e.run.party.find((m) => m.id === id);
          if (member) {
            const orders: PartyOrder[] = [
              "follow",
              "hold",
              "focus",
              "passive",
              "aggressive",
            ];
            const curIdx = orders.indexOf(member.partyOrder ?? "follow");
            const nextOrder = orders[(curIdx + 1) % orders.length];
            const isShift = (window.event as MouseEvent)?.shiftKey ?? false;
            const orderLabels: Record<PartyOrder, string> = {
              follow: "Seguir",
              hold: "Manter Posição",
              focus: "Focar Alvo",
              passive: "Passivo",
              aggressive: "Agressivo",
              regroup: "Reagrupar",
            };
            if (isShift) {
              for (const m of e.run.party) {
                e.command({
                  type: "memberOrder",
                  memberId: m.id,
                  order: nextOrder,
                });
              }
              this.notice(
                `Ordem para toda a comitiva: ${orderLabels[nextOrder]}`,
              );
            } else {
              e.command({
                type: "memberOrder",
                memberId: member.id,
                order: nextOrder,
              });
              this.notice(`Ordem para ${member.name}: ${orderLabels[nextOrder]}`);
            }
            this.refresh();
          }
        }
        return;
      case "stat":
        if (e) {
          e.command({ type: "stat", stat: id as StatPointType });
          this.refresh();
          if (this.panels.top) this.syncPanel();
        }
        return;
      case "close":
        this.panels.close();
        return;
      case "inventory":
      case "skills":
      case "map":
      case "settings":
      case "pause":
        this.panels.toggle(action);
        return;
      case "menu":
        void this.app
          .save()
          .then(() => {
            this.app.menu();
            this.panels.stack = [];
            this.showMenu();
          })
          .catch(() =>
            this.notice(
              "Não foi possível salvar. Sua expedição continua aberta.",
            ),
          );
        return;
      case "save":
        void e?.save();
        return;
      case "copy":
        void navigator.clipboard
          .writeText(e?.run.seed ?? "")
          .then(() => this.notice("Semente copiada"));
        return;
      case "atlas-home":
        this.atlas?.home();
        return;
      case "atlas-zoom":
        this.atlas?.zoom(id === "in" ? 1.25 : 0.8);
        return;
      case "tree-home":
        this.tree?.pan.home();
        return;
      case "tree-zoom":
        this.tree?.pan.zoom(id === "in" ? 1.2 : 0.83);
        return;
      case "item-select": {
        this.selectedItem = id;
        this.root
          .querySelectorAll<HTMLElement>(".bag-grid [data-item]")
          .forEach((b) => b.classList.toggle("chosen", b.dataset.item === id));
        const item = e?.run.inventory.find((i) => i.id === id),
          footer = this.root.querySelector(".inventory-selection");
        if (item && footer)
          footer.innerHTML =
            "<b>" +
            esc(item.name) +
            "</b>" +
            gameButton("Equipar", "equip", id) +
            "<small>Duplo clique também equipa</small>";
        return;
      }
      case "node": {
        const a = abilityRegistry[id];
        this.notice(a?.description ?? "Disciplina da classe");
        return;
      }
      case "sort":
        if (e) {
          e.run.inventory.sort(
            (a, b) =>
              b.rarity - a.rarity ||
              a.slot.localeCompare(b.slot) ||
              a.name.localeCompare(b.name),
          );
          e.run.bagLayout = {};
          void e.save();
          this.syncPanel();
        }
        return;
      case "debug":
        this.debugAction(id);
        return;
    }
    if (!e) return;
    let command: Command | undefined;
    if (action === "select") command = { type: "select", index: Number(id) };
    if (action === "ability") {
      if (Number(id) < 0) e.basicAttack(this.app.pointer());
      else e.targeting.executeAbility(Number(id), this.app.pointer());
      return;
    }
    if (action === "party")
      command = { type: "party", command: id as RunState["command"] };
    if (
      ["equip", "jewel", "unjewel", "buy", "sell", "passive"].includes(action)
    )
      command = { type: action, id } as Command;
    if (action === "unequip") command = { type: "unequip", slot: id as Slot };
    if (action === "unlock" || action === "recruit")
      command = { type: action, classId: id as ClassId };
    if (action === "mastery") command = { type: "mastery" };
    if (command) e.command(command);
    if (["equip", "unequip", "jewel", "unjewel"].includes(action))
      this.bus.emit("audio", "equip");
    if (this.panels.top) this.refreshPanel();
    else this.refresh();
  }
  private handleInputAction(
    action: InputAction,
    down: boolean,
    ev: KeyboardEvent,
  ) {
    const e = this.app.engine;
    if (!e || e.run.ended || this.menuMode) return;
    if (this.rebindingAction) return;
    if (ev.repeat && down) return;
    if (action === "PAUSE_MENU" && down && ev.code !== "Escape") {
      this.key(new KeyboardEvent("keydown", {code:"Escape"}));
      return;
    }
    const context=this.app.input.getContext();
    if(context==="SELECTION_BOX" || (context.startsWith("RADIAL_") && action!=="CYCLE_PARTY"))return;

    if (this.panels.top) {
      if (this.panels.isFloating() && action === "PAUSE_MENU" && down) {
        this.panels.close();
        return;
      }
      if (
        down &&
        (action === "INVENTORY" || action === "SKILLS" || action === "MAP")
      ) {
        const panelMap: Record<string, PanelId> = {
          INVENTORY: "inventory",
          SKILLS: "skills",
          MAP: "map",
        };
        if (this.panels.top === panelMap[action]) {
          this.panels.close();
        } else {
          this.panels.open(panelMap[action]);
        }
      }
      return;
    }

    if (action === "INVENTORY" && down) {
      this.panels.toggle("inventory");
      return;
    }
    if (action === "SKILLS" && down) {
      this.panels.toggle("skills");
      return;
    }
    if (action === "MAP" && down) {
      this.panels.toggle("map");
      return;
    }
    if (action === "TACTICAL" && down) {
      e.command({ type: "tactical" });
      return;
    }
    if (action === "CYCLE_PARTY" && down) {
      const radial = this.app.radial?.();
      if (radial?.isActive) {
        radial.togglePage();
        this.app.input.setContext(radial.currentPage==="orders"?"RADIAL_ORDERS":"RADIAL_PINGS");
        return;
      }
      const alive = e.run.party.filter((m) => m.alive);
      if (alive.length > 1) {
        const curIdx = alive.findIndex((m) => m.id === e.selected.id);
        const nextIdx = (curIdx + 1) % alive.length;
        e.run.selected = alive[nextIdx].id;
        this.bus.emit("changed", undefined);
        this.bus.emit("audio", "click");
      }
      return;
    }
    if (action.startsWith("PARTY_") && down) {
      const idx = Number(action.slice(-1)) - 1;
      const alive = e.run.party.filter((m) => m.alive);
      if (alive[idx]) {
        e.run.selected = alive[idx].id;
        this.bus.emit("changed", undefined);
        this.bus.emit("audio", "click");
      }
      return;
    }
    if (action.startsWith("ABILITY_") || action === "SECONDARY_ABILITY") {
      let slot = -1;
      if (action === "SECONDARY_ABILITY") {
        if(down && !ev.repeat)e.basicAttack(this.app.pointer(),e.hovered?.kind==="enemy"?e.hovered.id:undefined);
        return;
      } else {
        slot = Number(action.slice(-1)) - 1;
      }
      if (slot >= 0) {
        const quickCast = e.meta.settings.quickCast !== false;
        if (quickCast) {
          if (down && !ev.repeat) {
            e.targeting.executeAbility(slot, this.app.pointer());
          }
        } else {
          // Cast on Release: preview on down, execute on release
          if (down && !ev.repeat) {
            e.targeting.startPreview(slot, this.app.pointer());
            this.app.cursor.setTargeting(
              true,
              e.targeting.state?.valid ?? true,
            );
          } else if (!down) {
            if (e.targeting.state?.active && e.targeting.state.slot === slot) {
              e.targeting.confirmPreview();
              this.app.cursor.setTargeting(false);
            }
          }
        }
      }
      return;
    }
  }
  private key(ev: KeyboardEvent) {
    const e = this.app.engine;
    // 0. Key rebinding mode
    if (this.rebindingAction) {
      ev.preventDefault();
      if (ev.code === "Escape") {
        this.rebindingAction = null;
        this.conflictNotice = "";
        this.syncPanel();
        return;
      }
      const conflict = this.app.input.findConflict(
        this.rebindingAction,
        ev.code,
      );
      if (conflict) {
        this.conflictNotice = `A tecla ${ev.code.replace(/^Key|^Digit/, "")} já estava em uso por "${ACTION_NAMES[conflict]}". Tecla reatribuída.`;
        this.app.input.setBinding(conflict, "");
      } else {
        this.conflictNotice = "";
      }
      this.app.input.setBinding(this.rebindingAction, ev.code);
      this.app.meta.settings.keybindings = this.app.input.getBindings();
      this.rebindingAction = null;
      void this.app.save();
      this.bus.emit("inputBindingsChanged", undefined);
      this.refresh();
      this.syncPanel();
      return;
    }

    // Strict Escape hierarchy:
    if (ev.code === "Escape") {
      ev.preventDefault();
      // 1. Close radial wheel if active
      const radial = this.app.radial?.();
      if (radial?.isActive) {
        radial.cancel();
        return;
      }
      // 2. Close active targeting preview
      if (e?.targeting.state?.active) {
        e.targeting.cancelPreview();
        this.app.cursor.setTargeting(false);
        return;
      }
      // 3. Close top modal/panel
      if (this.panels.top) {
        this.panels.close();
        return;
      }
      // 4. Clear command selection if active
      if (e && (e.run.commandSelection?.length ?? 0) > 0) {
        e.run.commandSelection = [];
        this.bus.emit("changed", undefined);
        this.notice("Seleção de grupo desfeita.");
        return;
      }
      // 5. Open pause menu
      if (e && !e.run.ended && !this.menuMode) {
        this.panels.open("pause");
        return;
      }
      return;
    }

    if ((ev.target as HTMLElement).matches("input,select,textarea")) return;

    if (ev.code === "F3") {
      ev.preventDefault();
      this.debug = !this.debug;
      this.refresh();
      return;
    }
    if (ev.code === "AltLeft" || ev.code === "AltRight") {
      if (e) e.showLootLabels = true;
      return;
    }
  }
  private debugAction(id: string) {
    const e = this.app.engine;
    if (!e) return;
    this.app.beginSandbox();this.debugDirty=false;
    if(id==="heal")for(const c of e.run.party)if(c.alive){c.hp=statsFor(c).health;c.resource=100;}
    if (id === "silver") e.meta.silver += 100;
    if (id === "gold") e.meta.gold += 10;
    if (id === "fire" || id === "fortune") e.run.jewels.push(id);
    if (id === "level")
      addExperience(e.selected, xpRequiredForLevel(e.selected.level));
    if (id === "grid") e.debugGrid = !e.debugGrid;
    if (id === "kill") e.die(e.selected);
    if (id === "wipe") for (const c of e.run.party) if (c.alive) e.die(c);
    if (id === "teleport") {
      e.selected.x += 96;
      e.selected.y += 32;
      e.selected.path = [];
      e.world.update(e.selected);
    }
    if (id === "elite") {
      const x = e.selected.x + 5,
        y = e.selected.y,
        enemyId = "debug:" + e.nextId();
      e.enemies.set(enemyId, {
        id: enemyId,
        definition: "golem",
        x,
        y,
        level: e.selected.level,
        elite: true,
        hp: 180,
        maxHp: 180,
        modifier: "armored",
        statuses: [],
        path: [],
        state: "IDLE",
        timer: 0,
        aiTime: 0,
        attackTime: 1,
        home: { x, y },
        threat: {},
      });
    }
    void e.save();
    this.refresh();
  }
}
