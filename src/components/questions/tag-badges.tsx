"use client";

interface Tag {
  id: string;
  name: string;
  slug: string | null;
  category_id: string;
  question_tag_categories?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  question_type: "bg-blue-50 text-blue-600",
  difficulty: "bg-amber-50 text-amber-600",
  knowledge_point: "bg-green-50 text-green-600",
  solution_approach: "bg-purple-50 text-purple-600",
  grade: "bg-cyan-50 text-cyan-600",
};

export function TagBadges({ tags }: { tags: Tag[] }) {
  if (!tags || tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => {
        const catSlug = tag.question_tag_categories?.slug || "";
        const color = CATEGORY_COLORS[catSlug] || "bg-[#F4F5F6] text-[#4D5766]";
        return (
          <span
            key={tag.id}
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${color}`}
          >
            {tag.name}
          </span>
        );
      })}
    </div>
  );
}
