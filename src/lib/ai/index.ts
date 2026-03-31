import type { AIProvider } from "./types";
import { ClaudeProvider } from "./providers/claude";
import { DeepSeekProvider } from "./providers/deepseek";
import { OpenAIProvider } from "./providers/openai";

export type { AIProvider, AIExtractionRequest, AIExtractionResponse, ExtractedQuestion } from "./types";

const providers: Record<string, () => AIProvider> = {
  claude: () => new ClaudeProvider(),
  deepseek: () => new DeepSeekProvider(),
  openai: () => new OpenAIProvider(),
};

export function getAIProvider(): AIProvider {
  const providerName = process.env.AI_PROVIDER || "claude";
  const factory = providers[providerName];
  if (!factory) {
    throw new Error(`不支持的AI提供商: ${providerName}，可选: ${Object.keys(providers).join(", ")}`);
  }
  return factory();
}
