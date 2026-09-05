import type { MetaProgress, RunState, ClassId } from "../core/types";
import { icon, portrait } from "./Icons";
import { classRegistry } from "../data/classes";
import { esc, gameButton } from "./Components";
import {
  ACTION_NAMES,
  DEFAULT_KEYBINDINGS,
  formatKeyBinding,
  type InputAction,
} from "../core/InputManager";

export type SettingsTab =
  | "gameplay"
  | "controls"
  | "interface"
  | "audio"
  | "video"
  | "accessibility";

export function menuView(run: RunState | null) {
  return (
    '<main class="main-menu"><div class="menu-landscape"><div class="sun"></div><div class="mountain back"></div><div class="mountain front"></div></div><section class="menu-content"><span class="menu-emblem">' +
    icon("compass") +
    '</span><small>Os cadernos dos errantes</small><h1>Cinzas do<br><i>Horizonte</i></h1><p class="menu-description">Reúna os errantes. Cruze o desconhecido.<br>O mundo permanece. Nem todos voltam.</p><div class="menu-actions">' +
    gameButton("Nova expedição", "new") +
    gameButton(
      "Continuar jornada",
      "continue",
      "",
      !run || run.ended ? "disabled" : "",
    ) +
    gameButton("Configurações", "settings") +
    '</div><p class="edition">O Vale dos Errantes · Expedição I</p></section></main><div id="modal"></div><div id="notice" role="status"></div>'
  );
}

export function selectionView(meta: MetaProgress, choice: ClassId) {
  return (
    '<section class="selection-sheet"><header><small>Cada caminho começa com alguém</small><h2>Escolha seu primeiro errante</h2></header><div class="class-selection">' +
    Object.values(classRegistry)
      .map(
        (c) =>
          '<button class="class-banner ' +
          (c.id === choice ? "chosen" : "") +
          '" data-action="class" data-id="' +
          c.id +
          '" ' +
          (c.id !== "fighter"
            ? "disabled"
            : "") +
          ">" +
          portrait(c.id) +
          "<h3>" +
          c.name +
          "</h3><p>" +
          c.subtitle +
          "</p><small>" +
          (c.id === "fighter" ? c.resource : "Desbloqueie durante a jornada") +
          "</small></button>",
      )
      .join("") +
    '</div><label class="seed-label">Semente do mundo<input id="seed" value="" maxlength="64" placeholder="Deixe vazio para descobrir um mundo"></label><p>Nova jornada: reinicia moedas, classes, grupo, mapa e progressão. Suas configurações são mantidas.</p>' +
    gameButton("Partir para o desconhecido", "embark") +
    "</section>"
  );
}

export function settingsView(
  meta: MetaProgress,
  activeTab: SettingsTab = "gameplay",
  rebindingAction?: string,
  conflictNotice?: string,
) {
  const tabs: Array<{ id: SettingsTab; label: string; iconName: string }> = [
    { id: "gameplay", label: "Jogabilidade", iconName: "sword" },
    { id: "controls", label: "Controles", iconName: "target" },
    { id: "interface", label: "Interface", iconName: "map" },
    { id: "audio", label: "Áudio", iconName: "storm" },
    { id: "video", label: "Vídeo", iconName: "eye" },
    { id: "accessibility", label: "Acessibilidade", iconName: "shield" },
  ];

  const s = meta.settings;

  let tabContent = "";

  if (activeTab === "gameplay") {
    tabContent = `
      <div class="settings-group">
        <h3>Movimento & Ação</h3>
        <label class="setting">
          <span>Modo de Movimento</span>
          <select data-setting="movementMode">
            <option value="click" ${s.movementMode !== "wasd" ? "selected" : ""}>Clique para Mover (Padrão)</option>
            <option value="wasd" ${s.movementMode === "wasd" ? "selected" : ""}>WASD Direto</option>
          </select>
        </label>
        <label class="setting">
          <span>Modo de Lançamento de Habilidades</span>
          <select data-setting="quickCast">
            <option value="true" ${s.quickCast !== false ? "selected" : ""}>Quick Cast (Imediato no Cursor)</option>
            <option value="false" ${s.quickCast === false ? "selected" : ""}>Cast on Release (Mirar e Soltar)</option>
          </select>
        </label>
        <label class="setting">
          <span>Desaceleração da Roda Radial</span>
          <select data-setting="radialSlowMo">
            <option value="off" ${s.radialSlowMo === "off" ? "selected" : ""}>Desligado (Tempo Real)</option>
            <option value="50" ${s.radialSlowMo === "50" ? "selected" : ""}>50% Velocidade</option>
            <option value="25" ${s.radialSlowMo === "25" || !s.radialSlowMo ? "selected" : ""}>25% Velocidade</option>
          </select>
        </label>
        <label class="setting">
          <span>Orientação do Minimapa</span>
          <select data-setting="minimapOrientation">
            <option value="north-up" ${s.minimapOrientation !== "rotate" ? "selected" : ""}>Norte Fixo (Padrão)</option>
            <option value="rotate" ${s.minimapOrientation === "rotate" ? "selected" : ""}>Rotacionar com Personagem</option>
          </select>
        </label>
        <label class="setting">
          <input data-setting="clickIndicator" type="checkbox" ${s.clickIndicator !== false ? "checked" : ""}>
          <span>Exibir indicador de clique no chão</span>
        </label>
        <label class="setting">
          <input data-setting="autoApproach" type="checkbox" ${s.autoApproach !== false ? "checked" : ""}>
          <span>Aproximar automaticamente quando fora de alcance</span>
        </label>
        <label class="setting">
          <input data-setting="autoPickup" type="checkbox" ${s.autoPickup !== false ? "checked" : ""}>
          <span>Coletar moedas automaticamente</span>
        </label>
        <label class="setting">
          <input data-setting="confirmStats" type="checkbox" ${s.confirmStats !== false ? "checked" : ""}>
          <span>Confirmar distribuição de atributos</span>
        </label>
      </div>
    `;
  } else if (activeTab === "controls") {
    const currentBindings = { ...DEFAULT_KEYBINDINGS, ...(s.keybindings ?? {}) };
    const conflictHtml = conflictNotice
      ? `<div class="binding-conflict-warning">${conflictNotice}</div>`
      : "";

    const bindingsRows = (Object.keys(ACTION_NAMES) as InputAction[])
      .map((action) => {
        const key = currentBindings[action] ?? "—";
        const isRebinding = rebindingAction === action;
        const displayKey = formatKeyBinding(key);
        return `
          <div class="binding-row ${isRebinding ? "rebinding" : ""}">
            <span class="action-label">${ACTION_NAMES[action]}</span>
            <button class="key-bind-btn ${isRebinding ? "active" : ""}" data-action="rebind" data-id="${action}">
              ${isRebinding ? "Pressione uma tecla..." : displayKey}
            </button>
          </div>
        `;
      })
      .join("");

    tabContent = `
      <div class="settings-group controls-group">
        <label class="setting"><span>Abrir radial ao segurar (ms)</span><input data-setting="radialHoldDelay" type="range" min="180" max="220" step="10" value="${s.radialHoldDelay ?? 200}"></label>
        <header class="group-header">
          <h3>Atribuição de Teclas</h3>
          ${gameButton("Restaurar Padrões", "reset-bindings")}
        </header>
        ${conflictHtml}
        <div class="bindings-list">
          ${bindingsRows}
        </div>
      </div>
    `;
  } else if (activeTab === "interface") {
    tabContent = `
      <div class="settings-group">
        <h3>Escala & Exibição</h3>
        <label class="setting">
          <span>Escala da Interface</span>
          <select data-setting="uiScale">
            ${[0.8, 0.9, 1, 1.1, 1.25]
              .map(
                (n) =>
                  `<option value="${n}" ${s.uiScale === n ? "selected" : ""}>${Math.round(n * 100)}%</option>`,
              )
              .join("")}
          </select>
        </label>
        <label class="setting">
          <span>Tamanho do Texto</span>
          <select data-setting="fontScale">
            ${[1, 1.1, 1.2]
              .map(
                (n) =>
                  `<option value="${n}" ${s.fontScale === n ? "selected" : ""}>${Math.round(n * 100)}%</option>`,
              )
              .join("")}
          </select>
        </label>
        <label class="setting">
          <span>Exibição de Experiência</span>
          <select data-setting="xpDisplay">
            <option value="current-required" ${s.xpDisplay === "current-required" || !s.xpDisplay ? "selected" : ""}>Atual / Necessário (8 420 / 12 000)</option>
            <option value="percent" ${s.xpDisplay === "percent" ? "selected" : ""}>Percentual (70.2%)</option>
            <option value="none" ${s.xpDisplay === "none" ? "selected" : ""}>Apenas Barra</option>
          </select>
        </label>
        <label class="setting">
          <span>Estilo do Cursor</span>
          <select data-setting="cursorStyle">
            <option value="classic" ${s.cursorStyle === "classic" || !s.cursorStyle ? "selected" : ""}>Clássico (Espada Artesanal)</option>
            <option value="quill" ${s.cursorStyle === "quill" ? "selected" : ""}>Pena Caligráfica (Quill)</option>
            <option value="rune" ${s.cursorStyle === "rune" ? "selected" : ""}>Rúnico Gravado (Rune)</option>
            <option value="blade" ${s.cursorStyle === "blade" ? "selected" : ""}>Lâmina de Aço (Blade)</option>
          </select>
        </label>
        <label class="setting">
          <span>Indicador de Personagem Ativo</span>
          <select data-setting="characterIndicator">
            <option value="hold" ${s.characterIndicator === "hold" || !s.characterIndicator ? "selected" : ""}>Segurar ALT</option>
            <option value="always" ${s.characterIndicator === "always" ? "selected" : ""}>Sempre Visível</option>
            <option value="off" ${s.characterIndicator === "off" ? "selected" : ""}>Desligado</option>
          </select>
        </label>
        <label class="setting">
          <span>Rótulos de Itens no Chão</span>
          <select data-setting="groundLootLabels">
            <option value="contextual" ${s.groundLootLabels !== "always" && s.groundLootLabels !== "alt" ? "selected" : ""}>Ao Aproximar (Contextual)</option>
            <option value="always" ${s.groundLootLabels === "always" ? "selected" : ""}>Sempre Visíveis</option>
            <option value="alt" ${s.groundLootLabels === "alt" ? "selected" : ""}>Apenas ao Segurar ALT</option>
          </select>
        </label>
        <label class="setting">
          <input data-setting="lootFeed" type="checkbox" ${s.lootFeed !== false ? "checked" : ""}>
          <span>Exibir feed de itens e moedas adquiridos</span>
        </label>
        <label class="setting"><span>Duração do feed (segundos)</span><input data-setting="lootFeedDuration" type="range" min="2" max="6" step="1" value="${s.lootFeedDuration ?? 3}"></label>
        <label class="setting">
          <input data-setting="targetQueueNumbers" type="checkbox" ${s.targetQueueNumbers !== false ? "checked" : ""}>
          <span>Exibir numeração na fila de alvos</span>
        </label>
        <label class="setting">
          <input data-setting="overheadLevel" type="checkbox" ${s.overheadLevel !== false ? "checked" : ""}>
          <span>Exibir nível sobre os personagens e inimigos</span>
        </label>
        <label class="setting">
          <input data-setting="overheadResource" type="checkbox" ${s.overheadResource !== false ? "checked" : ""}>
          <span>Exibir barra de recurso acima dos aliados</span>
        </label>
        <label class="setting">
          <input data-setting="damageNumbers" type="checkbox" ${s.damageNumbers !== false ? "checked" : ""}>
          <span>Exibir números de dano flutuantes</span>
        </label>
      </div>
    `;
  } else if (activeTab === "audio") {
    tabContent = `
      <div class="settings-group">
        <h3>Volumes & Sons</h3>
        <label class="setting">
          <input data-setting="sound" type="checkbox" ${s.sound ? "checked" : ""}>
          <span>Ativar áudio geral</span>
        </label>
        <label class="setting">
          <span>Volume Principal</span>
          <input data-setting="volume" type="range" min="0" max="1" step="0.05" value="${s.volume ?? 0.8}">
        </label>
        <label class="setting">
          <span>Música</span>
          <input data-setting="audioMusic" type="range" min="0" max="1" step="0.05" value="${s.audioMusic ?? 0.7}">
        </label>
        <label class="setting">
          <span>Efeitos Sonoros</span>
          <input data-setting="audioEffects" type="range" min="0" max="1" step="0.05" value="${s.audioEffects ?? 0.8}">
        </label>
        <label class="setting">
          <span>Ambiente do Mundo</span>
          <input data-setting="audioAmbient" type="range" min="0" max="1" step="0.05" value="${s.audioAmbient ?? 0.7}">
        </label>
      </div>
    `;
  } else if (activeTab === "video") {
    tabContent = `
      <div class="settings-group">
        <h3>Gráficos & Desempenho</h3>
        <label class="setting">
          <span>Qualidade dos Efeitos Visuais</span>
          <select data-setting="vfxQuality">
            <option value="high" ${s.vfxQuality === "high" || !s.vfxQuality ? "selected" : ""}>Alta</option>
            <option value="medium" ${s.vfxQuality === "medium" ? "selected" : ""}>Média</option>
            <option value="low" ${s.vfxQuality === "low" ? "selected" : ""}>Econômica</option>
          </select>
        </label>
        <label class="setting">
          <span>Sombras do Mundo</span>
          <select data-setting="worldShadows">
            <option value="high" ${s.worldShadows === "high" || !s.worldShadows ? "selected" : ""}>Detalhada</option>
            <option value="medium" ${s.worldShadows === "medium" ? "selected" : ""}>Normal</option>
            <option value="low" ${s.worldShadows === "low" ? "selected" : ""}>Econômica</option>
          </select>
        </label>
        <label class="setting">
          <input data-setting="screenShake" type="checkbox" ${s.screenShake !== false ? "checked" : ""}>
          <span>Tremor de tela em impactos críticos</span>
        </label>
        <label class="setting">
          <input data-setting="particles" type="checkbox" ${s.particles !== false ? "checked" : ""}>
          <span>Partículas e poeira ambiente</span>
        </label>
        <label class="setting">
          <input data-setting="fpsCounter" type="checkbox" ${s.fpsCounter ? "checked" : ""}>
          <span>Contador de quadros por segundo (FPS)</span>
        </label>
        <div class="setting-action-row">
          ${gameButton("Alternar Tela Cheia (F11)", "fullscreen")}
        </div>
      </div>
    `;
  } else if (activeTab === "accessibility") {
    tabContent = `
      <div class="settings-group">
        <h3>Acessibilidade Visual</h3>
        <label class="setting">
          <input data-setting="hoverHighlight" type="checkbox" ${s.hoverHighlight !== false ? "checked" : ""}>
          <span>Destacar personagens sob o cursor</span>
        </label>
        <label class="setting">
          <span>Intensidade do Destaque</span>
          <select data-setting="highlightIntensity">
            <option value="subtle" ${s.highlightIntensity === "subtle" ? "selected" : ""}>Sutil</option>
            <option value="normal" ${s.highlightIntensity === "normal" || !s.highlightIntensity ? "selected" : ""}>Normal</option>
            <option value="strong" ${s.highlightIntensity === "strong" ? "selected" : ""}>Forte</option>
          </select>
        </label>
        <label class="setting">
          <span>Paleta de Destaque (Inimigo / Aliado)</span>
          <select data-setting="highlightPalette">
            <option value="default" ${s.highlightPalette !== "colorblind" ? "selected" : ""}>Padrão (Vermelho / Verde)</option>
            <option value="colorblind" ${s.highlightPalette === "colorblind" ? "selected" : ""}>Azul / Laranja (Daltônico)</option>
          </select>
        </label>
        <label class="setting">
          <input data-setting="reducedMotion" type="checkbox" ${s.reducedMotion ? "checked" : ""}>
          <span>Reduzir animações e transições da interface</span>
        </label>
      </div>
    `;
  }

  const tabsNav = tabs
    .map(
      (t) =>
        `<button class="settings-tab-btn ${t.id === activeTab ? "active" : ""}" data-action="settings-tab" data-id="${t.id}">
          ${icon(t.iconName)}
          <span>${t.label}</span>
        </button>`,
    )
    .join("");

  return `
    <section class="settings-sheet tabbed">
      <header>
        <small>À sua maneira</small>
        <h2>Configurações</h2>
      </header>
      <div class="settings-layout">
        <nav class="settings-sidebar">
          ${tabsNav}
        </nav>
        <div class="settings-panel-body">
          ${tabContent}
        </div>
      </div>
    </section>
  `;
}
