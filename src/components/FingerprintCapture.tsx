import React, { useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Fingerprint, Camera, RotateCcw, Check, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';

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

type CaptureStep = 'idle' | 'preview' | 'captured';

export const FingerprintCapture = forwardRef<FingerprintCaptureRef, FingerprintCaptureProps>(({
  title = 'Huella Dactilar',
  subtitle = 'Fotografíe la yema del dedo del paciente con la cámara trasera',
  required = false,
  onFingerprintChange,
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [step, setStep] = useState<CaptureStep>('idle');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // ── Open camera (rear / environment facing) ──────────────────────────────
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }, // cámara trasera
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setStep('preview');
    } catch (err: any) {
      const msg = err?.name === 'NotAllowedError'
        ? 'Permiso de cámara denegado. Active el acceso en la configuración del navegador.'
        : 'No se pudo acceder a la cámara del dispositivo.';
      setCameraError(msg);
      toast.error(msg);
    }
  }, []);

  // ── Stop camera stream ────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  // ── Capture & crop to the guide circle ───────────────────────────────────
  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const vW = video.videoWidth  || 640;
    const vH = video.videoHeight || 480;
    const dW = video.clientWidth  || vW;   // CSS display width
    const dH = video.clientHeight || vH;   // CSS display height

    // Scale from CSS px → actual video px
    const scaleX = vW / dW;
    const scaleY = vH / dH;

    // Guide circle = w-32 → 128 CSS px, centered in the display
    const guideCSS   = 128;
    const guidePxW   = guideCSS * scaleX;
    const guidePxH   = guideCSS * scaleY;
    const guideRadius = Math.min(guidePxW, guidePxH) / 2;

    // Crop rectangle: center of video ± radius + 20 % padding
    const pad   = guideRadius * 0.25;
    const cx    = vW / 2;
    const cy    = vH / 2;
    const half  = guideRadius + pad;
    const sx    = Math.max(0, cx - half);
    const sy    = Math.max(0, cy - half);
    const sSize = Math.min(half * 2, vW - sx, vH - sy);

    // Output canvas: 400 × 400 circular crop
    const OUT = 400;
    canvas.width  = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // White background so the circular clip looks clean
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, OUT, OUT);

    // Circular clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(OUT / 2, OUT / 2, OUT / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(video, sx, sy, sSize, sSize, 0, 0, OUT, OUT);
    ctx.restore();

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    stopCamera();
    setCapturedImage(dataUrl);
    setStep('captured');
    onFingerprintChange?.(dataUrl);
    toast.success('Huella fotografiada correctamente');
  }, [stopCamera, onFingerprintChange]);

  // ── Retake ────────────────────────────────────────────────────────────────
  const handleRetake = useCallback(() => {
    setCapturedImage(null);
    setStep('idle');
    onFingerprintChange?.(null);
  }, [onFingerprintChange]);

  // ── Imperative handle ─────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    getFingerprintData: () => capturedImage,
    clear: handleRetake,
    isEmpty: () => !capturedImage,
  }), [capturedImage, handleRetake]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  React.useEffect(() => () => stopCamera(), [stopCamera]);

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

        {/* ── STEP: idle ── */}
        {step === 'idle' && (
          <div className="space-y-4">
            {/* Instructions */}
            <div className="bg-muted/50 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                Instrucciones para capturar la huella
              </p>
              <ol className="space-y-2 text-sm text-muted-foreground list-none">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                  Limpie la yema del pulgar del paciente con una toallita húmeda o alcohol.
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                  Pida al paciente que apoye el pulgar sobre una superficie blanca y plana.
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                  Acerque la tablet a <strong>5–10 cm</strong> del dedo y presione el botón para fotografiarlo.
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center shrink-0 mt-0.5">4</span>
                  Asegúrese de que haya buena iluminación y la imagen sea nítida.
                </li>
              </ol>
            </div>

            {cameraError && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
                {cameraError}
              </div>
            )}

            <Button
              onClick={startCamera}
              className="w-full"
              size="lg"
            >
              <Camera className="h-5 w-5 mr-2" />
              Abrir Cámara para Fotografiar Huella
            </Button>
          </div>
        )}

        {/* ── STEP: preview (live camera) ── */}
        {step === 'preview' && (
          <div className="space-y-3">
            {/* Guide overlay */}
            <div className="relative rounded-xl overflow-hidden border-2 border-primary bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full object-cover max-h-80"
              />
              {/* Finger guide frame */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="border-4 border-primary/80 rounded-full w-32 h-32 opacity-70
                               shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
                <div className="absolute text-primary text-xs font-semibold bg-black/60 px-2 py-1 rounded
                               top-[calc(50%+72px)] -translate-y-1/2 whitespace-nowrap">
                  Centre el dedo aquí
                </div>
              </div>
            </div>

            {/* Hidden canvas for capture */}
            <canvas ref={canvasRef} className="hidden" />

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleRetake} className="flex-1">
                <RotateCcw className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={capturePhoto} className="flex-1" size="lg">
                <Camera className="h-5 w-5 mr-2" />
                Capturar Huella
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Acerque la cámara al dedo y asegúrese de que las líneas del dedo sean visibles.
            </p>
          </div>
        )}

        {/* ── STEP: captured ── */}
        {step === 'captured' && capturedImage && (
          <div className="space-y-3">
            {/* Compact: huella recortada circular + badge */}
            <div className="flex items-center gap-4 bg-muted/30 rounded-xl p-4 border border-border">
              {/* Huella circular */}
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
                <p className="text-sm font-semibold text-foreground">Huella Dactilar Capturada</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Solo se conserva la zona del dedo — será adjuntada junto a la firma.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetake}
                  className="mt-2 h-7 text-xs border-primary text-primary hover:bg-primary/10"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Tomar de nuevo
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tips */}
        {step !== 'preview' && (
          <div className="bg-muted/40 rounded-lg p-3 flex items-start gap-2">
            <Fingerprint className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              <strong>Tip:</strong> Use la cámara trasera de la tablet para mayor resolución.
              Apoye el dedo sobre papel blanco con buena luz para obtener la imagen más clara de las huellas.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

FingerprintCapture.displayName = 'FingerprintCapture';
