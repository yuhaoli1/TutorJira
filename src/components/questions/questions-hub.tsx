"use client";

import { useState } from "react";
import { QuestionList } from "./question-list";
import { UploadForm } from "./upload-form";
import { AIReviewPanel } from "./ai-review-panel";
import { TopicTree } from "./topic-tree";
import { AIChat } from "./ai-chat";
import { BookOpen, Upload, FolderTree, Sparkles } from "lucide-react";

type TabKey = "browse" | "upload" | "topics" | "chat";

interface ExtractedQ {
  stem: string;
  type: "choice" | "fill_blank" | "solution";
  options?: string[];
  answer: string;
  explanation?: string;
  difficulty: number;
}

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "browse", label: "Browse", icon: <BookOpen className="size-4" /> },
  { key: "upload", label: "Upload", icon: <Upload className="size-4" /> },
  { key: "topics", label: "Topics", icon: <FolderTree className="size-4" /> },
  { key: "chat", label: "AI assistant", icon: <Sparkles className="size-4" /> },
];

export function QuestionsHub() {
  const [activeTab, setActiveTab] = useState<TabKey>("browse");

  // Upload + AI review state
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [extractedQuestions, setExtractedQuestions] = useState<ExtractedQ[]>([]);

  const handleProcessed = (id: string, questions: ExtractedQ[]) => {
    // Clear first, then set, to force AIReviewPanel to remount
    setUploadId(null);
    setExtractedQuestions([]);
    setTimeout(() => {
      setUploadId(id);
      setExtractedQuestions(questions);
    }, 0);
  };

  const handleReviewSaved = () => {
    setUploadId(null);
    setExtractedQuestions([]);
    setActiveTab("browse");
  };

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 mb-6 bg-[#F4F5F6] rounded-xl p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-1 justify-center ${
              activeTab === tab.key
                ? "bg-white text-[#163300] shadow-sm"
                : "text-[#4D5766] hover:text-[#2E3338]"
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "browse" && <QuestionList />}

      {activeTab === "upload" && (
        <div className="space-y-6">
          <UploadForm onProcessed={handleProcessed} />
          {uploadId && extractedQuestions.length > 0 && (
            <AIReviewPanel
              key={uploadId}
              uploadId={uploadId}
              questions={extractedQuestions}
              onSaved={handleReviewSaved}
            />
          )}
        </div>
      )}

      {activeTab === "topics" && (
        <div className="rounded-2xl border border-[#E8EAED] bg-white p-4">
          <TopicTree />
        </div>
      )}

      {activeTab === "chat" && <AIChat />}
    </div>
  );
}
