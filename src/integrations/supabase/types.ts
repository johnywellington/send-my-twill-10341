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
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone_number: string
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone_number: string
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone_number?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string
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
      received_calls: {
        Row: {
          call_uuid: string
          conversation_uuid: string | null
          cost: number | null
          created_at: string | null
          duration: number | null
          ended_at: string | null
          from_number: string
          id: string
          metadata: Json | null
          provider: string
          recording_url: string | null
          started_at: string | null
          status: string
          to_number: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          call_uuid: string
          conversation_uuid?: string | null
          cost?: number | null
          created_at?: string | null
          duration?: number | null
          ended_at?: string | null
          from_number: string
          id?: string
          metadata?: Json | null
          provider: string
          recording_url?: string | null
          started_at?: string | null
          status?: string
          to_number: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          call_uuid?: string
          conversation_uuid?: string | null
          cost?: number | null
          created_at?: string | null
          duration?: number | null
          ended_at?: string | null
          from_number?: string
          id?: string
          metadata?: Json | null
          provider?: string
          recording_url?: string | null
          started_at?: string | null
          status?: string
          to_number?: string
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
          status?: string
          style?: number
          to_number?: string
          updated_at?: string
          user_id?: string
          voice_label?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
