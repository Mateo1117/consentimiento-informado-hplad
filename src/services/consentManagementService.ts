import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { logger } from "@/utils/logger";

type ConsentRow = Database['public']['Tables']['consents']['Row'];

const CONSENT_LIST_COLUMNS = `
  id,
  created_at,
  updated_at,
  created_by,
  patient_name,
  patient_document_type,
  patient_document_number,
  patient_email,
  patient_phone,
  consent_type,
  status,
  share_token,
  share_expires_at,
  signed_at,
  signed_by_name,
  pdf_url,
  pdf_size,
  professional_document,
  professional_name,
  source,
  payload
`;

export interface ConsentManagementData extends ConsentRow {
  // Additional computed fields for display
  patient_full_name?: string;
  age_display?: string;
  status_badge?: 'signed' | 'sent' | 'expired';
}

type ConsentListRow = Partial<ConsentRow> & Pick<ConsentRow,
  'id' | 'created_at' | 'updated_at' | 'created_by' | 'patient_name' | 'consent_type' | 'status' | 'share_token' | 'pdf_size'
>;

class ConsentManagementService {
  async getAllConsents(): Promise<ConsentManagementData[]> {
    try {
      logger.info('Loading all consents from database...');
      
      const { data, error } = await supabase
        .from('consents')
        .select(CONSENT_LIST_COLUMNS)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching consents:', { error: error.message, details: error.details, hint: error.hint });
        throw new Error(error.message || 'Error al obtener los consentimientos');
      }

      logger.info('Consents loaded successfully', { count: data?.length || 0 });
      
      const processedData = data?.map(consent => this.normalizeConsentListRow(consent)) || [];

      return processedData;
    } catch (error) {
      logger.error('Error in getAllConsents:', error);
      throw error;
    }
  }

  async getConsentsByStatus(status: string): Promise<ConsentManagementData[]> {
    try {
      const { data, error } = await supabase
        .from('consents')
        .select(CONSENT_LIST_COLUMNS)
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching consents by status:', { error: error.message, details: error.details, hint: error.hint, status });
        throw new Error(error.message || 'Error al filtrar consentimientos');
      }

      return data?.map(consent => this.normalizeConsentListRow(consent)) || [];
    } catch (error) {
      logger.error('Error in getConsentsByStatus:', error);
      throw error;
    }
  }

  async searchConsents(filters: {
    documentType?: string;
    documentNumber?: string;
    patientName?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    source?: string;
  }): Promise<ConsentManagementData[]> {
    try {
      let query = supabase.from('consents').select(CONSENT_LIST_COLUMNS);

      if (filters.documentType) {
        query = query.eq('patient_document_type', filters.documentType);
      }

      if (filters.documentNumber) {
        query = query.eq('patient_document_number', filters.documentNumber);
      }

      if (filters.patientName) {
        query = query.ilike('patient_name', `%${filters.patientName}%`);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.source) {
        query = query.eq('source', filters.source);
      }

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        logger.error('Error searching consents:', { error: error.message, details: error.details, hint: error.hint });
        throw new Error(error.message || 'Error al buscar consentimientos');
      }

      return data?.map(consent => this.normalizeConsentListRow(consent)) || [];
    } catch (error) {
      logger.error('Error in searchConsents:', error);
      throw error;
    }
  }

  private normalizeConsentListRow(consent: ConsentListRow): ConsentManagementData {
    return {
      patient_document_number: null,
      patient_document_type: null,
      patient_email: null,
      patient_phone: null,
      patient_photo_url: null,
      patient_signature_data: null,
      payload: {},
      pdf_url: null,
      professional_document: null,
      professional_name: null,
      professional_photo_url: null,
      professional_signature_data: null,
      share_expires_at: null,
      signed_at: null,
      signed_by_name: null,
      signature_data: null,
      source: null,
      ...consent,
      patient_full_name: consent.patient_name,
      status_badge: this.getStatusBadge(consent),
    };
  }

  private getStatusBadge(consent: Pick<ConsentRow, 'status'> & Partial<Pick<ConsentRow, 'share_expires_at'>>): 'signed' | 'sent' | 'expired' {
    if (consent.status === 'signed') return 'signed';
    
    if (consent.share_expires_at) {
      const now = new Date();
      const expiresAt = new Date(consent.share_expires_at);
      if (now > expiresAt) return 'expired';
    }
    
    return 'sent';
  }

  async getConsentById(id: string): Promise<ConsentManagementData | null> {
    try {
      const { data, error } = await supabase
        .from('consents')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        logger.error('Error fetching consent by ID:', { error: error.message, id });
        return null;
      }

      return {
        ...data,
        patient_full_name: data.patient_name,
        status_badge: this.getStatusBadge(data),
      };
    } catch (error) {
      logger.error('Error in getConsentById:', error);
      return null;
    }
  }
}

export const consentManagementService = new ConsentManagementService();
export const isSupabaseConfigured = (): boolean => true;