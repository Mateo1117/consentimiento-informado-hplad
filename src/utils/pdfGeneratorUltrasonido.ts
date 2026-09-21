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

interface UltrasonidoPDFData {
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

// Datos del procedimiento, tomados del formato SC-F-09.34 versión 0.3 del hospital
const ULTRASONIDO_PROCEDURE_DATA: BasePDFProcedureItem[] = [
  {
    label: 'PROCEDIMIENTO',
    value: 'ULTRASONIDO'
  },
  {
    label: 'DESCRIPCIÓN DEL PROCEDIMIENTO',
    value: 'El ultrasonido (o ecografía) convencional es un método de diagnóstico por imágenes no invasivo que emplea ondas sonoras de alta frecuencia (ultrasonido) para obtener representaciones en tiempo real de los órganos, tejidos blandos y estructuras vasculares del cuerpo. Durante el examen, se aplica un gel conductor transparente sobre la piel de la zona a evaluar para eliminar las bolsas de aire y facilitar la transmisión del sonido. El profesional desliza un transductor sobre la superficie corporal, emitiendo ecoimágenes que son procesadas por un computador. El examen se realiza habitualmente con el paciente en decúbito (acostado) sobre una camilla de exploración. .'
  },
  {
    label: 'PROPÓSITO',
    value: 'Evaluación morfológica, estructural y hemodinámica (mediante Doppler) de órganos sólidos, vasos sanguíneos, cavidades con contenido líquido, tejidos blandos y desarrollo fetal, sin recurrir a radiación ionizante.'
  },
  {
    label: 'BENEFICIOS ESPERADOS',
    value: '1. Inocuidad. Ausencia total de radiación ionizante, lo que permite su uso seguro y repetido en gestantes, población pediátrica y controles evolutivos.\n2. Evaluación dinámica y en tiempo real. Capacidad de valorar movimiento de estructuras, flujo sanguíneo y respuesta a la compresión durante la misma maniobra.\n3. Procedimiento indoloro, rápido y de alta accesibilidad.'
  },
  {
    label: 'RIESGOS Y POSIBLES COMPLICACIONES',
    value: 'Son Riesgos:\n1. Limitación por ventana acústica deficiente. Atenuación o bloqueo del haz de ultrasonido por interposición de gas intestinal, tejido adiposo abundante o estructuras óseas.\n2. Probabilidad de sobreestimar o pasar por alto lesiones dependiendo de la resolución del equipo, las características anatómicas del paciente o la dependencia de la pericia del operador.\n3. Reacción de hipersensibilidad al gel (manifestación cutánea leve o a los componentes del gel.\n\nSon Complicaciones:\n1. Incremento temporal del dolor preexistente al presionar el transductor directamente sobre zonas inflamadas, traumatizadas o con procesos agudos (p. ej., apendicitis, colecistitis).\n2. Reacción neurogénica: Mareo o hipotensión transitoria desencadenada por dolor agudo en zonas inflamadas o por compresión prolongada de la vena cava en pacientes gestantes en decúbito supino.\n3. Escoriación o eritema secundario al roce del transductor en pacientes con fragilidad capilar extrema, dermatitis activa o piel atrófica.'
  },
  {
    label: 'IMPLICACIONES',
    value: 'Incomodidad por la presión en la zona donde está pasando el transductor pero no es dolorosa y es momentánea'
  },
  {
    label: 'EFECTOS INEVITABLES',
    value: '- Sensación de frío y humedad\n- Presión mecánica sobre la zona examinada'
  },
  {
    label: 'ALTERNATIVAS RAZONABLES A ESTE PROCEDIMIENTO',
    value: '1. Tomografía Axial Computarizada (TAC). Se indica cuando se requiere evaluar estructuras óseas, retroperitoneo o cuando el gas intestinal invalida el ultrasonido. Utiliza radiación ionizante.\n2. Resonancia Magnética (RM): Alternativa para una caracterización tisular de mayor definición en tejidos blandos y articulaciones, sin uso de radiación ionizante pero de menor disponibilidad inmediata.\n3. Radiografía convencional.'
  },
  {
    label: 'POSIBLES CONSECUENCIAS EN CASO QUE DECIDA NO ACEPTAR EL PROCEDIMIENTO',
    value: '- Omisión o retraso diagnóstico\n- Progresión de cuadros agudos: Riesgo de evolución hacia complicaciones mayores\n- Requerimiento diferido de estudios invasivos'
  },
  {
    label: 'RIESGOS EN FUNCIÓN DE LA SITUACIÓN CLÍNICA DEL PACIENTE',
    value: '[Campo a completar según situación específica del paciente]'
  }
];

export class UltrasonidoPDFGenerator extends BasePDFGenerator {
  async generateFromData(data: UltrasonidoPDFData): Promise<jsPDF> {
    const baseData: BasePDFData = {
      documentMeta: {
        formatoNumero: 'FORMATO 34',
        titulo: 'CONSENTIMIENTO INFORMADO',
        subtitulo: 'PARA ULTRASONIDO',
        codigo: 'SC-F-09.34',
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
      procedureData: ULTRASONIDO_PROCEDURE_DATA.map(item =>
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
export async function generateUltrasonidoPDF(data: UltrasonidoPDFData): Promise<jsPDF> {
  const generator = new UltrasonidoPDFGenerator();
  return await generator.generateFromData(data);
}
