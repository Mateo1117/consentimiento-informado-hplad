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

interface RadiografiaPDFData {
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

// Datos del procedimiento, tomados del formato SC-F-09.31 versión 0.3 del hospital
const RADIOGRAFIA_PROCEDURE_DATA: BasePDFProcedureItem[] = [
  {
    label: 'PROCEDIMIENTO',
    value: 'TOMA DE RADIOGRAFÍA'
  },
  {
    label: 'DESCRIPCIÓN DEL PROCEDIMIENTO',
    value: 'La toma de radiografía convencional es un estudio no invasivo de diagnóstico por imágenes que utiliza dosis controladas de radiación ionizante (rayos X) para la evaluación de estructuras anatómicas internas, principalmente el sistema osteoarticular, el tórax y el abdomen. La persona se ubicará de pie, sentada o en decúbito (acostada) sobre la mesa de exploraciones según el segmento corporal a evaluar. El haz de radiación atraviesa el cuerpo y es absorbido en diferentes proporciones según la densidad de los tejidos (el hueso absorbe más radiación que los tejidos blandos), plasmando una imagen bidimensional en un detector digital o chasis radiográfico.'
  },
  {
    label: 'PROPÓSITO',
    value: 'Identificar, caracterizar y dar seguimiento a fracturas, luxaciones, procesos infecciosos, lesiones tumorales, patologías pulmonares o alteraciones abdominales estructurales.'
  },
  {
    label: 'BENEFICIOS ESPERADOS',
    value: '1. Obtención inmediata de imágenes diagnósticas para la toma de decisiones clínicas oportunas en urgencias y consulta externa.\n2. Método de elección para la evaluación de la densidad, integridad y alineación del sistema esquelético.\n3. Procedimiento indoloro que no requiere recuperación posterior.'
  },
  {
    label: 'RIESGOS Y POSIBLES COMPLICACIONES',
    value: 'Son Riesgos:\n1. Exposición a una dosis baja de rayos X. Aunque la dosis de una radiografía simple es mínima, existe un riesgo estocástico teórico proporcional a la exposición acumulada a lo largo de la vida.\n2. Limitación diagnóstica por superposición de estructuras.\n3. Alteración en la interpretación radiológica por movimiento involuntario del paciente o presencia de elementos radiopacos (botones, cierres, joyas, material quirúrgico).\n\nSon Complicaciones:\n1. Incremento del dolor o riesgo de desplazamiento en fracturas inestables al movilizar o posicionar la extremidad o zona afectada.\n2. Diaforesis o hipotensión transitoria desencadenada por dolor agudo o bipedestación prolongada en pacientes debilitados.\n3. Escoriación superficial o molestia por fricción directa con los bordes del chasis o la mesa en pacientes con extrema fragilidad capilar o atrofia cutánea.'
  },
  {
    label: 'IMPLICACIONES',
    value: 'Requisitos previos (Pre-examen):\n• Retirar obligatoriamente objetos metálicos, joyas, piercings, cierres, botones o prendas con adornos en la zona anatómica a evaluar para evitar artefactos en la imagen.\n• Informar obligatoriamente al personal de salud sobre la posibilidad o confirmación de embarazo para aplicar medidas de protección radiológica especial (blindaje plomado) o reevaluar la necesidad del examen.\n\nCompromisos durante el examen (Trans-examen):\n• Mantener la posición corporal indicada y permanecer completamente inmóvil durante la emisión de la radiación.\n• Seguir las instrucciones verbales de contener la respiración (apnea) cuando se le solicite (en estudios de tórax o abdomen).\n\nAspectos posteriores (Post-examen):\n• No requiere reposo ni periodo de observación; el paciente puede reincorporarse de inmediato a sus actividades cotidianas.\n• Reclamar y presentar el resultado radiológico al médico tratante para la correlación clínica correspondiente.'
  },
  {
    label: 'EFECTOS INEVITABLES',
    value: '- Molestia o rigidez postural\n- Sensación de frío'
  },
  {
    label: 'ALTERNATIVAS RAZONABLES A ESTE PROCEDIMIENTO',
    value: '- Ecografía (Ultrasonido). Evaluador de elección para tejidos blandos, tendones y colecciones líquidas; no utiliza radiación ionizante.\n- Tomografía Computarizada (TAC). Indicada cuando se requiere reconstrucción tridimensional o mayor detalle anatómico en fracturas complejas o patología visceral.\n- Resonancia Magnética (RM). Excelente caracterización de ligamentos, cartílagos, médula ósea y tejido blando sin uso de radiación ionizante (no disponible).'
  },
  {
    label: 'POSIBLES CONSECUENCIAS EN CASO QUE DECIDA NO ACEPTAR EL PROCEDIMIENTO',
    value: 'Imposibilidad de confirmar o descartar fracturas, consolidaciones viciosas, neumonías u otras patologías relevantes. Riesgo de inmovilizar o intervenir quirúrgicamente de forma errónea por falta de correlación anatómica objetiva. Retraso en el inicio del tratamiento que puede derivar en secuelas funcionales, deformidad o complicaciones sistémicas.'
  },
  {
    label: 'RIESGOS EN FUNCIÓN DE LA SITUACIÓN CLÍNICA DEL PACIENTE',
    value: '[Campo a completar según situación específica del paciente]'
  }
];

export class RadiografiaPDFGenerator extends BasePDFGenerator {
  async generateFromData(data: RadiografiaPDFData): Promise<jsPDF> {
    const baseData: BasePDFData = {
      documentMeta: {
        formatoNumero: 'FORMATO 31',
        titulo: 'CONSENTIMIENTO INFORMADO',
        subtitulo: 'PARA TOMA DE RADIOGRAFÍA',
        codigo: 'SC-F-09.31',
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
      procedureData: RADIOGRAFIA_PROCEDURE_DATA.map(item =>
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
export async function generateRadiografiaPDF(data: RadiografiaPDFData): Promise<jsPDF> {
  const generator = new RadiografiaPDFGenerator();
  return await generator.generateFromData(data);
}
