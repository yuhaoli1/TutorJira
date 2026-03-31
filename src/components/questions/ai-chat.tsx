"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Bot, User, Sparkles } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  "给我一道小数乘、除法的速算与巧算的题",
  "从题库里找一道行程问题，再给我3个变体",
  "帮我出5道关于最大公因数的填空题",
  "题库里有多少道关于方程的题目？",
  "给我一道难度4以上的面积模型题",
];

export function AIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const content = text || input.trim();
    if (!content || loading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/questions/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          history: messages.slice(-10).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "AI 回复失败");
      }

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `出错了: ${e instanceof Error ? e.message : "未知错误"}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] min-h-[400px]">
      {/* 消息区 */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-[#163300] flex items-center justify-center mb-4">
              <Sparkles className="size-6 text-[#9FE870]" />
            </div>
            <h3 className="text-lg font-semibold text-[#2E3338] mb-2">
              题库 AI 助手
            </h3>
            <p className="text-sm text-[#B4BCC8] mb-6 max-w-md">
              我可以从题库中查找题目、生成变体题、按知识点出题。试试下面的问题：
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  className="px-3 py-1.5 rounded-full bg-[#F4F5F6] text-xs text-[#4D5766] hover:bg-[#E8EAED] transition-colors text-left"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 px-4 ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {msg.role === "assistant" && (
              <div className="shrink-0 w-8 h-8 rounded-full bg-[#163300] flex items-center justify-center">
                <Bot className="size-4 text-[#9FE870]" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-[#163300] text-white"
                  : "bg-[#F4F5F6] text-[#2E3338]"
              }`}
            >
              {msg.content}
            </div>
            {msg.role === "user" && (
              <div className="shrink-0 w-8 h-8 rounded-full bg-[#E8EAED] flex items-center justify-center">
                <User className="size-4 text-[#4D5766]" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 px-4">
            <div className="shrink-0 w-8 h-8 rounded-full bg-[#163300] flex items-center justify-center">
              <Bot className="size-4 text-[#9FE870]" />
            </div>
            <div className="bg-[#F4F5F6] rounded-2xl px-4 py-3">
              <Loader2 className="size-4 animate-spin text-[#B4BCC8]" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入区 */}
      <div className="border-t border-[#E8EAED] pt-3">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="问我关于题库的问题..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-[#E8EAED] bg-white px-4 py-2.5 text-sm text-[#2E3338] placeholder:text-[#B4BCC8] focus:outline-none focus:ring-2 focus:ring-[#163300]/20 max-h-32"
            style={{ minHeight: "42px" }}
          />
          <Button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            size="icon"
            className="shrink-0 h-[42px] w-[42px] rounded-xl"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
