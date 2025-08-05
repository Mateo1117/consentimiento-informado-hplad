import jsPDF from 'jspdf';
import { PatientData } from '@/services/patientApi';

interface FrotisVaginalData {
  patientData: PatientData;
  professionalName: string;
  professionalDocument: string;
  signatureData?: string;
  date: string;
  time: string;
}

export class PDFGeneratorFrotisVaginal {
  private pdf: jsPDF;
  private margin = 20;
  private currentY = 20;
  private pageWidth = 210;
  private pageHeight = 297;

  constructor() {
    this.pdf = new jsPDF('p', 'mm', 'a4');
    this.pdf.setFont('helvetica');
  }

  generate(data: FrotisVaginalData): jsPDF {
    this.drawHeader();
    this.drawPatientData(data);
    this.drawProcedureData();
    this.drawConsent();
    this.drawSignatures(data);
    this.drawFooter();
    
    return this.pdf;
  }

  private drawHeader() {
    // Logo area
    this.pdf.setFillColor(255, 255, 255);
    this.pdf.rect(this.margin, this.currentY, 30, 25, 'F');
    
    // Hospital name
    this.pdf.setFontSize(12);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('E.S.E', this.margin + 32, this.currentY + 8);
    this.pdf.text('HOSPITAL PEDRO LEON', this.margin + 32, this.currentY + 12);
    this.pdf.text('ALVAREZ DIAZ DE LA MESA', this.margin + 32, this.currentY + 16);
    
    // Form title
    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('FORMATO 118', this.pageWidth - 50, this.currentY + 5);
    this.pdf.text('CONSENTIMIENTO INFORMADO', 105, this.currentY + 10, { align: 'center' });
    this.pdf.text('PARA TOMA DE MUESTRAS FROTIS VAGINAL-', 105, this.currentY + 15, { align: 'center' });
    this.pdf.text('CULTIVO RECTO-VAGINAL', 105, this.currentY + 20, { align: 'center' });
    
    // Code box
    this.pdf.setLineWidth(0.5);
    this.pdf.rect(this.pageWidth - 60, this.currentY, 40, 25);
    this.pdf.setFontSize(8);
    this.pdf.text('Código', this.pageWidth - 58, this.currentY + 5);
    this.pdf.text('SC-M.09.118', this.pageWidth - 35, this.currentY + 5);
    this.pdf.text('Versión', this.pageWidth - 58, this.currentY + 10);
    this.pdf.text('01', this.pageWidth - 35, this.currentY + 10);
    this.pdf.text('Fecha', this.pageWidth - 58, this.currentY + 15);
    this.pdf.text('20-04-2024', this.pageWidth - 35, this.currentY + 15);
    
    this.currentY += 35;
  }

  private drawPatientData(data: FrotisVaginalData) {
    // Patient data header
    this.pdf.setFillColor(200, 200, 200);
    this.pdf.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 8, 'F');
    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('DATOS DEL PACIENTE', 105, this.currentY + 5, { align: 'center' });
    
    this.currentY += 10;
    
    // Patient info grid
    this.pdf.setLineWidth(0.3);
    
    // First row - Name, Sex, Date and Time
    this.pdf.rect(this.margin, this.currentY, 120, 8);
    this.pdf.rect(this.margin + 120, this.currentY, 25, 8);
    this.pdf.rect(this.margin + 145, this.currentY, 45, 8);
    
    this.pdf.setFontSize(8);
    this.pdf.text('NOMBRE COMPLETO', this.margin + 2, this.currentY + 3);
    this.pdf.text('SEXO', this.margin + 122, this.currentY + 3);
    this.pdf.text('FECHA Y HORA', this.margin + 147, this.currentY + 3);
    
    this.currentY += 8;
    
    // Patient name
    this.pdf.rect(this.margin, this.currentY, 120, 10);
    this.pdf.setFontSize(10);
    this.pdf.text(`${data.patientData.nombre} ${data.patientData.apellidos}`.trim(), this.margin + 2, this.currentY + 6);
    
    // Sex checkboxes
    this.pdf.rect(this.margin + 120, this.currentY, 12.5, 10);
    this.pdf.rect(this.margin + 132.5, this.currentY, 12.5, 10);
    this.pdf.setFontSize(8);
    this.pdf.text('F', this.margin + 124, this.currentY + 3);
    this.pdf.text('M', this.margin + 136, this.currentY + 3);
    
    // Mark F by default (can be customized later)
    this.pdf.text('X', this.margin + 126, this.currentY + 7);
    
    // Date and time
    this.pdf.rect(this.margin + 145, this.currentY, 45, 10);
    this.pdf.text(`${data.date} ${data.time}`, this.margin + 147, this.currentY + 6);
    
    this.currentY += 12;
    
    // Document row
    this.pdf.rect(this.margin, this.currentY, 30, 8);
    this.pdf.rect(this.margin + 30, this.currentY, 15, 8);
    this.pdf.rect(this.margin + 45, this.currentY, 15, 8);
    this.pdf.rect(this.margin + 60, this.currentY, 15, 8);
    this.pdf.rect(this.margin + 75, this.currentY, 20, 8);
    this.pdf.rect(this.margin + 95, this.currentY, 20, 8);
    this.pdf.rect(this.margin + 115, this.currentY, 20, 8);
    this.pdf.rect(this.margin + 135, this.currentY, 30, 8);
    this.pdf.rect(this.margin + 165, this.currentY, 25, 8);
    
    this.pdf.setFontSize(7);
    this.pdf.text('DOCUMENTO - N° HC', this.margin + 2, this.currentY + 3);
    this.pdf.text('TIPO', this.margin + 32, this.currentY + 3);
    this.pdf.text('EDAD', this.margin + 47, this.currentY + 3);
    this.pdf.text('EPS', this.margin + 62, this.currentY + 3);
    this.pdf.text('C', this.margin + 77, this.currentY + 5);
    this.pdf.text('S', this.margin + 97, this.currentY + 5);
    this.pdf.text('P', this.margin + 117, this.currentY + 5);
    this.pdf.text('RÉGIMEN', this.margin + 137, this.currentY + 3);
    this.pdf.text('PPNA', this.margin + 167, this.currentY + 3);
    
    this.currentY += 8;
    
    // Document data
    this.pdf.rect(this.margin, this.currentY, 30, 10);
    this.pdf.rect(this.margin + 30, this.currentY, 15, 10);
    this.pdf.rect(this.margin + 45, this.currentY, 15, 10);
    this.pdf.rect(this.margin + 60, this.currentY, 20, 10);
    this.pdf.rect(this.margin + 80, this.currentY, 15, 10);
    this.pdf.rect(this.margin + 95, this.currentY, 15, 10);
    this.pdf.rect(this.margin + 110, this.currentY, 15, 10);
    this.pdf.rect(this.margin + 125, this.currentY, 40, 10);
    this.pdf.rect(this.margin + 165, this.currentY, 25, 10);
    
    this.pdf.setFontSize(9);
    this.pdf.text(data.patientData.numeroDocumento, this.margin + 2, this.currentY + 6);
    this.pdf.text(data.patientData.tipoDocumento.substring(0, 2), this.margin + 32, this.currentY + 6);
    this.pdf.text(data.patientData.edad?.toString() || '', this.margin + 47, this.currentY + 6);
    
    this.currentY += 15;
    
    // Representative data
    this.pdf.setFillColor(200, 200, 200);
    this.pdf.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 8, 'F');
    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('DATOS DEL ACUDIENTE O REPRESENTANTE', 105, this.currentY + 5, { align: 'center' });
    
    this.currentY += 10;
    
    // Representative fields
    this.pdf.rect(this.margin, this.currentY, 60, 8);
    this.pdf.rect(this.margin + 60, this.currentY, 50, 8);
    this.pdf.rect(this.margin + 110, this.currentY, 80, 8);
    
    this.pdf.setFontSize(8);
    this.pdf.text('NOMBRE COMPLETO:', this.margin + 2, this.currentY + 5);
    this.pdf.text('DOCUMENTO:', this.margin + 62, this.currentY + 5);
    this.pdf.text('VÍNCULO O PARENTESCO CON EL PACIENTE:', this.margin + 112, this.currentY + 5);
    
    this.currentY += 8;
    
    this.pdf.rect(this.margin, this.currentY, 60, 10);
    this.pdf.rect(this.margin + 60, this.currentY, 50, 10);
    this.pdf.rect(this.margin + 110, this.currentY, 80, 10);
    
    this.currentY += 15;
    
    // Phone
    this.pdf.rect(this.margin, this.currentY, 60, 8);
    this.pdf.setFontSize(8);
    this.pdf.text('TELÉFONO:', this.margin + 2, this.currentY + 5);
    
    this.currentY += 8;
    this.pdf.rect(this.margin, this.currentY, 60, 10);
    
    this.currentY += 15;
  }

  private drawProcedureData() {
    // Procedure data header
    this.pdf.setFillColor(200, 200, 200);
    this.pdf.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 8, 'F');
    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('DATOS DEL PROCEDIMIENTO', 105, this.currentY + 5, { align: 'center' });
    
    this.currentY += 10;
    
    // Procedure table
    const procedureRows = [
      ['PROCEDIMIENTO', 'TOMA DE MUESTRAS FROTIS VAGINAL - CULTIVO RECTO-VAGINAL'],
      ['DESCRIPCIÓN\nDEL\nPROCEDIMIENTO', 'Se toma una muestra de secreción de flujo del área vaginal o rectal, utilizando aplicadores, solución salina,\ntubo de ensayo, medio de cultivo, laminillas, espéculo. Este material utilizado es totalmente desechable. En\nel caso de ser menor de edad o no haber tenido relaciones sexuales no se utilizará espéculo para la toma de\nla muestra.'],
      ['PROPÓSITO', 'Identificar la presencia de bacterias, procesos inflamatorios o infecciosos para dar un tratamiento médico'],
      ['BENEFICIOS\nESPERADOS', 'Orientar y/o confirmar un diagnóstico y realizar seguimiento oportuno de una condición en salud, que\npermita dar pautas de tratamiento oportuno.'],
      ['RIESGOS', 'Frotis Vaginal: Ardor, dolor, picazón o incomodidad al momento de introducir el espéculo y el aplicador.'],
      ['IMPLICACIONES', 'Sangrado, dolor pélvico, laceración cervicouterina.'],
      ['EFECTOS\nINEVITABLES', 'Sangrado escaso ocasionado por el espéculo. Molestia, dolor leve o ardor transitorio en la zona vaginal.'],
      ['ALTERNATIVAS', 'Ninguna'],
      ['POSIBLES CONSECUENCIAS EN CASO QUE\nDECIDA NO ACEPTAR EL PROCEDIMIENTO', 'Impide a los médicos tratantes tener información valiosa para\ndeterminar, confirmar o ajustar su diagnóstico y tratamiento médico'],
      ['RIESGOS ESPECÍFICOS DEL PACIENTE', '']
    ];
    
    let rowHeight = 0;
    for (let i = 0; i < procedureRows.length; i++) {
      const [label, content] = procedureRows[i];
      
      if (i === 1) rowHeight = 25; // Description row
      else if (i === 8) rowHeight = 20; // Consequences row
      else rowHeight = 15;
      
      // Draw cells
      this.pdf.setLineWidth(0.3);
      this.pdf.rect(this.margin, this.currentY, 40, rowHeight);
      this.pdf.rect(this.margin + 40, this.currentY, this.pageWidth - 2 * this.margin - 40, rowHeight);
      
      // Draw text
      this.pdf.setFontSize(8);
      this.pdf.setFont('helvetica', 'bold');
      
      const lines = label.split('\n');
      let yOffset = rowHeight / 2 - (lines.length * 2.5);
      lines.forEach((line, index) => {
        this.pdf.text(line, this.margin + 2, this.currentY + yOffset + (index * 3) + 7);
      });
      
      this.pdf.setFont('helvetica', 'normal');
      const contentLines = content.split('\n');
      yOffset = rowHeight / 2 - (contentLines.length * 2.5);
      contentLines.forEach((line, index) => {
        this.pdf.text(line, this.margin + 42, this.currentY + yOffset + (index * 3) + 7);
      });
      
      this.currentY += rowHeight;
    }
    
    this.currentY += 5;
  }

  private drawConsent() {
    // Consent header
    this.pdf.setFillColor(200, 200, 200);
    this.pdf.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 8, 'F');
    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('CONSENTIMIENTO', 105, this.currentY + 5, { align: 'center' });
    
    this.currentY += 12;
    
    // Consent text
    const consentText = `Yo, identificado(a) como aparece junto a mi firma/huella, hago constar que he recibido información clara relacionada con: Garantías de calidad, confidencialidad, que mis datos personales no serán utilizados sin mi autorización, que la información brindada no tiene fines de divulgación a terceras personas, o a las autoridades competentes según mi caso. También mi información sobre el procedimiento en sí, sus propósitos), los beneficios esperados, y/o posibles riesgos frecuentes o graves, las posibles consecuencias al decidir no aceptar el procedimiento, las posibles molestias, la posibilidad de participación de personal en formación bajo supervisión.

He entendido(a) también que: a) Puedo despejar mi consentimiento, sin que ello implique desmejora del trato que reciba de parte del equipo de salud y no implique decisión alguna restrictiva y/o discriminación hacia mi persona; b) Además firma mi representante legal en caso de ser menor de edad; c) En caso de urgencia manifiesta, que no dé tiempo para obtener mi consentimiento o el de mi representante legal, autorizo que se realice la realización de la intervención, y sin que para ello precise dar explicaciones o justificar mi decisión; d) Que en caso de que mi decisión sea anular cualquier medida o procedimiento, quedo conforme con la propuesta del médico.

Actuando en nombre propio ( ) en calidad de representante legal ( ) de la/del paciente cuyo nombre o identificación están:

Registrados en el encabezado de este documento, autorizo al personal asistencial de esta institución, para que me/le realice el/los procedimiento/s investigativo/s arriba mencionados según sea necesario, toma las medidas y conductas médicas necesarias para salvaguardar la integridad física, de acuerdo a como se presentan las situaciones imprevistas en el curso del procedimiento.

En manifestación de aceptación firmo/pongo mi huella en este documento a los _____ días del mes de _______ de 20_____.`;
    
    this.pdf.setFontSize(8);
    this.pdf.setFont('helvetica', 'normal');
    
    const lines = this.pdf.splitTextToSize(consentText, this.pageWidth - 2 * this.margin - 4);
    
    // Draw border for consent text
    this.pdf.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, lines.length * 3 + 10);
    
    this.currentY += 5;
    for (let i = 0; i < lines.length; i++) {
      this.pdf.text(lines[i], this.margin + 2, this.currentY);
      this.currentY += 3;
    }
    
    this.currentY += 10;
  }

  private drawSignatures(data: FrotisVaginalData) {
    // Signature section
    this.pdf.setLineWidth(0.3);
    
    // Patient signature
    this.pdf.rect(this.margin, this.currentY, 60, 25);
    this.pdf.setFontSize(8);
    this.pdf.text('Firma paciente', this.margin + 2, this.currentY + 20);
    this.pdf.text(`Documento:_________________`, this.margin + 2, this.currentY + 23);
    
    // Legal representative signature
    this.pdf.rect(this.margin + 60, this.currentY, 60, 25);
    this.pdf.text('Firma Representante legal:', this.margin + 62, this.currentY + 20);
    this.pdf.text(`Documento:_________________`, this.margin + 62, this.currentY + 23);
    
    // Witness signature
    this.pdf.rect(this.margin + 120, this.currentY, 70, 25);
    this.pdf.text('Nombre y documento de quien toma el', this.margin + 122, this.currentY + 18);
    this.pdf.text('consentimiento:', this.margin + 122, this.currentY + 21);
    this.pdf.text(`Documento:_____________________`, this.margin + 122, this.currentY + 23);
    
    this.currentY += 30;
    
    // Add professional signature if available
    if (data.signatureData) {
      try {
        this.pdf.addImage(data.signatureData, 'PNG', this.margin + 120, this.currentY - 25, 60, 15);
      } catch (error) {
        console.error('Error adding signature:', error);
      }
    }
    
    // Professional info
    this.pdf.setFontSize(10);
    this.pdf.text(`${data.professionalName}`, this.margin + 122, this.currentY - 5);
    this.pdf.text(`CC: ${data.professionalDocument}`, this.margin + 122, this.currentY + 2);
  }

  private drawFooter() {
    this.currentY += 10;
    
    // Footer with hospital info
    this.pdf.setFontSize(7);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text('🏥 SERSALUD', this.margin, this.currentY);
    this.pdf.text('La Mesa - Cundinamarca. Calle 8 No. 25 – 34 Call Center: 3172001556 Email: atencionusuario@hospitalpedroleondias.gov.co   www.hospitalpedroleondias.gov.co', this.margin + 15, this.currentY);
  }
}

export const generateFrotisVaginalPDF = (data: FrotisVaginalData): jsPDF => {
  const generator = new PDFGeneratorFrotisVaginal();
  return generator.generate(data);
};