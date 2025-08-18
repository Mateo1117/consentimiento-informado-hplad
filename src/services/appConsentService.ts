import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";
import { pdfStorageService } from "./pdfStorageService";

export interface AppConsentData {
  patientName: string;
  patientDocumentType?: string;
  patientDocumentNumber?: string;
  patientEmail?: string;
  patientPhone?: string;
  consentType: string;
  payload: any;
  professionalName?: string;
  professionalDocument?: string;
  pdfContent?: string; // HTML content for PDF generation
}

export interface SavedConsentResult {
  id: string;
  pdfUrl?: string;
  success: boolean;
  message: string;
}

class AppConsentService {
  /**
   * Save a consent created directly in the app
   */
  async saveAppConsent(data: AppConsentData): Promise<SavedConsentResult> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Get professional signature if exists
      const { data: professionalSignature } = await supabase
        .from('professional_signatures')
        .select('signature_data, professional_name, professional_document')
        .eq('created_by', user.id)
        .single();

      logger.info('Saving app consent', { 
        patientName: data.patientName,
        consentType: data.consentType,
        source: 'app'
      });

      // Insert consent record
      const { data: consent, error } = await supabase
        .from('consents')
        .insert({
          patient_name: data.patientName,
          patient_document_type: data.patientDocumentType,
          patient_document_number: data.patientDocumentNumber,
          patient_email: data.patientEmail,
          patient_phone: data.patientPhone,
          consent_type: data.consentType,
          payload: data.payload,
          created_by: user.id,
          professional_name: professionalSignature?.professional_name || data.professionalName,
          professional_document: professionalSignature?.professional_document || data.professionalDocument,
          professional_signature_data: professionalSignature?.signature_data,
          status: 'signed', // App consents are immediately signed
          signed_at: new Date().toISOString(),
          signed_by_name: data.patientName,
          source: 'web'
        })
        .select()
        .single();

      if (error) {
        logger.error('Error saving consent:', error);
        throw error;
      }

      let pdfUrl: string | undefined;

      // Generate and upload PDF if content provided
      if (data.pdfContent) {
        const pdfPath = await pdfStorageService.createAndUploadPDF(
          data.pdfContent,
          {
            patientName: data.patientName,
            consentType: data.consentType,
            consentId: consent.id
          }
        );

        if (pdfPath) {
          // Update consent record with PDF URL
          const { error: updateError } = await supabase
            .from('consents')
            .update({ pdf_url: pdfPath })
            .eq('id', consent.id);

          if (!updateError) {
            pdfUrl = await pdfStorageService.getDownloadURL(pdfPath);
          }
        }
      }

      logger.info('App consent saved successfully', { 
        consentId: consent.id,
        hasPdf: !!pdfUrl 
      });

      return {
        id: consent.id,
        pdfUrl,
        success: true,
        message: 'Consentimiento guardado exitosamente'
      };
    } catch (error) {
      logger.error('Error in saveAppConsent:', error);
      return {
        id: '',
        success: false,
        message: 'Error al guardar el consentimiento'
      };
    }
  }

  /**
   * Get all consents created in the app by the current user
   */
  async getAppConsents(): Promise<any[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return [];
      }

      const { data, error } = await supabase
        .from('consents')
        .select('*')
        .eq('created_by', user.id)
        .eq('source', 'web')
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching app consents:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Error in getAppConsents:', error);
      return [];
    }
  }

  /**
   * Delete a consent and its associated PDF
   */
  async deleteConsent(consentId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return false;
      }

      // Get consent to check ownership and PDF path
      const { data: consent, error: fetchError } = await supabase
        .from('consents')
        .select('*')
        .eq('id', consentId)
        .eq('created_by', user.id)
        .single();

      if (fetchError || !consent) {
        logger.error('Consent not found or not owned by user');
        return false;
      }

      // Delete PDF if exists
      if (consent.pdf_url) {
        await pdfStorageService.deletePDF(consent.pdf_url);
      }

      // Delete consent record
      const { error: deleteError } = await supabase
        .from('consents')
        .delete()
        .eq('id', consentId)
        .eq('created_by', user.id);

      if (deleteError) {
        logger.error('Error deleting consent:', deleteError);
        return false;
      }

      logger.info('Consent deleted successfully', { consentId });
      return true;
    } catch (error) {
      logger.error('Error in deleteConsent:', error);
      return false;
    }
  }

  /**
   * Get download URL for a consent's PDF
   */
  async getConsentPDFUrl(consentId: string): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return null;
      }

      const { data: consent, error } = await supabase
        .from('consents')
        .select('pdf_url')
        .eq('id', consentId)
        .eq('created_by', user.id)
        .single();

      if (error || !consent?.pdf_url) {
        return null;
      }

      return await pdfStorageService.getDownloadURL(consent.pdf_url);
    } catch (error) {
      logger.error('Error getting consent PDF URL:', error);
      return null;
    }
  }
}

export const appConsentService = new AppConsentService();