"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { TASK_TYPES, TASK_STATUS, TASK_PRIORITIES, TASK_PRIORITY_COLORS, ACTIVITY_ACTIONS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { TestResultForm, type TestResultRow } from "./test-result-form";
import { TaskComments } from "./task-comments";
import { TaskAttachments } from "./task-attachments";
import { TaskQuestionPicker, TaskQuestionList } from "./task-questions";
import { LabelPicker, LabelChips, type Label } from "./label-picker";
import type { TaskCardData } from "./task-card";
import type { TaskType, TaskPriority } from "@/lib/supabase/types";

interface ActivityItem {
  id: string;
  action: string;
  old_value: string | null;
  new_value: string | null;
  performed_by: string;
  created_at: string;
  performer_name?: string;
}

export function TaskDetailPanel({
  card,
  onClose,
  onUpdate,
  isTeacher,
}: {
  card: TaskCardData;
  onClose: () => void;
  onUpdate: () => void;
  isTeacher: boolean;
}) {
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState(card.note ?? "");
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [showActivity, setShowActivity] = useState(false);

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(card.taskTitle);
  const [editDescription, setEditDescription] = useState(card.taskDescription ?? "");
  const [editType, setEditType] = useState<TaskType>(card.taskType);
  const [editPriority, setEditPriority] = useState<TaskPriority>(card.priority);
  const [editDueDate, setEditDueDate] = useState(card.dueDateRaw.split("T")[0]);

  // Labels state
  const [labelIds, setLabelIds] = useState<string[]>(card.labels.map((l) => l.id));
  const [practiceQuestionIds, setPracticeQuestionIds] = useState<string[] | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const supabase = createClient();

  // Sync labels to DB when they change
  const syncLabels = async (newIds: string[]) => {
    setLabelIds(newIds);
    // Remove all existing
    await supabase.from("task_label_map").delete().eq("task_id", card.taskId);
    // Insert new
    if (newIds.length > 0) {
      await supabase.from("task_label_map").insert(
        newIds.map((labelId) => ({ task_id: card.taskId, label_id: labelId }))
      );
    }
  };

  // Fetch activity log
  useEffect(() => {
    const fetchActivities = async () => {
      const { data } = await supabase
        .from("task_activity_log")
        .select("*")
        .eq("task_assignment_id", card.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map((a) => a.performed_by))];
        const { data: users } = await supabase
          .from("users")
          .select("id, name")
          .in("id", userIds);

        const nameMap = new Map(users?.map((u) => [u.id, u.name]) ?? []);

        setActivities(
          data.map((a) => ({
            ...a,
            performer_name: nameMap.get(a.performed_by) || "Unknown",
          }))
        );
      }
    };
    fetchActivities();
  }, [card.id, supabase]);

  const logActivity = async (action: string, oldVal?: string | null, newVal?: string | null) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("task_activity_log").insert({
        task_assignment_id: card.id,
        action,
        old_value: oldVal ?? null,
        new_value: newVal ?? null,
        performed_by: user.id,
      });
    }
  };

  const updateStatus = async (status: string) => {
    setSaving(true);
    const oldStatus = card.status;
    const updateData: Record<string, unknown> = { status };
    if (status === "submitted") updateData.submitted_at = new Date().toISOString();
    if (status === "confirmed") updateData.confirmed_at = new Date().toISOString();
    if (note && note !== card.note) updateData.note = note;

    await supabase
      .from("task_assignments")
      .update(updateData)
      .eq("id", card.id);

    await logActivity("status_change", oldStatus, status);

    if (note && note !== card.note) {
      await logActivity("note_added", null, note);
    }

    setSaving(false);
    onUpdate();
  };

  const saveResults = async (results: TestResultRow[]) => {
    setSaving(true);
    await supabase
      .from("test_results")
      .delete()
      .eq("task_assignment_id", card.id);

    await supabase.from("test_results").insert(
      results.map((r) => ({
        task_assignment_id: card.id,
        subject: r.subject,
        total_questions: r.total_questions,
        wrong_count: r.wrong_count,
      }))
    );

    await logActivity("result_recorded", null, results.map((r) => `${r.subject}: ${r.wrong_count}/${r.total_questions} wrong`).join(", "));

    setSaving(false);
    onUpdate();
  };

  // Save task edits
  const saveEdits = async () => {
    setSaving(true);

    const changes: string[] = [];
    if (editTitle !== card.taskTitle) changes.push(`Title: ${card.taskTitle} → ${editTitle}`);
    if (editType !== card.taskType) changes.push(`Type: ${TASK_TYPES[card.taskType]} → ${TASK_TYPES[editType]}`);
    if (editPriority !== card.priority) changes.push(`Priority: ${TASK_PRIORITIES[card.priority]} → ${TASK_PRIORITIES[editPriority]}`);
    if (editDescription !== (card.taskDescription ?? "")) changes.push("Description updated");
    if (editDueDate !== card.dueDateRaw.split("T")[0]) changes.push(`Due date: ${card.dueDateRaw.split("T")[0]} → ${editDueDate}`);

    const { error } = await supabase
      .from("tasks")
      .update({
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        type: editType,
        priority: editPriority,
        due_date: new Date(editDueDate).toISOString(),
      })
      .eq("id", card.taskId);

    if (!error && changes.length > 0) {
      await logActivity("task_edited", null, changes.join("; "));
    }

    // Also save the note (if changed)
    if (note !== (card.note || "")) {
      await supabase
        .from("task_assignments")
        .update({ note })
        .eq("id", card.id);
      await logActivity("note_added", card.note || null, note);
    }

    setSaving(false);
    setEditing(false);
    onUpdate();
  };

  const cancelEdit = () => {
    setEditTitle(card.taskTitle);
    setEditDescription(card.taskDescription ?? "");
    setEditType(card.taskType);
    setEditPriority(card.priority);
    setEditDueDate(card.dueDateRaw.split("T")[0]);
    setEditing(false);
  };

  const priorityColor = TASK_PRIORITY_COLORS[editing ? editPriority : card.priority];

  const formatStatusLabel = (status: string) => {
    return TASK_STATUS[status as keyof typeof TASK_STATUS] || status;
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const typeColors: Record<TaskType, string> = {
    dictation: "bg-purple-50 text-purple-600",
    recitation: "bg-blue-50 text-blue-600",
    correction: "bg-orange-50 text-orange-600",
    homework: "bg-green-50 text-green-600",
    other: "bg-[#F4F5F6] text-[#4D5766]",
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white border-l border-[#E8EAED] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E8EAED] px-6 py-5">
        <h3 className="text-sm font-bold text-[#2E3338]">Task details</h3>
        <div className="flex items-center gap-2">
          {isTeacher && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="rounded-full px-3 py-1 text-xs font-medium text-[#4D5766] hover:bg-[#F4F5F6] transition-colors duration-150"
            >
              Edit
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-[#B4BCC8] hover:bg-[#F4F5F6] hover:text-[#4D5766] transition-colors duration-150"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">

        {editing ? (
          /* ========== Edit mode ========== */
          <div className="space-y-5">
            {/* Type */}
            <div>
              <label className="mb-2 block text-xs text-[#B4BCC8]">Type</label>
              <select
                value={editType}
                onChange={(e) => setEditType(e.target.value as TaskType)}
                className="w-full rounded-lg border-[1.5px] border-[#B4BCC8] bg-white px-3 py-2.5 text-[13px] text-[#2E3338] outline-none focus:border-[#163300] focus:ring-2 focus:ring-[#163300]/15 transition-colors duration-150"
              >
                {Object.entries(TASK_TYPES).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="mb-2 block text-xs text-[#B4BCC8]">Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full rounded-lg border-[1.5px] border-[#B4BCC8] px-3 py-2.5 text-[13px] text-[#2E3338] outline-none focus:border-[#163300] focus:ring-2 focus:ring-[#163300]/15 transition-colors duration-150"
              />
            </div>

            {/* Description */}
            <div>
              <label className="mb-2 block text-xs text-[#B4BCC8]">Description</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Add a task description..."
                rows={3}
                className="w-full rounded-lg border-[1.5px] border-[#B4BCC8] px-3 py-2.5 text-[13px] text-[#2E3338] outline-none focus:border-[#163300] focus:ring-2 focus:ring-[#163300]/15 transition-colors duration-150 resize-none"
              />
            </div>

            {/* Priority */}
            <div>
              <label className="mb-2 block text-xs text-[#B4BCC8]">Priority</label>
              <div className="flex gap-2">
                {(Object.entries(TASK_PRIORITIES) as [TaskPriority, string][]).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setEditPriority(value)}
                    className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-150 ${
                      editPriority === value
                        ? value === "urgent"
                          ? "bg-red-500 text-white"
                          : value === "high"
                            ? "bg-orange-400 text-white"
                            : value === "medium"
                              ? "bg-blue-400 text-white"
                              : "bg-[#B4BCC8] text-white"
                        : "bg-white border border-[#E8EAED] text-[#4D5766] hover:bg-[#F4F5F6]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Due date */}
            <div>
              <label className="mb-2 block text-xs text-[#B4BCC8]">Due date</label>
              <input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                className="w-full rounded-lg border-[1.5px] border-[#B4BCC8] px-3 py-2.5 text-[13px] text-[#2E3338] outline-none focus:border-[#163300] focus:ring-2 focus:ring-[#163300]/15 transition-colors duration-150"
              />
            </div>

            <div className="border-t border-[#E8EAED] pt-4" />

            {/* Results entry */}
            <TestResultForm
              initialResults={card.testResults}
              onSave={saveResults}
              saving={saving}
            />

            {/* Note */}
            <div>
              <label className="text-xs text-[#B4BCC8]">Note</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1.5 w-full rounded-lg border-[1.5px] border-[#B4BCC8] px-3 py-2.5 text-[13px] text-[#2E3338] outline-none focus:border-[#163300] focus:ring-2 focus:ring-[#163300]/15 transition-colors duration-150"
                rows={2}
                placeholder="Add a note..."
              />
            </div>

            {/* Labels */}
            <div className="space-y-2">
              <h4 className="text-[13px] font-medium text-[#2E3338]">Labels</h4>
              <LabelPicker selectedIds={labelIds} onChange={syncLabels} />
            </div>

            {/* Linked questions */}
            <TaskQuestionPicker taskId={card.taskId} onUpdate={onUpdate} initialShowAnswers={card.showAnswersAfterSubmit} />

            {/* Save/Cancel */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={saveEdits}
                disabled={saving || !editTitle.trim()}
                className="flex-1"
                size="sm"
              >
                {saving ? "Saving..." : "Save changes"}
              </Button>
              <Button
                onClick={cancelEdit}
                variant="outline"
                className="flex-1"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          /* ========== View mode ========== */
          <>
            {/* Type + priority row */}
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${typeColors[card.taskType]}`}>
                {TASK_TYPES[card.taskType]}
              </span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${priorityColor.bg} ${priorityColor.text}`}>
                {TASK_PRIORITIES[card.priority]}
              </span>
              <span className="ml-auto text-xs text-[#B4BCC8]">
                {TASK_STATUS[card.status as keyof typeof TASK_STATUS]}
              </span>
            </div>

            {/* Title */}
            <div>
              <p className="text-base font-bold text-[#2E3338]">{card.taskTitle}</p>
            </div>

            {/* Description */}
            <div>
              <span className="text-xs text-[#B4BCC8]">Description</span>
              {card.taskDescription ? (
                <div className="mt-1.5 rounded-xl bg-[#FAFAFA] p-4">
                  <p className="text-[13px] text-[#4D5766] whitespace-pre-wrap leading-relaxed">{card.taskDescription}</p>
                </div>
              ) : (
                <p className="mt-1 text-[13px] text-[#B4BCC8]">No description</p>
              )}
            </div>

            {/* Info row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-[#B4BCC8]">Student</span>
                <p className="mt-0.5 text-[13px] font-medium text-[#2E3338]">{card.studentName}</p>
              </div>
              <div>
                <span className="text-xs text-[#B4BCC8]">Due date</span>
                <p className="mt-0.5 text-[13px] font-medium text-[#2E3338]">{card.dueDate}</p>
              </div>
            </div>

            {/* Results */}
            <div className="border-t border-[#E8EAED] pt-4 space-y-2">
              <h4 className="text-[13px] font-medium text-[#2E3338]">Results</h4>
              {card.testResults.length > 0 ? (
                card.testResults.map((r, i) => {
                  const rate = Math.round(
                    ((r.total_questions - r.wrong_count) / r.total_questions) * 100
                  );
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-xl bg-[#F4F5F6] px-4 py-3 text-[13px]"
                    >
                      <span className="text-[#2E3338]">{r.subject}</span>
                      <span className="text-[#4D5766]">
                        {r.wrong_count}/{r.total_questions} wrong{" "}
                        <span
                          className={
                            rate >= 80
                              ? "text-green-600"
                              : rate >= 60
                                ? "text-amber-600"
                                : "text-red-600"
                          }
                        >
                          ({rate}%)
                        </span>
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="text-[13px] text-[#B4BCC8]">No results yet</p>
              )}
            </div>

            {/* Note */}
            <div className="border-t border-[#E8EAED] pt-4">
              <span className="text-xs text-[#B4BCC8]">{isTeacher ? "Note" : "Teacher note"}</span>
              {card.note ? (
                <p className="mt-1 text-[13px] text-[#4D5766] whitespace-pre-wrap">{card.note}</p>
              ) : (
                <p className="mt-1 text-[13px] text-[#B4BCC8]">No notes</p>
              )}
            </div>
          </>
        )}

        {/* ========== Shown in both edit and view modes ========== */}

        {/* Labels */}
        {!editing && (
          <div className="border-t border-[#E8EAED] pt-4">
            {card.labels && card.labels.length > 0 ? (
              <LabelChips labels={card.labels} />
            ) : (
              <div>
                <h4 className="text-[13px] font-medium text-[#2E3338]">Labels</h4>
                <p className="mt-1 text-[13px] text-[#B4BCC8]">No labels</p>
              </div>
            )}
          </div>
        )}

        {/* Linked questions */}
        {!editing && (
          <div className="border-t border-[#E8EAED] pt-4">
            {isTeacher ? (
              <TaskQuestionPicker taskId={card.taskId} onUpdate={onUpdate} initialShowAnswers={card.showAnswersAfterSubmit} readOnly />
            ) : (
              <TaskQuestionList
                taskId={card.taskId}
                assignmentId={card.id}
                onStartPractice={(ids) => setPracticeQuestionIds(ids)}
                showAnswers={card.showAnswersAfterSubmit}
              />
            )}
          </div>
        )}

        {/* Student submissions (teacher view) */}
        {!editing && isTeacher && card.questionCount > 0 && (
          <div className="border-t border-[#E8EAED] pt-4">
            <StudentSubmissionView assignmentId={card.id} taskId={card.taskId} />
          </div>
        )}

        {/* Attachments */}
        {!editing && (
          <div className="border-t border-[#E8EAED] pt-4">
            <TaskAttachments
              assignmentId={card.id}
              canUpload={!isTeacher || card.status !== "confirmed"}
            />
          </div>
        )}

        {/* Comments */}
        {!editing && (
          <div className="border-t border-[#E8EAED] pt-4">
            <TaskComments assignmentId={card.id} />
          </div>
        )}

        {/* Activity log (shown in both modes) */}
        <div className="border-t border-[#E8EAED] pt-4">
          <button
            onClick={() => setShowActivity(!showActivity)}
            className="flex items-center gap-1.5 text-[13px] font-medium text-[#4D5766] hover:text-[#2E3338] transition-colors"
          >
            <span className="text-sm">{showActivity ? "▾" : "▸"}</span>
            Activity
            {activities.length > 0 && (
              <span className="rounded-full bg-[#F4F5F6] px-2 py-0.5 text-xs text-[#B4BCC8]">
                {activities.length}
              </span>
            )}
          </button>

          {showActivity && (
            <div className="mt-3 space-y-0">
              {activities.length === 0 ? (
                <p className="text-xs text-[#B4BCC8] py-2">No activity yet</p>
              ) : (
                activities.map((a, i) => (
                  <div key={a.id} className="flex gap-3 py-2.5">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-[#B4BCC8] mt-1.5 flex-shrink-0" />
                      {i < activities.length - 1 && (
                        <div className="w-px flex-1 bg-[#E8EAED] mt-1" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-[#4D5766]">
                        <span className="font-medium text-[#2E3338]">{a.performer_name}</span>
                        {" "}
                        {a.action === "status_change" ? (
                          <>
                            {formatStatusLabel(a.old_value ?? "")}
                            {" → "}
                            <span className="font-medium">{formatStatusLabel(a.new_value ?? "")}</span>
                          </>
                        ) : a.action === "task_edited" ? (
                          "edited the task"
                        ) : (
                          ACTIVITY_ACTIONS[a.action as keyof typeof ACTIVITY_ACTIONS] || a.action
                        )}
                      </p>
                      {(a.action === "note_added" || a.action === "task_edited") && a.new_value && (
                        <p className="mt-0.5 text-xs text-[#B4BCC8] line-clamp-2">{a.new_value}</p>
                      )}
                      <p className="mt-0.5 text-xs text-[#B4BCC8]">{formatTime(a.created_at)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions — shown only outside edit mode */}
      {!editing && (
        <div className="border-t border-[#E8EAED] p-5 space-y-2">
          {isTeacher && (
            <>
              <div className="flex gap-2">
                {card.status !== "confirmed" && (
                  <Button
                    onClick={() => updateStatus("confirmed")}
                    disabled={saving}
                    className="flex-1"
                    size="sm"
                  >
                    ✅ Approve
                  </Button>
                )}
                {card.status !== "rejected" && (
                  <Button
                    onClick={() => updateStatus("rejected")}
                    disabled={saving}
                    variant="destructive"
                    className="flex-1"
                    size="sm"
                  >
                    ↩️ Reject
                  </Button>
                )}
              </div>
              <button
                onClick={() => setShowCloseConfirm(true)}
                disabled={saving}
                className="w-full rounded-lg py-2 text-[13px] font-medium text-[#B4BCC8] hover:text-[#4D5766] hover:bg-[#F4F5F6] transition-colors duration-150"
              >
                Close task
              </button>
            </>
          )}
          {!isTeacher && (card.status === "pending" || card.status === "rejected") && (
            <Button
              onClick={() => updateStatus("submitted")}
              disabled={saving}
              className="w-full"
              size="sm"
            >
              Submit
            </Button>
          )}
        </div>
      )}

      {/* Close confirmation dialog — with inline results entry */}
      {showCloseConfirm && (
        <CloseTaskDialog
          card={card}
          saving={saving}
          onClose={() => setShowCloseConfirm(false)}
          onConfirm={async (results) => {
            setSaving(true);
            if (results === "na") {
              // Mark as no results needed
              await logActivity("task_closed", card.status, "closed (no results)");
            } else if (results && results.length > 0) {
              // Save results
              await supabase
                .from("test_results")
                .delete()
                .eq("task_assignment_id", card.id);
              await supabase.from("test_results").insert(
                results.map((r) => ({
                  task_assignment_id: card.id,
                  subject: r.subject,
                  total_questions: r.total_questions,
                  wrong_count: r.wrong_count,
                }))
              );
              await logActivity(
                "result_recorded",
                null,
                results.map((r) => `${r.subject}: ${r.wrong_count}/${r.total_questions} wrong`).join(", ")
              );
              await logActivity("task_closed", card.status, "closed");
            } else {
              await logActivity("task_closed", card.status, "closed");
            }
            // Close the task
            await supabase
              .from("task_assignments")
              .update({ status: "closed" })
              .eq("id", card.id);
            setSaving(false);
            setShowCloseConfirm(false);
            onUpdate();
          }}
        />
      )}

      {/* Practice overlay for students */}
      {practiceQuestionIds && practiceQuestionIds.length > 0 && (
        <div className="fixed inset-0 z-[60] bg-white">
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between border-b border-[#E8EAED] px-6 py-4">
              <h3 className="text-sm font-bold text-[#2E3338]">Practice</h3>
              <button
                onClick={() => setPracticeQuestionIds(null)}
                className="rounded-full p-1.5 text-[#B4BCC8] hover:bg-[#F4F5F6] hover:text-[#4D5766]"
              >
                ✕ Exit
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <TaskPracticeConsole
                assignmentId={card.id}
                questionIds={practiceQuestionIds}
                showAnswers={card.showAnswersAfterSubmit}
                onFinish={() => setPracticeQuestionIds(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline mini practice console — submit all together at the end
export function TaskPracticeConsole({
  assignmentId,
  questionIds,
  showAnswers = true,
  onFinish,
}: {
  assignmentId: string;
  questionIds: string[];
  showAnswers?: boolean;
  onFinish: () => void;
}) {
  type Question = { id: string; type: string; content: { stem: string; options?: string[]; answer: string; explanation?: string }; difficulty: number };
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [answer, setAnswer] = useState("");
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  // Collect answers for each question
  const [answers, setAnswers] = useState<Map<number, string>>(new Map());
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [correctResults, setCorrectResults] = useState<Map<string, boolean>>(new Map());
  // Photo submit mode
  type SubmitMode = "per-question" | "photo-all";
  const [submitMode, setSubmitMode] = useState<SubmitMode>("per-question");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractedAnswers, setExtractedAnswers] = useState<Map<number, string> | null>(null);
  const [perQuestionExtracting, setPerQuestionExtracting] = useState<number | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [photoCorrectResults, setPhotoCorrectResults] = useState<Map<string, boolean> | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const perQPhotoRef = useRef<HTMLInputElement>(null);
  const supabaseClient = createClient();

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      questionIds.forEach((id) => params.append("ids", id));
      params.set("page_size", "50");
      const res = await fetch(`/api/questions?${params}`);
      if (res.ok) {
        const data = await res.json();
        const qs = data.questions || [];
        setQuestions(qs);

        // Load any previous submission
        const { data: prevAnswers } = await supabaseClient
          .from("task_submission_answers")
          .select("question_id, answer")
          .eq("task_assignment_id", assignmentId);
        if (prevAnswers && prevAnswers.length > 0) {
          const prevMap = new Map<number, string>();
          prevAnswers.forEach((pa) => {
            const idx = qs.findIndex((q: Question) => q.id === pa.question_id);
            if (idx >= 0) prevMap.set(idx, pa.answer);
          });
          setAnswers(prevMap);
          // Set the saved answer for the first question
          const firstAnswer = prevMap.get(0);
          if (firstAnswer && qs.length > 0) {
            if (qs[0].type === "choice") setSelected(firstAnswer);
            else setAnswer(firstAnswer);
          }
        }
      }
      setLoading(false);
    };
    fetchQuestions();
  }, [questionIds, assignmentId, supabaseClient]);

  if (loading) return <p className="text-center text-[#B4BCC8] py-8">Loading...</p>;
  if (questions.length === 0) return <p className="text-center text-[#B4BCC8] py-8">No questions</p>;

  const typeLabel: Record<string, string> = { choice: "Multiple choice", fill_blank: "Fill in the blank", solution: "Short answer" };
  const typeColor: Record<string, string> = { choice: "bg-blue-50 text-blue-600", fill_blank: "bg-amber-50 text-amber-600", solution: "bg-green-50 text-green-600" };

  // Submit all answers — use AI to judge correctness, then upsert to task_submission_answers
  const handleSubmitAll = async (finalAnswers?: Map<number, string>) => {
    setSubmitting(true);
    const answersToSubmit = finalAnswers ?? answers;

    let correctMap = new Map<string, boolean>();

    // If photo mode already has correctness results, reuse them and skip check-answers
    if (photoCorrectResults && photoCorrectResults.size > 0) {
      correctMap = photoCorrectResults;
      setPhotoCorrectResults(null); // clear after use
    } else {
      // Call AI to check answers
      const answersToCheck = questions.map((q, i) => ({
        question_id: q.id,
        student_answer: answersToSubmit.get(i) ?? "",
        correct_answer: q.content.answer || "",
        stem: q.content.stem || "",
        type: q.type,
      }));

      try {
        const res = await fetch("/api/tasks/check-answers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: answersToCheck }),
        });
        if (res.ok) {
          const { results } = await res.json();
          for (const r of results) {
            correctMap.set(r.question_id, r.is_correct);
          }
        }
      } catch (e) {
        console.error("AI answer check failed, falling back to simple compare:", e);
      }
    }

    const rows = questions.map((q, i) => {
      const userAnswer = answersToSubmit.get(i) ?? "";
      const isCorrect = correctMap.get(q.id) ?? false;
      return {
        task_assignment_id: assignmentId,
        question_id: q.id,
        answer: userAnswer,
        is_correct: isCorrect,
        submitted_at: new Date().toISOString(),
      };
    });

    // Upsert — unique constraint (task_assignment_id, question_id) overrides old answers
    await supabaseClient
      .from("task_submission_answers")
      .upsert(rows, { onConflict: "task_assignment_id,question_id" });

    // Also record in question_attempts (to keep existing practice stats)
    for (const row of rows) {
      fetch("/api/questions/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_id: row.question_id,
          answer: row.answer,
          is_correct: row.is_correct,
          time_spent_seconds: 0,
        }),
      });
    }

    // Store correctness results for display
    const resultMap = new Map<string, boolean>();
    for (const row of rows) {
      resultMap.set(row.question_id, row.is_correct);
    }
    setCorrectResults(resultMap);

    if (finalAnswers) setAnswers(finalAnswers);
    setSubmitting(false);
    setSubmitted(true);
  };

  // Save current answer and jump
  const saveAndGo = (targetIdx: number) => {
    const q = questions[current];
    const userAnswer = q.type === "choice" ? selected : answer;
    if (userAnswer) {
      setAnswers((prev) => new Map(prev).set(current, userAnswer));
    }
    setCurrent(targetIdx);
    // Restore target question's saved answer
    const saved = answers.get(targetIdx) ?? "";
    const targetQ = questions[targetIdx];
    if (targetQ.type === "choice") {
      setSelected(saved);
      setAnswer("");
    } else {
      setAnswer(saved);
      setSelected("");
    }
  };

  // Handle photo upload
  const handlePhotoSelect = (file: File) => {
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) return;
    setPhotoFile(file);
    setExtractedAnswers(null);
    setPhotoPreview("selected"); // mark selected; don't load image data
  };

  // Use AI to recognize answers in the photo
  const handleExtractAnswers = async () => {
    if (!photoFile) return;
    setExtracting(true);
    setExtractError(null);
    try {
      const questionsInfo = questions.map((q, i) => ({
        index: i,
        stem: q.content.stem,
        type: q.type,
        options: q.content.options,
        correct_answer: q.content.answer || "",
      }));
      const formData = new FormData();
      formData.append("image", photoFile);
      formData.append("questions", JSON.stringify(questionsInfo));
      const res = await fetch("/api/tasks/extract-answers", { method: "POST", body: formData });
      if (res.ok) {
        const { answers: extracted } = await res.json();
        const map = new Map<number, string>();
        const cMap = new Map<string, boolean>();
        for (const item of extracted) {
          map.set(item.index, item.answer);
          // Store AI-returned correctness results
          const qId = questions[item.index]?.id;
          if (qId) cMap.set(qId, item.is_correct ?? false);
        }
        setExtractedAnswers(map);
        setPhotoCorrectResults(cMap);
      } else {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        setExtractError(err.error || "Recognition failed");
      }
    } catch (e) {
      console.error("Answer recognition failed:", e);
      setExtractError("Network error, please retry");
    }
    setExtracting(false);
  };

  // Per-question photo recognition
  const handlePerQuestionPhoto = async (questionIndex: number, file: File) => {
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) return;
    setPerQuestionExtracting(questionIndex);
    try {
      const q = questions[questionIndex];
      const questionsInfo = [{ index: 0, stem: q.content.stem, type: q.type, options: q.content.options }];
      const formData = new FormData();
      formData.append("image", file);
      formData.append("questions", JSON.stringify(questionsInfo));
      const res = await fetch("/api/tasks/extract-answers", { method: "POST", body: formData });
      if (res.ok) {
        const { answers: extracted } = await res.json();
        const extractedAnswer = extracted[0]?.answer || "";
        if (extractedAnswer) {
          if (q.type === "choice") setSelected(extractedAnswer);
          else setAnswer(extractedAnswer);
          setAnswers((prev) => new Map(prev).set(questionIndex, extractedAnswer));
        }
      }
    } catch (e) {
      console.error("Per-question answer recognition failed:", e);
    }
    setPerQuestionExtracting(null);
  };

  // ============= Submitted view =============
  if (submitted) {
    const results = questions.map((q, i) => {
      const userAnswer = answers.get(i) ?? "";
      return { ...q, userAnswer, correct: correctResults.get(q.id) ?? false };
    });
    const correctCount = results.filter((r) => r.correct).length;
    const rate = Math.round((correctCount / questions.length) * 100);

    return (
      <div className="max-w-lg mx-auto space-y-6 py-4">
        <div className="text-center space-y-3">
          <p className="text-lg font-bold text-[#2E3338]">Submitted!</p>
          <p className="text-[#4D5766]">
            {answers.size} of {questions.length} answered
          </p>
          {showAnswers && (
            <p className="text-[#4D5766]">
              <span className="font-bold text-green-600">{correctCount}</span> correct,{" "}
              <span className={`font-bold ${rate >= 80 ? "text-green-600" : rate >= 60 ? "text-amber-600" : "text-red-600"}`}>{rate}%</span>
            </p>
          )}
        </div>

        {showAnswers && (
          <div className="space-y-3">
            <h4 className="text-[13px] font-medium text-[#2E3338]">Details</h4>
            {results.map((r, i) => (
              <div key={r.id} className={`rounded-xl p-4 border ${r.correct ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-[#B4BCC8]">{i + 1}.</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${typeColor[r.type] || ""}`}>
                    {typeLabel[r.type] || r.type}
                  </span>
                  <span className={`ml-auto text-xs font-medium ${r.correct ? "text-green-600" : "text-red-600"}`}>
                    {r.correct ? "Correct" : "Wrong"}
                  </span>
                </div>
                <p className="text-[13px] text-[#2E3338] mb-2">{r.content.stem}</p>
                <div className="text-xs space-y-1">
                  <p className="text-[#4D5766]">Your answer: <span className="font-medium">{r.userAnswer || "(not answered)"}</span></p>
                  {!r.correct && (
                    <p className="text-green-700">Correct answer: <span className="font-medium">{r.content.answer}</span></p>
                  )}
                  {r.content.explanation && (
                    <p className="text-[#B4BCC8] mt-1">{r.content.explanation}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!showAnswers && (
          <div className="rounded-xl bg-[#F4F5F6] p-4 text-center">
            <p className="text-[13px] text-[#4D5766]">Your teacher will review and share feedback</p>
          </div>
        )}

        <button
          onClick={onFinish}
          className="w-full rounded-full bg-[#163300] py-3 text-sm font-medium text-white hover:bg-[#1e4400] transition-colors"
        >
          Back to task
        </button>
      </div>
    );
  }

  // ============= Answering view =============
  const q = questions[current];
  const isChoice = q.type === "choice";
  const hasAnswer = isChoice ? !!selected : !!answer.trim();
  const answeredCount = answers.size + (hasAnswer && !answers.has(current) ? 1 : 0);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Mode switch */}
      <div className="flex rounded-full bg-[#F4F5F6] p-1">
        <button
          onClick={() => setSubmitMode("per-question")}
          className={`flex-1 rounded-full py-2 text-xs font-medium transition-colors ${
            submitMode === "per-question" ? "bg-[#163300] text-white" : "text-[#4D5766]"
          }`}
        >
          One at a time
        </button>
        <button
          onClick={() => setSubmitMode("photo-all")}
          className={`flex-1 rounded-full py-2 text-xs font-medium transition-colors ${
            submitMode === "photo-all" ? "bg-[#163300] text-white" : "text-[#4D5766]"
          }`}
        >
          Submit photo
        </button>
      </div>

      {/* ===== Photo submit mode ===== */}
      {submitMode === "photo-all" && (
        <div className="space-y-4">
          {/* Upload area */}
          {!photoPreview ? (
            <button
              onClick={() => photoInputRef.current?.click()}
              className="w-full border-2 border-dashed border-[#B4BCC8] rounded-2xl py-12 flex flex-col items-center gap-3 text-[#B4BCC8] hover:border-[#163300] hover:text-[#163300] transition-colors"
            >
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>
              <span className="text-sm font-medium">Take or upload a photo of your work</span>
              <span className="text-xs">JPG or PNG, max 10MB</span>
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-2xl border border-[#E8EAED] bg-[#F4F5F6] px-4 py-3">
                <span className="text-2xl">☑️</span>
                <span className="flex-1 text-sm text-[#333] truncate">{photoFile?.name || "Image selected"}</span>
                <button
                  onClick={() => {
                    setPhotoFile(null);
                    setPhotoPreview(null);
                    setExtractedAnswers(null);
                    setPhotoCorrectResults(null);
                  }}
                  className="text-[#B4BCC8] hover:text-red-500 transition-colors text-lg"
                >
                  ✕
                </button>
              </div>

              {!extractedAnswers && (
                <button
                  onClick={handleExtractAnswers}
                  disabled={extracting}
                  className="w-full rounded-full bg-[#163300] py-3 text-sm font-medium text-white disabled:opacity-40 hover:bg-[#1e4400] transition-colors"
                >
                  {extracting ? "Recognizing..." : "Recognize answers"}
                </button>
              )}
              {extractError && (
                <p className="text-xs text-red-500 text-center">{extractError}</p>
              )}
            </div>
          )}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handlePhotoSelect(file);
              e.target.value = "";
            }}
          />

          {/* Recognition results editor */}
          {extractedAnswers && (
            <div className="space-y-3">
              <h4 className="text-[13px] font-medium text-[#2E3338]">Recognized answers (edit then submit)</h4>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {questions.map((q, i) => (
                  <div key={q.id} className="flex items-center gap-2 rounded-xl border border-[#E8EAED] px-3 py-2">
                    <span className="text-xs text-[#B4BCC8] w-6 shrink-0">{i + 1}.</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium shrink-0 ${typeColor[q.type] || ""}`}>
                      {typeLabel[q.type] || q.type}
                    </span>
                    <input
                      type="text"
                      value={extractedAnswers.get(i) ?? ""}
                      onChange={(e) => {
                        setExtractedAnswers((prev) => {
                          const next = new Map(prev);
                          next.set(i, e.target.value);
                          return next;
                        });
                      }}
                      placeholder="Not recognized"
                      className="flex-1 min-w-0 border-0 bg-transparent text-[13px] text-[#2E3338] outline-none placeholder:text-[#B4BCC8]"
                    />
                    {extractedAnswers.get(i) ? (
                      <span className="text-green-500 text-xs">✓</span>
                    ) : (
                      <span className="text-amber-500 text-xs">?</span>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleSubmitAll(extractedAnswers)}
                disabled={submitting}
                className="w-full rounded-full bg-[#163300] py-3 text-sm font-medium text-white disabled:opacity-40 hover:bg-[#1e4400] transition-colors"
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===== One at a time mode ===== */}
      {submitMode === "per-question" && (
        <>
          {/* Progress */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full bg-[#F4F5F6] overflow-hidden">
              <div className="h-full bg-[#163300] rounded-full transition-all" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
            </div>
            <span className="text-xs text-[#B4BCC8]">{current + 1}/{questions.length}</span>
          </div>

          {/* Question number nav */}
          <div className="flex flex-wrap gap-1.5">
            {questions.map((_, i) => {
              const answered = answers.has(i) || (i === current && hasAnswer);
              return (
                <button
                  key={i}
                  onClick={() => saveAndGo(i)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                    i === current
                      ? "bg-[#163300] text-white"
                      : answered
                        ? "bg-[#163300]/10 text-[#163300]"
                        : "bg-[#F4F5F6] text-[#B4BCC8]"
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          {/* Question */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeColor[q.type] || ""}`}>
                {typeLabel[q.type] || q.type}
              </span>
            </div>
            <p className="text-base text-[#2E3338] leading-relaxed whitespace-pre-wrap">{q.content.stem}</p>

            {/* Options for choice */}
            {isChoice && q.content.options && (
              <div className="space-y-2">
                {q.content.options.map((opt, i) => {
                  const letter = String.fromCharCode(65 + i);
                  const isSelected = selected === letter;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelected(letter)}
                      className={`w-full text-left rounded-xl border-[1.5px] px-4 py-3 text-[13px] text-[#2E3338] transition-colors ${
                        isSelected ? "border-[#163300] bg-[#163300]/5" : "border-[#E8EAED] hover:border-[#B4BCC8]"
                      }`}
                    >
                      <span className="font-medium mr-2">{letter}.</span>{opt}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Input for fill/solution + camera */}
            {!isChoice && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Enter your answer..."
                  className="flex-1 rounded-xl border-[1.5px] border-[#B4BCC8] px-4 py-3 text-[13px] text-[#2E3338] outline-none focus:border-[#163300] focus:ring-2 focus:ring-[#163300]/15"
                />
                <button
                  onClick={() => perQPhotoRef.current?.click()}
                  disabled={perQuestionExtracting === current}
                  className="shrink-0 w-11 h-11 rounded-xl border-[1.5px] border-[#B4BCC8] flex items-center justify-center text-[#B4BCC8] hover:border-[#163300] hover:text-[#163300] disabled:opacity-40 transition-colors"
                  title="Recognize answer from photo"
                >
                  {perQuestionExtracting === current ? (
                    <span className="text-xs">...</span>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>
                  )}
                </button>
                <input
                  ref={perQPhotoRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePerQuestionPhoto(current, file);
                    e.target.value = "";
                  }}
                />
              </div>
            )}
          </div>

          {/* Navigation + submit */}
          <div className="flex gap-2">
            {current > 0 && (
              <button
                onClick={() => saveAndGo(current - 1)}
                className="flex-1 rounded-full border border-[#E8EAED] py-3 text-sm font-medium text-[#4D5766] hover:bg-[#F4F5F6] transition-colors"
              >
                Previous
              </button>
            )}
            {current < questions.length - 1 ? (
              <button
                onClick={() => saveAndGo(current + 1)}
                className="flex-1 rounded-full bg-[#163300] py-3 text-sm font-medium text-white hover:bg-[#1e4400] transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={() => {
                  const userAnswer = isChoice ? selected : answer;
                  const merged = new Map(answers);
                  if (userAnswer) merged.set(current, userAnswer);
                  handleSubmitAll(merged);
                }}
                disabled={submitting}
                className="flex-1 rounded-full bg-[#163300] py-3 text-sm font-medium text-white disabled:opacity-40 hover:bg-[#1e4400] transition-colors"
              >
                {submitting ? "Submitting..." : `Submit all (${answeredCount}/${questions.length})`}
              </button>
            )}
          </div>

          {/* Always allow submitting progress */}
          {current < questions.length - 1 && (
            <button
              onClick={() => {
                const userAnswer = isChoice ? selected : answer;
                const merged = new Map(answers);
                if (userAnswer) merged.set(current, userAnswer);
                handleSubmitAll(merged);
              }}
              disabled={submitting || answers.size === 0}
              className="w-full text-center py-2 text-[13px] text-[#B4BCC8] hover:text-[#4D5766] disabled:opacity-40 transition-colors"
            >
              Submit {answeredCount} answered
            </button>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Teacher view of student submissions ─── */
function StudentSubmissionView({ assignmentId, taskId }: { assignmentId: string; taskId: string }) {
  const [submissions, setSubmissions] = useState<{
    question_id: string;
    answer: string;
    is_correct: boolean;
    submitted_at: string;
    question?: { stem: string; answer: string; explanation?: string; type: string };
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("task_submission_answers")
        .select("question_id, answer, is_correct, submitted_at")
        .eq("task_assignment_id", assignmentId)
        .order("submitted_at");

      if (data && data.length > 0) {
        // Fetch question details
        const qIds = data.map((d) => d.question_id);
        const { data: questions } = await supabase
          .from("questions")
          .select("id, type, content")
          .in("id", qIds);

        const qMap = new Map(
          questions?.map((q) => [q.id, { stem: (q.content as any).stem, answer: (q.content as any).answer, explanation: (q.content as any).explanation, type: q.type }]) ?? []
        );

        setSubmissions(data.map((d) => ({ ...d, question: qMap.get(d.question_id) })));
      }
      setLoading(false);
    };
    fetch();
  }, [assignmentId, supabase]);

  if (loading) return null;
  if (submissions.length === 0) {
    return (
      <div className="space-y-2">
        <h4 className="text-[13px] font-medium text-[#2E3338]">Student answers</h4>
        <p className="text-xs text-[#B4BCC8]">Not submitted yet</p>
      </div>
    );
  }

  const correctCount = submissions.filter((s) => s.is_correct).length;
  const rate = Math.round((correctCount / submissions.length) * 100);
  const lastSubmitted = new Date(submissions[submissions.length - 1].submitted_at);

  return (
    <div className="space-y-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-[13px] font-medium text-[#2E3338] hover:text-[#163300] transition-colors w-full"
      >
        <span className="text-sm">{expanded ? "▾" : "▸"}</span>
        Student answers
        <span className={`ml-1 text-xs font-medium ${rate >= 80 ? "text-green-600" : rate >= 60 ? "text-amber-600" : "text-red-600"}`}>
          {correctCount}/{submissions.length} ({rate}%)
        </span>
        <span className="ml-auto text-[11px] text-[#B4BCC8]">
          {lastSubmitted.toLocaleDateString("en-US", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </span>
      </button>

      {expanded && (
        <div className="space-y-2">
          {submissions.map((s, i) => (
            <div key={s.question_id} className={`rounded-xl p-3 border ${s.is_correct ? "border-green-200 bg-green-50/30" : "border-red-200 bg-red-50/30"}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-[#B4BCC8]">{i + 1}.</span>
                <span className={`text-xs font-medium ${s.is_correct ? "text-green-600" : "text-red-600"}`}>
                  {s.is_correct ? "Correct" : "Wrong"}
                </span>
              </div>
              {s.question && (
                <>
                  <p className="text-[13px] text-[#2E3338] line-clamp-2 mb-1">{s.question.stem}</p>
                  <div className="text-xs space-y-0.5">
                    <p className="text-[#4D5766]">Student answer: <span className="font-medium">{s.answer || "(not answered)"}</span></p>
                    {!s.is_correct && (
                      <p className="text-green-700">Correct answer: <span className="font-medium">{s.question.answer}</span></p>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Close task dialog (with inline results entry) ─── */
function CloseTaskDialog({
  card,
  saving,
  onClose,
  onConfirm,
}: {
  card: TaskCardData;
  saving: boolean;
  onClose: () => void;
  onConfirm: (results: { subject: string; total_questions: number; wrong_count: number }[] | "na" | null) => void;
}) {
  const hasResults = card.testResults.length > 0;
  // "record" = enter/edit results, "na" = not applicable, "skip" = close without entering
  const [closeMode, setCloseMode] = useState<"record" | "na" | "skip">("record");
  const [rows, setRows] = useState(
    hasResults
      ? card.testResults.map((r) => ({ ...r }))
      : [{ subject: "", total_questions: 0, wrong_count: 0 }]
  );

  // If no manual results, try to prefill from AI-graded submissions
  useEffect(() => {
    if (hasResults || card.questionCount === 0) return;
    const supabase = createClient();
    supabase
      .from("task_submission_answers")
      .select("is_correct")
      .eq("task_assignment_id", card.id)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const total = data.length;
          const wrong = data.filter((d) => !d.is_correct).length;
          setRows([{ subject: card.taskTitle || "Homework", total_questions: total, wrong_count: wrong }]);
        }
      });
  }, [hasResults, card.id, card.questionCount, card.taskTitle]);

  const updateRow = (i: number, field: string, value: string | number) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  };

  const validRows = rows.filter((r) => r.subject && r.total_questions > 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md mx-4 bg-white rounded-2xl p-6 space-y-4 shadow-xl">
        <h4 className="text-base font-bold text-[#2E3338]">Close task</h4>
        <p className="text-[13px] text-[#4D5766]">
          Closed tasks are hidden from the board.
        </p>

        {/* Result options */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[13px] text-[#2E3338] cursor-pointer">
            <input
              type="radio"
              name="closeMode"
              checked={closeMode === "record"}
              onChange={() => setCloseMode("record")}
              className="accent-[#163300]"
            />
            {hasResults ? "Edit results" : "Enter results"}
          </label>
          <label className="flex items-center gap-2 text-[13px] text-[#2E3338] cursor-pointer">
            <input
              type="radio"
              name="closeMode"
              checked={closeMode === "skip"}
              onChange={() => setCloseMode("skip")}
              className="accent-[#163300]"
            />
            {hasResults ? "Keep existing results and close" : "Close without entering results"}
          </label>
          <label className="flex items-center gap-2 text-[13px] text-[#B4BCC8] cursor-pointer">
            <input
              type="radio"
              name="closeMode"
              checked={closeMode === "na"}
              onChange={() => setCloseMode("na")}
              className="accent-[#B4BCC8]"
            />
            No results needed (N/A)
          </label>
        </div>

        {closeMode === "record" && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-[12px] font-medium text-[#4D5766]">
              {hasResults ? "Current results (editable)" : "Enter results"}
            </p>
            {rows.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Subject"
                  value={row.subject}
                  onChange={(e) => updateRow(i, "subject", e.target.value)}
                  className="flex-1 rounded-lg border-[1.5px] border-[#B4BCC8] px-2.5 py-1.5 text-[13px] outline-none focus:border-[#163300]"
                />
                <input
                  type="number"
                  placeholder="Total"
                  value={row.total_questions || ""}
                  onChange={(e) => updateRow(i, "total_questions", parseInt(e.target.value) || 0)}
                  className="w-14 rounded-lg border-[1.5px] border-[#B4BCC8] px-2 py-1.5 text-[13px] outline-none focus:border-[#163300]"
                />
                <span className="text-xs text-[#B4BCC8]">wrong</span>
                <input
                  type="number"
                  placeholder="0"
                  value={row.wrong_count || ""}
                  onChange={(e) => updateRow(i, "wrong_count", parseInt(e.target.value) || 0)}
                  className="w-14 rounded-lg border-[1.5px] border-[#B4BCC8] px-2 py-1.5 text-[13px] outline-none focus:border-[#163300]"
                />
                {rows.length > 1 && (
                  <button
                    onClick={() => setRows((p) => p.filter((_, idx) => idx !== i))}
                    className="text-[#B4BCC8] hover:text-red-500"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => setRows((p) => [...p, { subject: "", total_questions: 0, wrong_count: 0 }])}
              className="text-[12px] text-[#163300] font-medium hover:underline"
            >
              + Add subject
            </button>
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col gap-2 pt-2">
          <Button
            onClick={() => onConfirm(
              closeMode === "record" ? validRows
                : closeMode === "na" ? "na"
                : null
            )}
            disabled={saving || (closeMode === "record" && validRows.length === 0)}
            size="sm"
            className="w-full"
          >
            {saving
              ? "Processing..."
              : closeMode === "record" && validRows.length > 0
                ? "Save results and close"
                : closeMode === "na"
                  ? "Mark N/A and close"
                  : "Confirm close"}
          </Button>
          <button
            onClick={onClose}
            className="w-full py-2 text-[13px] text-[#B4BCC8] hover:text-[#4D5766] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
