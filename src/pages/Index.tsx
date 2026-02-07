import { useState } from "react";
import { PatientForm } from "@/components/PatientForm";
import { ConsentFormHIV } from "@/components/ConsentFormHIV";
import { ConsentFormFrotisVaginal } from "@/components/ConsentFormFrotisVaginal";
import { ConsentFormCargaGlucosa } from "@/components/ConsentFormCargaGlucosa";
import { ConsentFormVenopuncion } from "@/components/ConsentFormVenopuncion";
import { MainLayout } from "@/components/layout/MainLayout";
import { StepIndicator } from "@/components/consent/StepIndicator";
import { ConsentTypeCard } from "@/components/consent/ConsentTypeCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  FileCheck, 
  Search,
  TestTube, 
  Heart, 
  TestTube2, 
  Syringe,
  FlaskConical,
  ArrowLeft,
  User
} from "lucide-react";

interface PatientData {
  id: string;
  nombre: string;
  apellidos: string;
  tipoDocumento: string;
  numeroDocumento: string;
  fechaNacimiento: string;
  edad: number;
  sexo: string;
  eps: string;
  telefono: string;
  direccion: string;
  email?: string;
  centroSalud: string;
  hasDisability?: boolean;
}

const consentTypes = [
  { 
    id: 'hiv', 
    title: 'VIH', 
    code: '1200AD01-F03', 
    icon: TestTube,
    iconBgColor: 'bg-primary/10',
    iconColor: 'text-primary'
  },
  { 
    id: 'frotis_vaginal', 
    title: 'Frotis Vaginal', 
    code: '1200AD01-F01', 
    icon: Heart,
    iconBgColor: 'bg-pink-100',
    iconColor: 'text-pink-600'
  },
  { 
    id: 'carga_glucosa', 
    title: 'Carga Glucosa', 
    code: '1200AD01-F02', 
    icon: TestTube2,
    iconBgColor: 'bg-purple-100',
    iconColor: 'text-purple-600'
  },
  { 
    id: 'venopuncion', 
    title: 'Venopunción', 
    code: '1200AD01-F04', 
    icon: Syringe,
    iconBgColor: 'bg-orange-100',
    iconColor: 'text-orange-600'
  },
];

const steps = [
  { id: 'search', label: 'Búsqueda' },
  { id: 'select', label: 'Selección' },
  { id: 'consent', label: 'Firma' },
];

const Index = () => {
  const [currentStep, setCurrentStep] = useState<'search' | 'select' | 'consent'>('search');
  const [selectedPatient, setSelectedPatient] = useState<PatientData | null>(null);
  const [consentType, setConsentType] = useState<'hiv' | 'frotis_vaginal' | 'carga_glucosa' | 'venopuncion' | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  const handlePatientSelect = (patient: PatientData) => {
    setSelectedPatient(patient);
    setCurrentStep('select');
  };

  const handleConsentTypeSelect = (type: typeof consentType) => {
    setConsentType(type);
    setCurrentStep('consent');
  };

  const handleBackToSearch = () => {
    setCurrentStep('search');
    setSelectedPatient(null);
    setConsentType(null);
  };

  const handleBackToSelect = () => {
    setCurrentStep('select');
    setConsentType(null);
  };

  const filteredConsentTypes = consentTypes.filter(type => 
    type.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
    type.code?.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const renderConsentForm = () => {
    if (!selectedPatient || !consentType) return null;
    
    switch (consentType) {
      case 'hiv':
        return <ConsentFormHIV patientData={selectedPatient} onBack={handleBackToSelect} />;
      case 'frotis_vaginal':
        return <ConsentFormFrotisVaginal patientData={selectedPatient} onBack={handleBackToSelect} />;
      case 'carga_glucosa':
        return <ConsentFormCargaGlucosa patientData={selectedPatient} onBack={handleBackToSelect} />;
      case 'venopuncion':
        return <ConsentFormVenopuncion patientData={selectedPatient} onBack={handleBackToSelect} />;
      default:
        return null;
    }
  };

  const getCompletedSteps = () => {
    if (currentStep === 'consent') return ['search', 'select'];
    if (currentStep === 'select') return ['search'];
    return [];
  };

  return (
    <MainLayout>
      {/* Step Indicator */}
      <StepIndicator 
        steps={steps} 
        currentStep={currentStep}
        completedSteps={getCompletedSteps()}
      />

      {/* Main Content */}
      <div className="p-6">
        {/* Step 1: Patient Search */}
        {currentStep === 'search' && (
          <div className="max-w-4xl mx-auto">
            <PatientForm onPatientSelect={handlePatientSelect} />
          </div>
        )}

        {/* Step 2: Consent Type Selection */}
        {currentStep === 'select' && selectedPatient && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Patient Info Summary */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-foreground">
                        {selectedPatient.nombre} {selectedPatient.apellidos}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {selectedPatient.tipoDocumento} {selectedPatient.numeroDocumento} • {selectedPatient.edad} años
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleBackToSearch}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Cambiar paciente
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {/* Consent Type Selection */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-primary">
                      Seleccionar Tipo de Consentimiento
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Seleccione el tipo de consentimiento que desea generar para este paciente
                    </p>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar consentimiento por nombre o código..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Category Header */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FlaskConical className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">Laboratorio</p>
                    <p className="text-xs text-muted-foreground">{filteredConsentTypes.length} consentimientos</p>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    {filteredConsentTypes.length}
                  </span>
                </div>

                {/* Consent Types Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredConsentTypes.map((type) => (
                    <ConsentTypeCard
                      key={type.id}
                      icon={type.icon}
                      title={type.title}
                      code={type.code}
                      isActive={consentType === type.id}
                      onClick={() => handleConsentTypeSelect(type.id as typeof consentType)}
                      iconBgColor={type.iconBgColor}
                      iconColor={type.iconColor}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Consent Form */}
        {currentStep === 'consent' && selectedPatient && consentType && (
          <div className="max-w-7xl mx-auto">
            {renderConsentForm()}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-auto">
        <div className="px-6 py-4">
          <div className="text-center text-sm text-muted-foreground">
            <p>© 2025 Hospital La Mesa Pedro Leon Alvarez Diaz - Sistema de Consentimientos Informados</p>
            <p className="mt-1">Desarrollado con tecnología segura para la gestión hospitalaria</p>
          </div>
        </div>
      </footer>
    </MainLayout>
  );
};

export default Index;
