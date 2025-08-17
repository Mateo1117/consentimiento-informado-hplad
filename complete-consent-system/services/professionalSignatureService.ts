import { supabase } from "@/integrations/supabase/client";

// Temporary type definitions until Supabase types are properly set up
interface Database {
  public: {
    Tables: {
      professional_signatures: {
        Row: {
          id: string;
          professional_name: string;
          professional_document: string;
          signature_data: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          professional_name: string;
          professional_document: string;
          signature_data: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          professional_name?: string;
          professional_document?: string;
          signature_data?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

export interface ProfessionalSignature {
  id: string;
  professional_name: string;
  professional_document: string;
  signature_data: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export class ProfessionalSignatureService {
  static async saveSignature(
    signature: Omit<ProfessionalSignature, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ProfessionalSignature | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Check if user already has a signature
      const { data: existingSignature } = await supabase
        .from('professional_signatures')
        .select('*')
        .eq('created_by', user.id)
        .single();

      let result;
      if (existingSignature) {
        // Update existing signature
        const { data, error } = await supabase
          .from('professional_signatures')
          .update({
            professional_name: signature.professional_name,
            professional_document: signature.professional_document,
            signature_data: signature.signature_data,
          })
          .eq('created_by', user.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Create new signature
        const { data, error } = await supabase
          .from('professional_signatures')
          .insert({
            professional_name: signature.professional_name,
            professional_document: signature.professional_document,
            signature_data: signature.signature_data,
            created_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      return result as ProfessionalSignature;
    } catch (error) {
      console.error('Error saving professional signature:', error);
      return null;
    }
  }

  static async getSignature(professionalDocument: string): Promise<ProfessionalSignature | null> {
    try {
      const { data, error } = await supabase
        .from('professional_signatures')
        .select('*')
        .eq('professional_document', professionalDocument)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found
          return null;
        }
        throw error;
      }

      return data as ProfessionalSignature;
    } catch (error) {
      console.error('Error getting professional signature:', error);
      return null;
    }
  }

  static async deleteSignature(professionalDocument: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('professional_signatures')
        .delete()
        .eq('professional_document', professionalDocument);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting professional signature:', error);
      return false;
    }
  }

  static async getCurrentUserSignature(): Promise<ProfessionalSignature | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('professional_signatures')
        .select('*')
        .eq('created_by', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data as ProfessionalSignature;
    } catch (error) {
      console.error('Error getting current user signature:', error);
      return null;
    }
  }

  static async getAllSignatures(): Promise<ProfessionalSignature[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('professional_signatures')
        .select('*')
        .eq('created_by', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data as ProfessionalSignature[]) || [];
    } catch (error) {
      console.error('Error getting all signatures:', error);
      return [];
    }
  }
}