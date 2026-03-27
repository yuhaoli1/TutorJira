import { createClient } from "@supabase/supabase-js";
import type { TaskType } from "./supabase/types";

const LOOK_AHEAD_DAYS = 7;

interface RecurringTemplate {
  id: string;
  title: string;
  type: TaskType;
  recurrence_type: "daily" | "weekly";
  recurrence_days: number[] | null;
  start_date: string;
  end_date: string | null;
  student_ids: string[];
  created_by: string;
  last_generated_date: string | null;
}

function getISODayOfWeek(date: Date): number {
  // JS: 0=Sun, 1=Mon..6=Sat → ISO: 1=Mon..7=Sun
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function toDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

function getDatesToGenerate(template: RecurringTemplate, today: Date): string[] {
  const horizon = addDays(today, LOOK_AHEAD_DAYS);
  const dates: string[] = [];

  // Start from the day after last_generated_date, or start_date, whichever is later
  let cursor: Date;
  if (template.last_generated_date) {
    cursor = addDays(new Date(template.last_generated_date), 1);
  } else {
    cursor = new Date(template.start_date);
  }

  // Don't generate for dates before today
  if (cursor < today) {
    cursor = new Date(today);
  }

  const endDate = template.end_date ? new Date(template.end_date) : null;

  while (cursor <= horizon) {
    if (endDate && cursor > endDate) break;

    if (template.recurrence_type === "daily") {
      dates.push(toDateString(cursor));
    } else if (template.recurrence_type === "weekly" && template.recurrence_days) {
      const dayOfWeek = getISODayOfWeek(cursor);
      if (template.recurrence_days.includes(dayOfWeek)) {
        dates.push(toDateString(cursor));
      }
    }

    cursor = addDays(cursor, 1);
  }

  return dates;
}

export async function generateRecurringTasks(): Promise<number> {
  // Use the real Supabase URL for server-side calls (not the proxied URL)
  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: templates, error } = await supabase
    .from("recurring_task_templates")
    .select("*")
    .eq("is_active", true);

  if (error || !templates) return 0;

  let totalGenerated = 0;

  for (const template of templates as RecurringTemplate[]) {
    const dates = getDatesToGenerate(template, today);
    if (dates.length === 0) continue;

    let lastDate = template.last_generated_date;

    for (const date of dates) {
      // Create task with recurring_template_id and recurring_date for uniqueness
      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .insert({
          title: template.title,
          type: template.type,
          due_date: `${date}T23:59:00+08:00`, // CST end of day
          created_by: template.created_by,
          recurring_template_id: template.id,
          recurring_date: date,
        })
        .select("id")
        .single();

      if (taskError || !task) {
        // Likely a duplicate (unique constraint), skip
        continue;
      }

      // Create assignments for each student
      const assignments = template.student_ids.map((studentId) => ({
        task_id: task.id,
        student_id: studentId,
      }));

      await supabase.from("task_assignments").insert(assignments);

      lastDate = date;
      totalGenerated++;
    }

    // Update last_generated_date
    if (lastDate && lastDate !== template.last_generated_date) {
      await supabase
        .from("recurring_task_templates")
        .update({ last_generated_date: lastDate })
        .eq("id", template.id);
    }
  }

  return totalGenerated;
}
