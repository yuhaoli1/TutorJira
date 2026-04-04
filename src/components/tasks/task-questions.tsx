"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { QUESTION_TYPES, DIFFICULTY_LABELS } from "@/lib/constants";
import type { QuestionType } from "@/lib/supabase/types";

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
  };
}

// ============================================
// Teacher: pick questions for a task
// ============================================
export function TaskQuestionPicker({
  taskId,
  onUpdate,
  initialShowAnswers = true,
}: {
  taskId: string;
  onUpdate: () => void;
  initialShowAnswers?: boolean;
}) {
  const [linked, setLinked] = useState<TaskQuestion[]>([]);
  const [showBrowser, setShowBrowser] = useState(false);
  const [topics, setTopics] = useState<{ id: string; title: string }[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>("all");
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
      setLinked(data as unknown as TaskQuestion[]);
    }
  };

  const fetchTopics = async () => {
    const { data } = await supabase
      .from("knowledge_topics")
      .select("id, title")
      .order("sort_order");
    if (data) setTopics(data);
  };

  useEffect(() => {
    fetchLinked();
    fetchTopics();
  }, [taskId]);

  const searchQuestions = async () => {
    setSearching(true);
    let query = supabase
      .from("questions")
      .select("id, type, content, difficulty, topic:knowledge_topics(title)")
      .limit(30);

    if (selectedTopic !== "all") {
      query = query.eq("topic_id", selectedTopic);
    }

    const { data } = await query;
    if (data) {
      // Filter out already linked
      const linkedIds = new Set(linked.map((l) => l.question_id));
      setAvailable(
        (data as unknown as TaskQuestion["question"][]).filter((q) => !linkedIds.has(q.id))
      );
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
          关联题目
          {linked.length > 0 && (
            <span className="ml-1.5 text-xs text-[#B4BCC8]">{linked.length}</span>
          )}
        </h4>
        <button
          onClick={() => { setShowBrowser(!showBrowser); if (!showBrowser) searchQuestions(); }}
          className="rounded-full px-3 py-1 text-xs font-medium text-[#163300] hover:bg-[#F4F5F6] transition-colors duration-150"
        >
          {showBrowser ? "收起" : "+ 添加题目"}
        </button>
      </div>

      {/* 提交后展示答案开关 */}
      {linked.length > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-[#F4F5F6] px-3 py-2">
          <span className="text-[12px] text-[#4D5766]">学生提交后展示答案/讲解</span>
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
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${typeColor[tq.question.type] || ""}`}>
                    {QUESTION_TYPES[tq.question.type]}
                  </span>
                  <span className="text-[10px] text-[#B4BCC8]">
                    {DIFFICULTY_LABELS[tq.question.difficulty as keyof typeof DIFFICULTY_LABELS]}
                  </span>
                </div>
                <p className="text-[13px] text-[#2E3338] line-clamp-2">{tq.question.content.stem}</p>
              </div>
              <button
                onClick={() => removeQuestion(tq.id)}
                className="text-xs text-[#B4BCC8] hover:text-red-500 flex-shrink-0 mt-0.5"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Question browser */}
      {showBrowser && (
        <div className="rounded-xl border border-[#E8EAED] p-3 space-y-3 bg-[#FAFAFA]">
          <div className="flex gap-2">
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="flex-1 rounded-lg border-[1.5px] border-[#B4BCC8] bg-white px-2.5 py-1.5 text-[13px] text-[#2E3338] outline-none"
            >
              <option value="all">全部知识点</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
            <button
              onClick={searchQuestions}
              disabled={searching}
              className="rounded-lg bg-[#163300] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
            >
              搜索
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1.5">
            {available.length === 0 ? (
              <p className="text-xs text-[#B4BCC8] py-3 text-center">
                {searching ? "搜索中..." : "没有更多可添加的题目"}
              </p>
            ) : (
              available.map((q) => (
                <div
                  key={q.id}
                  onClick={() => addQuestion(q.id)}
                  className="cursor-pointer flex items-start gap-2 rounded-xl bg-white p-3 border border-[#E8EAED] hover:border-[#163300] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${typeColor[q.type] || ""}`}>
                        {QUESTION_TYPES[q.type]}
                      </span>
                      {q.topic && (
                        <span className="text-[10px] text-[#B4BCC8]">{q.topic.title}</span>
                      )}
                    </div>
                    <p className="text-[13px] text-[#2E3338] line-clamp-2">{q.content.stem}</p>
                  </div>
                  <span className="text-xs text-[#163300] font-medium flex-shrink-0">+ 添加</span>
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
  onStartPractice,
}: {
  taskId: string;
  onStartPractice: (questionIds: string[]) => void;
}) {
  const [linked, setLinked] = useState<TaskQuestion[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("task_questions")
        .select(`
          id, question_id, sort_order,
          question:questions(id, type, content, difficulty, topic:knowledge_topics(title))
        `)
        .eq("task_id", taskId)
        .order("sort_order");

      if (data) setLinked(data as unknown as TaskQuestion[]);
    };
    fetch();
  }, [taskId]);

  if (linked.length === 0) return null;

  const typeColor: Record<string, string> = {
    choice: "bg-blue-50 text-blue-600",
    fill_blank: "bg-amber-50 text-amber-600",
    solution: "bg-purple-50 text-purple-600",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[13px] font-medium text-[#2E3338]">
          题目
          <span className="ml-1.5 text-xs text-[#B4BCC8]">{linked.length}</span>
        </h4>
        <button
          onClick={() => onStartPractice(linked.map((l) => l.question_id))}
          className="rounded-full bg-[#163300] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#1e4400] transition-colors duration-150"
        >
          开始做题
        </button>
      </div>

      <div className="space-y-1.5">
        {linked.map((tq, i) => (
          <div key={tq.id} className="flex items-start gap-2 rounded-xl bg-[#F4F5F6] p-3">
            <span className="text-xs text-[#B4BCC8] mt-0.5 flex-shrink-0">{i + 1}.</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${typeColor[tq.question.type] || ""}`}>
                  {QUESTION_TYPES[tq.question.type]}
                </span>
                <span className="text-[10px] text-[#B4BCC8]">
                  {DIFFICULTY_LABELS[tq.question.difficulty as keyof typeof DIFFICULTY_LABELS]}
                </span>
              </div>
              <p className="text-[13px] text-[#2E3338] line-clamp-2">{tq.question.content.stem}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
