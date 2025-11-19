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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      course: {
        Row: {
          abbreviation: string | null
          code: string
          created_at: string
          id: string
          title: string
        }
        Insert: {
          abbreviation?: string | null
          code: string
          created_at?: string
          id?: string
          title: string
        }
        Update: {
          abbreviation?: string | null
          code?: string
          created_at?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      course_content: {
        Row: {
          course_id: string | null
          course_title: string | null
          created_at: string
          id: string
          instructor: string | null
          new_course_id: number | null
          resource_url: string | null
          semester: string | null
          tags: string[] | null
          title: string | null
          user_id: string | null
          visible: boolean | null
          year: number | null
        }
        Insert: {
          course_id?: string | null
          course_title?: string | null
          created_at?: string
          id?: string
          instructor?: string | null
          new_course_id?: number | null
          resource_url?: string | null
          semester?: string | null
          tags?: string[] | null
          title?: string | null
          user_id?: string | null
          visible?: boolean | null
          year?: number | null
        }
        Update: {
          course_id?: string | null
          course_title?: string | null
          created_at?: string
          id?: string
          instructor?: string | null
          new_course_id?: number | null
          resource_url?: string | null
          semester?: string | null
          tags?: string[] | null
          title?: string | null
          user_id?: string | null
          visible?: boolean | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "course_content_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course"
            referencedColumns: ["id"]
          },
        ]
      }
      course_content_tags: {
        Row: {
          course_content_id: number
          tag_id: number
        }
        Insert: {
          course_content_id: number
          tag_id: number
        }
        Update: {
          course_content_id?: number
          tag_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_content_tags_course_content_id_fkey"
            columns: ["course_content_id"]
            isOneToOne: false
            referencedRelation: "course_contentnew"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_content_tags_course_content_id_fkey"
            columns: ["course_content_id"]
            isOneToOne: false
            referencedRelation: "course_contentnew_anon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_content_tags_course_content_id_fkey"
            columns: ["course_content_id"]
            isOneToOne: false
            referencedRelation: "course_contentnew_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_content_tags_course_content_id_fkey"
            columns: ["course_content_id"]
            isOneToOne: false
            referencedRelation: "course_contentnew_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_content_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      course_contentnew: {
        Row: {
          anon: boolean | null
          batch: string
          course_id: number | null
          created_at: string
          deleted: boolean | null
          filetype: string | null
          id: number
          professor_id: number | null
          r2_url: string | null
          resource_url: string
          semester_number: number
          tag_ids: number[] | null
          title: string
          updated_at: string | null
          user_id: string | null
          visible: boolean | null
          year: number
        }
        Insert: {
          anon?: boolean | null
          batch: string
          course_id?: number | null
          created_at?: string
          deleted?: boolean | null
          filetype?: string | null
          id?: number
          professor_id?: number | null
          r2_url?: string | null
          resource_url: string
          semester_number: number
          tag_ids?: number[] | null
          title: string
          updated_at?: string | null
          user_id?: string | null
          visible?: boolean | null
          year: number
        }
        Update: {
          anon?: boolean | null
          batch?: string
          course_id?: number | null
          created_at?: string
          deleted?: boolean | null
          filetype?: string | null
          id?: number
          professor_id?: number | null
          r2_url?: string | null
          resource_url?: string
          semester_number?: number
          tag_ids?: number[] | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
          visible?: boolean | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_contentnew_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "coursenew"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_contentnew_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professorsnew"
            referencedColumns: ["id"]
          },
        ]
      }
      coursenew: {
        Row: {
          abbreviation: string | null
          code: string
          created_at: string
          id: number
          title: string
        }
        Insert: {
          abbreviation?: string | null
          code: string
          created_at?: string
          id?: number
          title: string
        }
        Update: {
          abbreviation?: string | null
          code?: string
          created_at?: string
          id?: number
          title?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          created_at: string
          feedback: string
          id: number
          rating: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback: string
          id?: never
          rating?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          feedback?: string
          id?: never
          rating?: number | null
          user_id?: string
        }
        Relationships: []
      }
      professorsnew: {
        Row: {
          address: string | null
          created_at: string | null
          department: string | null
          designation: string | null
          email: string | null
          id: number
          name: string
          phone: string | null
          research_interests: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          department?: string | null
          designation?: string | null
          email?: string | null
          id?: number
          name: string
          phone?: string | null
          research_interests?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          department?: string | null
          designation?: string | null
          email?: string | null
          id?: number
          name?: string
          phone?: string | null
          research_interests?: string | null
        }
        Relationships: []
      }
      QnA: {
        Row: {
          created_at: string
          id: number
          ques: string | null
          rating: number | null
          response: string | null
          userid: string
          yes_no: boolean | null
        }
        Insert: {
          created_at?: string
          id?: number
          ques?: string | null
          rating?: number | null
          response?: string | null
          userid: string
          yes_no?: boolean | null
        }
        Update: {
          created_at?: string
          id?: number
          ques?: string | null
          rating?: number | null
          response?: string | null
          userid?: string
          yes_no?: boolean | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      user_course_interaction: {
        Row: {
          content_id: number | null
          course_id: number
          created_at: string | null
          deleted: number | null
          id: number
          interaction_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content_id?: number | null
          course_id: number
          created_at?: string | null
          deleted?: number | null
          id?: number
          interaction_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content_id?: number | null
          course_id?: number
          created_at?: string | null
          deleted?: number | null
          id?: number
          interaction_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_course_interaction_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "course_contentnew"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_course_interaction_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "course_contentnew_anon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_course_interaction_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "course_contentnew_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_course_interaction_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "course_contentnew_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_course_interaction_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "coursenew"
            referencedColumns: ["id"]
          },
        ]
      }
      user_meta: {
        Row: {
          admin_request: boolean
          batch: string | null
          created_at: string | null
          full_name: string | null
          id: number
          profile_picture_url: string | null
          role: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          admin_request?: boolean
          batch?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: number
          profile_picture_url?: string | null
          role: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          admin_request?: boolean
          batch?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: number
          profile_picture_url?: string | null
          role?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_pinned_courses: {
        Row: {
          course_id: number
          pinned_at: string | null
          user_id: string
        }
        Insert: {
          course_id: number
          pinned_at?: string | null
          user_id: string
        }
        Update: {
          course_id?: number
          pinned_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_pinned_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "coursenew"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      course_contentnew_anon: {
        Row: {
          anon: boolean | null
          batch: string | null
          course_id: number | null
          created_at: string | null
          deleted: boolean | null
          filetype: string | null
          id: number | null
          professor_id: number | null
          r2_url: string | null
          resource_url: string | null
          semester_number: number | null
          tag_ids: number[] | null
          title: string | null
          updated_at: string | null
          user_id: string | null
          visible: boolean | null
          year: number | null
        }
        Insert: {
          anon?: boolean | null
          batch?: string | null
          course_id?: number | null
          created_at?: string | null
          deleted?: boolean | null
          filetype?: string | null
          id?: number | null
          professor_id?: number | null
          r2_url?: string | null
          resource_url?: never
          semester_number?: number | null
          tag_ids?: number[] | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          visible?: boolean | null
          year?: number | null
        }
        Update: {
          anon?: boolean | null
          batch?: string | null
          course_id?: number | null
          created_at?: string | null
          deleted?: boolean | null
          filetype?: string | null
          id?: number | null
          professor_id?: number | null
          r2_url?: string | null
          resource_url?: never
          semester_number?: number | null
          tag_ids?: number[] | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          visible?: boolean | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "course_contentnew_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "coursenew"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_contentnew_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professorsnew"
            referencedColumns: ["id"]
          },
        ]
      }
      course_contentnew_safe: {
        Row: {
          anon: boolean | null
          batch: string | null
          course_id: number | null
          created_at: string | null
          deleted: boolean | null
          filetype: string | null
          id: number | null
          professor_id: number | null
          resource_url: string | null
          semester_number: number | null
          tag_ids: number[] | null
          title: string | null
          updated_at: string | null
          user_id: string | null
          visible: boolean | null
          year: number | null
        }
        Insert: {
          anon?: boolean | null
          batch?: string | null
          course_id?: number | null
          created_at?: string | null
          deleted?: boolean | null
          filetype?: string | null
          id?: number | null
          professor_id?: number | null
          resource_url?: never
          semester_number?: number | null
          tag_ids?: number[] | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          visible?: boolean | null
          year?: number | null
        }
        Update: {
          anon?: boolean | null
          batch?: string | null
          course_id?: number | null
          created_at?: string | null
          deleted?: boolean | null
          filetype?: string | null
          id?: number | null
          professor_id?: number | null
          resource_url?: never
          semester_number?: number | null
          tag_ids?: number[] | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          visible?: boolean | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "course_contentnew_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "coursenew"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_contentnew_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professorsnew"
            referencedColumns: ["id"]
          },
        ]
      }
      course_contentnew_user: {
        Row: {
          anon: boolean | null
          batch: string | null
          course_id: number | null
          created_at: string | null
          deleted: boolean | null
          filetype: string | null
          id: number | null
          professor_id: number | null
          r2_url: string | null
          resource_url: string | null
          semester_number: number | null
          tag_ids: number[] | null
          title: string | null
          updated_at: string | null
          user_id: string | null
          visible: boolean | null
          year: number | null
        }
        Insert: {
          anon?: boolean | null
          batch?: string | null
          course_id?: number | null
          created_at?: string | null
          deleted?: boolean | null
          filetype?: string | null
          id?: number | null
          professor_id?: number | null
          r2_url?: string | null
          resource_url?: string | null
          semester_number?: number | null
          tag_ids?: number[] | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          visible?: boolean | null
          year?: number | null
        }
        Update: {
          anon?: boolean | null
          batch?: string | null
          course_id?: number | null
          created_at?: string | null
          deleted?: boolean | null
          filetype?: string | null
          id?: number | null
          professor_id?: number | null
          r2_url?: string | null
          resource_url?: string | null
          semester_number?: number | null
          tag_ids?: number[] | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          visible?: boolean | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "course_contentnew_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "coursenew"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_contentnew_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professorsnew"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_public_course_content:
        | {
            Args: { target_course_id: number }
            Returns: {
              anon: boolean | null
              batch: string | null
              course_id: number | null
              created_at: string | null
              deleted: boolean | null
              filetype: string | null
              id: number | null
              professor_id: number | null
              resource_url: string | null
              semester_number: number | null
              tag_ids: number[] | null
              title: string | null
              updated_at: string | null
              user_id: string | null
              visible: boolean | null
              year: number | null
            }[]
            SetofOptions: {
              from: "*"
              to: "course_contentnew_safe"
              isOneToOne: false
              isSetofReturn: true
            }
          }
        | {
            Args: never
            Returns: {
              anon: boolean | null
              batch: string | null
              course_id: number | null
              created_at: string | null
              deleted: boolean | null
              filetype: string | null
              id: number | null
              professor_id: number | null
              resource_url: string | null
              semester_number: number | null
              tag_ids: number[] | null
              title: string | null
              updated_at: string | null
              user_id: string | null
              visible: boolean | null
              year: number | null
            }[]
            SetofOptions: {
              from: "*"
              to: "course_contentnew_safe"
              isOneToOne: false
              isSetofReturn: true
            }
          }
      professor_course_list: {
        Args: { limit_count?: number; offset_count?: number }
        Returns: {
          course_code: string
          course_id: number
          course_title: string
          professor_email: string
          professor_id: number
          professor_name: string
        }[]
      }
      professor_course_resources: {
        Args: { limit_count?: number; offset_count?: number }
        Returns: {
          content_id: number
          content_title: string
          course_code: string
          course_id: number
          course_title: string
          professor_email: string
          professor_id: number
          professor_name: string
          resource_url: string
          semester_number: number
          year: number
        }[]
      }
      top_contributors: {
        Args: { limit_count?: number }
        Returns: {
          batch: string
          contribution_count: number
          full_name: string
          profile_picture_url: string
          user_id: string
        }[]
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
