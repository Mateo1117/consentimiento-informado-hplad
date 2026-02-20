import React, {
  useRef, useState, useCallback, forwardRef, useImperativeHandle, useEffect,
} from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Fingerprint, Camera, RotateCcw, Check, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';

// ─── Public API ───────────────────────────────────────────────────────────────
export interface FingerprintCaptureRef {
  getFingerprintData: () => string | null;
  clear: () => void;
  isEmpty: () => boolean;
}

interface FingerprintCaptureProps {
  title?: string;
  subtitle?: string;
  required?: boolean;
  onFingerprintChange?: (data: string | null) => void;
}

// ─── Types ────────────────────────────────────────────────────────────────────
type CaptureStep = 'idle' | 'preview' | 'select-finger' | 'captured';

const FINGERS = [
  { id: 'pulgar',   label: 'Pulgar',  short: 'P' },
  { id: 'indice',   label: 'Índice',  short: 'I' },
  { id: 'medio',    label: 'Medio',   short: 'M' },
  { id: 'anular',   label: 'Anular',  short: 'A' },
  { id: 'menique',  label: 'Meñique', short: 'M' },
] as const;

type FingerId = typeof FINGERS[number]['id'];

// ─── Shared fingerprint DSP utilities ─────────────────────────────────────────

/** Separable Gaussian blur — sigma can be fractional */
function gaussianBlur(src: Float32Array, w: number, h: number, sigma: number): Float32Array {
  const radius = Math.ceil(sigma * 3); // 3σ coverage
  const ks = 2 * radius + 1;
  const ker = new Float32Array(ks);
  let ksum = 0;
  for (let i = 0; i < ks; i++) {
    const x = i - radius;
    ker[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
    ksum += ker[i];
  }
  for (let i = 0; i < ks; i++) ker[i] /= ksum;

  const tmp = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 0;
      for (let k = -radius; k <= radius; k++) {
        const xi = Math.max(0, Math.min(w - 1, x + k));
        v += src[y * w + xi] * ker[k + radius];
      }
      tmp[y * w + x] = v;
    }
  }
  const dst = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 0;
      for (let k = -radius; k <= radius; k++) {
        const yi = Math.max(0, Math.min(h - 1, y + k));
        v += tmp[yi * w + x] * ker[k + radius];
      }
      dst[y * w + x] = v;
    }
  }
  return dst;
}

/**
 * CLAHE — Contrast Limited Adaptive Histogram Equalization
 * blockSize: tile size in pixels; clipLimit: histogram clip multiplier (2–4 typical)
 */
function applyCLAHE(
  gray: Float32Array, w: number, h: number,
  blockSize = 24, clipLimit = 2.5,
): Float32Array {
  const out = new Float32Array(w * h);
  const bw = Math.ceil(w / blockSize);
  const bh = Math.ceil(h / blockSize);

  for (let by = 0; by < bh; by++) {
    for (let bx = 0; bx < bw; bx++) {
      const x0 = bx * blockSize, y0 = by * blockSize;
      const x1 = Math.min(x0 + blockSize, w);
      const y1 = Math.min(y0 + blockSize, h);

      const hist = new Float32Array(256);
      let count = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          hist[Math.round(Math.min(255, Math.max(0, gray[y * w + x])))]++;
          count++;
        }
      }

      // Clip histogram and redistribute excess uniformly
      const clip = clipLimit * (count / 256);
      let excess = 0;
      for (let i = 0; i < 256; i++) {
        if (hist[i] > clip) { excess += hist[i] - clip; hist[i] = clip; }
      }
      const add = excess / 256;
      for (let i = 0; i < 256; i++) hist[i] = Math.min(clip, hist[i] + add);

      // Build CDF → LUT
      const lut = new Float32Array(256);
      let cdf = 0;
      for (let i = 0; i < 256; i++) { cdf += hist[i]; lut[i] = (cdf / count) * 255; }

      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          out[y * w + x] = lut[Math.round(Math.min(255, Math.max(0, gray[y * w + x])))];
        }
      }
    }
  }
  return out;
}

/**
 * Gradient-magnitude map — Sobel 3×3.
 * Returns magnitude normalised to [0,255].
 */
function sobelMagnitude(src: Float32Array, w: number, h: number): Float32Array {
  const mag = new Float32Array(w * h);
  let maxMag = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = (r: number, c: number) => src[(y + r) * w + (x + c)];
      const gx = -p(-1,-1) - 2*p(0,-1) - p(1,-1) + p(-1,1) + 2*p(0,1) + p(1,1);
      const gy = -p(-1,-1) - 2*p(-1,0) - p(-1,1) + p(1,-1) + 2*p(1,0) + p(1,1);
      const m = Math.sqrt(gx*gx + gy*gy);
      mag[y * w + x] = m;
      if (m > maxMag) maxMag = m;
    }
  }
  if (maxMag > 0) for (let i = 0; i < mag.length; i++) mag[i] = (mag[i] / maxMag) * 255;
  return mag;
}

/**
 * Full dactyloscopic ink-print pipeline applied to an already-drawn canvas:
 *  1. BT.709 grayscale
 *  2. CLAHE (24px tiles, clip=2.5) — normalize local contrast across the fingertip
 *  3. DoG (σ1=0.8, σ2=2.5) — ridge band-pass: keeps only ridge-width frequencies
 *  4. Sobel gradient magnitude — emphasises ridge edges
 *  5. Fusion: 55% CLAHE + 30% DoG + 15% Sobel
 *  6. Adaptive Niblack threshold (15×15 window, k=-0.12)
 *     dark pixels (ridges touching paper) → 0 (black ink)
 *     light pixels (furrows, background) → 255 (white paper)
 *  7. 0.25px Gaussian to remove jaggies while preserving ridge sharpness
 */
function applyInkEffect(ctx: CanvasRenderingContext2D, size: number): void {
  const imageData = ctx.getImageData(0, 0, size, size);
  const d = imageData.data;
  const n = size * size;
  const halfSize = size / 2;

  // ── 1. Grayscale BT.709 ──────────────────────────────────────────────────
  const gray = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    gray[i] = 0.2126 * d[i*4] + 0.7152 * d[i*4+1] + 0.0722 * d[i*4+2];
  }

  // ── 2. CLAHE ─────────────────────────────────────────────────────────────
  const clahe = applyCLAHE(gray, size, size, 24, 2.5);

  // ── 3. DoG ridge filter (σ1=0.8, σ2=2.5) ────────────────────────────────
  const g1 = gaussianBlur(clahe, size, size, 0.8);
  const g2 = gaussianBlur(clahe, size, size, 2.5);
  const dogRaw = new Float32Array(n);
  let dMin = Infinity, dMax = -Infinity;
  for (let i = 0; i < n; i++) {
    dogRaw[i] = g1[i] - g2[i];
    if (dogRaw[i] < dMin) dMin = dogRaw[i];
    if (dogRaw[i] > dMax) dMax = dogRaw[i];
  }
  const dRange = dMax - dMin || 1;
  const dogN = new Float32Array(n);
  for (let i = 0; i < n; i++) dogN[i] = ((dogRaw[i] - dMin) / dRange) * 255;

  // ── 4. Sobel gradient magnitude ───────────────────────────────────────────
  const sobel = sobelMagnitude(clahe, size, size);

  // ── 5. Fusion ─────────────────────────────────────────────────────────────
  const fused = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    fused[i] = Math.min(255, Math.max(0, 0.55 * clahe[i] + 0.30 * dogN[i] + 0.15 * sobel[i]));
  }

  // ── 6. Adaptive Niblack threshold ────────────────────────────────────────
  const halfW = 7; // 15×15 window
  const k = -0.12; // negative → threshold slightly below mean → more ridges captured
  const result = new Uint8ClampedArray(n);

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const idx = py * size + px;
      const dx = px - halfSize, dy = py - halfSize;

      if (dx*dx + dy*dy > (halfSize - 1) * (halfSize - 1)) {
        result[idx] = 255; // outside circle → white
        continue;
      }

      let sum = 0, sumSq = 0, cnt = 0;
      for (let ky = Math.max(0, py - halfW); ky <= Math.min(size - 1, py + halfW); ky++) {
        for (let kx = Math.max(0, px - halfW); kx <= Math.min(size - 1, px + halfW); kx++) {
          const v = fused[ky * size + kx];
          sum += v; sumSq += v * v; cnt++;
        }
      }
      const mean = sum / cnt;
      const stddev = Math.sqrt(Math.max(0, sumSq / cnt - mean * mean));
      // pixel < (mean + k·σ) → ridge → black ink
      result[idx] = fused[idx] < mean + k * stddev ? 0 : 255;
    }
  }

  // ── 7. Write back + anti-jaggies ─────────────────────────────────────────
  for (let i = 0; i < n; i++) {
    d[i*4] = d[i*4+1] = d[i*4+2] = result[i];
    d[i*4+3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  ctx.filter = 'blur(0.25px)';
  ctx.drawImage(ctx.canvas, 0, 0);
  ctx.filter = 'none';
}

// ─── Crop helper ──────────────────────────────────────────────────────────────
function cropCircularRegion(
  imgDataUrl: string,
  normX: number,
  normY: number,
  radiusFraction = 0.20,   // mayor radio para capturar yema completa
  outSize = 600,            // mayor resolución para mejor detalle
  applyInk = false,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const W = img.naturalWidth;
      const H = img.naturalHeight;
      const radius = Math.min(W, H) * radiusFraction;

      const cx = normX * W;
      const cy = normY * H;

      const sx = Math.max(0, cx - radius);
      const sy = Math.max(0, cy - radius);
      const sw = Math.min(radius * 2, W - sx);
      const sh = Math.min(radius * 2, H - sy);

      const canvas = document.createElement('canvas');
      canvas.width  = outSize;
      canvas.height = outSize;
      const ctx = canvas.getContext('2d')!;

      // White background + circular clip
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, outSize, outSize);
      ctx.save();
      ctx.beginPath();
      ctx.arc(outSize / 2, outSize / 2, outSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outSize, outSize);
      ctx.restore();

      // Aplicar efecto de tinta si se solicita
      if (applyInk) {
        applyInkEffect(ctx, outSize);
      }

      resolve(canvas.toDataURL('image/png', 1.0));
    };
    img.onerror = reject;
    img.src = imgDataUrl;
  });
}

// ─── SVG Palm Guide Overlay ───────────────────────────────────────────────────
const PalmGuideOverlay: React.FC = () => (
  <svg
    viewBox="0 0 200 260"
    className="absolute inset-0 w-full h-full pointer-events-none"
    style={{ opacity: 0.75 }}
  >
    {/* Palm base */}
    <ellipse cx="100" cy="195" rx="55" ry="40" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeDasharray="4 2" />

    {/* Thumb */}
    <rect x="28" y="130" width="22" height="62" rx="11" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.2" transform="rotate(-18 39 161)" />
    {/* Index */}
    <rect x="56" y="75" width="22" height="75" rx="11" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.2" />
    {/* Middle */}
    <rect x="82" y="60" width="22" height="85" rx="11" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.2" />
    {/* Ring */}
    <rect x="108" y="68" width="22" height="80" rx="11" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.2" />
    {/* Pinky */}
    <rect x="134" y="88" width="20" height="65" rx="10" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.2" />

    {/* Fingertip highlight circles */}
    <circle cx="39"  cy="118" r="8" fill="hsl(var(--primary))" fillOpacity="0.25" stroke="hsl(var(--primary))" strokeWidth="1.5" />
    <circle cx="67"  cy="80"  r="8" fill="hsl(var(--primary))" fillOpacity="0.25" stroke="hsl(var(--primary))" strokeWidth="1.5" />
    <circle cx="93"  cy="65"  r="8" fill="hsl(var(--primary))" fillOpacity="0.25" stroke="hsl(var(--primary))" strokeWidth="1.5" />
    <circle cx="119" cy="73"  r="8" fill="hsl(var(--primary))" fillOpacity="0.25" stroke="hsl(var(--primary))" strokeWidth="1.5" />
    <circle cx="144" cy="93"  r="8" fill="hsl(var(--primary))" fillOpacity="0.25" stroke="hsl(var(--primary))" strokeWidth="1.5" />

    {/* Finger labels */}
    <text x="39"  y="121" textAnchor="middle" fontSize="6" fill="hsl(var(--primary))" fontWeight="bold">P</text>
    <text x="67"  y="83"  textAnchor="middle" fontSize="6" fill="hsl(var(--primary))" fontWeight="bold">I</text>
    <text x="93"  y="68"  textAnchor="middle" fontSize="6" fill="hsl(var(--primary))" fontWeight="bold">M</text>
    <text x="119" y="76"  textAnchor="middle" fontSize="6" fill="hsl(var(--primary))" fontWeight="bold">A</text>
    <text x="144" y="96"  textAnchor="middle" fontSize="6" fill="hsl(var(--primary))" fontWeight="bold">M</text>
  </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────
export const FingerprintCapture = forwardRef<FingerprintCaptureRef, FingerprintCaptureProps>(({
  title    = 'Huella Dactilar',
  subtitle = 'Fotografíe la palma completa del paciente y seleccione el dedo para la firma',
  required = false,
  onFingerprintChange,
}, ref) => {

  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const imgContRef  = useRef<HTMLDivElement>(null);  // container div for the palm image

  const [step,           setStep]           = useState<CaptureStep>('idle');
  const [palmImage,      setPalmImage]      = useState<string | null>(null);
  const [capturedImage,  setCapturedImage]  = useState<string | null>(null);
  const [selectedFinger, setSelectedFinger] = useState<FingerId | null>(null);
  const [tapPoint,       setTapPoint]       = useState<{ x: number; y: number } | null>(null);
  // Screen coords of tap dot (corrected for letterboxing)
  const [dotPos,         setDotPos]         = useState<{ x: number; y: number } | null>(null);
  const [naturalSize,    setNaturalSize]    = useState<{ w: number; h: number } | null>(null);
  const [cameraError,    setCameraError]    = useState<string | null>(null);
  const [cropping,       setCropping]       = useState(false);
  const [cropPreview,    setCropPreview]    = useState<string | null>(null);

  // ── Camera helpers ──────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setStep('preview');
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width:  { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await new Promise<void>((res) => { video.onloadedmetadata = () => res(); });
        try { await video.play(); } catch { /* auto-play */ }
      }
    } catch (err: any) {
      const msg = err?.name === 'NotAllowedError'
        ? 'Permiso de cámara denegado. Actívelo en la configuración del navegador.'
        : 'No se pudo acceder a la cámara del dispositivo.';
      setCameraError(msg);
      toast.error(msg);
      setStep('idle');
    }
  }, []);

  // ── Capture full palm ────────────────────────────────────────────────────────
  const capturePalm = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width  = video.videoWidth  || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

    stopCamera();
    setPalmImage(dataUrl);
    setTapPoint(null);
    setDotPos(null);
    setCropPreview(null);
    setSelectedFinger(null);
    setNaturalSize(null);
    setStep('select-finger');
  }, [stopCamera]);

  // ── Compute letterbox-corrected tap point ─────────────────────────────────
  const computeLetterboxedCoords = useCallback((
    clientX: number,
    clientY: number,
    el: HTMLElement,
    natW: number,
    natH: number,
  ): { normX: number; normY: number; dotX: number; dotY: number } | null => {
    const rect = el.getBoundingClientRect();
    const elemW = rect.width;
    const elemH = rect.height;

    const imgAR = natW / natH;
    const elemAR = elemW / elemH;

    let imgRenderW: number, imgRenderH: number, imgOffX: number, imgOffY: number;

    if (imgAR > elemAR) {
      // Image is wider → fills width, letterboxed top/bottom
      imgRenderW = elemW;
      imgRenderH = elemW / imgAR;
      imgOffX = 0;
      imgOffY = (elemH - imgRenderH) / 2;
    } else {
      // Image is taller → fills height, pillarboxed left/right
      imgRenderH = elemH;
      imgRenderW = elemH * imgAR;
      imgOffX = (elemW - imgRenderW) / 2;
      imgOffY = 0;
    }

    const tapInImgX = clientX - rect.left - imgOffX;
    const tapInImgY = clientY - rect.top  - imgOffY;

    // Outside the actual image → ignore
    if (tapInImgX < 0 || tapInImgX > imgRenderW || tapInImgY < 0 || tapInImgY > imgRenderH) return null;

    const normX = tapInImgX / imgRenderW;
    const normY = tapInImgY / imgRenderH;

    // Screen position of dot (relative to container element), for CSS positioning
    const dotX = (imgOffX + normX * imgRenderW) / elemW;
    const dotY = (imgOffY + normY * imgRenderH) / elemH;

    return { normX, normY, dotX, dotY };
  }, []);

  // ── Handle tap on palm image ─────────────────────────────────────────────
  const handlePalmTap = useCallback(async (
    e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>
  ) => {
    if (!naturalSize || !palmImage) return;

    const el = e.currentTarget as HTMLElement;
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const result = computeLetterboxedCoords(clientX, clientY, el, naturalSize.w, naturalSize.h);
    if (!result) return;

    const { normX, normY, dotX, dotY } = result;
    setTapPoint({ x: normX, y: normY });
    setDotPos({ x: dotX, y: dotY });

    // Generate live crop preview
    setCropPreview(null);
    try {
      const preview = await cropCircularRegion(palmImage, normX, normY, 0.20, 120, true);
      setCropPreview(preview);
    } catch {
      // ignore preview error
    }
  }, [naturalSize, palmImage, computeLetterboxedCoords]);

  // ── When palm image loads, record its natural dimensions ─────────────────
  const handleImgLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
  }, []);

  // ── Confirm: crop the selected finger region ─────────────────────────────
  const confirmFinger = useCallback(async () => {
    if (!palmImage || !tapPoint || !selectedFinger) {
      toast.error('Toque un dedo en la imagen y seleccione cuál es');
      return;
    }
    setCropping(true);
    try {
      const cropped = await cropCircularRegion(palmImage, tapPoint.x, tapPoint.y, 0.20, 600, true);
      console.log('[FingerprintCapture] Huella capturada — tamaño data URL:', cropped.length, 'chars');
      setCapturedImage(cropped);
      setStep('captured');
      onFingerprintChange?.(cropped);
      toast.success(`Huella del dedo ${FINGERS.find(f => f.id === selectedFinger)?.label} capturada`);
    } catch {
      toast.error('No se pudo recortar la huella. Intente de nuevo.');
    } finally {
      setCropping(false);
    }
  }, [palmImage, tapPoint, selectedFinger, onFingerprintChange]);

  // ── Retake ───────────────────────────────────────────────────────────────
  const handleRetake = useCallback(() => {
    stopCamera();
    setPalmImage(null);
    setCapturedImage(null);
    setSelectedFinger(null);
    setTapPoint(null);
    setDotPos(null);
    setCropPreview(null);
    setNaturalSize(null);
    setStep('idle');
    onFingerprintChange?.(null);
  }, [stopCamera, onFingerprintChange]);

  // ── Imperative handle ─────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    getFingerprintData: () => capturedImage,
    clear: handleRetake,
    isEmpty: () => !capturedImage,
  }), [capturedImage, handleRetake]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const fingerLabel = selectedFinger
    ? FINGERS.find(f => f.id === selectedFinger)?.label
    : null;

  return (
    <Card className="w-full border-border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-primary">
          <Fingerprint className="h-5 w-5" />
          {title}
          {required && <span className="text-destructive">*</span>}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </CardHeader>

      <CardContent className="space-y-4">

        {/* ── idle ─────────────────────────────────────────────────────────── */}
        {step === 'idle' && (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                Instrucciones para capturar la huella
              </p>
              <ol className="space-y-2 text-sm text-muted-foreground list-none">
                {[
                  'Solicite al paciente que extienda la mano abierta frente a la cámara.',
                  'Encuadre toda la palma con los 5 dedos visibles y enfocados.',
                  'Presione "Capturar palma" cuando la imagen esté nítida.',
                  'Toque la YEMA (punta) del dedo deseado en la fotografía.',
                  'Seleccione el nombre del dedo y confirme para guardar la huella.',
                ].map((txt, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {txt}
                  </li>
                ))}
              </ol>
            </div>

            {cameraError && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
                {cameraError}
              </div>
            )}

            <Button onClick={startCamera} className="w-full" size="lg">
              <Camera className="h-5 w-5 mr-2" />
              Abrir Cámara para Fotografiar la Palma
            </Button>
          </div>
        )}

        {/* ── preview ──────────────────────────────────────────────────────── */}
        {step === 'preview' && (
          <div className="space-y-3">
            <div className="relative rounded-xl overflow-hidden border-2 border-primary bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full object-cover"
                style={{ minHeight: '240px', maxHeight: '360px', background: '#000' }}
                onCanPlay={(e) => {
                  const v = e.currentTarget;
                  if (v.paused) v.play().catch(() => {});
                }}
              />
              {/* SVG Palm silhouette guide */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div style={{ width: '55%', maxWidth: '220px' }}>
                  <PalmGuideOverlay />
                </div>
              </div>
              {/* Instruction label */}
              <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
                <span className="text-xs font-semibold bg-black/70 text-primary px-3 py-1.5 rounded-full whitespace-nowrap">
                  Muestre la palma completa — 5 dedos visibles
                </span>
              </div>
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleRetake} className="flex-1">
                <RotateCcw className="h-4 w-4 mr-2" /> Cancelar
              </Button>
              <Button onClick={capturePalm} className="flex-1" size="lg">
                <Camera className="h-5 w-5 mr-2" /> Capturar Palma
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Mantenga la mano quieta y asegúrese de que todos los dedos sean visibles.
            </p>
          </div>
        )}

        {/* ── select-finger ────────────────────────────────────────────────── */}
        {step === 'select-finger' && palmImage && (
          <div className="space-y-4">
            {/* Instruction */}
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 text-center">
              <p className="text-sm font-semibold text-primary">
                👆 Toque la YEMA del dedo (la punta), no el nudillo
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Luego seleccione qué dedo es y presione Confirmar
              </p>
            </div>

            {/* Palm image with tap-to-select + corrected dot indicator */}
            <div
              ref={imgContRef}
              className="relative rounded-xl overflow-hidden border-2 border-primary select-none cursor-crosshair"
              onClick={handlePalmTap}
              onTouchStart={handlePalmTap}
            >
              <img
                src={palmImage}
                alt="Palma del paciente"
                className="w-full object-contain max-h-72"
                onLoad={handleImgLoad}
                draggable={false}
              />

              {/* Corrected tap dot — position is relative to element (includes letterbox) */}
              {dotPos && (
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: `calc(${dotPos.x * 100}% - 14px)`,
                    top:  `calc(${dotPos.y * 100}% - 14px)`,
                  }}
                >
                  <div className="w-7 h-7 rounded-full border-4 border-accent bg-accent/30 shadow-lg animate-ping absolute" />
                  <div className="w-7 h-7 rounded-full border-4 border-accent bg-accent/50 shadow-lg" />
                </div>
              )}

              {/* Finger zone hint labels overlaid on image */}
              {!tapPoint && naturalSize && (
                <div className="absolute inset-0 pointer-events-none flex items-end justify-center pb-3">
                  <span className="text-[10px] font-bold bg-black/60 text-white px-2 py-1 rounded">
                    Toque la yema de un dedo ↑
                  </span>
                </div>
              )}
            </div>

            {tapPoint && (
              <p className="text-xs text-center text-accent font-medium">
                ✅ Punto seleccionado — seleccione el nombre del dedo
              </p>
            )}

            {/* Live crop preview */}
            {cropPreview && (
              <div className="flex items-center gap-3 bg-muted/40 rounded-lg p-3 border border-border">
                <img
                  src={cropPreview}
                  alt="Vista previa de huella"
                  className="w-16 h-16 rounded-full object-cover border-2 border-primary shadow"
                />
                <div>
                  <p className="text-xs font-semibold text-foreground">Vista previa del recorte</p>
                  <p className="text-xs text-muted-foreground">
                    ¿Se ve la yema del dedo? Si no, toque otra zona.
                  </p>
                </div>
              </div>
            )}

            {/* Finger name pills */}
            <div className="flex flex-wrap gap-2 justify-center">
              {FINGERS.map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedFinger(f.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    selectedFinger === f.id
                      ? 'bg-primary text-primary-foreground border-primary shadow'
                      : 'bg-background text-foreground border-border hover:border-primary/60'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleRetake} className="flex-1">
                <RotateCcw className="h-4 w-4 mr-2" /> Nueva foto
              </Button>
              <Button
                onClick={confirmFinger}
                disabled={!tapPoint || !selectedFinger || cropping}
                className="flex-1"
                size="lg"
              >
                {cropping ? 'Recortando...' : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Confirmar {fingerLabel ?? 'Dedo'}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── captured ─────────────────────────────────────────────────────── */}
        {step === 'captured' && capturedImage && (
          <div className="flex items-center gap-4 bg-muted/30 rounded-xl p-4 border border-border">
            {/* Huella estilo sello de tinta — doble anillo */}
            <div className="relative shrink-0">
              {/* Anillo exterior del sello */}
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center shadow-md"
                style={{ border: '2.5px solid #141414', padding: '2px', background: '#fff' }}
              >
                {/* Anillo interior del sello */}
                <div
                  className="w-full h-full rounded-full overflow-hidden flex items-center justify-center"
                  style={{ border: '1px solid #141414', background: '#fff' }}
                >
                  <img
                    src={capturedImage}
                    alt="Huella dactilar capturada"
                    className="w-full h-full object-cover"
                    style={{ filter: 'grayscale(100%) contrast(160%)' }}
                  />
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 bg-accent text-accent-foreground rounded-full p-1 shadow">
                <Check className="h-3 w-3" />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                Huella Dactilar — {fingerLabel && (
                  <span className="text-primary">Dedo {fingerLabel}</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Solo la yema del dedo {fingerLabel?.toLowerCase()} fue recortada y será adjuntada junto a la firma.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetake}
                className="mt-2 h-7 text-xs border-primary text-primary hover:bg-primary/10"
              >
                <RotateCcw className="h-3 w-3 mr-1" /> Tomar de nuevo
              </Button>
            </div>
          </div>
        )}

        {/* Tip footer */}
        {(step === 'idle' || step === 'select-finger') && (
          <div className="bg-muted/40 rounded-lg p-3 flex items-start gap-2">
            <Fingerprint className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              <strong>Tip:</strong> Use la cámara trasera de la tablet con buena iluminación.
              La foto de la palma permite elegir cualquiera de los cinco dedos para la firma.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

FingerprintCapture.displayName = 'FingerprintCapture';
