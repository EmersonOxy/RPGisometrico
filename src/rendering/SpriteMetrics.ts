/** Alpha measurements ignore isolated export noise and transparent margins. */
export function silhouetteBounds(pixels: Pick<ImageData, "data" | "width">, rect: { x: number; y: number; width: number; height: number }) {
  let left = rect.width, right = -1, top = rect.height, bottom = -1;
  for (let y = 0; y < rect.height; y++) {
    let count = 0, min = rect.width, max = -1;
    for (let x = 0; x < rect.width; x++) {
      if (pixels.data[((rect.y + y) * pixels.width + rect.x + x) * 4 + 3] < 192) continue;
      count++; min = Math.min(min, x); max = Math.max(max, x);
    }
    if (count < Math.max(3, rect.width * .04)) continue;
    top = Math.min(top, y); bottom = y; left = Math.min(left, min); right = Math.max(right, max);
  }
  return bottom < 0 ? { x: rect.width / 2, y: rect.height, height: rect.height }
    : { x: (left + right + 1) / 2, y: bottom + 1, height: bottom - top + 1 };
}
