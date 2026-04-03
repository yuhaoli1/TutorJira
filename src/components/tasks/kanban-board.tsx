"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { createClient } from "@/lib/supabase/client";
import { fetchBoardData } from "@/lib/fetch-board-data";
import { TASK_STATUS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { KanbanColumn } from "./kanban-column";
import { TaskCard, type TaskCardData } from "./task-card";
import { TaskCreatePanel } from "./task-create-panel";
import { TaskDetailPanel } from "./task-detail-panel";

const COLUMNS = [
  { status: "pending", label: TASK_STATUS.pending },
  { status: "submitted", label: TASK_STATUS.submitted },
  { status: "confirmed", label: TASK_STATUS.confirmed },
  { status: "rejected", label: TASK_STATUS.rejected },
] as const;

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

interface Student {
  id: string;
  name: string;
}

interface KanbanBoardProps {
  isTeacher: boolean;
  allowedStudentIds?: string[];
  hideStudentFilter?: boolean;
  basePath: string;
  initialCards?: TaskCardData[];
  initialStudents?: Student[];
}

export function KanbanBoard({
  isTeacher,
  allowedStudentIds,
  hideStudentFilter,
  basePath,
  initialCards,
  initialStudents,
}: KanbanBoardProps) {
  // ✅ 用服务端预取的数据初始化，首屏立即显示
  const [cards, setCards] = useState<TaskCardData[]>(initialCards ?? []);
  const [students, setStudents] = useState<Student[]>(initialStudents ?? []);
  const [selectedStudent, setSelectedStudent] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCard, setSelectedCard] = useState<TaskCardData | null>(null);
  const [activeCard, setActiveCard] = useState<TaskCardData | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // 客户端刷新（创建/更新/拖拽后用）
  const fetchBoard = useCallback(async () => {
    const { cards: newCards, students: newStudents } = await fetchBoardData(
      supabase,
      { allowedStudentIds }
    );
    setCards(newCards);
    setStudents(newStudents);
  }, [supabase, allowedStudentIds]);

  // 如果没有 initialData，首次加载走客户端获取（兜底）
  useEffect(() => {
    if (!initialCards) {
      fetchBoard();
    }
    // fire-and-forget: 生成周期任务
    if (isTeacher) {
      fetch("/api/recurring-tasks/generate", { method: "POST" });
    }
  }, [fetchBoard, initialCards, isTeacher]);

  // useMemo: 过滤 + 分列
  const filteredCards = useMemo(() => {
    if (selectedStudent === "all") return cards;
    const studentIdByName = new Map(students.map((s) => [s.name, s.id]));
    return cards.filter((c) => studentIdByName.get(c.studentName) === selectedStudent);
  }, [cards, students, selectedStudent]);

  const columnCardsMap = useMemo(() => {
    const map = new Map<string, TaskCardData[]>();
    for (const col of COLUMNS) {
      map.set(
        col.status,
        filteredCards
          .filter((c) => c.status === col.status)
          .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2))
      );
    }
    return map;
  }, [filteredCards]);

  const handleDragStart = (event: DragStartEvent) => {
    const card = cards.find((c) => c.id === event.active.id);
    setActiveCard(card ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveCard(null);
    const { active, over } = event;
    if (!over) return;

    const cardId = active.id as string;
    const newStatus = over.id as string;

    if (!COLUMNS.some((c) => c.status === newStatus)) return;

    const card = cards.find((c) => c.id === cardId);
    if (!card || card.status === newStatus) return;

    const oldStatus = card.status;

    // Optimistic update
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, status: newStatus } : c))
    );

    // Update in DB
    const updateData: Record<string, unknown> = { status: newStatus };
    if (newStatus === "submitted")
      updateData.submitted_at = new Date().toISOString();
    if (newStatus === "confirmed")
      updateData.confirmed_at = new Date().toISOString();

    await supabase
      .from("task_assignments")
      .update(updateData)
      .eq("id", cardId);

    // Log activity
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("task_activity_log").insert({
        task_assignment_id: cardId,
        action: "status_change",
        old_value: oldStatus,
        new_value: newStatus,
        performed_by: user.id,
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          {!hideStudentFilter && (
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="rounded-lg border-[1.5px] border-[#B4BCC8] bg-white px-3 py-2 text-[13px] text-[#2E3338] outline-none focus:border-[#163300] focus:ring-2 focus:ring-[#163300]/15 transition-colors duration-150"
            >
              <option value="all">全部学生</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </div>
        {isTeacher && (
          <Button onClick={() => setShowCreate(true)} size="sm">
            + 新建任务
          </Button>
        )}
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-5 overflow-x-auto pb-4 flex-1">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.status}
              status={col.status}
              label={col.label}
              cards={columnCardsMap.get(col.status) ?? []}
              basePath={basePath}
              onCardClick={(card) => setSelectedCard(card)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeCard ? (
            <div className="rotate-2 opacity-90">
              <TaskCard card={activeCard} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {showCreate && (
        <TaskCreatePanel
          onClose={() => setShowCreate(false)}
          onCreate={() => {
            setShowCreate(false);
            fetchBoard();
          }}
        />
      )}

      {selectedCard && (
        <TaskDetailPanel
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onUpdate={() => {
            setSelectedCard(null);
            fetchBoard();
          }}
          isTeacher={isTeacher}
        />
      )}
    </div>
  );
}
