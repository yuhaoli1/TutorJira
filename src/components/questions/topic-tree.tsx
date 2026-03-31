"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronDown, FolderOpen, Folder, BookOpen, Loader2 } from "lucide-react";

interface TopicNode {
  id: string;
  title: string;
  parent_id: string | null;
  sort_order: number;
  subject: string;
  children: TopicNode[];
}

interface TopicTreeProps {
  onSelectTopic?: (topicId: string, topicTitle: string) => void;
  selectedTopicId?: string | null;
}

export function TopicTree({ onSelectTopic, selectedTopicId }: TopicTreeProps) {
  const [topics, setTopics] = useState<TopicNode[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTopics();
  }, [selectedSubject]);

  const fetchTopics = async () => {
    setLoading(true);
    try {
      const params = selectedSubject ? `?subject=${encodeURIComponent(selectedSubject)}` : "";
      const res = await fetch(`/api/topics${params}`);
      const data = await res.json();
      setTopics(data.topics || []);
      if (data.subjects) {
        setSubjects(data.subjects);
      }
    } catch (e) {
      console.error("获取知识点失败:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const res = await fetch("/api/topics/import", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        alert(`导入成功！共导入 ${data.total_inserted} 个知识点`);
        fetchTopics();
      } else {
        alert(data.error || "导入失败");
      }
    } catch (e) {
      console.error("导入失败:", e);
      alert("导入失败");
    } finally {
      setImporting(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const renderNode = (node: TopicNode, depth: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedIds.has(node.id);
    const isSelected = selectedTopicId === node.id;

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-1.5 py-1.5 px-2 rounded-lg cursor-pointer transition-colors text-sm ${
            isSelected
              ? "bg-[#163300]/10 text-[#163300] font-medium"
              : "hover:bg-[#F4F5F6] text-[#4D5766]"
          }`}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
          onClick={() => {
            if (hasChildren) {
              toggleExpand(node.id);
            }
            onSelectTopic?.(node.id, node.title);
          }}
        >
          {hasChildren ? (
            <span className="shrink-0">
              {isExpanded ? (
                <ChevronDown className="size-4 text-[#B4BCC8]" />
              ) : (
                <ChevronRight className="size-4 text-[#B4BCC8]" />
              )}
            </span>
          ) : (
            <span className="w-4 shrink-0" />
          )}
          <span className="shrink-0">
            {hasChildren ? (
              isExpanded ? (
                <FolderOpen className="size-4 text-[#9FE870]" />
              ) : (
                <Folder className="size-4 text-[#B4BCC8]" />
              )
            ) : (
              <BookOpen className="size-3.5 text-[#B4BCC8]" />
            )}
          </span>
          <span className="truncate">{node.title}</span>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-[#B4BCC8]">
        <Loader2 className="size-5 animate-spin mr-2" />
        加载知识点中...
      </div>
    );
  }

  return (
    <div>
      {/* 学科选择器 */}
      {subjects.length > 0 && (
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#E8EAED]">
          <span className="text-sm text-[#4D5766]">学科：</span>
          <button
            onClick={() => setSelectedSubject(null)}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              selectedSubject === null
                ? "bg-[#163300] text-white"
                : "bg-[#F4F5F6] text-[#4D5766] hover:bg-[#E8EAED]"
            }`}
          >
            全部
          </button>
          {subjects.map((s) => (
            <button
              key={s}
              onClick={() => setSelectedSubject(s)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                selectedSubject === s
                  ? "bg-[#163300] text-white"
                  : "bg-[#F4F5F6] text-[#4D5766] hover:bg-[#E8EAED]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {topics.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[#B4BCC8] text-sm mb-4">暂无知识点数据</p>
          <Button onClick={handleImport} disabled={importing}>
            {importing ? (
              <>
                <Loader2 className="size-4 animate-spin mr-1" />
                导入中...
              </>
            ) : (
              "导入奥数课程知识点"
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-0.5">
          {topics.map((topic) => renderNode(topic))}
        </div>
      )}
    </div>
  );
}
