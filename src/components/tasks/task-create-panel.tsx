"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { TASK_TYPES, TASK_PRIORITIES, QUESTION_TYPES, DIFFICULTY_LABELS, RECURRENCE_TYPES, WEEKDAYS, TAG_CATEGORIES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { LabelPicker } from "./label-picker";
import { TagBadges, type Tag } from "@/components/questions/tag-badges";
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

  // Linked questions
  const [selectedQuestions, setSelectedQuestions] = useState<{ id: string; type: QuestionType; stem: string; topic?: string; tags?: unknown[] }[]>([]);
  const [showQuestionBrowser, setShowQuestionBrowser] = useState(false);
  const [knowledgeTags, setKnowledgeTags] = useState<{ id: string; name: string; parent_id: string | null }[]>([]);
  const [selectedTagId, setSelectedTagId] = useState("all");
  const [availableQuestions, setAvailableQuestions] = useState<{ id: string; type: QuestionType; stem: string; topic?: string; tags?: unknown[] }[]>([]);
  const [searchingQ, setSearchingQ] = useState(false);
  const [showAnswersAfterSubmit, setShowAnswersAfterSubmit] = useState(true);

  // Attachment upload
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
    fetch(`/api/tags?category_slug=${TAG_CATEGORIES.KNOWLEDGE_POINT}`)
      .then((r) => r.json())
      .then((d) => setKnowledgeTags(d.tags || []))
      .catch(() => {});
  }, [supabase]);

  const searchQuestions = async () => {
    setSearchingQ(true);
    try {
      const params = new URLSearchParams({ page_size: "30" });
      if (selectedTagId !== "all") params.set("tag_id", selectedTagId);
      const res = await fetch(`/api/questions?${params}`);
      const data = await res.json();
      const selectedIds = new Set(selectedQuestions.map((q) => q.id));
      interface APIQuestion {
        id: string;
        type: QuestionType;
        content: { stem: string };
        knowledge_topics?: { title: string } | null;
        tags?: unknown[];
      }
      setAvailableQuestions(
        ((data.questions || []) as APIQuestion[])
          .filter((q) => !selectedIds.has(q.id))
          .map((q) => ({ id: q.id, type: q.type, stem: q.content.stem, topic: q.knowledge_topics?.title, tags: q.tags }))
      );
    } catch {
      setAvailableQuestions([]);
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
          show_answers_after_submit: showAnswersAfterSubmit,
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
        <h3 className="text-sm font-bold text-[#2E3338]">New task</h3>
        <button
          onClick={onClose}
          className="rounded-full p-1.5 text-[#B4BCC8] hover:bg-[#F4F5F6] hover:text-[#4D5766] transition-colors duration-150"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {/* Task type */}
        <div>
          <label className="mb-2 block text-[13px] font-medium text-[#4D5766]">
            Type
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

        {/* Title */}
        <div>
          <label className="mb-2 block text-[13px] font-medium text-[#4D5766]">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Unit 3 spelling"
            className="w-full rounded-lg border-[1.5px] border-[#B4BCC8] px-3 py-2.5 text-[13px] text-[#2E3338] outline-none focus:border-[#163300] focus:ring-2 focus:ring-[#163300]/15 transition-colors duration-150"
          />
        </div>

        {/* Description */}
        <div>
          <label className="mb-2 block text-[13px] font-medium text-[#4D5766]">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Details or instructions..."
            rows={3}
            className="w-full rounded-lg border-[1.5px] border-[#B4BCC8] px-3 py-2.5 text-[13px] text-[#2E3338] outline-none focus:border-[#163300] focus:ring-2 focus:ring-[#163300]/15 transition-colors duration-150 resize-none"
          />
        </div>

        {/* Priority */}
        <div>
          <label className="mb-2 block text-[13px] font-medium text-[#4D5766]">
            Priority
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

        {/* Labels */}
        <div>
          <label className="mb-2 block text-[13px] font-medium text-[#4D5766]">
            Labels (optional)
          </label>
          <LabelPicker selectedIds={labelIds} onChange={setLabelIds} />
        </div>

        {/* Linked questions */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[13px] font-medium text-[#4D5766]">
              Linked questions (optional)
              {selectedQuestions.length > 0 && (
                <span className="ml-1.5 text-xs text-[#B4BCC8]">{selectedQuestions.length}</span>
              )}
            </label>
            <button
              type="button"
              onClick={() => { setShowQuestionBrowser(!showQuestionBrowser); if (!showQuestionBrowser) searchQuestions(); }}
              className="text-xs font-medium text-[#163300] hover:text-[#163300]/70 transition-colors"
            >
              {showQuestionBrowser ? "Collapse" : "+ Add questions"}
            </button>
          </div>

          {/* Selected questions */}
          {selectedQuestions.length > 0 && (
            <div className="space-y-1.5 mb-3">
              {selectedQuestions.map((q, i) => (
                <div key={q.id} className="flex items-start gap-2 rounded-xl bg-[#F4F5F6] p-3">
                  <span className="text-xs text-[#B4BCC8] mt-0.5 flex-shrink-0">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    {q.tags && (q.tags as Tag[]).length > 0 ? (
                      <div className="mb-0.5"><TagBadges tags={q.tags as Tag[]} /></div>
                    ) : (
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
                    )}
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

          {/* Show answers after submit toggle */}
          {selectedQuestions.length > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-[#F4F5F6] px-3 py-2">
              <span className="text-[12px] text-[#4D5766]">Show answers/explanations after student submits</span>
              <button
                type="button"
                onClick={() => setShowAnswersAfterSubmit(!showAnswersAfterSubmit)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${
                  showAnswersAfterSubmit ? "bg-[#163300]" : "bg-[#B4BCC8]"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200 ${
                    showAnswersAfterSubmit ? "translate-x-[18px]" : "translate-x-[3px]"
                  }`}
                />
              </button>
            </div>
          )}

          {/* Question browser */}
          {showQuestionBrowser && (
            <div className="rounded-xl border border-[#E8EAED] p-3 space-y-3 bg-[#FAFAFA]">
              <div className="flex gap-2">
                <select
                  value={selectedTagId}
                  onChange={(e) => setSelectedTagId(e.target.value)}
                  className="flex-1 rounded-lg border-[1.5px] border-[#B4BCC8] bg-white px-2.5 py-1.5 text-[13px] outline-none"
                >
                  <option value="all">All topics</option>
                  {knowledgeTags.filter((t) => !t.parent_id).map((root) => {
                    const children = knowledgeTags.filter((t) => t.parent_id === root.id);
                    if (children.length === 0) return <option key={root.id} value={root.id}>{root.name}</option>;
                    return (
                      <optgroup key={root.id} label={root.name}>
                        <option value={root.id}>{root.name} (all)</option>
                        {children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </optgroup>
                    );
                  })}
                </select>
                <button
                  type="button"
                  onClick={searchQuestions}
                  disabled={searchingQ}
                  className="rounded-lg bg-[#163300] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                >
                  Search
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1.5">
                {availableQuestions.length === 0 ? (
                  <p className="text-xs text-[#B4BCC8] py-3 text-center">
                    {searchingQ ? "Searching..." : "No more questions to add"}
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
                        {q.tags && (q.tags as Tag[]).length > 0 ? (
                          <div className="mb-0.5"><TagBadges tags={q.tags as Tag[]} /></div>
                        ) : (
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
                        )}
                        <p className="text-[13px] text-[#2E3338] line-clamp-2">{q.stem}</p>
                      </div>
                      <span className="text-xs text-[#163300] font-medium flex-shrink-0">+ Add</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Attachment upload */}
        <div>
          <label className="mb-2 block text-[13px] font-medium text-[#4D5766]">
            Attachments (optional)
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
          <p className="mt-1 text-[11px] text-[#B4BCC8]">Images only, max 10MB each</p>
        </div>

        {/* Recurring task toggle */}
        <div className="flex items-center justify-between">
          <label className="text-[13px] font-medium text-[#4D5766]">
            Recurring task
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

        {/* Recurrence settings */}
        {isRecurring && (
          <div className="space-y-4 rounded-xl border border-[#E8EAED] p-4 bg-[#FAFAFA]">
            {/* Frequency */}
            <div>
              <label className="mb-2 block text-[13px] font-medium text-[#4D5766]">
                Frequency
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

            {/* Weekdays (weekly mode only) */}
            {recurrenceType === "weekly" && (
              <div>
                <label className="mb-2 block text-[13px] font-medium text-[#4D5766]">
                  Select days
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

            {/* End date */}
            <div>
              <label className="mb-2 block text-[13px] font-medium text-[#4D5766]">
                End date (optional)
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

        {/* Due date / Start date */}
        <div>
          <label className="mb-2 block text-[13px] font-medium text-[#4D5766]">
            {isRecurring ? "Start date" : "Due date"}
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-lg border-[1.5px] border-[#B4BCC8] px-3 py-2.5 text-[13px] text-[#2E3338] outline-none focus:border-[#163300] focus:ring-2 focus:ring-[#163300]/15 transition-colors duration-150"
          />
        </div>

        {/* Assign students */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[13px] font-medium text-[#4D5766]">
              Assign students
            </label>
            <button
              onClick={toggleAll}
              className="text-xs text-[#163300] hover:text-[#163300]/70 font-medium transition-colors duration-150"
            >
              {selectedStudents.length === students.length
                ? "Deselect all"
                : "Select all"}
            </button>
          </div>
          {students.length === 0 ? (
            <p className="text-[13px] text-[#B4BCC8]">No students yet — add a student first</p>
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
            ? "Creating..."
            : isRecurring
              ? `Create recurring task (${selectedStudents.length})`
              : `Create task (${selectedStudents.length})`}
        </Button>
      </div>
    </div>
  );
}
