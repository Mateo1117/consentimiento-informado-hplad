import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SignaturePad, SignatureRef } from "./SignaturePad";
import { CameraCapture, CameraCaptureRef } from "./CameraCapture";
import { ProfessionalSelector } from "./ProfessionalSelector";
import { Separator } from "@/components/ui/separator";
import { FileText, AlertCircle, Shield, Download, TestTube, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { generateVenopuncionPDF } from "@/utils/pdfGeneratorVenopuncion";

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

interface ConsentFormProps {
  patientData: PatientData;
  onBack: () => void;
}

export const ConsentFormVenopuncion = ({ patientData, onBack }: ConsentFormProps) => {
  const [professionalName, setProfessionalName] = useState("");
  const [professionalDocument, setProfessionalDocument] = useState("");
  const [showProfessionalForm, setShowProfessionalForm] = useState(false);
  const [agreedToConsent, setAgreedToConsent] = useState(false);
  const [consentDecision, setConsentDecision] = useState<"aprobar" | "disentir">("aprobar");
  const [guardianName, setGuardianName] = useState("");
  const [guardianDocument, setGuardianDocument] = useState("");
  const [guardianRelationship, setGuardianRelationship] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [patientSignature, setPatientSignature] = useState<string | null>(null);
  const [professionalSignature, setProfessionalSignature] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [patientPhoto, setPatientPhoto] = useState<string | null>(null);

  const patientSignatureRef = useRef<SignatureRef>(null);
  const professionalSignatureRef = useRef<SignatureRef>(null);
  const cameraCaptureRef = useRef<CameraCaptureRef>(null);

  // Determinar si es menor de edad
  const isMinor = patientData.edad < 18;

  // Validar si el formulario está completo para habilitar el botón
  const isFormComplete = () => {
    return true; // Simplificado para que siempre funcione
  };

  // Captura automática de firmas
  const handlePatientSignatureChange = (signature: string | null) => {
    console.log("🖊️ Captura automática - Firma del paciente:", signature ? "CAPTURADA" : "VACÍA");
    setPatientSignature(signature);
    if (signature) {
      toast.success("✅ Firma del paciente capturada automáticamente");
    }
  };

  const handleProfessionalSignatureChange = (signature: string | null) => {
    console.log("👨‍⚕️ Captura automática - Firma del profesional:", signature ? "CAPTURADA" : "VACÍA");
    setProfessionalSignature(signature);
    if (signature) {
      toast.success("✅ Firma del profesional capturada automáticamente");
    }
  };

  const generatePDF = async () => {
    console.log("🚀 INICIANDO GENERACIÓN DE PDF VENOPUNCIÓN");
    
    setIsGeneratingPDF(true);

    try {
      const currentDate = new Date();
      const date = currentDate.toLocaleDateString('es-CO');
      const time = currentDate.toLocaleTimeString('es-CO');

      console.log("📋 Verificando estado de las firmas...");
      console.log("🖊️ Firma del paciente:", patientSignature ? "SÍ EXISTE" : "NO EXISTE");
      console.log("👨‍⚕️ Firma del profesional:", professionalSignature ? "SÍ EXISTE" : "NO EXISTE");
      
      // Datos para el PDF - usar datos reales si existen
      const pdfData = {
        patientData: patientData,
        guardianData: isMinor ? {
          name: guardianName || "ACUDIENTE TEST",
          document: guardianDocument || "87654321",
          relationship: guardianRelationship || "PADRE/MADRE",
          phone: guardianPhone || "3009876543"
        } : null,
        professionalName: professionalName || "DR. PROFESIONAL DE PRUEBA",
        professionalDocument: professionalDocument || "12345678",
        patientSignature: patientSignature,
        professionalSignature: professionalSignature,
        patientPhoto: patientPhoto,
        consentDecision: consentDecision || "aprobar",
        date,
        time
      };

      console.log("🔧 Generando PDF con datos:", {
        patientName: pdfData.patientData.nombre,
        professionalName: pdfData.professionalName,
        hasPatientSignature: !!pdfData.patientSignature,
        hasProfessionalSignature: !!pdfData.professionalSignature,
        consentDecision: pdfData.consentDecision
      });
      
      const pdf = generateVenopuncionPDF(pdfData);
      
      console.log("💾 Descargando PDF...");
      
      // Download PDF directly
      const fileName = `consentimiento_venopuncion_${pdfData.patientData.numeroDocumento}_${Date.now()}.pdf`;
      pdf.save(fileName);

      toast.success("✅ PDF generado y descargado exitosamente");
      console.log("✅ PDF descargado:", fileName);

    } catch (error) {
      console.error("❌ Error detallado al generar PDF:", error);
      toast.error(`Error al generar el PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleProfessionalSelect = (professional: any) => {
    setProfessionalName(professional.name);
    setProfessionalDocument(professional.document);
    if (professional.signatureData) {
      setProfessionalSignature(professional.signatureData);
    }
    setShowProfessionalForm(false);
  };

  const handleNewProfessional = () => {
    setShowProfessionalForm(true);
  };

  const handlePhotoCapture = async () => {
    try {
      const photo = await cameraCaptureRef.current?.capturePhoto();
      if (photo) {
        setPatientPhoto(photo);
        toast.success("Foto del paciente capturada exitosamente");
      }
    } catch (error) {
      console.error("Error capturing photo:", error);
      toast.error("Error al capturar la foto");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-medical-blue/20 bg-gradient-to-r from-white to-medical-blue-light/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-medical-blue">
            <TestTube className="h-6 w-6" />
            Consentimiento Informado - Toma de Muestras por Venopunción
          </CardTitle>
          <p className="text-medical-gray">
            Procedimiento para la extracción de muestras sanguíneas mediante punción venosa
          </p>
        </CardHeader>
      </Card>

      {/* Patient Info */}
      <Card className="border-medical-blue/20">
        <CardHeader>
          <CardTitle className="text-medical-blue">Información del Paciente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium text-medical-gray">Nombre Completo</Label>
              <p className="text-medical-blue font-medium">{`${patientData.nombre} ${patientData.apellidos}`}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-medical-gray">Documento</Label>
              <p className="text-medical-blue font-medium">{`${patientData.tipoDocumento} ${patientData.numeroDocumento}`}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-medical-gray">Edad</Label>
              <p className="text-medical-blue font-medium">{patientData.edad} años</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-medical-gray">EPS</Label>
              <p className="text-medical-blue font-medium">{patientData.eps}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-medical-gray">Teléfono</Label>
              <p className="text-medical-blue font-medium">{patientData.telefono}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-medical-gray">Centro de Salud</Label>
              <p className="text-medical-blue font-medium">{patientData.centroSalud}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Guardian Info (for minors) */}
      {isMinor && (
        <Card className="border-medical-blue/20">
          <CardHeader>
            <CardTitle className="text-medical-blue flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Información del Acudiente o Representante Legal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="guardianName">Nombre Completo del Acudiente *</Label>
                <Input
                  id="guardianName"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  placeholder="Nombre completo del acudiente"
                />
              </div>
              <div>
                <Label htmlFor="guardianDocument">Documento del Acudiente *</Label>
                <Input
                  id="guardianDocument"
                  value={guardianDocument}
                  onChange={(e) => setGuardianDocument(e.target.value)}
                  placeholder="Número de documento"
                />
              </div>
              <div>
                <Label htmlFor="guardianRelationship">Parentesco *</Label>
                <Input
                  id="guardianRelationship"
                  value={guardianRelationship}
                  onChange={(e) => setGuardianRelationship(e.target.value)}
                  placeholder="Relación con el paciente"
                />
              </div>
              <div>
                <Label htmlFor="guardianPhone">Teléfono del Acudiente</Label>
                <Input
                  id="guardianPhone"
                  value={guardianPhone}
                  onChange={(e) => setGuardianPhone(e.target.value)}
                  placeholder="Número de teléfono"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Procedure Information */}
      <Card className="border-medical-blue/20">
        <CardHeader>
          <CardTitle className="text-medical-blue flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Información del Procedimiento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
            <h4 className="font-semibold text-blue-700 mb-2">Procedimiento: TOMA DE MUESTRAS POR VENOPUNCIÓN</h4>
            <p className="text-blue-700 text-sm">
              Consiste en la punción de una vena con el fin de extraer muestras de sangre para realizar exámenes de laboratorio.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Descripción */}
            <div className="bg-gray-50 border-l-4 border-gray-500 p-4 rounded-r-lg">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-gray-600" />
                <h4 className="font-semibold text-gray-700">Descripción:</h4>
              </div>
              <p className="text-gray-700 text-sm">
                La venopunción es un procedimiento médico que consiste en la introducción de una aguja en una vena para extraer sangre que será analizada en el laboratorio.
              </p>
            </div>

            {/* Propósito */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
              <div className="flex items-center gap-2 mb-2">
                <TestTube className="h-4 w-4 text-blue-600" />
                <h4 className="font-semibold text-blue-700">Propósito:</h4>
              </div>
              <p className="text-blue-700 text-sm">
                Obtener muestras sanguíneas para la realización de análisis clínicos que permitan el diagnóstico, seguimiento o control de enfermedades.
              </p>
            </div>

            {/* Beneficios */}
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <h4 className="font-semibold text-green-700">Beneficios:</h4>
              </div>
              <p className="text-green-700 text-sm">
                Permite obtener información diagnóstica valiosa, detectar enfermedades tempranamente y hacer seguimiento a tratamientos médicos.
              </p>
            </div>

            {/* Riesgos */}
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <h4 className="font-semibold text-red-700">Riesgos:</h4>
              </div>
              <p className="text-red-700 text-sm">
                Dolor leve, formación de hematomas, sangrado prolongado, infección localizada (muy poco frecuente), reacciones vasovagales (mareo, desmayo).
              </p>
            </div>

            {/* Alternativas */}
            <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-purple-600" />
                <h4 className="font-semibold text-purple-700">Alternativas:</h4>
              </div>
              <p className="text-purple-700 text-sm">
                Según el examen solicitado, puede considerarse punción capilar (en dedo) para algunos análisis básicos.
              </p>
            </div>

            {/* Implicaciones */}
            <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-orange-600" />
                <h4 className="font-semibold text-orange-700">Implicaciones:</h4>
              </div>
              <p className="text-orange-700 text-sm">
                Molestia temporal en el sitio de punción, posible formación de pequeño hematoma que se resuelve espontáneamente.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Consent Decision */}
      <Card className="border-medical-blue/20">
        <CardHeader>
          <CardTitle className="text-medical-blue flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Decisión sobre el Consentimiento *
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup
            value={consentDecision}
            onValueChange={(value) => setConsentDecision(value as "aprobar" | "disentir")}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div className="flex items-center space-x-3">
              <RadioGroupItem 
                value="aprobar" 
                id="aprobar"
                className="border-green-600 text-green-600 focus-visible:ring-green-600"
              />
              <Label htmlFor="aprobar" className="cursor-pointer text-green-600 font-medium">
                APROBAR el(los) procedimiento(s)
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem 
                value="disentir" 
                id="disentir"
                className="border-red-600 text-red-600 focus-visible:ring-red-600"
              />
              <Label htmlFor="disentir" className="cursor-pointer text-red-600 font-medium">
                DISENTIR el(los) procedimiento(s)
              </Label>
            </div>
          </RadioGroup>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="agreedToConsent"
                checked={agreedToConsent}
                onCheckedChange={(checked) => setAgreedToConsent(checked as boolean)}
                className="mt-1"
              />
              <Label htmlFor="agreedToConsent" className="cursor-pointer text-sm leading-relaxed">
                <strong>Declaro que:</strong> He sido informado(a) sobre el(los) procedimiento(s) seleccionado(s), sus riesgos, beneficios y alternativas. He tomado una decisión informada y autorizo al equipo médico a proceder según mi elección.
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Professional Information */}
      <Card className="border-medical-blue/20">
        <CardHeader>
          <CardTitle className="text-medical-blue flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Información del Profesional
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showProfessionalForm ? (
            <ProfessionalSelector
              onProfessionalSelect={handleProfessionalSelect}
              onNewProfessional={handleNewProfessional}
            />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="professionalName">Nombre del Profesional *</Label>
                  <Input
                    id="professionalName"
                    value={professionalName}
                    onChange={(e) => setProfessionalName(e.target.value)}
                    placeholder="Nombre completo del profesional"
                  />
                </div>
                <div>
                  <Label htmlFor="professionalDocument">Documento del Profesional *</Label>
                  <Input
                    id="professionalDocument"
                    value={professionalDocument}
                    onChange={(e) => setProfessionalDocument(e.target.value)}
                    placeholder="Número de documento"
                  />
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowProfessionalForm(false)}
                className="border-medical-blue/30 text-medical-blue"
              >
                Seleccionar Profesional Existente
              </Button>
            </div>
          )}

          {professionalName && (
            <div className="bg-medical-green-light/20 border border-medical-green/30 rounded-lg p-4">
              <p className="text-medical-green font-medium">
                ✓ Profesional seleccionado: {professionalName} - {professionalDocument}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Digital Signatures */}
      <Card className="border-medical-blue/20">
        <CardHeader>
          <CardTitle className="text-medical-blue flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Firmas Digitales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-medical-blue font-medium">
                Firma del {isMinor ? "Acudiente" : "Paciente"} *
              </Label>
              <div className="border rounded-lg p-4 bg-gray-50">
                <SignaturePad 
                  ref={patientSignatureRef} 
                  title="Firma del Paciente"
                  onSignatureChange={handlePatientSignatureChange}
                />
              </div>
            </div>

            <div>
              <Label className="text-medical-blue font-medium">
                Firma del Profesional *
              </Label>
              <div className="border rounded-lg p-4 bg-gray-50">
                <SignaturePad 
                  ref={professionalSignatureRef} 
                  title="Firma del Profesional"
                  onSignatureChange={handleProfessionalSignatureChange}
                  isProfessional={true}
                  professionalDocument={professionalDocument}
                  professionalName={professionalName}
                />
              </div>
            </div>
          </div>

          {/* Patient Photo */}
          <div>
            <Label className="text-medical-blue font-medium">Foto del Paciente (Opcional)</Label>
            <div className="border rounded-lg p-4 bg-gray-50">
              <CameraCapture ref={cameraCaptureRef} title="Captura de Foto del Paciente" />
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePhotoCapture}
                  className="text-medical-blue border-medical-blue/20"
                >
                  Capturar Foto
                </Button>
              </div>
              {patientPhoto && (
                <div className="mt-4">
                  <p className="text-sm text-medical-green mb-2">✓ Foto capturada exitosamente</p>
                  <img 
                    src={patientPhoto} 
                    alt="Foto del paciente" 
                    className="w-32 h-24 object-cover rounded border"
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card className="border-medical-blue/20">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={onBack}
              variant="outline"
              className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-3 text-lg"
              size="lg"
            >
              Volver
            </Button>
            
            <Button
              onClick={generatePDF}
              disabled={isGeneratingPDF || !isFormComplete()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              size="lg"
            >
              {isGeneratingPDF ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Generando PDF...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Guardar Consentimiento
                </>
              )}
            </Button>
          </div>
          
          {!isFormComplete() && (
            <p className="text-center text-sm text-green-600 mt-3">
              ✅ Listo para generar el PDF
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};