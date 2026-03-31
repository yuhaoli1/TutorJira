import type { AIProvider, AIExtractionRequest, AIExtractionResponse, ExtractedQuestion } from "../types";
import {
  QUESTION_EXTRACTION_SYSTEM_PROMPT,
  QUESTION_EXTRACTION_USER_PROMPT_IMAGE,
  QUESTION_EXTRACTION_USER_PROMPT_TEXT,
} from "../prompts";

export class DeepSeekProvider implements AIProvider {
  name = "deepseek";
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY || "";
    this.model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
    this.baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
    if (!this.apiKey) {
      throw new Error("DEEPSEEK_API_KEY 环境变量未设置");
    }
  }

  async extractQuestions(request: AIExtractionRequest): Promise<AIExtractionResponse> {
    const messages = await this.buildMessages(request);

    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        messages: [
          { role: "system", content: QUESTION_EXTRACTION_SYSTEM_PROMPT(request.topicNames) },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API 调用失败: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || "";

    const questions = this.parseQuestions(rawText);
    return { questions, rawResponse: rawText };
  }

  private async buildMessages(request: AIExtractionRequest) {
    if (request.imageBase64 && request.imageMimeType) {
      // DeepSeek chat 不支持图片，先用 OCR 转文字再处理
      const ocrText = await this.ocrImage(request.imageBase64, request.imageMimeType);
      if (!ocrText.trim()) {
        throw new Error("图片 OCR 未提取到文字内容");
      }
      return [
        {
          role: "user" as const,
          content: QUESTION_EXTRACTION_USER_PROMPT_TEXT(ocrText),
        },
      ];
    }

    if (request.textContent) {
      return [
        {
          role: "user" as const,
          content: QUESTION_EXTRACTION_USER_PROMPT_TEXT(request.textContent),
        },
      ];
    }

    throw new Error("必须提供图片或文本内容");
  }

  /**
   * 用 OpenAI 兼容的 vision 模型做 OCR（如果可用），
   * 否则用 DeepSeek 的 janus 模型，
   * 最后 fallback 到简单提示
   */
  private async ocrImage(base64: string, mimeType: string): Promise<string> {
    // 尝试用 OpenAI GPT-4o-mini 做 OCR（便宜且支持图片）
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            max_tokens: 4096,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "image_url",
                    image_url: { url: `data:${mimeType};base64,${base64}` },
                  },
                  {
                    type: "text",
                    text: "请将图片中的所有文字内容完整地转录出来，保持原始格式和排版。包括题号、题目内容、选项、答案和解析。",
                  },
                ],
              },
            ],
          }),
        });
        if (res.ok) {
          const data = await res.json();
          return data.choices?.[0]?.message?.content || "";
        }
      } catch (e) {
        console.warn("OpenAI OCR fallback failed:", e);
      }
    }

    throw new Error("DeepSeek 不支持直接处理图片，请配置 OPENAI_API_KEY 用于图片 OCR，或上传 PDF/文本文件");
  }

  private parseQuestions(rawText: string): ExtractedQuestion[] {
    try {
      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.error("无法从AI响应中提取JSON:", rawText);
        return [];
      }
      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed)) return [];

      return parsed.map((q: Record<string, unknown>) => ({
        stem: String(q.stem || ""),
        type: (["choice", "fill_blank", "solution"].includes(q.type as string)
          ? q.type
          : "solution") as ExtractedQuestion["type"],
        options: Array.isArray(q.options) ? q.options.map(String) : undefined,
        answer: String(q.answer || "待填写"),
        explanation: q.explanation ? String(q.explanation) : undefined,
        difficulty: Math.min(5, Math.max(1, Number(q.difficulty) || 3)),
        suggested_topic: q.suggested_topic ? String(q.suggested_topic) : undefined,
      }));
    } catch (e) {
      console.error("解析AI响应失败:", e);
      return [];
    }
  }
}
