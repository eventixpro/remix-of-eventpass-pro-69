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
      business_subscriptions: {
        Row: {
          company_email: string
          company_name: string
          company_phone: string | null
          created_at: string
          events_limit: number | null
          events_used: number | null
          expires_at: string | null
          id: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          price_per_month: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          company_email: string
          company_name: string
          company_phone?: string | null
          created_at?: string
          events_limit?: number | null
          events_used?: number | null
          expires_at?: string | null
          id?: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          price_per_month?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          company_email?: string
          company_name?: string
          company_phone?: string | null
          created_at?: string
          events_limit?: number | null
          events_used?: number | null
          expires_at?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          price_per_month?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      data_exports: {
        Row: {
          created_at: string
          event_id: string
          export_type: string
          id: string
          ip_address: string | null
          record_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          export_type: string
          id?: string
          ip_address?: string | null
          record_count: number
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          export_type?: string
          id?: string
          ip_address?: string | null
          record_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_exports_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          additional_info: string | null
          capacity: number | null
          category: string | null
          created_at: string
          currency: string | null
          description: string | null
          early_bird_end_date: string | null
          event_date: string
          event_rules: string[] | null
          faq: Json | null
          gallery_images: string[] | null
          highlights: Json | null
          id: string
          image_url: string | null
          is_free: boolean
          menu_details: Json | null
          original_price: number | null
          promotion_text: string | null
          schedule: Json | null
          social_links: Json | null
          sponsors: Json | null
          tags: string[] | null
          ticket_price: number | null
          tickets_issued: number
          title: string
          updated_at: string
          user_id: string
          venue: string
          videos: string[] | null
        }
        Insert: {
          additional_info?: string | null
          capacity?: number | null
          category?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          early_bird_end_date?: string | null
          event_date: string
          event_rules?: string[] | null
          faq?: Json | null
          gallery_images?: string[] | null
          highlights?: Json | null
          id?: string
          image_url?: string | null
          is_free?: boolean
          menu_details?: Json | null
          original_price?: number | null
          promotion_text?: string | null
          schedule?: Json | null
          social_links?: Json | null
          sponsors?: Json | null
          tags?: string[] | null
          ticket_price?: number | null
          tickets_issued?: number
          title: string
          updated_at?: string
          user_id: string
          venue: string
          videos?: string[] | null
        }
        Update: {
          additional_info?: string | null
          capacity?: number | null
          category?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          early_bird_end_date?: string | null
          event_date?: string
          event_rules?: string[] | null
          faq?: Json | null
          gallery_images?: string[] | null
          highlights?: Json | null
          id?: string
          image_url?: string | null
          is_free?: boolean
          menu_details?: Json | null
          original_price?: number | null
          promotion_text?: string | null
          schedule?: Json | null
          social_links?: Json | null
          sponsors?: Json | null
          tags?: string[] | null
          ticket_price?: number | null
          tickets_issued?: number
          title?: string
          updated_at?: string
          user_id?: string
          venue?: string
          videos?: string[] | null
        }
        Relationships: []
      }
      otp_verifications: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          otp_code: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          otp_code: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          otp_code?: string
          verified?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: string
          company_name: string | null
          created_at: string
          id: string
          plan_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type: string
          company_name?: string | null
          created_at?: string
          id?: string
          plan_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: string
          company_name?: string | null
          created_at?: string
          id?: string
          plan_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ticket_claim_logs: {
        Row: {
          created_at: string
          email: string
          event_id: string
          id: string
          ip_address: string
        }
        Insert: {
          created_at?: string
          email: string
          event_id: string
          id?: string
          ip_address: string
        }
        Update: {
          created_at?: string
          email?: string
          event_id?: string
          id?: string
          ip_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_claim_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_tiers: {
        Row: {
          benefits: string[] | null
          capacity: number | null
          created_at: string
          currency: string
          description: string | null
          event_id: string
          id: string
          is_active: boolean
          is_early_bird: boolean | null
          name: string
          original_price: number | null
          price: number
          sort_order: number
          tickets_sold: number
          updated_at: string
        }
        Insert: {
          benefits?: string[] | null
          capacity?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          event_id: string
          id?: string
          is_active?: boolean
          is_early_bird?: boolean | null
          name: string
          original_price?: number | null
          price?: number
          sort_order?: number
          tickets_sold?: number
          updated_at?: string
        }
        Update: {
          benefits?: string[] | null
          capacity?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          event_id?: string
          id?: string
          is_active?: boolean
          is_early_bird?: boolean | null
          name?: string
          original_price?: number | null
          price?: number
          sort_order?: number
          tickets_sold?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_tiers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          attendee_email: string
          attendee_name: string
          attendee_phone: string | null
          created_at: string
          event_id: string
          id: string
          is_validated: boolean
          payment_ref_id: string | null
          payment_status: string | null
          ticket_code: string
          tier_id: string | null
          validated_at: string | null
          verified_at: string | null
        }
        Insert: {
          attendee_email: string
          attendee_name: string
          attendee_phone?: string | null
          created_at?: string
          event_id: string
          id?: string
          is_validated?: boolean
          payment_ref_id?: string | null
          payment_status?: string | null
          ticket_code: string
          tier_id?: string | null
          validated_at?: string | null
          verified_at?: string | null
        }
        Update: {
          attendee_email?: string
          attendee_name?: string
          attendee_phone?: string | null
          created_at?: string
          event_id?: string
          id?: string
          is_validated?: boolean
          payment_ref_id?: string | null
          payment_status?: string | null
          ticket_code?: string
          tier_id?: string | null
          validated_at?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "ticket_tiers"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_ticket_availability: {
        Args: { event_id_input: string }
        Returns: boolean
      }
      check_tier_availability: {
        Args: { tier_id_input: string }
        Returns: boolean
      }
      get_ticket_by_code: {
        Args: { ticket_code_input: string }
        Returns: {
          attendee_email: string
          attendee_name: string
          attendee_phone: string
          created_at: string
          event_date: string
          event_id: string
          event_promotion_text: string
          event_title: string
          event_venue: string
          id: string
          is_validated: boolean
          ticket_code: string
          validated_at: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      subscription_plan: "monthly" | "annual" | "pay_as_you_go"
      subscription_status: "pending" | "active" | "cancelled" | "expired"
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
      app_role: ["admin", "moderator", "user"],
      subscription_plan: ["monthly", "annual", "pay_as_you_go"],
      subscription_status: ["pending", "active", "cancelled", "expired"],
    },
  },
} as const
