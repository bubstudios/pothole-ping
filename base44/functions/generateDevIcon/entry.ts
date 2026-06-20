import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { PNG } from 'npm:pngjs@7.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const size = 512;

    const png = new PNG({ width: size, height: size });

    const cx = size / 2;
    const cy = size / 2 - 20;
    const triH = 140;
    const halfW = triH * 0.866;
    const topY = cy - triH;
    const botY = cy + triH * 0.5;

    function insideTriangle(px, py) {
      const d1 = (px - cx) * (botY - topY) - (py - topY) * (cx + halfW - cx);
      const d2 = (px - (cx - halfW)) * (botY - botY) - (py - botY) * (cx - (cx - halfW));
      const d3 = (px - (cx + halfW)) * (topY - botY) - (py - botY) * (cx - (cx + halfW));
      return (d1 >= 0 && d2 >= 0 && d3 >= 0) || (d1 <= 0 && d2 <= 0 && d3 <= 0);
    }

    function insideCircle(px, py, cx2, cy2, r) {
      return (px - cx2) ** 2 + (py - cy2) ** 2 <= r * r;
    }

    function drawThickLine(x0, y0, x1, y1, thick) {
      const dx = x1 - x0, dy = y1 - y0;
      const len = Math.sqrt(dx * dx + dy * dy);
      for (let i = 0; i <= len; i++) {
        const t = len === 0 ? 0 : i / len;
        const px = x0 + t * dx;
        const py = y0 + t * dy;
        for (let ox = -thick; ox <= thick; ox++) {
          for (let oy = -thick; oy <= thick; oy++) {
            if (ox * ox + oy * oy <= thick * thick) return true;
          }
        }
      }
      return false;
    }

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;

        // Dark background with subtle noise
        const noise = (Math.random() * 8) | 0;
        png.data[idx] = 26 + noise;     // R
        png.data[idx + 1] = 26 + noise; // G
        png.data[idx + 2] = 40 + noise; // B
        png.data[idx + 3] = 255;        // A

        // Orange triangle
        if (insideTriangle(x, y)) {
          png.data[idx] = 249;
          png.data[idx + 1] = 115;
          png.data[idx + 2] = 22;
        }

        // White dot (exclamation point head)
        if (insideCircle(x, y, cx, cy - 40, 13)) {
          png.data[idx] = 255;
          png.data[idx + 1] = 255;
          png.data[idx + 2] = 255;
        }
      }
    }

    // Draw white crack lines manually
    const lines = [
      [cx - 6, cy - 20, cx - 10, cy + 5],
      [cx - 10, cy + 5, cx - 3, cy + 25],
      [cx - 3, cy + 25, cx + 2, cy + 50],
      [cx + 4, cy - 20, cx + 8, cy + 5],
      [cx + 8, cy + 5, cx + 3, cy + 25],
      [cx + 3, cy + 25, cx + 8, cy + 50],
    ];

    for (const [x0, y0, x1, y1] of lines) {
      const dx = x1 - x0, dy = y1 - y0;
      const len = Math.sqrt(dx * dx + dy * dy);
      const thick = 2.5;
      for (let i = 0; i <= Math.ceil(len); i++) {
        const t = i / Math.ceil(len);
        const px = Math.round(x0 + t * dx);
        const py = Math.round(y0 + t * dy);
        for (let ox = -Math.ceil(thick); ox <= Math.ceil(thick); ox++) {
          for (let oy = -Math.ceil(thick); oy <= Math.ceil(thick); oy++) {
            if (ox * ox + oy * oy <= thick * thick) {
              const nx = px + ox, ny = py + oy;
              if (nx >= 0 && nx < size && ny >= 0 && ny < size && insideTriangle(nx, ny)) {
                const nidx = (ny * size + nx) * 4;
                png.data[nidx] = 255;
                png.data[nidx + 1] = 255;
                png.data[nidx + 2] = 255;
              }
            }
          }
        }
      }
    }

    // Bottom text: draw thick horizontal bars spelling "POTHOLE" and "PING"
    // Simple 5x7 pixel font approximation
    const chars = {
      P: [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[1,0],[2,0],[3,1],[2,2],[1,3],[0,3]],
      O: [[0,1],[0,2],[0,3],[0,4],[0,5],[1,0],[2,0],[3,1],[3,2],[3,3],[3,4],[3,5],[1,6],[2,6]],
      T: [[0,0],[1,0],[2,0],[3,0],[4,0],[2,1],[2,2],[2,3],[2,4],[2,5],[2,6]],
      H: [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[4,0],[4,1],[4,2],[4,3],[4,4],[4,5],[4,6],[1,3],[2,3],[3,3]],
      L: [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[1,6],[2,6],[3,6]],
      E: [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[1,0],[2,0],[1,3],[2,3],[1,6],[2,6]],
      I: [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6]],
      N: [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[1,1],[2,2],[3,3],[4,4],[4,0],[4,1],[4,2],[4,3],[4,4],[4,5],[4,6]],
      G: [[1,0],[2,0],[0,1],[0,2],[0,3],[0,4],[0,5],[1,6],[2,6],[3,5],[3,4],[3,3],[2,3]],
    };

    function drawText(str, startX, startY, scale, r, g, b) {
      let cx2 = startX;
      for (const ch of str) {
        const glyph = chars[ch] || [];
        for (const [gx, gy] of glyph) {
          const px = Math.round(cx2 + gx * scale);
          const py = Math.round(startY + gy * scale);
          for (let sx = 0; sx < scale; sx++) {
            for (let sy = 0; sy < scale; sy++) {
              const nx = px + sx, ny = py + sy;
              if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
                const nidx = (ny * size + nx) * 4;
                png.data[nidx] = r;
                png.data[nidx + 1] = g;
                png.data[nidx + 2] = b;
              }
            }
          }
        }
        cx2 += 5 * scale;
      }
    }

    const scale = 3;
    const text1 = "POTHOLE";
    const text2 = "PING";
    const totalW1 = text1.length * 5 * scale;
    const totalW2 = text2.length * 5 * scale;

    drawText(text1, Math.round(cx - totalW1 / 2), size - 55, scale, 249, 115, 22);
    drawText(text2, Math.round(cx - totalW2 / 2), size - 35, scale, 249, 115, 22);

    const chunks = [];
    const buffer = PNG.sync.write(png);
    // Split into chunks to avoid issues
    chunks.push(buffer);

    return new Response(new Blob(chunks), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': 'attachment; filename="developer-icon-512.png"',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});