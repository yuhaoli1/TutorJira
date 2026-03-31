"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Camera, FileText, Image, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface UploadFormProps {
  onProcessed: (uploadId: string, questions: ExtractedQ[]) => void;
}

interface ExtractedQ {
  stem: string;
  type: "choice" | "fill_blank" | "solution";
  options?: string[];
  answer: string;
  explanation?: string;
  difficulty: number;
}

type UploadStep = "idle" | "uploading" | "uploaded" | "processing" | "done" | "error";

export function UploadForm({ onProcessed }: UploadFormProps) {
  const [step, setStep] = useState<UploadStep>("idle");
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setStep("uploading");
    setErrorMsg("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/questions/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "上传失败");
      }

      const data = await res.json();
      setUploadId(data.upload.id);
      setStep("uploaded");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "上传失败");
      setStep("error");
    }
  }, []);

  const handleProcess = async () => {
    if (!uploadId) return;
    setStep("processing");
    setErrorMsg("");

    try {
      const res = await fetch(`/api/questions/upload/${uploadId}/process`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "AI处理失败");
      }

      setStep("done");
      onProcessed(uploadId, data.questions);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "AI处理失败");
      setStep("error");
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const reset = () => {
    setStep("idle");
    setUploadId(null);
    setFileName("");
    setErrorMsg("");
  };

  return (
    <div className="space-y-4">
      {/* 拖拽上传区 */}
      {step === "idle" && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-8 md:p-12 text-center transition-colors ${
            dragOver
              ? "border-[#9FE870] bg-[#9FE870]/5"
              : "border-[#E8EAED] hover:border-[#B4BCC8]"
          }`}
        >
          <Upload className="size-10 mx-auto text-[#B4BCC8] mb-3" />
          <p className="text-sm font-medium text-[#2E3338] mb-1">
            拖拽文件到此处上传
          </p>
          <p className="text-xs text-[#B4BCC8] mb-4">
            支持 PDF、Word、图片格式
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileText className="size-3.5 mr-1" />
              选择文件
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => cameraInputRef.current?.click()}
              className="md:hidden"
            >
              <Camera className="size-3.5 mr-1" />
              拍照上传
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </div>
      )}

      {/* 上传中 */}
      {step === "uploading" && (
        <div className="rounded-2xl border border-[#E8EAED] p-8 text-center">
          <Loader2 className="size-8 mx-auto text-[#163300] animate-spin mb-3" />
          <p className="text-sm font-medium text-[#2E3338]">正在上传...</p>
          <p className="text-xs text-[#B4BCC8] mt-1">{fileName}</p>
        </div>
      )}

      {/* 上传完成，等待AI处理 */}
      {step === "uploaded" && (
        <div className="rounded-2xl border border-[#E8EAED] p-8 text-center">
          <CheckCircle className="size-8 mx-auto text-[#9FE870] mb-3" />
          <p className="text-sm font-medium text-[#2E3338]">文件上传成功</p>
          <p className="text-xs text-[#B4BCC8] mt-1 mb-4">{fileName}</p>
          <Button onClick={handleProcess}>
            开始AI智能识别
          </Button>
        </div>
      )}

      {/* AI处理中 */}
      {step === "processing" && (
        <div className="rounded-2xl border border-[#E8EAED] p-8 text-center">
          <Loader2 className="size-8 mx-auto text-[#163300] animate-spin mb-3" />
          <p className="text-sm font-medium text-[#2E3338]">AI正在识别题目...</p>
          <p className="text-xs text-[#B4BCC8] mt-1">
            这可能需要几秒到几十秒，请耐心等待
          </p>
        </div>
      )}

      {/* 处理完成 */}
      {step === "done" && (
        <div className="rounded-2xl border border-[#9FE870] bg-[#9FE870]/5 p-8 text-center">
          <CheckCircle className="size-8 mx-auto text-[#9FE870] mb-3" />
          <p className="text-sm font-medium text-[#2E3338]">识别完成</p>
          <p className="text-xs text-[#B4BCC8] mt-1 mb-4">
            请在下方审核并编辑识别结果
          </p>
          <Button variant="outline" size="sm" onClick={reset}>
            继续上传
          </Button>
        </div>
      )}

      {/* 错误 */}
      {step === "error" && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <AlertCircle className="size-8 mx-auto text-red-400 mb-3" />
          <p className="text-sm font-medium text-[#2E3338]">处理失败</p>
          <p className="text-xs text-red-500 mt-1 mb-4">{errorMsg}</p>
          <Button variant="outline" size="sm" onClick={reset}>
            重新上传
          </Button>
        </div>
      )}
    </div>
  );
}
