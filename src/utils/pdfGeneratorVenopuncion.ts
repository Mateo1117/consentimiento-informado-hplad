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
  phone: string;
}

interface VenopuncionPDFData {
  patientData: PatientData;
  guardianData?: GuardianData | null;
  professionalName: string;
  professionalDocument: string;
  patientSignature: string | null;
  professionalSignature: string | null;
  patientPhoto?: string | null;
  consentDecision: "aprobar" | "disentir";
  date: string;
  time: string;
}

export class VenopuncionPDFGenerator {
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

  generate(data: VenopuncionPDFData): jsPDF {
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

  private drawHeader(data: VenopuncionPDFData) {
    // E.S.E HOSPITAL LA MESA - PEDRO LEÓN ÁLVAREZ DÍAZ
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
    this.pdf.text('FORMATO 37', centerX + centerWidth/2 - 15, this.margin + 6);
    this.pdf.text('CONSENTIMIENTO INFORMADO', centerX + centerWidth/2 - 25, this.margin + 10);
    this.pdf.text('PARA TOMA DE MUESTRAS POR VENOPUNCIÓN', centerX + centerWidth/2 - 35, this.margin + 14);
    
    // Right section - Code table
    const rightX = this.pageWidth - this.margin - 50;
    this.pdf.rect(rightX, this.margin, 50, 25);
    
    // Code sub-sections
    this.pdf.rect(rightX, this.margin, 25, 8);
    this.pdf.rect(rightX + 25, this.margin, 25, 8);
    this.pdf.setFontSize(6);
    this.pdf.text('Código', rightX + 2, this.margin + 5);
    this.pdf.text('SC-M-09.37', rightX + 27, this.margin + 5);
    
    this.pdf.rect(rightX, this.margin + 8, 25, 8);
    this.pdf.rect(rightX + 25, this.margin + 8, 25, 8);
    this.pdf.text('Versión', rightX + 2, this.margin + 13);
    this.pdf.text('02', rightX + 27, this.margin + 13);
    
    this.pdf.rect(rightX, this.margin + 16, 25, 9);
    this.pdf.rect(rightX + 25, this.margin + 16, 25, 9);
    this.pdf.text('Fecha', rightX + 2, this.margin + 21);
    this.pdf.text('28-12-2022', rightX + 26, this.margin + 21);
    
    this.currentY = this.margin + 30;
  }

  private drawPatientData(data: VenopuncionPDFData) {
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

  private drawGuardianData(data: VenopuncionPDFData) {
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
        value: 'TOMA DE MUESTRAS POR VENOPUNCIÓN'
      },
      {
        label: 'DESCRIPCIÓN DEL PROCEDIMIENTO',
        value: 'Consiste en puncionar una vena, -generalmente de la zona central del antebrazo-, con una aguja estéril unida a un tubo colector para extraer o sacar una muestra de sangre.'
      },
      {
        label: 'PROPÓSITO',
        value: 'Analizar las muestras sanguíneas mediante pruebas de laboratorio clínico solicitadas por el médico tratante.'
      },
      {
        label: 'BENEFICIOS ESPERADOS',
        value: 'Los resultados de la muestras permiten orientar y/o confirmar un diagnóstico y realizar el seguimiento de una enfermedad o condición en salud, evaluar la presencia o ausencia de algunas sustancias químicas, o dar pautas para el tratamiento.'
      },
      {
        label: 'RIESGOS',
        value: 'Sangrado excesivo, desmayo o sensación de mareo.'
      },
      {
        label: 'IMPLICACIONES',
        value: 'Hematoma (acumulación de sangre debajo de la piel que se pone de color morado a negro), infección por la ruptura de la piel, punciones múltiples para localizar las venas, punción traumática.'
      },
      {
        label: 'EFECTOS INEVITABLES',
        value: 'Dolor en el sitio de punción, molestia por la presión ejercida con el torniquete, impresión fuerte al observar la sangre en el tubo contenedor.'
      },
      {
        label: 'ALTERNATIVAS RAZONABLES A ESTE PROCEDIMIENTO',
        value: 'Ninguna.'
      },
      {
        label: 'POSIBLES CONSECUENCIAS EN CASO QUE DECIDA NO ACEPTAR EL PROCEDIMIENTO',
        value: 'Impide a los médicos tratantes tener información valiosa para determinar, confirmar o ajustar su diagnóstico y tratamiento médico.'
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
      'Yo, identificado(a) como aparece junto a mi firma/huella, hago constar que he recibido información clara relacionada con: Garantía de confidencialidad de mis datos personales y demás información que yo entregue, con salvedad de la información que deba ser comunicada a personas, o a las autoridades competentes según mi caso. También me informaron sobre el procedimiento en sí, su propósito(s), los beneficios esperados, los posibles riesgos frecuentes o graves, las posibles consecuencias si decido no aceptar el procedimiento, las posibles molestias, la posibilidad de participación de personal en formación bajo supervisión.',
      '',
      'Fui informado(a) también que: a) Puedo denegar mi consentimiento, sin que ello implique desmejora del trato que recibiré de parte del equipo de salud, y que puedo acceder a otros servicios en salud que requiera en tanto estén disponibles, b) Aunque firme en este momento este documento, aceptando me sea(n) realizada(s) la(s) intervención(es), puedo retirar mi consentimiento de manera parcial o total, en cualquier momento anterior a la realización de la intervención, y sin que para ello precise dar explicaciones o justificar mi decisión, c) Que en caso tal que mi decisión sea anular o cancelar, mi consentimiento, dejaré constancia de ella por escrito y firmada o con mi huella dactilar.',
      '',
      'Actuando en nombre propio [X] / en calidad de representante legal [ ] de la/del paciente cuyos nombres e identificación están registrados en el encabezado de este documento, autorizo al personal asistencial de esta institución, para que me/le realice el/los procedimiento(s) arriba señalado(s) y, en caso de ser necesario, tome las medidas y conductas médicas necesarias para salvaguardar mí integridad física, de acuerdo a como se presenten las situaciones imprevistas en el curso del procedimiento.',
      '',
      `En manifestación de aceptación firmo/pongo mi huella en este documento a los ${new Date().getDate()} días del mes de ${new Date().toLocaleDateString('es-ES', { month: 'long' })} de ${new Date().getFullYear()}`
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

  private drawDissentSection(data: VenopuncionPDFData) {
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
    
    const patientName = data.guardianData ? data.guardianData.name : `${data.patientData.nombre} ${data.patientData.apellidos}`;
    const currentDate = new Date();
    const day = currentDate.getDate();
    const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                       'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const month = monthNames[currentDate.getMonth()];
    const year = currentDate.getFullYear();
    
    const dissentText = `Yo, ${patientName}, identificada(o) como aparece junto a mi firma/huella, actuando en nombre propio ${!data.guardianData ? '[X]' : '[ ]'} / en calidad de representante legal ${data.guardianData ? '[X]' : '[ ]'} de la/del paciente cuyo nombre e identificación están registrados en el encabezado de este documento, manifiesto -de forma libre, informada y consciente-, mi voluntad de retirar mi consentimiento respecto de la realización de la intervención/ del procedimiento arriba nombrado, que me/le había sido propuesta(o) realizarme (le). He sido informada(o) que, por causa de mi decisión, no cambia la disposición del equipo asistencial a proporcionarme (le) las alternativas de atención, con las limitaciones, que mi decisión genera; Manifiesto que me hago responsable de las consecuencias que puedan derivarse de esta decisión.`;
    
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
  
  private getMonthName(month: number): string {
    const months = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    return months[month - 1] || 'enero';
  }

  private drawSignatures(data: VenopuncionPDFData) {
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
    
    // Add patient signature - same logic as professional
    console.log('🔍 Procesando firma del paciente...');
    console.log('📏 Longitud:', data.patientSignature?.length);
    console.log('🏷️ Tipo:', typeof data.patientSignature);
    
    if (data.patientSignature && 
        typeof data.patientSignature === 'string' && 
        data.patientSignature.length > 50 && 
        data.patientSignature.startsWith('data:image/png;base64,')) {
      try {
        console.log('✅ Agregando firma del paciente al PDF');
        this.pdf.addImage(data.patientSignature, 'PNG', startX + 2, this.currentY + 2, boxWidth - 4, 30);
        console.log('✅ Firma del paciente agregada exitosamente');
      } catch (error) {
        console.error('❌ Error adding patient signature:', error);
      }
    } else {
      console.log('⚠️ Firma del paciente no válida o no existe');
    }
    
    this.pdf.setFillColor(255, 255, 255); // Reset fill color
    this.pdf.text('_________________________', startX + 5, this.currentY + boxHeight - 5);
    this.pdf.text('Firma Paciente/Acudiente', startX + 15, this.currentY + boxHeight + 5);
    this.pdf.text(`Doc: ${data.patientData.numeroDocumento}`, startX + 15, this.currentY + boxHeight + 10);
    
    // Professional signature
    const profX = startX + boxWidth + spacing;
    this.pdf.rect(profX, this.currentY, boxWidth, boxHeight);
    
    // Add professional signature - same unified logic as patient
    if (data.professionalSignature && 
        typeof data.professionalSignature === 'string' &&
        data.professionalSignature.length > 50 && 
        data.professionalSignature.startsWith('data:image/png;base64,')) {
      try {
        console.log('📝 Agregando firma del profesional al PDF');
        console.log('📏 Longitud firma profesional:', data.professionalSignature.length);
        this.pdf.addImage(data.professionalSignature, 'PNG', profX + 2, this.currentY + 2, boxWidth - 4, 30);
        console.log('✅ Firma del profesional agregada exitosamente');
      } catch (error) {
        console.error('❌ Error adding professional signature:', error);
      }
    } else {
      console.log('⚠️ No se encontró firma válida del profesional');
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

  private calculateTextHeight(text: string, maxWidth: number): number {
    const lines = this.pdf.splitTextToSize(text, maxWidth);
    return lines.length * 4;
  }
}

export function generateVenopuncionPDF(data: VenopuncionPDFData): jsPDF {
  const generator = new VenopuncionPDFGenerator();
  return generator.generate(data);
}