"use client";

import { useState, useMemo } from "react";
import type { TaskAssignmentStatus } from "@/lib/supabase/types";

interface SubjectStat {
  subject: string;
  totalQuestions: number;
  totalWrong: number;
  correctRate: number;
  testCount: number;
}

interface TaskHistory {
  id: string;
  title: string;
  type: string;
  dueDate: string;
  status: TaskAssignmentStatus;
  statusLabel: string;
  note: string | null;
  results: {
    subject: string;
    total_questions: number;
    wrong_count: number;
    rate: number;
  }[];
}

interface StudentData {
  id: string;
  name: string;
  grade: string;
  total: number;
  confirmed: number;
  completionRate: number | null;
  overallCorrectRate: number | null;
  testCount: number;
  subjects: SubjectStat[];
  taskHistory: TaskHistory[];
}

interface Props {
  students: StudentData[];
}

export function StudentManagerClient({ students }: Props) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search) return students;
    const q = search.toLowerCase();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.grade.toLowerCase().includes(q)
    );
  }, [students, search]);

  const selected = selectedId
    ? students.find((s) => s.id === selectedId) ?? null
    : null;

  return (
    <div>
      <h2 className="text-xl font-bold text-[#2E3338] tracking-tight">Students</h2>
      <p className="mt-1 text-[13px] text-[#B4BCC8]">
        Search or pick a student to see details
      </p>

      {/* Search + Dropdown */}
      <div className="mt-5 flex items-center gap-3">
        <input
          type="text"
          placeholder="Search students..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSelectedId(null);
          }}
          className="flex-1 max-w-xs rounded-lg border-[1.5px] border-[#B4BCC8] bg-white px-4 py-2.5 text-[13px] text-[#2E3338] outline-none focus:border-[#163300] focus:ring-2 focus:ring-[#163300]/15 transition-colors duration-150"
        />
        <select
          value={selectedId ?? ""}
          onChange={(e) => setSelectedId(e.target.value || null)}
          className="rounded-lg border-[1.5px] border-[#B4BCC8] bg-white px-3 py-2.5 text-[13px] text-[#2E3338] outline-none focus:border-[#163300] focus:ring-2 focus:ring-[#163300]/15 transition-colors duration-150"
        >
          <option value="">Select student</option>
          {filtered.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.grade})
            </option>
          ))}
        </select>
      </div>

      {/* Prompt when no student selected */}
      {!selected && (
        <div className="mt-12 text-center text-[#B4BCC8]">
          <p className="text-base">Pick a student above to view their data</p>
          <p className="mt-1 text-[13px]">{students.length} students total</p>
        </div>
      )}

      {/* Student detail (when student selected) */}
      {selected && <StudentDetail student={selected} onBack={() => setSelectedId(null)} />}
    </div>
  );
}

function StudentDetail({
  student,
  onBack,
}: {
  student: StudentData;
  onBack: () => void;
}) {
  return (
    <div className="mt-5">
      <button
        onClick={onBack}
        className="text-[13px] text-[#163300] hover:text-[#163300]/70 font-medium transition-colors duration-150"
      >
        &larr; Back to list
      </button>

      <div className="mt-4 flex items-center gap-3">
        <h3 className="text-lg font-bold text-[#2E3338]">{student.name}</h3>
        <span className="rounded-full bg-[#F4F5F6] px-3 py-0.5 text-xs font-medium text-[#4D5766]">
          {student.grade}
        </span>
      </div>

      {/* Stats cards */}
      <div className="mt-5 grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl bg-white p-6 border border-[#E8EAED]">
          <p className="text-[13px] text-[#B4BCC8]">Total tasks</p>
          <p className="mt-1 text-2xl font-bold text-[#2E3338]">
            {student.total}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-6 border border-[#E8EAED]">
          <p className="text-[13px] text-[#B4BCC8]">Completion rate</p>
          <p
            className={`mt-1 text-2xl font-bold ${
              student.completionRate !== null && student.completionRate >= 80
                ? "text-green-600"
                : student.completionRate !== null &&
                    student.completionRate >= 50
                  ? "text-amber-600"
                  : "text-red-600"
            }`}
          >
            {student.completionRate !== null
              ? `${student.completionRate}%`
              : "-"}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-6 border border-[#E8EAED]">
          <p className="text-[13px] text-[#B4BCC8]">Avg accuracy</p>
          <p
            className={`mt-1 text-2xl font-bold ${
              student.overallCorrectRate !== null &&
              student.overallCorrectRate >= 80
                ? "text-green-600"
                : student.overallCorrectRate !== null &&
                    student.overallCorrectRate >= 60
                  ? "text-amber-600"
                  : "text-red-600"
            }`}
          >
            {student.overallCorrectRate !== null
              ? `${student.overallCorrectRate}%`
              : "-"}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-6 border border-[#E8EAED]">
          <p className="text-[13px] text-[#B4BCC8]">Tests taken</p>
          <p className="mt-1 text-2xl font-bold text-[#2E3338]">
            {student.testCount}
          </p>
        </div>
      </div>

      {/* Subject breakdown */}
      {student.subjects.length > 0 && (
        <div className="mt-10">
          <h4 className="text-base font-bold text-[#2E3338]">Accuracy by subject</h4>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {student.subjects.map((s) => (
              <div
                key={s.subject}
                className="rounded-2xl border border-[#E8EAED] bg-white p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[#2E3338]">
                    {s.subject}
                  </span>
                  <span
                    className={`text-lg font-bold ${
                      s.correctRate >= 80
                        ? "text-green-600"
                        : s.correctRate >= 60
                          ? "text-amber-600"
                          : "text-red-600"
                    }`}
                  >
                    {s.correctRate}%
                  </span>
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-[#F4F5F6]">
                  <div
                    className={`h-1.5 rounded-full ${
                      s.correctRate >= 80
                        ? "bg-green-500"
                        : s.correctRate >= 60
                          ? "bg-amber-500"
                          : "bg-red-500"
                    }`}
                    style={{ width: `${s.correctRate}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-[#B4BCC8]">
                  {s.testCount} tests · {s.totalQuestions} questions ·{" "}
                  {s.totalWrong} wrong
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task history */}
      <div className="mt-10">
        <h4 className="text-base font-bold text-[#2E3338]">Task history</h4>
        <div className="mt-4 space-y-3">
          {student.taskHistory.map((a) => (
            <div
              key={a.id}
              className="rounded-2xl border border-[#E8EAED] bg-white p-5 hover:bg-[#F4F5F6]/50 transition-colors duration-150"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#F4F5F6] px-2.5 py-0.5 text-xs font-medium text-[#4D5766]">
                    {a.type}
                  </span>
                  <span className="font-medium text-[#2E3338]">{a.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      a.status === "confirmed"
                        ? "bg-green-50 text-green-600"
                        : a.status === "rejected"
                          ? "bg-red-50 text-red-600"
                          : a.status === "submitted"
                            ? "bg-amber-50 text-amber-600"
                            : "bg-[#F4F5F6] text-[#4D5766]"
                    }`}
                  >
                    {a.statusLabel}
                  </span>
                  <span className="text-xs text-[#B4BCC8]">
                    {new Date(a.dueDate).toLocaleDateString("en-US")}
                  </span>
                </div>
              </div>

              {a.results.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {a.results.map((r, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-[#F4F5F6] px-2.5 py-1 text-xs text-[#4D5766]"
                    >
                      {r.subject} {r.total_questions} Q · {r.wrong_count} wrong{" "}
                      <span
                        className={
                          r.rate >= 80
                            ? "text-green-600 font-medium"
                            : r.rate >= 60
                              ? "text-amber-600 font-medium"
                              : "text-red-600 font-medium"
                        }
                      >
                        ({r.rate}%)
                      </span>
                    </span>
                  ))}
                </div>
              )}

              {a.note && (
                <p className="mt-2 text-xs text-[#B4BCC8]">Note: {a.note}</p>
              )}
            </div>
          ))}

          {student.taskHistory.length === 0 && (
            <div className="rounded-2xl border border-[#E8EAED] bg-white p-10 text-center text-[#B4BCC8]">
              No tasks yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
