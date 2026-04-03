"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { TaskCard, type TaskCardData } from "./task-card";

const dotColors: Record<string, string> = {
  pending: "bg-[#B4BCC8]",
  submitted: "bg-amber-400",
  confirmed: "bg-green-400",
  rejected: "bg-red-400",
};

export function KanbanColumn({
  status,
  label,
  cards,
  basePath,
  onCardClick,
}: {
  status: string;
  label: string;
  cards: TaskCardData[];
  basePath?: string;
  onCardClick?: (card: TaskCardData) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex min-w-[280px] flex-1 flex-col rounded-2xl bg-[#F4F5F6]">
      <div className="flex items-center gap-2 px-4 py-4">
        <span className={`h-2 w-2 rounded-full ${dotColors[status] ?? "bg-[#B4BCC8]"}`} />
        <h3 className="text-[13px] font-semibold text-[#2E3338]">{label}</h3>
        <span className="ml-auto text-xs font-medium text-[#B4BCC8]">
          {cards.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex flex-1 flex-col gap-3 overflow-y-auto px-3 pb-3 transition-colors duration-150 ${
          isOver ? "bg-[#9FE870]/10" : ""
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
              detailUrl={basePath ? `${basePath}/${card.id}` : undefined}
              onClick={onCardClick ? () => onCardClick(card) : undefined}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
