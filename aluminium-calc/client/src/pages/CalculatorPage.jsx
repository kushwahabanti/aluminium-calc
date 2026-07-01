import { API_BASE_URL } from '../config';
import { useState, useMemo, useCallback, useEffect, useContext } from 'react';
import { calculate } from '../../../shared/calculators/calculator.js';
import { parseToUnits, unitsToFraction, unitsToSut } from '../../../shared/measurement/measurementEngine.js';
import { SearchIcon, XIcon, WindowIconSmall, PlusIcon, DownloadIcon, RulerIcon, CheckIcon, WindowIcon } from '../components/Icons.jsx';
import { 
  getProductPricing, 
  getSections, 
  getHardwareItems,
  getGlassRates,
  getGlobalAluminiumRate,
  getDeductions,
} from '../services/dataStore.js';
import { calculateMaterials } from '../../../shared/calculators/materialCalculator.js';
import { calculateCosts, calculatePricing } from '../../../shared/calculators/costCalculator.js';
import { downloadPDF } from '../pdf/pdfGenerator.js';
import InlineEdit from '../components/InlineEdit.jsx';
import { AuthContext } from '../context/AuthContext.jsx';
import './CalculatorPage.css';

// ── Dimension input with dropdowns ─────────────────────────────────────────────
function DimensionInput({ id, label, value, onChange }) {
  const [ft, setFt] = useState(0);
  const [inVal, setInVal] = useState(0);
  const [frac, setFrac] = useState(0); // 0 to 15 (representing sixteenths of an inch)

  useEffect(() => {
    if (!value) {
      setFt(0);
      setInVal(0);
      setFrac(0);
    }
  }, [value]);

  const handleUpdate = (f, i, fr) => {
    setFt(f);
    setInVal(i);
    setFrac(fr);
    if (f === 0 && i === 0 && fr === 0) {
      onChange('');
    } else {
      if (fr === 0) {
        onChange(`${f} feet ${i} inches`);
      } else {
        onChange(`${f} feet ${i} ${unitsToFraction(fr)} inches`);
      }
    }
  };

  const parsed = useMemo(() => {
    if (!value.trim()) return null;
    try {
      const units = parseToUnits(value);
      if (!units || units === 0) return null;
      return { units, fraction: unitsToFraction(units), sut: unitsToSut(units) };
    } catch { return null; }
  }, [value]);

  const isValid = parsed !== null;

  return (
    <div className={`dim-input-wrap ${isValid ? 'is-valid' : ''}`}>
      <label className="dim-label" htmlFor={`${id}-ft`}>{label}</label>
      <div className="dim-select-row">
        <select id={`${id}-ft`} name={`${id}-ft`} value={ft} onChange={e => handleUpdate(Number(e.target.value), inVal, frac)} className="dim-select" aria-label="Feet">
          {Array.from({length: 21}).map((_, i) => <option key={i} value={i}>{i} ft</option>)}
        </select>
        <select id={`${id}-in`} name={`${id}-in`} value={inVal} onChange={e => handleUpdate(ft, Number(e.target.value), frac)} className="dim-select" aria-label="Inches">
          {Array.from({length: 12}).map((_, i) => <option key={i} value={i}>{i} in</option>)}
        </select>
        <select id={`${id}-frac`} name={`${id}-frac`} value={frac} onChange={e => handleUpdate(ft, inVal, Number(e.target.value))} className="dim-select" aria-label="Fractions of an inch">
          {Array.from({length: 16}).map((_, i) => <option key={i} value={i}>{i === 0 ? '0' : unitsToFraction(i)}</option>)}
        </select>
      </div>
      {isValid && (
        <div className="dim-preview" style={{ marginTop: '8px' }}>
          <span className="preview-chip"><span className="chip-label">Fraction</span><span className="chip-value mono">{parsed.fraction}"</span></span>
          <span className="preview-chip"><span className="chip-label">Sut</span><span className="chip-value mono">{parsed.sut}</span></span>
        </div>
      )}
    </div>
  );
}

// ── Main Calculator Page ──────────────────────────────────────────────────────
export default function CalculatorPage() {
  const { token } = useContext(AuthContext);
  const [width, setWidth]   = useState('');
  const [height, setHeight] = useState('');
  const [customRate, setCustomRate] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('sliding-window-2track');
  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── Sync with DB & Load Data ────────────────────────────────────────────────
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
    const defaultRate = pricingConfig.find(p => p.id === selectedProductId)?.rate_per_sqft || 350;
    const prodLabel = pricingConfig.find(p => p.id === selectedProductId)?.label || 'Window';
    
    const newWindow = {
      id: Date.now().toString(),
      label: `Window #${projectList.length + 1}`,
      productId: selectedProductId,
      productName: prodLabel,
      width: width.trim(),
      height: height.trim(),
      qty: 1,
      customRate: customRate ? Number(customRate) : defaultRate
    };
    setProjectList([...projectList, newWindow]);
    setWidth('');
    setHeight('');
    setCustomRate('');
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

  const handleUpdateWindowRate = (id, newRate) => {
    setProjectList(projectList.map(w => 
      w.id === id ? { ...w, customRate: Number(newRate) || w.customRate } : w
    ));
  };

  const handleSaveProject = async () => {
    if (!customerName || !customerPhone || projectList.length === 0) return;
    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      // 1. Create/Find Customer
      const custRes = await fetch(`${API_BASE_URL}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: customerName, phone: customerPhone })
      });
      const customer = await custRes.json();

      // 2. Save all windows as Projects
      const projectIds = [];
      for (const w of projectList) {
        const projRes = await fetch(`${API_BASE_URL}/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            customer: customer._id,
            productType: w.productId,
            width: w.width,
            height: w.height,
            quantity: 1,
            profile: 'Jindal',
            remarks: `${w.label} - ${w.productName} @ ₹${w.customRate}/sqft`
          })
        });
        const proj = await projRes.json();
        projectIds.push(proj._id);
      }

      // 3. Save Quotation
      const quoteRes = await fetch(`${API_BASE_URL}/quotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          customer: customer._id,
          projects: projectIds,
          totalMaterialCost: projectResult.costs.totals.materialOnly,
          finalPrice: projectResult.pricing.sellingPrice,
          snapshot: { 
            projectList, 
            pricing: projectResult.pricing,
            windowResults: projectResult.windowResults,
            costs: projectResult.costs
          }
        })
      });
      
      if (quoteRes.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (e) {
      console.error("Save failed", e);
      alert("Failed to save project to database.");
    } finally {
      setIsSaving(false);
    }
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
        let calcData;
        try {
          calcData = calculate(w.productId || 'sliding-window-2track', { width: w.width, height: w.height }, deductions);
        } catch (err) {
          // Fallback to 2-track logic for unimplemented product types (e.g. casement, 3-track)
          calcData = calculate('sliding-window-2track', { width: w.width, height: w.height }, deductions);
          calcData.productName = `${w.productName} (Fallback Logic)`;
        }
        calcData.windowLabel = w.label;
        calcData.windowId = w.id;
        windowResults.push(calcData);
      });

      // Pass array of all calc results to calculateMaterials
      const materials = calculateMaterials(windowResults, ratesData, 10);
      const costs = calculateCosts(materials, ratesData, defaultGlass);
      
      const productRateConfig = pricingConfig.find(p => p.id === 'sliding-window-2track') || { rate_per_sqft: 350 };
      const pricing = calculatePricing(costs.totals.materialOnly, projectList, windowResults);
      
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
            <div className="dim-input-wrap">
              <label className="dim-label" htmlFor="window-type">Window Type</label>
              <div className="dim-input-row">
                <select 
                  id="window-type" 
                  className="dim-select" 
                  value={selectedProductId} 
                  onChange={e => setSelectedProductId(e.target.value)}
                  style={{ width: '100%', padding: '8px', background: 'var(--surface-dark)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '6px', outline: 'none', appearance: 'none', cursor: 'pointer' }}
                >
                  {pricingConfig.map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <DimensionInput id="width"  label="Overall Width"  value={width}  onChange={setWidth}  />
            <DimensionInput id="height" label="Overall Height" value={height} onChange={setHeight} />
            <div className="dim-input-wrap">
              <label className="dim-label" htmlFor="custom-rate">Rate (₹/sqft)</label>
              <div className="dim-input-row">
                <input id="custom-rate" type="number" className="dim-input" value={customRate} onChange={e => setCustomRate(e.target.value)} placeholder="Leave blank for default" />
              </div>
            </div>
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

        {/* Project List & Customer Details */}
        {projectList.length > 0 && (
          <div className="sidebar-card" style={{ marginTop: '16px' }}>
            <div className="sidebar-card-header">
              <WindowIconSmall />
              <div>
                <h2 className="section-title">Project Items</h2>
                <p className="section-sub">{projectList.length} windows added</p>
              </div>
            </div>
            
            <div className="inputs-stack" style={{ marginTop: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
              <div className="dim-input-wrap">
                <input type="text" className="dim-input" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Customer Name" />
              </div>
              <div className="dim-input-wrap">
                <input type="tel" className="dim-input" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Mobile Number" />
              </div>
            </div>

            <div className="project-list" style={{ marginTop: '12px' }}>
              {projectList.map(w => (
                <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', marginBottom: '8px', border: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>{w.label} - {w.productName}</div>
                    <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {w.width} × {w.height} 
                      <span style={{color:'var(--emerald-light)', marginLeft: '4px', display: 'inline-block'}}>
                        @ <InlineEdit value={w.customRate} prefix="₹" onSave={v => handleUpdateWindowRate(w.id, v)} />
                      </span>
                    </div>
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
                  <div className="pricing-header-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button 
                      className="btn-primary" 
                      onClick={handleSaveProject} 
                      disabled={!customerName || !customerPhone || projectList.length === 0 || isSaving}
                      style={{ background: saveSuccess ? 'var(--emerald)' : 'var(--accent)', color: '#fff', fontSize: '12px', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      {isSaving ? 'Saving...' : saveSuccess ? 'Saved ✓' : 'Save Database'}
                    </button>
                    <button 
                      className="btn-download-pdf" 
                      onClick={() => downloadPDF({
                        windowResults: projectResult.windowResults,
                        materials: projectResult.materials,
                        costs: projectResult.costs,
                        pricing: projectResult.pricing,
                        meta: { projectName: 'Multi-Window Project', customerName, customerPhone }
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
