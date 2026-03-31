export type UserRole = "admin" | "teacher" | "parent" | "student";
export type CheckinFrequency = "daily" | "weekly";
export type TaskType =
  | "dictation"
  | "recitation"
  | "correction"
  | "homework"
  | "other";
export type TaskAssignmentStatus =
  | "pending"
  | "submitted"
  | "confirmed"
  | "rejected";
export type QuestionType = "choice" | "fill_blank" | "solution";
export type UploadFileType = "pdf" | "docx" | "image";
export type UploadStatus = "pending" | "processing" | "completed" | "failed";
export type RecurrenceType = "daily" | "weekly";

export interface ExtractedQuestionJSON {
  stem: string;
  type: "choice" | "fill_blank" | "solution";
  options?: string[];
  answer: string;
  explanation?: string;
  difficulty: number;
  topic_id?: string;
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          phone: string;
          name: string;
          role: UserRole;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          phone: string;
          name: string;
          role: UserRole;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          phone?: string;
          name?: string;
          role?: UserRole;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      students: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          grade: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          grade: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          grade?: string;
          updated_at?: string;
        };
      };
      parent_student: {
        Row: {
          id: string;
          parent_id: string;
          student_id: string;
          relationship: string;
        };
        Insert: {
          id?: string;
          parent_id: string;
          student_id: string;
          relationship: string;
        };
        Update: {
          id?: string;
          parent_id?: string;
          student_id?: string;
          relationship?: string;
        };
      };
      checkin_items: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          frequency: CheckinFrequency;
          is_active: boolean;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          frequency: CheckinFrequency;
          is_active?: boolean;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          frequency?: CheckinFrequency;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      checkin_records: {
        Row: {
          id: string;
          checkin_item_id: string;
          student_id: string;
          checked_by: string;
          checked_at: string;
          date: string;
          note: string | null;
        };
        Insert: {
          id?: string;
          checkin_item_id: string;
          student_id: string;
          checked_by: string;
          checked_at?: string;
          date: string;
          note?: string | null;
        };
        Update: {
          id?: string;
          checkin_item_id?: string;
          student_id?: string;
          checked_by?: string;
          checked_at?: string;
          date?: string;
          note?: string | null;
        };
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          type: TaskType;
          due_date: string;
          created_by: string;
          recurring_template_id: string | null;
          recurring_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          type: TaskType;
          due_date: string;
          created_by: string;
          recurring_template_id?: string | null;
          recurring_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          type?: TaskType;
          due_date?: string;
          recurring_template_id?: string | null;
          recurring_date?: string | null;
          updated_at?: string;
        };
      };
      task_assignments: {
        Row: {
          id: string;
          task_id: string;
          student_id: string;
          status: TaskAssignmentStatus;
          submitted_at: string | null;
          confirmed_at: string | null;
          confirmed_by: string | null;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          student_id: string;
          status?: TaskAssignmentStatus;
          submitted_at?: string | null;
          confirmed_at?: string | null;
          confirmed_by?: string | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          student_id?: string;
          status?: TaskAssignmentStatus;
          submitted_at?: string | null;
          confirmed_at?: string | null;
          confirmed_by?: string | null;
          note?: string | null;
          updated_at?: string;
        };
      };
      knowledge_topics: {
        Row: {
          id: string;
          parent_id: string | null;
          title: string;
          description: string | null;
          difficulty: number;
          sort_order: number;
          subject: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          parent_id?: string | null;
          title: string;
          description?: string | null;
          difficulty: number;
          sort_order: number;
          subject: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          parent_id?: string | null;
          title?: string;
          description?: string | null;
          difficulty?: number;
          sort_order?: number;
          subject?: string;
          updated_at?: string;
        };
      };
      questions: {
        Row: {
          id: string;
          topic_id: string;
          type: QuestionType;
          content: {
            stem: string;
            options?: string[];
            answer: string;
            explanation?: string;
          };
          difficulty: number;
          source_type: string;
          source_file_url: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          topic_id: string;
          type: QuestionType;
          content: {
            stem: string;
            options?: string[];
            answer: string;
            explanation?: string;
          };
          difficulty: number;
          source_type?: string;
          source_file_url?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          topic_id?: string;
          type?: QuestionType;
          content?: {
            stem: string;
            options?: string[];
            answer: string;
            explanation?: string;
          };
          difficulty?: number;
          source_type?: string;
          source_file_url?: string | null;
          updated_at?: string;
        };
      };
      test_results: {
        Row: {
          id: string;
          task_assignment_id: string;
          subject: string;
          total_questions: number;
          wrong_count: number;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          task_assignment_id: string;
          subject: string;
          total_questions: number;
          wrong_count: number;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          task_assignment_id?: string;
          subject?: string;
          total_questions?: number;
          wrong_count?: number;
          note?: string | null;
          updated_at?: string;
        };
      };
      question_uploads: {
        Row: {
          id: string;
          file_url: string;
          file_type: UploadFileType;
          status: UploadStatus;
          ai_provider: string | null;
          extracted_questions: ExtractedQuestionJSON[] | null;
          question_count: number;
          error_message: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          file_url: string;
          file_type: UploadFileType;
          status?: UploadStatus;
          ai_provider?: string | null;
          extracted_questions?: ExtractedQuestionJSON[] | null;
          question_count?: number;
          error_message?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          file_url?: string;
          file_type?: UploadFileType;
          status?: UploadStatus;
          ai_provider?: string | null;
          extracted_questions?: ExtractedQuestionJSON[] | null;
          question_count?: number;
          error_message?: string | null;
          updated_at?: string;
        };
      };
      question_attempts: {
        Row: {
          id: string;
          question_id: string;
          student_id: string;
          answer: string;
          is_correct: boolean;
          attempted_at: string;
          time_spent_seconds: number | null;
        };
        Insert: {
          id?: string;
          question_id: string;
          student_id: string;
          answer: string;
          is_correct: boolean;
          attempted_at?: string;
          time_spent_seconds?: number | null;
        };
        Update: {
          id?: string;
          question_id?: string;
          student_id?: string;
          answer?: string;
          is_correct?: boolean;
          attempted_at?: string;
          time_spent_seconds?: number | null;
        };
      };
      recurring_task_templates: {
        Row: {
          id: string;
          title: string;
          type: TaskType;
          recurrence_type: RecurrenceType;
          recurrence_days: number[] | null;
          start_date: string;
          end_date: string | null;
          is_active: boolean;
          student_ids: string[];
          created_by: string;
          last_generated_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          type: TaskType;
          recurrence_type: RecurrenceType;
          recurrence_days?: number[] | null;
          start_date: string;
          end_date?: string | null;
          is_active?: boolean;
          student_ids: string[];
          created_by: string;
          last_generated_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          type?: TaskType;
          recurrence_type?: RecurrenceType;
          recurrence_days?: number[] | null;
          start_date?: string;
          end_date?: string | null;
          is_active?: boolean;
          student_ids?: string[];
          last_generated_date?: string | null;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      checkin_frequency: CheckinFrequency;
      task_type: TaskType;
      task_assignment_status: TaskAssignmentStatus;
      question_type: QuestionType;
      upload_file_type: UploadFileType;
      upload_status: UploadStatus;
      recurrence_type: RecurrenceType;
    };
  };
}
