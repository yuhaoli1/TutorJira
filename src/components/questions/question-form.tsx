"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Loader2, Plus, Trash2 } from "lucide-react";
import { TagSelector } from "./tag-selector";
import { TAG_CATEGORIES } from "@/lib/constants";

interface QuestionFormProps {
  question?: {
    id: string;
    topic_id?: string;
    type: "choice" | "fill_blank" | "solution";
    content: {
      stem: string;
      options?: string[];
      answer: string;
      explanation?: string;
    };
    difficulty: number;
    tag_ids?: string[];
  } | null;
  topics?: { id: string; title: string }[]; // deprecated, kept for compat
  onClose: () => void;
  onSaved: () => void;
}

export function QuestionForm({ question, onClose, onSaved }: QuestionFormProps) {
  const isEditing = !!question;
  const [saving, setSaving] = useState(false);

  // Type is still needed for conditional rendering (showing choice options)
  const [type, setType] = useState<"choice" | "fill_blank" | "solution">(question?.type || "solution");

  // Content fields
  const [stem, setStem] = useState(question?.content.stem || "");
  const [options, setOptions] = useState<string[]>(question?.content.options || ["A. ", "B. ", "C. ", "D. "]);
  const [answer, setAnswer] = useState(question?.content.answer || "");
  const [explanation, setExplanation] = useState(question?.content.explanation || "");

  // Tag-based fields
  const [knowledgeTags, setKnowledgeTags] = useState<string[]>([]);
  const [typeTags, setTypeTags] = useState<string[]>([]);
  const [difficultyTags, setDifficultyTags] = useState<string[]>([]);
  const [approachTags, setApproachTags] = useState<string[]>([]);
  const [gradeTags, setGradeTags] = useState<string[]>([]);

  // Load existing tags when editing
  useEffect(() => {
    if (!question?.id) return;
    fetch(`/api/questions/${question.id}/tags`)
      .then((res) => res.json())
      .then((data) => {
        const tags = data.tags || [];
        const byCategory: Record<string, string[]> = {};
        for (const tag of tags) {
          const slug = tag.question_tag_categories?.slug || "";
          if (!byCategory[slug]) byCategory[slug] = [];
          byCategory[slug].push(tag.id);
        }
        setKnowledgeTags(byCategory[TAG_CATEGORIES.KNOWLEDGE_POINT] || []);
        setTypeTags(byCategory[TAG_CATEGORIES.QUESTION_TYPE] || []);
        setDifficultyTags(byCategory[TAG_CATEGORIES.DIFFICULTY] || []);
        setApproachTags(byCategory[TAG_CATEGORIES.SOLUTION_APPROACH] || []);
        setGradeTags(byCategory[TAG_CATEGORIES.GRADE] || []);
      })
      .catch(() => {});
  }, [question?.id]);

  const handleSave = async () => {
    if (!stem.trim()) {
      alert("请输入题干");
      return;
    }
    if (!answer.trim()) {
      alert("请输入答案");
      return;
    }

    if (knowledgeTags.length === 0) {
      alert("请选择至少一个知识点");
      return;
    }

    setSaving(true);
    try {
      const allTagIds = [...knowledgeTags, ...typeTags, ...difficultyTags, ...approachTags, ...gradeTags];

      const body = {
        content: {
          stem: stem.trim(),
          options: type === "choice" ? options.filter((o) => o.trim()) : undefined,
          answer: answer.trim(),
          explanation: explanation.trim() || undefined,
        },
        tag_ids: allTagIds,
      };

      const res = isEditing
        ? await fetch(`/api/questions/${question.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/questions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

      if (res.ok) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-lg mx-4 bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8EAED]">
          <h3 className="text-base font-semibold text-[#2E3338]">
            {isEditing ? "编辑题目" : "添加题目"}
          </h3>
          <button onClick={onClose} className="text-[#B4BCC8] hover:text-[#4D5766]">
            <X className="size-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* 知识点（标签） */}
          <TagSelector
            categorySlug={TAG_CATEGORIES.KNOWLEDGE_POINT}
            selectedTagIds={knowledgeTags}
            onChange={setKnowledgeTags}
            label="知识点 *"
            placeholder="选择知识点..."
          />

          {/* 题型（标签） */}
          <TagSelector
            categorySlug={TAG_CATEGORIES.QUESTION_TYPE}
            selectedTagIds={typeTags}
            onChange={(ids) => {
              setTypeTags(ids);
              // Sync legacy type field from tag slug
              if (ids.length > 0) {
                fetch(`/api/tags?category_slug=${TAG_CATEGORIES.QUESTION_TYPE}`)
                  .then((r) => r.json())
                  .then((d) => {
                    const tag = (d.tags || []).find((t: { id: string }) => t.id === ids[0]);
                    if (tag?.slug && ["choice", "fill_blank", "solution"].includes(tag.slug)) {
                      setType(tag.slug as typeof type);
                    }
                  })
                  .catch(() => {});
              }
            }}
            allowMultiple={false}
            label="题型 *"
          />

          {/* 难度（标签） */}
          <TagSelector
            categorySlug={TAG_CATEGORIES.DIFFICULTY}
            selectedTagIds={difficultyTags}
            onChange={setDifficultyTags}
            allowMultiple={false}
            label="难度 *"
          />

          {/* 解题思路（标签） */}
          <TagSelector
            categorySlug={TAG_CATEGORIES.SOLUTION_APPROACH}
            selectedTagIds={approachTags}
            onChange={setApproachTags}
            label="解题思路"
            placeholder="选择解题思路..."
          />

          {/* 年级（标签） */}
          <TagSelector
            categorySlug={TAG_CATEGORIES.GRADE}
            selectedTagIds={gradeTags}
            onChange={setGradeTags}
            label="适用年级"
          />

          {/* 题干 */}
          <div>
            <label className="block text-xs font-medium text-[#4D5766] mb-1">题干 *</label>
            <textarea
              value={stem}
              onChange={(e) => setStem(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-[#E8EAED] bg-white px-3 py-2 text-sm text-[#2E3338] focus:outline-none focus:ring-2 focus:ring-[#163300]/20 resize-y"
              placeholder="请输入题目内容..."
            />
          </div>

          {/* 选项（仅选择题） */}
          {type === "choice" && (
            <div>
              <label className="block text-xs font-medium text-[#4D5766] mb-1">选项</label>
              <div className="space-y-2">
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...options];
                        newOpts[i] = e.target.value;
                        setOptions(newOpts);
                      }}
                      className="flex-1 h-8 rounded-lg border border-[#E8EAED] bg-white px-3 text-sm text-[#2E3338] focus:outline-none focus:ring-2 focus:ring-[#163300]/20"
                      placeholder={`选项 ${String.fromCharCode(65 + i)}`}
                    />
                    {options.length > 2 && (
                      <button
                        onClick={() => setOptions(options.filter((_, j) => j !== i))}
                        className="text-[#B4BCC8] hover:text-red-400"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                {options.length < 6 && (
                  <button
                    onClick={() => setOptions([...options, `${String.fromCharCode(65 + options.length)}. `])}
                    className="flex items-center gap-1 text-xs text-[#B4BCC8] hover:text-[#4D5766]"
                  >
                    <Plus className="size-3" />
                    添加选项
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 答案 */}
          <div>
            <label className="block text-xs font-medium text-[#4D5766] mb-1">答案 *</label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={type === "solution" ? 4 : 1}
              className="w-full rounded-lg border border-[#E8EAED] bg-white px-3 py-2 text-sm text-[#2E3338] focus:outline-none focus:ring-2 focus:ring-[#163300]/20 resize-y"
              placeholder={type === "choice" ? "如：A" : "请输入答案..."}
            />
          </div>

          {/* 解析 */}
          <div>
            <label className="block text-xs font-medium text-[#4D5766] mb-1">解析</label>
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-[#E8EAED] bg-white px-3 py-2 text-sm text-[#2E3338] focus:outline-none focus:ring-2 focus:ring-[#163300]/20 resize-y"
              placeholder="解题思路..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#E8EAED]">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin mr-1" />
                保存中...
              </>
            ) : (
              isEditing ? "更新" : "保存"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
