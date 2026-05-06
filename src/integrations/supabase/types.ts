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
      forest_signs: {
        Row: {
          created_at: string
          emoji: string
          expires_at: string
          host_id: string
          id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          expires_at?: string
          host_id: string
          id?: string
          sender_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          expires_at?: string
          host_id?: string
          id?: string
          sender_id?: string
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
      friend_actions: {
        Row: {
          actor_id: string
          created_at: string
          day: string
          id: string
          kind: string
          target_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          day?: string
          id?: string
          kind: string
          target_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          day?: string
          id?: string
          kind?: string
          target_id?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          status?: string
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
          username: string | null
          wild_garden_optin: boolean
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
          username?: string | null
          wild_garden_optin?: boolean
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
          username?: string | null
          wild_garden_optin?: boolean
          xp?: number
        }
        Relationships: []
      }
      visit_log: {
        Row: {
          day: string
          defend_count: number
          host_id: string
          id: string
          last_visit_at: string
          visitor_id: string
        }
        Insert: {
          day?: string
          defend_count?: number
          host_id: string
          id?: string
          last_visit_at?: string
          visitor_id: string
        }
        Update: {
          day?: string
          defend_count?: number
          host_id?: string
          id?: string
          last_visit_at?: string
          visitor_id?: string
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
      wild_garden: {
        Row: {
          growth_ms: number
          kind: string
          planted_at: string
          planter_id: string
          tile_index: number
          updated_at: string
        }
        Insert: {
          growth_ms?: number
          kind: string
          planted_at?: string
          planter_id: string
          tile_index: number
          updated_at?: string
        }
        Update: {
          growth_ms?: number
          kind?: string
          planted_at?: string
          planter_id?: string
          tile_index?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      defend_friend_threat: {
        Args: { _host_id: string; _tile_index: number }
        Returns: Json
      }
      leave_forest_sign: {
        Args: { _emoji: string; _host_id: string }
        Returns: Json
      }
      water_friend_tree_boost: { Args: { _host_id: string }; Returns: Json }
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
