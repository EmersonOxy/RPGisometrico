import {test,expect} from "@playwright/test";
test("trilha inicial: básico, primeiro desbloqueio explícito, equipar e persistir",async({page})=>{
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/");await page.locator('[data-action=new]').click();await page.locator('[data-action=embark]').click();
  await page.waitForFunction(()=>(window as any).__game?.engine?.world.pending.size===0);
  await expect(page.locator('#actions .empty-skill')).toHaveCount(4);
  await page.keyboard.press('q');expect(await page.evaluate(()=>(window as any).__game.engine.projectiles.length)).toBe(0);
  await page.keyboard.press('k');await expect(page.locator('.skill-learn')).toBeDisabled();
  await page.screenshot({path:'artifacts/tree-foundation-level1.png'});
  await page.evaluate(async()=>{const e=(window as any).__game.engine;const {addExperience}=await import('/src/progression/Character.ts');const {xpRequiredForLevel}=await import('/src/data/balance.ts');addExperience(e.selected,xpRequiredForLevel(1));e.bus.emit('changed');});
  await expect(page.locator('.skill-learn')).toBeEnabled();await page.locator('.skill-learn').click();
  await expect(page.locator('#actions .empty-skill')).toHaveCount(4);
  await page.locator('[data-action=tree-equip][data-id="heavy"]').click();
  await expect(page.locator('#actions .empty-skill')).toHaveCount(3);
  await expect(page.locator('.loadout-slot[data-id="0"] .slot-name')).toHaveText('Ruptura');
  await expect(page.locator('.skill-node.equipped .slot-badge')).toHaveText('Q');
  await page.locator('[data-action=tree-all]').click();await page.screenshot({path:'artifacts/tree-organic-overview.png'});
  await page.locator('[data-action=tree-home]').click();await page.screenshot({path:'artifacts/tree-organic-detail.png'});
  await page.keyboard.press('Escape');await page.evaluate(()=>(window as any).__game.save());await page.reload();
  await page.locator('[data-action=continue]').click();await page.waitForFunction(()=>(window as any).__game?.engine?.selected);
  expect(await page.evaluate(()=>(window as any).__game.engine.selected.loadout)).toEqual(['heavy','','','']);
  expect(errors).toEqual([]);
});
test("quatro caminhos, requisitos, navegação e painel legível em três resoluções",async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.locator('[data-action=new]').click();await page.locator('[data-action=embark]').click();
  await page.waitForFunction(()=>(window as any).__game?.engine?.world.pending.size===0);
  await page.evaluate(async()=>{const e=(window as any).__game.engine;e.enemies.clear();e.debugOptions.freezeEnemies=true;e.selected.level=10;e.selected.points=20;const {learnSkill}=await import('/src/progression/SkillTree.ts');for(let i=0;i<4;i++)learnSkill(e.selected,'fighter:foundation:'+i);e.selected.treeSelection='fighter:active:0';e.bus.emit('changed');});
  await page.keyboard.press('k');await expect(page.locator('.organic-branch')).toHaveCount(4);
  await page.locator('.skill-learn').click();await page.locator('[data-action=tree-all]').click();
  const path=page.locator('.tree-connections path').first();expect(await path.getAttribute('d')).toContain(' C ');
  for(const [width,height] of [[1440,900],[1024,768],[760,740]]){
    await page.setViewportSize({width,height});await page.locator('[data-action=tree-home]').click();await expect(page.locator('.skill-inspector h3')).toBeVisible();
    const box=await page.locator('.skill-inspector').boundingBox();expect(box!.x+box!.width).toBeLessThanOrEqual(width);
    await page.screenshot({path:'artifacts/tree-responsive-'+width+'.png'});
  }
  const before=await page.locator('.tree-world').getAttribute('style');await page.locator('[data-action=tree-zoom][data-id=in]').click();await expect(page.locator('.tree-world')).not.toHaveAttribute('style',before!);
  await page.keyboard.press('Escape');await expect(page.locator('.tree-book')).toHaveCount(0);expect(errors).toEqual([]);
});
