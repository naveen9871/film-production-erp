import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import './index.css';

import api from './api';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ScriptAnalysis from './pages/ScriptAnalysis';
import SceneBuilder from './pages/SceneBuilder';
import Budget from './pages/Budget';
import BudgetVersions from './pages/BudgetVersions';
import Expenses from './pages/Expenses';
import Revenue from './pages/Revenue';
import Artists from './pages/Artists';
import Equipment from './pages/Equipment';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Vendors from './pages/Vendors';
import PurchaseOrders from './pages/PurchaseOrders';
import Schedule from './pages/Schedule';
import Studio from './pages/Studio';
import WritersRoom from './pages/WritersRoom';

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

      <nav id="nav">
        <div className="nav-group-label">Overview</div>
        <Link to="/dashboard" className={`nav-item ${location.pathname.startsWith('/dashboard') ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>
          Dashboard
        </Link>
        
        <div className="nav-group-label">Pre-Production</div>
        <Link to="/studio" className={`nav-item ${location.pathname.startsWith('/studio') ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
          Writer's Room AI
        </Link>
        <Link to="/script" className={`nav-item ${location.pathname.startsWith('/script') ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><path d="M4 4h11l5 5v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M8 12h8M8 16h8M8 8h4"/></svg>
          Script Analysis
        </Link>
        <Link to="/scene-builder" className={`nav-item ${location.pathname.startsWith('/scene-builder') ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
          Scene Builder
        </Link>
        
        <div className="nav-group-label">Operations</div>
        <Link to="/schedule" className={`nav-item ${location.pathname.startsWith('/schedule') ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Schedule & DOOD
        </Link>
        <Link to="/artists" className={`nav-item ${location.pathname.startsWith('/artists') ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          Artists & Contracts
        </Link>
        <Link to="/equipment" className={`nav-item ${location.pathname.startsWith('/equipment') ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
          Equipment Rentals
        </Link>

        <div className="nav-group-label">Finance & Budgeting</div>
        <Link to="/budget" className={`nav-item ${location.pathname.startsWith('/budget') && !location.pathname.includes('/budget/versions') ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          Budget Engine
        </Link>
        <Link to="/budget/versions" className={`nav-item ${location.pathname.startsWith('/budget/versions') ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          Versions & Variance
        </Link>
        <Link to="/vendors" className={`nav-item ${location.pathname.startsWith('/vendors') ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          Vendor Master
        </Link>
        <Link to="/pos" className={`nav-item ${location.pathname.startsWith('/pos') ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
          Purchase Orders
        </Link>
        <Link to="/expenses" className={`nav-item ${location.pathname.startsWith('/expenses') ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.5"/></svg>
          Expense Ledger
        </Link>
        <Link to="/revenue" className={`nav-item ${location.pathname.startsWith('/revenue') ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><path d="M3 17l6-6 4 4 8-8" strokeLinecap="round" strokeLinejoin="round"/><path d="M15 7h6v6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Revenue & Rights
        </Link>
        <Link to="/reports" className={`nav-item ${location.pathname.startsWith('/reports') ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><path d="M6 2h9l5 5v15H6z"/><path d="M9 13h6M9 17h6M9 9h2"/></svg>
          Reports
        </Link>
        
        <div className="nav-group-label">System</div>
        <Link to="/settings" className={`nav-item ${location.pathname.startsWith('/settings') ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          Settings
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
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({ id: payload.sub, role: payload.role, username: payload.username || 'Producer' });
      } catch (e) {
        console.error("Invalid token", e);
        localStorage.removeItem('token');
      }
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
              <Route path="/studio" element={<Studio />} />
              <Route path="/studio/:docId" element={<WritersRoom productionId={productionId} />} />
              <Route path="/script" element={<ScriptAnalysis productionId={productionId} />} />
              <Route path="/scene-builder" element={<SceneBuilder productionId={productionId} />} />
              <Route path="/schedule" element={<Schedule productionId={productionId} />} />
              <Route path="/budget" element={<Budget productionId={productionId} />} />
              <Route path="/budget/versions" element={<BudgetVersions productionId={productionId} />} />
              <Route path="/vendors" element={<Vendors />} />
              <Route path="/pos" element={<PurchaseOrders productionId={productionId} />} />
              <Route path="/expenses" element={<Expenses productionId={productionId} />} />
              <Route path="/revenue" element={<Revenue productionId={productionId} />} />
              <Route path="/artists" element={<Artists productionId={productionId} />} />
              <Route path="/equipment" element={<Equipment productionId={productionId} />} />
              <Route path="/reports" element={<Reports productionId={productionId} />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
