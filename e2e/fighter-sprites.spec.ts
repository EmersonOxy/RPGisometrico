import {test,expect} from "@playwright/test";
test('Lutador usa sheets em oito direções, pausa congela e Feiticeiro usa sua sheet',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await page.locator('[data-action=new]').click();await page.locator('#seed').fill('urze-7');await page.locator('[data-action=embark]').click();
  await page.waitForFunction(()=>{const g=(window as any).__game;return g.engine.world.pending.size===0&&g.game.scene.getScene('World').actors?.sprites.size>0;});
  await page.evaluate(async()=>{
    const g=(window as any).__game,e=g.engine;
    const {createCharacter}=await import('/src/progression/Character.ts');
    e.enemies.clear();e.meta.settings.movementMode='wasd';g.ui.app.input.movementMode='wasd';e.selected.partyOrder='hold';
    e.run.party.push(createCharacter('mage','other-class',e.selected.x+2,e.selected.y,1));e.run.party[1].partyOrder='hold';e.bus.emit('changed');
  });
  const read=()=>page.evaluate(()=>{const g=(window as any).__game,s=g.game.scene.getScene('World').actors.sprites.get(g.engine.selected.id);return {texture:s.texture.key,frame:s.frame.name,flip:s.flipX,x:s.x,y:s.y,originY:s.originY};});
  await expect.poll(async()=>(await read()).texture).toBe('fighter-sheet-idle');
  await expect(page.locator('#party .hero-portrait image').first()).toHaveAttribute('href',/lutador_base/);
  for(const [row,keys] of [['0',['w']],['1',['w','d']],['2',['d']],['3',['s','d']],['4',['s']],['5',['s','a']],['6',['a']],['7',['w','a']]] as const){
    for(const key of keys)await page.keyboard.down(key);
    await expect.poll(async()=>{const s=await read();return s.texture+':'+s.frame.split(':')[0];}).toBe('fighter-sheet-walk:'+row);
    for(const key of keys)await page.keyboard.up(key);
    await expect.poll(async()=>(await read()).texture).toBe('fighter-sheet-idle');
    expect((await read()).flip).toBe(false);
  }
  await page.keyboard.down('d');await expect.poll(async()=>(await read()).texture).toBe('fighter-sheet-walk');
  await page.keyboard.press('t');await page.keyboard.up('d');const paused=await read();await page.waitForTimeout(300);expect(await read()).toEqual(paused);
  expect(await page.evaluate(()=>(window as any).__game.game.scene.getScene('World').actors.sprites.get('other-class').texture.key)).toBe('mage-sheet-idle');
  await page.keyboard.press('t');
  await expect.poll(async()=>(await read()).texture).toBe('fighter-sheet-idle');
  await page.screenshot({path:'artifacts/fighter-sprites-game.png'});
  await page.evaluate(()=>{const e=(window as any).__game.engine;e.meta.settings.movementMode='click';e.basicAttack({x:e.selected.x+1,y:e.selected.y+1});});
  await expect.poll(async()=>(await read()).frame.split(':')[0]).toBe('4');
  expect(errors).toEqual([]);
});
