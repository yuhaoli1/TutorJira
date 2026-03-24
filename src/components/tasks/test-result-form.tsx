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
      <h4 className="text-[13px] font-medium text-[#2E3338]">成绩录入</h4>
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="科目"
              value={row.subject}
              onChange={(e) => updateRow(i, "subject", e.target.value)}
              list="subject-list"
              className="w-full rounded-lg border-[1.5px] border-[#B4BCC8] px-2.5 py-2 text-[13px] text-[#2E3338] outline-none focus:border-[#163300] focus:ring-2 focus:ring-[#163300]/15 transition-colors duration-150"
            />
          </div>
          <input
            type="number"
            placeholder="总题"
            value={row.total_questions || ""}
            onChange={(e) =>
              updateRow(i, "total_questions", parseInt(e.target.value) || 0)
            }
            className="w-16 rounded-lg border-[1.5px] border-[#B4BCC8] px-2.5 py-2 text-[13px] text-[#2E3338] outline-none focus:border-[#163300] focus:ring-2 focus:ring-[#163300]/15 transition-colors duration-150"
          />
          <span className="text-xs text-[#B4BCC8]">错</span>
          <input
            type="number"
            placeholder="错题"
            value={row.wrong_count || ""}
            onChange={(e) =>
              updateRow(i, "wrong_count", parseInt(e.target.value) || 0)
            }
            className="w-16 rounded-lg border-[1.5px] border-[#B4BCC8] px-2.5 py-2 text-[13px] text-[#2E3338] outline-none focus:border-[#163300] focus:ring-2 focus:ring-[#163300]/15 transition-colors duration-150"
          />
          {rows.length > 1 && (
            <button
              onClick={() => removeRow(i)}
              className="text-[#B4BCC8] hover:text-red-500 transition-colors duration-150"
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
          className="text-[13px] text-[#163300] hover:text-[#163300]/70 font-medium transition-colors duration-150"
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
