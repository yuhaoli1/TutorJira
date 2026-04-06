"use client";

import { useState, useEffect, useCallback } from "react";
import { QuestionCard } from "./question-card";
import { QuestionForm } from "./question-form";
import { QUESTION_TYPES, DIFFICULTY_LABELS, TAG_CATEGORIES } from "@/lib/constants";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TagOption {
  id: string;
  name: string;
  slug: string | null;
  parent_id: string | null;
}

interface Question {
  id: string;
  type: "choice" | "fill_blank" | "solution";
  content: {
    stem: string;
    options?: string[];
    answer: string;
    explanation?: string;
  };
  difficulty: number;
  knowledge_topics?: { id: string; title: string } | null;
  tags?: { id: string; name: string; slug: string | null; category_id: string; question_tag_categories?: { id: string; name: string; slug: string } | null }[];
}

export function QuestionList() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  // Filters
  const [filterType, setFilterType] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("");
  const [filterTagId, setFilterTagId] = useState("");

  // Tag options for filters
  const [knowledgeTagOptions, setKnowledgeTagOptions] = useState<TagOption[]>([]);

  // Edit/Create
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  useEffect(() => {
    fetchTagOptions();
  }, []);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      if (filterType) params.set("type", filterType);
      if (filterDifficulty) params.set("difficulty", filterDifficulty);
      if (filterTagId) params.set("tag_id", filterTagId);

      const res = await fetch(`/api/questions?${params.toString()}`);
      const data = await res.json();
      setQuestions(data.questions || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error("获取题目失败:", e);
    } finally {
      setLoading(false);
    }
  }, [page, filterType, filterDifficulty, filterTagId]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const fetchTagOptions = async () => {
    try {
      const res = await fetch(`/api/tags?category_slug=${TAG_CATEGORIES.KNOWLEDGE_POINT}`);
      const data = await res.json();
      setKnowledgeTagOptions(data.tags || []);
    } catch (e) {
      console.error("获取标签失败:", e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/questions/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchQuestions();
      } else {
        alert("删除失败");
      }
    } catch (e) {
      console.error("删除失败:", e);
    }
  };

  const handleEdit = (id: string) => {
    const q = questions.find((q) => q.id === id);
    if (q) {
      setEditingQuestion(q);
      setShowForm(true);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingQuestion(null);
  };

  const handleFormSaved = () => {
    handleFormClose();
    fetchQuestions();
  };

  const clearFilters = () => {
    setFilterType("");
    setFilterDifficulty("");
    setFilterTagId("");
    setPage(1);
  };

  const hasFilters = filterType || filterDifficulty || filterTagId;

  return (
    <div>
      {/* 筛选栏 */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* 知识点标签筛选 */}
        <select
          value={filterTagId}
          onChange={(e) => { setFilterTagId(e.target.value); setPage(1); }}
          className="h-8 rounded-lg border border-[#E8EAED] bg-white px-2.5 text-xs text-[#4D5766] focus:outline-none focus:ring-2 focus:ring-[#163300]/20"
        >
          <option value="">全部知识点</option>
          {knowledgeTagOptions.filter((t) => !t.parent_id).map((root) => {
            const children = knowledgeTagOptions.filter((t) => t.parent_id === root.id);
            if (children.length === 0) {
              return (
                <option key={root.id} value={root.id}>
                  {root.name}
                </option>
              );
            }
            return (
              <optgroup key={root.id} label={root.name}>
                <option value={root.id}>{root.name}（全部）</option>
                {children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.name}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>

        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
          className="h-8 rounded-lg border border-[#E8EAED] bg-white px-2.5 text-xs text-[#4D5766] focus:outline-none focus:ring-2 focus:ring-[#163300]/20"
        >
          <option value="">全部题型</option>
          {Object.entries(QUESTION_TYPES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>

        <select
          value={filterDifficulty}
          onChange={(e) => { setFilterDifficulty(e.target.value); setPage(1); }}
          className="h-8 rounded-lg border border-[#E8EAED] bg-white px-2.5 text-xs text-[#4D5766] focus:outline-none focus:ring-2 focus:ring-[#163300]/20"
        >
          <option value="">全部难度</option>
          {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-[#B4BCC8] hover:text-[#4D5766]"
          >
            <X className="size-3" />
            清除筛选
          </button>
        )}

        <div className="flex-1" />

        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="size-3.5 mr-1" />
          添加题目
        </Button>
      </div>

      {/* 题目列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-[#B4BCC8]">
          <Loader2 className="size-5 animate-spin mr-2" />
          加载中...
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-12 text-[#B4BCC8] text-sm">
          {hasFilters ? "未找到匹配的题目" : "暂无题目，点击「添加题目」创建"}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {questions.map((q) => (
              <QuestionCard
                key={q.id}
                question={q}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {/* 分页 */}
          {total > 20 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                上一页
              </Button>
              <span className="text-xs text-[#B4BCC8]">
                第 {page} 页 / 共 {Math.ceil(total / 20)} 页（{total} 题）
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page * 20 >= total}
                onClick={() => setPage(page + 1)}
              >
                下一页
              </Button>
            </div>
          )}
        </>
      )}

      {/* 创建/编辑表单 */}
      {showForm && (
        <QuestionForm
          question={editingQuestion}
          topics={[]}
          onClose={handleFormClose}
          onSaved={handleFormSaved}
        />
      )}
    </div>
  );
}
