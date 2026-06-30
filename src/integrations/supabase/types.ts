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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      attendance_logs: {
        Row: {
          class_type_id: string
          coach_id: string | null
          created_at: string
          date: string
          id: string
          obstacles_in_class: number
          student_id: string
          xp_awarded: number
        }
        Insert: {
          class_type_id: string
          coach_id?: string | null
          created_at?: string
          date?: string
          id?: string
          obstacles_in_class?: number
          student_id: string
          xp_awarded?: number
        }
        Update: {
          class_type_id?: string
          coach_id?: string | null
          created_at?: string
          date?: string
          id?: string
          obstacles_in_class?: number
          student_id?: string
          xp_awarded?: number
        }
        Relationships: [
          {
            foreignKeyName: "attendance_logs_class_type_id_fkey"
            columns: ["class_type_id"]
            isOneToOne: false
            referencedRelation: "class_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      avatars: {
        Row: {
          gender: string
          hair: string
          hair_color: string
          skin: string
          student_id: string
          updated_at: string
        }
        Insert: {
          gender?: string
          hair?: string
          hair_color?: string
          skin?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          gender?: string
          hair?: string
          hair_color?: string
          skin?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "avatars_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_groups: {
        Row: {
          code: string
          days_label: string
          ends_at: string
          id: string
          sort_order: number
          starts_at: string
        }
        Insert: {
          code: string
          days_label: string
          ends_at: string
          id?: string
          sort_order: number
          starts_at: string
        }
        Update: {
          code?: string
          days_label?: string
          ends_at?: string
          id?: string
          sort_order?: number
          starts_at?: string
        }
        Relationships: []
      }
      class_types: {
        Row: {
          id: string
          name: string
          xp_matrix: Json
        }
        Insert: {
          id?: string
          name: string
          xp_matrix: Json
        }
        Update: {
          id?: string
          name?: string
          xp_matrix?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
        }
        Relationships: []
      }
      skill_bars: {
        Row: {
          balance_xp: number
          coordination_xp: number
          grip_xp: number
          jump_xp: number
          resistance_xp: number
          speed_xp: number
          strength_xp: number
          student_id: string
        }
        Insert: {
          balance_xp?: number
          coordination_xp?: number
          grip_xp?: number
          jump_xp?: number
          resistance_xp?: number
          speed_xp?: number
          strength_xp?: number
          student_id: string
        }
        Update: {
          balance_xp?: number
          coordination_xp?: number
          grip_xp?: number
          jump_xp?: number
          resistance_xp?: number
          speed_xp?: number
          strength_xp?: number
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_bars_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_profiles: {
        Row: {
          age: number
          birth_date: string | null
          created_at: string
          current_belt_color: string
          family_email: string | null
          family_user_id: string | null
          family_username: string | null
          group_id: string | null
          id: string
          student_name: string
          total_xp: number
          user_id: string | null
          username: string | null
        }
        Insert: {
          age: number
          birth_date?: string | null
          created_at?: string
          current_belt_color?: string
          family_email?: string | null
          family_user_id?: string | null
          family_username?: string | null
          group_id?: string | null
          id?: string
          student_name: string
          total_xp?: number
          user_id?: string | null
          username?: string | null
        }
        Update: {
          age?: number
          birth_date?: string | null
          created_at?: string
          current_belt_color?: string
          family_email?: string | null
          family_user_id?: string | null
          family_username?: string | null
          group_id?: string | null
          id?: string
          student_name?: string
          total_xp?: number
          user_id?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_profiles_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "class_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      system_heartbeat: {
        Row: {
          beat_at: string
          id: number
          note: string | null
        }
        Insert: {
          beat_at?: string
          id?: number
          note?: string | null
        }
        Update: {
          beat_at?: string
          id?: number
          note?: string | null
        }
        Relationships: []
      }
      unlocked_items: {
        Row: {
          id: string
          item_name: string
          item_type: string
          purchased_status: boolean
          student_id: string
          unlocked_at: string
        }
        Insert: {
          id?: string
          item_name: string
          item_type: string
          purchased_status?: boolean
          student_id: string
          unlocked_at?: string
        }
        Update: {
          id?: string
          item_name?: string
          item_type?: string
          purchased_status?: boolean
          student_id?: string
          unlocked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unlocked_items_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      attendance_streak_weeks: {
        Args: { _student_id: string }
        Returns: number
      }
      belt_for_xp: { Args: { _xp: number }; Returns: string }
      level_for_xp: { Args: { _xp: number }; Returns: number }
      recompute_student_xp: {
        Args: { _student_id: string }
        Returns: undefined
      }
      record_system_heartbeat: { Args: never; Returns: undefined }
      xp_required_for_level: { Args: { level_n: number }; Returns: number }
    }
    Enums: {
      app_role: "coach" | "student_parent"
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
      app_role: ["coach", "student_parent"],
    },
  },
} as const
