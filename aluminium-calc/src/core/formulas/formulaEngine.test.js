/**
 * formulaEngine.test.js
 * =====================================================================
 * Aluminium Fabrication Calculator — Formula Engine Test Suite
 * =====================================================================
 *
 * Run with: node src/core/formulas/formulaEngine.test.js
 * No external test runner required.
 *
 * Test categories:
 *   1. evaluate()         — basic, arithmetic, rounding
 *   2. evaluate()         — real fabrication formulas (as they'd come from DB)
 *   3. extractVariables() — AST variable extraction
 *   4. validateFormula()  — valid / invalid / missing vars
 *   5. resolveFormulas()  — dependency chain resolution
 *   6. Error handling     — undefined var, bad syntax, divide by zero, bad input
 * =====================================================================
 */

'use strict';

const {
  evaluate,
  extractVariables,
  validateFormula,
  resolveFormulas,
} = require('./formulaEngine');

// ─── Test runner ─────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

function assertEqual(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log(`  ✅  ${label}`);
    passed++;
  } else {
    console.log(`  ❌  ${label}`);
    console.log(`       Expected : ${e}`);
    console.log(`       Got      : ${a}`);
    failed++;
    failures.push(label);
  }
}

function assertThrows(label, fn, expectedFragment) {
  try {
    fn();
    console.log(`  ❌  ${label}  (expected Error, none thrown)`);
    failed++;
    failures.push(label);
  } catch (e) {
    if (expectedFragment && !e.message.includes(expectedFragment)) {
      console.log(`  ❌  ${label}`);
      console.log(`       Expected message to include : "${expectedFragment}"`);
      console.log(`       Got                        : "${e.message}"`);
      failed++;
      failures.push(label);
    } else {
      console.log(`  ✅  ${label}  → threw: ${e.message}`);
      passed++;
    }
  }
}

function section(title) {
  console.log(`\n${'─'.repeat(64)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(64));
}

// ─── 1. evaluate() — Basic & Arithmetic ──────────────────────────────────────

section('1. evaluate() — Basic & Arithmetic');

// Simple passthrough
assertEqual(
  'evaluate("width", {width:868})                 → 868',
  evaluate('width', { width: 868 }), 868
);

// Basic arithmetic
assertEqual(
  'evaluate("width + height", {width:192,height:96}) → 288',
  evaluate('width + height', { width: 192, height: 96 }), 288
);

assertEqual(
  'evaluate("width - deduction", {width:200,deduction:8}) → 192',
  evaluate('width - deduction', { width: 200, deduction: 8 }), 192
);

// Division with clean result
assertEqual(
  'evaluate("width / 2", {width:868})             → 434',
  evaluate('width / 2', { width: 868 }), 434
);

// Division with rounding (100.5 → 101)
assertEqual(
  'evaluate("width / 2", {width:201})             → 101  (rounds up)',
  evaluate('width / 2', { width: 201 }), 101
);

// Division with rounding (99.5 → 100)
assertEqual(
  'evaluate("width / 2", {width:199})             → 100  (rounds to nearest)',
  evaluate('width / 2', { width: 199 }), 100
);

// Multiplication
assertEqual(
  'evaluate("width * 2", {width:196})             → 392',
  evaluate('width * 2', { width: 196 }), 392
);

// Parentheses order
assertEqual(
  'evaluate("(a + b) * 2", {a:100,b:50})          → 300',
  evaluate('(a + b) * 2', { a: 100, b: 50 }), 300
);

// Literal numbers inside formula
assertEqual(
  'evaluate("width + 16", {width:192})            → 208',
  evaluate('width + 16', { width: 192 }), 208
);

// ─── 2. evaluate() — Real Fabrication Formulas (from DB) ─────────────────────

section('2. evaluate() — Real Fabrication Formulas (as they come from DB)');

// frame_top = width
assertEqual(
  'frame_top  = "width"                           → 868',
  evaluate('width', { width: 868 }), 868
);

// frame_side = height
assertEqual(
  'frame_side = "height"                          → 1200',
  evaluate('height', { height: 1200 }), 1200
);

// shutter_width = ((width / 2) + overlap) - deduction
// width=868, overlap=16, deduction=8
// = (434 + 16) - 8 = 442
assertEqual(
  'shutter_width = "((width / 2) + overlap) - deduction" → 442',
  evaluate('((width / 2) + overlap) - deduction', {
    width: 868, overlap: 16, deduction: 8,
  }), 442
);

// glass_width = shutter_width - (bead_left + bead_right)
// shutter_width=442, bead_left=16, bead_right=16
// = 442 - 32 = 410
assertEqual(
  'glass_width = "shutter_width - (bead_left + bead_right)" → 410',
  evaluate('shutter_width - (bead_left + bead_right)', {
    shutter_width: 442, bead_left: 16, bead_right: 16,
  }), 410
);

// glass_height = shutter_height - (bead_top + bead_bottom)
// shutter_height=600, bead_top=16, bead_bottom=16
// = 600 - 32 = 568
assertEqual(
  'glass_height = "shutter_height - (bead_top + bead_bottom)" → 568',
  evaluate('shutter_height - (bead_top + bead_bottom)', {
    shutter_height: 600, bead_top: 16, bead_bottom: 16,
  }), 568
);

// ─── 3. extractVariables() ────────────────────────────────────────────────────

section('3. extractVariables() — AST Variable Extraction');

assertEqual(
  'extractVariables("width")                      → ["width"]',
  extractVariables('width'), ['width']
);

assertEqual(
  'extractVariables("((width / 2) + overlap) - deduction") → sorted vars',
  extractVariables('((width / 2) + overlap) - deduction'),
  ['deduction', 'overlap', 'width']  // sorted
);

assertEqual(
  'extractVariables("shutter_width - (bead_left + bead_right)")',
  extractVariables('shutter_width - (bead_left + bead_right)'),
  ['bead_left', 'bead_right', 'shutter_width']
);

// Literal-only formula — no variables
assertEqual(
  'extractVariables("16 + 8")                     → []',
  extractVariables('16 + 8'), []
);

// ─── 4. validateFormula() ────────────────────────────────────────────────────

section('4. validateFormula() — Valid / Invalid / Missing Vars');

// Valid formula with matching context
assertEqual(
  'valid formula + full context                   → { valid:true }',
  validateFormula('((width / 2) + overlap) - deduction', {
    width: 868, overlap: 16, deduction: 8,
  }),
  { valid: true, error: null, missingVars: [] }
);

// Missing variable in context
const missingResult = validateFormula('width + overlap', { width: 868 });
assertEqual(
  'missing "overlap" in context                   → valid:false, missingVars:["overlap"]',
  missingResult,
  { valid: false, error: 'Missing variables: overlap', missingVars: ['overlap'] }
);

// Invalid syntax — mathjs rejects "width + * overlap" (Value expected)
const syntaxResult = validateFormula('width + * overlap', { width: 868, overlap: 16 });
assertEqual(
  'bad syntax                                     → valid:false',
  syntaxResult.valid, false
);

// ─── 5. resolveFormulas() — Dependency Chain ─────────────────────────────────

section('5. resolveFormulas() — Dependency Chain Resolution');

// Two-level chain: shutter_width → glass_width
const chainResult = resolveFormulas(
  {
    shutter_width : '((width / 2) + overlap) - deduction',
    glass_width   : 'shutter_width - (bead_left + bead_right)',
    glass_height  : 'height - (bead_top + bead_bottom)',
  },
  {
    width       : 868,
    height      : 1200,
    overlap     : 16,
    deduction   : 8,
    bead_left   : 16,
    bead_right  : 16,
    bead_top    : 16,
    bead_bottom : 16,
  }
);

assertEqual(
  'resolveFormulas → shutter_width = 442',
  chainResult.shutter_width, 442
);
assertEqual(
  'resolveFormulas → glass_width   = 410   (depends on shutter_width)',
  chainResult.glass_width, 410
);
assertEqual(
  'resolveFormulas → glass_height  = 1168',
  chainResult.glass_height, 1168
);

// Single formula
const singleResult = resolveFormulas(
  { frame_top: 'width' },
  { width: 868 }
);
assertEqual(
  'resolveFormulas → frame_top = 868',
  singleResult.frame_top, 868
);

// ─── 6. Error Handling ───────────────────────────────────────────────────────

section('6. Error Handling — Undefined Var / Bad Syntax / Bad Input');

// Undefined variable
assertThrows(
  'evaluate with undefined var throws "Undefined variable"',
  () => evaluate('width + unknown', { width: 868 }),
  'Undefined variable "unknown"'
);

// Invalid formula string — mathjs rejects "width + * 2" (Value expected)
assertThrows(
  'evaluate with invalid syntax throws "Formula error"',
  () => evaluate('width + * 2', { width: 868 }),
  'Formula error'
);


// Empty formula
assertThrows(
  'evaluate("") throws',
  () => evaluate(''),
  'non-empty string'
);

// Null formula
assertThrows(
  'evaluate(null) throws',
  () => evaluate(null),
  'non-empty string'
);

// Non-number in context
assertThrows(
  'evaluate with string in context throws',
  () => evaluate('width', { width: 'abc' }),
  'must be a finite number'
);

// resolveFormulas with circular dependency
assertThrows(
  'resolveFormulas with circular dependency throws',
  () => resolveFormulas(
    { a: 'b + 1', b: 'a + 1' },
    {}
  ),
  'Cannot resolve'
);

// resolveFormulas with missing base variable
assertThrows(
  'resolveFormulas with missing base var throws',
  () => resolveFormulas(
    { shutter_width: 'width + missing_var' },
    { width: 868 }
  ),
  'Cannot resolve'
);

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(64));
console.log(`  RESULTS:  ${passed} passed,  ${failed} failed  (total: ${passed + failed})`);
console.log('═'.repeat(64));

if (failed > 0) {
  console.log('\n  FAILED TESTS:');
  failures.forEach(f => console.log(`    ✗  ${f}`));
  console.log('');
  process.exit(1);
} else {
  console.log('\n  ✅  All tests passed. Formula Engine is ready.\n');
  process.exit(0);
}
