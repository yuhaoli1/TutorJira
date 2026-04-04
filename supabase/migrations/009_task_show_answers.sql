-- 任务级别控制：学生提交后是否展示答案
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS show_answers_after_submit BOOLEAN NOT NULL DEFAULT true;
