/**
 * measurementEngine.test.js
 * =====================================================================
 * Aluminium Fabrication Calculator — Measurement Engine Test Suite
 * =====================================================================
 *
 * Run with: node src/core/measurement/measurementEngine.test.js
 * No external test runner required.
 *
 * Test categories:
 *   1. parseToUnits   — all accepted input formats
 *   2. unitsToFraction
 *   3. unitsToSut
 *   4. Arithmetic     — add, subtract, multiply, divide
 *   5. formatOutput
 *   6. Edge cases     — invalid input, zeros, error handling
 * =====================================================================
 */

'use strict';

const {
  parseToUnits,
  unitsToFraction,
  unitsToSut,
  formatOutput,
  add,
  subtract,
  multiply,
  divide,
} = require('./measurementEngine');

// ─── Tiny test runner ─────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

function assertEqual(label, actual, expected) {
  // Deep equality for objects
  const actualStr   = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr === expectedStr) {
    console.log(`  ✅  ${label}`);
    passed++;
  } else {
    console.log(`  ❌  ${label}`);
    console.log(`       Expected : ${expectedStr}`);
    console.log(`       Got      : ${actualStr}`);
    failed++;
    failures.push(label);
  }
}

function assertNull(label, actual) {
  if (actual === null) {
    console.log(`  ✅  ${label}`);
    passed++;
  } else {
    console.log(`  ❌  ${label}`);
    console.log(`       Expected : null`);
    console.log(`       Got      : ${JSON.stringify(actual)}`);
    failed++;
    failures.push(label);
  }
}

function assertThrows(label, fn) {
  try {
    fn();
    console.log(`  ❌  ${label}  (expected Error but no error was thrown)`);
    failed++;
    failures.push(label);
  } catch (e) {
    console.log(`  ✅  ${label}  → threw: ${e.message}`);
    passed++;
  }
}

function section(title) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(60));
}

// ─── 1. parseToUnits ─────────────────────────────────────────────────────────

section('1. parseToUnits — All Input Formats');

// Plain inches
assertEqual('parseToUnits("12")               → 192',   parseToUnits('12'),               192);
assertEqual('parseToUnits("6 inches")         → 96',    parseToUnits('6 inches'),         96);
assertEqual('parseToUnits("6 inch")           → 96',    parseToUnits('6 inch'),           96);

// Decimal inches
assertEqual('parseToUnits("12.5")             → 200',   parseToUnits('12.5'),             200);

// Inch + fraction
assertEqual('parseToUnits("12 1/4")           → 196',   parseToUnits('12 1/4'),           196);
assertEqual('parseToUnits("12 3/8")           → 198',   parseToUnits('12 3/8'),           198);

// Inch + sut
assertEqual('parseToUnits("12 3 sut")         → 198',   parseToUnits('12 3 sut'),         198);
assertEqual('parseToUnits("12 4.5 sut")       → 201',   parseToUnits('12 4.5 sut'),       201);

// Feet shorthand
assertEqual("parseToUnits(\"8' 5 3/16\")      → 1619",  parseToUnits("8' 5 3/16"),        1619);

// Full natural language
assertEqual('parseToUnits("4 feet 6 inches 4 sut") → 872', parseToUnits('4 feet 6 inches 4 sut'), 872);
assertEqual('parseToUnits("4 feet 6 inches")  → 864',   parseToUnits('4 feet 6 inches'),  864);
assertEqual('parseToUnits("4 feet")           → 768',   parseToUnits('4 feet'),           768);
assertEqual('parseToUnits("6 inches 4 sut")   → 104',   parseToUnits('6 inches 4 sut'),   104);
assertEqual('parseToUnits("4 sut")            → 8',     parseToUnits('4 sut'),            8);
assertEqual('parseToUnits("4 feet 4 sut")     → 776',   parseToUnits('4 feet 4 sut'),     776);
assertEqual('parseToUnits("4 foot 6 inch 4.5 sut") → 873', parseToUnits('4 foot 6 inch 4.5 sut'), 873);

// Numeric input (bare number treated as inches)
assertEqual('parseToUnits(12)                 → 192',   parseToUnits(12),                 192);
assertEqual('parseToUnits(12.5)               → 200',   parseToUnits(12.5),               200);

// ─── 2. unitsToFraction ──────────────────────────────────────────────────────

section('2. unitsToFraction — Units → Fraction String');

assertEqual('unitsToFraction(196) → "12 1/4"',  unitsToFraction(196), '12 1/4');
assertEqual('unitsToFraction(198) → "12 3/8"',  unitsToFraction(198), '12 3/8');
assertEqual('unitsToFraction(201) → "12 9/16"', unitsToFraction(201), '12 9/16');
assertEqual('unitsToFraction(192) → "12"',      unitsToFraction(192), '12');
assertEqual('unitsToFraction(12)  → "3/4"',     unitsToFraction(12),  '3/4');
assertEqual('unitsToFraction(0)   → "0"',       unitsToFraction(0),   '0');
assertEqual('unitsToFraction(16)  → "1"',       unitsToFraction(16),  '1');
assertEqual('unitsToFraction(8)   → "1/2"',     unitsToFraction(8),   '1/2');

// ─── 3. unitsToSut ───────────────────────────────────────────────────────────

section('3. unitsToSut — Units → Sut String');

assertEqual('unitsToSut(196) → "12 inch 2 sut"',   unitsToSut(196), '12 inch 2 sut');
assertEqual('unitsToSut(198) → "12 inch 3 sut"',   unitsToSut(198), '12 inch 3 sut');
assertEqual('unitsToSut(201) → "12 inch 4.5 sut"', unitsToSut(201), '12 inch 4.5 sut');
assertEqual('unitsToSut(192) → "12 inch"',          unitsToSut(192), '12 inch');
assertEqual('unitsToSut(0)   → "0 inch"',           unitsToSut(0),   '0 inch');
assertEqual('unitsToSut(1)   → "0 inch 0.5 sut"',  unitsToSut(1),   '0 inch 0.5 sut');
assertEqual('unitsToSut(2)   → "0 inch 1 sut"',    unitsToSut(2),   '0 inch 1 sut');

// ─── 4. Arithmetic ───────────────────────────────────────────────────────────

section('4. Arithmetic — add, subtract, multiply, divide');

// add
assertEqual('add(196, 198)     → 394',  add(196, 198),   394);
assertEqual('add(0, 192)       → 192',  add(0, 192),     192);

// subtract
assertEqual('subtract(201, 196) → 5',  subtract(201, 196), 5);
assertEqual('subtract(198, 198) → 0',  subtract(198, 198), 0);

// multiply — integer and decimal multipliers
assertEqual('multiply(196, 2)   → 392', multiply(196, 2),   392);
assertEqual('multiply(196, 0.5) → 98',  multiply(196, 0.5), 98);
assertEqual('multiply(196, 1.5) → 294', multiply(196, 1.5), 294);
assertEqual('multiply(201, 2)   → 402', multiply(201, 2),   402);

// divide — rounds to nearest integer unit
assertEqual('divide(201, 2)    → 101', divide(201, 2),  101);  // 100.5 → rounds to 101
assertEqual('divide(196, 4)    → 49',  divide(196, 4),  49);
assertEqual('divide(192, 4)    → 48',  divide(192, 4),  48);
assertEqual('divide(199, 2)    → 100', divide(199, 2),  100);  // 99.5 → rounds to 100

// ─── 5. formatOutput ─────────────────────────────────────────────────────────

section('5. formatOutput — Complete Output Object');

assertEqual('formatOutput(201)', formatOutput(201), {
  units    : 201,
  fraction : '12 9/16',
  sut      : '12 inch 4.5 sut',
  inches   : 12.5625,
});

assertEqual('formatOutput(196)', formatOutput(196), {
  units    : 196,
  fraction : '12 1/4',
  sut      : '12 inch 2 sut',
  inches   : 12.25,
});

assertEqual('formatOutput(192)', formatOutput(192), {
  units    : 192,
  fraction : '12',
  sut      : '12 inch',
  inches   : 12,
});

// ─── 6. Edge Cases ───────────────────────────────────────────────────────────

section('6. Edge Cases — Invalid Input & Errors');

assertNull('parseToUnits("")        → null',   parseToUnits(''));
assertNull('parseToUnits(null)      → null',   parseToUnits(null));
assertNull('parseToUnits(undefined) → null',   parseToUnits(undefined));

assertThrows('divide(192, 0) throws',    () => divide(192, 0));
assertThrows('unitsToFraction(1.5) throws', () => unitsToFraction(1.5));
assertThrows('unitsToSut(1.5) throws',   () => unitsToSut(1.5));
assertThrows('add(1.5, 2) throws',       () => add(1.5, 2));
assertThrows('subtract(1.5, 2) throws',  () => subtract(1.5, 2));

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(60));
console.log(`  RESULTS:  ${passed} passed,  ${failed} failed  (total: ${passed + failed})`);
console.log('═'.repeat(60));

if (failed > 0) {
  console.log('\n  FAILED TESTS:');
  failures.forEach(f => console.log(`    ✗  ${f}`));
  console.log('');
  process.exit(1);
} else {
  console.log('\n  ✅  All tests passed. Measurement Engine is ready.\n');
  process.exit(0);
}
