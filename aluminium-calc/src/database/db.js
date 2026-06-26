/**
 * db.js
 * =====================================================================
 * Aluminium Fabrication Calculator — SQLite Database Layer
 * Uses sql.js (pure JavaScript SQLite — no native build tools needed)
 * =====================================================================
 */

'use strict';

const fs          = require('fs');
const path        = require('path');
const initSqlJs   = require('sql.js');
const { CREATE_TABLES, SEED } = require('./schema');

// ─── Module state ─────────────────────────────────────────────────────────────

let _db      = null;
let _dbPath  = null;
let _SQL     = null;

// ─── initDb ───────────────────────────────────────────────────────────────────

async function initDb(dbPath) {
  if (_db) return _db;

  _dbPath = dbPath || path.join(__dirname, '..', '..', 'aluminium-calc.db');
  _SQL    = await initSqlJs();

  // Load existing DB from disk or create fresh
  if (fs.existsSync(_dbPath)) {
    const fileBuffer = fs.readFileSync(_dbPath);
    _db = new _SQL.Database(fileBuffer);
  } else {
    _db = new _SQL.Database();
  }

  // Create tables
  _db.run(CREATE_TABLES);

  // Seed if empty
  _seedIfEmpty();

  // Persist to disk immediately
  _persist();

  return _db;
}

// ─── Persist ──────────────────────────────────────────────────────────────────

function _persist() {
  if (!_db || !_dbPath) return;
  const data = _db.export();
  const buf  = Buffer.from(data);
  fs.writeFileSync(_dbPath, buf);
}

// ─── Seed ─────────────────────────────────────────────────────────────────────

function _seedIfEmpty() {
  const result = _db.exec('SELECT COUNT(*) as n FROM aluminium_sections');
  const count  = result[0]?.values[0][0] ?? 0;
  if (count > 0) return;

  for (const r of SEED.aluminium_sections) {
    _db.run(
      `INSERT OR IGNORE INTO aluminium_sections (name,label,weight_per_ft,rate_per_kg,stock_length_ft)
       VALUES (?,?,?,?,?)`,
      [r.name, r.label, r.weight_per_ft, r.rate_per_kg, r.stock_length_ft]
    );
  }
  for (const r of SEED.glass_rates) {
    _db.run(
      `INSERT OR IGNORE INTO glass_rates (glass_type,thickness,rate_per_sqft) VALUES (?,?,?)`,
      [r.glass_type, r.thickness, r.rate_per_sqft]
    );
  }
  for (const r of SEED.hardware_items) {
    _db.run(
      `INSERT OR IGNORE INTO hardware_items (name,label,qty_per_window,rate_per_piece,unit)
       VALUES (?,?,?,?,?)`,
      [r.name, r.label, r.qty_per_window, r.rate_per_piece, r.unit]
    );
  }
  for (const r of SEED.margin_config) {
    _db.run(
      `INSERT OR IGNORE INTO margin_config (label,percentage) VALUES (?,?)`,
      [r.label, r.percentage]
    );
  }
  for (const r of SEED.deductions) {
    _db.run(
      `INSERT OR IGNORE INTO deductions (product_type_id,deduction_key,value_units,label)
       VALUES (?,?,?,?)`,
      [r.product_type_id, r.deduction_key, r.value_units, r.label]
    );
  }
}

// ─── Query helper ─────────────────────────────────────────────────────────────

function _all(sql, params = []) {
  const result = _db.exec(sql, params);
  if (!result.length) return [];
  const { columns, values } = result[0];
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

function _get(sql, params = []) {
  const rows = _all(sql, params);
  return rows[0] ?? null;
}

function _requireInit() {
  if (!_db) throw new Error('Database not initialised. Call initDb() first.');
}

// ─── ALUMINIUM SECTIONS ───────────────────────────────────────────────────────

function getSections() {
  _requireInit();
  return _all('SELECT * FROM aluminium_sections ORDER BY id');
}

function getSectionByName(name) {
  _requireInit();
  return _get('SELECT * FROM aluminium_sections WHERE name = ?', [name]);
}

function updateSection(name, fields) {
  _requireInit();
  const allowed = ['weight_per_ft', 'rate_per_kg', 'stock_length_ft', 'label'];
  const valid   = Object.keys(fields).filter(k => allowed.includes(k));
  if (!valid.length) throw new Error('No valid fields to update');
  const sets = valid.map(k => `${k} = ?`).join(', ');
  _db.run(
    `UPDATE aluminium_sections SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE name = ?`,
    [...valid.map(k => fields[k]), name]
  );
  _persist();
}

// ─── GLASS RATES ─────────────────────────────────────────────────────────────

function getGlassRates() {
  _requireInit();
  return _all('SELECT * FROM glass_rates ORDER BY glass_type, thickness');
}

function getGlassRate(glassType, thickness) {
  _requireInit();
  return _get('SELECT * FROM glass_rates WHERE glass_type = ? AND thickness = ?', [glassType, thickness]);
}

function updateGlassRate(id, fields) {
  _requireInit();
  const allowed = ['rate_per_sqft'];
  const valid   = Object.keys(fields).filter(k => allowed.includes(k));
  if (!valid.length) throw new Error('No valid fields to update');
  const sets = valid.map(k => `${k} = ?`).join(', ');
  _db.run(`UPDATE glass_rates SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [...valid.map(k => fields[k]), id]);
  _persist();
}

// ─── HARDWARE ITEMS ───────────────────────────────────────────────────────────

function getHardwareItems() {
  _requireInit();
  return _all('SELECT * FROM hardware_items ORDER BY id');
}

function updateHardwareItem(id, fields) {
  _requireInit();
  const allowed = ['label', 'qty_per_window', 'rate_per_piece', 'unit'];
  const valid   = Object.keys(fields).filter(k => allowed.includes(k));
  if (!valid.length) throw new Error('No valid fields to update');
  const sets = valid.map(k => `${k} = ?`).join(', ');
  _db.run(`UPDATE hardware_items SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [...valid.map(k => fields[k]), id]);
  _persist();
}

// ─── MARGIN CONFIG ────────────────────────────────────────────────────────────

function getMargins() {
  _requireInit();
  return _all('SELECT * FROM margin_config ORDER BY id');
}

function getMargin(label) {
  _requireInit();
  return _get('SELECT * FROM margin_config WHERE label = ?', [label]);
}

function updateMargin(label, percentage) {
  _requireInit();
  if (typeof percentage !== 'number' || percentage < 0 || percentage > 100)
    throw new Error(`Invalid margin %: ${percentage}`);
  _db.run('UPDATE margin_config SET percentage = ? WHERE label = ?', [percentage, label]);
  _persist();
}

// ─── DEDUCTIONS ───────────────────────────────────────────────────────────────

function getDeductions(productTypeId) {
  _requireInit();
  const rows = _all(
    'SELECT deduction_key, value_units FROM deductions WHERE product_type_id = ?',
    [productTypeId]
  );
  if (!rows.length) throw new Error(`No deductions found for: "${productTypeId}"`);
  const map = {};
  for (const row of rows) map[row.deduction_key] = row.value_units;
  return map;
}

function getDeductionRows(productTypeId) {
  _requireInit();
  return _all(
    'SELECT * FROM deductions WHERE product_type_id = ? ORDER BY id',
    [productTypeId]
  );
}

function updateDeduction(productTypeId, key, valueUnits) {
  _requireInit();
  if (!Number.isInteger(valueUnits) || valueUnits < 0)
    throw new Error(`Deduction must be non-negative integer, got: ${valueUnits}`);
  _db.run(
    `UPDATE deductions SET value_units = ?, updated_at = CURRENT_TIMESTAMP
     WHERE product_type_id = ? AND deduction_key = ?`,
    [valueUnits, productTypeId, key]
  );
  _persist();
}

// ─── PROJECTS ─────────────────────────────────────────────────────────────────

function saveProject({ name, productTypeId, inputs, deductions, results, rates }) {
  _requireInit();
  _db.run(
    `INSERT INTO projects (name,product_type_id,inputs_json,deductions_json,results_json,rates_json)
     VALUES (?,?,?,?,?,?)`,
    [name, productTypeId, JSON.stringify(inputs), JSON.stringify(deductions),
     JSON.stringify(results), JSON.stringify(rates)]
  );
  // sql.js: last_insert_rowid() works but must be called immediately after run()
  const res = _db.exec('SELECT last_insert_rowid()');
  const id  = res[0]?.values[0][0] ?? null;
  _persist();
  return id;
}

function getProjects() {
  _requireInit();
  return _all('SELECT id,name,product_type_id,created_at FROM projects ORDER BY created_at DESC');
}

function getProject(id) {
  _requireInit();
  const row = _get('SELECT * FROM projects WHERE id = ?', [id]);
  if (!row) throw new Error(`Project not found: id=${id}`);
  return {
    ...row,
    inputs     : JSON.parse(row.inputs_json),
    deductions : JSON.parse(row.deductions_json),
    results    : JSON.parse(row.results_json),
    rates      : JSON.parse(row.rates_json),
  };
}

function deleteProject(id) {
  _requireInit();
  _db.run('DELETE FROM projects WHERE id = ?', [id]);
  _persist();
}

// ─── CLOSE ────────────────────────────────────────────────────────────────────

function closeDb() {
  if (_db) { _db.close(); _db = null; _dbPath = null; }
}

function _resetForTest() { closeDb(); }

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  initDb, closeDb, _resetForTest,
  getSections, getSectionByName, updateSection,
  getGlassRates, getGlassRate, updateGlassRate,
  getHardwareItems, updateHardwareItem,
  getMargins, getMargin, updateMargin,
  getDeductions, getDeductionRows, updateDeduction,
  saveProject, getProjects, getProject, deleteProject,
};
