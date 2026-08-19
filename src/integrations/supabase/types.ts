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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      affirmations: {
        Row: {
          body: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          badge_key: string
          created_at: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          badge_key: string
          created_at?: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          badge_key?: string
          created_at?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_promises: {
        Row: {
          created_at: string
          id: string
          promised_on: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          promised_on?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          promised_on?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      flags: {
        Row: {
          category: string
          created_at: string
          id: string
          note: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          note?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          note?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gratitude_entries: {
        Row: {
          created_at: string
          gratitude_text: string
          id: string
          item_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          gratitude_text?: string
          id?: string
          item_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          gratitude_text?: string
          id?: string
          item_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          body: string
          created_at: string
          id: string
          mood: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          mood?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          mood?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      letters: {
        Row: {
          body: string
          created_at: string
          emotion: string | null
          id: string
          is_draft: boolean
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          emotion?: string | null
          id?: string
          is_draft?: boolean
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          emotion?: string | null
          id?: string
          is_draft?: boolean
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mood_checkins: {
        Row: {
          action: string | null
          checkin_on: string
          completed_at: string
          created_at: string
          custom_intention: string | null
          id: string
          mood: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action?: string | null
          checkin_on?: string
          completed_at?: string
          created_at?: string
          custom_intention?: string | null
          id?: string
          mood: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action?: string | null
          checkin_on?: string
          completed_at?: string
          created_at?: string
          custom_intention?: string | null
          id?: string
          mood?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_history: {
        Row: {
          category: string
          created_at: string
          device_id: string | null
          error: string | null
          id: string
          local_date: string
          notification_id: number
          scheduled_local_time: string
          sent_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          device_id?: string | null
          error?: string | null
          id?: string
          local_date: string
          notification_id: number
          scheduled_local_time?: string
          sent_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          device_id?: string | null
          error?: string | null
          id?: string
          local_date?: string
          notification_id?: number
          scheduled_local_time?: string
          sent_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pictures: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_url: string
          taken_on: string
          updated_at: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          taken_on?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          taken_on?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          evening_reminder: boolean
          evening_reminder_time_override: string | null
          id: string
          is_premium: boolean
          morning_reminder: boolean
          notification_prefs: Json
          notifications_enabled: boolean
          notifications_permission_granted: boolean
          permission_synced_at: string | null
          push_token: string | null
          questionnaire_completed: boolean
          recovery_started_at: string
          timezone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          evening_reminder?: boolean
          evening_reminder_time_override?: string | null
          id: string
          is_premium?: boolean
          morning_reminder?: boolean
          notification_prefs?: Json
          notifications_enabled?: boolean
          notifications_permission_granted?: boolean
          permission_synced_at?: string | null
          push_token?: string | null
          questionnaire_completed?: boolean
          recovery_started_at?: string
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          evening_reminder?: boolean
          evening_reminder_time_override?: string | null
          id?: string
          is_premium?: boolean
          morning_reminder?: boolean
          notification_prefs?: Json
          notifications_enabled?: boolean
          notifications_permission_granted?: boolean
          permission_synced_at?: string | null
          push_token?: string | null
          questionnaire_completed?: boolean
          recovery_started_at?: string
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          device_id: string | null
          id: string
          is_active: boolean
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          id?: string
          is_active?: boolean
          platform?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string | null
          id?: string
          is_active?: boolean
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      questionnaire_answers: {
        Row: {
          age_range: string | null
          biggest_goal: string | null
          checks_social: string | null
          completed: boolean
          created_at: string
          difficulty_today: number | null
          gender: string | null
          id: string
          last_contact_at: string | null
          nickname: string | null
          reasons: string[]
          referral_source: string | null
          relationship_length: string | null
          updated_at: string
          user_id: string
          wants_reminders: boolean | null
          who_ended: string | null
        }
        Insert: {
          age_range?: string | null
          biggest_goal?: string | null
          checks_social?: string | null
          completed?: boolean
          created_at?: string
          difficulty_today?: number | null
          gender?: string | null
          id?: string
          last_contact_at?: string | null
          nickname?: string | null
          reasons?: string[]
          referral_source?: string | null
          relationship_length?: string | null
          updated_at?: string
          user_id: string
          wants_reminders?: boolean | null
          who_ended?: string | null
        }
        Update: {
          age_range?: string | null
          biggest_goal?: string | null
          checks_social?: string | null
          completed?: boolean
          created_at?: string
          difficulty_today?: number | null
          gender?: string | null
          id?: string
          last_contact_at?: string | null
          nickname?: string | null
          reasons?: string[]
          referral_source?: string | null
          relationship_length?: string | null
          updated_at?: string
          user_id?: string
          wants_reminders?: boolean | null
          who_ended?: string | null
        }
        Relationships: []
      }
      rituals: {
        Row: {
          created_at: string
          id: string
          note: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      streaks: {
        Row: {
          best_days: number
          created_at: string
          ex_name: string | null
          id: string
          relapse_count: number
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          best_days?: number
          created_at?: string
          ex_name?: string | null
          id?: string
          relapse_count?: number
          started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          best_days?: number
          created_at?: string
          ex_name?: string | null
          id?: string
          relapse_count?: number
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      triggers: {
        Row: {
          created_at: string
          id: string
          note: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wins: {
        Row: {
          achieved_on: string
          created_at: string
          id: string
          note: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          achieved_on?: string
          created_at?: string
          id?: string
          note?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          achieved_on?: string
          created_at?: string
          id?: string
          note?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      worry_entries: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
          worry_text: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          worry_text?: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          worry_text?: string
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
