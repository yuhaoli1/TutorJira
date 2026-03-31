"use client";

import { useState, useEffect } from "react";
import { QUESTION_TYPES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Trash2, Plus, ChevronDown, ChevronUp } from "lucide-react";

interface ExtractedQ {
  stem: string;
  type: "choice" | "fill_blank" | "solution";
  options?: string[];
  answer: string;
  explanation?: string;
  difficulty: number;
  topic_id?: string;
}

interface Topic {
  id: string;
  title: string;
}

interface AIReviewPanelProps {
  uploadId: string;
  questions: ExtractedQ[];
  onSaved: () => void;
}

export function AIReviewPanel({ uploadId, questions: initialQuestions, onSaved }: AIReviewPanelProps) {
  const [questions, setQuestions] = useState<ExtractedQ[]>(initialQuestions);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [saving, setSaving] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
    try {
      const res = await fetch("/api/topics");
      const data = await res.json();
      const flat: Topic[] = [];
      const flatten = (nodes: { id: string; title: string; children?: typeof nodes }[]) => {
        for (const n of nodes) {
          flat.push({ id: n.id, title: n.title });
          if (n.children) flatten(n.children);
        }
      };
      flatten(data.topics || []);
      setTopics(flat);
    } catch (e) {
      console.error("获取知识点失败:", e);
    }
  };

  const updateQuestion = (index: number, updates: Partial<ExtractedQ>) => {
    setQuestions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
    if (expandedIndex === index) setExpandedIndex(null);
  };

  const handleSaveAll = async () => {
    // 验证所有题目都有 topic_id
    const missingTopic = questions.findIndex((q) => !q.topic_id);
    if (missingTopic >= 0) {
      alert(`第 ${missingTopic + 1} 题尚未选择知识点`);
      setExpandedIndex(missingTopic);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/questions/upload/${uploadId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(`成功保存 ${data.count} 道题目`);
        onSaved();
      } else {
        const data = await res.json();
        alert(data.error || "保存失败");
      }
    } catch (e) {
      console.error("保存失败:", e);
      alert("保存失败");
    } finally {
      setSaving(false);
    }
  };

  if (questions.length === 0) {
    return (
      <div className="text-center py-8 text-[#B4BCC8] text-sm">
        未识别到题目
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-[#2E3338]">
          共识别 {questions.length} 道题目，请审核后保存
        </p>
        <Button onClick={handleSaveAll} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin mr-1" />
              保存中...
            </>
          ) : (
            <>
              <Save className="size-4 mr-1" />
              保存全部
            </>
          )}
        </Button>
      </div>

      {questions.map((q, index) => {
        const isExpanded = expandedIndex === index;
        return (
          <div
            key={index}
            className="rounded-xl border border-[#E8EAED] bg-white overflow-hidden"
          >
            {/* 折叠标题 */}
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#F4F5F6]"
              onClick={() => setExpandedIndex(isExpanded ? null : index)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="shrink-0 w-6 h-6 rounded-full bg-[#163300] text-white text-xs flex items-center justify-center font-medium">
                  {index + 1}
                </span>
                <span className="text-sm text-[#2E3338] truncate">
                  {q.stem.slice(0, 60)}{q.stem.length > 60 ? "..." : ""}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-[#B4BCC8]">
                  {QUESTION_TYPES[q.type as keyof typeof QUESTION_TYPES]}
                </span>
                {isExpanded ? (
                  <ChevronUp className="size-4 text-[#B4BCC8]" />
                ) : (
                  <ChevronDown className="size-4 text-[#B4BCC8]" />
                )}
              </div>
            </div>

            {/* 展开编辑 */}
            {isExpanded && (
              <div className="px-4 pb-4 space-y-3 border-t border-[#E8EAED]">
                {/* 知识点 */}
                <div className="pt-3">
                  <label className="block text-xs font-medium text-[#4D5766] mb-1">
                    知识点 *
                    {q.suggested_topic && q.topic_id && (
                      <span className="ml-2 text-[#9FE870] font-normal">AI 已自动匹配</span>
                    )}
                    {q.suggested_topic && !q.topic_id && (
                      <span className="ml-2 text-amber-500 font-normal">AI 建议: {q.suggested_topic}（未匹配到）</span>
                    )}
                  </label>
                  <select
                    value={q.topic_id || ""}
                    onChange={(e) => updateQuestion(index, { topic_id: e.target.value })}
                    className="w-full h-8 rounded-lg border border-[#E8EAED] bg-white px-2.5 text-xs text-[#2E3338] focus:outline-none focus:ring-2 focus:ring-[#163300]/20"
                  >
                    <option value="">请选择知识点</option>
                    {topics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 题型 */}
                <div>
                  <label className="block text-xs font-medium text-[#4D5766] mb-1">题型</label>
                  <div className="flex gap-2">
                    {Object.entries(QUESTION_TYPES).map(([k, v]) => (
                      <button
                        key={k}
                        onClick={() => updateQuestion(index, { type: k as ExtractedQ["type"] })}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          q.type === k
                            ? "bg-[#163300] text-white"
                            : "bg-[#F4F5F6] text-[#4D5766] hover:bg-[#E8EAED]"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 题干 */}
                <div>
                  <label className="block text-xs font-medium text-[#4D5766] mb-1">题干</label>
                  <textarea
                    value={q.stem}
                    onChange={(e) => updateQuestion(index, { stem: e.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-[#E8EAED] bg-white px-3 py-2 text-sm text-[#2E3338] focus:outline-none focus:ring-2 focus:ring-[#163300]/20 resize-y"
                  />
                </div>

                {/* 选项 */}
                {q.type === "choice" && (
                  <div>
                    <label className="block text-xs font-medium text-[#4D5766] mb-1">选项</label>
                    <div className="space-y-1.5">
                      {(q.options || []).map((opt, i) => (
                        <input
                          key={i}
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const newOpts = [...(q.options || [])];
                            newOpts[i] = e.target.value;
                            updateQuestion(index, { options: newOpts });
                          }}
                          className="w-full h-8 rounded-lg border border-[#E8EAED] bg-white px-3 text-sm text-[#2E3338] focus:outline-none focus:ring-2 focus:ring-[#163300]/20"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* 答案 */}
                <div>
                  <label className="block text-xs font-medium text-[#4D5766] mb-1">答案</label>
                  <textarea
                    value={q.answer}
                    onChange={(e) => updateQuestion(index, { answer: e.target.value })}
                    rows={q.type === "solution" ? 3 : 1}
                    className="w-full rounded-lg border border-[#E8EAED] bg-white px-3 py-2 text-sm text-[#2E3338] focus:outline-none focus:ring-2 focus:ring-[#163300]/20 resize-y"
                  />
                </div>

                {/* 解析 */}
                <div>
                  <label className="block text-xs font-medium text-[#4D5766] mb-1">解析</label>
                  <textarea
                    value={q.explanation || ""}
                    onChange={(e) => updateQuestion(index, { explanation: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-[#E8EAED] bg-white px-3 py-2 text-sm text-[#2E3338] focus:outline-none focus:ring-2 focus:ring-[#163300]/20 resize-y"
                  />
                </div>

                {/* 难度 */}
                <div>
                  <label className="block text-xs font-medium text-[#4D5766] mb-1">
                    难度：{q.difficulty}
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={q.difficulty}
                    onChange={(e) => updateQuestion(index, { difficulty: parseInt(e.target.value) })}
                    className="w-full accent-[#163300]"
                  />
                </div>

                {/* 删除按钮 */}
                <div className="flex justify-end">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeQuestion(index)}
                  >
                    <Trash2 className="size-3.5 mr-1" />
                    删除此题
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* 底部保存按钮 */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSaveAll} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin mr-1" />
              保存中...
            </>
          ) : (
            <>
              <Save className="size-4 mr-1" />
              保存全部（{questions.length} 题）
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
