import type { Engine } from "../core/Engine";
import { balance } from "../data/balance";
import { reconstructSummary } from "../world/Cartography";
import type { BiomeId } from "../core/types";

const colors: Record<BiomeId, string> = {
  plains: "#b4b48c",
  forest: "#8d9f7c",
  desert: "#c4b18a",
  swamp: "#94aaa0",
  ice: "#c5d1c5",
  mountain: "#a7aa97",
};

export function drawMinimap(canvas: HTMLCanvasElement, e: Engine) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const size = canvas.width,
    scale = 2.3,
    center = e.selected,
    n = balance.chunkSize;

  const isRotate = e.meta.settings.minimapOrientation === "rotate";
  const playerFacing = center.facingAngle ?? -Math.PI / 2;
  const mapRotation = isRotate ? -playerFacing - Math.PI / 2 : 0;

  ctx.fillStyle = "#777f65";
  ctx.fillRect(0, 0, size, size);

  ctx.save();
  ctx.translate(size / 2, size / 2);
  if (isRotate) {
    ctx.rotate(mapRotation);
  }

  for (const key of e.run.discovered) {
    const [cx, cy] = key.split(",").map(Number),
      x = (cx * n - center.x) * scale,
      y = (cy * n - center.y) * scale,
      span = n * scale;
    if (
      x > size ||
      y > size ||
      x + span < -size ||
      y + span < -size
    )
      continue;

    const summaries = (e.run.cartography ??= {}),
      data = (summaries[key] ??= reconstructSummary(e.run.seed, key)),
      cell = span / 8;

    for (let i = 0; i < 64; i++) {
      const lx = (i % 8) * 2;
      const ly = Math.floor(i / 8) * 2;
      const isDisc = e.discoveryMask
        ? e.discoveryMask.isCellDiscovered(cx, cy, lx, ly) ||
          e.discoveryMask.isCellDiscovered(cx, cy, lx + 1, ly) ||
          e.discoveryMask.isCellDiscovered(cx, cy, lx, ly + 1) ||
          e.discoveryMask.isCellDiscovered(cx, cy, lx + 1, ly + 1)
        : true;

      if (!isDisc) continue;

      ctx.fillStyle = colors[data.cells[i]];
      ctx.fillRect(
        x + (i % 8) * cell,
        y + Math.floor(i / 8) * cell,
        cell + 1,
        cell + 1,
      );
    }

    for (const p of data.pois) {
      if (e.discoveryMask && !e.discoveryMask.isWorldPointDiscovered(p.x, p.y)) {
        continue;
      }
      const px = (p.x - center.x) * scale,
        py = (p.y - center.y) * scale;
      ctx.fillStyle = "#405c43";
      ctx.strokeStyle = "#e2d7b2";
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (p.kind === "merchant") {
        ctx.fillStyle = "#dfbe6e";
        ctx.moveTo(px - 4, py + 3);
        ctx.lineTo(px, py - 4);
        ctx.lineTo(px + 4, py + 3);
        ctx.closePath();
      } else if (p.kind === "shrine") {
        ctx.fillStyle = "#82b27a";
        ctx.rect(px - 2.5, py - 4, 5, 8);
        ctx.moveTo(px - 4, py - 1);
        ctx.lineTo(px + 4, py - 1);
      } else if (p.kind === "chest") {
        ctx.fillStyle = "#e0af68";
        ctx.rect(px - 3.5, py - 2.5, 7, 5);
      } else if (p.kind === "ruin") {
        ctx.fillStyle = "#a8b0a2";
        ctx.rect(px - 4, py - 4, 2, 8);
        ctx.rect(px + 2, py - 4, 2, 8);
        ctx.rect(px - 4.5, py - 4, 9, 2);
      } else if (p.kind === "nest") {
        ctx.fillStyle = "#b85040";
        ctx.arc(px, py, 3, 0, 7);
      } else if (p.kind === "elite") {
        ctx.fillStyle = "#df4f4f";
        ctx.moveTo(px, py - 4.5);
        ctx.lineTo(px + 4, py);
        ctx.lineTo(px, py + 4.5);
        ctx.lineTo(px - 4, py);
        ctx.closePath();
      } else {
        ctx.fillStyle = "#405c43";
        ctx.arc(px, py, 2.5, 0, 7);
      }
      ctx.fill();
      ctx.stroke();
    }
  }

  // Draw party members with orientation
  for (const c of e.run.party) {
    if (!c.alive) continue;
    const x = (c.x - center.x) * scale,
      y = (c.y - center.y) * scale;
    const facing = c.facingAngle ?? -Math.PI / 2;
    const isControlled = c.id === center.id;

    ctx.save();
    ctx.translate(x, y);
    // If rotate mode, adjust for map rotation
    ctx.rotate(facing + Math.PI / 2 + (isRotate ? 0 : 0));

    ctx.fillStyle = isControlled ? "#9c6143" : "#4c7154";
    ctx.strokeStyle = "#e7dfb8";
    ctx.lineWidth = 1;
    ctx.beginPath();

    if (isControlled) {
      // Filled arrow for controlled character
      ctx.moveTo(0, -6);
      ctx.lineTo(4.5, 5);
      ctx.lineTo(0, 2);
      ctx.lineTo(-4.5, 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      // Hollow/smaller arrow for companions
      ctx.moveTo(0, -4.5);
      ctx.lineTo(3.5, 4);
      ctx.lineTo(0, 1.5);
      ctx.lineTo(-3.5, 4);
      ctx.closePath();
      ctx.stroke();
    }

    ctx.restore();
  }

  ctx.restore();

  // Direction indicator for selected marked point on map
  if (e.run.marker) {
    const mx = e.run.marker.x;
    const my = e.run.marker.y;
    const dx = mx - center.x;
    const dy = my - center.y;
    const dist = Math.hypot(dx, dy);
    const worldAngle = Math.atan2(dy, dx);
    const screenAngle = isRotate ? worldAngle + mapRotation : worldAngle;
    const rimRadius = size / 2 - 12;
    const mapDist = dist * scale;

    ctx.save();
    if (mapDist <= rimRadius) {
      // Inside minimap: Draw waypoint marker at exact position
      const cosR = Math.cos(isRotate ? mapRotation : 0);
      const sinR = Math.sin(isRotate ? mapRotation : 0);
      const rotDx = isRotate ? dx * cosR - dy * sinR : dx;
      const rotDy = isRotate ? dx * sinR + dy * cosR : dy;
      const px = size / 2 + rotDx * scale;
      const py = size / 2 + rotDy * scale;

      // Pulsing outer beacon
      const pulse = 1 + 0.3 * Math.sin(Date.now() * 0.006);
      ctx.strokeStyle = "#e5c365";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px, py, 7 * pulse, 0, Math.PI * 2);
      ctx.stroke();

      // Golden diamond marker
      ctx.fillStyle = "#ffdd80";
      ctx.beginPath();
      ctx.moveTo(px, py - 7);
      ctx.lineTo(px + 5, py);
      ctx.lineTo(px, py + 7);
      ctx.lineTo(px - 5, py);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#1b2921";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      // Outside minimap: Draw directional indicator arrow on rim pointing to target
      const edgeX = size / 2 + Math.cos(screenAngle) * rimRadius;
      const edgeY = size / 2 + Math.sin(screenAngle) * rimRadius;

      ctx.save();
      ctx.translate(edgeX, edgeY);
      ctx.rotate(screenAngle);

      // Distinct arrow pointer
      ctx.fillStyle = "#ffdd80";
      ctx.strokeStyle = "#1b2921";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(6, 0);
      ctx.lineTo(-7, -6);
      ctx.lineTo(-3, 0);
      ctx.lineTo(-7, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();

      // Distance tag
      ctx.fillStyle = "#fff4d0";
      ctx.strokeStyle = "#16251c";
      ctx.lineWidth = 2.5;
      ctx.font = "bold 9.5px Georgia, serif";
      const distText = `${Math.round(dist * 2)}m`;
      const textW = ctx.measureText(distText).width;
      const textX = Math.max(8, Math.min(size - textW - 8, edgeX - textW / 2));
      const textY = Math.max(16, Math.min(size - 6, edgeY + (Math.sin(screenAngle) > 0 ? -10 : 15)));
      ctx.strokeText(distText, textX, textY);
      ctx.fillText(distText, textX, textY);
    }
    ctx.restore();
  }

  // Compass indicator
  ctx.save();
  ctx.fillStyle = "#e3dcc0";
  ctx.font = "bold 11px Georgia";
  if (isRotate) {
    // Rotating compass needle pointing North
    const compassR = size / 2 - 14;
    const northX = size / 2 + Math.sin(mapRotation) * compassR;
    const northY = size / 2 - Math.cos(mapRotation) * compassR;
    ctx.fillText("N", northX - 4, northY + 4);
  } else {
    ctx.fillText("N", size / 2 - 4, 14);
  }
  ctx.restore();
}
