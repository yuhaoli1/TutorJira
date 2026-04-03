-- Add auto-increment ticket number to task_assignments
ALTER TABLE task_assignments ADD COLUMN ticket_number SERIAL;

-- Create unique index
CREATE UNIQUE INDEX idx_task_assignments_ticket ON task_assignments(ticket_number);
