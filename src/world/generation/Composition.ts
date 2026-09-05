import { at } from "../../utils/SeededRandom";
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export function patchNoise(seed: string, x: number, y: number, scale = 9) {
  const ix = Math.floor(x / scale),
    iy = Math.floor(y / scale);
  let u = x / scale - ix,
    v = y / scale - iy;
  u = u * u * (3 - 2 * u);
  v = v * v * (3 - 2 * v);
  return mix(
    mix(at(seed, ix, iy), at(seed, ix + 1, iy), u),
    mix(at(seed, ix, iy + 1), at(seed, ix + 1, iy + 1), u),
    v,
  );
}
export function composition(seed: string, x: number, y: number) {
  const cluster = patchNoise(seed + ":groves", x, y, 11),
    rocks = patchNoise(seed + ":rock-patch", x, y, 8),
    trail =
      Math.abs(y - Math.sin(x / 19 + at(seed, 0, 0) * 6) * 3) < 1.25 ||
      Math.abs(x - Math.sin(y / 23) * 5) < 1.05;
  return {
    cluster,
    rocks,
    trail,
    clearing: cluster < 0.36,
    density: cluster > 0.65 ? 1.65 : cluster > 0.48 ? 0.8 : 0.15,
  };
}
