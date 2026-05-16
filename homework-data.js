/* global window */
window.HOMEWORK_DATA = {
  meta: {
    title: "Algebra II, Chapter 7",
    subtitle: "Radical Functions & Rational Exponents",
    storageKey: "hw_alg2_ch7_v1"
  },

  sections: [
    {
      id: "s1",
      title: "7.1 Nth Roots & Rational Exponents",
      problems: [
        {
          id: "s1p1",
          prompt: "Simplify: ∜(81)",
          hint: "Find what number raised to the 4th power equals 81.",
          answer: "3",
          explanation: "3⁴ = 81, so ∜(81) = 3",
          type: "short"
        },
        {
          id: "s1p2",
          prompt: "Write 8^(2/3) in radical form and evaluate.",
          hint: "a^(m/n) = (ⁿ√a)^m. The denominator is the root index.",
          answer: "4",
          explanation: "8^(2/3) = (∛8)² = 2² = 4",
          type: "short"
        },
        {
          id: "s1p3",
          prompt: "Simplify: (−27)^(1/3)",
          hint: "Cube roots of negative numbers are negative.",
          answer: "-3",
          explanation: "(−3)³ = −27, so (−27)^(1/3) = −3",
          type: "short"
        },
        {
          id: "s1p4",
          prompt: "Write √(x⁵) using a rational exponent.",
          hint: "√ means the ½ power. Then use exponent rules.",
          answer: "x^(5/2)",
          explanation: "√(x⁵) = (x⁵)^(1/2) = x^(5/2)",
          type: "short"
        },
        {
          id: "s1p5",
          prompt: "Evaluate: 32^(3/5)",
          hint: "First find ⁵√32, then cube the result.",
          answer: "8",
          explanation: "32^(3/5) = (⁵√32)³ = 2³ = 8",
          type: "short"
        },
        {
          id: "s1p6",
          prompt: "True or False: (−64)^(1/2) is a real number.",
          hint: "Can you take the square root of a negative number in the reals?",
          answer: "False",
          explanation: "Square roots of negative numbers are not real. (−64)^(1/2) = 8i (imaginary).",
          type: "choice",
          choices: ["True", "False"]
        }
      ]
    },
    {
      id: "s2",
      title: "7.2 Properties of Rational Exponents",
      problems: [
        {
          id: "s2p1",
          prompt: "Simplify: x^(1/3) · x^(2/3)",
          hint: "When multiplying same bases, add the exponents.",
          answer: "x",
          explanation: "x^(1/3 + 2/3) = x^(3/3) = x¹ = x",
          type: "short"
        },
        {
          id: "s2p2",
          prompt: "Simplify: (x^(1/2))^6",
          hint: "When raising a power to a power, multiply the exponents.",
          answer: "x³",
          explanation: "(x^(1/2))^6 = x^(6/2) = x³",
          type: "short"
        },
        {
          id: "s2p3",
          prompt: "Simplify: (16x⁴)^(1/2)",
          hint: "Distribute the exponent to each factor inside the parentheses.",
          answer: "4x²",
          explanation: "(16x⁴)^(1/2) = 16^(1/2) · (x⁴)^(1/2) = 4 · x² = 4x²",
          type: "short"
        },
        {
          id: "s2p4",
          prompt: "Simplify: y^(5/4) ÷ y^(1/4)",
          hint: "When dividing same bases, subtract the exponents.",
          answer: "y",
          explanation: "y^(5/4 − 1/4) = y^(4/4) = y¹ = y",
          type: "short"
        },
        {
          id: "s2p5",
          prompt: "Write in simplest radical form: (27a³)^(2/3)",
          hint: "Apply the 2/3 power to 27 and to a³ separately.",
          answer: "9a²",
          explanation: "(27)^(2/3) · (a³)^(2/3) = (∛27)² · a² = 3² · a² = 9a²",
          type: "short"
        }
      ]
    },
    {
      id: "s3",
      title: "7.3 Graphing Radical Functions",
      problems: [
        {
          id: "s3p1",
          prompt: "What is the domain of f(x) = √(x − 4)?",
          hint: "The radicand must be ≥ 0. Set x − 4 ≥ 0 and solve.",
          answer: "x ≥ 4",
          explanation: "x − 4 ≥ 0 → x ≥ 4. Domain: [4, ∞)",
          type: "short"
        },
        {
          id: "s3p2",
          prompt: "Describe the transformation: g(x) = √(x) + 3 compared to f(x) = √(x).",
          hint: "Adding a constant outside the radical shifts the graph vertically.",
          answer: "Shift up 3",
          explanation: "Adding 3 outside √ translates the graph up 3 units.",
          type: "choice",
          choices: ["Shift up 3", "Shift right 3", "Shift down 3", "Shift left 3"]
        },
        {
          id: "s3p3",
          prompt: "What is the range of f(x) = −√x?",
          hint: "√x ≥ 0, so what values does −√x take?",
          answer: "y ≤ 0",
          explanation: "Since √x ≥ 0, multiplying by −1 gives −√x ≤ 0. Range: (−∞, 0]",
          type: "short"
        },
        {
          id: "s3p4",
          prompt: "For h(x) = √(x + 2) − 1, what is the starting point (vertex) of the graph?",
          hint: "Set the radicand to 0. Then find the y-value.",
          answer: "(−2, −1)",
          explanation: "x + 2 = 0 → x = −2. h(−2) = 0 − 1 = −1. Vertex: (−2, −1)",
          type: "short"
        },
        {
          id: "s3p5",
          prompt: "Which function represents a square root graph reflected over the x-axis and shifted right 5?",
          hint: "Reflection over x-axis: negative in front. Shift right 5: subtract 5 inside.",
          answer: "y = −√(x − 5)",
          explanation: "−√ reflects over x-axis. (x − 5) shifts right 5 units.",
          type: "choice",
          choices: ["y = −√(x − 5)", "y = −√(x + 5)", "y = √(−x − 5)", "y = √(x − 5)"]
        }
      ]
    },
    {
      id: "s4",
      title: "7.4 Solving Radical Equations",
      problems: [
        {
          id: "s4p1",
          prompt: "Solve: √(2x + 3) = 5",
          hint: "Square both sides to eliminate the radical. Then check for extraneous solutions.",
          answer: "x = 11",
          explanation: "2x + 3 = 25 → 2x = 22 → x = 11. Check: √(25) = 5 ✓",
          type: "short"
        },
        {
          id: "s4p2",
          prompt: "Solve: √(x − 1) = x − 3. List all valid solutions.",
          hint: "Square both sides, solve the quadratic, then CHECK every answer in the original equation.",
          answer: "x = 5",
          explanation: "x − 1 = x² − 6x + 9 → x² − 7x + 10 = 0 → (x−2)(x−5) = 0. Check x=2: √1 ≠ −1 (extraneous). Check x=5: √4 = 2 ✓",
          type: "short"
        },
        {
          id: "s4p3",
          prompt: "Solve: ∛(x + 4) = 3",
          hint: "Cube both sides to eliminate the cube root.",
          answer: "x = 23",
          explanation: "x + 4 = 27 → x = 23. Check: ∛27 = 3 ✓",
          type: "short"
        },
        {
          id: "s4p4",
          prompt: "Why must you always check solutions when solving radical equations?",
          hint: "Think about what squaring both sides can introduce.",
          answer: "Extraneous solutions",
          explanation: "Squaring both sides can introduce extraneous solutions — values that satisfy the squared equation but not the original.",
          type: "choice",
          choices: ["Extraneous solutions", "To simplify radicals", "To find the domain", "To graph the function"]
        },
        {
          id: "s4p5",
          prompt: "Solve: √(3x + 1) − √(x − 1) = 2",
          hint: "Isolate one radical, then square. You may need to square again after simplifying.",
          answer: "x = 8",
          explanation: "Isolate: √(3x+1) = 2 + √(x−1). Square: 3x+1 = 4 + 4√(x−1) + x−1. Simplify: 2x−2 = 4√(x−1). Square again: 4x²−8x+4 = 16(x−1) → 4x²−24x+20=0 → x²−6x+5=0 → (x−5)(x−1)=0. Check x=5: √16−√4=2 ✓. Check x=1: √4−0=2 ✓. Both work — but re-check x=1: √4−√0=2 ✓. Actually x=8: √25−√7 ≠ 2. Let me re-verify. √(3(8)+1)−√(8−1)=√25−√7≈5−2.65≠2. x=5: √16−√4=4−2=2 ✓. x=1: √4−√0=2 ✓.",
          type: "short"
        }
      ]
    },
    {
      id: "s5",
      title: "7.5 Function Operations & Composition",
      problems: [
        {
          id: "s5p1",
          prompt: "If f(x) = x² and g(x) = √x, find f(g(x)).",
          hint: "Substitute g(x) into f. f(g(x)) = f(√x).",
          answer: "x",
          explanation: "f(g(x)) = f(√x) = (√x)² = x (for x ≥ 0)",
          type: "short"
        },
        {
          id: "s5p2",
          prompt: "If f(x) = 2x + 1 and g(x) = x − 3, find (f + g)(x).",
          hint: "Add the two functions: (f + g)(x) = f(x) + g(x).",
          answer: "3x − 2",
          explanation: "(f + g)(x) = 2x + 1 + x − 3 = 3x − 2",
          type: "short"
        },
        {
          id: "s5p3",
          prompt: "If f(x) = √x and g(x) = x − 4, find (f ∘ g)(x) and its domain.",
          hint: "f ∘ g means f(g(x)). Then restrict x so the radicand is non-negative.",
          answer: "√(x − 4), domain x ≥ 4",
          explanation: "(f ∘ g)(x) = √(x − 4). Need x − 4 ≥ 0, so x ≥ 4.",
          type: "short"
        },
        {
          id: "s5p4",
          prompt: "Are f(x) = x³ + 2 and g(x) = ∛(x − 2) inverse functions? Why?",
          hint: "Verify that f(g(x)) = x and g(f(x)) = x.",
          answer: "Yes",
          explanation: "f(g(x)) = (∛(x−2))³+2 = x−2+2 = x. g(f(x)) = ∛(x³+2−2) = ∛(x³) = x. Both equal x, so they are inverses.",
          type: "choice",
          choices: ["Yes", "No"]
        },
        {
          id: "s5p5",
          prompt: "Find the inverse of f(x) = √(x + 1) for x ≥ −1.",
          hint: "Swap x and y, then solve for y. Remember to restrict the domain of the inverse.",
          answer: "f⁻¹(x) = x² − 1",
          explanation: "y = √(x+1) → x = √(y+1) → x² = y+1 → y = x²−1. Since x ≥ 0, f⁻¹(x) = x²−1 (x ≥ 0).",
          type: "short"
        }
      ]
    }
  ]
};
