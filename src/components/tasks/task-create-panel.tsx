"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { TASK_TYPES, TASK_PRIORITIES, RECURRENCE_TYPES, WEEKDAYS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import type { TaskType, TaskPriority, RecurrenceType } from "@/lib/supabase/types";

interface Student {
  id: string;
  name: string;
  grade: string;
}

export function TaskCreatePanel({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<TaskType>("dictation");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);

  // Recurring task state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>("daily");
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
  const [endDate, setEndDate] = useState("");

  const supabase = createClient();

  useEffect(() => {
    supabase
      .from("students")
      .select("id, name, grade")
      .order("name")
      .then(({ data }) => {
        if (data) setStudents(data);
      });
  }, [supabase]);

  const toggleStudent = (id: string) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map((s) => s.id));
    }
  };

  const toggleDay = (day: number) => {
    setRecurrenceDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async () => {
    if (!title.trim() || selectedStudents.length === 0) return;
    if (isRecurring && recurrenceType === "weekly" && recurrenceDays.length === 0) return;
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (isRecurring) {
      // Create recurring template
      const { error } = await supabase
        .from("recurring_task_templates")
        .insert({
          title: title.trim(),
          type,
          priority,
          recurrence_type: recurrenceType,
          recurrence_days: recurrenceType === "weekly" ? recurrenceDays : null,
          start_date: dueDate,
          end_date: endDate || null,
          student_ids: selectedStudents,
          created_by: user.id,
        });

      if (error) {
        setLoading(false);
        return;
      }

      // Trigger immediate generation
      await fetch("/api/recurring-tasks/generate", { method: "POST" });
    } else {
      // Original one-off task creation
      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          type,
          priority,
          due_date: new Date(dueDate).toISOString(),
          created_by: user.id,
        })
        .select("id")
        .single();

      if (taskError || !task) {
        setLoading(false);
        return;
      }

      const { error: assignError } = await supabase.from("task_assignments").insert(
        selectedStudents.map((studentId) => ({
          task_id: task.id,
          student_id: studentId,
        }))
      );

      if (assignError) {
        console.error("Failed to create task assignments:", assignError);
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    onCreate();
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white border-l border-[#E8EAED] flex flex-col">
      <div className="flex items-center justify-between border-b border-[#E8EAED] px-6 py-5">
        <h3 className="text-sm font-bold text-[#2E3338]">新建任务</h3>
        <button
          onClick={onClose}
          className="rounded-full p-1.5 text-[#B4BCC8] hover:bg-[#F4F5F6] hover:text-[#4D5766] transition-colors duration-150"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {/* 任务类型 */}
        <div>
          <label className="mb-2 block text-[13px] font-medium text-[#4D5766]">
            类型
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TaskType)}
            className="w-full rounded-lg border-[1.5px] border-[#B4BCC8] bg-white px-3 py-2.5 text-[13px] text-[#2E3338] outline-none focus:border-[#163300] focus:ring-2 focus:ring-[#163300]/15 transition-colors duration-150"
          >
            {Object.entries(TASK_TYPES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* 标题 */}
        <div>
          <label className="mb-2 block text-[13px] font-medium text-[#4D5766]">
            标题
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：第三单元默写"
            className="w-full rounded-lg border-[1.5px] border-[#B4BCC8] px-3 py-2.5 text-[13px] text-[#2E3338] outline-none focus:border-[#163300] focus:ring-2 focus:ring-[#163300]/15 transition-colors duration-150"
          />
        </div>

        {/* 描述 */}
        <div>
          <label className="mb-2 block text-[13px] font-medium text-[#4D5766]">
            描述（可选）
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="详细说明任务要求..."
            rows={3}
            className="w-full rounded-lg border-[1.5px] border-[#B4BCC8] px-3 py-2.5 text-[13px] text-[#2E3338] outline-none focus:border-[#163300] focus:ring-2 focus:ring-[#163300]/15 transition-colors duration-150 resize-none"
          />
        </div>

        {/* 优先级 */}
        <div>
          <label className="mb-2 block text-[13px] font-medium text-[#4D5766]">
            优先级
          </label>
          <div className="flex gap-2">
            {(Object.entries(TASK_PRIORITIES) as [TaskPriority, string][]).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setPriority(value)}
                className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-150 ${
                  priority === value
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

        {/* 重复任务开关 */}
        <div className="flex items-center justify-between">
          <label className="text-[13px] font-medium text-[#4D5766]">
            重复任务
          </label>
          <button
            type="button"
            onClick={() => setIsRecurring(!isRecurring)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
              isRecurring ? "bg-[#163300]" : "bg-[#E8EAED]"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                isRecurring ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* 重复设置 */}
        {isRecurring && (
          <div className="space-y-4 rounded-xl border border-[#E8EAED] p-4 bg-[#FAFAFA]">
            {/* 频率 */}
            <div>
              <label className="mb-2 block text-[13px] font-medium text-[#4D5766]">
                频率
              </label>
              <select
                value={recurrenceType}
                onChange={(e) => setRecurrenceType(e.target.value as RecurrenceType)}
                className="w-full rounded-lg border-[1.5px] border-[#B4BCC8] bg-white px-3 py-2.5 text-[13px] text-[#2E3338] outline-none focus:border-[#163300] focus:ring-2 focus:ring-[#163300]/15 transition-colors duration-150"
              >
                {Object.entries(RECURRENCE_TYPES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* 周几 (仅每周模式) */}
            {recurrenceType === "weekly" && (
              <div>
                <label className="mb-2 block text-[13px] font-medium text-[#4D5766]">
                  选择周几
                </label>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(WEEKDAYS).map(([day, label]) => {
                    const dayNum = Number(day);
                    const selected = recurrenceDays.includes(dayNum);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(dayNum)}
                        className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 ${
                          selected
                            ? "bg-[#163300] text-white"
                            : "bg-white border border-[#B4BCC8] text-[#4D5766] hover:bg-[#F4F5F6]"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 结束日期 */}
            <div>
              <label className="mb-2 block text-[13px] font-medium text-[#4D5766]">
                结束日期（可选）
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border-[1.5px] border-[#B4BCC8] px-3 py-2.5 text-[13px] text-[#2E3338] outline-none focus:border-[#163300] focus:ring-2 focus:ring-[#163300]/15 transition-colors duration-150"
              />
            </div>
          </div>
        )}

        {/* 截止日期 / 开始日期 */}
        <div>
          <label className="mb-2 block text-[13px] font-medium text-[#4D5766]">
            {isRecurring ? "开始日期" : "截止日期"}
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-lg border-[1.5px] border-[#B4BCC8] px-3 py-2.5 text-[13px] text-[#2E3338] outline-none focus:border-[#163300] focus:ring-2 focus:ring-[#163300]/15 transition-colors duration-150"
          />
        </div>

        {/* 指派学生 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[13px] font-medium text-[#4D5766]">
              指派学生
            </label>
            <button
              onClick={toggleAll}
              className="text-xs text-[#163300] hover:text-[#163300]/70 font-medium transition-colors duration-150"
            >
              {selectedStudents.length === students.length
                ? "取消全选"
                : "全选"}
            </button>
          </div>
          {students.length === 0 ? (
            <p className="text-[13px] text-[#B4BCC8]">暂无学生，请先添加学生</p>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-0.5 rounded-xl border border-[#E8EAED] p-2">
              {students.map((s) => (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-[#F4F5F6] transition-colors duration-150"
                >
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(s.id)}
                    onChange={() => toggleStudent(s.id)}
                    className="rounded"
                  />
                  <span className="text-[13px] text-[#2E3338]">{s.name}</span>
                  <span className="text-xs text-[#B4BCC8]">{s.grade}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-[#E8EAED] p-5">
        <Button
          onClick={handleSubmit}
          disabled={
            loading ||
            !title.trim() ||
            selectedStudents.length === 0 ||
            (isRecurring && recurrenceType === "weekly" && recurrenceDays.length === 0)
          }
          className="w-full"
        >
          {loading
            ? "创建中..."
            : isRecurring
              ? `创建重复任务（${selectedStudents.length}人）`
              : `创建任务（${selectedStudents.length}人）`}
        </Button>
      </div>
    </div>
  );
}
