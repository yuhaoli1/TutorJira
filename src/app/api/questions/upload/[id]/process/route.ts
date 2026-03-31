import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAIProvider } from "@/lib/ai";

// POST /api/questions/upload/[id]/process - AI 处理
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    // 解析请求体（可能包含客户端 OCR 文本）
    let ocrText: string | null = null;
    try {
      const body = await request.json();
      ocrText = body.ocrText || null;
    } catch {
      // 没有 JSON body 也没关系
    }

    // 获取上传记录
    const { data: upload, error: fetchError } = await supabase
      .from("question_uploads")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !upload) {
      return NextResponse.json({ error: "上传记录不存在" }, { status: 404 });
    }

    // 更新状态为处理中
    await supabase
      .from("question_uploads")
      .update({ status: "processing" })
      .eq("id", id);

    try {
      const provider = getAIProvider();

      // 获取所有知识点，传给 AI 做自动匹配
      const { data: allTopics } = await supabase
        .from("knowledge_topics")
        .select("id, title")
        .order("sort_order");

      const topicNames = (allTopics || []).map((t: { title: string }) => t.title);
      const topicMap = new Map((allTopics || []).map((t: { id: string; title: string }) => [t.title, t.id]));

      let result;

      // 如果有客户端 OCR 文本（图片），直接用文本处理
      if (ocrText && upload.file_type === "image") {
        result = await provider.extractQuestions({
          textContent: ocrText,
          topicNames,
        });
      } else if (upload.file_type === "image") {
        // Fallback: 尝试用 AI 的 vision 能力
        const storagePath = upload.file_url.replace(/^.*\/question-uploads\//, "");
        const { data: signedUrlData, error: signedUrlError } = await supabase
          .storage
          .from("question-uploads")
          .createSignedUrl(storagePath, 300);

        if (signedUrlError || !signedUrlData?.signedUrl) {
          throw new Error("无法生成文件签名URL");
        }

        const imageResponse = await fetch(signedUrlData.signedUrl);
        if (!imageResponse.ok) {
          throw new Error("无法下载图片文件");
        }
        const imageBuffer = await imageResponse.arrayBuffer();
        const base64 = Buffer.from(imageBuffer).toString("base64");
        const contentType = imageResponse.headers.get("content-type") || "image/png";

        result = await provider.extractQuestions({
          imageBase64: base64,
          imageMimeType: contentType,
          topicNames,
        });
      } else if (upload.file_type === "pdf") {
        // 从 file_url 提取 storage path，生成签名 URL
        const storagePath = upload.file_url.replace(/^.*\/question-uploads\//, "");
        const { data: signedUrlData, error: signedUrlError } = await supabase
          .storage
          .from("question-uploads")
          .createSignedUrl(storagePath, 300);

        if (signedUrlError || !signedUrlData?.signedUrl) {
          throw new Error("无法生成文件签名URL");
        }

        // 下载 PDF 并提取文本
        const pdfResponse = await fetch(signedUrlData.signedUrl);
        if (!pdfResponse.ok) {
          throw new Error("无法下载PDF文件");
        }
        const pdfBuffer = await pdfResponse.arrayBuffer();

        // 动态导入 pdf-parse (v2 class-based API)
        const { PDFParse } = await import("pdf-parse");
        const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
        const textResult = await parser.getText();
        await parser.destroy();

        const pdfText = textResult.text || "";
        if (!pdfText.trim()) {
          throw new Error("PDF文件中未提取到文本内容");
        }

        result = await provider.extractQuestions({
          textContent: pdfText,
          topicNames,
        });
      } else {
        throw new Error(`暂不支持 ${upload.file_type} 类型文件的AI处理`);
      }

      // 根据 AI 返回的 suggested_topic 自动匹配 topic_id
      const questionsWithTopics = result.questions.map((q) => {
        if (q.suggested_topic && topicMap.has(q.suggested_topic)) {
          return { ...q, topic_id: topicMap.get(q.suggested_topic) };
        }
        return q;
      });

      // 保存提取结果
      await supabase
        .from("question_uploads")
        .update({
          status: "completed",
          ai_provider: provider.name,
          extracted_questions: questionsWithTopics as unknown as Record<string, unknown>[],
          question_count: questionsWithTopics.length,
        })
        .eq("id", id);

      return NextResponse.json({
        questions: questionsWithTopics,
        count: questionsWithTopics.length,
      });
    } catch (aiError) {
      const errorMessage = aiError instanceof Error ? aiError.message : "AI处理失败";
      await supabase
        .from("question_uploads")
        .update({
          status: "failed",
          error_message: errorMessage,
        })
        .eq("id", id);

      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  } catch (error) {
    console.error("AI处理失败:", error);
    return NextResponse.json({ error: "AI处理失败" }, { status: 500 });
  }
}
