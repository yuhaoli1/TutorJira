// UI 文字常量 — 方便后续国际化
export const ROLES = {
  admin: "管理员",
  teacher: "老师",
  parent: "家长",
  student: "学生",
} as const;

export const TASK_TYPES = {
  dictation: "默写",
  recitation: "背诵",
  correction: "错题订正",
  homework: "作业",
  other: "其他",
} as const;

export const TASK_STATUS = {
  pending: "待完成",
  submitted: "已提交",
  confirmed: "已批阅通过",
  rejected: "已打回",
  closed: "已关闭",
} as const;

export const TASK_PRIORITIES = {
  urgent: "紧急",
  high: "高",
  medium: "中",
  low: "低",
} as const;

export const TASK_PRIORITY_COLORS = {
  urgent: { bg: "bg-red-50", text: "text-red-600", border: "border-l-red-500", dot: "bg-red-500" },
  high: { bg: "bg-orange-50", text: "text-orange-600", border: "border-l-orange-400", dot: "bg-orange-400" },
  medium: { bg: "bg-blue-50", text: "text-blue-500", border: "border-l-blue-400", dot: "bg-blue-400" },
  low: { bg: "bg-[#F4F5F6]", text: "text-[#B4BCC8]", border: "border-l-[#B4BCC8]", dot: "bg-[#B4BCC8]" },
} as const;

export const ACTIVITY_ACTIONS = {
  created: "创建了任务",
  status_change: "更改了状态",
  note_added: "添加了备注",
  result_recorded: "录入了成绩",
  priority_changed: "更改了优先级",
  task_closed: "关闭了任务",
} as const;

export const CHECKIN_FREQUENCY = {
  daily: "每日",
  weekly: "每周",
} as const;

export const RECURRENCE_TYPES = {
  daily: "每天",
  weekly: "每周",
} as const;

export const WEEKDAYS = {
  1: "周一",
  2: "周二",
  3: "周三",
  4: "周四",
  5: "周五",
  6: "周六",
  7: "周日",
} as const;

export const QUESTION_TYPES = {
  choice: "选择题",
  fill_blank: "填空题",
  solution: "解答题",
} as const;

export const DIFFICULTY_LABELS = {
  1: "简单",
  2: "较简单",
  3: "中等",
  4: "较难",
  5: "困难",
} as const;

export const UPLOAD_STATUS = {
  pending: "等待处理",
  processing: "处理中",
  completed: "已完成",
  failed: "处理失败",
} as const;

export const GRADES = ["五年级", "六年级"] as const;

export const SUBJECTS = [
  "数学",
  "语文",
  "英语",
  "物理",
  "化学",
  "政治",
  "历史",
  "地理",
  "生物",
  "中译英",
  "英译中",
  "阅读",
  "完型",
  "默写",
] as const;

// 标签系统 — 维度 slug 常量
export const TAG_CATEGORIES = {
  KNOWLEDGE_POINT: "knowledge_point",
  QUESTION_TYPE: "question_type",
  DIFFICULTY: "difficulty",
  SOLUTION_APPROACH: "solution_approach",
  GRADE: "grade",
} as const;

// 标签维度 UI 配置 — 新增维度只需在这里加一行（或不加，会用默认值）
// label 会覆盖数据库的 name；required 控制保存校验；placeholder 用于选择器
export interface TagCategoryUIConfig {
  label: string;
  required?: boolean;
  placeholder?: string;
  /** 用于 AI 自动匹配时的字段映射 key（对应 AI 返回的 JSON key） */
  aiFieldKey?: string;
}

export const TAG_CATEGORY_UI: Record<string, TagCategoryUIConfig> = {
  knowledge_point: { label: "知识点", required: true, placeholder: "选择知识点...", aiFieldKey: "suggested_topic" },
  question_type: { label: "题型", aiFieldKey: "type" },
  difficulty: { label: "难度", aiFieldKey: "difficulty" },
  solution_approach: { label: "解题思路", placeholder: "选择解题思路..." },
  grade: { label: "适用年级" },
};

// 获取某个分类的 UI 配置（未知分类返回合理默认值）
export function getTagCategoryUI(slug: string, dbName?: string): TagCategoryUIConfig {
  return TAG_CATEGORY_UI[slug] || { label: dbName || slug };
}
