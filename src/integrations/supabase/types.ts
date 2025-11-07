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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      bulk_send_logs: {
        Row: {
          avg_delay_ms: number
          completed_at: string
          created_at: string
          failed_sends: number
          id: string
          provider: string
          retry_count: number | null
          started_at: string
          successful_sends: number
          throttle_percentage: number
          total_contacts: number
          total_duration_seconds: number
          type: string
          user_id: string
        }
        Insert: {
          avg_delay_ms: number
          completed_at?: string
          created_at?: string
          failed_sends?: number
          id?: string
          provider: string
          retry_count?: number | null
          started_at?: string
          successful_sends?: number
          throttle_percentage?: number
          total_contacts: number
          total_duration_seconds: number
          type: string
          user_id: string
        }
        Update: {
          avg_delay_ms?: number
          completed_at?: string
          created_at?: string
          failed_sends?: number
          id?: string
          provider?: string
          retry_count?: number | null
          started_at?: string
          successful_sends?: number
          throttle_percentage?: number
          total_contacts?: number
          total_duration_seconds?: number
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      contact_group_members: {
        Row: {
          added_at: string
          contact_id: string
          group_id: string
          id: string
        }
        Insert: {
          added_at?: string
          contact_id: string
          group_id: string
          id?: string
        }
        Update: {
          added_at?: string
          contact_id?: string
          group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_group_members_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "contact_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          carrier_name: string | null
          country_code_detected: string | null
          created_at: string
          email: string | null
          id: string
          is_valid: boolean | null
          line_type: string | null
          name: string
          notes: string | null
          phone_number: string
          tags: string[] | null
          updated_at: string
          user_id: string
          validated_at: string | null
          validation_reason: string | null
          validation_status: string | null
        }
        Insert: {
          carrier_name?: string | null
          country_code_detected?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_valid?: boolean | null
          line_type?: string | null
          name: string
          notes?: string | null
          phone_number: string
          tags?: string[] | null
          updated_at?: string
          user_id: string
          validated_at?: string | null
          validation_reason?: string | null
          validation_status?: string | null
        }
        Update: {
          carrier_name?: string | null
          country_code_detected?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_valid?: boolean | null
          line_type?: string | null
          name?: string
          notes?: string | null
          phone_number?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          validated_at?: string | null
          validation_reason?: string | null
          validation_status?: string | null
        }
        Relationships: []
      }
      ivr_logs: {
        Row: {
          call_uuid: string | null
          conversation_uuid: string | null
          cost: number | null
          created_at: string
          dtmf_response: string | null
          duration: number | null
          error_message: string | null
          from_number: string
          id: string
          language: string
          ncco: Json
          premium: boolean
          provider: string | null
          status: string
          style: number
          template_used: string | null
          to_number: string
          updated_at: string
          user_id: string
          voice_label: string | null
        }
        Insert: {
          call_uuid?: string | null
          conversation_uuid?: string | null
          cost?: number | null
          created_at?: string
          dtmf_response?: string | null
          duration?: number | null
          error_message?: string | null
          from_number: string
          id?: string
          language?: string
          ncco: Json
          premium?: boolean
          provider?: string | null
          status?: string
          style?: number
          template_used?: string | null
          to_number: string
          updated_at?: string
          user_id: string
          voice_label?: string | null
        }
        Update: {
          call_uuid?: string | null
          conversation_uuid?: string | null
          cost?: number | null
          created_at?: string
          dtmf_response?: string | null
          duration?: number | null
          error_message?: string | null
          from_number?: string
          id?: string
          language?: string
          ncco?: Json
          premium?: boolean
          provider?: string | null
          status?: string
          style?: number
          template_used?: string | null
          to_number?: string
          updated_at?: string
          user_id?: string
          voice_label?: string | null
        }
        Relationships: []
      }
      ivr_responses: {
        Row: {
          conversation_uuid: string
          created_at: string
          dtmf_digits: string | null
          event_data: Json | null
          id: string
          phone_number: string
          template_used: string | null
          timed_out: boolean | null
          user_id: string | null
        }
        Insert: {
          conversation_uuid: string
          created_at?: string
          dtmf_digits?: string | null
          event_data?: Json | null
          id?: string
          phone_number: string
          template_used?: string | null
          timed_out?: boolean | null
          user_id?: string | null
        }
        Update: {
          conversation_uuid?: string
          created_at?: string
          dtmf_digits?: string | null
          event_data?: Json | null
          id?: string
          phone_number?: string
          template_used?: string | null
          timed_out?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      ivr_transfer_params: {
        Row: {
          assistant_number: string
          call_uuid: string | null
          conversation_uuid: string | null
          created_at: string | null
          expires_at: string | null
          from_number: string
          id: string
          transfer_timeout: number | null
          user_id: string | null
        }
        Insert: {
          assistant_number: string
          call_uuid?: string | null
          conversation_uuid?: string | null
          created_at?: string | null
          expires_at?: string | null
          from_number: string
          id?: string
          transfer_timeout?: number | null
          user_id?: string | null
        }
        Update: {
          assistant_number?: string
          call_uuid?: string | null
          conversation_uuid?: string | null
          created_at?: string | null
          expires_at?: string | null
          from_number?: string
          id?: string
          transfer_timeout?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      message_templates: {
        Row: {
          category: string | null
          content: string
          created_at: string
          id: string
          is_favorite: boolean | null
          name: string
          type: string
          updated_at: string
          usage_count: number | null
          user_id: string
          variables: string[] | null
          voice_name: string | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          id?: string
          is_favorite?: boolean | null
          name: string
          type: string
          updated_at?: string
          usage_count?: number | null
          user_id: string
          variables?: string[] | null
          voice_name?: string | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          id?: string
          is_favorite?: boolean | null
          name?: string
          type?: string
          updated_at?: string
          usage_count?: number | null
          user_id?: string
          variables?: string[] | null
          voice_name?: string | null
        }
        Relationships: []
      }
      phone_numbers: {
        Row: {
          country_code: string
          created_at: string | null
          friendly_name: string | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          notes: string | null
          phone_number: string
          provider: string
          supports_mms: boolean | null
          supports_sms: boolean | null
          supports_voice: boolean | null
          sync_source: string | null
          updated_at: string | null
          user_id: string
          webhook_configured: boolean | null
        }
        Insert: {
          country_code: string
          created_at?: string | null
          friendly_name?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          notes?: string | null
          phone_number: string
          provider: string
          supports_mms?: boolean | null
          supports_sms?: boolean | null
          supports_voice?: boolean | null
          sync_source?: string | null
          updated_at?: string | null
          user_id: string
          webhook_configured?: boolean | null
        }
        Update: {
          country_code?: string
          created_at?: string | null
          friendly_name?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          notes?: string | null
          phone_number?: string
          provider?: string
          supports_mms?: boolean | null
          supports_sms?: boolean | null
          supports_voice?: boolean | null
          sync_source?: string | null
          updated_at?: string | null
          user_id?: string
          webhook_configured?: boolean | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          is_active: boolean
          last_login_at: string | null
          metadata: Json | null
          phone: string | null
          suspended_at: string | null
          suspension_reason: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          metadata?: Json | null
          phone?: string | null
          suspended_at?: string | null
          suspension_reason?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          metadata?: Json | null
          phone?: string | null
          suspended_at?: string | null
          suspension_reason?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      received_calls: {
        Row: {
          answer_time: string | null
          answered: boolean | null
          call_uuid: string
          caller_name: string | null
          conversation_uuid: string | null
          cost: number | null
          created_at: string | null
          duration: number | null
          ended_at: string | null
          from_number: string
          hangup_cause: string | null
          id: string
          metadata: Json | null
          provider: string
          recording_url: string | null
          started_at: string | null
          status: string
          to_number: string
          transcription_available: boolean | null
          transcription_text: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          answer_time?: string | null
          answered?: boolean | null
          call_uuid: string
          caller_name?: string | null
          conversation_uuid?: string | null
          cost?: number | null
          created_at?: string | null
          duration?: number | null
          ended_at?: string | null
          from_number: string
          hangup_cause?: string | null
          id?: string
          metadata?: Json | null
          provider: string
          recording_url?: string | null
          started_at?: string | null
          status?: string
          to_number: string
          transcription_available?: boolean | null
          transcription_text?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          answer_time?: string | null
          answered?: boolean | null
          call_uuid?: string
          caller_name?: string | null
          conversation_uuid?: string | null
          cost?: number | null
          created_at?: string | null
          duration?: number | null
          ended_at?: string | null
          from_number?: string
          hangup_cause?: string | null
          id?: string
          metadata?: Json | null
          provider?: string
          recording_url?: string | null
          started_at?: string | null
          status?: string
          to_number?: string
          transcription_available?: boolean | null
          transcription_text?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      received_sms: {
        Row: {
          created_at: string | null
          external_id: string
          from_number: string
          id: string
          message: string
          metadata: Json | null
          provider: string
          received_at: string | null
          to_number: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          external_id: string
          from_number: string
          id?: string
          message: string
          metadata?: Json | null
          provider: string
          received_at?: string | null
          to_number: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          external_id?: string
          from_number?: string
          id?: string
          message?: string
          metadata?: Json | null
          provider?: string
          received_at?: string | null
          to_number?: string
          user_id?: string | null
        }
        Relationships: []
      }
      sip_call_logs: {
        Row: {
          answer_time: string | null
          call_type: string
          call_uuid: string
          conversation_uuid: string | null
          cost: number | null
          created_at: string
          duration: number | null
          end_time: string | null
          error_message: string | null
          from_uri: string
          hangup_cause: string | null
          id: string
          metadata: Json | null
          provider: string
          quality_score: number | null
          route_id: string | null
          sip_user_id: string | null
          start_time: string | null
          status: string
          to_uri: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          answer_time?: string | null
          call_type: string
          call_uuid: string
          conversation_uuid?: string | null
          cost?: number | null
          created_at?: string
          duration?: number | null
          end_time?: string | null
          error_message?: string | null
          from_uri: string
          hangup_cause?: string | null
          id?: string
          metadata?: Json | null
          provider: string
          quality_score?: number | null
          route_id?: string | null
          sip_user_id?: string | null
          start_time?: string | null
          status?: string
          to_uri: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          answer_time?: string | null
          call_type?: string
          call_uuid?: string
          conversation_uuid?: string | null
          cost?: number | null
          created_at?: string
          duration?: number | null
          end_time?: string | null
          error_message?: string | null
          from_uri?: string
          hangup_cause?: string | null
          id?: string
          metadata?: Json | null
          provider?: string
          quality_score?: number | null
          route_id?: string | null
          sip_user_id?: string | null
          start_time?: string | null
          status?: string
          to_uri?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sip_call_logs_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "sip_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sip_call_logs_sip_user_id_fkey"
            columns: ["sip_user_id"]
            isOneToOne: false
            referencedRelation: "sip_users"
            referencedColumns: ["id"]
          },
        ]
      }
      sip_endpoints: {
        Row: {
          expires_at: string | null
          id: string
          ip_address: string | null
          last_seen: string | null
          metadata: Json | null
          provider: string
          sip_user_id: string
          status: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          last_seen?: string | null
          metadata?: Json | null
          provider: string
          sip_user_id: string
          status?: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          last_seen?: string | null
          metadata?: Json | null
          provider?: string
          sip_user_id?: string
          status?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sip_endpoints_sip_user_id_fkey"
            columns: ["sip_user_id"]
            isOneToOne: false
            referencedRelation: "sip_users"
            referencedColumns: ["id"]
          },
        ]
      }
      sip_provider_config: {
        Row: {
          config_key: string
          config_value: string
          created_at: string | null
          created_by: string | null
          domain_group_id: string | null
          friendly_name: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          provider: string
          updated_at: string | null
        }
        Insert: {
          config_key: string
          config_value: string
          created_at?: string | null
          created_by?: string | null
          domain_group_id?: string | null
          friendly_name?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          provider: string
          updated_at?: string | null
        }
        Update: {
          config_key?: string
          config_value?: string
          created_at?: string | null
          created_by?: string | null
          domain_group_id?: string | null
          friendly_name?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          provider?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sip_routes: {
        Row: {
          created_at: string
          forward_to: string
          from_pattern: string
          id: string
          is_active: boolean
          metadata: Json | null
          name: string
          priority: number
          provider: string
          route_type: string
          to_pattern: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          forward_to: string
          from_pattern: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name: string
          priority?: number
          provider: string
          route_type: string
          to_pattern: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          forward_to?: string
          from_pattern?: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name?: string
          priority?: number
          provider?: string
          route_type?: string
          to_pattern?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sip_users: {
        Row: {
          created_at: string
          display_name: string | null
          extension: string
          id: string
          is_active: boolean
          provider: string
          sip_domain: string
          sip_password: string
          sip_username: string
          twilio_credential_sid: string | null
          updated_at: string
          user_id: string
          vonage_endpoint_id: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          extension: string
          id?: string
          is_active?: boolean
          provider: string
          sip_domain: string
          sip_password: string
          sip_username: string
          twilio_credential_sid?: string | null
          updated_at?: string
          user_id: string
          vonage_endpoint_id?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          extension?: string
          id?: string
          is_active?: boolean
          provider?: string
          sip_domain?: string
          sip_password?: string
          sip_username?: string
          twilio_credential_sid?: string | null
          updated_at?: string
          user_id?: string
          vonage_endpoint_id?: string | null
        }
        Relationships: []
      }
      sms_logs: {
        Row: {
          cost: number | null
          created_at: string
          error_message: string | null
          external_id: string | null
          from_number: string
          id: string
          message: string
          provider: string
          status: string
          to_number: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          error_message?: string | null
          external_id?: string | null
          from_number: string
          id?: string
          message: string
          provider: string
          status?: string
          to_number: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          error_message?: string | null
          external_id?: string | null
          from_number?: string
          id?: string
          message?: string
          provider?: string
          status?: string
          to_number?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_analytics: {
        Row: {
          created_at: string
          id: string
          ivr_calls: number | null
          ivr_cost: number | null
          ivr_minutes: number | null
          provider: string
          raw_data: Json | null
          report_date: string
          sms_cost: number | null
          sms_delivered: number | null
          sms_failed: number | null
          sms_sent: number | null
          synced_at: string | null
          total_cost: number | null
          user_id: string
          voice_calls: number | null
          voice_cost: number | null
          voice_minutes: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          ivr_calls?: number | null
          ivr_cost?: number | null
          ivr_minutes?: number | null
          provider?: string
          raw_data?: Json | null
          report_date: string
          sms_cost?: number | null
          sms_delivered?: number | null
          sms_failed?: number | null
          sms_sent?: number | null
          synced_at?: string | null
          total_cost?: number | null
          user_id: string
          voice_calls?: number | null
          voice_cost?: number | null
          voice_minutes?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          ivr_calls?: number | null
          ivr_cost?: number | null
          ivr_minutes?: number | null
          provider?: string
          raw_data?: Json | null
          report_date?: string
          sms_cost?: number | null
          sms_delivered?: number | null
          sms_failed?: number | null
          sms_sent?: number | null
          synced_at?: string | null
          total_cost?: number | null
          user_id?: string
          voice_calls?: number | null
          voice_cost?: number | null
          voice_minutes?: number | null
        }
        Relationships: []
      }
      user_activity_logs: {
        Row: {
          action_type: string
          created_at: string
          description: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          description: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          description?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      voice_logs: {
        Row: {
          call_uuid: string | null
          cost: number | null
          created_at: string
          duration: number | null
          error_message: string | null
          from_number: string
          id: string
          language: string
          message: string
          premium: boolean
          provider: string | null
          status: string
          style: number
          to_number: string
          updated_at: string
          user_id: string
          voice_label: string | null
        }
        Insert: {
          call_uuid?: string | null
          cost?: number | null
          created_at?: string
          duration?: number | null
          error_message?: string | null
          from_number: string
          id?: string
          language?: string
          message: string
          premium?: boolean
          provider?: string | null
          status?: string
          style?: number
          to_number: string
          updated_at?: string
          user_id: string
          voice_label?: string | null
        }
        Update: {
          call_uuid?: string | null
          cost?: number | null
          created_at?: string
          duration?: number | null
          error_message?: string | null
          from_number?: string
          id?: string
          language?: string
          message?: string
          premium?: boolean
          provider?: string | null
          status?: string
          style?: number
          to_number?: string
          updated_at?: string
          user_id?: string
          voice_label?: string | null
        }
        Relationships: []
      }
      webhook_health_checks: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          phone_number: string
          phone_number_id: string
          provider: string
          response_body: Json | null
          response_time_ms: number | null
          status_code: number | null
          success: boolean
          test_mode: string | null
          test_type: string
          tested_at: string
          user_id: string
          valid_format: boolean | null
          webhook_url: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          phone_number: string
          phone_number_id: string
          provider: string
          response_body?: Json | null
          response_time_ms?: number | null
          status_code?: number | null
          success: boolean
          test_mode?: string | null
          test_type: string
          tested_at?: string
          user_id: string
          valid_format?: boolean | null
          webhook_url: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          phone_number?: string
          phone_number_id?: string
          provider?: string
          response_body?: Json | null
          response_time_ms?: number | null
          status_code?: number | null
          success?: boolean
          test_mode?: string | null
          test_type?: string
          tested_at?: string
          user_id?: string
          valid_format?: boolean | null
          webhook_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_health_checks_phone_number_id_fkey"
            columns: ["phone_number_id"]
            isOneToOne: false
            referencedRelation: "phone_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_ivr_params: { Args: never; Returns: undefined }
      cleanup_stale_calls: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
