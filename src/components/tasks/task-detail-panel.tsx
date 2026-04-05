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
            performer_name: nameMap.get(a.performed_by) || "未知用户",
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

    await logActivity("result_recorded", null, results.map((r) => `${r.subject}:${r.total_questions}题错${r.wrong_count}`).join(", "));

    setSaving(false);
    onUpdate();
  };

  // Save task edits
  const saveEdits = async () => {
    setSaving(true);

    const changes: string[] = [];
    if (editTitle !== card.taskTitle) changes.push(`标题: ${card.taskTitle} → ${editTitle}`);
    if (editType !== card.taskType) changes.push(`类型: ${TASK_TYPES[card.taskType]} → ${TASK_TYPES[editType]}`);
    if (editPriority !== card.priority) changes.push(`优先级: ${TASK_PRIORITIES[card.priority]} → ${TASK_PRIORITIES[editPriority]}`);
    if (editDescription !== (card.taskDescription ?? "")) changes.push("描述已更新");
    if (editDueDate !== card.dueDateRaw.split("T")[0]) changes.push(`截止日期: ${card.dueDateRaw.split("T")[0]} → ${editDueDate}`);

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
    return d.toLocaleDateString("zh-CN", {
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
        <h3 className="text-sm font-bold text-[#2E3338]">任务详情</h3>
        <div className="flex items-center gap-2">
          {isTeacher && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="rounded-full px-3 py-1 text-xs font-medium text-[#4D5766] hover:bg-[#F4F5F6] transition-colors duration-150"
            >
              编辑
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
          /* ========== 编辑模式 ========== */
          <div className="space-y-5">
            {/* 类型 */}
            <div>
              <label className="mb-2 block text-xs text-[#B4BCC8]">类型</label>
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

            {/* 标题 */}
            <div>
              <label className="mb-2 block text-xs text-[#B4BCC8]">标题</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full rounded-lg border-[1.5px] border-[#B4BCC8] px-3 py-2.5 text-[13px] text-[#2E3338] outline-none focus:border-[#163300] focus:ring-2 focus:ring-[#163300]/15 transition-colors duration-150"
              />
            </div>

            {/* 描述 */}
            <div>
              <label className="mb-2 block text-xs text-[#B4BCC8]">描述</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="添加任务描述..."
                rows={3}
                className="w-full rounded-lg border-[1.5px] border-[#B4BCC8] px-3 py-2.5 text-[13px] text-[#2E3338] outline-none focus:border-[#163300] focus:ring-2 focus:ring-[#163300]/15 transition-colors duration-150 resize-none"
              />
            </div>

            {/* 优先级 */}
            <div>
              <label className="mb-2 block text-xs text-[#B4BCC8]">优先级</label>
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

            {/* 截止日期 */}
            <div>
              <label className="mb-2 block text-xs text-[#B4BCC8]">截止日期</label>
              <input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                className="w-full rounded-lg border-[1.5px] border-[#B4BCC8] px-3 py-2.5 text-[13px] text-[#2E3338] outline-none focus:border-[#163300] focus:ring-2 focus:ring-[#163300]/15 transition-colors duration-150"
              />
            </div>

            {/* 保存/取消 */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={saveEdits}
                disabled={saving || !editTitle.trim()}
                className="flex-1"
                size="sm"
              >
                {saving ? "保存中..." : "保存修改"}
              </Button>
              <Button
                onClick={cancelEdit}
                variant="outline"
                className="flex-1"
                size="sm"
              >
                取消
              </Button>
            </div>
          </div>
        ) : (
          /* ========== 查看模式 ========== */
          <>
            {/* 类型 + 优先级行 */}
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

            {/* 标题 */}
            <div>
              <p className="text-base font-bold text-[#2E3338]">{card.taskTitle}</p>
            </div>

            {/* 描述 */}
            {card.taskDescription && (
              <div className="rounded-xl bg-[#FAFAFA] p-4">
                <p className="text-[13px] text-[#4D5766] whitespace-pre-wrap leading-relaxed">{card.taskDescription}</p>
              </div>
            )}

            {/* 信息栏 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-[#B4BCC8]">学生</span>
                <p className="mt-0.5 text-[13px] font-medium text-[#2E3338]">{card.studentName}</p>
              </div>
              <div>
                <span className="text-xs text-[#B4BCC8]">截止日期</span>
                <p className="mt-0.5 text-[13px] font-medium text-[#2E3338]">{card.dueDate}</p>
              </div>
            </div>

            <div className="border-t border-[#E8EAED]" />

            {/* 成绩显示/录入 */}
            {isTeacher ? (
              <TestResultForm
                initialResults={card.testResults}
                onSave={saveResults}
                saving={saving}
              />
            ) : (
              card.testResults.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[13px] font-medium text-[#2E3338]">成绩</h4>
                  {card.testResults.map((r, i) => {
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
                          {r.total_questions}题 错{r.wrong_count}{" "}
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
                  })}
                </div>
              )
            )}

            {/* 备注 */}
            {isTeacher ? (
              <div>
                <label className="text-xs text-[#B4BCC8]">备注</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border-[1.5px] border-[#B4BCC8] px-3 py-2.5 text-[13px] text-[#2E3338] outline-none focus:border-[#163300] focus:ring-2 focus:ring-[#163300]/15 transition-colors duration-150"
                  rows={2}
                  placeholder="添加备注..."
                />
              </div>
            ) : (
              card.note && (
                <div>
                  <span className="text-xs text-[#B4BCC8]">老师备注</span>
                  <p className="mt-1 text-[13px] text-[#4D5766]">{card.note}</p>
                </div>
              )
            )}
          </>
        )}

        {/* ========== 以下在编辑和查看模式都显示 ========== */}

        {/* 标签 */}
        {!editing && (
          <div className="border-t border-[#E8EAED] pt-4">
            {isTeacher ? (
              <div className="space-y-2">
                <h4 className="text-[13px] font-medium text-[#2E3338]">标签</h4>
                <LabelPicker selectedIds={labelIds} onChange={syncLabels} />
              </div>
            ) : (
              <LabelChips labels={card.labels} />
            )}
          </div>
        )}

        {/* 关联题目 */}
        {!editing && (
          <div className="border-t border-[#E8EAED] pt-4">
            {isTeacher ? (
              <TaskQuestionPicker taskId={card.taskId} onUpdate={onUpdate} initialShowAnswers={card.showAnswersAfterSubmit} />
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

        {/* 学生作答记录（老师查看） */}
        {!editing && isTeacher && card.questionCount > 0 && (
          <div className="border-t border-[#E8EAED] pt-4">
            <StudentSubmissionView assignmentId={card.id} taskId={card.taskId} />
          </div>
        )}

        {/* 附件 */}
        {!editing && (
          <div className="border-t border-[#E8EAED] pt-4">
            <TaskAttachments
              assignmentId={card.id}
              canUpload={!isTeacher || card.status !== "confirmed"}
            />
          </div>
        )}

        {/* 对话 */}
        {!editing && (
          <div className="border-t border-[#E8EAED] pt-4">
            <TaskComments assignmentId={card.id} />
          </div>
        )}

        {/* 活动记录（编辑和查看模式都显示） */}
        <div className="border-t border-[#E8EAED] pt-4">
          <button
            onClick={() => setShowActivity(!showActivity)}
            className="flex items-center gap-1.5 text-[13px] font-medium text-[#4D5766] hover:text-[#2E3338] transition-colors"
          >
            <span className="text-sm">{showActivity ? "▾" : "▸"}</span>
            活动记录
            {activities.length > 0 && (
              <span className="rounded-full bg-[#F4F5F6] px-2 py-0.5 text-xs text-[#B4BCC8]">
                {activities.length}
              </span>
            )}
          </button>

          {showActivity && (
            <div className="mt-3 space-y-0">
              {activities.length === 0 ? (
                <p className="text-xs text-[#B4BCC8] py-2">暂无活动记录</p>
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
                          "编辑了任务"
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

      {/* Actions — 非编辑模式才显示 */}
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
                    确认
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
                    打回
                  </Button>
                )}
              </div>
              <button
                onClick={() => setShowCloseConfirm(true)}
                disabled={saving}
                className="w-full rounded-lg py-2 text-[13px] font-medium text-[#B4BCC8] hover:text-[#4D5766] hover:bg-[#F4F5F6] transition-colors duration-150"
              >
                关闭任务
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
              提交
            </Button>
          )}
        </div>
      )}

      {/* 关闭确认弹窗 — 内嵌成绩录入 */}
      {showCloseConfirm && (
        <CloseTaskDialog
          card={card}
          saving={saving}
          onClose={() => setShowCloseConfirm(false)}
          onConfirm={async (results) => {
            setSaving(true);
            if (results === "na") {
              // 标记为无需成绩
              await logActivity("task_closed", card.status, "closed (无需成绩)");
            } else if (results && results.length > 0) {
              // 保存成绩
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
                results.map((r) => `${r.subject}:${r.total_questions}题错${r.wrong_count}`).join(", ")
              );
              await logActivity("task_closed", card.status, "closed");
            } else {
              await logActivity("task_closed", card.status, "closed");
            }
            // 关闭任务
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
              <h3 className="text-sm font-bold text-[#2E3338]">任务做题</h3>
              <button
                onClick={() => setPracticeQuestionIds(null)}
                className="rounded-full p-1.5 text-[#B4BCC8] hover:bg-[#F4F5F6] hover:text-[#4D5766]"
              >
                ✕ 退出
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

// Inline mini practice console — 全部做完后统一提交
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
  // 收集每题的答案
  const [answers, setAnswers] = useState<Map<number, string>>(new Map());
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [correctResults, setCorrectResults] = useState<Map<string, boolean>>(new Map());
  // 拍照提交模式
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

        // 加载之前的提交记录（如果有）
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
          // 设置第一题的已保存答案
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

  if (loading) return <p className="text-center text-[#B4BCC8] py-8">加载中...</p>;
  if (questions.length === 0) return <p className="text-center text-[#B4BCC8] py-8">没有题目</p>;

  const typeLabel: Record<string, string> = { choice: "选择题", fill_blank: "填空题", solution: "解答题" };
  const typeColor: Record<string, string> = { choice: "bg-blue-50 text-blue-600", fill_blank: "bg-amber-50 text-amber-600", solution: "bg-green-50 text-green-600" };

  // 提交全部答案 — 用 AI 判断对错，再 upsert 到 task_submission_answers
  const handleSubmitAll = async (finalAnswers?: Map<number, string>) => {
    setSubmitting(true);
    const answersToSubmit = finalAnswers ?? answers;

    let correctMap = new Map<string, boolean>();

    // 如果拍照模式已经有判题结果，直接复用，跳过 check-answers 调用
    if (photoCorrectResults && photoCorrectResults.size > 0) {
      correctMap = photoCorrectResults;
      setPhotoCorrectResults(null); // 用完清除
    } else {
      // 调用 AI 检查答案
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
        console.error("AI 答案检查失败，使用简单比较:", e);
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

    // Upsert — 根据 (task_assignment_id, question_id) 唯一约束覆盖旧答案
    await supabaseClient
      .from("task_submission_answers")
      .upsert(rows, { onConflict: "task_assignment_id,question_id" });

    // 也记录到 question_attempts（兼容已有的做题统计）
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

    // 保存判题结果用于展示
    const resultMap = new Map<string, boolean>();
    for (const row of rows) {
      resultMap.set(row.question_id, row.is_correct);
    }
    setCorrectResults(resultMap);

    if (finalAnswers) setAnswers(finalAnswers);
    setSubmitting(false);
    setSubmitted(true);
  };

  // 保存当前题答案并跳转
  const saveAndGo = (targetIdx: number) => {
    const q = questions[current];
    const userAnswer = q.type === "choice" ? selected : answer;
    if (userAnswer) {
      setAnswers((prev) => new Map(prev).set(current, userAnswer));
    }
    setCurrent(targetIdx);
    // 恢复目标题的已保存答案
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

  // 拍照上传处理
  const handlePhotoSelect = (file: File) => {
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) return;
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setExtractedAnswers(null);
  };

  // 调用 AI 识别照片中的答案
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
          // 保存 AI 一起返回的判题结果
          const qId = questions[item.index]?.id;
          if (qId) cMap.set(qId, item.is_correct ?? false);
        }
        setExtractedAnswers(map);
        setPhotoCorrectResults(cMap);
      } else {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        setExtractError(err.error || "识别失败");
      }
    } catch (e) {
      console.error("答案识别失败:", e);
      setExtractError("网络错误，请重试");
    }
    setExtracting(false);
  };

  // 单题拍照识别
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
      console.error("单题答案识别失败:", e);
    }
    setPerQuestionExtracting(null);
  };

  // ============= 已提交页面 =============
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
          <p className="text-lg font-bold text-[#2E3338]">已提交！</p>
          <p className="text-[#4D5766]">
            共 {questions.length} 题，已作答 {answers.size} 题
          </p>
          {showAnswers && (
            <p className="text-[#4D5766]">
              正确 <span className="font-bold text-green-600">{correctCount}</span> 题，
              正确率 <span className={`font-bold ${rate >= 80 ? "text-green-600" : rate >= 60 ? "text-amber-600" : "text-red-600"}`}>{rate}%</span>
            </p>
          )}
        </div>

        {showAnswers && (
          <div className="space-y-3">
            <h4 className="text-[13px] font-medium text-[#2E3338]">答题详情</h4>
            {results.map((r, i) => (
              <div key={r.id} className={`rounded-xl p-4 border ${r.correct ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-[#B4BCC8]">{i + 1}.</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${typeColor[r.type] || ""}`}>
                    {typeLabel[r.type] || r.type}
                  </span>
                  <span className={`ml-auto text-xs font-medium ${r.correct ? "text-green-600" : "text-red-600"}`}>
                    {r.correct ? "正确" : "错误"}
                  </span>
                </div>
                <p className="text-[13px] text-[#2E3338] mb-2">{r.content.stem}</p>
                <div className="text-xs space-y-1">
                  <p className="text-[#4D5766]">你的答案：<span className="font-medium">{r.userAnswer || "（未作答）"}</span></p>
                  {!r.correct && (
                    <p className="text-green-700">正确答案：<span className="font-medium">{r.content.answer}</span></p>
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
            <p className="text-[13px] text-[#4D5766]">答案将由老师批阅后反馈</p>
          </div>
        )}

        <button
          onClick={onFinish}
          className="w-full rounded-full bg-[#163300] py-3 text-sm font-medium text-white hover:bg-[#1e4400] transition-colors"
        >
          返回任务
        </button>
      </div>
    );
  }

  // ============= 答题页面 =============
  const q = questions[current];
  const isChoice = q.type === "choice";
  const hasAnswer = isChoice ? !!selected : !!answer.trim();
  const answeredCount = answers.size + (hasAnswer && !answers.has(current) ? 1 : 0);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* 模式切换 */}
      <div className="flex rounded-full bg-[#F4F5F6] p-1">
        <button
          onClick={() => setSubmitMode("per-question")}
          className={`flex-1 rounded-full py-2 text-xs font-medium transition-colors ${
            submitMode === "per-question" ? "bg-[#163300] text-white" : "text-[#4D5766]"
          }`}
        >
          逐题作答
        </button>
        <button
          onClick={() => setSubmitMode("photo-all")}
          className={`flex-1 rounded-full py-2 text-xs font-medium transition-colors ${
            submitMode === "photo-all" ? "bg-[#163300] text-white" : "text-[#4D5766]"
          }`}
        >
          拍照提交
        </button>
      </div>

      {/* ===== 拍照提交模式 ===== */}
      {submitMode === "photo-all" && (
        <div className="space-y-4">
          {/* 上传区域 */}
          {!photoPreview ? (
            <button
              onClick={() => photoInputRef.current?.click()}
              className="w-full border-2 border-dashed border-[#B4BCC8] rounded-2xl py-12 flex flex-col items-center gap-3 text-[#B4BCC8] hover:border-[#163300] hover:text-[#163300] transition-colors"
            >
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>
              <span className="text-sm font-medium">拍照或上传答题纸</span>
              <span className="text-xs">支持 JPG、PNG，最大 10MB</span>
            </button>
          ) : (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden border border-[#E8EAED]">
                <img src={photoPreview} alt="答题纸" className="w-full max-h-80 object-contain bg-[#F4F5F6]" />
                <button
                  onClick={() => {
                    if (photoPreview) URL.revokeObjectURL(photoPreview);
                    setPhotoFile(null);
                    setPhotoPreview(null);
                    setExtractedAnswers(null);
                  }}
                  className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs hover:bg-black/70"
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
                  {extracting ? "识别中..." : "识别答案"}
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

          {/* 识别结果编辑 */}
          {extractedAnswers && (
            <div className="space-y-3">
              <h4 className="text-[13px] font-medium text-[#2E3338]">识别结果（可编辑后提交）</h4>
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
                      placeholder="未识别到"
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
                {submitting ? "提交中..." : "确认提交"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===== 逐题作答模式 ===== */}
      {submitMode === "per-question" && (
        <>
          {/* Progress */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full bg-[#F4F5F6] overflow-hidden">
              <div className="h-full bg-[#163300] rounded-full transition-all" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
            </div>
            <span className="text-xs text-[#B4BCC8]">{current + 1}/{questions.length}</span>
          </div>

          {/* 题号导航 */}
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
                  placeholder="输入答案..."
                  className="flex-1 rounded-xl border-[1.5px] border-[#B4BCC8] px-4 py-3 text-[13px] text-[#2E3338] outline-none focus:border-[#163300] focus:ring-2 focus:ring-[#163300]/15"
                />
                <button
                  onClick={() => perQPhotoRef.current?.click()}
                  disabled={perQuestionExtracting === current}
                  className="shrink-0 w-11 h-11 rounded-xl border-[1.5px] border-[#B4BCC8] flex items-center justify-center text-[#B4BCC8] hover:border-[#163300] hover:text-[#163300] disabled:opacity-40 transition-colors"
                  title="拍照识别答案"
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
                上一题
              </button>
            )}
            {current < questions.length - 1 ? (
              <button
                onClick={() => saveAndGo(current + 1)}
                className="flex-1 rounded-full bg-[#163300] py-3 text-sm font-medium text-white hover:bg-[#1e4400] transition-colors"
              >
                下一题
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
                {submitting ? "提交中..." : `提交全部 (${answeredCount}/${questions.length})`}
              </button>
            )}
          </div>

          {/* 随时可提交 */}
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
              提交已作答的 {answeredCount} 题
            </button>
          )}
        </>
      )}
    </div>
  );
}

/* ─── 老师查看学生作答记录 ─── */
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
        // 获取题目信息
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
        <h4 className="text-[13px] font-medium text-[#2E3338]">学生作答</h4>
        <p className="text-xs text-[#B4BCC8]">学生尚未提交</p>
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
        学生作答
        <span className={`ml-1 text-xs font-medium ${rate >= 80 ? "text-green-600" : rate >= 60 ? "text-amber-600" : "text-red-600"}`}>
          {correctCount}/{submissions.length} ({rate}%)
        </span>
        <span className="ml-auto text-[11px] text-[#B4BCC8]">
          {lastSubmitted.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </span>
      </button>

      {expanded && (
        <div className="space-y-2">
          {submissions.map((s, i) => (
            <div key={s.question_id} className={`rounded-xl p-3 border ${s.is_correct ? "border-green-200 bg-green-50/30" : "border-red-200 bg-red-50/30"}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-[#B4BCC8]">{i + 1}.</span>
                <span className={`text-xs font-medium ${s.is_correct ? "text-green-600" : "text-red-600"}`}>
                  {s.is_correct ? "正确" : "错误"}
                </span>
              </div>
              {s.question && (
                <>
                  <p className="text-[13px] text-[#2E3338] line-clamp-2 mb-1">{s.question.stem}</p>
                  <div className="text-xs space-y-0.5">
                    <p className="text-[#4D5766]">学生答案：<span className="font-medium">{s.answer || "（未作答）"}</span></p>
                    {!s.is_correct && (
                      <p className="text-green-700">正确答案：<span className="font-medium">{s.question.answer}</span></p>
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

/* ─── 关闭任务弹窗（内嵌成绩录入） ─── */
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
  // "record" = 录入/修改成绩, "na" = 无需成绩, "skip" = 不录入直接关闭
  const [closeMode, setCloseMode] = useState<"record" | "na" | "skip">("record");
  const [rows, setRows] = useState(
    hasResults
      ? card.testResults.map((r) => ({ ...r }))
      : [{ subject: "", total_questions: 0, wrong_count: 0 }]
  );

  const updateRow = (i: number, field: string, value: string | number) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  };

  const validRows = rows.filter((r) => r.subject && r.total_questions > 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md mx-4 bg-white rounded-2xl p-6 space-y-4 shadow-xl">
        <h4 className="text-base font-bold text-[#2E3338]">关闭任务</h4>
        <p className="text-[13px] text-[#4D5766]">
          关闭后任务将从看板中隐藏。
        </p>

        {/* 成绩选项 */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[13px] text-[#2E3338] cursor-pointer">
            <input
              type="radio"
              name="closeMode"
              checked={closeMode === "record"}
              onChange={() => setCloseMode("record")}
              className="accent-[#163300]"
            />
            {hasResults ? "修改成绩" : "录入成绩"}
          </label>
          <label className="flex items-center gap-2 text-[13px] text-[#2E3338] cursor-pointer">
            <input
              type="radio"
              name="closeMode"
              checked={closeMode === "skip"}
              onChange={() => setCloseMode("skip")}
              className="accent-[#163300]"
            />
            {hasResults ? "保留现有成绩，直接关闭" : "暂不录入，直接关闭"}
          </label>
          <label className="flex items-center gap-2 text-[13px] text-[#B4BCC8] cursor-pointer">
            <input
              type="radio"
              name="closeMode"
              checked={closeMode === "na"}
              onChange={() => setCloseMode("na")}
              className="accent-[#B4BCC8]"
            />
            此任务无需成绩（N/A）
          </label>
        </div>

        {closeMode === "record" && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-[12px] font-medium text-[#4D5766]">
              {hasResults ? "当前成绩（可修改）" : "成绩录入"}
            </p>
            {rows.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="科目"
                  value={row.subject}
                  onChange={(e) => updateRow(i, "subject", e.target.value)}
                  className="flex-1 rounded-lg border-[1.5px] border-[#B4BCC8] px-2.5 py-1.5 text-[13px] outline-none focus:border-[#163300]"
                />
                <input
                  type="number"
                  placeholder="总题"
                  value={row.total_questions || ""}
                  onChange={(e) => updateRow(i, "total_questions", parseInt(e.target.value) || 0)}
                  className="w-14 rounded-lg border-[1.5px] border-[#B4BCC8] px-2 py-1.5 text-[13px] outline-none focus:border-[#163300]"
                />
                <span className="text-xs text-[#B4BCC8]">错</span>
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
              + 添加科目
            </button>
          </div>
        )}

        {/* 按钮 */}
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
              ? "处理中..."
              : closeMode === "record" && validRows.length > 0
                ? "保存成绩并关闭"
                : closeMode === "na"
                  ? "标记无需成绩并关闭"
                  : "确认关闭"}
          </Button>
          <button
            onClick={onClose}
            className="w-full py-2 text-[13px] text-[#B4BCC8] hover:text-[#4D5766] transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
