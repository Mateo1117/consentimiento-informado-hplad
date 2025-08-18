import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";
import jsPDF from "jspdf";

export interface PDFStorageOptions {
  patientName: string;
  consentType: string;
  consentId: string;
}

class PDFStorageService {
  private readonly BUCKET_NAME = 'consent-pdfs';

  /**
   * Upload a PDF to Supabase storage
   */
  async uploadPDF(pdfBlob: Blob, options: PDFStorageOptions): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Generate unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const sanitizedPatientName = options.patientName.replace(/[^a-zA-Z0-9]/g, '_');
      const sanitizedConsentType = options.consentType.replace(/[^a-zA-Z0-9]/g, '_');
      
      const fileName = `${user.id}/${options.consentId}_${sanitizedConsentType}_${sanitizedPatientName}_${timestamp}.pdf`;

      logger.info('Uploading PDF to storage', { fileName, bucket: this.BUCKET_NAME });

      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          upsert: false
        });

      if (error) {
        logger.error('Error uploading PDF:', error);
        throw error;
      }

      logger.info('PDF uploaded successfully', { path: data.path });
      return data.path;
    } catch (error) {
      logger.error('Error in uploadPDF:', error);
      return null;
    }
  }

  /**
   * Get a signed URL for downloading a PDF
   */
  async getDownloadURL(filePath: string, expiresIn: number = 3600): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        logger.error('Error creating signed URL:', error);
        return null;
      }

      return data.signedUrl;
    } catch (error) {
      logger.error('Error in getDownloadURL:', error);
      return null;
    }
  }

  /**
   * Delete a PDF from storage
   */
  async deletePDF(filePath: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([filePath]);

      if (error) {
        logger.error('Error deleting PDF:', error);
        return false;
      }

      logger.info('PDF deleted successfully', { path: filePath });
      return true;
    } catch (error) {
      logger.error('Error in deletePDF:', error);
      return false;
    }
  }

  /**
   * List all PDFs for the current user
   */
  async listUserPDFs(): Promise<any[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return [];
      }

      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list(user.id, {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        logger.error('Error listing user PDFs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Error in listUserPDFs:', error);
      return [];
    }
  }

  /**
   * Create and upload PDF from HTML content
   */
  async createAndUploadPDF(
    htmlContent: string, 
    options: PDFStorageOptions
  ): Promise<string | null> {
    try {
      // Create PDF from HTML
      const pdf = new jsPDF();
      
      // Add content to PDF (simplified approach)
      const lines = htmlContent.split('\n');
      let y = 20;
      
      lines.forEach(line => {
        if (y > 280) { // Start new page if needed
          pdf.addPage();
          y = 20;
        }
        pdf.text(line, 10, y);
        y += 10;
      });

      // Convert to blob
      const pdfBlob = pdf.output('blob');
      
      // Upload to storage
      return await this.uploadPDF(pdfBlob, options);
    } catch (error) {
      logger.error('Error creating and uploading PDF:', error);
      return null;
    }
  }
}

export const pdfStorageService = new PDFStorageService();