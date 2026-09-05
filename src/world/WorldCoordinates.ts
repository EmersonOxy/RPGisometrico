import { balance } from "../data/balance";
import type { Point } from "../core/types";
export const worldToIso = ({ x, y }: Point): Point => ({
  x: ((x - y) * balance.tileWidth) / 2,
  y: ((x + y) * balance.tileHeight) / 2,
});
export const isoToWorld = ({ x, y }: Point): Point => ({
  x: x / balance.tileWidth + y / balance.tileHeight,
  y: y / balance.tileHeight - x / balance.tileWidth,
});
export const chunkAt = (x: number, y: number) => ({
  x: Math.floor(x / balance.chunkSize),
  y: Math.floor(y / balance.chunkSize),
});
export const chunkKey = (x: number, y: number) => x + "," + y;
export const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.y - b.y);
