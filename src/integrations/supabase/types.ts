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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      access_profiles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          max_down_kbps: number
          max_up_kbps: number
          name: string
          priority: number
          quota_mb: number | null
          quota_minutes: number | null
          updated_at: string
          vlan_id: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_down_kbps?: number
          max_up_kbps?: number
          name: string
          priority?: number
          quota_mb?: number | null
          quota_minutes?: number | null
          updated_at?: string
          vlan_id?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_down_kbps?: number
          max_up_kbps?: number
          name?: string
          priority?: number
          quota_mb?: number | null
          quota_minutes?: number | null
          updated_at?: string
          vlan_id?: number | null
        }
        Relationships: []
      }
      ai_providers_config: {
        Row: {
          api_endpoint: string | null
          api_key_encrypted: string | null
          created_at: string | null
          fallback_provider_id: string | null
          id: string
          is_active: boolean | null
          max_tokens: number | null
          model_name: string | null
          name: string
          pricing_per_1k_tokens: number | null
          priority: number | null
          provider_type: string
          temperature: number | null
          updated_at: string | null
        }
        Insert: {
          api_endpoint?: string | null
          api_key_encrypted?: string | null
          created_at?: string | null
          fallback_provider_id?: string | null
          id?: string
          is_active?: boolean | null
          max_tokens?: number | null
          model_name?: string | null
          name: string
          pricing_per_1k_tokens?: number | null
          priority?: number | null
          provider_type: string
          temperature?: number | null
          updated_at?: string | null
        }
        Update: {
          api_endpoint?: string | null
          api_key_encrypted?: string | null
          created_at?: string | null
          fallback_provider_id?: string | null
          id?: string
          is_active?: boolean | null
          max_tokens?: number | null
          model_name?: string | null
          name?: string
          pricing_per_1k_tokens?: number | null
          priority?: number | null
          provider_type?: string
          temperature?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      audit_config: {
        Row: {
          created_at: string | null
          enable_email_notifications: boolean | null
          enable_export_logs: boolean | null
          enable_real_time_alerts: boolean | null
          id: string
          log_level: string | null
          max_failed_attempts: number | null
          retention_days: number | null
          session_timeout_minutes: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enable_email_notifications?: boolean | null
          enable_export_logs?: boolean | null
          enable_real_time_alerts?: boolean | null
          id?: string
          log_level?: string | null
          max_failed_attempts?: number | null
          retention_days?: number | null
          session_timeout_minutes?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enable_email_notifications?: boolean | null
          enable_export_logs?: boolean | null
          enable_real_time_alerts?: boolean | null
          id?: string
          log_level?: string | null
          max_failed_attempts?: number | null
          retention_days?: number | null
          session_timeout_minutes?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      auth_config: {
        Row: {
          auto_disconnect: boolean | null
          created_at: string | null
          email_enabled: boolean | null
          id: string
          max_attempts: number | null
          referral_enabled: boolean | null
          session_duration_minutes: number | null
          sms_enabled: boolean | null
          timeout_seconds: number | null
          updated_at: string | null
        }
        Insert: {
          auto_disconnect?: boolean | null
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          max_attempts?: number | null
          referral_enabled?: boolean | null
          session_duration_minutes?: number | null
          sms_enabled?: boolean | null
          timeout_seconds?: number | null
          updated_at?: string | null
        }
        Update: {
          auto_disconnect?: boolean | null
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          max_attempts?: number | null
          referral_enabled?: boolean | null
          session_duration_minutes?: number | null
          sms_enabled?: boolean | null
          timeout_seconds?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      auth_otp_config: {
        Row: {
          created_at: string | null
          enable_leaked_password_protection: boolean
          id: string
          max_attempts: number
          otp_expiry_seconds: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enable_leaked_password_protection?: boolean
          id?: string
          max_attempts?: number
          otp_expiry_seconds?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enable_leaked_password_protection?: boolean
          id?: string
          max_attempts?: number
          otp_expiry_seconds?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      chat_knowledge_base: {
        Row: {
          answer: string
          category: string | null
          context_triggers: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          keywords: string[] | null
          priority: number | null
          question: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          answer: string
          category?: string | null
          context_triggers?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          keywords?: string[] | null
          priority?: number | null
          question: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          answer?: string
          category?: string | null
          context_triggers?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          keywords?: string[] | null
          priority?: number | null
          question?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string | null
          device_info: Json | null
          event_data: Json | null
          event_name: string
          event_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_info?: Json | null
          event_data?: Json | null
          event_name: string
          event_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_info?: Json | null
          event_data?: Json | null
          event_name?: string
          event_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "wifi_users"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          active: boolean | null
          category: string | null
          config: Json | null
          created_at: string | null
          description: string | null
          game_type: string
          id: string
          minutes_reward: number | null
          points_reward: number | null
          site_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          config?: Json | null
          created_at?: string | null
          description?: string | null
          game_type: string
          id?: string
          minutes_reward?: number | null
          points_reward?: number | null
          site_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          category?: string | null
          config?: Json | null
          created_at?: string | null
          description?: string | null
          game_type?: string
          id?: string
          minutes_reward?: number | null
          points_reward?: number | null
          site_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_levels: {
        Row: {
          benefits: Json | null
          color: string | null
          created_at: string | null
          id: string
          min_points: number
          name: string
        }
        Insert: {
          benefits?: Json | null
          color?: string | null
          created_at?: string | null
          id?: string
          min_points: number
          name: string
        }
        Update: {
          benefits?: Json | null
          color?: string | null
          created_at?: string | null
          id?: string
          min_points?: number
          name?: string
        }
        Relationships: []
      }
      otp_attempts: {
        Row: {
          attempted_at: string
          id: string
          identifier: string
          ip_address: string
        }
        Insert: {
          attempted_at?: string
          id?: string
          identifier: string
          ip_address: string
        }
        Update: {
          attempted_at?: string
          id?: string
          identifier?: string
          ip_address?: string
        }
        Relationships: []
      }
      portal_config: {
        Row: {
          available_languages: Json | null
          bandwidth_limit_kbps: number | null
          created_at: string | null
          custom_css: string | null
          default_language: string | null
          flow_order: Json | null
          id: string
          kit_id: string | null
          logo_url: string | null
          portal_name: string | null
          portal_status: string | null
          portal_version: number | null
          redirect_url: string | null
          site_id: string | null
          success_message: string | null
          template_id: string | null
          theme_color: string | null
          updated_at: string | null
          welcome_message: string | null
          wholesaler_id: string | null
        }
        Insert: {
          available_languages?: Json | null
          bandwidth_limit_kbps?: number | null
          created_at?: string | null
          custom_css?: string | null
          default_language?: string | null
          flow_order?: Json | null
          id?: string
          kit_id?: string | null
          logo_url?: string | null
          portal_name?: string | null
          portal_status?: string | null
          portal_version?: number | null
          redirect_url?: string | null
          site_id?: string | null
          success_message?: string | null
          template_id?: string | null
          theme_color?: string | null
          updated_at?: string | null
          welcome_message?: string | null
          wholesaler_id?: string | null
        }
        Update: {
          available_languages?: Json | null
          bandwidth_limit_kbps?: number | null
          created_at?: string | null
          custom_css?: string | null
          default_language?: string | null
          flow_order?: Json | null
          id?: string
          kit_id?: string | null
          logo_url?: string | null
          portal_name?: string | null
          portal_status?: string | null
          portal_version?: number | null
          redirect_url?: string | null
          site_id?: string | null
          success_message?: string | null
          template_id?: string | null
          theme_color?: string | null
          updated_at?: string | null
          welcome_message?: string | null
          wholesaler_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_config_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "portal_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_customizations: {
        Row: {
          created_at: string | null
          customization_data: Json
          customization_type: string
          id: string
          is_active: boolean | null
          portal_config_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customization_data?: Json
          customization_type: string
          id?: string
          is_active?: boolean | null
          portal_config_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customization_data?: Json
          customization_type?: string
          id?: string
          is_active?: boolean | null
          portal_config_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      portal_enabled_modules: {
        Row: {
          created_at: string | null
          id: string
          is_enabled: boolean | null
          module_config: Json | null
          module_id: string | null
          portal_config_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          module_config?: Json | null
          module_id?: string | null
          portal_config_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          module_config?: Json | null
          module_id?: string | null
          portal_config_id?: string | null
        }
        Relationships: []
      }
      portal_kits: {
        Row: {
          created_at: string
          default_config: Json
          description: string | null
          icon: string
          id: string
          is_active: boolean
          name: string
          recommended_modules: Json
          restricted_modules: Json
          site_type: string | null
          slug: string
          sort_order: number
          theme_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_config?: Json
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          name: string
          recommended_modules?: Json
          restricted_modules?: Json
          site_type?: string | null
          slug: string
          sort_order?: number
          theme_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_config?: Json
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          recommended_modules?: Json
          restricted_modules?: Json
          site_type?: string | null
          slug?: string
          sort_order?: number
          theme_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_kits_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "portal_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_modules: {
        Row: {
          category: string
          config_schema: Json | null
          created_at: string | null
          description: string | null
          display_name: string
          flow_step: string | null
          id: string
          is_active: boolean | null
          module_name: string
          module_type: string
          pricing_tier: string | null
          sort_order: number | null
        }
        Insert: {
          category: string
          config_schema?: Json | null
          created_at?: string | null
          description?: string | null
          display_name: string
          flow_step?: string | null
          id?: string
          is_active?: boolean | null
          module_name: string
          module_type: string
          pricing_tier?: string | null
          sort_order?: number | null
        }
        Update: {
          category?: string
          config_schema?: Json | null
          created_at?: string | null
          description?: string | null
          display_name?: string
          flow_step?: string | null
          id?: string
          is_active?: boolean | null
          module_name?: string
          module_type?: string
          pricing_tier?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      portal_statistics: {
        Row: {
          avg_session_duration: number | null
          conversion_rate: number | null
          date: string | null
          game_completion_rate: number | null
          games_played: number | null
          id: string
          leads_collected: number | null
          quiz_completions: number | null
          returning_users: number | null
          total_connections: number | null
          video_views: number | null
        }
        Insert: {
          avg_session_duration?: number | null
          conversion_rate?: number | null
          date?: string | null
          game_completion_rate?: number | null
          games_played?: number | null
          id?: string
          leads_collected?: number | null
          quiz_completions?: number | null
          returning_users?: number | null
          total_connections?: number | null
          video_views?: number | null
        }
        Update: {
          avg_session_duration?: number | null
          conversion_rate?: number | null
          date?: string | null
          game_completion_rate?: number | null
          games_played?: number | null
          id?: string
          leads_collected?: number | null
          quiz_completions?: number | null
          returning_users?: number | null
          total_connections?: number | null
          video_views?: number | null
        }
        Relationships: []
      }
      portal_themes: {
        Row: {
          color_scheme: Json
          created_at: string | null
          cultural_context: string | null
          description: string | null
          id: string
          is_active: boolean | null
          layout_config: Json | null
          name: string
          theme_type: string
          typography: Json | null
          updated_at: string | null
        }
        Insert: {
          color_scheme?: Json
          created_at?: string | null
          cultural_context?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          layout_config?: Json | null
          name: string
          theme_type: string
          typography?: Json | null
          updated_at?: string | null
        }
        Update: {
          color_scheme?: Json
          created_at?: string | null
          cultural_context?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          layout_config?: Json | null
          name?: string
          theme_type?: string
          typography?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      quiz_options: {
        Row: {
          id: string
          is_correct: boolean | null
          option_text: string
          order_num: number | null
          question_id: string | null
        }
        Insert: {
          id?: string
          is_correct?: boolean | null
          option_text: string
          order_num?: number | null
          question_id?: string | null
        }
        Update: {
          id?: string
          is_correct?: boolean | null
          option_text?: string
          order_num?: number | null
          question_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          created_at: string | null
          id: string
          order_num: number | null
          question: string
          question_type: string
          quiz_id: string | null
          required: boolean | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_num?: number | null
          question: string
          question_type?: string
          quiz_id?: string | null
          required?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string
          order_num?: number | null
          question?: string
          question_type?: string
          quiz_id?: string | null
          required?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          id: string
          site_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          site_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          site_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          points_cost: number
          reward_type: string
          site_id: string | null
          value: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          points_cost: number
          reward_type: string
          site_id?: string | null
          value: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          points_cost?: number
          reward_type?: string
          site_id?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "rewards_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          location: string | null
          logo_url: string | null
          name: string
          portal_slug: string
          portal_template: string | null
          primary_color: string | null
          reseller_id: string | null
          type: string | null
          updated_at: string | null
          welcome_msg: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          logo_url?: string | null
          name: string
          portal_slug: string
          portal_template?: string | null
          primary_color?: string | null
          reseller_id?: string | null
          type?: string | null
          updated_at?: string | null
          welcome_msg?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          logo_url?: string | null
          name?: string
          portal_slug?: string
          portal_template?: string | null
          primary_color?: string | null
          reseller_id?: string | null
          type?: string | null
          updated_at?: string | null
          welcome_msg?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          amount_fcfa: number | null
          commission_fcfa: number | null
          completed_at: string | null
          created_at: string | null
          id: string
          method: string | null
          payment_method_id: string | null
          plan_id: string | null
          provider_ref: string | null
          session_id: string | null
          site_id: string | null
          status: string
          transaction_reference: string | null
          user_id: string | null
          wave_checkout_id: string | null
        }
        Insert: {
          amount: number
          amount_fcfa?: number | null
          commission_fcfa?: number | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          method?: string | null
          payment_method_id?: string | null
          plan_id?: string | null
          provider_ref?: string | null
          session_id?: string | null
          site_id?: string | null
          status: string
          transaction_reference?: string | null
          user_id?: string | null
          wave_checkout_id?: string | null
        }
        Update: {
          amount?: number
          amount_fcfa?: number | null
          commission_fcfa?: number | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          method?: string | null
          payment_method_id?: string | null
          plan_id?: string | null
          provider_ref?: string | null
          session_id?: string | null
          site_id?: string | null
          status?: string
          transaction_reference?: string | null
          user_id?: string | null
          wave_checkout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "wifi_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "wifi_users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          reseller_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          site_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          reseller_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          site_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          reseller_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          site_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      wifi_plans: {
        Row: {
          active: boolean | null
          created_at: string | null
          data_limit_mb: number | null
          description: string | null
          duration_min: number | null
          duration_minutes: number
          id: string
          is_active: boolean | null
          is_family_plan: boolean | null
          is_popular: boolean | null
          is_subscription: boolean | null
          max_devices: number | null
          max_members: number | null
          name: string
          price: number
          price_fcfa: number | null
          recurring_interval: string | null
          site_id: string | null
          sort_order: number | null
          speed_down_mb: number | null
          speed_up_mb: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          data_limit_mb?: number | null
          description?: string | null
          duration_min?: number | null
          duration_minutes: number
          id?: string
          is_active?: boolean | null
          is_family_plan?: boolean | null
          is_popular?: boolean | null
          is_subscription?: boolean | null
          max_devices?: number | null
          max_members?: number | null
          name: string
          price: number
          price_fcfa?: number | null
          recurring_interval?: string | null
          site_id?: string | null
          sort_order?: number | null
          speed_down_mb?: number | null
          speed_up_mb?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          data_limit_mb?: number | null
          description?: string | null
          duration_min?: number | null
          duration_minutes?: number
          id?: string
          is_active?: boolean | null
          is_family_plan?: boolean | null
          is_popular?: boolean | null
          is_subscription?: boolean | null
          max_devices?: number | null
          max_members?: number | null
          name?: string
          price?: number
          price_fcfa?: number | null
          recurring_interval?: string | null
          site_id?: string | null
          sort_order?: number | null
          speed_down_mb?: number | null
          speed_up_mb?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wifi_plans_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      wifi_sessions: {
        Row: {
          ap_mac: string | null
          device_info: Json | null
          duration_minutes: number | null
          ended_at: string | null
          engagement_data: Json | null
          engagement_type: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          mac_address: string | null
          plan_id: string | null
          site_id: string | null
          ssid: string | null
          started_at: string | null
          status: string | null
          transaction_id: string | null
          user_id: string | null
        }
        Insert: {
          ap_mac?: string | null
          device_info?: Json | null
          duration_minutes?: number | null
          ended_at?: string | null
          engagement_data?: Json | null
          engagement_type?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          mac_address?: string | null
          plan_id?: string | null
          site_id?: string | null
          ssid?: string | null
          started_at?: string | null
          status?: string | null
          transaction_id?: string | null
          user_id?: string | null
        }
        Update: {
          ap_mac?: string | null
          device_info?: Json | null
          duration_minutes?: number | null
          ended_at?: string | null
          engagement_data?: Json | null
          engagement_type?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          mac_address?: string | null
          plan_id?: string | null
          site_id?: string | null
          ssid?: string | null
          started_at?: string | null
          status?: string | null
          transaction_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wifi_sessions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "wifi_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wifi_sessions_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wifi_sessions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wifi_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "wifi_users"
            referencedColumns: ["id"]
          },
        ]
      }
      wifi_users: {
        Row: {
          ai_segment: string | null
          auth_method: string
          churn_risk: number | null
          created_at: string | null
          email: string | null
          family_id: string | null
          family_role: string | null
          id: string
          is_blocked: boolean | null
          last_connection: string | null
          loyalty_level: string | null
          loyalty_points: number | null
          loyalty_pts: number | null
          mac_address: string | null
          name: string | null
          phone: string | null
          preferences: Json | null
          referral_code: string | null
          referred_by: string | null
          site_id: string | null
        }
        Insert: {
          ai_segment?: string | null
          auth_method: string
          churn_risk?: number | null
          created_at?: string | null
          email?: string | null
          family_id?: string | null
          family_role?: string | null
          id?: string
          is_blocked?: boolean | null
          last_connection?: string | null
          loyalty_level?: string | null
          loyalty_points?: number | null
          loyalty_pts?: number | null
          mac_address?: string | null
          name?: string | null
          phone?: string | null
          preferences?: Json | null
          referral_code?: string | null
          referred_by?: string | null
          site_id?: string | null
        }
        Update: {
          ai_segment?: string | null
          auth_method?: string
          churn_risk?: number | null
          created_at?: string | null
          email?: string | null
          family_id?: string | null
          family_role?: string | null
          id?: string
          is_blocked?: boolean | null
          last_connection?: string | null
          loyalty_level?: string | null
          loyalty_points?: number | null
          loyalty_pts?: number | null
          mac_address?: string | null
          name?: string | null
          phone?: string | null
          preferences?: Json | null
          referral_code?: string | null
          referred_by?: string | null
          site_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wifi_users_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_site: { Args: { p_site_id: string }; Returns: boolean }
      cleanup_old_audit_logs: { Args: never; Returns: undefined }
      decrypt_unifi_secret: { Args: { encrypted: string }; Returns: string }
      fn_apply_quota: { Args: { target_user_id: string }; Returns: undefined }
      get_active_sessions: {
        Args: never
        Returns: {
          ap_name: string
          id: string
          ip_address: unknown
          last_seen: string
          mac_address: string
          max_down_kbps: number
          max_up_kbps: number
          minutes_used: number
          profile_name: string
          quota_mb: number
          quota_usage_percent: number
          quota_used_mb: number
          rx_bytes: number
          session_id: string
          session_time: number
          ssid: string
          start_time: string
          tx_bytes: number
          user_id: string
          username: string
        }[]
      }
      get_realtime_dashboard_metrics: { Args: never; Returns: Json }
      get_security_dashboard_metrics: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_user: { Args: never; Returns: boolean }
      is_reseller_of: { Args: { p_reseller_id: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      is_viewer: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "super_admin"
        | "reseller"
        | "site_manager"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: [
        "admin",
        "moderator",
        "user",
        "super_admin",
        "reseller",
        "site_manager",
        "viewer",
      ],
    },
  },
} as const
