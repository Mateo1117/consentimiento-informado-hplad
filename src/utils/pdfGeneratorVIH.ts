import jsPDF from 'jspdf';
import { PatientData } from '@/services/patientApi';

interface VIHData {
  patientData: PatientData;
  professionalName: string;
  professionalDocument: string;
  signatureData?: string;
  date: string;
  time: string;
}

export class PDFGeneratorVIH {
  private pdf: jsPDF;
  private margin = 20;
  private currentY = 20;
  private pageWidth = 210;
  private pageHeight = 297;

  constructor() {
    this.pdf = new jsPDF('p', 'mm', 'a4');
    this.pdf.setFont('helvetica');
  }

  generate(data: VIHData): jsPDF {
    this.drawHeader();
    this.drawPatientData(data);
    this.drawProcedureData();
    this.drawConsent();
    this.drawSignatures(data);
    this.drawFooter();
    
    return this.pdf;
  }

  private drawHeader() {
    // Header border
    this.pdf.setLineWidth(1);
    this.pdf.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 30);
    
    // Logo area with circle (medical symbol)
    this.pdf.setFillColor(46, 125, 50); // Green background for logo
    this.pdf.circle(this.margin + 15, this.currentY + 15, 12, 'F');
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.setFontSize(16);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('H', this.margin + 12, this.currentY + 18);
    
    // Hospital name
    this.pdf.setTextColor(0, 0, 0);
    this.pdf.setFontSize(14);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('E.S.E', this.margin + 32, this.currentY + 8);
    this.pdf.text('HOSPITAL', this.margin + 32, this.currentY + 14);
    this.pdf.text('LA MESA', this.margin + 32, this.currentY + 20);
    this.pdf.setFontSize(8);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text('PEDRO LEON ALVAREZ DIAZ', this.margin + 32, this.currentY + 24);
    
    // Center section - Form title
    this.pdf.setFontSize(12);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('FORMATO 39', 105, this.currentY + 8, { align: 'center' });
    this.pdf.text('CONSENTIMIENTO INFORMADO', 105, this.currentY + 14, { align: 'center' });
    this.pdf.text('PARA PRUEBA PRESUNTIVA DE VIH', 105, this.currentY + 20, { align: 'center' });
    
    // Right side - Code table
    const codeBoxX = this.pageWidth - 60;
    this.pdf.setLineWidth(0.5);
    this.pdf.rect(codeBoxX, this.currentY + 2, 38, 26);
    
    // Table rows
    this.pdf.line(codeBoxX, this.currentY + 8, codeBoxX + 38, this.currentY + 8);
    this.pdf.line(codeBoxX, this.currentY + 14, codeBoxX + 38, this.currentY + 14);
    this.pdf.line(codeBoxX, this.currentY + 20, codeBoxX + 38, this.currentY + 20);
    this.pdf.line(codeBoxX + 20, this.currentY + 2, codeBoxX + 20, this.currentY + 28);
    
    this.pdf.setFontSize(8);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Código', codeBoxX + 2, this.currentY + 6);
    this.pdf.text('SC-M-09.39', codeBoxX + 22, this.currentY + 6);
    this.pdf.text('Versión', codeBoxX + 2, this.currentY + 12);
    this.pdf.text('01', codeBoxX + 22, this.currentY + 12);
    this.pdf.text('Fecha', codeBoxX + 2, this.currentY + 18);
    this.pdf.text('29-12-2022', codeBoxX + 22, this.currentY + 18);
    
    this.currentY += 35;
  }

  private drawPatientData(data: VIHData) {
    // Patient data header with gray background
    this.pdf.setFillColor(220, 220, 220);
    this.pdf.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 8, 'F');
    this.pdf.setLineWidth(1);
    this.pdf.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 8);
    
    this.pdf.setTextColor(0, 0, 0);
    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('DATOS DEL PACIENTE', 105, this.currentY + 5, { align: 'center' });
    
    this.currentY += 8;
    
    // Main patient info table
    this.pdf.setLineWidth(1);
    const tableWidth = this.pageWidth - 2 * this.margin;
    
    // Header row
    this.pdf.rect(this.margin, this.currentY, tableWidth * 0.6, 8);
    this.pdf.rect(this.margin + tableWidth * 0.6, this.currentY, tableWidth * 0.15, 8);
    this.pdf.rect(this.margin + tableWidth * 0.75, this.currentY, tableWidth * 0.25, 8);
    
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('NOMBRE COMPLETO', this.margin + 2, this.currentY + 5);
    this.pdf.text('SEXO', this.margin + tableWidth * 0.6 + 2, this.currentY + 5);
    this.pdf.text('FECHA Y HORA', this.margin + tableWidth * 0.75 + 2, this.currentY + 5);
    
    this.currentY += 8;
    
    // Data row 1
    this.pdf.rect(this.margin, this.currentY, tableWidth * 0.6, 12);
    this.pdf.rect(this.margin + tableWidth * 0.6, this.currentY, tableWidth * 0.075, 12);
    this.pdf.rect(this.margin + tableWidth * 0.675, this.currentY, tableWidth * 0.075, 12);
    this.pdf.rect(this.margin + tableWidth * 0.75, this.currentY, tableWidth * 0.25, 12);
    
    // Patient name
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(`${data.patientData.nombre} ${data.patientData.apellidos}`.trim(), this.margin + 2, this.currentY + 7);
    
    // Sex indicators
    this.pdf.setFontSize(8);
    this.pdf.text('F', this.margin + tableWidth * 0.6 + 5, this.currentY + 4);
    this.pdf.text('M', this.margin + tableWidth * 0.675 + 5, this.currentY + 4);
    
    // Date and time
    this.pdf.setFontSize(9);
    this.pdf.text(`${data.date} ${data.time}`, this.margin + tableWidth * 0.75 + 2, this.currentY + 7);
    
    this.currentY += 12;
    
    // Document section - complex table
    const docRowHeight = 8;
    
    // Headers
    this.pdf.rect(this.margin, this.currentY, 35, docRowHeight);
    this.pdf.rect(this.margin + 35, this.currentY, 15, docRowHeight);
    this.pdf.rect(this.margin + 50, this.currentY, 15, docRowHeight);
    this.pdf.rect(this.margin + 65, this.currentY, 20, docRowHeight);
    this.pdf.rect(this.margin + 85, this.currentY, 30, docRowHeight);
    this.pdf.rect(this.margin + 115, this.currentY, 30, docRowHeight);
    this.pdf.rect(this.margin + 145, this.currentY, 45, docRowHeight);
    
    this.pdf.setFontSize(7);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('DOCUMENTO - N° HC', this.margin + 2, this.currentY + 5);
    this.pdf.text('TIPO', this.margin + 37, this.currentY + 5);
    this.pdf.text('EDAD', this.margin + 52, this.currentY + 5);
    this.pdf.text('EPS', this.margin + 67, this.currentY + 5);
    this.pdf.text('RÉGIMEN', this.margin + 87, this.currentY + 5);
    this.pdf.text('PPNA', this.margin + 117, this.currentY + 5);
    
    // Document type checkboxes
    this.pdf.setFontSize(6);
    this.pdf.text('RC TI CC CE OTRO', this.margin + 37, this.currentY + 3);
    this.pdf.text('C S P', this.margin + 147, this.currentY + 3);
    this.pdf.text('Contrib Subsid Partic Por No afilia Otro', this.margin + 147, this.currentY + 6);
    
    this.currentY += docRowHeight;
    
    // Data row
    this.pdf.rect(this.margin, this.currentY, 35, 12);
    this.pdf.rect(this.margin + 35, this.currentY, 15, 12);
    this.pdf.rect(this.margin + 50, this.currentY, 15, 12);
    this.pdf.rect(this.margin + 65, this.currentY, 20, 12);
    this.pdf.rect(this.margin + 85, this.currentY, 30, 12);
    this.pdf.rect(this.margin + 115, this.currentY, 30, 12);
    this.pdf.rect(this.margin + 145, this.currentY, 45, 12);
    
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(8);
    this.pdf.text(data.patientData.numeroDocumento, this.margin + 2, this.currentY + 7);
    this.pdf.text(data.patientData.tipoDocumento.substring(0, 2), this.margin + 37, this.currentY + 7);
    this.pdf.text(data.patientData.edad?.toString() || '', this.margin + 52, this.currentY + 7);
    this.pdf.text(data.patientData.eps || '', this.margin + 67, this.currentY + 7);
    
    this.currentY += 17;
    
    // Representative section header
    this.pdf.setFillColor(220, 220, 220);
    this.pdf.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 8, 'F');
    this.pdf.setLineWidth(1);
    this.pdf.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 8);
    
    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('DATOS DEL ACUDIENTE O REPRESENTANTE', 105, this.currentY + 5, { align: 'center' });
    
    this.currentY += 8;
    
    // Representative info table
    this.pdf.rect(this.margin, this.currentY, 60, 8);
    this.pdf.rect(this.margin + 60, this.currentY, 60, 8);
    this.pdf.rect(this.margin + 120, this.currentY, 70, 8);
    
    this.pdf.setFontSize(8);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('NOMBRE COMPLETO:', this.margin + 2, this.currentY + 5);
    this.pdf.text('DOCUMENTO:', this.margin + 62, this.currentY + 5);
    this.pdf.text('VÍNCULO O PARENTESCO CON EL PACIENTE:', this.margin + 122, this.currentY + 5);
    
    this.currentY += 8;
    
    // Representative data fields
    this.pdf.rect(this.margin, this.currentY, 60, 12);
    this.pdf.rect(this.margin + 60, this.currentY, 60, 12);
    this.pdf.rect(this.margin + 120, this.currentY, 70, 12);
    
    this.currentY += 12;
    
    // Phone field
    this.pdf.rect(this.margin, this.currentY, 60, 8);
    this.pdf.setFontSize(8);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('TELÉFONO:', this.margin + 2, this.currentY + 5);
    
    this.currentY += 8;
    this.pdf.rect(this.margin, this.currentY, 60, 12);
    
    this.currentY += 17;
  }

  private drawProcedureData() {
    // Procedure data header
    this.pdf.setFillColor(220, 220, 220);
    this.pdf.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 8, 'F');
    this.pdf.setLineWidth(1);
    this.pdf.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 8);
    
    this.pdf.setTextColor(0, 0, 0);
    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('DATOS DEL PROCEDIMIENTO', 105, this.currentY + 5, { align: 'center' });
    
    this.currentY += 8;
    
    // Procedure table with exact format from image
    const procedureRows = [
      {
        label: 'PROCEDIMIENTO',
        content: 'PRUEBA PRESUNTIVA DE VIH',
        height: 12
      },
      {
        label: 'DESCRIPCIÓN\nDEL\nPROCEDIMIENTO',
        content: 'Por medio de una muestra de sangre, se procesa y se identifica o descarta la presencia activa de Virus de la Inmunodeficiencia Humana (VIH), el cual puede infectar y destruir las células del sistema de defensa del cuerpo (Sistema Inmune), originando una baja resistencia a las infecciones. Para obtener dicha muestra se realiza punción venosa en miembro superior con lanceta, es una prueba presuntiva y debe ser interpretada por un médico. Ya que, el hecho de salir reactiva no significa ser positivo al virus, lo que más importante, es consultar con un médico para su interpretación.',
        height: 40
      },
      {
        label: 'PROPÓSITO',
        content: 'Detectar a tiempo la infección por VIH para recibir tratamiento oportuno.',
        height: 15
      },
      {
        label: 'BENEFICIOS\nESPERADOS',
        content: 'Detección oportuna del VIH.',
        height: 15
      },
      {
        label: 'RIESGOS',
        content: 'Sangrado excesivo, 2. Desmayo o sensación de mareo, 3. Hematoma (acumulación de sangre debajo de la piel, que se puede dar cuando se extrae mucha sangre de un solo sitio), 4. Infección (el riesgo es bajo, debido que se usaron materiales para punción y equipos múltiples para recoger las muestra). 5. Punción venosa en muchas ocasiones.',
        height: 25
      },
      {
        label: 'IMPLICACIONES',
        content: 'A algunas personas cuando se les informa que tiene anticuerpos contra VIH (resultado reactivo) pueden llegar a presentar fuertes reacciones emocionales, tristeza, ansiedad, depresión. También puede ser objeto de discriminación o rechazo por otras personas o instituciones.',
        height: 20
      },
      {
        label: 'EFECTOS\nINEVITABLES',
        content: '1. Dolor en el sitio de punción para toma de muestra. 2. Molestia por presión ejercida con el torniquete. 3. Proceso fuerte al observar la sangre en el tubo contenedor.',
        height: 18
      },
      {
        label: 'ALTERNATIVAS RAZONABLES A ESTE\nPROCEDIMIENTO',
        content: 'Ninguna.',
        height: 15
      },
      {
        label: 'POSIBLES CONSECUENCIAS EN CASO\nQUE DECIDA NO ACEPTAR EL\nPROCEDIMIENTO',
        content: 'Impedimento para que el personal médico pueda realizar un diagnóstico y generar un plan de tratamiento.',
        height: 20
      },
      {
        label: 'RIESGOS EN FUNCIÓN DE LA\nSITUACIÓN CLÍNICA DEL PACIENTE',
        content: '',
        height: 15
      }
    ];
    
    const labelWidth = 60;
    const contentWidth = this.pageWidth - 2 * this.margin - labelWidth;
    
    procedureRows.forEach((row) => {
      // Draw borders
      this.pdf.setLineWidth(1);
      this.pdf.rect(this.margin, this.currentY, labelWidth, row.height);
      this.pdf.rect(this.margin + labelWidth, this.currentY, contentWidth, row.height);
      
      // Draw label
      this.pdf.setFontSize(8);
      this.pdf.setFont('helvetica', 'bold');
      const labelLines = row.label.split('\n');
      const labelStartY = this.currentY + (row.height / 2) - (labelLines.length * 2);
      labelLines.forEach((line, index) => {
        this.pdf.text(line, this.margin + 2, labelStartY + (index * 4) + 4);
      });
      
      // Draw content
      this.pdf.setFont('helvetica', 'normal');
      if (row.content) {
        const contentLines = this.pdf.splitTextToSize(row.content, contentWidth - 4);
        const contentStartY = this.currentY + 4;
        contentLines.forEach((line: string, index: number) => {
          if (contentStartY + (index * 3) < this.currentY + row.height - 2) {
            this.pdf.text(line, this.margin + labelWidth + 2, contentStartY + (index * 3));
          }
        });
      }
      
      this.currentY += row.height;
    });
    
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
    
    // Consent text from the image
    const consentText = `Yo, identificado(a) como aparece junto a mi firma/huella, hago constar que he recibido información clara relacionada con: Garantías de calidad, confidencialidad de mis datos personales y demás información que yo entregue, con salvedad de la información que debe ser comunicada a personas relacionadas conmigo a fin de garantizar el cuidado que requiera mi estado de salud, con información sobre el procedimiento en sí, su propósito(s), los beneficios esperados, los posibles riesgos frecuentes o graves, las posibles consecuencias si decidiera no aceptar el procedimiento, las posibles molestias, la posibilidad de participación de personal en formación bajo supervisión.

Fui informado(a) también que: a) Puedo denegar mi consentimiento, sin que ello implique desmejora del trato que reciba de parte del equipo de salud, y que puedo acceder a otros servicios en salud que requiera en tanto estén disponibles; b) Aunque firme en este momento este documento, más tarde(a) (me/se/lo/la) lo(a) puedo retirar mi consentimiento de manera parcial o total, en cualquier momento, expresando mi voluntad ya sea por escrito o verbal al profesional que me esté tratando, en cuyo caso el retiro del consentimiento debe ser firmado tanto por mí (mi representante legal) como por el profesional de salud tratante; y c) En caso que requiera mi decisión sea anular o cancelar, mi consentimiento, dejará constancia de ello por escrito y firmada con mi huella dactilar.

Actuando en nombre propio ( ) / en calidad de representante legal ( ) de la/del paciente cuyos nombres e identificación están registrados en el encabezado de este documento, autorizo al personal asistencial de esta institución, para que me/le realice el/los procedimiento/s arriba mencionado(s) según sea necesario(s), como me/nos presentan los procedimientos o tratamiento(s), que me/le sea(n) indicado por el curso del procedimiento.

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

  private drawSignatures(data: VIHData) {
    // Check if we need a new page
    if (this.currentY > 220) {
      this.pdf.addPage();
      this.currentY = 30;
      
      // Add "DECISIÓN DE DESISTIMIENTO" section on second page
      this.pdf.setFillColor(220, 220, 220);
      this.pdf.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 8, 'F');
      this.pdf.setLineWidth(1);
      this.pdf.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 8);
      
      this.pdf.setTextColor(0, 0, 0);
      this.pdf.setFontSize(10);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text('DECISIÓN DE DESISTIMIENTO', 105, this.currentY + 5, { align: 'center' });
      
      this.currentY += 8;
      
      // Desistimiento text
      const desistimientoText = `Yo, identificado(a) como aparece junto a mi firma/huella, actuando en nombre propio ( ) / en calidad de representante legal ( ) de la/del paciente cuyo nombre e identificación están registrados en el encabezado de este documento, manifiesto - de forma libre, informada y consciente-, mi voluntad de retirar mi consentimiento respecto de la realización de la intervención/ del procedimiento arriba nombrado, que me/le había sido propuesto(a) realizarme/le). He sido informado(a) que, por causa de mi decisión, no cambia la disposición del equipo asistencial a proporcionarme/le las alternativas de atención, con las implicaciones, que mi decisión genera, Manifiesto que me hago responsable de las consecuencias que puedan derivarse de esta decisión.

En manifestación de aceptación firmo/pongo mi huella en este documento a los _____ días del mes de _______ de 20_____.`;
      
      this.pdf.setFontSize(7);
      this.pdf.setFont('helvetica', 'normal');
      
      const lines = this.pdf.splitTextToSize(desistimientoText, this.pageWidth - 2 * this.margin - 4);
      const textHeight = lines.length * 2.5 + 10;
      
      this.pdf.setLineWidth(1);
      this.pdf.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, textHeight);
      
      this.currentY += 5;
      for (let i = 0; i < lines.length; i++) {
        this.pdf.text(lines[i], this.margin + 2, this.currentY);
        this.currentY += 2.5;
      }
      
      this.currentY += 15;
    }
    
    // Signature section with three columns as shown in image
    this.pdf.setLineWidth(1);
    
    const signatureWidth = (this.pageWidth - 2 * this.margin) / 3;
    const signatureHeight = 25;
    
    // Patient signature box
    this.pdf.rect(this.margin, this.currentY, signatureWidth, signatureHeight);
    this.pdf.setFontSize(8);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text('Firma paciente', this.margin + 2, this.currentY + signatureHeight - 8);
    this.pdf.text('Documento:_________________', this.margin + 2, this.currentY + signatureHeight - 4);
    
    // Legal representative signature box
    this.pdf.rect(this.margin + signatureWidth, this.currentY, signatureWidth, signatureHeight);
    this.pdf.text('Firma Representante Legal', this.margin + signatureWidth + 2, this.currentY + signatureHeight - 8);
    this.pdf.text('Documento:_________________', this.margin + signatureWidth + 2, this.currentY + signatureHeight - 4);
    
    // Professional signature box
    this.pdf.rect(this.margin + 2 * signatureWidth, this.currentY, signatureWidth, signatureHeight);
    this.pdf.text('Nombre y documento de quien toma el', this.margin + 2 * signatureWidth + 2, this.currentY + signatureHeight - 12);
    this.pdf.text('consentimiento', this.margin + 2 * signatureWidth + 2, this.currentY + signatureHeight - 8);
    this.pdf.text('Documento:_____________________', this.margin + 2 * signatureWidth + 2, this.currentY + signatureHeight - 4);
    
    // Add professional signature if available
    if (data.signatureData) {
      try {
        this.pdf.addImage(data.signatureData, 'PNG', this.margin + 2 * signatureWidth + 2, this.currentY + 2, signatureWidth - 4, 15);
      } catch (error) {
        console.error('Error adding signature:', error);
      }
    }
    
    // Professional info
    this.pdf.setFontSize(8);
    this.pdf.text(`${data.professionalName}`, this.margin + 2 * signatureWidth + 2, this.currentY + 18);
    this.pdf.text(`Documento: ${data.professionalDocument}`, this.margin + 2 * signatureWidth + 2, this.currentY + 21);
    
    this.currentY += signatureHeight + 5;
  }

  private drawFooter() {
    // Move to bottom of page for footer
    this.currentY = this.pageHeight - 15;
    
    // Footer border
    this.pdf.setLineWidth(0.5);
    this.pdf.line(this.margin, this.currentY - 5, this.pageWidth - this.margin, this.currentY - 5);
    
    // Footer with hospital info exactly as in image
    this.pdf.setFontSize(6);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text('🏥 SECSALUD', this.margin, this.currentY);
    this.pdf.text('La Mesa – Cundinamarca. Calle 8 No. 25 – 34 Call Center: 3172001556 Email: atencionusuario@hospitalpedroleondias.gov.co   www.hospitalpedroleondias.gov.co', this.margin + 15, this.currentY);
  }
}

export const generateVIHPDF = (data: VIHData): jsPDF => {
  const generator = new PDFGeneratorVIH();
  return generator.generate(data);
};