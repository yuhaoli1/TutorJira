"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Loader2, Plus, Trash2 } from "lucide-react";
import { TagSelector } from "./tag-selector";
import { TAG_CATEGORIES, getTagCategoryUI } from "@/lib/constants";

interface TagCategory {
  id: string;
  name: string;
  slug: string;
  allow_multiple: boolean;
  sort_order: number;
}

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

  // Dynamic tag categories & per-category selected IDs
  const [categories, setCategories] = useState<TagCategory[]>([]);
  const [tagsByCategory, setTagsByCategory] = useState<Record<string, string[]>>({});
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);

  // Load tag categories
  useEffect(() => {
    fetch("/api/tags/categories")
      .then((res) => res.json())
      .then((data) => {
        setCategories(data.categories || []);
        setCategoriesLoaded(true);
      })
      .catch(() => setCategoriesLoaded(true));
  }, []);

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
        setTagsByCategory(byCategory);
      })
      .catch(() => {});
  }, [question?.id]);

  const updateCategoryTags = (slug: string, ids: string[]) => {
    setTagsByCategory((prev) => ({ ...prev, [slug]: ids }));

    // Sync legacy type field when question_type tag changes
    if (slug === TAG_CATEGORIES.QUESTION_TYPE && ids.length > 0) {
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
  };

  const handleSave = async () => {
    if (!stem.trim()) {
      alert("Please enter the question");
      return;
    }
    if (!answer.trim()) {
      alert("Please enter an answer");
      return;
    }

    // Validate required categories
    for (const cat of categories) {
      const ui = getTagCategoryUI(cat.slug, cat.name);
      if (ui.required && !(tagsByCategory[cat.slug]?.length)) {
        alert(`Please select ${ui.label}`);
        return;
      }
    }

    setSaving(true);
    try {
      const allTagIds = Object.values(tagsByCategory).flat();

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
        alert(data.error || "Save failed");
      }
    } catch (e) {
      console.error("Save failed:", e);
      alert("Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-lg mx-4 bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8EAED]">
          <h3 className="text-base font-semibold text-[#2E3338]">
            {isEditing ? "Edit question" : "Add question"}
          </h3>
          <button onClick={onClose} className="text-[#B4BCC8] hover:text-[#4D5766]">
            <X className="size-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Dynamic tag categories */}
          {categoriesLoaded && categories.map((cat) => {
            const ui = getTagCategoryUI(cat.slug, cat.name);
            return (
              <TagSelector
                key={cat.slug}
                categorySlug={cat.slug}
                selectedTagIds={tagsByCategory[cat.slug] || []}
                onChange={(ids) => updateCategoryTags(cat.slug, ids)}
                allowMultiple={cat.allow_multiple}
                label={`${ui.label}${ui.required ? " *" : ""}`}
                placeholder={ui.placeholder}
              />
            );
          })}

          {/* Stem */}
          <div>
            <label className="block text-xs font-medium text-[#4D5766] mb-1">Question *</label>
            <textarea
              value={stem}
              onChange={(e) => setStem(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-[#E8EAED] bg-white px-3 py-2 text-sm text-[#2E3338] focus:outline-none focus:ring-2 focus:ring-[#163300]/20 resize-y"
              placeholder="Type the question..."
            />
          </div>

          {/* Options (multiple choice only) */}
          {type === "choice" && (
            <div>
              <label className="block text-xs font-medium text-[#4D5766] mb-1">Options</label>
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
                      placeholder={`Option ${String.fromCharCode(65 + i)}`}
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
                    Add option
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Answer */}
          <div>
            <label className="block text-xs font-medium text-[#4D5766] mb-1">Answer *</label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={type === "solution" ? 4 : 1}
              className="w-full rounded-lg border border-[#E8EAED] bg-white px-3 py-2 text-sm text-[#2E3338] focus:outline-none focus:ring-2 focus:ring-[#163300]/20 resize-y"
              placeholder={type === "choice" ? "e.g. A" : "Type the answer..."}
            />
          </div>

          {/* Explanation */}
          <div>
            <label className="block text-xs font-medium text-[#4D5766] mb-1">Explanation</label>
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-[#E8EAED] bg-white px-3 py-2 text-sm text-[#2E3338] focus:outline-none focus:ring-2 focus:ring-[#163300]/20 resize-y"
              placeholder="How to solve it..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#E8EAED]">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin mr-1" />
                Saving...
              </>
            ) : (
              isEditing ? "Update" : "Save"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
