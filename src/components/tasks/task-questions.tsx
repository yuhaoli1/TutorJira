"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { QUESTION_TYPES, DIFFICULTY_LABELS, TAG_CATEGORIES } from "@/lib/constants";
import type { QuestionType } from "@/lib/supabase/types";
import { TagBadges, type Tag as QuestionTag } from "@/components/questions/tag-badges";
import { getTypeFromTags, getDifficultyFromTags } from "@/lib/tag-utils";

interface TaskQuestion {
  id: string;
  question_id: string;
  sort_order: number;
  question: {
    id: string;
    type: QuestionType;
    content: { stem: string; options?: string[]; answer: string; explanation?: string };
    difficulty: number;
    topic: { title: string } | null;
    tags?: QuestionTag[];
  };
}

// ============================================
// Teacher: pick questions for a task
// ============================================
export function TaskQuestionPicker({
  taskId,
  onUpdate,
  initialShowAnswers = true,
  readOnly = false,
}: {
  taskId: string;
  onUpdate: () => void;
  initialShowAnswers?: boolean;
  readOnly?: boolean;
}) {
  const [linked, setLinked] = useState<TaskQuestion[]>([]);
  const [showBrowser, setShowBrowser] = useState(false);
  const [knowledgeTags, setKnowledgeTags] = useState<{ id: string; name: string; parent_id: string | null }[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string>("all");
  const [available, setAvailable] = useState<TaskQuestion["question"][]>([]);
  const [searching, setSearching] = useState(false);
  const [showAnswers, setShowAnswers] = useState(initialShowAnswers);
  const supabase = createClient();

  const toggleShowAnswers = async (value: boolean) => {
    setShowAnswers(value);
    await supabase.from("tasks").update({ show_answers_after_submit: value }).eq("id", taskId);
  };

  const fetchLinked = async () => {
    const { data } = await supabase
      .from("task_questions")
      .select(`
        id, question_id, sort_order,
        question:questions(id, type, content, difficulty, topic:knowledge_topics(title))
      `)
      .eq("task_id", taskId)
      .order("sort_order");

    if (data) {
      const linked = data as unknown as TaskQuestion[];
      // Fetch tags for each question
      const qIds = linked.map((tq) => tq.question.id);
      if (qIds.length > 0) {
        const { data: tagLinks } = await supabase
          .from("question_tag_links")
          .select("question_id, question_tags(id, name, slug, category_id, question_tag_categories(id, name, slug))")
          .in("question_id", qIds);
        if (tagLinks) {
          const tagMap: Record<string, QuestionTag[]> = {};
          for (const link of tagLinks) {
            if (!tagMap[link.question_id]) tagMap[link.question_id] = [];
            if (link.question_tags) tagMap[link.question_id].push(link.question_tags as unknown as QuestionTag);
          }
          for (const tq of linked) {
            tq.question.tags = tagMap[tq.question.id] || [];
          }
        }
      }
      setLinked(linked);
    }
  };

  const fetchKnowledgeTags = async () => {
    const res = await fetch(`/api/tags?category_slug=${TAG_CATEGORIES.KNOWLEDGE_POINT}`);
    const data = await res.json();
    setKnowledgeTags(data.tags || []);
  };

  useEffect(() => {
    fetchLinked();
    fetchKnowledgeTags();
  }, [taskId]);

  const searchQuestions = async () => {
    setSearching(true);
    const params = new URLSearchParams({ page_size: "30" });
    if (selectedTagId !== "all") params.set("tag_id", selectedTagId);

    try {
      const res = await fetch(`/api/questions?${params}`);
      const data = await res.json();
      const linkedIds = new Set(linked.map((l) => l.question_id));
      setAvailable(
        ((data.questions || []) as TaskQuestion["question"][]).filter((q) => !linkedIds.has(q.id))
      );
    } catch {
      setAvailable([]);
    }
    setSearching(false);
  };

  const addQuestion = async (questionId: string) => {
    await supabase.from("task_questions").insert({
      task_id: taskId,
      question_id: questionId,
      sort_order: linked.length,
    });
    fetchLinked();
    setAvailable((prev) => prev.filter((q) => q.id !== questionId));
  };

  const removeQuestion = async (linkId: string) => {
    await supabase.from("task_questions").delete().eq("id", linkId);
    fetchLinked();
  };

  const typeColor: Record<string, string> = {
    choice: "bg-blue-50 text-blue-600",
    fill_blank: "bg-amber-50 text-amber-600",
    solution: "bg-purple-50 text-purple-600",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[13px] font-medium text-[#2E3338]">
          Linked questions
          {linked.length > 0 && (
            <span className="ml-1.5 text-xs text-[#B4BCC8]">{linked.length}</span>
          )}
        </h4>
        {!readOnly && (
          <button
            onClick={() => { setShowBrowser(!showBrowser); if (!showBrowser) searchQuestions(); }}
            className="rounded-full px-3 py-1 text-xs font-medium text-[#163300] hover:bg-[#F4F5F6] transition-colors duration-150"
          >
            {showBrowser ? "Collapse" : "+ Add questions"}
          </button>
        )}
      </div>

      {/* Show answers after submit toggle */}
      {!readOnly && linked.length > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-[#F4F5F6] px-3 py-2">
          <span className="text-[12px] text-[#4D5766]">Show answers/explanations after student submits</span>
          <button
            type="button"
            onClick={() => toggleShowAnswers(!showAnswers)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${
              showAnswers ? "bg-[#163300]" : "bg-[#B4BCC8]"
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200 ${
                showAnswers ? "translate-x-[18px]" : "translate-x-[3px]"
              }`}
            />
          </button>
        </div>
      )}

      {/* Linked questions */}
      {linked.length > 0 && (
        <div className="space-y-1.5">
          {linked.map((tq, i) => (
            <div key={tq.id} className="flex items-start gap-2 rounded-xl bg-[#F4F5F6] p-3">
              <span className="text-xs text-[#B4BCC8] mt-0.5 flex-shrink-0">{i + 1}.</span>
              <div className="flex-1 min-w-0">
                {tq.question.tags && tq.question.tags.length > 0 ? (
                  <div className="mb-1"><TagBadges tags={tq.question.tags} /></div>
                ) : (
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${typeColor[tq.question.type] || ""}`}>
                      {QUESTION_TYPES[tq.question.type]}
                    </span>
                    <span className="text-[10px] text-[#B4BCC8]">
                      {DIFFICULTY_LABELS[tq.question.difficulty as keyof typeof DIFFICULTY_LABELS]}
                    </span>
                  </div>
                )}
                <p className="text-[13px] text-[#2E3338] line-clamp-2">{tq.question.content.stem}</p>
              </div>
              {!readOnly && (
                <button
                  onClick={() => removeQuestion(tq.id)}
                  className="text-xs text-[#B4BCC8] hover:text-red-500 flex-shrink-0 mt-0.5"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Question browser */}
      {!readOnly && showBrowser && (
        <div className="rounded-xl border border-[#E8EAED] p-3 space-y-3 bg-[#FAFAFA]">
          <div className="flex gap-2">
            <select
              value={selectedTagId}
              onChange={(e) => setSelectedTagId(e.target.value)}
              className="flex-1 rounded-lg border-[1.5px] border-[#B4BCC8] bg-white px-2.5 py-1.5 text-[13px] text-[#2E3338] outline-none"
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
              onClick={searchQuestions}
              disabled={searching}
              className="rounded-lg bg-[#163300] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
            >
              Search
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1.5">
            {available.length === 0 ? (
              <p className="text-xs text-[#B4BCC8] py-3 text-center">
                {searching ? "Searching..." : "No more questions to add"}
              </p>
            ) : (
              available.map((q) => (
                <div
                  key={q.id}
                  onClick={() => addQuestion(q.id)}
                  className="cursor-pointer flex items-start gap-2 rounded-xl bg-white p-3 border border-[#E8EAED] hover:border-[#163300] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    {q.tags && q.tags.length > 0 ? (
                      <div className="mb-1"><TagBadges tags={q.tags} /></div>
                    ) : (
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${typeColor[q.type] || ""}`}>
                          {QUESTION_TYPES[q.type]}
                        </span>
                        {q.topic && (
                          <span className="text-[10px] text-[#B4BCC8]">{q.topic.title}</span>
                        )}
                      </div>
                    )}
                    <p className="text-[13px] text-[#2E3338] line-clamp-2">{q.content.stem}</p>
                  </div>
                  <span className="text-xs text-[#163300] font-medium flex-shrink-0">+ Add</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Student: view linked questions & start practice
// ============================================
export function TaskQuestionList({
  taskId,
  assignmentId,
  onStartPractice,
  showAnswers = true,
}: {
  taskId: string;
  assignmentId: string;
  onStartPractice: (questionIds: string[]) => void;
  showAnswers?: boolean;
}) {
  const [linked, setLinked] = useState<TaskQuestion[]>([]);
  const [submissions, setSubmissions] = useState<Map<string, { answer: string; is_correct: boolean; submitted_at: string }>>(new Map());
  const [showHistory, setShowHistory] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      // Fetch linked questions
      const { data } = await supabase
        .from("task_questions")
        .select(`
          id, question_id, sort_order,
          question:questions(id, type, content, difficulty, topic:knowledge_topics(title))
        `)
        .eq("task_id", taskId)
        .order("sort_order");

      if (data) {
        const linkedData = data as unknown as TaskQuestion[];
        // Fetch tags
        const qIds = linkedData.map((tq) => tq.question.id);
        if (qIds.length > 0) {
          const { data: tagLinks } = await supabase
            .from("question_tag_links")
            .select("question_id, question_tags(id, name, slug, category_id, question_tag_categories(id, name, slug))")
            .in("question_id", qIds);
          if (tagLinks) {
            const tagMap: Record<string, QuestionTag[]> = {};
            for (const link of tagLinks) {
              if (!tagMap[link.question_id]) tagMap[link.question_id] = [];
              if (link.question_tags) tagMap[link.question_id].push(link.question_tags as unknown as QuestionTag);
            }
            for (const tq of linkedData) {
              tq.question.tags = tagMap[tq.question.id] || [];
            }
          }
        }
        setLinked(linkedData);
      }

      // Fetch submission records
      const { data: subs } = await supabase
        .from("task_submission_answers")
        .select("question_id, answer, is_correct, submitted_at")
        .eq("task_assignment_id", assignmentId);

      if (subs) {
        const map = new Map<string, { answer: string; is_correct: boolean; submitted_at: string }>();
        subs.forEach((s) => map.set(s.question_id, { answer: s.answer, is_correct: s.is_correct, submitted_at: s.submitted_at }));
        setSubmissions(map);
      }
    };
    fetchData();
  }, [taskId, assignmentId]);

  if (linked.length === 0) return null;

  const typeColor: Record<string, string> = {
    choice: "bg-blue-50 text-blue-600",
    fill_blank: "bg-amber-50 text-amber-600",
    solution: "bg-purple-50 text-purple-600",
  };

  const hasSubmissions = submissions.size > 0;
  const correctCount = Array.from(submissions.values()).filter((s) => s.is_correct).length;
  const lastTime = hasSubmissions
    ? new Date(Math.max(...Array.from(submissions.values()).map((s) => new Date(s.submitted_at).getTime())))
    : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[13px] font-medium text-[#2E3338]">
          Questions
          <span className="ml-1.5 text-xs text-[#B4BCC8]">{linked.length}</span>
        </h4>
        <button
          onClick={() => onStartPractice(linked.map((l) => l.question_id))}
          className="rounded-full bg-[#163300] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#1e4400] transition-colors duration-150"
        >
          {hasSubmissions ? "Retry" : "Start"}
        </button>
      </div>

      {/* Submission summary */}
      {hasSubmissions && (
        <div className="rounded-xl bg-[#F4F5F6] p-3">
          <div className="flex items-center justify-between">
            <div className="text-[13px] text-[#2E3338]">
              <span className="font-medium">Submitted</span>
              {showAnswers && (
                <span className={`ml-2 text-xs font-medium ${
                  correctCount / submissions.size >= 0.8 ? "text-green-600"
                    : correctCount / submissions.size >= 0.6 ? "text-amber-600"
                    : "text-red-600"
                }`}>
                  {correctCount}/{submissions.size} correct
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {lastTime && (
                <span className="text-[11px] text-[#B4BCC8]">
                  {lastTime.toLocaleDateString("en-US", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="text-[12px] font-medium text-[#163300] hover:underline"
              >
                {showHistory ? "Collapse" : "View details"}
              </button>
            </div>
          </div>

          {/* Expanded details */}
          {showHistory && (
            <div className="mt-3 space-y-2 border-t border-[#E8EAED] pt-3">
              {linked.map((tq, i) => {
                const sub = submissions.get(tq.question_id);
                return (
                  <div key={tq.id} className={`rounded-lg p-2.5 ${
                    !sub ? "bg-white border border-[#E8EAED]"
                      : sub.is_correct ? "bg-green-50/50 border border-green-200"
                      : "bg-red-50/50 border border-red-200"
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-[#B4BCC8]">{i + 1}.</span>
                      {sub ? (
                        <span className={`text-[11px] font-medium ${sub.is_correct ? "text-green-600" : "text-red-600"}`}>
                          {sub.is_correct ? "Correct" : "Wrong"}
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#B4BCC8]">Not answered</span>
                      )}
                    </div>
                    <p className="text-[12px] text-[#2E3338] line-clamp-1">{tq.question.content.stem}</p>
                    {sub && (
                      <div className="mt-1 text-[11px]">
                        <span className="text-[#4D5766]">My answer: </span>
                        <span className="font-medium text-[#2E3338]">{sub.answer || "(empty)"}</span>
                        {!sub.is_correct && showAnswers && (
                          <>
                            <span className="mx-1 text-[#B4BCC8]">|</span>
                            <span className="text-green-700">Correct: {tq.question.content.answer}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Question list (shown before submission) */}
      {!hasSubmissions && (
        <div className="space-y-1.5">
          {linked.map((tq, i) => (
            <div key={tq.id} className="flex items-start gap-2 rounded-xl bg-[#F4F5F6] p-3">
              <span className="text-xs text-[#B4BCC8] mt-0.5 flex-shrink-0">{i + 1}.</span>
              <div className="flex-1 min-w-0">
                {tq.question.tags && tq.question.tags.length > 0 ? (
                  <div className="mb-1"><TagBadges tags={tq.question.tags} /></div>
                ) : (
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${typeColor[tq.question.type] || ""}`}>
                      {QUESTION_TYPES[tq.question.type]}
                    </span>
                    <span className="text-[10px] text-[#B4BCC8]">
                      {DIFFICULTY_LABELS[tq.question.difficulty as keyof typeof DIFFICULTY_LABELS]}
                    </span>
                  </div>
                )}
                <p className="text-[13px] text-[#2E3338] line-clamp-2">{tq.question.content.stem}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
