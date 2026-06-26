import { useState, useCallback } from 'react';
import InlineEdit from '../components/InlineEdit.jsx';
import {
  getSections, updateSection,
  getHardwareItems, updateHardwareItem,
  getGlassRates, updateGlassRate,
  getDeductions, updateDeduction,
  getGlobalAluminiumRate, updateGlobalAluminiumRate,
  getProductPricing, updateProductPricing,
  resetToDefaults
} from '../services/dataStore.js';
import * as measurementEngine from '../core/measurement/measurementEngine.js';
const measEngine = measurementEngine.default || measurementEngine;
const { unitsToFraction } = measEngine;
import './AdminPage.css';

export default function AdminPage() {
  const [sections, setSections] = useState(() => getSections());
  const [hardware, setHardware] = useState(() => getHardwareItems());
  const [glass, setGlass] = useState(() => getGlassRates());
  const [pricing, setPricing] = useState(() => getProductPricing());
  const [deductions, setDeductions] = useState(() => getDeductions());
  const [globalAluminiumRate, setGlobalAluminiumRate] = useState(() => getGlobalAluminiumRate());

  const handleSectionChange = useCallback((name, fields) => {
    updateSection(name, fields);
    setSections(getSections());
  }, []);

  const handleHardwareChange = useCallback((id, fields) => {
    updateHardwareItem(id, fields);
    setHardware(getHardwareItems());
  }, []);

  const handleGlassChange = useCallback((id, fields) => {
    updateGlassRate(id, fields);
    setGlass(getGlassRates());
  }, []);

  const handlePricingChange = useCallback((id, fields) => {
    updateProductPricing(id, fields);
    setPricing(getProductPricing());
  }, []);

  const handleDeductionChange = useCallback((key, value) => {
    updateDeduction(key, value);
    setDeductions(getDeductions());
  }, []);

  const handleGlobalRateChange = useCallback((v) => {
    updateGlobalAluminiumRate(v);
    setGlobalAluminiumRate(getGlobalAluminiumRate());
  }, []);

  const handleReset = useCallback(() => {
    if (window.confirm("Are you sure you want to restore all defaults?")) {
      resetToDefaults();
      setSections(getSections());
      setHardware(getHardwareItems());
      setGlass(getGlassRates());
      setPricing(getProductPricing());
      setDeductions(getDeductions());
      setGlobalAluminiumRate(getGlobalAluminiumRate());
    }
  }, []);

  return (
    <div className="admin-page animate-in">
      <div className="admin-header">
        <h2>System Configuration</h2>
        <button className="btn-danger" onClick={handleReset}>Factory Reset</button>
      </div>

      <div className="admin-grid">

        {/* Global Market Rates */}
        <div className="admin-card">
          <div className="admin-card-header">Global Market Rates</div>
          <div className="admin-list">
            <div className="admin-list-row">
              <span>Aluminium Rate</span>
              <InlineEdit value={globalAluminiumRate} suffix=" ₹/kg" onSave={handleGlobalRateChange} />
            </div>
          </div>
        </div>

        {/* Aluminium Sections */}
        <div className="admin-card">
          <div className="admin-card-header">Aluminium Sections (Weights)</div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Section</th>
                <th>Bar Weight (kg/bar)</th>
                <th>Stock Length (ft)</th>
              </tr>
            </thead>
            <tbody>
              {sections.map(s => (
                <tr key={s.name}>
                  <td>{s.label}</td>
                  <td><InlineEdit value={s.weight_per_bar} onSave={v => handleSectionChange(s.name, { weight_per_bar: v })} /></td>
                  <td className="mono">{s.stock_length_ft}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Hardware Items */}
        <div className="admin-card">
          <div className="admin-card-header">Hardware & Accessories</div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Rate (₹)</th>
                <th>Unit</th>
                <th>Qty/Window</th>
              </tr>
            </thead>
            <tbody>
              {hardware.map(h => (
                <tr key={h.id}>
                  <td>{h.label}</td>
                  <td><InlineEdit value={h.rate_per_piece} onSave={v => handleHardwareChange(h.id, { rate_per_piece: v })} /></td>
                  <td className="mono">{h.unit}</td>
                  <td><InlineEdit value={h.qty_per_window} onSave={v => handleHardwareChange(h.id, { qty_per_window: v })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Glass Rates */}
        <div className="admin-card">
          <div className="admin-card-header">Glass Rates</div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Thickness</th>
                <th>Rate (₹/sqft)</th>
              </tr>
            </thead>
            <tbody>
              {glass.map(g => (
                <tr key={g.id}>
                  <td style={{textTransform: 'capitalize'}}>{g.glass_type}</td>
                  <td className="mono">{g.thickness}</td>
                  <td><InlineEdit value={g.rate_per_sqft} onSave={v => handleGlassChange(g.id, { rate_per_sqft: v })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Window Selling Rates */}
        <div className="admin-card">
          <div className="admin-card-header">Window Selling Rates</div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product Type</th>
                <th>Selling Rate (₹/sqft)</th>
              </tr>
            </thead>
            <tbody>
              {pricing.map(p => (
                <tr key={p.id}>
                  <td>{p.label}</td>
                  <td><InlineEdit value={p.rate_per_sqft} onSave={v => handlePricingChange(p.id, { rate_per_sqft: v })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Structural Deductions */}
        <div className="admin-card">
          <div className="admin-card-header">Structural Deductions (2-Track Sliding)</div>
          <div className="admin-list">
            {Object.entries(deductions).map(([key, val]) => {
              const frac = val === 0 ? '0"' : `${unitsToFraction(val)}"`;
              return (
                <div className="admin-list-row" key={key}>
                  <div>
                    <div style={{fontSize: '12px', color: 'var(--text-primary)'}}>{key}</div>
                    <div style={{fontSize: '10px', color: 'var(--text-muted)'}} className="mono">{frac}</div>
                  </div>
                  <InlineEdit value={val} suffix=" u" onSave={v => handleDeductionChange(key, Math.round(v))} />
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
