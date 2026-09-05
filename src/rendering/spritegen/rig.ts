import type { DirectionIndex, PoseDefinition, Vec } from "./types";
import { MASTER_CENTER_X as CX, MASTER_GROUND_Y as GY } from "./types";

const v = (x: number, y: number): Vec => ({ x: Math.round(x), y: Math.round(y) });

/**
 * Rig modular do humanoide.
 * Autora 5 poses-chave (S, N, E, SE, NE); SW/W/NW espelham SE/E/NE,
 * o que é geometricamente coerente (mão da espada troca de lado na tela,
 * como um corpo simétrico real ao girar).
 * Respiração do idle: b em [-1..1], pés plantados (sem deslocamento).
 */
export function breathe(t: number): number {
  return Math.sin((t / 6) * Math.PI * 2);
}

interface KeyPose {
  head: Vec; neck: Vec; shoC: Vec; hipC: Vec;
  f: { s: Vec; e: Vec; h: Vec; hp: Vec; k: Vec; ft: Vec };
  b: { s: Vec; e: Vec; h: Vec; hp: Vec; k: Vec; ft: Vec };
  face: PoseDefinition["faceMode"]; prof: -1 | 0 | 1;
  swordTip: Vec; swordBase: Vec; swordFront: boolean;
}

function keyS(): KeyPose {
  return {
    head: v(CX, 93), neck: v(CX, 116), shoC: v(CX, 126), hipC: v(CX, 170),
    f: { s: v(160, 128), e: v(167, 156), h: v(169, 174), hp: v(146, 172), k: v(148, 200), ft: v(150, 230) },
    b: { s: v(104, 128), e: v(97, 158), h: v(95, 176), hp: v(118, 172), k: v(116, 200), ft: v(114, 230) },
    face: "front", prof: 0,
    swordTip: v(191, 224), swordBase: v(169, 174), swordFront: true,
  };
}

function keyN(): KeyPose {
  return {
    head: v(CX, 93), neck: v(CX, 116), shoC: v(CX, 126), hipC: v(CX, 170),
    f: { s: v(104, 128), e: v(97, 158), h: v(96, 176), hp: v(118, 172), k: v(116, 200), ft: v(114, 230) },
    b: { s: v(160, 128), e: v(167, 156), h: v(168, 174), hp: v(146, 172), k: v(148, 200), ft: v(150, 230) },
    face: "back", prof: 0,
    swordTip: v(189, 222), swordBase: v(168, 174), swordFront: false,
  };
}

function keyE(): KeyPose {
  return {
    head: v(CX + 8, 93), neck: v(CX + 4, 116), shoC: v(CX + 2, 126), hipC: v(CX, 170),
    f: { s: v(148, 128), e: v(157, 156), h: v(161, 172), hp: v(142, 172), k: v(146, 200), ft: v(150, 230) },
    b: { s: v(118, 130), e: v(111, 158), h: v(109, 174), hp: v(122, 172), k: v(120, 200), ft: v(116, 230) },
    face: "profile", prof: 1,
    swordTip: v(187, 221), swordBase: v(161, 172), swordFront: true,
  };
}

function keySE(): KeyPose {
  return {
    head: v(CX + 5, 93), neck: v(CX + 2, 116), shoC: v(CX + 1, 126), hipC: v(CX, 170),
    f: { s: v(156, 128), e: v(164, 156), h: v(167, 173), hp: v(144, 172), k: v(147, 200), ft: v(149, 230) },
    b: { s: v(108, 129), e: v(101, 157), h: v(99, 175), hp: v(120, 172), k: v(118, 200), ft: v(115, 230) },
    face: "front34", prof: 1,
    swordTip: v(190, 223), swordBase: v(167, 173), swordFront: true,
  };
}

function keyNE(): KeyPose {
  return {
    head: v(CX + 5, 93), neck: v(CX + 2, 116), shoC: v(CX + 1, 126), hipC: v(CX, 170),
    f: { s: v(108, 129), e: v(101, 157), h: v(100, 175), hp: v(120, 172), k: v(118, 200), ft: v(115, 230) },
    b: { s: v(156, 128), e: v(164, 156), h: v(165, 173), hp: v(144, 172), k: v(147, 200), ft: v(149, 230) },
    face: "back34", prof: 1,
    swordTip: v(188, 221), swordBase: v(165, 173), swordFront: false,
  };
}

function mirror(k: KeyPose, face: PoseDefinition["faceMode"], prof: -1 | 0 | 1): KeyPose {
  const mx = (p: Vec): Vec => v(2 * CX - p.x, p.y);
  const m = (o: KeyPose["f"]): KeyPose["f"] => ({ s: mx(o.s), e: mx(o.e), h: mx(o.h), hp: mx(o.hp), k: mx(o.k), ft: mx(o.ft) });
  return {
    head: mx(k.head), neck: mx(k.neck), shoC: mx(k.shoC), hipC: mx(k.hipC),
    f: m(k.b), b: m(k.f),
    face, prof,
    swordTip: mx(k.swordTip), swordBase: mx(k.swordBase), swordFront: k.swordFront,
  };
}

const KEYS: Record<number, () => KeyPose> = {
  0: keyN, 1: keyNE, 2: keyE, 3: keySE, 4: keyS,
  5: () => mirror(keySE(), "front34", -1),
  6: () => mirror(keyE(), "profile", -1),
  7: () => mirror(keyNE(), "back34", -1),
};

/** Pés ancorados em GY; respiração move apenas tronco/cabeça/braços/espada. */
export function poseFor(direction: DirectionIndex, frame: number): PoseDefinition {
  const k = KEYS[direction]();
  const b = breathe(frame);
  const lift = Math.round(b * 3);
  const torso = Math.round(b * 2);
  void GY;
  return {
    direction, phase: frame,
    head: v(k.head.x, k.head.y + lift),
    neck: v(k.neck.x, k.neck.y + torso),
    shoulderC: v(k.shoC.x, k.shoC.y + torso),
    hipC: k.hipC,
    front: {
      shoulder: v(k.f.s.x, k.f.s.y + torso),
      elbow: v(k.f.e.x, k.f.e.y + torso),
      hand: v(k.f.h.x, k.f.h.y + torso + Math.round(b * 1)),
      hip: k.f.hp, knee: k.f.k, foot: k.f.ft,
    },
    back: {
      shoulder: v(k.b.s.x, k.b.s.y + torso),
      elbow: v(k.b.e.x, k.b.e.y + torso),
      hand: v(k.b.h.x, k.b.h.y + torso),
      hip: k.b.hp, knee: k.b.k, foot: k.b.ft,
    },
    faceMode: k.face,
    profileSign: k.prof,
    swordInFront: k.swordFront,
    swordBase: v(k.swordBase.x, k.swordBase.y + torso + Math.round(b * 1)),
    swordTip: v(k.swordTip.x, k.swordTip.y + Math.round(b * 2)),
  };
}
