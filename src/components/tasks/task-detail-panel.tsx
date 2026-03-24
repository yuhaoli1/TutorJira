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
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        <div>
          <span className="text-xs text-[#B4BCC8]">类型</span>
          <p className="mt-1 text-[13px] font-medium text-[#2E3338]">{TASK_TYPES[card.taskType]}</p>
        </div>
        <div>
          <span className="text-xs text-[#B4BCC8]">标题</span>
          <p className="mt-1 text-[13px] font-medium text-[#2E3338]">{card.taskTitle}</p>
        </div>
        <div>
          <span className="text-xs text-[#B4BCC8]">学生</span>
          <p className="mt-1 text-[13px] font-medium text-[#2E3338]">{card.studentName}</p>
        </div>
        <div>
          <span className="text-xs text-[#B4BCC8]">截止日期</span>
          <p className="mt-1 text-[13px] font-medium text-[#2E3338]">{card.dueDate}</p>
        </div>
        <div>
          <span className="text-xs text-[#B4BCC8]">状态</span>
          <p className="mt-1 text-[13px] font-medium text-[#2E3338]">
            {TASK_STATUS[card.status as keyof typeof TASK_STATUS]}
          </p>
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
