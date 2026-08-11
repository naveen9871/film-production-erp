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
  }

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

  // Group by department
  const depts = budget.reduce((acc, curr) => {
    if (!acc[curr.department]) acc[curr.department] = { items: [], est: 0, actual: 0 };
    acc[curr.department].items.push(curr);
    acc[curr.department].est += curr.estimatedCost;
    acc[curr.department].actual += curr.actualCost;
    return acc;
  }, {});

  const totalEst = budget.reduce((sum, i) => sum + i.estimatedCost, 0);
  const totalAct = budget.reduce((sum, i) => sum + i.actualCost, 0);

  const formatINR = (amt) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt || 0);

  return (
    <div className="screen active" id="budget">
      <div className="page-head">
        <div>
          <div className="page-title">Budget Engine</div>
          <div className="page-sub">Generate, allocate, and track production budget</div>
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
          {Object.entries(depts).length === 0 ? (
            <p className="text-dim text-center">No budget generated yet. Click "Generate AI Quote" to start.</p>
          ) : (
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
                          <div className="text-dim" style={{ fontSize: '12px' }}>Est. Cost</div>
                          <div style={{ fontWeight: '500' }}>{formatINR(data.est)}</div>
                        </div>
                        <div>
                          <div className="text-dim" style={{ fontSize: '12px' }}>Actual Cost</div>
                          <div style={{ fontWeight: '500' }}>{formatINR(data.actual)}</div>
                        </div>
                        <div>
                          <div className="text-dim" style={{ fontSize: '12px' }}>Variance</div>
                          <div className={variance < 0 ? 'alert' : 'good'} style={{ fontWeight: '500' }}>{formatINR(variance)}</div>
                        </div>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <table style={{ margin: '0' }}>
                        <thead>
                          <tr>
                            <th>Description</th>
                            <th>Category</th>
                            <th className="num">Qty</th>
                            <th className="num">Rate</th>
                            <th className="num">Est. Total</th>
                            <th>Traceability</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.items.map(item => (
                            <tr key={item.id}>
                              <td>{item.description}</td>
                              <td>{item.category}</td>
                              <td className="num">{item.quantity} {item.unit}</td>
                              <td className="num">{formatINR(item.unitRate)}</td>
                              <td className="num" style={{ fontWeight: '500' }}>{formatINR(item.estimatedCost)}</td>
                              <td>
                                {item.sourceScene ? (
                                  <span className="badge signed" title={`Entity ID: ${item.sourceEntityId}`}>{item.sourceScene}</span>
                                ) : (
                                  <span className="badge text-dim">Manual</span>
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
          )}
        </div>
      </div>

      {budget.length > 0 && (
        <div style={{ position: 'sticky', bottom: '24px', background: 'var(--surface)', padding: '16px 24px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
          <div style={{ fontSize: '18px', fontWeight: '600' }}>Total Budget</div>
          <div style={{ display: 'flex', gap: '32px', textAlign: 'right' }}>
            <div>
              <div className="text-dim" style={{ fontSize: '12px' }}>Total Est. Cost</div>
              <div style={{ fontWeight: '600', fontSize: '16px' }}>{formatINR(totalEst)}</div>
            </div>
            <div>
              <div className="text-dim" style={{ fontSize: '12px' }}>Total Actual Cost</div>
              <div style={{ fontWeight: '600', fontSize: '16px' }}>{formatINR(totalAct)}</div>
            </div>
            <div>
              <div className="text-dim" style={{ fontSize: '12px' }}>Total Variance</div>
              <div className={(totalEst - totalAct) < 0 ? 'alert' : 'good'} style={{ fontWeight: '600', fontSize: '16px' }}>{formatINR(totalEst - totalAct)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Budget;
