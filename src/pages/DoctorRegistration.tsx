import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignaturePad } from "@/components/SignaturePad";
import { AuthenticatedHeader } from "@/components/AuthenticatedHeader";
import { useToast } from "@/hooks/use-toast";
import { ProfessionalSignatureService } from "@/services/professionalSignatureService";
import { ArrowLeft, UserPlus, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SignatureRef {
  clear: () => void;
  getSignatureData: () => string | null;
  isEmpty: () => boolean;
  loadSignature: (data: string) => void;
}

const DoctorRegistration = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const signatureRef = useRef<SignatureRef>(null);
  
  const [formData, setFormData] = useState({
    professional_name: "",
    professional_document: "",
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    if (!formData.professional_name.trim() || !formData.professional_document.trim()) {
      toast({
        title: "Error",
        description: "Por favor complete todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    const signatureData = signatureRef.current?.getSignatureData();
    if (!signatureData) {
      toast({
        title: "Error",
        description: "Por favor capture la firma del médico",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await ProfessionalSignatureService.saveSignature({
        professional_name: formData.professional_name.trim(),
        professional_document: formData.professional_document.trim(),
        signature_data: signatureData,
      });

      if (result) {
        setRegistrationComplete(true);
        toast({
          title: "¡Registro exitoso!",
          description: "Los datos del médico han sido guardados correctamente",
        });
      } else {
        throw new Error("Error al guardar los datos");
      }
    } catch (error) {
      console.error("Error saving doctor data:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar el registro del médico. Intente nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewRegistration = () => {
    setRegistrationComplete(false);
    setFormData({
      professional_name: "",
      professional_document: "",
    });
    signatureRef.current?.clear();
  };

  const handleGoBack = () => {
    navigate("/");
  };

  if (registrationComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-medical-blue-light/20 to-background">
        <AuthenticatedHeader />
        
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <Card className="border-medical-green/20 bg-gradient-to-r from-white to-medical-green-light/30">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-medical-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-medical-green" />
                </div>
                <h2 className="text-xl font-semibold text-medical-green mb-2">
                  ¡Registro Completado!
                </h2>
                <p className="text-medical-gray mb-6">
                  El médico <strong>{formData.professional_name}</strong> ha sido registrado exitosamente.
                  Sus datos y firma están ahora disponibles para los consentimientos informados.
                </p>
                <div className="space-y-3">
                  <Button 
                    onClick={handleNewRegistration}
                    className="w-full"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Registrar Otro Médico
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleGoBack}
                    className="w-full"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Volver al Inicio
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-medical-blue-light/20 to-background">
      <AuthenticatedHeader />
      
      {/* Header */}
      <div className="bg-white border-b border-medical-blue/20">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={handleGoBack}
              className="text-medical-blue"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-medical-blue">Registro de Médico</h1>
              <p className="text-medical-gray">Complete los datos del médico y capture su firma</p>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Datos del médico */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-medical-blue" />
                Datos del Médico
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre Completo *</Label>
                  <Input
                    id="name"
                    placeholder="Ej: Dr. Juan Pérez López"
                    value={formData.professional_name}
                    onChange={(e) => handleInputChange("professional_name", e.target.value)}
                    className="border-medical-blue/20 focus:border-medical-blue"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="document">Número de Documento *</Label>
                  <Input
                    id="document"
                    placeholder="Ej: 12345678"
                    value={formData.professional_document}
                    onChange={(e) => handleInputChange("professional_document", e.target.value)}
                    className="border-medical-blue/20 focus:border-medical-blue"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Firma del médico */}
          <Card>
            <CardHeader>
              <CardTitle>Firma Digital</CardTitle>
            </CardHeader>
            <CardContent>
              <SignaturePad
                ref={signatureRef}
                title="Firma del Médico"
                subtitle="Por favor firme en el área designada"
                isProfessional={false}
              />
            </CardContent>
          </Card>

          {/* Botón de registro */}
          <Card>
            <CardContent className="p-6">
              <Button 
                onClick={handleSubmit} 
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? "Guardando..." : "Registrar Médico"}
              </Button>
              <p className="text-sm text-medical-gray text-center mt-3">
                * Campos requeridos
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default DoctorRegistration;