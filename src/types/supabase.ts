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
      daily_entries: {
        Row: {
          completed: string | null
          created_by: string
          entry_date: string
          hours_wasted: number
          hours_worked: number
          id: string
          inserted_at: string | null
          plan_to_complete: string | null
          project_id: string
        }
        Insert: {
          completed?: string | null
          created_by: string
          entry_date: string
          hours_wasted?: number
          hours_worked?: number
          id?: string
          inserted_at?: string | null
          plan_to_complete?: string | null
          project_id: string
        }
        Update: {
          completed?: string | null
          created_by?: string
          entry_date?: string
          hours_wasted?: number
          hours_worked?: number
          id?: string
          inserted_at?: string | null
          plan_to_complete?: string | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "member_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "daily_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "daily_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      member_projections: {
        Row: {
          effective_from: string
          id: string
          planned_hours_per_week: number
          project_id: string
          user_id: string
        }
        Insert: {
          effective_from?: string
          id?: string
          planned_hours_per_week: number
          project_id: string
          user_id: string
        }
        Update: {
          effective_from?: string
          id?: string
          planned_hours_per_week?: number
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_projections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "member_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "member_projections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "member_projections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_projections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      project_members: {
        Row: {
          email: string
          equity: number
          id: string
          invite_date: string | null
          join_date: string | null
          project_id: string | null
          user_id: string | null
        }
        Insert: {
          email: string
          equity?: number
          id?: string
          invite_date?: string | null
          join_date?: string | null
          project_id?: string | null
          user_id?: string | null
        }
        Update: {
          email?: string
          equity?: number
          id?: string
          invite_date?: string | null
          join_date?: string | null
          project_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "member_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_projections: {
        Row: {
          effective_from: string
          id: string
          project_id: string
          valuation: number
          work_hours_until_completion: number
        }
        Insert: {
          effective_from?: string
          id?: string
          project_id: string
          valuation: number
          work_hours_until_completion: number
        }
        Update: {
          effective_from?: string
          id?: string
          project_id?: string
          valuation?: number
          work_hours_until_completion?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_valuations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "member_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_valuations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_valuations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string | null
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          target_valuation: number
          work_hours_until_completion: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          target_valuation: number
          work_hours_until_completion: number
        }
        Update: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          target_valuation?: number
          work_hours_until_completion?: number
        }
        Relationships: [
          {
            foreignKeyName: "projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      member_dashboard: {
        Row: {
          active_planned_hours_per_week: number | null
          active_valuation: number | null
          active_weeks_to_goal: number | null
          active_work_hours_until_completion: number | null
          implied_hour_value: number | null
          member_active_planned_hours_per_week: number | null
          member_email: string | null
          member_hours_wasted: number | null
          member_hours_worked: number | null
          member_money_lost: number | null
          member_sweat_equity_earned_weighted: number | null
          name: string | null
          project_id: string | null
          project_progress: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_entries_created_by_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_dashboard: {
        Row: {
          active_planned_hours_per_week: number | null
          active_valuation: number | null
          active_weeks_to_goal: number | null
          active_work_hours_until_completion: number | null
          implied_hour_value: number | null
          money_lost: number | null
          name: string | null
          project_id: string | null
          project_progress: number | null
          sweat_equity_earned_weighted: number | null
          total_hours_wasted: number | null
          total_hours_worked: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      is_current_user_project_member: {
        Args: { p_project_id: string }
        Returns: boolean
      }
      is_current_user_project_owner: {
        Args: { p_project_id: string }
        Returns: boolean
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