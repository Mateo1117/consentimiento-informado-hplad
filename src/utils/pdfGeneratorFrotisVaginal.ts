import jsPDF from 'jspdf';
import { getLogoBase64 } from './pdfLogoHelper';

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
  patientSignature: string;
  professionalSignature: string;
  patientPhoto?: string | null;
  consentDecision: "aprobar" | "disentir";
  date: string;
  time: string;
}

export class FrotisVaginalPDFGenerator {
  private pdf: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number;
  private currentY: number;
  private logoBase64: string | null = null;

  constructor() {
    this.pdf = new jsPDF();
    this.pageWidth = this.pdf.internal.pageSize.getWidth();
    this.pageHeight = this.pdf.internal.pageSize.getHeight();
    this.margin = 20;
    this.currentY = this.margin;
  }

  async loadLogo(): Promise<void> {
    try {
      this.logoBase64 = await getLogoBase64();
    } catch (error) {
      console.error('Error loading logo:', error);
    }
  }

  async generate(data: FrotisVaginalPDFData): Promise<jsPDF> {
    await this.loadLogo();
    this.drawHeader(data);
    this.drawPatientData(data);
    this.drawGuardianData(data);
    this.drawProcedureData();
    
    if (data.consentDecision === 'aprobar') {
      // Patient accepts: draw consent section with signatures
      this.drawConsentText();
      this.drawSignatures(data);
    } else {
      // Patient declines: only draw dissent section
      this.drawDissentSection(data);
    }
    
    return this.pdf;
  }

  private drawHeader(data: FrotisVaginalPDFData) {
    // E.S.E HOSPITAL LA MESA - PEDRO LEÓN ÁLVAREZ DÍAZ - Formato estandarizado
    this.pdf.setFontSize(8);
    this.pdf.setFont('helvetica', 'bold');
    
    // Draw main border rectangle for header
    this.pdf.rect(this.margin, this.margin, this.pageWidth - 2 * this.margin, 25);
    
    // Left section - Hospital info with logo
    const leftBoxWidth = 50;
    this.pdf.rect(this.margin, this.margin, leftBoxWidth, 25);
    
    // Add logo if available
    if (this.logoBase64) {
      try {
        const logoSize = 21;
        const logoX = this.margin + 2;
        const logoY = this.margin + 2;
        this.pdf.addImage(this.logoBase64, 'PNG', logoX, logoY, logoSize, logoSize);
      } catch (error) {
        console.error('Error adding logo to PDF:', error);
        // Fallback to text if logo fails
        this.pdf.setFontSize(9);
        this.pdf.text('E.S.E', this.margin + 15, this.margin + 6);
        this.pdf.text('HOSPITAL', this.margin + 10, this.margin + 10);
        this.pdf.text('LA MESA', this.margin + 12, this.margin + 14);
        this.pdf.setFontSize(7);
        this.pdf.text('PEDRO LEÓN ÁLVAREZ DÍAZ', this.margin + 2, this.margin + 18);
      }
    } else {
      this.pdf.setFontSize(9);
      this.pdf.text('E.S.E', this.margin + 15, this.margin + 6);
      this.pdf.text('HOSPITAL', this.margin + 10, this.margin + 10);
      this.pdf.text('LA MESA', this.margin + 12, this.margin + 14);
      this.pdf.setFontSize(7);
      this.pdf.text('PEDRO LEÓN ÁLVAREZ DÍAZ', this.margin + 2, this.margin + 18);
    }
    
    // Center section - Format title
    const centerX = this.margin + leftBoxWidth;
    const centerWidth = this.pageWidth - 2 * this.margin - leftBoxWidth - 50;
    this.pdf.rect(centerX, this.margin, centerWidth, 25);
    
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('FORMATO 319', centerX + centerWidth/2 - 15, this.margin + 6);
    this.pdf.text('CONSENTIMIENTO INFORMADO', centerX + centerWidth/2 - 25, this.margin + 10);
    this.pdf.text('PARA FROTIS VAGINAL', centerX + centerWidth/2 - 25, this.margin + 14);
    
    // Right section - Code table
    const rightX = this.pageWidth - this.margin - 50;
    this.pdf.rect(rightX, this.margin, 50, 25);
    
    // Code sub-sections
    this.pdf.rect(rightX, this.margin, 25, 8);
    this.pdf.rect(rightX + 25, this.margin, 25, 8);
    this.pdf.setFontSize(6);
    this.pdf.text('Código', rightX + 2, this.margin + 5);
    this.pdf.text('SC-M-09.319', rightX + 27, this.margin + 5);
    
    this.pdf.rect(rightX, this.margin + 8, 25, 8);
    this.pdf.rect(rightX + 25, this.margin + 8, 25, 8);
    this.pdf.text('Versión', rightX + 2, this.margin + 13);
    this.pdf.text('01', rightX + 27, this.margin + 13);
    
    this.pdf.rect(rightX, this.margin + 16, 25, 9);
    this.pdf.rect(rightX + 25, this.margin + 16, 25, 9);
    this.pdf.text('Fecha', rightX + 2, this.margin + 21);
    this.pdf.text('16-06-2022', rightX + 26, this.margin + 21);
    
    this.currentY = this.margin + 30;
  }

  private drawPatientData(data: FrotisVaginalPDFData) {
    // Patient data section - FORMATO ESTANDARIZADO
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
    const sexo = data.patientData.sexo || 'N/D';
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

  private drawGuardianData(data: FrotisVaginalPDFData) {
    if (data.guardianData) {
      this.pdf.setFontSize(9);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text('DATOS DEL ACUDIENTE (Para menores de edad)', this.margin, this.currentY);
      this.currentY += 5;
      
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setFontSize(8);
      
      const guardianTableData = [
        ['NOMBRE COMPLETO:', data.guardianData.name],
        ['DOCUMENTO:', data.guardianData.document],
        ['PARENTESCO:', data.guardianData.relationship]
      ];
      
      const rowHeight = 6;
      const colWidth = (this.pageWidth - 2 * this.margin) / 2;
      
      guardianTableData.forEach(([label, value]) => {
        this.pdf.rect(this.margin, this.currentY, colWidth, rowHeight);
        this.pdf.rect(this.margin + colWidth, this.currentY, colWidth, rowHeight);
        
        this.pdf.text(label, this.margin + 2, this.currentY + 4);
        this.pdf.text(value, this.margin + colWidth + 2, this.currentY + 4);
        
        this.currentY += rowHeight;
      });
      
      this.currentY += 5;
    }
  }

  private drawProcedureData() {
    // Procedure section header - FORMATO ESTANDARIZADO
    this.pdf.setFillColor(240, 240, 240);
    this.pdf.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 6, 'F');
    
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('DATOS DEL PROCEDIMIENTO', this.margin + 2, this.currentY + 4);
    
    this.currentY += 8;
    
    // Procedure table - FORMATO ESTANDARIZADO
    const procedureData = [
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
        value: 'Ninguna'
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
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('CONSENTIMIENTO INFORMADO', this.margin, this.currentY);
    this.currentY += 5;
    
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(8);
    
    const consentText = `Declaro que he sido informado(a) sobre el procedimiento, sus beneficios, riesgos y alternativas. He tenido la oportunidad de hacer preguntas y todas han sido respondidas satisfactoriamente. Entiendo que ningún procedimiento está exento de riesgos. Autorizo la realización del procedimiento descrito.`;
    
    const lines = this.pdf.splitTextToSize(consentText, this.pageWidth - 2 * this.margin);
    this.pdf.text(lines, this.margin, this.currentY);
    this.currentY += lines.length * 4 + 10;
  }

  private drawSignatures(data: FrotisVaginalPDFData) {
    // Add space for signatures
    this.currentY += 10;
    
    if (this.currentY > this.pageHeight - 80) {
      this.pdf.addPage();
      this.currentY = this.margin;
    }
    
    // Signature section header
    this.pdf.setFillColor(240, 240, 240);
    this.pdf.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 6, 'F');
    
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('FIRMAS', this.margin + 2, this.currentY + 4);
    
    this.currentY += 10;
    
    // Signature boxes
    const boxWidth = 80;
    const boxHeight = 40;
    const spacing = 10;
    const startX = this.margin;
    
    // Patient signature
    this.pdf.rect(startX, this.currentY, boxWidth, boxHeight);
    this.pdf.setFontSize(8);
    this.pdf.setFont('helvetica', 'normal');
    
    // Add patient signature
    if (data.patientSignature && 
        typeof data.patientSignature === 'string' && 
        data.patientSignature.length > 50 && 
        data.patientSignature.startsWith('data:image/png;base64,')) {
      try {
        this.pdf.addImage(data.patientSignature, 'PNG', startX + 2, this.currentY + 2, boxWidth - 4, 30);
      } catch (error) {
        console.error('Error adding patient signature:', error);
      }
    }
    
    this.pdf.setFillColor(255, 255, 255);
    this.pdf.text('_________________________', startX + 5, this.currentY + boxHeight - 5);
    this.pdf.text('Firma Paciente/Acudiente', startX + 15, this.currentY + boxHeight + 5);
    this.pdf.text(`Doc: ${data.patientData.numeroDocumento}`, startX + 15, this.currentY + boxHeight + 10);
    
    // Professional signature
    const profX = startX + boxWidth + spacing;
    this.pdf.rect(profX, this.currentY, boxWidth, boxHeight);
    
    // Add professional signature
    if (data.professionalSignature && 
        typeof data.professionalSignature === 'string' &&
        data.professionalSignature.length > 50 && 
        data.professionalSignature.startsWith('data:image/png;base64,')) {
      try {
        this.pdf.addImage(data.professionalSignature, 'PNG', profX + 2, this.currentY + 2, boxWidth - 4, 30);
      } catch (error) {
        console.error('Error adding professional signature:', error);
      }
    }
    
    this.pdf.text('_________________________', profX + 5, this.currentY + boxHeight - 5);
    this.pdf.text('Firma Profesional', profX + 20, this.currentY + boxHeight + 5);
    this.pdf.text(`${data.professionalName}`, profX + 5, this.currentY + boxHeight + 10);
    this.pdf.text(`Doc: ${data.professionalDocument}`, profX + 5, this.currentY + boxHeight + 15);
    
    this.currentY += boxHeight + 25;
    
    // Add patient photo if available
    if (data.patientPhoto) {
      try {
        console.log('📸 Agregando foto del paciente al PDF');
        this.pdf.text('Foto del Paciente:', this.margin, this.currentY);
        this.currentY += 5;
        this.pdf.addImage(data.patientPhoto, 'JPEG', this.margin, this.currentY, 40, 30);
        this.currentY += 35;
        console.log('✅ Foto del paciente agregada exitosamente');
      } catch (error) {
        console.error('❌ Error adding patient photo:', error);
      }
    }
    
    // Date and time
    this.pdf.setFontSize(8);
    this.pdf.text(`Fecha: ${data.date} - Hora: ${data.time}`, this.margin, this.currentY);
    this.pdf.text(`Decisión: ${data.consentDecision === 'aprobar' ? 'APROBÓ el procedimiento' : 'DISENTIÓ el procedimiento'}`, this.margin, this.currentY + 5);
  }

  private drawDissentSection(data: FrotisVaginalPDFData) {
    this.currentY += 10;
    
    // Check if we need a new page
    if (this.currentY > this.pageHeight - 100) {
      this.pdf.addPage();
      this.currentY = this.margin;
    }
    
    // Separator line
    this.pdf.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 5;
    
    // Dissent section header
    this.pdf.setFillColor(240, 240, 240);
    this.pdf.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 6, 'F');
    
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('DECISIÓN DE DESISTIMIENTO', this.margin + 2, this.currentY + 4);
    
    this.currentY += 10;
    
    // Dissent text with filled patient name
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(8);
    
    const patientName = `${data.patientData.nombre} ${data.patientData.apellidos}`;
    const currentDate = new Date();
    const day = currentDate.getDate();
    const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                       'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const month = monthNames[currentDate.getMonth()];
    const year = currentDate.getFullYear();
    
    const dissentText = `Yo, ${patientName}, identificada(o) como aparece junto a mi firma/huella, actuando en nombre propio [X] / en calidad de representante legal [ ] de la/del paciente cuyo nombre e identificación están registrados en el encabezado de este documento, manifiesto -de forma libre, informada y consciente-, mi voluntad de retirar mi consentimiento respecto de la realización de la intervención/ del procedimiento arriba nombrado, que me/le había sido propuesta(o) realizarme (le). He sido informada(o) que, por causa de mi decisión, no cambia la disposición del equipo asistencial a proporcionarme (le) las alternativas de atención, con las limitaciones, que mi decisión genera; Manifiesto que me hago responsable de las consecuencias que puedan derivarse de esta decisión.`;
    
    const lines = this.pdf.splitTextToSize(dissentText, this.pageWidth - 2 * this.margin - 4);
    const textHeight = lines.length * 4;
    
    if (this.currentY + textHeight > this.pageHeight - this.margin - 40) {
      this.pdf.addPage();
      this.currentY = this.margin;
    }
    
    this.pdf.text(lines, this.margin + 2, this.currentY + 4);
    this.currentY += textHeight + 5;
    
    // Date text with filled values
    const dateText = `En manifestación de aceptación firmo/pongo mi huella en este documento a los ${day} días del mes de ${month} de ${year}`;
    const dateLines = this.pdf.splitTextToSize(dateText, this.pageWidth - 2 * this.margin - 4);
    this.pdf.text(dateLines, this.margin + 2, this.currentY + 4);
    this.currentY += dateLines.length * 4 + 10;
    
    // Signature section for withdrawal
    const document = data.guardianData ? data.guardianData.document : data.patientData.numeroDocumento;
    const boxWidth = 80;
    const boxHeight = 30;
    
    this.pdf.rect(this.margin, this.currentY, boxWidth, boxHeight);
    
    // Add patient signature for dissent
    if (data.patientSignature && 
        typeof data.patientSignature === 'string' && 
        data.patientSignature.length > 50 && 
        data.patientSignature.startsWith('data:image/png;base64,')) {
      try {
        this.pdf.addImage(data.patientSignature, 'PNG', this.margin + 2, this.currentY + 2, boxWidth - 4, 25);
      } catch (error) {
        console.error('Error adding dissent signature:', error);
      }
    }
    
    this.pdf.setFontSize(8);
    this.pdf.text('Firma paciente', this.margin + 2, this.currentY + boxHeight + 4);
    this.pdf.text(`Documento: ${document}`, this.margin + 2, this.currentY + boxHeight + 8);
    this.pdf.text('Decisión: DISENTIÓ el procedimiento', this.margin + 2, this.currentY + boxHeight + 12);
  }

  private calculateTextHeight(text: string, maxWidth: number): number {
    const lines = this.pdf.splitTextToSize(text, maxWidth);
    return lines.length * 4;
  }
}

export async function generateFrotisVaginalPDF(data: FrotisVaginalPDFData): Promise<jsPDF> {
  const generator = new FrotisVaginalPDFGenerator();
  return await generator.generate(data);
}