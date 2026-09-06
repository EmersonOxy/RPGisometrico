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
  cone?: number;
  spread?: number;
  delay?: number;
  executeBelow?: number;
  healthCost?: number;
  healFraction?: number;
  selfStatus?: StatusId;
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
      a("rend","Ferida aberta","⚔","melee",2,1.4,5,16,{status:"bleed",description:"Corte que sangra por 4 s. Pressiona um alvo mesmo durante o reposicionamento."}),
      a("execute","Sentença","⚔","melee",2,1.8,8,25,{executeBelow:.35,windup:.4,description:"Causa o dobro do dano contra inimigos abaixo de 35% da vida."}),
      a("cleave","Arco de ferro","⚔","area",3.5,2.2,6,22,{target:"DIRECTION",cone:100,description:"Varre um cone de 100° diante do cursor. Maior alcance que Círculo de aço, mas exige direção."}),
      a("bloodrush","Pacto rubro","♨","buff",0,0,14,10,{target:"SELF",status:"fury",selfStatus:"leech",duration:5,healthCost:.08,description:"Sacrifica 8% da vida máxima: ganha Ímpeto e recupera 15% do dano direto causado por 5 s."}),
      a("pin","Flecha de inverno","➶","projectile",11,1.3,5,16,{status:"slow",description:"Desacelera um alvo distante; permite manter distância e preparar choque térmico."}),
      a("snare","Laço de ferro","⌘","trap",7,1.2,10,24,{target:"GROUND",status:"stun",radius:1.4,delay:.7,description:"Armadilha estreita que atordoa após 0,7 s. Interrompe grupos concentrados."}),
      a("fan","Leque de flechas","⋙","projectile",7,.65,7,26,{target:"DIRECTION",count:5,spread:.22,description:"Dispara cinco flechas em leque. Cobertura ampla, menor dano em alvo único."}),
      a("snipe","Tiro de ruptura","⇢","projectile",13,3.4,10,30,{status:"armorBreak",windup:.65,description:"Preparação de 0,65 s e longo alcance; reduz a armadura do alvo por 4 s."}),
      a("fireball","Orbe de brasa","♨","projectile",9,1.8,5,20,{status:"burn",tags:["MAGIC","FIRE"],color:0xef985b,description:"Projétil que queima por 4 s. Combine com frio para provocar choque térmico."}),
      a("meteor","Estrela cadente","✦","trap",8,4,12,38,{target:"GROUND",status:"burn",radius:3,delay:1.8,windup:.4,tags:["MAGIC","FIRE"],color:0xef985b,description:"Marca uma área de raio 3; após 1,8 s, explode e queima. Grande impacto com preparação."}),
      a("frostlance","Agulha glacial","❄","projectile",10,1.1,6,24,{pierce:true,status:"slow",tags:["MAGIC","FROST"],color:0xa5daed,description:"Perfura uma linha de inimigos e desacelera todos por 4 s."}),
      a("ward","Véu prismático","⬡","buff",0,0,14,24,{target:"SELF",status:"guard",duration:3,description:"Reduz dano recebido em 65% durante 3 s; proteção curta para terminar uma conjuração."}),
      a("shieldrush","Avanço do bastião","➤","dash",4,1.2,8,22,{target:"DIRECTION",selfStatus:"guard",duration:2,description:"Avança, atordoa o primeiro inimigo atingido e ganha guarda por 2 s."}),
      a("riposte","Postura de resposta","⬡","buff",0,0,12,24,{target:"SELF",status:"guard",selfStatus:"riposte",duration:3,description:"Guarda por 3 s. Devolve 30% do dano base de golpes diretos ao agressor."}),
      a("rally","Fôlego comum","⛨","protect",5,0,18,34,{target:"SELF",duration:2,healFraction:.08,description:"Restaura 8% da vida máxima dos aliados próximos e dá guarda por 2 s."}),
      a("sunder","Quebra-couraça","⚔","melee",2.2,1.4,5,18,{status:"armorBreak",description:"Reduz a armadura de um alvo por 4 s; prepara o foco de dano do grupo."}),
    ].map((x) => [x.id, x]),
  );
