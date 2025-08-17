import React, { useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, RotateCcw, Check } from "lucide-react";
import { toast } from "sonner";

export interface CameraCaptureRef {
  getCapturedPhoto: () => string | null;
  retakePhoto: () => void;
}

interface CameraCaptureProps {
  title?: string;
  required?: boolean;
  onPhotoCapture?: (photoData: string | null) => void;
}

export const CameraCapture = forwardRef<CameraCaptureRef, CameraCaptureProps>(({
  title = "Captura de Foto",
  required = false,
  onPhotoCapture
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useImperativeHandle(ref, () => ({
    getCapturedPhoto: () => capturedPhoto,
    retakePhoto: () => handleRetake()
  }));

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setIsStreaming(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Error al acceder a la cámara. Verifique los permisos.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsStreaming(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0);
        const photoData = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedPhoto(photoData);
        onPhotoCapture?.(photoData);
        stopCamera();
        toast.success('Foto capturada exitosamente');
      }
    }
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    onPhotoCapture?.(null);
    startCamera();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          {title} {required && <span className="text-red-500">*</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          {!capturedPhoto ? (
            <div className="space-y-4">
              {!isStreaming ? (
                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                  <Camera className="w-12 h-12 text-gray-400 mb-4" />
                  <p className="text-sm text-gray-500 text-center mb-4">
                    Presione el botón para iniciar la cámara y tomar una foto
                  </p>
                  <Button onClick={startCamera} className="flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Iniciar Cámara
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-64 object-cover rounded-lg border"
                  />
                  <div className="flex gap-2 justify-center">
                    <Button onClick={capturePhoto} className="flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      Capturar Foto
                    </Button>
                    <Button variant="outline" onClick={stopCamera}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <img
                src={capturedPhoto}
                alt="Foto capturada"
                className="w-full h-64 object-cover rounded-lg border"
              />
              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  onClick={handleRetake}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Tomar Otra Foto
                </Button>
              </div>
            </div>
          )}
        </div>

        <canvas
          ref={canvasRef}
          className="hidden"
        />
      </CardContent>
    </Card>
  );
});