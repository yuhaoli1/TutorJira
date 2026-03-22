"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TASK_TYPES, TASK_STATUS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { TestResultForm, type TestResultRow } from "./test-result-form";
import type { TaskCardData } from "./task-card";

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
  const supabase = createClient();

  const updateStatus = async (status: string) => {
    setSaving(true);
    const updateData: Record<string, unknown> = { status };
    if (status === "submitted") updateData.submitted_at = new Date().toISOString();
    if (status === "confirmed") updateData.confirmed_at = new Date().toISOString();
    if (note) updateData.note = note;

    await supabase
      .from("task_assignments")
      .update(updateData)
      .eq("id", card.id);

    setSaving(false);
    onUpdate();
  };

  const saveResults = async (results: TestResultRow[]) => {
    setSaving(true);
    // Delete existing results
    await supabase
      .from("test_results")
      .delete()
      .eq("task_assignment_id", card.id);

    // Insert new results
    await supabase.from("test_results").insert(
      results.map((r) => ({
        task_assignment_id: card.id,
        subject: r.subject,
        total_questions: r.total_questions,
        wrong_count: r.wrong_count,
      }))
    );

    setSaving(false);
    onUpdate();
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl border-l flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-lg font-semibold text-zinc-900">任务详情</h3>
        <button
          onClick={onClose}
          className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <span className="text-xs text-zinc-500">类型</span>
          <p className="text-sm font-medium">{TASK_TYPES[card.taskType]}</p>
        </div>
        <div>
          <span className="text-xs text-zinc-500">标题</span>
          <p className="text-sm font-medium">{card.taskTitle}</p>
        </div>
        <div>
          <span className="text-xs text-zinc-500">学生</span>
          <p className="text-sm font-medium">{card.studentName}</p>
        </div>
        <div>
          <span className="text-xs text-zinc-500">截止日期</span>
          <p className="text-sm font-medium">{card.dueDate}</p>
        </div>
        <div>
          <span className="text-xs text-zinc-500">状态</span>
          <p className="text-sm font-medium">
            {TASK_STATUS[card.status as keyof typeof TASK_STATUS]}
          </p>
        </div>

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
              <h4 className="text-sm font-medium text-zinc-700">成绩</h4>
              {card.testResults.map((r, i) => {
                const rate = Math.round(
                  ((r.total_questions - r.wrong_count) / r.total_questions) * 100
                );
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded bg-zinc-50 px-3 py-2 text-sm"
                  >
                    <span>{r.subject}</span>
                    <span>
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
            <label className="text-xs text-zinc-500">备注</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              rows={2}
              placeholder="添加备注..."
            />
          </div>
        ) : (
          card.note && (
            <div>
              <span className="text-xs text-zinc-500">老师备注</span>
              <p className="mt-1 text-sm text-zinc-700">{card.note}</p>
            </div>
          )
        )}
      </div>

      {/* Actions */}
      <div className="border-t p-4 space-y-2">
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
        {!isTeacher && card.status === "pending" && (
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
