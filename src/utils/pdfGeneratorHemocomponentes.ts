import jsPDF from 'jspdf';

console.log('pdfGeneratorHemocomponentes module loading...');

interface PatientData {
  id: string;
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

interface ProcedureData {
  id: string;
  nombre: string;
  descripcion: string;
  riesgos: string;
  beneficios: string;
  alternativas: string;
  implicaciones: string;
}

interface EnfoqueData {
  gender: boolean;
  ethnicity: boolean;
  vital_cycle: boolean;
  social_position: boolean;
  disability: boolean;
  life_condition: boolean;
}

export interface ConsentPDFData {
  patientData: PatientData;
  isMinor: boolean;
  guardianName?: string;
  guardianDocument?: string;
  guardianRelationship?: string;
  professionalName: string;
  professionalDocument: string;
  consentDecision: "aprobar" | "disentir";
  selectedProcedures: ProcedureData[];
  patientSignature: string;
  professionalSignature: string;
  patientPhoto?: string;
  enfoqueData: EnfoqueData;
}

export class ConsentPDFGenerator {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private leftMargin = 20;
  private rightMargin = 20;
  private topMargin = 20;
  private yPosition = 20;

  constructor() {
    this.doc = new jsPDF();
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
  }

  private addWrappedText(text: string, x: number, y: number, maxWidth: number, lineHeight: number = 5): number {
    const lines = this.doc.splitTextToSize(text, maxWidth);
    this.doc.text(lines, x, y);
    return y + (lines.length * lineHeight);
  }

  private checkPageBreak(requiredSpace: number = 30): void {
    if (this.yPosition > this.pageHeight - requiredSpace) {
      this.doc.addPage();
      this.yPosition = this.topMargin;
    }
  }

  private addHeader(): void {
    // Header background
    this.doc.setFillColor(14, 116, 178);
    this.doc.rect(0, 0, this.pageWidth, 30, 'F');

    // Hospital logo area
    this.doc.setFillColor(255, 255, 255);
    this.doc.rect(5, 5, 60, 20, 'F');
    this.doc.setTextColor(14, 116, 178);
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('E.S.E. HOSPITAL', 7, 12);
    this.doc.text('SANTA MATILDE', 7, 16);
    this.doc.setFontSize(6);
    this.doc.text('Nit: 860.009.555-7', 7, 20);

    // Title
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('E.S.E. HOSPITAL SANTA MATILDE', this.pageWidth / 2, 12, { align: 'center' });
    this.doc.text('Nit: 860.009.555-7', this.pageWidth / 2, 16, { align: 'center' });
    this.doc.setFontSize(12);
    this.doc.text('CONSENTIMIENTO INFORMADO PARA', this.pageWidth / 2, 20, { align: 'center' });
    this.doc.text('TRANSFUSIÓN DE HEMOCOMPONENTES', this.pageWidth / 2, 24, { align: 'center' });

    // Document info
    this.doc.setFillColor(255, 255, 255);
    this.doc.rect(this.pageWidth - 65, 5, 60, 20, 'F');
    this.doc.setTextColor(0, 0, 0);
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Página:', this.pageWidth - 62, 10);
    this.doc.text('1 de 2', this.pageWidth - 45, 10);
    this.doc.text('Versión:', this.pageWidth - 62, 13);
    this.doc.text('08', this.pageWidth - 45, 13);
    this.doc.text('Fecha:', this.pageWidth - 62, 16);
    this.doc.text('Enero de 2025', this.pageWidth - 25, 16);
    this.doc.text('Código:', this.pageWidth - 62, 19);
    this.doc.text('1200AD01-F038', this.pageWidth - 25, 19);
    this.doc.text('Documento:', this.pageWidth - 62, 22);
    this.doc.text('Controlado', this.pageWidth - 25, 22);

    this.yPosition = 35;
  }

  private addPatientData(data: ConsentPDFData): void {
    this.doc.setTextColor(0, 0, 0);
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('DATOS DE IDENTIFICACIÓN', this.leftMargin, this.yPosition);
    this.yPosition += 8;

    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`NOMBRE Y APELLIDO(S)____${data.patientData.nombre} ${data.patientData.apellidos}____`, this.leftMargin, this.yPosition);
    this.yPosition += 6;

    // Document type checkboxes
    this.doc.text('TIPO DE IDENTIFICACIÓN RC', this.leftMargin, this.yPosition);
    this.doc.circle(this.leftMargin + 55, this.yPosition - 1, 2, 'S');
    if (data.patientData.tipoDocumento === 'RC') {
      this.doc.circle(this.leftMargin + 55, this.yPosition - 1, 1, 'F');
    }
    this.doc.text('CC', this.leftMargin + 62, this.yPosition);
    this.doc.circle(this.leftMargin + 70, this.yPosition - 1, 2, 'S');
    if (data.patientData.tipoDocumento === 'CC') {
      this.doc.circle(this.leftMargin + 70, this.yPosition - 1, 1, 'F');
    }
    this.doc.text('TI', this.leftMargin + 77, this.yPosition);
    this.doc.circle(this.leftMargin + 85, this.yPosition - 1, 2, 'S');
    if (data.patientData.tipoDocumento === 'TI') {
      this.doc.circle(this.leftMargin + 85, this.yPosition - 1, 1, 'F');
    }
    this.doc.text('CE', this.leftMargin + 92, this.yPosition);
    this.doc.circle(this.leftMargin + 100, this.yPosition - 1, 2, 'S');
    if (data.patientData.tipoDocumento === 'CE') {
      this.doc.circle(this.leftMargin + 100, this.yPosition - 1, 1, 'F');
    }
    this.doc.text('OTRO', this.leftMargin + 107, this.yPosition);
    this.doc.circle(this.leftMargin + 120, this.yPosition - 1, 2, 'S');
    if (data.patientData.tipoDocumento === 'OTRO') {
      this.doc.circle(this.leftMargin + 120, this.yPosition - 1, 1, 'F');
    }
    this.doc.text(`NÚMERO DE IDENTIFICACIÓN____${data.patientData.numeroDocumento}____`, this.leftMargin + 130, this.yPosition);
    this.yPosition += 6;

    // Date of birth and age
    const dobParts = data.patientData.fechaNacimiento.split('-');
    this.doc.text('FECHA DE NACIMIENTO', this.leftMargin, this.yPosition);
    this.doc.rect(this.leftMargin + 45, this.yPosition - 3, 8, 5);
    this.doc.rect(this.leftMargin + 55, this.yPosition - 3, 8, 5);
    this.doc.rect(this.leftMargin + 65, this.yPosition - 3, 12, 5);
    this.doc.text('DD', this.leftMargin + 47, this.yPosition + 1);
    this.doc.text('MM', this.leftMargin + 57, this.yPosition + 1);
    this.doc.text('AAAA', this.leftMargin + 68, this.yPosition + 1);
    
    this.doc.text(`EDAD ____${data.patientData.edad}____`, this.leftMargin + 85, this.yPosition);
    this.doc.text(`EPS ____${data.patientData.eps}____`, this.leftMargin + 130, this.yPosition);
    this.yPosition += 10;

    // Hospital and center
    this.doc.text('HOSPITAL SANTA MATILDE DE MADRID', this.leftMargin, this.yPosition);
    this.doc.circle(this.leftMargin + 75, this.yPosition - 1, 2, 'F');
    this.doc.text('CENTRO DE SALUD', this.leftMargin + 85, this.yPosition);
    this.doc.circle(this.leftMargin + 125, this.yPosition - 1, 2, 'S');
    this.doc.text('¿CUÁL? ______ FECHA', this.leftMargin + 135, this.yPosition);
    this.doc.rect(this.leftMargin + 170, this.yPosition - 3, 8, 5);
    this.doc.rect(this.leftMargin + 180, this.yPosition - 3, 8, 5);
    this.doc.rect(this.leftMargin + 190, this.yPosition - 3, 12, 5);
    this.doc.text('HORA_____', this.leftMargin + 205, this.yPosition);
    this.yPosition += 10;
  }

  private addEnfoqueDiferencial(data: ConsentPDFData): void {
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('ENFOQUE DIFERENCIAL', this.leftMargin, this.yPosition);
    this.yPosition += 8;

    const enfoques = [
      { label: 'GENERO Y\nORIENTACION\nSEXUAL', checked: data.enfoqueData.gender },
      { label: 'ETNIA', checked: data.enfoqueData.ethnicity },
      { label: 'CICLO VITAL', checked: data.enfoqueData.vital_cycle },
      { label: 'NO APLICA', checked: false },
      { label: 'POSICION SOCIAL\nVULNERABLE', checked: data.enfoqueData.social_position },
      { label: 'DISCAPACIDAD', checked: data.enfoqueData.disability },
      { label: 'CONDICION DE\nVIDA', checked: data.enfoqueData.life_condition }
    ];

    const cols = 4;
    const colWidth = (this.pageWidth - this.leftMargin - this.rightMargin) / cols;

    enfoques.forEach((enfoque, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = this.leftMargin + (col * colWidth);
      const y = this.yPosition + (row * 20);

      this.doc.rect(x, y - 2, colWidth - 5, 15, 'S');
      if (enfoque.checked) {
        this.doc.setFillColor(200, 200, 200);
        this.doc.rect(x + 1, y - 1, colWidth - 7, 13, 'F');
      }
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(8);
      this.doc.text(enfoque.label, x + 2, y + 3);
    });

    this.yPosition += 45;
  }

  private addInformation(): void {
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('INFORMACIÓN', this.leftMargin, this.yPosition);
    this.yPosition += 8;

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    const infoText = `Durante el transcurso de la atención prestada desde el ingreso y hasta el egreso de la institución existe la posibilidad de requerir procedimientos para tratamientos y/o diagnósticos invasivos no quirúrgicos, realizados por el personal encargado de la atención, ya que forman parte integral de su tratamiento.

Dichas intervenciones tienen como propósito contribuir con el proceso asistencial y dar cumplimiento a las órdenes del médico tratante, establecidas dentro del Plan de Cuidado de cada paciente y serán realizadas teniendo en cuenta los Protocolos institucionales, que salvaguarden la Seguridad del paciente y la Calidad de la atención.

Seleccione el (los) Procedimiento(s) que se va(n) a realizar:`;

    this.yPosition = this.addWrappedText(infoText, this.leftMargin, this.yPosition, this.pageWidth - this.leftMargin - this.rightMargin);
    this.yPosition += 8;
  }

  private addProcedureTable(data: ConsentPDFData): void {
    // Table header
    this.doc.setFillColor(52, 73, 153);
    this.doc.rect(this.leftMargin, this.yPosition, this.pageWidth - this.leftMargin - this.rightMargin, 8, 'F');
    
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8);
    
    const colWidths = [15, 35, 45, 25, 25, 25, 25];
    let x = this.leftMargin;
    
    ['Sel', 'Procedimiento', 'Descripción', 'Riesgos', 'Beneficios', 'Alternativas', 'Implicaciones'].forEach((header, i) => {
      this.doc.text(header, x + 2, this.yPosition + 5);
      x += colWidths[i];
    });
    
    this.yPosition += 8;

    // Table row
    this.doc.setFillColor(255, 255, 255);
    this.doc.setTextColor(0, 0, 0);
    this.doc.setFont('helvetica', 'normal');
    
    x = this.leftMargin;
    const rowHeight = 40;
    
    // Draw cell borders and content
    colWidths.forEach((width, i) => {
      this.doc.rect(x, this.yPosition, width, rowHeight, 'S');
      x += width;
    });

    // Checkbox
    this.doc.setFontSize(16);
    this.doc.text('✓', this.leftMargin + 5, this.yPosition + 25);

    // Content
    this.doc.setFontSize(7);
    this.doc.text('Transfusión\nSanguínea', this.leftMargin + 17, this.yPosition + 5);
    
    const description = 'Es el trasplante de un tejido líquido, la sangre. Se realiza a través de la administración intravenosa de cualquiera de sus componentes (glóbulos rojos, plasma, plaquetas, crioprecipitado) con el fin de reponer su pérdida o el déficit en su producción.';
    this.addWrappedText(description, this.leftMargin + 52, this.yPosition + 3, 43, 2.5);
    
    const risks = 'Reacciones alérgicas, fiebre, infecciones, sobrecarga de volumen, reacciones hemolíticas, hipocalcemia.';
    this.addWrappedText(risks, this.leftMargin + 97, this.yPosition + 3, 23, 2.5);
    
    const benefits = 'Mejora de la oxigenación, reposición de componentes sanguíneos, estabilización hemodinámica.';
    this.addWrappedText(benefits, this.leftMargin + 122, this.yPosition + 3, 23, 2.5);
    
    const alternatives = 'Eritropoyetina, soluciones cristaloides/coloid es, hierro intravenoso u oral, autotransfusión.';
    this.addWrappedText(alternatives, this.leftMargin + 147, this.yPosition + 3, 23, 2.5);
    
    const implications = 'Requiere pruebas de compatibilidad, consentimiento informado, monitoreo continuo y disponibilidad de unidades seguras.';
    this.addWrappedText(implications, this.leftMargin + 172, this.yPosition + 3, 23, 2.5);

    this.yPosition += rowHeight + 5;

    // Procedures to perform line
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Procedimientos a realizar:', this.leftMargin, this.yPosition);
    this.doc.line(this.leftMargin + 40, this.yPosition, this.pageWidth - this.rightMargin, this.yPosition);
    this.yPosition += 10;

    // Patient declaration
    const signerName = data.isMinor ? data.guardianName! : `${data.patientData.nombre} ${data.patientData.apellidos}`;
    const signerDocument = data.isMinor ? data.guardianDocument! : data.patientData.numeroDocumento;
    const minorInfo = data.isMinor ? `en representación del menor ${data.patientData.nombre} ${data.patientData.apellidos} Identificado con ${data.patientData.tipoDocumento} número ${data.patientData.numeroDocumento}` : '';
    
    const declaration = `Yo, ${signerName} Mayor de edad, identificado con el número de documento ${signerDocument} en calidad de: Paciente (${data.isMinor ? ' ' : 'X'}) o Acompañante (${data.isMinor ? 'X' : ' '}), ${minorInfo}, he sido informado por el profesional del procedimiento e intervención en salud a la que voy a ser sometido, los beneficios y riesgos`;
    this.yPosition = this.addWrappedText(declaration, this.leftMargin, this.yPosition, this.pageWidth - this.leftMargin - this.rightMargin);
    this.yPosition += 10;
  }

  private addSecondPage(data: ConsentPDFData): void {
    this.doc.addPage();
    this.yPosition = this.topMargin;

    // Second page header
    this.addHeader();
    this.yPosition = 35;

    // Update page number
    this.doc.setFillColor(255, 255, 255);
    this.doc.rect(this.pageWidth - 65, 5, 60, 20, 'F');
    this.doc.setTextColor(0, 0, 0);
    this.doc.setFontSize(8);
    this.doc.text('2 de 2', this.pageWidth - 45, 10);

    // Decision section
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    const decisionText = `Por tanto, he decidido ${data.consentDecision.toUpperCase()} `;
    this.doc.text(decisionText, this.leftMargin, this.yPosition);
    
    if (data.consentDecision === "aprobar") {
      this.doc.text('✓', this.leftMargin + 60, this.yPosition);
    }
    this.doc.text('DISENTIR', this.leftMargin + 70, this.yPosition);
    if (data.consentDecision === "disentir") {
      this.doc.text('✓', this.leftMargin + 95, this.yPosition);
    }

    const continuationText = ` la realización del (los) procedimiento(s) o intervención(es) que se me ha(n) propuesto y entiendo que puedo retirar este consentimiento cuando así lo desee, debiendo informar al equipo asistencial tratante, del cambio de esta decisión. Adicionalmente la entidad en mención y el equipo tratante, quedan autorizados para tomar las conductas o procedimientos asistenciales necesarios tendientes a resolver las posibles complicaciones derivadas del procedimiento, atención o intervención solicitada que mediante este documento autorizo.

He comprendido con claridad todo lo escrito anteriormente, he tenido la oportunidad de hacer preguntas que han sido resueltas y aclaro que el procedimiento, atención o intervención solicitada, declarando que la decisión que tomo es libre y voluntaria.`;

    this.yPosition += 5;
    this.yPosition = this.addWrappedText(continuationText, this.leftMargin, this.yPosition, this.pageWidth - this.leftMargin - this.rightMargin);
    this.yPosition += 15;

    // Signatures section
    const signatureWidth = 80;
    const signatureHeight = 40;

    // Patient signature
    this.doc.rect(this.leftMargin, this.yPosition, signatureWidth, signatureHeight, 'S');
    if (data.patientSignature) {
      try {
        this.doc.addImage(data.patientSignature, 'PNG', this.leftMargin + 5, this.yPosition + 5, signatureWidth - 10, signatureHeight - 20);
      } catch (error) {
        console.error('Error adding patient signature:', error);
      }
    }

    // Professional signature
    const professionalX = this.pageWidth - this.rightMargin - signatureWidth;
    this.doc.rect(professionalX, this.yPosition, signatureWidth, signatureHeight, 'S');
    if (data.professionalSignature) {
      try {
        this.doc.addImage(data.professionalSignature, 'PNG', professionalX + 5, this.yPosition + 5, signatureWidth - 10, signatureHeight - 20);
      } catch (error) {
        console.error('Error adding professional signature:', error);
      }
    }

    this.yPosition += signatureHeight + 2;

    // Signature labels
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Firma del paciente o representante', this.leftMargin, this.yPosition);
    this.doc.text('Firma del profesional o auxiliar', professionalX, this.yPosition);
    this.yPosition += 5;

    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Nombre: ${data.isMinor ? data.guardianName : data.patientData.nombre + ' ' + data.patientData.apellidos}`, this.leftMargin, this.yPosition);
    this.doc.text(`Nombre: ${data.professionalName}`, professionalX, this.yPosition);
    this.yPosition += 5;

    this.doc.text(`Documento de identidad: ${data.isMinor ? data.guardianDocument : data.patientData.numeroDocumento}`, this.leftMargin, this.yPosition);
    this.doc.text(`Documento de identidad: ${data.professionalDocument}`, professionalX, this.yPosition);
    this.yPosition += 5;

    this.doc.text(`Fecha:_______________`, this.leftMargin, this.yPosition);
    this.doc.text(`Fecha:_______________`, professionalX, this.yPosition);
    this.yPosition += 15;

    // Revocation section
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('En caso de revocatoria, diligenciar a continuación:', this.leftMargin, this.yPosition);
    this.yPosition += 8;

    this.doc.setFont('helvetica', 'normal');
    this.doc.text('HE DECIDIDO REVOCAR MI ANTERIOR\nAUTORIZACIÓN', this.leftMargin, this.yPosition);

    // Revocation signature box
    const revocationX = this.pageWidth - this.rightMargin - 90;
    this.doc.rect(revocationX, this.yPosition - 5, 85, 30, 'S');
    this.doc.text('Nombre: _______________________', revocationX + 2, this.yPosition + 15);
    this.doc.text('Documento de identidad: ___________', revocationX + 2, this.yPosition + 20);
    this.doc.text('Fecha:________________________', revocationX + 2, this.yPosition + 25);

    this.yPosition += 10;
    this.doc.setFontSize(8);
    this.doc.text('Firma del paciente o representante', revocationX, this.yPosition + 15);
  }

  public generatePDF(data: ConsentPDFData): jsPDF {
    this.addHeader();
    this.addPatientData(data);
    this.addEnfoqueDiferencial(data);
    this.addInformation();
    this.addProcedureTable(data);
    this.addSecondPage(data);

    return this.doc;
  }
}

console.log('ConsentPDFGenerator class exported successfully');