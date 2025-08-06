import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Download, ArrowLeft, TestTube, Camera } from 'lucide-react';
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
  sexo: string;
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onBack} className="text-blue-600 hover:text-blue-700">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a búsqueda
          </Button>
        </div>
        <div className="flex items-center gap-2 text-lg font-semibold text-red-800">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          Consentimiento Informado - Prueba Presuntiva de VIH
        </div>
      </div>

      <div className="text-sm text-gray-600 mb-4">
        Formato 39 - Complete todos los campos requeridos para generar el consentimiento
      </div>

      {/* Información del Paciente */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-xs text-blue-600">ℹ</span>
          </div>
          <h3 className="text-lg font-semibold text-blue-700">Información del Paciente</h3>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Nombre:</span>
              <div className="text-blue-800 font-medium">{`${patientData.nombre} ${patientData.apellidos}`}</div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Documento:</span>
              <div className="text-blue-800 font-medium">{`${patientData.tipoDocumento} ${patientData.numeroDocumento}`}</div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Edad:</span>
              <div className="text-blue-800 font-medium">{patientData.edad} años</div>
            </div>
            <div>
              <span className="font-medium text-gray-700">EPS:</span>
              <div className="text-blue-800 font-medium">{patientData.eps || 'PARTICULAR'}</div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Teléfono:</span>
              <div className="text-blue-800 font-medium">{patientData.telefono || '3124569013'}</div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Centro:</span>
              <div className="text-blue-800 font-medium">Hospital Pedro León Álvarez Díaz de la Mesa</div>
            </div>
          </div>
        </div>
      </div>

      {/* Datos del Procedimiento */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
            <TestTube className="w-3 h-3 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-red-700">Datos del Procedimiento</h3>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg overflow-hidden">
          <div className="bg-red-600 text-white p-3 text-center font-bold">
            DATOS DEL PROCEDIMIENTO
          </div>
          
          {/* Tabla de datos del procedimiento */}
          <div className="divide-y divide-red-200">
            <div className="grid grid-cols-1 md:grid-cols-4">
              <div className="bg-red-100 p-3 font-bold text-red-800 border-r border-red-200">
                PROCEDIMIENTO
              </div>
              <div className="md:col-span-3 p-3 bg-white text-center font-bold">
                PRUEBA PRESUNTIVA DE VIH
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4">
              <div className="bg-red-100 p-3 font-bold text-red-800 border-r border-red-200">
                DESCRIPCIÓN DEL PROCEDIMIENTO
              </div>
              <div className="md:col-span-3 p-3 bg-white text-sm">
                Por medio de una muestra de sangre, se procesa y se identifica o descarta la presencia activa del virus de la inmunodeficiencia Humana (VIH), el cual puede infectar y destruir las células del sistema de defensa del cuerpo (Sistema inmune), originando una falla progresiva y grave en las defensas del organismo, el cual queda expuesto a infecciones y ciertos tipos de tumores. La prueba inicial, es una prueba presuntiva, y debe ser interpretada por un médico. Ya que, el hecho de salir reactiva no implica que usted esté infectado por el virus. Lo que es muy importante, es consultar con un médico.
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4">
              <div className="bg-red-100 p-3 font-bold text-red-800 border-r border-red-200">
                PROPÓSITO
              </div>
              <div className="md:col-span-3 p-3 bg-white text-sm">
                Detectar a tiempo la infección por VIH para recibir tratamiento oportuno.
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4">
              <div className="bg-red-100 p-3 font-bold text-red-800 border-r border-red-200">
                BENEFICIOS ESPERADOS
              </div>
              <div className="md:col-span-3 p-3 bg-white text-sm">
                Detección oportuna del VIH.
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4">
              <div className="bg-red-100 p-3 font-bold text-red-800 border-r border-red-200">
                RIESGOS
              </div>
              <div className="md:col-span-3 p-3 bg-white text-sm">
                1. Sangrado excesivo, 2. Desmayo o sensación de mareo, 3. Hematoma (acumulación de sangre debajo de la piel, que se pone de color morado a negro), 4. Infección de la piel, 5. Necesidad de hacer punciones múltiples para localizar las venas, 6. Punción traumática, 7. Trauma posterior a la entrega del resultado por error de interpretación de los resultados o por no consultar con un médico.
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4">
              <div className="bg-red-100 p-3 font-bold text-red-800 border-r border-red-200">
                IMPLICACIONES
              </div>
              <div className="md:col-span-3 p-3 bg-white text-sm">
                A algunas personas cuando se les informa que tiene anticuerpos contra VIH (resultado reactivo) pueden llegar a presentar fuertes reacciones emocionales, incluyendo ansiedad y depresión. También puede ser objeto de discriminación o rechazo por otras personas e instituciones.
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4">
              <div className="bg-red-100 p-3 font-bold text-red-800 border-r border-red-200">
                EFECTOS INEVITABLES
              </div>
              <div className="md:col-span-3 p-3 bg-white text-sm">
                1. Dolor en el sitio de punción para toma de muestra, 2. Molestia por presión ejercida con el torniquete, 3. Impresión fuerte al observar la sangre en el tubo contenedor.
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4">
              <div className="bg-red-100 p-3 font-bold text-red-800 border-r border-red-200">
                ALTERNATIVAS RAZONABLES A ESTE PROCEDIMIENTO
              </div>
              <div className="md:col-span-3 p-3 bg-white text-sm">
                Ninguna.
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4">
              <div className="bg-red-100 p-3 font-bold text-red-800 border-r border-red-200">
                POSIBLES CONSECUENCIAS EN CASO QUE DECIDA NO ACEPTAR EL PROCEDIMIENTO
              </div>
              <div className="md:col-span-3 p-3 bg-white text-sm">
                Impedimento para que el personal médico pueda realizar un diagnóstico y generar un plan de tratamiento.
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4">
              <div className="bg-red-100 p-3 font-bold text-red-800 border-r border-red-200">
                RIESGOS EN FUNCIÓN DE LA SITUACIÓN CLÍNICA DEL PACIENTE
              </div>
              <div className="md:col-span-3 p-3 bg-white text-sm text-gray-500">
                [Campo a completar según situación específica del paciente]
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decisión sobre el Consentimiento */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-xs text-blue-600">⚪</span>
          </div>
          <h3 className="text-lg font-semibold text-blue-700">Decisión sobre el Consentimiento</h3>
          <span className="text-red-500 text-lg">*</span>
        </div>
        
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
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <input type="checkbox" className="mt-1 w-4 h-4 text-blue-600 border-blue-300 rounded" defaultChecked />
              <span className="text-gray-700 text-sm leading-relaxed">
                <strong>Declaro que:</strong> He sido informado(a) sobre el(los) procedimiento(s) seleccionado(s), sus riesgos, beneficios y alternativas. He tomado una decisión informada y autorizo al equipo médico a proceder según mi elección.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Firma del Profesional */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-xs text-blue-600">✋</span>
          </div>
          <h3 className="text-lg font-semibold text-blue-700">Firma del Profesional</h3>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="mb-4">
            <Label className="text-sm font-medium text-gray-700">Profesional Registrado</Label>
            <div className="text-blue-600 text-sm">Seleccione un profesional registrado</div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="professionalName" className="text-sm font-medium text-gray-700">Nombre del Profesional *</Label>
              <Input
                id="professionalName"
                value={professionalData.name}
                onChange={(e) => setProfessionalData(prev => ({ ...prev, name: e.target.value }))}
                className="border-blue-200 focus:border-blue-500"
                placeholder="Nombre completo del profesional"
                required
              />
            </div>
            <div>
              <Label htmlFor="professionalDocument" className="text-sm font-medium text-gray-700">Documento del Profesional *</Label>
              <Input
                id="professionalDocument"
                value={professionalData.document}
                onChange={(e) => setProfessionalData(prev => ({ ...prev, document: e.target.value }))}
                className="border-blue-200 focus:border-blue-500"
                placeholder="Número de documento"
                required
              />
            </div>
          </div>
        </div>
      </div>

      {/* Firmas Digitales */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-xs text-blue-600">✍</span>
          </div>
          <h3 className="text-lg font-semibold text-blue-700">Firmas Digitales</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Firma del Paciente */}
          <Card className="border-blue-200">
            <CardHeader className="bg-blue-50 border-b border-blue-200 py-3">
              <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
                <span className="text-blue-600">👤</span>
                Firma del Paciente
                <span className="text-red-500">*</span>
              </CardTitle>
              <p className="text-xs text-gray-600">Área de firma digital - Use su dedo o stylus para firmar</p>
            </CardHeader>
            <CardContent className="p-4">
              <SignaturePad 
                title="Firma del Paciente" 
                onSignatureChange={setPatientSignature}
              />
              <div className="mt-3 text-xs text-gray-500 space-y-1">
                <div>• Use su dedo o stylus</div>
                <div>• No levante su dedo o stylus</div>
                <div>• Use "Limpiar" para reiniciar la firma</div>
                <div>• Use "Guardar" para confirmar la firma</div>
              </div>
            </CardContent>
          </Card>

          {/* Firma del Profesional */}
          <Card className="border-blue-200">
            <CardHeader className="bg-blue-50 border-b border-blue-200 py-3">
              <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
                <span className="text-blue-600">🩺</span>
                Firma del Profesional
                <span className="text-red-500">*</span>
              </CardTitle>
              <p className="text-xs text-gray-600">Área de firma digital - Use su dedo o stylus para firmar</p>
            </CardHeader>
            <CardContent className="p-4">
              <SignaturePad 
                title="Firma del Profesional" 
                onSignatureChange={setProfessionalSignature}
              />
              <div className="mt-3 text-xs text-gray-500 space-y-1">
                <div>• Use su dedo o stylus</div>
                <div>• No levante su dedo o stylus</div>
                <div>• Mantenga velocidad constante para firma</div>
                <div>• Use "Limpiar" para reiniciar la firma</div>
                <div>• Use "Guardar Firma" para almacenar la firma automáticamente</div>
                <div>• Use "Cargar Firma" para usar una firma previamente guardada</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Foto del Paciente */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-xs text-blue-600">📷</span>
          </div>
          <h3 className="text-lg font-semibold text-blue-700">Foto del Paciente</h3>
        </div>
        
        <Card className="border-blue-200">
          <CardHeader className="bg-blue-50 border-b border-blue-200 py-3">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
              <span className="text-blue-600">📸</span>
              Foto del Paciente
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                  <span className="text-2xl text-gray-400">📷</span>
                </div>
                <p className="text-gray-500 mb-4">Cámara no activada</p>
                <Button variant="outline" className="mb-4">
                  <Camera className="w-4 h-4 mr-2" />
                  Activar Cámara
                </Button>
                <p className="text-xs text-gray-400">
                  La foto se tomará automáticamente al registrar la firma
                </p>
              </div>
            </div>
            <div className="mt-4 text-center">
              <Button variant="outline" size="sm">
                Capturar Foto
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Botones de Acción */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <Button variant="outline" onClick={onBack}>
          Volver
        </Button>
        <Button 
          onClick={generatePDF}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6"
          size="lg"
        >
          <Download className="w-4 h-4 mr-2" />
          Guardar Consentimiento
        </Button>
      </div>
    </div>
  );
};