export interface ExtractedQuestion {
  stem: string;
  type: "choice" | "fill_blank" | "solution";
  options?: string[];
  answer: string;
  explanation?: string;
  difficulty: number; // 1-5
}

export interface AIExtractionRequest {
  /** base64 encoded image data (for vision) */
  imageBase64?: string;
  /** MIME type for the image */
  imageMimeType?: string;
  /** Text content (for PDF/docx extracted text) */
  textContent?: string;
}

export interface AIExtractionResponse {
  questions: ExtractedQuestion[];
  rawResponse?: string;
}

export interface AIProvider {
  name: string;
  /** Extract questions from image or text content */
  extractQuestions(request: AIExtractionRequest): Promise<AIExtractionResponse>;
}
