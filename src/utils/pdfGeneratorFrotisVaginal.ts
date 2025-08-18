import jsPDF from 'jspdf';

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

  constructor() {
    this.pdf = new jsPDF();
    this.pageWidth = this.pdf.internal.pageSize.getWidth();
    this.pageHeight = this.pdf.internal.pageSize.getHeight();
    this.margin = 20;
    this.currentY = this.margin;
  }

  generate(data: FrotisVaginalPDFData): jsPDF {
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
    // Hospital logo and header with table format
    this.pdf.setFontSize(8);
    this.pdf.setFont('helvetica', 'bold');
    
    // Create table header
    const headerHeight = 25;
    this.pdf.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, headerHeight);
    
    // Left column - Hospital info
    const leftColWidth = (this.pageWidth - 2 * this.margin) * 0.6;
    this.pdf.line(this.margin + leftColWidth, this.currentY, this.margin + leftColWidth, this.currentY + headerHeight);
    
    this.pdf.text('HOSPITAL DE LA MESA', this.margin + 2, this.currentY + 5);
    this.pdf.text('CONSENTIMIENTO INFORMADO', this.margin + 2, this.currentY + 10);
    this.pdf.text('PARA FROTIS VAGINAL', this.margin + 2, this.currentY + 15);
    this.pdf.text('Formato 319 Ver. 0 - VIGENTE A PARTIR DEL 16/JUN/2022', this.margin + 2, this.currentY + 20);
    
    // Right column - Patient basic info
    const rightColX = this.margin + leftColWidth + 2;
    this.pdf.text('NOMBRE COMPLETO:', rightColX, this.currentY + 5);
    this.pdf.text(`${data.patientData.nombre} ${data.patientData.apellidos}`, rightColX, this.currentY + 8);
    this.pdf.text(`SEXO: ${data.patientData.sexo || 'N/D'}`, rightColX, this.currentY + 12);
    this.pdf.text(`FECHA Y HORA: ${data.date} - ${data.time}`, rightColX, this.currentY + 16);
    this.pdf.text(`EDAD: ${data.patientData.edad} años`, rightColX, this.currentY + 20);
    
    this.currentY += headerHeight + 5;
  }

  private drawPatientData(data: FrotisVaginalPDFData) {
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('DATOS DEL PACIENTE', this.margin, this.currentY);
    this.currentY += 5;
    
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(8);
    
    // Create patient data table
    const tableData = [
      [`DOCUMENTO - N° HC:`, `${data.patientData.tipoDocumento} ${data.patientData.numeroDocumento}`],
      ['FECHA DE NACIMIENTO:', data.patientData.fechaNacimiento],
      ['EPS:', data.patientData.eps],
      ['TELÉFONO:', data.patientData.telefono],
      ['DIRECCIÓN:', data.patientData.direccion],
      ['CENTRO DE SALUD:', data.patientData.centroSalud]
    ];
    
    const rowHeight = 6;
    const colWidth = (this.pageWidth - 2 * this.margin) / 2;
    
    tableData.forEach(([label, value]) => {
      this.pdf.rect(this.margin, this.currentY, colWidth, rowHeight);
      this.pdf.rect(this.margin + colWidth, this.currentY, colWidth, rowHeight);
      
      this.pdf.text(label, this.margin + 2, this.currentY + 4);
      this.pdf.text(value, this.margin + colWidth + 2, this.currentY + 4);
      
      this.currentY += rowHeight;
    });
    
    this.currentY += 5;
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
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('PROCEDIMIENTO: FROTIS VAGINAL - CULTIVO RECTO-VAGINAL', this.margin, this.currentY);
    this.currentY += 8;
    
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(8);
    
    const sections = [
      {
        title: 'DESCRIPCIÓN:',
        content: 'Se toma una muestra de secreción de flujo del área vaginal o rectal, utilizando aplicadores, solución salina, tubo de ensayo, medio de cultivo, laminillas, espéculo. Este material utilizado es totalmente desechable. En el caso de ser menor de edad o no haber tenido relaciones sexuales no se utilizará espéculo para la toma de la muestra.'
      },
      {
        title: 'BENEFICIOS:',
        content: 'Orientar y/o confirmar un diagnóstico y realizar seguimiento oportuno de una condición en salud, que permita dar pautas de tratamiento oportuno.'
      },
      {
        title: 'RIESGOS:',
        content: 'Frotis vaginal: Ardor, dolor, picazón o incomodidad al momento de introducir el espéculo y el aplicador.'
      },
      {
        title: 'IMPLICACIONES:',
        content: 'Sangrado, dolor pélvico, laceración cervicouterina.'
      },
      {
        title: 'ALTERNATIVAS:',
        content: 'Ninguna'
      }
    ];

    sections.forEach(section => {
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text(section.title, this.margin, this.currentY);
      this.currentY += 4;
      
      this.pdf.setFont('helvetica', 'normal');
      const lines = this.pdf.splitTextToSize(section.content, this.pageWidth - 2 * this.margin - 10);
      this.pdf.text(lines, this.margin + 5, this.currentY);
      this.currentY += lines.length * 3 + 3;
    });
    
    this.currentY += 5;
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

export function generateFrotisVaginalPDF(data: FrotisVaginalPDFData): jsPDF {
  const generator = new FrotisVaginalPDFGenerator();
  return generator.generate(data);
}