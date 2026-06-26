import { Routes, Route, NavLink } from 'react-router-dom';
import CalculatorPage from './pages/CalculatorPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import './App.css';

export default function App() {
  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2"/>
              <line x1="2" y1="20" x2="22" y2="20"/>
              <line x1="8" y1="17" x2="8" y2="20"/>
              <line x1="16" y1="17" x2="16" y2="20"/>
            </svg>
          </div>
          <div>
            <h1 className="brand-title">AluminiumCalc</h1>
            <span className="brand-sub">Fabrication Calculator</span>
          </div>
        </div>

        <nav className="header-nav">
          <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Calculator
          </NavLink>
          <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Admin Panel
          </NavLink>
        </nav>

        <div className="header-meta">
          <div className="status-dot" title="Engine Ready">
            <span className="dot-pulse"/>
            <span>Engine Ready</span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="app-main">
        <Routes>
          <Route path="/" element={<CalculatorPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>
    </div>
  );
}
