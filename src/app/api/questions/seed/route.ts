import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 每个子知识点的例题数据
const SAMPLE_QUESTIONS: Record<string, {
  stem: string;
  type: "choice" | "fill_blank" | "solution";
  options?: string[];
  answer: string;
  explanation?: string;
  difficulty: number;
}> = {
  // ===== 第1讲：小数乘、除法的速算与巧算 =====
  "拆分与凑整": {
    stem: "计算：2.5 × 48 × 1.25 = ?",
    type: "fill_blank",
    answer: "150",
    explanation: "2.5 × 4 = 10，1.25 × 8 = 10，将48拆分为4×12或6×8。2.5 × 1.25 × 48 = 2.5 × 1.25 × 8 × 6 = 10 × 15 = 150",
    difficulty: 2,
  },
  "积不变的规律": {
    stem: "已知 3.6 × 2.5 = 9，那么 36 × 0.25 = ?",
    type: "fill_blank",
    answer: "9",
    explanation: "3.6扩大10倍变36，2.5缩小10倍变0.25，一个因数扩大10倍，另一个缩小10倍，积不变，所以结果还是9。",
    difficulty: 1,
  },
  "除法的性质的应用": {
    stem: "计算：6.3 ÷ 0.7 ÷ 0.9 = ?",
    type: "fill_blank",
    answer: "10",
    explanation: "利用除法性质：a ÷ b ÷ c = a ÷ (b × c)。6.3 ÷ (0.7 × 0.9) = 6.3 ÷ 0.63 = 10",
    difficulty: 2,
  },
  "多位小数的乘、除法": {
    stem: "计算：0.125 × 0.25 × 32 = ?",
    type: "fill_blank",
    answer: "1",
    explanation: "0.125 × 8 = 1，0.25 × 4 = 1。将32拆为8×4，则0.125 × 8 × 0.25 × 4 = 1 × 1 = 1",
    difficulty: 2,
  },

  // ===== 第2讲：最大公因数和最小公倍数 =====
  "最大公因数": {
    stem: "36和48的最大公因数是多少？",
    type: "fill_blank",
    answer: "12",
    explanation: "36 = 2² × 3²，48 = 2⁴ × 3，最大公因数 = 2² × 3 = 12",
    difficulty: 2,
  },
  "最小公倍数": {
    stem: "12和18的最小公倍数是多少？",
    type: "fill_blank",
    answer: "36",
    explanation: "12 = 2² × 3，18 = 2 × 3²，最小公倍数 = 2² × 3² = 36",
    difficulty: 2,
  },
  "两者之间的关系": {
    stem: "两个数的最大公因数是6，最小公倍数是60，其中一个数是12，另一个数是多少？",
    type: "fill_blank",
    answer: "30",
    explanation: "两个数的乘积 = 最大公因数 × 最小公倍数。12 × x = 6 × 60 = 360，x = 360 ÷ 12 = 30",
    difficulty: 3,
  },
  "分解质因数的应用": {
    stem: "把90分解质因数：90 = ?",
    type: "fill_blank",
    answer: "2 × 3² × 5",
    explanation: "90 = 2 × 45 = 2 × 9 × 5 = 2 × 3² × 5",
    difficulty: 2,
  },
  "分数的拆分": {
    stem: "把 7/12 拆分成两个不同的单位分数之和：7/12 = 1/? + 1/?",
    type: "fill_blank",
    answer: "1/3 + 1/4",
    explanation: "7/12 = (4+3)/12 = 4/12 + 3/12 = 1/3 + 1/4",
    difficulty: 3,
  },

  // ===== 第3讲：火车行程问题 =====
  "火车过桥问题": {
    stem: "一列火车长200米，以每秒20米的速度通过一座长800米的大桥，需要多少秒？",
    type: "fill_blank",
    answer: "50",
    explanation: "火车过桥需要走的路程 = 车长 + 桥长 = 200 + 800 = 1000米。时间 = 1000 ÷ 20 = 50秒",
    difficulty: 2,
  },
  "火车相遇问题": {
    stem: "两列火车相向而行，甲车长150米，速度每秒15米；乙车长100米，速度每秒10米。从车头相遇到车尾分离需要多少秒？",
    type: "fill_blank",
    answer: "10",
    explanation: "两车需要走的总路程 = 甲车长 + 乙车长 = 150 + 100 = 250米。速度和 = 15 + 10 = 25米/秒。时间 = 250 ÷ 25 = 10秒",
    difficulty: 3,
  },
  "火车追及问题": {
    stem: "快车长160米，慢车长140米。快车速度每秒22米，慢车速度每秒18米。快车从追上慢车到完全超过慢车需要多少秒？",
    type: "fill_blank",
    answer: "75",
    explanation: "追及距离 = 快车长 + 慢车长 = 160 + 140 = 300米。速度差 = 22 - 18 = 4米/秒。时间 = 300 ÷ 4 = 75秒",
    difficulty: 3,
  },

  // ===== 第4讲：解复杂方程 / 错中求解 =====
  "解方程的各种题型": {
    stem: "解方程：3(2x - 1) + 4 = 19",
    type: "solution",
    answer: "x = 3",
    explanation: "3(2x - 1) + 4 = 19\n6x - 3 + 4 = 19\n6x + 1 = 19\n6x = 18\nx = 3",
    difficulty: 2,
  },
  "小数乘除中的错中求解": {
    stem: "小明计算一道除法题时，把除数6.5错看成5.6，结果得到了25。正确的结果应该是多少？",
    type: "solution",
    answer: "21.538...(约21.5)",
    explanation: "被除数 = 25 × 5.6 = 140。正确结果 = 140 ÷ 6.5 ≈ 21.5",
    difficulty: 3,
  },
  "方程中的错中求解问题": {
    stem: "小红解方程时，把某数×5错看成某数÷5，得到结果是3。正确的结果应该是多少？",
    type: "solution",
    answer: "75",
    explanation: "错误：某数 ÷ 5 = 3，某数 = 15。正确：15 × 5 = 75",
    difficulty: 3,
  },

  // ===== 第5讲：列方程解应用题 =====
  "解决鸡兔同笼问题": {
    stem: "笼中有鸡和兔共35只，共有94只脚。鸡和兔各有多少只？",
    type: "solution",
    answer: "鸡23只，兔12只",
    explanation: "设兔x只，则鸡(35-x)只。4x + 2(35-x) = 94，4x + 70 - 2x = 94，2x = 24，x = 12。兔12只，鸡23只。",
    difficulty: 2,
  },
  "解决盈亏问题": {
    stem: "一些糖分给小朋友，每人分3颗多7颗，每人分5颗少3颗。有几个小朋友？有多少颗糖？",
    type: "solution",
    answer: "5个小朋友，22颗糖",
    explanation: "设有x个小朋友。3x + 7 = 5x - 3，10 = 2x，x = 5。糖果数 = 3×5+7 = 22颗。",
    difficulty: 3,
  },
  "解决年龄问题": {
    stem: "爸爸今年42岁，儿子今年12岁。几年前爸爸的年龄是儿子的5倍？",
    type: "fill_blank",
    answer: "4.5",
    explanation: "设x年前。42 - x = 5(12 - x)，42 - x = 60 - 5x，4x = 18，x = 4.5年前",
    difficulty: 3,
  },
  "解决相遇、追及问题": {
    stem: "甲乙两地相距360千米，客车和货车同时从两地相向而行。客车每小时60千米，货车每小时40千米。几小时后相遇？",
    type: "fill_blank",
    answer: "3.6",
    explanation: "速度和 = 60 + 40 = 100千米/小时。时间 = 360 ÷ 100 = 3.6小时",
    difficulty: 2,
  },
  "解决流水行船问题": {
    stem: "一艘船在静水中的速度是每小时20千米，水流速度每小时4千米。这艘船从A到B顺水需要3小时，从B回A逆水需要几小时？",
    type: "fill_blank",
    answer: "4.5",
    explanation: "顺水速度 = 20+4 = 24千米/小时。AB距离 = 24×3 = 72千米。逆水速度 = 20-4 = 16千米/小时。时间 = 72÷16 = 4.5小时",
    difficulty: 3,
  },

  // ===== 第6讲：长方体和正方体 =====
  "三视图求表面积": {
    stem: "一个长方体的正面看是长5厘米、宽3厘米的长方形，侧面看是长4厘米、宽3厘米的长方形。这个长方体的表面积是多少平方厘米？",
    type: "fill_blank",
    answer: "94",
    explanation: "长=5，宽=4，高=3。表面积 = 2(5×4 + 5×3 + 4×3) = 2(20+15+12) = 94平方厘米",
    difficulty: 2,
  },
  "长方体和正方体的展开图": {
    stem: "一个正方体的展开图中，共有几个面？如果棱长为3厘米，展开图的总面积是多少平方厘米？",
    type: "fill_blank",
    answer: "6个面，54平方厘米",
    explanation: "正方体有6个面。每个面面积 = 3×3 = 9平方厘米。总面积 = 6×9 = 54平方厘米",
    difficulty: 1,
  },
  "水中浸没": {
    stem: "一个长方体水槽，底面长20厘米，宽15厘米，水深10厘米。放入一个棱长5厘米的正方体铁块（完全浸没），水面上升了多少厘米？",
    type: "fill_blank",
    answer: "0.417(约0.42)",
    explanation: "铁块体积 = 5³ = 125立方厘米。水面上升高度 = 125 ÷ (20×15) = 125 ÷ 300 ≈ 0.417厘米",
    difficulty: 3,
  },
  "立体图形染色": {
    stem: "一个3×3×3的正方体由27个小正方体组成。把大正方体的表面涂红色后拆开，恰好三面被涂色的小正方体有几个？",
    type: "fill_blank",
    answer: "8",
    explanation: "三面涂色的一定在顶点处。3×3×3的正方体有8个顶点，所以三面涂色的有8个。",
    difficulty: 2,
  },
  "切片法求体积": {
    stem: "一个长方体被沿对角线切成两个完全相同的三棱柱。原长方体长6厘米，宽4厘米，高3厘米。每个三棱柱的体积是多少立方厘米？",
    type: "fill_blank",
    answer: "36",
    explanation: "长方体体积 = 6×4×3 = 72立方厘米。每个三棱柱 = 72÷2 = 36立方厘米",
    difficulty: 2,
  },

  // ===== 第7讲：巧求面积 =====
  "等积变形": {
    stem: "三角形ABC中，底BC=10厘米，高为6厘米。D是BC上的中点，三角形ABD的面积是多少平方厘米？",
    type: "fill_blank",
    answer: "15",
    explanation: "三角形ABC面积 = 10×6÷2 = 30平方厘米。D是中点，ABD面积 = ABC面积÷2 = 15平方厘米",
    difficulty: 2,
  },
  "一半模型": {
    stem: "正方形ABCD边长为8厘米，E是BC的中点。三角形AED的面积是多少平方厘米？",
    type: "fill_blank",
    answer: "32",
    explanation: "正方形面积=64。三角形AED = 正方形面积 - 三角形ABE - 三角形ECD = 64 - 16 - 16 = 32平方厘米",
    difficulty: 3,
  },
  "根据差不变的性质求面积": {
    stem: "平行四边形ABCD中，E是对角线AC上一点。三角形ABE和三角形CDE的面积之差为0。已知三角形ABE面积为12平方厘米，三角形BCE面积是多少？",
    type: "fill_blank",
    answer: "12",
    explanation: "对角线将平行四边形分成两个等面积的三角形。ABE=CDE=12，所以BCE=ADE。",
    difficulty: 3,
  },
  "分割法求面积": {
    stem: "一个梯形上底4厘米，下底8厘米，高5厘米。从上底的一个端点向下底引一条线段，把梯形分成两个三角形。较大三角形的面积是多少平方厘米？",
    type: "fill_blank",
    answer: "20",
    explanation: "两个三角形共享同一个高5厘米。较大三角形底=8，面积=8×5÷2=20平方厘米",
    difficulty: 2,
  },

  // ===== 第8讲：面积模型 =====
  "风筝模型": {
    stem: "在三角形ABC中，D是AB上一点，E是AC上一点，BD:DA=1:2，CE:EA=1:3。已知三角形ABC面积为24，三角形ADE面积是多少？",
    type: "fill_blank",
    answer: "12",
    explanation: "DA/AB = 2/3，EA/AC = 3/4。三角形ADE面积 = (2/3)×(3/4)×24 = 12",
    difficulty: 4,
  },
  "蝴蝶模型": {
    stem: "梯形ABCD中，对角线AC和BD交于点O。已知三角形AOB面积为8，三角形COD面积为2。梯形ABCD的面积是多少？",
    type: "fill_blank",
    answer: "18",
    explanation: "蝴蝶模型：三角形AOD面积 = 三角形BOC面积 = √(8×2) = 4。梯形面积 = 8+2+4+4 = 18",
    difficulty: 4,
  },
  "燕尾模型": {
    stem: "三角形ABC中，D是BC上一点，BD:DC=2:3。已知三角形ABC面积为25，三角形ABD面积是多少？",
    type: "fill_blank",
    answer: "10",
    explanation: "燕尾模型：BD:DC=2:3，所以ABD:ADC=2:3。三角形ABD面积 = 25×(2/5) = 10",
    difficulty: 3,
  },

  // ===== 第9讲：数与形 / 植树问题 =====
  "数形结合求和（或差）的平方": {
    stem: "不用计算器，求 101² = ?",
    type: "fill_blank",
    answer: "10201",
    explanation: "101² = (100+1)² = 100² + 2×100×1 + 1² = 10000 + 200 + 1 = 10201",
    difficulty: 2,
  },
  "数形结合求和（或差）的积": {
    stem: "计算：99 × 101 = ?",
    type: "fill_blank",
    answer: "9999",
    explanation: "(100-1)(100+1) = 100² - 1² = 10000 - 1 = 9999",
    difficulty: 2,
  },
  "在直线、不封闭、封闭线上植树": {
    stem: "在一条长100米的路的一侧植树，每隔5米种一棵（两端都种），共需要多少棵树？",
    type: "fill_blank",
    answer: "21",
    explanation: "直线植树两端都种：棵数 = 间隔数 + 1 = 100÷5 + 1 = 20 + 1 = 21棵",
    difficulty: 1,
  },
  "方阵问题": {
    stem: "学生排成一个方阵，最外层一圈有60人。方阵最外层每边有多少人？",
    type: "fill_blank",
    answer: "16",
    explanation: "最外层人数 = 4×(每边人数-1)。60 = 4×(n-1)，n-1 = 15，n = 16",
    difficulty: 3,
  },

  // ===== 第10讲：分数裂项 =====
  "裂差型列项": {
    stem: "计算：1/(1×2) + 1/(2×3) + 1/(3×4) + ... + 1/(9×10) = ?",
    type: "fill_blank",
    answer: "9/10",
    explanation: "裂项：1/(n(n+1)) = 1/n - 1/(n+1)。原式 = (1-1/2)+(1/2-1/3)+...+(1/9-1/10) = 1 - 1/10 = 9/10",
    difficulty: 3,
  },
  "裂和型列项": {
    stem: "计算：1/(1×3) + 1/(3×5) + 1/(5×7) + 1/(7×9) = ?",
    type: "fill_blank",
    answer: "4/9",
    explanation: "1/(n(n+2)) = (1/2)(1/n - 1/(n+2))。原式 = (1/2)(1-1/3+1/3-1/5+1/5-1/7+1/7-1/9) = (1/2)(1-1/9) = 4/9",
    difficulty: 4,
  },
  "分组凑整、运算定理简算": {
    stem: "计算：5/6 + 7/12 + 11/20 + 13/30 = ?（提示：每个分数都接近1/2）",
    type: "fill_blank",
    answer: "2 + 1/3 + 1/12 + 1/20 + ...(约2.37)",
    explanation: "每个分数 = 1/2 + 剩余部分。5/6=1/2+1/3, 7/12=1/2+1/12, 11/20=1/2+1/20, 13/30=1/2-1/15。合计=2+(1/3+1/12+1/20-1/15)",
    difficulty: 4,
  },

  // ===== 第11讲：比较与估算 =====
  "小数和分数大小比较": {
    stem: "比较大小：3/7 ○ 0.43（填>、<或=）",
    type: "choice",
    options: ["A. >", "B. <", "C. ="],
    answer: "B",
    explanation: "3/7 ≈ 0.4286，0.43 > 0.4286，所以 3/7 < 0.43",
    difficulty: 2,
  },
  "数的估算": {
    stem: "不计算，估算 498 × 21 最接近哪个数？",
    type: "choice",
    options: ["A. 8000", "B. 10000", "C. 10500", "D. 12000"],
    answer: "B",
    explanation: "498 ≈ 500，21 ≈ 20。500 × 20 = 10000。实际值 = 10458，最接近10000。",
    difficulty: 1,
  },
  "分数与循环小数之间转换": {
    stem: "把循环小数 0.333... 化成分数是多少？",
    type: "fill_blank",
    answer: "1/3",
    explanation: "设x = 0.333...，则10x = 3.333...，10x - x = 3，9x = 3，x = 1/3",
    difficulty: 2,
  },

  // ===== 第12讲：幻方与数阵图 =====
  "三阶幻方": {
    stem: "在三阶幻方中，用1-9填入3×3的格子，每行、每列、每条对角线的和都相等。中心格应填哪个数？",
    type: "fill_blank",
    answer: "5",
    explanation: "1+2+...+9=45，每行和=45÷3=15。中心数一定是中位数5。",
    difficulty: 2,
  },
  "数阵图": {
    stem: "将1~6分别填入三角形三条边的圆圈中（每个顶点被两条边共用），使每条边上三个数的和相等。每条边的和是多少？",
    type: "fill_blank",
    answer: "9",
    explanation: "1+2+3+4+5+6=21。三条边的总和=21+顶点数之和（顶点被计算2次）。设每边和为S，3S=21+顶点和。最常见解：每边和=9。",
    difficulty: 3,
  },
  "直接运算型、反解未知数型": {
    stem: "定义新运算 a☆b = 2a + 3b。求 3☆4 = ?",
    type: "fill_blank",
    answer: "18",
    explanation: "3☆4 = 2×3 + 3×4 = 6 + 12 = 18",
    difficulty: 1,
  },
  "高斯取整": {
    stem: "[x]表示不超过x的最大整数。[3.7] + [-2.3] = ?",
    type: "fill_blank",
    answer: "0",
    explanation: "[3.7]=3（不超过3.7的最大整数），[-2.3]=-3（不超过-2.3的最大整数）。3+(-3)=0",
    difficulty: 3,
  },

  // ===== 第13讲：单位1的转化 =====
  "单位1的转化": {
    stem: "一根绳子，第一次剪去全长的1/3，第二次剪去剩余的1/4。两次共剪去全长的几分之几？",
    type: "fill_blank",
    answer: "1/2",
    explanation: "第一次后剩余 = 1 - 1/3 = 2/3。第二次剪去 = 2/3 × 1/4 = 1/6。两次共剪去 = 1/3 + 1/6 = 1/2",
    difficulty: 2,
  },

  // ===== 第14讲：工程问题 =====
  "工程问题": {
    stem: "甲单独做一件工作需要10天，乙单独做需要15天。两人合作需要几天完成？",
    type: "fill_blank",
    answer: "6",
    explanation: "甲效率=1/10，乙效率=1/15。合作效率=1/10+1/15=5/30=1/6。需要6天。",
    difficulty: 2,
  },

  // ===== 第15讲：浓度问题 =====
  "浓度问题": {
    stem: "200克含盐10%的盐水中，需要加入多少克盐才能使浓度变为20%？",
    type: "fill_blank",
    answer: "25",
    explanation: "现有盐 = 200×10% = 20克。设加x克盐：(20+x)/(200+x) = 20%，20+x = 40+0.2x，0.8x = 20，x = 25克",
    difficulty: 3,
  },

  // ===== 第16讲：经济问题 =====
  "经济问题": {
    stem: "一件商品进价200元，标价300元，打八折出售。利润率是多少？",
    type: "fill_blank",
    answer: "20%",
    explanation: "售价 = 300×0.8 = 240元。利润 = 240-200 = 40元。利润率 = 40÷200 = 20%",
    difficulty: 2,
  },

  // ===== 第17讲：平面几何 =====
  "割与补": {
    stem: "一个半圆的直径为10厘米。半圆的面积是多少平方厘米？（π取3.14）",
    type: "fill_blank",
    answer: "39.25",
    explanation: "半径=5，半圆面积 = πr²÷2 = 3.14×25÷2 = 39.25平方厘米",
    difficulty: 1,
  },
  "比例关系": {
    stem: "两个相似三角形的对应边之比为2:3。它们的面积之比是多少？",
    type: "fill_blank",
    answer: "4:9",
    explanation: "相似图形面积比 = 对应边比的平方 = 2²:3² = 4:9",
    difficulty: 2,
  },
  "整体计算和差不变": {
    stem: "正方形边长为10厘米，在四个角各剪去一个边长为2厘米的小正方形。剩余图形的面积是多少平方厘米？",
    type: "fill_blank",
    answer: "84",
    explanation: "正方形面积 = 100。四个角 = 4×4 = 16。剩余 = 100-16 = 84平方厘米",
    difficulty: 1,
  },

  // ===== 第18讲：立体几何 =====
  "基本公式的运用": {
    stem: "一个圆柱体底面半径为3厘米，高为10厘米。它的体积是多少立方厘米？（π取3.14）",
    type: "fill_blank",
    answer: "282.6",
    explanation: "V = πr²h = 3.14×9×10 = 282.6立方厘米",
    difficulty: 1,
  },
  "切割与拼接": {
    stem: "把一个底面半径为6厘米、高为8厘米的圆柱沿直径切成两半，表面积增加了多少平方厘米？",
    type: "fill_blank",
    answer: "192",
    explanation: "切开后增加两个长方形截面。每个截面 = 直径×高 = 12×8 = 96平方厘米。共增加 = 2×96 = 192平方厘米",
    difficulty: 3,
  },
  "空间思维": {
    stem: "一个正方体有几个顶点、几条棱、几个面？",
    type: "fill_blank",
    answer: "8个顶点、12条棱、6个面",
    explanation: "正方体：8个顶点、12条棱（每个面4条，共4×6÷2=12）、6个面",
    difficulty: 1,
  },
  "比列关系与等量关系（六年级：比）": {
    stem: "一个长方体和一个正方体的体积相等。长方体长6厘米，宽4厘米，高3厘米。正方体的棱长大约是多少厘米？（保留一位小数）",
    type: "fill_blank",
    answer: "4.2",
    explanation: "长方体体积 = 6×4×3 = 72。正方体棱长 = ³√72 ≈ 4.16 ≈ 4.2厘米",
    difficulty: 3,
  },

  // ===== 第19讲：数论综合复习 =====
  "整数的整除特征": {
    stem: "下列哪个数能同时被2、3、5整除？",
    type: "choice",
    options: ["A. 145", "B. 210", "C. 315", "D. 402"],
    answer: "B",
    explanation: "能被2整除→末位是偶数；能被3整除→各位数字和是3的倍数；能被5整除→末位是0或5。210：末位0（被2和5整除），2+1+0=3（被3整除）。✓",
    difficulty: 2,
  },
  "质数和合数": {
    stem: "20以内的质数共有几个？",
    type: "fill_blank",
    answer: "8",
    explanation: "20以内的质数：2, 3, 5, 7, 11, 13, 17, 19，共8个。",
    difficulty: 1,
  },
  "因数和倍数": {
    stem: "24的因数有哪些？共有几个？",
    type: "fill_blank",
    answer: "1,2,3,4,6,8,12,24，共8个",
    explanation: "24=1×24=2×12=3×8=4×6，所以因数有：1,2,3,4,6,8,12,24，共8个",
    difficulty: 1,
  },
  "带余数法": {
    stem: "100除以7，商和余数分别是多少？",
    type: "fill_blank",
    answer: "商14余2",
    explanation: "100 ÷ 7 = 14...2。验证：14×7+2 = 98+2 = 100 ✓",
    difficulty: 1,
  },
  "余数的性质": {
    stem: "一个数除以8余5，除以3余2。这个数最小是多少？",
    type: "fill_blank",
    answer: "5",
    explanation: "除以8余5的数：5,13,21,29...。检查除以3的余数：5÷3=1...2 ✓。最小是5。",
    difficulty: 3,
  },
  "位值原理": {
    stem: "一个三位数，百位数字是a，十位数字是b，个位数字是c。这个三位数用a、b、c表示为？",
    type: "fill_blank",
    answer: "100a + 10b + c",
    explanation: "百位贡献 a×100，十位贡献 b×10，个位贡献 c×1。三位数 = 100a+10b+c",
    difficulty: 1,
  },
  "进位制": {
    stem: "把十进制数 25 转换成二进制数是多少？",
    type: "fill_blank",
    answer: "11001",
    explanation: "25÷2=12...1, 12÷2=6...0, 6÷2=3...0, 3÷2=1...1, 1÷2=0...1。从下往上读：11001",
    difficulty: 3,
  },

  // ===== 第20讲：计数综合 =====
  "基础计数": {
    stem: "用1、2、3三个数字，可以组成多少个不同的三位数？（数字可以重复使用）",
    type: "fill_blank",
    answer: "27",
    explanation: "百位3种选择×十位3种×个位3种 = 3×3×3 = 27",
    difficulty: 1,
  },
  "加乘原理": {
    stem: "从A到B有3条路，从B到C有2条路。从A经B到C共有几种走法？",
    type: "fill_blank",
    answer: "6",
    explanation: "乘法原理：A→B有3种，B→C有2种，共 3×2 = 6种",
    difficulty: 1,
  },
  "平面图形计数": {
    stem: "一条直线上有5个点，过其中任意2个点可以画一条线段。共可以画多少条线段？",
    type: "fill_blank",
    answer: "10",
    explanation: "C(5,2) = 5×4÷2 = 10条线段",
    difficulty: 2,
  },
};

export async function POST() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch all knowledge topics (children only - the ones with parent_id)
    const { data: topics, error: topicError } = await supabase
      .from("knowledge_topics")
      .select("id, title, parent_id")
      .not("parent_id", "is", null);

    if (topicError || !topics) {
      return NextResponse.json({ error: "Failed to fetch topics: " + topicError?.message }, { status: 500 });
    }

    // Also get a teacher/admin user to set as created_by
    const { data: admin } = await supabase
      .from("users")
      .select("id")
      .in("role", ["admin", "teacher"])
      .limit(1)
      .single();

    if (!admin) {
      return NextResponse.json({ error: "No admin/teacher user found" }, { status: 500 });
    }

    let inserted = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const topic of topics) {
      const question = SAMPLE_QUESTIONS[topic.title];
      if (!question) {
        skipped++;
        continue;
      }

      // Check if a question already exists for this topic
      const { data: existing } = await supabase
        .from("questions")
        .select("id")
        .eq("topic_id", topic.id)
        .limit(1);

      if (existing && existing.length > 0) {
        skipped++;
        continue;
      }

      const { data: newQ, error: insertError } = await supabase
        .from("questions")
        .insert({
          topic_id: topic.id,
          type: question.type,
          content: {
            stem: question.stem,
            options: question.options,
            answer: question.answer,
            explanation: question.explanation,
          },
          difficulty: question.difficulty,
          source_type: "manual",
          created_by: admin.id,
        })
        .select("id")
        .single();

      if (insertError) {
        errors.push(`${topic.title}: ${insertError.message}`);
      } else if (newQ) {
        inserted++;
        // Also create tag links for the knowledge point
        const { data: kpTag } = await supabase
          .from("question_tags")
          .select("id")
          .eq("metadata->>legacy_topic_id", topic.id)
          .limit(1)
          .single();
        if (kpTag) {
          await supabase.from("question_tag_links").insert({ question_id: newQ.id, tag_id: kpTag.id });
        }
        // Tag for type
        const { data: typeTag } = await supabase
          .from("question_tags")
          .select("id")
          .eq("slug", question.type)
          .limit(1)
          .single();
        if (typeTag) {
          await supabase.from("question_tag_links").insert({ question_id: newQ.id, tag_id: typeTag.id });
        }
        // Tag for difficulty
        const { data: diffTag } = await supabase
          .from("question_tags")
          .select("id")
          .eq("slug", String(question.difficulty))
          .limit(1)
          .single();
        if (diffTag) {
          await supabase.from("question_tag_links").insert({ question_id: newQ.id, tag_id: diffTag.id });
        }
      }
    }

    return NextResponse.json({
      message: `插入 ${inserted} 道例题，跳过 ${skipped} 个知识点`,
      inserted,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Seed questions error:", error);
    return NextResponse.json({ error: "Failed to seed questions" }, { status: 500 });
  }
}
