import React, { useState, useEffect } from 'react';
import { fetchBudget, generateBudgetQuote, allocateBudget, fetchRateCards } from '../api';

const Budget = ({ productionId }) => {
  const [budget, setBudget] = useState([]);
  const [rateCards, setRateCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedDept, setExpandedDept] = useState(null);

  useEffect(() => {
    if (productionId) {
      loadBudget();
      loadRateCards();
    }
  }, [productionId]);

  const loadBudget = async () => {
    try {
      const res = await fetchBudget(productionId);
      setBudget(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadRateCards = async () => {
    try {
      const res = await fetchRateCards();
      setRateCards(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateQuote = async () => {
    setLoading(true);
    try {
      await generateBudgetQuote(productionId);
      await loadBudget();
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleAllocateBudget = async () => {
    setLoading(true);
    try {
      await allocateBudget(productionId);
      await loadBudget();
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  // Group by ATL / BTL and then by department
  const groupedBudget = budget.reduce((acc, curr) => {
    const mainSection = curr.budgetLine === 'ATL' ? 'Above The Line (ATL)' : 'Below The Line (BTL)';
    if (!acc[mainSection]) acc[mainSection] = {};
    
    if (!acc[mainSection][curr.department]) acc[mainSection][curr.department] = { items: [], est: 0, actual: 0 };
    acc[mainSection][curr.department].items.push(curr);
    acc[mainSection][curr.department].est += curr.estimatedCost;
    acc[mainSection][curr.department].actual += curr.actualCost;
    return acc;
  }, {});

  const totalEst = budget.reduce((sum, i) => sum + i.estimatedCost, 0);
  const totalAct = budget.reduce((sum, i) => sum + i.actualCost, 0);

  const formatINR = (amt) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt || 0);
  const formatPct = (rate) => (rate * 100).toFixed(1) + '%';

  return (
    <div className="screen active" id="budget">
      <div className="page-head">
        <div>
          <div className="page-title">Budget Engine</div>
          <div className="page-subtitle">Generate, allocate, and track production budget (ATL & BTL).</div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <select className="input" style={{ width: 'auto' }}>
            {rateCards.map(rc => (
              <option key={rc.id} value={rc.id}>{rc.name} {rc.isActive ? '(Active)' : ''}</option>
            ))}
            {rateCards.length === 0 && <option>Default Rate Card</option>}
          </select>
          <button className="btn" onClick={handleAllocateBudget} disabled={loading}>Top-Down Allocation</button>
          <button className="btn primary" onClick={handleGenerateQuote} disabled={loading}>
            {loading ? 'Generating...' : 'Generate AI Quote'}
          </button>
        </div>
      </div>

      <div className="panel" style={{ marginTop: '24px' }}>
        <div className="panel-head">
          <h3>Line Items</h3>
          <span className="hint">{budget.length} items</span>
        </div>
        <div className="panel-body">
          {Object.keys(groupedBudget).length === 0 ? (
            <p className="text-dim text-center" style={{padding: '48px 0'}}>No budget generated yet. Click "Generate AI Quote" to start.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {['Above The Line (ATL)', 'Below The Line (BTL)'].map(section => {
                if (!groupedBudget[section]) return null;
                const depts = groupedBudget[section];
                
                const sectionEst = Object.values(depts).reduce((sum, d) => sum + d.est, 0);
                const sectionAct = Object.values(depts).reduce((sum, d) => sum + d.actual, 0);

                return (
                  <div key={section}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--border)', paddingBottom: '8px', marginBottom: '16px' }}>
                      <h4 style={{ margin: 0, color: 'var(--primary-strong)' }}>{section}</h4>
                      <div className="mono text-sm">
                        <b>Est:</b> {formatINR(sectionEst)} <span style={{margin:'0 8px', color:'var(--border)'}}>|</span> 
                        <b>Act:</b> {formatINR(sectionAct)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {Object.entries(depts).map(([dept, data]) => {
                        const isExpanded = expandedDept === dept;
                        const variance = data.est - data.actual;
                        return (
                          <div key={dept} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                            <div 
                              style={{ padding: '16px', background: 'var(--surface-sunk)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderRadius: 'var(--radius-sm)' }}
                              onClick={() => setExpandedDept(isExpanded ? null : dept)}
                            >
                              <div style={{ fontWeight: '600', fontSize: '15px' }}>
                                {isExpanded ? '▼' : '▶'} {dept}
                              </div>
                              <div style={{ display: 'flex', gap: '24px', textAlign: 'right' }}>
                                <div>
                                  <div className="text-faint text-sm">Est. Cost</div>
                                  <div className="mono">{formatINR(data.est)}</div>
                                </div>
                                <div>
                                  <div className="text-faint text-sm">Actual Cost</div>
                                  <div className="mono">{formatINR(data.actual)}</div>
                                </div>
                                <div>
                                  <div className="text-faint text-sm">Variance</div>
                                  <div className={`mono ${variance < 0 ? 'text-danger' : 'text-success'}`}>{formatINR(variance)}</div>
                                </div>
                              </div>
                            </div>
                            
                            {isExpanded && (
                              <table className="table" style={{ margin: '0' }}>
                                <thead>
                                  <tr>
                                    <th>Description</th>
                                    <th>Category</th>
                                    <th className="text-right">Qty</th>
                                    <th className="text-right">Base Rate</th>
                                    <th className="text-right">Fringe</th>
                                    <th className="text-right">Est. Total</th>
                                    <th>Traceability</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {data.items.map(item => (
                                    <tr key={item.id}>
                                      <td>{item.description}</td>
                                      <td>{item.category}</td>
                                      <td className="text-right mono">{item.quantity} {item.unit.replace('per_', '/')}</td>
                                      <td className="text-right mono">{formatINR(item.unitRate)}</td>
                                      <td className="text-right mono">
                                        {item.fringeRate > 0 ? (
                                          <div>
                                            <div>{formatINR(item.fringeAmount)}</div>
                                            <div className="text-xs text-faint">({formatPct(item.fringeRate)})</div>
                                          </div>
                                        ) : '-'}
                                      </td>
                                      <td className="text-right mono" style={{ fontWeight: '500' }}>{formatINR(item.estimatedCost)}</td>
                                      <td>
                                        {item.sourceScene ? (
                                          <span className="badge info" title={`Entity ID: ${item.sourceEntityId}`}>{item.sourceScene}</span>
                                        ) : (
                                          <span className="badge">Manual</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {budget.length > 0 && (
        <div style={{ position: 'sticky', bottom: '24px', background: 'var(--surface)', padding: '16px 24px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
          <div style={{ fontSize: '18px', fontWeight: '600' }}>Total Budget</div>
          <div style={{ display: 'flex', gap: '32px', textAlign: 'right' }}>
            <div>
              <div className="text-faint text-sm">Total Est. Cost</div>
              <div className="mono" style={{ fontWeight: '600', fontSize: '16px' }}>{formatINR(totalEst)}</div>
            </div>
            <div>
              <div className="text-faint text-sm">Total Actual Cost</div>
              <div className="mono" style={{ fontWeight: '600', fontSize: '16px' }}>{formatINR(totalAct)}</div>
            </div>
            <div>
              <div className="text-faint text-sm">Total Variance</div>
              <div className={`mono ${(totalEst - totalAct) < 0 ? 'text-danger' : 'text-success'}`} style={{ fontWeight: '600', fontSize: '16px' }}>{formatINR(totalEst - totalAct)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Budget;
