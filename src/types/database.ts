/**
 * Hand-crafted Supabase Database type.
 *
 * Mirrors `supabase/migrations/0001_initial_schema.sql`. If you change the
 * schema, update this file too. (Long-term, replace with
 * `npx supabase gen types typescript --project-id <ref> --schema public`
 * once the Supabase CLI is set up locally.)
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type QuestionType = "mcq" | "short_answer" | "essay" | "equation";
export type Difficulty = "easy" | "medium" | "hard";
export type AttemptStatus = "in_progress" | "submitted" | "graded";
export type MarkedBy = "auto" | "ai" | "human";

export interface Database {
  public: {
    Tables: {
      grades: {
        Row: {
          id: string;
          code: string;
          name: string;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          display_order: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          id: string;
          code: string;
          name: string;
          display_order: number;
          created_at: string;
          updated_at: string;
        }>;
        Relationships: [];
      };
      subjects: {
        Row: {
          id: string;
          grade_id: string;
          name: string;
          slug: string;
          icon: string | null;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          grade_id: string;
          name: string;
          slug: string;
          icon?: string | null;
          display_order: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          id: string;
          grade_id: string;
          name: string;
          slug: string;
          icon: string | null;
          display_order: number;
          created_at: string;
          updated_at: string;
        }>;
        Relationships: [
          {
            foreignKeyName: "subjects_grade_id_fkey";
            columns: ["grade_id"];
            referencedRelation: "grades";
            referencedColumns: ["id"];
          },
        ];
      };
      topics: {
        Row: {
          id: string;
          subject_id: string;
          name: string;
          slug: string;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          subject_id: string;
          name: string;
          slug: string;
          display_order: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          id: string;
          subject_id: string;
          name: string;
          slug: string;
          display_order: number;
          created_at: string;
          updated_at: string;
        }>;
        Relationships: [
          {
            foreignKeyName: "topics_subject_id_fkey";
            columns: ["subject_id"];
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
        ];
      };
      question_images: {
        Row: {
          id: string;
          storage_path: string;
          alt_text: string | null;
          width: number | null;
          height: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          storage_path: string;
          alt_text?: string | null;
          width?: number | null;
          height?: number | null;
          created_at?: string;
        };
        Update: Partial<{
          id: string;
          storage_path: string;
          alt_text: string | null;
          width: number | null;
          height: number | null;
          created_at: string;
        }>;
        Relationships: [];
      };
      questions: {
        Row: {
          id: string;
          topic_id: string;
          question_type: QuestionType;
          prompt: string;
          explanation: string | null;
          marks: number;
          difficulty: Difficulty | null;
          source_year: number | null;
          source_paper: string | null;
          source_examiner: string | null;
          image_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          topic_id: string;
          question_type: QuestionType;
          prompt: string;
          explanation?: string | null;
          marks?: number;
          difficulty?: Difficulty | null;
          source_year?: number | null;
          source_paper?: string | null;
          source_examiner?: string | null;
          image_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          id: string;
          topic_id: string;
          question_type: QuestionType;
          prompt: string;
          explanation: string | null;
          marks: number;
          difficulty: Difficulty | null;
          source_year: number | null;
          source_paper: string | null;
          source_examiner: string | null;
          image_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        }>;
        Relationships: [
          {
            foreignKeyName: "questions_topic_id_fkey";
            columns: ["topic_id"];
            referencedRelation: "topics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "questions_image_id_fkey";
            columns: ["image_id"];
            referencedRelation: "question_images";
            referencedColumns: ["id"];
          },
        ];
      };
      question_options: {
        Row: {
          id: string;
          question_id: string;
          label: string;
          text: string;
          is_correct: boolean;
          display_order: number;
        };
        Insert: {
          id?: string;
          question_id: string;
          label: string;
          text: string;
          is_correct?: boolean;
          display_order: number;
        };
        Update: Partial<{
          id: string;
          question_id: string;
          label: string;
          text: string;
          is_correct: boolean;
          display_order: number;
        }>;
        Relationships: [
          {
            foreignKeyName: "question_options_question_id_fkey";
            columns: ["question_id"];
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
        ];
      };
      question_answers: {
        Row: {
          id: string;
          question_id: string;
          expected_answer: string;
          marking_notes: string | null;
          acceptable_variations: string[] | null;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          question_id: string;
          expected_answer: string;
          marking_notes?: string | null;
          acceptable_variations?: string[] | null;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: Partial<{
          id: string;
          question_id: string;
          expected_answer: string;
          marking_notes: string | null;
          acceptable_variations: string[] | null;
          is_primary: boolean;
          created_at: string;
        }>;
        Relationships: [
          {
            foreignKeyName: "question_answers_question_id_fkey";
            columns: ["question_id"];
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
        ];
      };
      quizzes: {
        Row: {
          id: string;
          topic_id: string;
          title: string;
          description: string | null;
          time_limit_minutes: number | null;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          topic_id: string;
          title: string;
          description?: string | null;
          time_limit_minutes?: number | null;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          id: string;
          topic_id: string;
          title: string;
          description: string | null;
          time_limit_minutes: number | null;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        }>;
        Relationships: [
          {
            foreignKeyName: "quizzes_topic_id_fkey";
            columns: ["topic_id"];
            referencedRelation: "topics";
            referencedColumns: ["id"];
          },
        ];
      };
      quiz_questions: {
        Row: {
          quiz_id: string;
          question_id: string;
          display_order: number;
        };
        Insert: {
          quiz_id: string;
          question_id: string;
          display_order: number;
        };
        Update: Partial<{
          quiz_id: string;
          question_id: string;
          display_order: number;
        }>;
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey";
            columns: ["quiz_id"];
            referencedRelation: "quizzes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quiz_questions_question_id_fkey";
            columns: ["question_id"];
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          grade_code: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          grade_code?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          id: string;
          display_name: string | null;
          grade_code: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        }>;
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      quiz_attempts: {
        Row: {
          id: string;
          user_id: string;
          quiz_id: string;
          started_at: string;
          submitted_at: string | null;
          total_marks: number | null;
          marks_obtained: number | null;
          status: AttemptStatus;
        };
        Insert: {
          id?: string;
          user_id: string;
          quiz_id: string;
          started_at?: string;
          submitted_at?: string | null;
          total_marks?: number | null;
          marks_obtained?: number | null;
          status?: AttemptStatus;
        };
        Update: Partial<{
          id: string;
          user_id: string;
          quiz_id: string;
          started_at: string;
          submitted_at: string | null;
          total_marks: number | null;
          marks_obtained: number | null;
          status: AttemptStatus;
        }>;
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey";
            columns: ["quiz_id"];
            referencedRelation: "quizzes";
            referencedColumns: ["id"];
          },
        ];
      };
      attempt_answers: {
        Row: {
          id: string;
          attempt_id: string;
          question_id: string;
          selected_option_id: string | null;
          text_answer: string | null;
          image_storage_path: string | null;
          is_correct: boolean | null;
          marks_awarded: number | null;
          marked_by: MarkedBy | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          attempt_id: string;
          question_id: string;
          selected_option_id?: string | null;
          text_answer?: string | null;
          image_storage_path?: string | null;
          is_correct?: boolean | null;
          marks_awarded?: number | null;
          marked_by?: MarkedBy | null;
          created_at?: string;
        };
        Update: Partial<{
          id: string;
          attempt_id: string;
          question_id: string;
          selected_option_id: string | null;
          text_answer: string | null;
          image_storage_path: string | null;
          is_correct: boolean | null;
          marks_awarded: number | null;
          marked_by: MarkedBy | null;
          created_at: string;
        }>;
        Relationships: [
          {
            foreignKeyName: "attempt_answers_attempt_id_fkey";
            columns: ["attempt_id"];
            referencedRelation: "quiz_attempts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attempt_answers_question_id_fkey";
            columns: ["question_id"];
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attempt_answers_selected_option_id_fkey";
            columns: ["selected_option_id"];
            referencedRelation: "question_options";
            referencedColumns: ["id"];
          },
        ];
      };
      user_topic_progress: {
        Row: {
          user_id: string;
          topic_id: string;
          attempts_count: number;
          total_score: number;
          max_possible_score: number;
          last_attempt_at: string | null;
        };
        Insert: {
          user_id: string;
          topic_id: string;
          attempts_count?: number;
          total_score?: number;
          max_possible_score?: number;
          last_attempt_at?: string | null;
        };
        Update: Partial<{
          user_id: string;
          topic_id: string;
          attempts_count: number;
          total_score: number;
          max_possible_score: number;
          last_attempt_at: string | null;
        }>;
        Relationships: [
          {
            foreignKeyName: "user_topic_progress_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_topic_progress_topic_id_fkey";
            columns: ["topic_id"];
            referencedRelation: "topics";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
