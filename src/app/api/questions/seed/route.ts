import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Sample question data for each subtopic
const SAMPLE_QUESTIONS: Record<string, {
  stem: string;
  type: "choice" | "fill_blank" | "solution";
  options?: string[];
  answer: string;
  explanation?: string;
  difficulty: number;
}> = {
  // ===== Lesson 1: fast and clever computation with decimal multiplication and division =====
  "Splitting and rounding to whole numbers": {
    stem: "Compute: 2.5 x 48 x 1.25 = ?",
    type: "fill_blank",
    answer: "150",
    explanation: "2.5 x 4 = 10, 1.25 x 8 = 10. Split 48 as 4x12 or 6x8. 2.5 x 1.25 x 48 = 2.5 x 1.25 x 8 x 6 = 10 x 15 = 150",
    difficulty: 2,
  },
  "Invariance of products": {
    stem: "Given that 3.6 x 2.5 = 9, what is 36 x 0.25?",
    type: "fill_blank",
    answer: "9",
    explanation: "3.6 grows by 10x to 36, and 2.5 shrinks by 10x to 0.25. When one factor is multiplied by 10 and the other divided by 10, the product stays the same, so the result is still 9.",
    difficulty: 1,
  },
  "Applying division properties": {
    stem: "Compute: 6.3 / 0.7 / 0.9 = ?",
    type: "fill_blank",
    answer: "10",
    explanation: "Use the division property: a / b / c = a / (b x c). 6.3 / (0.7 x 0.9) = 6.3 / 0.63 = 10",
    difficulty: 2,
  },
  "Multi-digit decimal multiplication and division": {
    stem: "Compute: 0.125 x 0.25 x 32 = ?",
    type: "fill_blank",
    answer: "1",
    explanation: "0.125 x 8 = 1, 0.25 x 4 = 1. Split 32 as 8x4, then 0.125 x 8 x 0.25 x 4 = 1 x 1 = 1",
    difficulty: 2,
  },

  // ===== Lesson 2: greatest common divisor and least common multiple =====
  "Greatest common divisor": {
    stem: "What is the greatest common divisor of 36 and 48?",
    type: "fill_blank",
    answer: "12",
    explanation: "36 = 2^2 x 3^2, 48 = 2^4 x 3, so GCD = 2^2 x 3 = 12",
    difficulty: 2,
  },
  "Least common multiple": {
    stem: "What is the least common multiple of 12 and 18?",
    type: "fill_blank",
    answer: "36",
    explanation: "12 = 2^2 x 3, 18 = 2 x 3^2, so LCM = 2^2 x 3^2 = 36",
    difficulty: 2,
  },
  "Relationship between the two": {
    stem: "Two numbers have GCD 6 and LCM 60. One of them is 12. What is the other?",
    type: "fill_blank",
    answer: "30",
    explanation: "Product of two numbers = GCD x LCM. 12 x x = 6 x 60 = 360, x = 360 / 12 = 30",
    difficulty: 3,
  },
  "Applying prime factorization": {
    stem: "Factor 90 into primes: 90 = ?",
    type: "fill_blank",
    answer: "2 x 3^2 x 5",
    explanation: "90 = 2 x 45 = 2 x 9 x 5 = 2 x 3^2 x 5",
    difficulty: 2,
  },
  "Splitting fractions": {
    stem: "Split 7/12 into the sum of two distinct unit fractions: 7/12 = 1/? + 1/?",
    type: "fill_blank",
    answer: "1/3 + 1/4",
    explanation: "7/12 = (4+3)/12 = 4/12 + 3/12 = 1/3 + 1/4",
    difficulty: 3,
  },

  // ===== Lesson 3: train travel problems =====
  "Train crossing a bridge": {
    stem: "A train 200 meters long, traveling at 20 m/s, crosses an 800-meter bridge. How many seconds does it take?",
    type: "fill_blank",
    answer: "50",
    explanation: "Distance to travel = train length + bridge length = 200 + 800 = 1000 m. Time = 1000 / 20 = 50 s",
    difficulty: 2,
  },
  "Two trains meeting": {
    stem: "Two trains travel toward each other. Train A is 150 m long at 15 m/s; train B is 100 m long at 10 m/s. From when their fronts meet to when their tails separate, how many seconds elapse?",
    type: "fill_blank",
    answer: "10",
    explanation: "Total distance = 150 + 100 = 250 m. Combined speed = 15 + 10 = 25 m/s. Time = 250 / 25 = 10 s",
    difficulty: 3,
  },
  "Train overtaking": {
    stem: "The fast train is 160 m long, the slow train 140 m. Their speeds are 22 m/s and 18 m/s. From when the fast train catches the slow one to when it has fully passed, how many seconds does it take?",
    type: "fill_blank",
    answer: "75",
    explanation: "Catch-up distance = 160 + 140 = 300 m. Speed difference = 22 - 18 = 4 m/s. Time = 300 / 4 = 75 s",
    difficulty: 3,
  },

  // ===== Lesson 4: solving complex equations / fixing mistakes =====
  "Various equation problems": {
    stem: "Solve: 3(2x - 1) + 4 = 19",
    type: "solution",
    answer: "x = 3",
    explanation: "3(2x - 1) + 4 = 19\n6x - 3 + 4 = 19\n6x + 1 = 19\n6x = 18\nx = 3",
    difficulty: 2,
  },
  "Fixing mistakes in decimal multiplication and division": {
    stem: "Xiao Ming misread the divisor 6.5 as 5.6 and got 25 as the result. What is the correct result?",
    type: "solution",
    answer: "21.538... (about 21.5)",
    explanation: "Dividend = 25 x 5.6 = 140. Correct result = 140 / 6.5 ~= 21.5",
    difficulty: 3,
  },
  "Fixing mistakes in equations": {
    stem: "Xiao Hong misread 'a number x 5' as 'a number / 5' and got 3. What is the correct result?",
    type: "solution",
    answer: "75",
    explanation: "Wrong: number / 5 = 3, number = 15. Correct: 15 x 5 = 75",
    difficulty: 3,
  },

  // ===== Lesson 5: setting up equations to solve word problems =====
  "Solving the chickens-and-rabbits problem": {
    stem: "There are chickens and rabbits in a cage, 35 heads in total and 94 feet. How many of each are there?",
    type: "solution",
    answer: "23 chickens, 12 rabbits",
    explanation: "Let x be the number of rabbits, then chickens = 35 - x. 4x + 2(35 - x) = 94, 4x + 70 - 2x = 94, 2x = 24, x = 12. So 12 rabbits and 23 chickens.",
    difficulty: 2,
  },
  "Solving surplus-and-shortage problems": {
    stem: "Some candies are distributed to children. Giving each 3 leaves 7 extra; giving each 5 is 3 short. How many children, and how many candies?",
    type: "solution",
    answer: "5 children, 22 candies",
    explanation: "Let x be the number of children. 3x + 7 = 5x - 3, 10 = 2x, x = 5. Candies = 3 x 5 + 7 = 22.",
    difficulty: 3,
  },
  "Solving age problems": {
    stem: "Father is 42 this year, son is 12. How many years ago was father's age 5 times the son's?",
    type: "fill_blank",
    answer: "4.5",
    explanation: "Let x years ago. 42 - x = 5(12 - x), 42 - x = 60 - 5x, 4x = 18, x = 4.5 years ago",
    difficulty: 3,
  },
  "Solving meeting and overtaking problems": {
    stem: "Two places A and B are 360 km apart. A passenger train and a freight train start from the two places toward each other at the same time, at 60 km/h and 40 km/h respectively. After how many hours do they meet?",
    type: "fill_blank",
    answer: "3.6",
    explanation: "Combined speed = 60 + 40 = 100 km/h. Time = 360 / 100 = 3.6 hours",
    difficulty: 2,
  },
  "Solving boat-in-current problems": {
    stem: "A boat's speed in still water is 20 km/h. The current is 4 km/h. The boat goes from A to B downstream in 3 hours. How many hours does it take to return upstream?",
    type: "fill_blank",
    answer: "4.5",
    explanation: "Downstream speed = 20 + 4 = 24 km/h. Distance AB = 24 x 3 = 72 km. Upstream speed = 20 - 4 = 16 km/h. Time = 72 / 16 = 4.5 hours",
    difficulty: 3,
  },

  // ===== Lesson 6: cuboids and cubes =====
  "Surface area from three views": {
    stem: "A cuboid's front view is a rectangle 5 cm long and 3 cm wide; its side view is a rectangle 4 cm long and 3 cm wide. What is the total surface area in square centimeters?",
    type: "fill_blank",
    answer: "94",
    explanation: "Length = 5, width = 4, height = 3. Surface area = 2(5x4 + 5x3 + 4x3) = 2(20 + 15 + 12) = 94 sq cm",
    difficulty: 2,
  },
  "Nets of cuboids and cubes": {
    stem: "How many faces are in the net of a cube? If the edge length is 3 cm, what is the total area of the net in square centimeters?",
    type: "fill_blank",
    answer: "6 faces, 54 sq cm",
    explanation: "A cube has 6 faces. Each face is 3 x 3 = 9 sq cm. Total = 6 x 9 = 54 sq cm",
    difficulty: 1,
  },
  "Submerging in water": {
    stem: "A rectangular tank has a base 20 cm long, 15 cm wide, with water 10 cm deep. A cube of edge 5 cm is fully submerged in it. By how many centimeters does the water level rise?",
    type: "fill_blank",
    answer: "0.417 (about 0.42)",
    explanation: "Cube volume = 5^3 = 125 cubic cm. Water rise = 125 / (20 x 15) = 125 / 300 ~= 0.417 cm",
    difficulty: 3,
  },
  "Coloring 3D figures": {
    stem: "A 3x3x3 cube is made of 27 unit cubes. The outside of the big cube is painted red, then it is taken apart. How many small cubes have exactly three painted faces?",
    type: "fill_blank",
    answer: "8",
    explanation: "Three painted faces only occur at the vertices. A 3x3x3 cube has 8 vertices, so 8 such cubes.",
    difficulty: 2,
  },
  "Slicing to find volume": {
    stem: "A cuboid is cut along a diagonal into two identical triangular prisms. The original cuboid is 6 cm long, 4 cm wide, 3 cm high. What is the volume of each triangular prism in cubic centimeters?",
    type: "fill_blank",
    answer: "36",
    explanation: "Cuboid volume = 6 x 4 x 3 = 72 cubic cm. Each triangular prism = 72 / 2 = 36 cubic cm",
    difficulty: 2,
  },

  // ===== Lesson 7: clever ways to find areas =====
  "Equal-area transformations": {
    stem: "In triangle ABC, base BC = 10 cm and height = 6 cm. D is the midpoint of BC. What is the area of triangle ABD in square centimeters?",
    type: "fill_blank",
    answer: "15",
    explanation: "Area of triangle ABC = 10 x 6 / 2 = 30 sq cm. D is the midpoint, so area of ABD = area of ABC / 2 = 15 sq cm",
    difficulty: 2,
  },
  "Half model": {
    stem: "Square ABCD has side 8 cm. E is the midpoint of BC. What is the area of triangle AED in square centimeters?",
    type: "fill_blank",
    answer: "32",
    explanation: "Square area = 64. Triangle AED = square area - triangle ABE - triangle ECD = 64 - 16 - 16 = 32 sq cm",
    difficulty: 3,
  },
  "Finding areas using invariance of differences": {
    stem: "In parallelogram ABCD, E is a point on diagonal AC. The difference between the areas of triangles ABE and CDE is 0. Given that the area of triangle ABE is 12 sq cm, what is the area of triangle BCE?",
    type: "fill_blank",
    answer: "12",
    explanation: "The diagonal divides the parallelogram into two triangles of equal area. ABE = CDE = 12, so BCE = ADE.",
    difficulty: 3,
  },
  "Finding area by partitioning": {
    stem: "A trapezoid has top base 4 cm, bottom base 8 cm, and height 5 cm. From one endpoint of the top base, draw a segment to the bottom base, dividing the trapezoid into two triangles. What is the area of the larger triangle in square centimeters?",
    type: "fill_blank",
    answer: "20",
    explanation: "Both triangles share the same height 5 cm. The larger triangle has base 8, area = 8 x 5 / 2 = 20 sq cm",
    difficulty: 2,
  },

  // ===== Lesson 8: area models =====
  "Kite model": {
    stem: "In triangle ABC, D is on AB and E is on AC, with BD:DA = 1:2 and CE:EA = 1:3. Given that triangle ABC has area 24, what is the area of triangle ADE?",
    type: "fill_blank",
    answer: "12",
    explanation: "DA/AB = 2/3, EA/AC = 3/4. Area of ADE = (2/3) x (3/4) x 24 = 12",
    difficulty: 4,
  },
  "Butterfly model": {
    stem: "In trapezoid ABCD, diagonals AC and BD meet at O. Given that the area of triangle AOB is 8 and triangle COD is 2, what is the area of trapezoid ABCD?",
    type: "fill_blank",
    answer: "18",
    explanation: "Butterfly model: area of triangle AOD = area of triangle BOC = sqrt(8 x 2) = 4. Trapezoid area = 8 + 2 + 4 + 4 = 18",
    difficulty: 4,
  },
  "Swallowtail model": {
    stem: "In triangle ABC, D is on BC with BD:DC = 2:3. Given that triangle ABC has area 25, what is the area of triangle ABD?",
    type: "fill_blank",
    answer: "10",
    explanation: "Swallowtail model: BD:DC = 2:3, so ABD:ADC = 2:3. Area of ABD = 25 x (2/5) = 10",
    difficulty: 3,
  },

  // ===== Lesson 9: numbers and shapes / planting trees =====
  "Squares of sums (or differences) via shapes": {
    stem: "Without a calculator, find 101^2 = ?",
    type: "fill_blank",
    answer: "10201",
    explanation: "101^2 = (100+1)^2 = 100^2 + 2 x 100 x 1 + 1^2 = 10000 + 200 + 1 = 10201",
    difficulty: 2,
  },
  "Products of sums (or differences) via shapes": {
    stem: "Compute: 99 x 101 = ?",
    type: "fill_blank",
    answer: "9999",
    explanation: "(100-1)(100+1) = 100^2 - 1^2 = 10000 - 1 = 9999",
    difficulty: 2,
  },
  "Planting trees on lines, open paths, and closed loops": {
    stem: "Plant trees along one side of a 100-meter road, every 5 meters (and at both ends). How many trees are needed?",
    type: "fill_blank",
    answer: "21",
    explanation: "Linear planting with both ends: number of trees = number of intervals + 1 = 100/5 + 1 = 20 + 1 = 21",
    difficulty: 1,
  },
  "Square formation problems": {
    stem: "Students stand in a square formation with 60 students on the outermost ring. How many students are on each side of the outer ring?",
    type: "fill_blank",
    answer: "16",
    explanation: "People on the outer ring = 4 x (per side - 1). 60 = 4 x (n - 1), n - 1 = 15, n = 16",
    difficulty: 3,
  },

  // ===== Lesson 10: telescoping fractions =====
  "Telescoping with differences": {
    stem: "Compute: 1/(1x2) + 1/(2x3) + 1/(3x4) + ... + 1/(9x10) = ?",
    type: "fill_blank",
    answer: "9/10",
    explanation: "Telescoping: 1/(n(n+1)) = 1/n - 1/(n+1). Sum = (1 - 1/2) + (1/2 - 1/3) + ... + (1/9 - 1/10) = 1 - 1/10 = 9/10",
    difficulty: 3,
  },
  "Telescoping with sums": {
    stem: "Compute: 1/(1x3) + 1/(3x5) + 1/(5x7) + 1/(7x9) = ?",
    type: "fill_blank",
    answer: "4/9",
    explanation: "1/(n(n+2)) = (1/2)(1/n - 1/(n+2)). Sum = (1/2)(1 - 1/3 + 1/3 - 1/5 + 1/5 - 1/7 + 1/7 - 1/9) = (1/2)(1 - 1/9) = 4/9",
    difficulty: 4,
  },
  "Grouping for round numbers and using arithmetic laws": {
    stem: "Compute: 5/6 + 7/12 + 11/20 + 13/30 = ? (Hint: each fraction is close to 1/2)",
    type: "fill_blank",
    answer: "2 + 1/3 + 1/12 + 1/20 + ... (about 2.37)",
    explanation: "Each fraction = 1/2 + a remainder. 5/6 = 1/2 + 1/3, 7/12 = 1/2 + 1/12, 11/20 = 1/2 + 1/20, 13/30 = 1/2 - 1/15. Total = 2 + (1/3 + 1/12 + 1/20 - 1/15)",
    difficulty: 4,
  },

  // ===== Lesson 11: comparison and estimation =====
  "Comparing decimals and fractions": {
    stem: "Compare: 3/7 ? 0.43 (fill in >, <, or =)",
    type: "choice",
    options: ["A. >", "B. <", "C. ="],
    answer: "B",
    explanation: "3/7 ~= 0.4286, 0.43 > 0.4286, so 3/7 < 0.43",
    difficulty: 2,
  },
  "Estimating numbers": {
    stem: "Without computing, estimate which number 498 x 21 is closest to?",
    type: "choice",
    options: ["A. 8000", "B. 10000", "C. 10500", "D. 12000"],
    answer: "B",
    explanation: "498 ~= 500, 21 ~= 20. 500 x 20 = 10000. The actual value is 10458, closest to 10000.",
    difficulty: 1,
  },
  "Converting between fractions and repeating decimals": {
    stem: "Convert the repeating decimal 0.333... to a fraction.",
    type: "fill_blank",
    answer: "1/3",
    explanation: "Let x = 0.333..., then 10x = 3.333..., 10x - x = 3, 9x = 3, x = 1/3",
    difficulty: 2,
  },

  // ===== Lesson 12: magic squares and number arrays =====
  "3x3 magic square": {
    stem: "In a 3x3 magic square, fill in 1-9 so that each row, column, and diagonal sums to the same value. What number goes in the center?",
    type: "fill_blank",
    answer: "5",
    explanation: "1+2+...+9 = 45, each row sums to 45/3 = 15. The center must be the median, 5.",
    difficulty: 2,
  },
  "Number arrays": {
    stem: "Place 1-6 into the circles on the three sides of a triangle (each vertex is shared by two sides) so that the three numbers on each side sum to the same value. What is the sum on each side?",
    type: "fill_blank",
    answer: "9",
    explanation: "1+2+3+4+5+6 = 21. The total of the three sides equals 21 + (sum of vertices, since vertices are counted twice). Let the sum on each side be S, then 3S = 21 + (sum of vertices). The most common solution: each side sums to 9.",
    difficulty: 3,
  },
  "Direct-evaluation and inverse-unknown problems": {
    stem: "Define the new operation a ☆ b = 2a + 3b. Find 3 ☆ 4 = ?",
    type: "fill_blank",
    answer: "18",
    explanation: "3 ☆ 4 = 2 x 3 + 3 x 4 = 6 + 12 = 18",
    difficulty: 1,
  },
  "Gauss floor function": {
    stem: "[x] denotes the greatest integer not exceeding x. [3.7] + [-2.3] = ?",
    type: "fill_blank",
    answer: "0",
    explanation: "[3.7] = 3 (greatest integer not exceeding 3.7), [-2.3] = -3 (greatest integer not exceeding -2.3). 3 + (-3) = 0",
    difficulty: 3,
  },

  // ===== Lesson 13: changing the unit-1 reference =====
  "Changing the unit-1 reference": {
    stem: "A rope is cut twice. The first cut removes 1/3 of the whole length; the second cut removes 1/4 of what remains. What fraction of the whole rope was cut in total?",
    type: "fill_blank",
    answer: "1/2",
    explanation: "After the first cut, 1 - 1/3 = 2/3 remains. The second cut removes 2/3 x 1/4 = 1/6. Total cut = 1/3 + 1/6 = 1/2",
    difficulty: 2,
  },

  // ===== Lesson 14: work problems =====
  "Work problems": {
    stem: "A alone takes 10 days to finish a job; B alone takes 15 days. How many days do they need working together?",
    type: "fill_blank",
    answer: "6",
    explanation: "A's rate = 1/10, B's rate = 1/15. Combined rate = 1/10 + 1/15 = 5/30 = 1/6. They need 6 days.",
    difficulty: 2,
  },

  // ===== Lesson 15: concentration problems =====
  "Concentration problems": {
    stem: "200 grams of saltwater contains 10% salt. How many grams of salt must be added to make the concentration 20%?",
    type: "fill_blank",
    answer: "25",
    explanation: "Current salt = 200 x 10% = 20 g. Let x grams be added: (20 + x) / (200 + x) = 20%, 20 + x = 40 + 0.2x, 0.8x = 20, x = 25 g",
    difficulty: 3,
  },

  // ===== Lesson 16: economics problems =====
  "Economics problems": {
    stem: "An item has a cost price of 200 yuan and a marked price of 300 yuan, sold at a 20% discount. What is the profit margin?",
    type: "fill_blank",
    answer: "20%",
    explanation: "Selling price = 300 x 0.8 = 240 yuan. Profit = 240 - 200 = 40 yuan. Profit margin = 40 / 200 = 20%",
    difficulty: 2,
  },

  // ===== Lesson 17: plane geometry =====
  "Cutting and supplementing": {
    stem: "A semicircle has diameter 10 cm. What is its area in square centimeters? (Use pi = 3.14)",
    type: "fill_blank",
    answer: "39.25",
    explanation: "Radius = 5, semicircle area = pi r^2 / 2 = 3.14 x 25 / 2 = 39.25 sq cm",
    difficulty: 1,
  },
  "Proportional relationships": {
    stem: "Two similar triangles have corresponding sides in ratio 2:3. What is the ratio of their areas?",
    type: "fill_blank",
    answer: "4:9",
    explanation: "For similar figures, area ratio = square of side ratio = 2^2 : 3^2 = 4:9",
    difficulty: 2,
  },
  "Whole-figure computation and invariant differences": {
    stem: "A square has side 10 cm. A small square of side 2 cm is cut from each of the four corners. What is the area of the remaining figure in square centimeters?",
    type: "fill_blank",
    answer: "84",
    explanation: "Square area = 100. Four corners = 4 x 4 = 16. Remaining = 100 - 16 = 84 sq cm",
    difficulty: 1,
  },

  // ===== Lesson 18: solid geometry =====
  "Applying basic formulas": {
    stem: "A cylinder has a base radius of 3 cm and height 10 cm. What is its volume in cubic centimeters? (Use pi = 3.14)",
    type: "fill_blank",
    answer: "282.6",
    explanation: "V = pi r^2 h = 3.14 x 9 x 10 = 282.6 cubic cm",
    difficulty: 1,
  },
  "Cutting and assembling": {
    stem: "A cylinder with base radius 6 cm and height 8 cm is cut in half along a diameter. By how many square centimeters does the surface area increase?",
    type: "fill_blank",
    answer: "192",
    explanation: "After cutting, two rectangular cross-sections are added. Each cross-section = diameter x height = 12 x 8 = 96 sq cm. Total increase = 2 x 96 = 192 sq cm",
    difficulty: 3,
  },
  "Spatial reasoning": {
    stem: "How many vertices, edges, and faces does a cube have?",
    type: "fill_blank",
    answer: "8 vertices, 12 edges, 6 faces",
    explanation: "Cube: 8 vertices, 12 edges (each face has 4, total 4 x 6 / 2 = 12), 6 faces",
    difficulty: 1,
  },
  "Ratio and equality relationships (grade 6: ratios)": {
    stem: "A cuboid and a cube have equal volumes. The cuboid is 6 cm long, 4 cm wide, 3 cm high. Approximately what is the cube's edge length in centimeters? (One decimal place.)",
    type: "fill_blank",
    answer: "4.2",
    explanation: "Cuboid volume = 6 x 4 x 3 = 72. Cube edge = cube root of 72 ~= 4.16 ~= 4.2 cm",
    difficulty: 3,
  },

  // ===== Lesson 19: number theory comprehensive review =====
  "Divisibility characteristics of integers": {
    stem: "Which of the following numbers is divisible by 2, 3, and 5 simultaneously?",
    type: "choice",
    options: ["A. 145", "B. 210", "C. 315", "D. 402"],
    answer: "B",
    explanation: "Divisible by 2 -> last digit even; divisible by 3 -> sum of digits is a multiple of 3; divisible by 5 -> last digit is 0 or 5. 210: last digit 0 (divisible by 2 and 5), 2+1+0 = 3 (divisible by 3). OK.",
    difficulty: 2,
  },
  "Primes and composites": {
    stem: "How many primes are there below 20?",
    type: "fill_blank",
    answer: "8",
    explanation: "Primes below 20: 2, 3, 5, 7, 11, 13, 17, 19, total 8.",
    difficulty: 1,
  },
  "Factors and multiples": {
    stem: "What are the factors of 24, and how many are there?",
    type: "fill_blank",
    answer: "1, 2, 3, 4, 6, 8, 12, 24, total 8",
    explanation: "24 = 1 x 24 = 2 x 12 = 3 x 8 = 4 x 6, so the factors are 1, 2, 3, 4, 6, 8, 12, 24, total 8",
    difficulty: 1,
  },
  "Division with remainder": {
    stem: "Divide 100 by 7. What are the quotient and remainder?",
    type: "fill_blank",
    answer: "Quotient 14, remainder 2",
    explanation: "100 / 7 = 14 ... 2. Check: 14 x 7 + 2 = 98 + 2 = 100. OK",
    difficulty: 1,
  },
  "Properties of remainders": {
    stem: "A number leaves remainder 5 when divided by 8 and remainder 2 when divided by 3. What is the smallest such number?",
    type: "fill_blank",
    answer: "5",
    explanation: "Numbers leaving remainder 5 when divided by 8: 5, 13, 21, 29, .... Check the remainder when divided by 3: 5/3 = 1 ... 2. OK. Smallest is 5.",
    difficulty: 3,
  },
  "Place-value principle": {
    stem: "A three-digit number has hundreds digit a, tens digit b, ones digit c. Express it using a, b, c.",
    type: "fill_blank",
    answer: "100a + 10b + c",
    explanation: "Hundreds contribute a x 100, tens b x 10, ones c x 1. Three-digit number = 100a + 10b + c",
    difficulty: 1,
  },
  "Number bases": {
    stem: "Convert decimal 25 to binary.",
    type: "fill_blank",
    answer: "11001",
    explanation: "25/2 = 12 r 1, 12/2 = 6 r 0, 6/2 = 3 r 0, 3/2 = 1 r 1, 1/2 = 0 r 1. Read bottom to top: 11001",
    difficulty: 3,
  },

  // ===== Lesson 20: counting comprehensive =====
  "Basic counting": {
    stem: "Using the digits 1, 2, 3, how many distinct three-digit numbers can be formed (digits may repeat)?",
    type: "fill_blank",
    answer: "27",
    explanation: "Hundreds 3 choices x tens 3 x ones 3 = 3 x 3 x 3 = 27",
    difficulty: 1,
  },
  "Addition and multiplication principles": {
    stem: "There are 3 paths from A to B and 2 paths from B to C. How many ways are there to go from A to C via B?",
    type: "fill_blank",
    answer: "6",
    explanation: "Multiplication principle: 3 ways for A->B, 2 ways for B->C, total 3 x 2 = 6",
    difficulty: 1,
  },
  "Plane figure counting": {
    stem: "Five points lie on a single line. A line segment can be drawn through any two of them. How many line segments can be drawn?",
    type: "fill_blank",
    answer: "10",
    explanation: "C(5, 2) = 5 x 4 / 2 = 10 line segments",
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
      message: `Inserted ${inserted} sample questions, skipped ${skipped} knowledge topics`,
      inserted,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Seed questions error:", error);
    return NextResponse.json({ error: "Failed to seed questions" }, { status: 500 });
  }
}
