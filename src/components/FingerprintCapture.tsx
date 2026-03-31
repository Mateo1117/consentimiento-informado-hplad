import React, {
  useRef, useState, useCallback, forwardRef, useImperativeHandle, useEffect,
} from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Fingerprint, Camera, RotateCcw, Check, Lightbulb, Usb, Loader2, Wifi, Monitor, Smartphone, Bluetooth } from 'lucide-react';
import { toast } from 'sonner';
import { digitalPersonaService, type ReaderInfo, type CaptureResult } from '@/services/digitalPersonaService';
import { webUsbDetectionService, type WebUsbDeviceInfo } from '@/services/webUsbDetectionService';
import { webUsbCaptureService, type WebUsbCaptureStatus } from '@/services/webUsbCaptureService';
import { LiteClientDiagnostics } from '@/components/LiteClientDiagnostics';
import { useFPService } from '@/hooks/useFPService';
import { bluetoothFingerprintService, type BtStatus, type BtCaptureResult, type BtReaderInfo } from '@/services/bluetoothFingerprintService';
import { processFingerprint } from '@/utils/fingerprintCapsuleProcessor';

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
type CaptureStep = 'idle' | 'preview' | 'select-finger' | 'captured' | 'usb-waiting';

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

  const gray = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    gray[i] = 0.2126 * d[i*4] + 0.7152 * d[i*4+1] + 0.0722 * d[i*4+2];
  }

  const clahe = applyCLAHE(gray, size, size, 24, 2.5);

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

  const sobel = sobelMagnitude(clahe, size, size);

  const fused = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    fused[i] = Math.min(255, Math.max(0, 0.55 * clahe[i] + 0.30 * dogN[i] + 0.15 * sobel[i]));
  }

  const halfW = 7;
  const k = -0.12;
  const result = new Uint8ClampedArray(n);

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const idx = py * size + px;
      const dx = px - halfSize, dy = py - halfSize;
      if (dx*dx + dy*dy > (halfSize - 1) * (halfSize - 1)) {
        result[idx] = 255;
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
      result[idx] = fused[idx] < mean + k * stddev ? 0 : 255;
    }
  }

  for (let i = 0; i < n; i++) {
    d[i*4] = d[i*4+1] = d[i*4+2] = result[i];
    d[i*4+3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  ctx.filter = 'blur(0.25px)';
  ctx.drawImage(ctx.canvas, 0, 0);
  ctx.filter = 'none';
}

/**
 * Same ink pipeline but for a capsule (W × H) canvas.
 * Pixels outside the capsule shape are forced to white.
 */
function applyInkEffectCapsule(ctx: CanvasRenderingContext2D, outW: number, outH: number): void {
  const imageData = ctx.getImageData(0, 0, outW, outH);
  const d = imageData.data;
  const n = outW * outH;

  const gray = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    gray[i] = 0.2126 * d[i*4] + 0.7152 * d[i*4+1] + 0.0722 * d[i*4+2];
  }

  const clahe = applyCLAHE(gray, outW, outH, 24, 2.5);
  const g1 = gaussianBlur(clahe, outW, outH, 0.8);
  const g2 = gaussianBlur(clahe, outW, outH, 2.5);
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

  const sobel = sobelMagnitude(clahe, outW, outH);
  const fused = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    fused[i] = Math.min(255, Math.max(0, 0.55 * clahe[i] + 0.30 * dogN[i] + 0.15 * sobel[i]));
  }

  const halfW = 7;
  const k = -0.12;
  const capR = outW / 2; // radius of rounded caps
  const result = new Uint8ClampedArray(n);

  const insideCapsule = (px: number, py: number): boolean => {
    // Horizontal bounds
    if (px < 0 || px >= outW || py < 0 || py >= outH) return false;
    // Rectangular body (between the two caps)
    if (py >= capR && py <= outH - capR) return true;
    // Top cap
    if (py < capR) {
      const dx = px - capR, dy = py - capR;
      return dx*dx + dy*dy <= capR * capR;
    }
    // Bottom cap
    const dx = px - capR, dy = py - (outH - capR);
    return dx*dx + dy*dy <= capR * capR;
  };

  for (let py = 0; py < outH; py++) {
    for (let px = 0; px < outW; px++) {
      const idx = py * outW + px;
      if (!insideCapsule(px, py)) {
        result[idx] = 255;
        continue;
      }
      let sum = 0, sumSq = 0, cnt = 0;
      for (let ky = Math.max(0, py - halfW); ky <= Math.min(outH - 1, py + halfW); ky++) {
        for (let kx = Math.max(0, px - halfW); kx <= Math.min(outW - 1, px + halfW); kx++) {
          const v = fused[ky * outW + kx];
          sum += v; sumSq += v * v; cnt++;
        }
      }
      const mean = sum / cnt;
      const stddev = Math.sqrt(Math.max(0, sumSq / cnt - mean * mean));
      result[idx] = fused[idx] < mean + k * stddev ? 0 : 255;
    }
  }

  for (let i = 0; i < n; i++) {
    d[i*4] = d[i*4+1] = d[i*4+2] = result[i];
    d[i*4+3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  ctx.filter = 'blur(0.25px)';
  ctx.drawImage(ctx.canvas, 0, 0);
  ctx.filter = 'none';
}

// ─── Crop helper — capsule/phalanx shape ──────────────────────────────────────
/**
 * Crops the image in a capsule (rounded-rectangle) shape that mirrors the
 * natural form of a finger phalanx: taller than it is wide, with fully
 * rounded top and bottom ends.
 *
 * widthFraction  — half-width of capsule as fraction of min(W,H)
 * heightFraction — half-height of capsule as fraction of min(W,H)
 */
function cropCapsuleRegion(
  imgDataUrl: string,
  normX: number,
  normY: number,
  widthFraction  = 0.22,   // narrower than the old circle radius
  heightFraction = 0.38,   // taller — covers full phalanx segment
  outW  = 560,
  outH  = 900,
  applyInk = false,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const W = img.naturalWidth;
      const H = img.naturalHeight;
      const base = Math.min(W, H);

      const rW = base * widthFraction;   // half-width in source pixels
      const rH = base * heightFraction;  // half-height in source pixels

      const cx = normX * W;
      const cy = normY * H;

      const sx = Math.max(0, cx - rW);
      const sy = Math.max(0, cy - rH);
      const sw = Math.min(rW * 2, W - sx);
      const sh = Math.min(rH * 2, H - sy);

      const canvas = document.createElement('canvas');
      canvas.width  = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d')!;

      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, outW, outH);

      // Capsule clip path
      ctx.save();
      ctx.beginPath();
      const r = outW / 2;  // radius for the rounded caps = half of width
      const x0 = 0, y0 = 0;
      // Top-left arc start → top-right → bottom-right → bottom-left → back
      ctx.moveTo(x0 + r, y0);
      ctx.lineTo(outW - r, y0);
      ctx.arcTo(outW, y0,      outW, y0 + r,       r);
      ctx.lineTo(outW, outH - r);
      ctx.arcTo(outW, outH,    outW - r, outH,     r);
      ctx.lineTo(x0 + r, outH);
      ctx.arcTo(x0,  outH,    x0, outH - r,        r);
      ctx.lineTo(x0, y0 + r);
      ctx.arcTo(x0,  y0,      x0 + r, y0,          r);
      ctx.closePath();
      ctx.clip();

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
      ctx.restore();

      if (applyInk) {
        applyInkEffectCapsule(ctx, outW, outH);
      }

      resolve(canvas.toDataURL('image/png', 1.0));
    };
    img.onerror = reject;
    img.src = imgDataUrl;
  });
}

// ─── SVG Finger Guide Overlay ─────────────────────────────────────────────────
const FingerGuideOverlay: React.FC = () => (
  <svg
    viewBox="0 0 100 200"
    className="absolute inset-0 w-full h-full pointer-events-none"
    style={{ opacity: 0.75 }}
  >
    {/* Single finger outline — capsule shape */}
    <rect x="15" y="20" width="70" height="160" rx="35" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeDasharray="5 3" />
    {/* Fingertip highlight */}
    <circle cx="50" cy="55" r="18" fill="hsl(var(--primary))" fillOpacity="0.2" stroke="hsl(var(--primary))" strokeWidth="1.5" />
    {/* Yema label */}
    <text x="50" y="59" textAnchor="middle" fontSize="10" fill="hsl(var(--primary))" fontWeight="bold">Yema</text>
  </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────
export const FingerprintCapture = forwardRef<FingerprintCaptureRef, FingerprintCaptureProps>(({
  title    = 'Huella Dactilar',
  subtitle = 'Fotografíe la yema del dedo del paciente para capturar la huella',
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
  // USB Reader state
  const [usbReaderInfo,  setUsbReaderInfo]  = useState<ReaderInfo>({ status: 'disconnected' });
  const [usbDetecting,   setUsbDetecting]   = useState(false);
  const [usbDetected,    setUsbDetected]    = useState(false);
  const [usbCapturing,   setUsbCapturing]   = useState(false);
  // WebUSB hardware detection
  const [webUsbInfo,     setWebUsbInfo]     = useState<WebUsbDeviceInfo>(webUsbDetectionService.getLastInfo());
  const [webUsbCaptureStatus, setWebUsbCaptureStatus2] = useState<WebUsbCaptureStatus>(webUsbCaptureService.getStatus());
  // FPService (WebSocket) — unified hook
  const fp = useFPService();
  const fpConnected = fp.connected;
  const fpBusy = ['place_finger', 'lift_finger', 'connecting'].includes(fp.status);
  // Bluetooth Direct (Web BLE)
  const [btStatus, setBtStatus] = useState<BtStatus>('disconnected');
  const [btDeviceName, setBtDeviceName] = useState<string | null>(null);
  const [btCapturing, setBtCapturing] = useState(false);

  const isPreviewOrEmbedded = useCallback(() => {
    if (typeof window === 'undefined') return false;
    const inIframe = window.self !== window.top;
    const host = window.location.hostname;
    const isPreviewHost = host.includes('lovableproject.com') || host.includes('id-preview--');
    const hasPreviewToken = window.location.search.includes('__lovable_token=');
    return inIframe || isPreviewHost || hasPreviewToken;
  }, []);

  // ── Camera helpers ──────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  // ── USB Reader: detect on mount (skip in iframe — blocked by browser) ──
  useEffect(() => {
    let cancelled = false;
    const inPreview = isPreviewOrEmbedded();

    if (!inPreview) {
      const detectReader = async () => {
        setUsbDetecting(true);
        try {
          const found = await digitalPersonaService.detect();
          if (!cancelled) {
            setUsbDetected(found);
            if (found) {
              setUsbReaderInfo(digitalPersonaService.getInfo());
            }
          }
        } catch {
          if (!cancelled) setUsbDetected(false);
        } finally {
          if (!cancelled) setUsbDetecting(false);
        }
      };
      detectReader();

      // WebUSB detection (silent, no prompt)
      webUsbDetectionService.detectPaired();
    }

    const handleStatusChange = (info: ReaderInfo) => {
      if (!cancelled) setUsbReaderInfo(info);
    };
    digitalPersonaService.on('statusChange', handleStatusChange);

    const handleWebUsb = (info: WebUsbDeviceInfo) => {
      if (!cancelled) setWebUsbInfo(info);
    };
    webUsbDetectionService.onChange(handleWebUsb);

    const handleWebUsbCapture = (status: WebUsbCaptureStatus) => {
      if (!cancelled) setWebUsbCaptureStatus2(status);
    };
    webUsbCaptureService.onStatusChange(handleWebUsbCapture);

    // Bluetooth Direct status listener
    const handleBtStatus = (info: BtReaderInfo) => {
      if (!cancelled) {
        setBtStatus(info.status);
        setBtDeviceName(info.deviceName || null);
      }
    };
    bluetoothFingerprintService.on('statusChange', handleBtStatus);

    return () => {
      cancelled = true;
      digitalPersonaService.off('statusChange', handleStatusChange);
      webUsbDetectionService.offChange(handleWebUsb);
      webUsbCaptureService.offStatusChange(handleWebUsbCapture);
      bluetoothFingerprintService.off('statusChange', handleBtStatus);
      // Cleanup BLE connection on unmount
      if (bluetoothFingerprintService.getInfo().status !== 'disconnected') {
        bluetoothFingerprintService.disconnect();
      }
    };
  }, []);

  // ── USB Reader: capture fingerprint ─────────────────────────────────────
  const captureWithUSB = useCallback(async () => {
    setStep('usb-waiting');
    setUsbCapturing(true);
    try {
      const result: CaptureResult = await digitalPersonaService.startCapture();
      if (result.success && result.imageBase64) {
        setCapturedImage(result.imageBase64);
        setSelectedFinger(null);
        setStep('captured');
        onFingerprintChange?.(result.imageBase64);
        toast.success('Huella capturada correctamente con el lector USB');
      } else {
        toast.error(result.error || 'No se pudo capturar la huella');
        setStep('idle');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error al capturar con el lector USB');
      setStep('idle');
    } finally {
      setUsbCapturing(false);
    }
  }, [onFingerprintChange]);

  // ── Lite Client fallback ────────────────────────────────────────────────
  const captureViaLiteClientFallback = useCallback(async () => {
    try {
      const found = await digitalPersonaService.detect();
      if (!found) {
        const detectReason = digitalPersonaService.getLastDetectError();
        const previewMsg = isPreviewOrEmbedded()
          ? ' Está abriendo desde preview/iframe; use la URL publicada para evitar bloqueos del navegador.'
          : '';
        const reasonMsg = detectReason ? `\n\nDetalle técnico: ${detectReason}` : '';
        toast.error(`No se detectó el Lite Client de DigitalPersona.${previewMsg}${reasonMsg}`);
        setStep('idle');
        return;
      }

      setUsbDetected(true);
      setUsbReaderInfo(digitalPersonaService.getInfo());
      setUsbCapturing(true);

      const result: CaptureResult = await digitalPersonaService.startCapture();
      if (result.success && result.imageBase64) {
        setCapturedImage(result.imageBase64);
        setSelectedFinger(null);
        setStep('captured');
        onFingerprintChange?.(result.imageBase64);
        toast.success('Huella capturada correctamente vía Lite Client');
      } else {
        toast.error(result.error || 'No se pudo capturar la huella');
        setStep('idle');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error al capturar con Lite Client');
      setStep('idle');
    } finally {
      setUsbCapturing(false);
    }
  }, [onFingerprintChange, isPreviewOrEmbedded]);

  // ── Smart capture: try WebUSB first, fallback to Lite Client ──────────────
  const captureWithWebUSB = useCallback(async () => {
    setStep('usb-waiting');
    try {
      if (!webUsbCaptureService.isConnected()) {
        const connected = await webUsbCaptureService.connect(true);
        if (!connected) {
          const lastErr = webUsbCaptureService.getLastError() || '';
          const blockedByContext =
            lastErr.includes('bloqueado') ||
            lastErr.includes('SecurityError') ||
            lastErr.includes('iframe') ||
            isPreviewOrEmbedded();

          if (blockedByContext) {
            toast.info('WebUSB está bloqueado en preview/iframe. Intentando Lite Client...');
            await captureViaLiteClientFallback();
            return;
          }

          toast.error(lastErr || 'No se pudo conectar al huellero por WebUSB.');
          setStep('idle');
          return;
        }
      }

      const result = await webUsbCaptureService.capture(30000);
      if (result.success && result.imageBase64) {
        setCapturedImage(result.imageBase64);
        setSelectedFinger(null);
        setStep('captured');
        onFingerprintChange?.(result.imageBase64);
        toast.success('Huella capturada correctamente vía WebUSB');
      } else {
        toast.error(result.error || 'No se pudo capturar la huella');
        setStep('idle');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error al capturar con WebUSB');
      setStep('idle');
    }
  }, [onFingerprintChange, captureViaLiteClientFallback, isPreviewOrEmbedded]);

  const cancelWebUSBCapture = useCallback(() => {
    webUsbCaptureService.cancelCapture();
    setStep('idle');
  }, []);

  const cancelUSBCapture = useCallback(() => {
    digitalPersonaService.stopCapture();
    setUsbCapturing(false);
    setStep('idle');
  }, []);

  // ── Bluetooth Direct (Web BLE): connect and capture ──────────────────
  const connectBluetooth = useCallback(async () => {
    setBtStatus('connecting');
    try {
      await bluetoothFingerprintService.connect();
      toast.success('Lector BLE conectado');
    } catch (err: any) {
      toast.error(err?.message || 'Error al conectar BLE');
    }
  }, []);

  const captureWithBluetooth = useCallback(async () => {
    setBtCapturing(true);
    setStep('usb-waiting');
    try {
      const result: BtCaptureResult = await bluetoothFingerprintService.startCapture(30000);
      if (result.success && result.imageBase64) {
        const dataUrl = result.imageBase64.startsWith('data:')
          ? result.imageBase64
          : `data:image/png;base64,${result.imageBase64}`;
        setCapturedImage(dataUrl);
        setSelectedFinger(null);
        setStep('captured');
        onFingerprintChange?.(dataUrl);
        toast.success('Huella capturada por Bluetooth');
      } else {
        toast.error(result.error || 'No se pudo capturar la huella por BLE');
        setStep('idle');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error al capturar con BLE');
      setStep('idle');
    } finally {
      setBtCapturing(false);
    }
  }, [onFingerprintChange]);

  // ── FPService (WebSocket): connect and capture via hook ───────────────
  const connectFpService = useCallback(() => {
    fp.connect();
  }, [fp]);

  const captureWithFpService = useCallback(() => {
    if (!fpConnected) {
      fp.connect();
      return;
    }
    fp.capture();
    setStep('usb-waiting');
  }, [fp, fpConnected]);

  // React to FPService image arriving
  useEffect(() => {
    if (fp.image && fp.status === 'success') {
      setCapturedImage(fp.image);
      setSelectedFinger(null);
      setStep('captured');
      onFingerprintChange?.(fp.image);
      toast.success('Huella capturada correctamente vía FPService');
      fp.reset();
    }
  }, [fp.image, fp.status]);

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

    // Generate live crop preview (capsule shape, small preview size)
    setCropPreview(null);
    try {
      const preview = await cropCapsuleRegion(palmImage, normX, normY, 0.22, 0.38, 96, 154, true);
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
      const cropped = await cropCapsuleRegion(palmImage, tapPoint.x, tapPoint.y, 0.22, 0.38, 560, 900, true);
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
          <div className="space-y-3">
              <div className="space-y-2">
                {/* ── Método: Bluetooth Directo (Web BLE) ── */}
                <div className={`rounded-lg border p-3 transition-colors ${
                  btStatus === 'connected'
                    ? 'border-primary/40 bg-primary/5'
                    : btStatus === 'connecting' || btCapturing
                      ? 'border-amber-500/40 bg-amber-500/5'
                      : 'border-border bg-muted/20'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Bluetooth className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold text-foreground">Bluetooth Directo (LRB SHU0809)</span>
                      {btStatus === 'connected' && btDeviceName && (
                        <span className="text-[10px] bg-green-500/15 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-full font-medium">
                          ✓ {btDeviceName}
                        </span>
                      )}
                    </div>
                  </div>

                  {btStatus === 'disconnected' || btStatus === 'unavailable' || btStatus === 'error' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={connectBluetooth}
                    >
                      <Bluetooth className="h-4 w-4 mr-2" /> Vincular Lector BLE
                    </Button>
                  ) : btStatus === 'connecting' || btCapturing ? (
                    <Button variant="outline" size="sm" className="w-full" disabled>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {btCapturing ? 'Capturando...' : 'Conectando...'}
                    </Button>
                  ) : (
                    <Button
                      onClick={captureWithBluetooth}
                      className="w-full"
                      size="sm"
                    >
                      <Fingerprint className="h-4 w-4 mr-2" /> Capturar Huella BLE
                    </Button>
                  )}

                  {btStatus === 'error' && (
                    <p className="text-[10px] text-destructive mt-1.5">
                      {bluetoothFingerprintService.getInfo().error || 'Error de conexión BLE'}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    Conecta directamente por BLE desde el navegador sin apps adicionales. Requiere Chrome en Android, Mac o Windows.
                  </p>
                </div>
              </div>
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
              {/* SVG Finger silhouette guide */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div style={{ width: '30%', maxWidth: '120px' }}>
                  <FingerGuideOverlay />
                </div>
              </div>
              {/* Instruction label */}
              <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
                <span className="text-xs font-semibold bg-black/70 text-primary px-3 py-1.5 rounded-full whitespace-nowrap">
                  Enfoque la yema del dedo del paciente
                </span>
              </div>
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleRetake} className="flex-1">
                <RotateCcw className="h-4 w-4 mr-2" /> Cancelar
              </Button>
              <Button onClick={capturePalm} className="flex-1" size="lg">
                <Camera className="h-5 w-5 mr-2" /> Capturar Dedo
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Mantenga el dedo quieto y bien enfocado dentro de la guía.
            </p>
          </div>
        )}

        {/* ── usb-waiting ──────────────────────────────────────────────────── */}
        {step === 'usb-waiting' && (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-primary/30 flex items-center justify-center">
                  <Fingerprint className="h-12 w-12 text-primary animate-pulse" />
                </div>
                <div className="absolute inset-0 w-24 h-24 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-lg font-semibold text-foreground">
                  Esperando huella...
                </p>
                <p className="text-sm text-muted-foreground">
                  Coloque la yema del dedo del paciente en el lector
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {fpBusy
                    ? 'FPService'
                    : (usbReaderInfo.deviceName || 'DigitalPersona U.are.U 4500')}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => { cancelUSBCapture(); cancelWebUSBCapture(); }} className="w-full">
              <RotateCcw className="h-4 w-4 mr-2" /> Cancelar
            </Button>
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

              {/* Capsule selector — shaped like a finger phalanx (taller than wide) */}
              {dotPos && (
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: `calc(${dotPos.x * 100}% - 36px)`,
                    top:  `calc(${dotPos.y * 100}% - 58px)`,
                  }}
                >
                  {/* Outer pulsing capsule */}
                  <div
                    className="absolute animate-ping"
                    style={{
                      width: '72px', height: '116px',
                      borderRadius: '36px',
                      border: '4px solid hsl(var(--accent))',
                      background: 'hsla(var(--accent) / 0.15)',
                      boxShadow: '0 0 16px 4px hsla(var(--accent) / 0.4)',
                    }}
                  />
                  {/* Inner solid capsule */}
                  <div
                    style={{
                      width: '72px', height: '116px',
                      borderRadius: '36px',
                      border: '3px solid hsl(var(--accent))',
                      background: 'hsla(var(--accent) / 0.25)',
                      boxShadow: '0 0 10px 2px hsla(var(--accent) / 0.5)',
                    }}
                  />
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

            {/* Live crop preview — capsule shaped */}
            {cropPreview && (
              <div className="flex items-center gap-3 bg-muted/40 rounded-lg p-3 border border-border">
                <img
                  src={cropPreview}
                  alt="Vista previa de huella"
                  style={{ width: '54px', height: '86px', borderRadius: '27px', objectFit: 'cover', border: '2px solid hsl(var(--primary))', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
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
            {/* Huella estilo sello de tinta — doble anillo cápsula/falange */}
            <div className="relative shrink-0">
              {/* Marco exterior tipo sello — forma de falange */}
              <div
                style={{
                  width: '64px', height: '102px',
                  borderRadius: '32px',
                  border: '2.5px solid #141414',
                  padding: '2px',
                  background: '#fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {/* Marco interior */}
                <div
                  style={{
                    width: '100%', height: '100%',
                    borderRadius: '29px',
                    border: '1px solid #141414',
                    background: '#fff',
                    overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <img
                    src={capturedImage}
                    alt="Huella dactilar capturada"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(100%) contrast(160%)' }}
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
        {step === 'idle' && (
          <p className="text-[11px] text-muted-foreground text-center">
            Seleccione un método de captura: USB, FPService o cámara.
          </p>
        )}
      </CardContent>
    </Card>
  );
});

FingerprintCapture.displayName = 'FingerprintCapture';
