export type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Expert';

export interface Question {
  equation: string;
  answer: number;
  fullEquation: string;
  parts: string[];
  missingIndex: number;
}

const getRandomInt = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const generateQuestion = (difficulty: Difficulty): Question => {
  let parts: string[] = [];
  let answer = 0;
  let missingIndex = 0;

  switch (difficulty) {
    case 'Easy': {
      // Level 1 – Easy: Addition and subtraction. Single missing number. ? + 6 = 26
      const op = Math.random() > 0.5 ? '+' : '-';
      let a, b, c;
      if (op === '+') {
        a = getRandomInt(1, 20);
        b = getRandomInt(1, 20);
        c = a + b;
      } else {
        a = getRandomInt(10, 40);
        b = getRandomInt(1, a - 1);
        c = a - b;
      }
      parts = [a.toString(), op, b.toString(), '=', c.toString()];
      missingIndex = Math.random() > 0.5 ? 0 : 2; // ? + b = c OR a + ? = c
      answer = parseInt(parts[missingIndex]);
      break;
    }

    case 'Medium': {
      // Level 2 – Medium: Multiplication and division. Two-digit numbers. ? × 3 + 5 = 35
      const useMult = Math.random() > 0.5;
      let a, b, c, d;
      const op1 = useMult ? '*' : '/';
      const op2 = Math.random() > 0.5 ? '+' : '-';

      if (useMult) {
        a = getRandomInt(2, 15);
        b = getRandomInt(2, 10);
        c = getRandomInt(1, 30);
        d = op2 === '+' ? a * b + c : a * b - c;
      } else {
        b = getRandomInt(2, 10);
        a = b * getRandomInt(2, 12); // Ensure clean division
        c = getRandomInt(1, 30);
        d = op2 === '+' ? a / b + c : a / b - c;
      }

      parts = [a.toString(), op1, b.toString(), op2, c.toString(), '=', d.toString()];
      const possibleMissing = [0, 2, 4];
      missingIndex = possibleMissing[Math.floor(Math.random() * possibleMissing.length)];
      answer = parseInt(parts[missingIndex]);
      break;
    }

    case 'Hard': {
      // Level 3 – Hard: Mixed operators (+, -, ×, ÷). Follow BODMAS/PEMDAS. ? ÷ 4 + 7 × 2 = 15
      // Format: (a op1 b) op2 (c op3 d) = e OR a op1 b op2 c = d
      // Let's go with 3 operators for hard.
      const ops = ['+', '-', '*', '/'];
      let a, b, c, result;
      
      // Simple strategy: build the equation and evaluate it.
      // To ensure integer results for division: a = b * k
      // We'll generate a sequence and validate the result is an integer.
      
      // Refined approach for Hard/Expert:
      // Generate 3 numbers and 2 operators.
      // Check if result is integer.
      let attempts = 0;
      do {
        a = getRandomInt(2, 20);
        b = getRandomInt(2, 20);
        c = getRandomInt(2, 20);
        const o1 = ops[getRandomInt(0, 3)];
        const o2 = ops[getRandomInt(0, 3)];
        
        // Ensure no division by zero and clean division
        const expr = `${a} ${o1} ${b} ${o2} ${c}`;
        result = eval(expr);
        
        if (Number.isInteger(result) && result > 0 && result < 200) {
          parts = [a.toString(), o1, b.toString(), o2, c.toString(), '=', result.toString()];
          break;
        }
        attempts++;
      } while (attempts < 100);
      
      missingIndex = [0, 2, 4][Math.floor(Math.random() * 3)];
      answer = parseInt(parts[missingIndex]);
      break;
    }

    case 'Expert': {
      // Level 4 – Expert: Longer equations with 3–4 operations. 18 + ? ÷ 3 × 2 - 5 = 15
      const ops = ['+', '-', '*', '/'];
      let a, b, c, d, result;
      let attempts = 0;
      do {
        a = getRandomInt(2, 30);
        b = getRandomInt(2, 20);
        c = getRandomInt(2, 20);
        d = getRandomInt(2, 20);
        const o1 = ops[getRandomInt(0, 3)];
        const o2 = ops[getRandomInt(0, 3)];
        const o3 = ops[getRandomInt(0, 3)];
        
        const expr = `${a} ${o1} ${b} ${o2} ${c} ${o3} ${d}`;
        try {
          result = eval(expr);
          if (Number.isInteger(result) && result > -100 && result < 500) {
             parts = [a.toString(), o1, b.toString(), o2, c.toString(), o3, d.toString(), '=', result.toString()];
             break;
          }
        } catch {
          // Ignore eval errors
        }
        attempts++;
      } while (attempts < 200);

      missingIndex = [0, 2, 4, 6][Math.floor(Math.random() * 4)];
      answer = parseInt(parts[missingIndex]);
      break;
    }
  }

  const fullEquation = parts.join(' ');
  const displayParts = [...parts];
  displayParts[missingIndex] = '?';
  const equation = displayParts.join(' ').replace('*', '×').replace('/', '÷');

  return {
    equation,
    answer,
    fullEquation: fullEquation.replace('*', '×').replace('/', '÷'),
    parts,
    missingIndex
  };
};
