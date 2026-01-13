import jsPDF from 'jspdf';
import { getLogoBase64 } from './pdfLogoHelper';

// Interface for patient data
export interface BasePDFPatientData {
  nombreCompleto: string;
  tipoDocumento: string;
  numeroDocumento: string;
  fechaNacimiento?: string;
  edad: number;
  sexo: string;
  eps: string;
  telefono?: string;
  direccion?: string;
  regimen?: 'C' | 'S' | 'P' | 'PPNA' | 'OTRO';
}

// Interface for guardian data
export interface BasePDFGuardianData {
  nombreCompleto: string;
  documento: string;
  telefono?: string;
  vinculo: string;
}

// Interface for professional data
export interface BasePDFProfessionalData {
  nombreCompleto: string;
  documento: string;
  firma?: string;
}

// Interface for procedure data
export interface BasePDFProcedureItem {
  label: string;
  value: string;
}

// Interface for document metadata
export interface BasePDFDocumentMeta {
  formatoNumero: string; // e.g., "FORMATO 119"
  titulo: string; // e.g., "CONSENTIMIENTO INFORMADO"
  subtitulo: string; // e.g., "PARA CARGA DE GLUCOSA"
  codigo: string; // e.g., "SC-M-09.119"
  version: string; // e.g., "01"
  fecha: string; // e.g., "20-10-2024"
}

// Main PDF data interface
export interface BasePDFData {
  documentMeta: BasePDFDocumentMeta;
  patientData: BasePDFPatientData;
  guardianData?: BasePDFGuardianData | null;
  procedureData: BasePDFProcedureItem[];
  professionalData: BasePDFProfessionalData;
  patientSignature?: string;
  patientPhoto?: string;
  consentDecision: 'aprobar' | 'disentir';
  fechaHora: string;
}

export class BasePDFGenerator {
  protected pdf: jsPDF;
  protected pageWidth: number;
  protected pageHeight: number;
  protected margin: number;
  protected currentY: number;
  protected lineHeight: number;
  protected logoBase64: string | null = null;
  protected contentWidth: number;

  constructor() {
    this.pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    this.pageWidth = this.pdf.internal.pageSize.getWidth(); // 210mm
    this.pageHeight = this.pdf.internal.pageSize.getHeight(); // 297mm
    this.margin = 15;
    this.currentY = this.margin;
    this.lineHeight = 4;
    this.contentWidth = this.pageWidth - 2 * this.margin;
  }

  async loadLogo(): Promise<void> {
    try {
      this.logoBase64 = await getLogoBase64();
    } catch (error) {
      console.error('Error loading logo:', error);
    }
  }

  async generate(data: BasePDFData): Promise<jsPDF> {
    await this.loadLogo();
    
    // Page 1 - Consent form
    this.drawHeader(data.documentMeta);
    this.drawPatientData(data);
    
    if (data.guardianData) {
      this.drawGuardianData(data.guardianData);
    }
    
    this.drawProcedureSection(data.procedureData);
    this.drawConsentSection(data);
    this.drawSignatureSection(data);
    this.drawFooter();

    // Page 2 - Withdrawal decision (if disentir)
    if (data.consentDecision === 'disentir') {
      this.pdf.addPage();
      this.currentY = this.margin;
      this.drawHeader(data.documentMeta);
      this.drawWithdrawalSection(data);
      this.drawFooter();
    }

    return this.pdf;
  }

  protected drawHeader(meta: BasePDFDocumentMeta) {
    const headerHeight = 22;
    const headerY = this.margin;
    
    // Draw main header border
    this.pdf.setLineWidth(0.3);
    this.pdf.rect(this.margin, headerY, this.contentWidth, headerHeight);
    
    // Left section - Hospital logo and name (width: 55mm)
    const leftWidth = 55;
    this.pdf.line(this.margin + leftWidth, headerY, this.margin + leftWidth, headerY + headerHeight);
    
    // Add logo
    if (this.logoBase64) {
      try {
        const logoWidth = 50;
        const logoHeight = 18;
        this.pdf.addImage(this.logoBase64, 'PNG', this.margin + 2.5, headerY + 2, logoWidth, logoHeight);
      } catch (error) {
        console.error('Error adding logo:', error);
        this.drawFallbackLogo(headerY);
      }
    } else {
      this.drawFallbackLogo(headerY);
    }
    
    // Center section - Document title (dynamic width)
    const rightWidth = 40;
    const centerWidth = this.contentWidth - leftWidth - rightWidth;
    this.pdf.line(this.margin + leftWidth + centerWidth, headerY, this.margin + leftWidth + centerWidth, headerY + headerHeight);
    
    const centerX = this.margin + leftWidth + centerWidth / 2;
    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(meta.formatoNumero, centerX, headerY + 6, { align: 'center' });
    this.pdf.text(meta.titulo, centerX, headerY + 11, { align: 'center' });
    this.pdf.setFontSize(9);
    this.pdf.text(meta.subtitulo, centerX, headerY + 16, { align: 'center' });
    
    // Right section - Code/Version/Date table (width: 40mm)
    const rightX = this.margin + leftWidth + centerWidth;
    const cellHeight = headerHeight / 3;
    
    // Vertical divider in right section
    this.pdf.line(rightX + 20, headerY, rightX + 20, headerY + headerHeight);
    
    // Horizontal dividers
    this.pdf.line(rightX, headerY + cellHeight, rightX + rightWidth, headerY + cellHeight);
    this.pdf.line(rightX, headerY + 2 * cellHeight, rightX + rightWidth, headerY + 2 * cellHeight);
    
    // Labels and values
    this.pdf.setFontSize(7);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Código', rightX + 2, headerY + 5);
    this.pdf.text('Versión', rightX + 2, headerY + cellHeight + 5);
    this.pdf.text('Fecha', rightX + 2, headerY + 2 * cellHeight + 5);
    
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(meta.codigo, rightX + 22, headerY + 5);
    this.pdf.text(meta.version, rightX + 22, headerY + cellHeight + 5);
    this.pdf.text(meta.fecha, rightX + 22, headerY + 2 * cellHeight + 5);
    
    this.currentY = headerY + headerHeight + 3;
  }

  protected drawFallbackLogo(headerY: number) {
    this.pdf.setFontSize(8);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('E.S.E', this.margin + 5, headerY + 6);
    this.pdf.text('HOSPITAL', this.margin + 5, headerY + 10);
    this.pdf.text('LA MESA', this.margin + 5, headerY + 14);
    this.pdf.setFontSize(6);
    this.pdf.text('PEDRO LEÓN ÁLVAREZ DÍAZ', this.margin + 2, headerY + 18);
  }

  protected drawPatientData(data: BasePDFData) {
    // Section header
    this.drawSectionHeader('DATOS DEL PACIENTE');
    
    const tableY = this.currentY;
    const row1Height = 8;
    const row2Height = 8;
    
    // First row headers and data
    // Column widths: NOMBRE COMPLETO (70), SEXO (15), FECHA Y HORA (40), spacing to end
    const col1 = 70;
    const col2 = 15;
    const col3 = 40;
    const col4 = this.contentWidth - col1 - col2 - col3;
    
    // Draw row 1 cells
    this.pdf.setLineWidth(0.2);
    let xPos = this.margin;
    
    // NOMBRE COMPLETO cell
    this.pdf.rect(xPos, tableY, col1, row1Height * 2);
    this.pdf.setFontSize(6);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('NOMBRE COMPLETO', xPos + 2, tableY + 4);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(8);
    const nameLines = this.pdf.splitTextToSize(data.patientData.nombreCompleto, col1 - 4);
    this.pdf.text(nameLines, xPos + 2, tableY + 10);
    xPos += col1;
    
    // SEXO cell
    this.pdf.rect(xPos, tableY, col2, row1Height);
    this.pdf.rect(xPos, tableY + row1Height, col2, row1Height);
    this.pdf.setFontSize(6);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('SEXO', xPos + 2, tableY + 4);
    
    // Draw F/M boxes
    this.pdf.setFont('helvetica', 'normal');
    const sexoY = tableY + row1Height;
    this.pdf.setFontSize(7);
    this.pdf.text('F', xPos + 3, sexoY + 5);
    this.pdf.rect(xPos + 5, sexoY + 2, 4, 4);
    if (data.patientData.sexo === 'F') {
      this.pdf.text('X', xPos + 5.5, sexoY + 5);
    }
    this.pdf.text('M', xPos + 10, sexoY + 5);
    this.pdf.rect(xPos + 12, sexoY + 2, 4, 4);
    if (data.patientData.sexo === 'M') {
      this.pdf.text('X', xPos + 12.5, sexoY + 5);
    }
    xPos += col2;
    
    // FECHA Y HORA cell
    this.pdf.rect(xPos, tableY, col3, row1Height);
    this.pdf.rect(xPos, tableY + row1Height, col3, row1Height);
    this.pdf.setFontSize(6);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('FECHA Y HORA', xPos + 2, tableY + 4);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(8);
    this.pdf.text(data.fechaHora, xPos + 2, tableY + row1Height + 5);
    xPos += col3;
    
    // Empty cell for spacing
    this.pdf.rect(xPos, tableY, col4, row1Height * 2);
    
    this.currentY = tableY + row1Height * 2 + 1;
    
    // Second section: DOCUMENTO - N° HC | TIPO | EDAD | EAPB | REGIMEN
    const row3Y = this.currentY;
    const docCol = 35;
    const tipoCol = 30;
    const edadCol = 20;
    const eapbCol = 45;
    const regimenCol = this.contentWidth - docCol - tipoCol - edadCol - eapbCol;
    
    xPos = this.margin;
    
    // DOCUMENTO - N° HC
    this.pdf.rect(xPos, row3Y, docCol, row1Height);
    this.pdf.rect(xPos, row3Y + row1Height, docCol, row1Height);
    this.pdf.setFontSize(6);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('DOCUMENTO – N° HC', xPos + 1, row3Y + 4);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(8);
    this.pdf.text(data.patientData.numeroDocumento, xPos + 1, row3Y + row1Height + 5);
    xPos += docCol;
    
    // TIPO
    this.pdf.rect(xPos, row3Y, tipoCol, row1Height);
    this.pdf.rect(xPos, row3Y + row1Height, tipoCol, row1Height);
    this.pdf.setFontSize(6);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('TIPO', xPos + 1, row3Y + 4);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(7);
    // Draw tipo options: RC | TI | CC | CE | OTRO
    const tipos = ['RC', 'TI', 'CC', 'CE', 'OTRO'];
    let tipoX = xPos + 1;
    tipos.forEach(t => {
      this.pdf.text(t, tipoX, row3Y + row1Height + 5);
      const isSelected = data.patientData.tipoDocumento === t || 
                        (t === 'CC' && data.patientData.tipoDocumento === 'Cédula de ciudadanía');
      if (isSelected) {
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.text('✓', tipoX + 3, row3Y + row1Height + 5);
        this.pdf.setFont('helvetica', 'normal');
      }
      tipoX += 6;
    });
    xPos += tipoCol;
    
    // EDAD
    this.pdf.rect(xPos, row3Y, edadCol, row1Height);
    this.pdf.rect(xPos, row3Y + row1Height, edadCol, row1Height);
    this.pdf.setFontSize(6);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('EDAD', xPos + 1, row3Y + 4);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(8);
    this.pdf.text(`${data.patientData.edad} años`, xPos + 1, row3Y + row1Height + 5);
    xPos += edadCol;
    
    // EAPB (EPS)
    this.pdf.rect(xPos, row3Y, eapbCol, row1Height);
    this.pdf.rect(xPos, row3Y + row1Height, eapbCol, row1Height);
    this.pdf.setFontSize(6);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('EAPB', xPos + 1, row3Y + 4);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(7);
    const epsLines = this.pdf.splitTextToSize(data.patientData.eps || '', eapbCol - 2);
    this.pdf.text(epsLines, xPos + 1, row3Y + row1Height + 4);
    xPos += eapbCol;
    
    // REGIMEN
    this.pdf.rect(xPos, row3Y, regimenCol, row1Height);
    this.pdf.rect(xPos, row3Y + row1Height, regimenCol, row1Height);
    this.pdf.setFontSize(6);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('RÉGIMEN', xPos + 1, row3Y + 4);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(6);
    // Draw regimen options: C | S | P | PPNA | OTRO
    const regimenes = [
      { code: 'C', label: 'Contrib' },
      { code: 'S', label: 'Subsid' },
      { code: 'P', label: 'Partic' },
      { code: 'PPNA', label: 'Pob No aseg' }
    ];
    let regX = xPos + 1;
    regimenes.forEach(r => {
      this.pdf.text(r.label, regX, row3Y + row1Height + 5);
      regX += 10;
    });
    
    this.currentY = row3Y + row1Height * 2 + 2;
  }

  protected drawGuardianData(guardian: BasePDFGuardianData) {
    this.drawSectionHeader('DATOS DEL ACUDIENTE O REPRESENTANTE');
    
    const tableY = this.currentY;
    const rowHeight = 7;
    
    // Row 1: NOMBRE COMPLETO | DOCUMENTO
    this.pdf.setLineWidth(0.2);
    this.pdf.rect(this.margin, tableY, this.contentWidth * 0.6, rowHeight);
    this.pdf.rect(this.margin + this.contentWidth * 0.6, tableY, this.contentWidth * 0.4, rowHeight);
    
    this.pdf.setFontSize(6);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('NOMBRE COMPLETO:', this.margin + 1, tableY + 4);
    this.pdf.text('DOCUMENTO:', this.margin + this.contentWidth * 0.6 + 1, tableY + 4);
    
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(8);
    this.pdf.text(guardian.nombreCompleto, this.margin + 30, tableY + 4);
    this.pdf.text(guardian.documento, this.margin + this.contentWidth * 0.6 + 25, tableY + 4);
    
    // Row 2: TELEFONO | VINCULO
    const row2Y = tableY + rowHeight;
    this.pdf.rect(this.margin, row2Y, this.contentWidth * 0.4, rowHeight);
    this.pdf.rect(this.margin + this.contentWidth * 0.4, row2Y, this.contentWidth * 0.6, rowHeight);
    
    this.pdf.setFontSize(6);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('TELÉFONO:', this.margin + 1, row2Y + 4);
    this.pdf.text('VÍNCULO O PARENTESCO CON EL PACIENTE:', this.margin + this.contentWidth * 0.4 + 1, row2Y + 4);
    
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(8);
    this.pdf.text(guardian.telefono || '', this.margin + 20, row2Y + 4);
    this.pdf.text(guardian.vinculo, this.margin + this.contentWidth * 0.4 + 60, row2Y + 4);
    
    this.currentY = row2Y + rowHeight + 2;
  }

  protected drawProcedureSection(procedures: BasePDFProcedureItem[]) {
    this.drawSectionHeader('DATOS DEL PROCEDIMIENTO');
    
    const labelWidth = 45;
    const valueWidth = this.contentWidth - labelWidth;
    
    for (const item of procedures) {
      // Calculate height needed
      const valueLines = this.pdf.splitTextToSize(item.value, valueWidth - 4);
      const labelLines = this.pdf.splitTextToSize(item.label, labelWidth - 4);
      const rowHeight = Math.max(labelLines.length * 3.5 + 3, valueLines.length * 3.5 + 3, 8);
      
      // Check if we need a new page
      if (this.currentY + rowHeight > this.pageHeight - 30) {
        this.drawFooter();
        this.pdf.addPage();
        this.currentY = this.margin;
        this.drawHeader({
          formatoNumero: '',
          titulo: '',
          subtitulo: '',
          codigo: '',
          version: '',
          fecha: ''
        });
      }
      
      // Draw cells
      this.pdf.setLineWidth(0.2);
      this.pdf.rect(this.margin, this.currentY, labelWidth, rowHeight);
      this.pdf.rect(this.margin + labelWidth, this.currentY, valueWidth, rowHeight);
      
      // Label
      this.pdf.setFontSize(7);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text(labelLines, this.margin + 1, this.currentY + 4);
      
      // Value
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setFontSize(7);
      this.pdf.text(valueLines, this.margin + labelWidth + 2, this.currentY + 4);
      
      this.currentY += rowHeight;
    }
    
    this.currentY += 2;
  }

  protected drawConsentSection(data: BasePDFData) {
    this.drawSectionHeader('CONSENTIMIENTO');
    
    const consentParagraphs = [
      `Yo, Identificado(a) como aparece junto a mi firma/huella, hago constar que he recibido información clara relacionada con: Garantía de confidencialidad de mis datos personales y demás información que Yo entregue, con salvedad de la información que deba ser comunicada a personas, o a las autoridades competentes según mi caso. También me informaron sobre el procedimiento en sí, su propósito(s), los beneficios esperados, los posibles riesgos frecuentes o graves, las posibles consecuencias si decido no aceptar el procedimiento, las posibles molestias, la posibilidad de participación de personal en formación bajo supervisión.`,
      `Fui informado(a) también que: a) Puedo denegar mi consentimiento, sin que ello implique desmejora del trato que recibiré de parte del equipo de salud, y que puedo acceder a otros servicios en salud que requiera en tanto estén disponibles, b) Aunque firme en este momento este documento, aceptando me sea(n) realizada(s) la(s) intervención(es), puedo retirar mi consentimiento de manera parcial o total, en cualquier momento anterior a la realización de la intervención, y sin que para ello precise dar explicaciones o justificar mi decisión, c) Que en caso tal que mi decisión sea anular o cancelar, mi consentimiento, dejaré constancia de ella por escrito y firmada o con mi huella dactilar.`,
      `Actuando en nombre propio (${data.guardianData ? ' ' : 'X'}) / en calidad de representante legal (${data.guardianData ? 'X' : ' '}) de la/del paciente cuyos nombres e identificación están registrados en el encabezado de este documento, autorizo al personal asistencial de esta institución, para que me/le realice el/los procedimientos(s) enseguida señalado(s) y, en caso de ser necesario, tome las medidas y conductas médicas necesarias para salvaguardar mí integridad física, de acuerdo a como se presenten las situaciones imprevistas en el curso del procedimiento.`
    ];
    
    this.pdf.setFontSize(7);
    this.pdf.setFont('helvetica', 'normal');
    
    for (const paragraph of consentParagraphs) {
      const lines = this.pdf.splitTextToSize(paragraph, this.contentWidth - 4);
      const textHeight = lines.length * 3.5;
      
      if (this.currentY + textHeight > this.pageHeight - 50) {
        this.drawFooter();
        this.pdf.addPage();
        this.currentY = this.margin;
      }
      
      this.pdf.text(lines, this.margin + 2, this.currentY);
      this.currentY += textHeight + 2;
    }
    
    // Date acceptance line
    const dateText = `En manifestación de aceptación firmo/pongo mi huella en este documento a los _______ días del mes de __________ de 20____.`;
    const dateLines = this.pdf.splitTextToSize(dateText, this.contentWidth - 4);
    this.pdf.text(dateLines, this.margin + 2, this.currentY);
    this.currentY += dateLines.length * 3.5 + 5;
  }

  protected drawSignatureSection(data: BasePDFData) {
    // Check if we need a new page
    if (this.currentY + 45 > this.pageHeight - 25) {
      this.drawFooter();
      this.pdf.addPage();
      this.currentY = this.margin;
    }
    
    const signatureHeight = 25;
    const colWidth = this.contentWidth / 3;
    
    // Draw three signature columns
    for (let i = 0; i < 3; i++) {
      const xPos = this.margin + i * colWidth;
      this.pdf.rect(xPos, this.currentY, colWidth, signatureHeight);
    }
    
    // Add signatures if available
    // Patient signature
    if (data.patientSignature && 
        typeof data.patientSignature === 'string' &&
        data.patientSignature.length > 100 && 
        data.patientSignature.startsWith('data:image/png;base64,')) {
      try {
        this.pdf.addImage(data.patientSignature, 'PNG', this.margin + 2, this.currentY + 2, colWidth - 4, signatureHeight - 8);
      } catch (error) {
        console.error('Error adding patient signature:', error);
      }
    }
    
    // Professional signature
    if (data.professionalData.firma && 
        typeof data.professionalData.firma === 'string' &&
        data.professionalData.firma.length > 100 && 
        data.professionalData.firma.startsWith('data:image/png;base64,')) {
      try {
        this.pdf.addImage(data.professionalData.firma, 'PNG', this.margin + 2 * colWidth + 2, this.currentY + 2, colWidth - 4, signatureHeight - 8);
      } catch (error) {
        console.error('Error adding professional signature:', error);
      }
    }
    
    this.currentY += signatureHeight;
    
    // Signature labels
    const labelY = this.currentY;
    this.pdf.setLineWidth(0.3);
    
    // Patient label
    this.pdf.setFontSize(7);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text('Firma paciente', this.margin + 2, labelY + 4);
    this.pdf.text(`Documento:________________`, this.margin + 2, labelY + 8);
    
    // Representative label
    this.pdf.text('Firma Representante legal:', this.margin + colWidth + 2, labelY + 4);
    this.pdf.text(`Documento:________________`, this.margin + colWidth + 2, labelY + 8);
    
    // Professional label
    this.pdf.text('Nombre y documento de quien toma el', this.margin + 2 * colWidth + 2, labelY + 4);
    this.pdf.text('consentimiento:', this.margin + 2 * colWidth + 2, labelY + 8);
    if (data.professionalData.nombreCompleto) {
      this.pdf.setFontSize(6);
      this.pdf.text(data.professionalData.nombreCompleto, this.margin + 2 * colWidth + 2, labelY + 12);
      this.pdf.text(`Doc: ${data.professionalData.documento}`, this.margin + 2 * colWidth + 2, labelY + 15);
    }
    
    this.currentY += 20;
  }

  protected drawWithdrawalSection(data: BasePDFData) {
    this.drawSectionHeader('DECISIÓN DE DESISTIMIENTO');
    
    const withdrawalText = `Yo, Identificada(o) como aparece junto a mi firma/huella, actuando en nombre propio (${data.guardianData ? ' ' : 'X'}) / en calidad de representante legal (${data.guardianData ? 'X' : ' '}) de la/del paciente cuyo nombre e identificación están registrados en el encabezado de este documento, manifiesto -de forma libre, informada y consciente-, mi voluntad de retirar mi consentimiento respecto de la realización de la intervención/ del procedimiento arriba nombrado, que me/le había sido propuesta(o) realizarme (le). He sido informada(o) que, por causa de mi decisión, no cambia la disposición del equipo asistencial a proporcionarme (le) las alternativas de atención, con las limitaciones, que mi decisión genera; Manifiesto que me hago responsable de las consecuencias que puedan derivarse de esta decisión.`;
    
    this.pdf.setFontSize(7);
    this.pdf.setFont('helvetica', 'normal');
    const lines = this.pdf.splitTextToSize(withdrawalText, this.contentWidth - 4);
    this.pdf.text(lines, this.margin + 2, this.currentY);
    this.currentY += lines.length * 3.5 + 5;
    
    // Date line
    const dateText = `En manifestación de aceptación firmo/pongo mi huella en este documento a los _______ días del mes de __________ de 20______.`;
    const dateLines = this.pdf.splitTextToSize(dateText, this.contentWidth - 4);
    this.pdf.text(dateLines, this.margin + 2, this.currentY);
    this.currentY += dateLines.length * 3.5 + 10;
    
    // Signature boxes
    const signatureHeight = 25;
    const colWidth = this.contentWidth / 3;
    
    for (let i = 0; i < 3; i++) {
      const xPos = this.margin + i * colWidth;
      this.pdf.rect(xPos, this.currentY, colWidth, signatureHeight);
    }
    
    // Add patient signature for withdrawal
    if (data.patientSignature && 
        typeof data.patientSignature === 'string' &&
        data.patientSignature.length > 100 && 
        data.patientSignature.startsWith('data:image/png;base64,')) {
      try {
        this.pdf.addImage(data.patientSignature, 'PNG', this.margin + 2, this.currentY + 2, colWidth - 4, signatureHeight - 8);
      } catch (error) {
        console.error('Error adding withdrawal signature:', error);
      }
    }
    
    this.currentY += signatureHeight;
    
    // Labels
    this.pdf.setFontSize(7);
    this.pdf.text('Firma paciente', this.margin + 2, this.currentY + 4);
    this.pdf.text('Documento:______________', this.margin + 2, this.currentY + 8);
    
    this.pdf.text('Firma Representante legal:', this.margin + colWidth + 2, this.currentY + 4);
    this.pdf.text('Documento:______________', this.margin + colWidth + 2, this.currentY + 8);
    
    this.pdf.text('Nombre y documento de quien toma el', this.margin + 2 * colWidth + 2, this.currentY + 4);
    this.pdf.text('desistimiento:', this.margin + 2 * colWidth + 2, this.currentY + 8);
    
    this.currentY += 15;
  }

  protected drawSectionHeader(title: string) {
    this.pdf.setFillColor(200, 220, 240);
    this.pdf.rect(this.margin, this.currentY, this.contentWidth, 6, 'F');
    this.pdf.setLineWidth(0.2);
    this.pdf.rect(this.margin, this.currentY, this.contentWidth, 6);
    
    this.pdf.setFontSize(8);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(0, 0, 0);
    this.pdf.text(title, this.margin + this.contentWidth / 2, this.currentY + 4, { align: 'center' });
    
    this.currentY += 7;
  }

  protected drawFooter() {
    const footerY = this.pageHeight - 12;
    
    this.pdf.setFontSize(6);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setTextColor(100, 100, 100);
    
    // Draw footer line
    this.pdf.setLineWidth(0.3);
    this.pdf.line(this.margin, footerY - 2, this.pageWidth - this.margin, footerY - 2);
    
    // Footer text
    const footerText = 'La Mesa – Cundinamarca, Calle 8 No. 25 – 34  Call Center: 3172601556  Email: atencionalusuario@hospilamesa.gov.co  www.hospilamesa.gov.co';
    this.pdf.text(footerText, this.pageWidth / 2, footerY + 2, { align: 'center' });
    
    // Reset text color
    this.pdf.setTextColor(0, 0, 0);
  }
}

// Export helper function
export async function generateBasePDF(data: BasePDFData): Promise<jsPDF> {
  const generator = new BasePDFGenerator();
  return await generator.generate(data);
}
