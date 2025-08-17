import { supabase } from "@/integrations/supabase/client";
import { generateSignedUrl } from "@/utils/logger";

export interface ConsentData {
  patientName: string;
  patientDocumentType?: string;
  patientDocumentNumber?: string;
  patientEmail?: string;
  patientPhone?: string;
  consentType: string;
  payload: any;
  professionalName?: string;
  professionalDocument?: string;
}

export interface ShareableConsent {
  id: string;
  shareUrl: string;
  shareToken: string;
  expiresAt?: string;
  status: string;
}

class ConsentService {
  private baseUrl = window.location.origin;

  async createShareableConsent(data: ConsentData): Promise<ShareableConsent | null> {
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
          share_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          status: 'sent'
        })
        .select()
        .single();

      if (error) throw error;

      const shareUrl = `${this.baseUrl}/consent/${consent.share_token}`;

      return {
        id: consent.id,
        shareUrl,
        shareToken: consent.share_token,
        expiresAt: consent.share_expires_at,
        status: consent.status
      };
    } catch (error) {
      console.error('Error creating shareable consent:', error);
      return null;
    }
  }

  async getConsentByToken(token: string) {
    try {
      const { data, error } = await supabase.rpc('get_consent_by_token', {
        p_token: token
      });

      if (error) throw error;
      return data?.[0] || null;
    } catch (error) {
      console.error('Error fetching consent by token:', error);
      return null;
    }
  }

  async signConsentByToken(
    token: string, 
    signatureData: string, 
    signedByName: string, 
    patientPhotoUrl?: string
  ) {
    try {
      const { data, error } = await supabase.rpc('sign_consent_by_token', {
        p_token: token,
        p_signature_data: signatureData,
        p_signed_by_name: signedByName,
        p_patient_photo_url: patientPhotoUrl
      });

      if (error) throw error;
      return data?.[0] || null;
    } catch (error) {
      console.error('Error signing consent:', error);
      throw error;
    }
  }

  generateWhatsAppLink(shareUrl: string, patientName: string): string {
    const message = `Hola ${patientName}, necesitas firmar un consentimiento informado. Por favor ingresa al siguiente enlace: ${shareUrl}`;
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  }

  generateSMSLink(phone: string, shareUrl: string, patientName: string): string {
    const message = `Hola ${patientName}, necesitas firmar un consentimiento informado: ${shareUrl}`;
    return `sms:${phone}?body=${encodeURIComponent(message)}`;
  }

  generateEmailLink(email: string, shareUrl: string, patientName: string): string {
    const subject = 'Consentimiento Informado para Firma';
    const body = `Hola ${patientName},\n\nNecesitas firmar un consentimiento informado. Por favor ingresa al siguiente enlace:\n\n${shareUrl}\n\nGracias.`;
    return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
}

export const consentService = new ConsentService();