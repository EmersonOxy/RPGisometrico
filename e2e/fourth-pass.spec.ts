import {test, expect} from '@playwright/test';

test.beforeEach(async ({page}) => {
  await page.goto('/');
  await page.locator('[data-action=new]').click();
  await page.locator('[data-action=embark]').click();
  await page.waitForFunction(() => (window as any).__game.engine.world.pending.size === 0);
  await page.evaluate(async () => {
    const e=(window as any).__game.engine;
    const {createCharacter}=await import('/src/progression/Character.ts');
    e.enemies.clear(); e.tactical=true;
    e.run.party=[e.selected,...['tank','shooter','mage'].map((cls,i)=>createCharacter(cls,'qa-'+i,e.selected.x+i+1,e.selected.y+1,1))];
    for(const c of e.run.party)c.partyOrder='hold';
    e.bus.emit('changed');
  });
  await page.waitForTimeout(500);
});

test('ALT seleciona quatro membros; Escape cancela novo arraste sem perder seleção',async({page})=>{
  const points=await page.evaluate(()=>{const g=(window as any).__game; return g.engine.run.party.map((c:any)=>g.game.scene.getScene('World').worldToScreen(c));});
  const start={x:Math.min(...points.map((p:any)=>p.x))-25,y:Math.min(...points.map((p:any)=>p.y))-25};
  const end={x:Math.max(...points.map((p:any)=>p.x))+25,y:Math.max(...points.map((p:any)=>p.y))+25};
  await page.keyboard.down('Alt');await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:8});await page.mouse.up();await page.keyboard.up('Alt');
  expect(await page.evaluate(()=>{const e=(window as any).__game.engine;return e.run.commandSelection;})).toHaveLength(4);
  await page.keyboard.down('Alt');await page.mouse.down();await page.mouse.move(1000,550);await page.keyboard.press('Escape');await page.mouse.up();await page.keyboard.up('Alt');
  expect(await page.evaluate(()=>(window as any).__game.engine.run.commandSelection)).toHaveLength(4);
  await expect(page.locator('[role=dialog]')).toHaveCount(0);
});

test('radial aplica Hold ao controlado, alterna página sem trocar personagem e desacelera simulação',async({page})=>{
  await page.evaluate(()=>{const e=(window as any).__game.engine;e.selected.partyOrder='follow';e.tactical=false;e.meta.settings.radialSlowMo='25';});
  await page.mouse.move(800,450);await page.mouse.down({button:'middle'});await page.waitForTimeout(250);
  await page.mouse.move(943,367);await page.mouse.up({button:'middle'});
  expect(await page.evaluate(()=>(window as any).__game.engine.selected.partyOrder)).toBe('hold');
  await page.mouse.move(800,450);await page.mouse.down({button:'middle'});await page.waitForTimeout(250);await page.keyboard.press('Tab');
  await expect(page.locator('.radial-mode-tag')).toHaveText('Sinais Táticos');
  const before=await page.evaluate(()=>(window as any).__game.engine.run.stats.seconds);
  await page.waitForTimeout(500);
  const elapsed=await page.evaluate(()=>(window as any).__game.engine.run.stats.seconds)-before;
  expect(elapsed).toBeGreaterThan(.04);expect(elapsed).toBeLessThan(.3);
  await page.screenshot({path:'artifacts/fixed-radial.png'});
  await page.keyboard.press('Escape');await page.mouse.up({button:'middle'});
  expect(await page.evaluate(()=>(window as any).__game.ui.app.input.getContext())).toBe('GAMEPLAY');
});

test('ataque direito prioriza inimigo sob cursor; feed conecta e agrega; remapeamento chega à árvore',async({page})=>{
  const p=await page.evaluate(()=>{
    const g=(window as any).__game,e=g.engine,c=e.selected;
    for(const [id,dx,dy] of [['a',.5,0],['b',0,1]] as const)e.enemies.set(id,{id,definition:'slime',x:c.x+dx,y:c.y+dy,home:{x:c.x+dx,y:c.y+dy},level:1,hp:100,maxHp:100,elite:false,modifier:'swift',statuses:[],path:[],threat:{},state:'IDLE',timer:0,aiTime:999,attackTime:99});
    c.target='a';return g.game.scene.getScene('World').worldToScreen(e.enemies.get('b'));
  });
  await page.mouse.click(p.x,p.y-35,{button:'right'});
  expect(await page.evaluate(()=>(window as any).__game.engine.combat.casts[0]?.target)).toBe('b');
  await page.evaluate(()=>{const g=(window as any).__game,e=g.engine,input=g.ui.app.input;e.run.drops=[0,1,2].map(i=>({id:'coin-'+i,x:e.selected.x,y:e.selected.y,kind:'gold',amount:1}));e.pickup();input.setBinding('ABILITY_1','KeyZ');g.meta.settings.keybindings=input.getBindings();e.bus.emit('inputBindingsChanged');e.bus.emit('changed');});
  await expect(page.locator('.loot-feed-count')).toHaveText('+3');
  await page.keyboard.press('k');
  await expect(page.locator('.skill-node.equipped small').first()).toHaveText('Z · Equipada');
  await expect(page.locator('#actions kbd').nth(1)).toHaveText('Z');
});

test('oito setores de pings executam a opção indicada; WASD não aceita clique para mover',async({page})=>{
  await page.evaluate(()=>{const e=(window as any).__game.engine,command=e.command.bind(e);(window as any).pings=[];e.command=(c:any)=>{if(c.type==='ping')(window as any).pings.push(c.kind);command(c);};});
  for(let i=0;i<8;i++){
    await page.mouse.move(800,450);await page.mouse.down({button:'middle'});await page.waitForTimeout(250);await page.keyboard.press('Tab');
    const angle=-Math.PI/2+i*Math.PI/4;
    await page.mouse.move(800+Math.cos(angle)*165,450+Math.sin(angle)*165);
    await page.mouse.up({button:'middle'});
  }
  expect(await page.evaluate(()=>(window as any).pings)).toEqual(['attack-here','move-here','defend-here','danger','regroup-here','clear-targets','investigate','marker']);
  await page.evaluate(()=>{const e=(window as any).__game.engine;e.meta.settings.movementMode='wasd';e.selected.path=[];e.orders.clear();});
  await page.mouse.click(950,600);await page.mouse.down();await page.waitForTimeout(250);await page.mouse.up();
  expect(await page.evaluate(()=>(window as any).__game.engine.selected.path)).toEqual([]);
});
