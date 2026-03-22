"use client";

import { useState, useEffect, useCallback } from "react";
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
import { TASK_STATUS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { KanbanColumn } from "./kanban-column";
import { TaskCard, type TaskCardData } from "./task-card";
import { TaskDetailPanel } from "./task-detail-panel";
import { TaskCreatePanel } from "./task-create-panel";

const COLUMNS = [
  { status: "pending", label: TASK_STATUS.pending },
  { status: "submitted", label: TASK_STATUS.submitted },
  { status: "confirmed", label: TASK_STATUS.confirmed },
  { status: "rejected", label: TASK_STATUS.rejected },
] as const;

interface Student {
  id: string;
  name: string;
}

export function KanbanBoard({ isTeacher }: { isTeacher: boolean }) {
  const [cards, setCards] = useState<TaskCardData[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>("all");
  const [selectedCard, setSelectedCard] = useState<TaskCardData | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [activeCard, setActiveCard] = useState<TaskCardData | null>(null);
  const supabase = createClient();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const fetchBoard = useCallback(async () => {
    // Fetch assignments with joined data
    const { data: assignments } = await supabase
      .from("task_assignments")
      .select(
        `
        id, status, note, created_at,
        task:tasks(id, title, type, due_date),
        student:students(id, name)
      `
      )
      .order("created_at", { ascending: false });

    if (!assignments) return;

    // Fetch test results for all assignments
    const assignmentIds = assignments.map((a) => a.id);
    const { data: testResults } = await supabase
      .from("test_results")
      .select("*")
      .in("task_assignment_id", assignmentIds.length > 0 ? assignmentIds : ["__none__"]);

    const resultsMap = new Map<string, typeof testResults>();
    testResults?.forEach((r) => {
      const existing = resultsMap.get(r.task_assignment_id) ?? [];
      existing.push(r);
      resultsMap.set(r.task_assignment_id, existing);
    });

    const cardData: TaskCardData[] = assignments
      .filter((a) => a.task && a.student)
      .map((a) => {
        const task = a.task as unknown as { id: string; title: string; type: string; due_date: string };
        const student = a.student as unknown as { id: string; name: string };
        const results = resultsMap.get(a.id) ?? [];
        return {
          id: a.id,
          status: a.status,
          taskTitle: task.title,
          taskType: task.type as TaskCardData["taskType"],
          studentName: student.name,
          dueDate: new Date(task.due_date).toLocaleDateString("zh-CN", {
            month: "numeric",
            day: "numeric",
          }),
          note: a.note,
          testResults: results.map((r) => ({
            subject: r.subject,
            total_questions: r.total_questions,
            wrong_count: r.wrong_count,
          })),
        };
      });

    setCards(cardData);

    // Extract unique students
    const uniqueStudents = new Map<string, string>();
    assignments.forEach((a) => {
      const student = a.student as unknown as { id: string; name: string };
      if (student) uniqueStudents.set(student.id, student.name);
    });
    setStudents(
      Array.from(uniqueStudents.entries()).map(([id, name]) => ({ id, name }))
    );
  }, [supabase]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  const filteredCards =
    selectedStudent === "all"
      ? cards
      : cards.filter((c) => {
          const student = students.find((s) => s.name === c.studentName);
          return student?.id === selectedStudent;
        });

  const getColumnCards = (status: string) =>
    filteredCards.filter((c) => c.status === status);

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

    // Only allow status changes if it's a column drop
    if (!COLUMNS.some((c) => c.status === newStatus)) return;

    const card = cards.find((c) => c.id === cardId);
    if (!card || card.status === newStatus) return;

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
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <select
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm outline-none focus:border-blue-500"
          >
            <option value="all">全部学生</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
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
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.status}
              status={col.status}
              label={col.label}
              cards={getColumnCards(col.status)}
              onCardClick={(card) => setSelectedCard(card)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeCard ? (
            <div className="rotate-3 scale-105">
              <TaskCard card={activeCard} onClick={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Panels */}
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

      {showCreate && (
        <TaskCreatePanel
          onClose={() => setShowCreate(false)}
          onCreate={() => {
            setShowCreate(false);
            fetchBoard();
          }}
        />
      )}
    </div>
  );
}
