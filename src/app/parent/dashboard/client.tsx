"use client";

import { useState } from "react";
import Link from "next/link";
import type { TaskAssignmentStatus } from "@/lib/supabase/types";

interface ChildStat {
  id: string;
  name: string;
  grade: string;
  total: number;
  confirmed: number;
  pending: number;
  rejected: number;
  avgCorrectRate: number | null;
  testCount: number;
  completionRate: number | null;
}

interface RecentResult {
  id: string;
  studentId: string;
  studentName: string;
  taskTitle: string;
  taskType: string;
  status: TaskAssignmentStatus;
  statusLabel: string;
  results: {
    subject: string;
    total_questions: number;
    wrong_count: number;
    rate: number;
  }[];
}

interface Props {
  userName: string;
  isAdmin: boolean;
  childStats: ChildStat[];
  recentResults: RecentResult[];
}

export function ParentDashboardClient({
  userName,
  isAdmin,
  childStats,
  recentResults,
}: Props) {
  const [selectedChild, setSelectedChild] = useState<string>("all");

  const filteredStats =
    selectedChild === "all"
      ? childStats
      : childStats.filter((c) => c.id === selectedChild);

  const filteredResults =
    selectedChild === "all"
      ? recentResults
      : recentResults.filter((r) => r.studentId === selectedChild);

  const totalPending = filteredStats.reduce((s, c) => s + c.pending, 0);
  const totalConfirmed = filteredStats.reduce((s, c) => s + c.confirmed, 0);
  const totalTasks = filteredStats.reduce((s, c) => s + c.total, 0);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#2E3338] tracking-tight">今日概览</h2>
          <p className="mt-1 text-[13px] text-[#B4BCC8]">
            {userName}，今天也要加油哦
          </p>
        </div>
        {childStats.length > 1 && (
          <select
            value={selectedChild}
            onChange={(e) => setSelectedChild(e.target.value)}
            className="rounded-lg border-[1.5px] border-[#B4BCC8] bg-white px-3 py-2 text-[13px] text-[#2E3338] outline-none focus:border-[#163300] focus:ring-2 focus:ring-[#163300]/15 transition-colors duration-150"
          >
            <option value="all">全部孩子</option>
            {childStats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Summary cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-4">
        <Link
          href="/parent/tasks"
          className="rounded-2xl bg-white p-6 border border-[#E8EAED] hover:border-[#B4BCC8] transition-all duration-150"
        >
          <p className="text-[13px] text-[#B4BCC8]">待完成任务</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">
            {totalPending}
          </p>
        </Link>
        <div className="rounded-2xl bg-white p-6 border border-[#E8EAED]">
          <p className="text-[13px] text-[#B4BCC8]">已批阅通过</p>
          <p className="mt-1 text-2xl font-bold text-green-600">
            {totalConfirmed}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-6 border border-[#E8EAED]">
          <p className="text-[13px] text-[#B4BCC8]">任务总数</p>
          <p className="mt-1 text-2xl font-bold text-[#2E3338]">{totalTasks}</p>
        </div>
        <Link
          href="/parent/children"
          className="rounded-2xl bg-white p-6 border border-[#E8EAED] hover:border-[#B4BCC8] transition-all duration-150"
        >
          <p className="text-[13px] text-[#B4BCC8]">
            {isAdmin ? "学生总数" : "已绑定孩子"}
          </p>
          <p className="mt-1 text-2xl font-bold text-[#2E3338]">
            {childStats.length}
          </p>
        </Link>
      </div>

      {childStats.length === 0 && !isAdmin && (
        <div className="mt-10 rounded-2xl border border-dashed border-[#E8EAED] p-10 text-center">
          <p className="text-[#B4BCC8]">还没有绑定孩子信息</p>
          <p className="mt-1 text-xs text-[#B4BCC8]">
            请联系老师帮您绑定孩子账号
          </p>
        </div>
      )}

      {/* Per-child stats */}
      {filteredStats.length > 0 && (
        <div className="mt-10">
          <h3 className="text-base font-bold text-[#2E3338]">孩子概览</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredStats.map((child) => (
              <Link
                key={child.id}
                href={`/parent/children/${child.id}`}
                className="rounded-2xl border border-[#E8EAED] bg-white p-6 hover:border-[#B4BCC8] transition-all duration-150"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-[#2E3338]">{child.name}</p>
                    <p className="text-xs text-[#B4BCC8]">{child.grade}</p>
                  </div>
                  <span className="text-xs text-[#163300] font-medium">查看详情 →</span>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xs text-[#B4BCC8]">待完成</p>
                    <p
                      className={`text-lg font-bold ${child.pending > 0 ? "text-amber-600" : "text-[#E8EAED]"}`}
                    >
                      {child.pending}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#B4BCC8]">完成率</p>
                    <p
                      className={`text-lg font-bold ${
                        child.completionRate === null
                          ? "text-[#E8EAED]"
                          : child.completionRate >= 80
                            ? "text-green-600"
                            : child.completionRate >= 50
                              ? "text-amber-600"
                              : "text-red-600"
                      }`}
                    >
                      {child.completionRate !== null
                        ? `${child.completionRate}%`
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#B4BCC8]">正确率</p>
                    <p
                      className={`text-lg font-bold ${
                        child.avgCorrectRate === null
                          ? "text-[#E8EAED]"
                          : child.avgCorrectRate >= 80
                            ? "text-green-600"
                            : child.avgCorrectRate >= 60
                              ? "text-amber-600"
                              : "text-red-600"
                      }`}
                    >
                      {child.avgCorrectRate !== null
                        ? `${child.avgCorrectRate}%`
                        : "-"}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent test results */}
      {filteredResults.length > 0 && (
        <div className="mt-10">
          <h3 className="text-base font-bold text-[#2E3338]">最近测试成绩</h3>
          <div className="mt-4 space-y-3">
            {filteredResults.map((a) => (
              <div
                key={a.id}
                className="rounded-2xl border border-[#E8EAED] bg-white p-5 hover:bg-[#F4F5F6]/50 transition-colors duration-150"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
                      {a.studentName}
                    </span>
                    <span className="rounded-full bg-[#F4F5F6] px-2.5 py-0.5 text-xs font-medium text-[#4D5766]">
                      {a.taskType}
                    </span>
                    <span className="font-medium text-[#2E3338]">
                      {a.taskTitle}
                    </span>
                  </div>
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
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {a.results.map((r, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-[#F4F5F6] px-2.5 py-1 text-xs text-[#4D5766]"
                    >
                      {r.subject} {r.total_questions}题 错{r.wrong_count}{" "}
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
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
