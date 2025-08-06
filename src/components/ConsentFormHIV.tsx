import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Download, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { SignaturePad } from './SignaturePad';
import { CameraCapture } from './CameraCapture';
import { generateHIVPDF } from '@/utils/pdfGeneratorHIV';

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

interface ConsentFormHIVProps {
  patientData: PatientData;
  onBack: () => void;
}

export const ConsentFormHIV: React.FC<ConsentFormHIVProps> = ({ patientData, onBack }) => {
  const [formData, setFormData] = useState({
    nombreAcudiente: '',
    documentoAcudiente: '',
    telefonoAcudiente: '',
    vinculoAcudiente: '',
    actuandoEnNombre: 'propio',
    fecha: new Date().toISOString().split('T')[0],
    hora: new Date().toLocaleTimeString('es-ES', { hour12: false }).slice(0, 5)
  });

  const [patientSignature, setPatientSignature] = useState<string | null>(null);
  const [professionalSignature, setProfessionalSignature] = useState<string | null>(null);
  const [patientPhoto, setPatientPhoto] = useState<string | null>(null);
  const [consentDecision, setConsentDecision] = useState<'aprobar' | 'disentir'>('aprobar');
  const [professionalData, setProfessionalData] = useState({
    name: '',
    document: ''
  });

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const generatePDF = () => {
    if (!professionalData.name || !professionalData.document) {
      toast.error('Por favor complete los datos del profesional');
      return;
    }

    try {
      const pdfData = {
        patientData,
        guardianData: formData.nombreAcudiente ? {
          name: formData.nombreAcudiente,
          document: formData.documentoAcudiente,
          relationship: formData.vinculoAcudiente,
          phone: formData.telefonoAcudiente
        } : null,
        professionalName: professionalData.name,
        professionalDocument: professionalData.document,
        patientSignature,
        professionalSignature,
        patientPhoto,
        consentDecision,
        date: formData.fecha,
        time: formData.hora
      };

      const pdf = generateHIVPDF(pdfData);
      const fileName = `Consentimiento_VIH_${patientData.nombre}_${patientData.apellidos}_${formData.fecha}.pdf`;
      pdf.save(fileName);
      
      toast.success('PDF de consentimiento para VIH generado exitosamente');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error al generar el PDF');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card className="border-red-200">
        <CardHeader className="bg-red-50 border-b border-red-200">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={onBack} className="text-red-600 hover:text-red-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <CardTitle className="text-center text-red-800 flex-1">
              <div className="flex items-center justify-center mb-2">
                <AlertTriangle className="w-6 h-6 mr-2 text-red-600" />
                FORMATO 39 - CONSENTIMIENTO INFORMADO
              </div>
              <div className="text-lg font-semibold">PARA PRUEBA PRESUNTIVA DE VIH</div>
            </CardTitle>
            <div className="w-20"></div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>IMPORTANTE:</strong> Esta es una prueba presuntiva para VIH. Un resultado reactivo no confirma 
              infección y debe ser interpretado por un médico.
            </AlertDescription>
          </Alert>

          {/* Datos del Paciente - Solo mostrar */}
          <Card className="mb-6 border-red-200">
            <CardHeader>
              <CardTitle className="text-lg text-red-700">Datos del Paciente</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label>Nombre Completo</Label>
                <Input value={`${patientData.nombre} ${patientData.apellidos}`} readOnly className="bg-gray-50" />
              </div>
              <div>
                <Label>Documento</Label>
                <Input value={patientData.numeroDocumento} readOnly className="bg-gray-50" />
              </div>
              <div>
                <Label>EPS</Label>
                <Input value={patientData.eps} readOnly className="bg-gray-50" />
              </div>
            </CardContent>
          </Card>

          {/* Datos del Profesional */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg text-red-700">Datos del Profesional</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="professionalName">Nombre del Profesional *</Label>
                <Input
                  id="professionalName"
                  value={professionalData.name}
                  onChange={(e) => setProfessionalData(prev => ({ ...prev, name: e.target.value }))}
                  className="border-red-200 focus:border-red-500"
                  required
                />
              </div>
              <div>
                <Label htmlFor="professionalDocument">Documento del Profesional *</Label>
                <Input
                  id="professionalDocument"
                  value={professionalData.document}
                  onChange={(e) => setProfessionalData(prev => ({ ...prev, document: e.target.value }))}
                  className="border-red-200 focus:border-red-500"
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Firmas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-red-700">Firma del Paciente/Acudiente</CardTitle>
              </CardHeader>
              <CardContent>
                <SignaturePad title="Firma del Paciente/Acudiente" onSignatureChange={setPatientSignature} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-red-700">Firma del Profesional</CardTitle>
              </CardHeader>
              <CardContent>
                <SignaturePad title="Firma del Profesional" onSignatureChange={setProfessionalSignature} />
              </CardContent>
            </Card>
          </div>

          {/* Botón Generar PDF */}
          <div className="text-center">
            <Button onClick={generatePDF} className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 text-lg" size="lg">
              <Download className="w-5 h-5 mr-2" />
              Generar PDF - Consentimiento VIH
            </Button>
            <p className="text-sm text-red-600 mt-2 font-medium">
              ⚠️ Documento confidencial - Manejo reservado
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};