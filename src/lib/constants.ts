// UI label constants. These mirror the keys used by the database/enum types
// and are referenced via lookups like `ROLES[user.role]` throughout the app.
// As the app moves toward full next-intl coverage, these can be replaced
// piecemeal by `t()` calls and this file will eventually shrink to types only.

export const ROLES = {
  admin: "Administrator",
  teacher: "Teacher",
  parent: "Parent",
  student: "Student",
} as const;

export const TASK_TYPES = {
  dictation: "Dictation",
  recitation: "Recitation",
  correction: "Corrections",
  homework: "Homework",
  other: "Other",
} as const;

export const TASK_STATUS = {
  pending: "Pending",
  submitted: "Submitted",
  confirmed: "Approved",
  rejected: "Returned",
  closed: "Closed",
} as const;

export const TASK_PRIORITIES = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
} as const;

export const TASK_PRIORITY_COLORS = {
  urgent: { bg: "bg-red-50", text: "text-red-600", border: "border-l-red-500", dot: "bg-red-500" },
  high: { bg: "bg-orange-50", text: "text-orange-600", border: "border-l-orange-400", dot: "bg-orange-400" },
  medium: { bg: "bg-blue-50", text: "text-blue-500", border: "border-l-blue-400", dot: "bg-blue-400" },
  low: { bg: "bg-[#F4F5F6]", text: "text-[#B4BCC8]", border: "border-l-[#B4BCC8]", dot: "bg-[#B4BCC8]" },
} as const;

export const ACTIVITY_ACTIONS = {
  created: "created the task",
  status_change: "changed the status",
  note_added: "added a note",
  result_recorded: "recorded a result",
  priority_changed: "changed the priority",
  task_closed: "closed the task",
} as const;

export const CHECKIN_FREQUENCY = {
  daily: "Daily",
  weekly: "Weekly",
} as const;

export const RECURRENCE_TYPES = {
  daily: "Daily",
  weekly: "Weekly",
} as const;

export const WEEKDAYS = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  7: "Sun",
} as const;

export const QUESTION_TYPES = {
  choice: "Multiple choice",
  fill_blank: "Fill in the blank",
  solution: "Free response",
} as const;

export const DIFFICULTY_LABELS = {
  1: "Very easy",
  2: "Easy",
  3: "Medium",
  4: "Hard",
  5: "Very hard",
} as const;

export const UPLOAD_STATUS = {
  pending: "Queued",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
} as const;

export const GRADES = ["Grade 5", "Grade 6"] as const;

export const SUBJECTS = [
  "Math",
  "English language arts",
  "Reading",
  "Writing",
  "Science",
  "Physics",
  "Chemistry",
  "Biology",
  "History",
  "Geography",
  "Social studies",
  "Spelling",
] as const;

// Tag system — dimension slug constants
export const TAG_CATEGORIES = {
  KNOWLEDGE_POINT: "knowledge_point",
  QUESTION_TYPE: "question_type",
  DIFFICULTY: "difficulty",
  SOLUTION_APPROACH: "solution_approach",
  GRADE: "grade",
} as const;

// Tag dimension UI config — to add a new dimension, add a row here
// (or skip — defaults will be used). `label` overrides the DB `name`,
// `required` controls save-time validation, `placeholder` is for the picker.
export interface TagCategoryUIConfig {
  label: string;
  required?: boolean;
  placeholder?: string;
  /** AI auto-match field key (corresponds to the JSON key returned by the AI) */
  aiFieldKey?: string;
}

export const TAG_CATEGORY_UI: Record<string, TagCategoryUIConfig> = {
  knowledge_point: { label: "Topic", required: true, placeholder: "Select a topic...", aiFieldKey: "suggested_topic" },
  question_type: { label: "Question type", aiFieldKey: "type" },
  difficulty: { label: "Difficulty", aiFieldKey: "difficulty" },
  solution_approach: { label: "Solution approach", placeholder: "Select a solution approach..." },
  grade: { label: "Grade level" },
};

// Get the UI config for a category slug; unknown slugs get sensible defaults.
export function getTagCategoryUI(slug: string, dbName?: string): TagCategoryUIConfig {
  return TAG_CATEGORY_UI[slug] || { label: dbName || slug };
}
