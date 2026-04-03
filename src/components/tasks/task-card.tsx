"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TASK_TYPES, TASK_PRIORITIES, TASK_PRIORITY_COLORS } from "@/lib/constants";
import type { TaskType, TaskPriority } from "@/lib/supabase/types";

export interface TaskCardData {
  id: string;          // assignment id
  taskId: string;      // task id (for editing task info)
  status: string;
  taskTitle: string;
  taskDescription: string | null;
  taskType: TaskType;
  priority: TaskPriority;
  studentName: string;
  dueDate: string;       // formatted display string
  dueDateRaw: string;    // ISO string for computation
  note: string | null;
  testResults: {
    subject: string;
    total_questions: number;
    wrong_count: number;
  }[];
}

const typeColors: Record<TaskType, string> = {
  dictation: "bg-purple-50 text-purple-600",
  recitation: "bg-blue-50 text-blue-600",
  correction: "bg-orange-50 text-orange-600",
  homework: "bg-green-50 text-green-600",
  other: "bg-[#F4F5F6] text-[#4D5766]",
};

function getDueDateBadge(dueDateRaw: string, status: string) {
  // 已确认的任务不显示截止标识
  if (status === "confirmed") return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDateRaw);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: `逾期${Math.abs(diffDays)}天`, className: "bg-red-100 text-red-600" };
  }
  if (diffDays === 0) {
    return { label: "今天截止", className: "bg-amber-100 text-amber-700" };
  }
  if (diffDays === 1) {
    return { label: "明天截止", className: "bg-blue-50 text-blue-600" };
  }
  return null;
}

export function TaskCard({
  card,
  onClick,
}: {
  card: TaskCardData;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, data: { status: card.status } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dueBadge = getDueDateBadge(card.dueDateRaw, card.status);
  const priorityColor = TASK_PRIORITY_COLORS[card.priority];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`cursor-pointer rounded-2xl border border-[#E8EAED] bg-white p-4 transition-all duration-150 hover:border-[#B4BCC8] border-l-[3px] ${priorityColor.border} ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      {/* 第一行：类型 + 优先级 + 日期 */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeColors[card.taskType]}`}
        >
          {TASK_TYPES[card.taskType]}
        </span>
        {card.priority !== "medium" && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityColor.bg} ${priorityColor.text}`}
          >
            {TASK_PRIORITIES[card.priority]}
          </span>
        )}
        {dueBadge && (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${dueBadge.className}`}>
            {dueBadge.label}
          </span>
        )}
        <span className="ml-auto text-xs text-[#B4BCC8] flex-shrink-0">{card.dueDate}</span>
      </div>

      {/* 标题 */}
      <p className="mt-2.5 text-[13px] font-medium text-[#2E3338] line-clamp-2">{card.taskTitle}</p>

      {/* 描述预览 */}
      {card.taskDescription && (
        <p className="mt-1 text-xs text-[#B4BCC8] line-clamp-1">{card.taskDescription}</p>
      )}

      {/* 学生 */}
      <p className="mt-1.5 text-xs text-[#B4BCC8]">{card.studentName}</p>

      {/* 成绩 */}
      {card.testResults.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {card.testResults.map((r, i) => (
            <span
              key={i}
              className="rounded-full bg-[#F4F5F6] px-2 py-0.5 text-xs text-[#4D5766]"
            >
              {r.subject} {r.total_questions}错{r.wrong_count}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
