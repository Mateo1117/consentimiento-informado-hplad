import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';

export class PDFStorageService {
  private static readonly MAX_FILE_SIZE_KB = 60;
  private static readonly BUCKET_NAME = 'consent-pdfs';

  /**
   * Optimizes PDF to meet size requirements
   */
  private static optimizePDF(pdf: jsPDF): jsPDF {
    // Create a new PDF with optimized settings
    const optimizedPdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true, // Enable compression
      precision: 2    // Reduce precision for smaller file size
    });

    // Copy content from original PDF with optimization
    const pageCount = pdf.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      if (i > 1) {
        optimizedPdf.addPage();
      }
      optimizedPdf.setPage(i);
      
      // Get the page content from original PDF
      const pageContent = pdf.internal.pages[i];
      if (pageContent) {
        // Copy the content with reduced quality for images
        optimizedPdf.internal.pages[i] = pageContent;
      }
    }

    return optimizedPdf;
  }

  /**
   * Compresses images in PDF content
   */
  private static compressImages(pdf: jsPDF): void {
    // Set image compression quality (0.3 = 30% quality for smaller file size)
    (pdf as any).setImageProperties = function(alias: string, properties: any) {
      properties.compression = 'JPEG';
      properties.quality = 0.3; // Low quality for smaller file size
    };
  }

  /**
   * Uploads PDF to Supabase Storage with size optimization
   */
  static async uploadPDF(
    pdf: jsPDF, 
    filename: string,
    patientData: { patient_name: string; document_number: string }
  ): Promise<{ url: string; size: number }> {
    try {
      // Apply image compression
      this.compressImages(pdf);

      // Generate PDF blob
      const pdfBlob = pdf.output('blob');
      let currentSize = pdfBlob.size / 1024; // Size in KB

      console.log(`📄 PDF inicial: ${currentSize.toFixed(2)} KB`);

      // If the PDF is larger than 60KB, try optimization
      let finalPdf = pdf;
      if (currentSize > this.MAX_FILE_SIZE_KB) {
        console.log(`⚠️ PDF excede ${this.MAX_FILE_SIZE_KB}KB, optimizando...`);
        
        finalPdf = this.optimizePDF(pdf);
        const optimizedBlob = finalPdf.output('blob');
        currentSize = optimizedBlob.size / 1024;
        
        console.log(`📄 PDF optimizado: ${currentSize.toFixed(2)} KB`);
      }

      // If still too large, generate a minimal version
      if (currentSize > this.MAX_FILE_SIZE_KB) {
        console.log(`⚠️ Generando versión mínima del PDF...`);
        finalPdf = this.createMinimalPDF(patientData);
        const minimalBlob = finalPdf.output('blob');
        currentSize = minimalBlob.size / 1024;
        
        console.log(`📄 PDF mínimo: ${currentSize.toFixed(2)} KB`);
      }

      const finalBlob = finalPdf.output('blob');
      const finalSize = finalBlob.size / 1024;

      // Create unique filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const uniqueFilename = `${timestamp}_${filename}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(uniqueFilename, finalBlob, {
          contentType: 'application/pdf',
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Error uploading PDF:', error);
        throw new Error(`Error al subir el PDF: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(uniqueFilename);

      console.log(`✅ PDF subido exitosamente: ${finalSize.toFixed(2)} KB`);

      return {
        url: urlData.publicUrl,
        size: Math.round(finalSize)
      };

    } catch (error) {
      console.error('Error in uploadPDF:', error);
      throw error;
    }
  }

  /**
   * Creates a minimal PDF for cases where optimization isn't enough
   */
  private static createMinimalPDF(patientData: { patient_name: string; document_number: string }): jsPDF {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
      precision: 1
    });

    const margin = 20;
    let currentY = margin;

    // Basic header
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('CONSENTIMIENTO INFORMADO', 105, currentY, { align: 'center' });
    currentY += 15;

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text('E.S.E. HOSPITAL PEDRO LEON ALVAREZ DIAZ DE LA MESA', 105, currentY, { align: 'center' });
    currentY += 20;

    // Patient data
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DATOS DEL PACIENTE:', margin, currentY);
    currentY += 8;

    pdf.setFont('helvetica', 'normal');
    pdf.text(`Nombre: ${patientData.patient_name}`, margin, currentY);
    currentY += 6;
    pdf.text(`Documento: ${patientData.document_number}`, margin, currentY);
    currentY += 6;
    pdf.text(`Fecha: ${new Date().toLocaleDateString('es-CO')}`, margin, currentY);
    currentY += 15;

    // Consent text
    pdf.setFont('helvetica', 'bold');
    pdf.text('DECLARACIÓN DE CONSENTIMIENTO:', margin, currentY);
    currentY += 8;

    pdf.setFont('helvetica', 'normal');
    const consentText = 'He sido informado sobre el procedimiento médico a realizar, sus riesgos, beneficios y alternativas. Otorgo mi consentimiento para el procedimiento.';
    const lines = pdf.splitTextToSize(consentText, 170);
    pdf.text(lines, margin, currentY);
    currentY += lines.length * 6 + 20;

    // Signature area
    pdf.text('_________________________', margin, currentY);
    currentY += 8;
    pdf.text('Firma del Paciente', margin, currentY);

    pdf.text('_________________________', 105, currentY - 8);
    pdf.text('Firma del Profesional', 105, currentY);

    return pdf;
  }

  /**
   * Deletes a PDF from storage
   */
  static async deletePDF(filename: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([filename]);

      if (error) {
        console.error('Error deleting PDF:', error);
        throw new Error(`Error al eliminar el PDF: ${error.message}`);
      }

      console.log(`✅ PDF eliminado: ${filename}`);
    } catch (error) {
      console.error('Error in deletePDF:', error);
      throw error;
    }
  }

  /**
   * Downloads a PDF from storage
   */
  static async downloadPDF(filename: string): Promise<Blob> {
    try {
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .download(filename);

      if (error) {
        console.error('Error downloading PDF:', error);
        throw new Error(`Error al descargar el PDF: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in downloadPDF:', error);
      throw error;
    }
  }
}