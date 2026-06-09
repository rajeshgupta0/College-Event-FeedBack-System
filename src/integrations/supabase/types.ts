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
      event_bookmarks: {
        Row: {
          created_at: string
          event_id: string
          id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          student_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_bookmarks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_bookmarks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_interests: {
        Row: {
          created_at: string
          event_id: string
          id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          student_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_interests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_interests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          attended: boolean | null
          attended_at: string | null
          event_id: string
          id: string
          qr_code: string
          registered_at: string
          student_id: string
        }
        Insert: {
          attended?: boolean | null
          attended_at?: string | null
          event_id: string
          id?: string
          qr_code: string
          registered_at?: string
          student_id: string
        }
        Update: {
          attended?: boolean | null
          attended_at?: string | null
          event_id?: string
          id?: string
          qr_code?: string
          registered_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_resources: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          quantity_needed: number
          resource_id: string
          status: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          quantity_needed?: number
          resource_id: string
          status?: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          quantity_needed?: number
          resource_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_resources_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_resources_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          archived: boolean
          benefits: string[] | null
          created_at: string
          department: string | null
          description: string | null
          event_date: string | null
          event_type: string
          id: string
          max_participants: number | null
          name: string
          poster_url: string | null
          rewards: string[] | null
          speakers: string[] | null
          venue: string | null
        }
        Insert: {
          archived?: boolean
          benefits?: string[] | null
          created_at?: string
          department?: string | null
          description?: string | null
          event_date?: string | null
          event_type?: string
          id?: string
          max_participants?: number | null
          name: string
          poster_url?: string | null
          rewards?: string[] | null
          speakers?: string[] | null
          venue?: string | null
        }
        Update: {
          archived?: boolean
          benefits?: string[] | null
          created_at?: string
          department?: string | null
          description?: string | null
          event_date?: string | null
          event_type?: string
          id?: string
          max_participants?: number | null
          name?: string
          poster_url?: string | null
          rewards?: string[] | null
          speakers?: string[] | null
          venue?: string | null
        }
        Relationships: []
      }
      feedback: {
        Row: {
          audio_analysis: Json | null
          audio_url: string | null
          created_at: string
          event_id: string
          feedback_text: string
          id: string
          image_analysis: Json | null
          image_url: string | null
          is_anonymous: boolean | null
          mood_rating: string | null
          polarity: number | null
          rating: number | null
          sentiment: string | null
          tags: string[] | null
          user_id: string
        }
        Insert: {
          audio_analysis?: Json | null
          audio_url?: string | null
          created_at?: string
          event_id: string
          feedback_text: string
          id?: string
          image_analysis?: Json | null
          image_url?: string | null
          is_anonymous?: boolean | null
          mood_rating?: string | null
          polarity?: number | null
          rating?: number | null
          sentiment?: string | null
          tags?: string[] | null
          user_id: string
        }
        Update: {
          audio_analysis?: Json | null
          audio_url?: string | null
          created_at?: string
          event_id?: string
          feedback_text?: string
          id?: string
          image_analysis?: Json | null
          image_url?: string | null
          is_anonymous?: boolean | null
          mood_rating?: string | null
          polarity?: number | null
          rating?: number | null
          sentiment?: string | null
          tags?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_ratings: {
        Row: {
          audiovisual_rating: number | null
          content_rating: number | null
          created_at: string
          feedback_id: string
          id: string
          management_rating: number | null
          speaker_rating: number | null
          timing_rating: number | null
          venue_rating: number | null
        }
        Insert: {
          audiovisual_rating?: number | null
          content_rating?: number | null
          created_at?: string
          feedback_id: string
          id?: string
          management_rating?: number | null
          speaker_rating?: number | null
          timing_rating?: number | null
          venue_rating?: number | null
        }
        Update: {
          audiovisual_rating?: number | null
          content_rating?: number | null
          created_at?: string
          feedback_id?: string
          id?: string
          management_rating?: number | null
          speaker_rating?: number | null
          timing_rating?: number | null
          venue_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_ratings_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: true
            referencedRelation: "feedback"
            referencedColumns: ["id"]
          },
        ]
      }
      media_comments: {
        Row: {
          comment_text: string
          created_at: string
          id: string
          media_id: string
          user_id: string
        }
        Insert: {
          comment_text: string
          created_at?: string
          id?: string
          media_id: string
          user_id: string
        }
        Update: {
          comment_text?: string
          created_at?: string
          id?: string
          media_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_comments_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_from_feedback"
            referencedColumns: ["id"]
          },
        ]
      }
      media_from_feedback: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          caption: string | null
          consent_given: boolean
          created_at: string
          event_id: string
          feedback_id: string
          file_type: string
          file_url: string
          id: string
          is_anonymous: boolean
          is_pinned: boolean
          status: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          caption?: string | null
          consent_given?: boolean
          created_at?: string
          event_id: string
          feedback_id: string
          file_type: string
          file_url: string
          id?: string
          is_anonymous?: boolean
          is_pinned?: boolean
          status?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          caption?: string | null
          consent_given?: boolean
          created_at?: string
          event_id?: string
          feedback_id?: string
          file_type?: string
          file_url?: string
          id?: string
          is_anonymous?: boolean
          is_pinned?: boolean
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_from_feedback_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_from_feedback_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "feedback"
            referencedColumns: ["id"]
          },
        ]
      }
      media_likes: {
        Row: {
          created_at: string
          id: string
          media_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          media_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_likes_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_from_feedback"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          link: string | null
          message: string
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          link?: string | null
          message: string
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          created_at: string | null
          id: string
          name: string
          quantity: number
          status: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          quantity?: number
          status?: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          quantity?: number
          status?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      student_badges: {
        Row: {
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          points_required: number
        }
        Insert: {
          created_at?: string
          description: string
          icon: string
          id?: string
          name: string
          points_required?: number
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          points_required?: number
        }
        Relationships: []
      }
      student_earned_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          student_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          student_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_earned_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "student_badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_earned_badges_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_points: {
        Row: {
          created_at: string
          level: string
          student_id: string
          total_points: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          level?: string
          student_id: string
          total_points?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          level?: string
          student_id?: string
          total_points?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_points_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "profiles"
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
      volunteer_assignments: {
        Row: {
          completed_at: string | null
          created_at: string | null
          event_id: string
          id: string
          notes: string | null
          status: string
          task: string
          volunteer_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          event_id: string
          id?: string
          notes?: string | null
          status?: string
          task: string
          volunteer_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          event_id?: string
          id?: string
          notes?: string | null
          status?: string
          task?: string
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_assignments_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "volunteers"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteers: {
        Row: {
          created_at: string | null
          department: string | null
          email: string
          id: string
          name: string
          phone: string | null
          skills: string[] | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          email: string
          id?: string
          name: string
          phone?: string | null
          skills?: string[] | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
          skills?: string[] | null
          user_id?: string | null
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
      app_role: "admin" | "student"
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
      app_role: ["admin", "student"],
    },
  },
} as const
