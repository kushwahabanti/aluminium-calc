/**
 * registry.js
 * =====================================================================
 * Aluminium Fabrication Calculator — Product Registry
 * =====================================================================
 *
 * Master list of all available product types.
 * To add a new product:
 *   1. Create its module in ./types/
 *   2. Add one line to the registry map below
 *   3. Nothing else changes
 *
 * =====================================================================
 */

'use strict';

import { validateProduct } from './baseProduct.js';

import slidingWindow2Track from './types/slidingWindow2Track.js';

// ─── Registry Map ─────────────────────────────────────────────────────────────
// key   → the product type ID string (used in DB and UI dropdowns)
// value → the product module (validated on load)

const REGISTRY_MAP = {
  'sliding-window-2track': slidingWindow2Track,
  // Future product types — add here when ready:
  // 'sliding-window-3track': require('./types/slidingWindow3Track'),
  // 'openable-window':       require('./types/openableWindow'),
  // 'sliding-door':          require('./types/slidingDoor'),
  // 'openable-door':         require('./types/openableDoor'),
  // 'fixed-window':          require('./types/fixedWindow'),
};

// ─── Validate all registered products on startup ──────────────────────────────
// This catches contract violations at load time, not at calculation time.
for (const [id, product] of Object.entries(REGISTRY_MAP)) {
  try {
    validateProduct(product);
  } catch (err) {
    throw new Error(`[Registry] Product "${id}" failed validation: ${err.message}`);
  }
}

// ─── getProduct ───────────────────────────────────────────────────────────────

/**
 * Returns a product module by its type ID.
 *
 * @param  {string} type   e.g. 'sliding-window-2track'
 * @returns {Object}       The validated product module
 * @throws  {Error}        If the type is not registered
 */
function getProduct(type) {
  if (!type || typeof type !== 'string') {
    throw new Error('Product type must be a non-empty string');
  }
  const product = REGISTRY_MAP[type];
  if (!product) {
    const available = Object.keys(REGISTRY_MAP).join(', ');
    throw new Error(
      `Unknown product type: "${type}". Available: [${available}]`
    );
  }
  return product;
}

// ─── listProducts ─────────────────────────────────────────────────────────────

/**
 * Returns a summary list of all registered products (for UI dropdowns).
 *
 * @returns {{ id, name, description }[]}
 */
function listProducts() {
  return Object.values(REGISTRY_MAP).map(p => ({
    id         : p.id,
    name       : p.name,
    description: p.description,
  }));
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export {
  getProduct,
  listProducts,
  // Expose raw map for advanced use (e.g. seeding DB)
  REGISTRY_MAP,
};
