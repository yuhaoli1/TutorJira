"use client";

import { QUESTION_TYPES, DIFFICULTY_LABELS } from "@/lib/constants";
import type { QuestionType } from "@/lib/supabase/types";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TagBadges } from "./tag-badges";

interface Tag {
  id: string;
  name: string;
  slug: string | null;
  category_id: string;
  question_tag_categories?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

interface QuestionCardProps {
  question: {
    id: string;
    type: QuestionType;
    content: {
      stem: string;
      options?: string[];
      answer: string;
      explanation?: string;
    };
    difficulty: number;
    knowledge_topics?: { id: string; title: string } | null;
    tags?: Tag[];
  };
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const TYPE_COLORS: Record<string, string> = {
  choice: "bg-blue-50 text-blue-600",
  fill_blank: "bg-amber-50 text-amber-600",
  solution: "bg-green-50 text-green-600",
};

const DIFFICULTY_COLORS: Record<number, string> = {
  1: "bg-emerald-50 text-emerald-600",
  2: "bg-lime-50 text-lime-600",
  3: "bg-amber-50 text-amber-600",
  4: "bg-orange-50 text-orange-600",
  5: "bg-red-50 text-red-600",
};

export function QuestionCard({ question, onEdit, onDelete }: QuestionCardProps) {
  return (
    <div className="rounded-xl border border-[#E8EAED] bg-white p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* 标签行 */}
          {question.tags && question.tags.length > 0 ? (
            <div className="mb-2">
              <TagBadges tags={question.tags} />
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  TYPE_COLORS[question.type] || "bg-gray-50 text-gray-600"
                }`}
              >
                {QUESTION_TYPES[question.type as keyof typeof QUESTION_TYPES] || question.type}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  DIFFICULTY_COLORS[question.difficulty] || "bg-gray-50 text-gray-600"
                }`}
              >
                {DIFFICULTY_LABELS[question.difficulty as keyof typeof DIFFICULTY_LABELS] || `难度${question.difficulty}`}
              </span>
              {question.knowledge_topics && (
                <span className="text-xs text-[#B4BCC8] truncate">
                  {question.knowledge_topics.title}
                </span>
              )}
            </div>
          )}

          {/* 题干 */}
          <p className="text-sm text-[#2E3338] leading-relaxed whitespace-pre-wrap">
            {question.content.stem}
          </p>

          {/* 选项 */}
          {question.type === "choice" && question.content.options && (
            <div className="mt-2 space-y-1">
              {question.content.options.map((opt, i) => (
                <p key={i} className="text-sm text-[#4D5766] pl-2">
                  {opt}
                </p>
              ))}
            </div>
          )}

          {/* 答案 */}
          <div className="mt-3 pt-2 border-t border-[#E8EAED]">
            <p className="text-xs text-[#B4BCC8]">
              答案：
              <span className="text-[#163300] font-medium">{question.content.answer}</span>
            </p>
            {question.content.explanation && (
              <p className="text-xs text-[#B4BCC8] mt-1">
                解析：{question.content.explanation}
              </p>
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-col gap-1 shrink-0">
          {onEdit && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onEdit(question.id)}
            >
              <Pencil className="size-3.5" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => {
                if (confirm("确定删除此题目？")) {
                  onDelete(question.id);
                }
              }}
            >
              <Trash2 className="size-3.5 text-red-400" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
