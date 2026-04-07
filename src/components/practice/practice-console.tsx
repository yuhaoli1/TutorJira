"use client";

import { useState, useEffect, useCallback } from "react";
import { QUESTION_TYPES, DIFFICULTY_LABELS } from "@/lib/constants";
import type { QuestionType } from "@/lib/supabase/types";
import { CheckCircle, XCircle, ArrowRight, Trophy, Loader2 } from "lucide-react";
import { TagBadges } from "@/components/questions/tag-badges";
import { getTypeFromTags } from "@/lib/tag-utils";

interface Question {
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
  tags?: { id: string; name: string; slug: string | null; category_id: string; question_tag_categories?: { id: string; name: string; slug: string } | null }[];
}

interface PracticeConsoleProps {
  topicIds: string[];
  topicTitle: string;
  difficulty?: number;
  questionCount: number;
  studentId: string;
  onFinish: () => void;
  // For task-linked practice
  taskAssignmentId?: string;
  // Direct question IDs (from task-linked questions)
  questionIds?: string[];
}

interface AttemptResult {
  questionId: string;
  answer: string;
  isCorrect: boolean;
  timeSpent: number;
}

const TYPE_COLORS: Record<string, string> = {
  choice: "bg-blue-50 text-blue-600",
  fill_blank: "bg-amber-50 text-amber-600",
  solution: "bg-green-50 text-green-600",
};

export function PracticeConsole({
  topicIds,
  topicTitle,
  difficulty,
  questionCount,
  studentId,
  onFinish,
  taskAssignmentId,
  questionIds,
}: PracticeConsoleProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<AttemptResult[]>([]);
  const [finished, setFinished] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      if (questionIds && questionIds.length > 0) {
        // Fetch specific questions by IDs (for task-linked practice)
        const allQuestions: Question[] = [];
        // Fetch in batches of 20
        for (let i = 0; i < questionIds.length; i += 20) {
          const batch = questionIds.slice(i, i + 20);
          const params = new URLSearchParams();
          batch.forEach((id) => params.append("ids", id));
          params.set("page_size", "50");

          const res = await fetch(`/api/questions?${params}`);
          if (res.ok) {
            const data = await res.json();
            allQuestions.push(...(data.questions || []));
          }
        }
        setQuestions(allQuestions);
      } else {
        // Fetch questions for all tag IDs (knowledge point tags)
        const allQuestions: Question[] = [];
        for (const tagId of topicIds) {
          const params = new URLSearchParams({
            tag_id: tagId,
            page_size: "50",
          });
          if (difficulty) params.set("difficulty", String(difficulty));

          const res = await fetch(`/api/questions?${params}`);
          if (res.ok) {
            const data = await res.json();
            allQuestions.push(...(data.questions || []));
          }
        }

        // Shuffle and limit
        const shuffled = allQuestions.sort(() => Math.random() - 0.5);
        setQuestions(shuffled.slice(0, questionCount));
      }
    } catch (error) {
      console.error("Failed to fetch questions:", error);
    } finally {
      setLoading(false);
    }
  }, [topicIds, difficulty, questionCount, questionIds]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  useEffect(() => {
    setStartTime(Date.now());
  }, [currentIndex]);

  const currentQuestion = questions[currentIndex];

  const checkAnswer = (userAnswer: string, correctAnswer: string): boolean => {
    const normalize = (s: string) =>
      s.trim().toLowerCase().replace(/\s+/g, "").replace(/[,.;:"'()]/g, "");

    // For choice questions, check option letter (A, B, C, D)
    if (currentQuestion?.type === "choice") {
      return normalize(userAnswer) === normalize(correctAnswer);
    }

    // For fill_blank and solution, more lenient matching
    return normalize(userAnswer) === normalize(correctAnswer);
  };

  const handleSubmit = async () => {
    if (!currentQuestion) return;
    if (submitting) return;

    const userAnswer = currentQuestion.type === "choice" ? selectedOption : answer;
    if (!userAnswer.trim()) return;

    setSubmitting(true);
    const timeSpent = Math.round((Date.now() - startTime) / 1000);
    const correct = checkAnswer(userAnswer, currentQuestion.content.answer);

    setIsCorrect(correct);
    setShowResult(true);

    // Record attempt
    const result: AttemptResult = {
      questionId: currentQuestion.id,
      answer: userAnswer,
      isCorrect: correct,
      timeSpent,
    };
    setResults((prev) => [...prev, result]);

    // Save to database
    try {
      await fetch("/api/questions/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_id: currentQuestion.id,
          answer: userAnswer,
          is_correct: correct,
          time_spent_seconds: timeSpent,
        }),
      });
    } catch (error) {
      console.error("Failed to save attempt:", error);
    }

    setSubmitting(false);
  };

  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      setFinished(true);
      return;
    }
    setCurrentIndex((prev) => prev + 1);
    setAnswer("");
    setSelectedOption("");
    setShowResult(false);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="size-8 text-[#163300] animate-spin" />
        <p className="mt-3 text-sm text-[#B4BCC8]">Loading questions...</p>
      </div>
    );
  }

  // No questions
  if (questions.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-[#B4BCC8]">No questions for this topic yet</p>
        <button
          onClick={onFinish}
          className="mt-4 px-4 py-2 rounded-full bg-[#163300] text-white text-sm font-medium hover:bg-[#1e4400] transition-colors"
        >
          Back
        </button>
      </div>
    );
  }

  // Finished state - show results
  if (finished) {
    const correctCount = results.filter((r) => r.isCorrect).length;
    const totalTime = results.reduce((sum, r) => sum + r.timeSpent, 0);
    const accuracy = Math.round((correctCount / results.length) * 100);

    return (
      <div className="max-w-lg mx-auto py-8">
        <div className="text-center mb-8">
          <Trophy className="size-16 text-[#9FE870] mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-[#2E3338]">Practice complete!</h3>
          <p className="text-sm text-[#B4BCC8] mt-1">{topicTitle}</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="text-center p-4 rounded-xl bg-[#F4F5F6]">
            <p className="text-2xl font-bold text-[#163300]">{accuracy}%</p>
            <p className="text-xs text-[#B4BCC8] mt-1">Accuracy</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-[#F4F5F6]">
            <p className="text-2xl font-bold text-[#2E3338]">
              {correctCount}/{results.length}
            </p>
            <p className="text-xs text-[#B4BCC8] mt-1">Correct / Total</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-[#F4F5F6]">
            <p className="text-2xl font-bold text-[#2E3338]">
              {Math.round(totalTime / 60)}m {totalTime % 60}s
            </p>
            <p className="text-xs text-[#B4BCC8] mt-1">Total time</p>
          </div>
        </div>

        {/* Wrong questions summary */}
        {results.some((r) => !r.isCorrect) && (
          <div className="mb-8">
            <h4 className="text-sm font-medium text-[#2E3338] mb-3">
              Wrong answers ({results.filter((r) => !r.isCorrect).length})
            </h4>
            <div className="space-y-3">
              {results
                .filter((r) => !r.isCorrect)
                .map((r, i) => {
                  const q = questions.find((q) => q.id === r.questionId);
                  if (!q) return null;
                  return (
                    <div key={i} className="p-3 rounded-xl border border-red-100 bg-red-50/50">
                      <p className="text-sm text-[#2E3338] mb-1">{q.content.stem}</p>
                      <p className="text-xs text-red-500">Your answer: {r.answer}</p>
                      <p className="text-xs text-[#163300]">Correct answer: {q.content.answer}</p>
                      {q.content.explanation && (
                        <p className="text-xs text-[#4D5766] mt-1">Explanation: {q.content.explanation}</p>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onFinish}
            className="flex-1 px-4 py-2.5 rounded-full border border-[#E8EAED] text-sm font-medium text-[#4D5766] hover:bg-[#F4F5F6] transition-colors"
          >
            Back
          </button>
          <button
            onClick={() => {
              setCurrentIndex(0);
              setResults([]);
              setFinished(false);
              setAnswer("");
              setSelectedOption("");
              setShowResult(false);
              fetchQuestions();
            }}
            className="flex-1 px-4 py-2.5 rounded-full bg-[#163300] text-white text-sm font-medium hover:bg-[#1e4400] transition-colors"
          >
            Practice again
          </button>
        </div>
      </div>
    );
  }

  // Practice console
  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[#B4BCC8]">{topicTitle}</span>
          <span className="text-xs font-medium text-[#2E3338]">
            {currentIndex + 1} / {questions.length}
          </span>
        </div>
        <div className="h-2 bg-[#E8EAED] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#163300] rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="rounded-2xl border border-[#E8EAED] bg-white p-6 mb-4">
        {/* Tags */}
        {currentQuestion.tags && currentQuestion.tags.length > 0 ? (
          <div className="mb-4"><TagBadges tags={currentQuestion.tags} /></div>
        ) : (
          <div className="flex items-center gap-2 mb-4">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                TYPE_COLORS[currentQuestion.type] || "bg-gray-50 text-gray-600"
              }`}
            >
              {QUESTION_TYPES[currentQuestion.type as keyof typeof QUESTION_TYPES]}
            </span>
            <span className="text-xs text-[#B4BCC8]">
              Difficulty {DIFFICULTY_LABELS[currentQuestion.difficulty as keyof typeof DIFFICULTY_LABELS]}
            </span>
            {currentQuestion.knowledge_topics && (
              <span className="text-xs text-[#B4BCC8]">
                {currentQuestion.knowledge_topics.title}
              </span>
            )}
          </div>
        )}

        {/* Stem */}
        <div className="text-base text-[#2E3338] leading-relaxed whitespace-pre-wrap mb-6">
          {currentQuestion.content.stem}
        </div>

        {/* Answer input based on type */}
        {currentQuestion.type === "choice" && currentQuestion.content.options && (
          <div className="space-y-2.5">
            {currentQuestion.content.options.map((option, i) => {
              const letter = String.fromCharCode(65 + i); // A, B, C, D
              const isSelected = selectedOption === letter;
              const isCorrectOption = showResult && letter === currentQuestion.content.answer.toUpperCase();
              const isWrongSelected = showResult && isSelected && !isCorrect;

              return (
                <button
                  key={i}
                  onClick={() => !showResult && setSelectedOption(letter)}
                  disabled={showResult}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm transition-all ${
                    isCorrectOption
                      ? "border-green-400 bg-green-50 text-green-700"
                      : isWrongSelected
                      ? "border-red-400 bg-red-50 text-red-700"
                      : isSelected
                      ? "border-[#163300] bg-[#163300]/5 text-[#2E3338]"
                      : "border-[#E8EAED] hover:border-[#B4BCC8] text-[#4D5766]"
                  }`}
                >
                  <span className="font-medium mr-2">{letter}.</span>
                  {option}
                </button>
              );
            })}
          </div>
        )}

        {currentQuestion.type === "fill_blank" && (
          <div>
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={showResult}
              placeholder="Enter your answer"
              className="w-full px-4 py-3 rounded-xl border-2 border-[#E8EAED] text-sm text-[#2E3338] outline-none focus:border-[#163300] disabled:bg-[#F4F5F6] transition-colors"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !showResult) handleSubmit();
              }}
            />
          </div>
        )}

        {currentQuestion.type === "solution" && (
          <div>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={showResult}
              placeholder="Show your work and final answer"
              rows={6}
              className="w-full px-4 py-3 rounded-xl border-2 border-[#E8EAED] text-sm text-[#2E3338] outline-none focus:border-[#163300] disabled:bg-[#F4F5F6] resize-none transition-colors"
            />
          </div>
        )}

        {/* Result feedback */}
        {showResult && (
          <div
            className={`mt-4 p-4 rounded-xl ${
              isCorrect ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {isCorrect ? (
                <>
                  <CheckCircle className="size-5 text-green-500" />
                  <span className="text-sm font-medium text-green-700">Correct!</span>
                </>
              ) : (
                <>
                  <XCircle className="size-5 text-red-500" />
                  <span className="text-sm font-medium text-red-700">Incorrect</span>
                </>
              )}
            </div>
            {!isCorrect && (
              <p className="text-sm text-[#2E3338]">
                Correct answer: <span className="font-medium text-[#163300]">{currentQuestion.content.answer}</span>
              </p>
            )}
            {currentQuestion.content.explanation && (
              <p className="text-sm text-[#4D5766] mt-2">
                Explanation: {currentQuestion.content.explanation}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-3">
        {!showResult ? (
          <button
            onClick={handleSubmit}
            disabled={submitting || (!answer.trim() && !selectedOption)}
            className="px-6 py-2.5 rounded-full bg-[#163300] text-white text-sm font-medium hover:bg-[#1e4400] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Submit answer"
            )}
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-[#163300] text-white text-sm font-medium hover:bg-[#1e4400] transition-colors"
          >
            {currentIndex + 1 >= questions.length ? "View results" : "Next question"}
            <ArrowRight className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
