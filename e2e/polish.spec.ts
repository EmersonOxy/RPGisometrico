import { test, expect, type Page } from "@playwright/test";
async function start(page: Page) {
  await page.goto("/");
  await page.locator('[data-action="new"]').click();
  await page.locator('[data-action="embark"]').click();
  await page.waitForFunction(
    () => (window as any).__game.engine.world.chunks.size >= 9,
  );
}
async function screenshot(page: Page, name: string) {
  await page.waitForTimeout(200);
  await page.screenshot({ path: "artifacts/polish-" + name + ".png" });
}
test("painéis, mochila, encaixes, árvore, atlas e escala em três resoluções", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1600, height: 900 });
  await start(page);
  await page.evaluate(() => {
    const e = (window as any).__game.engine;
    e.enemies.clear();
    e.meta.silver = 500;
    e.meta.gold = 8;
  });
  await page.keyboard.press("i");
  await expect(page.locator(".bag-grid .inventory-slot")).toHaveCount(36);
  await page.keyboard.press("i");
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);
  await page.keyboard.press("k");
  await page.keyboard.press("k");
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);
  await page.keyboard.press("m");
  await page.keyboard.press("m");
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.locator('.pause-sheet [data-action="settings"]').click();
  await page.keyboard.press("Escape");
  await expect(page.locator(".pause-sheet")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.keyboard.press("i");
  const pos = await page.evaluate(() => {
    const e = (window as any).__game.engine;
    return {
      x: e.selected.x,
      y: e.selected.y,
      hp: e.selected.hp,
      time: e.selected.cooldowns,
    };
  });
  await page.waitForTimeout(350);
  expect(
    await page.evaluate(() => {
      const e = (window as any).__game.engine;
      return {
        x: e.selected.x,
        y: e.selected.y,
        hp: e.selected.hp,
        time: e.selected.cooldowns,
      };
    }),
  ).toEqual(pos);
  await page.mouse.click(4, 450);
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);
  expect(
    await page.evaluate(
      () => (window as any).__game.engine.selected.path.length,
    ),
  ).toBe(0);
  await page.evaluate(() => {
    const e = (window as any).__game.engine;
    const p = [...e.world.chunks.values()]
      .flatMap((c: any) => c.pois)
      .find((p: any) => p.kind === "merchant") as any;
    e.selected.x = p.x;
    e.selected.y = p.y;
    e.command({ type: "interact", id: p.id });
  });
  await page.locator('[data-action="buy"][data-id="sword"]').click();
  await page.locator('[data-action="buy"][data-id="coat"]').click();
  await page.locator('[data-action="buy"][data-id="fire"]').click();
  await screenshot(page, "shop-1600");
  await page.keyboard.press("Escape");
  await page.keyboard.press("i");
  const sword = page.locator(".bag-grid [data-item]").first();
  const swordId = await sword.getAttribute("data-item");
  await sword.dragTo(page.locator(".equipment-slot.ring"));
  expect(
    await page.evaluate(
      () => (window as any).__game.engine.selected.equipment.weapon,
    ),
  ).toBeUndefined();
  await page
    .locator(".bag-grid [data-item]")
    .first()
    .dragTo(page.locator(".equipment-slot.weapon"));
  expect(
    await page.evaluate(
      () => (window as any).__game.engine.selected.equipment.weapon.id,
    ),
  ).toBe(swordId);
  await page.locator(".bag-grid [data-item]").first().dblclick();
  expect(
    await page.evaluate(
      () => (window as any).__game.engine.selected.equipment.armor?.slot,
    ),
  ).toBe("armor");
  await page
    .locator('[data-jewel="fire"]')
    .dragTo(page.locator('[data-socket="0"]'));
  expect(
    await page.evaluate(() => (window as any).__game.engine.selected.jewels),
  ).toContain("fire");
  await page
    .locator(".equipment-slot.weapon")
    .dragTo(page.locator('[data-bag-index="17"]'));
  await expect(page.locator('[data-bag-index="17"][data-item]')).toHaveCount(1);
  await page
    .locator('[data-bag-index="17"]')
    .dragTo(page.locator('[data-bag-index="28"]'));
  await expect(page.locator('[data-bag-index="28"][data-item]')).toHaveCount(1);
  await page.locator('[data-bag-index="28"]').hover();
  await expect(page.locator(".game-tooltip.visible")).toBeVisible();
  await screenshot(page, "inventory-tooltip");
  await page.locator('[data-bag-index="28"]').click({ modifiers: ["Shift"] });
  expect(
    await page.evaluate(
      () => (window as any).__game.engine.selected.equipment.weapon.id,
    ),
  ).toBe(swordId);
  await page.keyboard.press("k");
  const points = await page.evaluate(
    () => (window as any).__game.engine.selected.points,
  );
  await page
    .locator(".skill-node.available[data-action=passive]")
    .first()
    .click();
  expect(
    await page.evaluate(() => (window as any).__game.engine.selected.points),
  ).toBe(points - 1);
  await expect(
    page.locator(".skill-node.unlocked[data-action=passive]"),
  ).toHaveCount(1);
  await expect(page.locator(".jewel-gated.unlocked")).toHaveCount(1);
  const tree = page.locator(".tree-world"),
    before = await tree.getAttribute("style");
  await page.mouse.move(810, 510);
  await page.mouse.wheel(0, -200);
  await expect(tree).not.toHaveAttribute("style", before!);
  await page.locator('[data-action="tree-home"]').click();
  await page.keyboard.press("m");
  const camZoom = await page.evaluate(
    () => (window as any).__game.game.scene.getScene("World").cameras.main.zoom,
  );
  const canvas = page.locator("#atlas-canvas");
  await page.mouse.move(700, 450);
  await page.mouse.down();
  await page.mouse.move(850, 520, { steps: 8 });
  await page.mouse.up();
  await page.mouse.wheel(0, -300);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(150);
  expect(
    await page.evaluate(
      () =>
        (window as any).__game.game.scene.getScene("World").cameras.main.zoom,
    ),
  ).toBe(camZoom);
  await canvas.dblclick({ position: { x: 430, y: 260 } });
  expect(
    await page.evaluate(() => (window as any).__game.engine.run.marker),
  ).toBeTruthy();
  await page.keyboard.press("Home");
  await screenshot(page, "map-marker");
  await page.keyboard.press("m");
  await page.keyboard.press("Escape");
  await page.locator('[data-action="settings"]').click();
  await page.locator('[data-action="settings-tab"][data-id="interface"]').click();
  await page.locator('[data-setting="uiScale"]').selectOption("1.25");
  await page.locator('[data-setting="fontScale"]').selectOption("1.1");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  for (const [width, height] of [
    [1920, 1080],
    [1600, 900],
    [1366, 768],
  ]) {
    await page.setViewportSize({ width, height });
    for (const [key, name] of [
      ["i", "inventory"],
      ["k", "skills"],
      ["m", "atlas"],
    ]) {
      await page.keyboard.press(key);
      const box = await page.locator(".panel-frame").boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
      expect(box!.y + box!.height).toBeLessThanOrEqual(height + 1);
      if (key === "i") {
        await expect(page.locator(".bag-grid .inventory-slot")).toHaveCount(36);
        const last = await page
          .locator(".bag-grid .inventory-slot")
          .last()
          .boundingBox();
        expect(last!.y + last!.height).toBeLessThan(height);
      }
      await screenshot(page, name + "-" + width);
      await page.keyboard.press(key);
    }
    await screenshot(page, "gameplay-" + width);
  }
  await page.evaluate(() => (window as any).__game.save());
  await page.reload();
  await page.locator('[data-action="continue"]').click();
  expect(
    await page.evaluate(() => (window as any).__game.meta.settings.uiScale),
  ).toBe(1.25);
  expect(
    await page.evaluate(() => (window as any).__game.engine.selected.jewels),
  ).toContain("fire");
  expect(errors).toEqual([]);
  console.log(
    "UX aprovada: três resoluções, 36 slots, drag/drop, duplo clique, árvore, mapa e persistência.",
  );
});
test("mapa com milhares de chunks permanece navegável", async ({ page }) => {
  await start(page);
  await page.evaluate(() => {
    const e = (window as any).__game.engine;
    e.enemies.clear();
    for (let x = -35; x < 35; x++)
      for (let y = -35; y < 35; y++) {
        const k = x + "," + y;
        if (!e.run.discovered.includes(k)) e.run.discovered.push(k);
      }
  });
  await page.keyboard.press("m");
  await expect(page.locator("#atlas-canvas")).toBeVisible();
  const begin = Date.now();
  await page
    .locator('[data-action="atlas-zoom"][data-id="out"]')
    .click({ clickCount: 12 });
  await page.keyboard.press("ArrowRight");
  await page.locator('[data-action="atlas-home"]').click();
  expect(Date.now() - begin).toBeLessThan(5000);
  await screenshot(page, "atlas-4900-chunks");
  await page.keyboard.press("m");
  expect(await page.evaluate(() => (window as any).__game.engine.paused)).toBe(
    false,
  );
});
