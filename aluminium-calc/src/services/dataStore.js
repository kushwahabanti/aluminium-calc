/**
 * dataStore.js
 * =====================================================================
 * Browser-compatible data store that mirrors the DB schema.
 * Uses localStorage for persistence in the browser evaluation UI.
 *
 * When Electron IPC is added, this module will be replaced with
 * calls to the main process (which uses db.js directly).
 *
 * This keeps the architecture clean — the UI never knows where data
 * comes from. It just calls dataStore.getDeductions() etc.
 * =====================================================================
 */

import * as slidingWindowModule from '../core/products/types/slidingWindow2Track.js';
const slidingWindow = slidingWindowModule.default || slidingWindowModule;
const STORAGE_KEY = 'aluminium-calc-store';

// ─── Default store shape ──────────────────────────────────────────────────────

function getDefaults() {
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

// ─── Persistence ──────────────────────────────────────────────────────────────

function _load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaults();
    return { ...getDefaults(), ...JSON.parse(raw) };
  } catch {
    return getDefaults();
  }
}

function _save(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch { /* ignore */ }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getDeductions() {
  return { ..._load().deductions };
}

export function updateDeduction(key, valueUnits) {
  const store = _load();
  store.deductions[key] = valueUnits;
  _save(store);
}

export function getSections() {
  return [..._load().sections];
}

export function updateSection(name, fields) {
  const store = _load();
  const idx   = store.sections.findIndex(s => s.name === name);
  if (idx >= 0) store.sections[idx] = { ...store.sections[idx], ...fields };
  _save(store);
}

export function getGlassRates() {
  return [..._load().glassRates];
}

export function updateGlassRate(id, fields) {
  const store = _load();
  const idx = store.glassRates.findIndex(g => g.id === id);
  if (idx >= 0) store.glassRates[idx] = { ...store.glassRates[idx], ...fields };
  _save(store);
}

export function getHardwareItems() {
  return [..._load().hardwareItems];
}

export function updateHardwareItem(id, fields) {
  const store = _load();
  const idx = store.hardwareItems.findIndex(h => h.id === id);
  if (idx >= 0) store.hardwareItems[idx] = { ...store.hardwareItems[idx], ...fields };
  _save(store);
}

export function getProductPricing() {
  return [..._load().productPricing];
}

export function updateProductPricing(id, fields) {
  const store = _load();
  const idx = store.productPricing.findIndex(p => p.id === id);
  if (idx >= 0) store.productPricing[idx] = { ...store.productPricing[idx], ...fields };
  _save(store);
}

export function getGlobalAluminiumRate() {
  return _load().globalAluminiumRate ?? 180;
}

export function updateGlobalAluminiumRate(rate) {
  const store = _load();
  store.globalAluminiumRate = rate;
  _save(store);
}

export function resetToDefaults() {
  localStorage.removeItem(STORAGE_KEY);
}
