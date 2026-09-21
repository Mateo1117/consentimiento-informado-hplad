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

interface RxGestantePDFData {
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

// Datos del procedimiento, tomados del formato SC-M-09.32 versión 03 del hospital
const RX_GESTANTE_PROCEDURE_DATA: BasePDFProcedureItem[] = [
  {
    label: 'PROCEDIMIENTO',
    value: 'TOMA DE RADIOGRAFÍA PARA GESTANTE'
  },
  {
    label: 'DESCRIPCIÓN DEL PROCEDIMIENTO',
    value: 'La toma de radiografía en la paciente gestante es un estudio de diagnóstico por imágenes que utiliza dosis extremadamente bajas de radiación ionizante (rayos X) para la evaluación de estructuras óseas, articulares, pulmonares o abdominales en la madre. Durante el examen, la paciente se posicionará de pie, sentada o en decúbito sobre la mesa de exploraciones según la región anatómica a evaluar. Antes de la exposición, se implementan de forma obligatoria las medidas de radioprotección pertinentes, incluyendo el colimado estricto del haz de rayos X únicamente hacia la zona de interés y la colocación de un blindaje plomado (delantal o protector pélvico/abdominal) para minimizar la exposición del feto.'
  },
  {
    label: 'PROPÓSITO',
    value: 'Obtener información diagnóstica prioritaria ante sospecha de patología materna aguda (traumatismos, infecciones pulmonares, abdomen agudo) que no pueda ser resuelta mediante métodos inocuos (ultrasonido o resonancia) y cuyo retraso ponga en riesgo la vida o la salud de la madre o del feto.'
  },
  {
    label: 'BENEFICIOS ESPERADOS',
    value: '1. Diagnóstico materno oportuno. Permite descartar o confirmar cuadros patológicos graves o de urgencia en la gestante para iniciar un manejo terapéutico inmediato. 2. Relación beneficio-riesgo favorable: Aporta información clínica decisiva para la vida materna utilizando dosis de radiación muy inferiores al umbral de riesgo teratogénico fetal demostrado.'
  },
  {
    label: 'RIESGOS Y POSIBLES COMPLICACIONES',
    value: 'Son Riesgos: 1. Riesgo teórico de exposición fetal a radiación dispersa. Posibilidad de que una fracción mínima de radiación secundaria alcance al feto. Las dosis diagnósticas convencionales (menores a 50 mGy) no superan los umbrales asociados a malformaciones estructurales o muerte fetal. 2. Riesgo teórico y acumulativo extremadamente bajo de inducción de neoplasias o leucemia en la infancia tardía del recién nacido. 3. Posible disminución de la nitidez diagnóstica por el uso de blindajes, la dificultad en el posicionamiento materno o el intento de reducir la dosis al mínimo (principio ALARA). Son Complicaciones : 1. Mareo, diaforesis o hipotensión materna secundaria a la compresión de la vena cava inferior por el útero grávido al adoptar la posición de decúbito durante el estudio. 2. Incremento del dolor o desplazamiento de fracturas por maniobras inadecuadas al movilizar a una paciente traumatizada para lograr la proyección deseada. 3. Contusión o excoriación en la piel de la gestante por fricción con los chasis, el Bucky o la mesa rígida.'
  },
  {
    label: 'IMPLICACIONES',
    value: 'Requerimiento de colaboración activa del paciente en el posicionamiento e inmovilización momentánea para evitar la repetición de tomas. 2. Uso obligatorio de elementos de protección plomada (delantal/protector pélvico) sobre las zonas no objeto de estudio para la salvaguarda fetal. 3. Aceptación razonada de que el beneficio diagnóstico materno justifica el riesgo teórico mínimo de la radiación ionizante aplicada.'
  },
  {
    label: 'EFECTOS INEVITABLES',
    value: '1. Molestia postural 2. Miedo o ansiedad materna'
  },
  {
    label: 'ALTERNATIVAS RAZONABLES A ESTE PROCEDIMIENTO',
    value: '- Ultrasonido (Ecografía). Método de primera elección, totalmente libre de radiación ionizante - Resonancia Magnética (sin contraste). Opción diagnóstica de alta resolución para tejidos blandos y caracterización compleja que no utiliza radiación ionizante (no disponible).'
  },
  {
    label: 'POSIBLES CONSECUENCIAS EN CASO QUE DECIDA NO ACEPTAR EL PROCEDIMIENTO',
    value: '- Omisión de patología materna grave - Efectos secundarios indirectos en el feto - Necesidad de procedimientos invasivos alternativos'
  },
  {
    label: 'RIESGOS EN FUNCIÓN DE LA SITUACIÓN CLÍNICA DEL PACIENTE',
    value: '[Campo a completar según situación específica del paciente]'
  }
];

export class RxGestantePDFGenerator extends BasePDFGenerator {
  async generateFromData(data: RxGestantePDFData): Promise<jsPDF> {
    const baseData: BasePDFData = {
      documentMeta: {
        formatoNumero: 'FORMATO 32',
        titulo: 'CONSENTIMIENTO INFORMADO',
        subtitulo: 'PARA TOMA DE RADIOGRAFÍA PARA GESTANTE',
        codigo: 'SC-M-09.32',
        version: '03',
        fecha: '11-09-2026'
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
      procedureData: RX_GESTANTE_PROCEDURE_DATA.map(item =>
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
export async function generateRxGestantePDF(data: RxGestantePDFData): Promise<jsPDF> {
  const generator = new RxGestantePDFGenerator();
  return await generator.generateFromData(data);
}
