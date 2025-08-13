import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SignaturePad, SignatureRef } from "./SignaturePad";
import { CameraCapture, CameraCaptureRef } from "./CameraCapture";
import { ProfessionalSelector } from "./ProfessionalSelector";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, AlertCircle, Shield, Download, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import { supabase } from "@/integrations/supabase/client";
import { PhotoService } from "@/services/photoService";
import { notificationService } from "@/services/notificationService";
import { automationService } from "@/services/automationService";

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
    id: "extraccion_sangre",
    nombre: "Extracción de Sangre",
    descripcion: "La venopunción es la técnica por la cual se perfora una vena vía transcutánea con una aguja o catéter. Este procedimiento es la extracción de sangre para fines diagnósticos.",
    riesgos: "Dolor. Sangrado. En casos difíciles de extracción de sangre serán necesarias otras punciones adicionales",
    beneficios: "Orientación diagnóstica de su estado de salud. Seguimiento a tratamiento de su enfermedad",
    alternativas: "No aplica",
    implicaciones: "Sangrado excesivo. Hematoma. Infección. Irritación de la vena. Lesión del nervio"
  },
  {
    id: "toma_flujo_vaginal",
    nombre: "Toma de Flujo Vaginal",
    descripcion: "Se tomará muestra de la secreción para examen directo, previa colocación o no de espéculo vaginal (depende de la anatomía). Se obtiene muestra basal (en ayunas), posterior a esto se le da de tomar agua de glucosa al 25% o concentración normal.",
    riesgos: "No existe ningún riesgo identificado a la toma de la muestra, incluso si se encuentra embarazada actualmente. Debe confirmar en el laboratorio su estado para verificar el valor usado de glucosa durante todo el procedimiento. Tiempo promedio en el cual estará sentado en el laboratorio serán 2 o 3 horas.",
    beneficios: "Orientación diagnóstica de su estado de salud. Seguimiento a tratamiento de su enfermedad",
    alternativas: "Informar a su médico, con el fin de enviar tratamiento sin conocer diagnóstico",
    implicaciones: "No hay implicaciones evidenciadas en literatura y experiencia"
  },
  {
    id: "secrecion_uretral",
    nombre: "Toma de Secreción Uretral",
    descripcion: "El examen de secreción uretral se realiza para determinar la presencia de microorganismos bacterianos en la uretra (conducto de vías urinarias masculinas). Es una muestra basal donde es extraída la secreción en la uretra; potencialmente puede ser doloroso para muchos hombres.",
    riesgos: "Puede sentir presión o estar doliente al hisopo toca la uretra",
    beneficios: "Orientación diagnóstica de su estado de salud. Seguimiento a tratamiento de su enfermedad",
    alternativas: "Informar a su médico, con el fin de enviar tratamiento sin conocer diagnóstico",
    implicaciones: "No hay implicaciones evidenciadas en literatura y experiencia"
  },
  {
    id: "tolerancia_glucosa",
    nombre: "Prueba de Tolerancia Oral",
    descripcion: "Consiste en la determinación de los niveles de Glucosa en sangre en una muestra basal (en ayunas), posterior a esto se le da de tomar agua azucarada con un 75 gr. o ayunas para 3 horas aproximadamente, que el médico está seguro no de esperar cita y seguimiento durante este tiempo en ayunas. Sus tiempos apropiados por el médico está seguro no de esperar cita y seguimiento personal para tomar mediciones cada momento se requiere tomar función del laboratorio.",
    riesgos: "Náuseas, mareos, malestar general, vómitos",
    beneficios: "Diagnóstico preciso de alteración en el metabolismo de la glucosa, permitiendo intervención temprana",
    alternativas: "Hemoglobina glucosilada (HbA1c), glucosa plasmática en ayunas, prueba de glucosa postprandial",
    implicaciones: "Requiere ayuno previo, duración de 2 a 3 horas en el laboratorio, cooperación del paciente, condiciones adecuadas para evitar falsos resultados"
  },
  {
    id: "puncion_arterial",
    nombre: "Punción Arterial",
    descripcion: "Procedimiento para obtener una muestra de sangre directamente de una arteria radial o femoral, para poder sacar una muestra, y, el examen que se solicita. Cualquiera que esté familiarizado con este proceso puede solicitar ayuda para tomar las medidas ocasiones de su funcionalidad.",
    riesgos: "Dolor en el sitio de punción, hematoma, sangrado, infección, daño a la arteria o nervios, espasmo arterial",
    beneficios: "Diagnóstico preciso de oxigenación, ventilación y equilibrio ácido-base, esencial en pacientes críticos",
    alternativas: "Análisis de sangre venosa, medición de oxígeno por saturación no invasiva (oximetría)",
    implicaciones: "Requiere técnica adecuada para evitar complicaciones, monitoreo post-punción, personal capacitado y condiciones estériles"
  }
];

export const ConsentForm = ({ patientData, onBack }: ConsentFormProps) => {
  const [selectedProcedures, setSelectedProcedures] = useState<string[]>([]);
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [professionalName, setProfessionalName] = useState("");
  const [professionalDocument, setProfessionalDocument] = useState("");
  const [showProfessionalForm, setShowProfessionalForm] = useState(false);
  const [agreedToConsent, setAgreedToConsent] = useState(false);
  const [consentDecision, setConsentDecision] = useState<"aprobar" | "disentir" | "">("");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [patientPhotoUrl, setPatientPhotoUrl] = useState<string>("");
  
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
  const documentRef = useRef<HTMLDivElement>(null);
  
  // Determinar si es menor de edad
  const isMinor = patientData.edad < 18;

  const handleProcedureChange = (procedureId: string, checked: boolean) => {
    if (checked) {
      setSelectedProcedures([...selectedProcedures, procedureId]);
    } else {
      setSelectedProcedures(selectedProcedures.filter(id => id !== procedureId));
    }
  };

  const handleProfessionalSelect = (professional: { name: string; document: string; signatureData: string }) => {
    setProfessionalName(professional.name);
    setProfessionalDocument(professional.document);
    setShowProfessionalForm(false);
    
    // Load the signature automatically
    setTimeout(() => {
      professionalSignatureRef.current?.loadSignature(professional.signatureData);
    }, 100);
  };

  const handleNewProfessional = () => {
    setProfessionalName("");
    setProfessionalDocument("");
    setShowProfessionalForm(true);
    
    // Clear the signature
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

    // Validación para menores de edad
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
    console.log("🔥 Iniciando saveConsent");
    if (!validateForm()) {
      console.log("❌ Validación fallida");
      return;
    }

    setIsGeneratingPDF(true);
    try {
      // Get selected procedure data
      const selectedProcedureData = procedimientos.filter(p => selectedProcedures.includes(p.id));

      if (selectedProcedureData.length === 0) {
        toast.error("No se han seleccionado procedimientos");
        setIsGeneratingPDF(false);
        return;
      }

      // Capture signatures first
      const patientSignatureData = patientSignatureRef.current?.getSignatureData();
      const professionalSignatureData = professionalSignatureRef.current?.getSignatureData();
      
      console.log("📝 Firmas capturadas:", {
        patientSignature: !!patientSignatureData,
        professionalSignature: !!professionalSignatureData
      });
      
      if (!patientSignatureData || !professionalSignatureData) {
        console.log("❌ Faltan firmas");
        toast.error("Se requieren ambas firmas para guardar el consentimiento");
        setIsGeneratingPDF(false);
        return;
      }

      // Capture photos
      toast.info("Obteniendo fotos capturadas...");
      
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

      let currentPatientPhotoUrl = "";

      // Upload photo to Supabase if captured
      if (patientPhoto) {
        toast.info("Subiendo foto a la base de datos...");
        const patientUploadResult = await PhotoService.uploadPhoto(
          patientPhoto, 
          `patient_${patientData.numeroDocumento}`
        );
        if (patientUploadResult) {
          currentPatientPhotoUrl = patientUploadResult.url;
          setPatientPhotoUrl(currentPatientPhotoUrl);
        }
      }

      // Prepare data for saving to database
      const consentData: ConsentFormData = {
        patient_name: patientData.nombre,
        patient_surname: patientData.apellidos,
        document_type: patientData.tipoDocumento,
        document_number: patientData.numeroDocumento,
        birth_date: patientData.fechaNacimiento,
        age: patientData.edad,
        eps: patientData.eps,
        phone: patientData.telefono,
        address: patientData.direccion,
        healthcare_center: patientData.centroSalud,
        selected_procedures: selectedProcedureData.map(p => p.nombre),
        consent_decision: consentDecision as "aprobar" | "disentir",
        professional_name: professionalName,
        professional_document: professionalDocument,
        guardian_name: isMinor ? guardianName : undefined,
        guardian_document: isMinor ? guardianDocument : undefined,
        guardian_relationship: isMinor ? guardianRelationship : undefined,
        additional_info: additionalInfo || undefined,
        patient_photo_url: currentPatientPhotoUrl,
        professional_photo_url: undefined,
        patient_signature_data: patientSignatureData,
        professional_signature_data: professionalSignatureData,
        differential_approach: {
          gender: enfoqueGender,
          ethnicity: enfoqueEtnia,
          vital_cycle: enfoqueCicloVital,
          not_applicable: enfoqueNoAplica,
          social_position: enfoquePosicionSocial,
          disability: enfoqueDiscapacidad,
          life_condition: enfoqueCondicionVida
        }
      };

      // Save to database
      toast.info("Guardando consentimiento en la base de datos...");
      
      try {
        const savedConsent = await consentService.saveConsent(consentData);
        if (savedConsent) {
          toast.success("Consentimiento guardado exitosamente");
        }
      } catch (error) {
        console.error("Error saving consent:", error);
        toast.error("Error al guardar el consentimiento en la base de datos");
        return;
      }

      // Trigger automations after successful save
      try {
        console.log("🔔 Triggering post-consent automations...");
        
        await automationService.onConsentCreated(
          {
            decision: consentDecision,
            selectedProcedures,
            professionalName,
            professionalDocument,
            additionalInfo,
            createdAt: new Date().toISOString()
          },
          {
            nombre: patientData.nombre,
            apellidos: patientData.apellidos,
            tipoDocumento: patientData.tipoDocumento,
            numeroDocumento: patientData.numeroDocumento,
            telefono: patientData.telefono,
            centroSalud: patientData.centroSalud,
            eps: patientData.eps,
            edad: patientData.edad
          }
        );

        await notificationService.sendConsentNotifications({
          patientData: {
            nombre: patientData.nombre,
            apellidos: patientData.apellidos,
            tipoDocumento: patientData.tipoDocumento,
            numeroDocumento: patientData.numeroDocumento,
            telefono: patientData.telefono,
            centroSalud: patientData.centroSalud,
            eps: patientData.eps
          },
          consentData: {
            decision: consentDecision,
            procedures: selectedProcedureData.map(p => p.nombre),
            professionalName,
            professionalDocument
          }
        });

        console.log("✅ Automations and notifications triggered successfully");
        toast.success("Consentimiento procesado y notificaciones enviadas");
        
      } catch (automationError: any) {
        console.warn("⚠️ Automation/notification error:", automationError.message);
        toast.warning("Consentimiento guardado pero algunas notificaciones fallaron");
      }

    } catch (error) {
      console.error("❌ Error saving consent:", error);
      toast.error("Error al guardar el consentimiento: " + (error as Error).message);
    } finally {
      console.log("🏁 Finalizando generatePDF");
      setIsGeneratingPDF(false);
    }
  };


  const selectedProcedureData = procedimientos.filter(p => selectedProcedures.includes(p.id));

  return (
    <div className="space-y-6">
      {/* Enfoque Diferencial - Movido arriba */}
      <Card className="border-medical-blue/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-medical-blue">
            <Shield className="h-5 w-5" />
            Enfoque Diferencial
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="genero"
                checked={enfoqueGender}
                onCheckedChange={(checked) => setEnfoqueGender(!!checked)}
              />
              <Label htmlFor="genero" className="text-xs cursor-pointer">
                Género y Orientación Sexual
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="etnia"
                checked={enfoqueEtnia}
                onCheckedChange={(checked) => setEnfoqueEtnia(!!checked)}
              />
              <Label htmlFor="etnia" className="text-xs cursor-pointer">
                Etnia
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="ciclovital"
                checked={enfoqueCicloVital}
                onCheckedChange={(checked) => setEnfoqueCicloVital(!!checked)}
              />
              <Label htmlFor="ciclovital" className="text-xs cursor-pointer">
                Ciclo Vital
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="noaplica"
                checked={enfoqueNoAplica}
                onCheckedChange={(checked) => setEnfoqueNoAplica(!!checked)}
              />
              <Label htmlFor="noaplica" className="text-xs cursor-pointer">
                No Aplica
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="posicionsocial"
                checked={enfoquePosicionSocial}
                onCheckedChange={(checked) => setEnfoquePosicionSocial(!!checked)}
              />
              <Label htmlFor="posicionsocial" className="text-xs cursor-pointer">
                Posición Social Vulnerable
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="discapacidad"
                checked={enfoqueDiscapacidad}
                onCheckedChange={(checked) => setEnfoqueDiscapacidad(!!checked)}
              />
              <Label htmlFor="discapacidad" className="text-xs cursor-pointer">
                Discapacidad
              </Label>
            </div>
            <div className="flex items-center space-x-2 md:col-span-2">
              <Checkbox
                id="condicionvida"
                checked={enfoqueCondicionVida}
                onCheckedChange={(checked) => setEnfoqueCondicionVida(!!checked)}
              />
              <Label htmlFor="condicionvida" className="text-xs cursor-pointer">
                Condición de Vida
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulario visible */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Selección de procedimientos */}
        <Card className="border-medical-blue/20">
          <CardHeader className="bg-gradient-to-r from-medical-blue to-medical-blue/90 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Procedimientos a Realizar
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              {procedimientos.map((procedimiento) => (
                <div key={procedimiento.id} className="border-2 border-medical-blue/20 rounded-lg hover:border-medical-blue/40 transition-colors">
                  <div className="flex items-start space-x-3 p-4">
                    <Checkbox
                      id={procedimiento.id}
                      checked={selectedProcedures.includes(procedimiento.id)}
                      onCheckedChange={(checked) => handleProcedureChange(procedimiento.id, !!checked)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <Label htmlFor={procedimiento.id} className="text-base font-semibold cursor-pointer text-medical-blue">
                        {procedimiento.nombre}
                      </Label>
                      <p className="text-sm text-medical-gray mt-1">
                        {procedimiento.descripcion.substring(0, 150)}...
                      </p>
                      
                      {/* Información desplegable - solo aparece cuando está seleccionado */}
                      {selectedProcedures.includes(procedimiento.id) && (
                        <div className="mt-4 space-y-3 animate-in slide-in-from-top-2 duration-300">
                          <div className="bg-blue-50 p-3 rounded-md border-l-4 border-blue-400">
                            <h4 className="font-medium text-blue-800 mb-2">📋 Descripción Completa:</h4>
                            <p className="text-sm text-blue-700 leading-relaxed">{procedimiento.descripcion}</p>
                          </div>
                          
                          <div className="bg-red-50 p-3 rounded-md border-l-4 border-red-400">
                            <h4 className="font-medium text-red-800 mb-2">⚠️ Riesgos:</h4>
                            <p className="text-sm text-red-700 leading-relaxed">{procedimiento.riesgos}</p>
                          </div>
                          
                          <div className="bg-green-50 p-3 rounded-md border-l-4 border-green-400">
                            <h4 className="font-medium text-green-800 mb-2">✅ Beneficios:</h4>
                            <p className="text-sm text-green-700 leading-relaxed">{procedimiento.beneficios}</p>
                          </div>
                          
                          <div className="bg-purple-50 p-3 rounded-md border-l-4 border-purple-400">
                            <h4 className="font-medium text-purple-800 mb-2">🔄 Alternativas:</h4>
                            <p className="text-sm text-purple-700 leading-relaxed">{procedimiento.alternativas}</p>
                          </div>
                          
                          <div className="bg-amber-50 p-3 rounded-md border-l-4 border-amber-400">
                            <h4 className="font-medium text-amber-800 mb-2">📌 Implicaciones:</h4>
                            <p className="text-sm text-amber-700 leading-relaxed">{procedimiento.implicaciones}</p>
                          </div>
                          
                          <div className="bg-medical-blue/5 p-3 rounded-md border border-medical-blue/20">
                            <p className="text-xs text-medical-blue font-medium">
                              ℹ️ Al seleccionar este procedimiento, usted declara haber leído y comprendido toda la información anterior.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Información adicional */}
        <Card className="border-medical-blue/20 mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-medical-blue">
              <AlertCircle className="h-5 w-5" />
              Información Adicional
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Campos del acudiente para menores de edad */}
            {isMinor && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-2 text-amber-800 font-medium">
                  <AlertCircle className="h-4 w-4" />
                  Paciente menor de edad - Datos del acudiente
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="guardianName">Nombre del Acudiente *</Label>
                    <Input
                      id="guardianName"
                      value={guardianName}
                      onChange={(e) => setGuardianName(e.target.value)}
                      placeholder="Nombre completo del acudiente"
                      className="border-amber-300 focus:border-amber-500"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="guardianDocument">Documento del Acudiente *</Label>
                    <Input
                      id="guardianDocument"
                      value={guardianDocument}
                      onChange={(e) => setGuardianDocument(e.target.value)}
                      placeholder="Número de documento"
                      className="border-amber-300 focus:border-amber-500"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="guardianRelationship">Parentesco *</Label>
                  <Select value={guardianRelationship} onValueChange={setGuardianRelationship}>
                    <SelectTrigger className="border-amber-300 focus:border-amber-500">
                      <SelectValue placeholder="Seleccione el parentesco" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="padre">Padre</SelectItem>
                      <SelectItem value="madre">Madre</SelectItem>
                      <SelectItem value="abuelo">Abuelo(a)</SelectItem>
                      <SelectItem value="tio">Tío(a)</SelectItem>
                      <SelectItem value="hermano">Hermano(a) mayor</SelectItem>
                      <SelectItem value="tutor">Tutor legal</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}


            {/* Decisión del consentimiento */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Decisión sobre el Consentimiento *</Label>
              <div className="flex space-x-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="aprobar"
                    checked={consentDecision === "aprobar"}
                    onCheckedChange={(checked) => setConsentDecision(checked ? "aprobar" : "")}
                  />
                  <Label htmlFor="aprobar" className="text-sm cursor-pointer text-green-700 font-medium">
                    APROBAR el(los) procedimiento(s)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="disentir"
                    checked={consentDecision === "disentir"}
                    onCheckedChange={(checked) => setConsentDecision(checked ? "disentir" : "")}
                  />
                  <Label htmlFor="disentir" className="text-sm cursor-pointer text-red-700 font-medium">
                    DISENTIR el(los) procedimiento(s)
                  </Label>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-medical-blue-light/30 border border-medical-blue/20 rounded-lg">
              <Checkbox
                id="consent"
                checked={agreedToConsent}
                onCheckedChange={(checked) => setAgreedToConsent(!!checked)}
                className="mt-1"
              />
              <Label htmlFor="consent" className="text-sm cursor-pointer leading-relaxed">
                <span className="font-medium">Declaro que:</span> He sido informado(a) sobre el(los) procedimiento(s) seleccionado(s), 
                sus riesgos, beneficios y alternativas. He tomado una decisión informada y autorizo al equipo médico a proceder según mi elección.
              </Label>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Firmas y Fotos organizadas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PRIMERA COLUMNA: Paciente/Acudiente */}
        <div className="space-y-6">
          <div className="space-y-4">
            <SignaturePad
              ref={patientSignatureRef}
              title={isMinor ? "Firma del Acudiente" : "Firma del Paciente"}
              subtitle={isMinor 
                ? `${guardianName || 'Acudiente'} - Representante de ${patientData.nombre} ${patientData.apellidos}`
                : `${patientData.nombre} ${patientData.apellidos} - ${patientData.tipoDocumento} ${patientData.numeroDocumento}`
              }
              required
              isProfessional={false}
              professionalDocument={isMinor ? guardianDocument : patientData.numeroDocumento}
              professionalName={isMinor ? guardianName : `${patientData.nombre} ${patientData.apellidos}`}
            />
            
            {/* Foto del paciente directamente debajo de la firma */}
            <div className="mt-4">
              <CameraCapture
                ref={patientCameraRef}
                title={isMinor ? "Foto del Acudiente" : "Foto del Paciente"}
                subtitle="Foto de identificación de quien firma"
                required
              />
            </div>
          </div>
        </div>
        
        {/* SEGUNDA COLUMNA: Profesional */}
        <div className="space-y-6">
          {/* Professional Signature Card */}
          <Card className="border-medical-blue/20">
            <CardHeader>
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
                {professionalName && professionalDocument && !showProfessionalForm && (
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
              </div>
            </CardHeader>
           <CardContent className="space-y-4">
            {/* Campos manuales solo si es nuevo profesional */}
            {showProfessionalForm && (
              <div className="space-y-4 p-3 bg-medical-blue-light/20 rounded-lg border border-medical-blue/30">
                <div className="space-y-2">
                  <Label htmlFor="professionalName" className="medical-field-label">
                    Nombre del Profesional *
                  </Label>
                  <Input
                    id="professionalName"
                    value={professionalName}
                    onChange={(e) => setProfessionalName(e.target.value)}
                    placeholder="Nombre completo del profesional"
                    className="medical-button-outline"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="professionalDocument" className="medical-field-label">
                    Número de Documento *
                  </Label>
                  <Input
                    id="professionalDocument"
                    value={professionalDocument}
                    onChange={(e) => setProfessionalDocument(e.target.value)}
                    placeholder="Cédula, tarjeta profesional, etc."
                    className="medical-button-outline"
                    required
                  />
                </div>
              </div>
            )}
            
            <SignaturePad
              ref={professionalSignatureRef}
              title="Firma del Profesional"
              subtitle="Responsable del procedimiento"
              required
              isProfessional={true}
              professionalDocument={professionalDocument}
              professionalName={professionalName}
            />
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex gap-4 justify-between">
        <Button
          variant="outline"
          onClick={onBack}
          className="border-medical-blue/30 text-medical-blue hover:bg-medical-blue/5"
        >
          Volver a Búsqueda
        </Button>

        <Button
          onClick={saveConsent}
          disabled={isGeneratingPDF || selectedProcedures.length === 0 || !consentDecision}
          className="bg-medical-green hover:bg-medical-green/90 text-white font-medium px-8"
        >
          {isGeneratingPDF ? (
            "Guardando..."
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              Guardar Consentimiento
            </>
          )}
        </Button>
      </div>

      {/* Documento para PDF (oculto) */}
      <div ref={documentRef} className="hidden">
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', fontSize: '12px', lineHeight: '1.4', color: 'black' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #1e40af', paddingBottom: '10px' }}>
            <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0', color: '#1e40af' }}>
              E.S.E. HOSPITAL PEDRO LEON ALVAREZ DIAZ DE LA MESA
            </h1>
            <p style={{ margin: '5px 0', fontSize: '12px' }}>Nit. 860.009.555-7</p>
            <h2 style={{ fontSize: '14px', fontWeight: 'bold', margin: '10px 0', color: '#1e40af' }}>
              CONSENTIMIENTO INFORMADO TOMA DE MUESTRAS LABORATORIO
            </h2>
            <div style={{ fontSize: '10px', textAlign: 'right' }}>
              <div>Página: 1 de 1</div>
              <div>Versión: 08</div>
              <div>Fecha: Enero de 2025</div>
              <div>Código: 1203SUBCIE-72</div>
              <div>Documento: Controlado</div>
            </div>
          </div>

          {/* Datos del paciente */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', color: '#1e40af' }}>
              DATOS DE IDENTIFICACIÓN
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <strong>NOMBRE Y APELLIDOS:</strong> {patientData.nombre} {patientData.apellidos}
              </div>
              <div>
                <strong>TIPO DE IDENTIFICACIÓN:</strong> {patientData.tipoDocumento}
              </div>
              <div>
                <strong>NÚMERO DE IDENTIFICACIÓN:</strong> {patientData.numeroDocumento}
              </div>
              <div>
                <strong>FECHA DE NACIMIENTO:</strong> {new Date(patientData.fechaNacimiento).toLocaleDateString('es-CO')}
              </div>
              <div>
                <strong>EDAD:</strong> {patientData.edad} años
              </div>
              <div>
                <strong>EPS:</strong> {patientData.eps}
              </div>
            </div>
            <div style={{ marginTop: '10px' }}>
              <div>
                <strong>CENTRO DE SALUD:</strong> {patientData.centroSalud}
              </div>
              <div>
                <strong>FECHA:</strong> {new Date().toLocaleDateString('es-CO')}
              </div>
            </div>
          </div>

          {/* Información general */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', color: '#1e40af' }}>
              INFORMACIÓN
            </h3>
            <p style={{ textAlign: 'justify', fontSize: '11px', lineHeight: '1.4' }}>
              Durante el transcurso de la atención prestada desde el ingreso y hasta el egreso de la institución existe la posibilidad de requerir procedimientos para 
              tratamientos con fines diagnósticos invasivos o no quirúrgicos, realizados por el personal encargado de la atención, ya que forman parte integral de su 
              tratamiento.
            </p>
            <p style={{ textAlign: 'justify', fontSize: '11px', lineHeight: '1.4', marginTop: '10px' }}>
              Dichas intervenciones tienen como propósito contribuir con el proceso asistencial y dar cumplimiento a las órdenes del médico tratante, establecidas 
              dentro del Plan de Cuidado de cada paciente y serán realizadas teniendo en cuenta los Protocolos institucionales, que salvaguarden la Seguridad del 
              paciente y la Calidad de la atención.
            </p>
          </div>

          {/* Procedimientos seleccionados */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', color: '#1e40af' }}>
              PROCEDIMIENTO(S) SELECCIONADO(S)
            </h3>
            
            {selectedProcedureData.map((procedimiento, index) => (
              <div key={procedimiento.id} style={{ marginBottom: '15px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: '#1e40af' }}>
                  {index + 1}. {procedimiento.nombre}
                </h4>
                
                <div style={{ fontSize: '11px', lineHeight: '1.4', textAlign: 'justify' }}>
                  <p style={{ marginBottom: '5px' }}>
                    <strong>Descripción:</strong> {procedimiento.descripcion}
                  </p>
                  
                  <p style={{ marginBottom: '5px' }}>
                    <strong>Riesgos:</strong> {procedimiento.riesgos}
                  </p>
                  
                  <p style={{ marginBottom: '5px' }}>
                    <strong>Beneficios:</strong> {procedimiento.beneficios}
                  </p>
                  
                  <p style={{ marginBottom: '5px' }}>
                    <strong>Alternativas:</strong> {procedimiento.alternativas}
                  </p>
                  
                  {procedimiento.implicaciones && (
                    <p style={{ marginBottom: '5px' }}>
                      <strong>Implicaciones:</strong> {procedimiento.implicaciones}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Observaciones adicionales */}
          {additionalInfo && (
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', color: '#1e40af' }}>
                OBSERVACIONES ADICIONALES
              </h3>
              <p style={{ fontSize: '11px', textAlign: 'justify' }}>{additionalInfo}</p>
            </div>
          )}

          {/* Declaración de consentimiento */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', color: '#1e40af' }}>
              DECLARACIÓN DE CONSENTIMIENTO
            </h3>
            <p style={{ fontSize: '11px', textAlign: 'justify', lineHeight: '1.4', marginBottom: '10px' }}>
              Procedimientos a realizar:
            </p>
            <p style={{ fontSize: '11px', textAlign: 'justify', lineHeight: '1.4' }}>
              Yo, <strong>{isMinor ? guardianName : `${patientData.nombre} ${patientData.apellidos}`}</strong> mayor de edad, identificado con {isMinor ? 'CC número' : patientData.tipoDocumento + ' número'} <strong>{isMinor ? guardianDocument : patientData.numeroDocumento}</strong>, he sido informado por el profesional sobre el(los) procedimiento(s) e intervención(es) en salud a la(s) que va(n) a ser sometido(a), los riesgos.
            </p>
            <p style={{ fontSize: '11px', textAlign: 'justify', lineHeight: '1.4', marginTop: '10px' }}>
              Adicionalmente se entidad en mención y el equipo tratante, quienes autorizaron para tomar las conductas o los procedimientos médicamente necesarios y aplicar los procedimientos que a medida que se creen compromiso de la realización del procedimiento, atención o intervención solicitada que médico solicite.
            </p>
            <p style={{ fontSize: '11px', textAlign: 'justify', lineHeight: '1.4', marginTop: '10px' }}>
              He comprendido con claridad todo lo escrito anteriormente, he tenido la oportunidad de hacer preguntas que han sido resueltas y acepto la realización del procedimiento, atención o intervención solicitada que médico solicite.
            </p>
          </div>

          {/* Firmas y Fotos */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginTop: '40px' }}>
            <div>
              <h4 style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '10px', textAlign: 'center' }}>
                {isMinor ? 'REPRESENTANTE LEGAL' : 'PACIENTE'}
              </h4>
              {/* Contenedor de firma y foto del paciente */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', marginBottom: '20px' }}>
                {/* Firma del paciente */}
                <div style={{ flex: '1' }}>
                  <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                    {patientSignatureRef.current?.getSignatureData() && (
                      <img 
                        src={patientSignatureRef.current.getSignatureData() || ''} 
                        alt="Firma del Paciente" 
                        style={{ maxWidth: '150px', maxHeight: '60px', border: '1px solid #ddd' }}
                      />
                    )}
                  </div>
                  <div style={{ borderTop: '1px solid #333', paddingTop: '5px', textAlign: 'center', fontSize: '10px' }}>
                    <strong>Firma</strong>
                  </div>
                </div>
                {/* Foto del paciente */}
                <div style={{ flex: '1' }}>
                  <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                    {patientPhotoUrl && (
                      <img 
                        src={patientPhotoUrl} 
                        alt="Foto del Paciente" 
                        style={{ maxWidth: '100px', maxHeight: '120px', border: '1px solid #ddd', objectFit: 'cover' }}
                      />
                    )}
                  </div>
                  <div style={{ borderTop: '1px solid #333', paddingTop: '5px', textAlign: 'center', fontSize: '10px' }}>
                    <strong>Foto</strong>
                  </div>
                </div>
              </div>
              
              {/* Información del paciente */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ marginTop: '5px' }}>
                  <strong>Nombre:</strong> {isMinor ? guardianName : `${patientData.nombre} ${patientData.apellidos}`}
                </div>
                <div style={{ marginTop: '5px' }}>
                  <strong>Documento:</strong> {isMinor ? guardianDocument : patientData.numeroDocumento}
                </div>
                {isMinor && (
                  <div style={{ marginTop: '5px' }}>
                    <strong>Parentesco:</strong> {guardianRelationship}
                  </div>
                )}
                <div style={{ marginTop: '5px' }}>
                  <strong>Fecha:</strong> {new Date().toLocaleDateString('es-CO')}
                </div>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '10px', textAlign: 'center' }}>
                PROFESIONAL DE SALUD
              </h4>
              {/* Solo firma del profesional, sin foto */}
              <div style={{ marginBottom: '20px' }}>
                {/* Firma del profesional */}
                <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                  {professionalSignatureRef.current?.getSignatureData() && (
                    <img 
                      src={professionalSignatureRef.current.getSignatureData() || ''} 
                      alt="Firma del Profesional" 
                      style={{ maxWidth: '200px', maxHeight: '60px', border: '1px solid #ddd' }}
                    />
                  )}
                </div>
                <div style={{ borderTop: '1px solid #333', paddingTop: '5px', textAlign: 'center', fontSize: '10px' }}>
                  <strong>Firma</strong>
                </div>
              </div>
              
              {/* Información del profesional */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ marginTop: '5px' }}>
                  <strong>Nombre:</strong> {professionalName}
                </div>
                <div style={{ marginTop: '5px' }}>
                  <strong>Documento:</strong> {professionalDocument}
                </div>
                <div style={{ marginTop: '5px' }}>
                  <strong>Fecha:</strong> {new Date().toLocaleDateString('es-CO')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};