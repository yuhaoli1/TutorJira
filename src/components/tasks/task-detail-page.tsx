"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TASK_TYPES, TASK_STATUS, TASK_PRIORITIES, TASK_PRIORITY_COLORS, ACTIVITY_ACTIONS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { TestResultForm, type TestResultRow } from "./test-result-form";
import { TaskComments } from "./task-comments";
import { TaskAttachments } from "./task-attachments";
import { TaskQuestionPicker, TaskQuestionList } from "./task-questions";
import { LabelPicker, LabelChips, type Label } from "./label-picker";
import type { TaskType, TaskPriority } from "@/lib/supabase/types";

interface TaskData {
  id: string;
  taskId: string;
  ticketNumber: number;
  status: string;
  taskTitle: string;
  taskDescription: string | null;
  taskType: TaskType;
  priority: TaskPriority;
  studentName: string;
  dueDate: string;
  dueDateRaw: string;
  note: string | null;
  labels: Label[];
  testResults: { subject: string; total_questions: number; wrong_count: number }[];
}

interface ActivityItem {
  id: string;
  action: string;
  old_value: string | null;
  new_value: string | null;
  performer_name: string;
  created_at: string;
}

export function TaskDetailPage({
  assignmentId,
  isTeacher,
  backPath,
}: {
  assignmentId: string;
  isTeacher: boolean;
  backPath: string;
}) {
  const [task, setTask] = useState<TaskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editType, setEditType] = useState<TaskType>("dictation");
  const [editPriority, setEditPriority] = useState<TaskPriority>("medium");
  const [editDueDate, setEditDueDate] = useState("");
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [practiceQuestionIds, setPracticeQuestionIds] = useState<string[] | null>(null);

  const router = useRouter();
  const supabase = createClient();

  const fetchTask = async () => {
    const { data: a } = await supabase
      .from("task_assignments")
      .select(`
        id, status, note, ticket_number, created_at,
        task:tasks(id, title, description, type, due_date, priority),
        student:students(id, name)
      `)
      .eq("id", assignmentId)
      .single();

    if (!a || !a.task || !a.student) {
      setLoading(false);
      return;
    }

    const taskData = a.task as unknown as { id: string; title: string; description: string | null; type: string; due_date: string; priority: TaskPriority };
    const student = a.student as unknown as { id: string; name: string };

    // Fetch test results
    const { data: results } = await supabase
      .from("test_results")
      .select("*")
      .eq("task_assignment_id", a.id);

    // Fetch labels
    const { data: labelData } = await supabase
      .from("task_label_map")
      .select("label:task_labels(id, name, color)")
      .eq("task_id", taskData.id);

    const labels: Label[] = (labelData ?? [])
      .map((r) => (r as unknown as { label: Label }).label)
      .filter(Boolean);

    const data: TaskData = {
      id: a.id,
      taskId: taskData.id,
      ticketNumber: (a as unknown as { ticket_number: number }).ticket_number || 0,
      status: a.status,
      taskTitle: taskData.title,
      taskDescription: taskData.description,
      taskType: taskData.type as TaskType,
      priority: taskData.priority || "medium",
      studentName: student.name,
      dueDate: new Date(taskData.due_date).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" }),
      dueDateRaw: taskData.due_date,
      note: a.note,
      labels,
      testResults: (results ?? []).map((r) => ({
        subject: r.subject,
        total_questions: r.total_questions,
        wrong_count: r.wrong_count,
      })),
    };

    setTask(data);
    setNote(data.note ?? "");
    setEditTitle(data.taskTitle);
    setEditDescription(data.taskDescription ?? "");
    setEditType(data.taskType);
    setEditPriority(data.priority);
    setEditDueDate(data.dueDateRaw.split("T")[0]);
    setLabelIds(labels.map((l) => l.id));
    setLoading(false);
  };

  const fetchActivities = async () => {
    const { data } = await supabase
      .from("task_activity_log")
      .select("*")
      .eq("task_assignment_id", assignmentId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((a) => a.performed_by))];
      const { data: users } = await supabase.from("users").select("id, name").in("id", userIds);
      const nameMap = new Map(users?.map((u) => [u.id, u.name]) ?? []);
      setActivities(data.map((a) => ({ ...a, performer_name: nameMap.get(a.performed_by) || "未知" })));
    }
  };

  useEffect(() => {
    fetchTask();
    fetchActivities();
  }, [assignmentId]);

  const logActivity = async (action: string, oldVal?: string | null, newVal?: string | null) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("task_activity_log").insert({
        task_assignment_id: assignmentId,
        action,
        old_value: oldVal ?? null,
        new_value: newVal ?? null,
        performed_by: user.id,
      });
    }
  };

  const updateStatus = async (status: string) => {
    if (!task) return;
    setSaving(true);
    const oldStatus = task.status;
    const updateData: Record<string, unknown> = { status };
    if (status === "submitted") updateData.submitted_at = new Date().toISOString();
    if (status === "confirmed") updateData.confirmed_at = new Date().toISOString();
    if (note && note !== task.note) updateData.note = note;

    await supabase.from("task_assignments").update(updateData).eq("id", task.id);
    await logActivity("status_change", oldStatus, status);
    if (note && note !== task.note) await logActivity("note_added", null, note);
    setSaving(false);
    fetchTask();
    fetchActivities();
  };

  const saveResults = async (results: TestResultRow[]) => {
    if (!task) return;
    setSaving(true);
    await supabase.from("test_results").delete().eq("task_assignment_id", task.id);
    await supabase.from("test_results").insert(
      results.map((r) => ({ task_assignment_id: task.id, subject: r.subject, total_questions: r.total_questions, wrong_count: r.wrong_count }))
    );
    await logActivity("result_recorded", null, results.map((r) => `${r.subject}:${r.total_questions}题错${r.wrong_count}`).join(", "));
    setSaving(false);
    fetchTask();
    fetchActivities();
  };

  const saveEdits = async () => {
    if (!task) return;
    setSaving(true);
    const changes: string[] = [];
    if (editTitle !== task.taskTitle) changes.push(`标题: ${task.taskTitle} → ${editTitle}`);
    if (editType !== task.taskType) changes.push(`类型: ${TASK_TYPES[task.taskType]} → ${TASK_TYPES[editType]}`);
    if (editPriority !== task.priority) changes.push(`优先级: ${TASK_PRIORITIES[task.priority]} → ${TASK_PRIORITIES[editPriority]}`);
    if (editDescription !== (task.taskDescription ?? "")) changes.push("描述已更新");
    if (editDueDate !== task.dueDateRaw.split("T")[0]) changes.push(`截止日期已更新`);

    await supabase.from("tasks").update({
      title: editTitle.trim(),
      description: editDescription.trim() || null,
      type: editType,
      priority: editPriority,
      due_date: new Date(editDueDate).toISOString(),
    }).eq("id", task.taskId);

    if (changes.length > 0) await logActivity("task_edited", null, changes.join("; "));
    setSaving(false);
    setEditing(false);
    fetchTask();
    fetchActivities();
  };

  const syncLabels = async (newIds: string[]) => {
    if (!task) return;
    setLabelIds(newIds);
    await supabase.from("task_label_map").delete().eq("task_id", task.taskId);
    if (newIds.length > 0) {
      await supabase.from("task_label_map").insert(newIds.map((id) => ({ task_id: task.taskId, label_id: id })));
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-[#B4BCC8]">加载中...</div>;
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-[#B4BCC8]">任务不存在</p>
        <Button onClick={() => router.push(backPath)} variant="outline" size="sm">返回</Button>
      </div>
    );
  }

  const priorityColor = TASK_PRIORITY_COLORS[editing ? editPriority : task.priority];
  const formatStatusLabel = (s: string) => TASK_STATUS[s as keyof typeof TASK_STATUS] || s;
  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const typeColors: Record<TaskType, string> = {
    dictation: "bg-purple-50 text-purple-600",
    recitation: "bg-blue-50 text-blue-600",
    correction: "bg-orange-50 text-orange-600",
    homework: "bg-green-50 text-green-600",
    other: "bg-[#F4F5F6] text-[#4D5766]",
  };

  // Practice overlay
  if (practiceQuestionIds && practiceQuestionIds.length > 0) {
    return (
      <div className="space-y-4">
        <button onClick={() => setPracticeQuestionIds(null)} className="text-sm text-[#4D5766] hover:text-[#2E3338]">
          ← 返回任务
        </button>
        <TaskPracticeInline questionIds={practiceQuestionIds} onFinish={() => setPracticeQuestionIds(null)} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => router.push(backPath)} className="text-sm text-[#B4BCC8] hover:text-[#4D5766] transition-colors">
          ← 返回
        </button>
        <span className="text-sm text-[#B4BCC8]">/</span>
        <span className="text-sm font-mono font-semibold text-[#4D5766]">SY-{task.ticketNumber}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {editing ? (
            /* ===== 编辑模式 ===== */
            <div className="rounded-2xl border border-[#E8EAED] bg-white p-6 space-y-5">
              <div>
                <label className="mb-2 block text-xs text-[#B4BCC8]">类型</label>
                <select value={editType} onChange={(e) => setEditType(e.target.value as TaskType)}
                  className="w-full rounded-lg border-[1.5px] border-[#B4BCC8] bg-white px-3 py-2.5 text-[13px] text-[#2E3338] outline-none focus:border-[#163300] focus:ring-2 focus:ring-[#163300]/15">
                  {Object.entries(TASK_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs text-[#B4BCC8]">标题</label>
                <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-lg border-[1.5px] border-[#B4BCC8] px-3 py-2.5 text-[13px] text-[#2E3338] outline-none focus:border-[#163300] focus:ring-2 focus:ring-[#163300]/15" />
              </div>
              <div>
                <label className="mb-2 block text-xs text-[#B4BCC8]">描述</label>
                <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={4} placeholder="添加任务描述..."
                  className="w-full rounded-lg border-[1.5px] border-[#B4BCC8] px-3 py-2.5 text-[13px] text-[#2E3338] outline-none focus:border-[#163300] focus:ring-2 focus:ring-[#163300]/15 resize-none" />
              </div>
              <div>
                <label className="mb-2 block text-xs text-[#B4BCC8]">优先级</label>
                <div className="flex gap-2">
                  {(Object.entries(TASK_PRIORITIES) as [TaskPriority, string][]).map(([v, l]) => (
                    <button key={v} type="button" onClick={() => setEditPriority(v)}
                      className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                        editPriority === v
                          ? v === "urgent" ? "bg-red-500 text-white" : v === "high" ? "bg-orange-400 text-white" : v === "medium" ? "bg-blue-400 text-white" : "bg-[#B4BCC8] text-white"
                          : "bg-white border border-[#E8EAED] text-[#4D5766] hover:bg-[#F4F5F6]"
                      }`}>{l}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs text-[#B4BCC8]">截止日期</label>
                <input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)}
                  className="w-full rounded-lg border-[1.5px] border-[#B4BCC8] px-3 py-2.5 text-[13px] text-[#2E3338] outline-none focus:border-[#163300] focus:ring-2 focus:ring-[#163300]/15" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={saveEdits} disabled={saving || !editTitle.trim()} className="flex-1" size="sm">
                  {saving ? "保存中..." : "保存修改"}
                </Button>
                <Button onClick={() => setEditing(false)} variant="outline" className="flex-1" size="sm">取消</Button>
              </div>
            </div>
          ) : (
            /* ===== 查看模式 ===== */
            <div className="rounded-2xl border border-[#E8EAED] bg-white p-6 space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${typeColors[task.taskType]}`}>
                      {TASK_TYPES[task.taskType]}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${priorityColor.bg} ${priorityColor.text}`}>
                      {TASK_PRIORITIES[task.priority]}
                    </span>
                    <span className="rounded-full px-2.5 py-1 text-xs font-medium bg-[#F4F5F6] text-[#4D5766]">
                      {TASK_STATUS[task.status as keyof typeof TASK_STATUS]}
                    </span>
                  </div>
                  <h1 className="text-xl font-bold text-[#2E3338]">{task.taskTitle}</h1>
                </div>
                {isTeacher && (
                  <button onClick={() => setEditing(true)}
                    className="rounded-full px-4 py-1.5 text-xs font-medium text-[#4D5766] hover:bg-[#F4F5F6] border border-[#E8EAED] transition-colors">
                    编辑
                  </button>
                )}
              </div>

              {/* Description */}
              {task.taskDescription && (
                <div className="rounded-xl bg-[#FAFAFA] p-4">
                  <p className="text-[13px] text-[#4D5766] whitespace-pre-wrap leading-relaxed">{task.taskDescription}</p>
                </div>
              )}

              {/* Labels */}
              {isTeacher ? (
                <div className="space-y-2">
                  <h4 className="text-xs text-[#B4BCC8]">标签</h4>
                  <LabelPicker selectedIds={labelIds} onChange={syncLabels} />
                </div>
              ) : (
                task.labels.length > 0 && <LabelChips labels={task.labels} />
              )}

              <div className="border-t border-[#E8EAED]" />

              {/* Test results */}
              {isTeacher ? (
                <TestResultForm initialResults={task.testResults} onSave={saveResults} saving={saving} />
              ) : task.testResults.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[13px] font-medium text-[#2E3338]">成绩</h4>
                  {task.testResults.map((r, i) => {
                    const rate = Math.round(((r.total_questions - r.wrong_count) / r.total_questions) * 100);
                    return (
                      <div key={i} className="flex items-center justify-between rounded-xl bg-[#F4F5F6] px-4 py-3 text-[13px]">
                        <span className="text-[#2E3338]">{r.subject}</span>
                        <span className="text-[#4D5766]">
                          {r.total_questions}题 错{r.wrong_count}{" "}
                          <span className={rate >= 80 ? "text-green-600" : rate >= 60 ? "text-amber-600" : "text-red-600"}>({rate}%)</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Notes */}
              {isTeacher ? (
                <div>
                  <label className="text-xs text-[#B4BCC8]">备注</label>
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="添加备注..."
                    className="mt-1.5 w-full rounded-lg border-[1.5px] border-[#B4BCC8] px-3 py-2.5 text-[13px] text-[#2E3338] outline-none focus:border-[#163300] focus:ring-2 focus:ring-[#163300]/15" />
                </div>
              ) : task.note && (
                <div>
                  <span className="text-xs text-[#B4BCC8]">老师备注</span>
                  <p className="mt-1 text-[13px] text-[#4D5766]">{task.note}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {isTeacher && (
                  <>
                    {task.status !== "confirmed" && (
                      <Button onClick={() => updateStatus("confirmed")} disabled={saving} size="sm">确认</Button>
                    )}
                    {task.status !== "rejected" && (
                      <Button onClick={() => updateStatus("rejected")} disabled={saving} variant="destructive" size="sm">打回</Button>
                    )}
                  </>
                )}
                {!isTeacher && (task.status === "pending" || task.status === "rejected") && (
                  <Button onClick={() => updateStatus("submitted")} disabled={saving} size="sm">提交</Button>
                )}
              </div>
            </div>
          )}

          {/* Questions */}
          <div className="rounded-2xl border border-[#E8EAED] bg-white p-6">
            {isTeacher ? (
              <TaskQuestionPicker taskId={task.taskId} onUpdate={fetchTask} />
            ) : (
              <TaskQuestionList taskId={task.taskId} onStartPractice={(ids) => setPracticeQuestionIds(ids)} />
            )}
          </div>

          {/* Comments */}
          <div className="rounded-2xl border border-[#E8EAED] bg-white p-6">
            <TaskComments assignmentId={task.id} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Info card */}
          <div className="rounded-2xl border border-[#E8EAED] bg-white p-5 space-y-4">
            <div>
              <span className="text-xs text-[#B4BCC8]">学生</span>
              <p className="mt-0.5 text-[13px] font-medium text-[#2E3338]">{task.studentName}</p>
            </div>
            <div>
              <span className="text-xs text-[#B4BCC8]">截止日期</span>
              <p className="mt-0.5 text-[13px] font-medium text-[#2E3338]">{task.dueDate}</p>
            </div>
            <div>
              <span className="text-xs text-[#B4BCC8]">编号</span>
              <p className="mt-0.5 text-[13px] font-mono font-semibold text-[#2E3338]">SY-{task.ticketNumber}</p>
            </div>
          </div>

          {/* Attachments */}
          <div className="rounded-2xl border border-[#E8EAED] bg-white p-5">
            <TaskAttachments assignmentId={task.id} canUpload={!isTeacher || task.status !== "confirmed"} />
          </div>

          {/* Activity log */}
          <div className="rounded-2xl border border-[#E8EAED] bg-white p-5">
            <h4 className="text-[13px] font-medium text-[#2E3338] mb-3">活动记录</h4>
            {activities.length === 0 ? (
              <p className="text-xs text-[#B4BCC8]">暂无记录</p>
            ) : (
              <div className="space-y-0">
                {activities.map((a, i) => (
                  <div key={a.id} className="flex gap-3 py-2">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-[#B4BCC8] mt-1.5 flex-shrink-0" />
                      {i < activities.length - 1 && <div className="w-px flex-1 bg-[#E8EAED] mt-1" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-[#4D5766]">
                        <span className="font-medium text-[#2E3338]">{a.performer_name}</span>{" "}
                        {a.action === "status_change" ? (
                          <>{formatStatusLabel(a.old_value ?? "")} → <span className="font-medium">{formatStatusLabel(a.new_value ?? "")}</span></>
                        ) : a.action === "task_edited" ? "编辑了任务" : (
                          ACTIVITY_ACTIONS[a.action as keyof typeof ACTIVITY_ACTIONS] || a.action
                        )}
                      </p>
                      {(a.action === "note_added" || a.action === "task_edited") && a.new_value && (
                        <p className="mt-0.5 text-xs text-[#B4BCC8] line-clamp-2">{a.new_value}</p>
                      )}
                      <p className="mt-0.5 text-xs text-[#B4BCC8]">{formatTime(a.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Inline practice console for task-linked questions
function TaskPracticeInline({ questionIds, onFinish }: { questionIds: string[]; onFinish: () => void }) {
  const [questions, setQuestions] = useState<{ id: string; type: string; content: { stem: string; options?: string[]; answer: string; explanation?: string }; difficulty: number }[]>([]);
  const [current, setCurrent] = useState(0);
  const [answer, setAnswer] = useState("");
  const [selected, setSelected] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const f = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      questionIds.forEach((id) => params.append("ids", id));
      params.set("page_size", "50");
      const res = await fetch(`/api/questions?${params}`);
      if (res.ok) { const data = await res.json(); setQuestions(data.questions || []); }
      setLoading(false);
    };
    f();
  }, [questionIds]);

  if (loading) return <p className="text-center text-[#B4BCC8] py-8">加载中...</p>;
  if (questions.length === 0) return <p className="text-center text-[#B4BCC8] py-8">没有题目</p>;

  if (finished) {
    const rate = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
    return (
      <div className="text-center py-8 space-y-4">
        <div className="text-4xl">{rate >= 80 ? "🎉" : rate >= 60 ? "👍" : "💪"}</div>
        <p className="text-lg font-bold text-[#2E3338]">完成！</p>
        <p className="text-[#4D5766]">答对 <span className="font-bold text-green-600">{score.correct}</span> / {score.total} 题，正确率 <span className={`font-bold ${rate >= 80 ? "text-green-600" : rate >= 60 ? "text-amber-600" : "text-red-600"}`}>{rate}%</span></p>
        <button onClick={onFinish} className="rounded-full bg-[#163300] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#1e4400]">返回任务</button>
      </div>
    );
  }

  const q = questions[current];
  const isChoice = q.type === "choice";
  const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, "").replace(/[，。！？、；：""''（）【】]/g, "");

  const checkAnswer = () => {
    const ua = isChoice ? selected : answer;
    const correct = normalize(ua) === normalize(q.content.answer);
    setIsCorrect(correct);
    setShowResult(true);
    setScore((p) => ({ correct: p.correct + (correct ? 1 : 0), total: p.total + 1 }));
    fetch("/api/questions/attempts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question_id: q.id, answer: ua, is_correct: correct, time_spent_seconds: 0 }) });
  };

  const next = () => {
    if (current + 1 >= questions.length) { setFinished(true); } else { setCurrent(current + 1); setAnswer(""); setSelected(""); setShowResult(false); setIsCorrect(false); }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-[#F4F5F6] overflow-hidden">
          <div className="h-full bg-[#163300] rounded-full transition-all" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
        </div>
        <span className="text-xs text-[#B4BCC8]">{current + 1}/{questions.length}</span>
      </div>
      <p className="text-base text-[#2E3338] leading-relaxed whitespace-pre-wrap">{q.content.stem}</p>
      {isChoice && q.content.options && (
        <div className="space-y-2">
          {q.content.options.map((opt, i) => {
            const letter = String.fromCharCode(65 + i);
            let cls = "border-[#E8EAED] hover:border-[#B4BCC8]";
            if (showResult) { if (letter === normalize(q.content.answer).toUpperCase()) cls = "border-green-500 bg-green-50"; else if (selected === letter) cls = "border-red-500 bg-red-50"; }
            else if (selected === letter) cls = "border-[#163300] bg-[#163300]/5";
            return <button key={i} onClick={() => !showResult && setSelected(letter)} className={`w-full text-left rounded-xl border-[1.5px] px-4 py-3 text-[13px] text-[#2E3338] transition-colors ${cls}`}><span className="font-medium mr-2">{letter}.</span>{opt}</button>;
          })}
        </div>
      )}
      {!isChoice && !showResult && (
        <input type="text" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="输入答案..."
          className="w-full rounded-xl border-[1.5px] border-[#B4BCC8] px-4 py-3 text-[13px] text-[#2E3338] outline-none focus:border-[#163300] focus:ring-2 focus:ring-[#163300]/15"
          onKeyDown={(e) => { if (e.key === "Enter" && answer.trim()) checkAnswer(); }} />
      )}
      {showResult && (
        <div className={`rounded-xl p-4 ${isCorrect ? "bg-green-50" : "bg-red-50"}`}>
          <p className={`text-sm font-medium ${isCorrect ? "text-green-700" : "text-red-700"}`}>{isCorrect ? "✓ 回答正确！" : `✗ 正确答案是：${q.content.answer}`}</p>
          {q.content.explanation && <p className="mt-2 text-xs text-[#4D5766]">{q.content.explanation}</p>}
        </div>
      )}
      {!showResult ? (
        <button onClick={checkAnswer} disabled={isChoice ? !selected : !answer.trim()} className="w-full rounded-full bg-[#163300] py-3 text-sm font-medium text-white disabled:opacity-40 hover:bg-[#1e4400]">提交答案</button>
      ) : (
        <button onClick={next} className="w-full rounded-full bg-[#163300] py-3 text-sm font-medium text-white hover:bg-[#1e4400]">{current + 1 >= questions.length ? "查看结果" : "下一题 →"}</button>
      )}
    </div>
  );
}
