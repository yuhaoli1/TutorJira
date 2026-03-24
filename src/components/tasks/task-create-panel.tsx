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

        {/* 截止日期 */}
        <div>
          <label className="mb-2 block text-[13px] font-medium text-[#4D5766]">
            截止日期
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
