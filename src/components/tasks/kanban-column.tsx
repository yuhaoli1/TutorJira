"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { TaskCard, type TaskCardData } from "./task-card";

const columnColors: Record<string, string> = {
  pending: "border-t-zinc-400",
  submitted: "border-t-amber-400",
  confirmed: "border-t-green-400",
  rejected: "border-t-red-400",
};

export function KanbanColumn({
  status,
  label,
  cards,
  onCardClick,
}: {
  status: string;
  label: string;
  cards: TaskCardData[];
  onCardClick: (card: TaskCardData) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      className={`flex min-w-[260px] flex-1 flex-col rounded-xl border-t-4 bg-zinc-50 ${columnColors[status] ?? "border-t-zinc-300"}`}
    >
      <div className="flex items-center justify-between px-3 py-3">
        <h3 className="text-sm font-semibold text-zinc-700">{label}</h3>
        <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-600">
          {cards.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2 transition-colors ${
          isOver ? "bg-blue-50/50" : ""
        }`}
        style={{ minHeight: 100 }}
      >
        <SortableContext
          items={cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card) => (
            <TaskCard
              key={card.id}
              card={card}
              onClick={() => onCardClick(card)}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
