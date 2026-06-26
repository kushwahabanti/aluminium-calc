/**
 * db.test.js — Database Layer Test Suite
 * Run: node src/database/db.test.js
 */
'use strict';

const path = require('path');
const fs   = require('fs');
const db   = require('./db');

// Use a temp DB file for tests
const TEST_DB = path.join(__dirname, '..', '..', 'test-aluminium.db');

let passed = 0, failed = 0;
const failures = [];

function assertEqual(label, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { console.log(`  ✅  ${label}`); passed++; }
  else {
    console.log(`  ❌  ${label}\n       Expected: ${e}\n       Got:      ${a}`);
    failed++; failures.push(label);
  }
}
function assertTrue(label, val) {
  if (val) { console.log(`  ✅  ${label}`); passed++; }
  else { console.log(`  ❌  ${label}`); failed++; failures.push(label); }
}
function assertThrows(label, fn, frag) {
  try {
    fn(); console.log(`  ❌  ${label} (no error thrown)`); failed++; failures.push(label);
  } catch(e) {
    if (frag && !e.message.includes(frag)) {
      console.log(`  ❌  ${label}\n       Expected: "${frag}"\n       Got: "${e.message}"`);
      failed++; failures.push(label);
    } else { console.log(`  ✅  ${label} → ${e.message}`); passed++; }
  }
}
function section(t) { console.log(`\n${'─'.repeat(60)}\n  ${t}\n${'─'.repeat(60)}`); }

// ── Run tests (async because initDb is async with sql.js) ─────────────────────
async function run() {
  // Clean up any old test DB
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);

  await db.initDb(TEST_DB);

  // ── 1. Sections ────────────────────────────────────────────────────────────
  section('1. Aluminium Sections');

  const sections = db.getSections();
  assertTrue('getSections() returns 4 sections', sections.length === 4);
  assertEqual('frame section name', sections[0].name, 'frame');
  assertTrue('frame weight_per_ft is a number', typeof sections[0].weight_per_ft === 'number');
  assertTrue('frame rate_per_kg is a number',   typeof sections[0].rate_per_kg === 'number');
  assertEqual('stock_length_ft default = 15', sections[0].stock_length_ft, 15);

  const frame = db.getSectionByName('frame');
  assertEqual('getSectionByName("frame") weight', frame.weight_per_ft, 1.20);
  assertEqual('getSectionByName("frame") rate',   frame.rate_per_kg,   180);

  db.updateSection('frame', { weight_per_ft: 1.25, rate_per_kg: 185 });
  const updated = db.getSectionByName('frame');
  assertEqual('updateSection: weight updated to 1.25', updated.weight_per_ft, 1.25);
  assertEqual('updateSection: rate updated to 185',    updated.rate_per_kg,   185);

  // ── 2. Glass Rates ─────────────────────────────────────────────────────────
  section('2. Glass Rates');

  const glassRates = db.getGlassRates();
  assertTrue('getGlassRates() returns 4 rows', glassRates.length === 4);

  const clear4 = db.getGlassRate('clear', '4mm');
  assertEqual('clear 4mm rate = 45', clear4.rate_per_sqft, 45);

  db.updateGlassRate(clear4.id, { rate_per_sqft: 48 });
  const updatedGlass = db.getGlassRate('clear', '4mm');
  assertEqual('updateGlassRate: rate updated to 48', updatedGlass.rate_per_sqft, 48);

  // ── 3. Hardware Items ──────────────────────────────────────────────────────
  section('3. Hardware Items');

  const hardware = db.getHardwareItems();
  assertTrue('getHardwareItems() returns 4 items', hardware.length === 4);

  const roller = hardware.find(h => h.name === 'roller');
  assertEqual('roller qty_per_window = 4', roller.qty_per_window, 4);
  assertEqual('roller rate_per_piece = 25', roller.rate_per_piece, 25);

  db.updateHardwareItem(roller.id, { rate_per_piece: 30 });
  const updatedHardware = db.getHardwareItems();
  const updatedRoller = updatedHardware.find(h => h.name === 'roller');
  assertEqual('updateHardwareItem: rate updated to 30', updatedRoller.rate_per_piece, 30);

  // ── 4. Margin Config ───────────────────────────────────────────────────────
  section('4. Margin Config');

  const margins = db.getMargins();
  assertTrue('getMargins() returns 3 presets', margins.length === 3);

  const def = db.getMargin('default');
  assertEqual('default margin = 20', def.percentage, 20);

  db.updateMargin('default', 22);
  const updatedMargin = db.getMargin('default');
  assertEqual('updateMargin: updated to 22', updatedMargin.percentage, 22);

  assertThrows('updateMargin(150) throws invalid', () => db.updateMargin('default', 150), 'Invalid margin');

  // ── 5. Deductions ─────────────────────────────────────────────────────────
  section('5. Deductions');

  const deds = db.getDeductions('sliding-window-2track');
  assertTrue('getDeductions() returns object', typeof deds === 'object');
  assertEqual('frame_width_ded = 0',       deds.frame_width_ded,    0);
  assertEqual('shutter_width_ded = 16',    deds.shutter_width_ded,  16);
  assertEqual('shutter_height_ded = 24',   deds.shutter_height_ded, 24);
  assertEqual('glass_width_ded = 20',      deds.glass_width_ded,    20);
  assertEqual('glass_height_ded = 20',     deds.glass_height_ded,   20);
  assertTrue('has 6 deduction keys', Object.keys(deds).length === 6);

  db.updateDeduction('sliding-window-2track', 'shutter_width_ded', 20);
  const updatedDeds = db.getDeductions('sliding-window-2track');
  assertEqual('updateDeduction: shutter_width_ded → 20', updatedDeds.shutter_width_ded, 20);

  assertThrows('updateDeduction(-1 units) throws', () =>
    db.updateDeduction('sliding-window-2track', 'shutter_width_ded', -1), 'non-negative integer');

  assertThrows('getDeductions unknown product throws', () =>
    db.getDeductions('unknown-product'), 'No deductions found');

  // ── 6. DB integrates with calculator ──────────────────────────────────────
  section('6. DB → Calculator Integration');

  // Reset deduction to original value
  db.updateDeduction('sliding-window-2track', 'shutter_width_ded', 16);

  const { calculate } = require('../core/calculators/calculator');
  const deductions    = db.getDeductions('sliding-window-2track');
  const result = calculate(
    'sliding-window-2track',
    { width: '4 feet 6 inches', height: '4 feet' },
    deductions
  );
  assertEqual('DB deductions → shutter_width = 416', result.dimensions.shutter_width.units, 416);
  assertEqual('DB deductions → glass_width = 396',   result.dimensions.glass_width.units,   396);

  // ── 7. Projects ────────────────────────────────────────────────────────────
  section('7. Projects — Save & Retrieve');

  const projectId = db.saveProject({
    name          : 'Test Project - Kitchen Window',
    productTypeId : 'sliding-window-2track',
    inputs        : { width: 864, height: 768 },
    deductions,
    results       : result.dimensions,
    rates         : { frame: { rate_per_kg: 180 } },
  });
  assertTrue('saveProject returns an id', typeof projectId === 'number' && projectId > 0);

  const projects = db.getProjects();
  assertTrue('getProjects returns 1 project', projects.length === 1);
  assertEqual('project name correct', projects[0].name, 'Test Project - Kitchen Window');

  const retrieved = db.getProject(projectId);
  assertEqual('getProject inputs.width = 864', retrieved.inputs.width, 864);

  db.deleteProject(projectId);
  assertEqual('deleteProject: list now empty', db.getProjects().length, 0);

  // ── 8. Persistence ────────────────────────────────────────────────────────
  section('8. Persistence — Data Survives Reload');

  db._resetForTest();
  await db.initDb(TEST_DB);
  const reloaded = db.getSectionByName('frame');
  assertEqual('frame weight persists after reload: 1.25', reloaded.weight_per_ft, 1.25);
  assertEqual('frame rate persists after reload: 185',    reloaded.rate_per_kg,   185);

  // ── Cleanup ────────────────────────────────────────────────────────────────
  db.closeDb();
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  RESULTS:  ${passed} passed,  ${failed} failed  (total: ${passed + failed})`);
  console.log('═'.repeat(60));
  if (failed > 0) {
    console.log('\n  FAILED TESTS:');
    failures.forEach(f => console.log(`    ✗  ${f}`));
    process.exit(1);
  } else {
    console.log('\n  ✅  All tests passed. Database Layer is ready.\n');
    process.exit(0);
  }
}

run().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
