import { API_BASE_URL } from '../config';
import React, { useState, useEffect, useContext } from 'react';
import { unitsToFraction } from '../../../shared/measurement/measurementEngine.js';
import { AuthContext } from '../context/AuthContext.jsx';
import './ProjectsPage.css';

export default function ProjectsPage() {
  const { token } = useContext(AuthContext);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchQuotations();
  }, []);

  const fetchQuotations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/quotations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch projects');
      const data = await response.json();
      setQuotations(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this project? This cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/quotations/${id}`, {
        method: `DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to delete project');
      
      // Update UI by removing the deleted quotation
      setQuotations(quotations.filter(q => q._id !== id));
      if (expandedId === id) setExpandedId(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (loading) return <div className="projects-container"><h2>Loading Projects...</h2></div>;
  if (error) return <div className="projects-container"><h2>Error: {error}</h2></div>;

  return (
    <div className="projects-container">
      <div className="projects-header">
        <h1>Saved Projects</h1>
        <p style={{ color: 'var(--text-muted)' }}>{quotations.length} total quotations saved</p>
      </div>

      <div className="projects-grid">
        {quotations.map(quote => (
          <div key={quote._id} className="project-card animate-in">
            <div className="project-card-header">
              <div>
                <div className="customer-name">{quote.customer?.name || 'Unknown Customer'}</div>
                <div className="customer-phone">{quote.customer?.phone || 'No phone number'}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                <div className="project-date">{formatDate(quote.createdAt)}</div>
                <button 
                  className="btn-delete-project"
                  onClick={() => handleDelete(quote._id)}
                  title="Delete Project"
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="project-metrics">
              <div className="metric-row">
                <span>Total Quotation</span>
                <span className="metric-val">₹{quote.finalPrice?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="metric-row">
                <span>Material Cost</span>
                <span className="metric-val">₹{quote.totalMaterialCost?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="metric-row">
                <span>Profit</span>
                <span className="metric-val profit-val">
                  ₹{(quote.finalPrice - (quote.totalMaterialCost + (quote.labourCost||0) + (quote.additionalCharges||0))).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="project-card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{quote.projects?.length || 0} windows included</span>
              <button 
                className="btn-details"
                onClick={() => setExpandedId(expandedId === quote._id ? null : quote._id)}
              >
                {expandedId === quote._id ? 'Hide Details' : 'View Details'}
              </button>
            </div>

            {/* Expanded Details Section */}
            {expandedId === quote._id && quote.snapshot?.projectList && (
              <div className="project-details-expanded animate-in">
                <div className="details-divider"></div>
                <h4 style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Window Details</h4>
                <div className="details-window-list">
                  {quote.snapshot.projectList.map((w, index) => {
                    const calcData = quote.snapshot.windowResults ? quote.snapshot.windowResults[index] : null;
                    return <WindowDetailsItem key={w.id} w={w} calcData={calcData} />;
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
        {quotations.length === 0 && (
          <div style={{ color: 'var(--text-muted)' }}>No projects saved yet.</div>
        )}
      </div>
    </div>
  );
}

// ── Subcomponent for individual window toggling ────────────────────────────────
function WindowDetailsItem({ w, calcData }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const d = calcData ? calcData.dimensions : null;
  
  return (
    <div className="details-window-item" style={{ display: 'block', padding: '12px 0' }}>
      <div 
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="details-window-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {w.label}
          <span style={{ fontSize: '9px', opacity: 0.5 }}>{isExpanded ? '▼' : '▶'}</span>
        </div>
        <div className="details-window-dims mono">
          {w.width} × {w.height} <span style={{ color: 'var(--emerald-light)' }}>@ ₹{w.customRate}</span>
        </div>
      </div>
      
      {isExpanded && !calcData && (
        <div className="cut-list-wrap animate-in" style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '6px', marginTop: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>
          Detailed cut list is not available for this older project. Please save a new project to view full cut details.
        </div>
      )}

      {isExpanded && calcData && (
        <div className="cut-list-wrap animate-in" style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '6px', marginTop: '12px' }}>
          <table className="cut-list" style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}>
                <th style={{ paddingBottom: '6px' }}>Description</th>
                <th style={{ paddingBottom: '6px' }}>Section</th>
                <th style={{ paddingBottom: '6px', textAlign: 'center' }}>Qty</th>
                <th style={{ paddingBottom: '6px' }}>Cut Size</th>
                <th style={{ paddingBottom: '6px', textAlign: 'right' }}>Units</th>
              </tr>
            </thead>
            <tbody>
              {calcData.sections.map((s, i) => (
                <tr key={i} style={{ borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '6px 0', color: 'var(--text-primary)' }}>{s.description}</td>
                  <td style={{ padding: '6px 0' }}><span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>{s.sectionKey}</span></td>
                  <td style={{ padding: '6px 0', textAlign: 'center' }}>{s.qty}</td>
                  <td className="mono" style={{ padding: '6px 0' }}>{s.cutSize.fraction}"</td>
                  <td className="mono" style={{ padding: '6px 0', textAlign: 'right' }}>{s.cutSize.units}</td>
                </tr>
              ))}
              
              {calcData.glassConfig && calcData.glassConfig.map((g, i) => {
                const wDim = d[g.width_key];
                const hDim = d[g.height_key];
                if (!wDim || !hDim) return null;
                return (
                  <tr key={`glass-${i}`} style={{ borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '6px 0', color: 'var(--text-primary)' }}>{g.label}</td>
                    <td style={{ padding: '6px 0' }}><span style={{ background: 'rgba(52, 211, 153, 0.1)', color: 'var(--emerald-light)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>glass</span></td>
                    <td style={{ padding: '6px 0', textAlign: 'center' }}>{g.qty}</td>
                    <td className="mono" style={{ padding: '6px 0' }}>{wDim.fraction}" <span style={{color: 'var(--text-muted)'}}>×</span> {hDim.fraction}"</td>
                    <td className="mono" style={{ padding: '6px 0', textAlign: 'right' }}>{wDim.units} <span style={{color: 'var(--text-muted)'}}>×</span> {hDim.units}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
