import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAIProvider } from "@/lib/ai";
import { TAG_CATEGORY_UI } from "@/lib/constants";
import { OCR_CORRECTION_PROMPT } from "@/lib/ai/prompts";
import type { ExtractedQuestion } from "@/lib/ai/types";

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

      // 获取所有标签，用于 AI 匹配和自动打标
      const { data: allTags } = await supabase
        .from("question_tags")
        .select("id, name, slug, category_id, question_tag_categories(slug)")
        .order("sort_order");

      const tags = allTags || [];
      const getCatSlug = (t: typeof tags[0]) => (t.question_tag_categories as unknown as { slug: string } | null)?.slug;

      // 动态构建每个维度的匹配映射：catSlug → Map<matchKey, tagId>
      // 匹配策略：knowledge_point 按 name 匹配，其他维度按 slug 匹配
      const stripPrefix = (name: string) => name.replace(/^第\d+讲[：:]/, "");
      const tagMapsByCategory = new Map<string, Map<string, string>>();

      for (const t of tags) {
        const catSlug = getCatSlug(t);
        if (!catSlug) continue;
        if (!tagMapsByCategory.has(catSlug)) {
          tagMapsByCategory.set(catSlug, new Map());
        }
        const map = tagMapsByCategory.get(catSlug)!;
        if (catSlug === "knowledge_point") {
          // 知识点用 name 匹配（含去前缀版本）
          map.set(t.name, t.id);
          map.set(stripPrefix(t.name), t.id);
        } else {
          // 其他维度用 slug 匹配
          if (t.slug) map.set(t.slug, t.id);
        }
      }

      // 知识点名称列表给 AI 参考
      const kpMap = tagMapsByCategory.get("knowledge_point");
      const topicNames = kpMap ? [...new Set([...kpMap.keys()])] : [];

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

      // ====== 第二轮：OCR 纠错（默认关闭，设 ENABLE_OCR_CORRECTION=true 开启）======
      const correctedQuestions = process.env.ENABLE_OCR_CORRECTION === "true"
        ? await correctOCRErrors(result.questions)
        : result.questions;

      // 自动将 AI 返回的字段映射到标签 ID（动态遍历所有维度）
      // AI 返回的字段 → 维度匹配，由 TAG_CATEGORY_UI.aiFieldKey 驱动
      const questionsWithTopics = correctedQuestions.map((q) => {
        const autoTagIds: string[] = [];
        const qRecord = q as unknown as Record<string, unknown>;

        for (const [catSlug, catMap] of tagMapsByCategory.entries()) {
          const uiConfig = TAG_CATEGORY_UI[catSlug];
          if (!uiConfig?.aiFieldKey) continue;

          const aiValue = qRecord[uiConfig.aiFieldKey];
          if (aiValue == null) continue;

          const matchKey = String(aiValue);
          const tagId = catMap.get(matchKey);
          if (tagId) autoTagIds.push(tagId);
        }

        // backward compat: topic_id
        const knowledgeTagId = q.suggested_topic
          ? tagMapsByCategory.get("knowledge_point")?.get(q.suggested_topic)
          : undefined;

        return {
          ...q,
          topic_id: knowledgeTagId || undefined,
          auto_tag_ids: autoTagIds,
        };
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

/**
 * 第二轮 OCR 纠错：用 DeepSeek 文字模型检查并修复提取结果中的乱码/错字
 * 如果 DeepSeek 不可用，跳过纠错直接返回原数据
 */
async function correctOCRErrors(questions: ExtractedQuestion[]): Promise<ExtractedQuestion[]> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || questions.length === 0) return questions;

  try {
    const baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
    const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        messages: [
          { role: "system", content: OCR_CORRECTION_PROMPT },
          { role: "user", content: JSON.stringify(questions, null, 2) },
        ],
      }),
    });

    if (!response.ok) {
      console.error("OCR 纠错 API 失败:", response.status);
      return questions; // 纠错失败不影响主流程
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || "";

    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return questions;

    const corrected = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(corrected) || corrected.length !== questions.length) return questions;

    // 合并纠错结果，保留原始的 suggested_topic 等字段
    return questions.map((original, i) => ({
      ...original,
      stem: String(corrected[i].stem || original.stem),
      options: Array.isArray(corrected[i].options) ? corrected[i].options.map(String) : original.options,
      answer: String(corrected[i].answer || original.answer),
      explanation: corrected[i].explanation ? String(corrected[i].explanation) : original.explanation,
    }));
  } catch (e) {
    console.error("OCR 纠错失败:", e);
    return questions; // 纠错失败不影响主流程
  }
}
