import React, { useState } from 'react';
import { FileText, Download, User, Calendar, Clock, CheckSquare, Printer, Eye } from 'lucide-react';

const InformedConsentApp = () => {
  const [selectedConsent, setSelectedConsent] = useState('');
  const [patientData, setPatientData] = useState({
    nombre: '',
    tipoId: 'CC',
    numeroId: '',
    fechaNacimiento: '',
    edad: '',
    eps: '',
    fecha: new Date().toISOString().split('T')[0],
    hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
    isMinor: false,
    representanteName: '',
    representanteId: '',
    location: 'HOSPITAL PEDRO LEON ALVAREZ DIAZ DE LA MESA'
  });
  
  const [selectedProcedures, setSelectedProcedures] = useState([]);
  const [consentDecision, setConsentDecision] = useState('APROBAR');
  const [showPreview, setShowPreview] = useState(false);
  const [differentialApproach, setDifferentialApproach] = useState({
    genero: false,
    etnia: false,
    cicloVital: false,
    noAplica: true,
    posicionSocial: false,
    discapacidad: false,
    condicionVida: false
  });

  const consentTypes = [
    {
      id: 'transfusion',
      name: 'Transfusión de Hemocomponentes',
      code: '1200AD01-F038',
      version: '08',
      procedures: [
        {
          name: 'Transfusión Sanguínea',
          description: 'Es el trasplante de un tejido líquido, la sangre. Se realiza a través de la administración de cualquiera de sus componentes (glóbulos rojos, plasma, plaquetas, crioprecipitado) con el fin de reponer su pérdida o el déficit en su producción.',
          risks: 'Reacciones alérgicas, fiebre, infecciones, sobrecarga de volumen, reacciones hemolíticas, hipocalcemia.',
          benefits: 'Mejora de la oxigenación, reposición de componentes sanguíneos, estabilización hemodinámica.',
          alternatives: 'Eritropoyetina, soluciones cristaloides/coloides, hierro intravenoso u oral, autotransfusión.',
          implications: 'Requiere pruebas de compatibilidad, consentimiento informado, monitoreo continuo y disponibilidad de unidades seguras.'
        }
      ]
    },
    {
      id: 'hisopado',
      name: 'Hisopado Nasofaríngeo/Orofaríngeo',
      code: '1200AD01-F050',
      version: '09',
      procedures: [
        {
          name: 'Hisopado Nasofaríngeo',
          description: 'Introducción de un hisopo estéril en la cavidad nasal hasta la nasofaringe para recolectar una muestra de secreciones. Se usa para detectar infecciones virales o bacterianas, como influenza, COVID-19 y faringitis estreptocócica.',
          risks: 'Molestia, lagrimeo, estornudos, irritación, sangrado nasal (raro), reflejo nauseoso.',
          benefits: 'Diagnóstico rápido y preciso de infecciones respiratorias, facilitando el tratamiento oportuno.',
          alternatives: 'Hisopado orofaríngeo, pruebas de saliva, aspirado nasofaríngeo, pruebas serológicas o de antígenos.',
          implications: 'Requiere técnica estéril, personal capacitado y transporte adecuado de la muestra para evitar falsos negativos.'
        },
        {
          name: 'Hisopado Orofaríngeo',
          description: 'Introducción de un hisopo estéril en la boca hasta la orofaringe para recolectar una muestra de secreciones, utilizada en el diagnóstico de infecciones virales o bacterianas como estreptococo, COVID-19 e influenza.',
          risks: 'Molestia, reflejo de náuseas, irritación, tos, ligero malestar en la garganta.',
          benefits: 'Diagnóstico rápido y preciso de infecciones respiratorias y faríngeas, facilitando el tratamiento oportuno.',
          alternatives: 'Hisopado nasofaríngeo, pruebas de saliva, aspirado faríngeo, pruebas serológicas o de antígenos.',
          implications: 'Requiere técnica adecuada para evitar la contaminación de la muestra, personal capacitado y transporte adecuado al laboratorio.'
        }
      ]
    },
    {
      id: 'laboratorio',
      name: 'Toma de Muestras Laboratorio',
      code: '1203SUBCIE-F73',
      version: '08',
      procedures: [
        {
          name: 'Extracción de Sangre',
          description: 'La venopunción es la técnica por lo cual se perfora una vena por vía transcutánea con una aguja o catéter; el objetivo de este procedimiento es la extracción de sangre para su posterior análisis.',
          risks: 'Dolor, Sangrado. En casos difíciles de extracción de sangre serán necesarias otras punciones adicionales. Sangrado excesivo, Hematoma, Infección, Irritación de la vena, Lesión del nervio',
          benefits: 'Orientación diagnostica de su estado de salud, Seguimiento a tratamiento de su enfermedad',
          alternatives: 'No aplica',
          implications: 'Sangrado excesivo, Hematoma, Infección, Irritación de la vena, Lesión del nervio'
        },
        {
          name: 'Toma de Flujo Vaginal',
          description: 'Se tomará muestra de la secreción para examen directo, previa colocación o no de espéculo vaginal (depende del caso) muestra se toma con ayuda de un aplicador',
          risks: 'No existe ningún riesgo identificado a la toma de la muestra, incluso si se encuentra embarazada actualmente. Cuando el cuello del útero se encuentra inflamado, en ocasiones se presenta escaso sangrado vaginal (manchado), que cede solo y no requiere tratamiento.',
          benefits: 'Orientación diagnostica de su estado de salud, Seguimiento a tratamiento de su enfermedad',
          alternatives: 'Informar a su médico, con el fin de enviar tratamiento sin conocer diagnostico',
          implications: 'No hay implicaciones evidenciadas en literatura y experiencia'
        },
        {
          name: 'Toma de Secreción Uretral',
          description: 'El eximen de secreción uretral se realiza para determinar la presencia de microorganismos bacterianos en la uretra (zona de las vías urinarias masculina)',
          risks: 'Puede sentir presión o ardor cuando el hisopo toca la uretra',
          benefits: 'Orientación diagnostica de su estado de salud, Seguimiento a tratamiento de su enfermedad',
          alternatives: 'Informar a su médico, con el fin de enviar tratamiento sin conocer diagnostico',
          implications: 'No hay implicaciones evidenciadas en literatura y experiencia'
        },
        {
          name: 'Prueba de Tolerancia oral a la glucosa',
          description: 'Consiste en la determinación de los niveles de Glucosa en sangre en una muestra basal (en ayunas), posterior a esto se le administrará bajo su autorización una carga de glucosa estipulada por el médico (jugo). Por parte del personal del laboratorio se le asignarán los tiempos en los cuales usted debe regresar al laboratorio para la toma de la muestra.',
          risks: 'Náuseas, mareos, malestar general, vómitos.',
          benefits: 'Diagnóstico preciso de alteraciones en el metabolismo de la glucosa, permitiendo intervención temprana.',
          alternatives: 'Hemoglobina glucosilada (HbA1c), glucosa plasmática en ayunas, prueba de glucosa postprandial.',
          implications: 'Requiere ayuno previo, duración de 2 a 3 horas en el laboratorio, cooperación del paciente y condiciones adecuadas para evitar falsos resultados.'
        },
        {
          name: 'Punción Arterial',
          description: 'Procedimiento para obtener una muestra de sangre directamente de una arteria, generalmente la arteria radial o femoral, para medir gases en sangre, pH y otros parámetros. Se usa comúnmente en situaciones críticas para evaluar la función pulmonar y el equilibrio ácido-base.',
          risks: 'Dolor en el sitio de punción, hematoma, sangrado, infección, daño a la arteria o nervios, espasmo arterial.',
          benefits: 'Diagnóstico preciso de oxigenación, ventilación y equilibrio ácido-base, esencial en pacientes críticos.',
          alternatives: 'Análisis de sangre venosa, medición de oxígeno por saturación, o monitoreo no invasivo (oximetría).',
          implications: 'Requiere técnica adecuada para evitar complicaciones, monitoreo post-punción, personal capacitado y condiciones estériles.'
        }
      ]
    },
    {
      id: 'hiv',
      name: 'Toma de Muestras HIV',
      code: '1203SUBCIE-F65',
      version: '09',
      procedures: [
        {
          name: 'Toma de muestra sanguínea para detección de VIH',
          description: 'Extracción de sangre venosa o recolección de fluido oral para detectar la presencia de anticuerpos, antígenos o material genético del VIH mediante pruebas rápidas, ELISA o PCR.',
          risks: 'Mínimos: dolor en el sitio de punción, hematoma, mareo; en prueba oral, posible irritación en encías.',
          benefits: 'Diagnóstico temprano, acceso oportuno a tratamiento y consejería, reducción del riesgo de transmisión.',
          alternatives: 'Autopruebas de VIH, pruebas de cuarta generación, pruebas de detección de carga viral',
          implications: 'Requiere consentimiento informado, asesoría pre y post prueba, confidencialidad y seguimiento en caso de resultado positivo.'
        }
      ]
    }
  ];

  const handleProcedureToggle = (procedureName) => {
    setSelectedProcedures(prev => 
      prev.includes(procedureName) 
        ? prev.filter(p => p !== procedureName)
        : [...prev, procedureName]
    );
  };

  const generateDocument = () => {
    setShowPreview(true);
  };

  const getSelectedConsentData = () => {
    return consentTypes.find(c => c.id === selectedConsent);
  };

  const DocumentPreview = () => {
    const consentData = getSelectedConsentData();
    if (!consentData) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto">
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
            <h3 className="text-lg font-semibold">Vista Previa del Documento</h3>
            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                <Printer className="h-4 w-4" />
                Imprimir
              </button>
              <button
                onClick={() => setShowPreview(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cerrar
              </button>
            </div>
          </div>
          
          <div className="p-8" style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px' }}>
            {/* Header del documento */}
            <div className="border border-black mb-4">
              <table className="w-full">
                <tr>
                  <td className="p-2 border-r border-black w-20">
                    <div className="w-16 h-16 bg-pink-500 rounded flex items-center justify-center text-white font-bold">
                      HSM
                    </div>
                  </td>
                  <td className="p-2 text-center">
                    <div className="font-bold">E.S.E. HOSPITAL PEDRO LEON ALVAREZ DIAZ DE LA MESA</div>
                    <div>Nit: 860.009.555-7</div>
                    <div className="font-bold mt-2">CONSENTIMIENTO INFORMADO {consentData.name.toUpperCase()}</div>
                  </td>
                  <td className="p-2 border-l border-black text-xs">
                    <div>Página: 1 de 2</div>
                    <div>Versión: {consentData.version}</div>
                    <div>Fecha: Enero de 2025</div>
                    <div>Código: {consentData.code}</div>
                    <div>Documento: Controlado</div>
                  </td>
                </tr>
              </table>
            </div>

            {/* Datos de Identificación */}
            <div className="mb-4">
              <div className="font-bold mb-2">DATOS DE IDENTIFICACIÓN</div>
              <div className="mb-2">
                <span className="font-bold">NOMBRE Y APELLIDO(S): </span>
                <span className="underline">{patientData.nombre}</span>
              </div>
              <div className="mb-2">
                <span className="font-bold">TIPO DE IDENTIFICACION </span>
                RC___ CC_{patientData.tipoId === 'CC' ? 'X' : '_'} TI_{patientData.tipoId === 'TI' ? 'X' : '_'} CE_{patientData.tipoId === 'CE' ? 'X' : '_'} OTRO_{patientData.tipoId === 'OTRO' ? 'X' : '_'}
                <span className="ml-4 font-bold">NÚMERO DE IDENTIFICACION: </span>
                <span className="underline">{patientData.numeroId}</span>
              </div>
              <div className="mb-2">
                <span className="font-bold">FECHA DE NACIMIENTO: </span>
                <span className="underline">{patientData.fechaNacimiento}</span>
                <span className="ml-4 font-bold">EDAD: </span>
                <span className="underline">{patientData.edad}</span>
                <span className="ml-4 font-bold">EPS: </span>
                <span className="underline">{patientData.eps}</span>
              </div>
              <div className="mb-2">
                <span className="font-bold">{patientData.location} </span>
                <span className="font-bold">CENTRO DE SALUD ¿CUAL? </span>
                <span className="ml-4 font-bold">FECHA: </span>
                <span className="underline">{patientData.fecha}</span>
                <span className="ml-4 font-bold">HORA: </span>
                <span className="underline">{patientData.hora}</span>
              </div>
            </div>

            {/* Enfoque Diferencial */}
            <div className="mb-4">
              <div className="font-bold mb-2">ENFOQUE DIFERENCIAL</div>
              <table className="w-full border border-black text-xs">
                <tr>
                  <td className="border border-black p-1 text-center">GENERO Y ORIENTACIÓN SEXUAL</td>
                  <td className="border border-black p-1 text-center w-8">{differentialApproach.genero ? '✓' : ''}</td>
                  <td className="border border-black p-1 text-center">ETNIA</td>
                  <td className="border border-black p-1 text-center w-8">{differentialApproach.etnia ? '✓' : ''}</td>
                  <td className="border border-black p-1 text-center">CICLO VITAL</td>
                  <td className="border border-black p-1 text-center w-8">{differentialApproach.cicloVital ? '✓' : ''}</td>
                  <td className="border border-black p-1 text-center">NO APLICA</td>
                  <td className="border border-black p-1 text-center w-8">{differentialApproach.noAplica ? '✓' : ''}</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 text-center">POSICION SOCIAL VULNERABLE</td>
                  <td className="border border-black p-1 text-center w-8">{differentialApproach.posicionSocial ? '✓' : ''}</td>
                  <td className="border border-black p-1 text-center">DISCAPACIDAD</td>
                  <td className="border border-black p-1 text-center w-8">{differentialApproach.discapacidad ? '✓' : ''}</td>
                  <td className="border border-black p-1 text-center">CONDICION DE VIDA</td>
                  <td className="border border-black p-1 text-center w-8">{differentialApproach.condicionVida ? '✓' : ''}</td>
                  <td className="border border-black p-1 text-center"></td>
                  <td className="border border-black p-1 text-center w-8"></td>
                </tr>
              </table>
            </div>

            {/* Información */}
            <div className="mb-4">
              <div className="font-bold mb-2">INFORMACIÓN</div>
              <div className="text-justify mb-4">
                Durante el transcurso de la atención prestada desde el ingreso y hasta el egreso de la institución existe la posibilidad de requerir procedimientos para tratamientos y/o diagnósticos invasivos no quirúrgicos, realizados por el personal encargado de la atención, ya que forman parte integral de su tratamiento.
              </div>
              <div className="text-justify mb-4">
                Dichas intervenciones tienen como propósito contribuir con el proceso asistencial y dar cumplimiento a las órdenes del médico tratante, establecidas dentro del Plan de Cuidado de cada paciente y serán realizadas teniendo en cuenta los Protocolos institucionales, que salvaguarden la Seguridad del paciente y la Calidad de la atención.
              </div>
              <div className="mb-2">Seleccione el (los) Procedimiento(s) que se va(n) a realizar:</div>
              
              {/* Tabla de Procedimientos */}
              <table className="w-full border border-black text-xs mb-4">
                <thead>
                  <tr className="bg-blue-900 text-white">
                    <th className="border border-black p-1">Sel</th>
                    <th className="border border-black p-1">Procedimiento</th>
                    <th className="border border-black p-1">Descripción</th>
                    <th className="border border-black p-1">Riesgos</th>
                    <th className="border border-black p-1">Beneficios</th>
                    <th className="border border-black p-1">Alternativas</th>
                    <th className="border border-black p-1">Implicaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {consentData.procedures.map((procedure, index) => (
                    <tr key={index}>
                      <td className="border border-black p-1 text-center">
                        {selectedProcedures.includes(procedure.name) ? '✓' : ''}
                      </td>
                      <td className="border border-black p-1 font-bold">{procedure.name}</td>
                      <td className="border border-black p-1">{procedure.description}</td>
                      <td className="border border-black p-1">{procedure.risks}</td>
                      <td className="border border-black p-1">{procedure.benefits}</td>
                      <td className="border border-black p-1">{procedure.alternatives}</td>
                      <td className="border border-black p-1">{procedure.implications}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Procedimientos a realizar */}
            <div className="mb-4">
              <div className="font-bold mb-2">PROCEDIMIENTOS A REALIZAR:</div>
              {consentData.procedures
                .filter(proc => selectedProcedures.includes(proc.name))
                .map((procedure, index) => (
                  <div key={index} className="mb-4 p-3 border border-gray-300">
                    <div className="font-bold mb-2">{index + 1}. {procedure.name}</div>
                    <div className="text-xs mb-2">
                      <strong>Descripción:</strong> {procedure.description}
                    </div>
                    <div className="text-xs mb-2">
                      <strong>Riesgos:</strong> {procedure.risks}
                    </div>
                    <div className="text-xs mb-2">
                      <strong>Beneficios:</strong> {procedure.benefits}
                    </div>
                    <div className="text-xs mb-2">
                      <strong>Alternativas:</strong> {procedure.alternatives}
                    </div>
                    <div className="text-xs">
                      <strong>Implicaciones:</strong> {procedure.implications}
                    </div>
                  </div>
                ))}
              <div className="border-b border-black mb-4 pb-1"></div>
            </div>

            {/* Declaración del paciente */}
            <div className="mb-4">
              <div className="mb-2">
                Yo, <span className="underline">{patientData.nombre}</span> Mayor de edad, identificado con el número de documento <span className="underline">{patientData.numeroId}</span>
              </div>
              <div className="mb-4">
                en calidad de: Paciente ({patientData.isMinor ? '' : 'X'}) o Acompañante ({patientData.isMinor ? 'X' : ''}), en representación del menor <span className="underline">{patientData.representanteName}</span> Identificado con <span className="underline">{patientData.representanteId}</span> número, he sido informado por el profesional del procedimiento e intervención en salud a la que voy a ser sometido, los beneficios y riesgos.
              </div>
            </div>

            {/* Decisión */}
            <div className="mb-6">
              <div className="mb-4">
                Por tanto, he decidido <span className="font-bold">{consentDecision} {consentDecision === 'APROBAR' ? '✓' : ''} DISENTIR {consentDecision === 'DISENTIR' ? '✓' : ''}</span> la realización del (los) procedimiento(s) o intervención(es) que se me ha(n) propuesto y entiendo que puedo retirar este consentimiento cuando así lo desee, debiendo informar al equipo asistencial tratante, del cambio de esta decisión. Adicionalmente la entidad en mención y el equipo tratante, quedan autorizados para tomar las conductas o procedimientos asistenciales necesarios tendientes a resolver las posibles complicaciones derivadas del procedimiento, atención o intervención solicitada que mediante este documento autorizo.
              </div>
              <div className="mb-4">
                He comprendido con claridad todo lo escrito anteriormente, he tenido la oportunidad de hacer preguntas que han sido resueltas y acepto la realización del procedimiento, atención o intervención solicitada, declarando que la decisión que tomo es libre y voluntaria.
              </div>
            </div>

            {/* Firmas */}
            <div className="flex justify-between">
              <div className="text-center">
                <div className="border border-black w-48 h-24 mb-2"></div>
                <div className="text-xs">
                  <div>Firma del paciente o representante</div>
                  <div>Nombre: ________________________</div>
                  <div>Documento de identidad: ____________</div>
                  <div>Fecha: __________________________</div>
                </div>
              </div>
              <div className="text-center">
                <div className="border border-black w-48 h-24 mb-2"></div>
                <div className="text-xs">
                  <div>Firma del profesional o auxiliar</div>
                  <div>Nombre: ________________________</div>
                  <div>Documento de identidad: ____________</div>
                  <div>Fecha: __________________________</div>
                </div>
              </div>
            </div>

            {/* Sección de revocatoria */}
            <div className="mt-6 border border-black p-2">
              <div className="font-bold mb-2">En caso de revocatoria, diligenciar a continuación:</div>
              <div className="mb-2 font-bold">HE DECIDIDO REVOCAR MI ANTERIOR AUTORIZACIÓN</div>
              <div className="flex justify-between">
                <div className="border border-black w-48 h-16"></div>
                <div className="text-xs">
                  <div>Firma del paciente o representante</div>
                  <div>Nombre: ________________________</div>
                  <div>Documento de identidad: ____________</div>
                  <div>Fecha: __________________________</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const currentDateTime = new Date().toLocaleString('es-CO');

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-pink-500 p-3 rounded-lg">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">E.S.E. HOSPITAL PEDRO LEON ALVAREZ DIAZ DE LA MESA</h1>
              <p className="text-gray-600">Sistema de Consentimientos Informados</p>
              <p className="text-sm text-gray-500">Nit: 860.009.555-7</p>
            </div>
          </div>
        </div>

        {/* Selector de Tipo de Consentimiento */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-pink-500" />
            Seleccionar Tipo de Consentimiento Informado
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {consentTypes.map(consent => (
              <div 
                key={consent.id}
                className={`p-6 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                  selectedConsent === consent.id 
                    ? 'border-pink-500 bg-pink-50 shadow-md' 
                    : 'border-gray-200 hover:border-pink-300'
                }`}
                onClick={() => setSelectedConsent(consent.id)}
              >
                <h3 className="font-semibold text-gray-800 mb-2">{consent.name}</h3>
                <p className="text-sm text-gray-600 mb-1">Código: {consent.code}</p>
                <p className="text-sm text-gray-600">Versión: {consent.version}</p>
              </div>
            ))}
          </div>
        </div>

        {selectedConsent && (
          <>
            {/* Datos del Paciente */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-pink-500" />
                Datos de Identificación del Paciente
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre y Apellidos Completos *
                  </label>
                  <input
                    type="text"
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    value={patientData.nombre}
                    onChange={(e) => setPatientData({...patientData, nombre: e.target.value})}
                    placeholder="Ingrese nombre completo del paciente"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Identificación *
                  </label>
                  <select
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    value={patientData.tipoId}
                    onChange={(e) => setPatientData({...patientData, tipoId: e.target.value})}
                  >
                    <option value="RC">RC - Registro Civil</option>
                    <option value="CC">CC - Cédula de Ciudadanía</option>
                    <option value="TI">TI - Tarjeta de Identidad</option>
                    <option value="CE">CE - Cédula de Extranjería</option>
                    <option value="OTRO">OTRO</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Identificación *
                  </label>
                  <input
                    type="text"
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    value={patientData.numeroId}
                    onChange={(e) => setPatientData({...patientData, numeroId: e.target.value})}
                    placeholder="Número de documento"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Nacimiento *
                  </label>
                  <input
                    type="date"
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    value={patientData.fechaNacimiento}
                    onChange={(e) => setPatientData({...patientData, fechaNacimiento: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Edad *
                  </label>
                  <input
                    type="number"
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    value={patientData.edad}
                    onChange={(e) => setPatientData({...patientData, edad: e.target.value})}
                    placeholder="Edad en años"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    EPS/Aseguradora *
                  </label>
                  <input
                    type="text"
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    value={patientData.eps}
                    onChange={(e) => setPatientData({...patientData, eps: e.target.value})}
                    placeholder="Nombre de la EPS"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Atención
                  </label>
                  <input
                    type="date"
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    value={patientData.fecha}
                    onChange={(e) => setPatientData({...patientData, fecha: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hora de Atención
                  </label>
                  <input
                    type="time"
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    value={patientData.hora}
                    onChange={(e) => setPatientData({...patientData, hora: e.target.value})}
                  />
                </div>
              </div>
              
              {/* Información para menores */}
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={patientData.isMinor}
                    onChange={(e) => setPatientData({...patientData, isMinor: e.target.checked})}
                    className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">¿Es menor de edad?</span>
                </label>
              </div>

              {patientData.isMinor && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-yellow-50 rounded-md">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre del Representante Legal *
                    </label>
                    <input
                      type="text"
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      value={patientData.representanteName}
                      onChange={(e) => setPatientData({...patientData, representanteName: e.target.value})}
                      placeholder="Nombre completo del representante"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Documento del Representante *
                    </label>
                    <input
                      type="text"
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      value={patientData.representanteId}
                      onChange={(e) => setPatientData({...patientData, representanteId: e.target.value})}
                      placeholder="Número de documento"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Enfoque Diferencial */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Enfoque Diferencial</h2>
              <p className="text-sm text-gray-600 mb-4">Marque las opciones que apliquen al paciente:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries({
                  genero: 'Género y Orientación Sexual',
                  etnia: 'Etnia',
                  cicloVital: 'Ciclo Vital',
                  posicionSocial: 'Posición Social Vulnerable',
                  discapacidad: 'Discapacidad',
                  condicionVida: 'Condición de Vida',
                  noAplica: 'No Aplica'
                }).map(([key, label]) => (
                  <label key={key} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={differentialApproach[key]}
                      onChange={(e) => setDifferentialApproach({
                        ...differentialApproach,
                        [key]: e.target.checked,
                        ...(key === 'noAplica' && e.target.checked ? 
                          { genero: false, etnia: false, cicloVital: false, posicionSocial: false, discapacidad: false, condicionVida: false } : 
                          key !== 'noAplica' && e.target.checked ? { noAplica: false } : {}
                        )
                      })}
                      className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Información sobre los Procedimientos */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Información sobre los Procedimientos</h2>
              <div className="bg-blue-50 p-4 rounded-md mb-6">
                <p className="text-sm text-gray-700 mb-3">
                  <strong>Durante el transcurso de la atención prestada desde el ingreso y hasta el egreso de la institución</strong> existe la posibilidad de requerir procedimientos para tratamientos y/o diagnósticos invasivos no quirúrgicos, realizados por el personal encargado de la atención, ya que forman parte integral de su tratamiento.
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Dichas intervenciones tienen como propósito</strong> contribuir con el proceso asistencial y dar cumplimiento a las órdenes del médico tratante, establecidas dentro del Plan de Cuidado de cada paciente y serán realizadas teniendo en cuenta los Protocolos institucionales, que salvaguarden la Seguridad del paciente y la Calidad de la atención.
                </p>
              </div>

              <h3 className="text-lg font-semibold mb-4">Seleccione el (los) Procedimiento(s) que se va(n) a realizar:</h3>
              <div className="space-y-6">
                {consentTypes.find(c => c.id === selectedConsent)?.procedures.map((procedure, index) => (
                  <div key={index} className="border-2 border-gray-200 rounded-lg p-6 hover:border-pink-300 transition-colors">
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        id={`procedure-${index}`}
                        className="mt-1 h-5 w-5 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                        checked={selectedProcedures.includes(procedure.name)}
                        onChange={() => handleProcedureToggle(procedure.name)}
                      />
                      <div className="flex-1">
                        <label htmlFor={`procedure-${index}`} className="font-semibold text-lg text-gray-800 cursor-pointer block mb-3">
                          {procedure.name}
                        </label>
                        <div className="bg-gray-50 p-4 rounded-md mb-4">
                          <h4 className="font-medium text-gray-800 mb-2">Descripción del Procedimiento:</h4>
                          <p className="text-sm text-gray-700">{procedure.description}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-red-50 p-4 rounded-md">
                            <h4 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                              Riesgos:
                            </h4>
                            <p className="text-sm text-red-700">{procedure.risks}</p>
                          </div>
                          <div className="bg-green-50 p-4 rounded-md">
                            <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                              Beneficios:
                            </h4>
                            <p className="text-sm text-green-700">{procedure.benefits}</p>
                          </div>
                          <div className="bg-blue-50 p-4 rounded-md">
                            <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                              Alternativas:
                            </h4>
                            <p className="text-sm text-blue-700">{procedure.alternatives}</p>
                          </div>
                          <div className="bg-purple-50 p-4 rounded-md">
                            <h4 className="font-medium text-purple-800 mb-2 flex items-center gap-2">
                              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                              Implicaciones:
                            </h4>
                            <p className="text-sm text-purple-700">{procedure.implications}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Decisión del Consentimiento */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Decisión del Consentimiento Informado</h2>
              <div className="bg-yellow-50 p-4 rounded-md mb-4">
                <p className="text-sm text-gray-700 mb-2">
                  <strong>He sido informado por el profesional</strong> del procedimiento e intervención en salud a la que voy a ser sometido, los beneficios y riesgos.
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Por tanto, he decidido:</strong>
                </p>
              </div>
              <div className="flex gap-6">
                <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors hover:bg-green-50" 
                       style={{ borderColor: consentDecision === 'APROBAR' ? '#10b981' : '#d1d5db' }}>
                  <input
                    type="radio"
                    name="decision"
                    value="APROBAR"
                    checked={consentDecision === 'APROBAR'}
                    onChange={(e) => setConsentDecision(e.target.value)}
                    className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300"
                  />
                  <span className="ml-3 text-green-700 font-semibold text-lg">✓ APROBAR</span>
                </label>
                <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors hover:bg-red-50"
                       style={{ borderColor: consentDecision === 'DISENTIR' ? '#ef4444' : '#d1d5db' }}>
                  <input
                    type="radio"
                    name="decision"
                    value="DISENTIR"
                    checked={consentDecision === 'DISENTIR'}
                    onChange={(e) => setConsentDecision(e.target.value)}
                    className="h-5 w-5 text-red-600 focus:ring-red-500 border-gray-300"
                  />
                  <span className="ml-3 text-red-700 font-semibold text-lg">✗ DISENTIR</span>
                </label>
              </div>
              <div className="mt-4 p-4 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-700">
                  {consentDecision === 'APROBAR' ? 
                    'Al APROBAR, usted autoriza la realización del (los) procedimiento(s) seleccionado(s) y entiende que puede retirar este consentimiento cuando así lo desee.' :
                    'Al DISENTIR, usted rechaza la realización del (los) procedimiento(s) propuesto(s). Debe informar esta decisión al equipo médico tratante.'
                  }
                </p>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>Generado el: {currentDateTime}</span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowPreview(true)}
                    disabled={!patientData.nombre || !patientData.numeroId || selectedProcedures.length === 0}
                    className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    <Eye className="h-5 w-5" />
                    Vista Previa
                  </button>
                  <button
                    onClick={generateDocument}
                    disabled={!patientData.nombre || !patientData.numeroId || selectedProcedures.length === 0}
                    className="flex items-center gap-2 bg-pink-500 hover:bg-pink-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    <Download className="h-5 w-5" />
                    Generar Documento
                  </button>
                </div>
              </div>
              {(!patientData.nombre || !patientData.numeroId || selectedProcedures.length === 0) && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    <strong>Campos requeridos:</strong> Nombre completo, número de identificación y al menos un procedimiento seleccionado.
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Modal de Vista Previa */}
        {showPreview && <DocumentPreview />}
      </div>
    </div>
  );
};

export default InformedConsentApp;