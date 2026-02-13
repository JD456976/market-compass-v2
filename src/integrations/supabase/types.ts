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
      agent_branding: {
        Row: {
          accent_color: string | null
          created_at: string
          footer_text: string | null
          headshot_url: string | null
          id: string
          logo_url: string | null
          primary_color: string | null
          report_template: string | null
          social_links: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accent_color?: string | null
          created_at?: string
          footer_text?: string | null
          headshot_url?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          report_template?: string | null
          social_links?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accent_color?: string | null
          created_at?: string
          footer_text?: string | null
          headshot_url?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          report_template?: string | null
          social_links?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agent_clients: {
        Row: {
          agent_user_id: string
          client_user_id: string
          created_at: string
          id: string
          invitation_id: string | null
        }
        Insert: {
          agent_user_id: string
          client_user_id: string
          created_at?: string
          id?: string
          invitation_id?: string | null
        }
        Update: {
          agent_user_id?: string
          client_user_id?: string
          created_at?: string
          id?: string
          invitation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_clients_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "client_invitations"
            referencedColumns: ["id"]
          },
        ]
      }
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
      client_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by_user_id: string | null
          agent_user_id: string
          client_email: string
          created_at: string
          id: string
          invite_token: string
          revoked_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          agent_user_id: string
          client_email: string
          created_at?: string
          id?: string
          invite_token?: string
          revoked_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          agent_user_id?: string
          client_email?: string
          created_at?: string
          id?: string
          invite_token?: string
          revoked_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_queue: {
        Row: {
          body_html: string
          body_text: string | null
          created_at: string
          error: string | null
          id: string
          metadata: Json | null
          sent_at: string | null
          status: string
          subject: string
          to_email: string
        }
        Insert: {
          body_html: string
          body_text?: string | null
          created_at?: string
          error?: string | null
          id?: string
          metadata?: Json | null
          sent_at?: string | null
          status?: string
          subject: string
          to_email: string
        }
        Update: {
          body_html?: string
          body_text?: string | null
          created_at?: string
          error?: string | null
          id?: string
          metadata?: Json | null
          sent_at?: string | null
          status?: string
          subject?: string
          to_email?: string
        }
        Relationships: []
      }
      market_profiles: {
        Row: {
          contingency_tolerance: string
          created_at: string
          id: string
          label: string
          location: string
          multiple_offers_frequency: string
          owner_device_id: string | null
          owner_user_id: string | null
          property_type: string
          typical_dom: string
          typical_sale_to_list: string
          updated_at: string
        }
        Insert: {
          contingency_tolerance: string
          created_at?: string
          id?: string
          label: string
          location: string
          multiple_offers_frequency: string
          owner_device_id?: string | null
          owner_user_id?: string | null
          property_type: string
          typical_dom: string
          typical_sale_to_list: string
          updated_at?: string
        }
        Update: {
          contingency_tolerance?: string
          created_at?: string
          id?: string
          label?: string
          location?: string
          multiple_offers_frequency?: string
          owner_device_id?: string | null
          owner_user_id?: string | null
          property_type?: string
          typical_dom?: string
          typical_sale_to_list?: string
          updated_at?: string
        }
        Relationships: []
      }
      market_scenarios: {
        Row: {
          competition_level: string
          created_at: string
          demand_level: string
          id: string
          is_built_in: boolean
          name: string
          negotiation_leverage: string
          owner_device_id: string | null
          owner_user_id: string | null
          pricing_sensitivity: string
          summary: string
          typical_dom_band: string
          updated_at: string
        }
        Insert: {
          competition_level?: string
          created_at?: string
          demand_level?: string
          id?: string
          is_built_in?: boolean
          name: string
          negotiation_leverage?: string
          owner_device_id?: string | null
          owner_user_id?: string | null
          pricing_sensitivity?: string
          summary: string
          typical_dom_band?: string
          updated_at?: string
        }
        Update: {
          competition_level?: string
          created_at?: string
          demand_level?: string
          id?: string
          is_built_in?: boolean
          name?: string
          negotiation_leverage?: string
          owner_device_id?: string | null
          owner_user_id?: string | null
          pricing_sensitivity?: string
          summary?: string
          typical_dom_band?: string
          updated_at?: string
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
      profiles: {
        Row: {
          avatar_url: string | null
          brokerage: string | null
          created_at: string
          email: string | null
          email_verified: boolean | null
          full_name: string | null
          id: string
          is_suspended: boolean | null
          last_active_at: string | null
          phone: string | null
          suspended_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          brokerage?: string | null
          created_at?: string
          email?: string | null
          email_verified?: boolean | null
          full_name?: string | null
          id?: string
          is_suspended?: boolean | null
          last_active_at?: string | null
          phone?: string | null
          suspended_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          brokerage?: string | null
          created_at?: string
          email?: string | null
          email_verified?: boolean | null
          full_name?: string | null
          id?: string
          is_suspended?: boolean | null
          last_active_at?: string | null
          phone?: string | null
          suspended_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      report_feedback: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: string
          report_id: string
          share_token: string
          viewer_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating: string
          report_id: string
          share_token: string
          viewer_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: string
          report_id?: string
          share_token?: string
          viewer_id?: string
        }
        Relationships: []
      }
      report_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          read_by_agent_at: string | null
          read_by_client_at: string | null
          report_id: string
          sender_id: string
          sender_role: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read_by_agent_at?: string | null
          read_by_client_at?: string | null
          report_id: string
          sender_id: string
          sender_role: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_by_agent_at?: string | null
          read_by_client_at?: string | null
          report_id?: string
          sender_id?: string
          sender_role?: string
        }
        Relationships: []
      }
      report_notes: {
        Row: {
          author_name: string | null
          author_type: string
          content: string
          created_at: string
          id: string
          is_pinned: boolean
          report_id: string
          updated_at: string
        }
        Insert: {
          author_name?: string | null
          author_type: string
          content: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          report_id: string
          updated_at?: string
        }
        Update: {
          author_name?: string | null
          author_type?: string
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          report_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      report_scenarios: {
        Row: {
          created_at: string
          created_by_id: string
          created_by_role: string
          id: string
          note_to_agent: string | null
          report_id: string
          reviewed_at: string | null
          reviewed_status: string | null
          scenario_payload: Json
          submitted_at: string | null
          submitted_to_agent: boolean
          title: string | null
        }
        Insert: {
          created_at?: string
          created_by_id: string
          created_by_role: string
          id?: string
          note_to_agent?: string | null
          report_id: string
          reviewed_at?: string | null
          reviewed_status?: string | null
          scenario_payload?: Json
          submitted_at?: string | null
          submitted_to_agent?: boolean
          title?: string | null
        }
        Update: {
          created_at?: string
          created_by_id?: string
          created_by_role?: string
          id?: string
          note_to_agent?: string | null
          report_id?: string
          reviewed_at?: string | null
          reviewed_status?: string | null
          scenario_payload?: Json
          submitted_at?: string | null
          submitted_to_agent?: boolean
          title?: string | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          archived: boolean
          archived_at: string | null
          buyer_inputs: Json | null
          client_name: string
          condition: string
          created_at: string
          id: string
          location: string
          market_scenario_id: string | null
          market_scenario_overrides: Json | null
          market_snapshot_id: string | null
          owner_device_id: string | null
          owner_user_id: string | null
          pdf_exported: boolean | null
          property_type: string
          selected_market_profile_id: string | null
          seller_inputs: Json | null
          session_type: string
          share_link_created: boolean | null
          share_token: string | null
          share_token_revoked: boolean | null
          updated_at: string
        }
        Insert: {
          archived?: boolean
          archived_at?: string | null
          buyer_inputs?: Json | null
          client_name: string
          condition: string
          created_at?: string
          id?: string
          location: string
          market_scenario_id?: string | null
          market_scenario_overrides?: Json | null
          market_snapshot_id?: string | null
          owner_device_id?: string | null
          owner_user_id?: string | null
          pdf_exported?: boolean | null
          property_type: string
          selected_market_profile_id?: string | null
          seller_inputs?: Json | null
          session_type: string
          share_link_created?: boolean | null
          share_token?: string | null
          share_token_revoked?: boolean | null
          updated_at?: string
        }
        Update: {
          archived?: boolean
          archived_at?: string | null
          buyer_inputs?: Json | null
          client_name?: string
          condition?: string
          created_at?: string
          id?: string
          location?: string
          market_scenario_id?: string | null
          market_scenario_overrides?: Json | null
          market_snapshot_id?: string | null
          owner_device_id?: string | null
          owner_user_id?: string | null
          pdf_exported?: boolean | null
          property_type?: string
          selected_market_profile_id?: string | null
          seller_inputs?: Json | null
          session_type?: string
          share_link_created?: boolean | null
          share_token?: string | null
          share_token_revoked?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      shared_report_views: {
        Row: {
          device_type: string | null
          id: string
          referrer: string | null
          report_id: string
          share_token: string
          user_agent: string | null
          viewed_at: string
          viewer_id: string
        }
        Insert: {
          device_type?: string | null
          id?: string
          referrer?: string | null
          report_id: string
          share_token: string
          user_agent?: string | null
          viewed_at?: string
          viewer_id: string
        }
        Update: {
          device_type?: string | null
          id?: string
          referrer?: string | null
          report_id?: string
          share_token?: string
          user_agent?: string | null
          viewed_at?: string
          viewer_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
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
      create_beta_code: {
        Args: {
          p_admin_email: string
          p_code_hash: string
          p_email: string
          p_expires_at?: string
          p_issued_to?: string
        }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_user: { Args: never; Returns: boolean }
      list_owner_devices: {
        Args: never
        Returns: {
          admin_email: string
          created_at: string
          device_id: string
          id: string
          revoked_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "owner_devices"
          isOneToOne: false
          isSetofReturn: true
        }
      }
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
      app_role: "admin" | "moderator" | "user" | "agent" | "client"
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
      app_role: ["admin", "moderator", "user", "agent", "client"],
      beta_code_status: ["active", "used", "revoked", "expired"],
    },
  },
} as const
