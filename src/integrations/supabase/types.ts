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
          email: string | null
          expires_at: string | null
          id: string
          issued_to: string | null
          max_uses: number
          note: string | null
          revoked_at: string | null
          status: Database["public"]["Enums"]["beta_code_status"]
          used_at: string | null
          used_by_device_id: string | null
          uses_count: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          email?: string | null
          expires_at?: string | null
          id?: string
          issued_to?: string | null
          max_uses?: number
          note?: string | null
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["beta_code_status"]
          used_at?: string | null
          used_by_device_id?: string | null
          uses_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          email?: string | null
          expires_at?: string | null
          id?: string
          issued_to?: string | null
          max_uses?: number
          note?: string | null
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["beta_code_status"]
          used_at?: string | null
          used_by_device_id?: string | null
          uses_count?: number
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
      beta_code_redemptions: {
        Row: {
          code_id: string
          id: string
          ip_hash: string | null
          redeemed_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          code_id: string
          id?: string
          ip_hash?: string | null
          redeemed_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          code_id?: string
          id?: string
          ip_hash?: string | null
          redeemed_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beta_code_redemptions_code_id_fkey"
            columns: ["code_id"]
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
      beta_redeem_rate_limits: {
        Row: {
          attempted_at: string
          id: string
          success: boolean
          user_id: string
        }
        Insert: {
          attempted_at?: string
          id?: string
          success?: boolean
          user_id: string
        }
        Update: {
          attempted_at?: string
          id?: string
          success?: boolean
          user_id?: string
        }
        Relationships: []
      }
      client_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by_user_id: string | null
          agent_user_id: string
          client_email: string
          client_first_name: string | null
          client_last_name: string | null
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
          client_first_name?: string | null
          client_last_name?: string | null
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
          client_first_name?: string | null
          client_last_name?: string | null
          created_at?: string
          id?: string
          invite_token?: string
          revoked_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_api_keys: {
        Row: {
          created_at: string
          crm_type: string
          encrypted_api_key: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          crm_type?: string
          encrypted_api_key: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          crm_type?: string
          encrypted_api_key?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      crm_connections: {
        Row: {
          api_key_hint: string | null
          auto_push_on_analyze: boolean
          auto_push_on_csv_upload: boolean
          auto_push_on_score_change: boolean
          created_at: string
          crm_display_name: string | null
          crm_type: string
          id: string
          is_active: boolean
          score_change_threshold: number
          updated_at: string
          user_id: string
          webhook_url: string | null
        }
        Insert: {
          api_key_hint?: string | null
          auto_push_on_analyze?: boolean
          auto_push_on_csv_upload?: boolean
          auto_push_on_score_change?: boolean
          created_at?: string
          crm_display_name?: string | null
          crm_type?: string
          id?: string
          is_active?: boolean
          score_change_threshold?: number
          updated_at?: string
          user_id: string
          webhook_url?: string | null
        }
        Update: {
          api_key_hint?: string | null
          auto_push_on_analyze?: boolean
          auto_push_on_csv_upload?: boolean
          auto_push_on_score_change?: boolean
          created_at?: string
          crm_display_name?: string | null
          crm_type?: string
          id?: string
          is_active?: boolean
          score_change_threshold?: number
          updated_at?: string
          user_id?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      crm_push_log: {
        Row: {
          action: string
          city_state: string | null
          created_at: string
          crm_type: string
          error_msg: string | null
          id: string
          lead_type: string | null
          leads_pushed: number | null
          opportunity_score: number | null
          score_delta: number | null
          status: string
          user_id: string
          zip_code: string | null
        }
        Insert: {
          action: string
          city_state?: string | null
          created_at?: string
          crm_type?: string
          error_msg?: string | null
          id?: string
          lead_type?: string | null
          leads_pushed?: number | null
          opportunity_score?: number | null
          score_delta?: number | null
          status?: string
          user_id: string
          zip_code?: string | null
        }
        Update: {
          action?: string
          city_state?: string | null
          created_at?: string
          crm_type?: string
          error_msg?: string | null
          id?: string
          lead_type?: string | null
          leads_pushed?: number | null
          opportunity_score?: number | null
          score_delta?: number | null
          status?: string
          user_id?: string
          zip_code?: string | null
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
      lead_finder_analyses: {
        Row: {
          city_state: string | null
          created_at: string
          fred_data: Json
          id: string
          is_pinned: boolean
          lead_type: string | null
          opportunity_score: number | null
          refreshed_at: string
          user_id: string
          zip_code: string
        }
        Insert: {
          city_state?: string | null
          created_at?: string
          fred_data?: Json
          id?: string
          is_pinned?: boolean
          lead_type?: string | null
          opportunity_score?: number | null
          refreshed_at?: string
          user_id: string
          zip_code: string
        }
        Update: {
          city_state?: string | null
          created_at?: string
          fred_data?: Json
          id?: string
          is_pinned?: boolean
          lead_type?: string | null
          opportunity_score?: number | null
          refreshed_at?: string
          user_id?: string
          zip_code?: string
        }
        Relationships: []
      }
      lead_finder_score_history: {
        Row: {
          city_state: string | null
          id: string
          lead_type: string
          opportunity_score: number
          recorded_at: string
          user_id: string
          zip_code: string
        }
        Insert: {
          city_state?: string | null
          id?: string
          lead_type: string
          opportunity_score: number
          recorded_at?: string
          user_id: string
          zip_code: string
        }
        Update: {
          city_state?: string | null
          id?: string
          lead_type?: string
          opportunity_score?: number
          recorded_at?: string
          user_id?: string
          zip_code?: string
        }
        Relationships: []
      }
      listing_navigator_flags: {
        Row: {
          addressed: boolean
          addressed_at: string | null
          category: string
          evidence: Json | null
          id: string
          rule_key: string
          run_id: string
          severity: number
          suggested_angles: Json | null
          title: string
          why_it_matters: string
        }
        Insert: {
          addressed?: boolean
          addressed_at?: string | null
          category?: string
          evidence?: Json | null
          id?: string
          rule_key: string
          run_id: string
          severity?: number
          suggested_angles?: Json | null
          title: string
          why_it_matters?: string
        }
        Update: {
          addressed?: boolean
          addressed_at?: string | null
          category?: string
          evidence?: Json | null
          id?: string
          rule_key?: string
          run_id?: string
          severity?: number
          suggested_angles?: Json | null
          title?: string
          why_it_matters?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_navigator_flags_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "listing_navigator_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_navigator_runs: {
        Row: {
          created_at: string
          id: string
          improved_description: string | null
          input_type: string
          listing_label: string | null
          mls_number: string | null
          parsed_text: string
          property_address: string | null
          property_hint: Json | null
          raw_text: string
          score: number | null
          status: string
          summary: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          improved_description?: string | null
          input_type?: string
          listing_label?: string | null
          mls_number?: string | null
          parsed_text?: string
          property_address?: string | null
          property_hint?: Json | null
          raw_text?: string
          score?: number | null
          status?: string
          summary?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          improved_description?: string | null
          input_type?: string
          listing_label?: string | null
          mls_number?: string | null
          parsed_text?: string
          property_address?: string | null
          property_hint?: Json | null
          raw_text?: string
          score?: number | null
          status?: string
          summary?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      listing_rules: {
        Row: {
          category: string
          description: string
          enabled: boolean
          logic: Json | null
          name: string
          rule_key: string
          severity_default: number
          suggested_angles: Json | null
          why_it_matters_template: string
        }
        Insert: {
          category?: string
          description?: string
          enabled?: boolean
          logic?: Json | null
          name: string
          rule_key: string
          severity_default?: number
          suggested_angles?: Json | null
          why_it_matters_template?: string
        }
        Update: {
          category?: string
          description?: string
          enabled?: boolean
          logic?: Json | null
          name?: string
          rule_key?: string
          severity_default?: number
          suggested_angles?: Json | null
          why_it_matters_template?: string
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
      market_shift_alerts: {
        Row: {
          city_state: string | null
          created_at: string
          current_score: number
          id: string
          is_read: boolean
          lead_type: string
          previous_score: number
          score_delta: number
          user_id: string
          zip_code: string
        }
        Insert: {
          city_state?: string | null
          created_at?: string
          current_score: number
          id?: string
          is_read?: boolean
          lead_type: string
          previous_score: number
          score_delta: number
          user_id: string
          zip_code: string
        }
        Update: {
          city_state?: string | null
          created_at?: string
          current_score?: number
          id?: string
          is_read?: boolean
          lead_type?: string
          previous_score?: number
          score_delta?: number
          user_id?: string
          zip_code?: string
        }
        Relationships: []
      }
      offer_outcomes: {
        Row: {
          address: string
          competing_offers: number | null
          created_at: string
          days_on_market: number | null
          financing_type: string | null
          had_escalation: boolean | null
          had_inspection_contingency: boolean | null
          id: string
          list_price: number
          notes: string | null
          offer_price: number
          result: string
          session_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          competing_offers?: number | null
          created_at?: string
          days_on_market?: number | null
          financing_type?: string | null
          had_escalation?: boolean | null
          had_inspection_contingency?: boolean | null
          id?: string
          list_price: number
          notes?: string | null
          offer_price: number
          result: string
          session_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          competing_offers?: number | null
          created_at?: string
          days_on_market?: number | null
          financing_type?: string | null
          had_escalation?: boolean | null
          had_inspection_contingency?: boolean | null
          id?: string
          list_price?: number
          notes?: string | null
          offer_price?: number
          result?: string
          session_id?: string | null
          updated_at?: string
          user_id?: string
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
      pre_approved_emails: {
        Row: {
          created_at: string
          created_by: string | null
          days: number
          email: string
          expires_at: string
          id: string
          name: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          days?: number
          email: string
          expires_at: string
          id?: string
          name?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          days?: number
          email?: string
          expires_at?: string
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          beta_access_active: boolean
          beta_access_expires_at: string | null
          beta_access_source: string | null
          brokerage: string | null
          created_at: string
          custom_cta: string | null
          email: string | null
          email_verified: boolean | null
          full_name: string | null
          id: string
          is_suspended: boolean | null
          last_active_at: string | null
          last_entitlement_check_at: string | null
          license: string | null
          phone: string | null
          suspended_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          beta_access_active?: boolean
          beta_access_expires_at?: string | null
          beta_access_source?: string | null
          brokerage?: string | null
          created_at?: string
          custom_cta?: string | null
          email?: string | null
          email_verified?: boolean | null
          full_name?: string | null
          id?: string
          is_suspended?: boolean | null
          last_active_at?: string | null
          last_entitlement_check_at?: string | null
          license?: string | null
          phone?: string | null
          suspended_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          beta_access_active?: boolean
          beta_access_expires_at?: string | null
          beta_access_source?: string | null
          brokerage?: string | null
          created_at?: string
          custom_cta?: string | null
          email?: string | null
          email_verified?: boolean | null
          full_name?: string | null
          id?: string
          is_suspended?: boolean | null
          last_active_at?: string | null
          last_entitlement_check_at?: string | null
          license?: string | null
          phone?: string | null
          suspended_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      property_documents: {
        Row: {
          agent_user_id: string
          created_at: string
          extracted_fields: Json | null
          field_confidence: Json | null
          field_evidence: Json | null
          file_size_bytes: number | null
          filename: string
          id: string
          mls_compliance_confirmed: boolean
          notes: string | null
          raw_text: string | null
          session_id: string | null
          status: string
          storage_path: string
          updated_at: string
        }
        Insert: {
          agent_user_id: string
          created_at?: string
          extracted_fields?: Json | null
          field_confidence?: Json | null
          field_evidence?: Json | null
          file_size_bytes?: number | null
          filename: string
          id?: string
          mls_compliance_confirmed?: boolean
          notes?: string | null
          raw_text?: string | null
          session_id?: string | null
          status?: string
          storage_path: string
          updated_at?: string
        }
        Update: {
          agent_user_id?: string
          created_at?: string
          extracted_fields?: Json | null
          field_confidence?: Json | null
          field_evidence?: Json | null
          file_size_bytes?: number | null
          filename?: string
          id?: string
          mls_compliance_confirmed?: boolean
          notes?: string | null
          raw_text?: string | null
          session_id?: string | null
          status?: string
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_documents_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
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
      saved_playbooks: {
        Row: {
          analysis_id: string | null
          city_state: string | null
          created_at: string
          id: string
          label: string | null
          lead_type: string
          opportunity_score: number | null
          personalization: Json | null
          playbook_items: Json
          updated_at: string
          user_id: string
          zip_code: string
        }
        Insert: {
          analysis_id?: string | null
          city_state?: string | null
          created_at?: string
          id?: string
          label?: string | null
          lead_type: string
          opportunity_score?: number | null
          personalization?: Json | null
          playbook_items?: Json
          updated_at?: string
          user_id: string
          zip_code: string
        }
        Update: {
          analysis_id?: string | null
          city_state?: string | null
          created_at?: string
          id?: string
          label?: string | null
          lead_type?: string
          opportunity_score?: number | null
          personalization?: Json | null
          playbook_items?: Json
          updated_at?: string
          user_id?: string
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_playbooks_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "lead_finder_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          address_fields: Json | null
          archived: boolean
          archived_at: string | null
          buyer_inputs: Json | null
          claimed_by_user_id: string | null
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
          recipient_email: string | null
          selected_market_profile_id: string | null
          seller_inputs: Json | null
          session_type: string
          share_link_created: boolean | null
          share_token: string | null
          share_token_revoked: boolean | null
          updated_at: string
        }
        Insert: {
          address_fields?: Json | null
          archived?: boolean
          archived_at?: string | null
          buyer_inputs?: Json | null
          claimed_by_user_id?: string | null
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
          recipient_email?: string | null
          selected_market_profile_id?: string | null
          seller_inputs?: Json | null
          session_type: string
          share_link_created?: boolean | null
          share_token?: string | null
          share_token_revoked?: boolean | null
          updated_at?: string
        }
        Update: {
          address_fields?: Json | null
          archived?: boolean
          archived_at?: string | null
          buyer_inputs?: Json | null
          claimed_by_user_id?: string | null
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
          recipient_email?: string | null
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
      user_entitlements: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_pro: boolean
          is_trial: boolean
          product_id: string | null
          source: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_pro?: boolean
          is_trial?: boolean
          product_id?: string | null
          source?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_pro?: boolean
          is_trial?: boolean
          product_id?: string | null
          source?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
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
      user_subscriptions: {
        Row: {
          auto_renew_enabled: boolean | null
          created_at: string
          id: string
          latest_receipt: string | null
          original_transaction_id: string | null
          status: string
          subscription_expires_at: string | null
          subscription_product_id: string | null
          subscription_started_at: string | null
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_renew_enabled?: boolean | null
          created_at?: string
          id?: string
          latest_receipt?: string | null
          original_transaction_id?: string | null
          status?: string
          subscription_expires_at?: string | null
          subscription_product_id?: string | null
          subscription_started_at?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_renew_enabled?: boolean | null
          created_at?: string
          id?: string
          latest_receipt?: string | null
          original_transaction_id?: string | null
          status?: string
          subscription_expires_at?: string | null
          subscription_product_id?: string | null
          subscription_started_at?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
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
      claim_pre_approved_access: { Args: never; Returns: Json }
      claim_shared_reports: {
        Args: { p_email: string; p_session_id?: string; p_user_id: string }
        Returns: Json
      }
      create_beta_access_code: {
        Args: {
          p_code: string
          p_email?: string
          p_expires_at?: string
          p_issued_to: string
          p_max_uses?: number
          p_notes?: string
        }
        Returns: Json
      }
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
      expire_stale_beta_access: { Args: never; Returns: Json }
      get_invitation_by_token: {
        Args: { p_token: string }
        Returns: {
          agent_name: string
          client_email: string
          client_first_name: string
          client_last_name: string
          status: string
        }[]
      }
      get_user_entitlements: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_user: { Args: never; Returns: boolean }
      list_beta_access_codes: {
        Args: never
        Returns: {
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          issued_to: string
          max_uses: number
          notes: string
          redemptions: Json
          revoked_at: string
          uses_count: number
        }[]
      }
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
      redeem_beta_code:
        | { Args: { p_code: string; p_device_id: string }; Returns: Json }
        | { Args: { p_code: string; p_user_agent?: string }; Returns: Json }
      register_owner_device: {
        Args: { p_admin_email: string; p_device_id: string }
        Returns: Json
      }
      revoke_beta_access_code: { Args: { p_code_id: string }; Returns: Json }
      revoke_owner_device: { Args: { p_device_id: string }; Returns: Json }
      upsert_pre_approved_email: {
        Args: {
          p_days?: number
          p_email: string
          p_expires_at?: string
          p_name?: string
        }
        Returns: Json
      }
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
      app_role: "admin" | "moderator" | "user" | "agent" | "client" | "reviewer"
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
      app_role: ["admin", "moderator", "user", "agent", "client", "reviewer"],
      beta_code_status: ["active", "used", "revoked", "expired"],
    },
  },
} as const
