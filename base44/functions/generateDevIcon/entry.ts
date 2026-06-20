import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { PNG } from 'npm:pngjs@7.0.0';

Deno.serve(async (req) => {
  try {
    const size = 512;
    const png = new PNG({ width: size, height: size });
    const cx = size / 2;
    const cy = size / 2;

    // Helper: blend with alpha
    function setPixel(x, y, r, g, b) {
      if (x < 0 || x >= size || y < 0 || y >= size) return;
      const idx = (Math.round(y) * size + Math.round(x)) * 4;
      png.data[idx] = Math.round(r);
      png.data[idx + 1] = Math.round(g);
      png.data[idx + 2] = Math.round(b);
      png.data[idx + 3] = 255;
    }

    // Radial gradient background: dark navy at edges → slightly lighter center
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) / (size * 0.7);
        const t = Math.min(dist, 1);
        const r = Math.round(15 + t * 20);
        const g = Math.round(18 + t * 25);
        const b = Math.round(40 + t * 30);
        png.data[idx] = r;
        png.data[idx + 1] = g;
        png.data[idx + 2] = b;
        png.data[idx + 3] = 255;
      }
    }

    // Draw a filled circle (pothole)
    function fillCircle(cx2, cy2, radius, r, g, b) {
      for (let y = Math.max(0, Math.round(cy2 - radius)); y < Math.min(size, Math.round(cy2 + radius)); y++) {
        for (let x = Math.max(0, Math.round(cx2 - radius)); x < Math.min(size, Math.round(cx2 + radius)); x++) {
          if ((x - cx2) ** 2 + (y - cy2) ** 2 <= radius * radius) {
            setPixel(x, y, r, g, b);
          }
        }
      }
    }

    // Draw thick line
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

    // --- Main pothole shape: dark irregular circle with rough edges ---
    // Outer glow
    fillCircle(cx, cy, 140, 249, 115, 22);

    // Dark inner (the hole)
    fillCircle(cx, cy, 120, 20, 22, 35);

    // Inner shadow ring
    fillCircle(cx, cy, 110, 30, 32, 45);

    // Deepest part
    fillCircle(cx, cy, 85, 15, 17, 28);

    // --- Crack lines radiating from center ---
    const cracks = [
      [cx - 40, cy - 50, cx - 85, cy - 90],
      [cx - 25, cy - 20, cx - 60, cy - 10],
      [cx + 30, cy - 40, cx + 70, cy - 75],
      [cx + 45, cy + 10, cx + 90, cy + 25],
      [cx + 20, cy + 55, cx + 55, cy + 100],
      [cx - 10, cy + 60, cx - 35, cy + 105],
      [cx - 50, cy + 30, cx - 95, cy + 55],
      [cx - 55, cy - 10, cx - 100, cy - 20],
    ];

    // Orange cracks
    for (const [x0, y0, x1, y1] of cracks) {
      drawLine(Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), 4, 249, 115, 22);
    }

    // White highlight cracks (thinner)
    const highlightCracks = [
      [cx - 35, cy - 45, cx - 75, cy - 80],
      [cx + 35, cy - 35, cx + 65, cy - 65],
      [cx + 25, cy + 50, cx + 50, cy + 90],
      [cx - 45, cy + 25, cx - 85, cy + 45],
    ];
    for (const [x0, y0, x1, y1] of highlightCracks) {
      drawLine(Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), 2, 255, 255, 255);
    }

    // Road surface texture — orange debris dots near cracks
    const debris = [
      [cx - 38, cy - 62], [cx - 52, cy - 58], [cx - 68, cy - 70],
      [cx + 40, cy - 58], [cx + 55, cy - 55], [cx + 62, cy - 68],
      [cx + 35, cy + 65], [cx + 48, cy + 72], [cx + 55, cy + 68],
      [cx - 45, cy + 55], [cx - 60, cy + 62], [cx - 70, cy + 58],
    ];
    for (const [dx, dy] of debris) {
      fillCircle(Math.round(dx), Math.round(dy), 5, 249, 115, 22);
    }

    // --- Bottom text: "POTHOLE" and "PING" in clean bold style ---
    const charMap = {
      'P': [
        [0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8],
        [1,0],[2,0],[3,0],
        [3,1],[3,2],[3,3],[3,4],
        [2,4],[1,4],[0,4],
      ],
      'O': [
        [1,0],[2,0],[3,0],[4,0],
        [0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],
        [5,1],[5,2],[5,3],[5,4],[5,5],[5,6],[5,7],
        [1,8],[2,8],[3,8],[4,8],
      ],
      'T': [
        [0,0],[1,0],[2,0],[3,0],[4,0],[5,0],
        [2,1],[3,1],
        [2,2],[3,2],
        [2,3],[3,3],
        [2,4],[3,4],
        [2,5],[3,5],
        [2,6],[3,6],
        [2,7],[3,7],
        [2,8],[3,8],
      ],
      'H': [
        [0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8],
        [5,0],[5,1],[5,2],[5,3],[5,4],[5,5],[5,6],[5,7],[5,8],
        [1,3],[2,3],[3,3],[4,3],
      ],
      'L': [
        [0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8],
        [1,8],[2,8],[3,8],[4,8],[5,8],
      ],
      'E': [
        [0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8],
        [1,0],[2,0],[3,0],[4,0],
        [1,4],[2,4],[3,4],
        [1,8],[2,8],[3,8],[4,8],
      ],
      'I': [
        [0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8],
      ],
      'N': [
        [0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8],
        [5,0],[5,1],[5,2],[5,3],[5,4],[5,5],[5,6],[5,7],[5,8],
        [1,1],[1,2],
        [2,2],[2,3],
        [3,4],[3,5],
        [4,5],[4,6],
        [5,7],
      ],
      'G': [
        [1,0],[2,0],[3,0],[4,0],
        [0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],
        [5,1],[5,2],[5,3],[5,5],[5,6],[5,7],
        [1,8],[2,8],[3,8],[4,8],
        [3,4],[4,4],
      ],
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
        x += 6 * scale;
      }
    }

    const textScale = 4;
    const topText = "POTHOLE";
    const bottomText = "PING";
    const topW = topText.length * 6 * textScale;
    const bottomW = bottomText.length * 6 * textScale;

    // Orange text with a subtle dark outline effect (draw dark offset first)
    drawText(topText, Math.round(cx - topW / 2) + 2, size - 100 + 2, textScale, 10, 12, 25);
    drawText(bottomText, Math.round(cx - bottomW / 2) + 2, size - 55 + 2, textScale, 10, 12, 25);
    // Orange main text
    drawText(topText, Math.round(cx - topW / 2), size - 100, textScale, 249, 115, 22);
    drawText(bottomText, Math.round(cx - bottomW / 2), size - 55, textScale, 249, 115, 22);

    const buffer = PNG.sync.write(png);
    return new Response(new Blob([buffer]), {
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