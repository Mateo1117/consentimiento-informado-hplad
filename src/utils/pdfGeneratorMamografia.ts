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

interface MamografiaPDFData {
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

// Datos del procedimiento, tomados del formato SC-M-09.33 versión 03 del hospital
const MAMOGRAFIA_PROCEDURE_DATA: BasePDFProcedureItem[] = [
  {
    label: 'PROCEDIMIENTO',
    value: 'TOMA DE MAMOGRAFÍA'
  },
  {
    label: 'DESCRIPCIÓN DEL PROCEDIMIENTO',
    value: 'La mamografía es un estudio radiológico especializado para la evaluación del tejido mamario. La paciente se ubicará de pie frente al mamógrafo. La mama se posiciona sobre una plataforma plana y se comprime gradualmente mediante una paleta plástica durante unos segundos para homogenizar el grosor del tejido, reducir la dosis de radiación y optimizar la nitidez de la imagen. Se toman habitualmente dos proyecciones estándar por cada mama (craneocaudal y mediolateral oblicua).'
  },
  {
    label: 'PROPÓSITO',
    value: 'Detección temprana de lesiones no palpables y caracterización de hallazgos clínicos o radiológicos en la glándula mamaria.'
  },
  {
    label: 'BENEFICIOS ESPERADOS',
    value: '- Detección temprana de lesiones no palpables, microcalcificaciones sospechosas y tumores en etapas subclínicas tempranas.\n- Incrementa las probabilidades de curación o control de la enfermedad mediante el diagnóstico oportuno del cáncer de mama.\n- Permite detectar alteraciones en estadios iniciales, disminuye la necesidad de intervenciones quirúrgicas agresivas o esquemas de tratamiento complejos.\n- Facilitar el seguimiento comparativo anual de cambios tisulares evolutivos.'
  },
  {
    label: 'RIESGOS Y POSIBLES COMPLICACIONES',
    value: 'Son Riesgos:\n- Riesgo de omitir lesiones no visibles (por alta densidad mamaria) o de requerir estudios adicionales y biopsias.\n- Exposición a una dosis bajas de rayos X. Aunque la dosis es mínima y controlada.\n- Riesgo de requerir repetición de la toma por movimiento involuntario, baja tolerancia a la compresión o presencia de implantes/cuerpos extraños que oculten tejido.\n\nSon Complicaciones:\n- Mareo, hipotensión o desmayo transitorio desencadenado por dolor agudo o estrés durante la compresión del tejido.\n- Extravasación de sangre y morados por rotura de pequeños vasos capilares debido a la presión ejercida sobre la mama.\n- Lesión o irritación de la piel por fricción o compresión directa, especialmente en pacientes con piel frágil, atrófica o con intertrigo submamario.'
  },
  {
    label: 'EFECTOS INEVITABLES',
    value: 'Exposición a baja temperatura ambiental dentro de la sala de examen (necesaria para el mantenimiento técnico del equipo radiológico).\nPosible fatiga muscular derivada de la inmovilización postural requerida durante la adquisición de las proyecciones, o disconfort osteomioarticular asociado al decúbito sobre la mesa de exploración.'
  },
  {
    label: 'ALTERNATIVAS RAZONABLES A ESTE PROCEDIMIENTO',
    value: 'Ecografía mamaria (Ultrasonido). Limitación: No detecta microcalcificaciones con la misma sensibilidad que la mamografía; no es un método sustitutivo de tamizaje primario en población general.\nResonancia Magnética Mamaria (RMM). Limitación: Alta tasa de falsos positivos, requiere administración de medio de contraste (gadolinio) y no sustituye la evaluación inicial de microcalcificaciones.\nTomosíntesis (Mamografía 3D). Limitación: Utiliza radiación ionizante (variación avanzada del mismo principio físico de la mamografía estándar).\nMamografía por contraste (CEM). Limitación: Uso de contraste yodado (riesgo de refracción alérgica o nefrotoxicidad) y mayor exposición a radiación que el estudio convencional.'
  },
  {
    label: 'POSIBLES CONSECUENCIAS EN CASO QUE DECIDA NO ACEPTAR EL PROCEDIMIENTO',
    value: '- Diagnóstico tardío\n- Progresión de la enfermedad\n- Requerimiento de tratamientos más invasivos\n- Menor tasa de supervivencia\n- Pérdida de la ventana de oportunidad terapéutica'
  },
  {
    label: 'RIESGOS EN FUNCIÓN DE LA SITUACIÓN CLÍNICA DEL PACIENTE',
    value: '[Campo a completar según situación específica del paciente]'
  }
];

export class MamografiaPDFGenerator extends BasePDFGenerator {
  async generateFromData(data: MamografiaPDFData): Promise<jsPDF> {
    const baseData: BasePDFData = {
      documentMeta: {
        formatoNumero: 'FORMATO 33',
        titulo: 'CONSENTIMIENTO INFORMADO',
        subtitulo: 'TOMA MAMOGRAFIA',
        codigo: 'SC-M-09.33',
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
      procedureData: MAMOGRAFIA_PROCEDURE_DATA.map(item =>
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
export async function generateMamografiaPDF(data: MamografiaPDFData): Promise<jsPDF> {
  const generator = new MamografiaPDFGenerator();
  return await generator.generateFromData(data);
}
