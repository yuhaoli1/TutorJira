// Common Core Math — Grades 5 and 6 curriculum topics.
// Each entry is a lesson-sized cluster; subtopics map to Common Core standards.
export interface TopicSeed {
  title: string;
  sortOrder: number;
  subtopics: string[];
}

export const MATH_TOPICS: TopicSeed[] = [
  // ===== Grade 5 =====
  {
    title: "Place Value & Decimal Operations",
    sortOrder: 1,
    subtopics: [
      "Read and write decimals to thousandths",
      "Compare and round decimals",
      "Multiply multi-digit whole numbers",
      "Divide multi-digit whole numbers",
      "Add, subtract, multiply, and divide decimals",
    ],
  },
  {
    title: "Powers of Ten & Exponents",
    sortOrder: 2,
    subtopics: [
      "Patterns in place value when multiplying or dividing by 10",
      "Powers of 10 and exponent notation",
      "Convert among metric units using powers of 10",
    ],
  },
  {
    title: "Adding & Subtracting Fractions",
    sortOrder: 3,
    subtopics: [
      "Equivalent fractions and common denominators",
      "Add and subtract fractions with unlike denominators",
      "Add and subtract mixed numbers",
      "Word problems involving fraction sums and differences",
    ],
  },
  {
    title: "Multiplying & Dividing Fractions",
    sortOrder: 4,
    subtopics: [
      "Multiply a fraction by a whole number",
      "Multiply a fraction by a fraction",
      "Area models for fraction multiplication",
      "Divide unit fractions by whole numbers",
      "Divide whole numbers by unit fractions",
    ],
  },
  {
    title: "Numerical Expressions",
    sortOrder: 5,
    subtopics: [
      "Order of operations with grouping symbols",
      "Write simple numerical expressions",
      "Interpret expressions without evaluating",
    ],
  },
  {
    title: "Volume of Rectangular Prisms",
    sortOrder: 6,
    subtopics: [
      "Understand volume as unit cubes",
      "Find volume with V = l x w x h",
      "Volume of composite solid figures",
      "Real-world volume problems",
    ],
  },
  {
    title: "Coordinate Plane (Grade 5)",
    sortOrder: 7,
    subtopics: [
      "Plot points in the first quadrant",
      "Graph real-world relationships",
      "Interpret coordinate values in context",
    ],
  },
  {
    title: "Classifying 2D Figures",
    sortOrder: 8,
    subtopics: [
      "Hierarchy of quadrilaterals",
      "Classify triangles by sides and angles",
      "Attributes of polygons",
    ],
  },
  {
    title: "Converting Measurement Units",
    sortOrder: 9,
    subtopics: [
      "Customary units of length, weight, and capacity",
      "Metric units of length, mass, and volume",
      "Multi-step conversion problems",
    ],
  },
  {
    title: "Line Plots & Data (Grade 5)",
    sortOrder: 10,
    subtopics: [
      "Create line plots with fractional units",
      "Interpret data displayed on a line plot",
      "Solve problems using measurement data",
    ],
  },

  // ===== Grade 6 =====
  {
    title: "Ratios & Rates",
    sortOrder: 11,
    subtopics: [
      "Ratio language and notation",
      "Equivalent ratios and ratio tables",
      "Unit rates",
      "Rate and ratio word problems",
    ],
  },
  {
    title: "Percent",
    sortOrder: 12,
    subtopics: [
      "Understand percent as a rate per 100",
      "Find the percent of a quantity",
      "Find the whole given a part and the percent",
    ],
  },
  {
    title: "Dividing Fractions by Fractions",
    sortOrder: 13,
    subtopics: [
      "Interpret quotients of fractions",
      "Divide fractions by fractions using visual models",
      "Word problems involving division of fractions",
    ],
  },
  {
    title: "Multi-Digit & Decimal Computation",
    sortOrder: 14,
    subtopics: [
      "Multi-digit division using the standard algorithm",
      "Add, subtract, multiply, and divide multi-digit decimals",
      "Greatest common factor and least common multiple",
      "Distributive property with whole numbers",
    ],
  },
  {
    title: "Rational Numbers",
    sortOrder: 15,
    subtopics: [
      "Positive and negative numbers in real-world contexts",
      "Opposites and absolute value",
      "Compare and order rational numbers",
    ],
  },
  {
    title: "Coordinate Plane: Four Quadrants",
    sortOrder: 16,
    subtopics: [
      "Plot points in all four quadrants",
      "Reflect points across the axes",
      "Distance between points with the same x- or y-coordinate",
    ],
  },
  {
    title: "Expressions",
    sortOrder: 17,
    subtopics: [
      "Write and evaluate numerical expressions with exponents",
      "Write and evaluate algebraic expressions",
      "Identify equivalent expressions",
      "Apply the distributive, associative, and commutative properties",
    ],
  },
  {
    title: "Equations & Inequalities",
    sortOrder: 18,
    subtopics: [
      "Solve one-variable equations",
      "Write and graph one-variable inequalities",
      "Dependent and independent variables",
    ],
  },
  {
    title: "Geometry: Area, Surface Area & Volume",
    sortOrder: 19,
    subtopics: [
      "Area of triangles, special quadrilaterals, and polygons",
      "Volume of right rectangular prisms with fractional edges",
      "Surface area using nets",
      "Polygons on the coordinate plane",
    ],
  },
  {
    title: "Statistics",
    sortOrder: 20,
    subtopics: [
      "Statistical questions and variability",
      "Measures of center: mean, median, mode",
      "Measures of variability: range, IQR, mean absolute deviation",
      "Display data with dot plots, histograms, and box plots",
    ],
  },
];
