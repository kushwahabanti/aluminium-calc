import { useState, useMemo, useCallback, useEffect } from 'react';
import * as calculatorModule from '../core/calculators/calculator.js';
const calcEngine = calculatorModule.default || calculatorModule;
const { calculate } = calcEngine;

import * as measurementEngine from '../core/measurement/measurementEngine.js';
const measEngine = measurementEngine.default || measurementEngine;
const { parseToUnits, unitsToFraction, unitsToSut } = measEngine;

import {
  getDeductions,
  getSections,
  getHardwareItems,
  getGlassRates,
  getProductPricing,
  getGlobalAluminiumRate,
} from '../services/dataStore.js';
import * as materialCalculatorModule from '../core/calculators/materialCalculator.js';
const matCalc = materialCalculatorModule.default || materialCalculatorModule;
const { calculateMaterials } = matCalc;

import * as costCalculatorModule from '../core/calculators/costCalculator.js';
const costCalc = costCalculatorModule.default || costCalculatorModule;
const { calculateCosts, calculatePricing } = costCalc;

import { downloadPDF } from '../core/export/pdfGenerator.js';
import './CalculatorPage.css';

// ── Dimension input with live parse feedback ──────────────────────────────────
function DimensionInput({ id, label, value, onChange }) {
  const parsed = useMemo(() => {
    if (!value.trim()) return null;
    try {
      const units = parseToUnits(value);
      if (!units || units === 0) return { error: 'Cannot parse — try "4 feet 6 inches" or "54"' };
      return { units, fraction: unitsToFraction(units), sut: unitsToSut(units) };
    } catch { return { error: 'Invalid format' }; }
  }, [value]);

  const isValid = parsed && !parsed?.error;
  const hasErr  = parsed?.error;

  return (
    <div className={`dim-input-wrap ${hasErr ? 'has-error' : ''} ${isValid ? 'is-valid' : ''}`}>
      <label className="dim-label" htmlFor={id}>{label}</label>
      <div className="dim-input-row">
        <input
          id={id} type="text" className="dim-input"
          value={value} onChange={e => onChange(e.target.value)}
          placeholder={"e.g. 4 feet 6 inches  or  54  or  4'6\""}
          autoComplete="off" spellCheck="false"
        />
        <span className={`dim-status-icon ${isValid ? 'valid' : ''} ${hasErr ? 'error' : ''}`}>
          {isValid && <CheckIcon />}{hasErr && <XIcon />}
        </span>
      </div>
      {isValid && (
        <div className="dim-preview">
          <span className="preview-chip"><span className="chip-label">Fraction</span><span className="chip-value mono">{parsed.fraction}"</span></span>
          <span className="preview-chip"><span className="chip-label">Sut</span><span className="chip-value mono">{parsed.sut}</span></span>
          <span className="preview-chip"><span className="chip-label">Units</span><span className="chip-value mono">{parsed.units}</span></span>
        </div>
      )}
      {hasErr && <p className="dim-error">{parsed.error}</p>}
    </div>
  );
}

// ── Main Calculator Page ──────────────────────────────────────────────────────
export default function CalculatorPage() {
  const [width,      setWidth]      = useState('');
  const [height,     setHeight]     = useState('');
  
  // Project list state (array of windows)
  const [projectList, setProjectList] = useState(() => {
    const saved = localStorage.getItem('aluminium-calc-project');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('aluminium-calc-project', JSON.stringify(projectList));
  }, [projectList]);

  const [deductions] = useState(() => getDeductions());
  const [sections]   = useState(() => getSections());
  const [hardware]   = useState(() => getHardwareItems());
  const [glassRates] = useState(() => getGlassRates());
  const [pricingConfig] = useState(() => getProductPricing());
  const [globalAluminiumRate] = useState(() => getGlobalAluminiumRate());

  const handleAddWindow = () => {
    if (!width.trim() || !height.trim()) return;
    const newWindow = {
      id: Date.now().toString(),
      label: `Window #${projectList.length + 1}`,
      width: width.trim(),
      height: height.trim()
    };
    setProjectList([...projectList, newWindow]);
    setWidth('');
    setHeight('');
  };

  const handleRemoveWindow = (id) => {
    const filtered = projectList.filter(w => w.id !== id);
    // Renumber remaining windows
    const renumbered = filtered.map((w, index) => ({
      ...w,
      label: `Window #${index + 1}`
    }));
    setProjectList(renumbered);
  };

  const projectResult = useMemo(() => {
    if (projectList.length === 0) return null;
    try {
      const windowResults = [];
      const ratesData = { sections, hardwareItems: hardware, globalAluminiumRate };
      const defaultGlass = glassRates.find(g => g.glass_type === 'clear' && g.thickness === '5mm') || glassRates[0];

      // Calculate each window individually
      let totalAreaSqFt = 0;
      projectList.forEach(w => {
        const calcData = calculate('sliding-window-2track', { width: w.width, height: w.height }, deductions);
        calcData.windowLabel = w.label;
        calcData.windowId = w.id;
        windowResults.push(calcData);
      });

      // Pass array of all calc results to calculateMaterials
      const materials = calculateMaterials(windowResults, ratesData, 10);
      const costs = calculateCosts(materials, ratesData, defaultGlass);
      
      const productRateConfig = pricingConfig.find(p => p.id === 'sliding-window-2track') || { rate_per_sqft: 350 };
      const pricing = calculatePricing(costs.totals.materialOnly, materials.totals.windowAreaSqFt, productRateConfig.rate_per_sqft);
      
      return { windowResults, materials, costs, pricing };
    } catch (e) {
      return { error: e.message };
    }
  }, [projectList, deductions, sections, hardware, glassRates, pricingConfig, globalAluminiumRate]);

  const hasResult = projectResult?.windowResults && projectResult.windowResults.length > 0;
  const hasError  = projectResult?.error;

  return (
    <div className="calc-page">
      {/* ── Left Sidebar ─────────────────────────────── */}
      <aside className="calc-sidebar">
        {/* Inputs */}
        <div className="sidebar-card">
          <div className="sidebar-card-header">
            <RulerIcon />
            <div>
              <h2 className="section-title">Add Window</h2>
              <p className="section-sub">Enter dimensions to add to project</p>
            </div>
          </div>
          <div className="inputs-stack">
            <DimensionInput id="width"  label="Overall Width"  value={width}  onChange={setWidth}  />
            <DimensionInput id="height" label="Overall Height" value={height} onChange={setHeight} />
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button className="btn-primary" style={{ flex: 1 }} onClick={handleAddWindow} disabled={!width || !height}>
              + Add to Project
            </button>
            {(width || height) && (
              <button className="btn-clear" onClick={() => { setWidth(''); setHeight(''); }}>
                <XIcon />
              </button>
            )}
          </div>
        </div>

        {/* Project List */}
        {projectList.length > 0 && (
          <div className="sidebar-card" style={{ marginTop: '16px' }}>
            <div className="sidebar-card-header">
              <WindowIconSmall />
              <div>
                <h2 className="section-title">Project Items</h2>
                <p className="section-sub">{projectList.length} windows added</p>
              </div>
            </div>
            <div className="project-list" style={{ marginTop: '12px' }}>
              {projectList.map(w => (
                <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', marginBottom: '8px', border: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>{w.label}</div>
                    <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{w.width} × {w.height}</div>
                  </div>
                  <button onClick={() => handleRemoveWindow(w.id)} style={{ background: 'transparent', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: '4px' }} title="Remove">
                    <XIcon />
                  </button>
                </div>
              ))}
              <button className="btn-clear" style={{ width: '100%', marginTop: '8px' }} onClick={() => setProjectList([])}>
                Clear All
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* ── Right: Results ─────────────────────────── */}
      <div className="calc-results">
        {!hasResult && !hasError && (
          <div className="empty-state">
            <div className="empty-icon"><WindowIcon /></div>
            <h3>Project is Empty</h3>
            <p>Add windows from the sidebar to calculate materials and pricing</p>
            <div className="format-examples">
              {["4 feet 6 inches", "4'6\"", "54", "4 feet 6 3 sut"].map(ex => (
                <code key={ex} className="fmt-ex" onClick={() => setWidth(ex)} title="Click to use">
                  {ex}
                </code>
              ))}
            </div>
          </div>
        )}

        {hasError && (
          <div className="error-banner animate-in">
            <XIcon /><span>{projectResult.error}</span>
          </div>
        )}

        {hasResult && (() => {
          const { windowResults, materials, costs, pricing } = projectResult;
          return (
            <div className="results-grid animate-in">
              
              {/* Sequential Cut Lists for each window */}
              {windowResults.map((calcData, index) => {
                const d = calcData.dimensions;
                return (
                  <div key={calcData.windowId} className="cut-list-card" style={{ marginBottom: '16px' }}>
                    <div className="cut-list-header">
                      <span className="group-label no-margin"><span className="group-dot cut"/>{calcData.windowLabel}</span>
                      <span className="cut-count" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                        {unitsToFraction(calcData.inputs.width)}" × {unitsToFraction(calcData.inputs.height)}"
                      </span>
                    </div>
                    <div className="cut-list-wrap">
                      <table className="cut-list">
                        <thead>
                          <tr>
                            <th>Description</th>
                            <th>Section</th>
                            <th className="center">Qty</th>
                            <th>Cut Size</th>
                            <th>In Sut</th>
                            <th className="right">Units</th>
                          </tr>
                        </thead>
                        <tbody>
                          {calcData.sections.map((s, i) => (
                            <tr key={i} className="section-row" style={{ animationDelay: `${i*20}ms` }}>
                              <td className="sr-desc">{s.description}</td>
                              <td><span className="sr-key-badge">{s.sectionKey}</span></td>
                              <td className="center"><span className="sr-qty">{s.qty}</span></td>
                              <td className="sr-size mono">{s.cutSize.fraction}"</td>
                              <td className="sr-sut mono">{s.cutSize.sut}</td>
                              <td className="right sr-units">{s.cutSize.units}</td>
                            </tr>
                          ))}
                          
                          {calcData.glassConfig && calcData.glassConfig.map((g, i) => {
                            const wDim = d[g.width_key];
                            const hDim = d[g.height_key];
                            if (!wDim || !hDim) return null;
                            return (
                              <tr key={`glass-${i}`} className="section-row" style={{ animationDelay: `${(calcData.sections.length + i) * 20}ms` }}>
                                <td className="sr-desc">{g.label}</td>
                                <td><span className="sr-key-badge" style={{ background: 'rgba(52, 211, 153, 0.1)', color: 'var(--emerald-light)', borderColor: 'rgba(52, 211, 153, 0.2)' }}>glass</span></td>
                                <td className="center"><span className="sr-qty">{g.qty}</span></td>
                                <td className="sr-size mono">{wDim.fraction}" <span style={{color: 'var(--text-muted)'}}>×</span> {hDim.fraction}"</td>
                                <td className="sr-sut mono">{wDim.sut} <span style={{color: 'var(--text-muted)'}}>×</span> {hDim.sut}</td>
                                <td className="right sr-units">{wDim.units} <span style={{color: 'var(--text-muted)'}}>×</span> {hDim.units}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}

              {/* Pricing Estimate */}
              <div className="pricing-card" style={{ marginTop: '24px' }}>
                <div className="pricing-header">
                  <span className="group-label no-margin"><span className="group-dot extra"/>Total Project Quotation</span>
                  <div className="pricing-header-actions">
                    <button 
                      className="btn-download-pdf" 
                      onClick={() => downloadPDF({
                        windowResults: projectResult.windowResults,
                        materials: projectResult.materials,
                        costs: projectResult.costs,
                        pricing: projectResult.pricing,
                        meta: { projectName: 'Multi-Window Project' }
                      })}
                      title="Download Fabrication Report"
                    >
                      <DownloadIcon /> Export PDF
                    </button>
                    <div className="pricing-total">
                      <span className="currency">₹</span>{pricing.sellingPrice.toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="pricing-breakdown">
                  <div className="pb-col">
                    <div className="pb-row">
                      <span>Aluminium <span style={{fontSize:'10px', color:'var(--text-muted)'}}>({costs.totals.totalAluminiumWeightKg.toFixed(2)} kg)</span>:</span> 
                      <span className="mono">₹{costs.totals.aluminium.toFixed(2)}</span>
                    </div>
                    <div className="pb-row"><span>Glass <span style={{fontSize:'10px', color:'var(--text-muted)'}}>({materials.glass.totalAreaSqFt.toFixed(2)} sqft)</span>:</span> <span className="mono">₹{costs.totals.glass.toFixed(2)}</span></div>
                    <div className="pb-row"><span>Hardware:</span> <span className="mono">₹{costs.totals.hardware.toFixed(2)}</span></div>
                  </div>
                  <div className="pb-divider" />
                  <div className="pb-col">
                    <div className="pb-row">
                      <span>Selling (<span style={{fontSize:'10px', color:'var(--text-muted)'}}>{pricing.areaSqFt.toFixed(2)} sqft</span>):</span> 
                      <span className="mono">₹{pricing.sellingPrice.toFixed(2)}</span>
                    </div>
                    <div className="pb-row">
                      <span>Making Cost:</span> 
                      <span className="mono" style={{color: '#f87171'}}>− ₹{pricing.makingCost.toFixed(2)}</span>
                    </div>
                    <div className="pb-row highlight" style={{marginTop: '4px'}}>
                      <span style={{fontWeight: 600, color: 'var(--emerald-light)'}}>Profit <span style={{fontSize:'10px', color:'var(--emerald)'}}>({pricing.marginPct.toFixed(1)}%)</span>:</span> 
                      <span className="mono" style={{fontWeight: 600, color: 'var(--emerald-light)'}}>₹{pricing.netProfit.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Material Requirements */}
              <div className="cut-list-card" style={{ marginTop: '16px', marginBottom: '16px' }}>
                <div className="cut-list-header">
                  <span className="group-label no-margin"><span className="group-dot material"/>Combined Material Requirements</span>
                </div>
                <div className="cut-list-wrap">
                  <table className="cut-list">
                    <thead>
                      <tr>
                        <th>Aluminium Section</th>
                        <th style={{textAlign: 'right'}}>Total Length</th>
                        <th style={{textAlign: 'right'}}>Weight</th>
                        <th style={{textAlign: 'right'}}>Stock Bars</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materials.aluminium.map((mat, i) => (
                        <tr key={i} className="section-row">
                          <td style={{fontWeight: 500}}>{mat.label}</td>
                          <td className="mono" style={{textAlign: 'right'}}>{mat.totalLengthFt.toFixed(2)} ft</td>
                          <td className="mono" style={{textAlign: 'right', color: 'var(--text-muted)'}}>{mat.totalWeightKg.toFixed(2)} kg</td>
                          <td className="mono" style={{textAlign: 'right'}}>{mat.stockLengthsNeeded}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {materials.hardware && materials.hardware.length > 0 && (
                    <table className="cut-list" style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                      <thead>
                        <tr>
                          <th style={{ paddingTop: '16px' }}>Hardware / Accessories</th>
                          <th style={{ textAlign: 'right', paddingTop: '16px' }}>Total Quantity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {materials.hardware.map((hw, i) => (
                          <tr key={i} className="section-row">
                            <td style={{fontWeight: 500}}>{hw.label}</td>
                            <td className="mono" style={{textAlign: 'right'}}>
                              {hw.unit === 'per_foot' ? `${hw.qty.toFixed(2)} ft` : Math.ceil(hw.qty)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  <div style={{
                    marginTop: '16px',
                    padding: '12px 16px',
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontWeight: 600,
                  }}>
                    <span style={{ color: 'var(--text-primary)' }}>Total Making Cost (Aluminium + Glass + Hardware):</span>
                    <span className="mono" style={{ color: 'var(--emerald-light)', fontSize: '14px' }}>₹{pricing.makingCost.toFixed(2)}</span>
                  </div>
                </div>
              </div>

            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const CheckIcon  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>;
const XIcon      = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const RulerIcon  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 16L16 2l6 6L8 22Z"/><line x1="5" y1="13" x2="8" y2="10"/><line x1="9" y1="17" x2="12" y2="14"/></svg>;
const WindowIcon = () => <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="20" height="20" rx="2"/><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>;
const WindowIconSmall = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2"/><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>;
const DownloadIcon=()=> <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
