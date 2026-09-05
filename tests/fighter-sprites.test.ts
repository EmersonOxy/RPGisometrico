import {describe,it,expect} from "vitest";
import {fighterDirection,fighterFrameRect,FighterAnimation} from "../src/rendering/FighterSprites";
import {createCharacter} from "../src/progression/Character";
describe("Sheets do Lutador",()=>{
  it("converte direções isométricas nas oito linhas da sheet",()=>{
    expect([[-1,-1],[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0]].map(([x,y])=>fighterDirection(x,y))).toEqual([0,1,2,3,4,5,6,7]);
  });
  it("recorta a sheet fracionária inteira sem lacunas ou sobreposição",()=>{
    let area=0;
    for(let row=0;row<8;row++)for(let col=0;col<4;col++){
      const r=fighterFrameRect(887,1774,4,row,col);area+=r.width*r.height;
      expect(r.x+r.width).toBeLessThanOrEqual(887);expect(r.y+r.height).toBeLessThanOrEqual(1774);
      if(col<3)expect(r.x+r.width).toBe(fighterFrameRect(887,1774,4,row,col+1).x);
      if(row<7)expect(r.y+r.height).toBe(fighterFrameRect(887,1774,4,row+1,col).y);
    }
    expect(area).toBe(887*1774);
  });
  it("anima movimento real, conserva orientação em idle e congela na pausa",()=>{
    const c=createCharacter("fighter","sheet"),a=new FighterAnimation(c);
    expect(a.update(c,.3,false,false).mode).toBe("idle");
    c.x+=.1;c.y-=.1;
    const moving=a.update(c,.2,false,false);expect(moving.mode).toBe("walk");expect(moving.frame).toMatch(/^2:/);
    expect(a.update(c,1,true,false)).toEqual(moving);
    const idle=a.update(c,.1,false,false);expect(idle.mode).toBe("idle");expect(idle.frame).toMatch(/^2:/);
    expect(a.update(c,2,false,true).frame).toBe("2:0");
  });
});
