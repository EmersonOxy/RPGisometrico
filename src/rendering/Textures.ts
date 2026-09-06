import Phaser from "phaser";
import { createFoliage } from "./Foliage";
import { createAmbientTextures } from "./AmbientTextures";
function texture(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (g: Phaser.GameObjects.Graphics) => void,
) {
  const g = scene.make.graphics({ x: 0, y: 0 });
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}
const poly = (
  g: Phaser.GameObjects.Graphics,
  color: number,
  points: number[],
) => {
  g.fillStyle(color);
  g.fillPoints(
    Array.from(
      { length: points.length / 2 },
      (_, i) => new Phaser.Math.Vector2(points[i * 2], points[i * 2 + 1]),
    ),
    true,
  );
};
export function createTextures(scene: Phaser.Scene) {
  createAmbientTextures(scene);
  createFoliage(scene);
  for (const [id, color] of Object.entries({
    fighter: 0xb87358,
    shooter: 0x96b584,
    mage: 0x979ccb,
    tank: 0xbbae83,
    archer: 0xa78c70,
  })) {
    texture(scene, id, 64, 80, (g) => {
      g.fillStyle(0x111e1b, 0.3);
      g.fillEllipse(32, 71, 39, 12);
      g.fillStyle(0x253132);
      g.fillRoundedRect(22, 50, 8, 20, 3);
      g.fillRoundedRect(35, 49, 8, 20, 3);
      poly(g, color, [19, 27, 42, 27, 48, 58, 17, 60]);
      poly(
        g,
        Phaser.Display.Color.GetColor(
          ((color >> 16) & 255) * 0.7,
          ((color >> 8) & 255) * 0.7,
          (color & 255) * 0.7,
        ),
        [19, 28, 27, 31, 26, 60, 15, 57],
      );
      g.fillStyle(0xc6b99b);
      g.fillCircle(31, 19, 10);
      g.fillStyle(0x414b45);
      g.fillEllipse(31, 12, 23, 11);
      g.fillStyle(0x252d29);
      g.fillRect(34, 18, 3, 3);
      g.lineStyle(3, 0xced0b9);
      if (id === "fighter") {
        g.lineBetween(46, 47, 56, 15);
        g.lineStyle(4, 0xbfa576);
        g.lineBetween(43, 43, 53, 47);
      } else if (id === "tank") {
        poly(g, 0x485e5c, [35, 33, 55, 30, 58, 52, 47, 64, 35, 52]);
        g.lineStyle(2, 0xc1b38c);
        g.strokePoints(
          [
            { x: 37, y: 35 },
            { x: 53, y: 33 },
            { x: 55, y: 50 },
            { x: 47, y: 60 },
            { x: 38, y: 51 },
          ].map((p) => new Phaser.Math.Vector2(p.x, p.y)),
          true,
        );
        g.lineBetween(47, 36, 47, 53);
      } else if (id === "shooter" || id === "archer") {
        g.lineStyle(3, 0xbbaa79);
        g.beginPath();
        g.arc(42, 36, 18, -1.1, 1.1);
        g.strokePath();
        g.lineStyle(1, 0xd6d0b2);
        g.lineBetween(50, 20, 50, 52);
      } else {
        g.lineStyle(3, 0x756851);
        g.lineBetween(47, 62, 51, 14);
        g.fillStyle(0xb9d5df);
        g.fillCircle(51, 14, 5);
        poly(g, color, [16, 14, 32, 0, 44, 17]);
      }
      g.lineStyle(2, 0xd6c5a0, 0.6);
      g.lineBetween(23, 36, 38, 37);
    });
  }
  for (let variant = 0; variant < 3; variant++)
    texture(scene, "tree" + variant, 128, 180, (g) => {
      g.fillStyle(0x142b22, 0.25);
      g.fillEllipse(64, 161, 100, 25);
      g.fillStyle(0x5b5942);
      g.fillRect(58, 79, 13, 86);
      g.lineStyle(4, 0x777055);
      g.lineBetween(63, 116, 38, 80);
      g.lineBetween(65, 120, 90, 76);
      const cols = [0x2d5040, 0x3b6249, 0x4d7551, 0x60815b];
      for (let i = 0; i < 4; i++) {
        g.fillStyle(cols[i]);
        g.fillEllipse(
          60 + (i % 2 ? 14 : -12),
          79 - i * 12,
          94 - i * 12,
          67 - i * 4,
        );
      }
      g.fillStyle(0x9aab70, 0.4);
      g.fillEllipse(56, 34, 39, 14);
    });
  texture(scene, "pine", 112, 168, (g) => {
    g.fillStyle(0x243e35, 0.25);
    g.fillEllipse(56, 154, 86, 20);
    g.fillStyle(0x655f4a);
    g.fillRect(51, 105, 10, 49);
    poly(g, 0x3d6053, [8, 125, 56, 17, 103, 125]);
    poly(g, 0x739088, [18, 98, 56, 9, 90, 99]);
    poly(g, 0xc1d1c4, [27, 65, 56, 4, 83, 65]);
  });
  texture(scene, "rock", 88, 70, (g) => {
    g.fillStyle(0x24382f, 0.3);
    g.fillEllipse(43, 59, 76, 17);
    poly(g, 0x7b8576, [5, 47, 19, 20, 53, 12, 79, 33, 73, 57, 33, 65]);
    poly(g, 0xa7ad95, [19, 20, 53, 12, 63, 33, 38, 41, 5, 47]);
    poly(g, 0x596b60, [38, 41, 63, 33, 79, 33, 73, 57, 33, 65]);
    g.lineStyle(1, 0xc0bfa1);
    g.lineBetween(21, 23, 49, 16);
  });
  texture(scene, "cactus", 70, 112, (g) => {
    g.fillStyle(0x374c35, 0.25);
    g.fillEllipse(35, 99, 54, 12);
    g.lineStyle(13, 0x6c8257);
    g.lineBetween(34, 98, 34, 28);
    g.lineBetween(34, 66, 15, 66);
    g.lineBetween(15, 66, 15, 46);
    g.lineBetween(34, 76, 52, 76);
    g.lineBetween(52, 76, 52, 40);
    g.lineStyle(2, 0xa8af70);
    g.lineBetween(31, 89, 31, 32);
  });
  texture(scene, "merchant", 180, 148, (g) => {
    g.fillStyle(0x223b2b, 0.3);
    g.fillEllipse(90, 126, 159, 32);
    poly(g, 0x655c49, [23, 68, 144, 68, 145, 120, 23, 122]);
    poly(g, 0xc0b391, [18, 70, 67, 18, 153, 48, 166, 83]);
    poly(g, 0x798878, [18, 70, 67, 18, 77, 23, 47, 77]);
    poly(g, 0x879785, [72, 79, 96, 30, 108, 33, 100, 82]);
    g.lineStyle(4, 0x4a5140);
    g.lineBetween(24, 66, 22, 126);
    g.lineBetween(148, 78, 147, 131);
    g.fillStyle(0x9d8966);
    g.fillRect(51, 98, 73, 29);
    g.fillStyle(0xd7c493);
    g.fillCircle(108, 87, 10);
    g.fillStyle(0x667b6d);
    g.fillRect(98, 97, 23, 21);
    g.fillStyle(0xd5b969);
    g.fillCircle(29, 86, 6);
    g.lineStyle(2, 0x796b4b);
    g.lineBetween(29, 75, 29, 81);
  });
  texture(scene, "chest", 72, 64, (g) => {
    g.fillStyle(0x293a2c, 0.3);
    g.fillEllipse(37, 53, 61, 14);
    poly(g, 0x796346, [9, 29, 43, 20, 63, 31, 61, 51, 26, 61, 9, 49]);
    poly(g, 0xb59c68, [9, 29, 42, 16, 63, 29, 26, 42]);
    g.lineStyle(3, 0xd8bd82);
    g.lineBetween(24, 39, 24, 56);
    g.lineBetween(49, 25, 48, 52);
    g.fillStyle(0xebd193);
    g.fillRect(35, 40, 7, 9);
  });
  texture(scene, "shrine", 100, 126, (g) => {
    g.fillStyle(0x23382f, 0.25);
    g.fillEllipse(50, 110, 86, 23);
    poly(g, 0x7f8e7c, [15, 95, 50, 80, 85, 96, 50, 117]);
    poly(g, 0xaeb8a0, [35, 30, 52, 14, 64, 34, 62, 94, 37, 98]);
    poly(g, 0x738b7c, [52, 14, 64, 34, 62, 94, 51, 98]);
    g.lineStyle(3, 0xded8b1);
    g.strokeCircle(50, 51, 10);
    g.lineBetween(50, 37, 50, 66);
  });
  texture(scene, "ruin", 110, 130, (g) => {
    g.fillStyle(0x203024, 0.28);
    g.fillEllipse(55, 114, 94, 22);
    // Left column
    poly(g, 0x6e7d6b, [20, 104, 38, 96, 38, 38, 20, 46]);
    poly(g, 0x8a9987, [38, 96, 48, 101, 48, 43, 38, 38]);
    // Right column
    poly(g, 0x6e7d6b, [62, 106, 80, 98, 80, 24, 62, 32]);
    poly(g, 0x8a9987, [80, 98, 90, 103, 90, 29, 80, 24]);
    // Broken lintel
    poly(g, 0xa0ad99, [14, 44, 54, 26, 54, 36, 14, 54]);
    poly(g, 0x5a6957, [54, 26, 96, 22, 96, 32, 54, 36]);
    // Fallen stone slab at base
    poly(g, 0x7a8a77, [30, 116, 56, 106, 68, 112, 42, 122]);
    g.lineStyle(2, 0xc7c9ad);
    g.lineBetween(29, 55, 29, 90);
    g.lineBetween(71, 40, 71, 88);
  });
  texture(scene, "nest", 90, 75, (g) => {
    g.fillStyle(0x201814, 0.32);
    g.fillEllipse(45, 62, 78, 18);
    // Outer mound
    poly(g, 0x473326, [10, 52, 45, 36, 80, 52, 45, 68]);
    poly(g, 0x634937, [18, 50, 45, 30, 72, 50, 45, 62]);
    // Dark hollow
    g.fillStyle(0x19100c);
    g.fillEllipse(45, 48, 34, 14);
    // Bones / horns
    g.lineStyle(3, 0xbda985);
    g.lineBetween(14, 54, 28, 38);
    g.lineBetween(76, 54, 62, 38);
    g.lineBetween(32, 34, 45, 44);
    // Glowing eggs
    g.fillStyle(0xdfbe70);
    g.fillCircle(40, 50, 4);
    g.fillCircle(48, 51, 3.5);
  });
  texture(scene, "elite", 96, 115, (g) => {
    g.fillStyle(0x281816, 0.3);
    g.fillEllipse(48, 102, 80, 20);
    // Obsidian altar base
    poly(g, 0x3d2826, [20, 92, 48, 80, 76, 92, 48, 104]);
    poly(g, 0x583a37, [28, 88, 48, 40, 68, 88, 48, 96]);
    // Crimson banner
    poly(g, 0x8a2f26, [40, 48, 56, 48, 54, 76, 48, 82, 42, 76]);
    // Skull / horned crest
    poly(g, 0xdfcb9e, [42, 36, 48, 28, 54, 36, 48, 44]);
    g.lineStyle(2, 0xd4a55d);
    g.lineBetween(42, 32, 32, 22);
    g.lineBetween(54, 32, 64, 22);
    g.strokeCircle(48, 62, 5);
  });
}
