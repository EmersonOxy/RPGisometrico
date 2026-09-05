import type { Engine } from "../core/Engine";
import { icon, portrait } from "./Icons";
import { esc } from "./Components";
import { classRegistry } from "../data/classes";
import { abilityRegistry } from "../data/abilities";
import { statsFor, activeAbilities } from "../progression/Character";
import { xpRequiredForLevel, regionLevel } from "../data/balance";
import { biomeRegistry } from "../data/biomes";
import { sampleBiome } from "../world/generation/WorldGenerator";
import { setHTML } from "./dom";
import { drawMinimap } from "./Minimap";
import { enemyRegistry } from "../data/enemies";
import { bindingLabel, formatKeyBinding, type InputAction } from "../core/InputManager";

export function hudMarkup() {
  return (
    '<div class="hud"><header class="world-header">' +
    icon("compass") +
    '<span>Cinzas do Horizonte</span></header><aside id="party"></aside><aside class="map-frame"><button class="map-open" data-action="map" aria-label="Abrir atlas"><canvas id="minimap" width="180" height="180"></canvas></button><div id="biome"></div><small id="region"></small></aside><div id="target-readout" hidden></div><div id="onboarding"></div><details class="party-orders"><summary>' +
    icon("shield") +
    "Ordens do grupo</summary><div>" +
    [
      ["follow", "Seguir"],
      ["hold", "Manter"],
      ["focus", "Focar"],
      ["passive", "Passivo"],
      ["aggressive", "Agressivo"],
      ["regroup", "Reagrupar"],
    ]
      .map(
        ([id, name]) =>
          '<button data-action="party" data-id="' +
          id +
          '">' +
          name +
          "</button>",
      )
      .join("") +
    '</div></details><div id="tactical" hidden><b>Pausa tática</b><small>Escolha o próximo passo · Espaço para retomar</small></div><footer class="bottom-hud"><div class="wallet" id="wallet"></div><div class="action-belt"><div class="glass-vessel health" id="health-vessel"></div><div class="action-stone"><div id="actions"></div><div class="xp-track"><i id="xp"></i></div></div><div class="glass-vessel resource" id="resource-vessel"></div></div><nav><button data-action="inventory" data-tip="help:inventory">' +
    icon("bag") +
    '<kbd id="nav-kbd-inv">I</kbd></button><button data-action="skills" data-tip="help:skills">' +
    icon("staff") +
    '<kbd id="nav-kbd-skills">K</kbd></button><button data-action="pause" data-tip="help:pause">' +
    icon("compass") +
    '<kbd id="nav-kbd-pause">Esc</kbd></button></nav></footer><div id="debug" hidden></div></div><div id="modal"></div><div id="notice" role="status"></div>'
  );
}

export function refreshHud(e: Engine) {
  const c = e.selected,
    s = statsFor(c);
  let aliveIndex = 0;

  // Sync nav button keys with current bindings
  const invKbd = document.getElementById("nav-kbd-inv");
  if (invKbd) {
    invKbd.textContent = formatKeyBinding(
      e.meta.settings.keybindings?.["INVENTORY"] ?? "KeyI",
    );
  }
  const skillsKbd = document.getElementById("nav-kbd-skills");
  if (skillsKbd) {
    skillsKbd.textContent = formatKeyBinding(
      e.meta.settings.keybindings?.["SKILLS"] ?? "KeyK",
    );
  }
  const pauseKbd = document.getElementById("nav-kbd-pause");
  if (pauseKbd) {
    pauseKbd.textContent = formatKeyBinding(
      e.meta.settings.keybindings?.["PAUSE_MENU"] ?? "Escape",
    );
  }

  setHTML(
    "party",
    e.run.party
      .map((member) => {
        const st = statsFor(member),
          selected = member.id === e.run.selected,
          commandSelected =
            e.run.commandSelection?.includes(member.id) ?? false,
          index = aliveIndex;
        if (member.alive) aliveIndex++;
        const currentOrder = member.partyOrder ?? e.run.command;
        return (
          '<div class="party-slot"><button class="party-portrait ' +
          (selected ? "selected " : "") +
          (commandSelected ? "command-selected " : "") +
          (!member.alive ? "fallen " : "") +
          (member.hp / st.health < 0.3 ? "wounded " : "") +
          '" data-action="select" data-id="' +
          index +
          '" ' +
          (!member.alive ? "disabled" : "") +
          ' aria-label="' +
          esc(member.name) +
          (selected ? " controlado" : "") +
          (commandSelected ? " sob comando" : "") +
          '"><span class="portrait-window">' +
          portrait(member.classId) +
          '</span><span class="portrait-body"><b>' +
          member.name +
          "</b><small>" +
          (member.alive ? "Nível " + member.level : "Caído") +
          '</small><span class="bar"><i style="width:' +
          Math.max(0, (member.hp / st.health) * 100) +
          '%"></i></span><span class="bar resource"><i style="width:' +
          member.resource +
          '%"></i></span></span><span class="portrait-number">' +
          (member.alive
            ? formatKeyBinding(
                e.meta.settings.keybindings?.[`PARTY_${index + 1}` as InputAction] ??
                  `Digit${index + 1}`,
              )
            : "×") +
          "</span>" +
          (selected ? '<span class="control-ribbon"></span>' : "") +
          (commandSelected ? '<span class="command-ribbon"></span>' : "") +
          "</button>" +
          (member.alive
            ? '<button class="member-order-btn" data-action="member-order" data-id="' +
              member.id +
              '" data-tip="order:' +
              currentOrder +
              '" aria-label="Ordem: ' +
              currentOrder +
              '">' +
              icon(currentOrder) +
              "</button>"
            : "") +
          "</div>"
        );
      })
      .join(""),
  );

  setHTML(
    "wallet",
    icon("coin") +
      "<b>" +
      e.meta.silver +
      "</b><span>prata</span>" +
      icon("fortune") +
      "<b>" +
      e.meta.gold +
      "</b><span>ouro</span><small>" +
      e.saveStatus +
      "</small>",
  );

  setHTML(
    "health-vessel",
    '<div class="vessel-liquid" style="height:' +
      Math.max(0, (c.hp / s.health) * 100) +
      '%"></div>' +
      icon("heart") +
      "<b>" +
      Math.ceil(c.hp) +
      "</b><small>" +
      Math.ceil(s.health) +
      "</small>",
  );

  setHTML(
    "resource-vessel",
    '<div class="vessel-liquid" style="height:' +
      c.resource +
      '%"></div>' +
      icon(c.classId) +
      "<b>" +
      Math.floor(c.resource) +
      "</b><small>" +
      classRegistry[c.classId].resource +
      "</small>",
  );

  setHTML(
    "actions",
    [-1, 0, 1, 2, 3]
      .map((slot) => {
        const a =
            abilityRegistry[
              slot < 0
                ? classRegistry[c.classId].basic
                : activeAbilities(c)[slot]
            ],
          cd = c.cooldowns[a.id] ?? 0,
          state = e.combat.availability(c, slot),
          percent = Math.min(100, (cd / a.cooldown) * 100);

        const keyDisplay =
          slot < 0
            ? "M2"
            : bindingLabel(e.meta.settings, `ABILITY_${slot + 1}` as InputAction);

        return (
          '<button class="ability ' +
          state +
          (e.combat.castingSlot(c.id) === slot ? " casting" : "") +
          (e.combat.buffer.action?.character === c.id && e.combat.buffer.action.slot === slot ? " queued" : "") +
          (slot >= 0 && c.jewels.length ? " gem-modified" : "") +
          (slot < 0 ? " basic-attack" : "") +
          '" data-action="ability" data-id="' +
          slot +
          '" data-tip="ability:' +
          a.id +
          '" aria-label="' +
          (slot < 0 ? "Ataque Básico: " : "") +
          a.name +
          '"><span class="skill-face">' +
          icon(a.id) +
          '</span><span class="radial-cooldown" style="--cooldown:' +
          percent +
          "%;opacity:" +
          (cd > 0 ? 1 : 0) +
          '"></span><kbd>' +
          keyDisplay +
          '</kbd><span class="cooldown-number">' +
          (cd > 0.05 ? cd.toFixed(1) : "") +
          "</span>" +
          (state === "resource" ? '<i class="state-mark">!</i>' : "") +
          "</button>"
        );
      })
      .join(""),
  );
  const xpElem = document.getElementById("xp") as HTMLElement;
  const reqXp = xpRequiredForLevel(c.level);
  const xpPercent = Math.min(100, (c.xp / reqXp) * 100);
  if (xpElem) {
    xpElem.style.width = xpPercent + "%";
    const xpTrack = xpElem.parentElement;
    if (xpTrack) {
      let xpText = xpTrack.querySelector(".xp-text") as HTMLElement;
      if (!xpText) {
        xpText = document.createElement("span");
        xpText.className = "xp-text";
        xpTrack.appendChild(xpText);
      }
      const mode = e.meta.settings.xpDisplay ?? "current-required";
      if (mode === "none") {
        xpText.textContent = "";
      } else if (mode === "percent") {
        xpText.textContent = `${xpPercent.toFixed(1)}%`;
      } else {
        xpText.textContent = `${c.xp} / ${reqXp}`;
      }
    }
  }
  const biome = biomeRegistry[sampleBiome(e.run.seed, c.x, c.y)];
  document.getElementById("biome")!.textContent = biome.name;
  document.getElementById("region")!.textContent =
    "Região " + regionLevel(c.x, c.y, biome.danger);
  const minimapCanvas = document.getElementById("minimap") as HTMLCanvasElement;
  if (minimapCanvas) {
    const mmSize = e.meta.settings.minimapSize ?? 180;
    const mmOpacity = e.meta.settings.minimapOpacity ?? 0.9;
    if (minimapCanvas.width !== mmSize) {
      minimapCanvas.width = mmSize;
      minimapCanvas.height = mmSize;
    }
    minimapCanvas.style.opacity = String(mmOpacity);
    drawMinimap(minimapCanvas, e);
  }
  document.getElementById("tactical")!.hidden = !e.tactical;
  document.querySelector("#tactical small")!.textContent = `Escolha o próximo passo · ${bindingLabel(e.meta.settings, "TACTICAL")} para retomar`;
  const target = e.enemies.get(
      e.hovered?.kind === "enemy" ? e.hovered.id : (c.target ?? ""),
    ),
    readout = document.getElementById("target-readout")!;
  readout.hidden = !target;
  if (target)
    setHTML(
      "target-readout",
      "<b>" +
        esc(enemyRegistry[target.definition].name) +
        "</b><small>Nível " +
        target.level +
        (target.elite
          ? " · Elite · " +
            {
              swift: "Veloz",
              armored: "Blindado",
              regenerating: "Regenerador",
            }[target.modifier]
          : "") +
        '</small><span class="bar"><i style="width:' +
        (target.hp / target.maxHp) * 100 +
        '%"></i></span>',
    );
  const invKey = formatKeyBinding(
    e.meta.settings.keybindings?.["INVENTORY"] ?? "KeyI",
  );
  const a1 = formatKeyBinding(
    e.meta.settings.keybindings?.["ABILITY_1"] ?? "KeyQ",
  );
  const a2 = formatKeyBinding(
    e.meta.settings.keybindings?.["ABILITY_2"] ?? "KeyW",
  );
  const a3 = formatKeyBinding(
    e.meta.settings.keybindings?.["ABILITY_3"] ?? "KeyE",
  );
  const a4 = formatKeyBinding(
    e.meta.settings.keybindings?.["ABILITY_4"] ?? "KeyR",
  );

  setHTML(
    "onboarding",
    !e.meta.tutorials.move
      ? `<p>${e.meta.settings.movementMode === "wasd" ? "WASD para mover" : "Clique com o botão esquerdo para mover"} · Botão direito para ataque básico.</p>`
      : !e.meta.tutorials.inventory && e.run.inventory.length
        ? `<p>Um novo achado · ${invKey} abre sua mochila.</p>`
        : !e.meta.tutorials.skill && e.run.stats.kills === 0
          ? `<p>${a1} ${a2} ${a3} ${a4} · disciplinas · Mouse 2 para ataque básico.</p>`
          : "",
  );
}
