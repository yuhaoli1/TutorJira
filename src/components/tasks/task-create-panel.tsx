"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { TASK_TYPES, TASK_PRIORITIES, QUESTION_TYPES, DIFFICULTY_LABELS, RECURRENCE_TYPES, WEEKDAYS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { LabelPicker } from "./label-picker";
import type { TaskType, TaskPriority, RecurrenceType, QuestionType } from "@/lib/supabase/types";

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
  const [labelIds, setLabelIds] = useState<string[]>([]);

  // 关联题目
  const [selectedQuestions, setSelectedQuestions] = useState<{ id: string; type: QuestionType; stem: string; topic?: string }[]>([]);
  const [showQuestionBrowser, setShowQuestionBrowser] = useState(false);
  const [topics, setTopics] = useState<{ id: string; title: string }[]>([]);
  const [selectedTopic, setSelectedTopic] = useState("all");
  const [availableQuestions, setAvailableQuestions] = useState<{ id: string; type: QuestionType; stem: string; topic?: string }[]>([]);
  const [searchingQ, setSearchingQ] = useState(false);

  // 附件上传
  const [pendingFiles, setPendingFiles] = useState<{ file: File; preview: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

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
    supabase
      .from("knowledge_topics")
      .select("id, title")
      .order("sort_order")
      .then(({ data }) => {
        if (data) setTopics(data);
      });
  }, [supabase]);

  const searchQuestions = async () => {
    setSearchingQ(true);
    let query = supabase
      .from("questions")
      .select("id, type, content, difficulty, topic:knowledge_topics(title)")
      .limit(30);
    if (selectedTopic !== "all") query = query.eq("topic_id", selectedTopic);
    const { data } = await query;
    if (data) {
      const selectedIds = new Set(selectedQuestions.map((q) => q.id));
      setAvailableQuestions(
        (data as any[])
          .filter((q) => !selectedIds.has(q.id))
          .map((q) => ({ id: q.id, type: q.type, stem: q.content.stem, topic: q.topic?.title }))
      );
    }
    setSearchingQ(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles = files
      .filter((f) => f.type.startsWith("image/") && f.size <= 10 * 1024 * 1024)
      .map((f) => ({ file: f, preview: URL.createObjectURL(f) }));
    setPendingFiles((prev) => [...prev, ...newFiles]);
    e.target.value = "";
  };

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

      // Assign labels to the task
      if (labelIds.length > 0) {
        await supabase.from("task_label_map").insert(
          labelIds.map((labelId) => ({ task_id: task.id, label_id: labelId }))
        );
      }

      // Link questions to the task
      if (selectedQuestions.length > 0) {
        await supabase.from("task_questions").insert(
          selectedQuestions.map((q, i) => ({
            task_id: task.id,
            question_id: q.id,
            sort_order: i,
          }))
        );
      }

      // Upload attachments (linked to first assignment)
      if (pendingFiles.length > 0) {
        // Get the first assignment ID for attaching files
        const { data: assignments } = await supabase
          .from("task_assignments")
          .select("id")
          .eq("task_id", task.id)
          .limit(1);
        const assignmentId = assignments?.[0]?.id;
        if (assignmentId) {
          for (const pf of pendingFiles) {
            const ext = pf.file.name.split(".").pop();
            const path = `tasks/${task.id}/${Date.now()}.${ext}`;
            const { error: upErr } = await supabase.storage
              .from("question-uploads")
              .upload(path, pf.file);
            if (!upErr) {
              const { data: urlData } = supabase.storage.from("question-uploads").getPublicUrl(path);
              await supabase.from("task_attachments").insert({
                task_assignment_id: assignmentId,
                file_url: urlData.publicUrl,
                file_name: pf.file.name,
                file_size: pf.file.size,
                file_type: pf.file.type,
                uploaded_by: user.id,
              });
            }
          }
        }
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

        {/* 标签 */}
        <div>
          <label className="mb-2 block text-[13px] font-medium text-[#4D5766]">
            标签（可选）
          </label>
          <LabelPicker selectedIds={labelIds} onChange={setLabelIds} />
        </div>

        {/* 关联题目 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[13px] font-medium text-[#4D5766]">
              关联题目（可选）
              {selectedQuestions.length > 0 && (
                <span className="ml-1.5 text-xs text-[#B4BCC8]">{selectedQuestions.length}</span>
              )}
            </label>
            <button
              type="button"
              onClick={() => { setShowQuestionBrowser(!showQuestionBrowser); if (!showQuestionBrowser) searchQuestions(); }}
              className="text-xs font-medium text-[#163300] hover:text-[#163300]/70 transition-colors"
            >
              {showQuestionBrowser ? "收起" : "+ 添加题目"}
            </button>
          </div>

          {/* 已选题目 */}
          {selectedQuestions.length > 0 && (
            <div className="space-y-1.5 mb-3">
              {selectedQuestions.map((q, i) => (
                <div key={q.id} className="flex items-start gap-2 rounded-xl bg-[#F4F5F6] p-3">
                  <span className="text-xs text-[#B4BCC8] mt-0.5 flex-shrink-0">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                        q.type === "choice" ? "bg-blue-50 text-blue-600"
                          : q.type === "fill_blank" ? "bg-amber-50 text-amber-600"
                          : "bg-purple-50 text-purple-600"
                      }`}>
                        {QUESTION_TYPES[q.type]}
                      </span>
                      {q.topic && <span className="text-[10px] text-[#B4BCC8]">{q.topic}</span>}
                    </div>
                    <p className="text-[13px] text-[#2E3338] line-clamp-1">{q.stem}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedQuestions((prev) => prev.filter((x) => x.id !== q.id))}
                    className="text-xs text-[#B4BCC8] hover:text-red-500 flex-shrink-0 mt-0.5"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 题目浏览器 */}
          {showQuestionBrowser && (
            <div className="rounded-xl border border-[#E8EAED] p-3 space-y-3 bg-[#FAFAFA]">
              <div className="flex gap-2">
                <select
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  className="flex-1 rounded-lg border-[1.5px] border-[#B4BCC8] bg-white px-2.5 py-1.5 text-[13px] outline-none"
                >
                  <option value="all">全部知识点</option>
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={searchQuestions}
                  disabled={searchingQ}
                  className="rounded-lg bg-[#163300] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                >
                  搜索
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1.5">
                {availableQuestions.length === 0 ? (
                  <p className="text-xs text-[#B4BCC8] py-3 text-center">
                    {searchingQ ? "搜索中..." : "没有更多可添加的题目"}
                  </p>
                ) : (
                  availableQuestions.map((q) => (
                    <div
                      key={q.id}
                      onClick={() => {
                        setSelectedQuestions((prev) => [...prev, q]);
                        setAvailableQuestions((prev) => prev.filter((x) => x.id !== q.id));
                      }}
                      className="cursor-pointer flex items-start gap-2 rounded-xl bg-white p-3 border border-[#E8EAED] hover:border-[#163300] transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                            q.type === "choice" ? "bg-blue-50 text-blue-600"
                              : q.type === "fill_blank" ? "bg-amber-50 text-amber-600"
                              : "bg-purple-50 text-purple-600"
                          }`}>
                            {QUESTION_TYPES[q.type]}
                          </span>
                          {q.topic && <span className="text-[10px] text-[#B4BCC8]">{q.topic}</span>}
                        </div>
                        <p className="text-[13px] text-[#2E3338] line-clamp-2">{q.stem}</p>
                      </div>
                      <span className="text-xs text-[#163300] font-medium flex-shrink-0">+ 添加</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* 附件上传 */}
        <div>
          <label className="mb-2 block text-[13px] font-medium text-[#4D5766]">
            附件（可选）
          </label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="flex flex-wrap gap-2">
            {pendingFiles.map((pf, i) => (
              <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-[#E8EAED]">
                <img src={pf.preview} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(pf.preview);
                    setPendingFiles((prev) => prev.filter((_, idx) => idx !== i));
                  }}
                  className="absolute top-0 right-0 bg-black/50 text-white text-[10px] rounded-bl px-1"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-16 h-16 rounded-lg border-[1.5px] border-dashed border-[#B4BCC8] flex items-center justify-center text-[#B4BCC8] hover:border-[#163300] hover:text-[#163300] transition-colors"
            >
              <span className="text-xl">+</span>
            </button>
          </div>
          <p className="mt-1 text-[11px] text-[#B4BCC8]">支持图片，单张最大10MB</p>
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
