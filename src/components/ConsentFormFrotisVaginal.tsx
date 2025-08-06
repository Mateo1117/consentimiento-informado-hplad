import { useState, useRef, useEffect } from "react";
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
import { FileText, AlertCircle, Shield, Download, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
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

interface ConsentFormProps {
  patientData: PatientData;
  onBack: () => void;
}

const procedimientos = [
  {
    id: "frotis_vaginal",
    nombre: "Toma de Muestras Frotis Vaginal - Cultivo Recto-Vaginal",
    descripcion: "Se toma una muestra de secreción de flujo del área vaginal o rectal, utilizando aplicadores, solución salina, tubo de ensayo, medio de cultivo, laminillas, espéculo. Este material utilizado es totalmente desechable. En el caso de ser menor de edad o no haber tenido relaciones sexuales no se utilizará espéculo para la toma de la muestra.",
    riesgos: "Frotis vaginal: Ardor, dolor, picazón o incomodidad al momento de introducir el espéculo y el aplicador.",
    beneficios: "Orientar y/o confirmar un diagnóstico y realizar seguimiento oportuno de una condición en salud, que permita dar pautas de tratamiento oportuno.",
    alternativas: "Ninguna",
    implicaciones: "Sangrado, dolor pélvico, laceración cervicouterina."
  }
];

export const ConsentFormFrotisVaginal = ({ patientData, onBack }: ConsentFormProps) => {
  const [selectedProcedures, setSelectedProcedures] = useState<string[]>([]);
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [professionalName, setProfessionalName] = useState("");
  const [professionalDocument, setProfessionalDocument] = useState("");
  const [showProfessionalForm, setShowProfessionalForm] = useState(false);
  const [agreedToConsent, setAgreedToConsent] = useState(false);
  const [consentDecision, setConsentDecision] = useState<"aprobar" | "disentir">("aprobar");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isMinor, setIsMinor] = useState(false);
  const [guardianName, setGuardianName] = useState("");
  const [guardianDocument, setGuardianDocument] = useState("");
  const [guardianRelationship, setGuardianRelationship] = useState("");
  const [enfoqueData, setEnfoqueData] = useState({
    gender: false,
    ethnicity: false,
    vital_cycle: false,
    social_position: false,
    disability: false,
    life_condition: false,
  });

  // Estados para firmas y foto
  const patientSignatureRef = useRef<SignatureRef>(null);
  const professionalSignatureRef = useRef<SignatureRef>(null);
  const cameraCaptureRef = useRef<CameraCaptureRef>(null);
  
  // Nuevos estados para las firmas
  const [patientSignature, setPatientSignature] = useState<string>("");
  const [professionalSignature, setProfessionalSignature] = useState<string>("");
  const [patientPhoto, setPatientPhoto] = useState<string | null>(null);
  const [isProcedureInfoExpanded, setIsProcedureInfoExpanded] = useState(false);

  useEffect(() => {
    if (patientData && patientData.edad < 18) {
      setIsMinor(true);
    }
  }, [patientData]);

  const handleProcedureChange = (procedureId: string) => {
    setSelectedProcedures(prev => 
      prev.includes(procedureId) 
        ? prev.filter(id => id !== procedureId)
        : [...prev, procedureId]
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
    if (selectedProcedures.length === 0) {
      toast.error("Debe seleccionar al menos un procedimiento");
      return false;
    }

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

  const saveConsent = async () => {
    if (!validateForm()) return;

    setIsGeneratingPDF(true);

    try {
      toast.success("Consentimiento guardado exitosamente");
    } catch (error) {
      console.error("Error saving consent:", error);
      toast.error("Error al guardar el consentimiento");
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

  const handleEnfoqueChange = (field: keyof typeof enfoqueData) => {
    setEnfoqueData(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  return (
    <div id="consent-form-content" className="space-y-6">
      {/* Header */}
      <Card className="border-medical-blue/20">
        <CardHeader className="bg-gradient-to-r from-medical-blue/5 to-medical-blue-light/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-medical-blue/10 rounded-lg flex items-center justify-center">
              <FileText className="h-6 w-6 text-medical-blue" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-medical-blue text-xl">
                Consentimiento Informado - Frotis Vaginal
              </CardTitle>
              <p className="text-medical-gray text-sm mt-1">
                Formato 319 - Complete todos los campos requeridos para generar el consentimiento
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

      {/* Procedures Section */}
      <Card className="border-medical-blue/20">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-medical-blue" />
            <CardTitle className="text-medical-blue">
              Procedimientos para Frotis Vaginal
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
                id="procedimiento-frotis"
                checked={isProcedureInfoExpanded}
                onCheckedChange={(checked) => setIsProcedureInfoExpanded(checked as boolean)}
                className="mt-1 data-[state=checked]:bg-medical-blue data-[state=checked]:border-medical-blue"
              />
              <div className="flex-1">
                <Label 
                  htmlFor="procedimiento-frotis" 
                  className="cursor-pointer text-medical-blue font-semibold text-base flex items-center gap-2"
                >
                  Toma de Muestra Frotis Vaginal - Cultivo Recto-Vaginal
                  {isProcedureInfoExpanded ? (
                    <ChevronUp className="h-4 w-4 text-medical-blue" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-medical-blue" />
                  )}
                </Label>
                <p className="text-sm text-medical-gray mt-1">
                  Se toma una muestra de secreción de flujo del área vaginal o rectal, utilizando aplicadores, solución salina, tubos de ensayo, medio de cultivo, láminas, espéculo.
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
                      <p className="text-sm text-gray-700 mb-3">
                        Se toma una muestra de secreción de flujo del área vaginal o rectal, utilizando aplicadores, solución salina, 
                        tubos de ensayo, medio de cultivo, láminas, espéculo. Este material utilizado es totalmente desechable. En 
                        el caso de toma de citología se utilizan aplicadores para tomar células sexuales no se debe especificar para la toma de 
                        la muestra.
                      </p>
                      <div className="bg-blue-100 p-3 rounded">
                        <p className="text-sm font-medium text-blue-800">
                          <strong>Propósito:</strong> Identificar la presencia de bacterias, procesos inflamatorios o infecciosos para dar un tratamiento médico.
                        </p>
                      </div>
                    </div>

                    {/* Beneficios Esperados */}
                    <div className="border-l-4 border-green-500 bg-green-50 p-4 rounded-r-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <h5 className="font-semibold text-green-800">Beneficios Esperados:</h5>
                      </div>
                      <p className="text-sm text-gray-700">
                        Orientar y/o confirmar un diagnóstico y realizar el seguimiento oportuno de una condición en salud, que 
                        permita dar pautas de pautas para el tratamiento por el profesional.
                      </p>
                    </div>

                    {/* Riesgos */}
                    <div className="border-l-4 border-red-500 bg-red-50 p-4 rounded-r-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <h5 className="font-semibold text-red-800">Riesgos:</h5>
                      </div>
                      <p className="text-sm text-gray-700">
                        Frotar fuerte. Ardor, dolor, picazón o incomodidad al momento de introducir el espéculo y el aplicador.
                      </p>
                    </div>

                    {/* Implicaciones */}
                    <div className="border-l-4 border-orange-500 bg-orange-50 p-4 rounded-r-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-orange-600">🕐</span>
                        <h5 className="font-semibold text-orange-800">Implicaciones:</h5>
                      </div>
                      <p className="text-sm text-gray-700">
                        Sangrado, dolor pélvico, laceración cervicouterina.
                      </p>
                    </div>

                    {/* Efectos Inevitables */}
                    <div className="border-l-4 border-yellow-500 bg-yellow-50 p-4 rounded-r-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-yellow-600">⚠️</span>
                        <h5 className="font-semibold text-yellow-800">Efectos Inevitables:</h5>
                      </div>
                      <p className="text-sm text-gray-700">
                        Sangrado escaso ocasionado por el espéculo. Molestia, dolor leve o ardor transitorio en la zona vaginal.
                      </p>
                    </div>

                    {/* Alternativas */}
                    <div className="border-l-4 border-purple-500 bg-purple-50 p-4 rounded-r-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-purple-600">🔄</span>
                        <h5 className="font-semibold text-purple-800">Alternativas Razonables a este Procedimiento:</h5>
                      </div>
                      <p className="text-sm text-gray-700">
                        Ninguna.
                      </p>
                    </div>

                    {/* Posibles Consecuencias */}
                    <div className="border-l-4 border-gray-500 bg-gray-50 p-4 rounded-r-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-gray-600">ℹ️</span>
                        <h5 className="font-semibold text-gray-800">Posibles Consecuencias en caso que decida no aceptar el procedimiento:</h5>
                      </div>
                      <p className="text-sm text-gray-700">
                        Impide a los médicos tratantes tener información valiosa para determinar, confirmar o ajustar su diagnóstico y tratamiento médico.
                      </p>
                    </div>

                    {/* Riesgos Específicos del Paciente */}
                    <div className="border-l-4 border-slate-500 bg-slate-50 p-4 rounded-r-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-slate-600">🔍</span>
                        <h5 className="font-semibold text-slate-800">Riesgos Específicos del Paciente:</h5>
                      </div>
                      <p className="text-sm text-slate-500 italic">
                        [Campo a completar según situación específica del paciente]
                      </p>
                    </div>

                    {/* Declaración final */}
                    <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-blue-600">📝</span>
                        <p className="text-sm font-medium text-blue-800">
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
            <div className="flex flex-row items-center gap-8">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="consentDecision"
                  value="aprobar"
                  checked={consentDecision === "aprobar"}
                  onChange={(e) => setConsentDecision(e.target.value as "aprobar")}
                  className="w-5 h-5 text-green-600 border-green-600"
                />
                <span className="text-green-600 font-medium text-base">APROBAR el(los) procedimiento(s)</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="consentDecision"
                  value="disentir"
                  checked={consentDecision === "disentir"}
                  onChange={(e) => setConsentDecision(e.target.value as "disentir")}
                  className="w-5 h-5 text-red-600 border-red-600"
                />
                <span className="text-red-600 font-medium text-base">DISENTIR el(los) procedimiento(s)</span>
              </label>
            </div>
            
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


      {/* Minor Information */}
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
              <div className="md:col-span-2">
                <Label htmlFor="guardianRelationship" className="text-orange-700">Parentesco *</Label>
                <Input
                  id="guardianRelationship"
                  value={guardianRelationship}
                  onChange={(e) => setGuardianRelationship(e.target.value)}
                  placeholder="Ej: Padre, Madre, Tutor legal"
                  className="border-orange-200 focus:border-orange-400"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Información del Profesional */}
      <Card className="border-medical-blue/20">
        <CardHeader>
          <CardTitle className="text-medical-blue flex items-center gap-2">
            <span className="text-medical-blue">📋</span>
            Firma del Profesional
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label className="text-medical-blue font-medium">Profesional Registrado</Label>
              <div className="mt-2">
                <ProfessionalSelector
                  onProfessionalSelect={handleProfessionalSelect}
                  onNewProfessional={() => setShowProfessionalForm(true)}
                  selectedDocument={professionalDocument}
                />
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full border-dashed border-medical-blue/30 text-medical-blue hover:bg-medical-blue/5"
              onClick={() => setShowProfessionalForm(true)}
            >
              <span className="text-lg mr-2">+</span>
              Nuevo Profesional
            </Button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="professionalName" className="text-medical-blue font-medium">Nombre del Profesional *</Label>
                <Input
                  id="professionalName"
                  value={professionalName}
                  onChange={(e) => setProfessionalName(e.target.value)}
                  className="border-medical-blue/20 focus:border-medical-blue"
                  placeholder="Nombre completo del profesional"
                  required
                />
              </div>
              <div>
                <Label htmlFor="professionalDocument" className="text-medical-blue font-medium">Documento del Profesional *</Label>
                <Input
                  id="professionalDocument"
                  value={professionalDocument}
                  onChange={(e) => setProfessionalDocument(e.target.value)}
                  className="border-medical-blue/20 focus:border-medical-blue"
                  placeholder="Número de documento"
                  required
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Firmas Digitales */}
      <Card className="border-medical-blue/20">
        <CardHeader>
          <CardTitle className="text-medical-blue flex items-center gap-2">
            <span className="text-medical-blue">📝</span>
            Firmas Digitales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Firma del Paciente */}
            <div>
              <Label className="text-medical-blue font-medium">Firma del Paciente *</Label>
              <div className="border-2 border-dashed border-medical-blue/30 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-medical-blue">✍️</span>
                  <span className="text-medical-blue font-medium">Firma del Paciente</span>
                </div>
                <p className="text-sm text-medical-gray mb-4">
                  Área de firma digital - Use su dedo o stylus para firmar
                </p>
                <SignaturePad
                  ref={patientSignatureRef}
                  title="Firma del Paciente"
                  subtitle={`Firma de ${patientData.nombre} ${patientData.apellidos}`}
                  required={true}
                />
                <div className="mt-4 flex gap-2">
                  <Button
                    onClick={handlePatientSignature}
                    variant="outline"
                    size="sm"
                    className="border-medical-blue text-medical-blue hover:bg-medical-blue/5 flex items-center gap-1"
                  >
                    <span className="text-xs">🔧</span>
                    Guardar Temp.
                  </Button>
                  <Button
                    onClick={() => {
                      patientSignatureRef.current?.clear();
                      setPatientSignature("");
                    }}
                    variant="outline"
                    size="sm"
                    className="border-gray-300 flex items-center gap-1"
                  >
                    <span className="text-xs">🔄</span>
                    Limpiar
                  </Button>
                </div>
                <div className="mt-3 text-xs text-medical-gray space-y-1">
                  <div className="flex items-center gap-1">
                    <span>✓</span>
                    <span>Instrucciones:</span>
                  </div>
                  <div>• En tablet: Use su dedo o stylus</div>
                  <div>• En computador: Use el mouse</div>
                  <div>• Mantenga presionado mientras firma</div>
                  <div>• Use "Limpiar" para volver a firmar</div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    onClick={handlePatientSignature}
                    className="bg-medical-blue hover:bg-medical-blue-dark text-white flex-1"
                    size="sm"
                  >
                    Capturar Firma
                  </Button>
                  <Button
                    onClick={() => {
                      patientSignatureRef.current?.clear();
                      setPatientSignature("");
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Limpiar
                  </Button>
                </div>
              </div>
            </div>

            {/* Firma del Profesional */}
            <div>
              <Label className="text-medical-blue font-medium">Firma del Profesional *</Label>
              <div className="border-2 border-dashed border-medical-blue/30 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-medical-blue">✍️</span>
                  <span className="text-medical-blue font-medium">Firma del Profesional</span>
                </div>
                <p className="text-sm text-medical-gray mb-4">
                  Área de firma digital - Use su dedo o stylus para firmar
                </p>
                <SignaturePad
                  ref={professionalSignatureRef}
                  title="Firma del Profesional"
                  subtitle={`Firma de ${professionalName || 'Profesional'}`}
                  required={true}
                  isProfessional={true}
                  professionalName={professionalName}
                  professionalDocument={professionalDocument}
                />
                <div className="mt-4 flex gap-2">
                  <Button
                    onClick={() => {
                      professionalSignatureRef.current?.clear();
                      setProfessionalSignature("");
                    }}
                    variant="outline"
                    size="sm"
                    className="border-medical-blue text-medical-blue hover:bg-medical-blue/5 flex items-center gap-1"
                  >
                    <span className="text-xs">🔄</span>
                    Limpiar
                  </Button>
                  <Button
                    onClick={handleProfessionalSignature}
                    className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-1"
                    size="sm"
                  >
                    <span className="text-xs">💾</span>
                    Guardar Firma
                  </Button>
                </div>
                <div className="mt-3 text-xs text-medical-gray space-y-1">
                  <div className="flex items-center gap-1">
                    <span>ℹ️</span>
                    <span>Instrucciones:</span>
                  </div>
                  <div>• En tablet: Use su dedo o stylus</div>
                  <div>• En computador: Use el mouse</div>
                  <div>• Mantenga presionado mientras firma</div>
                  <div>• Use "Limpiar" para volver a firmar</div>
                  <div>• Use "Guardar Firma" para almacenar su firma automáticamente</div>
                  <div>• Use "Captar Firma" para usar una firma previamente guardada</div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    onClick={handleProfessionalSignature}
                    className="bg-medical-blue hover:bg-medical-blue-dark text-white flex-1"
                    size="sm"
                  >
                    Capturar Firma
                  </Button>
                  <Button
                    onClick={() => {
                      professionalSignatureRef.current?.clear();
                      setProfessionalSignature("");
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Limpiar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Foto del Paciente */}
      <Card className="border-medical-blue/20">
        <CardHeader>
          <CardTitle className="text-medical-blue">Foto del Paciente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 bg-gray-50 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">📷</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700 flex items-center gap-2 justify-center">
                    <span className="text-lg">📷</span>
                    Foto del Paciente
                  </h3>
                  <p className="text-gray-500 text-sm mt-2">Cámara no activada</p>
                </div>
                <Button
                  onClick={handlePhotoCapture}
                  variant="outline"
                  className="border-gray-400 text-gray-600 hover:bg-gray-100 flex items-center gap-2"
                >
                  <span className="text-sm">📷</span>
                  Activar Cámara
                </Button>
                <p className="text-xs text-gray-500">
                  La foto se tomará automáticamente al registrar la firma
                </p>
              </div>
            </div>
            <CameraCapture
              ref={cameraCaptureRef}
              title="Captura de Foto del Paciente"
              subtitle="Para verificación de identidad"
            />
            <Button
              onClick={handlePhotoCapture}
              className="w-full bg-medical-blue hover:bg-medical-blue-dark text-white"
            >
              Capturar Foto
            </Button>
          </div>
        </CardContent>
      </Card>

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
              onClick={saveConsent}
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