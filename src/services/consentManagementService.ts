import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { logger } from "@/utils/logger";

type ConsentRow = Database['public']['Tables']['consents']['Row'];

export interface ConsentManagementData extends ConsentRow {
  // Additional computed fields for display
  patient_full_name?: string;
  age_display?: string;
  status_badge?: 'signed' | 'sent' | 'expired';
}

class ConsentManagementService {
  async getAllConsents(): Promise<ConsentManagementData[]> {
    try {
      logger.info('Loading all consents from database...');
      
      const { data, error } = await supabase
        .from('consents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching consents:', { error: error.message });
        throw new Error('Error al obtener los consentimientos');
      }

      logger.info('Consents loaded successfully', { count: data?.length || 0 });
      
      // Process data for display
      const processedData = data?.map(consent => ({
        ...consent,
        patient_full_name: consent.patient_name,
        status_badge: this.getStatusBadge(consent),
      })) || [];

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
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching consents by status:', { error: error.message, status });
        throw new Error('Error al filtrar consentimientos');
      }

      return data?.map(consent => ({
        ...consent,
        patient_full_name: consent.patient_name,
        status_badge: this.getStatusBadge(consent),
      })) || [];
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
  }): Promise<ConsentManagementData[]> {
    try {
      let query = supabase.from('consents').select('*');

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

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        logger.error('Error searching consents:', { error: error.message });
        throw new Error('Error al buscar consentimientos');
      }

      return data?.map(consent => ({
        ...consent,
        patient_full_name: consent.patient_name,
        status_badge: this.getStatusBadge(consent),
      })) || [];
    } catch (error) {
      logger.error('Error in searchConsents:', error);
      throw error;
    }
  }

  private getStatusBadge(consent: ConsentRow): 'signed' | 'sent' | 'expired' {
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