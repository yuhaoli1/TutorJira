"use client";

import { useState } from "react";
import { PracticeConsole } from "./practice-console";
import { ChevronRight, BookOpen, ArrowLeft } from "lucide-react";
import { DIFFICULTY_LABELS } from "@/lib/constants";

interface TopicChild {
  id: string;
  title: string;
  parent_id: string | null;
  sort_order: number;
  subject: string;
}

interface TopicNode {
  id: string;
  title: string;
  parent_id: string | null;
  sort_order: number;
  subject: string;
  children: TopicChild[];
  totalQuestions: number;
}

interface PracticeHubProps {
  topicTree: TopicNode[];
  topicQuestionCounts: Record<string, number>;
  studentId: string;
}

type PracticeMode = "select" | "practice";

interface PracticeConfig {
  topicIds: string[];
  topicTitle: string;
  difficulty?: number;
  questionCount: number;
}

export function PracticeHub({ topicTree, topicQuestionCounts, studentId }: PracticeHubProps) {
  const [mode, setMode] = useState<PracticeMode>("select");
  const [config, setConfig] = useState<PracticeConfig | null>(null);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | undefined>(undefined);
  const [questionCount, setQuestionCount] = useState(10);

  const toggleExpand = (topicId: string) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  };

  const startPractice = (topicIds: string[], topicTitle: string) => {
    setConfig({
      topicIds,
      topicTitle,
      difficulty: selectedDifficulty,
      questionCount,
    });
    setMode("practice");
  };

  const handleStartFromParent = (topic: TopicNode) => {
    // Include parent + all children topic ids
    const ids = [topic.id, ...topic.children.map((c) => c.id)];
    startPractice(ids, topic.title);
  };

  const handleStartFromChild = (child: TopicChild) => {
    startPractice([child.id], child.title);
  };

  if (mode === "practice" && config) {
    return (
      <div>
        <button
          onClick={() => setMode("select")}
          className="flex items-center gap-1.5 text-sm text-[#4D5766] hover:text-[#2E3338] mb-4 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to topics
        </button>
        <PracticeConsole
          topicIds={config.topicIds}
          topicTitle={config.topicTitle}
          difficulty={config.difficulty}
          questionCount={config.questionCount}
          studentId={studentId}
          onFinish={() => setMode("select")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Settings bar */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-[#F4F5F6]">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-[#4D5766]">Difficulty:</label>
          <select
            value={selectedDifficulty || ""}
            onChange={(e) => setSelectedDifficulty(e.target.value ? parseInt(e.target.value) : undefined)}
            className="rounded-lg border border-[#E8EAED] bg-white px-2.5 py-1.5 text-xs text-[#2E3338] outline-none focus:border-[#163300]"
          >
            <option value="">All difficulties</option>
            {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-[#4D5766]">Questions:</label>
          <select
            value={questionCount}
            onChange={(e) => setQuestionCount(parseInt(e.target.value))}
            className="rounded-lg border border-[#E8EAED] bg-white px-2.5 py-1.5 text-xs text-[#2E3338] outline-none focus:border-[#163300]"
          >
            {[5, 10, 15, 20, 30].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Topic list */}
      <div className="space-y-2">
        {topicTree.map((topic) => (
          <div key={topic.id} className="rounded-xl border border-[#E8EAED] bg-white overflow-hidden">
            {/* Parent topic header */}
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#F4F5F6] transition-colors"
              onClick={() => toggleExpand(topic.id)}
            >
              <div className="flex items-center gap-3">
                <ChevronRight
                  className={`size-4 text-[#B4BCC8] transition-transform ${
                    expandedTopics.has(topic.id) ? "rotate-90" : ""
                  }`}
                />
                <BookOpen className="size-4 text-[#4D5766]" />
                <span className="text-sm font-medium text-[#2E3338]">{topic.title}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#B4BCC8]">
                  {topic.totalQuestions} questions
                </span>
                {topic.totalQuestions > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartFromParent(topic);
                    }}
                    className="px-3 py-1 rounded-full bg-[#163300] text-white text-xs font-medium hover:bg-[#1e4400] transition-colors"
                  >
                    Start practice
                  </button>
                )}
              </div>
            </div>

            {/* Children */}
            {expandedTopics.has(topic.id) && topic.children.length > 0 && (
              <div className="border-t border-[#E8EAED]">
                {topic.children.map((child) => {
                  const count = topicQuestionCounts[child.id] || 0;
                  return (
                    <div
                      key={child.id}
                      className="flex items-center justify-between px-4 py-2.5 pl-12 hover:bg-[#F4F5F6] transition-colors"
                    >
                      <span className="text-sm text-[#4D5766]">{child.title}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-[#B4BCC8]">{count} questions</span>
                        {count > 0 && (
                          <button
                            onClick={() => handleStartFromChild(child)}
                            className="px-2.5 py-1 rounded-full border border-[#163300] text-[#163300] text-xs font-medium hover:bg-[#163300] hover:text-white transition-colors"
                          >
                            Practice
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {topicTree.length === 0 && (
          <div className="text-center py-12 text-[#B4BCC8]">
            No topics yet — ask your teacher to add some
          </div>
        )}
      </div>
    </div>
  );
}
