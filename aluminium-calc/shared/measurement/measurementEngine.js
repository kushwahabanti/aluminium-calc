// ============================================================
// measurementEngine.js
// src/core/measurement/measurementEngine.js
// ============================================================
'use strict';

function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) { let t = b; b = a % b; a = t; }
  return a;
}

function parseToUnits(input) {
  if (input === null || input === undefined) return null;
  if (typeof input === 'number') return Math.round(input * 16);
  if (typeof input !== 'string') return null;
  if (input.trim() === '') return null;

  input = input.trim().toLowerCase();
  let totalUnits = 0;

  // Extract feet
  const feetMatch = input.match(/(\d+)\s*(feet|foot|ft|')/);
  if (feetMatch) {
    totalUnits += parseInt(feetMatch[1]) * 12 * 16;
    input = input.replace(feetMatch[0], '').trim();
  }

  // Extract inch + fraction: "6 3/8 inches" or "5 3/16"
  const inchFracMatch = input.match(/(\d+)\s+(\d+)\/(\d+)\s*(inches|inch|in|")?/);
  if (inchFracMatch) {
    totalUnits += parseInt(inchFracMatch[1]) * 16;
    totalUnits += Math.round((parseInt(inchFracMatch[2]) / parseInt(inchFracMatch[3])) * 16);
    input = input.replace(inchFracMatch[0], '').trim();
  } else {
    // Extract plain inches
    const inchMatch = input.match(/(\d+\.?\d*)\s*(inches|inch|in|")/);
    if (inchMatch) {
      totalUnits += Math.round(parseFloat(inchMatch[1]) * 16);
      input = input.replace(inchMatch[0], '').trim();
    } else {
      // fraction only: "3/4"
      const fractionOnlyMatch = input.match(/^(\d+)\/(\d+)$/);
      if (fractionOnlyMatch) {
        totalUnits += Math.round((parseInt(fractionOnlyMatch[1]) / parseInt(fractionOnlyMatch[2])) * 16);
        input = input.replace(fractionOnlyMatch[0], '').trim();
      }
    }
  }

  // Extract sut
  const sutMatch = input.match(/([\d.]+)\s*sut/);
  if (sutMatch) {
    totalUnits += Math.round(parseFloat(sutMatch[1]) * 2);
    input = input.replace(sutMatch[0], '').trim();
  }

  // Remaining fallback
  if (input.length > 0) {
    const inchFracFallback = input.match(/^(\d+)\s+(\d+)\/(\d+)$/);
    const fractionFallback = input.match(/^(\d+)\/(\d+)$/);
    const plainFallback    = input.match(/^(\d+\.?\d*)$/);

    if (inchFracFallback) {
      totalUnits += parseInt(inchFracFallback[1]) * 16;
      totalUnits += Math.round((parseInt(inchFracFallback[2]) / parseInt(inchFracFallback[3])) * 16);
    } else if (fractionFallback) {
      totalUnits += Math.round((parseInt(fractionFallback[1]) / parseInt(fractionFallback[2])) * 16);
    } else if (plainFallback) {
      totalUnits += Math.round(parseFloat(plainFallback[1]) * 16);
    }
  }

  return totalUnits;
}

function unitsToFraction(units) {
  if (units == null || isNaN(units)) throw new Error('Invalid units');
  if (!Number.isInteger(units)) throw new Error('Units must be an integer');
  const wholeInches = Math.floor(units / 16);
  const remainder = units % 16;
  if (remainder === 0) return `${wholeInches}`;
  const g = gcd(remainder, 16);
  const num = remainder / g;
  const den = 16 / g;
  if (wholeInches === 0) return `${num}/${den}`;
  return `${wholeInches} ${num}/${den}`;
}

function unitsToSut(units) {
  if (units == null || isNaN(units)) throw new Error('Invalid units');
  if (!Number.isInteger(units)) throw new Error('Units must be an integer');
  const wholeInches = Math.floor(units / 16);
  const remainder = units % 16;
  if (remainder === 0) return `${wholeInches} inch`;
  const sut = remainder / 2;
  return `${wholeInches} inch ${sut} sut`;
}

function add(a, b) {
  if (!Number.isInteger(a) || !Number.isInteger(b)) throw new Error('Units must be integers');
  return a + b;
}

function subtract(a, b) {
  if (!Number.isInteger(a) || !Number.isInteger(b)) throw new Error('Units must be integers');
  return a - b;
}

function multiply(a, n) { return Math.round(a * n); }

function divide(a, n) {
  if (n === 0) throw new Error('Division by zero');
  return Math.round(a / n);
}

function formatOutput(units) {
  return {
    units:    units,
    fraction: unitsToFraction(units),
    sut:      unitsToSut(units),
    inches:   units / 16
  };
}

export {
  parseToUnits,
  unitsToFraction,
  unitsToSut,
  formatOutput,
  add,
  subtract,
  multiply,
  divide
};
