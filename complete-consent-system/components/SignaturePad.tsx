import React, { useRef, useImperativeHandle, forwardRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ProfessionalSignatureService } from "@/services/professionalSignatureService";
import { Save, Upload, Trash2, Download } from "lucide-react";

export interface SignatureRef {
  clear: () => void;
  getSignatureData: () => string | null;
  isEmpty: () => boolean;
  loadSignature: (signatureData: string) => void;
}

interface SignaturePadProps {
  title?: string;
  subtitle?: string;
  required?: boolean;
  onSignatureChange?: (signature: string | null) => void;
  isProfessional?: boolean;
  professionalDocument?: string;
  professionalName?: string;
}

export const SignaturePad = forwardRef<SignatureRef, SignaturePadProps>(({
  title = "Firma",
  subtitle,
  required = false,
  onSignatureChange,
  isProfessional = false,
  professionalDocument,
  professionalName
}, ref) => {
  const signatureRef = useRef<SignatureCanvas>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [tempSignature, setTempSignature] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useImperativeHandle(ref, () => ({
    clear: () => {
      signatureRef.current?.clear();
      setHasSignature(false);
      setTempSignature(null);
      onSignatureChange?.(null);
    },
    getSignatureData: () => {
      if (signatureRef.current?.isEmpty()) return null;
      return signatureRef.current?.toDataURL() || null;
    },
    isEmpty: () => {
      return signatureRef.current?.isEmpty() || false;
    },
    loadSignature: (signatureData: string) => {
      if (signatureRef.current && signatureData) {
        signatureRef.current.fromDataURL(signatureData);
        setHasSignature(true);
        onSignatureChange?.(signatureData);
      }
    }
  }));

  const handleEnd = () => {
    if (signatureRef.current && !signatureRef.current.isEmpty()) {
      const signatureData = signatureRef.current.toDataURL();
      setHasSignature(true);
      onSignatureChange?.(signatureData);
    }
  };

  const handleClear = () => {
    signatureRef.current?.clear();
    setHasSignature(false);
    setTempSignature(null);
    onSignatureChange?.(null);
  };

  const handleSaveTemp = () => {
    if (signatureRef.current && !signatureRef.current.isEmpty()) {
      const signatureData = signatureRef.current.toDataURL();
      setTempSignature(signatureData);
      toast.success('Firma guardada temporalmente');
    } else {
      toast.error('No hay firma para guardar');
    }
  };

  const handleLoadTemp = () => {
    if (tempSignature && signatureRef.current) {
      signatureRef.current.fromDataURL(tempSignature);
      setHasSignature(true);
      onSignatureChange?.(tempSignature);
      toast.success('Firma temporal cargada');
    } else {
      toast.error('No hay firma temporal guardada');
    }
  };

  const handleLoadExisting = async () => {
    if (!isProfessional || !professionalDocument) return;

    setIsLoading(true);
    try {
      const signature = await ProfessionalSignatureService.getCurrentUserSignature();
      if (signature && signatureRef.current) {
        signatureRef.current.fromDataURL(signature.signature_data);
        setHasSignature(true);
        onSignatureChange?.(signature.signature_data);
        toast.success('Firma profesional cargada');
      } else {
        toast.error('No se encontró firma profesional guardada');
      }
    } catch (error) {
      console.error('Error loading existing signature:', error);
      toast.error('Error al cargar la firma');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfessional = async () => {
    if (!isProfessional || !professionalDocument || !professionalName) {
      toast.error('Información profesional incompleta');
      return;
    }

    if (signatureRef.current?.isEmpty()) {
      toast.error('No hay firma para guardar');
      return;
    }

    setIsLoading(true);
    try {
      const signatureData = signatureRef.current.toDataURL();
      const saved = await ProfessionalSignatureService.saveSignature({
        professional_name: professionalName,
        professional_document: professionalDocument,
        signature_data: signatureData,
        created_by: null // Will be set automatically by the service
      });

      if (saved) {
        toast.success('Firma profesional guardada exitosamente');
      } else {
        toast.error('Error al guardar la firma profesional');
      }
    } catch (error) {
      console.error('Error saving professional signature:', error);
      toast.error('Error al guardar la firma profesional');
    } finally {
      setIsLoading(false);
    }
  };

  // Load existing signature on mount for professionals
  useEffect(() => {
    if (isProfessional && professionalDocument) {
      handleLoadExisting();
    }
  }, [isProfessional, professionalDocument]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          {title} {required && <span className="text-red-500">*</span>}
        </CardTitle>
        {subtitle && (
          <p className="text-sm text-gray-500">{subtitle}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-2">
          <SignatureCanvas
            ref={signatureRef}
            canvasProps={{
              width: 400,
              height: 200,
              className: 'signature-canvas w-full h-full'
            }}
            onEnd={() => {
              // NUEVA CAPTURA INMEDIATA Y ROBUSTA PARA MÓVIL
              console.log('🖊️ EVENTO onEnd - Usuario terminó de firmar');
              
              if (!signatureRef.current) {
                console.error('❌ No hay referencia al canvas');
                return;
              }
              
              // Captura INMEDIATA sin timeout para móviles
              const isEmpty = signatureRef.current.isEmpty();
              console.log('📊 Estado del canvas:');
              console.log('- Canvas vacío:', isEmpty);
              
              if (!isEmpty) {
                const signatureData = signatureRef.current.toDataURL();
                console.log('✅ CAPTURANDO FIRMA INMEDIATA:');
                console.log('- Longitud:', signatureData?.length || 0);
                console.log('- Tipo válido:', signatureData?.startsWith('data:image/png;base64,'));
                console.log('- Muestra:', signatureData?.substring(0, 50) + '...');
                
                setHasSignature(true);
                onSignatureChange?.(signatureData || null);
                console.log('📤 Firma enviada INMEDIATAMENTE al componente padre');
              } else {
                console.log('❌ Canvas detectado como vacío');
                setHasSignature(false);
                onSignatureChange?.(null);
              }
              
              // Backup timeout por si la captura inmediata falla en algunos dispositivos
              setTimeout(() => {
                if (signatureRef.current && !signatureRef.current.isEmpty()) {
                  const backupSignatureData = signatureRef.current.toDataURL();
                  console.log('🔄 BACKUP: Recapturando firma después de 100ms');
                  setHasSignature(true);
                  onSignatureChange?.(backupSignatureData || null);
                }
              }, 100);
            }}
          />
        </div>
        
        <div className="text-sm text-gray-500 text-center">
          {hasSignature 
            ? "Firma capturada. Puede limpiar y firmar nuevamente si lo desea."
            : "Dibuje su firma en el área de arriba"
          }
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClear}
            className="flex items-center gap-1"
          >
            <Trash2 className="w-4 h-4" />
            Limpiar
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSaveTemp}
            className="flex items-center gap-1"
          >
            <Save className="w-4 h-4" />
            Guardar Temp
          </Button>

          {tempSignature && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLoadTemp}
              className="flex items-center gap-1"
            >
              <Upload className="w-4 h-4" />
              Cargar Temp
            </Button>
          )}

          {isProfessional && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLoadExisting}
                disabled={isLoading}
                className="flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                {isLoading ? 'Cargando...' : 'Cargar Existente'}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSaveProfessional}
                disabled={isLoading}
                className="flex items-center gap-1"
              >
                <Save className="w-4 h-4" />
                {isLoading ? 'Guardando...' : 'Guardar Profesional'}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
});