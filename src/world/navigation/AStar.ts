import type { Point } from "../../core/types";
export type CellQuery = (
  x: number,
  y: number,
) => { blocked: boolean; cost: number };
export function findPath(
  start: Point,
  end: Point,
  cell: CellQuery,
  limit = 2500,
): Point[] {
  const s = { x: Math.floor(start.x), y: Math.floor(start.y) },
    e = { x: Math.floor(end.x), y: Math.floor(end.y) };
  if (cell(e.x, e.y).blocked || Math.hypot(e.x - s.x, e.y - s.y) > 48)
    return [];
  const key = (p: Point) => p.x + "," + p.y;
  type Node = Point & { g: number; f: number; parent?: Node };
  const open: Node[] = [{ ...s, g: 0, f: 0 }],
    best = new Map<string, number>([[key(s), 0]]),
    closed = new Set<string>();
  let count = 0;
  while (open.length && count++ < limit) {
    let idx = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[idx].f) idx = i;
    const n = open.splice(idx, 1)[0];
    if (closed.has(key(n))) continue;
    if (n.x === e.x && n.y === e.y) {
      const path: Point[] = [];
      let cur: Node | undefined = n;
      while (cur?.parent) {
        path.unshift({ x: cur.x + 0.5, y: cur.y + 0.5 });
        cur = cur.parent;
      }
      return path;
    }
    closed.add(key(n));
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++) {
        if (!dx && !dy) continue;
        const x = n.x + dx,
          y = n.y + dy,
          c = cell(x, y);
        if (
          c.blocked ||
          (dx &&
            dy &&
            (cell(n.x + dx, n.y).blocked || cell(n.x, n.y + dy).blocked))
        )
          continue;
        const g = n.g + c.cost * (dx && dy ? Math.SQRT2 : 1),
          k = x + "," + y;
        if (g >= (best.get(k) ?? Infinity)) continue;
        best.set(k, g);
        open.push({ x, y, g, f: g + Math.hypot(e.x - x, e.y - y), parent: n });
      }
  }
  return [];
}
export function lineWalkable(a: Point, b: Point, cell: CellQuery) {
  const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 5);
  let last = { x: Math.floor(a.x), y: Math.floor(a.y) };
  for (let i = 1; i <= steps; i++) {
    const p = {
      x: Math.floor(a.x + ((b.x - a.x) * i) / steps),
      y: Math.floor(a.y + ((b.y - a.y) * i) / steps),
    };
    if (cell(p.x, p.y).blocked) return false;
    if (
      p.x !== last.x &&
      p.y !== last.y &&
      (cell(p.x, last.y).blocked || cell(last.x, p.y).blocked)
    )
      return false;
    last = p;
  }
  return true;
}
export function smoothPath(start: Point, path: Point[], cell: CellQuery) {
  const out: Point[] = [];
  let a = start;
  for (let i = 0; i < path.length; i++) {
    let j = i;
    while (j + 1 < path.length && lineWalkable(a, path[j + 1], cell)) j++;
    out.push(path[j]);
    a = path[j];
    i = j;
  }
  return out;
}
