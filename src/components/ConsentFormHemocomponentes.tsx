import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SignaturePad, SignatureRef } from "./SignaturePad";
import { CameraCapture, CameraCaptureRef } from "./CameraCapture";
import { ProfessionalSelector } from "./ProfessionalSelector";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, AlertCircle, Shield, Download, Heart, CheckCircle, Stethoscope } from "lucide-react";
import { toast } from "sonner";

interface PatientData {
  id: string;
  nombre: string;
  apellidos: string;
  tipoDocumento: string;
  numeroDocumento: string;
  fechaNacimiento: string;
  edad: number;
  eps: string;
  telefono: string;
  direccion: string;
  centroSalud: string;
}

interface ConsentFormHemocomponentesProps {
  patientData: PatientData;
  onBack: () => void;
}

const procedimientosHemocomponentes = [{
  id: "transfusion_sanguinea",
  nombre: "Transfusión Sanguínea",
  descripcion: "Es el trasplante de un tejido líquido, la sangre. Se realiza a través de la administración intravenosa de cualquiera de sus componentes (glóbulos rojos, plasma, plaquetas, crioprecipitado) con el fin de reponer su pérdida o el déficit en su producción.",
  riesgos: "Reacciones alérgicas, fiebre, infecciones, sobrecarga de volumen, reacciones hemolíticas, hipocalcemia.",
  beneficios: "Mejora de la oxigenación, reposición de componentes sanguíneos, estabilización hemodinámica.",
  alternativas: "Eritropoyetina, soluciones cristaloides/coloid es, hierro intravenoso u oral, autotransfusión.",
  implicaciones: "Requiere pruebas de compatibilidad, consentimiento informado, monitoreo continuo y disponibilidad de unidades seguras."
}];

export const ConsentFormHemocomponentes = ({
  patientData,
  onBack
}: ConsentFormHemocomponentesProps) => {
  const [selectedProcedures, setSelectedProcedures] = useState<string[]>([]);
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [professionalName, setProfessionalName] = useState("");
  const [professionalDocument, setProfessionalDocument] = useState("");
  const [showProfessionalForm, setShowProfessionalForm] = useState(false);
  const [agreedToConsent, setAgreedToConsent] = useState(false);
  const [consentDecision, setConsentDecision] = useState<"aprobar" | "disentir" | "">("");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Estados para datos del acudiente (cuando es menor de edad)
  const [guardianName, setGuardianName] = useState("");
  const [guardianDocument, setGuardianDocument] = useState("");
  const [guardianRelationship, setGuardianRelationship] = useState("");

  // Estados para enfoque diferencial
  const [enfoqueGender, setEnfoqueGender] = useState(false);
  const [enfoqueEtnia, setEnfoqueEtnia] = useState(false);
  const [enfoqueCicloVital, setEnfoqueCicloVital] = useState(false);
  const [enfoqueNoAplica, setEnfoqueNoAplica] = useState(false);
  const [enfoquePosicionSocial, setEnfoquePosicionSocial] = useState(false);
  const [enfoqueDiscapacidad, setEnfoqueDiscapacidad] = useState(false);
  const [enfoqueCondicionVida, setEnfoqueCondicionVida] = useState(false);

  const patientSignatureRef = useRef<SignatureRef>(null);
  const professionalSignatureRef = useRef<SignatureRef>(null);
  const patientCameraRef = useRef<CameraCaptureRef>(null);

  // Determinar si es menor de edad
  const isMinor = patientData.edad < 18;

  const handleProcedureChange = (procedureId: string, checked: boolean) => {
    if (checked) {
      setSelectedProcedures([...selectedProcedures, procedureId]);
    } else {
      setSelectedProcedures(selectedProcedures.filter(id => id !== procedureId));
    }
  };

  const handleProfessionalSelect = (professional: {
    name: string;
    document: string;
    signatureData: string;
  }) => {
    setProfessionalName(professional.name);
    setProfessionalDocument(professional.document);
    setShowProfessionalForm(false);
    setTimeout(() => {
      professionalSignatureRef.current?.loadSignature(professional.signatureData);
    }, 100);
  };

  const handleNewProfessional = () => {
    setProfessionalName("");
    setProfessionalDocument("");
    setShowProfessionalForm(true);
    setTimeout(() => {
      professionalSignatureRef.current?.clear();
    }, 100);
  };

  const validateForm = (): boolean => {
    if (selectedProcedures.length === 0) {
      toast.error("Debe seleccionar al menos un procedimiento");
      return false;
    }

    if (!consentDecision) {
      toast.error("Debe seleccionar si aprueba o disiente el consentimiento");
      return false;
    }

    if (!agreedToConsent) {
      toast.error("Debe aceptar el consentimiento informado");
      return false;
    }

    if (isMinor) {
      if (!guardianName.trim()) {
        toast.error("Se requiere el nombre del acudiente");
        return false;
      }
      if (!guardianDocument.trim()) {
        toast.error("Se requiere el documento del acudiente");
        return false;
      }
      if (!guardianRelationship.trim()) {
        toast.error("Se requiere especificar el parentesco del acudiente");
        return false;
      }
    }

    if (patientSignatureRef.current?.isEmpty()) {
      toast.error(isMinor ? "Se requiere la firma del acudiente" : "Se requiere la firma del paciente");
      return false;
    }

    if (!professionalName.trim()) {
      toast.error("Se requiere el nombre del profesional");
      return false;
    }

    if (!professionalDocument.trim()) {
      toast.error("Se requiere el documento del profesional");
      return false;
    }

    if (professionalSignatureRef.current?.isEmpty()) {
      toast.error("Se requiere la firma del profesional");
      return false;
    }

    return true;
  };

  const saveConsent = async () => {
    if (!validateForm()) {
      return;
    }

    setIsGeneratingPDF(true);

    try {
      toast.success("Consentimiento guardado exitosamente");
    } catch (error) {
      console.error("Error saving consent:", error);
      toast.error("Error al guardar el consentimiento: " + (error as Error).message);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="medical-header">
        <CardContent className="medical-header-content">
          <div className="flex items-center gap-4">
            <div className="medical-header-icon">
              <Stethoscope className="h-6 w-6 text-medical-blue" />
            </div>
            <div>
              <h2 className="medical-header-title">Consentimiento Informado - Hemocomponentes</h2>
              <p className="medical-header-subtitle">
                Consentimiento para transfusión de hemocomponentes
              </p>
            </div>
          </div>
          <Button onClick={onBack} variant="outline" className="medical-button-outline gap-2">
            ← Volver a búsqueda
          </Button>
        </CardContent>
      </Card>

      {/* Patient Info */}
      <Card className="medical-card">
        <CardHeader>
          <CardTitle className="medical-card-header">
            <FileText className="h-5 w-5" />
            Información del Paciente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="medical-section-grid">
            <div>
              <Label className="medical-field-label">Nombre completo</Label>
              <p className="medical-field-value">{patientData.nombre} {patientData.apellidos}</p>
            </div>
            <div>
              <Label className="medical-field-label">Documento</Label>
              <p className="medical-field-value">{patientData.tipoDocumento} {patientData.numeroDocumento}</p>
            </div>
            <div>
              <Label className="medical-field-label">Edad</Label>
              <p className="medical-field-value">{patientData.edad} años</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Menor de edad section */}
      {isMinor && (
        <Card className="medical-guardian-warning">
          <CardHeader>
            <CardTitle className="medical-guardian-title">
              <AlertCircle className="h-5 w-5" />
              Datos del Acudiente (Menor de Edad)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="medical-section-grid">
              <div>
                <Label htmlFor="guardianName" className="medical-field-label">Nombre del Acudiente *</Label>
                <Input
                  id="guardianName"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  placeholder="Nombre completo del acudiente"
                  className="medical-button-outline"
                />
              </div>
              <div>
                <Label htmlFor="guardianDocument" className="medical-field-label">Documento del Acudiente *</Label>
                <Input
                  id="guardianDocument"
                  value={guardianDocument}
                  onChange={(e) => setGuardianDocument(e.target.value)}
                  placeholder="Número de documento"
                  className="medical-button-outline"
                />
              </div>
              <div>
                <Label htmlFor="guardianRelationship" className="medical-field-label">Parentesco *</Label>
                <Input
                  id="guardianRelationship"
                  value={guardianRelationship}
                  onChange={(e) => setGuardianRelationship(e.target.value)}
                  placeholder="Ej: Madre, Padre, Tutor"
                  className="medical-button-outline"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enfoque Diferencial */}
      <Card className="medical-card">
        <CardHeader>
          <CardTitle className="medical-card-header">
            <Shield className="h-5 w-5" />
            Enfoque Diferencial
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { id: 'gender', label: 'Género y Orientación Sexual', state: enfoqueGender, setter: setEnfoqueGender },
              { id: 'ethnicity', label: 'Etnia', state: enfoqueEtnia, setter: setEnfoqueEtnia },
              { id: 'vital_cycle', label: 'Ciclo Vital', state: enfoqueCicloVital, setter: setEnfoqueCicloVital },
              { id: 'no_aplica', label: 'No Aplica', state: enfoqueNoAplica, setter: setEnfoqueNoAplica },
              { id: 'social_position', label: 'Posición Social Vulnerable', state: enfoquePosicionSocial, setter: setEnfoquePosicionSocial },
              { id: 'disability', label: 'Discapacidad', state: enfoqueDiscapacidad, setter: setEnfoqueDiscapacidad },
              { id: 'life_condition', label: 'Condición de Vida', state: enfoqueCondicionVida, setter: setEnfoqueCondicionVida }
            ].map((item) => (
              <div key={item.id} className="flex items-center space-x-2">
                <Checkbox
                  id={item.id}
                  checked={item.state}
                  onCheckedChange={(checked) => item.setter(checked as boolean)}
                />
                <Label htmlFor={item.id} className="medical-field-label cursor-pointer">
                  {item.label}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Procedimientos Hemocomponentes */}
      <Card className="medical-card">
        <CardHeader>
          <CardTitle className="medical-card-header">Procedimientos para Transfusión de Hemocomponentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {procedimientosHemocomponentes.map((procedimiento) => (
            <div key={procedimiento.id} className="medical-procedure-card">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id={procedimiento.id}
                  checked={selectedProcedures.includes(procedimiento.id)}
                  onCheckedChange={(checked) => handleProcedureChange(procedimiento.id, checked as boolean)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label htmlFor={procedimiento.id} className="medical-procedure-title">
                    {procedimiento.nombre}
                  </Label>
                  <p className="medical-procedure-description">{procedimiento.descripcion}</p>
                  
                  {/* Información desplegable cuando el procedimiento está seleccionado */}
                  {selectedProcedures.includes(procedimiento.id) && (
                    <div className="mt-4 space-y-3">
                      {/* Descripción Completa */}
                      <div className="medical-info-box medical-info-description">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-medical-blue" />
                          <h4 className="font-medium text-medical-blue">Descripción Completa:</h4>
                        </div>
                        <p className="text-sm text-medical-blue">{procedimiento.descripcion}</p>
                      </div>

                      {/* Riesgos */}
                      <div className="medical-info-box medical-info-risks">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="h-4 w-4 text-medical-red" />
                          <h4 className="font-medium text-medical-red">Riesgos:</h4>
                        </div>
                        <p className="text-sm text-medical-red">{procedimiento.riesgos}</p>
                      </div>

                      {/* Beneficios */}
                      <div className="medical-info-box medical-info-benefits">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-4 w-4 text-medical-green" />
                          <h4 className="font-medium text-medical-green">Beneficios:</h4>
                        </div>
                        <p className="text-sm text-medical-green">{procedimiento.beneficios}</p>
                      </div>

                      {/* Alternativas */}
                      <div className="medical-info-box medical-info-alternatives">
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="h-4 w-4 text-medical-purple" />
                          <h4 className="font-medium text-medical-purple">Alternativas:</h4>
                        </div>
                        <p className="text-sm text-medical-purple">{procedimiento.alternativas}</p>
                      </div>

                      {/* Implicaciones */}
                      <div className="medical-info-box medical-info-implications">
                        <div className="flex items-center gap-2 mb-2">
                          <Heart className="h-4 w-4 text-medical-orange" />
                          <h4 className="font-medium text-medical-orange">Implicaciones:</h4>
                        </div>
                        <p className="text-sm text-medical-orange">{procedimiento.implicaciones}</p>
                      </div>

                      {/* Mensaje informativo */}
                      <div className="medical-info-box medical-info-warning">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-medical-yellow" />
                          <p className="text-sm text-medical-yellow font-medium">
                            Al seleccionar este procedimiento, usted declara haber leído y comprendido toda la información anterior.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Decisión del Consentimiento */}
      <Card className="medical-card">
        <CardHeader>
          <CardTitle className="medical-card-header">Decisión del Consentimiento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="medical-field-label text-base font-medium">¿Aprueba o disiente la realización del procedimiento?</Label>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="aprobar"
                  name="consentDecision"
                  value="aprobar"
                  checked={consentDecision === "aprobar"}
                  onChange={(e) => setConsentDecision(e.target.value as "aprobar")}
                  className="text-medical-green"
                />
                <Label htmlFor="aprobar" className="cursor-pointer text-medical-green font-medium">
                  APROBAR
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="disentir"
                  name="consentDecision"
                  value="disentir"
                  checked={consentDecision === "disentir"}
                  onChange={(e) => setConsentDecision(e.target.value as "disentir")}
                  className="text-medical-red"
                />
                <Label htmlFor="disentir" className="cursor-pointer text-medical-red font-medium">
                  DISENTIR
                </Label>
              </div>
            </div>
          </div>
          
          {/* Consent Agreement moved here */}
          <div className="medical-consent-section">
            <div className="flex items-start space-x-3">
              <Checkbox id="agree-consent" checked={agreedToConsent} onCheckedChange={checked => setAgreedToConsent(checked as boolean)} className="mt-1" />
              <Label htmlFor="agree-consent" className="medical-consent-text">
                He leído, entendido y acepto los términos del consentimiento informado para la transfusión de hemocomponentes. 
                Entiendo los riesgos, beneficios y alternativas del procedimiento, y doy mi consentimiento para su realización.
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Signatures */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient/Guardian Signature */}
        <Card className="medical-card">
          <CardHeader>
            <CardTitle className="medical-card-header">
              Firma del {isMinor ? 'Acudiente' : 'Paciente'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SignaturePad ref={patientSignatureRef} title={`Firma del ${isMinor ? 'Acudiente' : 'Paciente'}`} />
            
            {/* Photo Capture below patient signature */}
            <div className="mt-4 pt-4 border-t border-medical-blue/20">
              <h4 className="medical-field-label mb-2">Fotografía del Paciente</h4>
              <div className="w-full">
                <CameraCapture ref={patientCameraRef} title="" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Professional Signature */}
        <Card className="medical-card">
          <CardHeader>
            <CardTitle className="medical-card-header">Firma del Profesional</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <ProfessionalSelector
                onProfessionalSelect={handleProfessionalSelect}
                onNewProfessional={handleNewProfessional}
              />
              <SignaturePad ref={professionalSignatureRef} title="Firma del Profesional" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Generate PDF Button */}
      <div className="flex justify-center pt-6">
        <Button
          onClick={saveConsent}
          disabled={isGeneratingPDF}
          className="medical-button-primary px-8 py-3 text-lg gap-2"
          size="lg"
        >
          <FileText className="h-5 w-5" />
          {isGeneratingPDF ? "Guardando..." : "Guardar Consentimiento"}
        </Button>
      </div>
    </div>
  );
};