import Phaser from "phaser";
// Trunks and crowns share an anchor but have independent opacity.
export function createFoliage(scene: Phaser.Scene) {
  for (let variant = 0; variant < 6; variant++) {
    const trunk = document.createElement("canvas");
    trunk.width = 144;
    trunk.height = 184;
    const t = trunk.getContext("2d")!;
    t.fillStyle = "#1c342333";
    t.beginPath();
    t.ellipse(83, 164, 49, 13, -0.14, 0, 7);
    t.fill();
    t.strokeStyle = "#5b5840";
    t.lineWidth = variant === 4 ? 7 : 11;
    t.lineCap = "round";
    t.beginPath();
    t.moveTo(70, 166);
    t.lineTo(73, 91);
    t.moveTo(73, 130);
    t.lineTo(43, 94);
    t.moveTo(73, 117);
    t.lineTo(99, 80);
    t.stroke();
    t.strokeStyle = "#9a8960";
    t.lineWidth = 2;
    t.beginPath();
    t.moveTo(67, 161);
    t.lineTo(70, 105);
    t.stroke();
    scene.textures.addCanvas("trunk" + variant, trunk);
    const crown = document.createElement("canvas");
    crown.width = 144;
    crown.height = 184;
    const g = crown.getContext("2d")!;
    if (variant === 3) {
      for (let j = 0; j < 4; j++) {
        g.fillStyle = ["#355446", "#436754", "#557862", "#7a946f"][j];
        g.beginPath();
        g.moveTo(20 + j * 8, 133 - j * 25);
        g.lineTo(72, 12 + j * 3);
        g.lineTo(128 - j * 8, 132 - j * 25);
        g.closePath();
        g.fill();
      }
    } else if (variant !== 5) {
      const palettes = [
        ["#35513a", "#446448", "#5b7951", "#7f9561"],
        ["#454f35", "#61694a", "#838360", "#a1a274"],
        ["#294d3d", "#355b43", "#496e4c", "#78915b"],
        ["", "", "", ""],
        ["#496848", "#5e7c51", "#78915d", "#9da771"],
      ];
      const colors = palettes[variant],
        scale = variant === 4 ? 0.65 : 1;
      for (let j = 0; j < 13; j++) {
        const a = j * 2.399,
          x = 72 + Math.cos(a) * (j < 7 ? 30 : 19) * scale,
          y = (variant === 4 ? 78 : 64) + Math.sin(a) * 25 * scale - j * 0.8;
        g.fillStyle = colors[Math.min(3, Math.floor(j / 4))];
        g.beginPath();
        g.ellipse(
          x,
          y,
          (34 - j * 0.8) * scale,
          (26 - j * 0.55) * scale,
          a * 0.12,
          0,
          7,
        );
        g.fill();
      }
      g.strokeStyle = "#a7b07833";
      g.lineWidth = 2;
      for (let j = 0; j < 9; j++) {
        const x = 40 + j * 7,
          y = 44 + Math.sin(j * 2) * 13;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + 6, y - 2);
        g.stroke();
      }
    }
    scene.textures.addCanvas("crown" + variant, crown);
  }
}
