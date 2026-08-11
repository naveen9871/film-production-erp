import React, { useState, useEffect } from 'react';
import api from '../api';

const Budget = ({ productionId }) => {
  const [budget, setBudget] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (productionId) fetchBudget();
  }, [productionId]);

  const fetchBudget = async () => {
    try {
      const res = await api.get(`/productions/${productionId}/budget`);
      setBudget(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const generateQuote = async () => {
    setLoading(true);
    try {
      await api.post(`/productions/${productionId}/budget/quote`);
      fetchBudget();
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const allocateBudget = async () => {
    setLoading(true);
    try {
      await api.post(`/productions/${productionId}/budget/allocate`);
      fetchBudget();
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="animate-fade-in glass-card">
      <h1>Budget Engine</h1>
      
      <div style={{ margin: '2rem 0', display: 'flex', gap: '1rem' }}>
        <button 
          onClick={generateQuote} 
          disabled={loading}
          style={{ padding: '0.5rem 1rem', background: 'var(--color-accent)', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Generate AI Quote (Bottom-Up)
        </button>
        <button 
          onClick={allocateBudget} 
          disabled={loading}
          style={{ padding: '0.5rem 1rem', background: '#333', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Allocate Total Budget (Top-Down)
        </button>
      </div>

      {budget.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
          <thead>
            <tr style={{ background: '#f0f0f0', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem' }}>Department</th>
              <th style={{ padding: '0.75rem' }}>Category</th>
              <th style={{ padding: '0.75rem' }}>Description</th>
              <th style={{ padding: '0.75rem' }}>Source</th>
              <th style={{ padding: '0.75rem', textAlign: 'right' }}>Est. Cost (₹)</th>
            </tr>
          </thead>
          <tbody>
            {budget.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.75rem' }}>{item.department}</td>
                <td style={{ padding: '0.75rem' }}>{item.category}</td>
                <td style={{ padding: '0.75rem' }}>{item.description}</td>
                <td style={{ padding: '0.75rem', fontSize: '0.85em', color: '#666' }}>{item.sourceScene || 'System'}</td>
                <td style={{ padding: '0.75rem', textAlign: 'right' }}>{item.estimatedCost.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Budget;
