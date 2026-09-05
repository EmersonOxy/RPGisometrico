import { test, expect } from "@playwright/test";
test("seis biomas em WebGL e descarregamento de chunks", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.locator('[data-action="new"]').click();
  await page.locator('[data-action="embark"]').click();
  await page.waitForFunction(
    () => (window as any).__game.engine?.world.chunks.size >= 9,
  );
  const points = await page.evaluate(async () => {
    const gen = await import(
      /* @vite-ignore */ "/src/world/generation/WorldGenerator.ts"
    );
    const found: Record<string, { x: number; y: number }> = {};
    for (let x = -450; x <= 450; x += 20)
      for (let y = -450; y <= 450; y += 20) {
        const id = gen.sampleBiome("urze-7", x, y);
        if (!found[id]) found[id] = { x, y };
      }
    return found;
  });
  expect(Object.keys(points)).toHaveLength(6);
  for (const [id, p] of Object.entries(points)) {
    await page.evaluate((p) => {
      const e = (window as any).__game.engine;
      e.tactical = true;
      e.selected.x = p.x + 0.5;
      e.selected.y = p.y + 0.5;
      e.selected.path = [];
      e.selected.target = undefined;
      e.world.update(e.selected);
    }, p);
    await page.waitForFunction(() => {
      const e = (window as any).__game.engine;
      return e.world.pending.size === 0;
    });
    await page.waitForTimeout(650);
    await page.screenshot({ path: "artifacts/biome-" + id + ".png" });
    expect(
      await page.evaluate(
        () => (window as any).__game.engine.world.chunks.size,
      ),
    ).toBeLessThanOrEqual(25);
  }
  console.log("Biomas renderizados:", Object.keys(points).join(", "));
  console.log(
    "FPS observado (renderer padrão do Edge):",
    await page.evaluate(() =>
      Math.round((window as any).__game.game.loop.actualFps),
    ),
  );
  expect(errors).toEqual([]);
});
