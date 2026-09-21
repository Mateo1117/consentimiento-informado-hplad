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

interface TacPDFData {
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

// Datos del procedimiento, tomados del formato SC-F-09.36 versión 0.3 del hospital
const TAC_PROCEDURE_DATA: BasePDFProcedureItem[] = [
  {
    label: 'PROCEDIMIENTO',
    value: 'TOMOGRAFIA AXIAL COMPUTARIZADA CON O SIN CONTRASTE (TAC)'
  },
  {
    label: 'DESCRIPCIÓN DEL PROCEDIMIENTO',
    value: 'La Tomografía Axial Computarizada (TAC) es un método de diagnóstico por imágenes que utiliza radiación ionizante (rayos X) y procesamiento informático avanzado para obtener cortes transversales detallados de la anatomía interna. Durante la exploración, el paciente debe permanecer en decúbito sobre la mesa del tomógrafo, la cual se desplazará gradualmente a través del gantry (gantry del escáner). Es imprescindible mantener la inmovilidad estricta y seguir las instrucciones verbales de apnea (suspensión momentánea de la respiración) para evitar artefactos por movimiento. La duración del procedimiento oscila entre 10 y 30 minutos.\n\nAdministración de medios de contraste:\nSegún la indicación clínica, puede requerirse la administración intravenosa de un medio de contraste iodado para la opacificación y delimitación de estructuras vasculares y parenquimatosas. En estudios abdominopélvicos, puede indicarse adicionalmente la administración oral de contraste hidrosoluble o sulfato de bario diluido para la opacificación y distensión del tracto digestivo'
  },
  {
    label: 'PROPÓSITO',
    value: 'Visualización multiplanar de alta resolución para la evaluación, caracterización y seguimiento de hallazgos patológicos estructurales, vasculares o traumáticos.'
  },
  {
    label: 'BENEFICIOS ESPERADOS',
    value: '1. Obtención de imágenes anatómicas tridimensionales de alta precisión en corto tiempo.\n2. Capacidad de diferenciar densidades tisulares finas (hueso, partes blandas, fluidos, vascularización).\n3. Guía fundamental para la toma de decisiones quirúrgicas o terapéuticas oportunas.'
  },
  {
    label: 'RIESGOS Y POSIBLES COMPLICACIONES',
    value: 'Son Riesgos:\n1. Nefrotoxicidad inducida por contraste, si aplica: Deterioro de la función renal secundario a la excreción del medio de contraste iodado, especialmente en pacientes con insuficiencia renal previa, diabetes o deshidratación.\n2. Reacciones adversas al medio de contraste. Reacciones de tipo idiosincrásico o alérgico que varían desde leves (eritema, urticaria, náuseas) hasta graves (broncoespasmo, edema laríngeo, choque anafiláctico).\n3. Exposición a radiación ionizante acumulativa: Exposición a dosis de radiación superior a la de la radiografía convencional.\n\nSon Complicaciones:\n1. Extravasación de medio de contraste: Fuga del líquido al tejido subcutáneo adyacente al sitio de punción venosa, pudiendo ocasionar edema, dolor localizado, necrosis tisular o síndrome compartimental en casos severos.\n2. Incapacidad de completar el estudio por claustrofobia o agitación.\n3. Aspiración bronquial o emesis. Emesis (vómito) inducida por la infusión rápida del contraste iodado o la ingesta del contraste oral, con riesgo de broncoaspiración en pacientes debilitados o sin el ayuno requerido.'
  },
  {
    label: 'IMPLICACIONES',
    value: 'Soportar la rigidez o disconfort por inmovilidad prolongada en la mesa del escáner, sentir frío por la baja temperatura ambiental requerida para los componentes electrónicos del tomógrafo, y experimentar sensaciones de calor difuso o sabor metálico al ingresar el contraste'
  },
  {
    label: 'EFECTOS INEVITABLES',
    value: 'Sensación de rigidez, presión o disconfort postural derivado de la inmovilidad prolongada en decúbito sobre la mesa de exploración.\nPercepción de baja temperatura corporal debido a la climatización ambiental controlada, requerida para el funcionamiento y estabilidad de los componentes electrónicos del tomógrafo.'
  },
  {
    label: 'ALTERNATIVAS RAZONABLES A ESTE PROCEDIMIENTO',
    value: 'Resonancia Magnética (RM): Excelente resolución de tejidos blandos sin uso de radiación ionizante.\nEcografía / Ultrasonido, método no invasivo e inocuo (sin radiación), limitado en evaluación ósea o por interposición de gas intestinal'
  },
  {
    label: 'POSIBLES CONSECUENCIAS EN CASO QUE DECIDA NO ACEPTAR EL PROCEDIMIENTO',
    value: '1. Retraso o imprecisión en el diagnóstico de patologías agudas o crónicas.\n2. Imposibilidad de planificar adecuadamente procedimientos quirúrgicos u oncológicos.\n3. Riesgo de progresión de la enfermedad no detectada a estadios avanzados o de mayor morbimortalidad.'
  },
  {
    label: 'RIESGOS EN FUNCIÓN DE LA SITUACIÓN CLÍNICA DEL PACIENTE',
    value: '[Campo a completar según situación específica del paciente]'
  }
];

export class TacPDFGenerator extends BasePDFGenerator {
  async generateFromData(data: TacPDFData): Promise<jsPDF> {
    const baseData: BasePDFData = {
      documentMeta: {
        formatoNumero: 'FORMATO 36',
        titulo: 'CONSENTIMIENTO INFORMADO',
        subtitulo: 'PARA TOMOGRAFIA AXIAL COMPUTARIZADA CON O SIN CONTRASTE',
        codigo: 'SC-F-09.36',
        version: '0.3',
        fecha: '11-09-2026'
      },
      patientData: {
        nombreCompleto: `${data.patientData.nombre} ${data.patientData.apellidos}`,
        tipoDocumento: data.patientData.tipoDocumento,
        numeroDocumento: data.patientData.numeroDocumento,
        fechaNacimiento: data.patientData.fechaNacimiento,
        edad: data.patientData.edad,
        sexo: data.patientData.sexo || 'N/A',
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
      procedureData: TAC_PROCEDURE_DATA.map(item =>
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
export async function generateTacPDF(data: TacPDFData): Promise<jsPDF> {
  const generator = new TacPDFGenerator();
  return await generator.generateFromData(data);
}
