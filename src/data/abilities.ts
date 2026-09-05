import type { StatusId } from "../core/types";
export type Handler =
  | "melee"
  | "projectile"
  | "area"
  | "dash"
  | "buff"
  | "chain"
  | "trap"
  | "taunt"
  | "protect";
export type TargetMode =
  | "SELF"
  | "UNIT"
  | "POINT"
  | "DIRECTION"
  | "CIRCLE"
  | "CONE"
  | "LINE"
  | "AOE_AROUND_SELF";

export interface AbilityDefinition {
  id: string;
  name: string;
  icon: string;
  handler: Handler;
  target: "SELF" | "TARGET" | "GROUND" | "DIRECTION" | "AOE_AROUND_SELF";
  targetMode?: TargetMode;
  radius?: number;
  angle?: number;
  width?: number;
  projectileWidth?: number;
  minRange?: number;
  maxRange?: number;
  requiresTarget?: boolean;
  canTargetEnemies?: boolean;
  canTargetAllies?: boolean;
  canTargetSelf?: boolean;
  canTargetGround?: boolean;
  requiresLineOfSight?: boolean;
  castBehavior?: "instant" | "channel" | "cast_time";
  tags: string[];
  level: number;
  cooldown: number;
  cost: number;
  range: number;
  damage: number;
  windup: number;
  activeTime: number;
  recovery: number;
  canMoveDuringCast: boolean;
  canRotateDuringCast: boolean;
  canCancelRecovery: boolean;
  inputBufferWindow: number;
  color: number;
  status?: StatusId;
  duration?: number;
  count?: number;
  pierce?: boolean;
  jewelRequirement?: string;
  description: string;
}
const a = (
  id: string,
  name: string,
  icon: string,
  handler: Handler,
  range: number,
  damage: number,
  cooldown: number,
  cost: number,
  extra: Partial<AbilityDefinition> = {},
): AbilityDefinition => {
  const target = extra.target ?? "TARGET";
  let targetMode: TargetMode = "UNIT";
  if (target === "SELF") targetMode = "SELF";
  else if (target === "GROUND") targetMode = "CIRCLE";
  else if (target === "DIRECTION") targetMode = "DIRECTION";
  else if (target === "AOE_AROUND_SELF") targetMode = "AOE_AROUND_SELF";

  return {
    id,
    name,
    icon,
    handler,
    range,
    damage,
    cooldown,
    cost,
    target,
    targetMode: extra.targetMode ?? targetMode,
    radius: extra.radius ?? (target === "AOE_AROUND_SELF" ? range : target === "GROUND" ? 2.2 : undefined),
    requiresTarget: extra.requiresTarget ?? (target === "TARGET"),
    canTargetEnemies: extra.canTargetEnemies ?? (target === "TARGET" || target === "DIRECTION" || target === "GROUND" || target === "AOE_AROUND_SELF"),
    canTargetAllies: extra.canTargetAllies ?? false,
    canTargetSelf: extra.canTargetSelf ?? (target === "SELF" || target === "AOE_AROUND_SELF"),
    canTargetGround: extra.canTargetGround ?? (target === "GROUND"),
    tags: ["PHYSICAL"],
    level: 1,
    windup: 0.09,
    activeTime: 0.04,
    recovery: 0.1,
    canMoveDuringCast: handler === "dash" || handler === "buff",
    canRotateDuringCast: true,
    canCancelRecovery: true,
    inputBufferWindow: 0.15,
    color: 0xe4d4a0,
    description: name,
    ...extra,
  };
};
export const abilityRegistry: Record<string, AbilityDefinition> =
  Object.fromEntries(
    [
      a("slash", "Corte", "⚔", "melee", 1.65, 1, 0.65, 0),
      a("arrow", "Flecha", "➶", "projectile", 7, 1, 0.8, 0),
      a("bolt", "Centelha", "✦", "projectile", 6, 1, 0.85, 0, {
        tags: ["ARCANE"],
        color: 0xaabaff,
      }),
      a("bash", "Escudada", "⛨", "melee", 1.7, 1, 0.9, 0),
      a("heavy", "Ruptura", "╱", "melee", 2, 2.4, 4, 18, {
        status: "stun",
        windup: 0.3,
        description: "Golpe pesado; atordoa e rompe a formação.",
      }),
      a("charge", "Investida", "➤", "dash", 5, 1.7, 6, 20, {
        target: "DIRECTION",
        description: "Avança até o alvo, sem atravessar obstáculos.",
      }),
      a("whirl", "Círculo de aço", "✺", "area", 2.8, 1.8, 7, 25, {
        target: "AOE_AROUND_SELF",
        tags: ["MELEE", "AOE"],
        description: "Atinge todos os inimigos ao redor.",
      }),
      a("fury", "Ímpeto rubro", "♨", "buff", 0, 0, 12, 24, {
        target: "SELF",
        status: "fury",
        duration: 5,
        description: "Acelera movimento e ataques por 5 segundos.",
      }),
      a("pierce", "Linha certeira", "⇢", "projectile", 10, 2, 4, 18, {
        pierce: true,
        tags: ["PROJECTILE"],
        description: "Flecha que atravessa os inimigos na trajetória.",
      }),
      a("volley", "Três presságios", "⋙", "projectile", 8, 0.9, 6, 24, {
        count: 3,
        description: "Três projéteis em sequência.",
      }),
      a("retreat", "Passo evasivo", "↶", "dash", 4, 0, 7, 16, {
        target: "DIRECTION",
        description: "Recua na direção oposta ao cursor.",
      }),
      a("trap", "Laço de espinhos", "⌘", "trap", 6, 1.8, 8, 22, {
        target: "GROUND",
        status: "slow",
          description: "Armadilha: explode após breve preparação e desacelera. Em alvo queimando, ativa choque térmico.",
      }),
      a("arcane", "Lança astral", "✧", "projectile", 9, 2.7, 4, 22, {
        color: 0xb5a3eb,
        tags: ["MAGIC", "ARCANE"],
        description: "Projétil arcano concentrado.",
      }),
      a("nova", "Coroa de inverno", "❄", "area", 4, 1.5, 7, 25, {
        color: 0xa5daed,
        status: "slow",
        target: "AOE_AROUND_SELF",
        tags: ["FROST", "AOE"],
          description: "Nova ao redor que reduz movimento inimigo. Em alvo queimando, ativa choque térmico.",
      }),
      a("chain", "Fio da tormenta", "ϟ", "chain", 7, 1.7, 6, 28, {
        color: 0xc5ccff,
        tags: ["LIGHTNING"],
        count: 4,
        description: "Salta entre até quatro inimigos próximos.",
      }),
      a("blink", "Dobra breve", "◇", "dash", 5, 0, 7, 20, {
        target: "GROUND",
        color: 0xc5b3f0,
        description: "Reposiciona com rapidez por um caminho livre.",
      }),
      a("taunt", "Desafio", "⚑", "taunt", 5, 0.2, 7, 18, {
        target: "AOE_AROUND_SELF",
        description: "Atrai a ameaça de todos os inimigos próximos.",
      }),
      a("guard", "Guarda de pedra", "⬡", "buff", 0, 0, 9, 20, {
        target: "SELF",
        status: "guard",
        duration: 5,
        description: "Reduz em 65% o dano recebido por 5 segundos.",
      }),
      a("slam", "Abalo", "▱", "area", 3, 1.6, 6, 24, {
        target: "AOE_AROUND_SELF",
        status: "stun",
        windup: 0.35,
        description: "Impacto em área com atordoamento.",
      }),
      a("protect", "Pacto de abrigo", "⛨", "protect", 6, 0, 12, 30, {
        target: "SELF",
        duration: 4,
        description: "Concede guarda aos aliados próximos.",
      }),
      a("flame", "Talho de brasa", "♨", "melee", 2.6, 2.8, 4, 18, {
        jewelRequirement: "fire",
        tags: ["MELEE", "PHYSICAL", "FIRE"],
        status: "burn",
        color: 0xf4a05c,
        windup: 0.25,
        description:
          "Fire Jewel: corte físico + fogo e queimadura por 4 segundos. Em alvo lento, ativa choque térmico: consome ambos os efeitos, +35% de dano no golpe e metade da armadura por 2 s.",
      }),
    ].map((x) => [x.id, x]),
  );
