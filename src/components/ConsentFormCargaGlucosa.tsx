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
import { FileText, AlertCircle, Shield, Download, TestTube2, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { ConsentFormWrapper } from './ConsentFormWrapper';
import { GuardianSignatureSection, GuardianSignatureRef } from './GuardianSignatureSection';
import { toast } from "sonner";
import { generateCargaGlucosaPDF } from "@/utils/pdfGeneratorCargaGlucosa";

interface PatientData {
  id: string;
  nombre: string;
  apellidos: string;
  tipoDocumento: string;
  numeroDocumento: string;
  fechaNacimiento: string;
  edad: number;
  sexo?: string;
  eps: string;
  telefono: string;
  direccion: string;
  email?: string;
  centroSalud: string;
  hasDisability?: boolean;
}

interface ConsentFormProps {
  patientData: PatientData;
  onBack: () => void;
}

export const ConsentFormCargaGlucosa = ({ patientData, onBack }: ConsentFormProps) => {
  // Determinar si es menor de edad
  const isMinor = patientData.edad < 18;
  
  // Usar el estado de discapacidad del paciente
  const hasDisability = patientData.hasDisability || false;
  const [professionalName, setProfessionalName] = useState("");
  const [professionalDocument, setProfessionalDocument] = useState("");
  const [showProfessionalForm, setShowProfessionalForm] = useState(false);
  const [agreedToConsent, setAgreedToConsent] = useState(false);
  const [consentDecision, setConsentDecision] = useState<"aprobar" | "disentir">("aprobar");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [guardianName, setGuardianName] = useState("");
  const [guardianDocument, setGuardianDocument] = useState("");
  const [guardianRelationship, setGuardianRelationship] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [guardianSignature, setGuardianSignature] = useState<string | null>(null);
  const [isProcedureInfoExpanded, setIsProcedureInfoExpanded] = useState(false);

  // Estados para firmas y foto
  const patientSignatureRef = useRef<SignatureRef>(null);
  const professionalSignatureRef = useRef<SignatureRef>(null);
  const cameraCaptureRef = useRef<CameraCaptureRef>(null);
  const guardianSignatureRef = useRef<GuardianSignatureRef>(null);
  
  const [patientSignature, setPatientSignature] = useState<string>("");
  const [professionalSignature, setProfessionalSignature] = useState<string>("");
  const [patientPhoto, setPatientPhoto] = useState<string | null>(null);

  // Determinar si requiere firma de acudiente
  const requiresGuardian = isMinor || hasDisability;

  // Validar si el formulario está completo para habilitar el botón
  const isFormComplete = () => {
    // El botón siempre está habilitado si hay decisión y aceptación
    return true; // Simplificado al máximo para que siempre funcione
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

  // Funciones manuales de captura (backup)
  const handlePatientSignature = () => {
    console.log("🖊️ Intentando capturar firma del paciente manualmente...");
    console.log("📱 Referencia patientSignatureRef:", patientSignatureRef.current);
    
    try {
      const signature = patientSignatureRef.current?.getSignatureData();
      console.log("🔍 Firma obtenida:", signature ? "SÍ" : "NO");
      console.log("📏 Longitud de firma:", signature?.length);
      
      if (signature && signature.length > 50) {
        setPatientSignature(signature);
        console.log("✅ Firma del paciente guardada en estado");
        toast.success("Firma del paciente capturada exitosamente");
      } else {
        console.log("❌ Firma vacía o muy pequeña");
        toast.error("Por favor dibuje su firma antes de capturar");
      }
    } catch (error) {
      console.error("❌ Error capturando firma del paciente:", error);
      toast.error("Error al capturar la firma");
    }
  };

  const handleProfessionalSignature = () => {
    const signature = professionalSignatureRef.current?.getSignatureData();
    if (signature) {
      setProfessionalSignature(signature);
      toast.success("Firma del profesional capturada exitosamente");
    } else {
      toast.error("Por favor dibuje la firma antes de capturar");
    }
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

  const validateForm = (): boolean => {
    if (!professionalName.trim()) {
      toast.error("El nombre del profesional es obligatorio");
      return false;
    }

    if (!professionalDocument.trim()) {
      toast.error("El documento del profesional es obligatorio");
      return false;
    }

    if (!professionalSignature) {
      toast.error("La firma del profesional es obligatoria");
      return false;
    }

    // Si tiene discapacidad o es menor, validar datos del acudiente
    if (isMinor || hasDisability) {
      if (!guardianName.trim()) {
        toast.error("El nombre del acudiente es obligatorio");
        return false;
      }
      if (!guardianDocument.trim()) {
        toast.error("El documento del acudiente es obligatorio");
        return false;
      }
      if (!guardianRelationship.trim()) {
        toast.error("El parentesco del acudiente es obligatorio");
        return false;
      }
      if (!guardianSignature) {
        toast.error("La firma del acudiente es obligatoria");
        return false;
      }
      // Si tiene discapacidad, la firma del paciente no es obligatoria
      // (el acudiente firma en su lugar)
    } else {
      // Solo si no tiene discapacidad ni es menor, la firma del paciente es obligatoria
      if (!patientSignature) {
        toast.error("La firma del paciente es obligatoria");
        return false;
      }
    }

    if (!agreedToConsent) {
      toast.error("Debe aceptar los términos del consentimiento");
      return false;
    }

    return true;
  };

  const generatePDF = async (): Promise<Blob> => {
    console.log("🚀 INICIANDO GENERACIÓN DE PDF - FORZADO");

    try {
      const currentDate = new Date();
      const date = currentDate.toLocaleDateString('es-CO');
      const time = currentDate.toLocaleTimeString('es-CO');

      console.log("📋 Verificando estado de las firmas...");
      console.log("🖊️ Firma del paciente:", patientSignature ? "SÍ EXISTE" : "NO EXISTE");
      console.log("👨‍⚕️ Firma del profesional:", professionalSignature ? "SÍ EXISTE" : "NO EXISTE");
      
      if (patientSignature) {
        console.log("📏 Longitud firma paciente:", patientSignature.length);
        console.log("🔍 Preview firma paciente:", patientSignature.substring(0, 100));
      }
      
      if (professionalSignature) {
        console.log("📏 Longitud firma profesional:", professionalSignature.length);
        console.log("🔍 Preview firma profesional:", professionalSignature.substring(0, 100));
      }
      
      // Determinar si requiere firma del acudiente
      const requiresGuardian = isMinor || hasDisability;
      
      // Datos para el PDF - usar datos reales si existen
      const pdfData = {
        patientData: { ...patientData, sexo: patientData.sexo || 'N/D' },
        guardianData: requiresGuardian ? {
          name: guardianName || "ACUDIENTE TEST",
          document: guardianDocument || "87654321",
          relationship: guardianRelationship || "PADRE/MADRE",
          phone: guardianPhone || "3009876543"
        } : null,
        professionalName: professionalName || "DR. PROFESIONAL DE PRUEBA",
        professionalDocument: professionalDocument || "12345678",
        // Firma del paciente: solo cuando NO hay acudiente
        patientSignature: requiresGuardian ? null : patientSignature,
        // Firma del acudiente: solo cuando hay acudiente
        guardianSignature: requiresGuardian ? guardianSignature : null,
        professionalSignature: professionalSignature, // Usar firma real si existe
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
      
      const pdf = await generateCargaGlucosaPDF(pdfData);
      
      console.log("📄 PDF generado exitosamente");
      
      // Return the blob instead of downloading directly
      return pdf.output('blob');

    } catch (error) {
      console.error("❌ Error detallado al generar PDF:", error);
      throw error;
    }
  };

  const getHTMLContent = (): string => {
    return document.getElementById('consent-form-content')?.innerHTML || '';
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

  const clearProfessional = () => {
    setProfessionalName("");
    setProfessionalDocument("");
    setProfessionalSignature("");
    setShowProfessionalForm(true);
  };

  return (
    <ConsentFormWrapper
      consentType="Carga de Glucosa"
      consentTypeCode="carga_glucosa"
      consentDecision={consentDecision}
      patientData={{
        nombre: patientData.nombre,
        apellidos: patientData.apellidos,
        tipoDocumento: patientData.tipoDocumento,
        numeroDocumento: patientData.numeroDocumento,
        telefono: patientData.telefono,
        email: patientData.email
      }}
      onGeneratePDF={generatePDF}
      onGetHTMLContent={getHTMLContent}
      onBack={onBack}
      professionalData={{
        name: professionalName,
        document: professionalDocument
      }}
      patientSignature={patientSignature}
      patientPhotoUrl={patientPhoto}
      getPatientSignature={() => patientSignatureRef.current?.getSignatureData() || null}
      getPatientPhoto={() => cameraCaptureRef.current?.getCapturedPhoto() || null}
      hasDisability={hasDisability}
      isMinor={isMinor}
      guardianSignature={guardianSignature}
      getGuardianSignature={() => guardianSignatureRef.current?.getSignatureData() || null}
      guardianName={guardianName}
      guardianDocument={guardianDocument}
      guardianRelationship={guardianRelationship}
      guardianPhone={guardianPhone}
    >
    <div id="consent-form-content" className="space-y-6">
      {/* Header */}
      <Card className="border-medical-blue/20">
        <CardHeader className="bg-gradient-to-r from-medical-blue/5 to-medical-blue-light/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-medical-blue/10 rounded-lg flex items-center justify-center">
              <TestTube2 className="h-6 w-6 text-medical-blue" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-medical-blue text-xl">
                Consentimiento Informado - Carga de Glucosa
              </CardTitle>
              <p className="text-medical-gray text-sm mt-1">
                Formato 119 - Complete todos los campos requeridos para generar el consentimiento
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


      {/* Procedure Information */}
      <Card className="border-medical-blue/20">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <TestTube2 className="h-5 w-5 text-medical-blue" />
            <CardTitle className="text-medical-blue">
              Procedimientos para Carga de Glucosa
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
                id="procedimiento-glucosa"
                checked={isProcedureInfoExpanded}
                onCheckedChange={(checked) => setIsProcedureInfoExpanded(checked as boolean)}
                className="mt-1 data-[state=checked]:bg-medical-blue data-[state=checked]:border-medical-blue"
              />
              <div className="flex-1">
                <Label 
                  htmlFor="procedimiento-glucosa" 
                  className="cursor-pointer text-medical-blue font-semibold text-base flex items-center gap-2"
                >
                  Administración oral de carga de glucosa (Dextrosa Anhidra)
                  {isProcedureInfoExpanded ? (
                    <ChevronUp className="h-4 w-4 text-medical-blue" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-medical-blue" />
                  )}
                </Label>
                <p className="text-sm text-medical-gray mt-1">
                  Consiste en suministrar vía oral una bebida que contiene una cantidad estandarizada de glucosa (dextrosa anhidra) que servirá para la evaluación de su diagnóstico.
                </p>
              </div>
            </div>

            {isProcedureInfoExpanded && (
              <div className="ml-6 space-y-4 animate-accordion-down">
                <div className="bg-medical-blue-light/10 p-6 rounded-lg border border-medical-blue-light/20">
                  <div className="space-y-4">
                    {/* Descripción Completa */}
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <h4 className="font-semibold text-blue-700">Descripción Completa:</h4>
                      </div>
                      <p className="text-blue-700 text-sm">
                        Consiste en suministrar vía oral una bebida que contiene una cantidad estandarizada de glucosa (dextrosa anhidra) que servirá para la evaluación de su diagnóstico. No se debe realizar este procedimiento si el paciente está indispuesto, o ha presentado episodios de fiebre, vómito o diarrea en las 24 horas anteriores a la toma de la muestra.
                      </p>
                      <div className="mt-3 bg-blue-100 p-3 rounded">
                        <p className="text-sm text-blue-800">
                          <strong>Propósito:</strong> Analizar los niveles de azúcar en sangre y la reacción del organismo a la ingesta de la carga de glucosa.
                        </p>
                      </div>
                    </div>

                    {/* Riesgos */}
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <h4 className="font-semibold text-red-700">Riesgos:</h4>
                      </div>
                      <p className="text-red-700 text-sm">
                        Malestar, náuseas, vómito, diarrea, mareo o reacciones alérgicas, urticaria o asma. <strong>Si el paciente es diabético, debe informar previamente y sólo se administrará bajo prescripción médica.</strong>
                      </p>
                    </div>

                    {/* Beneficios */}
                    <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <h4 className="font-semibold text-green-700">Beneficios:</h4>
                      </div>
                      <p className="text-green-700 text-sm">
                        Orientar y/o confirmar un diagnóstico frente a los niveles de glucosa en el paciente o cómo la está procesando el organismo. Seguimiento de una enfermedad o condición en salud.
                      </p>
                    </div>

                    {/* Alternativas */}
                    <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-4 w-4 text-purple-600" />
                        <h4 className="font-semibold text-purple-700">Alternativas:</h4>
                      </div>
                      <p className="text-purple-700 text-sm">
                        Ninguna
                      </p>
                    </div>

                    {/* Implicaciones */}
                    <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <TestTube2 className="h-4 w-4 text-orange-600" />
                        <h4 className="font-semibold text-orange-700">Implicaciones:</h4>
                      </div>
                      <div className="space-y-2 text-orange-700 text-sm">
                        <p>
                          Tiempo de permanencia en el laboratorio es de dos (2) a tres (3) horas dependiendo el examen solicitado (curva o glicemia pre y pos carga), múltiples punciones por el número de muestras requeridas.
                        </p>
                        <p>
                          <strong>Efectos inevitables:</strong> Náuseas o molestia por el sabor azucarado
                        </p>
                      </div>
                    </div>

                    {/* Consecuencias de no aceptar */}
                    <div className="bg-gray-50 border-l-4 border-gray-500 p-4 rounded-r-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-gray-600" />
                        <h4 className="font-semibold text-gray-700">Posibles consecuencias en caso que decida no aceptar el procedimiento:</h4>
                      </div>
                      <p className="text-gray-700 text-sm">
                        Impide a los médicos tratantes tener información valiosa para determinar, confirmar o ajustar el diagnóstico y tratamiento médico
                      </p>
                    </div>

                    {/* Declaración */}
                    <div className="bg-blue-100 border border-blue-300 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span className="text-blue-700 font-medium text-sm">Al seleccionar este procedimiento, usted declara haber leído y comprendido toda la información anterior.</span>
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
                <Checkbox 
                  checked={agreedToConsent}
                  onCheckedChange={(checked) => setAgreedToConsent(checked === true)}
                  className="mt-1 w-4 h-4 text-medical-blue border-medical-blue/30 rounded data-[state=checked]:bg-medical-blue data-[state=checked]:border-medical-blue" 
                />
                <span className="text-medical-gray text-sm leading-relaxed">
                  <strong>Declaro que:</strong> He sido informado(a) sobre el(los) procedimiento(s) seleccionado(s), sus riesgos, beneficios y alternativas. He tomado una decisión informada y autorizo al equipo médico a proceder según mi elección.
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sección de Acudiente - igual que VIH y Frotis */}
      <GuardianSignatureSection
        ref={guardianSignatureRef}
        isMinor={isMinor}
        hasDisability={hasDisability}
        guardianName={guardianName}
        onGuardianNameChange={setGuardianName}
        guardianDocument={guardianDocument}
        onGuardianDocumentChange={setGuardianDocument}
        guardianRelationship={guardianRelationship}
        onGuardianRelationshipChange={setGuardianRelationship}
        guardianPhone={guardianPhone}
        onGuardianPhoneChange={setGuardianPhone}
        guardianSignature={guardianSignature}
        onGuardianSignatureChange={setGuardianSignature}
      />

      {/* Firmas Digitales - solo mostrar firma del paciente si no requiere acudiente */}
      <Card className="border-medical-blue/20">
        <CardHeader>
          <CardTitle className="text-medical-blue flex items-center gap-2">
            ✍ Firmas Digitales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Firma del Paciente - solo si no requiere acudiente */}
            {!requiresGuardian && (
              <div>
                <Label className="text-medical-blue font-medium">Firma del Paciente *</Label>
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
                    <CameraCapture
                      ref={cameraCaptureRef}
                      title="Foto del Paciente"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Si requiere acudiente, mostrar foto por separado */}
            {requiresGuardian && (
              <div>
                <Label className="text-medical-blue font-medium">Foto del Paciente</Label>
                <div className="border rounded-lg p-4 bg-gray-50">
                  <CameraCapture
                    ref={cameraCaptureRef}
                    title="Foto del Paciente"
                    required
                  />
                </div>
              </div>
            )}

            {/* Firma del Profesional */}
            <div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-blue-600 font-medium text-lg mb-1">Firma del Profesional *</h3>
                  <p className="text-gray-500 text-sm mb-4">Profesional Registrado</p>
                </div>
                
                <div className="mb-4">
                  <ProfessionalSelector
                    onProfessionalSelect={handleProfessionalSelect}
                    onNewProfessional={clearProfessional}
                    selectedDocument={professionalDocument}
                  />
                </div>
                
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
                
                <div className="border rounded-lg p-4 bg-gray-50">
                  <SignaturePad
                    ref={professionalSignatureRef}
                    title="Firma del Profesional"
                    onSignatureChange={handleProfessionalSignatureChange}
                    isProfessional={true}
                    professionalName={professionalName}
                    professionalDocument={professionalDocument}
                  />
                  <div className="mt-3 text-xs text-medical-gray space-y-1">
                    <div>• Use su dedo o stylus</div>
                    <div>• No levante su dedo o stylus</div>
                    <div>• Mantenga velocidad constante para firma</div>
                    <div>• Use "Limpiar" para reiniciar la firma</div>
                    <div>• Use "Guardar Firma" para almacenar la firma automáticamente</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>


    </div>
    </ConsentFormWrapper>
  );
};