import jsPDF from 'jspdf';
import { BasePDFGenerator, BasePDFData, BasePDFProcedureItem } from './pdfGeneratorBase';

interface PatientData {
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

interface GuardianData {
  name: string;
  document: string;
  relationship: string;
  phone: string;
}

interface HIVPDFData {
  patientData: PatientData;
  guardianData?: GuardianData | null;
  professionalName: string;
  professionalDocument: string;
  patientSignature: string | null;
  professionalSignature: string | null;
  patientPhoto?: string | null;
  consentDecision: "aprobar" | "disentir";
  date: string;
  time: string;
}

// Datos del procedimiento de Prueba VIH
const HIV_PROCEDURE_DATA: BasePDFProcedureItem[] = [
  {
    label: 'PROCEDIMIENTO',
    value: 'PRUEBA PRESUNTIVA DE VIH'
  },
  {
    label: 'DESCRIPCIÓN DEL PROCEDIMIENTO',
    value: 'Por medio de una muestra de sangre, se procesa y se identifica o descarta la presencia activa del virus de la inmunodeficiencia Humana (VIH), el cual puede infectar y destruir las células del sistema de defensa del cuerpo (Sistema inmune), originando una falla progresiva y grave en las defensas del organismo, el cual queda expuesto a infecciones y ciertos tipos de tumores. La prueba inicial, es una prueba presuntiva, y debe ser interpretada por un médico. Ya que, el hecho de salir reactiva no implica que usted esté infectado por el virus. Lo que es muy importante, es consultar con un médico.'
  },
  {
    label: 'PROPÓSITO',
    value: 'Detectar a tiempo la infección por VIH para recibir tratamiento oportuno.'
  },
  {
    label: 'BENEFICIOS ESPERADOS',
    value: 'Detección oportuna del VIH.'
  },
  {
    label: 'RIESGOS',
    value: '1. Sangrado excesivo, 2. Desmayo o sensación de mareo, 3. Hematoma (acumulación de sangre debajo de la piel, que se pone de color morado a negro), 4. Infección de la piel, 5. Necesidad de hacer punciones múltiples para localizar las venas, 6. Punción traumática, 7. Trauma posterior a la entrega del resultado por error de interpretación de los resultados o por no consultar con un médico.'
  },
  {
    label: 'IMPLICACIONES',
    value: 'A algunas personas cuando se les informa que tiene anticuerpos contra VIH (resultado reactivo) pueden llegar a presentar fuertes reacciones emocionales, incluyendo ansiedad y depresión. También puede ser objeto de discriminación o rechazo por otras personas e instituciones.'
  },
  {
    label: 'EFECTOS INEVITABLES',
    value: '1. Dolor en el sitio de punción para toma de muestra, 2. Molestia por presión ejercida con el torniquete, 3. Impresión fuerte al observar la sangre en el tubo contenedor.'
  },
  {
    label: 'ALTERNATIVAS RAZONABLES A ESTE PROCEDIMIENTO',
    value: 'Ninguna.'
  },
  {
    label: 'POSIBLES CONSECUENCIAS EN CASO QUE DECIDA NO ACEPTAR EL PROCEDIMIENTO',
    value: 'Impedimento para que el personal médico pueda realizar un diagnóstico y generar un plan de tratamiento.'
  },
  {
    label: 'RIESGOS EN FUNCIÓN DE LA SITUACIÓN CLÍNICA DEL PACIENTE',
    value: '[Campo a completar según situación específica del paciente]'
  }
];

export class HIVPDFGenerator extends BasePDFGenerator {
  async generateFromData(data: HIVPDFData): Promise<jsPDF> {
    // Transform data to base format
    const baseData: BasePDFData = {
      documentMeta: {
        formatoNumero: 'FORMATO 39',
        titulo: 'CONSENTIMIENTO INFORMADO',
        subtitulo: 'PARA PRUEBA PRESUNTIVA DE VIH',
        codigo: 'SC-M-09.39',
        version: '02',
        fecha: '28-12-2022'
      },
      patientData: {
        nombreCompleto: `${data.patientData.nombre} ${data.patientData.apellidos}`,
        tipoDocumento: data.patientData.tipoDocumento,
        numeroDocumento: data.patientData.numeroDocumento,
        fechaNacimiento: data.patientData.fechaNacimiento,
        edad: data.patientData.edad,
        sexo: data.patientData.sexo,
        eps: data.patientData.eps,
        telefono: data.patientData.telefono,
        direccion: data.patientData.direccion,
        regimen: 'S'
      },
      guardianData: data.guardianData ? {
        nombreCompleto: data.guardianData.name,
        documento: data.guardianData.document,
        telefono: data.guardianData.phone,
        vinculo: data.guardianData.relationship
      } : null,
      procedureData: HIV_PROCEDURE_DATA,
      professionalData: {
        nombreCompleto: data.professionalName,
        documento: data.professionalDocument,
        firma: data.professionalSignature || undefined
      },
      patientSignature: data.patientSignature || undefined,
      patientPhoto: data.patientPhoto || undefined,
      consentDecision: data.consentDecision,
      fechaHora: `${data.date} ${data.time}`
    };

    return await super.generate(baseData);
  }
}

// Export helper function for backwards compatibility
export async function generateHIVPDF(data: HIVPDFData): Promise<jsPDF> {
  const generator = new HIVPDFGenerator();
  return await generator.generate(data);
}
