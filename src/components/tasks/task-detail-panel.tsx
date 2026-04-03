"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { TASK_TYPES, TASK_STATUS, TASK_PRIORITIES, TASK_PRIORITY_COLORS, ACTIVITY_ACTIONS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { TestResultForm, type TestResultRow } from "./test-result-form";
import type { TaskCardData } from "./task-card";

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
  const supabase = createClient();

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
        // Fetch user names for performers
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

  const priorityColor = TASK_PRIORITY_COLORS[card.priority];

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

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white border-l border-[#E8EAED] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E8EAED] px-6 py-5">
        <h3 className="text-sm font-bold text-[#2E3338]">任务详情</h3>
        <button
          onClick={onClose}
          className="rounded-full p-1.5 text-[#B4BCC8] hover:bg-[#F4F5F6] hover:text-[#4D5766] transition-colors duration-150"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        {/* 类型 + 优先级行 */}
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            card.taskType === "dictation" ? "bg-purple-50 text-purple-600" :
            card.taskType === "recitation" ? "bg-blue-50 text-blue-600" :
            card.taskType === "correction" ? "bg-orange-50 text-orange-600" :
            card.taskType === "homework" ? "bg-green-50 text-green-600" :
            "bg-[#F4F5F6] text-[#4D5766]"
          }`}>
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

        {/* 活动记录 */}
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
                    {/* Timeline dot + line */}
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-[#B4BCC8] mt-1.5 flex-shrink-0" />
                      {i < activities.length - 1 && (
                        <div className="w-px flex-1 bg-[#E8EAED] mt-1" />
                      )}
                    </div>
                    {/* Content */}
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
                        ) : (
                          ACTIVITY_ACTIONS[a.action as keyof typeof ACTIVITY_ACTIONS] || a.action
                        )}
                      </p>
                      {a.action === "note_added" && a.new_value && (
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

      {/* Actions */}
      <div className="border-t border-[#E8EAED] p-5 space-y-2">
        {isTeacher && (
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
    </div>
  );
}
