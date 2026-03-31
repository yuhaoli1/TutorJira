// 2024 五进六奥数课程计划 — 知识点数据
export interface TopicSeed {
  title: string;
  sortOrder: number;
  subtopics: string[];
}

export const MATH_TOPICS: TopicSeed[] = [
  {
    title: "小数乘、除法的速算与巧算",
    sortOrder: 1,
    subtopics: ["拆分与凑整", "积不变的规律", "除法的性质的应用", "多位小数的乘、除法"],
  },
  {
    title: "最大公因数和最小公倍数 / 分解质因数",
    sortOrder: 2,
    subtopics: ["最大公因数", "最小公倍数", "两者之间的关系", "分解质因数的应用", "分数的拆分"],
  },
  {
    title: "火车行程问题",
    sortOrder: 3,
    subtopics: ["火车过桥问题", "火车相遇问题", "火车追及问题"],
  },
  {
    title: "解复杂方程 / 错中求解",
    sortOrder: 4,
    subtopics: ["解方程的各种题型", "小数乘除中的错中求解", "方程中的错中求解问题"],
  },
  {
    title: "列方程解应用题",
    sortOrder: 5,
    subtopics: ["解决鸡兔同笼问题", "解决盈亏问题", "解决年龄问题", "解决相遇、追及问题", "解决流水行船问题"],
  },
  {
    title: "长方体和正方体",
    sortOrder: 6,
    subtopics: ["三视图求表面积", "长方体和正方体的展开图", "水中浸没", "立体图形染色", "切片法求体积"],
  },
  {
    title: "巧求面积 / 不规则图形的面积",
    sortOrder: 7,
    subtopics: ["等积变形", "一半模型", "根据差不变的性质求面积", "分割法求面积"],
  },
  {
    title: "面积模型",
    sortOrder: 8,
    subtopics: ["风筝模型", "蝴蝶模型", "燕尾模型"],
  },
  {
    title: "数与形 / 植树问题与方阵问题",
    sortOrder: 9,
    subtopics: ["数形结合求和（或差）的平方", "数形结合求和（或差）的积", "在直线、不封闭、封闭线上植树", "方阵问题"],
  },
  {
    title: "分数裂项 / 分数加减法的速算与巧算",
    sortOrder: 10,
    subtopics: ["裂差型列项", "裂和型列项", "分组凑整、运算定理简算"],
  },
  {
    title: "比较与估算 / 循环小数",
    sortOrder: 11,
    subtopics: ["小数和分数大小比较", "数的估算", "分数与循环小数之间转换"],
  },
  {
    title: "幻方与数阵图 / 定义新运算",
    sortOrder: 12,
    subtopics: ["三阶幻方", "数阵图", "直接运算型、反解未知数型", "高斯取整"],
  },
  {
    title: "单位1的转化",
    sortOrder: 13,
    subtopics: ["单位1的转化"],
  },
  {
    title: "工程问题",
    sortOrder: 14,
    subtopics: ["工程问题"],
  },
  {
    title: "浓度问题",
    sortOrder: 15,
    subtopics: ["浓度问题"],
  },
  {
    title: "经济问题",
    sortOrder: 16,
    subtopics: ["经济问题"],
  },
  {
    title: "平面几何",
    sortOrder: 17,
    subtopics: ["割与补", "比例关系", "整体计算和差不变"],
  },
  {
    title: "立体几何",
    sortOrder: 18,
    subtopics: ["基本公式的运用", "切割与拼接", "空间思维", "比列关系与等量关系（六年级：比）"],
  },
  {
    title: "数论综合复习",
    sortOrder: 19,
    subtopics: ["整数的整除特征", "质数和合数", "因数和倍数", "带余数法", "余数的性质", "位值原理", "进位制"],
  },
  {
    title: "计数综合",
    sortOrder: 20,
    subtopics: ["基础计数", "加乘原理", "平面图形计数"],
  },
];
