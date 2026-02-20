import React, { useRef, useState, useCallback, forwardRef, useImperativeHandle, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Fingerprint, RotateCcw, Check } from 'lucide-react';
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

export const FingerprintCapture = forwardRef<FingerprintCaptureRef, FingerprintCaptureProps>(({
  title = 'Huella Dactilar',
  subtitle = 'Coloque su dedo en el área e imprima su huella',
  required = false,
  onFingerprintChange,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasPrint, setHasPrint] = useState(false);
  const [isCaptured, setIsCaptured] = useState(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const pointCountRef = useRef(0);

  const getPos = (e: React.TouchEvent | React.MouseEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
        pressure: (touch as any).force ?? 0.5,
        radiusX: (touch as any).radiusX ?? 8,
        radiusY: (touch as any).radiusY ?? 8,
      };
    } else {
      return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY, pressure: 0.5, radiusX: 8, radiusY: 8 };
    }
  };

  const drawInk = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, radiusX: number, radiusY: number, pressure: number) => {
    const r = Math.max(radiusX, radiusY, 8) * (0.8 + pressure * 0.4);
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, `rgba(20, 30, 80, ${0.7 + pressure * 0.3})`);
    gradient.addColorStop(0.5, `rgba(20, 30, 80, ${0.3 + pressure * 0.2})`);
    gradient.addColorStop(1, 'rgba(20, 30, 80, 0)');

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  }, []);

  const startDraw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    setIsCaptured(false);
    const pos = getPos(e, canvas);
    lastPosRef.current = pos;
    pointCountRef.current = 0;
    drawInk(ctx, pos.x, pos.y, pos.radiusX, pos.radiusY, pos.pressure);
  }, [drawInk]);

  const draw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e, canvas);
    pointCountRef.current++;
    drawInk(ctx, pos.x, pos.y, pos.radiusX, pos.radiusY, pos.pressure);

    if (lastPosRef.current) {
      ctx.beginPath();
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = `rgba(20, 30, 80, 0.3)`;
      ctx.lineWidth = Math.max(pos.radiusX, pos.radiusY, 6);
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    lastPosRef.current = pos;
    setHasPrint(true);
  }, [isDrawing, drawInk]);

  const endDraw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    setIsDrawing(false);
    lastPosRef.current = null;

    const canvas = canvasRef.current;
    if (!canvas || !hasPrint) return;

    // Check if enough points were drawn to be a valid fingerprint
    if (pointCountRef.current > 5) {
      const data = canvas.toDataURL('image/png');
      setIsCaptured(true);
      onFingerprintChange?.(data);
      toast.success('Huella capturada correctamente');
    }
  }, [isDrawing, hasPrint, onFingerprintChange]);

  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasPrint(false);
    setIsCaptured(false);
    pointCountRef.current = 0;
    onFingerprintChange?.(null);
  }, [onFingerprintChange]);

  useImperativeHandle(ref, () => ({
    getFingerprintData: () => {
      const canvas = canvasRef.current;
      if (!canvas || !hasPrint) return null;
      return canvas.toDataURL('image/png');
    },
    clear: handleClear,
    isEmpty: () => !hasPrint,
  }), [hasPrint, handleClear]);

  // Draw guide circle on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.min(canvas.width, canvas.height) * 0.38, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(99, 120, 200, 0.25)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }, []);

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
        {/* Canvas area */}
        <div className={`relative border-2 rounded-xl overflow-hidden ${isCaptured ? 'border-green-400 bg-green-50/30' : 'border-dashed border-primary/30 bg-muted/30'}`} style={{ touchAction: 'none' }}>
          <canvas
            ref={canvasRef}
            width={300}
            height={240}
            className="w-full cursor-crosshair block"
            style={{ touchAction: 'none', userSelect: 'none' }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />

          {/* Overlay when not drawing */}
          {!hasPrint && !isDrawing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <Fingerprint className="h-16 w-16 text-primary/20 mb-2" />
              <p className="text-xs text-muted-foreground text-center px-4">
                Presione y arrastre su dedo aquí
              </p>
            </div>
          )}

        {/* Captured badge */}
          {isCaptured && (
            <div className="absolute top-2 right-2 bg-accent text-accent-foreground rounded-full p-1">
              <Check className="h-3 w-3" />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            className="border-primary text-primary hover:bg-primary/10"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Limpiar
          </Button>
        </div>

        {/* Hint */}
        <div className="bg-muted/50 rounded-lg p-3 flex items-start gap-2">
          <Fingerprint className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            <strong>Tip:</strong> Use la yema del dedo y mantenga presionado mientras imprime para obtener una huella clara. En computadora puede usar el mouse.
          </p>
        </div>

        {isCaptured && (
          <p className="text-xs text-accent font-medium text-center">✅ Huella capturada — será incluida junto a su firma</p>
        )}
      </CardContent>
    </Card>
  );
});

FingerprintCapture.displayName = 'FingerprintCapture';
