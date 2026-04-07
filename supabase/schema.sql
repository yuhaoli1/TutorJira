


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."checkin_frequency" AS ENUM (
    'daily',
    'weekly'
);


ALTER TYPE "public"."checkin_frequency" OWNER TO "postgres";


CREATE TYPE "public"."question_type" AS ENUM (
    'choice',
    'fill_blank',
    'solution'
);


ALTER TYPE "public"."question_type" OWNER TO "postgres";


CREATE TYPE "public"."recurrence_type" AS ENUM (
    'daily',
    'weekly'
);


ALTER TYPE "public"."recurrence_type" OWNER TO "postgres";


CREATE TYPE "public"."task_assignment_status" AS ENUM (
    'pending',
    'submitted',
    'confirmed',
    'rejected',
    'closed'
);


ALTER TYPE "public"."task_assignment_status" OWNER TO "postgres";


CREATE TYPE "public"."task_priority" AS ENUM (
    'urgent',
    'high',
    'medium',
    'low'
);


ALTER TYPE "public"."task_priority" OWNER TO "postgres";


CREATE TYPE "public"."task_type" AS ENUM (
    'dictation',
    'recitation',
    'correction',
    'homework',
    'other'
);


ALTER TYPE "public"."task_type" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'admin',
    'teacher',
    'parent',
    'student'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_student_ids"() RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT student_id FROM parent_student WHERE parent_id = auth.uid()
  UNION
  SELECT id FROM students WHERE user_id = auth.uid()
$$;


ALTER FUNCTION "public"."get_my_student_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role"() RETURNS "public"."user_role"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$;


ALTER FUNCTION "public"."get_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."checkin_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "frequency" "public"."checkin_frequency" DEFAULT 'daily'::"public"."checkin_frequency" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."checkin_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."checkin_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "checkin_item_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "checked_by" "uuid" NOT NULL,
    "checked_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "date" "date" NOT NULL,
    "note" "text"
);


ALTER TABLE "public"."checkin_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."knowledge_topics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "parent_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "difficulty" integer DEFAULT 1 NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "subject" "text" DEFAULT '奥数'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "knowledge_topics_difficulty_check" CHECK ((("difficulty" >= 1) AND ("difficulty" <= 5)))
);


ALTER TABLE "public"."knowledge_topics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."parent_student" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "parent_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "relationship" "text" NOT NULL
);


ALTER TABLE "public"."parent_student" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."question_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "answer" "text" NOT NULL,
    "is_correct" boolean NOT NULL,
    "attempted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "time_spent_seconds" integer
);


ALTER TABLE "public"."question_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."question_tag_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "allow_multiple" boolean DEFAULT true NOT NULL,
    "is_system" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."question_tag_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."question_tag_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."question_tag_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."question_tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text",
    "parent_id" "uuid",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."question_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."question_uploads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "file_url" "text" NOT NULL,
    "file_type" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "ai_provider" "text",
    "extracted_questions" "jsonb",
    "question_count" integer DEFAULT 0,
    "error_message" "text",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "question_uploads_file_type_check" CHECK (("file_type" = ANY (ARRAY['pdf'::"text", 'docx'::"text", 'image'::"text"]))),
    CONSTRAINT "question_uploads_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."question_uploads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "topic_id" "uuid",
    "type" "public"."question_type" NOT NULL,
    "content" "jsonb" NOT NULL,
    "difficulty" integer DEFAULT 1 NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source_type" "text" DEFAULT 'manual'::"text",
    "source_file_url" "text",
    CONSTRAINT "questions_difficulty_check" CHECK ((("difficulty" >= 1) AND ("difficulty" <= 5)))
);


ALTER TABLE "public"."questions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."questions"."topic_id" IS 'DEPRECATED: use question_tag_links with knowledge_point category instead';



COMMENT ON COLUMN "public"."questions"."type" IS 'DEPRECATED: use question_tag_links with question_type category instead';



COMMENT ON COLUMN "public"."questions"."difficulty" IS 'DEPRECATED: use question_tag_links with difficulty category instead';



CREATE TABLE IF NOT EXISTS "public"."recurring_task_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "type" "public"."task_type" DEFAULT 'other'::"public"."task_type" NOT NULL,
    "recurrence_type" "public"."recurrence_type" DEFAULT 'daily'::"public"."recurrence_type" NOT NULL,
    "recurrence_days" integer[],
    "start_date" "date" NOT NULL,
    "end_date" "date",
    "is_active" boolean DEFAULT true NOT NULL,
    "student_ids" "uuid"[] NOT NULL,
    "created_by" "uuid" NOT NULL,
    "last_generated_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "priority" "public"."task_priority" DEFAULT 'medium'::"public"."task_priority" NOT NULL
);


ALTER TABLE "public"."recurring_task_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."students" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "name" "text" NOT NULL,
    "grade" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."students" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_activity_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_assignment_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "old_value" "text",
    "new_value" "text",
    "performed_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."task_activity_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "status" "public"."task_assignment_status" DEFAULT 'pending'::"public"."task_assignment_status" NOT NULL,
    "submitted_at" timestamp with time zone,
    "confirmed_at" timestamp with time zone,
    "confirmed_by" "uuid",
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ticket_number" integer NOT NULL
);


ALTER TABLE "public"."task_assignments" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."task_assignments_ticket_number_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."task_assignments_ticket_number_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."task_assignments_ticket_number_seq" OWNED BY "public"."task_assignments"."ticket_number";



CREATE TABLE IF NOT EXISTS "public"."task_attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_assignment_id" "uuid" NOT NULL,
    "file_url" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_size" integer,
    "file_type" "text",
    "uploaded_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."task_attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_assignment_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."task_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_label_map" (
    "task_id" "uuid" NOT NULL,
    "label_id" "uuid" NOT NULL
);


ALTER TABLE "public"."task_label_map" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_labels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "color" "text" DEFAULT '#B4BCC8'::"text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."task_labels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "question_id" "uuid" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."task_questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_submission_answers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_assignment_id" "uuid" NOT NULL,
    "question_id" "uuid" NOT NULL,
    "answer" "text" DEFAULT ''::"text" NOT NULL,
    "is_correct" boolean DEFAULT false NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."task_submission_answers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "type" "public"."task_type" DEFAULT 'other'::"public"."task_type" NOT NULL,
    "due_date" timestamp with time zone NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "recurring_template_id" "uuid",
    "recurring_date" "date",
    "priority" "public"."task_priority" DEFAULT 'medium'::"public"."task_priority" NOT NULL,
    "show_answers_after_submit" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."test_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_assignment_id" "uuid" NOT NULL,
    "subject" "text" NOT NULL,
    "total_questions" integer NOT NULL,
    "wrong_count" integer NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."test_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "phone" "text" NOT NULL,
    "name" "text" NOT NULL,
    "role" "public"."user_role" DEFAULT 'parent'::"public"."user_role" NOT NULL,
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "org_id" "uuid"
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."task_assignments" ALTER COLUMN "ticket_number" SET DEFAULT "nextval"('"public"."task_assignments_ticket_number_seq"'::"regclass");



ALTER TABLE ONLY "public"."checkin_items"
    ADD CONSTRAINT "checkin_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checkin_records"
    ADD CONSTRAINT "checkin_records_checkin_item_id_student_id_date_key" UNIQUE ("checkin_item_id", "student_id", "date");



ALTER TABLE ONLY "public"."checkin_records"
    ADD CONSTRAINT "checkin_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."knowledge_topics"
    ADD CONSTRAINT "knowledge_topics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."parent_student"
    ADD CONSTRAINT "parent_student_parent_id_student_id_key" UNIQUE ("parent_id", "student_id");



ALTER TABLE ONLY "public"."parent_student"
    ADD CONSTRAINT "parent_student_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."question_attempts"
    ADD CONSTRAINT "question_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."question_tag_categories"
    ADD CONSTRAINT "question_tag_categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."question_tag_categories"
    ADD CONSTRAINT "question_tag_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."question_tag_categories"
    ADD CONSTRAINT "question_tag_categories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."question_tag_links"
    ADD CONSTRAINT "question_tag_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."question_tag_links"
    ADD CONSTRAINT "question_tag_links_question_id_tag_id_key" UNIQUE ("question_id", "tag_id");



ALTER TABLE ONLY "public"."question_tags"
    ADD CONSTRAINT "question_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."question_uploads"
    ADD CONSTRAINT "question_uploads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recurring_task_templates"
    ADD CONSTRAINT "recurring_task_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_activity_log"
    ADD CONSTRAINT "task_activity_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_assignments"
    ADD CONSTRAINT "task_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_assignments"
    ADD CONSTRAINT "task_assignments_task_id_student_id_key" UNIQUE ("task_id", "student_id");



ALTER TABLE ONLY "public"."task_attachments"
    ADD CONSTRAINT "task_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_comments"
    ADD CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_label_map"
    ADD CONSTRAINT "task_label_map_pkey" PRIMARY KEY ("task_id", "label_id");



ALTER TABLE ONLY "public"."task_labels"
    ADD CONSTRAINT "task_labels_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."task_labels"
    ADD CONSTRAINT "task_labels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_questions"
    ADD CONSTRAINT "task_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_questions"
    ADD CONSTRAINT "task_questions_task_id_question_id_key" UNIQUE ("task_id", "question_id");



ALTER TABLE ONLY "public"."task_submission_answers"
    ADD CONSTRAINT "task_submission_answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_submission_answers"
    ADD CONSTRAINT "task_submission_answers_task_assignment_id_question_id_key" UNIQUE ("task_assignment_id", "question_id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."test_results"
    ADD CONSTRAINT "test_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_activity_log_assignment" ON "public"."task_activity_log" USING "btree" ("task_assignment_id");



CREATE INDEX "idx_activity_log_created" ON "public"."task_activity_log" USING "btree" ("created_at");



CREATE INDEX "idx_checkin_records_date" ON "public"."checkin_records" USING "btree" ("date");



CREATE INDEX "idx_checkin_records_student" ON "public"."checkin_records" USING "btree" ("student_id");



CREATE INDEX "idx_knowledge_topics_parent" ON "public"."knowledge_topics" USING "btree" ("parent_id");



CREATE INDEX "idx_parent_student_parent" ON "public"."parent_student" USING "btree" ("parent_id");



CREATE INDEX "idx_parent_student_student" ON "public"."parent_student" USING "btree" ("student_id");



CREATE INDEX "idx_question_attempts_student" ON "public"."question_attempts" USING "btree" ("student_id");



CREATE INDEX "idx_question_tag_links_question" ON "public"."question_tag_links" USING "btree" ("question_id");



CREATE INDEX "idx_question_tag_links_question_id" ON "public"."question_tag_links" USING "btree" ("question_id");



CREATE INDEX "idx_question_tag_links_tag" ON "public"."question_tag_links" USING "btree" ("tag_id");



CREATE INDEX "idx_question_tag_links_tag_id" ON "public"."question_tag_links" USING "btree" ("tag_id");



CREATE INDEX "idx_question_tags_category" ON "public"."question_tags" USING "btree" ("category_id");



CREATE INDEX "idx_question_tags_parent" ON "public"."question_tags" USING "btree" ("parent_id");



CREATE UNIQUE INDEX "idx_question_tags_unique" ON "public"."question_tags" USING "btree" ("category_id", "name", COALESCE("parent_id", '00000000-0000-0000-0000-000000000000'::"uuid"));



CREATE INDEX "idx_question_uploads_created_by" ON "public"."question_uploads" USING "btree" ("created_by");



CREATE INDEX "idx_question_uploads_status" ON "public"."question_uploads" USING "btree" ("status");



CREATE INDEX "idx_questions_created_at" ON "public"."questions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_questions_created_by" ON "public"."questions" USING "btree" ("created_by");



CREATE INDEX "idx_questions_difficulty" ON "public"."questions" USING "btree" ("difficulty");



CREATE INDEX "idx_questions_source_type" ON "public"."questions" USING "btree" ("source_type");



CREATE INDEX "idx_questions_topic" ON "public"."questions" USING "btree" ("topic_id");



CREATE INDEX "idx_questions_type" ON "public"."questions" USING "btree" ("type");



CREATE INDEX "idx_recurring_templates_active" ON "public"."recurring_task_templates" USING "btree" ("is_active", "last_generated_date");



CREATE INDEX "idx_students_user_id" ON "public"."students" USING "btree" ("user_id");



CREATE INDEX "idx_task_assignments_status" ON "public"."task_assignments" USING "btree" ("status");



CREATE INDEX "idx_task_assignments_student" ON "public"."task_assignments" USING "btree" ("student_id");



CREATE UNIQUE INDEX "idx_task_assignments_ticket" ON "public"."task_assignments" USING "btree" ("ticket_number");



CREATE INDEX "idx_task_attachments_assignment" ON "public"."task_attachments" USING "btree" ("task_assignment_id");



CREATE INDEX "idx_task_comments_assignment" ON "public"."task_comments" USING "btree" ("task_assignment_id");



CREATE INDEX "idx_task_questions_task" ON "public"."task_questions" USING "btree" ("task_id");



CREATE INDEX "idx_task_submission_answers_assignment" ON "public"."task_submission_answers" USING "btree" ("task_assignment_id");



CREATE INDEX "idx_tasks_priority" ON "public"."tasks" USING "btree" ("priority");



CREATE UNIQUE INDEX "idx_tasks_recurring_unique" ON "public"."tasks" USING "btree" ("recurring_template_id", "recurring_date") WHERE ("recurring_template_id" IS NOT NULL);



CREATE INDEX "idx_test_results_assignment" ON "public"."test_results" USING "btree" ("task_assignment_id");



CREATE INDEX "idx_users_org_id" ON "public"."users" USING "btree" ("org_id");



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."checkin_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."knowledge_topics" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."question_tag_categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."question_tags" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."question_uploads" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."questions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."recurring_task_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."students" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."task_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."task_comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."test_results" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



ALTER TABLE ONLY "public"."checkin_items"
    ADD CONSTRAINT "checkin_items_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."checkin_records"
    ADD CONSTRAINT "checkin_records_checked_by_fkey" FOREIGN KEY ("checked_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."checkin_records"
    ADD CONSTRAINT "checkin_records_checkin_item_id_fkey" FOREIGN KEY ("checkin_item_id") REFERENCES "public"."checkin_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checkin_records"
    ADD CONSTRAINT "checkin_records_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."knowledge_topics"
    ADD CONSTRAINT "knowledge_topics_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."knowledge_topics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."parent_student"
    ADD CONSTRAINT "parent_student_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."parent_student"
    ADD CONSTRAINT "parent_student_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_attempts"
    ADD CONSTRAINT "question_attempts_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_attempts"
    ADD CONSTRAINT "question_attempts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_tag_links"
    ADD CONSTRAINT "question_tag_links_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_tag_links"
    ADD CONSTRAINT "question_tag_links_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."question_tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_tags"
    ADD CONSTRAINT "question_tags_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."question_tag_categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_tags"
    ADD CONSTRAINT "question_tags_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."question_tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_uploads"
    ADD CONSTRAINT "question_uploads_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "public"."knowledge_topics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recurring_task_templates"
    ADD CONSTRAINT "recurring_task_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."task_activity_log"
    ADD CONSTRAINT "task_activity_log_task_assignment_id_fkey" FOREIGN KEY ("task_assignment_id") REFERENCES "public"."task_assignments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_assignments"
    ADD CONSTRAINT "task_assignments_confirmed_by_fkey" FOREIGN KEY ("confirmed_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."task_assignments"
    ADD CONSTRAINT "task_assignments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_assignments"
    ADD CONSTRAINT "task_assignments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_attachments"
    ADD CONSTRAINT "task_attachments_task_assignment_id_fkey" FOREIGN KEY ("task_assignment_id") REFERENCES "public"."task_assignments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_attachments"
    ADD CONSTRAINT "task_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."task_comments"
    ADD CONSTRAINT "task_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."task_comments"
    ADD CONSTRAINT "task_comments_task_assignment_id_fkey" FOREIGN KEY ("task_assignment_id") REFERENCES "public"."task_assignments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_label_map"
    ADD CONSTRAINT "task_label_map_label_id_fkey" FOREIGN KEY ("label_id") REFERENCES "public"."task_labels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_label_map"
    ADD CONSTRAINT "task_label_map_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_labels"
    ADD CONSTRAINT "task_labels_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."task_questions"
    ADD CONSTRAINT "task_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_questions"
    ADD CONSTRAINT "task_questions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_submission_answers"
    ADD CONSTRAINT "task_submission_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_submission_answers"
    ADD CONSTRAINT "task_submission_answers_task_assignment_id_fkey" FOREIGN KEY ("task_assignment_id") REFERENCES "public"."task_assignments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_recurring_template_id_fkey" FOREIGN KEY ("recurring_template_id") REFERENCES "public"."recurring_task_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."test_results"
    ADD CONSTRAINT "test_results_task_assignment_id_fkey" FOREIGN KEY ("task_assignment_id") REFERENCES "public"."task_assignments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id");



CREATE POLICY "activity_log_insert" ON "public"."task_activity_log" FOR INSERT WITH CHECK (true);



CREATE POLICY "activity_log_select" ON "public"."task_activity_log" FOR SELECT USING ((("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"])) OR ("task_assignment_id" IN ( SELECT "ta"."id"
   FROM "public"."task_assignments" "ta"
  WHERE ("ta"."student_id" IN ( SELECT "public"."get_my_student_ids"() AS "get_my_student_ids"))))));



ALTER TABLE "public"."checkin_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "checkin_items_insert" ON "public"."checkin_items" FOR INSERT WITH CHECK (("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"])));



CREATE POLICY "checkin_items_select" ON "public"."checkin_items" FOR SELECT USING (true);



CREATE POLICY "checkin_items_update" ON "public"."checkin_items" FOR UPDATE USING (("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"])));



ALTER TABLE "public"."checkin_records" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "checkin_records_insert" ON "public"."checkin_records" FOR INSERT WITH CHECK (("checked_by" = "auth"."uid"()));



CREATE POLICY "checkin_records_select" ON "public"."checkin_records" FOR SELECT USING ((("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"])) OR ("student_id" IN ( SELECT "public"."get_my_student_ids"() AS "get_my_student_ids"))));



ALTER TABLE "public"."knowledge_topics" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "knowledge_topics_insert" ON "public"."knowledge_topics" FOR INSERT WITH CHECK (("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"])));



CREATE POLICY "knowledge_topics_select" ON "public"."knowledge_topics" FOR SELECT USING (true);



CREATE POLICY "knowledge_topics_update" ON "public"."knowledge_topics" FOR UPDATE USING (("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"])));



ALTER TABLE "public"."parent_student" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "parent_student_insert" ON "public"."parent_student" FOR INSERT WITH CHECK ((("parent_id" = "auth"."uid"()) OR ("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"]))));



CREATE POLICY "parent_student_select" ON "public"."parent_student" FOR SELECT USING ((("parent_id" = "auth"."uid"()) OR ("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"]))));



ALTER TABLE "public"."question_attempts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "question_attempts_insert" ON "public"."question_attempts" FOR INSERT WITH CHECK (true);



CREATE POLICY "question_attempts_select" ON "public"."question_attempts" FOR SELECT USING ((("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"])) OR ("student_id" IN ( SELECT "public"."get_my_student_ids"() AS "get_my_student_ids"))));



ALTER TABLE "public"."question_tag_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."question_tag_links" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."question_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."question_uploads" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "question_uploads_delete" ON "public"."question_uploads" FOR DELETE USING (("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"])));



CREATE POLICY "question_uploads_insert" ON "public"."question_uploads" FOR INSERT WITH CHECK (("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"])));



CREATE POLICY "question_uploads_select" ON "public"."question_uploads" FOR SELECT USING (("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"])));



CREATE POLICY "question_uploads_update" ON "public"."question_uploads" FOR UPDATE USING (("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"])));



ALTER TABLE "public"."questions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "questions_delete" ON "public"."questions" FOR DELETE USING (("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"])));



CREATE POLICY "questions_insert" ON "public"."questions" FOR INSERT WITH CHECK (("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"])));



CREATE POLICY "questions_select" ON "public"."questions" FOR SELECT USING (true);



CREATE POLICY "questions_update" ON "public"."questions" FOR UPDATE USING (("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"])));



ALTER TABLE "public"."recurring_task_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "recurring_templates_insert" ON "public"."recurring_task_templates" FOR INSERT WITH CHECK (("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"])));



CREATE POLICY "recurring_templates_select" ON "public"."recurring_task_templates" FOR SELECT USING (("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"])));



CREATE POLICY "recurring_templates_update" ON "public"."recurring_task_templates" FOR UPDATE USING (("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"])));



ALTER TABLE "public"."students" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "students_insert" ON "public"."students" FOR INSERT WITH CHECK (("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role", 'parent'::"public"."user_role"])));



CREATE POLICY "students_select_admin_teacher" ON "public"."students" FOR SELECT USING ((("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"])) OR ("id" IN ( SELECT "public"."get_my_student_ids"() AS "get_my_student_ids"))));



CREATE POLICY "students_update" ON "public"."students" FOR UPDATE USING ((("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"])) OR ("id" IN ( SELECT "public"."get_my_student_ids"() AS "get_my_student_ids"))));



CREATE POLICY "tag_categories_delete" ON "public"."question_tag_categories" FOR DELETE USING (("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"])));



CREATE POLICY "tag_categories_insert" ON "public"."question_tag_categories" FOR INSERT WITH CHECK (("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"])));



CREATE POLICY "tag_categories_select" ON "public"."question_tag_categories" FOR SELECT USING (true);



CREATE POLICY "tag_categories_update" ON "public"."question_tag_categories" FOR UPDATE USING (("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"])));



CREATE POLICY "tag_links_delete" ON "public"."question_tag_links" FOR DELETE USING (("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"])));



CREATE POLICY "tag_links_insert" ON "public"."question_tag_links" FOR INSERT WITH CHECK (("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"])));



CREATE POLICY "tag_links_select" ON "public"."question_tag_links" FOR SELECT USING (true);



CREATE POLICY "tags_delete" ON "public"."question_tags" FOR DELETE USING (("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"])));



CREATE POLICY "tags_insert" ON "public"."question_tags" FOR INSERT WITH CHECK (("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"])));



CREATE POLICY "tags_select" ON "public"."question_tags" FOR SELECT USING (true);



CREATE POLICY "tags_update" ON "public"."question_tags" FOR UPDATE USING (("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"])));



ALTER TABLE "public"."task_activity_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_assignments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "task_assignments_insert" ON "public"."task_assignments" FOR INSERT WITH CHECK (("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"])));



CREATE POLICY "task_assignments_select" ON "public"."task_assignments" FOR SELECT USING ((("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"])) OR ("student_id" IN ( SELECT "public"."get_my_student_ids"() AS "get_my_student_ids"))));



CREATE POLICY "task_assignments_update" ON "public"."task_assignments" FOR UPDATE USING ((("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"])) OR ("student_id" IN ( SELECT "public"."get_my_student_ids"() AS "get_my_student_ids"))));



ALTER TABLE "public"."task_attachments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "task_attachments_delete" ON "public"."task_attachments" FOR DELETE USING ((("uploaded_by" = "auth"."uid"()) OR ("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"]))));



CREATE POLICY "task_attachments_insert" ON "public"."task_attachments" FOR INSERT WITH CHECK (("uploaded_by" = "auth"."uid"()));



CREATE POLICY "task_attachments_select" ON "public"."task_attachments" FOR SELECT USING ((("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"])) OR ("task_assignment_id" IN ( SELECT "ta"."id"
   FROM "public"."task_assignments" "ta"
  WHERE ("ta"."student_id" IN ( SELECT "public"."get_my_student_ids"() AS "get_my_student_ids"))))));



ALTER TABLE "public"."task_comments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "task_comments_insert" ON "public"."task_comments" FOR INSERT WITH CHECK (("author_id" = "auth"."uid"()));



CREATE POLICY "task_comments_select" ON "public"."task_comments" FOR SELECT USING ((("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"])) OR ("task_assignment_id" IN ( SELECT "ta"."id"
   FROM "public"."task_assignments" "ta"
  WHERE ("ta"."student_id" IN ( SELECT "public"."get_my_student_ids"() AS "get_my_student_ids"))))));



CREATE POLICY "task_comments_update" ON "public"."task_comments" FOR UPDATE USING (("author_id" = "auth"."uid"()));



ALTER TABLE "public"."task_label_map" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "task_label_map_delete" ON "public"."task_label_map" FOR DELETE USING (("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"])));



CREATE POLICY "task_label_map_insert" ON "public"."task_label_map" FOR INSERT WITH CHECK (("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"])));



CREATE POLICY "task_label_map_select" ON "public"."task_label_map" FOR SELECT USING (true);



ALTER TABLE "public"."task_labels" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "task_labels_insert" ON "public"."task_labels" FOR INSERT WITH CHECK (("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"])));



CREATE POLICY "task_labels_select" ON "public"."task_labels" FOR SELECT USING (true);



CREATE POLICY "task_labels_update" ON "public"."task_labels" FOR UPDATE USING (("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"])));



ALTER TABLE "public"."task_questions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "task_questions_delete" ON "public"."task_questions" FOR DELETE USING (("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"])));



CREATE POLICY "task_questions_insert" ON "public"."task_questions" FOR INSERT WITH CHECK (("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"])));



CREATE POLICY "task_questions_select" ON "public"."task_questions" FOR SELECT USING (true);



ALTER TABLE "public"."task_submission_answers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "task_submission_answers_delete" ON "public"."task_submission_answers" FOR DELETE USING (true);



CREATE POLICY "task_submission_answers_insert" ON "public"."task_submission_answers" FOR INSERT WITH CHECK (true);



CREATE POLICY "task_submission_answers_select" ON "public"."task_submission_answers" FOR SELECT USING ((("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"])) OR ("task_assignment_id" IN ( SELECT "task_assignments"."id"
   FROM "public"."task_assignments"
  WHERE ("task_assignments"."student_id" IN ( SELECT "public"."get_my_student_ids"() AS "get_my_student_ids"))))));



CREATE POLICY "task_submission_answers_update" ON "public"."task_submission_answers" FOR UPDATE USING (true);



ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tasks_insert" ON "public"."tasks" FOR INSERT WITH CHECK (("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"])));



CREATE POLICY "tasks_select" ON "public"."tasks" FOR SELECT USING (true);



CREATE POLICY "tasks_update" ON "public"."tasks" FOR UPDATE USING (("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"])));



ALTER TABLE "public"."test_results" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "test_results_delete" ON "public"."test_results" FOR DELETE USING (("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"])));



CREATE POLICY "test_results_insert" ON "public"."test_results" FOR INSERT WITH CHECK (("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"])));



CREATE POLICY "test_results_select" ON "public"."test_results" FOR SELECT USING ((("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"])) OR ("task_assignment_id" IN ( SELECT "ta"."id"
   FROM "public"."task_assignments" "ta"
  WHERE ("ta"."student_id" IN ( SELECT "public"."get_my_student_ids"() AS "get_my_student_ids"))))));



CREATE POLICY "test_results_update" ON "public"."test_results" FOR UPDATE USING (("public"."get_user_role"() = ANY (ARRAY['admin'::"public"."user_role", 'teacher'::"public"."user_role"])));



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_insert_self" ON "public"."users" FOR INSERT WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "users_select" ON "public"."users" FOR SELECT USING (true);



CREATE POLICY "users_update_self" ON "public"."users" FOR UPDATE USING (("id" = "auth"."uid"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."get_my_student_ids"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_student_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_student_ids"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."checkin_items" TO "anon";
GRANT ALL ON TABLE "public"."checkin_items" TO "authenticated";
GRANT ALL ON TABLE "public"."checkin_items" TO "service_role";



GRANT ALL ON TABLE "public"."checkin_records" TO "anon";
GRANT ALL ON TABLE "public"."checkin_records" TO "authenticated";
GRANT ALL ON TABLE "public"."checkin_records" TO "service_role";



GRANT ALL ON TABLE "public"."knowledge_topics" TO "anon";
GRANT ALL ON TABLE "public"."knowledge_topics" TO "authenticated";
GRANT ALL ON TABLE "public"."knowledge_topics" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."parent_student" TO "anon";
GRANT ALL ON TABLE "public"."parent_student" TO "authenticated";
GRANT ALL ON TABLE "public"."parent_student" TO "service_role";



GRANT ALL ON TABLE "public"."question_attempts" TO "anon";
GRANT ALL ON TABLE "public"."question_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."question_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."question_tag_categories" TO "anon";
GRANT ALL ON TABLE "public"."question_tag_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."question_tag_categories" TO "service_role";



GRANT ALL ON TABLE "public"."question_tag_links" TO "anon";
GRANT ALL ON TABLE "public"."question_tag_links" TO "authenticated";
GRANT ALL ON TABLE "public"."question_tag_links" TO "service_role";



GRANT ALL ON TABLE "public"."question_tags" TO "anon";
GRANT ALL ON TABLE "public"."question_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."question_tags" TO "service_role";



GRANT ALL ON TABLE "public"."question_uploads" TO "anon";
GRANT ALL ON TABLE "public"."question_uploads" TO "authenticated";
GRANT ALL ON TABLE "public"."question_uploads" TO "service_role";



GRANT ALL ON TABLE "public"."questions" TO "anon";
GRANT ALL ON TABLE "public"."questions" TO "authenticated";
GRANT ALL ON TABLE "public"."questions" TO "service_role";



GRANT ALL ON TABLE "public"."recurring_task_templates" TO "anon";
GRANT ALL ON TABLE "public"."recurring_task_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."recurring_task_templates" TO "service_role";



GRANT ALL ON TABLE "public"."students" TO "anon";
GRANT ALL ON TABLE "public"."students" TO "authenticated";
GRANT ALL ON TABLE "public"."students" TO "service_role";



GRANT ALL ON TABLE "public"."task_activity_log" TO "anon";
GRANT ALL ON TABLE "public"."task_activity_log" TO "authenticated";
GRANT ALL ON TABLE "public"."task_activity_log" TO "service_role";



GRANT ALL ON TABLE "public"."task_assignments" TO "anon";
GRANT ALL ON TABLE "public"."task_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."task_assignments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."task_assignments_ticket_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."task_assignments_ticket_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."task_assignments_ticket_number_seq" TO "service_role";



GRANT ALL ON TABLE "public"."task_attachments" TO "anon";
GRANT ALL ON TABLE "public"."task_attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."task_attachments" TO "service_role";



GRANT ALL ON TABLE "public"."task_comments" TO "anon";
GRANT ALL ON TABLE "public"."task_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."task_comments" TO "service_role";



GRANT ALL ON TABLE "public"."task_label_map" TO "anon";
GRANT ALL ON TABLE "public"."task_label_map" TO "authenticated";
GRANT ALL ON TABLE "public"."task_label_map" TO "service_role";



GRANT ALL ON TABLE "public"."task_labels" TO "anon";
GRANT ALL ON TABLE "public"."task_labels" TO "authenticated";
GRANT ALL ON TABLE "public"."task_labels" TO "service_role";



GRANT ALL ON TABLE "public"."task_questions" TO "anon";
GRANT ALL ON TABLE "public"."task_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."task_questions" TO "service_role";



GRANT ALL ON TABLE "public"."task_submission_answers" TO "anon";
GRANT ALL ON TABLE "public"."task_submission_answers" TO "authenticated";
GRANT ALL ON TABLE "public"."task_submission_answers" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";



GRANT ALL ON TABLE "public"."test_results" TO "anon";
GRANT ALL ON TABLE "public"."test_results" TO "authenticated";
GRANT ALL ON TABLE "public"."test_results" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































