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
