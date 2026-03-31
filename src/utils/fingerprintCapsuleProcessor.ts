/**
 * Procesa una imagen de huella dactilar y la recorta en forma de falange/cápsula
 * con la huella centrada, ampliada y sin espacios blancos visibles.
 */

const CAPSULE_W = 480;
const CAPSULE_H = 680;

function drawCapsulePath(
  cx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
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
    const dx = px - halfW;
    const dy = py - capR;
    return dx * dx + dy * dy <= capR * capR;
  }
  if (py > H - capR) {
    const dx = px - halfW;
    const dy = py - (H - capR);
    return dx * dx + dy * dy <= capR * capR;
  }
  return px >= halfW - capR && px <= halfW + capR;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function detectFingerprintBounds(img: HTMLImageElement) {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');

  if (!ctx || canvas.width < 2 || canvas.height < 2) {
    return { sx: 0, sy: 0, sw: canvas.width || 1, sh: canvas.height || 1 };
  }

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const w = canvas.width;
  const h = canvas.height;
  const total = w * h;

  let minGray = 255;
  let borderSum = 0;
  let borderCount = 0;

  const borderX = Math.max(2, Math.floor(w * 0.06));
  const borderY = Math.max(2, Math.floor(h * 0.06));

  for (let i = 0; i < total; i++) {
    const offset = i * 4;
    const gray = Math.round(0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2]);
    if (gray < minGray) minGray = gray;

    const x = i % w;
    const y = Math.floor(i / w);
    const isBorder = x < borderX || x >= w - borderX || y < borderY || y >= h - borderY;
    if (isBorder) {
      borderSum += gray;
      borderCount += 1;
    }
  }

  const borderAvg = borderCount ? borderSum / borderCount : 255;
  const threshold = clamp(Math.round(borderAvg - Math.max(14, (borderAvg - minGray) * 0.18)), 110, 245);

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const offset = (y * w + x) * 4;
      const alpha = data[offset + 3];
      const gray = Math.round(0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2]);
      if (alpha > 8 && gray <= threshold) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX <= minX || maxY <= minY) {
    return { sx: 0, sy: 0, sw: w, sh: h };
  }

  const rawW = maxX - minX + 1;
  const rawH = maxY - minY + 1;
  const padX = Math.max(10, Math.round(rawW * 0.12));
  const padY = Math.max(14, Math.round(rawH * 0.12));

  const sx = clamp(minX - padX, 0, w - 1);
  const sy = clamp(minY - padY, 0, h - 1);
  const ex = clamp(maxX + padX, sx + 1, w);
  const ey = clamp(maxY + padY, sy + 1, h);

  return {
    sx,
    sy,
    sw: Math.max(1, ex - sx),
    sh: Math.max(1, ey - sy),
  };
}

export function processFingerprint(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const W = CAPSULE_W;
      const H = CAPSULE_H;
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      const cornerR = W / 2;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      drawCapsulePath(ctx, 2, 2, W - 4, H - 4, cornerR - 2);
      ctx.clip();

      // Usar imagen completa sin crop/zoom
      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;
      const srcAspect = iw / ih;
      const capAspect = W / H;
      let dw: number;
      let dh: number;
      let dx: number;
      let dy: number;

      // "cover" – llena toda la cápsula sin espacios blancos
      if (srcAspect > capAspect) {
        dh = H;
        dw = H * srcAspect;
        dx = (W - dw) / 2;
        dy = 0;
      } else {
        dw = W;
        dh = W / srcAspect;
        dx = 0;
        dy = (H - dh) / 2;
      }

      // El servicio BLE ya entrega la imagen con orientación corregida;
      // aquí solo la dibujamos centrada dentro de la cápsula.
      ctx.drawImage(img, 0, 0, iw, ih, dx, dy, dw, dh);
      ctx.restore();

      const id = ctx.getImageData(0, 0, W, H);
      const d = id.data;
      const n = W * H;
      const gray = new Uint8Array(n);

      for (let i = 0; i < n; i++) {
        gray[i] = Math.round(0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]);
      }

      let gMin = 255;
      let gMax = 0;
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
      const gamma = 0.72;
      for (let i = 0; i < n; i++) {
        const py = Math.floor(i / W);
        const px = i % W;
        if (!isInsideCapsule(px, py, W, H)) {
          d[i * 4] = 255;
          d[i * 4 + 1] = 255;
          d[i * 4 + 2] = 255;
        } else {
          const norm = (gray[i] - gMin) / range;
          const corrected = Math.pow(norm, gamma) * 255;
          const val = Math.round(clamp(corrected, 0, 255));
          d[i * 4] = val;
          d[i * 4 + 1] = val;
          d[i * 4 + 2] = val;
        }
        d[i * 4 + 3] = 255;
      }

      ctx.putImageData(id, 0, 0);
      ctx.strokeStyle = '#888888';
      ctx.lineWidth = 2;
      drawCapsulePath(ctx, 2, 2, W - 4, H - 4, cornerR - 2);
      ctx.stroke();

      resolve(canvas.toDataURL('image/png', 1.0));
    };

    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
