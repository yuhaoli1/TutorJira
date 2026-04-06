"use client";

import { useState, useEffect, useMemo } from "react";
import { QUESTION_TYPES, DIFFICULTY_LABELS } from "@/lib/constants";
import type { QuestionType } from "@/lib/supabase/types";
import { RefreshCw, Loader2, CheckCircle, XCircle, Filter } from "lucide-react";
import { TagBadges } from "@/components/questions/tag-badges";

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
    tags?: { id: string; name: string; slug: string | null; category_id: string; question_tag_categories?: { id: string; name: string; slug: string } | null }[];
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

  // 筛选状态
  const [filterTopic, setFilterTopic] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchWrongQuestions();
  }, []);

  const fetchWrongQuestions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/questions/attempts?wrong_only=true&limit=200");
      if (res.ok) {
        const data = await res.json();
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

  // 提取筛选选项
  const topics = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of attempts) {
      const t = a.questions.knowledge_topics;
      if (t) map.set(t.id, t.title);
    }
    return Array.from(map, ([id, title]) => ({ id, title }));
  }, [attempts]);

  const sources = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of attempts) {
      if (a.source) map.set(a.source.ticket_number, `${a.source.ticket_number} ${a.source.task_title}`);
    }
    return Array.from(map, ([id, label]) => ({ id, label }));
  }, [attempts]);

  const questionTypes = useMemo(() => {
    const set = new Set<string>();
    for (const a of attempts) set.add(a.questions.type);
    return Array.from(set);
  }, [attempts]);

  // 筛选后的列表
  const filteredAttempts = useMemo(() => {
    return attempts.filter((a) => {
      if (filterTopic !== "all" && a.questions.knowledge_topics?.id !== filterTopic) return false;
      if (filterSource !== "all" && a.source?.ticket_number !== filterSource) return false;
      if (filterType !== "all" && a.questions.type !== filterType) return false;
      return true;
    });
  }, [attempts, filterTopic, filterSource, filterType]);

  // 统计
  const stats = useMemo(() => {
    const byTopic = new Map<string, number>();
    const byType = new Map<string, number>();
    for (const a of attempts) {
      const topicName = a.questions.knowledge_topics?.title || "未分类";
      byTopic.set(topicName, (byTopic.get(topicName) || 0) + 1);
      const typeName = QUESTION_TYPES[a.questions.type as keyof typeof QUESTION_TYPES] || a.questions.type;
      byType.set(typeName, (byType.get(typeName) || 0) + 1);
    }
    return {
      total: attempts.length,
      byTopic: Array.from(byTopic, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      byType: Array.from(byType, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    };
  }, [attempts]);

  const hasActiveFilters = filterTopic !== "all" || filterSource !== "all" || filterType !== "all";

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
      {/* 统计摘要 */}
      <div className="rounded-xl bg-[#FAFAFA] border border-[#E8EAED] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-[#2E3338]">
            错题统计 <span className="text-[#B4BCC8] font-normal">共 {stats.total} 题</span>
          </p>
          <button
            onClick={fetchWrongQuestions}
            className="flex items-center gap-1.5 text-xs text-[#4D5766] hover:text-[#2E3338] transition-colors"
          >
            <RefreshCw className="size-3.5" />
            刷新
          </button>
        </div>
        {/* 按知识点分布 */}
        <div className="flex flex-wrap gap-2">
          {stats.byTopic.map((t) => (
            <span
              key={t.name}
              className="inline-flex items-center gap-1 rounded-full bg-white border border-[#E8EAED] px-2.5 py-1 text-xs text-[#4D5766]"
            >
              {t.name}
              <span className="font-medium text-[#2E3338]">{t.count}</span>
            </span>
          ))}
        </div>
        {/* 按题型分布 */}
        <div className="flex gap-4 text-xs text-[#B4BCC8]">
          {stats.byType.map((t) => (
            <span key={t.name}>{t.name} {t.count}题</span>
          ))}
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="space-y-2">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
            hasActiveFilters ? "text-[#163300]" : "text-[#4D5766] hover:text-[#2E3338]"
          }`}
        >
          <Filter className="size-3.5" />
          筛选
          {hasActiveFilters && (
            <span className="rounded-full bg-[#163300] text-white px-1.5 py-0.5 text-[10px]">
              {[filterTopic, filterSource, filterType].filter((f) => f !== "all").length}
            </span>
          )}
        </button>

        {showFilters && (
          <div className="flex flex-wrap gap-2 rounded-xl bg-[#F4F5F6] p-3">
            {/* 知识点筛选 */}
            {topics.length > 0 && (
              <select
                value={filterTopic}
                onChange={(e) => setFilterTopic(e.target.value)}
                className="rounded-lg border border-[#E8EAED] bg-white px-2.5 py-1.5 text-xs text-[#2E3338] outline-none focus:border-[#163300]"
              >
                <option value="all">全部知识点</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            )}

            {/* 题型筛选 */}
            {questionTypes.length > 1 && (
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="rounded-lg border border-[#E8EAED] bg-white px-2.5 py-1.5 text-xs text-[#2E3338] outline-none focus:border-[#163300]"
              >
                <option value="all">全部题型</option>
                {questionTypes.map((t) => (
                  <option key={t} value={t}>{QUESTION_TYPES[t as keyof typeof QUESTION_TYPES] || t}</option>
                ))}
              </select>
            )}

            {/* 来源任务筛选 */}
            {sources.length > 0 && (
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className="rounded-lg border border-[#E8EAED] bg-white px-2.5 py-1.5 text-xs text-[#2E3338] outline-none focus:border-[#163300]"
              >
                <option value="all">全部来源</option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            )}

            {hasActiveFilters && (
              <button
                onClick={() => { setFilterTopic("all"); setFilterSource("all"); setFilterType("all"); }}
                className="text-xs text-[#B4BCC8] hover:text-red-500 transition-colors"
              >
                清除筛选
              </button>
            )}
          </div>
        )}
      </div>

      {/* 题目列表 */}
      <p className="text-xs text-[#B4BCC8]">
        {hasActiveFilters
          ? `筛选结果：${filteredAttempts.length} / ${attempts.length} 题`
          : `共 ${attempts.length} 道错题`}
      </p>

      {filteredAttempts.length === 0 ? (
        <p className="text-center text-sm text-[#B4BCC8] py-8">没有匹配的错题</p>
      ) : (
        filteredAttempts.map((attempt) => {
          const q = attempt.questions;
          const isRetrying = retrying === attempt.id;
          const result = retryResult?.id === attempt.id ? retryResult : null;

          return (
            <div key={attempt.id} className="rounded-xl border border-[#E8EAED] bg-white p-4">
              {/* Tags */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {q.tags && q.tags.length > 0 ? (
                  <TagBadges tags={q.tags} />
                ) : (
                  <>
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
                  </>
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
        })
      )}
    </div>
  );
}
