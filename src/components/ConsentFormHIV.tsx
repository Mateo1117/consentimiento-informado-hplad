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

      {/* Procedimientos para Prueba Presuntiva de VIH */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
            <TestTube className="w-4 h-4 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-blue-700">Procedimientos para Prueba Presuntiva de VIH</h3>
        </div>
        
        <div className="space-y-4">
          {/* Título del procedimiento */}
          <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-white text-xs">✓</span>
            </div>
            <div>
              <h4 className="font-semibold text-blue-800">Prueba Presuntiva de VIH (Virus de Inmunodeficiencia Humana)</h4>
              <p className="text-sm text-gray-600 mt-1">
                Consiste en tomar una muestra de sangre para identificar o descartar la presencia activa del virus de la inmunodeficiencia humana (VIH).
              </p>
            </div>
          </div>

          {/* Descripción Completa */}
          <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded-r-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-blue-600">📋</span>
              <h5 className="font-semibold text-blue-800">Descripción Completa:</h5>
            </div>
            <p className="text-sm text-gray-700 mb-3">
              Por medio de una muestra de sangre, se procesa y se identifica o descarta la presencia activa del virus de la inmunodeficiencia Humana (VIH), 
              el cual puede infectar y destruir las células del sistema de defensa del cuerpo (Sistema inmune), originando una falla progresiva y grave 
              en las defensas del organismo, el cual queda expuesto a infecciones y ciertos tipos de tumores. La prueba inicial, es una prueba presuntiva, 
              y debe ser interpretada por un médico. Ya que, el hecho de salir reactiva no implica que usted esté infectado por el virus.
            </p>
            <div className="bg-blue-100 p-3 rounded">
              <p className="text-sm font-medium text-blue-800">
                <strong>Propósito:</strong> Detectar a tiempo la infección por VIH para recibir tratamiento oportuno y prevenir la transmisión.
              </p>
            </div>
          </div>

          {/* Riesgos */}
          <div className="border-l-4 border-red-500 bg-red-50 p-4 rounded-r-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-red-600">⚠️</span>
              <h5 className="font-semibold text-red-800">Riesgos:</h5>
            </div>
            <p className="text-sm text-gray-700">
              Sangrado excesivo, desmayo o sensación de mareo, hematoma (acumulación de sangre debajo de la piel), infección del sitio de punción, 
              necesidad de hacer punciones múltiples para localizar las venas, punción traumática, trauma posterior a la entrega del resultado 
              por error de interpretación de los resultados o por no consultar con un médico. <strong className="text-red-700">
              Si el paciente presenta condiciones especiales, debe informar previamente al profesional de salud.</strong>
            </p>
          </div>

          {/* Beneficios */}
          <div className="border-l-4 border-green-500 bg-green-50 p-4 rounded-r-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green-600">✅</span>
              <h5 className="font-semibold text-green-800">Beneficios:</h5>
            </div>
            <p className="text-sm text-gray-700">
              Detección oportuna del VIH para iniciar tratamiento temprano, prevenir complicaciones y reducir el riesgo de transmisión. 
              Permite el seguimiento médico adecuado y acceso a programas de apoyo y tratamiento antirretroviral cuando sea necesario.
            </p>
          </div>

          {/* Alternativas */}
          <div className="border-l-4 border-purple-500 bg-purple-50 p-4 rounded-r-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-purple-600">🔄</span>
              <h5 className="font-semibold text-purple-800">Alternativas:</h5>
            </div>
            <p className="text-sm text-gray-700">
              Ninguna alternativa disponible para la detección del VIH. Esta prueba es el método estándar para el diagnóstico presuntivo.
            </p>
          </div>

          {/* Implicaciones */}
          <div className="border-l-4 border-orange-500 bg-orange-50 p-4 rounded-r-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-orange-600">🕐</span>
              <h5 className="font-semibold text-orange-800">Implicaciones:</h5>
            </div>
            <p className="text-sm text-gray-700 mb-2">
              A algunas personas cuando se les informa que tiene anticuerpos contra VIH (resultado reactivo) pueden llegar a presentar fuertes 
              reacciones emocionales, incluyendo ansiedad y depresión. También puede ser objeto de discriminación o rechazo por otras personas e instituciones.
            </p>
            <p className="text-sm font-medium text-orange-800">
              <strong>Efectos inevitables:</strong> Dolor en el sitio de punción, molestia por presión del torniquete, impresión al observar la sangre.
            </p>
          </div>

          {/* Posibles consecuencias */}
          <div className="border-l-4 border-gray-500 bg-gray-50 p-4 rounded-r-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-gray-600">ℹ️</span>
              <h5 className="font-semibold text-gray-800">Posibles consecuencias en caso que decida no aceptar el procedimiento:</h5>
            </div>
            <p className="text-sm text-gray-700">
              Impedimento para que el personal médico pueda realizar un diagnóstico oportuno, generar un plan de tratamiento adecuado, 
              y prevenir la transmisión del virus. Esto puede resultar en complicaciones de salud graves y riesgo para terceros.
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