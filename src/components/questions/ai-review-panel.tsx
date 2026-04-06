"use client";

import { useState, useEffect } from "react";
import { QUESTION_TYPES, TAG_CATEGORIES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { TagSelector } from "./tag-selector";

interface ExtractedQ {
  stem: string;
  type: "choice" | "fill_blank" | "solution";
  options?: string[];
  answer: string;
  explanation?: string;
  difficulty: number;
  topic_id?: string;
  suggested_topic?: string;
  // Tag-based fields
  tag_ids?: string[];
}

interface AIReviewPanelProps {
  uploadId: string;
  questions: ExtractedQ[];
  onSaved: () => void;
}

export function AIReviewPanel({ uploadId, questions: initialQuestions, onSaved }: AIReviewPanelProps) {
  const [questions, setQuestions] = useState<ExtractedQ[]>(initialQuestions);
  const [saving, setSaving] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  // Per-question tag state (indexed by question position)
  const [questionTags, setQuestionTags] = useState<Record<number, {
    knowledge: string[];
    type: string[];
    difficulty: string[];
  }>>({});

  // Initialize tag state from questions
  useEffect(() => {
    const initial: typeof questionTags = {};
    questions.forEach((_, i) => {
      initial[i] = { knowledge: [], type: [], difficulty: [] };
    });
    setQuestionTags(initial);
  }, []);

  const updateQuestion = (index: number, updates: Partial<ExtractedQ>) => {
    setQuestions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const updateTags = (index: number, category: "knowledge" | "type" | "difficulty", tagIds: string[]) => {
    setQuestionTags((prev) => ({
      ...prev,
      [index]: { ...prev[index], [category]: tagIds },
    }));
  };

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
    if (expandedIndex === index) setExpandedIndex(null);
  };

  const handleSaveAll = async () => {
    // Validate: each question needs at least a knowledge tag
    for (let i = 0; i < questions.length; i++) {
      const tags = questionTags[i];
      if (!tags?.knowledge.length && !questions[i].topic_id) {
        alert(`第 ${i + 1} 题尚未选择知识点`);
        setExpandedIndex(i);
        return;
      }
    }

    setSaving(true);
    try {
      // Build questions with tag_ids
      const questionsWithTags = questions.map((q, i) => {
        const tags = questionTags[i] || { knowledge: [], type: [], difficulty: [] };
        return {
          ...q,
          tag_ids: [...tags.knowledge, ...tags.type, ...tags.difficulty],
        };
      });

      const res = await fetch(`/api/questions/upload/${uploadId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: questionsWithTags }),
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
        const tags = questionTags[index] || { knowledge: [], type: [], difficulty: [] };
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
                {/* 知识点（标签） */}
                <div className="pt-3">
                  <TagSelector
                    categorySlug={TAG_CATEGORIES.KNOWLEDGE_POINT}
                    selectedTagIds={tags.knowledge}
                    onChange={(ids) => updateTags(index, "knowledge", ids)}
                    label={`知识点 *${q.suggested_topic ? ` (AI 建议: ${q.suggested_topic})` : ""}`}
                    placeholder="选择知识点..."
                  />
                </div>

                {/* 题型（标签） */}
                <TagSelector
                  categorySlug={TAG_CATEGORIES.QUESTION_TYPE}
                  selectedTagIds={tags.type}
                  onChange={(ids) => updateTags(index, "type", ids)}
                  allowMultiple={false}
                  label="题型"
                />

                {/* 难度（标签） */}
                <TagSelector
                  categorySlug={TAG_CATEGORIES.DIFFICULTY}
                  selectedTagIds={tags.difficulty}
                  onChange={(ids) => updateTags(index, "difficulty", ids)}
                  allowMultiple={false}
                  label="难度"
                />

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
