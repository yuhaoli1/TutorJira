"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Camera, FileText, CheckCircle, AlertCircle } from "lucide-react";

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

type PipelineStage = "idle" | "ocr" | "uploading" | "processing" | "done" | "error";

const STAGE_CONFIG: Record<Exclude<PipelineStage, "idle" | "error">, { label: string; index: number }> = {
  ocr: { label: "OCR", index: 0 },
  uploading: { label: "Upload", index: 1 },
  processing: { label: "AI analysis", index: 2 },
  done: { label: "Done", index: 3 },
};

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

export function UploadForm({ onProcessed }: UploadFormProps) {
  const [stage, setStage] = useState<PipelineStage>("idle");
  const [fileName, setFileName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [ocrProgress, setOcrProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const doOCR = async (file: File): Promise<string> => {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng", undefined, {
      logger: (m: { progress: number }) => {
        if (m.progress) setOcrProgress(Math.round(m.progress * 100));
      },
    });
    const { data: { text } } = await worker.recognize(file);
    await worker.terminate();
    return text;
  };

  // Fully automatic pipeline: pick file → OCR → upload → AI processing → done
  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setErrorMsg("");
    setOcrProgress(0);

    try {
      // Step 1: OCR (images only)
      let ocrText: string | null = null;
      if (isImageFile(file)) {
        setStage("ocr");
        ocrText = await doOCR(file);
        if (!ocrText.trim()) {
          throw new Error("OCR could not read any text from the image — please use a clearer photo");
        }
      }

      // Step 2: Upload
      setStage("uploading");
      const formData = new FormData();
      formData.append("file", file);
      if (ocrText) formData.append("ocrText", ocrText);

      const uploadRes = await fetch("/api/questions/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const data = await uploadRes.json();
        throw new Error(data.error || "Upload failed");
      }

      const { upload } = await uploadRes.json();

      // Step 3: AI processing (starts automatically)
      setStage("processing");
      const processRes = await fetch(`/api/questions/upload/${upload.id}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ocrText }),
      });

      const processData = await processRes.json();
      if (!processRes.ok) {
        throw new Error(processData.error || "AI processing failed");
      }

      // Step 4: Done
      setStage("done");
      onProcessed(upload.id, processData.questions);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Processing failed");
      setStage("error");
    }
  }, [onProcessed]);

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
    setStage("idle");
    setFileName("");
    setErrorMsg("");
    setOcrProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  // Progress bar component
  const ProgressSteps = () => {
    const stages = Object.entries(STAGE_CONFIG) as [Exclude<PipelineStage, "idle" | "error">, { label: string; index: number }][];
    const currentIndex = stage !== "idle" && stage !== "error" ? STAGE_CONFIG[stage].index : -1;
    const isImage = fileName.match(/\.(png|jpg|jpeg|webp)$/i);

    // Non-image files skip the OCR step
    const visibleStages = isImage ? stages : stages.filter(([key]) => key !== "ocr");

    return (
      <div className="flex items-center justify-center gap-1 mb-6">
        {visibleStages.map(([key, config], i) => {
          const isActive = stage === key;
          const isCompleted = currentIndex > config.index;

          return (
            <div key={key} className="flex items-center">
              {i > 0 && (
                <div className={`w-8 h-0.5 mx-1 transition-colors ${
                  isCompleted ? "bg-[#9FE870]" : "bg-[#E8EAED]"
                }`} />
              )}
              <div className="flex flex-col items-center gap-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                  isCompleted
                    ? "bg-[#9FE870] text-white"
                    : isActive
                    ? "bg-[#163300] text-white ring-4 ring-[#163300]/10"
                    : "bg-[#F4F5F6] text-[#B4BCC8]"
                }`}>
                  {isCompleted ? "✓" : config.index + 1}
                </div>
                <span className={`text-[11px] whitespace-nowrap ${
                  isActive ? "text-[#163300] font-medium" : isCompleted ? "text-[#4D5766]" : "text-[#B4BCC8]"
                }`}>
                  {config.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Drag-and-drop area */}
      {stage === "idle" && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-8 md:p-12 text-center transition-colors ${
            dragOver
              ? "border-[#9FE870] bg-[#9FE870]/5"
              : "border-[#E8EAED] hover:border-[#B4BCC8]"
          }`}
        >
          <Upload className="size-10 mx-auto text-[#B4BCC8] mb-3" />
          <p className="text-sm font-medium text-[#2E3338] mb-1">Drag a file here to upload</p>
          <p className="text-xs text-[#B4BCC8] mb-4">PDF, Word, or image</p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <FileText className="size-3.5 mr-1" />
              Choose file
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => cameraInputRef.current?.click()}
              className="md:hidden"
            >
              <Camera className="size-3.5 mr-1" />
              Take photo
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
            onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file); }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            capture="environment"
            onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file); }}
          />
        </div>
      )}

      {/* Pipeline in progress */}
      {stage !== "idle" && stage !== "error" && (
        <div className="rounded-2xl border border-[#E8EAED] p-8">
          <ProgressSteps />

          <div className="text-center">
            {stage === "ocr" && (
              <>
                <div className="w-48 mx-auto bg-[#F4F5F6] rounded-full h-2 mb-2">
                  <div
                    className="bg-[#9FE870] h-2 rounded-full transition-all"
                    style={{ width: `${ocrProgress}%` }}
                  />
                </div>
                <p className="text-sm text-[#2E3338]">Reading text from image... {ocrProgress}%</p>
                <p className="text-xs text-[#B4BCC8] mt-1">{fileName}</p>
              </>
            )}

            {stage === "uploading" && (
              <>
                <div className="w-48 mx-auto bg-[#F4F5F6] rounded-full h-2 mb-2">
                  <div className="bg-[#9FE870] h-2 rounded-full animate-pulse w-2/3" />
                </div>
                <p className="text-sm text-[#2E3338]">Uploading file...</p>
                <p className="text-xs text-[#B4BCC8] mt-1">{fileName}</p>
              </>
            )}

            {stage === "processing" && (
              <>
                <div className="w-48 mx-auto bg-[#F4F5F6] rounded-full h-2 mb-2">
                  <div className="bg-[#163300] h-2 rounded-full animate-[pulse_1.5s_ease-in-out_infinite] w-4/5" />
                </div>
                <p className="text-sm text-[#2E3338]">AI is analyzing the questions...</p>
                <p className="text-xs text-[#B4BCC8] mt-1">Usually takes 5–15 seconds</p>
              </>
            )}

            {stage === "done" && (
              <>
                <CheckCircle className="size-8 mx-auto text-[#9FE870] mb-2" />
                <p className="text-sm font-medium text-[#2E3338]">Done!</p>
                <p className="text-xs text-[#B4BCC8] mt-1 mb-3">Review the extracted questions below</p>
                <Button variant="outline" size="sm" onClick={reset}>
                  Upload another
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {stage === "error" && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <AlertCircle className="size-8 mx-auto text-red-400 mb-3" />
          <p className="text-sm font-medium text-[#2E3338]">Processing failed</p>
          <p className="text-xs text-red-500 mt-1 mb-4">{errorMsg}</p>
          <Button variant="outline" size="sm" onClick={reset}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
