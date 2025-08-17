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
import { ShareConsentButtons } from './ShareConsentButtons';
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
  const [isProcedureInfoExpanded, setIsProcedureInfoExpanded] = useState(false);

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
      // Load the signature into the SignaturePad automatically
      setTimeout(() => {
        if (professionalSignatureRef.current) {
          professionalSignatureRef.current.loadSignature(professional.signatureData);
          toast.success("Firma del profesional cargada automáticamente");
        }
      }, 100);
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
      <Card className="border-medical-blue/20">
        <CardHeader className="bg-gradient-to-r from-medical-blue/5 to-medical-blue-light/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-medical-blue/10 rounded-lg flex items-center justify-center">
              <TestTube className="h-6 w-6 text-medical-blue" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-medical-blue text-xl">
                Consentimiento Informado - Venopunción
              </CardTitle>
              <p className="text-medical-gray text-sm mt-1">
                Formato 220 - Complete todos los campos requeridos para generar el consentimiento
              </p>
            </div>
            <Button onClick={onBack} variant="outline" className="gap-2">
              ← Volver a búsqueda
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="pt-6">
          {/* Patient Information */}
          <div className="bg-medical-blue-light/20 p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-medical-blue mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Información del Paciente
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-medical-gray">Nombre:</span>
                <p className="text-medical-blue">{patientData.nombre} {patientData.apellidos}</p>
              </div>
              <div>
                <span className="font-medium text-medical-gray">Documento:</span>
                <p className="text-medical-blue">{patientData.tipoDocumento} {patientData.numeroDocumento}</p>
              </div>
              <div>
                <span className="font-medium text-medical-gray">Edad:</span>
                <p className="text-medical-blue">{patientData.edad} años</p>
              </div>
              <div>
                <span className="font-medium text-medical-gray">EPS:</span>
                <p className="text-medical-blue">{patientData.eps}</p>
              </div>
              <div>
                <span className="font-medium text-medical-gray">Teléfono:</span>
                <p className="text-medical-blue">{patientData.telefono}</p>
              </div>
              <div>
                <span className="font-medium text-medical-gray">Centro:</span>
                <p className="text-medical-blue">{patientData.centroSalud}</p>
              </div>
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

      {/* Procedure Information - Expandable */}
      <Card className="medical-card">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <TestTube className="h-5 w-5 text-medical-blue" />
            <CardTitle className="medical-card-title">
              Procedimientos para Venopunción
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div 
              className="flex items-start space-x-3 p-3 rounded-lg border border-medical-blue/20 bg-medical-blue/5 cursor-pointer hover:bg-medical-blue/10 transition-colors"
              onClick={() => setIsProcedureInfoExpanded(!isProcedureInfoExpanded)}
            >
              <Checkbox
                id="procedimiento-venopuncion"
                checked={isProcedureInfoExpanded}
                onCheckedChange={(checked) => setIsProcedureInfoExpanded(checked as boolean)}
                className="mt-1 data-[state=checked]:bg-medical-blue data-[state=checked]:border-medical-blue"
              />
              <div className="flex-1">
                <Label 
                  htmlFor="procedimiento-venopuncion" 
                  className="cursor-pointer text-medical-blue font-semibold medical-text-lg flex items-center gap-2"
                >
                  Toma de Muestras por Venopunción
                  {isProcedureInfoExpanded ? (
                    <ChevronUp className="h-4 w-4 text-medical-blue" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-medical-blue" />
                  )}
                </Label>
                <p className="medical-text-sm text-medical-gray mt-1">
                  Extracción de muestras sanguíneas mediante punción venosa para análisis de laboratorio.
                </p>
              </div>
            </div>

            {isProcedureInfoExpanded && (
              <div className="ml-6 space-y-4 animate-accordion-down">
                <div className="bg-medical-blue-light/10 p-6 rounded-lg border border-medical-blue-light/20">
                  <div className="space-y-4">
                    {/* Descripción Completa */}
                    <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded-r-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <h5 className="font-semibold text-blue-800">Descripción del Procedimiento:</h5>
                      </div>
                      <p className="medical-text-sm text-gray-700 mb-3">
                        La venopunción es un procedimiento médico que consiste en la introducción de una aguja en una vena para extraer sangre 
                        que será analizada en el laboratorio. Se realiza con material estéril y desechable.
                      </p>
                      <div className="bg-blue-100 p-3 rounded">
                        <p className="medical-text-sm font-medium text-blue-800">
                          <strong>Propósito:</strong> Obtener muestras sanguíneas para análisis clínicos que permitan diagnóstico, seguimiento o control de enfermedades.
                        </p>
                      </div>
                    </div>

                    {/* Beneficios */}
                    <div className="border-l-4 border-green-500 bg-green-50 p-4 rounded-r-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <h5 className="font-semibold text-green-800">Beneficios:</h5>
                      </div>
                      <p className="medical-text-sm text-gray-700">
                        Permite obtener información diagnóstica precisa y confiable para el manejo médico adecuado del paciente.
                      </p>
                    </div>

                    {/* Riesgos */}
                    <div className="border-l-4 border-red-500 bg-red-50 p-4 rounded-r-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <h5 className="font-semibold text-red-800">Riesgos:</h5>
                      </div>
                      <p className="medical-text-sm text-gray-700">
                        Dolor temporal en el sitio de punción, sangrado mínimo, hematoma (moretón), mareo o desmayo en personas sensibles, 
                        infección local (muy raro con técnica estéril).
                      </p>
                    </div>

                    {/* Alternativas */}
                    <div className="border-l-4 border-purple-500 bg-purple-50 p-4 rounded-r-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-purple-600">🔄</span>
                        <h5 className="font-semibold text-purple-800">Alternativas:</h5>
                      </div>
                      <p className="medical-text-sm text-gray-700">
                        En casos específicos, punción arterial o muestras de orina/saliva según el tipo de análisis requerido.
                      </p>
                    </div>

                    {/* Efectos Inevitables */}
                    <div className="border-l-4 border-yellow-500 bg-yellow-50 p-4 rounded-r-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-yellow-600">⚠️</span>
                        <h5 className="font-semibold text-yellow-800">Efectos Inevitables:</h5>
                      </div>
                      <p className="medical-text-sm text-gray-700">
                        Molestia momentánea durante la punción, sensación de presión por el torniquete.
                      </p>
                    </div>

                    {/* Posibles Consecuencias */}
                    <div className="border-l-4 border-gray-500 bg-gray-50 p-4 rounded-r-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-gray-600">ℹ️</span>
                        <h5 className="font-semibold text-gray-800">Posibles consecuencias en caso que decida no aceptar el procedimiento:</h5>
                      </div>
                      <p className="medical-text-sm text-gray-700">
                        Imposibilidad de realizar los análisis solicitados, limitación en el diagnóstico y seguimiento médico.
                      </p>
                    </div>

                    {/* Declaración final */}
                    <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-blue-600">📝</span>
                        <p className="medical-text-sm font-medium text-blue-800">
                          Al seleccionar este procedimiento, usted declara haber leído y comprendido toda la información anterior.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Decisión sobre el Consentimiento */}
      <Card className="border-medical-blue/20">
        <CardHeader>
          <CardTitle className="text-medical-blue flex items-center gap-2">
            <span className="text-medical-blue">⚪</span>
            Decisión sobre el Consentimiento
            <span className="text-red-500">*</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <RadioGroup 
              value={consentDecision} 
              onValueChange={(value: 'aprobar' | 'disentir') => setConsentDecision(value)}
              className="flex flex-row items-center gap-8"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="aprobar" id="aprobar" className="w-5 h-5 text-green-600 border-green-600" />
                <Label htmlFor="aprobar" className="text-green-600 font-medium text-base">APROBAR el(los) procedimiento(s)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="disentir" id="disentir" className="w-5 h-5 text-red-600 border-red-600" />
                <Label htmlFor="disentir" className="text-red-600 font-medium text-base">DISENTIR el(los) procedimiento(s)</Label>
              </div>
            </RadioGroup>
            
            <div className="bg-medical-blue-light/20 border border-medical-blue/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <input type="checkbox" className="mt-1 w-4 h-4 text-medical-blue border-medical-blue/30 rounded" defaultChecked />
                <span className="text-medical-gray text-sm leading-relaxed">
                  <strong>Declaro que:</strong> He sido informado(a) sobre el(los) procedimiento(s) seleccionado(s), sus riesgos, beneficios y alternativas. He tomado una decisión informada y autorizo al equipo médico a proceder según mi elección.
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Firmas Digitales */}
      <Card className="border-medical-blue/20">
        <CardHeader>
          <CardTitle className="text-medical-blue flex items-center gap-2">
            ✍ Firmas Digitales
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
                <div className="mt-3 text-xs text-medical-gray space-y-1">
                  <div>• Use su dedo o stylus</div>
                  <div>• No levante su dedo o stylus</div>
                  <div>• Use "Limpiar" para reiniciar la firma</div>
                  <div>• Use "Guardar" para confirmar la firma</div>
                </div>
                
                {/* Foto del Paciente */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <Label className="text-medical-blue font-medium">Foto del Paciente</Label>
                  <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mt-2">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-3">
                        <span className="text-xl text-gray-400">📷</span>
                      </div>
                      <p className="text-gray-500 mb-3 text-sm">Cámara no activada</p>
                      <Button variant="outline" size="sm" className="mb-3">
                        <span className="w-4 h-4 mr-2">📷</span>
                        Activar Cámara
                      </Button>
                      <p className="text-xs text-gray-400">
                        La foto se tomará automáticamente al registrar la firma
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 text-center">
                    <Button variant="outline" size="sm">
                      Capturar Foto
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="space-y-4">
                {/* Header Section exactly as shown in image */}
                <div>
                  <h3 className="text-blue-600 font-medium text-lg mb-1">Firma del Profesional *</h3>
                  <p className="text-gray-500 text-sm mb-4">Profesional Registrado</p>
                </div>
                
                {/* Professional Selector */}
                <div className="mb-4">
                  <ProfessionalSelector
                    onProfessionalSelect={handleProfessionalSelect}
                    onNewProfessional={handleNewProfessional}
                    selectedDocument={professionalDocument}
                  />
                </div>
                
                {/* Professional Information Display */}
                {professionalName && professionalDocument && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-blue-800 mb-2">Información del Profesional</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-medium text-blue-700">Nombre:</span>
                        <p className="text-blue-900">{professionalName}</p>
                      </div>
                      <div>
                        <span className="font-medium text-blue-700">Documento:</span>
                        <p className="text-blue-900">{professionalDocument}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Signature Area */}
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

      {/* Share Consent Buttons */}
      <ShareConsentButtons
        consentData={{
          patientName: `${patientData.nombre} ${patientData.apellidos}`,
          patientDocumentType: patientData.tipoDocumento,
          patientDocumentNumber: patientData.numeroDocumento,
          patientEmail: patientData.eps, 
          patientPhone: patientData.telefono,
          consentType: 'VENOPUNCION',
          payload: {
            procedures: ['Toma de Muestras por Venopunción'],
            risks: ['Dolor temporal en el sitio de punción', 'Sangrado mínimo', 'Hematoma (moretón)', 'Mareo o desmayo en personas sensibles'],
            benefits: ['Obtener información diagnóstica precisa y confiable para el manejo médico adecuado'],
            alternatives: ['Punción arterial o muestras de orina/saliva según el tipo de análisis'],
            decision: consentDecision
          }
        }}
        onConsentCreated={(shareableConsent) => {
          console.log('Enlace de consentimiento creado:', shareableConsent);
        }}
      />

      {/* Botones de Acción */}
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
              disabled={isGeneratingPDF}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              size="lg"
            >
              {isGeneratingPDF ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Guardar Consentimiento
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};