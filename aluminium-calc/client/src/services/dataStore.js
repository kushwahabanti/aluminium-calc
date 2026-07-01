/**
 * dataStore.js
 * =====================================================================
 * In-memory data store that mirrors the DB schema.
 * Initialized by the AuthContext when a user logs in.
 * =====================================================================
 */

import slidingWindow from '../../../shared/products/types/slidingWindow2Track.js';

let _store = null;
let _onStoreUpdate = null; // Callback to save to backend

export function getDefaults() {
  return {
    globalAluminiumRate: 180,
    deductions: { ...slidingWindow.deductions },

    sections: [
      { name: 'top_track',      label: 'Top Track',      weight_per_bar: 3.50, stock_length_ft: 16 },
      { name: 'bottom_track',   label: 'Bottom Track',   weight_per_bar: 4.50, stock_length_ft: 16 },
      { name: 'side_track',     label: 'Side Track',     weight_per_bar: 3.50, stock_length_ft: 16 },
      { name: 'handle',         label: 'Handle',         weight_per_bar: 4.00, stock_length_ft: 16 },
      { name: 'interlock',      label: 'Interlock',      weight_per_bar: 3.80, stock_length_ft: 16 },
      { name: 'shutter_top',    label: 'Shutter Top',    weight_per_bar: 3.20, stock_length_ft: 16 },
      { name: 'bearing_bottom', label: 'Bearing Bottom', weight_per_bar: 3.80, stock_length_ft: 16 },
    ],

    glassRates: [
      { id: 'clear_5mm', glass_type: 'clear', thickness: '5mm', rate_per_sqft: 65 },
      { id: 'tinted_5mm', glass_type: 'tinted', thickness: '5mm', rate_per_sqft: 75 },
    ],

    hardwareItems: [
      { id: 'roller',        name: 'roller',        label: 'Roller',        qty_per_window: 4, rate_per_piece: 25,  unit: 'piece' },
      { id: 'lock',          name: 'lock',          label: 'Lock',          qty_per_window: 1, rate_per_piece: 120, unit: 'piece' },
      { id: 'rubber_gasket', name: 'rubber_gasket', label: 'Rubber Gasket', qty_per_window: 1, rate_per_piece: 15,  unit: 'per_foot' },
      { id: 'woolpile',      name: 'woolpile',      label: 'Wool Pile',     qty_per_window: 1, rate_per_piece: 8,   unit: 'per_foot' },
    ],

    productPricing: [
      { id: 'sliding-window-2track', label: '2-Track Sliding Window', rate_per_sqft: 350 },
      { id: 'sliding-window-3track', label: '3-Track Sliding Window', rate_per_sqft: 450 },
      { id: 'casement-window',       label: 'Casement Window',        rate_per_sqft: 400 },
    ],
  };
}

export function initStore(config, onUpdate) {
  _store = { ...getDefaults() };
  if (config && Object.keys(config).length > 0) {
    _store = { ..._store, ...config };
  }
  _onStoreUpdate = onUpdate;
}

export function getFullConfig() {
  return _store ? { ..._store } : getDefaults();
}

function _load() {
  return _store || getDefaults();
}

function _save() {
  if (_onStoreUpdate && _store) {
    _onStoreUpdate(_store);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getDeductions() {
  return { ..._load().deductions };
}

export function updateDeduction(key, valueUnits) {
  if (!_store) _store = getDefaults();
  _store.deductions[key] = valueUnits;
  _save();
}

export function getSections() {
  return [..._load().sections];
}

export function updateSection(name, fields) {
  if (!_store) _store = getDefaults();
  const idx   = _store.sections.findIndex(s => s.name === name);
  if (idx >= 0) _store.sections[idx] = { ..._store.sections[idx], ...fields };
  _save();
}

export function getGlassRates() {
  return [..._load().glassRates];
}

export function updateGlassRate(id, fields) {
  if (!_store) _store = getDefaults();
  const idx = _store.glassRates.findIndex(g => g.id === id);
  if (idx >= 0) _store.glassRates[idx] = { ..._store.glassRates[idx], ...fields };
  _save();
}

export function getHardwareItems() {
  return [..._load().hardwareItems];
}

export function updateHardwareItem(id, fields) {
  if (!_store) _store = getDefaults();
  const idx = _store.hardwareItems.findIndex(h => h.id === id);
  if (idx >= 0) _store.hardwareItems[idx] = { ..._store.hardwareItems[idx], ...fields };
  _save();
}

export function getProductPricing() {
  return [..._load().productPricing];
}

export function updateProductPricing(id, fields) {
  if (!_store) _store = getDefaults();
  const idx = _store.productPricing.findIndex(p => p.id === id);
  if (idx >= 0) _store.productPricing[idx] = { ..._store.productPricing[idx], ...fields };
  _save();
}

export function getGlobalAluminiumRate() {
  return _load().globalAluminiumRate ?? 180;
}

export function updateGlobalAluminiumRate(rate) {
  if (!_store) _store = getDefaults();
  _store.globalAluminiumRate = rate;
  _save();
}

export function resetToDefaults() {
  _store = getDefaults();
  _save();
}

