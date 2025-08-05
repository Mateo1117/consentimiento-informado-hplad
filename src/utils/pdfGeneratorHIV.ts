import jsPDF from 'jspdf';

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

interface ConsentPDFData {
  patientData: PatientData;
  isMinor: boolean;
  guardianName?: string;
  guardianDocument?: string;
  guardianRelationship?: string;
  professionalName: string;
  professionalDocument: string;
  consentDecision: 'aprobar' | 'disentir';
  selectedProcedures: ProcedureData[];
  patientSignature: string;
  professionalSignature: string;
  patientPhoto?: string | null;
  enfoqueData: {
    gender: boolean;
    ethnicity: boolean;
    vital_cycle: boolean;
    social_position: boolean;
    disability: boolean;
    life_condition: boolean;
  };
}

export class ConsentPDFGenerator {
  private pdf: jsPDF;
  private currentY: number;
  private readonly pageWidth = 210;
  private readonly pageHeight = 297;
  private readonly margin = 15;
  private readonly usableWidth: number;

  constructor() {
    this.pdf = new jsPDF('p', 'mm', 'a4');
    this.currentY = this.margin;
    this.usableWidth = this.pageWidth - (this.margin * 2);
  }

  private checkPageBreak(requiredSpace: number): boolean {
    if (this.currentY + requiredSpace > this.pageHeight - this.margin - 15) {
      this.pdf.addPage();
      this.currentY = this.margin;
      return true;
    }
    return false;
  }

  private renderHeader(): void {
    this.pdf.setLineWidth(0.5);
    
    // Main header rectangle
    this.pdf.rect(this.margin, this.currentY, this.usableWidth, 28);
    
    // Logo section (left)
    this.pdf.rect(this.margin, this.currentY, 40, 28);
    this.pdf.setFontSize(16);
    this.pdf.setFont("helvetica", "bold");
    this.pdf.setTextColor(0, 100, 150);
    this.pdf.text('HSM', this.margin + 20, this.currentY + 12, { align: 'center' });
    this.pdf.setFontSize(8);
    this.pdf.setTextColor(0, 0, 0);
    this.pdf.text('E.S.E. Hospital Santa Matilde', this.margin + 20, this.currentY + 18, { align: 'center' });
    
    // Central section
    const centerX = this.margin + 42;
    const centerWidth = this.usableWidth - 82;
    this.pdf.rect(centerX, this.currentY, centerWidth, 28);
    
    this.pdf.setFontSize(12);
    this.pdf.setFont("helvetica", "bold");
    this.pdf.text('E.S.E. HOSPITAL SANTA MATILDE', centerX + centerWidth/2, this.currentY + 8, { align: 'center' });
    this.pdf.setFontSize(9);
    this.pdf.text('Nit: 860.009.555-7', centerX + centerWidth/2, this.currentY + 13, { align: 'center' });
    this.pdf.setFontSize(10);
    this.pdf.text('CONSENTIMIENTO INFORMADO', centerX + centerWidth/2, this.currentY + 18, { align: 'center' });
    this.pdf.text('TOMA DE MUESTRAS HIV', centerX + centerWidth/2, this.currentY + 23, { align: 'center' });
    
    // Info section (right)
    const infoX = this.pageWidth - this.margin - 40;
    this.pdf.rect(infoX, this.currentY, 40, 28);
    
    this.pdf.setFontSize(8);
    this.pdf.setFont("helvetica", "normal");
    this.pdf.text('Página:', infoX + 2, this.currentY + 4);
    this.pdf.text('1 de 2', infoX + 35, this.currentY + 4, { align: 'right' });
    this.pdf.text('Versión:', infoX + 2, this.currentY + 8);
    this.pdf.text('09', infoX + 35, this.currentY + 8, { align: 'right' });
    this.pdf.text('Fecha:', infoX + 2, this.currentY + 12);
    this.pdf.text('Enero de 2025', infoX + 35, this.currentY + 12, { align: 'right' });
    this.pdf.text('Código:', infoX + 2, this.currentY + 16);
    this.pdf.text('1203SUBCIE-F65', infoX + 35, this.currentY + 16, { align: 'right' });
    this.pdf.text('Documento:', infoX + 2, this.currentY + 20);
    this.pdf.text('Controlado', infoX + 35, this.currentY + 20, { align: 'right' });
    
    this.currentY += 35;
  }

  private renderPatientData(data: ConsentPDFData): void {
    this.pdf.setFontSize(10);
    this.pdf.setFont("helvetica", "bold");
    this.pdf.text('DATOS DE IDENTIFICACIÓN', this.margin, this.currentY);
    this.currentY += 8;
    
    this.pdf.setFont("helvetica", "normal");
    // Nombre y apellidos
    this.pdf.text('NOMBRE Y APELLIDO(S):', this.margin, this.currentY);
    const fullName = `${data.patientData.nombre} ${data.patientData.apellidos}`;
    this.pdf.line(this.margin + 55, this.currentY + 1, this.pageWidth - this.margin, this.currentY + 1);
    this.pdf.text(fullName, this.margin + 57, this.currentY);
    this.currentY += 10;
    
    // Tipo de identificación
    this.pdf.text('TIPO DE IDENTIFICACIÓN', this.margin, this.currentY);
    this.pdf.text('NÚMERO DE IDENTIFICACIÓN', this.margin + 110, this.currentY);
    this.currentY += 8;
    
    const docTypes = ['RC', 'CC', 'TI', 'CE', 'OTRO'];
    let docX = this.margin;
    docTypes.forEach((type) => {
      this.pdf.circle(docX + 3, this.currentY, 2);
      if (type === data.patientData.tipoDocumento) {
        this.pdf.circle(docX + 3, this.currentY, 1, 'F');
      }
      this.pdf.text(type, docX + 7, this.currentY + 1);
      docX += 18;
    });
    
    this.pdf.line(this.margin + 110, this.currentY + 1, this.pageWidth - this.margin, this.currentY + 1);
    this.pdf.text(data.patientData.numeroDocumento, this.margin + 112, this.currentY);
    this.currentY += 12;
    
    // Fecha de nacimiento y edad
    this.pdf.text('FECHA DE NACIMIENTO', this.margin, this.currentY);
    this.pdf.text('EDAD', this.margin + 80, this.currentY);
    this.pdf.text('EPS', this.margin + 120, this.currentY);
    this.currentY += 8;
    
    const birthDate = new Date(data.patientData.fechaNacimiento);
    this.pdf.rect(this.margin, this.currentY - 2, 12, 6);
    this.pdf.rect(this.margin + 15, this.currentY - 2, 12, 6);
    this.pdf.rect(this.margin + 30, this.currentY - 2, 20, 6);
    
    this.pdf.setFontSize(7);
    this.pdf.text('DD', this.margin + 4, this.currentY - 4);
    this.pdf.text('MM', this.margin + 19, this.currentY - 4);
    this.pdf.text('AAAA', this.margin + 37, this.currentY - 4);
    
    this.pdf.setFontSize(10);
    this.pdf.text(birthDate.getDate().toString().padStart(2, '0'), this.margin + 4, this.currentY + 2);
    this.pdf.text((birthDate.getMonth() + 1).toString().padStart(2, '0'), this.margin + 19, this.currentY + 2);
    this.pdf.text(birthDate.getFullYear().toString(), this.margin + 33, this.currentY + 2);
    
    this.pdf.line(this.margin + 80, this.currentY + 1, this.margin + 110, this.currentY + 1);
    this.pdf.text(data.patientData.edad.toString(), this.margin + 82, this.currentY);
    
    this.pdf.line(this.margin + 120, this.currentY + 1, this.pageWidth - this.margin, this.currentY + 1);
    this.pdf.text(data.patientData.eps, this.margin + 122, this.currentY);
    this.currentY += 15;
    
    // Hospital selection - moved down to avoid overlap
    const isHospital = data.patientData.centroSalud === "Hospital Santa Matilde de Madrid";
    this.pdf.circle(this.margin + 3, this.currentY, 2);
    if (isHospital) this.pdf.circle(this.margin + 3, this.currentY, 1, 'F');
    this.pdf.text('HOSPITAL SANTA MATILDE DE MADRID', this.margin + 8, this.currentY + 1);
    
    this.pdf.circle(this.margin + 100, this.currentY, 2);
    if (!isHospital) this.pdf.circle(this.margin + 100, this.currentY, 1, 'F');
    this.pdf.text('CENTRO DE SALUD:', this.margin + 105, this.currentY + 1);
    this.pdf.text('¿CUÁL?', this.margin + 145, this.currentY + 1);
    this.pdf.line(this.margin + 158, this.currentY + 1, this.pageWidth - 50, this.currentY + 1);
    
    if (!isHospital) {
      this.pdf.text(data.patientData.centroSalud, this.margin + 160, this.currentY);
    }
    this.currentY += 8;
    
    // Date and time section - positioned separately to avoid overlap
    this.pdf.text('FECHA', this.pageWidth - 45, this.currentY + 1);
    this.pdf.rect(this.pageWidth - 35, this.currentY - 2, 10, 6);
    this.pdf.rect(this.pageWidth - 23, this.currentY - 2, 10, 6);
    this.pdf.rect(this.pageWidth - 11, this.currentY - 2, 10, 6);
    this.pdf.setFontSize(7);
    this.pdf.text('DD', this.pageWidth - 31, this.currentY - 4);
    this.pdf.text('MM', this.pageWidth - 19, this.currentY - 4);
    this.pdf.text('AAAA', this.pageWidth - 7, this.currentY - 4);
    
    const currentDate = new Date();
    this.pdf.setFontSize(10);
    this.pdf.text(currentDate.getDate().toString().padStart(2, '0'), this.pageWidth - 31, this.currentY + 2);
    this.pdf.text((currentDate.getMonth() + 1).toString().padStart(2, '0'), this.pageWidth - 19, this.currentY + 2);
    this.pdf.text(currentDate.getFullYear().toString(), this.pageWidth - 7, this.currentY + 2);
    
    this.pdf.text('HORA', this.pageWidth - 35, this.currentY + 8);
    this.pdf.line(this.pageWidth - 25, this.currentY + 9, this.pageWidth - this.margin, this.currentY + 9);
    
    const currentTime = `${currentDate.getHours().toString().padStart(2, '0')}:${currentDate.getMinutes().toString().padStart(2, '0')}`;
    this.pdf.text(currentTime, this.pageWidth - 23, this.currentY + 8);
    
    this.currentY += 20;
  }

  private renderDifferentialApproach(data: ConsentPDFData): void {
    this.pdf.setFontSize(10);
    this.pdf.setFont("helvetica", "bold");
    this.pdf.text('ENFOQUE DIFERENCIAL', this.margin, this.currentY);
    this.currentY += 8;
    
    this.pdf.setFont("helvetica", "normal");
    this.pdf.setFontSize(8);
    
    // First row - Better distributed checkboxes
    const boxSize = 8;
    const items = [
      { label: 'GÉNERO Y\nORIENTACIÓN\nSEXUAL', checked: data.enfoqueData.gender, width: 40 },
      { label: 'ETNIA', checked: data.enfoqueData.ethnicity, width: 30 },
      { label: 'CICLO VITAL', checked: data.enfoqueData.vital_cycle, width: 30 },
      { label: 'NO APLICA', checked: false, width: 35 }
    ];
    
    let x = this.margin;
    items.forEach((item) => {
      this.pdf.rect(x, this.currentY, item.width, 18);
      this.pdf.rect(x + item.width - 14, this.currentY + 2, boxSize, boxSize);
      
      if (item.checked) {
        this.pdf.text('X', x + item.width - 10, this.currentY + 8);
      }
      
      const lines = item.label.split('\n');
      lines.forEach((line, lineIndex) => {
        this.pdf.text(line, x + 2, this.currentY + 6 + (lineIndex * 3));
      });
      
      x += item.width;
    });
    this.currentY += 22;
    
    // Second row - Better distributed
    const items2 = [
      { label: 'POSICIÓN SOCIAL\nVULNERABLE', checked: data.enfoqueData.social_position, width: 40 },
      { label: 'DISCAPACIDAD', checked: data.enfoqueData.disability, width: 35 },
      { label: 'CONDICIÓN DE\nVIDA', checked: data.enfoqueData.life_condition, width: 35 }
    ];
    
    x = this.margin;
    items2.forEach((item) => {
      this.pdf.rect(x, this.currentY, item.width, 18);
      this.pdf.rect(x + item.width - 14, this.currentY + 2, boxSize, boxSize);
      
      if (item.checked) {
        this.pdf.text('X', x + item.width - 10, this.currentY + 8);
      }
      
      const lines = item.label.split('\n');
      lines.forEach((line, lineIndex) => {
        this.pdf.text(line, x + 2, this.currentY + 6 + (lineIndex * 3));
      });
      
      x += item.width;
    });
    this.currentY += 25;
  }

  private renderInformation(): void {
    this.pdf.setFontSize(10);
    this.pdf.setFont("helvetica", "bold");
    this.pdf.text('INFORMACIÓN', this.margin, this.currentY);
    this.currentY += 8;
    
    this.pdf.setFont("helvetica", "normal");
    this.pdf.setFontSize(9);
    
    const infoText = `Durante el transcurso de la atención prestada desde el ingreso y hasta el egreso de la institución existe la posibilidad de requerir procedimientos para
tratamientos y/o diagnósticos invasivos no quirúrgicos, realizados por el personal encargado de la atención, ya que forman parte integral de su
tratamiento.

Dichas intervenciones tienen como propósito contribuir con el proceso asistencial y dar cumplimiento a las órdenes del médico tratante, establecidas
dentro del Plan de Cuidado de cada paciente y serán realizadas teniendo en cuenta los Protocolos institucionales, que salvaguarden la Seguridad del
paciente y la Calidad de la atención.

Seleccione el (los) Procedimiento(s) que se va(n) a realizar:`;

    const lines = this.pdf.splitTextToSize(infoText, this.usableWidth);
    lines.forEach((line: string, index: number) => {
      this.pdf.text(line, this.margin, this.currentY + (index * 4));
    });
    this.currentY += lines.length * 4 + 8;
  }

  private renderProceduresTable(data: ConsentPDFData): void {
    const tableY = this.currentY;
    const colWidths = [12, 30, 45, 30, 25, 25, 25];
    const rowHeight = 8;
    const headerHeight = 12;
    
    // Headers
    this.pdf.setFontSize(8);
    this.pdf.setFont("helvetica", "bold");
    this.pdf.setFillColor(200, 200, 200);
    
    let x = this.margin;
    const headers = ['Sel', 'Procedimiento', 'Descripción', 'Riesgos', 'Beneficios', 'Alternativas', 'Implicaciones'];
    
    headers.forEach((header, index) => {
      this.pdf.rect(x, tableY, colWidths[index], headerHeight, 'FD');
      this.pdf.text(header, x + 2, tableY + 8);
      x += colWidths[index];
    });
    
    this.currentY = tableY + headerHeight;
    
    // VIH procedure
    const hivProcedure = {
      id: "toma_muestra_hiv",
      nombre: "Toma de muestra sanguínea para detección de VIH",
      descripcion: "Extracción de sangre venosa o recolección de fluido oral para detectar la presencia de anticuerpos, antígenos o material genético del VIH mediante pruebas rápidas, ELISA o PCR.",
      riesgos: "Mínimos: dolor en el sitio de punción, hematoma, mareo; en prueba oral, posible irritación en encías.",
      beneficios: "Diagnóstico temprano, acceso oportuno a tratamiento y consejería, reducción del riesgo de transmisión.",
      alternativas: "Autopruebas de VIH, pruebas de cuarta generación, pruebas de detección de carga viral.",
      implicaciones: "Requiere consentimiento informado, asesoría pre y post prueba, confidencialidad y seguimiento en caso de resultado positivo."
    };
    
    this.pdf.setFont("helvetica", "normal");
    this.pdf.setFillColor(255, 255, 255);
    
    const isSelected = data.selectedProcedures.some(selected => selected.id === hivProcedure.id);
    
    const maxLines = Math.max(
      this.pdf.splitTextToSize(hivProcedure.descripcion, colWidths[2] - 4).length,
      this.pdf.splitTextToSize(hivProcedure.riesgos, colWidths[3] - 4).length,
      this.pdf.splitTextToSize(hivProcedure.beneficios, colWidths[4] - 4).length,
      this.pdf.splitTextToSize(hivProcedure.alternativas, colWidths[5] - 4).length,
      this.pdf.splitTextToSize(hivProcedure.implicaciones, colWidths[6] - 4).length
    );
    
    const currentRowHeight = Math.max(rowHeight, maxLines * 3 + 4);
    
    x = this.margin;
    
    // Selection checkbox
    this.pdf.rect(x, this.currentY, colWidths[0], currentRowHeight);
    if (isSelected) {
      this.pdf.text('✓', x + 4, this.currentY + currentRowHeight/2 + 2);
    }
    x += colWidths[0];
    
    // Procedure name
    this.pdf.rect(x, this.currentY, colWidths[1], currentRowHeight);
    this.pdf.text(hivProcedure.nombre, x + 2, this.currentY + 6);
    x += colWidths[1];
    
    // Description
    this.pdf.rect(x, this.currentY, colWidths[2], currentRowHeight);
    const descLines = this.pdf.splitTextToSize(hivProcedure.descripcion, colWidths[2] - 4);
    descLines.forEach((line: string, lineIndex: number) => {
      this.pdf.text(line, x + 2, this.currentY + 4 + (lineIndex * 3));
    });
    x += colWidths[2];
    
    // Risks
    this.pdf.rect(x, this.currentY, colWidths[3], currentRowHeight);
    const riskLines = this.pdf.splitTextToSize(hivProcedure.riesgos, colWidths[3] - 4);
    riskLines.forEach((line: string, lineIndex: number) => {
      this.pdf.text(line, x + 2, this.currentY + 4 + (lineIndex * 3));
    });
    x += colWidths[3];
    
    // Benefits
    this.pdf.rect(x, this.currentY, colWidths[4], currentRowHeight);
    const benefitLines = this.pdf.splitTextToSize(hivProcedure.beneficios, colWidths[4] - 4);
    benefitLines.forEach((line: string, lineIndex: number) => {
      this.pdf.text(line, x + 2, this.currentY + 4 + (lineIndex * 3));
    });
    x += colWidths[4];
    
    // Alternatives
    this.pdf.rect(x, this.currentY, colWidths[5], currentRowHeight);
    const altLines = this.pdf.splitTextToSize(hivProcedure.alternativas, colWidths[5] - 4);
    altLines.forEach((line: string, lineIndex: number) => {
      this.pdf.text(line, x + 2, this.currentY + 4 + (lineIndex * 3));
    });
    x += colWidths[5];
    
    // Implications
    this.pdf.rect(x, this.currentY, colWidths[6], currentRowHeight);
    const implLines = this.pdf.splitTextToSize(hivProcedure.implicaciones, colWidths[6] - 4);
    implLines.forEach((line: string, lineIndex: number) => {
      this.pdf.text(line, x + 2, this.currentY + 4 + (lineIndex * 3));
    });
    
    this.currentY += currentRowHeight;
    this.currentY += 10;
  }

  private renderConsentDeclaration(data: ConsentPDFData): void {
    this.checkPageBreak(100);
    
    this.pdf.setFontSize(9);
    this.pdf.setFont("helvetica", "normal");
    
    this.pdf.text('Procedimientos a realizar:', this.margin, this.currentY);
    this.pdf.line(this.margin + 45, this.currentY + 1, this.pageWidth - this.margin, this.currentY + 1);
    this.currentY += 10;
    
    const signerName = data.isMinor ? data.guardianName! : `${data.patientData.nombre} ${data.patientData.apellidos}`;
    const signerDocument = data.isMinor ? data.guardianDocument! : data.patientData.numeroDocumento;
    
    const minorInfo = data.isMinor ? `en representación del menor ${data.patientData.nombre} ${data.patientData.apellidos} Identificado con ${data.patientData.tipoDocumento} número ${data.patientData.numeroDocumento}` : '';
    
    const declarationText = `Yo, ${signerName} Mayor de edad, identificado con el número de documento ${signerDocument}
en calidad de: Paciente (  ) o Acompañante (  ), ${minorInfo}, he sido informado por el profesional del procedimiento e intervención en salud a la que voy a ser sometido, los beneficios
y riesgos

Por tanto, he decidido APROBAR ___ DISENTIR ___ la realización del (los) procedimiento(s) o intervención(es) que se me
ha(n) propuesto y entiendo que puedo retirar este consentimiento cuando así lo desee, debiendo informar al equipo
asistencial tratante, del cambio de esta decisión. Adicionalmente la entidad en mención y el equipo tratante, quedan autorizados
para tomar las conductas o procedimientos asistenciales necesarios y aplicar los recursos tendientes a resolver las posibles complicaciones derivadas
del procedimiento, atención o intervención solicitada que mediante este documento autorizo.
He comprendido con claridad todo lo escrito anteriormente, he tenido la oportunidad de hacer preguntas que han sido resueltas y
acepto la realización del procedimiento, atención o intervención solicitada, declarando que la decisión que tomo es libre y
voluntaria.`;

    const lines = this.pdf.splitTextToSize(declarationText, this.usableWidth);
    lines.forEach((line: string, index: number) => {
      if (this.currentY + 4 > this.pageHeight - this.margin - 15) {
        this.pdf.addPage();
        this.currentY = this.margin;
      }
      
      let finalLine = line;
      
      if (line.includes('Paciente (  ) o Acompañante (  )')) {
        const isPatient = !data.isMinor;
        const patientMark = isPatient ? 'X' : ' ';
        const acompMark = isPatient ? ' ' : 'X';
        const updatedLine = line.replace('Paciente (  ) o Acompañante (  )', `Paciente (${patientMark}) o Acompañante (${acompMark})`);
        this.pdf.text(updatedLine, this.margin, this.currentY);
      } else if (line.includes('APROBAR ___ DISENTIR ___')) {
        const isApproved = data.consentDecision === 'aprobar';
        if (isApproved) {
          this.pdf.text(line.replace('APROBAR ___ DISENTIR ___', 'APROBAR X DISENTIR ___'), this.margin, this.currentY);
        } else {
          this.pdf.text(line.replace('APROBAR ___ DISENTIR ___', 'APROBAR ___ DISENTIR X'), this.margin, this.currentY);
        }
      } else {
        this.pdf.text(finalLine, this.margin, this.currentY);
      }
      
      this.currentY += 4;
    });
    
    this.currentY += 10;
  }

  private renderSignatureSection(data: ConsentPDFData): void {
    this.checkPageBreak(80);
    
    // Signature boxes
    const leftX = this.margin;
    const rightX = this.pageWidth/2 + 10;
    const boxWidth = 70;
    const boxHeight = 40;
    
    // Left signature (patient/guardian)
    this.pdf.rect(leftX, this.currentY, boxWidth, boxHeight);
    if (data.patientSignature) {
      try {
        this.pdf.addImage(data.patientSignature, 'PNG', leftX + 2, this.currentY + 2, boxWidth - 4, boxHeight - 4);
      } catch (error) {
        console.warn('Error adding patient signature:', error);
      }
    }
    
    // Patient photo (same as laboratory format)
    const photoWidth = 35;
    const photoHeight = 45;
    const photoX = boxWidth + 5;
    
    this.pdf.rect(leftX + photoX, this.currentY, photoWidth, photoHeight);
    if (data.patientPhoto) {
      try {
        const imageData = data.patientPhoto.includes(',') ? 
          data.patientPhoto.split(',')[1] : data.patientPhoto;
        this.pdf.addImage(`data:image/jpeg;base64,${imageData}`, 'JPEG', leftX + photoX + 2, this.currentY + 2, photoWidth - 4, photoHeight - 4);
      } catch (error) {
        console.warn('Error adding patient photo:', error);
      }
    } else {
      this.pdf.setFontSize(8);
      this.pdf.text('Sin foto', leftX + photoX + photoWidth/2, this.currentY + photoHeight/2, { align: 'center' });
    }
    
    // Right signature (professional)
    this.pdf.rect(rightX, this.currentY, boxWidth, boxHeight);
    if (data.professionalSignature) {
      try {
        this.pdf.addImage(data.professionalSignature, 'PNG', rightX + 2, this.currentY + 2, boxWidth - 4, boxHeight - 4);
      } catch (error) {
        console.warn('Error adding professional signature:', error);
      }
    }
    
    this.currentY += Math.max(boxHeight, photoHeight) + 5;
    
    // Labels
    this.pdf.setFontSize(9);
    this.pdf.text('Firma del paciente o representante', leftX, this.currentY);
    this.pdf.text('Firma del profesional o auxiliar', rightX, this.currentY);
    this.currentY += 8;
    
    // Names
    const signerName = data.isMinor ? data.guardianName! : `${data.patientData.nombre} ${data.patientData.apellidos}`;
    
    this.pdf.text('Nombre:', leftX, this.currentY);
    this.pdf.text('Nombre:', rightX, this.currentY);
    this.pdf.line(leftX + 20, this.currentY + 1, leftX + boxWidth, this.currentY + 1);
    this.pdf.line(rightX + 20, this.currentY + 1, rightX + boxWidth, this.currentY + 1);
    this.pdf.text(signerName, leftX + 22, this.currentY);
    this.pdf.text(data.professionalName, rightX + 22, this.currentY);
    this.currentY += 8;
    
    // Documents
    const signerDocument = data.isMinor ? data.guardianDocument! : data.patientData.numeroDocumento;
    
    this.pdf.text('Documento de identidad:', leftX, this.currentY);
    this.pdf.text('Documento de identidad:', rightX, this.currentY);
    this.pdf.line(leftX + 40, this.currentY + 1, leftX + boxWidth, this.currentY + 1);
    this.pdf.line(rightX + 40, this.currentY + 1, rightX + boxWidth, this.currentY + 1);
    this.pdf.text(signerDocument, leftX + 42, this.currentY);
    this.pdf.text(data.professionalDocument, rightX + 42, this.currentY);
    this.currentY += 8;
    
    // Photo label
    this.pdf.text('Foto', leftX + photoX + photoWidth/2, this.currentY - 16, { align: 'center' });
    
    // Dates
    const currentDate = new Date().toLocaleDateString('es-CO');
    this.pdf.text('Fecha:', leftX, this.currentY);
    this.pdf.text('Fecha:', rightX, this.currentY);
    this.pdf.line(leftX + 20, this.currentY + 1, leftX + boxWidth, this.currentY + 1);
    this.pdf.line(rightX + 20, this.currentY + 1, rightX + boxWidth, this.currentY + 1);
    this.pdf.text(currentDate, leftX + 22, this.currentY);
    this.pdf.text(currentDate, rightX + 22, this.currentY);
    this.currentY += 15;
    
    // Revocation section (same as laboratory)
    this.pdf.text('En caso de revocatoria, diligenciar a continuación:', this.margin, this.currentY);
    this.currentY += 10;
    
    this.pdf.setFont("helvetica", "bold");
    this.pdf.text('HE DECIDIDO REVOCAR MI ANTERIOR', this.margin, this.currentY);
    this.currentY += 6;
    this.pdf.text('AUTORIZACIÓN', this.margin, this.currentY);
    this.currentY += 10;
    
    this.pdf.rect(this.pageWidth/2, this.currentY - 15, 60, 25);
    
    this.pdf.setFont("helvetica", "normal");
    this.pdf.text('Nombre:', this.pageWidth/2 + 65, this.currentY - 10);
    this.pdf.line(this.pageWidth/2 + 75, this.currentY - 9, this.pageWidth - this.margin, this.currentY - 9);
    this.pdf.text('Documento de identidad:', this.pageWidth/2 + 65, this.currentY - 4);
    this.pdf.line(this.pageWidth/2 + 95, this.currentY - 3, this.pageWidth - this.margin, this.currentY - 3);
    this.pdf.text('Fecha:', this.pageWidth/2 + 65, this.currentY + 2);
    this.pdf.line(this.pageWidth/2 + 75, this.currentY + 3, this.pageWidth - this.margin, this.currentY + 3);
    
    this.pdf.text('Firma del paciente o representante', this.pageWidth/2, this.currentY + 12);
  }

  public generatePDF(data: ConsentPDFData): jsPDF {
    this.renderHeader();
    this.renderPatientData(data);
    this.renderDifferentialApproach(data);
    this.renderInformation();
    this.renderProceduresTable(data);
    this.renderConsentDeclaration(data);
    this.renderSignatureSection(data);

    return this.pdf;
  }

  public save(filename: string): void {
    this.pdf.save(filename);
  }
}

export type { ConsentPDFData, PatientData, ProcedureData };