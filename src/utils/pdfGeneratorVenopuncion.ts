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

interface VenopuncionPDFData {
  patientData: PatientData;
  guardianData?: GuardianData | null;
  professionalName: string;
  professionalDocument: string;
  patientSignature: string | null;
  guardianSignature?: string | null; // Firma del representante cuando aplica
  professionalSignature: string | null;
  patientPhoto?: string | null;
  consentDecision: "aprobar" | "disentir";
  date: string;
  time: string;
}

// Datos del procedimiento de Venopunción
const VENOPUNCION_PROCEDURE_DATA: BasePDFProcedureItem[] = [
  {
    label: 'PROCEDIMIENTO',
    value: 'TOMA DE MUESTRAS POR VENOPUNCIÓN'
  },
  {
    label: 'DESCRIPCIÓN DEL PROCEDIMIENTO',
    value: 'Consiste en puncionar una vena, -generalmente de la zona central del antebrazo-, con una aguja estéril unida a un tubo colector para extraer o sacar una muestra de sangre.'
  },
  {
    label: 'PROPÓSITO',
    value: 'Analizar las muestras sanguíneas mediante pruebas de laboratorio clínico solicitadas por el médico tratante.'
  },
  {
    label: 'BENEFICIOS ESPERADOS',
    value: 'Los resultados de la muestras permiten orientar y/o confirmar un diagnóstico y realizar el seguimiento de una enfermedad o condición en salud, evaluar la presencia o ausencia de algunas sustancias químicas, o dar pautas para el tratamiento.'
  },
  {
    label: 'RIESGOS',
    value: 'Sangrado excesivo, desmayo o sensación de mareo.'
  },
  {
    label: 'IMPLICACIONES',
    value: 'Hematoma (acumulación de sangre debajo de la piel que se pone de color morado a negro), infección por la ruptura de la piel, punciones múltiples para localizar las venas, punción traumática.'
  },
  {
    label: 'EFECTOS INEVITABLES',
    value: 'Dolor en el sitio de punción, molestia por la presión ejercida con el torniquete, impresión fuerte al observar la sangre en el tubo contenedor.'
  },
  {
    label: 'ALTERNATIVAS RAZONABLES A ESTE PROCEDIMIENTO',
    value: 'Ninguna.'
  },
  {
    label: 'POSIBLES CONSECUENCIAS EN CASO QUE DECIDA NO ACEPTAR EL PROCEDIMIENTO',
    value: 'Impide a los médicos tratantes tener información valiosa para determinar, confirmar o ajustar su diagnóstico y tratamiento médico.'
  },
  {
    label: 'RIESGOS EN FUNCIÓN DE LA SITUACIÓN CLÍNICA DEL PACIENTE',
    value: '[Campo a completar según situación específica del paciente]'
  }
];

export class VenopuncionPDFGenerator extends BasePDFGenerator {
  async generateFromData(data: VenopuncionPDFData): Promise<jsPDF> {
    // Transform data to base format
    const baseData: BasePDFData = {
      documentMeta: {
        formatoNumero: 'FORMATO 37',
        titulo: 'CONSENTIMIENTO INFORMADO',
        subtitulo: 'PARA TOMA DE MUESTRAS POR VENOPUNCIÓN',
        codigo: 'SC-M-09.37',
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
      procedureData: VENOPUNCION_PROCEDURE_DATA,
      professionalData: {
        nombreCompleto: data.professionalName,
        documento: data.professionalDocument,
        firma: data.professionalSignature || undefined
      },
      patientSignature: data.patientSignature || undefined,
      guardianSignature: data.guardianSignature || undefined,
      patientPhoto: data.patientPhoto || undefined,
      consentDecision: data.consentDecision,
      fechaHora: `${data.date} ${data.time}`
    };

    return await super.generate(baseData);
  }
}

// Export helper function for backwards compatibility
export async function generateVenopuncionPDF(data: VenopuncionPDFData): Promise<jsPDF> {
  const generator = new VenopuncionPDFGenerator();
  return await generator.generateFromData(data);
}
