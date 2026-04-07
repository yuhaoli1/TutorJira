import type { AIProvider, AIExtractionRequest, AIExtractionResponse, ExtractedQuestion } from "../types";
import {
  QUESTION_EXTRACTION_SYSTEM_PROMPT,
  QUESTION_EXTRACTION_USER_PROMPT_IMAGE,
  QUESTION_EXTRACTION_USER_PROMPT_TEXT,
} from "../prompts";

export class DoubaoProvider implements AIProvider {
  name = "doubao";
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.DOUBAO_API_KEY || "";
    this.model = process.env.DOUBAO_MODEL || "doubao-1.5-vision-pro-250328";
    this.baseUrl = process.env.DOUBAO_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3";
    if (!this.apiKey) {
      throw new Error("DOUBAO_API_KEY environment variable is not set");
    }
  }

  async extractQuestions(request: AIExtractionRequest): Promise<AIExtractionResponse> {
    const messages = this.buildMessages(request);

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
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
      throw new Error(`Doubao API call failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || "";

    const questions = this.parseQuestions(rawText);
    return { questions, rawResponse: rawText };
  }

  private buildMessages(request: AIExtractionRequest) {
    if (request.imageBase64 && request.imageMimeType) {
      return [
        {
          role: "user" as const,
          content: [
            {
              type: "image_url" as const,
              image_url: {
                url: `data:${request.imageMimeType};base64,${request.imageBase64}`,
              },
            },
            {
              type: "text" as const,
              text: QUESTION_EXTRACTION_USER_PROMPT_IMAGE,
            },
          ],
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
