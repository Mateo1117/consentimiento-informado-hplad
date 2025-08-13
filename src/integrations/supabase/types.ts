export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
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
          headers: Json
          id?: number
          payload: Json
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
        Args: { p_token: string }
        Returns: {
          id: string
          consent_type: string
          payload: Json
          patient_name: string
          patient_document_type: string
          patient_document_number: string
          share_expires_at: string
          status: string
          signed_at: string
          pdf_url: string
        }[]
      }
      sign_consent_by_token: {
        Args: {
          p_token: string
          p_signature_data: string
          p_signed_by_name: string
        }
        Returns: {
          id: string
          signed_at: string
          status: string
        }[]
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
