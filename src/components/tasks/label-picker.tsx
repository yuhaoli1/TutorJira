"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export interface Label {
  id: string;
  name: string;
  color: string;
}

const PRESET_COLORS = [
  "#EF4444", "#F97316", "#EAB308", "#22C55E", "#3B82F6",
  "#8B5CF6", "#EC4899", "#B4BCC8",
];

export function LabelPicker({
  selectedIds,
  onChange,
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [labels, setLabels] = useState<Label[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[4]);
  const [creating, setCreating] = useState(false);
  const supabase = createClient();

  const fetchLabels = async () => {
    const { data } = await supabase
      .from("task_labels")
      .select("id, name, color")
      .order("name");
    if (data) setLabels(data);
  };

  useEffect(() => {
    fetchLabels();
  }, []);

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((i) => i !== id)
        : [...selectedIds, id]
    );
  };

  const createLabel = async () => {
    if (!newName.trim()) return;
    setCreating(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("task_labels")
      .insert({ name: newName.trim(), color: newColor, created_by: user.id })
      .select()
      .single();

    if (data && !error) {
      setLabels((prev) => [...prev, data]);
      onChange([...selectedIds, data.id]);
      setNewName("");
      setShowCreate(false);
    }
    setCreating(false);
  };

  return (
    <div className="space-y-2">
      {/* Existing labels */}
      <div className="flex flex-wrap gap-1.5">
        {labels.map((l) => {
          const selected = selectedIds.includes(l.id);
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => toggle(l.id)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all duration-150 ${
                selected
                  ? "ring-2 ring-offset-1 ring-[#163300] bg-white text-[#2E3338]"
                  : "bg-[#F4F5F6] text-[#4D5766] hover:bg-[#E8EAED]"
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: l.color }}
              />
              {l.name}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-full px-3 py-1 text-xs font-medium text-[#B4BCC8] hover:text-[#4D5766] hover:bg-[#F4F5F6] transition-colors duration-150"
        >
          + New label
        </button>
      </div>

      {/* Create new label */}
      {showCreate && (
        <div className="rounded-xl border border-[#E8EAED] p-3 space-y-2.5 bg-[#FAFAFA]">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Label name"
            className="w-full rounded-lg border-[1.5px] border-[#B4BCC8] px-3 py-2 text-[13px] text-[#2E3338] outline-none focus:border-[#163300] focus:ring-2 focus:ring-[#163300]/15 transition-colors duration-150"
            onKeyDown={(e) => { if (e.key === "Enter") createLabel(); }}
          />
          <div className="flex gap-1.5">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                className={`w-6 h-6 rounded-full transition-transform duration-100 ${
                  newColor === c ? "scale-125 ring-2 ring-offset-1 ring-[#163300]" : "hover:scale-110"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={createLabel}
              disabled={creating || !newName.trim()}
              className="rounded-full bg-[#163300] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40 hover:bg-[#1e4400] transition-colors"
            >
              Create
            </button>
            <button
              onClick={() => { setShowCreate(false); setNewName(""); }}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-[#B4BCC8] hover:text-[#4D5766]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Small read-only label chips for card display
export function LabelChips({ labels }: { labels: Label[] }) {
  if (labels.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {labels.map((l) => (
        <span
          key={l.id}
          className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-[#F4F5F6] text-[#4D5766]"
        >
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: l.color }}
          />
          {l.name}
        </span>
      ))}
    </div>
  );
}
