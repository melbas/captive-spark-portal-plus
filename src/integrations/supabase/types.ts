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
      ad_videos: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          min_view_percentage: number | null
          priority: number | null
          skip_after_seconds: number | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          video_url: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          min_view_percentage?: number | null
          priority?: number | null
          skip_after_seconds?: number | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          video_url: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          min_view_percentage?: number | null
          priority?: number | null
          skip_after_seconds?: number | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          video_url?: string
        }
        Relationships: []
      }
      admin_audit_logs: {
        Row: {
          action_description: string
          action_type: string
          admin_user_id: string
          created_at: string | null
          criticality: string | null
          id: string
          ip_address: unknown | null
          new_data: Json | null
          previous_data: Json | null
          request_id: string | null
          session_id: string | null
          target_entity: string | null
          target_id: string | null
          user_agent: string | null
        }
        Insert: {
          action_description: string
          action_type: string
          admin_user_id: string
          created_at?: string | null
          criticality?: string | null
          id?: string
          ip_address?: unknown | null
          new_data?: Json | null
          previous_data?: Json | null
          request_id?: string | null
          session_id?: string | null
          target_entity?: string | null
          target_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action_description?: string
          action_type?: string
          admin_user_id?: string
          created_at?: string | null
          criticality?: string | null
          id?: string
          ip_address?: unknown | null
          new_data?: Json | null
          previous_data?: Json | null
          request_id?: string | null
          session_id?: string | null
          target_entity?: string | null
          target_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_sessions: {
        Row: {
          admin_user_id: string
          ended_at: string | null
          id: string
          ip_address: unknown | null
          is_active: boolean | null
          last_activity: string | null
          location_data: Json | null
          session_duration_minutes: number | null
          session_token: string
          started_at: string | null
          total_actions: number | null
          user_agent: string | null
        }
        Insert: {
          admin_user_id: string
          ended_at?: string | null
          id?: string
          ip_address?: unknown | null
          is_active?: boolean | null
          last_activity?: string | null
          location_data?: Json | null
          session_duration_minutes?: number | null
          session_token: string
          started_at?: string | null
          total_actions?: number | null
          user_agent?: string | null
        }
        Update: {
          admin_user_id?: string
          ended_at?: string | null
          id?: string
          ip_address?: unknown | null
          is_active?: boolean | null
          last_activity?: string | null
          location_data?: Json | null
          session_duration_minutes?: number | null
          session_token?: string
          started_at?: string | null
          total_actions?: number | null
          user_agent?: string | null
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
      chat_analytics: {
        Row: {
          avg_response_time_ms: number | null
          created_at: string | null
          date: string | null
          id: string
          popular_questions: Json | null
          provider_usage: Json | null
          satisfaction_avg: number | null
          total_conversations: number | null
          total_cost: number | null
          total_messages: number | null
        }
        Insert: {
          avg_response_time_ms?: number | null
          created_at?: string | null
          date?: string | null
          id?: string
          popular_questions?: Json | null
          provider_usage?: Json | null
          satisfaction_avg?: number | null
          total_conversations?: number | null
          total_cost?: number | null
          total_messages?: number | null
        }
        Update: {
          avg_response_time_ms?: number | null
          created_at?: string | null
          date?: string | null
          id?: string
          popular_questions?: Json | null
          provider_usage?: Json | null
          satisfaction_avg?: number | null
          total_conversations?: number | null
          total_cost?: number | null
          total_messages?: number | null
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          context_data: Json | null
          conversation_type: string | null
          created_at: string | null
          id: string
          primary_provider_used: string | null
          session_id: string | null
          status: string | null
          total_cost: number | null
          total_messages: number | null
          updated_at: string | null
          user_id: string | null
          user_satisfaction_score: number | null
        }
        Insert: {
          context_data?: Json | null
          conversation_type?: string | null
          created_at?: string | null
          id?: string
          primary_provider_used?: string | null
          session_id?: string | null
          status?: string | null
          total_cost?: number | null
          total_messages?: number | null
          updated_at?: string | null
          user_id?: string | null
          user_satisfaction_score?: number | null
        }
        Update: {
          context_data?: Json | null
          conversation_type?: string | null
          created_at?: string | null
          id?: string
          primary_provider_used?: string | null
          session_id?: string | null
          status?: string | null
          total_cost?: number | null
          total_messages?: number | null
          updated_at?: string | null
          user_id?: string | null
          user_satisfaction_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "wifi_users"
            referencedColumns: ["id"]
          },
        ]
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
      chat_messages: {
        Row: {
          ai_provider: string | null
          confidence_score: number | null
          content: string
          conversation_id: string
          cost: number | null
          created_at: string | null
          id: string
          metadata: Json | null
          response_time_ms: number | null
          sender_type: string
          tokens_used: number | null
        }
        Insert: {
          ai_provider?: string | null
          confidence_score?: number | null
          content: string
          conversation_id: string
          cost?: number | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          response_time_ms?: number | null
          sender_type: string
          tokens_used?: number | null
        }
        Update: {
          ai_provider?: string | null
          confidence_score?: number | null
          content?: string
          conversation_id?: string
          cost?: number | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          response_time_ms?: number | null
          sender_type?: string
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
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
          title?: string
          updated_at?: string | null
        }
        Relationships: []
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
      payment_methods: {
        Row: {
          active: boolean | null
          commission_percentage: number | null
          config: Json | null
          created_at: string | null
          id: string
          name: string
          provider: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          commission_percentage?: number | null
          config?: Json | null
          created_at?: string | null
          id?: string
          name: string
          provider: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          commission_percentage?: number | null
          config?: Json | null
          created_at?: string | null
          id?: string
          name?: string
          provider?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      portal_analytics: {
        Row: {
          avg_session_duration_minutes: number | null
          bounce_rate: number | null
          conversion_rate: number | null
          created_at: string | null
          id: string
          metric_date: string | null
          popular_modules: Json | null
          portal_config_id: string | null
          revenue_generated: number | null
          successful_authentications: number | null
          total_visitors: number | null
          user_satisfaction_score: number | null
        }
        Insert: {
          avg_session_duration_minutes?: number | null
          bounce_rate?: number | null
          conversion_rate?: number | null
          created_at?: string | null
          id?: string
          metric_date?: string | null
          popular_modules?: Json | null
          portal_config_id?: string | null
          revenue_generated?: number | null
          successful_authentications?: number | null
          total_visitors?: number | null
          user_satisfaction_score?: number | null
        }
        Update: {
          avg_session_duration_minutes?: number | null
          bounce_rate?: number | null
          conversion_rate?: number | null
          created_at?: string | null
          id?: string
          metric_date?: string | null
          popular_modules?: Json | null
          portal_config_id?: string | null
          revenue_generated?: number | null
          successful_authentications?: number | null
          total_visitors?: number | null
          user_satisfaction_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_analytics_portal_config_id_fkey"
            columns: ["portal_config_id"]
            isOneToOne: false
            referencedRelation: "portal_config"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_config: {
        Row: {
          available_languages: Json | null
          bandwidth_limit_kbps: number | null
          created_at: string | null
          custom_css: string | null
          default_language: string | null
          id: string
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
          id?: string
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
          id?: string
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
        Relationships: []
      }
      portal_customer_journeys: {
        Row: {
          conditions: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          journey_name: string
          journey_steps: Json
          portal_config_id: string | null
          updated_at: string | null
        }
        Insert: {
          conditions?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          journey_name: string
          journey_steps?: Json
          portal_config_id?: string | null
          updated_at?: string | null
        }
        Update: {
          conditions?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          journey_name?: string
          journey_steps?: Json
          portal_config_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_customer_journeys_portal_config_id_fkey"
            columns: ["portal_config_id"]
            isOneToOne: false
            referencedRelation: "portal_config"
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
        Relationships: [
          {
            foreignKeyName: "portal_customizations_portal_config_id_fkey"
            columns: ["portal_config_id"]
            isOneToOne: false
            referencedRelation: "portal_config"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "portal_enabled_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "portal_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_enabled_modules_portal_config_id_fkey"
            columns: ["portal_config_id"]
            isOneToOne: false
            referencedRelation: "portal_config"
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
          id: string
          is_active: boolean | null
          module_name: string
          module_type: string
          pricing_tier: string | null
        }
        Insert: {
          category: string
          config_schema?: Json | null
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          module_name: string
          module_type: string
          pricing_tier?: string | null
        }
        Update: {
          category?: string
          config_schema?: Json | null
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          module_name?: string
          module_type?: string
          pricing_tier?: string | null
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
          title: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          code: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          referred_id: string | null
          referred_reward: number | null
          referrer_id: string | null
          referrer_reward: number | null
          status: string | null
        }
        Insert: {
          code?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          referred_id?: string | null
          referred_reward?: number | null
          referrer_id?: string | null
          referrer_reward?: number | null
          status?: string | null
        }
        Update: {
          code?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          referred_id?: string | null
          referred_reward?: number | null
          referrer_id?: string | null
          referrer_reward?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "wifi_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "wifi_users"
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
          value?: string
        }
        Relationships: []
      }
      security_alerts: {
        Row: {
          admin_user_id: string | null
          alert_type: string
          created_at: string | null
          description: string
          id: string
          ip_address: unknown | null
          is_resolved: boolean | null
          metadata: Json | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          title: string
        }
        Insert: {
          admin_user_id?: string | null
          alert_type: string
          created_at?: string | null
          description: string
          id?: string
          ip_address?: unknown | null
          is_resolved?: boolean | null
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          title: string
        }
        Update: {
          admin_user_id?: string | null
          alert_type?: string
          created_at?: string | null
          description?: string
          id?: string
          ip_address?: unknown | null
          is_resolved?: boolean | null
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string | null
          id: string
          payment_method_id: string | null
          plan_id: string | null
          status: string
          transaction_reference: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string | null
          id?: string
          payment_method_id?: string | null
          plan_id?: string | null
          status: string
          transaction_reference?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string | null
          id?: string
          payment_method_id?: string | null
          plan_id?: string | null
          status?: string
          transaction_reference?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "wifi_plans"
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
      user_segment_memberships: {
        Row: {
          created_at: string | null
          id: string
          segment_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          segment_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          segment_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_segment_memberships_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "user_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_segment_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "wifi_users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_segments: {
        Row: {
          created_at: string | null
          criteria: Json
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          criteria: Json
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          criteria?: Json
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      wifi_plans: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          duration_minutes: number
          id: string
          is_family_plan: boolean | null
          is_subscription: boolean | null
          max_members: number | null
          name: string
          price: number
          recurring_interval: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          duration_minutes: number
          id?: string
          is_family_plan?: boolean | null
          is_subscription?: boolean | null
          max_members?: number | null
          name: string
          price: number
          recurring_interval?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_family_plan?: boolean | null
          is_subscription?: boolean | null
          max_members?: number | null
          name?: string
          price?: number
          recurring_interval?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      wifi_sessions: {
        Row: {
          device_info: Json | null
          duration_minutes: number | null
          engagement_data: Json | null
          engagement_type: string | null
          id: string
          is_active: boolean | null
          plan_id: string | null
          started_at: string | null
          transaction_id: string | null
          user_id: string | null
        }
        Insert: {
          device_info?: Json | null
          duration_minutes?: number | null
          engagement_data?: Json | null
          engagement_type?: string | null
          id?: string
          is_active?: boolean | null
          plan_id?: string | null
          started_at?: string | null
          transaction_id?: string | null
          user_id?: string | null
        }
        Update: {
          device_info?: Json | null
          duration_minutes?: number | null
          engagement_data?: Json | null
          engagement_type?: string | null
          id?: string
          is_active?: boolean | null
          plan_id?: string | null
          started_at?: string | null
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
          auth_method: string
          created_at: string | null
          email: string | null
          family_id: string | null
          family_role: string | null
          id: string
          last_connection: string | null
          loyalty_points: number | null
          mac_address: string | null
          name: string | null
          phone: string | null
          preferences: Json | null
          referral_code: string | null
        }
        Insert: {
          auth_method: string
          created_at?: string | null
          email?: string | null
          family_id?: string | null
          family_role?: string | null
          id?: string
          last_connection?: string | null
          loyalty_points?: number | null
          mac_address?: string | null
          name?: string | null
          phone?: string | null
          preferences?: Json | null
          referral_code?: string | null
        }
        Update: {
          auth_method?: string
          created_at?: string | null
          email?: string | null
          family_id?: string | null
          family_role?: string | null
          id?: string
          last_connection?: string | null
          loyalty_points?: number | null
          mac_address?: string | null
          name?: string | null
          phone?: string | null
          preferences?: Json | null
          referral_code?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_audit_logs: {
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
