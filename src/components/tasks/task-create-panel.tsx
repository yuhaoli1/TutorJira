"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { TASK_TYPES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import type { TaskType } from "@/lib/supabase/types";

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
  const [type, setType] = useState<TaskType>("dictation");
  const [dueDate, setDueDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = async () => {
    if (!title.trim() || selectedStudents.length === 0) return;
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Create task
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .insert({
        title: title.trim(),
        type,
        due_date: new Date(dueDate).toISOString(),
        created_by: user.id,
      })
      .select("id")
      .single();

    if (taskError || !task) {
      setLoading(false);
      return;
    }

    // Create assignments
    await supabase.from("task_assignments").insert(
      selectedStudents.map((studentId) => ({
        task_id: task.id,
        student_id: studentId,
      }))
    );

    setLoading(false);
    onCreate();
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl border-l flex flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-lg font-semibold text-zinc-900">新建任务</h3>
        <button
          onClick={onClose}
          className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 任务类型 */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            类型
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TaskType)}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
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
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            标题
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：第三单元默写"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </div>

        {/* 截止日期 */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            截止日期
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </div>

        {/* 指派学生 */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-zinc-700">
              指派学生
            </label>
            <button
              onClick={toggleAll}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              {selectedStudents.length === students.length
                ? "取消全选"
                : "全选"}
            </button>
          </div>
          {students.length === 0 ? (
            <p className="text-sm text-zinc-400">暂无学生，请先添加学生</p>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-1 rounded-lg border border-zinc-200 p-2">
              {students.map((s) => (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-zinc-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(s.id)}
                    onChange={() => toggleStudent(s.id)}
                    className="rounded"
                  />
                  <span className="text-sm text-zinc-700">{s.name}</span>
                  <span className="text-xs text-zinc-400">{s.grade}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-t p-4">
        <Button
          onClick={handleSubmit}
          disabled={loading || !title.trim() || selectedStudents.length === 0}
          className="w-full"
        >
          {loading
            ? "创建中..."
            : `创建任务（${selectedStudents.length}人）`}
        </Button>
      </div>
    </div>
  );
}
