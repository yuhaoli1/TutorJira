"use client";

import { useState } from "react";
import { QUESTION_TYPES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { X, Loader2, Plus, Trash2 } from "lucide-react";

interface QuestionFormProps {
  question?: {
    id: string;
    topic_id: string;
    type: "choice" | "fill_blank" | "solution";
    content: {
      stem: string;
      options?: string[];
      answer: string;
      explanation?: string;
    };
    difficulty: number;
  } | null;
  topics: { id: string; title: string }[];
  onClose: () => void;
  onSaved: () => void;
}

export function QuestionForm({ question, topics, onClose, onSaved }: QuestionFormProps) {
  const isEditing = !!question;
  const [saving, setSaving] = useState(false);

  const [topicId, setTopicId] = useState(question?.topic_id || "");
  const [type, setType] = useState<"choice" | "fill_blank" | "solution">(question?.type || "solution");
  const [stem, setStem] = useState(question?.content.stem || "");
  const [options, setOptions] = useState<string[]>(question?.content.options || ["A. ", "B. ", "C. ", "D. "]);
  const [answer, setAnswer] = useState(question?.content.answer || "");
  const [explanation, setExplanation] = useState(question?.content.explanation || "");
  const [difficulty, setDifficulty] = useState(question?.difficulty || 3);

  const handleSave = async () => {
    if (!topicId) {
      alert("请选择知识点");
      return;
    }
    if (!stem.trim()) {
      alert("请输入题干");
      return;
    }
    if (!answer.trim()) {
      alert("请输入答案");
      return;
    }

    setSaving(true);
    try {
      const body = {
        topic_id: topicId,
        type,
        content: {
          stem: stem.trim(),
          options: type === "choice" ? options.filter((o) => o.trim()) : undefined,
          answer: answer.trim(),
          explanation: explanation.trim() || undefined,
        },
        difficulty,
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
          {/* 知识点选择 */}
          <div>
            <label className="block text-xs font-medium text-[#4D5766] mb-1">知识点 *</label>
            <select
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              className="w-full h-9 rounded-lg border border-[#E8EAED] bg-white px-3 text-sm text-[#2E3338] focus:outline-none focus:ring-2 focus:ring-[#163300]/20"
            >
              <option value="">请选择知识点</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          {/* 题型选择 */}
          <div>
            <label className="block text-xs font-medium text-[#4D5766] mb-1">题型 *</label>
            <div className="flex gap-2">
              {Object.entries(QUESTION_TYPES).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setType(k as typeof type)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    type === k
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

          {/* 难度 */}
          <div>
            <label className="block text-xs font-medium text-[#4D5766] mb-1">
              难度：{difficulty}
            </label>
            <input
              type="range"
              min={1}
              max={5}
              value={difficulty}
              onChange={(e) => setDifficulty(parseInt(e.target.value))}
              className="w-full accent-[#163300]"
            />
            <div className="flex justify-between text-xs text-[#B4BCC8] mt-0.5">
              <span>简单</span>
              <span>困难</span>
            </div>
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
