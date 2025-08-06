import jsPDF from 'jspdf';

interface PatientData {
  nombre: string;
  apellidos: string;
  tipoDocumento: string;
  numeroDocumento: string;
  fechaNacimiento: string;
  edad: number;
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

export class CargaGlucosaPDFGenerator {
  private pdf: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number;
  private currentY: number;
  private lineHeight: number;

  constructor() {
    this.pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    this.pageWidth = this.pdf.internal.pageSize.getWidth();
    this.pageHeight = this.pdf.internal.pageSize.getHeight();
    this.margin = 10;
    this.currentY = this.margin;
    this.lineHeight = 4;
  }

  generate(data: CargaGlucosaPDFData): jsPDF {
    this.drawHeader(data);
    this.drawPatientData(data);
    this.drawGuardianData(data);
    this.drawProcedureData();
    this.drawConsentText();
    this.drawSignatures(data);
    
    // Add second page for withdrawal decision
    this.pdf.addPage();
    this.currentY = this.margin;
    this.drawWithdrawalPage(data);
    
    return this.pdf;
  }

  private drawHeader(data: CargaGlucosaPDFData) {
    // Hospital logo and header
    this.pdf.setFontSize(8);
    this.pdf.setFont('helvetica', 'bold');
    
    // Draw main border rectangle for header
    this.pdf.rect(this.margin, this.margin, this.pageWidth - 2 * this.margin, 25);
    
    // Left section - Hospital info
    const leftBoxWidth = 50;
    this.pdf.rect(this.margin, this.margin, leftBoxWidth, 25);
    
    this.pdf.setFontSize(9);
    this.pdf.text('E.S.E', this.margin + 15, this.margin + 6);
    this.pdf.text('HOSPITAL', this.margin + 10, this.margin + 10);
    this.pdf.text('LA MESA', this.margin + 12, this.margin + 14);
    this.pdf.setFontSize(7);
    this.pdf.text('PEDRO LEÓN ÁLVAREZ DÍAZ', this.margin + 2, this.margin + 18);
    
    // Center section - Format title
    const centerX = this.margin + leftBoxWidth;
    const centerWidth = this.pageWidth - 2 * this.margin - leftBoxWidth - 50;
    this.pdf.rect(centerX, this.margin, centerWidth, 25);
    
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('FORMATO 119', centerX + centerWidth/2 - 15, this.margin + 6);
    this.pdf.text('CONSENTIMIENTO INFORMADO', centerX + centerWidth/2 - 25, this.margin + 10);
    this.pdf.text('PARA CARGA DE GLUCOSA', centerX + centerWidth/2 - 25, this.margin + 14);
    
    // Right section - Code table
    const rightX = this.pageWidth - this.margin - 50;
    this.pdf.rect(rightX, this.margin, 50, 25);
    
    // Code sub-sections
    this.pdf.rect(rightX, this.margin, 25, 8);
    this.pdf.rect(rightX + 25, this.margin, 25, 8);
    this.pdf.setFontSize(6);
    this.pdf.text('Código', rightX + 2, this.margin + 5);
    this.pdf.text('SC-M-09.119', rightX + 27, this.margin + 5);
    
    this.pdf.rect(rightX, this.margin + 8, 25, 8);
    this.pdf.rect(rightX + 25, this.margin + 8, 25, 8);
    this.pdf.text('Versión', rightX + 2, this.margin + 13);
    this.pdf.text('01', rightX + 27, this.margin + 13);
    
    this.pdf.rect(rightX, this.margin + 16, 25, 9);
    this.pdf.rect(rightX + 25, this.margin + 16, 25, 9);
    this.pdf.text('Fecha', rightX + 2, this.margin + 21);
    this.pdf.text('20-10-2024', rightX + 26, this.margin + 21);
    
    this.currentY = this.margin + 30;
  }

  private drawPatientData(data: CargaGlucosaPDFData) {
    // Patient data section
    this.pdf.setFillColor(240, 240, 240);
    this.pdf.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 6, 'F');
    
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('DATOS DEL PACIENTE', this.margin + 2, this.currentY + 4);
    
    this.currentY += 8;
    
    // Patient table
    const tableStartY = this.currentY;
    const tableWidth = this.pageWidth - 2 * this.margin;
    const colWidths = [60, 20, 30, 20, 30, 30];
    
    // Headers
    this.pdf.setFontSize(7);
    this.pdf.setFont('helvetica', 'bold');
    
    let currentX = this.margin;
    const headers = ['NOMBRE COMPLETO', 'SEXO', 'FECHA Y HORA', 'EDAD', 'EAPB', 'RÉGIMEN'];
    
    for (let i = 0; i < headers.length; i++) {
      this.pdf.rect(currentX, tableStartY, colWidths[i], 8);
      this.pdf.text(headers[i], currentX + 2, tableStartY + 5);
      currentX += colWidths[i];
    }
    
    // Data row
    this.pdf.setFont('helvetica', 'normal');
    currentX = this.margin;
    const patientName = `${data.patientData.nombre} ${data.patientData.apellidos}`;
    const sexo = 'M'; // This would need to be added to patient data
    const fechaHora = `${data.date} ${data.time}`;
    
    const dataValues = [
      patientName,
      sexo,
      fechaHora,
      data.patientData.edad.toString(),
      data.patientData.eps,
      'S' // Régimen - would need to be added to patient data
    ];
    
    for (let i = 0; i < dataValues.length; i++) {
      this.pdf.rect(currentX, tableStartY + 8, colWidths[i], 8);
      // Wrap text if too long
      const lines = this.pdf.splitTextToSize(dataValues[i], colWidths[i] - 2);
      this.pdf.text(lines, currentX + 1, tableStartY + 13);
      currentX += colWidths[i];
    }
    
    // Document section
    this.currentY = tableStartY + 18;
    const docTableY = this.currentY;
    
    // Document headers
    this.pdf.setFont('helvetica', 'bold');
    const docHeaders = ['DOCUMENTO - N° HC', 'TIPO', 'EDAD'];
    const docColWidths = [50, 30, 20];
    
    currentX = this.margin;
    for (let i = 0; i < docHeaders.length; i++) {
      this.pdf.rect(currentX, docTableY, docColWidths[i], 8);
      this.pdf.text(docHeaders[i], currentX + 2, docTableY + 5);
      currentX += docColWidths[i];
    }
    
    // Document data
    this.pdf.setFont('helvetica', 'normal');
    currentX = this.margin;
    const docValues = [data.patientData.numeroDocumento, data.patientData.tipoDocumento, data.patientData.edad.toString()];
    
    for (let i = 0; i < docValues.length; i++) {
      this.pdf.rect(currentX, docTableY + 8, docColWidths[i], 8);
      this.pdf.text(docValues[i], currentX + 1, docTableY + 13);
      currentX += docColWidths[i];
    }
    
    this.currentY = docTableY + 20;
  }

  private drawGuardianData(data: CargaGlucosaPDFData) {
    if (!data.guardianData) return;
    
    // Guardian section header
    this.pdf.setFillColor(240, 240, 240);
    this.pdf.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 6, 'F');
    
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('DATOS DEL ACUDIENTE O REPRESENTANTE', this.margin + 2, this.currentY + 4);
    
    this.currentY += 8;
    
    // Guardian table
    const guardianTableY = this.currentY;
    const guardianHeaders = ['NOMBRE COMPLETO:', 'DOCUMENTO:'];
    const guardianColWidths = [100, 80];
    
    let currentX = this.margin;
    for (let i = 0; i < guardianHeaders.length; i++) {
      this.pdf.rect(currentX, guardianTableY, guardianColWidths[i], 8);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text(guardianHeaders[i], currentX + 2, guardianTableY + 5);
      currentX += guardianColWidths[i];
    }
    
    // Guardian data
    currentX = this.margin;
    const guardianValues = [data.guardianData.name, data.guardianData.document];
    
    for (let i = 0; i < guardianValues.length; i++) {
      this.pdf.rect(currentX, guardianTableY + 8, guardianColWidths[i], 8);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.text(guardianValues[i], currentX + 1, guardianTableY + 13);
      currentX += guardianColWidths[i];
    }
    
    // Phone and relationship
    this.currentY = guardianTableY + 18;
    const phoneRelTableY = this.currentY;
    
    currentX = this.margin;
    this.pdf.rect(currentX, phoneRelTableY, 100, 8);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('TELÉFONO:', currentX + 2, phoneRelTableY + 5);
    
    this.pdf.rect(currentX + 100, phoneRelTableY, 80, 8);
    this.pdf.text('VÍNCULO O PARENTESCO CON EL PACIENTE:', currentX + 102, phoneRelTableY + 5);
    
    // Phone and relationship data
    this.pdf.rect(currentX, phoneRelTableY + 8, 100, 8);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(data.guardianData.phone || '', currentX + 1, phoneRelTableY + 13);
    
    this.pdf.rect(currentX + 100, phoneRelTableY + 8, 80, 8);
    this.pdf.text(data.guardianData.relationship, currentX + 101, phoneRelTableY + 13);
    
    this.currentY = phoneRelTableY + 20;
  }

  private drawProcedureData() {
    // Procedure section header
    this.pdf.setFillColor(240, 240, 240);
    this.pdf.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 6, 'F');
    
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('DATOS DEL PROCEDIMIENTO', this.margin + 2, this.currentY + 4);
    
    this.currentY += 8;
    
    // Procedure table
    const procedureData = [
      {
        label: 'PROCEDIMIENTO',
        value: 'ADMINISTRACIÓN ORAL DE CARGA DE GLUCOSA (DEXTROSA ANHIDRA)'
      },
      {
        label: 'DESCRIPCIÓN DEL PROCEDIMIENTO',
        value: 'Consiste en suministrar vía oral una bebida que contiene una cantidad estandarizada de glucosa (dextrosa anhidra) en agua para ser evaluada. No se administra este procedimiento si el paciente está indispuesto, o ha presentado episodios de fiebre, vómito o diarrea en las 24 horas anteriores a la toma de la muestra.'
      },
      {
        label: 'PROPÓSITO',
        value: 'Analizar los niveles de azúcar en sangre y la reacción del organismo a la ingesta de la carga de glucosa.'
      },
      {
        label: 'BENEFICIOS ESPERADOS',
        value: 'Orientar y/o confirmar un diagnóstico frente a los niveles de glucosa en el paciente o estado metabólico del organismo. Seguimiento de una enfermedad o condición en salud.'
      },
      {
        label: 'RIESGOS POSIBLES COMPLICACIONES',
        value: 'Malestar, náuseas, vómito, diarrea, mareo o reacciones alérgicas, urticaria o asma. Si el paciente es diabético debe tener información y/o indicaciones administrativas bajo prescripción médica.'
      },
      {
        label: 'IMPLICACIONES',
        value: 'Tiempo de permanencia en el laboratorio es de dos (2) a tres (3) horas dependiendo del examen solicitado (curva de glicemia pre y pos carga), múltiples punciones por el número de muestras requeridas.'
      },
      {
        label: 'EFECTOS INEVITABLES',
        value: 'Náuseas o molestia por el sabor azucarado'
      },
      {
        label: 'ALTERNATIVAS RAZONABLES A ESTE PROCEDIMIENTO',
        value: 'Ninguna'
      },
      {
        label: 'POSIBLES CONSECUENCIAS EN CASO QUE DECIDA NO ACEPTAR EL PROCEDIMIENTO',
        value: 'Impide a los médicos tratantes tener información valiosa para determinar, confirmar o ajustar el diagnóstico y tratamiento médico.'
      }
    ];
    
    for (const item of procedureData) {
      const itemHeight = this.calculateTextHeight(item.value, this.pageWidth - 80);
      const totalHeight = Math.max(itemHeight + 6, 12);
      
      // Check if we need a new page
      if (this.currentY + totalHeight > this.pageHeight - this.margin) {
        this.pdf.addPage();
        this.currentY = this.margin;
      }
      
      // Draw label cell
      this.pdf.rect(this.margin, this.currentY, 40, totalHeight);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setFontSize(7);
      const labelLines = this.pdf.splitTextToSize(item.label, 38);
      this.pdf.text(labelLines, this.margin + 1, this.currentY + 4);
      
      // Draw value cell
      this.pdf.rect(this.margin + 40, this.currentY, this.pageWidth - 2 * this.margin - 40, totalHeight);
      this.pdf.setFont('helvetica', 'normal');
      const valueLines = this.pdf.splitTextToSize(item.value, this.pageWidth - 2 * this.margin - 42);
      this.pdf.text(valueLines, this.margin + 41, this.currentY + 4);
      
      this.currentY += totalHeight;
    }
  }

  private drawConsentText() {
    this.currentY += 5;
    
    // Consent section header
    this.pdf.setFillColor(240, 240, 240);
    this.pdf.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 6, 'F');
    
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('CONSENTIMIENTO', this.margin + 2, this.currentY + 4);
    
    this.currentY += 10;
    
    // Consent text
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(8);
    
    const consentTexts = [
      'Yo, identificado(a) como aparece junto a mi firma/huella, hago constar que he recibido información clara relacionada con: Garantía de confidencialidad en que los mis datos responsable y demás información. Yo entiendo la naturaleza de la información proporcionada y la forma apropiada en que esta podrá ser comunicada a personas, o a las autoridades competentes según mi caso. También me informaron sobre el procedimiento en sí, su propósito, los beneficios esperados, los posibles riesgos o complicaciones en caso que decida no aceptar el procedimiento, las posibles molestias, la posibilidad de participación de personal en formación bajo supervisión.',
      '',
      'Fui informado(a) también que: a) Puedo denegar mi consentimiento, sin que ello implique desmejora del trato que recibiré de parte del equipo de salud, b) puedo acceder a los servicios de salud en cualquier momento, aún luego de haber disentido.',
      'En este momento este documento, aunque acepto será real(izados) la(s) intervención(es), puedo retirar mi consentimiento de manera parcial o total, cualquiera momento hasta el límite en donde el profesional, según su criterio técnico y científico y con justificar mi decisión; c) Que en caso tal que mi decisión sea anular o cancelar, mi consentimiento, dejaré constancia de ello por escrito firmado y con fecha del día.',
      '',
      'Actuando en nombre propio ( ) y en calidad de representante legal ( ) de la(del) paciente cuyos nombres e identificación están registrados en el encabezado de este documento, autorizo al personal asistencial de esta institución, para que me/le realice el/los procedimiento(s) enseñida señalado(s) y, en caso de ser necesario, tome las medidas y conductas médicas necesarias para salvaguardar mi integridad física, de acuerdo a como se presenten las situaciones imprevistas en el curso del procedimiento.',
      '',
      'En manifestación de aceptación firmo/pongo mi huella en este documento a los _______ días del mes de __________ de 20_____'
    ];
    
    for (const text of consentTexts) {
      if (text === '') {
        this.currentY += 3;
        continue;
      }
      
      const lines = this.pdf.splitTextToSize(text, this.pageWidth - 2 * this.margin - 4);
      const textHeight = lines.length * 4;
      
      if (this.currentY + textHeight > this.pageHeight - this.margin - 40) {
        this.pdf.addPage();
        this.currentY = this.margin;
      }
      
      this.pdf.text(lines, this.margin + 2, this.currentY + 4);
      this.currentY += textHeight;
    }
  }

  private drawSignatures(data: CargaGlucosaPDFData) {
    // Add space for signatures
    this.currentY += 10;
    
    if (this.currentY > this.pageHeight - 60) {
      this.pdf.addPage();
      this.currentY = this.margin;
    }
    
    // Signature boxes
    const boxWidth = 60;
    const boxHeight = 20;
    const startX = this.margin + 10;
    
    // Patient signature
    this.pdf.rect(startX, this.currentY, boxWidth, boxHeight);
    this.pdf.setFontSize(8);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text('_________________________', startX + 5, this.currentY + boxHeight - 5);
    this.pdf.text('Firma paciente', startX + 15, this.currentY + boxHeight + 5);
    
    // Professional signature
    this.pdf.rect(startX + boxWidth + 10, this.currentY, boxWidth, boxHeight);
    this.pdf.text('_________________________', startX + boxWidth + 15, this.currentY + boxHeight - 5);
    this.pdf.text('Firma Representante legal:', startX + boxWidth + 10, this.currentY + boxHeight + 5);
    
    // Professional details
    this.pdf.rect(startX + 2 * (boxWidth + 10), this.currentY, boxWidth, boxHeight);
    this.pdf.text('Nombre y documento de quien toma el', startX + 2 * (boxWidth + 10) + 2, this.currentY + boxHeight + 5);
    this.pdf.text('consentimiento:', startX + 2 * (boxWidth + 10) + 2, this.currentY + boxHeight + 10);
    
    this.currentY += boxHeight + 20;
    
    // Document numbers
    const docY = this.currentY;
    this.pdf.text('Documento:___________________', startX, docY);
    this.pdf.text('Documento: ___________________', startX + boxWidth + 10, docY);
    this.pdf.text('Documento: ___________________', startX + 2 * (boxWidth + 10), docY);
  }

  private drawWithdrawalPage(data: CargaGlucosaPDFData) {
    // Header for second page
    this.drawHeader(data);
    
    // Withdrawal section
    this.pdf.setFillColor(240, 240, 240);
    this.pdf.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 8, 'F');
    
    this.pdf.setFontSize(12);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('DECISIÓN DE DESISTIMIENTO', this.pageWidth/2 - 30, this.currentY + 6);
    
    this.currentY += 15;
    
    // Withdrawal text
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(9);
    
    const withdrawalText = `Yo, identificado(a) como aparece junto a mi firma/huella, actuando en nombre propio ( ) en calidad de representante legal ( ) del(del) paciente cuya nombre e identificación registrada en el encabezado de procedimiento arriba nombrado, que me/le había sido propuesto(a) realizar(me/le). He sido informado(a) que, con esta decisión, renuncio - de forma libre, informada y consciente, mi voluntad de retirar mi consentimiento respecto de la realización de la intervención del procedimiento arriba nombrado, que me/le había sido propuesto(a) realizar(me/le). He sido informado(a) que, con esta decisión, renuncio la disposición del equipo asistencial a proporcionarme (le) las alternativas de atención, con las limitaciones, que mi decisión genera. Manifiesto que me hago responsable de las consecuencias que puedan derivarse de esta decisión.

En manifestación de aceptación firmo/pongo mi huella en este documento a los _______ días del mes de __________ de 20_____`;
    
    const lines = this.pdf.splitTextToSize(withdrawalText, this.pageWidth - 2 * this.margin - 4);
    this.pdf.text(lines, this.margin + 2, this.currentY);
    
    this.currentY += lines.length * 4 + 20;
    
    // Signature boxes for withdrawal
    const boxWidth = 60;
    const boxHeight = 20;
    const startX = this.margin + 10;
    
    // Patient signature
    this.pdf.rect(startX, this.currentY, boxWidth, boxHeight);
    this.pdf.setFontSize(8);
    this.pdf.text('_________________________', startX + 5, this.currentY + boxHeight - 5);
    this.pdf.text('Firma paciente', startX + 15, this.currentY + boxHeight + 5);
    
    // Professional signature
    this.pdf.rect(startX + boxWidth + 10, this.currentY, boxWidth, boxHeight);
    this.pdf.text('_________________________', startX + boxWidth + 15, this.currentY + boxHeight - 5);
    this.pdf.text('Firma Representante legal:', startX + boxWidth + 10, this.currentY + boxHeight + 5);
    
    // Professional details
    this.pdf.rect(startX + 2 * (boxWidth + 10), this.currentY, boxWidth, boxHeight);
    this.pdf.text('Nombre y documento de quien toma el', startX + 2 * (boxWidth + 10) + 2, this.currentY + boxHeight + 5);
    this.pdf.text('desistimiento:', startX + 2 * (boxWidth + 10) + 2, this.currentY + boxHeight + 10);
    
    this.currentY += boxHeight + 20;
    
    // Document numbers
    const docY = this.currentY;
    this.pdf.text('Documento:___________________', startX, docY);
    this.pdf.text('Documento: ___________________', startX + boxWidth + 10, docY);
    this.pdf.text('Documento: ___________________', startX + 2 * (boxWidth + 10), docY);
  }

  private calculateTextHeight(text: string, maxWidth: number): number {
    const lines = this.pdf.splitTextToSize(text, maxWidth);
    return lines.length * 4;
  }
}

export function generateCargaGlucosaPDF(data: CargaGlucosaPDFData): jsPDF {
  const generator = new CargaGlucosaPDFGenerator();
  return generator.generate(data);
}