"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface Tag {
  id: string;
  name: string;
  slug: string | null;
  parent_id: string | null;
  category_id: string;
  sort_order: number;
  metadata: Record<string, unknown> | null;
}

interface TagSelectorProps {
  categorySlug: string;
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  allowMultiple?: boolean;
  label?: string;
  placeholder?: string;
}

export function TagSelector({
  categorySlug,
  selectedTagIds,
  onChange,
  allowMultiple = true,
  label,
  placeholder = "Select...",
}: TagSelectorProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/tags?category_slug=${categorySlug}`)
      .then((res) => res.json())
      .then((data) => setTags(data.tags || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [categorySlug]);

  // Separate root and child tags for hierarchical display
  const rootTags = tags.filter((t) => !t.parent_id);
  const childrenOf = (parentId: string) => tags.filter((t) => t.parent_id === parentId);
  const hasChildren = rootTags.some((t) => childrenOf(t.id).length > 0);

  const selectedTags = tags.filter((t) => selectedTagIds.includes(t.id));

  const handleToggle = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId));
    } else if (allowMultiple) {
      onChange([...selectedTagIds, tagId]);
    } else {
      onChange([tagId]);
    }
  };

  if (loading) {
    return (
      <div>
        {label && <p className="text-xs text-[#B4BCC8] mb-1.5">{label}</p>}
        <div className="h-9 rounded-lg bg-[#F4F5F6] animate-pulse" />
      </div>
    );
  }

  // For flat categories with few options: render as pill toggles
  if (!hasChildren && tags.length <= 10) {
    return (
      <div>
        {label && <p className="text-xs text-[#B4BCC8] mb-1.5">{label}</p>}
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => {
            const selected = selectedTagIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => handleToggle(tag.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  selected
                    ? "bg-[#163300] text-white"
                    : "bg-[#F4F5F6] text-[#4D5766] hover:bg-[#E8EAED]"
                }`}
              >
                {tag.name}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // For hierarchical or many tags: render as dropdown + chips
  return (
    <div>
      {label && <p className="text-xs text-[#B4BCC8] mb-1.5">{label}</p>}

      {/* Selected chips */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 rounded-full bg-[#163300]/10 text-[#163300] px-2.5 py-0.5 text-xs font-medium"
            >
              {tag.name}
              <button
                type="button"
                onClick={() => onChange(selectedTagIds.filter((id) => id !== tag.id))}
                className="hover:text-red-500"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown */}
      <select
        value=""
        onChange={(e) => {
          if (e.target.value) handleToggle(e.target.value);
        }}
        className="w-full rounded-lg border-[1.5px] border-[#B4BCC8] bg-white px-3 py-2 text-[13px] text-[#2E3338] outline-none focus:border-[#163300] focus:ring-2 focus:ring-[#163300]/15"
      >
        <option value="">{placeholder}</option>
        {hasChildren
          ? rootTags.map((root) => {
              const children = childrenOf(root.id);
              if (children.length === 0) {
                return (
                  <option
                    key={root.id}
                    value={root.id}
                    disabled={selectedTagIds.includes(root.id)}
                  >
                    {root.name}
                  </option>
                );
              }
              return (
                <optgroup key={root.id} label={root.name}>
                  {/* Allow selecting the parent too */}
                  <option
                    value={root.id}
                    disabled={selectedTagIds.includes(root.id)}
                  >
                    {root.name} (all)
                  </option>
                  {children.map((child) => (
                    <option
                      key={child.id}
                      value={child.id}
                      disabled={selectedTagIds.includes(child.id)}
                    >
                      {child.name}
                    </option>
                  ))}
                </optgroup>
              );
            })
          : tags.map((tag) => (
              <option
                key={tag.id}
                value={tag.id}
                disabled={selectedTagIds.includes(tag.id)}
              >
                {tag.name}
              </option>
            ))}
      </select>
    </div>
  );
}
