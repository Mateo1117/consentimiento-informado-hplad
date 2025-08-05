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
import { FileText, AlertCircle, Shield, Download, TestTube, CheckCircle, Heart } from "lucide-react";
import { toast } from "sonner";
import { ConsentPDFGenerator, type ConsentPDFData } from "@/utils/pdfGeneratorHIV";
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
interface ConsentFormHIVProps {
  patientData: PatientData;
  onBack: () => void;
}
const procedimientosHIV = [{
  id: "toma_muestra_hiv",
  nombre: "Toma de muestra sanguínea para detección de VIH",
  descripcion: "Extracción de sangre venosa o recolección de fluido oral para detectar la presencia de anticuerpos, antígenos o material genético del VIH mediante pruebas rápidas, ELISA o PCR.",
  riesgos: "Mínimos: dolor en el sitio de punción, hematoma, mareo; en prueba oral, posible irritación en encías.",
  beneficios: "Diagnóstico temprano, acceso oportuno a tratamiento y consejería, reducción del riesgo de transmisión.",
  alternativas: "Autopruebas de VIH, pruebas de cuarta generación, pruebas de detección de carga viral.",
  implicaciones: "Requiere consentimiento informado, asesoría pre y post prueba, confidencialidad y seguimiento en caso de resultado positivo."
}];
export const ConsentFormHIV = ({
  patientData,
  onBack
}: ConsentFormHIVProps) => {
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
  const generatePDF = async () => {
    if (!validateForm()) {
      return;
    }
    setIsGeneratingPDF(true);
    try {
      const selectedProcedureData = procedimientosHIV.filter(p => selectedProcedures.includes(p.id));
      const patientSignatureData = patientSignatureRef.current?.getSignatureData();
      const professionalSignatureData = professionalSignatureRef.current?.getSignatureData();
      if (!patientSignatureData || !professionalSignatureData) {
        toast.error("Se requieren ambas firmas para generar el consentimiento");
        setIsGeneratingPDF(false);
        return;
      }
      let patientPhoto = patientCameraRef.current?.getCapturedPhoto();
      if (!patientPhoto) {
        try {
          await patientCameraRef.current?.startCamera();
          await new Promise(resolve => setTimeout(resolve, 500));
          const capturedPatient = await patientCameraRef.current?.capturePhoto();
          if (capturedPatient) patientPhoto = capturedPatient;
        } catch (error) {
          console.warn("Error capturing photo:", error);
        }
      }
      const pdfGenerator = new ConsentPDFGenerator();
      const pdfData: ConsentPDFData = {
        patientData,
        isMinor,
        guardianName: isMinor ? guardianName : undefined,
        guardianDocument: isMinor ? guardianDocument : undefined,
        guardianRelationship: isMinor ? guardianRelationship : undefined,
        professionalName,
        professionalDocument,
        consentDecision: consentDecision as "aprobar" | "disentir",
        selectedProcedures: selectedProcedureData,
        patientSignature: patientSignatureData,
        professionalSignature: professionalSignatureData,
        patientPhoto: patientPhoto,
        enfoqueData: {
          gender: enfoqueGender,
          ethnicity: enfoqueEtnia,
          vital_cycle: enfoqueCicloVital,
          social_position: enfoquePosicionSocial,
          disability: enfoqueDiscapacidad,
          life_condition: enfoqueCondicionVida
        }
      };
      const pdf = pdfGenerator.generatePDF(pdfData);
      const fileName = `Consentimiento_VIH_${patientData.numeroDocumento}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      toast.success("PDF generado exitosamente");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Error al generar el PDF: " + (error as Error).message);
    } finally {
      setIsGeneratingPDF(false);
    }
  };
  return <div className="space-y-6">
      {/* Header */}
      <Card className="border-medical-blue/20 bg-gradient-to-r from-white to-medical-blue-light/30">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-medical-blue/10 rounded-full flex items-center justify-center">
                <TestTube className="h-6 w-6 text-medical-blue" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-medical-blue">Consentimiento Informado - VIH</h2>
                <p className="text-medical-gray">
                  Consentimiento para toma de muestras para detección de VIH
                </p>
              </div>
            </div>
            <Button onClick={onBack} variant="outline" className="gap-2">
              ← Volver a búsqueda
            </Button>
          </div>
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
      {isMinor && <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-700">
              <AlertCircle className="h-5 w-5" />
              Datos del Acudiente (Menor de Edad)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="guardianName">Nombre del Acudiente *</Label>
                <Input id="guardianName" value={guardianName} onChange={e => setGuardianName(e.target.value)} placeholder="Nombre completo del acudiente" />
              </div>
              <div>
                <Label htmlFor="guardianDocument">Documento del Acudiente *</Label>
                <Input id="guardianDocument" value={guardianDocument} onChange={e => setGuardianDocument(e.target.value)} placeholder="Número de documento" />
              </div>
              <div>
                <Label htmlFor="guardianRelationship">Parentesco *</Label>
                <Input id="guardianRelationship" value={guardianRelationship} onChange={e => setGuardianRelationship(e.target.value)} placeholder="Ej: Madre, Padre, Tutor" />
              </div>
            </div>
          </CardContent>
        </Card>}

      {/* Enfoque Diferencial */}
      <Card className="border-medical-blue/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-medical-blue">
            <Shield className="h-5 w-5" />
            Enfoque Diferencial
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[{
            id: 'gender',
            label: 'Género y Orientación Sexual',
            state: enfoqueGender,
            setter: setEnfoqueGender
          }, {
            id: 'ethnicity',
            label: 'Etnia',
            state: enfoqueEtnia,
            setter: setEnfoqueEtnia
          }, {
            id: 'vital_cycle',
            label: 'Ciclo Vital',
            state: enfoqueCicloVital,
            setter: setEnfoqueCicloVital
          }, {
            id: 'no_aplica',
            label: 'No Aplica',
            state: enfoqueNoAplica,
            setter: setEnfoqueNoAplica
          }, {
            id: 'social_position',
            label: 'Posición Social Vulnerable',
            state: enfoquePosicionSocial,
            setter: setEnfoquePosicionSocial
          }, {
            id: 'disability',
            label: 'Discapacidad',
            state: enfoqueDiscapacidad,
            setter: setEnfoqueDiscapacidad
          }, {
            id: 'life_condition',
            label: 'Condición de Vida',
            state: enfoqueCondicionVida,
            setter: setEnfoqueCondicionVida
          }].map(item => <div key={item.id} className="flex items-center space-x-2">
                <Checkbox id={item.id} checked={item.state} onCheckedChange={checked => item.setter(checked as boolean)} />
                <Label htmlFor={item.id} className="text-sm cursor-pointer">
                  {item.label}
                </Label>
              </div>)}
          </div>
        </CardContent>
      </Card>

      {/* Procedimientos VIH */}
      <Card className="border-medical-blue/20">
        <CardHeader>
          <CardTitle className="text-medical-blue">Procedimientos para VIH</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {procedimientosHIV.map(procedimiento => <div key={procedimiento.id} className="border rounded-lg p-4">
               <div className="flex items-start space-x-3">
                 <Checkbox id={procedimiento.id} checked={selectedProcedures.includes(procedimiento.id)} onCheckedChange={checked => handleProcedureChange(procedimiento.id, checked as boolean)} className="mt-1" />
                 <div className="flex-1">
                   <Label htmlFor={procedimiento.id} className="text-base font-semibold text-medical-blue cursor-pointer">
                     {procedimiento.nombre}
                   </Label>
                   <p className="text-sm text-medical-gray mt-1">{procedimiento.descripcion}</p>
                   
                   {/* Información desplegable cuando el procedimiento está seleccionado */}
                   {selectedProcedures.includes(procedimiento.id) && <div className="mt-4 space-y-3">
                       {/* Descripción Completa */}
                       <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
                         <div className="flex items-center gap-2 mb-2">
                           <FileText className="h-4 w-4 text-blue-600" />
                           <h4 className="font-medium text-blue-800">Descripción Completa:</h4>
                         </div>
                         <p className="text-sm text-blue-700">{procedimiento.descripcion}</p>
                       </div>

                       {/* Riesgos */}
                       <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded">
                         <div className="flex items-center gap-2 mb-2">
                           <AlertCircle className="h-4 w-4 text-red-600" />
                           <h4 className="font-medium text-red-800">Riesgos:</h4>
                         </div>
                         <p className="text-sm text-red-700">{procedimiento.riesgos}</p>
                       </div>

                       {/* Beneficios */}
                       <div className="bg-green-50 border-l-4 border-green-400 p-3 rounded">
                         <div className="flex items-center gap-2 mb-2">
                           <CheckCircle className="h-4 w-4 text-green-600" />
                           <h4 className="font-medium text-green-800">Beneficios:</h4>
                         </div>
                         <p className="text-sm text-green-700">{procedimiento.beneficios}</p>
                       </div>

                       {/* Alternativas */}
                       <div className="bg-purple-50 border-l-4 border-purple-400 p-3 rounded">
                         <div className="flex items-center gap-2 mb-2">
                           <Shield className="h-4 w-4 text-purple-600" />
                           <h4 className="font-medium text-purple-800">Alternativas:</h4>
                         </div>
                         <p className="text-sm text-purple-700">{procedimiento.alternativas}</p>
                       </div>

                       {/* Implicaciones */}
                       <div className="bg-orange-50 border-l-4 border-orange-400 p-3 rounded">
                         <div className="flex items-center gap-2 mb-2">
                           <Heart className="h-4 w-4 text-orange-600" />
                           <h4 className="font-medium text-orange-800">Implicaciones:</h4>
                         </div>
                         <p className="text-sm text-orange-700">{procedimiento.implicaciones}</p>
                       </div>

                       {/* Mensaje informativo */}
                       <div className="bg-blue-100 border border-blue-300 p-3 rounded">
                         <div className="flex items-center gap-2">
                           <FileText className="h-4 w-4 text-blue-600" />
                           <p className="text-sm text-blue-800 font-medium">
                             Al seleccionar este procedimiento, usted declara haber leído y comprendido toda la información anterior.
                           </p>
                         </div>
                       </div>
                     </div>}
                 </div>
               </div>
             </div>)}
        </CardContent>
      </Card>

      {/* Decisión del Consentimiento */}
      <Card className="border-medical-blue/20">
        <CardHeader>
          <CardTitle className="text-medical-blue">Decisión del Consentimiento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-base font-medium">¿Aprueba o disiente la realización del procedimiento?</Label>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <input type="radio" id="aprobar" name="consentDecision" value="aprobar" checked={consentDecision === "aprobar"} onChange={e => setConsentDecision(e.target.value as "aprobar")} className="text-medical-green" />
                <Label htmlFor="aprobar" className="cursor-pointer text-medical-green font-medium">
                  APROBAR
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input type="radio" id="disentir" name="consentDecision" value="disentir" checked={consentDecision === "disentir"} onChange={e => setConsentDecision(e.target.value as "disentir")} className="text-red-600" />
                <Label htmlFor="disentir" className="cursor-pointer text-red-600 font-medium">
                  DISENTIR
                </Label>
              </div>
            </div>
          </div>
          
          {/* Consent Agreement moved here */}
          <div className="mt-6 pt-4 border-t border-medical-blue/20 bg-medical-blue-light/10 p-4 rounded">
            <div className="flex items-start space-x-3">
              <Checkbox id="agree-consent" checked={agreedToConsent} onCheckedChange={checked => setAgreedToConsent(checked as boolean)} className="mt-1" />
              <Label htmlFor="agree-consent" className="text-sm leading-relaxed cursor-pointer">
                He leído, entendido y acepto los términos del consentimiento informado para la toma de muestras para detección de VIH. 
                Entiendo los riesgos, beneficios y alternativas del procedimiento, y doy mi consentimiento para su realización.
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Signatures */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient/Guardian Signature */}
        <Card className="border-medical-blue/20">
          <CardHeader>
            <CardTitle className="text-medical-blue">
              Firma del {isMinor ? 'Acudiente' : 'Paciente'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SignaturePad ref={patientSignatureRef} title={`Firma del ${isMinor ? 'Acudiente' : 'Paciente'}`} />
            
            {/* Foto del paciente directamente debajo de la firma */}
            <div className="mt-4 pt-4 border-t border-medical-blue/20">
              <h4 className="medical-field-label mb-2">Fotografía del Paciente</h4>
              <div className="w-full">
                <CameraCapture ref={patientCameraRef} title="" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Professional Signature */}
        <Card className="border-medical-blue/20">
          <CardHeader>
            <CardTitle className="text-medical-blue">Firma del Profesional</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProfessionalSelector onProfessionalSelect={handleProfessionalSelect} onNewProfessional={handleNewProfessional} />
            <SignaturePad ref={professionalSignatureRef} title="Firma del Profesional" />
          </CardContent>
        </Card>
      </div>

      {/* Additional Info */}
      <Card className="border-medical-blue/20 mt-4">
        
        <CardContent>
          
        </CardContent>
      </Card>


      {/* Generate PDF Button */}
      <div className="flex justify-center pt-6">
        <Button onClick={generatePDF} disabled={isGeneratingPDF} className="bg-medical-blue hover:bg-medical-blue/90 text-white px-8 py-3 text-lg gap-2" size="lg">
          <Download className="h-5 w-5" />
          {isGeneratingPDF ? "Generando PDF..." : "Generar Consentimiento PDF"}
        </Button>
      </div>
    </div>;
};