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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      beta_access_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          issued_to: string | null
          note: string | null
          status: Database["public"]["Enums"]["beta_code_status"]
          used_at: string | null
          used_by_device_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          issued_to?: string | null
          note?: string | null
          status?: Database["public"]["Enums"]["beta_code_status"]
          used_at?: string | null
          used_by_device_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          issued_to?: string | null
          note?: string | null
          status?: Database["public"]["Enums"]["beta_code_status"]
          used_at?: string | null
          used_by_device_id?: string | null
        }
        Relationships: []
      }
      beta_activations: {
        Row: {
          activated_at: string
          activation_source: string
          code_id: string | null
          device_id: string
          email: string
          id: string
        }
        Insert: {
          activated_at?: string
          activation_source: string
          code_id?: string | null
          device_id: string
          email: string
          id?: string
        }
        Update: {
          activated_at?: string
          activation_source?: string
          code_id?: string | null
          device_id?: string
          email?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beta_activations_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "beta_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      beta_authorized_devices: {
        Row: {
          activated_at: string
          activated_via_code_id: string | null
          device_id: string
          id: string
          is_revoked: boolean
          label: string | null
          revoked_at: string | null
        }
        Insert: {
          activated_at?: string
          activated_via_code_id?: string | null
          device_id: string
          id?: string
          is_revoked?: boolean
          label?: string | null
          revoked_at?: string | null
        }
        Update: {
          activated_at?: string
          activated_via_code_id?: string | null
          device_id?: string
          id?: string
          is_revoked?: boolean
          label?: string | null
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beta_authorized_devices_activated_via_code_id_fkey"
            columns: ["activated_via_code_id"]
            isOneToOne: false
            referencedRelation: "beta_access_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      beta_codes: {
        Row: {
          code_hash: string
          created_at: string
          created_by_admin_email: string
          email: string
          expires_at: string | null
          id: string
          issued_to: string | null
          revoked_at: string | null
          used_at: string | null
          used_by_device_id: string | null
          used_by_user_agent: string | null
        }
        Insert: {
          code_hash: string
          created_at?: string
          created_by_admin_email: string
          email: string
          expires_at?: string | null
          id?: string
          issued_to?: string | null
          revoked_at?: string | null
          used_at?: string | null
          used_by_device_id?: string | null
          used_by_user_agent?: string | null
        }
        Update: {
          code_hash?: string
          created_at?: string
          created_by_admin_email?: string
          email?: string
          expires_at?: string | null
          id?: string
          issued_to?: string | null
          revoked_at?: string | null
          used_at?: string | null
          used_by_device_id?: string | null
          used_by_user_agent?: string | null
        }
        Relationships: []
      }
      owner_devices: {
        Row: {
          admin_email: string
          created_at: string
          device_id: string
          id: string
          revoked_at: string | null
        }
        Insert: {
          admin_email: string
          created_at?: string
          device_id: string
          id?: string
          revoked_at?: string | null
        }
        Update: {
          admin_email?: string
          created_at?: string
          device_id?: string
          id?: string
          revoked_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_beta_access: {
        Args: { p_device_id: string; p_email: string }
        Returns: Json
      }
      check_device_authorization: {
        Args: { p_device_id: string }
        Returns: Json
      }
      check_owner_device: { Args: { p_device_id: string }; Returns: Json }
      is_admin_user: { Args: never; Returns: boolean }
      record_admin_activation: {
        Args: { p_device_id: string; p_email: string }
        Returns: Json
      }
      redeem_beta_code: {
        Args: { p_code: string; p_device_id: string }
        Returns: Json
      }
      register_owner_device: {
        Args: { p_admin_email: string; p_device_id: string }
        Returns: Json
      }
      revoke_owner_device: { Args: { p_device_id: string }; Returns: Json }
      validate_beta_code: {
        Args: {
          p_code_hash: string
          p_device_id: string
          p_email: string
          p_user_agent?: string
        }
        Returns: Json
      }
    }
    Enums: {
      beta_code_status: "active" | "used" | "revoked" | "expired"
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
      beta_code_status: ["active", "used", "revoked", "expired"],
    },
  },
} as const
