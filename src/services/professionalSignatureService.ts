import { supabase } from "@/integrations/supabase/client";

// Temporary type definitions until Supabase types are regenerated
interface Database {
  public: {
    Tables: {
      professional_signatures: {
        Row: {
          id: string;
          professional_name: string;
          professional_document: string;
          signature_data: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          professional_name: string;
          professional_document: string;
          signature_data: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          professional_name?: string;
          professional_document?: string;
          signature_data?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

export interface ProfessionalSignature {
  id?: string;
  professional_name: string;
  professional_document: string;
  signature_data: string;
  created_at?: string;
  updated_at?: string;
}

export class ProfessionalSignatureService {
  static async saveSignature(signature: Omit<ProfessionalSignature, 'id' | 'created_at' | 'updated_at'>): Promise<ProfessionalSignature | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User not authenticated');
        return null;
      }

      // Check if a signature already exists for this user (regardless of document)
      const { data: existingSignature } = await supabase
        .from('professional_signatures')
        .select('*')
        .eq('created_by', user.id)
        .single();

      if (existingSignature) {
        // Update existing signature
        const { data, error } = await supabase
          .from('professional_signatures')
          .update({
            professional_name: signature.professional_name,
            professional_document: signature.professional_document,
            signature_data: signature.signature_data,
            updated_at: new Date().toISOString()
          })
          .eq('created_by', user.id)
          .select()
          .single();

        if (error) {
          console.error('Error updating professional signature:', error);
          return null;
        }

        return data;
      } else {
        // Insert new signature
        const { data, error } = await supabase
          .from('professional_signatures')
          .insert([{
            ...signature,
            created_by: user.id
          }])
          .select()
          .single();

        if (error) {
          console.error('Error saving professional signature:', error);
          return null;
        }

        return data;
      }
    } catch (error) {
      console.error('Error in saveSignature:', error);
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
        console.error('Error getting professional signature:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getSignature:', error);
      return null;
    }
  }

  static async deleteSignature(professionalDocument: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('professional_signatures')
        .delete()
        .eq('professional_document', professionalDocument);

      if (error) {
        console.error('Error deleting professional signature:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteSignature:', error);
      return false;
    }
  }

  static async getAllSignatures(): Promise<ProfessionalSignature[]> {
    try {
      const { data, error } = await supabase
        .from('professional_signatures')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error getting all professional signatures:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllSignatures:', error);
      return [];
    }
  }
}

export const professionalSignatureService = new ProfessionalSignatureService();