import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAIProvider } from "@/lib/ai";
import { TAG_CATEGORY_UI } from "@/lib/constants";
import { OCR_CORRECTION_PROMPT } from "@/lib/ai/prompts";
import type { ExtractedQuestion } from "@/lib/ai/types";

// POST /api/questions/upload/[id]/process - AI processing
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    // Parse request body (may contain client-side OCR text)
    let ocrText: string | null = null;
    try {
      const body = await request.json();
      ocrText = body.ocrText || null;
    } catch {
      // No JSON body is fine
    }

    // Fetch upload record
    const { data: upload, error: fetchError } = await supabase
      .from("question_uploads")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !upload) {
      return NextResponse.json({ error: "Upload record not found" }, { status: 404 });
    }

    // Update status to processing
    await supabase
      .from("question_uploads")
      .update({ status: "processing" })
      .eq("id", id);

    try {
      const provider = getAIProvider();

      // Fetch all tags, used for AI matching and auto-tagging
      const { data: allTags } = await supabase
        .from("question_tags")
        .select("id, name, slug, category_id, question_tag_categories(slug)")
        .order("sort_order");

      const tags = allTags || [];
      const getCatSlug = (t: typeof tags[0]) => (t.question_tag_categories as unknown as { slug: string } | null)?.slug;

      // Dynamically build the match map for each category: catSlug → Map<matchKey, tagId>
      // Matching strategy: knowledge_point matches by name, other categories match by slug
      const stripPrefix = (name: string) => name.replace(/^Lesson \d+:\s*/, "");
      const tagMapsByCategory = new Map<string, Map<string, string>>();

      for (const t of tags) {
        const catSlug = getCatSlug(t);
        if (!catSlug) continue;
        if (!tagMapsByCategory.has(catSlug)) {
          tagMapsByCategory.set(catSlug, new Map());
        }
        const map = tagMapsByCategory.get(catSlug)!;
        if (catSlug === "knowledge_point") {
          // knowledge points are matched by name (including the prefix-stripped version)
          map.set(t.name, t.id);
          map.set(stripPrefix(t.name), t.id);
        } else {
          // Other categories match by slug
          if (t.slug) map.set(t.slug, t.id);
        }
      }

      // Knowledge point name list passed to the AI for reference
      const kpMap = tagMapsByCategory.get("knowledge_point");
      const topicNames = kpMap ? [...new Set([...kpMap.keys()])] : [];

      let result;

      // If client-side OCR text (image) is provided, process it directly as text
      if (ocrText && upload.file_type === "image") {
        result = await provider.extractQuestions({
          textContent: ocrText,
          topicNames,
        });
      } else if (upload.file_type === "image") {
        // Fallback: try the AI's vision capability
        const storagePath = upload.file_url.replace(/^.*\/question-uploads\//, "");
        const { data: signedUrlData, error: signedUrlError } = await supabase
          .storage
          .from("question-uploads")
          .createSignedUrl(storagePath, 300);

        if (signedUrlError || !signedUrlData?.signedUrl) {
          throw new Error("Failed to generate signed file URL");
        }

        const imageResponse = await fetch(signedUrlData.signedUrl);
        if (!imageResponse.ok) {
          throw new Error("Failed to download image file");
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
        // Extract storage path from file_url and generate a signed URL
        const storagePath = upload.file_url.replace(/^.*\/question-uploads\//, "");
        const { data: signedUrlData, error: signedUrlError } = await supabase
          .storage
          .from("question-uploads")
          .createSignedUrl(storagePath, 300);

        if (signedUrlError || !signedUrlData?.signedUrl) {
          throw new Error("Failed to generate signed file URL");
        }

        // Download PDF and extract text
        const pdfResponse = await fetch(signedUrlData.signedUrl);
        if (!pdfResponse.ok) {
          throw new Error("Failed to download PDF file");
        }
        const pdfBuffer = await pdfResponse.arrayBuffer();

        // Dynamic import of pdf-parse (v2 class-based API)
        const { PDFParse } = await import("pdf-parse");
        const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
        const textResult = await parser.getText();
        await parser.destroy();

        const pdfText = textResult.text || "";
        if (!pdfText.trim()) {
          throw new Error("No text content was extracted from the PDF file");
        }

        result = await provider.extractQuestions({
          textContent: pdfText,
          topicNames,
        });
      } else {
        throw new Error(`AI processing is not yet supported for ${upload.file_type} files`);
      }

      // ====== Second pass: OCR correction (disabled by default, enable with ENABLE_OCR_CORRECTION=true) ======
      const correctedQuestions = process.env.ENABLE_OCR_CORRECTION === "true"
        ? await correctOCRErrors(result.questions)
        : result.questions;

      // Automatically map fields returned by the AI to tag IDs (iterate over all categories dynamically)
      // AI returned field → category matching, driven by TAG_CATEGORY_UI.aiFieldKey
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

        return {
          ...q,
          auto_tag_ids: autoTagIds,
        };
      });

      // Save extraction results
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
      const errorMessage = aiError instanceof Error ? aiError.message : "AI processing failed";
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
    console.error("AI processing failed:", error);
    return NextResponse.json({ error: "AI processing failed" }, { status: 500 });
  }
}

/**
 * Second-pass OCR correction: use the DeepSeek text model to check and fix garbled or wrong characters in the extraction results.
 * If DeepSeek is unavailable, skip correction and return the original data.
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
      console.error("OCR correction API failed:", response.status);
      return questions; // Correction failure does not affect main flow
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || "";

    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return questions;

    const corrected = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(corrected) || corrected.length !== questions.length) return questions;

    // Merge correction results, keep original fields like suggested_topic
    return questions.map((original, i) => ({
      ...original,
      stem: String(corrected[i].stem || original.stem),
      options: Array.isArray(corrected[i].options) ? corrected[i].options.map(String) : original.options,
      answer: String(corrected[i].answer || original.answer),
      explanation: corrected[i].explanation ? String(corrected[i].explanation) : original.explanation,
    }));
  } catch (e) {
    console.error("OCR correction failed:", e);
    return questions; // Correction failure does not affect main flow
  }
}
