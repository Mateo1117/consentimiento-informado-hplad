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
  eps: string;
  telefono: string;
  direccion: string;
  centroSalud: string;
}

interface ConsentFormProps {
  patientData: PatientData;
  onBack: () => void;
}

export const ConsentFormCargaGlucosa = ({ patientData, onBack }: ConsentFormProps) => {
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
  const [isProcedureInfoExpanded, setIsProcedureInfoExpanded] = useState(false);

  // Estados para firmas y foto
  const patientSignatureRef = useRef<SignatureRef>(null);
  const professionalSignatureRef = useRef<SignatureRef>(null);
  const cameraCaptureRef = useRef<CameraCaptureRef>(null);
  
  const [patientSignature, setPatientSignature] = useState<string>("");
  const [professionalSignature, setProfessionalSignature] = useState<string>("");
  const [patientPhoto, setPatientPhoto] = useState<string | null>(null);

  // Determinar si es menor de edad
  const isMinor = patientData.edad < 18;

  // Validar si el formulario está completo para habilitar el botón
  const isFormComplete = () => {
    return (
      professionalName.trim() &&
      professionalDocument.trim() &&
      patientSignature &&
      professionalSignature &&
      agreedToConsent &&
      consentDecision &&
      (!isMinor || (guardianName.trim() && guardianDocument.trim() && guardianRelationship.trim()))
    );
  };

  const handlePatientSignature = () => {
    const signature = patientSignatureRef.current?.getSignatureData();
    if (signature) {
      setPatientSignature(signature);
      toast.success("Firma del paciente capturada exitosamente");
    } else {
      toast.error("Por favor dibuje su firma antes de capturar");
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

    if (!patientSignature) {
      toast.error("La firma del paciente es obligatoria");
      return false;
    }

    if (!professionalSignature) {
      toast.error("La firma del profesional es obligatoria");
      return false;
    }

    if (isMinor) {
      if (!guardianName.trim()) {
        toast.error("El nombre del acudiente es obligatorio para menores de edad");
        return false;
      }
      if (!guardianDocument.trim()) {
        toast.error("El documento del acudiente es obligatorio para menores de edad");
        return false;
      }
      if (!guardianRelationship.trim()) {
        toast.error("El parentesco del acudiente es obligatorio para menores de edad");
        return false;
      }
    }

    if (!agreedToConsent) {
      toast.error("Debe aceptar los términos del consentimiento");
      return false;
    }

    return true;
  };

  const generatePDF = async () => {
    if (!validateForm()) return;

    setIsGeneratingPDF(true);

    try {
      const currentDate = new Date();
      const date = currentDate.toLocaleDateString('es-CO');
      const time = currentDate.toLocaleTimeString('es-CO');

      const pdfData = {
        patientData,
        guardianData: isMinor ? {
          name: guardianName,
          document: guardianDocument,
          relationship: guardianRelationship,
          phone: guardianPhone
        } : null,
        professionalName,
        professionalDocument,
        patientSignature,
        professionalSignature,
        patientPhoto,
        consentDecision,
        date,
        time
      };

      const pdf = generateCargaGlucosaPDF(pdfData);
      
      // Download PDF directly
      const fileName = `consentimiento_carga_glucosa_${patientData.numeroDocumento}_${Date.now()}.pdf`;
      pdf.save(fileName);

      toast.success("PDF generado exitosamente");

    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Error al generar el PDF");
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

  const clearProfessional = () => {
    setProfessionalName("");
    setProfessionalDocument("");
    setProfessionalSignature("");
    setShowProfessionalForm(true);
  };

  return (
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

      {/* Guardian Information for Minors */}
      {isMinor && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-700 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Información del Acudiente (Menor de Edad)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="guardianName" className="text-orange-700">Nombre del Acudiente *</Label>
                <Input
                  id="guardianName"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  placeholder="Nombre completo del acudiente"
                  className="border-orange-200 focus:border-orange-400"
                />
              </div>
              <div>
                <Label htmlFor="guardianDocument" className="text-orange-700">Documento del Acudiente *</Label>
                <Input
                  id="guardianDocument"
                  value={guardianDocument}
                  onChange={(e) => setGuardianDocument(e.target.value)}
                  placeholder="Número de documento"
                  className="border-orange-200 focus:border-orange-400"
                />
              </div>
              <div>
                <Label htmlFor="guardianRelationship" className="text-orange-700">Parentesco *</Label>
                <Input
                  id="guardianRelationship"
                  value={guardianRelationship}
                  onChange={(e) => setGuardianRelationship(e.target.value)}
                  placeholder="Ej: Padre, Madre, Tutor legal"
                  className="border-orange-200 focus:border-orange-400"
                />
              </div>
              <div>
                <Label htmlFor="guardianPhone" className="text-orange-700">Teléfono</Label>
                <Input
                  id="guardianPhone"
                  value={guardianPhone}
                  onChange={(e) => setGuardianPhone(e.target.value)}
                  placeholder="Teléfono del acudiente"
                  className="border-orange-200 focus:border-orange-400"
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
            <TestTube2 className="h-5 w-5" />
            Procedimientos para Carga de Glucosa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="procedimiento-glucosa"
                checked={isProcedureInfoExpanded}
                onCheckedChange={(checked) => setIsProcedureInfoExpanded(checked as boolean)}
                className="mt-1"
              />
              <div className="flex-1">
                <Label 
                  htmlFor="procedimiento-glucosa" 
                  className="cursor-pointer text-medical-blue font-medium text-base"
                >
                  Administración oral de carga de glucosa (Dextrosa Anhidra)
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
            Firma del Profesional
          </CardTitle>
          <p className="text-sm text-medical-gray">Profesional Registrado</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showProfessionalForm && professionalName && (
            <div className="bg-medical-green/10 p-4 rounded-lg border border-medical-green/20">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-medical-green">Profesional Seleccionado</h4>
                  <p className="text-sm text-gray-600">{professionalName} - {professionalDocument}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearProfessional}
                  className="border-medical-green/20 text-medical-green hover:bg-medical-green/5"
                >
                  Cambiar
                </Button>
              </div>
            </div>
          )}

          {(showProfessionalForm || !professionalName) && (
            <>
              <ProfessionalSelector 
                onProfessionalSelect={handleProfessionalSelect}
                onNewProfessional={clearProfessional}
              />
              <Separator />
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Signatures */}
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
                <SignaturePad ref={patientSignatureRef} title="Firma del Paciente" />
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePatientSignature}
                    className="text-medical-blue border-medical-blue/20"
                  >
                    Capturar Firma
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => patientSignatureRef.current?.clear()}
                    className="text-gray-600"
                  >
                    Limpiar
                  </Button>
                </div>
                {patientSignature && (
                  <p className="text-sm text-medical-green mt-2 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    Firma capturada
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label className="text-medical-blue font-medium">Firma del Profesional *</Label>
              <div className="border rounded-lg p-4 bg-gray-50">
                <SignaturePad ref={professionalSignatureRef} title="Firma del Profesional" />
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleProfessionalSignature}
                    className="text-medical-blue border-medical-blue/20"
                  >
                    Capturar Firma
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => professionalSignatureRef.current?.clear()}
                    className="text-gray-600"
                  >
                    Limpiar
                  </Button>
                </div>
                {professionalSignature && (
                  <p className="text-sm text-medical-green mt-2 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    Firma capturada
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Photo Capture */}
      <Card className="border-medical-blue/20">
        <CardHeader>
          <CardTitle className="text-medical-blue flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Foto del Paciente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <CameraCapture ref={cameraCaptureRef} title="Foto del Paciente" />
            <Button
              variant="outline"
              onClick={handlePhotoCapture}
              className="w-full text-medical-blue border-medical-blue/20"
            >
              Capturar Foto
            </Button>
            {patientPhoto && (
              <p className="text-sm text-medical-green flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                Foto capturada exitosamente
              </p>
            )}
          </div>
        </CardContent>
      </Card>


      {/* Generate PDF Button */}
      <Card className="border-medical-green/20 bg-medical-green/5">
        <CardContent className="p-6">
          <div className="text-center">
            <Button
              onClick={generatePDF}
              disabled={isGeneratingPDF || !isFormComplete()}
              className="bg-medical-green hover:bg-medical-green/90 text-white px-8 py-3 text-lg gap-2 disabled:opacity-50"
              size="lg"
            >
              {isGeneratingPDF ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generando PDF...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Generar PDF del Consentimiento
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};