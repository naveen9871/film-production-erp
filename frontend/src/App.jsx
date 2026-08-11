import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import './index.css';

import api from './api';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ScriptAnalysis from './pages/ScriptAnalysis';
import SceneBuilder from './pages/SceneBuilder';
import Budget from './pages/Budget';
import Expenses from './pages/Expenses';
import Revenue from './pages/Revenue';
import Reports from './pages/Reports';

const Sidebar = () => {
  const location = useLocation();

  return (
    <div className="sidebar">
      <div className="brand">
        <div className="brand-icon">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.4" strokeLinecap="round">
            <path d="M4 7l16 0M4 12l16 0M4 17l10 0" stroke="#fff" />
          </svg>
        </div>
        <div className="brand-name">Slate</div>
        <div className="brand-shortcut">⌘/</div>
      </div>

      <div className="prod-select">
        <div className="prod-avatar">MR</div>
        <div>
          <div className="label">Production</div>
          <div className="name">Midnight Run</div>
        </div>
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
          <path d="M8 9l4-4 4 4M8 15l4 4 4-4" stroke="currentColor" />
        </svg>
      </div>

      <div className="search-trigger">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7"/>
          <path d="M21 21l-4.3-4.3"/>
        </svg>
        Quick search
        <span className="kbd">⌘K</span>
      </div>

      <nav id="nav">
        <div className="nav-group-label">Overview</div>
        <Link to="/dashboard" className={`nav-item ${location.pathname.startsWith('/dashboard') ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
            <rect x="3" y="3" width="7" height="9" rx="1.5"/>
            <rect x="14" y="3" width="7" height="5" rx="1.5"/>
            <rect x="14" y="12" width="7" height="9" rx="1.5"/>
            <rect x="3" y="16" width="7" height="5" rx="1.5"/>
          </svg>
          Dashboard
          <span className="nav-key">D</span>
        </Link>
        
        <div className="nav-group-label">Pre-Production</div>
        <Link to="/script" className={`nav-item ${location.pathname.startsWith('/script') ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
            <path d="M4 4h11l5 5v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/>
            <path d="M8 12h8M8 16h8M8 8h4"/>
          </svg>
          Script Analysis
          <span className="nav-badge">4</span>
        </Link>
        <Link to="/scene-builder" className={`nav-item ${location.pathname.startsWith('/scene-builder') ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1.5"/>
            <rect x="14" y="3" width="7" height="7" rx="1.5"/>
            <rect x="3" y="14" width="7" height="7" rx="1.5"/>
            <rect x="14" y="14" width="7" height="7" rx="1.5"/>
          </svg>
          Scene Builder
          <span className="nav-key">T</span>
        </Link>
        <Link to="/budget" className={`nav-item ${location.pathname.startsWith('/budget') ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
            <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          Budget Engine
          <span className="nav-key">B</span>
        </Link>

        <div className="nav-group-label">Production</div>
        <Link to="/expenses" className={`nav-item ${location.pathname.startsWith('/expenses') ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
            <rect x="2" y="6" width="20" height="12" rx="2.5"/>
            <circle cx="12" cy="12" r="2.5"/>
          </svg>
          Expenses
          <span className="nav-key">E</span>
        </Link>
        <Link to="/revenue" className={`nav-item ${location.pathname.startsWith('/revenue') ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
            <path d="M3 17l6-6 4 4 8-8" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M15 7h6v6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Revenue & Rights
          <span className="nav-key">R</span>
        </Link>
        <Link to="/reports" className={`nav-item ${location.pathname.startsWith('/reports') ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
            <path d="M6 2h9l5 5v15H6z"/>
            <path d="M9 13h6M9 17h6M9 9h2"/>
          </svg>
          Reports
          <span className="nav-key">P</span>
        </Link>
      </nav>

      <div className="sidebar-foot">
        <div className="avatar">RM</div>
        <div>
          <div className="who">Rhea Mehta</div>
          <div className="role">Producer</div>
        </div>
        <div className="status-dot"></div>
      </div>
    </div>
  );
};

const Topbar = ({ user, onLogout, productionTitle }) => {
  const location = useLocation();
  const pageName = location.pathname.substring(1).charAt(0).toUpperCase() + location.pathname.substring(2);

  return (
    <div className="topbar">
      <div className="breadcrumb">
        <b>{productionTitle}</b><span className="sep">/</span><span id="crumb">{pageName || 'Dashboard'}</span>
        <div className="live-pill"><span className="live-dot"></span>Synced live</div>
      </div>
      <div className="topbar-right">
        <div className="avatar-stack">
          <div className="avatar" style={{background: 'linear-gradient(135deg,#F59E0B,#EF4444)'}}>AK</div>
          <div className="avatar" style={{background: 'linear-gradient(135deg,#10B981,#3B82F6)'}}>JS</div>
          <div className="avatar" style={{background: 'linear-gradient(135deg,var(--primary),var(--violet))'}}>RM</div>
        </div>
        <div className="icon-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.7 21a2 2 0 0 1-3.4 0"/>
          </svg>
          <span className="notif-dot"></span>
        </div>
        <button className="btn primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          New
        </button>
        <button className="btn" onClick={onLogout} style={{marginLeft: '8px'}}>Logout</button>
      </div>
    </div>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [productionId, setProductionId] = useState(null);
  const [productionTitle, setProductionTitle] = useState('Midnight Run');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setUser({ username: 'producer', role: 'producer' });
    }
  }, []);

  useEffect(() => {
    if (user) {
      api.get('/productions').then(res => {
        if (res.data && res.data.length > 0) {
          setProductionId(res.data[0].id);
          setProductionTitle(res.data[0].title);
        }
      }).catch(err => console.error("Failed to load productions", err));
    }
  }, [user]);

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <BrowserRouter>
      <div className="app">
        <Sidebar />
        <div className="main">
          <Topbar user={user} onLogout={() => { localStorage.removeItem('token'); setUser(null); }} productionTitle={productionTitle} />
          <div className="content">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard productionId={productionId} />} />
              <Route path="/script" element={<ScriptAnalysis productionId={productionId} />} />
              <Route path="/scene-builder" element={<SceneBuilder productionId={productionId} />} />
              <Route path="/budget" element={<Budget productionId={productionId} />} />
              <Route path="/expenses" element={<Expenses productionId={productionId} />} />
              <Route path="/revenue" element={<Revenue productionId={productionId} />} />
              <Route path="/reports" element={<Reports productionId={productionId} />} />
            </Routes>
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
