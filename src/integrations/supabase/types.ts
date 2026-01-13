export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      consent_access_logs: {
        Row: {
          access_type: string
          accessed_at: string | null
          consent_id: string | null
          error_message: string | null
          id: string
          ip_address: unknown
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
          ip_address?: unknown
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
          ip_address?: unknown
          share_token?: string
          success?: boolean | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consent_access_logs_consent_id_fkey"
            columns: ["consent_id"]
            isOneToOne: false
            referencedRelation: "consents"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_signature_logs: {
        Row: {
          consent_id: string | null
          id: string
          ip_address: string | null
          signed_at: string | null
          signed_by_name: string
          user_agent: string | null
        }
        Insert: {
          consent_id?: string | null
          id?: string
          ip_address?: string | null
          signed_at?: string | null
          signed_by_name: string
          user_agent?: string | null
        }
        Update: {
          consent_id?: string | null
          id?: string
          ip_address?: string | null
          signed_at?: string | null
          signed_by_name?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consent_signature_logs_consent_id_fkey"
            columns: ["consent_id"]
            isOneToOne: false
            referencedRelation: "consents"
            referencedColumns: ["id"]
          },
        ]
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
          signature_data: string | null
          signed_at: string | null
          signed_by_name: string | null
          source: string | null
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
          signature_data?: string | null
          signed_at?: string | null
          signed_by_name?: string | null
          source?: string | null
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
          signature_data?: string | null
          signed_at?: string | null
          signed_by_name?: string | null
          source?: string | null
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
      profiles: {
        Row: {
          created_at: string
          department: string | null
          document_number: string | null
          document_type: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          job_title: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          document_number?: string | null
          document_type?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          job_title?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department?: string | null
          document_number?: string | null
          document_type?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          job_title?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          permission_key: string
          permission_label: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          permission_key: string
          permission_label: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          permission_key?: string
          permission_label?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
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
      add_role_permission: {
        Args: {
          p_is_enabled?: boolean
          p_permission_key: string
          p_permission_label: string
          p_role: Database["public"]["Enums"]["app_role"]
        }
        Returns: undefined
      }
      assign_user_roles: {
        Args: {
          p_roles: Database["public"]["Enums"]["app_role"][]
          p_user_id: string
        }
        Returns: undefined
      }
      delete_role_permission: {
        Args: {
          p_permission_key: string
          p_role: Database["public"]["Enums"]["app_role"]
        }
        Returns: undefined
      }
      get_consent_by_token: {
        Args: { p_token: string }
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
        Args: { p_ip_address?: string; p_token: string; p_user_agent?: string }
        Returns: {
          consent_type: string
          id: string
          patient_document_number: string
          patient_document_type: string
          patient_email: string
          patient_name: string
          patient_phone: string
          patient_photo_url: string
          payload: Json
          professional_document: string
          professional_name: string
          professional_signature_data: string
          share_expires_at: string
          signed_at: string
          signed_by_name: string
          status: string
        }[]
      }
      get_role_permissions: {
        Args: { p_role: Database["public"]["Enums"]["app_role"] }
        Returns: {
          is_enabled: boolean
          permission_key: string
          permission_label: string
        }[]
      }
      get_users_with_roles: {
        Args: never
        Returns: {
          department: string
          document_number: string
          document_type: string
          email: string
          full_name: string
          is_active: boolean
          job_title: string
          phone: string
          roles: Database["public"]["Enums"]["app_role"][]
          user_created_at: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      insert_audit_log: {
        Args: {
          p_access_type: string
          p_consent_id: string
          p_error_message?: string
          p_ip_address?: unknown
          p_share_token: string
          p_success?: boolean
          p_user_agent?: string
        }
        Returns: undefined
      }
      is_admin_role: { Args: never; Returns: boolean }
      is_admin_user: { Args: never; Returns: boolean }
      sign_consent_by_token:
        | {
            Args: {
              p_signature_data: string
              p_signed_by_name: string
              p_token: string
            }
            Returns: {
              id: string
              signed_at: string
              status: string
            }[]
          }
        | {
            Args: {
              p_patient_photo_url?: string
              p_signature_data: string
              p_signed_by_name: string
              p_token: string
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
          p_ip_address?: string
          p_patient_photo_url?: string
          p_signature_data: string
          p_signed_by_name: string
          p_token: string
          p_user_agent?: string
          p_verification_code?: string
        }
        Returns: {
          id: string
          signed_at: string
          status: string
        }[]
      }
      update_role_permission: {
        Args: {
          p_is_enabled: boolean
          p_permission_key: string
          p_role: Database["public"]["Enums"]["app_role"]
        }
        Returns: undefined
      }
      user_has_permission: {
        Args: { p_permission_key: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "doctor"
        | "lab_technician"
        | "receptionist"
        | "viewer"
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
    Enums: {
      app_role: ["admin", "doctor", "lab_technician", "receptionist", "viewer"],
    },
  },
} as const
