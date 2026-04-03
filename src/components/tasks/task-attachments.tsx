"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface Attachment {
  id: string;
  file_url: string;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  uploaded_by: string;
  created_at: string;
}

export function TaskAttachments({
  assignmentId,
  canUpload,
}: {
  assignmentId: string;
  canUpload: boolean;
}) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const fetchAttachments = async () => {
    const { data } = await supabase
      .from("task_attachments")
      .select("*")
      .eq("task_assignment_id", assignmentId)
      .order("created_at", { ascending: true });

    if (data) setAttachments(data);
  };

  useEffect(() => {
    fetchAttachments();
  }, [assignmentId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("assignment_id", assignmentId);

    try {
      const res = await fetch("/api/tasks/attachments", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        fetchAttachments();
      } else {
        const data = await res.json();
        alert(data.error || "上传失败");
      }
    } catch {
      alert("上传失败");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[13px] font-medium text-[#2E3338]">
          附件
          {attachments.length > 0 && (
            <span className="ml-1.5 text-xs text-[#B4BCC8]">{attachments.length}</span>
          )}
        </h4>
        {canUpload && (
          <>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="rounded-full px-3 py-1 text-xs font-medium text-[#163300] hover:bg-[#F4F5F6] transition-colors duration-150 disabled:opacity-40"
            >
              {uploading ? "上传中..." : "+ 上传图片"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleUpload}
              className="hidden"
            />
          </>
        )}
      </div>

      {attachments.length === 0 ? (
        <p className="text-xs text-[#B4BCC8] py-2">暂无附件</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {attachments.map((a) => (
            <div
              key={a.id}
              onClick={() => setPreview(a.file_url)}
              className="cursor-pointer group relative aspect-square rounded-xl overflow-hidden border border-[#E8EAED] hover:border-[#B4BCC8] transition-colors"
            >
              <img
                src={a.file_url}
                alt={a.file_name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-[10px] text-white truncate">{a.file_name}</p>
                <p className="text-[10px] text-white/60">{formatSize(a.file_size)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <div className="relative max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={preview}
              alt="预览"
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            <button
              onClick={() => setPreview(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-[#2E3338] text-sm font-bold shadow-lg hover:bg-[#F4F5F6]"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
