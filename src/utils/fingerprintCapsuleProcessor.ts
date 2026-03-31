/**
 * Procesa una imagen de huella dactilar y la recorta en forma de falange/cápsula
 * con la huella centrada y contraste mejorado.
 * Se usa tanto para la previsualización como para enviar a la API.
 */

const CAPSULE_W = 480;
const CAPSULE_H = 680;

function drawCapsulePath(
  cx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  cx.beginPath();
  cx.moveTo(x + r, y);
  cx.lineTo(x + w - r, y);
  cx.arcTo(x + w, y, x + w, y + r, r);
  cx.lineTo(x + w, y + h - r);
  cx.arcTo(x + w, y + h, x + w - r, y + h, r);
  cx.lineTo(x + r, y + h);
  cx.arcTo(x, y + h, x, y + h - r, r);
  cx.lineTo(x, y + r);
  cx.arcTo(x, y, x + r, y, r);
  cx.closePath();
}

function isInsideCapsule(px: number, py: number, W: number, H: number): boolean {
  const halfW = W / 2;
  const capR = W / 2 - 2;
  if (py < capR) {
    const dx = px - halfW, dy = py - capR;
    return dx * dx + dy * dy <= capR * capR;
  }
  if (py > H - capR) {
    const dx = px - halfW, dy = py - (H - capR);
    return dx * dx + dy * dy <= capR * capR;
  }
  return px >= (halfW - capR) && px <= (halfW + capR);
}

/**
 * Toma un dataUrl de huella y devuelve un dataUrl procesado en forma de falange.
 */
export function processFingerprint(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const W = CAPSULE_W;
      const H = CAPSULE_H;
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d')!;
      const cornerR = W / 2;

      // Fondo blanco
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);

      // Clip a cápsula y dibujar imagen (contain)
      ctx.save();
      drawCapsulePath(ctx, 2, 2, W - 4, H - 4, cornerR - 2);
      ctx.clip();

      // "cover" mode: la huella llena toda la cápsula sin espacios blancos
      const imgAspect = img.width / img.height;
      const capAspect = W / H;
      let dw: number, dh: number, dx: number, dy: number;
      if (imgAspect > capAspect) {
        // Imagen más ancha: ajustar al alto, recortar lados
        dh = H; dw = H * imgAspect; dx = (W - dw) / 2; dy = 0;
      } else {
        // Imagen más alta: ajustar al ancho, recortar arriba/abajo
        dw = W; dh = W / imgAspect; dx = 0; dy = (H - dh) / 2;
      }
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore();

      // Escala de grises + mejora de contraste
      const id = ctx.getImageData(0, 0, W, H);
      const d = id.data;
      const n = W * H;

      const gray = new Uint8Array(n);
      for (let i = 0; i < n; i++) {
        gray[i] = Math.round(0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]);
      }

      let gMin = 255, gMax = 0;
      for (let py = 0; py < H; py++) {
        for (let px = 0; px < W; px++) {
          if (isInsideCapsule(px, py, W, H)) {
            const v = gray[py * W + px];
            if (v < gMin) gMin = v;
            if (v > gMax) gMax = v;
          }
        }
      }

      const range = gMax - gMin || 1;
      const gamma = 0.7;
      for (let i = 0; i < n; i++) {
        const py = Math.floor(i / W);
        const px = i % W;
        if (!isInsideCapsule(px, py, W, H)) {
          d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = 255;
        } else {
          const norm = (gray[i] - gMin) / range;
          const corrected = Math.pow(norm, gamma) * 255;
          const val = Math.round(Math.min(255, Math.max(0, corrected)));
          d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = val;
        }
        d[i * 4 + 3] = 255;
      }

      ctx.putImageData(id, 0, 0);

      // Borde de la cápsula
      ctx.strokeStyle = '#888888';
      ctx.lineWidth = 2;
      drawCapsulePath(ctx, 2, 2, W - 4, H - 4, cornerR - 2);
      ctx.stroke();

      resolve(canvas.toDataURL('image/png', 1.0));
    };
    img.onerror = () => resolve(dataUrl); // fallback: devolver original
    img.src = dataUrl;
  });
}
