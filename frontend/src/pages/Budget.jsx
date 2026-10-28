import React, { useState, useEffect, useMemo } from 'react';
import { fetchBudget, generateBudgetQuote, allocateBudget, fetchRateCards } from '../api';

const Budget = ({ productionId }) => {
  const [budget, setBudget] = useState([]);
  const [rateCards, setRateCards] = useState([]);
  const [selectedRateCard, setSelectedRateCard] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'ATL' | 'BTL'
  const [expandedDepts, setExpandedDepts] = useState({});

  useEffect(() => {
    if (productionId) {
      loadBudget();
      loadRateCards();
    }
  }, [productionId]);

  const loadBudget = async () => {
    try {
      const res = await fetchBudget(productionId);
      const items = res.data || [];
      setBudget(items);
      
      // Auto-expand all departments by default so user sees line items immediately
      const depts = {};
      items.forEach(i => {
        if (i.department) depts[i.department] = true;
      });
      setExpandedDepts(depts);
    } catch (err) {
      console.error("Failed to load budget", err);
    }
  };

  const loadRateCards = async () => {
    try {
      const res = await fetchRateCards();
      const list = res.data || [];
      setRateCards(list);
      const active = list.find(rc => rc.isActive);
      if (active) setSelectedRateCard(active.id);
      else if (list.length > 0) setSelectedRateCard(list[0].id);
    } catch (err) {
      console.error("Failed to load rate cards", err);
    }
  };

  const handleGenerateQuote = async () => {
    setLoading(true);
    setActionMessage(null);
    try {
      await generateBudgetQuote(productionId);
      await loadBudget();
      setActionMessage({ type: 'success', text: 'AI budget quote generated successfully from extracted entities!' });
    } catch (err) {
      console.error(err);
      setActionMessage({ type: 'error', text: err.response?.data?.error || 'Failed to generate quote.' });
    }
    setLoading(false);
  };

  const handleAllocateBudget = async () => {
    setLoading(true);
    setActionMessage(null);
    try {
      await allocateBudget(productionId);
      await loadBudget();
      setActionMessage({ type: 'success', text: 'Top-down budget successfully allocated across departments.' });
    } catch (err) {
      console.error(err);
      setActionMessage({ type: 'error', text: err.response?.data?.error || 'Failed to allocate budget.' });
    }
    setLoading(false);
  };

  const toggleDept = (dept) => {
    setExpandedDepts(prev => ({
      ...prev,
      [dept]: !prev[dept]
    }));
  };

  const toggleAll = (expand) => {
    const updated = {};
    budget.forEach(i => {
      if (i.department) updated[i.department] = expand;
    });
    setExpandedDepts(updated);
  };

  // Filtered items based on search and section tab
  const filteredBudget = useMemo(() => {
    return budget.filter(item => {
      const isATL = item.budgetLine === 'ATL' || (item.department === 'Cast' || item.department === 'Director' || item.department === 'Producer');
      if (activeTab === 'ATL' && !isATL) return false;
      if (activeTab === 'BTL' && isATL) return false;

      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        item.description?.toLowerCase().includes(q) ||
        item.department?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q) ||
        item.sourceScene?.toLowerCase().includes(q)
      );
    });
  }, [budget, activeTab, searchTerm]);

  // Group by Main Section (ATL / BTL) and Department
  const groupedBudget = useMemo(() => {
    return filteredBudget.reduce((acc, curr) => {
      const isATL = curr.budgetLine === 'ATL' || (curr.department === 'Cast' || curr.department === 'Director' || curr.department === 'Producer');
      const section = isATL ? 'Above The Line (ATL)' : 'Below The Line (BTL)';
      
      if (!acc[section]) acc[section] = {};
      const deptName = curr.department || 'General';
      
      if (!acc[section][deptName]) {
        acc[section][deptName] = { items: [], est: 0, actual: 0 };
      }
      acc[section][deptName].items.push(curr);
      acc[section][deptName].est += (curr.estimatedCost || 0);
      acc[section][deptName].actual += (curr.actualCost || 0);
      return acc;
    }, {});
  }, [filteredBudget]);

  // Overall totals across entire budget
  const totalEst = budget.reduce((sum, i) => sum + (i.estimatedCost || 0), 0);
  const totalAct = budget.reduce((sum, i) => sum + (i.actualCost || 0), 0);
  const netVariance = totalEst - totalAct; // Positive = Under budget (savings), Negative = Over budget
  const isOverBudget = netVariance < 0;
  const variancePct = totalEst > 0 ? ((Math.abs(netVariance) / totalEst) * 100).toFixed(1) : '0.0';

  const atlEst = budget.filter(i => i.budgetLine === 'ATL' || i.department === 'Cast').reduce((sum, i) => sum + (i.estimatedCost || 0), 0);
  const btlEst = totalEst - atlEst;
  const atlPct = totalEst > 0 ? ((atlEst / totalEst) * 100).toFixed(0) : 50;

  const formatINR = (amt) => new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amt || 0);

  const formatPct = (rate) => `${((rate || 0) * 100).toFixed(1)}%`;

  const getDeptBadgeClass = (dept) => {
    const d = (dept || '').toLowerCase();
    if (d.includes('cast')) return 'badge cast';
    if (d.includes('loc')) return 'badge loc';
    if (d.includes('art') || d.includes('prop') || d.includes('costume')) return 'badge art';
    if (d.includes('equip') || d.includes('cam')) return 'badge equip';
    return 'badge muted';
  };

  const allExpanded = Object.values(expandedDepts).every(Boolean) && Object.keys(expandedDepts).length > 0;

  return (
    <div className="screen active" id="budget" style={{ paddingBottom: '60px' }}>
      {/* Header */}
      <div className="page-head" style={{ marginBottom: '16px' }}>
        <div>
          <div className="page-title">Budget Engine</div>
          <div className="page-sub">Comprehensive Pre-Production Cost Hierarchy (Above-The-Line & Below-The-Line)</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select 
            className="btn" 
            value={selectedRateCard} 
            onChange={(e) => setSelectedRateCard(e.target.value)}
            style={{ fontWeight: 500, padding: '7px 12px' }}
          >
            {rateCards.map(rc => (
              <option key={rc.id} value={rc.id}>Rate Card: {rc.name} {rc.isActive ? '(Active)' : ''}</option>
            ))}
            {rateCards.length === 0 && <option value="">Standard Rate Card (Default)</option>}
          </select>
          <button className="btn" onClick={handleAllocateBudget} disabled={loading} title="Distribute top-down funds across stages">
            Top-Down Allocation
          </button>
          <button className="btn primary" onClick={handleGenerateQuote} disabled={loading} title="Build bottom-up quote from extracted entities">
            {loading ? 'Processing...' : '⚡ Generate AI Quote'}
          </button>
        </div>
      </div>

      {actionMessage && (
        <div style={{
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '16px',
          fontSize: '12.5px',
          fontWeight: 500,
          background: actionMessage.type === 'success' ? 'var(--success-soft)' : 'var(--danger-soft)',
          color: actionMessage.type === 'success' ? 'var(--success)' : 'var(--danger)',
          border: `1px solid ${actionMessage.type === 'success' ? 'rgba(14,159,110,0.2)' : 'rgba(229,72,77,0.2)'}`
        }}>
          {actionMessage.text}
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="kpi-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '20px' }}>
        <div className="kpi">
          <div className="kpi-top">
            <div className="kpi-icon violet">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
            </div>
            <span className="badge muted">{budget.length} Line Items</span>
          </div>
          <div className="kpi-label">Total Estimated Cost</div>
          <div className="kpi-value">{formatINR(totalEst)}</div>
          <div className="text-xs text-faint" style={{ marginTop: '8px' }}>
            Base Quote derived from rate-cards
          </div>
        </div>

        <div className="kpi">
          <div className="kpi-top">
            <div className="kpi-icon blue">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <span className="badge info">Logged Actuals</span>
          </div>
          <div className="kpi-label">Actual Expenditure</div>
          <div className="kpi-value">{formatINR(totalAct)}</div>
          <div className="text-xs text-faint" style={{ marginTop: '8px' }}>
            Total actual invoices & petty cash logged
          </div>
        </div>

        <div className="kpi">
          <div className="kpi-top">
            <div className={`kpi-icon ${isOverBudget ? 'red' : 'green'}`}>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                {isOverBudget ? (
                  <path d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>
                ) : (
                  <path d="M20 6L9 17l-5-5"/>
                )}
              </svg>
            </div>
            <div className={`kpi-delta ${isOverBudget ? 'up-bad' : 'up-good'}`}>
              {isOverBudget ? `▲ ${variancePct}% Over` : `▼ ${variancePct}% Under`}
            </div>
          </div>
          <div className="kpi-label">Budget Variance</div>
          <div className={`kpi-value ${isOverBudget ? 'alert' : 'good'}`}>
            {isOverBudget ? `−${formatINR(Math.abs(netVariance))}` : `+${formatINR(netVariance)}`}
          </div>
          <div className="text-xs text-faint" style={{ marginTop: '8px' }}>
            {isOverBudget ? 'Exceeding initial quote' : 'Within production estimate'}
          </div>
        </div>

        <div className="kpi">
          <div className="kpi-top">
            <div className="kpi-icon violet">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
            </div>
            <span className="text-xs mono text-dim">{atlPct}% ATL / {100 - atlPct}% BTL</span>
          </div>
          <div className="kpi-label">ATL vs BTL Ratio</div>
          <div style={{ marginTop: '8px' }}>
            <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', background: 'var(--surface-sunk)' }}>
              <div style={{ width: `${atlPct}%`, background: 'var(--primary)' }} title={`ATL: ${formatINR(atlEst)}`} />
              <div style={{ width: `${100 - atlPct}%`, background: 'var(--info)' }} title={`BTL: ${formatINR(btlEst)}`} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: 'var(--text-dim)' }}>
              <span>ATL: {formatINR(atlEst)}</span>
              <span>BTL: {formatINR(btlEst)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Control Toolbar */}
      <div className="panel" style={{ marginBottom: '16px' }}>
        <div style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="toggle-row" style={{ margin: 0 }}>
              <div 
                className={`toggle-opt ${activeTab === 'ALL' ? 'active' : ''}`}
                onClick={() => setActiveTab('ALL')}
              >
                All Items ({budget.length})
              </div>
              <div 
                className={`toggle-opt ${activeTab === 'ATL' ? 'active' : ''}`}
                onClick={() => setActiveTab('ATL')}
              >
                ATL Only
              </div>
              <div 
                className={`toggle-opt ${activeTab === 'BTL' ? 'active' : ''}`}
                onClick={() => setActiveTab('BTL')}
              >
                BTL Only
              </div>
            </div>

            <button 
              className="btn" 
              style={{ padding: '6px 10px', fontSize: '12px' }}
              onClick={() => toggleAll(!allExpanded)}
            >
              {allExpanded ? 'Collapse All' : 'Expand All'}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative', width: '260px' }}>
              <input 
                type="text" 
                placeholder="Search items, scenes, departments..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 32px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  fontSize: '12px',
                  outline: 'none'
                }}
              />
              <svg 
                viewBox="0 0 24 24" 
                fill="none" 
                strokeWidth="2" 
                stroke="var(--text-faint)"
                style={{ position: 'absolute', left: '9px', top: '9px', width: '14px', height: '14px' }}
              >
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')} 
                  style={{ position: 'absolute', right: '8px', top: '7px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)' }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Hierarchical Budget Listing */}
      {Object.keys(groupedBudget).length === 0 ? (
        <div className="panel" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--primary-soft)', color: 'var(--primary-strong)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" style={{ width: '24px', height: '24px' }}>
              <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>
            </svg>
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px 0' }}>No budget line items found</h3>
          <p className="text-dim" style={{ maxWidth: '460px', margin: '0 auto 20px auto', fontSize: '13px' }}>
            {searchTerm 
              ? `No items match the search term "${searchTerm}". Try clearing the search.`
              : 'Generate an automatic bottom-up budget quote from your screenplay entities, or allocate a fixed top-down budget.'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
            <button className="btn primary" onClick={handleGenerateQuote} disabled={loading}>
              Generate AI Quote from Script
            </button>
            <button className="btn" onClick={handleAllocateBudget} disabled={loading}>
              Apply Top-Down Allocation
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {['Above The Line (ATL)', 'Below The Line (BTL)'].map(sectionTitle => {
            const depts = groupedBudget[sectionTitle];
            if (!depts || Object.keys(depts).length === 0) return null;

            const sectionEst = Object.values(depts).reduce((sum, d) => sum + d.est, 0);
            const sectionAct = Object.values(depts).reduce((sum, d) => sum + d.actual, 0);
            const sectionVar = sectionEst - sectionAct;
            const isATL = sectionTitle.includes('ATL');

            return (
              <div key={sectionTitle} className="panel">
                {/* Section Header */}
                <div className="panel-head" style={{ background: 'var(--surface-sunk)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className={`badge ${isATL ? 'cast' : 'loc'}`}>
                      {isATL ? 'ATL' : 'BTL'}
                    </span>
                    <h3 style={{ fontSize: '14.5px', fontWeight: 800 }}>{sectionTitle}</h3>
                    <span className="hint">({Object.values(depts).reduce((acc, d) => acc + d.items.length, 0)} items)</span>
                  </div>
                  <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <div className="text-xs">
                      <span className="text-faint">Estimated: </span>
                      <b className="mono text-sm">{formatINR(sectionEst)}</b>
                    </div>
                    <div className="text-xs">
                      <span className="text-faint">Actual: </span>
                      <b className="mono text-sm">{formatINR(sectionAct)}</b>
                    </div>
                    <div className="text-xs">
                      <span className="text-faint">Variance: </span>
                      <b className={`mono text-sm ${sectionVar < 0 ? 'text-danger' : 'text-success'}`}>
                        {sectionVar < 0 ? `−${formatINR(Math.abs(sectionVar))}` : `+${formatINR(sectionVar)}`}
                      </b>
                    </div>
                  </div>
                </div>

                {/* Department Accordions */}
                <div className="panel-body" style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {Object.entries(depts).map(([dept, data]) => {
                      const isExpanded = !!expandedDepts[dept];
                      const deptVar = data.est - data.actual;
                      const deptOver = deptVar < 0;

                      return (
                        <div 
                          key={dept} 
                          style={{
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)',
                            overflow: 'hidden',
                            background: 'var(--surface)'
                          }}
                        >
                          {/* Accordion Bar */}
                          <div
                            onClick={() => toggleDept(dept)}
                            style={{
                              padding: '12px 16px',
                              background: isExpanded ? 'var(--surface-hover)' : 'var(--surface)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              cursor: 'pointer',
                              userSelect: 'none',
                              borderBottom: isExpanded ? '1px solid var(--border-soft)' : 'none',
                              transition: 'background 0.12s ease'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontSize: '11px', color: 'var(--text-faint)', width: '12px', textAlign: 'center' }}>
                                {isExpanded ? '▼' : '▶'}
                              </span>
                              <span className={getDeptBadgeClass(dept)}>{dept}</span>
                              <span style={{ fontWeight: 700, fontSize: '13.5px' }}>{dept}</span>
                              <span className="text-xs text-faint">({data.items.length} lines)</span>
                            </div>

                            <div style={{ display: 'flex', gap: '24px', alignItems: 'center', textAlign: 'right' }}>
                              <div>
                                <div className="text-xs text-faint">Est. Cost</div>
                                <div className="mono" style={{ fontWeight: 600 }}>{formatINR(data.est)}</div>
                              </div>
                              <div>
                                <div className="text-xs text-faint">Actual Spend</div>
                                <div className="mono" style={{ fontWeight: 600 }}>{formatINR(data.actual)}</div>
                              </div>
                              <div style={{ minWidth: '95px' }}>
                                <div className="text-xs text-faint">Variance</div>
                                <div className={`mono ${deptOver ? 'text-danger' : 'text-success'}`} style={{ fontWeight: 700 }}>
                                  {deptOver ? `−${formatINR(Math.abs(deptVar))}` : `+${formatINR(deptVar)}`}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Line Items Table */}
                          {isExpanded && (
                            <div style={{ overflowX: 'auto' }}>
                              <table>
                                <thead>
                                  <tr>
                                    <th style={{ minWidth: '220px' }}>Item Description</th>
                                    <th>Category</th>
                                    <th className="text-right">Qty &amp; Unit</th>
                                    <th className="text-right">Base Rate</th>
                                    <th className="text-right">Fringe (Rate)</th>
                                    <th className="text-right">Estimated</th>
                                    <th className="text-right">Actual Spent</th>
                                    <th className="text-right">Variance</th>
                                    <th style={{ minWidth: '100px' }}>Traceability</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {data.items.map(item => {
                                    const itemVar = (item.estimatedCost || 0) - (item.actualCost || 0);
                                    const itemOver = itemVar < 0;

                                    return (
                                      <tr key={item.id}>
                                        <td>
                                          <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                                            {item.description}
                                          </div>
                                          {item.costCategory && (
                                            <div className="text-xs text-faint">{item.costCategory}</div>
                                          )}
                                        </td>
                                        <td>
                                          <span className="badge muted">
                                            {item.category || 'General'}
                                          </span>
                                        </td>
                                        <td className="num mono">
                                          {item.quantity} <span className="text-faint">{item.unit ? item.unit.replace('per_', '/') : ''}</span>
                                        </td>
                                        <td className="num mono">
                                          {formatINR(item.unitRate)}
                                        </td>
                                        <td className="num mono">
                                          {item.fringeAmount > 0 ? (
                                            <div>
                                              <div>{formatINR(item.fringeAmount)}</div>
                                              <div className="text-xs text-faint">({formatPct(item.fringeRate)})</div>
                                            </div>
                                          ) : (
                                            <span className="text-faint">—</span>
                                          )}
                                        </td>
                                        <td className="num mono" style={{ fontWeight: 700 }}>
                                          {formatINR(item.estimatedCost)}
                                        </td>
                                        <td className="num mono" style={{ fontWeight: 600 }}>
                                          {formatINR(item.actualCost)}
                                        </td>
                                        <td className={`num mono ${itemOver ? 'text-danger' : 'text-success'}`} style={{ fontWeight: 700 }}>
                                          {itemOver ? `−${formatINR(Math.abs(itemVar))}` : `+${formatINR(itemVar)}`}
                                        </td>
                                        <td>
                                          {item.sourceScene ? (
                                            <span 
                                              className="badge info" 
                                              title={`Linked to Screenplay Scene: ${item.sourceScene} (Entity ID #${item.sourceEntityId || item.elementId})`}
                                            >
                                              {item.sourceScene}
                                            </span>
                                          ) : (
                                            <span className="badge muted" title="Standard Rate Card Baseline Item">
                                              Rate Card
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Budget;
