"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface Comment {
  id: string;
  content: string;
  author_id: string;
  author_name: string;
  author_role: string;
  created_at: string;
}

export function TaskComments({ assignmentId }: { assignmentId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const fetchComments = async () => {
    const { data } = await supabase
      .from("task_comments")
      .select("id, content, author_id, created_at")
      .eq("task_assignment_id", assignmentId)
      .order("created_at", { ascending: true });

    if (!data || data.length === 0) {
      setComments([]);
      return;
    }

    // Fetch author info
    const authorIds = [...new Set(data.map((c) => c.author_id))];
    const { data: users } = await supabase
      .from("users")
      .select("id, name, role")
      .in("id", authorIds);

    const userMap = new Map(users?.map((u) => [u.id, { name: u.name, role: u.role }]) ?? []);

    setComments(
      data.map((c) => ({
        ...c,
        author_name: userMap.get(c.author_id)?.name ?? "未知",
        author_role: userMap.get(c.author_id)?.role ?? "",
      }))
    );
  };

  useEffect(() => {
    fetchComments();
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, [assignmentId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  const send = async () => {
    if (!text.trim() || !currentUserId) return;
    setSending(true);

    await supabase.from("task_comments").insert({
      task_assignment_id: assignmentId,
      author_id: currentUserId,
      content: text.trim(),
    });

    setText("");
    setSending(false);
    fetchComments();
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "刚刚";
    if (diffMin < 60) return `${diffMin}分钟前`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}小时前`;
    return d.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const roleLabel: Record<string, string> = {
    admin: "管理员",
    teacher: "老师",
    student: "学生",
    parent: "家长",
  };

  return (
    <div className="space-y-3">
      <h4 className="text-[13px] font-medium text-[#2E3338]">
        对话
        {comments.length > 0 && (
          <span className="ml-1.5 text-xs text-[#B4BCC8]">{comments.length}</span>
        )}
      </h4>

      {/* Messages */}
      <div className="max-h-64 overflow-y-auto space-y-2.5">
        {comments.length === 0 && (
          <p className="text-xs text-[#B4BCC8] py-3 text-center">暂无消息，发条消息开始对话</p>
        )}
        {comments.map((c) => {
          const isMe = c.author_id === currentUserId;
          return (
            <div key={c.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                isMe
                  ? "bg-[#163300] text-white rounded-br-md"
                  : "bg-[#F4F5F6] text-[#2E3338] rounded-bl-md"
              }`}>
                {!isMe && (
                  <p className="text-xs font-medium mb-0.5 opacity-70">
                    {c.author_name}
                    <span className="ml-1 opacity-60">{roleLabel[c.author_role] || ""}</span>
                  </p>
                )}
                <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{c.content}</p>
                <p className={`text-[10px] mt-1 ${isMe ? "text-white/50" : "text-[#B4BCC8]"}`}>
                  {formatTime(c.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="输入消息..."
          className="flex-1 rounded-full border-[1.5px] border-[#E8EAED] px-4 py-2 text-[13px] text-[#2E3338] outline-none focus:border-[#163300] focus:ring-2 focus:ring-[#163300]/15 transition-colors duration-150"
        />
        <button
          onClick={send}
          disabled={sending || !text.trim()}
          className="rounded-full bg-[#163300] px-4 py-2 text-[13px] font-medium text-white disabled:opacity-40 hover:bg-[#1e4400] transition-colors duration-150"
        >
          发送
        </button>
      </div>
    </div>
  );
}
