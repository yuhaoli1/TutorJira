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
8. 只输出 JSON 数组，不要输出任何其他内容${topicSection}`;
};

export const QUESTION_EXTRACTION_USER_PROMPT_IMAGE = `请从这张图片中提取所有数学题目，按照系统提示的JSON格式输出。`;

export const QUESTION_EXTRACTION_USER_PROMPT_TEXT = (text: string) =>
  `请从以下文本中提取所有数学题目，按照系统提示的JSON格式输出。

文本内容：
${text}`;

// ===== 答案识别 prompts =====

export const ANSWER_EXTRACTION_SYSTEM_PROMPT = `你是一个小学数学答案识别助手。学生拍了一张答题纸的照片，请根据提供的题目列表，从照片中识别出每道题的答案。

规则：
1. 对于选择题，只返回选项字母（如 A、B、C、D）
2. 对于填空题，返回填写的数字或文字
3. 对于解答题，返回学生写的完整解答过程
4. 如果某道题在照片中找不到答案，answer 填 ""
5. 严格按照 JSON 数组格式返回，不要输出任何其他内容

返回格式：
[{"index": 0, "answer": "..."}, {"index": 1, "answer": "..."}, ...]`;

export const ANSWER_EXTRACTION_USER_PROMPT = (
  questions: { index: number; stem: string; type: string; options?: string[] }[],
) => {
  const list = questions
    .map((q) => {
      let desc = `第${q.index + 1}题 [${q.type === "choice" ? "选择题" : q.type === "fill_blank" ? "填空题" : "解答题"}]: ${q.stem}`;
      if (q.options && q.options.length > 0) {
        desc += `\n  选项: ${q.options.join(" | ")}`;
      }
      return desc;
    })
    .join("\n");
  return `请从照片中识别以下每道题的学生答案：\n\n${list}`;
};
