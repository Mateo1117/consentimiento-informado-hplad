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

interface CargaGlucosaPDFData {
  patientData: PatientData;
  guardianData?: GuardianData | null;
  professionalName: string;
  professionalDocument: string;
  patientSignature: string;
  professionalSignature: string;
  patientPhoto?: string | null;
  consentDecision: "aprobar" | "disentir";
  date: string;
  time: string;
}

// Datos del procedimiento de Carga de Glucosa
const CARGA_GLUCOSA_PROCEDURE_DATA: BasePDFProcedureItem[] = [
  {
    label: 'PROCEDIMIENTO',
    value: 'ADMINISTRACIÓN ORAL DE CARGA DE GLUCOSA (DEXTROSA ANHIDRA)'
  },
  {
    label: 'DESCRIPCIÓN DEL PROCEDIMIENTO',
    value: 'Consiste en suministrar vía oral una bebida que contiene una cantidad estandarizada de glucosa (dextrosa anhidra) que servirá para la evaluación de su diagnóstico. No se debe realizar este procedimiento si el paciente está indispuesto, o ha presentado episodios de fiebre, vómito o diarrea en las 24 horas anteriores a la toma de la muestra.'
  },
  {
    label: 'PROPÓSITO',
    value: 'Analizar los niveles de azúcar en sangre y la reacción del organismo a la ingesta de la carga de glucosa.'
  },
  {
    label: 'BENEFICIOS ESPERADOS',
    value: 'Orientar y/o confirmar un diagnóstico frente a los niveles de glucosa en el paciente o cómo la está procesando el organismo. Seguimiento de una enfermedad o condición en salud.'
  },
  {
    label: 'RIESGOS Y POSIBLES COMPLICACIONES',
    value: 'Malestar, náuseas, vómito, diarrea, mareo o reacciones alérgicas, urticaria o asma. Si el paciente es diabético, debe informar previamente y sólo se administrará bajo prescripción médica.'
  },
  {
    label: 'IMPLICACIONES',
    value: 'Tiempo de permanencia en el laboratorio es de dos (2) a tres (3) horas dependiendo el examen solicitado (curva o glicemia pre y pos carga), múltiples punciones por el número de muestras requeridas.'
  },
  {
    label: 'EFECTOS INEVITABLES',
    value: 'Nauseas o molestia por el sabor azucarado.'
  },
  {
    label: 'ALTERNATIVAS RAZONABLES A ESTE PROCEDIMIENTO',
    value: 'Ninguna.'
  },
  {
    label: 'POSIBLES CONSECUENCIAS EN CASO QUE DECIDA NO ACEPTAR EL PROCEDIMIENTO',
    value: 'Impide a los médicos tratantes tener información valiosa para determinar, confirmar o ajustar el diagnóstico y tratamiento médico.'
  }
];

export class CargaGlucosaPDFGenerator extends BasePDFGenerator {
  async generateFromData(data: CargaGlucosaPDFData): Promise<jsPDF> {
    // Transform data to base format
    const baseData: BasePDFData = {
      documentMeta: {
        formatoNumero: 'FORMATO 119',
        titulo: 'CONSENTIMIENTO INFORMADO',
        subtitulo: 'PARA CARGA DE GLUCOSA',
        codigo: 'SC-M-09.119',
        version: '01',
        fecha: '20-10-2024'
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
      procedureData: CARGA_GLUCOSA_PROCEDURE_DATA,
      professionalData: {
        nombreCompleto: data.professionalName,
        documento: data.professionalDocument,
        firma: data.professionalSignature
      },
      patientSignature: data.patientSignature,
      patientPhoto: data.patientPhoto || undefined,
      consentDecision: data.consentDecision,
      fechaHora: `${data.date} ${data.time}`
    };

    return await super.generate(baseData);
  }
}

// Export helper function for backwards compatibility
export async function generateCargaGlucosaPDF(data: CargaGlucosaPDFData): Promise<jsPDF> {
  const generator = new CargaGlucosaPDFGenerator();
  return await generator.generate(data);
}
