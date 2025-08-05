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
      consent_forms: {
        Row: {
          additional_info: string | null
          address: string
          age: number
          birth_date: string
          consent_decision: string
          created_at: string | null
          differential_approach: Json
          document_number: string
          document_type: string
          eps: string
          guardian_document: string | null
          guardian_name: string | null
          guardian_relationship: string | null
          healthcare_center: string
          id: number
          patient_name: string
          patient_photo_url: string | null
          patient_signature_data: string | null
          patient_surname: string
          pdf_filename: string | null
          pdf_size_kb: number | null
          pdf_url: string | null
          phone: string
          professional_document: string
          professional_name: string
          professional_photo_url: string | null
          professional_signature_data: string | null
          selected_procedures: string[]
        }
        Insert: {
          additional_info?: string | null
          address: string
          age: number
          birth_date: string
          consent_decision: string
          created_at?: string | null
          differential_approach?: Json
          document_number: string
          document_type: string
          eps: string
          guardian_document?: string | null
          guardian_name?: string | null
          guardian_relationship?: string | null
          healthcare_center: string
          id?: number
          patient_name: string
          patient_photo_url?: string | null
          patient_signature_data?: string | null
          patient_surname: string
          pdf_filename?: string | null
          pdf_size_kb?: number | null
          pdf_url?: string | null
          phone: string
          professional_document: string
          professional_name: string
          professional_photo_url?: string | null
          professional_signature_data?: string | null
          selected_procedures: string[]
        }
        Update: {
          additional_info?: string | null
          address?: string
          age?: number
          birth_date?: string
          consent_decision?: string
          created_at?: string | null
          differential_approach?: Json
          document_number?: string
          document_type?: string
          eps?: string
          guardian_document?: string | null
          guardian_name?: string | null
          guardian_relationship?: string | null
          healthcare_center?: string
          id?: number
          patient_name?: string
          patient_photo_url?: string | null
          patient_signature_data?: string | null
          patient_surname?: string
          pdf_filename?: string | null
          pdf_size_kb?: number | null
          pdf_url?: string | null
          phone?: string
          professional_document?: string
          professional_name?: string
          professional_photo_url?: string | null
          professional_signature_data?: string | null
          selected_procedures?: string[]
        }
        Relationships: []
      }
      professional_signatures: {
        Row: {
          created_at: string
          id: string
          professional_document: string
          professional_name: string
          signature_data: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          professional_document: string
          professional_name: string
          signature_data: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          professional_document?: string
          professional_name?: string
          signature_data?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string | null
          full_name: string
          id: string
          professional_document: string | null
          role: string
          signature_data: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          full_name: string
          id?: string
          professional_document?: string | null
          role: string
          signature_data?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          full_name?: string
          id?: string
          professional_document?: string | null
          role?: string
          signature_data?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_type: string
          headers: Json | null
          id: number
          payload: Json
          processed: boolean | null
          processed_at: string | null
          processing_attempts: number | null
          source: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_type: string
          headers?: Json | null
          id?: number
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
          processing_attempts?: number | null
          source: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_type?: string
          headers?: Json | null
          id?: number
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
          processing_attempts?: number | null
          source?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
