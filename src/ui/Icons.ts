import { playerSpriteConfig } from "../rendering/PlayerSpriteConfig";
import type { ClassId } from "../core/types";

const paths: Record<string, string> = {
  sword:
    '<path fill="#b4c1b4" d="M44 5 49 6 47 18 23 45 18 40z"/><path fill="#edf0d8" d="m44 5-1 12-23 25-2-2z"/><path stroke="#d0ac6c" stroke-width="5" d="m12 34 18 17"/><path stroke="#786047" stroke-width="6" d="m18 46-9 10"/><path stroke="#d0ac6c" stroke-width="4" d="m5 51 8 8"/>',
  bow: '<path d="M18 6C57 22 52 42 14 58" fill="none" stroke="#ac8355" stroke-width="6"/><path d="m18 6 13 26-17 26" fill="none" stroke="#e4d7ac" stroke-width="1.5"/><path d="m10 45 41-31m-13 1 13-1-3 12" fill="none" stroke="#bfcac1" stroke-width="3"/>',
  staff:
    '<path d="m17 59 20-40" stroke="#927656" stroke-width="6"/><path fill="#a2bfd0" stroke="#dcc693" stroke-width="2" d="m35 4 14 8-2 14-14 4-8-12z"/><path fill="#e4e4cf" d="m35 6-5 12 15-4z"/><path d="m25 29 14 7" stroke="#d0ad70" stroke-width="3"/>',
  shield:
    '<path fill="#667d72" stroke="#bdac82" stroke-width="3" d="M11 10 31 5 53 12 50 40 32 58 14 42z"/><path fill="#3c514b" d="m32 9 17 5-3 24-14 15z"/><path d="m31 14 1 31m-12-17 22 1" stroke="#c7bea1" stroke-width="3"/>',
  armor:
    '<path fill="#899984" stroke="#b8bda3" stroke-width="2" d="m20 8-12 8 6 16 7-4-4 27 29 1-4-27 7 4 7-17-14-8-3 8-13 1z"/><path fill="#566b5c" d="m30 20 11-4-1 29 5 11-14-1z"/><path d="m21 35 20 1m-18 7 17 1" stroke="#b7aa7d" stroke-width="2"/>',
  ring: '<ellipse cx="31" cy="39" rx="17" ry="19" fill="none" stroke="#c5a66c" stroke-width="6"/><path d="m21 22 2-13 15-3 9 13-12 14z" fill="#89a7a5" stroke="#dccb98" stroke-width="2"/><path fill="#d0dfd3" d="m24 11 10-3-4 18z"/>',
  potion:
    '<path fill="#557a66" stroke="#adbdac" stroke-width="2" d="m25 8 15 0-1 17c21 25 13 32-8 33-19 0-29-10-6-33z"/><path fill="#b0ca9c" d="M20 36c13 4 21-1 28 0l3 11c-8 14-30 10-35 0z"/><path stroke="#ad8758" stroke-width="7" d="m23 9 18 0"/><path stroke="#dce5c8" stroke-width="2" d="m22 33-4 10"/>',
  fire: '<path fill="#714833" d="M10 43c-2-13 13-24 15-36 9 4 10 19 15 22 2-9 3-11 4-14 9 18 17 26 9 38-11 15-36 10-43-10z"/><path fill="#c58253" d="M19 42c-1-9 8-15 8-24 9 9 4 16 13 18l5-8c10 22-2 29-12 29S19 52 19 42z"/><path fill="#e6c28a" d="m30 33 11 15-4 10-10-3-3-10z"/>',
  frost:
    '<g stroke="#b3d6d9" stroke-width="3" fill="none"><path d="M32 5v54M8 18l48 28M8 46l48-28M23 10l9 8 9-8m-18 44 9-8 9 8M8 28l12 0-2-13m39 21H45l2 13M9 37l11 2-3 11m38-23-11-2 3-10"/></g>',
  storm:
    '<path d="m36 3-24 33 20-4-7 29 28-38-20 5z" fill="#b7b1d0" stroke="#e0d5b6" stroke-width="2"/>',
  stone:
    '<path d="m8 35 8-19 25-8 15 20-5 25-30 5z" fill="#919d85" stroke="#c0bfa2" stroke-width="2"/><path d="m16 16 18 17 22-5M34 33l-4 23" fill="none" stroke="#4c665c" stroke-width="3"/>',
  fortune:
    '<path d="m32 4 20 14-4 29-16 13-19-16-3-28z" fill="#bba66b" stroke="#e1d29c" stroke-width="2"/><path fill="#f0dfab" d="m32 8-9 20 9 18 11-18z"/><path d="m17 35 15 11 14-11" fill="none" stroke="#796537" stroke-width="3"/>',
  map: '<path d="m5 13 17-7 21 8 16-7-1 45-17 6-20-8-16 8z" fill="#bcbda0" stroke="#dfd7b4" stroke-width="2"/><path d="m22 7-1 43m22-36-2 43M11 39l10-11 12 12 15-17" stroke="#647b66" fill="none" stroke-width="2"/>',
  bag: '<path d="M15 22c-3-22 35-22 34 1M11 23l42-1 4 31-9 6-33-1-8-7z" fill="#675842" stroke="#b5a27a" stroke-width="3"/><path fill="#8b7651" d="m13 23 37-1-5 16-27 1z"/><path d="M32 32v14" stroke="#d9c492" stroke-width="5"/>',
  compass:
    '<circle cx="32" cy="32" r="24" fill="none" stroke="#c1b38b" stroke-width="2"/><path fill="#d8c998" d="m32 5 7 29-7 25-7-25z"/><path fill="#6e8d7b" d="m32 32 7 2-7 25z"/><path stroke="#bbae83" d="M4 32h16m24 0h16"/>',
  coin: '<ellipse cx="32" cy="33" rx="23" ry="22" fill="#a79870" stroke="#dac995" stroke-width="3"/><ellipse cx="32" cy="32" rx="16" ry="15" fill="none" stroke="#645f43" stroke-width="2"/><path d="m32 20 7 12-7 12-7-12z" fill="#e1d6ad"/>',
  merchant:
    '<path fill="#afa587" d="m7 24 17-15 25 3 9 16z"/><path fill="#607966" d="m17 16 8-7 8 2-9 15zM39 12l8 1 10 15-12-1z"/><path d="M11 27v28m42-26v26M14 42h35v15H14z" fill="#756448" stroke="#b6a582" stroke-width="3"/>',
  shrine:
    '<path d="m20 16 12-11 13 13-2 33-25 1z" fill="#8d9d8b" stroke="#c6c9a7" stroke-width="2"/><circle cx="32" cy="28" r="7" stroke="#e0d4a0" stroke-width="2" fill="none"/><path d="m10 52 22-8 22 10-22 8z" fill="#647d6c"/>',
  chest:
    '<path d="m8 25 28-10 22 14-1 25-29 9-20-14z" fill="#776243" stroke="#c1ab79" stroke-width="2"/><path fill="#bba16a" d="m9 25 27-10 21 14-29 11z"/><path d="m22 30 1 28m22-37-1 37" stroke="#deca97" stroke-width="3"/><path fill="#e9d59c" d="m33 39 8-2v10l-8 2z"/>',
  heart:
    '<path fill="#b77568" stroke="#dbb29a" stroke-width="2" d="M32 15C9-7-9 25 32 58 74 24 54-7 32 15z"/>',
  eye: '<path d="M5 32q27-30 54 0-27 29-54 0z" fill="none" stroke="#bcc5a9" stroke-width="3"/><circle cx="32" cy="32" r="9" fill="#b4bd99"/>',
  lock: '<path d="M20 30V18c0-20 26-20 25 0v12" fill="none" stroke="#b8b797" stroke-width="4"/><path fill="#7c8270" stroke="#b6b899" stroke-width="2" d="M14 28h37l-2 30H16z"/><path stroke="#e2d4ad" stroke-width="3" d="M32 38v9"/>',
  cross:
    '<path d="m16 15 32 34M48 15 16 49" stroke="currentColor" stroke-width="3" fill="none"/>',
  target:
    '<circle cx="32" cy="32" r="17" fill="none" stroke="#c9b685" stroke-width="2"/><path d="M32 5v18m0 18v18M5 32h18m18 0h18" stroke="#c9b685" stroke-width="3"/>',
  boot: '<path d="m20 6 19 2-3 28 19 9-2 13-36 0-7-9 9-20z" fill="#8b785c" stroke="#c1b18c" stroke-width="2"/><path d="m22 17 12 1m-12 8 11 1M15 50h39" stroke="#c9bea0" stroke-width="2"/>',
  anchor:
    '<path d="M32 14v34M20 32c3 13 21 13 24 0M26 12a6 6 0 1 1 12 0 6 6 0 0 1-12 0zM14 26h36" fill="none" stroke="#bdac82" stroke-width="3.5" stroke-linecap="round"/>',
  hand:
    '<path d="M22 46V25a3 3 0 0 1 6 0v16M28 21a3 3 0 0 1 6 0v20M34 23a3 3 0 0 1 6 0v18M40 28a3 3 0 0 1 6 0v14c0 9-7 14-15 14H24" fill="none" stroke="#90b898" stroke-width="3" stroke-linecap="round"/>',
  ruin:
    '<path d="M8 54h48v4H8z" fill="#425042" stroke="#8f9b84" stroke-width="2"/><path d="M14 24h10v30H14z" fill="#75826f" stroke="#b8c0a8" stroke-width="2"/><path d="M40 18h10v36H40z" fill="#889680" stroke="#c2caa8" stroke-width="2"/><path d="M10 18h18v6H10z" fill="#9da88e" stroke="#c8d0b2" stroke-width="2"/><path d="M36 12h18v6H36z" fill="#a4b094" stroke="#d0d8be" stroke-width="2"/><path d="m28 14 10-6 4 6-14 4z" fill="#67735f" stroke="#9ba88e" stroke-width="2"/><path d="m19 28 4 10m-3-4 5 1" stroke="#4d5a48" stroke-width="2"/>',
  nest:
    '<ellipse cx="32" cy="38" rx="26" ry="18" fill="#32221b" stroke="#704e3b" stroke-width="3"/><ellipse cx="32" cy="36" rx="16" ry="10" fill="#1b120e"/><path d="m10 32 12 10-8 6m36-16-11 11 9 5M20 22l8 12m16-12-8 12" stroke="#8d6447" stroke-width="3" stroke-linecap="round"/><path d="m27 34 3-5 5 1 2 5-4 3z" fill="#ded4b0" stroke="#aa9c7c" stroke-width="1.5"/><circle cx="37" cy="36" r="3.5" fill="#ded4b0" stroke="#aa9c7c" stroke-width="1.5"/><path d="m16 44 32-4" stroke="#c0946b" stroke-width="2"/>',
  elite:
    '<path d="m32 6 22 18-7 32-30 0-7-32z" fill="#361a1a" stroke="#8a3028" stroke-width="2.5"/><path d="m32 10 16 14-5 24-22 0-5-24z" fill="#582420" stroke="#df7c6e" stroke-width="2"/><path d="m20 18 12 10 12-10M32 20v24" stroke="#f0d39c" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="18" r="4.5" fill="#ffd97d" stroke="#8a3028" stroke-width="1.5"/><path d="M12 28 6 24 9 14l11 10m24 4 6-4-3-10-11 10" fill="#2a1414" stroke="#c75040" stroke-width="2"/>',
};
const aliases: Record<string, string> = {
  follow: "boot",
  hold: "anchor",
  focus: "target",
  passive: "hand",
  aggressive: "sword",
  fighter: "sword",
  shooter: "bow",
  mage: "staff",
  tank: "shield",
  weapon: "sword",
  offhand: "shield",
  coat: "armor",
  slash: "sword",
  heavy: "sword",
  charge: "boot",
  whirl: "sword",
  fury: "fire",
  arrow: "bow",
  pierce: "bow",
  volley: "bow",
  retreat: "boot",
  trap: "target",
  bolt: "staff",
  arcane: "staff",
  nova: "frost",
  chain: "storm",
  blink: "compass",
  taunt: "shield",
  guard: "shield",
  slam: "stone",
  protect: "shield",
  bash: "shield",
  flame: "fire",
  momentum: "sword",
  duelist: "sword",
  tenacity: "armor",
  precision: "target",
  hunter: "bow",
  lightfoot: "boot",
  affinity: "staff",
  conductor: "storm",
  concentration: "eye",
  fortitude: "heart",
  guardian: "shield",
  immovable: "stone",
  mastery: "compass",
  core: "compass",
  danger: "storm",
  marker: "compass",
  close: "cross",
  move: "boot",
  regroup: "compass",
};
export function icon(id: string, cls = "") {
  return (
    '<svg class="game-icon ' +
    cls +
    '" viewBox="0 0 64 64" aria-hidden="true">' +
    (paths[aliases[id] ?? id] ?? paths.compass) +
    "</svg>"
  );
}
export function gem(id: string) {
  return (
    '<svg class="game-icon gem-art" viewBox="0 0 64 64" aria-hidden="true"><path d="m32 3 25 15-1 30-24 14L7 48 8 17z" fill="#303c35" stroke="#9d9677" stroke-width="3"/><g transform="translate(10 9) scale(.7)">' +
    (paths[id] ?? paths.stone) +
    '</g><path d="m13 18 15-8M49 48l-14 8" stroke="#c1bba0" stroke-width="2" opacity=".6"/></svg>'
  );
}
let portraitClipId = 0;
export function portrait(id: string, large = false) {
  if (Object.prototype.hasOwnProperty.call(playerSpriteConfig, id)) {
    const p = playerSpriteConfig[id as ClassId].portrait;
    const [x, y, width, height] = p.viewBox.split(/\s+/).map(Number);
    const clipId = `portrait-frame-${++portraitClipId}`;
    // viewBox sets the camera; it does not clip the sheet to that rectangle
    // when the CSS viewport has a different aspect ratio.
    return `<svg class="hero-portrait ${large ? "large" : ""}" viewBox="${p.viewBox}" aria-hidden="true"><defs><clipPath id="${clipId}" clipPathUnits="userSpaceOnUse"><rect x="${x}" y="${y}" width="${width}" height="${height}"/></clipPath></defs><image href="${p.url}" width="${p.width}" height="${p.height}" clip-path="url(#${clipId})"/></svg>`;
  }
  const colors: Record<string, string> = {
      fighter: "#b47b5b",
      shooter: "#80986c",
      mage: "#9294b6",
      tank: "#a39b77",
    },
    color = colors[id] ?? colors.fighter;
  return (
    '<svg class="hero-portrait ' +
    (large ? "large" : "") +
    '" viewBox="0 0 160 270" aria-hidden="true"><ellipse cx="80" cy="245" rx="52" ry="14" fill="#17281e" opacity=".3"/><path d="m56 155-5 83 18 9 13-78 7 80 21-5-5-89" fill="#3e5145" stroke="#253b30" stroke-width="3"/><path d="m47 63 57-4 17 127-77-2z" fill="' +
    color +
    '" stroke="#384c3e" stroke-width="3"/><path d="m51 65 20 24-9 91-18 3z" fill="#293e35" opacity=".45"/><path d="m49 76-17 70 15 6 21-65m38-12 22 63-11 10-30-59" fill="' +
    color +
    '" stroke="#384c3e" stroke-width="3"/><path d="m59 65-7-31 15-17 28 3 9 17-10 29-19 6z" fill="#bcac89" stroke="#4c5540" stroke-width="3"/><path d="m50 35 6-23 38 1 14 26-27-8-30 10z" fill="#4a5549"/><path d="m83 42 6 0m-13 16 13-2" stroke="#42503f" stroke-width="2"/><path d="m46 121 62 1" stroke="#d0b57f" stroke-width="7"/><path d="m71 117 14 0v9H71z" fill="#70664a"/><g transform="translate(' +
    (id === "tank" ? "78 100" : "98 118") +
    ") rotate(-15) scale(" +
    (id === "tank" ? "1.1" : "0.9") +
    ')">' +
    (paths[aliases[id] ?? id] ?? paths.sword) +
    '</g><path d="m51 238 19 1 1 14-28-3zm40 3 20-3 8 13-28 3" fill="#293c32"/></svg>'
  );
}
