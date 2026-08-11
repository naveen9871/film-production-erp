import React, { useState, useEffect } from 'react';
import api from '../api';

const Revenue = ({ productionId }) => {
  const [rights, setRights] = useState([]);
  const [profitability, setProfitability] = useState(null);
  const [form, setForm] = useState({ category: '', expectedRevenue: '', actualRevenue: '', buyer: '' });

  useEffect(() => {
    if (productionId) fetchData();
  }, [productionId]);

  const fetchData = async () => {
    try {
      const [rightsRes, profitRes] = await Promise.all([
        api.get(`/productions/${productionId}/rights`),
        api.get(`/productions/${productionId}/profitability`)
      ]);
      setRights(rightsRes.data || []);
      setProfitability(profitRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddRights = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/productions/${productionId}/rights`, {
        productionId: Number(productionId),
        category: form.category,
        expectedRevenue: Number(form.expectedRevenue),
        actualRevenue: Number(form.actualRevenue),
        buyer: form.buyer,
        status: 'Signed'
      });
      setForm({ category: '', expectedRevenue: '', actualRevenue: '', buyer: '' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="animate-fade-in glass-card">
      <h1>Revenue & Rights Management</h1>

      {profitability && (
        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', marginBottom: '2rem' }}>
          <div style={{ flex: 1, padding: '1.5rem', background: '#f8f9fa', borderRadius: '8px' }}>
            <h3>Total Actual Cost</h3>
            <h2>₹{profitability.TotalCost.toFixed(2)}</h2>
          </div>
          <div style={{ flex: 1, padding: '1.5rem', background: '#f8f9fa', borderRadius: '8px' }}>
            <h3>Total Expected Revenue</h3>
            <h2>₹{profitability.TotalExpectedRevenue.toFixed(2)}</h2>
          </div>
          <div style={{ flex: 1, padding: '1.5rem', background: profitability.IsProfitable ? '#e6f4ea' : '#fce8e6', borderRadius: '8px' }}>
            <h3>Projected Profit / Loss</h3>
            <h2 style={{ color: profitability.IsProfitable ? 'green' : 'red' }}>
              ₹{profitability.ExpectedProfitLoss.toFixed(2)}
            </h2>
            <p>ROI: {profitability.ExpectedROI.toFixed(2)}%</p>
          </div>
        </div>
      )}

      <div style={{ padding: '1.5rem', background: '#f8f9fa', borderRadius: '8px' }}>
        <h3>Add Rights Record</h3>
        <form onSubmit={handleAddRights} style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <select 
            value={form.category} 
            onChange={e => setForm({...form, category: e.target.value})}
            required
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="">Select Category</option>
            <option value="Satellite">Satellite</option>
            <option value="Audio">Audio</option>
            <option value="Theatrical">Theatrical</option>
            <option value="OTT">OTT</option>
            <option value="Overseas">Overseas</option>
          </select>
          <input 
            type="number" 
            placeholder="Expected (₹)" 
            value={form.expectedRevenue}
            onChange={e => setForm({...form, expectedRevenue: e.target.value})}
            required
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <input 
            type="number" 
            placeholder="Actual (₹)" 
            value={form.actualRevenue}
            onChange={e => setForm({...form, actualRevenue: e.target.value})}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <input 
            type="text" 
            placeholder="Buyer" 
            value={form.buyer}
            onChange={e => setForm({...form, buyer: e.target.value})}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', flex: 1 }}
          />
          <button type="submit" style={{ padding: '0.5rem 1rem', background: 'var(--color-accent)', color: 'white', border: 'none', borderRadius: '4px' }}>
            Add
          </button>
        </form>
      </div>

      {rights.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '2rem' }}>
          <thead>
            <tr style={{ background: '#f0f0f0', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem' }}>Category</th>
              <th style={{ padding: '0.75rem' }}>Buyer</th>
              <th style={{ padding: '0.75rem', textAlign: 'right' }}>Expected (₹)</th>
              <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actual (₹)</th>
            </tr>
          </thead>
          <tbody>
            {rights.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.75rem' }}>{r.category}</td>
                <td style={{ padding: '0.75rem' }}>{r.buyer}</td>
                <td style={{ padding: '0.75rem', textAlign: 'right' }}>{r.expectedRevenue.toFixed(2)}</td>
                <td style={{ padding: '0.75rem', textAlign: 'right' }}>{r.actualRevenue.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Revenue;
