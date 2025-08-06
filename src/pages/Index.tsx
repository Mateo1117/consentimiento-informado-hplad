import { useState } from "react";
import { PatientForm } from "@/components/PatientForm";
import { ConsentForm } from "@/components/ConsentForm";
import { ConsentFormHIV } from "@/components/ConsentFormHIV";
import { ConsentFormHemocomponentes } from "@/components/ConsentFormHemocomponentes";
import { ConsentFormFrotisVaginal } from "@/components/ConsentFormFrotisVaginal";
import { ConsentFormCargaGlucosa } from "@/components/ConsentFormCargaGlucosa";
import { ConsentFormVenopuncion } from "@/components/ConsentFormVenopuncion";
import { AuthenticatedHeader } from "@/components/AuthenticatedHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileHeart, CheckCircle, Plus, Search, FileText, BarChart, TestTube, Microscope, Heart, Droplets, TestTube2, Syringe } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PatientData {
  id: string;
  nombre: string;
  apellidos: string;
  tipoDocumento: string;
  numeroDocumento: string;
  fechaNacimiento: string;
  edad: number;
  sexo: string; // Added missing property
  eps: string;
  telefono: string;
  direccion: string;
  centroSalud: string;
}

const Index = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<'search' | 'consent'>('search');
  const [selectedPatient, setSelectedPatient] = useState<PatientData | null>(null);
  const [consentType, setConsentType] = useState<'laboratorio' | 'hiv' | 'frotis_vaginal' | 'hemocomponentes' | 'carga_glucosa' | 'venopuncion'>('laboratorio');

  const handlePatientSelect = (patient: PatientData) => {
    setSelectedPatient(patient);
    setCurrentStep('consent');
  };

  const handleBack = () => {
    setCurrentStep('search');
    setSelectedPatient(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-medical-blue-light/20 to-background">
      {/* Header */}
      <AuthenticatedHeader />

      {/* Progress indicator */}
      <div className="bg-white border-b border-medical-blue/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center space-x-8">
            <div className={`flex items-center gap-2 ${currentStep === 'search' ? 'text-medical-blue' : 'text-medical-green'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'search' ? 'bg-medical-blue text-white' : 'bg-medical-green text-white'}`}>
                {currentStep === 'consent' ? <CheckCircle className="h-4 w-4" /> : '1'}
              </div>
              <span className="font-medium">Búsqueda de Paciente</span>
            </div>
            
            <div className={`w-16 h-1 rounded ${currentStep === 'consent' ? 'bg-medical-green' : 'bg-gray-300'}`}></div>
            
            <div className={`flex items-center gap-2 ${currentStep === 'consent' ? 'text-medical-blue' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'consent' ? 'bg-medical-blue text-white' : 'bg-gray-300 text-gray-500'}`}>
                2
              </div>
              <span className="font-medium">Consentimiento y Firma</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        {currentStep === 'search' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Welcome card */}
            <Card className="border-medical-blue/20 bg-gradient-to-r from-white to-medical-blue-light/30">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-medical-blue/10 rounded-full flex items-center justify-center">
                    <FileHeart className="h-6 w-6 text-medical-blue" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-medical-blue">Consentimiento Informado Digital</h2>
                    <p className="text-medical-gray">
                      Sistema seguro para la gestión de consentimientos informados para procedimientos de laboratorio
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <PatientForm onPatientSelect={handlePatientSelect} />
          </div>
        )}

        {currentStep === 'consent' && selectedPatient && (
          <div className="max-w-7xl mx-auto">
            <Tabs value={consentType} onValueChange={(value) => setConsentType(value as 'laboratorio' | 'hiv' | 'frotis_vaginal' | 'hemocomponentes' | 'carga_glucosa' | 'venopuncion')} className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="laboratorio" className="flex items-center gap-2">
                  <Microscope className="h-4 w-4" />
                  Laboratorio
                </TabsTrigger>
                <TabsTrigger value="hiv" className="flex items-center gap-2">
                  <TestTube className="h-4 w-4" />
                  VIH
                </TabsTrigger>
                <TabsTrigger value="frotis_vaginal" className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Frotis Vaginal
                </TabsTrigger>
                <TabsTrigger value="hemocomponentes" className="flex items-center gap-2">
                  <Droplets className="h-4 w-4" />
                  Hemocomponentes
                </TabsTrigger>
                <TabsTrigger value="carga_glucosa" className="flex items-center gap-2">
                  <TestTube2 className="h-4 w-4" />
                  Carga Glucosa
                </TabsTrigger>
                <TabsTrigger value="venopuncion" className="flex items-center gap-2">
                  <Syringe className="h-4 w-4" />
                  Venopunción
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="laboratorio" className="mt-6">
                <ConsentForm 
                  patientData={selectedPatient} 
                  onBack={handleBack}
                />
              </TabsContent>
              
              <TabsContent value="hiv" className="mt-6">
                <ConsentFormHIV 
                  patientData={selectedPatient} 
                  onBack={handleBack}
                />
              </TabsContent>
              
              <TabsContent value="frotis_vaginal" className="mt-6">
                <ConsentFormFrotisVaginal 
                  patientData={selectedPatient}
                  onBack={handleBack}
                />
              </TabsContent>
              
              <TabsContent value="hemocomponentes" className="mt-6">
                <ConsentFormHemocomponentes 
                  patientData={selectedPatient} 
                  onBack={handleBack}
                />
              </TabsContent>
              
              <TabsContent value="carga_glucosa" className="mt-6">
                <ConsentFormCargaGlucosa 
                  patientData={selectedPatient} 
                  onBack={handleBack}
                />
              </TabsContent>
              
              <TabsContent value="venopuncion" className="mt-6">
                <ConsentFormVenopuncion 
                  patientData={selectedPatient} 
                  onBack={handleBack}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-medical-blue/5 border-t border-medical-blue/20 mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-medical-gray">
            <p>© 2025 Hospital La Mesa Pedro Leon Alvarez Diaz - Sistema de Consentimientos Informados</p>
            <p className="mt-1">Desarrollado con tecnología segura para la gestión hospitalaria</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
