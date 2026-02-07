import React, { useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

export interface CameraCaptureRef {
  capturePhoto: () => Promise<string | null>;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  getCapturedPhoto: () => string | null;
}

interface CameraCaptureProps {
  title: string;
  subtitle?: string;
  required?: boolean;
}

export const CameraCapture = forwardRef<CameraCaptureRef, CameraCaptureProps>(({
  title,
  subtitle,
  required
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    logger.debug("Starting camera...");

    // Stop any existing stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640, min: 320 },
          height: { ideal: 480, min: 240 }
        }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraActive(true);
        logger.debug("Camera started successfully");
      }
    } catch (error) {
      logger.error('Error accessing camera:', error);
      toast.error('No se pudo acceder a la cámara. Verifique los permisos.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setIsCameraActive(false);
    }
  }, []);

  const capturePhoto = useCallback(async (): Promise<string | null> => {
    logger.debug("Camera capture photo called", {
      hasVideo: !!videoRef.current,
      hasCanvas: !!canvasRef.current,
      isCameraActive
    });

    if (!videoRef.current || !canvasRef.current || !isCameraActive) {
      logger.warn("Camera not ready for capture");
      return null;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    if (!context) {
      logger.error("No canvas context available");
      return null;
    }

    // Wait for video to be ready
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      logger.warn("Video not ready", { width: video.videoWidth, height: video.videoHeight });
      return null;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    return new Promise(resolve => {
      canvas.toBlob(blob => {
        if (blob) {
          const reader = new FileReader();
          reader.onload = () => {
            const base64String = reader.result as string;
            logger.debug("Photo captured successfully");
            setCapturedPhoto(base64String);
            resolve(base64String);
          };
          reader.readAsDataURL(blob);
        } else {
          logger.error("Failed to create blob from canvas");
          resolve(null);
        }
      }, 'image/jpeg', 0.9);
    });
  }, [isCameraActive]);

  const getCapturedPhoto = useCallback(() => {
    logger.debug("Getting captured photo", { hasPhoto: !!capturedPhoto });
    return capturedPhoto;
  }, [capturedPhoto]);

  const retakePhoto = useCallback(() => {
    setCapturedPhoto(null);
    startCamera();
  }, [startCamera]);

  useImperativeHandle(ref, () => ({
    capturePhoto,
    startCamera,
    stopCamera,
    getCapturedPhoto
  }), [capturePhoto, startCamera, stopCamera, getCapturedPhoto]);

  return (
    <Card className="w-full border-border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-foreground">
          <Camera className="h-5 w-5 text-muted-foreground" />
          {title}
          {required && <span className="text-destructive">*</span>}
        </CardTitle>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Camera/Photo Area */}
        <div className="relative bg-muted rounded-xl overflow-hidden w-full aspect-[4/3] min-h-[200px]">
          {capturedPhoto ? (
            <img 
              src={capturedPhoto} 
              alt="Foto capturada" 
              className="w-full h-full object-cover" 
            />
          ) : (
            <>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className={`w-full h-full object-cover ${!isCameraActive ? 'hidden' : ''}`} 
              />
              {!isCameraActive && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <CameraOff className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Cámara no activada
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Action Buttons */}
        <div className="flex gap-2 justify-center">
          {!capturedPhoto ? (
            <>
              {!isCameraActive ? (
                <Button onClick={startCamera} variant="outline">
                  <Camera className="h-4 w-4 mr-2" />
                  Activar Cámara
                </Button>
              ) : (
                <Button onClick={capturePhoto} variant="default">
                  <Camera className="h-4 w-4 mr-2" />
                  Capturar Foto
                </Button>
              )}
            </>
          ) : (
            <div className="space-y-2 w-full text-center">
              <Button onClick={retakePhoto} variant="outline" className="w-full">
                <RotateCcw className="h-4 w-4 mr-2" />
                Tomar Nueva Foto
              </Button>
              <p className="text-sm text-accent font-medium">
                ✅ Foto capturada - Lista para incluir en el PDF
              </p>
            </div>
          )}
        </div>

        {/* Instructions */}
        <p className="text-xs text-muted-foreground text-center">
          La foto se tomará automáticamente al registrar la firma
        </p>
      </CardContent>
    </Card>
  );
});

CameraCapture.displayName = 'CameraCapture';
