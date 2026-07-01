import React, { useContext } from 'react';
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import CalculatorPage from './pages/CalculatorPage.jsx';
import ProjectsPage from './pages/ProjectsPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import ProfileSettingsPage from './pages/ProfileSettingsPage.jsx';
import { AuthContext } from './context/AuthContext.jsx';
import './App.css';

function ProtectedRoute({ children }) {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white' }}>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default function App() {
  const { user, logout } = useContext(AuthContext);

  return (
    <div className="app-shell">
      {/* Header */}
      {user && (
        <header className="app-header">
          <div className="header-brand">
            <div className="brand-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 7L12 3L20 7V17L12 21L4 17V7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                <path d="M4 7L12 11L20 7" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                <path d="M12 11V21" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
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
            <NavLink to="/projects" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Saved Projects
            </NavLink>
            <NavLink to="/reports" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Financial Reports
            </NavLink>
            <NavLink to="/profile" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Settings
            </NavLink>
          </nav>

          <div className="header-meta" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <NavLink to="/profile" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ 
                width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', 
                background: 'var(--surface-dark)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' 
              }}>
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{user.name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Hi, {user.name.split(' ')[0]}</span>
            </NavLink>
            <button onClick={logout} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer' }}>
              Logout
            </button>
          </div>
        </header>
      )}

      {/* Main */}
      <main className="app-main" style={{ height: user ? 'calc(100vh - 60px)' : '100vh' }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          <Route path="/" element={<ProtectedRoute><CalculatorPage /></ProtectedRoute>} />
          <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfileSettingsPage /></ProtectedRoute>} />
        </Routes>
      </main>
    </div>
  );
}
