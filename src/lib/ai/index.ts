import type { AIProvider } from "./types";
import { ClaudeProvider } from "./providers/claude";
import { DeepSeekProvider } from "./providers/deepseek";
import { DoubaoProvider } from "./providers/doubao";
import { OpenAIProvider } from "./providers/openai";
import { QwenProvider } from "./providers/qwen";
import { GeminiProvider } from "./providers/gemini";

export type { AIProvider, AIExtractionRequest, AIExtractionResponse, ExtractedQuestion } from "./types";

const providers: Record<string, () => AIProvider> = {
  claude: () => new ClaudeProvider(),
  deepseek: () => new DeepSeekProvider(),
  doubao: () => new DoubaoProvider(),
  openai: () => new OpenAIProvider(),
  qwen: () => new QwenProvider(),
  gemini: () => new GeminiProvider(),
};

export function getAIProvider(): AIProvider {
  const providerName = process.env.AI_PROVIDER || "claude";
  const factory = providers[providerName];
  if (!factory) {
    throw new Error(`Unsupported AI provider: ${providerName}. Available: ${Object.keys(providers).join(", ")}`);
  }
  return factory();
}
