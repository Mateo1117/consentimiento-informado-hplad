import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SignaturePad, SignatureRef } from "./SignaturePad";
import { CameraCapture, CameraCaptureRef } from "./CameraCapture";
import { ProfessionalSelector } from "./ProfessionalSelector";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, AlertCircle, Shield, Download, CheckCircle, Heart } from "lucide-react";
import { toast } from "sonner";
import { ConsentPDFGenerator, type ConsentPDFData } from "@/utils/pdfGenerator";
import html2canvas from "html2canvas";

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

interface ConsentFormHisopadoProps {
  patientData: PatientData;
  onBack: () => void;
}

const procedimientosHisopado = [
  {
    id: "hisopado_nasofaringeo",
    nombre: "Hisopado Nasofaríngeo",
    descripcion: "Introducción de un hisopo estéril en la cavidad nasal hasta la nasofaringe para recolectar una muestra de secreciones. Se usa para detectar infecciones virales o bacterianas como influenza, COVID-19 y faringitis estreptocócica.",
    riesgos: "Molestia, lagrimeo, estornudos, irritación, sangrado nasal (raro), reflejo nauseoso.",
    beneficios: "Diagnóstico rápido y preciso de infecciones respiratorias, facilitando el tratamiento oportuno.",
    alternativas: "Hisopado orofaríngeo, pruebas de saliva, aspirado nasofaríngeo, pruebas serológicas o de antígenos.",
    implicaciones: "Requiere técnica estéril, personal capacitado y transporte adecuado de la muestra para evitar falsos negativos."
  },
  {
    id: "hisopado_orofaringeo",
    nombre: "Hisopado Orofaríngeo",
    descripcion: "Introducción de un hisopo estéril en la boca hasta la orofaringe para recolectar una muestra de secreciones tomada en el diagnóstico de infecciones virales o bacterianas como estreptococo, COVID-19 e influenza.",
    riesgos: "Molestia, reflejo de náuseas, irritación, los ligero malestar en la garganta.",
    beneficios: "Diagnóstico rápido y preciso de infecciones respiratorias y faríngeas, facilitando el tratamiento oportuno.",
    alternativas: "Hisopado nasofaríngeo, pruebas de saliva, aspirado faríngeo, pruebas serológicas o de antígenos.",
    implicaciones: "Requiere técnica adecuada para evitar la contaminación de la muestra, personal capacitado y transporte adecuado al laboratorio."
  }
];

const enfoquesDiferenciales = [
  { id: "genero_orientacion_sexual", label: "GÉNERO Y ORIENTACIÓN SEXUAL" },
  { id: "etnia", label: "ETNIA" },
  { id: "ciclo_vital", label: "CICLO VITAL" },
  { id: "no_aplica", label: "NO APLICA" },
  { id: "posicion_social_vulnerable", label: "POSICIÓN SOCIAL VULNERABLE" },
  { id: "discapacidad", label: "DISCAPACIDAD" },
  { id: "condicion_de_vida", label: "CONDICIÓN DE VIDA" }
];

export const ConsentFormHisopado = ({ patientData, onBack }: ConsentFormHisopadoProps) => {
  const [selectedProcedures, setSelectedProcedures] = useState<string[]>([]);
  const [isMinor, setIsMinor] = useState(false);
  const [guardianName, setGuardianName] = useState("");
  const [guardianDocument, setGuardianDocument] = useState("");
  const [consentDecision, setConsentDecision] = useState<'aprobar' | 'disentir'>('aprobar');
  const [patientSignature, setPatientSignature] = useState<string>("");
  const [professionalSignature, setProfessionalSignature] = useState<string>("");
  const [selectedProfessional, setSelectedProfessional] = useState<any>(null);
  const [witnessName, setWitnessName] = useState("");
  const [witnessDocument, setWitnessDocument] = useState("");
  const [witnessSignature, setWitnessSignature] = useState<string>("");
  const [additionalProcedures, setAdditionalProcedures] = useState("");
  const [selectedEnfoques, setSelectedEnfoques] = useState<string[]>([]);
  const [patientPhoto, setPatientPhoto] = useState<string>("");
  const [agreedToConsent, setAgreedToConsent] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const patientSignaturePadRef = useRef<SignatureRef>(null);
  const professionalSignaturePadRef = useRef<SignatureRef>(null);
  const witnessSignaturePadRef = useRef<SignatureRef>(null);
  const cameraCaptureRef = useRef<CameraCaptureRef>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMinor(patientData.edad < 18);
  }, [patientData]);

  useEffect(() => {
    // Check for signatures periodically
    const checkSignatures = () => {
      const patientSig = patientSignaturePadRef.current?.getSignatureData();
      const professionalSig = professionalSignaturePadRef.current?.getSignatureData();
      const witnessSig = witnessSignaturePadRef.current?.getSignatureData();
      
      if (patientSig && patientSig !== patientSignature) {
        setPatientSignature(patientSig);
      }
      if (professionalSig && professionalSig !== professionalSignature) {
        setProfessionalSignature(professionalSig);
      }
      if (witnessSig && witnessSig !== witnessSignature) {
        setWitnessSignature(witnessSig);
      }
    };

    const interval = setInterval(checkSignatures, 1000);
    return () => clearInterval(interval);
  }, [patientSignature, professionalSignature, witnessSignature]);

  useEffect(() => {
    // Check for captured photo
    const checkPhoto = () => {
      const photo = cameraCaptureRef.current?.getCapturedPhoto();
      if (photo && photo !== patientPhoto) {
        setPatientPhoto(photo);
      }
    };

    const interval = setInterval(checkPhoto, 1000);
    return () => clearInterval(interval);
  }, [patientPhoto]);

  const handleProcedureChange = (procedureId: string, checked: boolean) => {
    if (checked) {
      setSelectedProcedures(prev => [...prev, procedureId]);
    } else {
      setSelectedProcedures(prev => prev.filter(id => id !== procedureId));
    }
  };

  const handleEnfoqueChange = (enfoqueId: string, checked: boolean) => {
    if (checked) {
      setSelectedEnfoques(prev => [...prev, enfoqueId]);
    } else {
      setSelectedEnfoques(prev => prev.filter(id => id !== enfoqueId));
    }
  };

  const handlePatientSignature = (signature: string) => {
    setPatientSignature(signature);
  };

  const handleProfessionalSignature = (signature: string) => {
    setProfessionalSignature(signature);
  };

  const handleWitnessSignature = (signature: string) => {
    setWitnessSignature(signature);
  };

  const clearPatientSignature = () => {
    patientSignaturePadRef.current?.clear();
    setPatientSignature("");
  };

  const clearProfessionalSignature = () => {
    professionalSignaturePadRef.current?.clear();
    setProfessionalSignature("");
  };

  const clearWitnessSignature = () => {
    witnessSignaturePadRef.current?.clear();
    setWitnessSignature("");
  };

  const handlePhotoCapture = (photo: string) => {
    setPatientPhoto(photo);
  };

  const handleProfessionalSelect = (professional: {
    name: string;
    document: string;
    signatureData: string;
  }) => {
    setSelectedProfessional(professional);
    setTimeout(() => {
      professionalSignaturePadRef.current?.loadSignature(professional.signatureData);
    }, 100);
  };

  const handleNewProfessional = () => {
    setSelectedProfessional(null);
    setTimeout(() => {
      professionalSignaturePadRef.current?.clear();
    }, 100);
  };

  const validateForm = (): boolean => {
    if (selectedProcedures.length === 0) {
      toast.error("Debe seleccionar al menos un procedimiento");
      return false;
    }

    if (!agreedToConsent) {
      toast.error("Debe aceptar el consentimiento informado");
      return false;
    }

    if (!patientSignature) {
      toast.error("La firma del paciente es obligatoria");
      return false;
    }

    if (!professionalSignature || !selectedProfessional) {
      toast.error("La firma del profesional es obligatoria");
      return false;
    }

    if (isMinor && (!guardianName || !guardianDocument)) {
      toast.error("Para menores de edad, los datos del representante legal son obligatorios");
      return false;
    }

    return true;
  };

  const generatePDF = async () => {
    if (!validateForm()) return;

    setIsGeneratingPDF(true);

    try {
      const selectedProceduresData = procedimientosHisopado.filter(proc => 
        selectedProcedures.includes(proc.id)
      );

      const pdfData: ConsentPDFData = {
        patientData: patientData,
        isMinor,
        guardianName,
        guardianDocument,
        professionalName: selectedProfessional?.name || "",
        professionalDocument: selectedProfessional?.document || "",
        consentDecision,
        selectedProcedures: selectedProceduresData,
        patientSignature,
        professionalSignature,
        patientPhoto,
        enfoqueData: {
          gender: selectedEnfoques.includes('genero_orientacion_sexual'),
          ethnicity: selectedEnfoques.includes('etnia'),
          vital_cycle: selectedEnfoques.includes('ciclo_vital'),
          social_position: selectedEnfoques.includes('posicion_social_vulnerable'),
          disability: selectedEnfoques.includes('discapacidad'),
          life_condition: selectedEnfoques.includes('condicion_de_vida')
        }
      };

      const generator = new ConsentPDFGenerator();
      const pdf = generator.generatePDF(pdfData);
      
      // Create download link
      const pdfBlob = pdf.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `consentimiento_hisopado_${patientData.numeroDocumento}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Consentimiento informado de hisopado generado exitosamente");
      
    } catch (error) {
      console.error('Error generating consent:', error);
      toast.error("Error al generar el consentimiento informado");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6" ref={formRef}>
      {/* Header */}
      <Card className="border-medical-blue/20 bg-gradient-to-r from-white to-medical-blue-light/30">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-medical-blue/10 rounded-full flex items-center justify-center">
                <FileText className="h-6 w-6 text-medical-blue" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-medical-blue">Consentimiento Informado - Hisopado</h2>
                <p className="text-medical-gray">
                  Consentimiento para toma de hisopado nasofaríngeo/orofaríngeo
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
      <Card className="border-medical-blue/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-medical-blue">
            <FileText className="h-5 w-5" />
            Información del Paciente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium text-medical-gray">Nombre completo</Label>
              <p className="text-lg font-semibold">{patientData.nombre} {patientData.apellidos}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-medical-gray">Documento</Label>
              <p className="text-lg">{patientData.tipoDocumento} {patientData.numeroDocumento}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-medical-gray">Edad</Label>
              <p className="text-lg">{patientData.edad} años</p>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Enfoque Diferencial */}
      <Card className="border-medical-blue/20">
        <CardHeader>
          <CardTitle className="text-medical-blue">Enfoque Diferencial</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {enfoquesDiferenciales.map((enfoque) => (
              <div key={enfoque.id} className="flex items-center space-x-2">
                <Checkbox
                  id={enfoque.id}
                  checked={selectedEnfoques.includes(enfoque.id)}
                  onCheckedChange={(checked) => 
                    handleEnfoqueChange(enfoque.id, checked as boolean)
                  }
                />
                <Label htmlFor={enfoque.id} className="text-sm font-medium leading-tight">
                  {enfoque.label}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Procedures */}
      <Card className="border-medical-blue/20">
        <CardHeader>
          <CardTitle className="text-medical-blue">Procedimientos a Realizar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {procedimientosHisopado.map((procedure) => (
              <div key={procedure.id} className="border rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id={procedure.id}
                    checked={selectedProcedures.includes(procedure.id)}
                    onCheckedChange={(checked) => 
                      handleProcedureChange(procedure.id, checked as boolean)
                    }
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label htmlFor={procedure.id} className="text-base font-semibold text-medical-blue cursor-pointer">
                      {procedure.nombre}
                    </Label>
                    <p className="text-sm text-medical-gray mt-1">{procedure.descripcion}</p>
                    
                    {/* Información desplegable cuando el procedimiento está seleccionado */}
                    <Collapsible open={selectedProcedures.includes(procedure.id)}>
                      <CollapsibleContent className="mt-4 space-y-3">
                        {/* Descripción Completa */}
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-4 w-4 text-blue-600" />
                            <h4 className="font-medium text-blue-800">Descripción Completa:</h4>
                          </div>
                          <p className="text-sm text-blue-700">{procedure.descripcion}</p>
                        </div>

                        {/* Riesgos */}
                        <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <h4 className="font-medium text-red-800">Riesgos:</h4>
                          </div>
                          <p className="text-sm text-red-700">{procedure.riesgos}</p>
                        </div>

                        {/* Beneficios */}
                        <div className="bg-green-50 border-l-4 border-green-400 p-3 rounded">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <h4 className="font-medium text-green-800">Beneficios:</h4>
                          </div>
                          <p className="text-sm text-green-700">{procedure.beneficios}</p>
                        </div>

                        {/* Alternativas */}
                        <div className="bg-purple-50 border-l-4 border-purple-400 p-3 rounded">
                          <div className="flex items-center gap-2 mb-2">
                            <Shield className="h-4 w-4 text-purple-600" />
                            <h4 className="font-medium text-purple-800">Alternativas:</h4>
                          </div>
                          <p className="text-sm text-purple-700">{procedure.alternativas}</p>
                        </div>

                        {/* Implicaciones */}
                        <div className="bg-orange-50 border-l-4 border-orange-400 p-3 rounded">
                          <div className="flex items-center gap-2 mb-2">
                            <Heart className="h-4 w-4 text-orange-600" />
                            <h4 className="font-medium text-orange-800">Implicaciones:</h4>
                          </div>
                          <p className="text-sm text-orange-700">{procedure.implicaciones}</p>
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
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </CardContent>
      </Card>

      {/* Guardian Information */}
      {isMinor && (
        <Card className="border-medical-blue/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-medical-blue">
              <AlertCircle className="h-5 w-5" />
              Información del Representante Legal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="guardianName">Nombre Completo del Representante</Label>
                <Input
                  id="guardianName"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  placeholder="Nombre completo"
                  required
                />
              </div>
              <div>
                <Label htmlFor="guardianDocument">Documento de Identidad</Label>
                <Input
                  id="guardianDocument"
                  value={guardianDocument}
                  onChange={(e) => setGuardianDocument(e.target.value)}
                  placeholder="Número de documento"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Consent Decision */}
      <Card className="border-medical-blue/20">
        <CardHeader>
          <CardTitle className="text-medical-blue">Decisión del Consentimiento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="aprobar"
                  name="consent"
                  value="aprobar"
                  checked={consentDecision === 'aprobar'}
                  onChange={(e) => setConsentDecision(e.target.value as 'aprobar' | 'disentir')}
                  className="h-4 w-4 text-medical-blue"
                />
                <Label htmlFor="aprobar" className="font-medium text-medical-blue">
                  APROBAR la realización del procedimiento
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="disentir"
                  name="consent"
                  value="disentir"
                  checked={consentDecision === 'disentir'}
                  onChange={(e) => setConsentDecision(e.target.value as 'aprobar' | 'disentir')}
                  className="h-4 w-4 text-medical-blue"
                />
                <Label htmlFor="disentir" className="font-medium text-medical-blue">
                  DISENTIR la realización del procedimiento
                </Label>
              </div>
            </div>
            
            {/* Consent Agreement checkbox */}
            <div className="mt-6 pt-4 border-t border-medical-blue/20 bg-medical-blue-light/10 p-4 rounded">
              <div className="flex items-start space-x-3">
                <Checkbox 
                  id="agree-consent" 
                  checked={agreedToConsent} 
                  onCheckedChange={checked => setAgreedToConsent(checked as boolean)} 
                  className="mt-1" 
                />
                <Label htmlFor="agree-consent" className="text-sm leading-relaxed cursor-pointer">
                  He leído, entendido y acepto los términos del consentimiento informado para la toma de hisopado. 
                  Entiendo los riesgos, beneficios y alternativas del procedimiento, y doy mi consentimiento para su realización.
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Professional Selector */}
      <Card className="border-medical-blue/20">
        <CardHeader>
          <CardTitle className="text-medical-blue">Profesional de Salud</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfessionalSelector 
            onProfessionalSelect={handleProfessionalSelect}
            onNewProfessional={handleNewProfessional}
          />
        </CardContent>
      </Card>

      {/* Signatures */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Patient/Guardian Signature */}
        <Card className="border-medical-blue/20">
          <CardHeader>
            <CardTitle className="text-medical-blue">
              Firma del {isMinor ? 'Representante Legal' : 'Paciente'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <SignaturePad
                ref={patientSignaturePadRef}
                title={`Firma del ${isMinor ? 'Representante Legal' : 'Paciente'}`}
                subtitle="Firma aquí para autorizar el procedimiento"
                required
              />
              <Button 
                variant="outline" 
                onClick={clearPatientSignature}
                className="w-full"
              >
                Limpiar Firma
               </Button>
               
               {/* Patient Photo */}
               <div className="mt-4 pt-4 border-t border-gray-200">
                 <Label className="text-sm font-medium text-medical-blue mb-2 block">
                   Fotografía del Paciente
                 </Label>
                 <CameraCapture
                   ref={cameraCaptureRef}
                   title="Fotografía del Paciente"
                   subtitle={`Paciente: ${patientData.nombre} ${patientData.apellidos}`}
                 />
               </div>
             </div>
           </CardContent>
         </Card>

        {/* Professional Signature */}
        <Card className="border-medical-blue/20">
          <CardHeader>
            <CardTitle className="text-medical-blue">Firma del Profesional</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
               <SignaturePad
                 ref={professionalSignaturePadRef}
                 title="Firma del Profesional"
                 subtitle="Firma del profesional autorizado"
                 isProfessional
                 required
               />
               <Button 
                 variant="outline" 
                 onClick={clearProfessionalSignature}
                 className="w-full"
               >
                 Limpiar Firma
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Action Buttons */}
      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onBack}>
          Volver
        </Button>
        <Button 
          onClick={generatePDF}
          disabled={isGeneratingPDF}
          className="bg-medical-blue hover:bg-medical-blue/90"
        >
          {isGeneratingPDF ? (
            "Generando PDF..."
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Generar Consentimiento
            </>
          )}
        </Button>
      </div>
    </div>
  );
};