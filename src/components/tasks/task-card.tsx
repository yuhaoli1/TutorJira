"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TASK_TYPES } from "@/lib/constants";
import type { TaskType } from "@/lib/supabase/types";

export interface TaskCardData {
  id: string;
  status: string;
  taskTitle: string;
  taskType: TaskType;
  studentName: string;
  dueDate: string;
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`cursor-pointer rounded-2xl border border-[#E8EAED] bg-white p-4 transition-all duration-150 hover:border-[#B4BCC8] ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeColors[card.taskType]}`}
        >
          {TASK_TYPES[card.taskType]}
        </span>
        <span className="text-xs text-[#B4BCC8]">{card.dueDate}</span>
      </div>
      <p className="mt-2.5 text-[13px] font-medium text-[#2E3338]">{card.taskTitle}</p>
      <p className="mt-1 text-xs text-[#B4BCC8]">{card.studentName}</p>

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
