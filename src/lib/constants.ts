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
  confirmed: "已确认",
  rejected: "已打回",
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
