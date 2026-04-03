-- 给 task_assignment_status enum 加上 closed 值
ALTER TYPE task_assignment_status ADD VALUE IF NOT EXISTS 'closed';
