import React, { useState, useEffect } from 'react';
import { fetchRevenue, logRevenue, fetchDashboard } from '../api';

const Revenue = ({ productionId }) => {
  const [rights, setRights] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ category: '', expectedRevenue: '', actualRevenue: '', buyer: '' });

  useEffect(() => {
    if (productionId) fetchData();
  }, [productionId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rightsRes, dashRes] = await Promise.all([
        fetchRevenue(productionId),
        fetchDashboard(productionId)
      ]);
      setRights(rightsRes.data || []);
      setStats(dashRes.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleAddRights = async (e) => {
    e.preventDefault();
    try {
      await logRevenue(productionId, {
        category: form.category,
        expectedRevenue: Number(form.expectedRevenue),
        actualRevenue: Number(form.actualRevenue),
        buyer: form.buyer,
        status: 'Signed'
      });
      setForm({ category: '', expectedRevenue: '', actualRevenue: '', buyer: '' });
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const formatINR = (amt) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt || 0);

  const profitLoss = stats ? stats.totalExpectedRevenue - stats.totalActualCost : 0;
  const roi = stats && stats.totalActualCost > 0 ? (profitLoss / stats.totalActualCost) * 100 : 0;

  return (
    <div className="screen active" id="revenue">
      <div className="page-head">
        <div>
          <div className="page-title">Revenue & Rights</div>
          <div className="page-sub">Manage IP rights, distribution deals, and revenue forecasting</div>
        </div>
      </div>

      {stats && (
        <div className="kpi-row" style={{ marginBottom: '24px' }}>
          <div className="kpi">
            <div className="kpi-label">Total Actual Cost</div>
            <div className="kpi-value">{formatINR(stats.totalActualCost)}</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Total Expected Revenue</div>
            <div className="kpi-value">{formatINR(stats.totalExpectedRevenue)}</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Projected Profit / Loss</div>
            <div className={`kpi-value ${profitLoss >= 0 ? 'good' : 'alert'}`}>
              {formatINR(profitLoss)}
            </div>
            <div className={`kpi-delta ${profitLoss >= 0 ? 'up-good' : 'up-bad'}`} style={{ marginTop: '8px', display: 'inline-block' }}>
              ROI: {roi.toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      <div className="grid-2">
        <div className="panel" style={{ gridColumn: 'span 1' }}>
          <div className="panel-head">
            <h3>Log New Deal</h3>
          </div>
          <div className="panel-body">
            <form onSubmit={handleAddRights} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-row">
                <label>Category</label>
                <select 
                  className="input"
                  value={form.category} 
                  onChange={e => setForm({...form, category: e.target.value})}
                  required
                >
                  <option value="">Select Category...</option>
                  <option value="Satellite">Satellite</option>
                  <option value="Audio">Audio</option>
                  <option value="Theatrical">Theatrical</option>
                  <option value="OTT">OTT</option>
                  <option value="Overseas">Overseas</option>
                </select>
              </div>
              <div className="form-row">
                <label>Buyer / Partner</label>
                <input 
                  type="text" 
                  className="input"
                  placeholder="e.g. Netflix, T-Series" 
                  value={form.buyer}
                  onChange={e => setForm({...form, buyer: e.target.value})}
                />
              </div>
              <div className="grid-2" style={{ gap: '16px' }}>
                <div className="form-row">
                  <label>Expected (₹)</label>
                  <input 
                    type="number" 
                    className="input"
                    placeholder="0" 
                    value={form.expectedRevenue}
                    onChange={e => setForm({...form, expectedRevenue: e.target.value})}
                    required
                  />
                </div>
                <div className="form-row">
                  <label>Actual (₹)</label>
                  <input 
                    type="number" 
                    className="input"
                    placeholder="0" 
                    value={form.actualRevenue}
                    onChange={e => setForm({...form, actualRevenue: e.target.value})}
                  />
                </div>
              </div>
              
              <button type="submit" className="btn primary" style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}>
                Save Record
              </button>
            </form>
          </div>
        </div>

        <div className="panel" style={{ gridColumn: 'span 2' }}>
          <div className="panel-head">
            <h3>Rights Ledger</h3>
            <span className="hint">{rights.length} records</span>
          </div>
          <div className="panel-body">
            {loading ? <p>Loading...</p> : (
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Buyer</th>
                    <th>Status</th>
                    <th className="num">Expected (₹)</th>
                    <th className="num">Actual (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {rights.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: '500' }}>{r.category}</td>
                      <td>{r.buyer || '-'}</td>
                      <td><span className="badge signed">{r.status || 'Signed'}</span></td>
                      <td className="num">{formatINR(r.expectedRevenue)}</td>
                      <td className="num" style={{ fontWeight: '600' }}>{formatINR(r.actualRevenue)}</td>
                    </tr>
                  ))}
                  {rights.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-dim text-center">No revenue records logged yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Revenue;
