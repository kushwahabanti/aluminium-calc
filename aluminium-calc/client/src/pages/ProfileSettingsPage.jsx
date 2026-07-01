import React, { useState, useContext, useCallback, useRef } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
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
import { unitsToFraction } from '../../../shared/measurement/measurementEngine.js';
import './AdminPage.css';

export default function ProfileSettingsPage() {
  const { user, updateUserProfile, uploadAvatar } = useContext(AuthContext);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');
  const [isUploading, setIsUploading] = useState(false);
  
  // Admin Configuration State
  const [sections, setSections] = useState(() => getSections());
  const [hardware, setHardware] = useState(() => getHardwareItems());
  const [glass, setGlass] = useState(() => getGlassRates());
  const [pricing, setPricing] = useState(() => getProductPricing());
  const [deductions, setDeductions] = useState(() => getDeductions());
  const [globalAluminiumRate, setGlobalAluminiumRate] = useState(() => getGlobalAluminiumRate());

  const fileInputRef = useRef(null);

  const handleUpdateName = async () => {
    if (newName.trim() !== '') {
      await updateUserProfile({ name: newName });
    }
    setIsEditingName(false);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsUploading(true);
      await uploadAvatar(file);
      setIsUploading(false);
    }
  };

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

  if (!user) return <div>Loading...</div>;

  return (
    <div className="admin-page animate-in">
      <div className="admin-header">
        <h2>User Profile & Configuration</h2>
        <button className="btn-danger" onClick={handleReset}>Factory Reset Configuration</button>
      </div>

      <div className="admin-grid" style={{ marginBottom: '32px' }}>
        {/* User Profile Card */}
        <div className="admin-card" style={{ gridColumn: '1 / -1' }}>
          <div className="admin-card-header">Profile Details</div>
          <div style={{ display: 'flex', gap: '24px', padding: '24px', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                width: '100px', height: '100px', borderRadius: '50%', overflow: 'hidden', 
                background: 'var(--surface-dark)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' 
              }}>
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '32px', color: 'var(--text-muted)' }}>{user.name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept="image/*"
                onChange={handleFileChange}
              />
              <button 
                onClick={() => fileInputRef.current.click()} 
                disabled={isUploading}
                style={{ background: 'transparent', border: '1px solid var(--border)', padding: '4px 12px', borderRadius: '4px', color: 'var(--text-primary)', cursor: isUploading ? 'default' : 'pointer', fontSize: '12px', opacity: isUploading ? 0.5 : 1 }}
              >
                {isUploading ? 'Uploading...' : 'Upload Avatar'}
              </button>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Name</label>
                {isEditingName ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      value={newName} 
                      onChange={e => setNewName(e.target.value)}
                      style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface)' }}
                    />
                    <button className="btn-primary" onClick={handleUpdateName}>Save</button>
                    <button onClick={() => setIsEditingName(false)} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>Cancel</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '18px', fontWeight: '500' }}>{user.name}</span>
                    <button onClick={() => setIsEditingName(true)} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '12px' }}>Edit</button>
                  </div>
                )}
              </div>
              
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Email</label>
                <div style={{ color: 'var(--text-secondary)' }}>{user.email}</div>
              </div>
              
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Account Created</label>
                <div style={{ color: 'var(--text-secondary)' }}>
                  {new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="admin-header">
        <h3>Application Settings</h3>
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
