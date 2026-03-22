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
  dictation: "bg-purple-100 text-purple-700",
  recitation: "bg-blue-100 text-blue-700",
  correction: "bg-orange-100 text-orange-700",
  homework: "bg-green-100 text-green-700",
  other: "bg-zinc-100 text-zinc-700",
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
      className={`cursor-pointer rounded-lg border bg-white p-3 shadow-sm hover:shadow-md transition-shadow ${
        isDragging ? "opacity-50 shadow-lg" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`rounded px-2 py-0.5 text-xs font-medium ${typeColors[card.taskType]}`}
        >
          {TASK_TYPES[card.taskType]}
        </span>
        <span className="text-xs text-zinc-400">{card.dueDate}</span>
      </div>
      <p className="mt-2 text-sm font-medium text-zinc-900">{card.taskTitle}</p>
      <p className="mt-1 text-xs text-zinc-500">{card.studentName}</p>

      {card.testResults.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {card.testResults.map((r, i) => (
            <span
              key={i}
              className="rounded bg-zinc-50 px-1.5 py-0.5 text-xs text-zinc-600"
            >
              {r.subject} {r.total_questions}错{r.wrong_count}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
