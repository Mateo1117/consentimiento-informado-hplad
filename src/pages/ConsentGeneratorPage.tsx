import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { generateCargaGlucosaPDF } from '@/utils/pdfGeneratorCargaGlucosa';

const ConsentimientoInformado = () => {
  const [formData, setFormData] = useState({
    // Datos del paciente
    nombreCompleto: '',
    sexo: '',
    fechaNacimiento: '',
    hora: '',
    documento: '',
    tipoDocumento: 'CC',
    numeroHC: '',
    edad: '',
    eapb: '',
    regimen: 'Contrib',
    
    // Datos del acudiente
    nombreAcudiente: '',
    documentoAcudiente: '',
    telefono: '',
    vinculo: '',
    
    // Consentimiento
    actuandoEnNombre: 'propio',
    fecha: new Date().toISOString().split('T')[0]
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const generatePDF = () => {
    // Transform form data to match the PDF generator interface
    const [nombres, ...apellidos] = formData.nombreCompleto.split(' ');
    
    const pdfData = {
      patientData: {
        nombre: nombres || '',
        apellidos: apellidos.join(' ') || '',
        tipoDocumento: formData.tipoDocumento,
        numeroDocumento: formData.documento,
        fechaNacimiento: formData.fechaNacimiento,
        edad: parseInt(formData.edad) || 0,
        sexo: formData.sexo || 'N/D', // Use form value or default
        patientPhoto: null, // Will be added when we have camera capture
        eps: formData.eapb,
        telefono: '',
        direccion: '',
        centroSalud: 'Hospital La Mesa'
      },
      guardianData: formData.nombreAcudiente ? {
        name: formData.nombreAcudiente,
        document: formData.documentoAcudiente,
        relationship: formData.vinculo,
        phone: formData.telefono
      } : null,
      professionalName: '',
      professionalDocument: '',
      patientSignature: '',
      professionalSignature: '',
      patientPhoto: null,
      consentDecision: "aprobar" as const,
      date: formData.fecha,
      time: formData.hora || new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    };

    try {
      const pdf = generateCargaGlucosaPDF(pdfData);
      const fileName = `Consentimiento_${formData.nombreCompleto || 'Paciente'}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error al generar el PDF. Por favor, complete todos los campos requeridos.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white min-h-screen">
      <div className="bg-blue-50 p-6 rounded-lg shadow-lg">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-blue-800 mb-2">FORMATO 119</h1>
          <h2 className="text-xl font-semibold text-blue-700 mb-1">CONSENTIMIENTO INFORMADO</h2>
          <h3 className="text-lg font-semibold text-blue-700">PARA CARGA DE GLUCOSA</h3>
          <div className="text-sm text-gray-600 mt-4">
            <p>La Mesa – Cundinamarca, Calle 8 No. 25 – 34</p>
            <p>Call Center: 3172601556 | Email: atencionalusuario@hospilamesa.gov.co</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Datos del Paciente */}
          <div className="bg-white p-4 rounded border">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">DATOS DEL PACIENTE</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  name="nombreCompleto"
                  value={formData.nombreCompleto}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sexo *</label>
                <select
                  name="sexo"
                  value={formData.sexo}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Seleccionar</option>
                  <option value="F">Femenino</option>
                  <option value="M">Masculino</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Nacimiento</label>
                <input
                  type="date"
                  name="fechaNacimiento"
                  value={formData.fechaNacimiento}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
                <input
                  type="time"
                  name="hora"
                  value={formData.hora}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Documento</label>
                <select
                  name="tipoDocumento"
                  value={formData.tipoDocumento}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="RC">RC</option>
                  <option value="TI">TI</option>
                  <option value="CC">CC</option>
                  <option value="CE">CE</option>
                  <option value="OTRO">OTRO</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Documento *</label>
                <input
                  type="text"
                  name="documento"
                  value={formData.documento}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">N° HC</label>
                <input
                  type="text"
                  name="numeroHC"
                  value={formData.numeroHC}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Edad</label>
                <input
                  type="number"
                  name="edad"
                  value={formData.edad}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">EAPB</label>
                <input
                  type="text"
                  name="eapb"
                  value={formData.eapb}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Régimen</label>
                <select
                  name="regimen"
                  value={formData.regimen}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Contrib">Contributivo</option>
                  <option value="Subsid">Subsidiado</option>
                  <option value="Partic">Particular</option>
                  <option value="PPNA">PPNA</option>
                  <option value="Pob No aseg">Población No asegurada</option>
                  <option value="OTRO">OTRO</option>
                </select>
              </div>
            </div>
          </div>

          {/* Datos del Acudiente */}
          <div className="bg-white p-4 rounded border">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">DATOS DEL ACUDIENTE O REPRESENTANTE (Opcional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  name="nombreAcudiente"
                  value={formData.nombreAcudiente}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Documento</label>
                <input
                  type="text"
                  name="documentoAcudiente"
                  value={formData.documentoAcudiente}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input
                  type="tel"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vínculo o Parentesco</label>
                <input
                  type="text"
                  name="vinculo"
                  value={formData.vinculo}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Información del Procedimiento */}
          <div className="bg-gray-50 p-4 rounded border">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">INFORMACIÓN DEL PROCEDIMIENTO</h3>
            
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold text-gray-700">PROCEDIMIENTO:</h4>
                <p>ADMINISTRACIÓN ORAL DE CARGA DE GLUCOSA (DEXTROSA ANHIDRA)</p>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-700">DESCRIPCIÓN:</h4>
                <p>Consiste en suministrar vía oral una bebida que contiene una cantidad estandarizada de glucosa (dextrosa anhidra) que servirá para la evaluación de su diagnóstico. No se debe realizar este procedimiento si el paciente está indispuesto, o ha presentado episodios de fiebre, vómito o diarrea en las 24 horas anteriores a la toma de la muestra.</p>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-700">PROPÓSITO:</h4>
                <p>Analizar los niveles de azúcar en sangre y la reacción del organismo a la ingesta de la carga de glucosa.</p>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-700">BENEFICIOS ESPERADOS:</h4>
                <p>Orientar y/o confirmar un diagnóstico frente a los niveles de glucosa en el paciente o cómo la está procesando el organismo. Seguimiento de una enfermedad o condición en salud.</p>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-700">RIESGOS Y POSIBLES COMPLICACIONES:</h4>
                <p>Malestar, náuseas, vómito, diarrea, mareo o reacciones alérgicas, urticaria o asma. Si el paciente es diabético, debe informar previamente y sólo se administrará bajo prescripción médica.</p>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-700">IMPLICACIONES:</h4>
                <p>Tiempo de permanencia en el laboratorio es de dos (2) a tres (3) horas dependiendo el examen solicitado (curva o glicemia pre y pos carga), múltiples punciones por el número de muestras requeridas.</p>
              </div>
            </div>
          </div>

          {/* Consentimiento */}
          <div className="bg-white p-4 rounded border">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">CONSENTIMIENTO</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Actuando en:</label>
              <div className="space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="actuandoEnNombre"
                    value="propio"
                    checked={formData.actuandoEnNombre === 'propio'}
                    onChange={handleInputChange}
                    className="form-radio h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2">Nombre propio</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="actuandoEnNombre"
                    value="representante"
                    checked={formData.actuandoEnNombre === 'representante'}
                    onChange={handleInputChange}
                    className="form-radio h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2">Como representante legal</span>
                </label>
              </div>
            </div>
            
            <div className="text-sm text-gray-700 mb-4">
              <p className="mb-2">
                He recibido información clara sobre el procedimiento, sus riesgos, beneficios y alternativas. 
                Entiendo que puedo denegar mi consentimiento sin afectar la atención médica, y que puedo 
                retirar mi consentimiento en cualquier momento antes del procedimiento.
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha del Consentimiento</label>
              <input
                type="date"
                name="fecha"
                value={formData.fecha}
                onChange={handleInputChange}
                className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Botón para generar PDF */}
          <div className="text-center">
            <button
              type="button"
              onClick={generatePDF}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition duration-200 shadow-lg"
            >
              Generar PDF del Consentimiento
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ConsentGeneratorPage = () => {
  return <ConsentimientoInformado />;
};