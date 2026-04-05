"use client";

import { useState, useEffect } from "react";
import { QUESTION_TYPES, DIFFICULTY_LABELS } from "@/lib/constants";
import type { QuestionType } from "@/lib/supabase/types";
import { RefreshCw, Loader2, CheckCircle, XCircle } from "lucide-react";

interface WrongAttempt {
  id: string;
  answer: string;
  is_correct: boolean;
  attempted_at: string;
  source?: { ticket_number: string; task_title: string };
  questions: {
    id: string;
    type: QuestionType;
    content: {
      stem: string;
      options?: string[];
      answer: string;
      explanation?: string;
    };
    difficulty: number;
    knowledge_topics: { id: string; title: string } | null;
  };
}

interface WrongBookListProps {
  studentId: string;
}

const TYPE_COLORS: Record<string, string> = {
  choice: "bg-blue-50 text-blue-600",
  fill_blank: "bg-amber-50 text-amber-600",
  solution: "bg-green-50 text-green-600",
};

export function WrongBookList({ studentId }: WrongBookListProps) {
  const [attempts, setAttempts] = useState<WrongAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [retryAnswer, setRetryAnswer] = useState("");
  const [retryResult, setRetryResult] = useState<{ id: string; correct: boolean } | null>(null);

  useEffect(() => {
    fetchWrongQuestions();
  }, []);

  const fetchWrongQuestions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/questions/attempts?wrong_only=true&limit=100");
      if (res.ok) {
        const data = await res.json();
        // Filter out attempts where question data is missing and deduplicate by question id
        const seen = new Set<string>();
        const filtered = (data.attempts || []).filter((a: WrongAttempt) => {
          if (!a.questions || seen.has(a.questions.id)) return false;
          seen.add(a.questions.id);
          return true;
        });
        setAttempts(filtered);
      }
    } catch (error) {
      console.error("获取错题失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = (attemptId: string) => {
    setRetrying(attemptId);
    setRetryAnswer("");
    setRetryResult(null);
  };

  const handleSubmitRetry = async (attempt: WrongAttempt) => {
    if (!retryAnswer.trim()) return;

    const q = attempt.questions;
    const normalize = (s: string) =>
      s.trim().toLowerCase().replace(/\s+/g, "").replace(/[，。、；：""''（）]/g, "");

    const correct = normalize(retryAnswer) === normalize(q.content.answer);

    // Save attempt
    try {
      await fetch("/api/questions/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_id: q.id,
          answer: retryAnswer,
          is_correct: correct,
          time_spent_seconds: 0,
        }),
      });
    } catch (e) {
      console.error("保存重做记录失败:", e);
    }

    setRetryResult({ id: attempt.id, correct });

    // If correct, remove from list after a delay
    if (correct) {
      setTimeout(() => {
        setAttempts((prev) => prev.filter((a) => a.id !== attempt.id));
        setRetrying(null);
        setRetryResult(null);
      }, 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="size-8 text-[#163300] animate-spin" />
        <p className="mt-3 text-sm text-[#B4BCC8]">加载中...</p>
      </div>
    );
  }

  if (attempts.length === 0) {
    return (
      <div className="text-center py-20">
        <CheckCircle className="size-16 text-[#9FE870] mx-auto mb-4" />
        <p className="text-lg font-medium text-[#2E3338]">太棒了！没有错题</p>
        <p className="text-sm text-[#B4BCC8] mt-1">继续保持，去做更多练习吧</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#4D5766]">
          共 <span className="font-medium text-[#2E3338]">{attempts.length}</span> 道错题
        </p>
        <button
          onClick={fetchWrongQuestions}
          className="flex items-center gap-1.5 text-xs text-[#4D5766] hover:text-[#2E3338] transition-colors"
        >
          <RefreshCw className="size-3.5" />
          刷新
        </button>
      </div>

      {attempts.map((attempt) => {
        const q = attempt.questions;
        const isRetrying = retrying === attempt.id;
        const result = retryResult?.id === attempt.id ? retryResult : null;

        return (
          <div key={attempt.id} className="rounded-xl border border-[#E8EAED] bg-white p-4">
            {/* Tags */}
            <div className="flex items-center gap-2 mb-3">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  TYPE_COLORS[q.type] || "bg-gray-50 text-gray-600"
                }`}
              >
                {QUESTION_TYPES[q.type as keyof typeof QUESTION_TYPES]}
              </span>
              <span className="text-xs text-[#B4BCC8]">
                难度 {DIFFICULTY_LABELS[q.difficulty as keyof typeof DIFFICULTY_LABELS]}
              </span>
              {q.knowledge_topics && (
                <span className="text-xs text-[#B4BCC8]">{q.knowledge_topics.title}</span>
              )}
              {attempt.source && (
                <span className="ml-auto text-xs text-[#B4BCC8]">
                  来自：{attempt.source.ticket_number} {attempt.source.task_title}
                </span>
              )}
            </div>

            {/* Stem */}
            <p className="text-sm text-[#2E3338] leading-relaxed whitespace-pre-wrap mb-3">
              {q.content.stem}
            </p>

            {/* Options for choice */}
            {q.type === "choice" && q.content.options && (
              <div className="space-y-1 mb-3">
                {q.content.options.map((opt, i) => (
                  <p key={i} className="text-sm text-[#4D5766] pl-2">
                    {String.fromCharCode(65 + i)}. {opt}
                  </p>
                ))}
              </div>
            )}

            {/* Your wrong answer + correct answer */}
            <div className="p-3 rounded-lg bg-red-50/50 border border-red-100 mb-3">
              <p className="text-xs text-red-500">
                你的答案：{attempt.answer}
              </p>
              <p className="text-xs text-[#163300] mt-1">
                正确答案：{q.content.answer}
              </p>
              {q.content.explanation && (
                <p className="text-xs text-[#4D5766] mt-1">解析：{q.content.explanation}</p>
              )}
            </div>

            {/* Retry section */}
            {!isRetrying ? (
              <button
                onClick={() => handleRetry(attempt.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#163300] text-[#163300] text-xs font-medium hover:bg-[#163300] hover:text-white transition-colors"
              >
                <RefreshCw className="size-3" />
                重做
              </button>
            ) : (
              <div className="mt-2">
                {q.type === "choice" ? (
                  <div className="flex gap-2 mb-2">
                    {q.content.options?.map((_, i) => {
                      const letter = String.fromCharCode(65 + i);
                      return (
                        <button
                          key={i}
                          onClick={() => setRetryAnswer(letter)}
                          className={`px-3 py-1.5 rounded-lg border text-sm ${
                            retryAnswer === letter
                              ? "border-[#163300] bg-[#163300]/5 font-medium"
                              : "border-[#E8EAED] text-[#4D5766]"
                          }`}
                        >
                          {letter}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={retryAnswer}
                    onChange={(e) => setRetryAnswer(e.target.value)}
                    placeholder="输入答案"
                    className="w-full px-3 py-2 rounded-lg border border-[#E8EAED] text-sm mb-2 outline-none focus:border-[#163300]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSubmitRetry(attempt);
                    }}
                  />
                )}

                {result ? (
                  <div className={`flex items-center gap-1.5 text-sm ${result.correct ? "text-green-600" : "text-red-500"}`}>
                    {result.correct ? <CheckCircle className="size-4" /> : <XCircle className="size-4" />}
                    {result.correct ? "答对了！" : "还是错了，再看看解析吧"}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSubmitRetry(attempt)}
                      disabled={!retryAnswer.trim()}
                      className="px-3 py-1.5 rounded-full bg-[#163300] text-white text-xs font-medium disabled:opacity-40"
                    >
                      提交
                    </button>
                    <button
                      onClick={() => { setRetrying(null); setRetryAnswer(""); }}
                      className="px-3 py-1.5 rounded-full border border-[#E8EAED] text-xs text-[#4D5766]"
                    >
                      取消
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
