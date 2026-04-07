import { createClient } from "@supabase/supabase-js";
import type { TaskType, TaskPriority } from "./supabase/types";

const LOOK_AHEAD_DAYS = 7;

interface RecurringTemplate {
  id: string;
  title: string;
  type: TaskType;
  priority: TaskPriority;
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

  // ✅ Collect every task to create, then bulk-insert at the end
  const allTaskInserts: {
    title: string;
    type: TaskType;
    priority: TaskPriority;
    due_date: string;
    created_by: string;
    recurring_template_id: string;
    recurring_date: string;
  }[] = [];

  const templateDateMap = new Map<string, string>(); // templateId -> lastDate

  for (const template of templates as RecurringTemplate[]) {
    const dates = getDatesToGenerate(template, today);
    if (dates.length === 0) continue;

    for (const date of dates) {
      allTaskInserts.push({
        title: template.title,
        type: template.type,
        priority: template.priority || "medium",
        due_date: `${date}T23:59:00+08:00`,
        created_by: template.created_by,
        recurring_template_id: template.id,
        recurring_date: date,
      });
    }

    // Record the last date for each template
    templateDateMap.set(template.id, dates[dates.length - 1]);
  }

  if (allTaskInserts.length === 0) return 0;

  // ✅ Bulk-insert all tasks (duplicates are skipped by the unique constraint)
  const { data: createdTasks } = await supabase
    .from("tasks")
    .upsert(allTaskInserts, {
      onConflict: "recurring_template_id,recurring_date",
      ignoreDuplicates: true,
    })
    .select("id, recurring_template_id");

  if (!createdTasks || createdTasks.length === 0) return 0;

  // ✅ Bulk-create all assignments
  const allAssignments: { task_id: string; student_id: string }[] = [];
  const templateStudentMap = new Map<string, string[]>();
  for (const t of templates as RecurringTemplate[]) {
    templateStudentMap.set(t.id, t.student_ids);
  }

  for (const task of createdTasks) {
    const studentIds = templateStudentMap.get(task.recurring_template_id) ?? [];
    for (const studentId of studentIds) {
      allAssignments.push({ task_id: task.id, student_id: studentId });
    }
  }

  if (allAssignments.length > 0) {
    await supabase.from("task_assignments").insert(allAssignments);
  }

  totalGenerated = createdTasks.length;

  // ✅ Bulk-update last_generated_date
  const updatePromises = Array.from(templateDateMap.entries()).map(
    ([templateId, lastDate]) =>
      supabase
        .from("recurring_task_templates")
        .update({ last_generated_date: lastDate })
        .eq("id", templateId)
  );
  if (updatePromises.length > 0) {
    await Promise.all(updatePromises);
  }

  return totalGenerated;
}
