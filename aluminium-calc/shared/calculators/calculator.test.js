/**
 * calculator.test.js
 * =====================================================================
 * Aluminium Fabrication Calculator — Calculator + Product Module Tests
 * =====================================================================
 *
 * Run with: node src/core/calculators/calculator.test.js
 *
 * Test categories:
 *   1. Product Registry   — load, list, unknown type
 *   2. Base Product       — contract validation
 *   3. Sliding Window     — module structure
 *   4. Calculator         — end-to-end dimension calculation
 *   5. Error Handling     — missing inputs, missing deductions, bad format
 *
 * NOTE: Deductions are passed in directly here (simulating what DB layer
 *       will provide at runtime). This keeps calculator.test.js independent
 *       of the DB module (which is built in the next module).
 * =====================================================================
 */

'use strict';

import { getProduct, listProducts } from '../products/registry.js';
import { validateProduct } from '../products/baseProduct.js';
import { calculate } from './calculator.js';
import { parseToUnits, formatOutput} from '../measurement/measurementEngine.js';

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

function assertThrows(label, fn, fragment) {
  try {
    fn();
    console.log(`  ❌  ${label}  (expected Error, none thrown)`);
    failed++;
    failures.push(label);
  } catch (e) {
    if (fragment && !e.message.includes(fragment)) {
      console.log(`  ❌  ${label}`);
      console.log(`       Expected message to include : "${fragment}"`);
      console.log(`       Got                        : "${e.message}"`);
      failed++;
      failures.push(label);
    } else {
      console.log(`  ✅  ${label}  → threw: ${e.message}`);
      passed++;
    }
  }
}

function assertType(label, value, type) {
  if (typeof value === type) {
    console.log(`  ✅  ${label}`);
    passed++;
  } else {
    console.log(`  ❌  ${label}  (expected ${type}, got ${typeof value})`);
    failed++;
    failures.push(label);
  }
}

function assertTrue(label, condition) {
  if (condition) {
    console.log(`  ✅  ${label}`);
    passed++;
  } else {
    console.log(`  ❌  ${label}`);
    failed++;
    failures.push(label);
  }
}

function section(title) {
  console.log(`\n${'─'.repeat(64)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(64));
}

// ─── Test deductions (simulating DB values) ───────────────────────────────────
// These will come from the DB in production. For tests we pass them directly.
// Values are in internal units (1 inch = 16 units).

const TEST_DEDUCTIONS = {
  frame_width_ded    :  0,   // no deduction — frame = full width
  frame_height_ded   :  0,   // no deduction — frame = full height
  shutter_width_ded  : 16,   // 1 inch per shutter
  shutter_height_ded : 24,   // 1.5 inch
  glass_width_ded    : 20,   // 1.25 inch per shutter
  glass_height_ded   : 20,   // 1.25 inch
};

// ─── 1. Product Registry ─────────────────────────────────────────────────────

section('1. Product Registry — Load & List');

const sw = getProduct('sliding-window-2track');
assertEqual(
  'getProduct("sliding-window-2track").id     → "sliding-window-2track"',
  sw.id, 'sliding-window-2track'
);
assertEqual(
  'getProduct("sliding-window-2track").name   → "2 Track Sliding Window"',
  sw.name, '2 Track Sliding Window'
);

const list = listProducts();
assertTrue(
  'listProducts() returns array with at least 1 product',
  Array.isArray(list) && list.length >= 1
);
assertEqual(
  'listProducts()[0] has id, name, description',
  Object.keys(list[0]).sort(), ['description', 'id', 'name']
);

assertThrows(
  'getProduct("unknown-type") throws "Unknown product type"',
  () => getProduct('unknown-type'),
  'Unknown product type'
);
assertThrows(
  'getProduct("") throws',
  () => getProduct(''),
  'non-empty string'
);

// ─── 2. Base Product Validation ───────────────────────────────────────────────

section('2. Base Product — Contract Validation');

assertTrue(
  'sliding-window-2track passes validateProduct()',
  validateProduct(sw) === true
);

assertThrows(
  'validateProduct({}) throws — missing required fields',
  () => validateProduct({}),
  'missing required field'
);

assertThrows(
  'validateProduct with missing "sections" throws',
  () => validateProduct({
    id: 'test', name: 'Test', description: 'X',
    inputs: [{ key: 'width', label: 'W', required: true }],
    formulas: { frame: 'width' },
    deductionKeys: [],
    outputSections: [],
    // sections missing
  }),
  'missing required field: "sections"'
);

// ─── 3. Sliding Window Module Structure ───────────────────────────────────────

section('3. Sliding Window 2-Track — Module Structure');

assertTrue(
  'inputs array has "width" and "height"',
  sw.inputs.some(i => i.key === 'width') && sw.inputs.some(i => i.key === 'height')
);
assertTrue(
  'formulas contains shutter_width, glass_width, interlock',
  'shutter_width' in sw.formulas &&
  'glass_width'   in sw.formulas &&
  'interlock'     in sw.formulas
);
assertTrue(
  'deductionKeys includes shutter_width_ded and glass_width_ded',
  sw.deductionKeys.includes('shutter_width_ded') &&
  sw.deductionKeys.includes('glass_width_ded')
);
assertTrue(
  'sections array is non-empty',
  Array.isArray(sw.sections) && sw.sections.length > 0
);
assertTrue(
  'all sections have key, formulaKey, qty',
  sw.sections.every(s => s.key && s.formulaKey && typeof s.qty === 'number')
);
assertTrue(
  'defaultDeductions has all 6 deduction keys',
  sw.deductionKeys.every(k => k in sw.defaultDeductions)
);

// ─── 4. Calculator — End-to-End Dimension Calculation ────────────────────────

section('4. Calculator — End-to-End Dimension Calculation');

// Test dimensions: width = 4 feet 6 inches, height = 4 feet
// width  = 4×192 + 6×16 = 768 + 96 = 864 units
// height = 4×192         = 768 units
//
// Expected results:
//   frame_top_bottom   = 864 - 0    = 864
//   frame_left_right   = 768 - 0    = 768
//   shutter_width      = (864/2)-16 = 432-16 = 416
//   shutter_height     = 768-24     = 744
//   glass_width        = 416-20     = 396
//   glass_height       = 744-20     = 724
//   interlock          = 768
//   beading_width      = 396
//   beading_height     = 724

const result = calculate(
  'sliding-window-2track',
  { width: '4 feet 6 inches', height: '4 feet' },
  TEST_DEDUCTIONS
);

// ── Inputs parsed correctly ──────────────────────────────────────────────────
assertEqual('inputs.width  → 864 units', result.inputs.width,  864);
assertEqual('inputs.height → 768 units', result.inputs.height, 768);

// ── Frame ────────────────────────────────────────────────────────────────────
assertEqual(
  'frame_top_bottom = 864 units ("54" inches)',
  result.dimensions.frame_top_bottom.units, 864
);
assertEqual(
  'frame_top_bottom fraction = "54"',
  result.dimensions.frame_top_bottom.fraction, '54'
);
assertEqual(
  'frame_left_right = 768 units ("48")',
  result.dimensions.frame_left_right.units, 768
);

// ── Shutter ──────────────────────────────────────────────────────────────────
assertEqual(
  'shutter_width = 416 units (26 inches)',
  result.dimensions.shutter_width.units, 416
);
assertEqual(
  'shutter_width fraction = "26"',
  result.dimensions.shutter_width.fraction, '26'
);
assertEqual(
  'shutter_height = 744 units (46.5 inches)',
  result.dimensions.shutter_height.units, 744
);
assertEqual(
  'shutter_height fraction = "46 1/2"',
  result.dimensions.shutter_height.fraction, '46 1/2'
);

// ── Glass ────────────────────────────────────────────────────────────────────
assertEqual(
  'glass_width = 396 units (24.75 inches)',
  result.dimensions.glass_width.units, 396
);
assertEqual(
  'glass_width fraction = "24 3/4"',
  result.dimensions.glass_width.fraction, '24 3/4'
);
assertEqual(
  'glass_height = 724 units (45.25 inches)',
  result.dimensions.glass_height.units, 724
);
assertEqual(
  'glass_height fraction = "45 1/4"',
  result.dimensions.glass_height.fraction, '45 1/4'
);

// ── Interlock & Beading ──────────────────────────────────────────────────────
assertEqual('interlock = 768 units',     result.dimensions.interlock.units,     768);
assertEqual('beading_width = 396 units', result.dimensions.beading_width.units, 396);
assertEqual('beading_height = 724 units',result.dimensions.beading_height.units,724);

// ── Sections list ─────────────────────────────────────────────────────────────
assertTrue(
  'sections array is non-empty',
  Array.isArray(result.sections) && result.sections.length > 0
);
assertTrue(
  'each section has sectionKey, qty, cutSize',
  result.sections.every(s => s.sectionKey && s.qty && s.cutSize)
);

// Check a specific section
const frameTopSection = result.sections.find(s => s.formulaKey === 'frame_top_bottom');
assertEqual(
  'frame top/bottom section qty = 2',
  frameTopSection.qty, 2
);
assertEqual(
  'frame top/bottom cut size = 864',
  frameTopSection.cutSize.units, 864
);

// ── String input formats also work ───────────────────────────────────────────
const result2 = calculate(
  'sliding-window-2track',
  { width: "8' 6\"", height: '5 feet 6 inches' },
  TEST_DEDUCTIONS
);
// 8'6" → 8×192 + 6×16 = 1536+96 = 1632 ... but wait "8' 6\"" — the " is inch shorthand
// Let's use a cleaner format for this test
const result3 = calculate(
  'sliding-window-2track',
  { width: '5 feet', height: '4 feet' },
  TEST_DEDUCTIONS
);
// width=960, height=768
// shutter_width = 960/2 - 16 = 480-16 = 464
assertEqual(
  'shutter_width for 5 feet wide window = 464',
  result3.dimensions.shutter_width.units, 464
);

// ─── 5. Error Handling ───────────────────────────────────────────────────────

section('5. Error Handling — Missing Inputs / Deductions / Bad Format');

assertThrows(
  'calculate with missing "height" throws',
  () => calculate('sliding-window-2track', { width: '4 feet' }, TEST_DEDUCTIONS),
  'Missing required inputs'
);

assertThrows(
  'calculate with unparseable width throws',
  () => calculate('sliding-window-2track', { width: 'abc xyz', height: '4 feet' }, TEST_DEDUCTIONS),
  'Cannot parse input'
);

assertThrows(
  'calculate with missing deductions throws',
  () => calculate(
    'sliding-window-2track',
    { width: '4 feet', height: '4 feet' },
    { frame_width_ded: 0 }  // only one deduction supplied
  ),
  'Missing deduction values'
);

assertThrows(
  'calculate with unknown product type throws',
  () => calculate('unknown-product', { width: '4 feet', height: '4 feet' }, TEST_DEDUCTIONS),
  'Unknown product type'
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
  console.log('\n  ✅  All tests passed. Calculator + Product Module ready.\n');
  process.exit(0);
}
