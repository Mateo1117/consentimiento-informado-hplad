import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SignaturePad, SignatureRef } from "./SignaturePad";
import { FingerprintCapture, FingerprintCaptureRef } from "./FingerprintCapture";
import { ProfessionalSelector } from "./ProfessionalSelector";
import { FileText, AlertCircle, Shield, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { ConsentFormWrapper } from './ConsentFormWrapper';
import { GuardianSignatureSection, GuardianSignatureRef } from './GuardianSignatureSection';
import { toast } from "sonner";

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

export const ConsentFormTac = ({ patientData, onBack }: ConsentFormProps) => {
  // Determinar si es menor de edad
  const isMinor = patientData.edad < 18;

  // Usar el estado de discapacidad del paciente
  const hasDisability = patientData.hasDisability || false;

  const [selectedProcedures, setSelectedProcedures] = useState<string[]>([]);
  const [consentDecision, setConsentDecision] = useState<"aprobar" | "disentir">("aprobar");
  const [agreedToConsent, setAgreedToConsent] = useState(false);
  const [isProcedureInfoExpanded, setIsProcedureInfoExpanded] = useState(false);
  const [clinicalRiskNotes, setClinicalRiskNotes] = useState('');

  // Estados para el profesional
  const [professionalData, setProfessionalData] = useState({
    name: '',
    document: ''
  });

  // Auto-cargar datos del profesional logueado (incluida la firma)
  useEffect(() => {
    const loadProfessional = async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profSig } = await supabase
          .from('professional_signatures')
          .select('professional_name, professional_document, signature_data')
          .eq('created_by', user.id)
          .single();
        if (profSig) {
          setProfessionalData({ name: profSig.professional_name, document: profSig.professional_document });
          if (profSig.signature_data && !professionalSignature) {
            setProfessionalSignature(profSig.signature_data);
          }
        }
      } catch { /* silently ignore */ }
    };
    loadProfessional();
  }, []);

  // Estados para firmas y foto
  const patientSignatureRef = useRef<SignatureRef>(null);
  const professionalSignatureRef = useRef<SignatureRef>(null);
  const cameraCaptureRef = useRef<FingerprintCaptureRef>(null);
  const guardianSignatureRef = useRef<GuardianSignatureRef>(null);

  // Estados para datos del acudiente
  const [guardianName, setGuardianName] = useState('');
  const [guardianDocument, setGuardianDocument] = useState('');
  const [guardianRelationship, setGuardianRelationship] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianSignature, setGuardianSignature] = useState<string | null>(null);

  const [patientSignature, setPatientSignature] = useState<string | null>(null);
  const [professionalSignature, setProfessionalSignature] = useState<string | null>(null);
  const [patientPhoto, setPatientPhoto] = useState<string | null>(null);

  // Determinar si requiere firma de acudiente
  const requiresGuardian = isMinor || hasDisability;

  const handleProcedureChange = (procedureId: string) => {
    setSelectedProcedures(prev =>
      prev.includes(procedureId)
        ? prev.filter(id => id !== procedureId)
        : [...prev, procedureId]
    );
  };

  const generatePDF = async (): Promise<Blob> => {
    if (!professionalData.name || !professionalData.document) {
      throw new Error('Por favor complete los datos del profesional');
    }

    if (selectedProcedures.length === 0) {
      throw new Error('Debe seleccionar al menos un procedimiento');
    }

    // Validar datos del acudiente si es requerido
    if (requiresGuardian) {
      if (!guardianName.trim()) {
        throw new Error('El nombre del acudiente es obligatorio');
      }
      if (!guardianDocument.trim()) {
        throw new Error('El documento del acudiente es obligatorio');
      }
      if (!guardianRelationship.trim()) {
        throw new Error('El parentesco del acudiente es obligatorio');
      }
      if (!guardianSignature) {
        throw new Error('La firma del acudiente es obligatoria');
      }
    }

    if (!agreedToConsent) {
      throw new Error('Debe aceptar los términos del consentimiento');
    }

    try {
      const capturedPhoto = cameraCaptureRef.current?.getFingerprintData() ?? patientPhoto ?? undefined;
      const patientSignatureData = patientSignatureRef.current?.getSignatureData() || patientSignature;
      const guardianSignatureData = guardianSignatureRef.current?.getSignatureData() || guardianSignature;
      const professionalSignatureData = professionalSignatureRef.current?.getSignatureData() || professionalSignature;

      if (!professionalSignatureData || professionalSignatureData.length < 100) {
        throw new Error('La firma del profesional es obligatoria');
      }

      const { generateTacPDF } = await import('@/utils/pdfGeneratorTac');

      const pdfData = {
        patientData: {
          nombre: patientData.nombre,
          apellidos: patientData.apellidos,
          tipoDocumento: patientData.tipoDocumento,
          numeroDocumento: patientData.numeroDocumento,
          fechaNacimiento: patientData.fechaNacimiento,
          edad: patientData.edad,
          sexo: patientData.sexo || 'N/A',
          eps: patientData.eps,
          telefono: patientData.telefono,
          direccion: patientData.direccion,
          centroSalud: patientData.centroSalud
        },
        guardianData: requiresGuardian ? {
          name: guardianName,
          document: guardianDocument,
          relationship: guardianRelationship
        } : null,
        professionalName: professionalData.name,
        professionalDocument: professionalData.document,
        // Firma del paciente: solo cuando NO hay acudiente
        patientSignature: requiresGuardian ? null : patientSignatureData,
        // Firma del acudiente: solo cuando hay acudiente
        guardianSignature: requiresGuardian ? guardianSignatureData : null,
        professionalSignature: professionalSignatureData,
        patientPhoto: capturedPhoto,
        consentDecision,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('es-CO', { hour12: false }),
        clinicalRiskNotes
      };

      const pdf = await generateTacPDF(pdfData);
      return pdf.output('blob');
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  };

  const getHTMLContent = (): string => {
    return document.getElementById('consent-form-content')?.innerHTML || '';
  };

  const handleProfessionalSelect = (professional: any) => {
    setProfessionalData({
      name: professional.name,
      document: professional.document
    });
    if (professional.signatureData) {
      setProfessionalSignature(professional.signatureData);
      setTimeout(() => {
        if (professionalSignatureRef.current) {
          professionalSignatureRef.current.loadSignature(professional.signatureData);
          toast.success("Firma del profesional cargada automáticamente");
        }
      }, 100);
    }
  };

  const handleNewProfessional = () => {
    setProfessionalData({
      name: '',
      document: ''
    });
    setProfessionalSignature(null);
  };

  return (
    <ConsentFormWrapper
      consentType="TOMOGRAFÍA AXIAL COMPUTARIZADA CON O SIN CONTRASTE (TAC)"
      consentTypeCode="tac"
      consentDecision={consentDecision}
      patientData={{
        nombre: patientData.nombre,
        apellidos: patientData.apellidos,
        tipoDocumento: patientData.tipoDocumento,
        numeroDocumento: patientData.numeroDocumento,
        telefono: patientData.telefono,
        email: patientData.email,
        centroSalud: patientData.centroSalud,
      }}
      onGeneratePDF={generatePDF}
      onGetHTMLContent={getHTMLContent}
      onBack={onBack}
      professionalData={{ ...professionalData, signatureData: professionalSignature || undefined }}
      patientSignature={patientSignature}
      patientPhotoUrl={patientPhoto}
      getPatientSignature={() => patientSignatureRef.current?.getSignatureData() || null}
      getPatientPhoto={() => cameraCaptureRef.current?.getFingerprintData() || null}
      hasDisability={hasDisability}
      isMinor={isMinor}
      guardianSignature={guardianSignature}
      getGuardianSignature={() => guardianSignatureRef.current?.getSignatureData() || null}
      guardianName={guardianName}
      guardianDocument={guardianDocument}
      guardianRelationship={guardianRelationship}
      guardianPhone={guardianPhone}
      clinicalRiskNotes={clinicalRiskNotes}
    >
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
                  Consentimiento Informado - TAC con o sin Contraste
                </CardTitle>
                <p className="text-medical-gray text-sm mt-1">
                  Formato 36 - Complete todos los campos requeridos para generar el consentimiento
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
                Procedimiento de TAC con o sin Contraste
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div
                className="flex items-start space-x-3 p-3 rounded-lg border border-medical-blue/20 bg-medical-blue/5 cursor-pointer hover:bg-medical-blue/10 transition-colors"
                onClick={() => {
                  setIsProcedureInfoExpanded(!isProcedureInfoExpanded);
                }}
              >
                <Checkbox
                  id="procedimiento-tac"
                  checked={selectedProcedures.includes("tac")}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      handleProcedureChange("tac");
                      setIsProcedureInfoExpanded(true);
                    } else {
                      handleProcedureChange("tac");
                      setIsProcedureInfoExpanded(false);
                    }
                  }}
                  className="mt-1 data-[state=checked]:bg-medical-blue data-[state=checked]:border-medical-blue"
                />
                <div className="flex-1">
                  <Label
                    htmlFor="procedimiento-tac"
                    className="cursor-pointer text-medical-blue font-semibold text-base flex items-center gap-2"
                  >
                    TOMOGRAFIA AXIAL COMPUTARIZADA CON O SIN CONTRASTE (TAC)
                    {isProcedureInfoExpanded ? (
                      <ChevronUp className="h-4 w-4 text-medical-blue" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-medical-blue" />
                    )}
                  </Label>
                  <p className="text-sm text-medical-gray mt-1">
                    La Tomografía Axial Computarizada (TAC) es un método de diagnóstico por imágenes que utiliza radiación ionizante (rayos X) y procesamiento informático avanzado para obtener cortes transversales detallados de la anatomía.
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
                          La Tomografía Axial Computarizada (TAC) es un método de diagnóstico por imágenes que utiliza radiación ionizante (rayos X) y procesamiento informático avanzado para obtener cortes transversales detallados de la anatomía interna. Durante la exploración, el paciente debe permanecer en decúbito sobre la mesa del tomógrafo, la cual se desplazará gradualmente a través del gantry (gantry del escáner). Es imprescindible mantener la inmovilidad estricta y seguir las instrucciones verbales de apnea (suspensión momentánea de la respiración) para evitar artefactos por movimiento. La duración del procedimiento oscila entre 10 y 30 minutos. Administración de medios de contraste: Según la indicación clínica, puede requerirse la administración intravenosa de un medio de contraste iodado para la opacificación y delimitación de estructuras vasculares y parenquimatosas. En estudios abdominopélvicos, puede indicarse adicionalmente la administración oral de contraste hidrosoluble o sulfato de bario diluido para la opacificación y distensión del tracto digestivo
                        </p>
                        <div className="bg-blue-100 p-3 rounded">
                          <p className="text-sm font-medium text-blue-800">
                            <strong>Propósito:</strong> Visualización multiplanar de alta resolución para la evaluación, caracterización y seguimiento de hallazgos patológicos estructurales, vasculares o traumáticos.
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
                          1.Obtención de imágenes anatómicas tridimensionales de alta precisión en corto tiempo. 2.Capacidad de diferenciar densidades tisulares finas (hueso, partes blandas, fluidos, vascularización). 3.Guía fundamental para la toma de decisiones quirúrgicas o terapéuticas oportunas.
                        </p>
                      </div>

                      {/* Riesgos */}
                      <div className="border-l-4 border-red-500 bg-red-50 p-4 rounded-r-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <h5 className="font-semibold text-red-800">Riesgos y posibles complicaciones:</h5>
                        </div>
                        <p className="text-sm text-gray-700">
                          Son Riesgos: 1. Nefrotoxicidad inducida por contraste, si aplica: Deterioro de la función renal secundario a la excreción del medio de contraste iodado, especialmente en pacientes con insuficiencia renal previa, diabetes o deshidratación. 2. Reacciones adversas al medio de contraste. Reacciones de tipo idiosincrásico o alérgico que varían desde leves (eritema, urticaria, náuseas) hasta graves (broncoespasmo, edema laríngeo, choque anafiláctico). 3. Exposición a radiación ionizante acumulativa: Exposición a dosis de radiación superior a la de la radiografía convencional Son Complicaciones: 1. Extravasación de medio de contraste: Fuga del líquido al tejido subcutáneo adyacente al sitio de punción venosa, pudiendo ocasionar edema, dolor localizado, necrosis tisular o síndrome compartimental en casos severos. 2. Incapacidad de completar el estudio por claustrofobia o agitación 3. Aspiración bronquial o emesis. Emesis (vómito) inducida por la infusión rápida del contraste iodado o la ingesta del contraste oral, con riesgo de broncoaspiración en pacientes debilitados o sin el ayuno requerido.
                        </p>
                      </div>

                      {/* Alternativas */}
                      <div className="border-l-4 border-purple-500 bg-purple-50 p-4 rounded-r-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-purple-600">🔄</span>
                          <h5 className="font-semibold text-purple-800">Alternativas Razonables:</h5>
                        </div>
                        <p className="text-sm text-gray-700">
                          Resonancia Magnética (RM): Excelente resolución de tejidos blandos sin uso de radiación ionizante. Ecografía / Ultrasonido, método no invasivo e inocuo (sin radiación), limitado en evaluación ósea o por interposición de gas intestinal
                        </p>
                      </div>

                      {/* Implicaciones */}
                      <div className="border-l-4 border-orange-500 bg-orange-50 p-4 rounded-r-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-orange-600">🕐</span>
                          <h5 className="font-semibold text-orange-800">Implicaciones:</h5>
                        </div>
                        <p className="text-sm text-gray-700">
                          Soportar la rigidez o disconfort por inmovilidad prolongada en la mesa del escáner, sentir frío por la baja temperatura ambiental requerida para los componentes electrónicos del tomógrafo, y experimentar sensaciones de calor difuso o sabor metálico al ingresar el contraste
                        </p>
                      </div>

                      {/* Efectos Inevitables */}
                      <div className="border-l-4 border-yellow-500 bg-yellow-50 p-4 rounded-r-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-yellow-600">⚠️</span>
                          <h5 className="font-semibold text-yellow-800">Efectos Inevitables:</h5>
                        </div>
                        <p className="text-sm text-gray-700">
                          Sensación de rigidez, presión o disconfort postural derivado de la inmovilidad prolongada en decúbito sobre la mesa de exploración. Percepción de baja temperatura corporal debido a la climatización ambiental controlada, requerida para el funcionamiento y estabilidad de los componentes electrónicos del tomógrafo.
                        </p>
                      </div>

                      {/* Posibles Consecuencias */}
                      <div className="border-l-4 border-gray-500 bg-gray-50 p-4 rounded-r-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-gray-600">ℹ️</span>
                          <h5 className="font-semibold text-gray-800">Posibles consecuencias en caso que decida no aceptar el procedimiento:</h5>
                        </div>
                        <p className="text-sm text-gray-700">
                          1. Retraso o imprecisión en el diagnóstico de patologías agudas o crónicas. 2. Imposibilidad de planificar adecuadamente procedimientos quirúrgicos u oncológicos. 3. Riesgo de progresión de la enfermedad no detectada a estadios avanzados o de mayor morbimortalidad.
                        </p>
                      </div>

                      {/* Riesgos en función de la situación clínica */}
                      <div className="border-l-4 border-amber-500 bg-amber-50 p-4 rounded-r-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-amber-600">🏥</span>
                          <h5 className="font-semibold text-amber-800">Riesgos en función de la situación clínica del paciente:</h5>
                        </div>
                        <Textarea
                          value={clinicalRiskNotes}
                          onChange={(e) => setClinicalRiskNotes(e.target.value)}
                          placeholder="Escriba aquí los riesgos específicos según la situación clínica del paciente..."
                          className={`min-h-[60px] bg-white border-amber-300 focus:border-amber-500 text-sm ${!clinicalRiskNotes.trim() ? 'border-red-400' : ''}`}
                          required
                        />
                        {!clinicalRiskNotes.trim() && (
                          <p className="text-xs text-red-500 mt-1">* Este campo es obligatorio</p>
                        )}
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
                  id="consent-tac"
                  checked={agreedToConsent}
                  onCheckedChange={(checked) => setAgreedToConsent(!!checked)}
                  className="mt-1 w-4 h-4 text-medical-blue border-medical-blue/30 rounded data-[state=checked]:bg-medical-blue data-[state=checked]:border-medical-blue"
                />
                <Label htmlFor="consent-tac" className="cursor-pointer text-medical-gray text-sm leading-relaxed">
                  <strong>Declaro que:</strong> He sido informado(a) sobre el(los) procedimiento(s) seleccionado(s), sus riesgos, beneficios y alternativas.
                  He tomado una decisión informada y autorizo al equipo médico a proceder según mi elección.
                  En cumplimiento de la Ley 1581 de 2012 y el Decreto 1377 de 2013 sobre protección de datos personales,
                  <strong> AUTORIZO</strong> de manera libre, expresa e informada a la E.S.E. Hospital Pedro León Álvarez Díaz de La Mesa
                  para la recolección, almacenamiento, uso y tratamiento de mis datos personales y datos sensibles de salud,
                  los cuales serán utilizados para gestionar mi historia clínica, cumplir con obligaciones legales del sector salud,
                  realizar seguimiento a procedimientos médicos y enviar notificaciones relacionadas con mi atención.
                </Label>
              </div>
            </div>
            </div>
          </CardContent>
        </Card>

        {/* Sección de Acudiente */}
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
                      onSignatureChange={setPatientSignature}
                    />
                    <div className="mt-3 text-xs text-medical-gray space-y-1">
                      <div>• Use su dedo o stylus</div>
                      <div>• No levante su dedo o stylus</div>
                      <div>• Use "Limpiar" para reiniciar la firma</div>
                      <div>• Use "Guardar" para confirmar la firma</div>
                    </div>

                    {/* Huella Dactilar */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <FingerprintCapture
                        ref={cameraCaptureRef}
                        title="Foto de Huella Dactilar"
                        subtitle="Fotografíe la palma completa y seleccione el dedo para la firma"
                        required
                        onFingerprintChange={(data) => setPatientPhoto(data)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Si requiere acudiente, mostrar huella por separado */}
              {requiresGuardian && (
                <div>
                  <FingerprintCapture
                    ref={cameraCaptureRef}
                    title="Foto de Huella Dactilar"
                    subtitle="Fotografíe la palma completa y seleccione el dedo para la firma"
                    required
                    onFingerprintChange={(data) => setPatientPhoto(data)}
                  />
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
                      onNewProfessional={handleNewProfessional}
                      selectedDocument={professionalData.document}
                    />
                  </div>

                  {professionalData.name && professionalData.document && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <h4 className="font-medium text-blue-800 mb-2">Información del Profesional</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="font-medium text-blue-700">Nombre:</span>
                          <p className="text-blue-900">{professionalData.name}</p>
                        </div>
                        <div>
                          <span className="font-medium text-blue-700">Documento:</span>
                          <p className="text-blue-900">{professionalData.document}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="border rounded-lg p-4 bg-gray-50">
                    <SignaturePad
                      ref={professionalSignatureRef}
                      title="Firma del Profesional"
                      required
                      onSignatureChange={setProfessionalSignature}
                      isProfessional={true}
                      professionalName={professionalData.name}
                      professionalDocument={professionalData.document}
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
