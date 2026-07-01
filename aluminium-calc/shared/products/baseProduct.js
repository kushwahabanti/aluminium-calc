/**
 * baseProduct.js
 * =====================================================================
 * Aluminium Fabrication Calculator — Base Product Interface Contract
 * =====================================================================
 *
 * Every product module (slidingWindow2Track, openableWindow, etc.)
 * MUST export an object that matches this shape exactly.
 *
 * This file serves as:
 *   1. Documentation of the contract
 *   2. A runtime validator — call validateProduct(module) on load
 *
 * =====================================================================
 */

'use strict';

/**
 * The shape every product module must follow.
 *
 * id          → unique machine key, used in DB and registry
 * name        → human-readable label shown in UI
 * description → short description shown in UI
 *
 * inputs      → list of fields the UI must ask the user for
 *               { key, label, required, default? }
 *
 * formulas    → map of output name → formula string
 *               All variable names in formulas must be either:
 *                 (a) an input key, OR
 *                 (b) a deduction key (comes from DB), OR
 *                 (c) a previously computed formula result
 *               NO hardcoded numbers inside formulas except structural
 *               constants like "/ 2" for track division.
 *
 * deductionKeys → list of deduction variable names this product needs.
 *               These values come from DB (admin-editable).
 *               Calculator will verify all are supplied before running.
 *
 * sections    → list of aluminium sections this product uses.
 *               { key, formulaKey, qty, description }
 *               key        → matches a section in DB aluminium_sections table
 *               formulaKey → which formula result gives the cut length
 *               qty        → how many pieces of this section per window
 *
 * outputSections → ordered list of section groups for the output/PDF
 */

// ─── Required field names that every product module must have ────────────────

const REQUIRED_FIELDS = [
  'id',
  'name',
  'description',
  'inputs',
  'formulas',
  'deductions',
  'sections',
  'glass',
  'hardware',
  'outputSections',
];

// ─── validateProduct ─────────────────────────────────────────────────────────

/**
 * Validates that a product module matches the base contract.
 * Called by registry.js when loading any product.
 *
 * @param  {Object} product  The exported product module object
 * @throws {Error}           If the product is missing required fields
 */
function validateProduct(product) {
  if (!product || typeof product !== 'object') {
    throw new Error('Product module must export a plain object');
  }

  // Check all required top-level fields exist
  for (const field of REQUIRED_FIELDS) {
    if (!(field in product)) {
      throw new Error(
        `Product module "${product.id || '?'}" is missing required field: "${field}"`
      );
    }
  }

  // inputs must be array of { key, label, required }
  if (!Array.isArray(product.inputs) || product.inputs.length === 0) {
    throw new Error(`Product "${product.id}": inputs must be a non-empty array`);
  }

  // formulas must be an array of { key, formula }
  if (!Array.isArray(product.formulas) || product.formulas.length === 0) {
    throw new Error(`Product "${product.id}": formulas must be a non-empty array`);
  }
  for (const f of product.formulas) {
    if (!f.key || !f.formula || typeof f.formula !== 'string') {
      throw new Error(`Product "${product.id}": each formula must have key and formula string`);
    }
  }

  // deductions must be an object
  if (typeof product.deductions !== 'object') {
    throw new Error(`Product "${product.id}": deductions must be an object`);
  }

  // sections must be array of { key, formula_key, qty, label }
  if (!Array.isArray(product.sections) || product.sections.length === 0) {
    throw new Error(`Product "${product.id}": sections must be a non-empty array`);
  }
  for (const section of product.sections) {
    if (!section.key || !section.formula_key || typeof section.qty !== 'number') {
      throw new Error(
        `Product "${product.id}": each section must have key, formula_key, qty. ` +
        `Got: ${JSON.stringify(section)}`
      );
    }
  }

  return true; // valid
}

export { validateProduct, REQUIRED_FIELDS };
