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

interface HemocomponentesPDFData {
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
  clinicalRiskNotes?: string;
}

// Datos del procedimiento de Hemocomponentes
const HEMOCOMPONENTES_PROCEDURE_DATA: BasePDFProcedureItem[] = [
  {
    label: 'PROCEDIMIENTO',
    value: 'TRANSFUSIÓN DE HEMOCOMPONENTES'
  },
  {
    label: 'DESCRIPCIÓN DEL PROCEDIMIENTO',
    value: 'La transfusión de hemocomponentes consiste en la administración intravenosa de productos sanguíneos (glóbulos rojos, plaquetas, plasma fresco congelado) para el tratamiento de diversas condiciones médicas que requieren el reemplazo o suplemento de componentes sanguíneos.'
  },
  {
    label: 'PROPÓSITO',
    value: 'Restaurar o mantener niveles adecuados de componentes sanguíneos para el tratamiento de anemias, trastornos de coagulación, hemorragias o deficiencias específicas.'
  },
  {
    label: 'BENEFICIOS ESPERADOS',
    value: 'Mejora de los niveles de hemoglobina, corrección de trastornos de coagulación, control de hemorragias, mejoría de la oxigenación tisular y estabilización hemodinámica.'
  },
  {
    label: 'RIESGOS',
    value: 'Reacciones transfusionales (fiebre, escalofríos, urticaria), reacciones alérgicas, sobrecarga circulatoria, transmisión de infecciones (muy raro con controles actuales), incompatibilidad sanguínea, hemólisis.'
  },
  {
    label: 'IMPLICACIONES',
    value: 'Requiere monitoreo continuo durante la transfusión, posible necesidad de pretratamiento con medicamentos antialérgicos, tiempo prolongado de administración.'
  },
  {
    label: 'EFECTOS INEVITABLES',
    value: 'Punción venosa, molestia en el sitio de infusión, tiempo de permanencia hospitalaria extendido.'
  },
  {
    label: 'ALTERNATIVAS RAZONABLES A ESTE PROCEDIMIENTO',
    value: 'Tratamiento con medicamentos estimulantes de la producción sanguínea, suplementos de hierro, factores de coagulación sintéticos (según el caso específico).'
  },
  {
    label: 'POSIBLES CONSECUENCIAS EN CASO QUE DECIDA NO ACEPTAR EL PROCEDIMIENTO',
    value: 'Progresión de la anemia, empeoramiento de trastornos de coagulación, riesgo de hemorragias graves, deterioro del estado general de salud, posible compromiso vital.'
  },
  {
    label: 'RIESGOS EN FUNCIÓN DE LA SITUACIÓN CLÍNICA DEL PACIENTE',
    value: '[Campo a completar según situación específica del paciente]'
  }
];

export class HemocomponentesPDFGenerator extends BasePDFGenerator {
  async generateFromData(data: HemocomponentesPDFData): Promise<jsPDF> {
    // Transform data to base format
    const baseData: BasePDFData = {
      documentMeta: {
        formatoNumero: 'FORMATO 320',
        titulo: 'CONSENTIMIENTO INFORMADO',
        subtitulo: 'PARA TRANSFUSIÓN DE HEMOCOMPONENTES',
        codigo: 'SC-M-09.320',
        version: '01',
        fecha: '15-03-2023'
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
      procedureData: HEMOCOMPONENTES_PROCEDURE_DATA.map(item =>
        item.label === 'RIESGOS EN FUNCIÓN DE LA SITUACIÓN CLÍNICA DEL PACIENTE'
          ? { ...item, value: data.clinicalRiskNotes?.trim() || '' }
          : item
      ),
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
export async function generateHemocomponentesPDF(data: HemocomponentesPDFData): Promise<jsPDF> {
  const generator = new HemocomponentesPDFGenerator();
  return await generator.generateFromData(data);
}
