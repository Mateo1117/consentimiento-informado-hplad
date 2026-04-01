import { useRef, forwardRef, useImperativeHandle, useState, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RotateCcw, PenTool, Save, Upload, Check } from "lucide-react";
import { toast } from "sonner";
import { ProfessionalSignatureService, type ProfessionalSignature } from "@/services/professionalSignatureService";

export interface SignatureRef {
  clear: () => void;
  getSignatureData: () => string | null;
  isEmpty: () => boolean;
  loadSignature: (signatureData: string) => void;
}

interface SignaturePadProps {
  title: string;
  subtitle?: string;
  required?: boolean;
  isProfessional?: boolean;
  professionalDocument?: string;
  professionalName?: string;
  onSignatureChange?: (signature: string | null) => void;
}

export const SignaturePad = forwardRef<SignatureRef, SignaturePadProps>(
  ({ title, subtitle, required = false, isProfessional = false, professionalDocument, professionalName, onSignatureChange }, ref) => {
    const sigCanvas = useRef<SignatureCanvas>(null);
    const [savedSignatures, setSavedSignatures] = useState<ProfessionalSignature[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [tempSignature, setTempSignature] = useState<string | null>(null);

    // Auto-capture signature after user stops drawing
    const handleSignatureEnd = () => {
      if (onSignatureChange) {
        setTimeout(() => {
          const signature = sigCanvas.current?.toDataURL();
          const isEmpty = sigCanvas.current?.isEmpty();
          
          console.log('🖊️ SignaturePad - Evento de fin de firma');
          console.log('Canvas está vacío:', isEmpty);
          console.log('Longitud de firma:', signature?.length || 0);
          
          if (signature && !isEmpty && signature.length > 100) {
            console.log('✅ Firma válida capturada automáticamente');
            onSignatureChange(signature);
          } else {
            console.log('❌ Firma inválida o vacía');
            onSignatureChange(null);
          }
        }, 300);
      }
    };

    // Load saved signatures if this is a professional signature pad
    useEffect(() => {
      if (isProfessional) {
        loadSavedSignatures();
      }
    }, [isProfessional]);

    const loadSavedSignatures = async () => {
      try {
        const signatures = await ProfessionalSignatureService.getAllSignatures();
        setSavedSignatures(signatures);
      } catch (error) {
        console.error('Error loading signatures:', error);
      }
    };

    const loadSignature = (signatureData: string) => {
      if (sigCanvas.current) {
        sigCanvas.current.fromDataURL(signatureData);
      }
    };

    useImperativeHandle(ref, () => ({
      clear: () => {
        sigCanvas.current?.clear();
      },
      getSignatureData: () => {
        if (sigCanvas.current?.isEmpty()) {
          return null;
        }
        return sigCanvas.current?.toDataURL();
      },
      isEmpty: () => {
        return sigCanvas.current?.isEmpty() ?? true;
      },
      loadSignature
    }));

    const handleClear = () => {
      sigCanvas.current?.clear();
      onSignatureChange?.(null);
    };

    const handleSaveSignature = async () => {
      if (!isProfessional || !professionalDocument || !professionalName) {
        toast.error("Se requiere información del profesional para guardar la firma");
        return;
      }

      const signatureData = sigCanvas.current?.toDataURL();
      if (!signatureData || sigCanvas.current?.isEmpty()) {
        toast.error("Debe firmar antes de guardar");
        return;
      }

      setIsLoading(true);
      try {
        const saved = await ProfessionalSignatureService.saveSignature({
          professional_name: professionalName,
          professional_document: professionalDocument,
          signature_data: signatureData
        });

        if (saved) {
          toast.success("Firma guardada exitosamente");
          await loadSavedSignatures();
        } else {
          toast.error("Error al guardar la firma");
        }
      } catch (error) {
        console.error('Error saving signature:', error);
        toast.error("Error al guardar la firma");
      } finally {
        setIsLoading(false);
      }
    };

    const handleSaveTempSignature = () => {
      const signatureData = sigCanvas.current?.toDataURL();
      if (!signatureData || sigCanvas.current?.isEmpty()) {
        toast.error("Debe firmar antes de guardar temporalmente");
        return;
      }

      setTempSignature(signatureData);
      toast.success("Firma guardada temporalmente para este consentimiento");
    };

    const handleLoadTempSignature = () => {
      if (!tempSignature) {
        toast.info("No hay firma temporal guardada");
        return;
      }

      loadSignature(tempSignature);
      toast.success("Firma temporal cargada");
    };

    const handleLoadExistingSignature = async () => {
      if (!professionalDocument) {
        toast.error("Se requiere el documento del profesional");
        return;
      }

      try {
        const signature = await ProfessionalSignatureService.getSignature(professionalDocument);
        if (signature) {
          loadSignature(signature.signature_data);
          toast.success("Firma cargada exitosamente");
        } else {
          toast.info("No se encontró una firma guardada para este profesional");
        }
      } catch (error) {
        console.error('Error loading signature:', error);
        toast.error("Error al cargar la firma");
      }
    };

    return (
      <Card className="w-full border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-primary">
            <PenTool className="h-5 w-5" />
            {title}
            {required && <span className="text-destructive">*</span>}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {subtitle || "Área de firma digital - Use su dedo o stylus para firmar"}
          </p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Signature Canvas Area */}
          <div className="border-2 border-dashed border-primary/30 rounded-xl bg-muted/30 p-1">
            <SignatureCanvas
              ref={sigCanvas}
              onEnd={handleSignatureEnd}
              canvasProps={{
                className: "w-full h-48 rounded-lg cursor-crosshair",
                style: { 
                  background: 'white',
                  touchAction: 'none',
                  msTouchAction: 'none',
                  WebkitUserSelect: 'none',
                  MozUserSelect: 'none',
                  msUserSelect: 'none',
                  userSelect: 'none'
                }
              }}
              backgroundColor="white"
              penColor="#1e40af"
              minWidth={2}
              maxWidth={4}
              velocityFilterWeight={0.7}
              dotSize={2}
              throttle={10}
              clearOnResize={false}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-start flex-wrap">
            {isProfessional && professionalDocument && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadExistingSignature}
                className="border-accent text-accent hover:bg-accent/10"
              >
                <Upload className="h-4 w-4 mr-2" />
                Cargar Firma
              </Button>
            )}
            
            {!isProfessional && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveTempSignature}
                className="border-orange-500 text-orange-600 hover:bg-orange-50"
              >
                <Save className="h-4 w-4 mr-2" />
                Guardar Temp.
              </Button>
            )}
            
            {!isProfessional && tempSignature && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadTempSignature}
                className="border-orange-500 text-orange-600 hover:bg-orange-50"
              >
                <Upload className="h-4 w-4 mr-2" />
                Cargar Temp.
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="border-primary text-primary hover:bg-primary/10"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
            
            {isProfessional && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveSignature}
                disabled={isLoading}
                className="border-accent text-accent hover:bg-accent/10"
              >
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? "Guardando..." : "Guardar Firma"}
              </Button>
            )}
          </div>
          
          {/* Instructions */}
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 text-accent mt-0.5 shrink-0" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Instrucciones:</p>
                <ul className="space-y-0.5 text-xs">
                  <li>• En tablet: Use su dedo o stylus</li>
                  <li>• En computador: Use el mouse</li>
                  <li>• Mantenga presionado mientras firma</li>
                  <li>• Use "Limpiar" para volver a firmar</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);

SignaturePad.displayName = "SignaturePad";
