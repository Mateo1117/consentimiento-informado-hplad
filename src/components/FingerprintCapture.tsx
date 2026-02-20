import React, {
  useRef, useState, useCallback, forwardRef, useImperativeHandle,
} from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Fingerprint, Camera, RotateCcw, Check, Lightbulb, Hand } from 'lucide-react';
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
  { id: 'pulgar',   label: 'Pulgar' },
  { id: 'indice',   label: 'Índice' },
  { id: 'medio',    label: 'Medio' },
  { id: 'anular',   label: 'Anular' },
  { id: 'menique',  label: 'Meñique' },
] as const;

type FingerId = typeof FINGERS[number]['id'];

// ─── Crop helper (runs async off the main thread logic) ───────────────────────
function cropCircularRegion(
  imgDataUrl: string,
  normX: number,
  normY: number,
  radiusFraction = 0.14, // fraction of min(w,h)
  outSize = 480,
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

      resolve(canvas.toDataURL('image/jpeg', 0.93));
    };
    img.onerror = reject;
    img.src = imgDataUrl;
  });
}

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
  const palmImgRef  = useRef<HTMLImageElement>(null);

  const [step,           setStep]           = useState<CaptureStep>('idle');
  const [palmImage,      setPalmImage]      = useState<string | null>(null);   // full palm
  const [capturedImage,  setCapturedImage]  = useState<string | null>(null);   // cropped finger
  const [selectedFinger, setSelectedFinger] = useState<FingerId | null>(null);
  const [tapPoint,       setTapPoint]       = useState<{ x: number; y: number } | null>(null);
  const [cameraError,    setCameraError]    = useState<string | null>(null);
  const [cropping,       setCropping]       = useState(false);

  // ── Camera helpers ──────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    // Move to preview step FIRST so the <video> element is mounted in the DOM
    setStep('preview');

    // Small delay to ensure the video element is rendered before we assign srcObject
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
        // Wait for metadata so videoWidth/videoHeight are ready
        await new Promise<void>((res) => {
          video.onloadedmetadata = () => res();
        });
        try {
          await video.play();
        } catch {
          // Some browsers auto-play without needing explicit play()
        }
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
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    stopCamera();
    setPalmImage(dataUrl);
    setTapPoint(null);
    setSelectedFinger(null);
    setStep('select-finger');
  }, [stopCamera]);

  // ── Tap on palm image → store normalised point ──────────────────────────────
  const handlePalmTap = useCallback((e: React.MouseEvent<HTMLImageElement> | React.TouchEvent<HTMLImageElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    setTapPoint({
      x: (clientX - rect.left)  / rect.width,
      y: (clientY - rect.top)   / rect.height,
    });
  }, []);

  // ── Confirm: crop the selected finger region ─────────────────────────────────
  const confirmFinger = useCallback(async () => {
    if (!palmImage || !tapPoint || !selectedFinger) {
      toast.error('Toque un dedo en la imagen y seleccione cuál es');
      return;
    }
    setCropping(true);
    try {
      const cropped = await cropCircularRegion(palmImage, tapPoint.x, tapPoint.y);
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

  // ── Retake ───────────────────────────────────────────────────────────────────
  const handleRetake = useCallback(() => {
    stopCamera();
    setPalmImage(null);
    setCapturedImage(null);
    setSelectedFinger(null);
    setTapPoint(null);
    setStep('idle');
    onFingerprintChange?.(null);
  }, [stopCamera, onFingerprintChange]);

  // ── Imperative handle ────────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    getFingerprintData: () => capturedImage,
    clear: handleRetake,
    isEmpty: () => !capturedImage,
  }), [capturedImage, handleRetake]);

  React.useEffect(() => () => stopCamera(), [stopCamera]);

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
                  'Presione "Capturar palma" y luego toque el dedo deseado en la foto.',
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
              {/* Hand-shape guide overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-2">
                <Hand className="h-24 w-24 text-primary/60 stroke-1 drop-shadow-lg" />
                <span className="text-xs font-semibold bg-black/60 text-primary px-2 py-1 rounded whitespace-nowrap">
                  Muestre la palma completa con los 5 dedos
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
            <p className="text-sm text-foreground font-medium text-center">
              Toque el dedo cuya huella desea usar para la firma
            </p>

            {/* Palm image with tap-to-select + dot indicator */}
            <div className="relative rounded-xl overflow-hidden border-2 border-primary select-none">
              <img
                ref={palmImgRef}
                src={palmImage}
                alt="Palma del paciente"
                className="w-full object-contain max-h-64 cursor-crosshair"
                onClick={handlePalmTap}
                onTouchStart={handlePalmTap}
                draggable={false}
              />
              {/* Tap point indicator */}
              {tapPoint && (
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left:  `calc(${tapPoint.x * 100}% - 14px)`,
                    top:   `calc(${tapPoint.y * 100}% - 14px)`,
                  }}
                >
                  <div className="w-7 h-7 rounded-full border-4 border-accent bg-accent/30 shadow-lg animate-ping absolute" />
                  <div className="w-7 h-7 rounded-full border-4 border-accent bg-accent/50 shadow-lg" />
                </div>
              )}
            </div>

            {tapPoint && (
              <p className="text-xs text-center text-accent font-medium">
                ✅ Punto seleccionado — ahora indique qué dedo es
              </p>
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
            {/* Circular fingerprint */}
            <div className="relative shrink-0">
              <img
                src={capturedImage}
                alt="Huella dactilar capturada"
                className="w-24 h-24 rounded-full object-cover border-4 border-primary shadow-md"
              />
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

        {/* Tip footer (not shown during camera preview or after capture) */}
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
