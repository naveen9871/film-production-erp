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
import Evaluation from './pages/Evaluation';

// Demo scope toggle: hides nav items for modules that aren't part of the
// validated pre-production cost-estimation core (Writer's Room, Schedule,
// Artists, Equipment Rentals, Versions, Vendors, POs, Expenses, Revenue,
// Reports, Settings). Routes stay registered and reachable by URL — this
// only affects sidebar visibility. Flip to true to restore full nav.
const SHOW_ALL_MODULES = false;

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', background: '#FDECEC', color: '#B91C1C', border: '1px solid #FCA5A5', borderRadius: '8px', margin: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px' }}>Page Render Error</h2>
          <p style={{ fontSize: '14px', marginBottom: '10px' }}>{this.state.error && this.state.error.toString()}</p>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '11px', background: '#FFF', padding: '10px', borderRadius: '4px', border: '1px solid #FCA5A5', overflow: 'auto', maxHeight: '200px' }}>
            {this.state.error && this.state.error.stack}
          </pre>
          <button className="btn" style={{ marginTop: '15px' }} onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const Sidebar = ({ productions = [], productionId, onSelectProduction, onNewClick }) => {
  const location = useLocation();
  const activeProd = productions.find(p => p.id === productionId) || productions[0];
  const title = activeProd?.title || 'No Project Selected';
  const avatar = title.substring(0, 2).toUpperCase();

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

      <div className="prod-select" style={{ position: 'relative', cursor: 'pointer' }}>
        <div className="prod-avatar">{avatar}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="label">Production</div>
          {productions.length > 1 ? (
            <select
              value={productionId || ''}
              onChange={(e) => onSelectProduction(Number(e.target.value))}
              style={{
                background: 'transparent', color: 'inherit', border: 'none',
                fontSize: '13px', fontWeight: 600, width: '100%', outline: 'none', cursor: 'pointer'
              }}
            >
              {productions.map(p => (
                <option key={p.id} value={p.id} style={{ color: '#000' }}>{p.title}</option>
              ))}
            </select>
          ) : (
            <div className="name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
          )}
        </div>
      </div>

      <nav id="nav">
        <div className="nav-group-label">Overview</div>
        <Link to="/dashboard" className={`nav-item ${location.pathname.startsWith('/dashboard') ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>
          Dashboard
        </Link>

        <div className="nav-group-label">Pre-Production</div>
        {SHOW_ALL_MODULES && (
          <Link to="/studio" className={`nav-item ${location.pathname.startsWith('/studio') ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
            Writer's Room AI
          </Link>
        )}
        <Link to="/script" className={`nav-item ${location.pathname.startsWith('/script') ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><path d="M4 4h11l5 5v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M8 12h8M8 16h8M8 8h4"/></svg>
          Script Analysis
        </Link>
        <Link to="/scene-builder" className={`nav-item ${location.pathname.startsWith('/scene-builder') ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
          Scene Builder
        </Link>
        <Link to="/evaluation" className={`nav-item ${location.pathname.startsWith('/evaluation') ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          Evaluation
        </Link>

        {SHOW_ALL_MODULES && (
          <>
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
          </>
        )}

        <div className="nav-group-label">Finance & Budgeting</div>
        <Link to="/budget" className={`nav-item ${location.pathname.startsWith('/budget') && !location.pathname.includes('/budget/versions') ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          Budget Engine
        </Link>
        {SHOW_ALL_MODULES && (
          <>
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
          </>
        )}
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

const Topbar = ({ user, onLogout, productionTitle, onNewClick, theme, onToggleTheme }) => {
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
        <button className="icon-btn" onClick={onToggleTheme} title="Toggle Theme" style={{marginLeft: '8px', border: 'none'}}>
          {theme === 'dark' ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          )}
        </button>
        <button className="btn primary" onClick={onNewClick} style={{marginLeft: '8px'}}>
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
  const [productions, setProductions] = useState([]);
  const [productionId, setProductionId] = useState(null);
  const [productionTitle, setProductionTitle] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newGenre, setNewGenre] = useState('Action');
  const [newBudget, setNewBudget] = useState(50000000);
  const [creating, setCreating] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const loadProductions = async () => {
    try {
      const res = await api.get('/productions');
      if (res.data && res.data.length > 0) {
        setProductions(res.data);
        // We no longer auto-select the first production
      }
    } catch (err) {
      console.error("Failed to load productions", err);
    }
  };

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
      loadProductions();
    }
  }, [user]);

  const handleSelectProduction = (id) => {
    const prod = productions.find(p => p.id === id);
    if (prod) {
      setProductionId(prod.id);
      setProductionTitle(prod.title);
    }
  };

  const handleCreateProduction = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await api.post('/productions', {
        title: newTitle.trim(),
        genre: newGenre,
        baseCurrency: 'INR',
        totalBudget: Number(newBudget)
      });
      const created = res.data;
      setProductions(prev => [...prev, created]);
      setProductionId(created.id);
      setProductionTitle(created.title);
      setNewTitle('');
      setIsModalOpen(false);
    } catch (err) {
      console.error("Failed to create production", err);
    }
    setCreating(false);
  };

  if (!user) {
    return <Login onLogin={setUser} theme={theme} onToggleTheme={toggleTheme} />;
  }

  // --- NEW: PROJECT SELECTION SCREEN ---
  if (user && !productionId) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh', padding: '80px 40px', fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--text)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
            <div>
              <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>Select a Project</h1>
              <p style={{ color: 'var(--text-faint)', margin: 0, fontSize: '15px' }}>Choose an existing production or start a new one</p>
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <button 
                onClick={toggleTheme} 
                style={{ padding: '12px', background: 'var(--surface-sunk)', color: 'var(--text-dim)', border: '1px solid var(--border)', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center' }}
                title="Toggle Theme"
              >
                {theme === 'dark' ? (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                )}
              </button>
              <button 
                onClick={() => { localStorage.removeItem('token'); setUser(null); }}
                style={{ padding: '12px 20px', background: 'transparent', color: 'var(--text-dim)', border: '1px solid var(--border)', borderRadius: '12px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}
                onMouseOver={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border-strong)'; }}
                onMouseOut={e => { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                Logout
              </button>
              <button 
                onClick={() => { setNewTitle(''); setIsModalOpen(true); }}
                style={{ padding: '12px 20px', background: 'linear-gradient(135deg, var(--primary) 0%, var(--violet) 100%)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px var(--primary-soft)', transition: 'all 0.2s' }}
                onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px var(--primary-soft)'; }}
                onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px var(--primary-soft)'; }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                New Project
              </button>
            </div>
          </div>

          {productions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', background: 'var(--surface-sunk)', borderRadius: '16px', border: '1px dashed var(--border)' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎬</div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 8px 0' }}>No projects found</h3>
              <p style={{ color: 'var(--text-faint)', margin: 0 }}>Create your first film production to get started.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
              {productions.map(p => (
                <div 
                  key={p.id}
                  onClick={() => handleSelectProduction(p.id)}
                  style={{
                    background: 'var(--surface)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid var(--border)',
                    borderRadius: '16px',
                    padding: '24px',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: 'var(--shadow-sm)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseOver={e => { 
                    e.currentTarget.style.transform = 'translateY(-4px)'; 
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  }}
                  onMouseOut={e => { 
                    e.currentTarget.style.transform = 'translateY(0)'; 
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  }}
                >
                  <div style={{ position: 'absolute', top: 0, right: 0, width: '100px', height: '100px', background: 'radial-gradient(circle, var(--primary-soft) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%', transform: 'translate(30%, -30%)' }} />
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--primary-soft) 0%, var(--violet-soft) 100%)', color: 'var(--primary-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 800, marginBottom: '20px', border: '1px solid var(--border-soft)' }}>
                    {p.title.substring(0,2).toUpperCase()}
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 10px 0', color: 'var(--text)', letterSpacing: '-0.3px' }}>{p.title}</h3>
                  <div style={{ display: 'flex', gap: '12px', color: 'var(--text-dim)', fontSize: '13px', fontWeight: 500 }}>
                    <span>{p.genre || 'Film'}</span>
                    <span>•</span>
                    <span style={{ color: 'var(--success)' }}>₹{(p.totalBudget / 10000000).toFixed(1)} Cr</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Re-use the New Production Modal logic here so it works on this screen too */}
        {isModalOpen && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999
          }}>
            <div style={{
              background: 'var(--surface)', borderRadius: '16px', padding: '32px',
              width: '420px', maxWidth: '90%', boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--border)', color: 'var(--text)'
            }}>
              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Create New Production</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-faint)', marginBottom: '24px' }}>
                Start a fresh, blank film project to run a live script analysis &amp; cost estimation demo.
              </p>
              <form onSubmit={handleCreateProduction}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Production Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Midnight Run (Demo)"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    style={{
                      width: '100%', padding: '12px 16px', background: 'var(--surface-sunk)', border: '1px solid var(--border)',
                      borderRadius: '8px', fontSize: '14px', outline: 'none', color: 'var(--text)', boxSizing: 'border-box'
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    autoFocus
                  />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Genre</label>
                  <select
                    value={newGenre}
                    onChange={(e) => setNewGenre(e.target.value)}
                    style={{
                      width: '100%', padding: '12px 16px', background: 'var(--surface-sunk)', border: '1px solid var(--border)',
                      borderRadius: '8px', fontSize: '14px', outline: 'none', color: 'var(--text)', boxSizing: 'border-box'
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  >
                    <option value="Action" style={{color: 'var(--text)'}}>Action</option>
                    <option value="Thriller" style={{color: 'var(--text)'}}>Thriller</option>
                    <option value="Drama" style={{color: 'var(--text)'}}>Drama</option>
                    <option value="Comedy" style={{color: 'var(--text)'}}>Comedy</option>
                    <option value="Sci-Fi" style={{color: 'var(--text)'}}>Sci-Fi</option>
                    <option value="Romance" style={{color: 'var(--text)'}}>Romance</option>
                  </select>
                </div>
                <div style={{ marginBottom: '28px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Initial Budget (₹)</label>
                  <input
                    type="number"
                    value={newBudget}
                    onChange={(e) => setNewBudget(e.target.value)}
                    style={{
                      width: '100%', padding: '12px 16px', background: 'var(--surface-sunk)', border: '1px solid var(--border)',
                      borderRadius: '8px', fontSize: '14px', outline: 'none', fontFamily: 'var(--font-mono)', color: 'var(--text)', boxSizing: 'border-box'
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    style={{ padding: '10px 16px', background: 'transparent', color: 'var(--text-dim)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !newTitle.trim()}
                    style={{ padding: '10px 16px', background: 'linear-gradient(135deg, var(--primary) 0%, var(--violet) 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: (creating || !newTitle.trim()) ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: (creating || !newTitle.trim()) ? 0.6 : 1 }}
                  >
                    {creating ? 'Creating...' : 'Create Project'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="app">
        <Sidebar
          productions={productions}
          productionId={productionId}
          onSelectProduction={handleSelectProduction}
          onNewClick={() => { setNewTitle(''); setIsModalOpen(true); }}
        />
        <div className="main">
          <Topbar
            user={user}
            onLogout={() => { localStorage.removeItem('token'); setUser(null); }}
            productionTitle={productionTitle || 'Film ERP'}
            onNewClick={() => { setNewTitle(''); setIsModalOpen(true); }}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
          <div className="content">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard productionId={productionId} />} />
              <Route path="/studio" element={<WritersRoom productionId={productionId} />} />
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
              <Route path="/evaluation" element={<ErrorBoundary><Evaluation productionId={productionId} /></ErrorBoundary>} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'var(--surface, #fff)', borderRadius: '12px', padding: '28px',
            width: '420px', maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>Create New Production</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-faint)', marginBottom: '20px' }}>
              Start a fresh, blank film project to run a live script analysis &amp; cost estimation demo.
            </p>
            <form onSubmit={handleCreateProduction}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Production Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Midnight Run (Demo)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', border: '1px solid var(--border)',
                    borderRadius: '6px', fontSize: '14px', outline: 'none'
                  }}
                  autoFocus
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Genre</label>
                <select
                  value={newGenre}
                  onChange={(e) => setNewGenre(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', border: '1px solid var(--border)',
                    borderRadius: '6px', fontSize: '14px', outline: 'none', background: 'var(--surface)'
                  }}
                >
                  <option value="Action">Action</option>
                  <option value="Thriller">Thriller</option>
                  <option value="Drama">Drama</option>
                  <option value="Comedy">Comedy</option>
                  <option value="Sci-Fi">Sci-Fi</option>
                  <option value="Romance">Romance</option>
                </select>
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Initial Budget (₹)</label>
                <input
                  type="number"
                  value={newBudget}
                  onChange={(e) => setNewBudget(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', border: '1px solid var(--border)',
                    borderRadius: '6px', fontSize: '14px', outline: 'none', fontFamily: 'var(--font-mono)'
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn primary"
                  disabled={creating || !newTitle.trim()}
                >
                  {creating ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </BrowserRouter>
  );
}

export default App;
