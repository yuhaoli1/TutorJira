"use client";

import { useState } from "react";
import { SUBJECTS } from "@/lib/constants";
import { Button } from "@/components/ui/button";

export interface TestResultRow {
  subject: string;
  total_questions: number;
  wrong_count: number;
}

export function TestResultForm({
  initialResults,
  onSave,
  saving,
}: {
  initialResults: TestResultRow[];
  onSave: (results: TestResultRow[]) => void;
  saving: boolean;
}) {
  const [rows, setRows] = useState<TestResultRow[]>(
    initialResults.length > 0
      ? initialResults
      : [{ subject: "", total_questions: 0, wrong_count: 0 }]
  );

  const updateRow = (index: number, field: keyof TestResultRow, value: string | number) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { subject: "", total_questions: 0, wrong_count: 0 },
    ]);
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const validRows = rows.filter(
    (r) => r.subject && r.total_questions > 0
  );

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-zinc-700">成绩录入</h4>
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="科目"
              value={row.subject}
              onChange={(e) => updateRow(i, "subject", e.target.value)}
              list="subject-list"
              className="w-full rounded border border-zinc-200 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <input
            type="number"
            placeholder="总题"
            value={row.total_questions || ""}
            onChange={(e) =>
              updateRow(i, "total_questions", parseInt(e.target.value) || 0)
            }
            className="w-16 rounded border border-zinc-200 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
          />
          <span className="text-xs text-zinc-400">错</span>
          <input
            type="number"
            placeholder="错题"
            value={row.wrong_count || ""}
            onChange={(e) =>
              updateRow(i, "wrong_count", parseInt(e.target.value) || 0)
            }
            className="w-16 rounded border border-zinc-200 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
          />
          {rows.length > 1 && (
            <button
              onClick={() => removeRow(i)}
              className="text-zinc-400 hover:text-red-500"
            >
              ×
            </button>
          )}
        </div>
      ))}

      <datalist id="subject-list">
        {SUBJECTS.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      <div className="flex gap-2">
        <button
          onClick={addRow}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          + 添加科目
        </button>
      </div>

      <Button
        onClick={() => onSave(validRows)}
        disabled={saving || validRows.length === 0}
        className="w-full"
        size="sm"
      >
        {saving ? "保存中..." : "保存成绩"}
      </Button>
    </div>
  );
}
