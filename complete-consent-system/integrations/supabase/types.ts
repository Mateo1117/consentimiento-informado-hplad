export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      consent_access_logs: {
        Row: {
          access_type: string
          accessed_at: string | null
          consent_id: string | null
          error_message: string | null
          id: string
          ip_address: unknown | null
          share_token: string
          success: boolean | null
          user_agent: string | null
        }
        Insert: {
          access_type: string
          accessed_at?: string | null
          consent_id?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          share_token: string
          success?: boolean | null
          user_agent?: string | null
        }
        Update: {
          access_type?: string
          accessed_at?: string | null
          consent_id?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          share_token?: string
          success?: boolean | null
          user_agent?: string | null
        }
        Relationships: []
      }
      consents: {
        Row: {
          consent_type: string
          created_at: string
          created_by: string | null
          id: string
          patient_document_number: string | null
          patient_document_type: string | null
          patient_email: string | null
          patient_name: string
          patient_phone: string | null
          patient_photo_url: string | null
          patient_signature_data: string | null
          payload: Json
          pdf_size: number
          pdf_url: string | null
          professional_document: string | null
          professional_name: string | null
          professional_photo_url: string | null
          professional_signature_data: string | null
          share_expires_at: string | null
          share_token: string
          signed_at: string | null
          signed_by_name: string | null
          status: string
          updated_at: string
        }
        Insert: {
          consent_type: string
          created_at?: string
          created_by?: string | null
          id?: string
          patient_document_number?: string | null
          patient_document_type?: string | null
          patient_email?: string | null
          patient_name: string
          patient_phone?: string | null
          patient_photo_url?: string | null
          patient_signature_data?: string | null
          payload?: Json
          pdf_size?: number
          pdf_url?: string | null
          professional_document?: string | null
          professional_name?: string | null
          professional_photo_url?: string | null
          professional_signature_data?: string | null
          share_expires_at?: string | null
          share_token?: string
          signed_at?: string | null
          signed_by_name?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          consent_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          patient_document_number?: string | null
          patient_document_type?: string | null
          patient_email?: string | null
          patient_name?: string
          patient_phone?: string | null
          patient_photo_url?: string | null
          patient_signature_data?: string | null
          payload?: Json
          pdf_size?: number
          pdf_url?: string | null
          professional_document?: string | null
          professional_name?: string | null
          professional_photo_url?: string | null
          professional_signature_data?: string | null
          share_expires_at?: string | null
          share_token?: string
          signed_at?: string | null
          signed_by_name?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      professional_signatures: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          professional_document: string
          professional_name: string
          signature_data: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          professional_document: string
          professional_name: string
          signature_data: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          professional_document?: string
          professional_name?: string
          signature_data?: string
          updated_at?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          headers: Json
          id: number
          payload: Json
          processed: boolean
          processed_at: string | null
          processing_attempts: number
          source: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: string
          headers?: Json
          id?: number
          payload?: Json
          processed?: boolean
          processed_at?: string | null
          processing_attempts?: number
          source: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          headers?: Json
          id?: number
          payload?: Json
          processed?: boolean
          processed_at?: string | null
          processing_attempts?: number
          source?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_consent_by_token: {
        Args: {
          p_token: string
        }
        Returns: {
          consent_type: string
          id: string
          patient_document_number: string
          patient_document_type: string
          patient_name: string
          payload: Json
          pdf_url: string
          share_expires_at: string
          signed_at: string
          status: string
        }[]
      }
      get_consent_by_token_secure: {
        Args: {
          p_token: string
          p_ip_address?: unknown
          p_user_agent?: string
        }
        Returns: {
          access_count: number
          consent_type: string
          id: string
          patient_document_masked: string
          patient_document_type: string
          patient_name_masked: string
          payload: Json
          requires_verification: boolean
          share_expires_at: string
          signed_at: string
          status: string
        }[]
      }
      insert_audit_log: {
        Args: {
          p_consent_id?: string
          p_share_token: string
          p_access_type: string
          p_ip_address?: unknown
          p_user_agent?: string
          p_success?: boolean
          p_error_message?: string
        }
        Returns: undefined
      }
      is_admin_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      sign_consent_by_token: {
        Args: {
          p_token: string
          p_signature_data: string
          p_signed_by_name: string
          p_patient_photo_url?: string
        }
        Returns: {
          id: string
          patient_photo_url: string
          signed_at: string
          signed_by_name: string
          status: string
        }[]
      }
      sign_consent_by_token_secure: {
        Args: {
          p_token: string
          p_signature_data: string
          p_signed_by_name: string
          p_patient_photo_url?: string
          p_verification_code?: string
          p_ip_address?: unknown
          p_user_agent?: string
        }
        Returns: {
          id: string
          patient_photo_url: string
          signed_at: string
          signed_by_name: string
          status: string
        }[]
      }
      update_updated_at_column: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}