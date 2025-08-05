import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { FileText, Download, User, Stethoscope, Calendar } from "lucide-react";
import { toast } from "sonner";
import { PatientForm } from "./PatientForm";
import { CameraCapture } from "./CameraCapture";
import { SignaturePad, SignatureRef } from "./SignaturePad";
import { ProfessionalSelector } from "./ProfessionalSelector";
import { PatientData, patientApiService } from "@/services/patientApi";
import { generateFrotisVaginalPDF } from "@/utils/pdfGeneratorFrotisVaginal";

interface ProfessionalData {
  name: string;
  document: string;
  signatureData: string;
}

export const ConsentFormFrotisVaginal = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [professionalData, setProfessionalData] = useState<ProfessionalData>({
    name: "",
    document: "",
    signatureData: ""
  });
  const [photoData, setPhotoData] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [documentNumber, setDocumentNumber] = useState("");
  const signatureRef = useRef<SignatureRef>(null);

  const handlePatientSearch = async () => {
    if (!documentNumber.trim()) {
      toast.error("Por favor ingrese un número de documento");
      return;
    }

    try {
      const patient = await patientApiService.searchByDocument(documentNumber.trim());
      if (patient) {
        setPatientData(patient);
        setCurrentStep(2);
        toast.success("Paciente encontrado exitosamente");
      } else {
        toast.error("No se encontró un paciente con ese documento");
      }
    } catch (error) {
      toast.error("Error al buscar el paciente. Verifique la conexión.");
      console.error("Error:", error);
    }
  };

  const handleProfessionalSelect = (professional: { name: string; document: string; signatureData: string }) => {
    setProfessionalData(professional);
  };

  const handleNewProfessional = () => {
    setProfessionalData({
      name: "",
      document: "",
      signatureData: ""
    });
  };

  const generatePDF = async () => {
    if (!patientData) {
      toast.error("No hay datos del paciente");
      return;
    }

    if (!professionalData.name || !professionalData.document) {
      toast.error("Por favor complete los datos del profesional");
      return;
    }

    if (!professionalData.signatureData) {
      toast.error("Por favor añada la firma del profesional");
      return;
    }

    setIsGenerating(true);

    try {
      const currentDate = new Date();
      const date = currentDate.toLocaleDateString('es-CO');
      const time = currentDate.toLocaleTimeString('es-CO');

      const pdfData = {
        patientData,
        professionalName: professionalData.name,
        professionalDocument: professionalData.document,
        signatureData: professionalData.signatureData,
        date,
        time
      };

      const pdf = generateFrotisVaginalPDF(pdfData);
      
      // Download PDF directly
      const fileName = `consentimiento_frotis_vaginal_${patientData.numeroDocumento}_${Date.now()}.pdf`;

      // Download PDF
      pdf.save(fileName);

      toast.success("PDF generado y guardado exitosamente");
      
      // Reset form
      setCurrentStep(1);
      setPatientData(null);
      setProfessionalData({ name: "", document: "", signatureData: "" });
      setPhotoData("");
      setDocumentNumber("");

    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Error al generar el PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-medical-blue/10 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-medical-blue" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-medical-blue">Consulta de Paciente</h2>
                <p className="text-medical-gray mt-2">
                  Ingrese el número de documento para buscar los datos del paciente
                </p>
              </div>
            </div>

            <div className="max-w-md mx-auto space-y-4">
              <div className="space-y-2">
                <Label htmlFor="documentNumber" className="medical-field-label">
                  Número de Documento
                </Label>
                <Input
                  id="documentNumber"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="Ej: 12345678"
                  className="medical-input text-center text-lg"
                  onKeyPress={(e) => e.key === 'Enter' && handlePatientSearch()}
                />
              </div>
              
              <Button 
                onClick={handlePatientSearch}
                className="w-full medical-button-primary py-3"
                size="lg"
              >
                <User className="h-5 w-5 mr-2" />
                Buscar Paciente
              </Button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-medical-green/10 rounded-full flex items-center justify-center">
                <FileText className="h-8 w-8 text-medical-green" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-medical-blue">Datos del Paciente</h2>
                <p className="text-medical-gray mt-2">
                  Verifique que los datos del paciente sean correctos
                </p>
              </div>
            </div>

            {patientData && (
              <div className="bg-medical-blue-light/30 p-6 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="medical-field-label">Nombre Completo:</span>
                    <p className="font-semibold">{`${patientData.nombre} ${patientData.apellidos}`}</p>
                  </div>
                  <div>
                    <span className="medical-field-label">Documento:</span>
                    <p className="font-semibold">{`${patientData.tipoDocumento} ${patientData.numeroDocumento}`}</p>
                  </div>
                  <div>
                    <span className="medical-field-label">Edad:</span>
                    <p className="font-semibold">{patientData.edad} años</p>
                  </div>
                  <div>
                    <span className="medical-field-label">EPS:</span>
                    <p className="font-semibold">{patientData.eps}</p>
                  </div>
                  <div>
                    <span className="medical-field-label">Teléfono:</span>
                    <p className="font-semibold">{patientData.telefono}</p>
                  </div>
                  <div>
                    <span className="medical-field-label">Centro de Salud:</span>
                    <p className="font-semibold">{patientData.centroSalud}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <Button 
                variant="outline" 
                onClick={() => setCurrentStep(1)}
                className="flex-1 medical-button-outline"
              >
                Buscar Otro Paciente
              </Button>
              <Button 
                onClick={() => setCurrentStep(3)}
                className="flex-1 medical-button-primary"
              >
                Continuar
              </Button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-medical-green/10 rounded-full flex items-center justify-center">
                <Stethoscope className="h-8 w-8 text-medical-green" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-medical-blue">Datos del Profesional</h2>
                <p className="text-medical-gray mt-2">
                  Seleccione o registre los datos del profesional que realizará el procedimiento
                </p>
              </div>
            </div>

            <ProfessionalSelector
              onProfessionalSelect={handleProfessionalSelect}
              onNewProfessional={handleNewProfessional}
              selectedDocument={professionalData.document}
            />

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="medical-field-label">Nombre del Profesional</Label>
                <Input
                  value={professionalData.name}
                  onChange={(e) => setProfessionalData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nombre completo del profesional"
                  className="medical-input"
                />
              </div>

              <div className="space-y-2">
                <Label className="medical-field-label">Número de Documento</Label>
                <Input
                  value={professionalData.document}
                  onChange={(e) => setProfessionalData(prev => ({ ...prev, document: e.target.value }))}
                  placeholder="Cédula del profesional"
                  className="medical-input"
                />
              </div>

              <div className="space-y-2">
                <Label className="medical-field-label">Firma del Profesional</Label>
                <SignaturePad
                  ref={signatureRef}
                  title="Firma del Profesional"
                  subtitle="Firma del profesional que autoriza el procedimiento"
                  required={true}
                  isProfessional={true}
                  professionalDocument={professionalData.document}
                  professionalName={professionalData.name}
                />
                <Button
                  type="button"
                  onClick={() => {
                    const signature = signatureRef.current?.getSignatureData();
                    if (signature) {
                      setProfessionalData(prev => ({ ...prev, signatureData: signature }));
                      toast.success("Firma capturada");
                    } else {
                      toast.error("Por favor dibuje su firma");
                    }
                  }}
                  className="medical-button-outline"
                  size="sm"
                >
                  Capturar Firma
                </Button>
              </div>
            </div>

            <div className="flex gap-4">
              <Button 
                variant="outline" 
                onClick={() => setCurrentStep(2)}
                className="flex-1 medical-button-outline"
              >
                Anterior
              </Button>
              <Button 
                onClick={() => setCurrentStep(4)}
                className="flex-1 medical-button-primary"
                disabled={!professionalData.name || !professionalData.document || !professionalData.signatureData}
              >
                Continuar
              </Button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-medical-accent/10 rounded-full flex items-center justify-center">
                <Download className="h-8 w-8 text-medical-accent" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-medical-blue">Generar Consentimiento</h2>
                <p className="text-medical-gray mt-2">
                  Revise los datos y genere el consentimiento informado para Toma de Muestras Frotis Vaginal - Cultivo Recto-Vaginal
                </p>
              </div>
            </div>

            <div className="bg-medical-blue-light/30 p-6 rounded-lg space-y-4">
              <h3 className="font-semibold text-medical-blue">Resumen del Consentimiento:</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="medical-field-label">Paciente:</span>
                  <p>{patientData?.nombre} {patientData?.apellidos}</p>
                </div>
                <div>
                  <span className="medical-field-label">Documento:</span>
                  <p>{patientData?.numeroDocumento}</p>
                </div>
                <div>
                  <span className="medical-field-label">Profesional:</span>
                  <p>{professionalData.name}</p>
                </div>
                <div>
                  <span className="medical-field-label">Procedimiento:</span>
                  <p>Toma de Muestras Frotis Vaginal - Cultivo Recto-Vaginal</p>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button 
                variant="outline" 
                onClick={() => setCurrentStep(3)}
                className="flex-1 medical-button-outline"
              >
                Anterior
              </Button>
              <Button 
                onClick={generatePDF}
                disabled={isGenerating}
                className="flex-1 medical-button-primary"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Generar PDF
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-medical-blue-light/20 to-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 border border-medical-blue/20">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="w-12 h-12 bg-medical-blue rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-medical-blue">E.S.E. HOSPITAL LA MESA</h1>
                <p className="text-medical-gray">Consentimiento Informado - Toma de Muestras Frotis Vaginal</p>
              </div>
            </div>
            
            {/* Progress indicator */}
            <div className="flex items-center justify-center space-x-2 mt-4">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step <= currentStep 
                      ? 'bg-medical-blue text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {step}
                  </div>
                  {step < 4 && (
                    <div className={`w-12 h-1 mx-2 ${
                      step < currentStep ? 'bg-medical-blue' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main content */}
        <Card className="border-medical-blue/20 shadow-lg">
          <CardContent className="p-8">
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-medical-gray">
          <p>© 2025 E.S.E. Hospital La Mesa - Sistema de Consentimientos Informados</p>
          <p className="mt-1">Desarrollado con tecnología segura para la gestión hospitalaria</p>
        </div>
      </div>
    </div>
  );
};