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
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { KanbanColumn } from "./kanban-column";
import { TaskCard, type TaskCardData } from "./task-card";
import { TaskCreatePanel } from "./task-create-panel";
import type { TaskPriority } from "@/lib/supabase/types";
import type { Label } from "./label-picker";

const COLUMNS = [
  { status: "pending", label: TASK_STATUS.pending },
  { status: "submitted", label: TASK_STATUS.submitted },
  { status: "confirmed", label: TASK_STATUS.confirmed },
  { status: "rejected", label: TASK_STATUS.rejected },
] as const;

// Priority sort order (urgent first)
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

export function KanbanBoard({ isTeacher, allowedStudentIds, hideStudentFilter, basePath }: { isTeacher: boolean; allowedStudentIds?: string[]; hideStudentFilter?: boolean; basePath: string }) {
  const [cards, setCards] = useState<TaskCardData[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [activeCard, setActiveCard] = useState<TaskCardData | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const fetchBoard = useCallback(async () => {
    // Generate any pending recurring tasks
    if (isTeacher) {
      await fetch("/api/recurring-tasks/generate", { method: "POST" });
    }

    // Fetch assignments with joined data (now including description and priority)
    let query = supabase
      .from("task_assignments")
      .select(
        `
        id, status, note, ticket_number, created_at,
        task:tasks(id, title, description, type, due_date, priority),
        student:students(id, name)
      `
      )
      .order("created_at", { ascending: false });

    // Filter by allowed students (for parent/student view)
    if (allowedStudentIds && allowedStudentIds.length > 0) {
      query = query.in("student_id", allowedStudentIds);
    } else if (allowedStudentIds && allowedStudentIds.length === 0) {
      setCards([]);
      setStudents([]);
      return;
    }

    const { data: assignments } = await query;

    if (!assignments) return;

    // Fetch test results, comment counts, attachment counts in parallel
    const assignmentIds = assignments.map((a) => a.id);
    const safeIds = assignmentIds.length > 0 ? assignmentIds : ["__none__"];

    const [testResultsRes, commentsRes, attachmentsRes] = await Promise.all([
      supabase.from("test_results").select("*").in("task_assignment_id", safeIds),
      supabase.from("task_comments").select("id, task_assignment_id").in("task_assignment_id", safeIds),
      supabase.from("task_attachments").select("id, task_assignment_id").in("task_assignment_id", safeIds),
    ]);

    const resultsMap = new Map<string, NonNullable<typeof testResultsRes.data>>();
    testResultsRes.data?.forEach((r) => {
      const existing = resultsMap.get(r.task_assignment_id) ?? [];
      existing.push(r);
      resultsMap.set(r.task_assignment_id, existing);
    });

    const commentCountMap = new Map<string, number>();
    commentsRes.data?.forEach((c) => {
      commentCountMap.set(c.task_assignment_id, (commentCountMap.get(c.task_assignment_id) ?? 0) + 1);
    });

    const attachCountMap = new Map<string, number>();
    attachmentsRes.data?.forEach((a) => {
      attachCountMap.set(a.task_assignment_id, (attachCountMap.get(a.task_assignment_id) ?? 0) + 1);
    });

    // Fetch task IDs for label and question lookups
    const taskIds = [...new Set(
      assignments
        .filter((a) => a.task)
        .map((a) => (a.task as unknown as { id: string }).id)
    )];
    const safeTaskIds = taskIds.length > 0 ? taskIds : ["__none__"];

    const [labelsRes, questionsCountRes] = await Promise.all([
      supabase
        .from("task_label_map")
        .select("task_id, label:task_labels(id, name, color)")
        .in("task_id", safeTaskIds),
      supabase
        .from("task_questions")
        .select("task_id")
        .in("task_id", safeTaskIds),
    ]);

    // Build label map: taskId -> Label[]
    const labelMap = new Map<string, Label[]>();
    labelsRes.data?.forEach((row) => {
      const r = row as unknown as { task_id: string; label: Label };
      if (r.label) {
        const existing = labelMap.get(r.task_id) ?? [];
        existing.push(r.label);
        labelMap.set(r.task_id, existing);
      }
    });

    // Build question count map: taskId -> count
    const qCountMap = new Map<string, number>();
    questionsCountRes.data?.forEach((q) => {
      qCountMap.set(q.task_id, (qCountMap.get(q.task_id) ?? 0) + 1);
    });

    const cardData: TaskCardData[] = assignments
      .filter((a) => a.task && a.student)
      .map((a) => {
        const task = a.task as unknown as {
          id: string;
          title: string;
          description: string | null;
          type: string;
          due_date: string;
          priority: TaskPriority;
        };
        const student = a.student as unknown as { id: string; name: string };
        const results = resultsMap.get(a.id) ?? [];
        return {
          id: a.id,
          taskId: task.id,
          ticketNumber: (a as unknown as { ticket_number: number }).ticket_number || 0,
          status: a.status,
          taskTitle: task.title,
          taskDescription: task.description,
          taskType: task.type as TaskCardData["taskType"],
          priority: task.priority || "medium",
          studentName: student.name,
          dueDate: new Date(task.due_date).toLocaleDateString("zh-CN", {
            month: "numeric",
            day: "numeric",
          }),
          dueDateRaw: task.due_date,
          note: a.note,
          labels: labelMap.get(task.id) ?? [],
          questionCount: qCountMap.get(task.id) ?? 0,
          attachmentCount: attachCountMap.get(a.id) ?? 0,
          commentCount: commentCountMap.get(a.id) ?? 0,
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
  }, [supabase, allowedStudentIds]);

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

  // Sort cards within columns by priority
  const getColumnCards = (status: string) =>
    filteredCards
      .filter((c) => c.status === status)
      .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2));

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
              cards={getColumnCards(col.status)}
              onCardClick={(card) => router.push(`${basePath}/${card.id}`)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeCard ? (
            <div className="rotate-2 opacity-90">
              <TaskCard card={activeCard} onClick={() => {}} />
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
    </div>
  );
}
