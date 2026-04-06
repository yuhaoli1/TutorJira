export const QUESTION_EXTRACTION_SYSTEM_PROMPT = (topicNames?: string[]) => {
  const topicSection = topicNames && topicNames.length > 0
    ? `\n9. suggested_topic：从以下知识点列表中选择最匹配的一个填入，必须完全匹配列表中的名称。如果都不匹配，填 ""
可选知识点列表：
${topicNames.map(t => `- ${t}`).join("\n")}`
    : "";

  return `你是一个专业的数学题目提取助手。你的任务是从给定的图片或文本中提取数学题目，并将其结构化为JSON格式。

请严格按照以下JSON格式输出，不要包含任何其他文字：

[
  {
    "stem": "题目内容（完整的题干文字）",
    "type": "choice | fill_blank | solution",
    "options": ["A. 选项1", "B. 选项2", "C. 选项3", "D. 选项4"],
    "answer": "正确答案",
    "explanation": "解题思路和解析",
    "difficulty": 3,
    "suggested_topic": "知识点名称"
  }
]

规则：
1. type 分类：
   - "choice"：选择题（必须有 options 字段）
   - "fill_blank"：填空题（answer 为填空答案）
   - "solution"：解答题（answer 为完整解答过程）
2. difficulty 范围 1-5（1=简单，5=困难），根据题目的知识点深度和计算复杂度判断
3. options 字段仅在 type 为 "choice" 时需要
4. 如果能推断出答案和解析，请尽量提供
5. 如果无法确定答案，answer 填 "待填写"
6. stem 中的数学公式用文字描述，例如 "x的平方" 而非 "x²"
7. 保持原题的完整性，不要修改或简化题目内容
8. 只输出 JSON 数组，不要输出任何其他内容
9. **OCR 纠错**：图片可能模糊或有噪点，请根据数学常识自动纠正识别错误。常见情况：
   - "×" 可能被误识别为 "%"、"x"、"X"，根据数学上下文判断
   - "÷" 可能被误识别为 "+"、":" 等
   - 中文单位（厘米、米、千克等）可能识别为乱码，请根据题意补全
   - 数字 "0" 和字母 "O"、数字 "1" 和字母 "l" 等易混淆字符，根据上下文纠正
   - 选项内容如果出现明显乱码，请根据题目逻辑推断正确内容${topicSection}`;
};

export const QUESTION_EXTRACTION_USER_PROMPT_IMAGE = `请从这张图片中提取所有数学题目，按照系统提示的JSON格式输出。`;

export const QUESTION_EXTRACTION_USER_PROMPT_TEXT = (text: string) =>
  `请从以下文本中提取所有数学题目，按照系统提示的JSON格式输出。

文本内容：
${text}`;

// ===== OCR 纠错 prompt =====

export const OCR_CORRECTION_PROMPT = `你是一个数学题目校对助手。以下是从图片中 OCR 识别出的数学题目 JSON，可能存在识别错误（乱码、错字、符号错误等）。

请根据数学逻辑和上下文纠正所有错误，并返回修正后的 JSON 数组。

纠错规则：
1. 选项中的乱码（如 "1BEXK"）：根据题目计算结果推断正确内容（如周长题的选项应该是数值+单位）
2. 数学符号错误（"%" 应为 "×"，":" 应为 "÷" 等）
3. 单位乱码：根据题目上下文补全正确的中文单位（厘米、米、千克等）
4. 数字与字母混淆（0/O、1/l 等）
5. answer 字段也要一并修正
6. 如果内容没有问题，保持原样不变
7. 只输出修正后的 JSON 数组，不要输出任何其他内容`;

// ===== 答案识别 prompts =====

export const ANSWER_EXTRACTION_SYSTEM_PROMPT = `你是一个小学数学答案识别和判题助手。学生拍了一张答题纸的照片，请根据提供的题目列表和标准答案，从照片中识别出每道题的答案，并判断是否正确。

规则：
1. 对于选择题，只返回选项字母（如 A、B、C、D）
2. 对于填空题，返回填写的数字或文字
3. 对于解答题，返回学生写的完整解答过程
4. 如果某道题在照片中找不到答案，answer 填 ""，is_correct 填 false
5. 判断正确时要考虑：答案顺序不同但内容完整算正确、数学表达式等价算正确、单位省略但数值正确算正确
6. 严格按照 JSON 数组格式返回，不要输出任何其他内容

返回格式：
[{"index": 0, "answer": "...", "is_correct": true}, {"index": 1, "answer": "...", "is_correct": false}, ...]`;

export const ANSWER_EXTRACTION_USER_PROMPT = (
  questions: { index: number; stem: string; type: string; options?: string[]; correct_answer?: string }[],
) => {
  const list = questions
    .map((q) => {
      let desc = `第${q.index + 1}题 [${q.type === "choice" ? "选择题" : q.type === "fill_blank" ? "填空题" : "解答题"}]: ${q.stem}`;
      if (q.options && q.options.length > 0) {
        desc += `\n  选项: ${q.options.join(" | ")}`;
      }
      if (q.correct_answer) {
        desc += `\n  标准答案: ${q.correct_answer}`;
      }
      return desc;
    })
    .join("\n");
  return `请从照片中识别以下每道题的学生答案，并对比标准答案判断是否正确：\n\n${list}`;
};
