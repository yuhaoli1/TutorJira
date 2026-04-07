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
      throw new Error("DEEPSEEK_API_KEY environment variable is not set");
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
      throw new Error(`DeepSeek API call failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || "";

    const questions = this.parseQuestions(rawText);
    return { questions, rawResponse: rawText };
  }

  private async buildMessages(request: AIExtractionRequest) {
    if (request.imageBase64 && request.imageMimeType) {
      // DeepSeek chat does not support images, so OCR them to text first
      const ocrText = await this.ocrImage(request.imageBase64, request.imageMimeType);
      if (!ocrText.trim()) {
        throw new Error("Image OCR did not extract any text content");
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

    throw new Error("Either image or text content must be provided");
  }

  /**
   * Use a vision model for OCR: prefer Doubao (available in mainland China), then fall back to OpenAI
   */
  private async ocrImage(base64: string, mimeType: string): Promise<string> {
    // Prefer Doubao vision model (available in mainland China)
    const doubaoKey = process.env.DOUBAO_API_KEY;
    if (doubaoKey) {
      try {
        const doubaoBase = process.env.DOUBAO_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3";
        const doubaoModel = process.env.DOUBAO_MODEL || "doubao-1.5-vision-pro-250328";
        const res = await fetch(`${doubaoBase}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${doubaoKey}`,
          },
          body: JSON.stringify({
            model: doubaoModel,
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
                    text: "Please transcribe all of the text in the image in full, preserving the original formatting and layout. Include problem numbers, problem statements, options, answers, and explanations.",
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
        console.warn("Doubao OCR fallback failed:", e);
      }
    }

    // Fall back to OpenAI
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiKey}`,
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
                    text: "Please transcribe all of the text in the image in full, preserving the original formatting and layout. Include problem numbers, problem statements, options, answers, and explanations.",
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

    throw new Error("DeepSeek does not support images directly. Please configure DOUBAO_API_KEY or OPENAI_API_KEY for image OCR, or upload a PDF/text file instead.");
  }

  private parseQuestions(rawText: string): ExtractedQuestion[] {
    try {
      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.error("Failed to extract JSON from AI response:", rawText);
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
        answer: String(q.answer || "TBD"),
        explanation: q.explanation ? String(q.explanation) : undefined,
        difficulty: Math.min(5, Math.max(1, Number(q.difficulty) || 3)),
        suggested_topic: q.suggested_topic ? String(q.suggested_topic) : undefined,
      }));
    } catch (e) {
      console.error("Failed to parse AI response:", e);
      return [];
    }
  }
}
