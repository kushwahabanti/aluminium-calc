/**
 * schema.js
 * =====================================================================
 * Aluminium Fabrication Calculator — SQLite Schema + Seed Data
 * =====================================================================
 *
 * TABLES
 * ─────────────────────────────────────────────────────────────────────
 *   aluminium_sections   → section specs: weight/rate (admin editable)
 *   glass_rates          → glass type + thickness + rate (admin editable)
 *   hardware_items       → hardware items + qty + rate (admin editable)
 *   margin_config        → profit margin presets (admin editable)
 *   deductions           → per-product deduction values (admin editable)
 *
 * ALL values are editable from the Admin Panel.
 * Seed values are defaults — not hardcoded in business logic.
 * =====================================================================
 */

'use strict';

// ─── CREATE TABLE statements ──────────────────────────────────────────────────

const CREATE_TABLES = `

  -- Aluminium sections: one row per section type per product
  -- weight_per_ft and rate_per_kg change frequently — admin editable
  CREATE TABLE IF NOT EXISTS aluminium_sections (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL UNIQUE,
    label           TEXT    NOT NULL,
    weight_per_ft   REAL    NOT NULL,
    rate_per_kg     REAL    NOT NULL,
    stock_length_ft REAL    NOT NULL DEFAULT 15,
    updated_at      TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  -- Glass types and rates — admin editable
  CREATE TABLE IF NOT EXISTS glass_rates (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    glass_type    TEXT NOT NULL,
    thickness     TEXT NOT NULL,
    rate_per_sqft REAL NOT NULL,
    updated_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(glass_type, thickness)
  );

  -- Hardware items per window — qty and rate are admin editable
  CREATE TABLE IF NOT EXISTS hardware_items (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL UNIQUE,
    label           TEXT    NOT NULL,
    qty_per_window  REAL    NOT NULL DEFAULT 1,
    rate_per_piece  REAL    NOT NULL,
    unit            TEXT    NOT NULL DEFAULT 'piece',
    updated_at      TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  -- Profit margin presets — admin editable
  CREATE TABLE IF NOT EXISTS margin_config (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    label       TEXT NOT NULL UNIQUE,
    percentage  REAL NOT NULL
  );

  -- Deduction values per product type — admin editable
  -- value_units: measurement in internal units (16 units = 1 inch)
  CREATE TABLE IF NOT EXISTS deductions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    product_type_id TEXT    NOT NULL,
    deduction_key   TEXT    NOT NULL,
    value_units     INTEGER NOT NULL,
    label           TEXT    NOT NULL,
    updated_at      TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_type_id, deduction_key)
  );

  -- Saved projects (snapshot of inputs + results + rates at time of save)
  CREATE TABLE IF NOT EXISTS projects (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL,
    product_type_id TEXT    NOT NULL,
    inputs_json     TEXT    NOT NULL,
    deductions_json TEXT    NOT NULL,
    results_json    TEXT    NOT NULL,
    rates_json      TEXT    NOT NULL,
    created_at      TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`;

// ─── SEED DATA ────────────────────────────────────────────────────────────────
// These are default values. Admin can update all of them.

const SEED = {

  aluminium_sections: [
    { name: 'frame',     label: 'Frame',     weight_per_ft: 1.20, rate_per_kg: 180, stock_length_ft: 15 },
    { name: 'shutter',   label: 'Shutter',   weight_per_ft: 0.90, rate_per_kg: 175, stock_length_ft: 15 },
    { name: 'interlock', label: 'Interlock', weight_per_ft: 0.60, rate_per_kg: 170, stock_length_ft: 15 },
    { name: 'beading',   label: 'Beading',   weight_per_ft: 0.40, rate_per_kg: 165, stock_length_ft: 15 },
  ],

  glass_rates: [
    { glass_type: 'clear',  thickness: '4mm', rate_per_sqft: 45 },
    { glass_type: 'clear',  thickness: '5mm', rate_per_sqft: 55 },
    { glass_type: 'tinted', thickness: '4mm', rate_per_sqft: 65 },
    { glass_type: 'tinted', thickness: '5mm', rate_per_sqft: 80 },
  ],

  hardware_items: [
    { name: 'roller',   label: 'Roller',          qty_per_window: 4, rate_per_piece: 25,  unit: 'piece' },
    { name: 'lock',     label: 'Lock',             qty_per_window: 1, rate_per_piece: 120, unit: 'piece' },
    { name: 'woolpile', label: 'Wool Pile (ft)',   qty_per_window: 1, rate_per_piece: 8,   unit: 'per_foot' },
    { name: 'handle',   label: 'Handle',           qty_per_window: 2, rate_per_piece: 45,  unit: 'piece' },
  ],

  margin_config: [
    { label: 'default', percentage: 20 },
    { label: 'minimum', percentage: 10 },
    { label: 'premium', percentage: 35 },
  ],

  // Deductions for 2-track sliding window (in internal units, 16 units = 1 inch)
  deductions: [
    {
      product_type_id: 'sliding-window-2track',
      deduction_key:   'frame_width_ded',
      value_units:     0,
      label:           'Frame Width Deduction',
    },
    {
      product_type_id: 'sliding-window-2track',
      deduction_key:   'frame_height_ded',
      value_units:     0,
      label:           'Frame Height Deduction',
    },
    {
      product_type_id: 'sliding-window-2track',
      deduction_key:   'shutter_width_ded',
      value_units:     16,   // 1 inch
      label:           'Shutter Width Deduction',
    },
    {
      product_type_id: 'sliding-window-2track',
      deduction_key:   'shutter_height_ded',
      value_units:     24,   // 1.5 inch
      label:           'Shutter Height Deduction',
    },
    {
      product_type_id: 'sliding-window-2track',
      deduction_key:   'glass_width_ded',
      value_units:     20,   // 1.25 inch
      label:           'Glass Width Deduction',
    },
    {
      product_type_id: 'sliding-window-2track',
      deduction_key:   'glass_height_ded',
      value_units:     20,   // 1.25 inch
      label:           'Glass Height Deduction',
    },
  ],
};

module.exports = { CREATE_TABLES, SEED };
