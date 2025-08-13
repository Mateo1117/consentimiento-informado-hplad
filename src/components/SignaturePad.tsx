import { useRef, forwardRef, useImperativeHandle, useState, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RotateCcw, Check, PenTool, Save, Upload } from "lucide-react";
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
  onSignatureChange?: (signature: string | null) => void; // Nueva prop para captura automática
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
        }, 300); // Reduced from 500ms to 300ms for better responsiveness
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
      <Card className="w-full border-medical-blue/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-medical-blue">
            <PenTool className="h-5 w-5" />
            {title}
            {required && <span className="text-destructive">*</span>}
          </CardTitle>
          {subtitle && (
            <p className="text-sm text-medical-gray">{subtitle}</p>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs text-medical-gray">
              Área de firma digital - Use su dedo o stylus para firmar
            </Label>
            
            <div className="border-2 border-dashed border-medical-blue/30 rounded-lg bg-signature-area p-1">
              <SignatureCanvas
                ref={sigCanvas}
                onEnd={handleSignatureEnd} // Captura automática cuando termina de firmar
                canvasProps={{
                  className: "w-full h-48 rounded cursor-crosshair",
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
          </div>

          <div className="flex gap-2 justify-between flex-wrap">
            <div className="flex gap-2 flex-wrap">
              {isProfessional && professionalDocument && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadExistingSignature}
                  className="border-medical-green/30 text-medical-green hover:bg-medical-green/5"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Cargar Firma
                </Button>
              )}
              
              {!isProfessional && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveTempSignature}
                    className="border-orange-500/30 text-orange-600 hover:bg-orange-50"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Temp.
                  </Button>
                  
                  {tempSignature && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLoadTempSignature}
                      className="border-orange-500/30 text-orange-600 hover:bg-orange-50"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Cargar Temp.
                    </Button>
                  )}
                </>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                className="border-medical-blue/30 text-medical-blue hover:bg-medical-blue/5"
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
                  className="border-medical-green/30 text-medical-green hover:bg-medical-green/5"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? "Guardando..." : "Guardar Firma"}
                </Button>
              )}
            </div>
          </div>
          
          <div className="text-xs text-medical-gray bg-medical-blue-light/50 p-3 rounded">
            <div className="flex items-start gap-2">
              <Check className="h-3 w-3 mt-0.5 text-medical-green" />
              <div>
                <p className="font-medium">Instrucciones:</p>
                <ul className="mt-1 space-y-1 text-xs">
                  <li>• En tablet: Use su dedo o stylus</li>
                  <li>• En computador: Use el mouse</li>
                  <li>• Mantenga presionado mientras firma</li>
                  <li>• Use "Limpiar" para volver a firmar</li>
                  {isProfessional && (
                    <>
                      <li>• Use "Guardar Firma" para almacenar su firma automáticamente</li>
                      <li>• Use "Cargar Firma" para usar una firma previamente guardada</li>
                    </>
                  )}
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