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
import { Input } from "@/components/ui/input";
import { 
  FileCheck, 
  Search,
  TestTube, 
  Heart, 
  TestTube2, 
  Syringe,
  FlaskConical
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
  { id: 'consent', label: 'Firma' },
];

const Index = () => {
  const [currentStep, setCurrentStep] = useState<'search' | 'consent'>('search');
  const [selectedPatient, setSelectedPatient] = useState<PatientData | null>(null);
  const [consentType, setConsentType] = useState<'hiv' | 'frotis_vaginal' | 'carga_glucosa' | 'venopuncion'>('hiv');
  const [searchFilter, setSearchFilter] = useState('');

  const handlePatientSelect = (patient: PatientData) => {
    setSelectedPatient(patient);
    setCurrentStep('consent');
  };

  const handleBack = () => {
    setCurrentStep('search');
    setSelectedPatient(null);
  };

  const filteredConsentTypes = consentTypes.filter(type => 
    type.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
    type.code?.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const renderConsentForm = () => {
    switch (consentType) {
      case 'hiv':
        return <ConsentFormHIV patientData={selectedPatient!} onBack={handleBack} />;
      case 'frotis_vaginal':
        return <ConsentFormFrotisVaginal patientData={selectedPatient!} onBack={handleBack} />;
      case 'carga_glucosa':
        return <ConsentFormCargaGlucosa patientData={selectedPatient!} onBack={handleBack} />;
      case 'venopuncion':
        return <ConsentFormVenopuncion patientData={selectedPatient!} onBack={handleBack} />;
      default:
        return null;
    }
  };

  return (
    <MainLayout>
      {/* Step Indicator */}
      <StepIndicator 
        steps={steps} 
        currentStep={currentStep}
        completedSteps={currentStep === 'consent' ? ['search'] : []}
      />

      {/* Main Content */}
      <div className="p-6">
        {currentStep === 'search' && (
          <div className="max-w-6xl mx-auto space-y-6">
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
                      Seleccione el área y el tipo de consentimiento que desea generar
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {filteredConsentTypes.map((type) => (
                    <ConsentTypeCard
                      key={type.id}
                      icon={type.icon}
                      title={type.title}
                      code={type.code}
                      isActive={consentType === type.id}
                      onClick={() => setConsentType(type.id as typeof consentType)}
                      iconBgColor={type.iconBgColor}
                      iconColor={type.iconColor}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Patient Search Form */}
            <PatientForm onPatientSelect={handlePatientSelect} />
          </div>
        )}

        {currentStep === 'consent' && selectedPatient && (
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
