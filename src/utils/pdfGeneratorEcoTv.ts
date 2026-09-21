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

interface EcoTvPDFData {
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

// Datos del procedimiento, tomados del formato SC-F-09.35 versión 0.3 del hospital
const ECO_TV_PROCEDURE_DATA: BasePDFProcedureItem[] = [
  {
    label: 'PROCEDIMIENTO',
    value: 'ULTRASONIDO TRANSVAGINAL'
  },
  {
    label: 'DESCRIPCIÓN DEL PROCEDIMIENTO',
    value: 'La ecografía o ultrasonido transvaginal es un estudio de diagnóstico por imágenes de alta resolución que utiliza ondas sonoras de alta frecuencia (ultrasonido) para la evaluación morfológica y hemodinámica de los órganos pélvicos femeninos (útero, ovarios, trompas de Falopio y miometrio). Se introduce a través del canal vaginal un transductor endocavitario estéril, protegido con una cubierta de látex (o material hipoalergénico) y lubricado con gel hidrosoluble. La proximidad del transductor a las estructuras pélvicas permite obtener imágenes de mayor definición que las obtenidas por vía pélvica abdominal. El procedimiento se realiza en posición de litotomía (ginecológica) y requiere vejiga evacuada.'
  },
  {
    label: 'PROPÓSITO',
    value: 'Evaluación diagnóstica de sangrado uterino anormal, masas pélvicas, dolor pélvico agudo o crónico, seguimiento folicular en reproducción asistida, caracterización de patología anexial o miomatosa, y valoración obstétrica temprana (primer trimestre). .'
  },
  {
    label: 'BENEFICIOS ESPERADOS',
    value: '1. Definición anatómica superior de la mucosa endometrial, reserva folicular y vascularización pélvica mediante Doppler.\n2. Examen completamente inocuo para la paciente y, en caso de embarazo temprano, para el embrión.\n3. Diagnóstico inmediato sin requerir preparación con vejiga llena'
  },
  {
    label: 'RIESGOS Y POSIBLES COMPLICACIONES',
    value: 'Son Riesgos:\n1. Limitación técnica por presencia de gas o masa exofítica.\n2. Reacción de hipersensibilidad al látex o gel. Alergia local (eritema, prurito, ardor) al material de la cubierta del transductor o a los componentes del gel lubricante.\n3. Riesgo de sobrediagnóstico o falta de detección de patología infiltrativa compleja (como endometriosis profunda), requiriendo estudios complementarios como la Resonancia Magnética.\n\nSon Complicaciones:\n1. Respuesta neurogénica transitoria (mareo, diaforesis, hipotensión) secundaria al dolor o la ansiedad durante el posicionamiento del transductor.\n2. Excoriación superficial o sangrado escaso en pacientes con atrofia vaginal severa, estenosis vaginal o estadios post-radioterapia pélvica.\n3. Incremento temporal del dolor en procesos inflamatorios/infecciosos pélvicos agudos'
  },
  {
    label: 'IMPLICACIONES',
    value: 'Puede generar incomodidad, ansiedad, pudor o dolor; la paciente puede informar estas sensaciones.\nPueden identificarse hallazgos incidentales o indeterminados que requieran seguimiento, valoración médica o estudios adicionales; el ultrasonido por sí solo no siempre establece un diagnóstico definitivo.'
  },
  {
    label: 'EFECTOS INEVITABLES',
    value: '1. Sensación de presión o molestia transitoria introducida por la manipulación y rotación manual del transductor para la alineación de los planos de corte anatómicos. 2. Restos de gel lubricante hidrosoluble en la zona vulvovaginal tras la extracción del transductor.'
  },
  {
    label: 'ALTERNATIVAS RAZONABLES A ESTE PROCEDIMIENTO',
    value: '1. Ecografía pélvica transabdominal. Evaluación con transductor convexo a través de la pared abdominal. Requiere vejiga distendida y ofrece menor resolución de detalles profundos. 2. Resonancia Magnética Pélvica: Indicada en casos de caracterización compleja de masas anexiales, mapeo de endometriosis profunda o contraindicación absoluta para el abordaje transvaginal.'
  },
  {
    label: 'POSIBLES CONSECUENCIAS EN CASO QUE DECIDA NO ACEPTAR EL PROCEDIMIENTO',
    value: '- Diagnóstico impreciso o tardío\n- Retraso en la detección de complicaciones de embarazo inicial\n- Progresión de patologías pélvicas'
  },
  {
    label: 'RIESGOS EN FUNCIÓN DE LA SITUACIÓN CLÍNICA DEL PACIENTE',
    value: '[Campo a completar según situación específica del paciente]'
  }
];

export class EcoTvPDFGenerator extends BasePDFGenerator {
  async generateFromData(data: EcoTvPDFData): Promise<jsPDF> {
    const baseData: BasePDFData = {
      documentMeta: {
        formatoNumero: 'FORMATO 35',
        titulo: 'CONSENTIMIENTO INFORMADO',
        subtitulo: 'PARA ULTRASONIDO TRANSVAGINAL',
        codigo: 'SC-F-09.35',
        version: '0.3',
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
      procedureData: ECO_TV_PROCEDURE_DATA.map(item =>
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
export async function generateEcoTvPDF(data: EcoTvPDFData): Promise<jsPDF> {
  const generator = new EcoTvPDFGenerator();
  return await generator.generateFromData(data);
}
