import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ConsentData {
  id?: string;
  patientName: string;
  patientDocumentType?: string;
  patientDocumentNumber?: string;
  patientEmail?: string;
  patientPhone?: string;
  consentType: string;
  payload: any;
  shareExpiresAt?: string;
}

export interface ShareableConsent {
  id: string;
  shareToken: string;
  shareUrl: string;
  expiresAt?: string;
}

class ConsentService {
  async createShareableConsent(data: ConsentData): Promise<ShareableConsent | null> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        toast.error("Debe estar autenticado para crear consentimientos");
        return null;
      }

      const expiresAt = data.shareExpiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // Default: 7 días

      const { data: consent, error } = await supabase
        .from('consents')
        .insert({
          created_by: user.user.id,
          patient_name: data.patientName,
          patient_document_type: data.patientDocumentType,
          patient_document_number: data.patientDocumentNumber,
          patient_email: data.patientEmail,
          patient_phone: data.patientPhone,
          consent_type: data.consentType,
          payload: data.payload,
          share_expires_at: expiresAt,
          status: 'sent'
        })
        .select('id, share_token, share_expires_at')
        .single();

      if (error) {
        console.error('Error creating consent:', error);
        toast.error('Error al crear el consentimiento compartible');
        return null;
      }

      const shareUrl = `${window.location.origin}/firmar/${consent.share_token}`;
      
      return {
        id: consent.id,
        shareToken: consent.share_token,
        shareUrl,
        expiresAt: consent.share_expires_at
      };
    } catch (error) {
      console.error('Error in createShareableConsent:', error);
      toast.error('Error inesperado al crear el consentimiento compartible');
      return null;
    }
  }

  async getConsentByToken(token: string) {
    try {
      const { data, error } = await supabase
        .rpc('get_consent_by_token', { p_token: token });

      if (error) {
        console.error('Error fetching consent by token:', error);
        return null;
      }

      return data?.[0] || null;
    } catch (error) {
      console.error('Error in getConsentByToken:', error);
      return null;
    }
  }

  async signConsentByToken(token: string, signatureData: string, signedByName: string) {
    try {
      const { data, error } = await supabase
        .rpc('sign_consent_by_token', {
          p_token: token,
          p_signature_data: signatureData,
          p_signed_by_name: signedByName
        });

      if (error) {
        console.error('Error signing consent:', error);
        toast.error('Error al firmar el consentimiento');
        return null;
      }

      toast.success('Consentimiento firmado exitosamente');
      return data?.[0] || null;
    } catch (error) {
      console.error('Error in signConsentByToken:', error);
      toast.error('Error inesperado al firmar el consentimiento');
      return null;
    }
  }

  generateWhatsAppLink(shareUrl: string, patientName: string): string {
    const message = encodeURIComponent(
      `Hola ${patientName}, necesitas firmar un consentimiento informado. Por favor ingresa al siguiente enlace: ${shareUrl}`
    );
    return `https://wa.me/?text=${message}`;
  }

  generateSMSLink(phone: string, shareUrl: string, patientName: string): string {
    const message = encodeURIComponent(
      `Hola ${patientName}, necesitas firmar un consentimiento informado: ${shareUrl}`
    );
    return `sms:${phone}?body=${message}`;
  }

  generateEmailLink(email: string, shareUrl: string, patientName: string): string {
    const subject = encodeURIComponent('Consentimiento Informado - Firma Requerida');
    const body = encodeURIComponent(
      `Estimado/a ${patientName},\n\nSe requiere su firma para un consentimiento informado. Por favor acceda al siguiente enlace para completar el proceso:\n\n${shareUrl}\n\nGracias.`
    );
    return `mailto:${email}?subject=${subject}&body=${body}`;
  }
}

export const consentService = new ConsentService();