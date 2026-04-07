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
  "Give me a quick mental-math problem on decimal multiplication and division",
  "Find a distance/rate problem in the library and give me 3 variants",
  "Make me 5 fill-in-the-blank problems on greatest common factor",
  "How many problems about equations are in the library?",
  "Give me an area-model problem with difficulty 4 or higher",
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
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
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
        throw new Error(data.error || "AI reply failed");
      }

      const assistantMsg: Message = {
        id: Math.random().toString(36).slice(2) + Date.now().toString(36),
        role: "assistant",
        content: data.reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      const errorMsg: Message = {
        id: Math.random().toString(36).slice(2) + Date.now().toString(36),
        role: "assistant",
        content: `Something went wrong: ${e instanceof Error ? e.message : "unknown error"}`,
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
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-[#163300] flex items-center justify-center mb-4">
              <Sparkles className="size-6 text-[#9FE870]" />
            </div>
            <h3 className="text-lg font-semibold text-[#2E3338] mb-2">
              Question library AI assistant
            </h3>
            <p className="text-sm text-[#B4BCC8] mb-6 max-w-md">
              I can find questions in the library, generate variants, or create new ones by topic. Try one of these:
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

      {/* Input */}
      <div className="border-t border-[#E8EAED] pt-3">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about the question library..."
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
