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
  formatoNumero: string;
  titulo: string;
  subtitulo: string;
  codigo: string;
  version: string;
  fecha: string;
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
      format: 'letter' // Carta: 215.9 x 279.4 mm (8.5 x 11 pulgadas) - tamaño estándar usado en Colombia
    });
    this.pageWidth = this.pdf.internal.pageSize.getWidth(); // 215.9mm
    this.pageHeight = this.pdf.internal.pageSize.getHeight(); // 279.4mm
    this.margin = 12; // Margen de 12mm para evitar sobreposición
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
    const headerHeight = 20;
    const headerY = this.margin;
    
    // Draw main header border
    this.pdf.setLineWidth(0.4);
    this.pdf.rect(this.margin, headerY, this.contentWidth, headerHeight);
    
    // Left section - Hospital logo (width: 40mm)
    const leftWidth = 40;
    this.pdf.setLineWidth(0.3);
    this.pdf.line(this.margin + leftWidth, headerY, this.margin + leftWidth, headerY + headerHeight);
    
    // Add logo
    if (this.logoBase64) {
      try {
        const logoSize = 16;
        const logoX = this.margin + 2;
        const logoY = headerY + 2;
        this.pdf.addImage(this.logoBase64, 'PNG', logoX, logoY, logoSize, logoSize);
      } catch (error) {
        console.error('Error adding logo:', error);
        this.drawFallbackLogo(headerY);
      }
    } else {
      this.drawFallbackLogo(headerY);
    }
    
    // Center section - Document title
    const rightWidth = 40;
    const centerWidth = this.contentWidth - leftWidth - rightWidth;
    this.pdf.line(this.margin + leftWidth + centerWidth, headerY, this.margin + leftWidth + centerWidth, headerY + headerHeight);
    
    const centerX = this.margin + leftWidth + centerWidth / 2;
    this.pdf.setFontSize(8);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(meta.formatoNumero, centerX, headerY + 6, { align: 'center' });
    this.pdf.text(meta.titulo, centerX, headerY + 10, { align: 'center' });
    this.pdf.setFontSize(7);
    this.pdf.text(meta.subtitulo, centerX, headerY + 14, { align: 'center' });
    
    // Right section - Code/Version/Date table (width: 40mm)
    const rightX = this.margin + leftWidth + centerWidth;
    const cellHeight = headerHeight / 3;
    
    // Vertical divider in right section
    this.pdf.line(rightX + 20, headerY, rightX + 20, headerY + headerHeight);
    
    // Horizontal dividers
    this.pdf.line(rightX, headerY + cellHeight, rightX + rightWidth, headerY + cellHeight);
    this.pdf.line(rightX, headerY + 2 * cellHeight, rightX + rightWidth, headerY + 2 * cellHeight);
    
    // Labels and values
    this.pdf.setFontSize(6);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Código', rightX + 2, headerY + 4.5);
    this.pdf.text('Versión', rightX + 2, headerY + cellHeight + 4.5);
    this.pdf.text('Fecha', rightX + 2, headerY + 2 * cellHeight + 4.5);
    
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(6);
    this.pdf.text(meta.codigo, rightX + 22, headerY + 4.5);
    this.pdf.text(meta.version, rightX + 22, headerY + cellHeight + 4.5);
    this.pdf.text(meta.fecha, rightX + 22, headerY + 2 * cellHeight + 4.5);
    
    this.currentY = headerY + headerHeight + 1;
  }

  protected drawFallbackLogo(headerY: number) {
    this.pdf.setFontSize(7);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('E.S.E', this.margin + 12, headerY + 5);
    this.pdf.text('HOSPITAL', this.margin + 8, headerY + 9);
    this.pdf.text('LA MESA', this.margin + 10, headerY + 13);
    this.pdf.setFontSize(5);
    this.pdf.text('PEDRO LEÓN ÁLVAREZ DÍAZ', this.margin + 2, headerY + 17);
  }

  protected drawPatientData(data: BasePDFData) {
    // Section header - DATOS DEL PACIENTE
    this.drawSectionHeader('DATOS DEL PACIENTE');
    
    const tableY = this.currentY;
    const rowHeight = 6;
    
    // First row: NOMBRE COMPLETO | SEXO | FECHA Y HORA
    const col1 = 80; // NOMBRE COMPLETO
    const col2 = 20; // SEXO  
    const col3 = 45; // FECHA Y HORA
    const col4 = this.contentWidth - col1 - col2 - col3; // Remaining
    
    // Draw first row cells
    this.pdf.setLineWidth(0.2);
    let xPos = this.margin;
    
    // NOMBRE COMPLETO (spans 2 rows)
    this.pdf.rect(xPos, tableY, col1, rowHeight * 2);
    this.pdf.setFontSize(6);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('NOMBRE COMPLETO', xPos + 1, tableY + 3);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(7);
    const nameLines = this.pdf.splitTextToSize(data.patientData.nombreCompleto, col1 - 2);
    this.pdf.text(nameLines, xPos + 1, tableY + 8);
    xPos += col1;
    
    // SEXO header
    this.pdf.rect(xPos, tableY, col2, rowHeight);
    this.pdf.setFontSize(6);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('SEXO', xPos + 1, tableY + 4);
    
    // SEXO value with F/M boxes
    this.pdf.rect(xPos, tableY + rowHeight, col2, rowHeight);
    const sexoY = tableY + rowHeight;
    this.pdf.setFontSize(6);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text('F', xPos + 2, sexoY + 4);
    this.pdf.rect(xPos + 5, sexoY + 1.5, 3, 3);
    if (data.patientData.sexo === 'F') {
      this.pdf.text('X', xPos + 5.5, sexoY + 4);
    }
    this.pdf.text('M', xPos + 11, sexoY + 4);
    this.pdf.rect(xPos + 14, sexoY + 1.5, 3, 3);
    if (data.patientData.sexo === 'M') {
      this.pdf.text('X', xPos + 14.5, sexoY + 4);
    }
    xPos += col2;
    
    // FECHA Y HORA header and value
    this.pdf.rect(xPos, tableY, col3, rowHeight);
    this.pdf.rect(xPos, tableY + rowHeight, col3, rowHeight);
    this.pdf.setFontSize(6);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('FECHA Y HORA', xPos + 1, tableY + 4);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(6);
    this.pdf.text(data.fechaHora, xPos + 1, tableY + rowHeight + 4);
    xPos += col3;
    
    // Empty cell
    if (col4 > 0) {
      this.pdf.rect(xPos, tableY, col4, rowHeight * 2);
    }
    
    this.currentY = tableY + rowHeight * 2;
    
    // Second section: DOCUMENTO | TIPO | EDAD | EAPB | REGIMEN
    const row2Y = this.currentY;
    const docCol = 35;
    const tipoCol = 35;
    const edadCol = 20;
    const eapbCol = 55;
    const regimenCol = this.contentWidth - docCol - tipoCol - edadCol - eapbCol;
    
    xPos = this.margin;
    
    // DOCUMENTO - N° HC header and value
    this.pdf.rect(xPos, row2Y, docCol, rowHeight);
    this.pdf.rect(xPos, row2Y + rowHeight, docCol, rowHeight);
    this.pdf.setFontSize(5);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('DOCUMENTO – N° HC', xPos + 1, row2Y + 4);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(6);
    this.pdf.text(data.patientData.numeroDocumento, xPos + 1, row2Y + rowHeight + 4);
    xPos += docCol;
    
    // TIPO header and value
    this.pdf.rect(xPos, row2Y, tipoCol, rowHeight);
    this.pdf.rect(xPos, row2Y + rowHeight, tipoCol, rowHeight);
    this.pdf.setFontSize(5);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('TIPO', xPos + 1, row2Y + 4);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(5);
    
    // Draw document type checkboxes: RC | TI | CC | CE | OTRO
    const tipos = ['RC', 'TI', 'CC', 'CE', 'OTRO'];
    let tipoX = xPos + 1;
    tipos.forEach((t, idx) => {
      const isSelected = data.patientData.tipoDocumento === t || 
                        (t === 'CC' && (data.patientData.tipoDocumento === 'Cédula de ciudadanía' || data.patientData.tipoDocumento === 'Cédula de Ciudadanía'));
      this.pdf.rect(tipoX, row2Y + rowHeight + 1.5, 2.5, 2.5);
      if (isSelected) {
        this.pdf.text('X', tipoX + 0.5, row2Y + rowHeight + 3.5);
      }
      this.pdf.text(t, tipoX + 3, row2Y + rowHeight + 3.5);
      tipoX += (idx < 4 ? 7 : 0);
    });
    xPos += tipoCol;
    
    // EDAD header and value
    this.pdf.rect(xPos, row2Y, edadCol, rowHeight);
    this.pdf.rect(xPos, row2Y + rowHeight, edadCol, rowHeight);
    this.pdf.setFontSize(5);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('EDAD', xPos + 1, row2Y + 4);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(6);
    this.pdf.text(`${data.patientData.edad}`, xPos + 1, row2Y + rowHeight + 4);
    xPos += edadCol;
    
    // EAPB (EPS) header and value
    this.pdf.rect(xPos, row2Y, eapbCol, rowHeight);
    this.pdf.rect(xPos, row2Y + rowHeight, eapbCol, rowHeight);
    this.pdf.setFontSize(5);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('EAPB', xPos + 1, row2Y + 4);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(5);
    const epsLines = this.pdf.splitTextToSize(data.patientData.eps || '', eapbCol - 2);
    this.pdf.text(epsLines, xPos + 1, row2Y + rowHeight + 3.5);
    xPos += eapbCol;
    
    // REGIMEN header and value
    if (regimenCol > 0) {
      this.pdf.rect(xPos, row2Y, regimenCol, rowHeight);
      this.pdf.rect(xPos, row2Y + rowHeight, regimenCol, rowHeight);
      this.pdf.setFontSize(5);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text('RÉGIMEN', xPos + 1, row2Y + 4);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setFontSize(5);
      
      // Draw regimen checkboxes
      const regimenes = [
        { code: 'C', label: 'C' },
        { code: 'S', label: 'S' },
        { code: 'P', label: 'P' },
        { code: 'PPNA', label: 'PPNA' }
      ];
      let regX = xPos + 1;
      regimenes.forEach((r) => {
        const isSelected = data.patientData.regimen === r.code || (r.code === 'S' && !data.patientData.regimen);
        this.pdf.rect(regX, row2Y + rowHeight + 1.5, 2.5, 2.5);
        if (isSelected) {
          this.pdf.text('X', regX + 0.5, row2Y + rowHeight + 3.5);
        }
        this.pdf.text(r.label, regX + 3, row2Y + rowHeight + 3.5);
        regX += 8;
      });
    }
    
    this.currentY = row2Y + rowHeight * 2 + 1;
  }

  protected drawGuardianData(guardian: BasePDFGuardianData) {
    this.drawSectionHeader('DATOS DEL ACUDIENTE O REPRESENTANTE');
    
    const tableY = this.currentY;
    const rowHeight = 6;
    
    // Row 1: NOMBRE COMPLETO | DOCUMENTO
    this.pdf.setLineWidth(0.2);
    this.pdf.rect(this.margin, tableY, this.contentWidth * 0.6, rowHeight);
    this.pdf.rect(this.margin + this.contentWidth * 0.6, tableY, this.contentWidth * 0.4, rowHeight);
    
    this.pdf.setFontSize(5);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('NOMBRE COMPLETO:', this.margin + 1, tableY + 4);
    this.pdf.text('DOCUMENTO:', this.margin + this.contentWidth * 0.6 + 1, tableY + 4);
    
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(6);
    this.pdf.text(guardian.nombreCompleto, this.margin + 28, tableY + 4);
    this.pdf.text(guardian.documento, this.margin + this.contentWidth * 0.6 + 20, tableY + 4);
    
    // Row 2: TELEFONO | VINCULO
    const row2Y = tableY + rowHeight;
    this.pdf.rect(this.margin, row2Y, this.contentWidth * 0.4, rowHeight);
    this.pdf.rect(this.margin + this.contentWidth * 0.4, row2Y, this.contentWidth * 0.6, rowHeight);
    
    this.pdf.setFontSize(5);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('TELÉFONO:', this.margin + 1, row2Y + 4);
    this.pdf.text('VÍNCULO O PARENTESCO CON EL PACIENTE:', this.margin + this.contentWidth * 0.4 + 1, row2Y + 4);
    
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(6);
    this.pdf.text(guardian.telefono || '', this.margin + 18, row2Y + 4);
    this.pdf.text(guardian.vinculo, this.margin + this.contentWidth * 0.4 + 55, row2Y + 4);
    
    this.currentY = row2Y + rowHeight + 1;
  }

  protected drawProcedureSection(procedures: BasePDFProcedureItem[]) {
    this.drawSectionHeader('DATOS DEL PROCEDIMIENTO');
    
    const labelWidth = 40;
    const valueWidth = this.contentWidth - labelWidth;
    
    for (const item of procedures) {
      // Calculate height needed
      this.pdf.setFontSize(6);
      const valueLines = this.pdf.splitTextToSize(item.value, valueWidth - 3);
      const labelLines = this.pdf.splitTextToSize(item.label, labelWidth - 3);
      const rowHeight = Math.max(labelLines.length * 3 + 2, valueLines.length * 3 + 2, 6);
      
      // Check if we need a new page
      if (this.currentY + rowHeight > this.pageHeight - 20) {
        this.drawFooter();
        this.pdf.addPage();
        this.currentY = this.margin;
      }
      
      // Draw cells
      this.pdf.setLineWidth(0.2);
      this.pdf.rect(this.margin, this.currentY, labelWidth, rowHeight);
      this.pdf.rect(this.margin + labelWidth, this.currentY, valueWidth, rowHeight);
      
      // Label
      this.pdf.setFontSize(6);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text(labelLines, this.margin + 1, this.currentY + 3);
      
      // Value
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setFontSize(6);
      this.pdf.text(valueLines, this.margin + labelWidth + 1, this.currentY + 3);
      
      this.currentY += rowHeight;
    }
    
    this.currentY += 1;
  }

  protected drawConsentSection(data: BasePDFData) {
    this.drawSectionHeader('CONSENTIMIENTO');
    
    const consentParagraphs = [
      `Yo, Identificado(a) como aparece junto a mi firma/huella, hago constar que he recibido información clara relacionada con: Garantía de confidencialidad de mis datos personales y demás información que Yo entregue, con salvedad de la información que deba ser comunicada a personas, o a las autoridades competentes según mi caso. También me informaron sobre el procedimiento en sí, su propósito(s), los beneficios esperados, los posibles riesgos frecuentes o graves, las posibles consecuencias si decido no aceptar el procedimiento, las posibles molestias, la posibilidad de participación de personal en formación bajo supervisión.`,
      `Fui informado(a) también que: a) Puedo denegar mi consentimiento, sin que ello implique desmejora del trato que recibiré de parte del equipo de salud, y que puedo acceder a otros servicios en salud que requiera en tanto estén disponibles, b) Aunque firme en este momento este documento, aceptando me sea(n) realizada(s) la(s) intervención(es), puedo retirar mi consentimiento de manera parcial o total, en cualquier momento anterior a la realización de la intervención, y sin que para ello precise dar explicaciones o justificar mi decisión, c) Que en caso tal que mi decisión sea anular o cancelar, mi consentimiento, dejaré constancia de ella por escrito y firmada o con mi huella dactilar.`,
      `Actuando en nombre propio (${data.guardianData ? ' ' : 'X'}) / en calidad de representante legal (${data.guardianData ? 'X' : ' '}) de la/del paciente cuyos nombres e identificación están registrados en el encabezado de este documento, autorizo al personal asistencial de esta institución, para que me/le realice el/los procedimiento(s) enseguida señalado(s) y, en caso de ser necesario, tome las medidas y conductas médicas necesarias para salvaguardar mí integridad física, de acuerdo a como se presenten las situaciones imprevistas en el curso del procedimiento.`
    ];
    
    this.pdf.setFontSize(7);
    this.pdf.setFont('helvetica', 'normal');
    const lineSpacing = 3.5; // Mayor espaciado entre líneas
    
    for (const paragraph of consentParagraphs) {
      const lines = this.pdf.splitTextToSize(paragraph, this.contentWidth - 6);
      const textHeight = lines.length * lineSpacing;
      
      if (this.currentY + textHeight > this.pageHeight - 50) {
        this.drawFooter();
        this.pdf.addPage();
        this.currentY = this.margin;
      }
      
      // Dibujar línea por línea con espaciado adecuado
      for (let i = 0; i < lines.length; i++) {
        this.pdf.text(lines[i], this.margin + 2, this.currentY + (i * lineSpacing));
      }
      this.currentY += textHeight + 4; // Más espacio entre párrafos
    }
    
    // Extract date components from fechaHora
    const now = new Date();
    const day = now.getDate();
    const month = now.toLocaleDateString('es-ES', { month: 'long' });
    const year = now.getFullYear();
    
    const dateText = `En manifestación de aceptación firmo/pongo mi huella en este documento a los ___${day}___ días del mes de ___${month}___ de ${year}.`;
    const dateLines = this.pdf.splitTextToSize(dateText, this.contentWidth - 6);
    this.pdf.text(dateLines, this.margin + 2, this.currentY);
    this.currentY += dateLines.length * lineSpacing + 5;
  }

  protected drawSignatureSection(data: BasePDFData) {
    // Check if we need a new page
    if (this.currentY + 50 > this.pageHeight - 25) {
      this.drawFooter();
      this.pdf.addPage();
      this.currentY = this.margin;
    }
    
    const signatureHeight = 28; // Mayor altura para firmas
    const colWidth = this.contentWidth / 3;
    
    // Draw three signature columns
    this.pdf.setLineWidth(0.3);
    for (let i = 0; i < 3; i++) {
      const xPos = this.margin + i * colWidth;
      this.pdf.rect(xPos, this.currentY, colWidth, signatureHeight);
    }
    
    // Add patient/guardian signature
    if (data.patientSignature && 
        typeof data.patientSignature === 'string' &&
        data.patientSignature.length > 100 && 
        data.patientSignature.startsWith('data:image')) {
      try {
        this.pdf.addImage(data.patientSignature, 'PNG', this.margin + 3, this.currentY + 2, colWidth - 6, signatureHeight - 8);
      } catch (error) {
        console.error('Error adding patient signature:', error);
      }
    }
    
    // Add professional signature in third column
    if (data.professionalData.firma && 
        typeof data.professionalData.firma === 'string' &&
        data.professionalData.firma.length > 100 && 
        data.professionalData.firma.startsWith('data:image')) {
      try {
        this.pdf.addImage(data.professionalData.firma, 'PNG', this.margin + 2 * colWidth + 3, this.currentY + 2, colWidth - 6, signatureHeight - 8);
      } catch (error) {
        console.error('Error adding professional signature:', error);
      }
    }
    
    this.currentY += signatureHeight;
    
    // Signature labels con mayor espaciado
    const labelY = this.currentY;
    this.pdf.setFontSize(6);
    this.pdf.setFont('helvetica', 'normal');
    
    // Patient signature label
    this.pdf.text('Firma paciente', this.margin + 2, labelY + 4);
    this.pdf.text(`Documento: ${data.patientData.numeroDocumento}`, this.margin + 2, labelY + 8);
    
    // Representative signature label (middle column)
    this.pdf.text('Firma Representante legal:', this.margin + colWidth + 2, labelY + 4);
    if (data.guardianData) {
      this.pdf.text(`Documento: ${data.guardianData.documento}`, this.margin + colWidth + 2, labelY + 8);
    } else {
      this.pdf.text('Documento:', this.margin + colWidth + 2, labelY + 8);
    }
    
    // Professional signature label
    this.pdf.text('Nombre y documento de quien toma el', this.margin + 2 * colWidth + 2, labelY + 4);
    this.pdf.text('consentimiento:', this.margin + 2 * colWidth + 2, labelY + 8);
    this.pdf.setFontSize(6);
    this.pdf.text(data.professionalData.nombreCompleto, this.margin + 2 * colWidth + 2, labelY + 12);
    this.pdf.text(`Doc: ${data.professionalData.documento}`, this.margin + 2 * colWidth + 2, labelY + 16);
    
    this.currentY += 18;
    
    // Add patient photo if available
    if (data.patientPhoto && 
        typeof data.patientPhoto === 'string' &&
        data.patientPhoto.length > 100) {
      try {
        this.pdf.setFontSize(5);
        this.pdf.text('Foto del paciente:', this.margin, this.currentY);
        this.currentY += 2;
        this.pdf.addImage(data.patientPhoto, 'JPEG', this.margin, this.currentY, 20, 16);
        this.currentY += 18;
      } catch (error) {
        console.error('Error adding patient photo:', error);
      }
    }
  }

  protected drawWithdrawalSection(data: BasePDFData) {
    this.drawSectionHeader('DECISIÓN DE DESISTIMIENTO');
    
    const withdrawalText = `Yo, Identificada(o) como aparece junto a mi firma/huella, actuando en nombre propio (${data.guardianData ? ' ' : 'X'}) / en calidad de representante legal (${data.guardianData ? 'X' : ' '}) de la/del paciente cuyo nombre e identificación están registrados en el encabezado de este documento, manifiesto -de forma libre, informada y consciente-, mi voluntad de retirar mi consentimiento respecto de la realización de la intervención/ del procedimiento arriba nombrado, que me/le había sido propuesta(o) realizarme (le). He sido informada(o) que, por causa de mi decisión, no cambia la disposición del equipo asistencial a proporcionarme (le) las alternativas de atención, con las limitaciones, que mi decisión genera; Manifiesto que me hago responsable de las consecuencias que puedan derivarse de esta decisión.`;
    
    this.pdf.setFontSize(6);
    this.pdf.setFont('helvetica', 'normal');
    const lines = this.pdf.splitTextToSize(withdrawalText, this.contentWidth - 4);
    this.pdf.text(lines, this.margin + 2, this.currentY);
    this.currentY += lines.length * 3 + 3;
    
    // Date line
    const now = new Date();
    const day = now.getDate();
    const month = now.toLocaleDateString('es-ES', { month: 'long' });
    const year = now.getFullYear();
    
    const dateText = `En manifestación de desistimiento firmo/pongo mi huella en este documento a los ___${day}___ días del mes de ___${month}___ de ${year}.`;
    const dateLines = this.pdf.splitTextToSize(dateText, this.contentWidth - 4);
    this.pdf.text(dateLines, this.margin + 2, this.currentY);
    this.currentY += dateLines.length * 3 + 5;
    
    // Signature boxes
    const signatureHeight = 20;
    const colWidth = this.contentWidth / 3;
    
    for (let i = 0; i < 3; i++) {
      const xPos = this.margin + i * colWidth;
      this.pdf.rect(xPos, this.currentY, colWidth, signatureHeight);
    }
    
    // Add patient signature for withdrawal
    if (data.patientSignature && 
        typeof data.patientSignature === 'string' &&
        data.patientSignature.length > 100 && 
        data.patientSignature.startsWith('data:image')) {
      try {
        this.pdf.addImage(data.patientSignature, 'PNG', this.margin + 2, this.currentY + 1, colWidth - 4, signatureHeight - 6);
      } catch (error) {
        console.error('Error adding withdrawal signature:', error);
      }
    }
    
    this.currentY += signatureHeight;
    
    // Labels
    this.pdf.setFontSize(5);
    this.pdf.text('Firma paciente', this.margin + 2, this.currentY + 3);
    this.pdf.text(`Documento: ${data.patientData.numeroDocumento}`, this.margin + 2, this.currentY + 6);
    
    this.pdf.text('Firma Representante legal:', this.margin + colWidth + 2, this.currentY + 3);
    this.pdf.text('Documento:', this.margin + colWidth + 2, this.currentY + 6);
    
    this.pdf.text('Nombre y documento de quien toma el', this.margin + 2 * colWidth + 2, this.currentY + 3);
    this.pdf.text('desistimiento:', this.margin + 2 * colWidth + 2, this.currentY + 6);
    
    this.currentY += 12;
  }

  protected drawSectionHeader(title: string) {
    this.pdf.setFillColor(200, 220, 240);
    this.pdf.rect(this.margin, this.currentY, this.contentWidth, 6, 'F');
    this.pdf.setLineWidth(0.3);
    this.pdf.rect(this.margin, this.currentY, this.contentWidth, 6);
    
    this.pdf.setFontSize(8);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(0, 0, 0);
    this.pdf.text(title, this.margin + this.contentWidth / 2, this.currentY + 4, { align: 'center' });
    
    this.currentY += 7;
  }

  protected drawFooter() {
    const footerY = this.pageHeight - 8;
    
    this.pdf.setFontSize(5);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setTextColor(100, 100, 100);
    
    // Draw footer line
    this.pdf.setLineWidth(0.2);
    this.pdf.line(this.margin, footerY - 2, this.pageWidth - this.margin, footerY - 2);
    
    // Footer text
    const footerText = 'La Mesa – Cundinamarca, Calle 8 No. 25 – 34  Call Center: 3172601556  Email: atencionalusuario@hospilamesa.gov.co  www.hospilamesa.gov.co';
    this.pdf.text(footerText, this.pageWidth / 2, footerY + 1, { align: 'center' });
    
    // NIT
    this.pdf.text('Nit: 890.680.027-4', this.pageWidth / 2, footerY + 4, { align: 'center' });
    
    // Reset text color
    this.pdf.setTextColor(0, 0, 0);
  }
}

// Export helper function
export async function generateBasePDF(data: BasePDFData): Promise<jsPDF> {
  const generator = new BasePDFGenerator();
  return await generator.generate(data);
}
