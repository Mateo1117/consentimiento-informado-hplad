import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";
import { pdfStorageService } from "./pdfStorageService";
import { automationService } from "./automationService";
import { PhotoService } from "./photoService";

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
  patientSignature?: string; // base64 de la firma del paciente
  patientPhotoUrl?: string; // URL de la foto del paciente
  // Datos para casos de discapacidad/menor de edad
  hasDisability?: boolean;
  isMinor?: boolean;
  guardianName?: string;
  guardianDocument?: string;
  guardianRelationship?: string;
  guardianPhone?: string;
  guardianSignature?: string; // base64 de la firma del acudiente
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

      // Normalizar firma/foto: si vienen como base64, subir a Storage para enviar URLs cortas al webhook
      const rawPatientSignature = data.patientSignature || data.payload?.patientSignature || null;
      const rawPatientPhoto = data.patientPhotoUrl || data.payload?.patientPhotoUrl || null;
      const rawGuardianSignature = data.guardianSignature || data.payload?.guardianSignature || null;

      let patientSignatureForDb: string | null = rawPatientSignature;
      let patientPhotoForDb: string | null = rawPatientPhoto;
      let guardianSignatureForDb: string | null = rawGuardianSignature;

      // Subir firma del paciente (si es data URL) y usar URL pública
      if (rawPatientSignature && rawPatientSignature.startsWith('data:image')) {
        const uploaded = await PhotoService.uploadPhoto(rawPatientSignature, 'firma_paciente');
        if (uploaded?.url) {
          patientSignatureForDb = uploaded.url;
        }
      }

      // Subir foto (si es data URL) y usar URL pública
      if (rawPatientPhoto && rawPatientPhoto.startsWith('data:image')) {
        const uploaded = await PhotoService.uploadPhoto(rawPatientPhoto, 'foto_paciente');
        if (uploaded?.url) {
          patientPhotoForDb = uploaded.url;
        }
      }

      // Subir firma del acudiente (si es data URL) y usar URL pública
      if (rawGuardianSignature && rawGuardianSignature.startsWith('data:image')) {
        const uploaded = await PhotoService.uploadPhoto(rawGuardianSignature, 'firma_acudiente');
        if (uploaded?.url) {
          guardianSignatureForDb = uploaded.url;
        }
      }

      logger.info('Firma/foto normalizadas', {
        hasSignature: !!patientSignatureForDb,
        hasPhoto: !!patientPhotoForDb,
        hasGuardianSignature: !!guardianSignatureForDb,
        signatureIsUrl: !!patientSignatureForDb && patientSignatureForDb.startsWith('http'),
        photoIsUrl: !!patientPhotoForDb && patientPhotoForDb.startsWith('http'),
        guardianSignatureIsUrl: !!guardianSignatureForDb && guardianSignatureForDb.startsWith('http')
      });

      // Insert consent record con firma y foto del paciente
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
          patient_signature_data: patientSignatureForDb,
          patient_photo_url: patientPhotoForDb,
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

      // Enviar datos al webhook externo
      try {
        // Log detallado para debugging
        logger.info('Datos para webhook:', {
          hasPatientSignature: !!(data.patientSignature || data.payload?.patientSignature),
          hasPatientPhoto: !!(data.patientPhotoUrl || data.payload?.patientPhotoUrl),
          hasPdfUrl: !!pdfUrl,
          patientSignatureLength: (data.patientSignature || data.payload?.patientSignature)?.length || 0,
          patientPhotoLength: (data.patientPhotoUrl || data.payload?.patientPhotoUrl)?.length || 0
        });

        await this.sendConsentToWebhook({
          consentId: consent.id,
          patientName: data.patientName,
          patientDocumentType: data.patientDocumentType,
          patientDocumentNumber: data.patientDocumentNumber,
          patientEmail: data.patientEmail,
          patientPhone: data.patientPhone,
          // Enviar URLs (no base64) para evitar URLs enormes en el webhook GET
          patientSignature: patientSignatureForDb || undefined,
          patientPhotoUrl: patientPhotoForDb || undefined,
          consentType: data.consentType,
          professionalName: professionalSignature?.professional_name || data.professionalName,
          professionalDocument: professionalSignature?.professional_document || data.professionalDocument,
          professionalSignature: professionalSignature?.signature_data,
          pdfUrl: pdfUrl,
          payload: data.payload,
          signedAt: consent.signed_at,
          // Datos del acudiente
          hasDisability: data.hasDisability,
          isMinor: data.isMinor,
          guardianName: data.guardianName,
          guardianDocument: data.guardianDocument,
          guardianRelationship: data.guardianRelationship,
          guardianPhone: data.guardianPhone,
          guardianSignature: guardianSignatureForDb || undefined // Usar URL en lugar de base64
        });
        logger.info('Webhook de consentimiento enviado exitosamente');
      } catch (webhookError) {
        // No fallar si el webhook falla
        logger.error('Error al enviar webhook de consentimiento (no crítico):', webhookError);
      }

      // Trigger webhook automation for consent created event
      try {
        await automationService.onConsentCreated(
          {
            id: consent.id,
            consent_type: data.consentType,
            status: 'signed',
            signed_at: consent.signed_at,
            professionalName: consent.professional_name,
            source: 'web'
          },
          {
            nombre: data.patientName.split(' ')[0],
            apellidos: data.patientName.split(' ').slice(1).join(' '),
            numeroDocumento: data.patientDocumentNumber,
            tipoDocumento: data.patientDocumentType,
            email: data.patientEmail,
            telefono: data.patientPhone
          }
        );
        logger.info('Webhook triggered for consent creation');
      } catch (webhookError) {
        // Don't fail the consent creation if webhook fails
        logger.error('Error triggering webhook (non-critical):', webhookError);
      }

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

  /**
   * Send consent data to external webhook
   */
  private async sendConsentToWebhook(data: {
    consentId: string;
    patientName: string;
    patientDocumentType?: string;
    patientDocumentNumber?: string;
    patientEmail?: string;
    patientPhone?: string;
    patientSignature?: string;
    patientPhotoUrl?: string;
    consentType: string;
    professionalName?: string;
    professionalDocument?: string;
    professionalSignature?: string;
    pdfUrl?: string;
    payload?: any;
    signedAt?: string;
    // Datos del acudiente
    hasDisability?: boolean;
    isMinor?: boolean;
    guardianName?: string;
    guardianDocument?: string;
    guardianRelationship?: string;
    guardianPhone?: string;
    guardianSignature?: string;
  }): Promise<void> {
    try {
      logger.info('Enviando consentimiento al webhook externo', {
        consentId: data.consentId,
        consentType: data.consentType
      });

      const normalizedConsentType = this.normalizeConsentType(data.consentType);
      const procedimientoMedico =
        this.getProcedureNameFromPayload(data.payload) || this.getProcedureName(normalizedConsentType);
      const aceptacionProcedimiento = this.getAceptacionProcedimiento(data.payload);

      const { data: response, error } = await supabase.functions.invoke('enviar-consentimiento', {
        body: {
          consent_id: data.consentId,
          paciente_nombre_completo: data.patientName,
          paciente_tipo_documento: data.patientDocumentType || 'CC',
          paciente_numero_documento: data.patientDocumentNumber || '',
          paciente_email: data.patientEmail || null,
          paciente_telefono: data.patientPhone || null,
          paciente_firma: data.patientSignature || null,
          paciente_foto: data.patientPhotoUrl || null,
          paciente_tiene_discapacidad: data.hasDisability || false,
          paciente_es_menor: data.isMinor || false,
          // Datos del acudiente
          acudiente_nombre_completo: data.guardianName || null,
          acudiente_documento: data.guardianDocument || null,
          acudiente_parentesco: data.guardianRelationship || null,
          acudiente_telefono: data.guardianPhone || null,
          acudiente_firma: data.guardianSignature || null,
          // El webhook requiere el nombre completo del procedimiento
          tipo_procedimiento: procedimientoMedico,
          procedimiento_medico: procedimientoMedico,
          diagnostico: procedimientoMedico,
          nombre_consentimiento: this.getConsentDisplayName(normalizedConsentType),
          // Debe reflejar la decisión real del paciente (APROBAR/DISENTIR)
          aceptacion_procedimiento: aceptacionProcedimiento,
          fecha_firma: data.signedAt || new Date().toISOString(),
          fecha_documento: new Date().toISOString().split('T')[0],
          profesional_nombre_completo: data.professionalName || '',
          profesional_documento: data.professionalDocument || null,
          profesional_firma: data.professionalSignature || null,
          pdf_url: data.pdfUrl || null,
          payload_adicional: data.payload || {}
        }
      });

      if (error) {
        logger.error('Error en edge function enviar-consentimiento:', error);
        throw error;
      }

      logger.info('Respuesta del webhook:', response);
    } catch (error) {
      logger.error('Error enviando consentimiento al webhook:', error);
      throw error;
    }
  }

  /**
   * Normaliza el tipo de consentimiento para usarlo como clave estable.
   * Acepta valores como: "VENOPUNCION", "Venopunción", "Carga de Glucosa", etc.
   */
  private normalizeConsentType(consentType: string): string {
    const raw = (consentType || '').toString().trim().toLowerCase();
    const noAccents = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const cleaned = noAccents
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s-]+/g, '_')
      .replace(/^_+|_+$/g, '');

    const aliases: Record<string, string> = {
      vih: 'hiv',
      prueba_vih: 'hiv',
      venopuncion: 'venopuncion',
      toma_de_muestra_por_venopuncion: 'venopuncion',
      carga_de_glucosa: 'carga_glucosa',
      carga_glucosa: 'carga_glucosa',
      frotis_vaginal: 'frotis_vaginal',
      hemocomponentes: 'hemocomponentes',
      hemocomponentes_sanguineos: 'hemocomponentes',
    };

    return aliases[cleaned] || cleaned;
  }

  private getProcedureNameFromPayload(payload: any): string | null {
    if (!payload) return null;

    const arrCandidates = [payload.procedures, payload.selected_procedures, payload.selectedProcedures];
    for (const arr of arrCandidates) {
      if (Array.isArray(arr) && arr.length > 0) {
        const joined = arr.filter(Boolean).join(' - ').trim();
        if (joined) return joined;
      }
    }

    const strCandidates = [
      payload.procedimiento_medico,
      payload.procedimientoMedico,
      payload.procedureName,
      payload.procedure,
    ];

    for (const s of strCandidates) {
      if (typeof s === 'string' && s.trim()) return s.trim();
    }

    return null;
  }

  private getAceptacionProcedimiento(payload: any): 'Aceptado' | 'Rechazado' {
    const decisionRaw =
      payload?.decision ??
      payload?.consentDecision ??
      payload?.consent_decision ??
      payload?.consent_decision;

    if (typeof decisionRaw === 'string') {
      const d = decisionRaw.toLowerCase().trim();
      if (d === 'disentir' || d.includes('rechaz') || d.includes('no')) return 'Rechazado';
      if (d === 'aprobar' || d.includes('acept') || d.includes('si')) return 'Aceptado';
    }

    if (payload?.accepted === false) return 'Rechazado';

    // Fallback por compatibilidad
    return 'Aceptado';
  }

  /**
   * Get display name for consent type - SIEMPRE en MAYÚSCULAS para el webhook
   */
  private getConsentDisplayName(consentType: string): string {
    const key = this.normalizeConsentType(consentType);
    logger.info('getConsentDisplayName', { input: consentType, normalizedKey: key });
    
    const displayNames: Record<string, string> = {
      hiv: 'VIH',
      venopuncion: 'VENOPUNCION', 
      carga_glucosa: 'GLUCOSA',
      frotis_vaginal: 'FROTIS VAGINAL',
      hemocomponentes: 'HEMOCOMPONENTES'
    };
    
    const result = displayNames[key] || key.toUpperCase().replace(/_/g, ' ');
    logger.info('getConsentDisplayName result', { result });
    return result;
  }

  /**
   * Get full procedure name for webhook
   */
  private getProcedureName(consentType: string): string {
    const key = this.normalizeConsentType(consentType);
    const procedureNames: Record<string, string> = {
      venopuncion: 'Toma de Muestra por Venopunción',
      hiv: 'Prueba Presuntiva de VIH (Virus de Inmunodeficiencia Humana)',
      hemocomponentes: 'Transfusión de Hemocomponentes Sanguíneos',
      carga_glucosa: 'Administración oral de carga de glucosa (Dextrosa Anhidra)',
      frotis_vaginal: 'Toma de Muestra para Frotis Vaginal - Cultivo Recto-Vaginal'
    };
    return procedureNames[key] || key;
  }
}

export const appConsentService = new AppConsentService();