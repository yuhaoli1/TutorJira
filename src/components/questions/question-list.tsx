"use client";

import { useState, useEffect, useCallback } from "react";
import { QuestionCard } from "./question-card";
import { QuestionForm } from "./question-form";
import { QUESTION_TYPES, DIFFICULTY_LABELS } from "@/lib/constants";
import { Loader2, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Topic {
  id: string;
  title: string;
  parent_id: string | null;
  children?: Topic[];
}

interface Question {
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
  knowledge_topics?: { id: string; title: string } | null;
}

export function QuestionList() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [flatTopics, setFlatTopics] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  // Filters
  const [filterTopicId, setFilterTopicId] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("");

  // Edit/Create
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      if (filterTopicId) params.set("topic_id", filterTopicId);
      if (filterType) params.set("type", filterType);
      if (filterDifficulty) params.set("difficulty", filterDifficulty);

      const res = await fetch(`/api/questions?${params.toString()}`);
      const data = await res.json();
      setQuestions(data.questions || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error("获取题目失败:", e);
    } finally {
      setLoading(false);
    }
  }, [page, filterTopicId, filterType, filterDifficulty]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const fetchTopics = async () => {
    try {
      const res = await fetch("/api/topics");
      const data = await res.json();
      setTopics(data.topics || []);
      // Flatten for dropdown
      const flat: { id: string; title: string }[] = [];
      const flatten = (nodes: Topic[]) => {
        for (const n of nodes) {
          flat.push({ id: n.id, title: n.title });
          if (n.children) flatten(n.children);
        }
      };
      flatten(data.topics || []);
      setFlatTopics(flat);
    } catch (e) {
      console.error("获取知识点失败:", e);
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
    setFilterTopicId("");
    setFilterType("");
    setFilterDifficulty("");
    setPage(1);
  };

  const hasFilters = filterTopicId || filterType || filterDifficulty;

  return (
    <div>
      {/* 筛选栏 */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select
          value={filterTopicId}
          onChange={(e) => { setFilterTopicId(e.target.value); setPage(1); }}
          className="h-8 rounded-lg border border-[#E8EAED] bg-white px-2.5 text-xs text-[#4D5766] focus:outline-none focus:ring-2 focus:ring-[#163300]/20"
        >
          <option value="">全部知识点</option>
          {flatTopics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
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
          topics={flatTopics}
          onClose={handleFormClose}
          onSaved={handleFormSaved}
        />
      )}
    </div>
  );
}
