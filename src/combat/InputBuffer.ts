import type { Point } from "../core/types";
export interface BufferedAction {
  character: string;
  slot: number;
  point?: Point;
  remaining: number;
}
export class InputBuffer {
  action?: BufferedAction;
  put(
    character: string,
    slot: number,
    point: Point | undefined,
    window = 0.15,
  ) {
    this.action = {
      character,
      slot,
      point: point ? { ...point } : undefined,
      remaining: window,
    };
  }
  tick(dt: number) {
    if (this.action && (this.action.remaining -= dt) < 0)
      this.action = undefined;
  }
  clear() {
    this.action = undefined;
  }
}
