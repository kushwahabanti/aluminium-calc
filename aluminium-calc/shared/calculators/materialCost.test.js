/**
 * materialCost.test.js
 * =====================================================================
 * Tests for Material & Cost Calculators
 * Run: node src/core/calculators/materialCost.test.js
 * =====================================================================
 */

'use strict';

import { calculateMaterials, unitsToFeet, areaSqFt } from './materialCalculator.js';
import { calculateCosts, applyMargin } from './costCalculator.js';

let passed = 0, failed = 0;

function assertEqual(label, actual, expected) {
  // Use a small epsilon for floating point comparisons
  if (typeof actual === 'number' && typeof expected === 'number') {
    if (Math.abs(actual - expected) < 0.001) {
      console.log(`  ✅  ${label}`);
      passed++;
      return;
    }
  } else if (JSON.stringify(actual) === JSON.stringify(expected)) {
    console.log(`  ✅  ${label}`);
    passed++;
    return;
  }
  
  console.log(`  ❌  ${label}\n       Expected: ${JSON.stringify(expected)}\n       Got:      ${JSON.stringify(actual)}`);
  failed++;
}

console.log('Testing Material & Cost Calculators...');

// ── Mock Data ────────────────────────────────────────────────────────────────
const mockRatesData = {
  sections: [
    { name: 'frame', label: 'Frame', weight_per_ft: 1.20, rate_per_kg: 180, stock_length_ft: 15 },
    { name: 'shutter', label: 'Shutter', weight_per_ft: 0.90, rate_per_kg: 175, stock_length_ft: 15 }
  ],
  hardwareItems: [
    { name: 'roller', label: 'Roller', qty_per_window: 4, rate_per_piece: 25, unit: 'piece' },
    { name: 'woolpile', label: 'Wool Pile', qty_per_window: 1, rate_per_piece: 8, unit: 'per_foot' }
  ]
};

const mockCalcResult = {
  dimensions: {
    shutter_width: { units: 16 * 24 }, // 24 inches
    shutter_height: { units: 16 * 48 }, // 48 inches
    glass_width: { units: 16 * 20 }, // 20 inches
    glass_height: { units: 16 * 44 } // 44 inches
  },
  sections: [
    { sectionKey: 'frame', qty: 2, cutSize: { units: 16 * 50 } }, // Top/bottom: 50" * 2
    { sectionKey: 'frame', qty: 2, cutSize: { units: 16 * 48 } }, // Left/right: 48" * 2
    { sectionKey: 'shutter', qty: 4, cutSize: { units: 16 * 24 } }, // Shutter width: 24" * 4
    { sectionKey: 'shutter', qty: 4, cutSize: { units: 16 * 48 } }  // Shutter height: 48" * 4
  ]
};

// ── 1. materialCalculator tests ─────────────────────────────────────────────
console.log('\n--- materialCalculator ---');

assertEqual('unitsToFeet(192) == 1 foot', unitsToFeet(192), 1);
assertEqual('unitsToFeet(16 * 24) == 2 feet', unitsToFeet(16 * 24), 2);
assertEqual('areaSqFt(16 * 12, 16 * 24) == 2 sqft', areaSqFt(16 * 12, 16 * 24), 2);

const materials = calculateMaterials(mockCalcResult, mockRatesData, 10); // 10% wastage

// Frame cuts: (50*2 + 48*2) = 196 inches = 16.333 feet. 
// With 10% waste: 16.333 * 1.1 = 17.966 feet.
const frameReq = materials.aluminium.find(a => a.name === 'frame');
assertEqual('Frame length with 10% waste', frameReq.totalLengthFt * 1.1, 16.333333333333332 * 1.1); // Actually the function already multiplied
assertEqual('Frame totalWeightKg = length * 1.20', frameReq.totalWeightKg, (196 / 12) * 1.1 * 1.2);
assertEqual('Frame stock lengths = ceil(17.966 / 15)', frameReq.stockLengthsNeeded, 2);

// Shutter cuts: (24*4 + 48*4) = 288 inches = 24 feet.
// With 10% waste: 24 * 1.1 = 26.4 feet.
const shutterReq = materials.aluminium.find(a => a.name === 'shutter');
assertEqual('Shutter totalWeightKg = length * 0.9', shutterReq.totalWeightKg, 24 * 1.1 * 0.9);
assertEqual('Shutter stock lengths = ceil(26.4 / 15)', shutterReq.stockLengthsNeeded, 2);

// Glass: 20" x 44" = 880 sq inches = 6.111 sqft. For 2 shutters = 12.222 sqft.
assertEqual('Glass area for 2 shutters', materials.glass.areaSqFt, (20 / 12) * (44 / 12) * 2);

// Hardware:
// Roller = 4
const rollerReq = materials.hardware.find(h => h.name === 'roller');
assertEqual('Roller qty = 4', rollerReq.qty, 4);

// Woolpile perimeter: 2 shutters, each 24"x48". Perimeter = (24+48)*2 = 144" = 12ft. For 2 shutters = 24ft.
const woolpileReq = materials.hardware.find(h => h.name === 'woolpile');
assertEqual('Woolpile qty = 24 feet', woolpileReq.qty, 24);

// ── 2. costCalculator tests ─────────────────────────────────────────────────
console.log('\n--- costCalculator ---');

const selectedGlassRate = { rate_per_sqft: 45 };
const costs = calculateCosts(materials, mockRatesData, selectedGlassRate);

const frameCost = frameReq.totalWeightKg * 180;
const shutterCost = shutterReq.totalWeightKg * 175;
const glassCost = materials.glass.areaSqFt * 45;
const hardwareCost = (4 * 25) + (24 * 8);

assertEqual('Total Aluminium Cost', costs.totals.aluminium, frameCost + shutterCost);
assertEqual('Total Glass Cost', costs.totals.glass, glassCost);
assertEqual('Total Hardware Cost', costs.totals.hardware, hardwareCost);
assertEqual('Total Material Cost', costs.totals.materialOnly, frameCost + shutterCost + glassCost + hardwareCost);

const marginRes = applyMargin(costs.totals.materialOnly, 20);
assertEqual('Margin Amount @ 20%', marginRes.marginAmount, costs.totals.materialOnly * 0.2);
assertEqual('Selling Price', marginRes.sellingPrice, costs.totals.materialOnly * 1.2);

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
