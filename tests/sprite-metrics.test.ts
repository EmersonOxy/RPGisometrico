import { expect, it } from "vitest";
import { silhouetteBounds } from "../src/rendering/SpriteMetrics";
it("mede o corpo ignorando margens e pixels isolados de exportação", () => {
  const pixels = {width:20, data:new Uint8ClampedArray(20 * 20 * 4)};
  for(let y=3;y<17;y++) for(let x=5;x<15;x++) pixels.data[(y*20+x)*4+3]=255;
  pixels.data[3]=255;
  expect(silhouetteBounds(pixels,{x:0,y:0,width:20,height:20})).toEqual({x:10,y:17,height:14});
});
it("frame transparente mantém uma escala e âncora válidas", () => {
  expect(silhouetteBounds({width:20,data:new Uint8ClampedArray(1600)},{x:0,y:0,width:20,height:20})).toEqual({x:10,y:20,height:20});
});
