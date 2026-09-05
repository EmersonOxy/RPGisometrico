import { test, expect } from "@playwright/test";
test("expedição completa: combate, loot, joias, recrutamento, save e permadeath", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Nova expedição" }),
  ).toBeVisible();
  await page.screenshot({ path: "artifacts/menu.png" });
  await page.getByRole("button", { name: "Nova expedição" }).click();
  await page.locator("#seed").fill("urze-7");
  await page
    .getByRole("button", { name: "Partir para o desconhecido" })
    .click();
  await page.waitForFunction(() => {
    const g = (window as any).__game;
    return g.engine?.world.chunks.size >= 9;
  });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "artifacts/world.png" });
  const read = () =>
    page.evaluate(() => {
      const e = (window as any).__game.engine;
      return {
        x: e.selected.x,
        y: e.selected.y,
        hp: e.selected.hp,
        level: e.selected.level,
        kills: e.run.stats.kills,
        inventory: e.run.inventory.length,
        jewels: e.run.jewels,
        party: e.run.party.filter((c: any) => c.alive).length,
        selected: e.selected.classId,
        silver: e.meta.silver,
        gold: e.meta.gold,
      };
    });
  async function clickWorld(x: number, y: number, interact = false) {
    const p = await page.evaluate(
      ({ x, y }) => {
        const cam = (window as any).__game.game.scene.getScene("World").cameras
          .main;
        return {
          x:
            ((x - y) * 32 - cam.scrollX - cam.width / 2) * cam.zoom +
            cam.width / 2,
          y:
            ((x + y) * 16 - cam.scrollY - cam.height / 2) * cam.zoom +
            cam.height / 2,
        };
      },
      { x, y },
    );
    if (interact) {
      await page.mouse.move(p.x,p.y);await page.mouse.down({button:'middle'});
      await expect(page.locator('.radial-center')).toBeVisible();
      await page.keyboard.press('Tab');
      const center=await page.locator('.radial-center').boundingBox();
      await page.mouse.move(center!.x+center!.width/2-165,center!.y+center!.height/2);
      await page.mouse.up({button:'middle'});
    } else await page.mouse.click(p.x, p.y);
  }
  await clickWorld(4, 2, true);
  await expect(
    page.getByRole("heading", { name: "A Tenda dos Caminhos" }),
  ).toBeVisible({ timeout: 20000 });
  await page.locator('[data-action="buy"][data-id="sword"]').click();
  await page.locator('[data-action="buy"][data-id="fire"]').click();
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.keyboard.press("i");
  await page.locator(".bag-grid [data-item]").first().dblclick();
  await page.locator('[data-action="jewel"][data-id="fire"]').click();
  await page.screenshot({ path: "artifacts/inventory.png" });
  await page.keyboard.press("Escape");
  await page.keyboard.press("k");
  await expect(
    page.locator(".skill-node b").filter({ hasText: "Talho de brasa" }).first(),
  ).toBeVisible();
  await page.screenshot({ path: "artifacts/skills.png" });
  await page.keyboard.press("Escape");
  await clickWorld(9, 1);
  await page.waitForTimeout(2100);
  await clickWorld(9, 1);
  await page.waitForTimeout(600);
  await clickWorld(12, 2);
  for (let i = 0; i < 16; i++) {
    await page.keyboard.press("q");
    await page.keyboard.press("e");
    await page.waitForTimeout(450);
    if ((await read()).kills >= 1) break;
  }
  await expect.poll(async () => (await read()).kills).toBeGreaterThan(0);
  const target = await page.evaluate(() => {
    const e = (window as any).__game.engine;
    const d = e.run.drops[0];
    return d ? { x: d.x, y: d.y } : null;
  });
  if (target) {
    await clickWorld(target.x, target.y);
    await page.waitForTimeout(1500);
  }
  await page.screenshot({ path: "artifacts/combat.png" });
  await page.keyboard.press("F3");
  await page.locator('[data-action="debug"][data-id="silver"]').click();
  await page.locator('[data-action="debug"][data-id="gold"]').click();
  await page.locator('[data-sandbox=level]').fill('5');
  await page.locator('[data-sandbox=silver]').fill('500');
  await page.locator('[data-action=sandbox-apply]').click();
  await page.locator('[data-action=sandbox-keep]').click();
  await page.keyboard.press("F3");
  await clickWorld(4, 2, true);

  await expect(
    page.getByRole("heading", { name: "A Tenda dos Caminhos" }),
  ).toBeVisible({ timeout: 20000 });
  await page.locator('[data-action="unlock"][data-id="tank"]').click();
  await page.locator('[data-action="recruit"][data-id="tank"]').click();
  await page.locator('[data-action="buy"][data-id="fortune"]').click();
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.keyboard.press("2");
  expect((await read()).selected).toBe("tank");
  await page.keyboard.press("i");
  await page.locator('[data-action="jewel"][data-id="fortune"]').click();
  await page.keyboard.press("Escape");
  await page.keyboard.press("t");
  expect(
    await page.evaluate(() => (window as any).__game.engine.tactical),
  ).toBe(true);
  await clickWorld(5, 5);
  await page.keyboard.press("t");
  await page.waitForTimeout(1000);
  await page.keyboard.press("1");
  await page.keyboard.press("F3");
  await page.locator('[data-action="debug"][data-id="kill"]').click();
  expect((await read()).selected).toBe("tank");
  expect((await read()).party).toBe(1);
  await page.locator('[data-action=sandbox-keep]').click();
  await page.keyboard.press("F3");
  await page.evaluate(() => (window as any).__game.save());
  const before = await read();
  await page.reload();
  await page.getByRole("button", { name: "Continuar jornada" }).click();
  await page.waitForFunction(
    () => (window as any).__game.engine?.world.chunks.size >= 9,
  );
  expect((await read()).selected).toBe("tank");
  expect((await read()).gold).toBe(before.gold);
  expect((await read()).silver).toBe(before.silver);
  await page.screenshot({ path: "artifacts/party-continued.png" });
  await page.keyboard.press("F3");
  await page.locator('[data-action="debug"][data-id="wipe"]').click();
  await expect(
    page.getByRole("heading", { name: "A expedição se perdeu" }),
  ).toBeVisible();
  await page.screenshot({ path: "artifacts/game-over.png" });
  await page.locator('.loss-sheet [data-action=sandbox-keep]').click();
  await page.getByRole("button", { name: "Um novo horizonte" }).click();
  await expect(
    page.getByRole("button", { name: "Continuar jornada" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Nova expedição" }).click();
  await expect(page.locator('[data-action="class"][data-id="tank"]')).toBeDisabled();
  await page
    .getByRole("button", { name: "Partir para o desconhecido" })
    .click();
  expect((await read()).selected).toBe("fighter");
  expect((await read()).gold).toBe(2);
  expect((await read()).silver).toBe(45);
  expect(errors).toEqual([]);
});
