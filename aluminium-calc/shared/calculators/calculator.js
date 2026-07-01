/**
 * calculator.js
 * =====================================================================
 * Aluminium Fabrication Calculator — Dimension Calculator
 * =====================================================================
 *
 * RESPONSIBILITY
 * ─────────────────────────────────────────────────────────────────────
 *   Orchestrates: product module + formula engine → cut dimensions
 *
 *   Input  → product type + raw dimensions (string) + deductions (from DB)
 *   Output → all cut sizes in internal units + formatted strings
 *
 * THIS MODULE DOES NOT:
 *   - Know about materials, costs, or prices
 *   - Hardcode any formula or deduction value
 *   - Touch the DB directly
 *
 * DATA FLOW
 * ─────────────────────────────────────────────────────────────────────
 *   User input (string)
 *       ↓  measurementEngine.parseToUnits()
 *   Raw units (integer)
 *       ↓  merge with deductions from DB
 *   Context object { width, height, shutter_width_ded, ... }
 *       ↓  formulaEngine.resolveFormulas(product.formulas, context)
 *   Result { frame_top_bottom: 864, shutter_width: 416, ... }
 *       ↓  formatOutput() on each value
 *   Final output with units + fraction + sut + inches
 *
 * =====================================================================
 */

'use strict';

import { parseToUnits, formatOutput } from '../measurement/measurementEngine.js';
import { resolveFormulas } from '../formulas/formulaEngine.js';
import { getProduct } from '../products/registry.js';

// ─── calculate ────────────────────────────────────────────────────────────────

/**
 * Runs a full dimension calculation for a product type.
 *
 * @param {string} productType
 *   e.g. 'sliding-window-2track'
 *
 * @param {Object.<string, string|number>} rawInputs
 *   Dimension inputs from user — values can be any accepted format:
 *   e.g. { width: "4 feet 6 inches", height: "3 feet 6 inches" }
 *   or   { width: 864, height: 672 }  (already in units)
 *
 * @param {Object.<string, number>} deductions
 *   Deduction values in internal units — must come from DB.
 *   e.g. { shutter_width_ded: 16, glass_width_ded: 20, ... }
 *
 * @returns {{
 *   productId    : string,
 *   productName  : string,
 *   inputs       : Object,     // parsed input values in units
 *   dimensions   : Object,     // each formula result with full formatting
 *   sections     : Array,      // section cut details (key, qty, cut size)
 * }}
 */
function calculate(productType, rawInputs, deductions) {

  // ── 1. Load and validate product ────────────────────────────────────────────
  const product = getProduct(productType);

  // ── 2. Validate all required inputs are present ─────────────────────────────
  const missingInputs = product.inputs
    .filter(i => i.required && !(i.key in rawInputs))
    .map(i => i.key);

  if (missingInputs.length > 0) {
    throw new Error(
      `Missing required inputs for "${product.name}": ${missingInputs.join(', ')}`
    );
  }

  // ── 3. Parse raw inputs → integer units ─────────────────────────────────────
  const parsedInputs = {};
  for (const inputDef of product.inputs) {
    const raw = rawInputs[inputDef.key];
    if (raw === undefined || raw === null) continue;

    const units = typeof raw === 'number' ? raw : parseToUnits(String(raw));
    if (units === null || (units === 0 && typeof raw === 'string' && raw.trim() !== '0')) {
      throw new Error(
        `Cannot parse input "${inputDef.key}": "${raw}" is not a valid measurement`
      );
    }
    if (!Number.isInteger(units) || units < 0) {
      throw new Error(
        `Input "${inputDef.key}" must be a positive integer in units, got: ${units}`
      );
    }
    parsedInputs[inputDef.key] = units;
  }

  // ── 4. Build evaluation context (with default deductions) ───────────────────
  const context = {
    ...parsedInputs,           // width, height (integers)
    ...product.deductions,     // fallback to product defaults
    ...deductions,             // override with DB deductions
  };

  // ── 5. Resolve all formulas via formula engine ──────────────────────────────
  // Convert array of {key, formula} to an object map
  const formulaMap = {};
  product.formulas.forEach(f => {
    formulaMap[f.key] = f.formula;
  });
  
  const rawResults = resolveFormulas(formulaMap, context);

  // ── 6. Format each result (units + fraction + sut + inches) ─────────────────
  const dimensions = {};
  for (const [key, units] of Object.entries(rawResults)) {
    dimensions[key] = {
      ...formatOutput(units),
      label: key,  // raw key for programmatic access
    };
  }

  // ── 7. Build section cut list ───────────────────────────────────────────────
  const sections = product.sections.map(section => {
    const dimResult = dimensions[section.formula_key];
    if (!dimResult) {
      throw new Error(
        `Section "${section.label}" references formula key ` +
        `"${section.formula_key}" which was not computed`
      );
    }
    return {
      sectionKey  : section.key,
      description : section.label,
      formulaKey  : section.formula_key,
      qty         : section.qty,
      cutSize     : dimResult,  // full formatOutput object
    };
  });

  // ── 8. Expose glass and hardware for material calculator ────────────────────
  return {
    productId   : product.id,
    productName : product.name,
    inputs      : parsedInputs,
    dimensions,
    sections,
    glassConfig : product.glass,
    hardwareConfig : product.hardware,
  };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export { calculate };
