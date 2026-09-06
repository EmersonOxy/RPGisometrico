import type Phaser from "phaser";
export function createAmbientTextures(scene: Phaser.Scene) {
  const draw=(key:string,w:number,h:number,fn:(g:Phaser.GameObjects.Graphics)=>void)=>{
    const g=scene.make.graphics({x:0,y:0});fn(g);g.generateTexture(key,w,h);g.destroy();
  };
  for(const [key,color] of [["deer",0xb49a74],["fox",0xc88b52],["hare",0xd8d8c3]] as const) draw(key,48,48,g=>{
    g.fillStyle(0x34382e);for(const x of [14,21,31,36])g.fillRect(x,31,3,12);
    g.fillStyle(color);g.fillEllipse(24,29,30,17);g.fillEllipse(37,20,12,17);
    g.fillTriangle(33,15,34,4,38,15);g.fillTriangle(38,15,42,6,42,19);
    g.fillStyle(0x292b25);g.fillCircle(40,19,1.5);
    if(key==="fox"){g.fillStyle(color);g.fillTriangle(14,27,0,17,5,32);}
    if(key==="deer"){g.lineStyle(2,0xe0cf9c);g.lineBetween(33,10,29,2);g.lineBetween(35,10,38,1);}
  });
  draw("raven",40,32,g=>{g.fillStyle(0x35434a);g.fillEllipse(20,18,11,18);g.fillTriangle(18,17,1,3,7,22);g.fillTriangle(22,17,39,3,33,22);g.fillStyle(0xc0bca2);g.fillTriangle(21,6,25,12,20,12);});
  draw("ambient-npc",48,72,g=>{g.fillStyle(0x343c38);g.fillRect(15,49,7,18);g.fillRect(28,49,7,18);g.fillStyle(0xe0d1ae);g.fillTriangle(24,23,8,55,39,55);g.fillStyle(0xc5ad8a);g.fillCircle(24,18,9);g.fillStyle(0x455d50);g.fillEllipse(24,11,29,9);g.lineStyle(3,0xb6a079);g.lineBetween(40,34,39,66);});
  draw("campfire",64,52,g=>{g.fillStyle(0x6a5945);g.fillEllipse(32,40,46,15);g.fillStyle(0xe6ae62);g.fillTriangle(18,37,29,8,37,38);g.fillStyle(0xf3d48a);g.fillTriangle(30,38,38,20,46,39);});
  draw("tent",96,80,g=>{g.fillStyle(0x687a62);g.fillTriangle(8,65,43,10,85,65);g.fillStyle(0xb5ad7c);g.fillTriangle(43,10,61,58,85,65);g.fillStyle(0x2c3e32);g.fillTriangle(25,64,43,26,57,64);});
  draw("bedroll",64,40,g=>{g.fillStyle(0x8e8d72);g.fillRoundedRect(8,12,47,20,4);g.fillStyle(0xb7ae87);g.fillRoundedRect(9,11,12,23,4);});
  draw("crate",48,48,g=>{g.fillStyle(0x8f754e);g.fillRect(7,10,34,30);g.lineStyle(3,0xc2a773);g.strokeRect(7,10,34,30);g.lineBetween(9,12,39,38);});
  draw("watchtower",96,148,g=>{g.fillStyle(0x747e70);g.fillRect(22,35,52,96);g.fillStyle(0x465446);g.fillRect(41,99,16,32);g.fillStyle(0xa0a18b);g.fillRect(16,31,64,12);for(const x of [17,42,67])g.fillRect(x,19,13,18);g.fillStyle(0x3b4c40);g.fillRect(41,52,14,20);});
  for(const key of ["gravestone","ritualStone","waystone"])draw(key,40,68,g=>{g.fillStyle(key==="ritualStone"?0x8b7f99:0x909d89);g.fillRoundedRect(9,10,22,47,6);g.lineStyle(2,0xc8cba9);g.lineBetween(20,21,20,42);g.lineBetween(13,28,27,28);});
  draw("wagon",98,68,g=>{g.fillStyle(0x8b6e49);g.fillRect(14,19,65,29);g.lineStyle(5,0x4c4b39);g.strokeCircle(25,49,13);g.strokeCircle(69,49,13);g.lineStyle(3,0xc0a379);g.lineBetween(78,32,95,48);});
}
