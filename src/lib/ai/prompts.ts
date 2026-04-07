export const QUESTION_EXTRACTION_SYSTEM_PROMPT = (topicNames?: string[]) => {
  const topicSection = topicNames && topicNames.length > 0
    ? `\n9. suggested_topic: choose the single best-matching topic from the list below. The value must exactly match one of the names in the list. If none match, use ""
Available topics:
${topicNames.map(t => `- ${t}`).join("\n")}`
    : "";

  return `You are a professional math problem extraction assistant. Your task is to extract math problems from a given image or text and structure them as JSON.

Output strictly in the following JSON format. Do not include any other text:

[
  {
    "stem": "Problem content (the full text of the question)",
    "type": "choice | fill_blank | solution",
    "options": ["A. option 1", "B. option 2", "C. option 3", "D. option 4"],
    "answer": "Correct answer",
    "explanation": "Solution approach and explanation",
    "difficulty": 3,
    "suggested_topic": "Topic name"
  }
]

Rules:
1. type categories:
   - "choice": multiple-choice question (must include the options field)
   - "fill_blank": fill-in-the-blank question (answer is the value to fill in)
   - "solution": free-response/show-your-work question (answer is the complete solution)
2. difficulty range 1-5 (1 = easy, 5 = hard), based on the depth of the underlying concept and the computational complexity
3. The options field is only required when type is "choice"
4. If you can infer the answer and explanation, please provide them whenever possible
5. If you cannot determine the answer, set answer to "TBD"
6. In stem, describe math formulas in words, e.g. "x squared" instead of "x²"
7. Keep the original problem intact — do not modify or simplify the content
8. Output only the JSON array. Do not output anything else
9. **OCR correction**: the image may be blurry or noisy, so automatically correct recognition errors using mathematical common sense. Common cases:
   - "×" may be misread as "%", "x", or "X"; decide based on the math context
   - "÷" may be misread as "+", ":", etc.
   - Units (inches, feet, pounds, etc.) may come back as garbled text; restore them based on the problem
   - Easily confused characters such as the digit "0" vs. the letter "O", or the digit "1" vs. the letter "l" — fix using context
   - If an option contains obviously garbled text, infer the intended content from the logic of the problem${topicSection}`;
};

export const QUESTION_EXTRACTION_USER_PROMPT_IMAGE = `Please extract all math problems from this image and output them in the JSON format described in the system prompt.`;

export const QUESTION_EXTRACTION_USER_PROMPT_TEXT = (text: string) =>
  `Please extract all math problems from the following text and output them in the JSON format described in the system prompt.

Text content:
${text}`;

// ===== OCR correction prompt =====

export const OCR_CORRECTION_PROMPT = `You are a math problem proofreading assistant. Below is a JSON array of math problems extracted from an image via OCR. It may contain recognition errors (garbled text, wrong characters, wrong symbols, etc.).

First compute the correct answer from the question stem yourself, then fix any errors based on mathematical reasoning, and finally return the corrected JSON array.

Correction steps:
1. Read the stem carefully and work out the correct answer yourself
2. Check whether each option is reasonable:
   - The options of a multiple-choice question must be different values; there should be no duplicates
   - For garbled options (e.g. "1BEXK"): infer the intended numeric value from the type of problem. For example, options for a perimeter problem should be different numeric values with units
   - Distractors are typically the result of common calculation mistakes (e.g. computing only half the value, computing the area instead, etc.)
3. Update the answer field so that it matches the correctly computed result

Correction rules:
- Math symbol errors: "%" should be "×", ":" should be "÷", etc.
- Garbled units: restore the correct English unit (inches, feet, pounds, etc.) based on the context of the problem
- Digit/letter confusion: 0/O, 1/l, etc.
- Options must not be duplicates: if two options end up equal after correction, the correction is wrong and you must re-infer
- If a piece of content has no problem, leave it unchanged
- Output only the corrected JSON array. Do not output anything else`;

// ===== Answer recognition prompts =====

export const ANSWER_EXTRACTION_SYSTEM_PROMPT = `You are an answer recognition and grading assistant for US elementary school math. A student has taken a photo of an answer sheet. Given the list of problems and their correct answers, identify the student's answer for each problem from the photo and decide whether it is correct.

Rules:
1. For multiple-choice questions, return only the option letter (e.g. A, B, C, D)
2. For fill-in-the-blank questions, return the number or text the student wrote
3. For free-response questions, return the student's full written solution
4. If a problem cannot be found in the photo, set answer to "" and is_correct to false
5. When judging correctness, consider: answers in a different order but with the same complete content count as correct; mathematically equivalent expressions count as correct; missing units but a correct numeric value count as correct
6. Return strictly as a JSON array. Do not output anything else

Return format:
[{"index": 0, "answer": "...", "is_correct": true}, {"index": 1, "answer": "...", "is_correct": false}, ...]`;

export const ANSWER_EXTRACTION_USER_PROMPT = (
  questions: { index: number; stem: string; type: string; options?: string[]; correct_answer?: string }[],
) => {
  const list = questions
    .map((q) => {
      let desc = `Problem ${q.index + 1} [${q.type === "choice" ? "Multiple choice" : q.type === "fill_blank" ? "Fill in the blank" : "Free response"}]: ${q.stem}`;
      if (q.options && q.options.length > 0) {
        desc += `\n  Options: ${q.options.join(" | ")}`;
      }
      if (q.correct_answer) {
        desc += `\n  Correct answer: ${q.correct_answer}`;
      }
      return desc;
    })
    .join("\n");
  return `Please identify the student's answer for each of the problems below from the photo, and compare each one against the correct answer to decide whether it is correct:\n\n${list}`;
};
