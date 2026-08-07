import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Film, LayoutDashboard, FileText, PieChart, DollarSign, Receipt, FileDown } from 'lucide-react';
import './index.css';

// Layout Components
const Sidebar = () => {
  const location = useLocation();
  const navItems = [
    { path: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { path: '/script', icon: <FileText size={20} />, label: 'Script Analysis' },
    { path: '/budget', icon: <PieChart size={20} />, label: 'Budget' },
    { path: '/expenses', icon: <Receipt size={20} />, label: 'Expenses' },
    { path: '/revenue', icon: <DollarSign size={20} />, label: 'Revenue & P&L' },
    { path: '/reports', icon: <FileDown size={20} />, label: 'Reports' },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <Film size={28} />
        <span>Film ERP</span>
      </div>
      <div className="nav-links">
        {navItems.map((item) => (
          <Link 
            key={item.path} 
            to={item.path} 
            className={`nav-link ${location.pathname.startsWith(item.path) ? 'active' : ''}`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
};

const Topbar = () => {
  return (
    <div className="topbar">
      <div>
        <h3 style={{ margin: 0 }}>Project: Blockbuster 2026</h3>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span className="text-muted">Producer Mode</span>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
          P
        </div>
      </div>
    </div>
  );
};

// Placeholder Pages (To be implemented)
const Dashboard = () => <div className="animate-fade-in glass-card"><h1>Dashboard</h1><p>KPIs and Executive Summary will go here.</p></div>;
const ScriptAnalysis = () => <div className="animate-fade-in glass-card"><h1>Script Analysis</h1><p>Upload script and AI extraction will go here.</p></div>;
const Budget = () => <div className="animate-fade-in glass-card"><h1>Budget Engine</h1><p>Quote and Allocation modes will go here.</p></div>;
const Expenses = () => <div className="animate-fade-in glass-card"><h1>Expense Tracking</h1><p>Actual vs Estimated tracking will go here.</p></div>;
const Revenue = () => <div className="animate-fade-in glass-card"><h1>Revenue & P&L</h1><p>Rights management will go here.</p></div>;
const Reports = () => <div className="animate-fade-in glass-card"><h1>Reports</h1><p>PDF/CSV export will go here.</p></div>;

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <Topbar />
          <div className="page-content">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/script" element={<ScriptAnalysis />} />
              <Route path="/budget" element={<Budget />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/revenue" element={<Revenue />} />
              <Route path="/reports" element={<Reports />} />
            </Routes>
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
