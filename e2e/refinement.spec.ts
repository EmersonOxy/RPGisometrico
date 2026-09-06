import { test, expect } from "@playwright/test";
test("sprites gerais registradas e choque térmico visível", async ({page}) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/");
  await page.locator("[data-action=new]").click();
  await page.locator("#seed").fill("urze-7");
  await page.locator("[data-action=embark]").click();
  await page.waitForFunction(() => {
    const g = (window as any).__game;
    return g?.engine.world.pending.size === 0 && g.game.scene.getScene("World").actors?.sprites.size;
  });
  await page.evaluate(async () => {
    const g = (window as any).__game, e = g.engine;
    const {createCharacter} = await import("/src/progression/Character.ts");
    e.enemies.clear(); e.debugOptions.freezeEnemies = true; e.debugOptions.godMode = true;
    const c = e.selected;
    c.partyOrder = "hold";
    for (const [i, cls] of ["shooter", "mage", "tank"].entries()) {
      const ally = createCharacter(cls as any, `gallery-${cls}`, c.x + (i+1)*2, c.y, 1);
      ally.partyOrder = "hold"; e.run.party.push(ally);
    }
    for (const [i, definition] of ["slime","boar","wolf","witch","golem","archer"].entries()) {
      const x = c.x + i*2 - 3, y = c.y - 5;
      e.enemies.set(`gallery-${definition}`, {id:`gallery-${definition}`,definition,x,y,home:{x,y},level:1,hp:1000,maxHp:1000,elite:false,modifier:"swift",statuses:[],path:[],threat:{},state:"IDLE",timer:0,aiTime:0,attackTime:0});
    }
    e.tactical = true; e.bus.emit("changed");
  });
  await expect.poll(() => page.evaluate(() => (window as any).__game.game.scene.getScene("World").actors.sprites.size)).toBe(10);
  const metrics = await page.evaluate(async () => {
    const g = (window as any).__game, actors = g.game.scene.getScene("World").actors;
    const {silhouetteBounds} = await import("/src/rendering/SpriteMetrics.ts");
    return ["slime","boar","wolf","witch","golem"].map(id => {
      const s = actors.sprites.get(`gallery-${id}`), source = s.texture.getSourceImage();
      const canvas = document.createElement("canvas"); canvas.width=source.width; canvas.height=source.height;
      const ctx=canvas.getContext("2d")!; ctx.drawImage(source,0,0);
      const r = silhouetteBounds(ctx.getImageData(0,0,canvas.width,canvas.height),{x:s.frame.cutX,y:s.frame.cutY,width:s.frame.width,height:s.frame.height});
      return {id,texture:s.texture.key,height:r.height*s.scaleY,footError:Math.abs(s.originY*s.frame.height-r.y)};
    });
  });
  const heights: Record<string,number> = {slime:62.4,boar:85.8,wolf:85.8,witch:78,golem:109.2};
  for (const m of metrics) {
    expect(m.texture).toBe(`${m.id}-sheet-idle`);
    expect(m.footError).toBeLessThan(.001);
    // Breathing poses vary around the sheet's median body height.
    expect(m.height / heights[m.id]).toBeGreaterThan(.8);
    expect(m.height / heights[m.id]).toBeLessThan(1.2);
  }
  await page.screenshot({path:"artifacts/refinement-sprites.png"});
  await page.evaluate(() => {
    const e = (window as any).__game.engine, t = e.enemies.get("gallery-slime");
    e.combat.hit(e.selected.id,t,10,"slow"); e.run.stats.seconds += 1; e.combat.hit(e.selected.id,t,10,"burn");
  });
  await expect.poll(() => page.evaluate(() => (window as any).__game.engine.effects.some((f:any) => f.text === "Choque térmico"))).toBe(true);
  await page.screenshot({path:"artifacts/refinement-thermal-shock.png"});
  expect(errors).toEqual([]);
});
