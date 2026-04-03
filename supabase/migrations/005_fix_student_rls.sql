-- ============================================
-- Fix: Students can't see their own records or task assignments
-- The get_my_student_ids() function only checks parent_student table (for parents).
-- Students need to see their own student record and task_assignments.
-- ============================================

-- Helper function: get student IDs for current user (works for BOTH students and parents)
CREATE OR REPLACE FUNCTION get_my_student_ids()
RETURNS SETOF UUID AS $$
  -- For parents: return children via parent_student
  SELECT student_id FROM parent_student WHERE parent_id = auth.uid()
  UNION
  -- For students: return their own student record
  SELECT id FROM students WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;
