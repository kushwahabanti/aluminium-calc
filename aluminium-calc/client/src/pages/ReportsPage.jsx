import { API_BASE_URL } from '../config';
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
import './ReportsPage.css';

export default function ReportsPage() {
  const { token } = useContext(AuthContext);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportMonth, setReportMonth] = useState(new Date().getMonth());
  const [reportYear, setReportYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchQuotations();
  }, []);

  const fetchQuotations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/quotations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch data');
      const data = await response.json();
      setQuotations(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Calculate Monthly Report Metrics ---
  const monthlyQuotes = quotations.filter(q => {
    const d = new Date(q.createdAt);
    return d.getMonth() === reportMonth && d.getFullYear() === reportYear;
  });

  const report = monthlyQuotes.reduce((acc, q) => {
    acc.revenue += q.finalPrice || 0;
    acc.profit += q.finalPrice - (q.totalMaterialCost + (q.labourCost || 0) + (q.additionalCharges || 0));
    
    if (q.snapshot?.costs?.totals) {
      acc.aluWeight += q.snapshot.costs.totals.totalAluminiumWeightKg || 0;
      acc.aluCost += q.snapshot.costs.totals.aluminium || 0;
      acc.glassCost += q.snapshot.costs.totals.glass || 0;
      acc.hwCost += q.snapshot.costs.totals.hardware || 0;
    }
    return acc;
  }, { revenue: 0, profit: 0, aluWeight: 0, aluCost: 0, glassCost: 0, hwCost: 0 });

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  if (loading) return <div className="reports-container"><h2>Loading Reports...</h2></div>;
  if (error) return <div className="reports-container"><h2>Error: {error}</h2></div>;

  return (
    <div className="reports-container">
      <div className="reports-header">
        <h1>Financial Reports</h1>
        <p style={{ color: 'var(--text-muted)' }}>Overview of business performance</p>
      </div>

      <div className="monthly-report-card animate-in">
        <div className="report-header">
          <h3>Monthly Report</h3>
          <select 
            className="month-selector"
            value={reportMonth} 
            onChange={(e) => setReportMonth(Number(e.target.value))}
          >
            {monthNames.map((m, i) => <option key={i} value={i}>{m} {reportYear}</option>)}
          </select>
        </div>
        
        <div className="report-grid">
          <div className="report-metric">
            <span className="rm-label">Total Revenue</span>
            <span className="rm-value">₹{report.revenue.toFixed(2)}</span>
          </div>
          <div className="report-metric">
            <span className="rm-label">Net Profit</span>
            <span className="rm-value profit-val">₹{report.profit.toFixed(2)}</span>
          </div>
          <div className="report-metric">
            <span className="rm-label">Aluminium Weight</span>
            <span className="rm-value mono">{report.aluWeight.toFixed(2)} kg</span>
          </div>
          <div className="report-metric">
            <span className="rm-label">Aluminium Cost</span>
            <span className="rm-value mono">₹{report.aluCost.toFixed(2)}</span>
          </div>
          <div className="report-metric">
            <span className="rm-label">Glass Cost</span>
            <span className="rm-value mono">₹{report.glassCost.toFixed(2)}</span>
          </div>
          <div className="report-metric">
            <span className="rm-label">Hardware Cost</span>
            <span className="rm-value mono">₹{report.hwCost.toFixed(2)}</span>
          </div>
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '12px', fontStyle: 'italic' }}>
          * Material breakdowns (weight, glass, hardware) are only available for projects saved after the recent system update.
        </div>
      </div>
    </div>
  );
}
