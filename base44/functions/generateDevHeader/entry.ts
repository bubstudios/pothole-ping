import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { PNG } from 'npm:pngjs@7.0.0';

Deno.serve(async (req) => {
  try {
    const W = 4096;
    const H = 2304;
    const png = new PNG({ width: W, height: H });
    const cx = W / 2;
    const cy = H / 2;

    function setPixel(x, y, r, g, b) {
      if (x < 0 || x >= W || y < 0 || y >= H) return;
      const idx = (Math.round(y) * W + Math.round(x)) * 4;
      png.data[idx] = Math.round(r);
      png.data[idx + 1] = Math.round(g);
      png.data[idx + 2] = Math.round(b);
      png.data[idx + 3] = 255;
    }

    function fillCircle(cx2, cy2, radius, r, g, b) {
      for (let y = Math.max(0, Math.round(cy2 - radius)); y < Math.min(H, Math.round(cy2 + radius)); y++) {
        for (let x = Math.max(0, Math.round(cx2 - radius)); x < Math.min(W, Math.round(cx2 + radius)); x++) {
          if ((x - cx2) ** 2 + (y - cy2) ** 2 <= radius * radius) {
            setPixel(x, y, r, g, b);
          }
        }
      }
    }

    function fillRect(x0, y0, w, h, r, g, b) {
      for (let y = Math.round(y0); y < Math.round(y0 + h); y++) {
        for (let x = Math.round(x0); x < Math.round(x0 + w); x++) {
          setPixel(x, y, r, g, b);
        }
      }
    }

    function drawLine(x0, y0, x1, y1, thickness, r, g, b) {
      const len = Math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2);
      const steps = Math.ceil(len);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const px = x0 + t * (x1 - x0);
        const py = y0 + t * (y1 - y0);
        fillCircle(Math.round(px), Math.round(py), thickness, r, g, b);
      }
    }

    // Background: dark navy gradient
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = (y * W + x) * 4;
        const t = y / H;
        const r = Math.round(8 + t * 22);
        const g = Math.round(10 + t * 28);
        const b = Math.round(28 + t * 38);
        png.data[idx] = r;
        png.data[idx + 1] = g;
        png.data[idx + 2] = b;
        png.data[idx + 3] = 255;
      }
    }

    // Road/pavement strip at bottom
    fillRect(0, H - 320, W, 320, 30, 32, 45);

    // Road dashed center line
    for (let x = 0; x < W; x += 160) {
      fillRect(x + 40, H - 165, 80, 10, 249, 200, 100);
    }

    // --- Large pothole logo on the right side ---
    const logoCX = W - 900;
    const logoCY = cy - 100;

    // Outer glow
    fillCircle(logoCX, logoCY, 340, 249, 115, 22);
    // Dark inner hole
    fillCircle(logoCX, logoCY, 290, 15, 18, 30);
    // Rim
    fillCircle(logoCX, logoCY, 270, 30, 32, 50);
    // Deep
    fillCircle(logoCX, logoCY, 210, 10, 12, 20);

    // Cracks
    const cracks = [
      [logoCX - 90, logoCY - 110, logoCX - 210, logoCY - 230],
      [logoCX + 70, logoCY - 100, logoCX + 180, logoCY - 210],
      [logoCX + 100, logoCY + 30, logoCX + 230, logoCY + 70],
      [logoCX + 50, logoCY + 130, logoCX + 140, logoCY + 260],
      [logoCX - 120, logoCY + 70, logoCX - 240, logoCY + 150],
      [logoCX - 60, logoCY + 140, logoCX - 150, logoCY + 280],
      [logoCX - 140, logoCY - 10, logoCX - 280, logoCY - 30],
      [logoCX + 20, logoCY - 140, logoCX + 60, logoCY - 260],
    ];
    for (const [x0, y0, x1, y1] of cracks) {
      drawLine(Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), 8, 249, 115, 22);
    }
    // White highlights
    const hlCracks = [
      [logoCX - 80, logoCY - 100, logoCX - 190, logoCY - 210],
      [logoCX + 80, logoCY - 90, logoCX + 170, logoCY - 190],
      [logoCX + 60, logoCY + 120, logoCX + 130, logoCY + 240],
      [logoCX - 110, logoCY + 60, logoCX - 220, logoCY + 130],
    ];
    for (const [x0, y0, x1, y1] of hlCracks) {
      drawLine(Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), 4, 255, 255, 255);
    }

    // --- Text on the left ---
    const charMap = {
      'P': [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8],[0,9],[0,10],[0,11],[1,0],[2,0],[3,0],[3,1],[3,2],[3,3],[3,4],[3,5],[2,5],[1,5],[0,5]],
      'O': [[1,0],[2,0],[3,0],[4,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8],[0,9],[0,10],[5,1],[5,2],[5,3],[5,4],[5,5],[5,6],[5,7],[5,8],[5,9],[5,10],[1,11],[2,11],[3,11],[4,11]],
      'T': [[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[2,1],[3,1],[4,1],[2,2],[3,2],[4,2],[2,3],[3,3],[4,3],[2,4],[3,4],[4,4],[2,5],[3,5],[4,5],[2,6],[3,6],[4,6],[2,7],[3,7],[4,7],[2,8],[3,8],[4,8],[2,9],[3,9],[4,9],[2,10],[3,10],[4,10],[2,11],[3,11],[4,11]],
      'H': [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8],[0,9],[0,10],[0,11],[6,0],[6,1],[6,2],[6,3],[6,4],[6,5],[6,6],[6,7],[6,8],[6,9],[6,10],[6,11],[1,4],[2,4],[3,4],[4,4],[5,4],[1,5],[2,5],[3,5],[4,5],[5,5]],
      'L': [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8],[0,9],[0,10],[0,11],[1,11],[2,11],[3,11],[4,11],[5,11]],
      'E': [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8],[0,9],[0,10],[0,11],[1,0],[2,0],[3,0],[4,0],[5,0],[1,5],[2,5],[3,5],[4,5],[1,11],[2,11],[3,11],[4,11],[5,11]],
      'I': [[1,0],[2,0],[3,0],[2,1],[2,2],[2,3],[2,4],[2,5],[2,6],[2,7],[2,8],[2,9],[2,10],[1,11],[2,11],[3,11],[4,11]],
      'N': [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8],[0,9],[0,10],[0,11],[6,0],[6,1],[6,2],[6,3],[6,4],[6,5],[6,6],[6,7],[6,8],[6,9],[6,10],[6,11],[1,1],[2,2],[2,3],[3,4],[3,5],[4,6],[4,7],[5,8],[5,9],[5,10]],
      'G': [[1,0],[2,0],[3,0],[4,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8],[0,9],[0,10],[5,1],[5,2],[5,3],[5,7],[5,8],[5,9],[5,10],[1,11],[2,11],[3,11],[4,11],[4,5],[4,6],[3,5],[3,6]],
      'R': [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8],[0,9],[0,10],[0,11],[1,0],[2,0],[3,0],[4,0],[4,1],[4,2],[4,3],[4,4],[3,5],[2,5],[1,5],[0,5],[3,6],[4,6],[4,7],[5,8],[5,9],[5,10],[5,11]],
      'U': [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8],[0,9],[0,10],[5,0],[5,1],[5,2],[5,3],[5,4],[5,5],[5,6],[5,7],[5,8],[5,9],[5,10],[1,11],[2,11],[3,11],[4,11]],
      'S': [[1,0],[2,0],[3,0],[4,0],[0,1],[5,2],[5,3],[4,4],[3,5],[2,5],[1,6],[1,7],[0,8],[5,9],[5,10],[1,11],[2,11],[3,11],[4,11]],
      'F': [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8],[0,9],[0,10],[0,11],[1,0],[2,0],[3,0],[4,0],[5,0],[1,4],[2,4],[3,4],[4,4],[5,4]],
      'C': [[1,0],[2,0],[3,0],[4,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8],[0,9],[0,10],[1,11],[2,11],[3,11],[4,11],[5,1],[5,10]],
      'D': [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8],[0,9],[0,10],[0,11],[1,0],[2,0],[3,0],[4,0],[5,0],[5,1],[5,2],[5,3],[5,4],[5,5],[5,6],[5,7],[5,8],[5,9],[5,10],[1,11],[2,11],[3,11],[4,11]],
      'A': [[1,0],[2,0],[3,0],[4,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8],[0,9],[0,10],[0,11],[5,1],[5,2],[5,3],[5,4],[5,5],[5,6],[5,7],[5,8],[5,9],[5,10],[5,11],[1,5],[2,5],[3,5],[4,5]],
      'V': [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8],[0,9],[5,1],[5,2],[5,3],[5,4],[5,5],[5,6],[5,7],[5,8],[5,9],[5,0],[1,10],[1,11],[2,9],[2,10],[2,11],[3,10],[3,11],[4,10],[4,11]],
      ' ': [],
    };

    function drawChar(ch, sx, sy, scale, r, g, b) {
      const glyph = charMap[ch];
      if (!glyph) return;
      for (const [gx, gy] of glyph) {
        const px = Math.round(sx + gx * scale);
        const py = Math.round(sy + gy * scale);
        for (let dx = 0; dx < scale; dx++) {
          for (let dy = 0; dy < scale; dy++) {
            setPixel(px + dx, py + dy, r, g, b);
          }
        }
      }
    }

    function drawText(str, startX, startY, scale, r, g, b) {
      let x = startX;
      for (const ch of str) {
        drawChar(ch, x, startY, scale, r, g, b);
        if (ch === ' ') { x += 3 * scale; }
        else { x += 7 * scale; }
      }
    }

    const scale = 12;

    // "POTHOLE" large
    const potholeW = 7 * 7 * scale;
    drawText("POTHOLE", Math.round(cy - 300) + 3, Math.round(cy - 300), scale, 10, 12, 25);
    drawText("POTHOLE", Math.round(cy - 300), Math.round(cy - 300) - 3, scale, 249, 115, 22);

    // "PING" below
    const pingW = 4 * 7 * scale;
    drawText("PING", Math.round(cy - 100) + 3, Math.round(cy - 100), scale, 10, 12, 25);
    drawText("PING", Math.round(cy - 100), Math.round(cy - 100) - 3, scale, 249, 115, 22);

    // Tagline in smaller text
    const tagScale = 5;
    drawText("REPORT  TRACK  SAVE", 280, H - 560, tagScale, 160, 170, 190);
    drawText("YOUR COMMUNITY ROAD SAFETY APP", 180, H - 480, tagScale, 160, 170, 190);

    // Small white text at very bottom
    const tinyScale = 3;
    drawText("POTHOLEPING.ORG", Math.round(cx - (14 * 4 * tinyScale) / 2), H - 130, tinyScale, 100, 120, 150);

    const buffer = PNG.sync.write(png);
    return new Response(new Blob([buffer], { type: 'image/png' }), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': 'attachment; filename="dev-header-4096.png"',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});