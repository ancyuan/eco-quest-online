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
      forest_encyclopedia: {
        Row: {
          created_at: string
          emoji: string
          facts: Json
          habitat: string
          impact: string
          label: string
          lore: string
          oxygen_yield: number
          tree_kind: string
        }
        Insert: {
          created_at?: string
          emoji: string
          facts?: Json
          habitat: string
          impact: string
          label: string
          lore: string
          oxygen_yield: number
          tree_kind: string
        }
        Update: {
          created_at?: string
          emoji?: string
          facts?: Json
          habitat?: string
          impact?: string
          label?: string
          lore?: string
          oxygen_yield?: number
          tree_kind?: string
        }
        Relationships: []
      }
      forest_states: {
        Row: {
          biome_zones: Json
          energy: number
          feed_log: Json
          grid_size: number
          last_tick: string
          tiles: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          biome_zones?: Json
          energy?: number
          feed_log?: Json
          grid_size?: number
          last_tick?: string
          tiles?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          biome_zones?: Json
          energy?: number
          feed_log?: Json
          grid_size?: number
          last_tick?: string
          tiles?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          achievements: string[]
          acorns: number
          active_companions: string[]
          auto_harvest: boolean
          created_at: string
          daily_quests: Json
          dark_mode: boolean
          display_name: string
          harvest_tally: Json
          id: string
          level: number
          notifications_enabled: boolean
          oxygen: number
          skill_points: number
          skills: Json
          streak_best: number
          streak_current: number
          streak_last_claim: string | null
          trees_saved: number
          tutorial_done: boolean
          unlocked_biomes: string[]
          unlocked_companions: string[]
          unlocked_grid_size: number
          unlocked_trees: string[]
          updated_at: string
          xp: number
        }
        Insert: {
          achievements?: string[]
          acorns?: number
          active_companions?: string[]
          auto_harvest?: boolean
          created_at?: string
          daily_quests?: Json
          dark_mode?: boolean
          display_name?: string
          harvest_tally?: Json
          id: string
          level?: number
          notifications_enabled?: boolean
          oxygen?: number
          skill_points?: number
          skills?: Json
          streak_best?: number
          streak_current?: number
          streak_last_claim?: string | null
          trees_saved?: number
          tutorial_done?: boolean
          unlocked_biomes?: string[]
          unlocked_companions?: string[]
          unlocked_grid_size?: number
          unlocked_trees?: string[]
          updated_at?: string
          xp?: number
        }
        Update: {
          achievements?: string[]
          acorns?: number
          active_companions?: string[]
          auto_harvest?: boolean
          created_at?: string
          daily_quests?: Json
          dark_mode?: boolean
          display_name?: string
          harvest_tally?: Json
          id?: string
          level?: number
          notifications_enabled?: boolean
          oxygen?: number
          skill_points?: number
          skills?: Json
          streak_best?: number
          streak_current?: number
          streak_last_claim?: string | null
          trees_saved?: number
          tutorial_done?: boolean
          unlocked_biomes?: string[]
          unlocked_companions?: string[]
          unlocked_grid_size?: number
          unlocked_trees?: string[]
          updated_at?: string
          xp?: number
        }
        Relationships: []
      }
      weather_state: {
        Row: {
          duration_ms: number
          id: number
          started_at: string
          updated_at: string
          weather: string
        }
        Insert: {
          duration_ms?: number
          id?: number
          started_at?: string
          updated_at?: string
          weather?: string
        }
        Update: {
          duration_ms?: number
          id?: number
          started_at?: string
          updated_at?: string
          weather?: string
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
