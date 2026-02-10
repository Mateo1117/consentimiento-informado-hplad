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
}

interface FrotisVaginalPDFData {
  patientData: PatientData;
  guardianData?: GuardianData | null;
  professionalName: string;
  professionalDocument: string;
  patientSignature: string | null;
  guardianSignature?: string | null; // Firma del representante cuando aplica
  professionalSignature: string;
  patientPhoto?: string | null;
  consentDecision: "aprobar" | "disentir";
  date: string;
  time: string;
  clinicalRiskNotes?: string;
}

// Datos del procedimiento de Frotis Vaginal
const FROTIS_VAGINAL_PROCEDURE_DATA: BasePDFProcedureItem[] = [
  {
    label: 'PROCEDIMIENTO',
    value: 'TOMA DE MUESTRA PARA FROTIS VAGINAL - CULTIVO RECTO-VAGINAL'
  },
  {
    label: 'DESCRIPCIÓN DEL PROCEDIMIENTO',
    value: 'Se toma una muestra de secreción de flujo del área vaginal o rectal, utilizando aplicadores, solución salina, tubo de ensayo, medio de cultivo, laminillas, espéculo. Este material utilizado es totalmente desechable. En el caso de ser menor de edad o no haber tenido relaciones sexuales no se utilizará espéculo para la toma de la muestra.'
  },
  {
    label: 'PROPÓSITO',
    value: 'Detectar agentes infecciosos en el área vaginal o rectal para orientar diagnóstico y tratamiento médico.'
  },
  {
    label: 'BENEFICIOS ESPERADOS',
    value: 'Orientar y/o confirmar un diagnóstico y realizar seguimiento oportuno de una condición en salud, que permita dar pautas de tratamiento oportuno.'
  },
  {
    label: 'RIESGOS',
    value: 'Frotis vaginal: Ardor, dolor, picazón o incomodidad al momento de introducir el espéculo y el aplicador. Sangrado leve durante o después del procedimiento.'
  },
  {
    label: 'IMPLICACIONES',
    value: 'Sangrado, dolor pélvico, laceración cervicouterina. Molestia durante la inserción del espéculo.'
  },
  {
    label: 'EFECTOS INEVITABLES',
    value: 'Molestia temporal durante la toma de la muestra, especialmente al introducir el espéculo.'
  },
  {
    label: 'ALTERNATIVAS RAZONABLES A ESTE PROCEDIMIENTO',
    value: 'Ninguna.'
  },
  {
    label: 'POSIBLES CONSECUENCIAS EN CASO QUE DECIDA NO ACEPTAR EL PROCEDIMIENTO',
    value: 'Imposibilidad de detectar infecciones vaginales o rectales, lo que puede llevar a complicaciones de salud no tratadas.'
  },
  {
    label: 'RIESGOS EN FUNCIÓN DE LA SITUACIÓN CLÍNICA DEL PACIENTE',
    value: '[Campo a completar según situación específica del paciente]'
  }
];

export class FrotisVaginalPDFGenerator extends BasePDFGenerator {
  async generateFromData(data: FrotisVaginalPDFData): Promise<jsPDF> {
    // Transform data to base format
    const baseData: BasePDFData = {
      documentMeta: {
        formatoNumero: 'FORMATO 319',
        titulo: 'CONSENTIMIENTO INFORMADO',
        subtitulo: 'PARA FROTIS VAGINAL',
        codigo: 'SC-M-09.319',
        version: '01',
        fecha: '16-06-2022'
      },
      patientData: {
        nombreCompleto: `${data.patientData.nombre} ${data.patientData.apellidos}`,
        tipoDocumento: data.patientData.tipoDocumento,
        numeroDocumento: data.patientData.numeroDocumento,
        fechaNacimiento: data.patientData.fechaNacimiento,
        edad: data.patientData.edad,
        sexo: data.patientData.sexo || 'F',
        eps: data.patientData.eps,
        telefono: data.patientData.telefono,
        direccion: data.patientData.direccion,
        regimen: 'S'
      },
      guardianData: data.guardianData ? {
        nombreCompleto: data.guardianData.name,
        documento: data.guardianData.document,
        telefono: '',
        vinculo: data.guardianData.relationship
      } : null,
      procedureData: FROTIS_VAGINAL_PROCEDURE_DATA.map(item =>
        item.label === 'RIESGOS EN FUNCIÓN DE LA SITUACIÓN CLÍNICA DEL PACIENTE'
          ? { ...item, value: data.clinicalRiskNotes?.trim() || '' }
          : item
      ),
      professionalData: {
        nombreCompleto: data.professionalName,
        documento: data.professionalDocument,
        firma: data.professionalSignature
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
export async function generateFrotisVaginalPDF(data: FrotisVaginalPDFData): Promise<jsPDF> {
  const generator = new FrotisVaginalPDFGenerator();
  return await generator.generateFromData(data);
}
