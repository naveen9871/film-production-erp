import React, { useState, useEffect } from 'react';
import { fetchRateCards, createRateCard, updateRateCard, activateRateCard } from '../api';

const Settings = () => {
  const [rateCards, setRateCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', region: '', currency: 'INR', baseMultiplier: 1.0 });

  useEffect(() => {
    loadRateCards();
  }, []);

  const loadRateCards = async () => {
    setLoading(true);
    try {
      const res = await fetchRateCards();
      setRateCards(res.data || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createRateCard({
        name: form.name,
        region: form.region,
        currency: form.currency,
        baseMultiplier: Number(form.baseMultiplier),
        departmentsData: "{}"
      });
      setForm({ name: '', region: '', currency: 'INR', baseMultiplier: 1.0 });
      await loadRateCards();
    } catch (err) {
      console.error(err);
    }
  };

  const handleActivate = async (id) => {
    try {
      await activateRateCard(id);
      await loadRateCards();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="screen active" id="settings">
      <div className="page-head">
        <div>
          <div className="page-title">Settings & Configuration</div>
          <div className="page-sub">Manage global defaults, users, and rate cards</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel" style={{ gridColumn: 'span 1' }}>
          <div className="panel-head">
            <h3>Create New Rate Card</h3>
          </div>
          <div className="panel-body">
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-row">
                <label>Card Name</label>
                <input 
                  type="text" 
                  className="input"
                  placeholder="e.g. Mumbai Tier 1" 
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-row">
                <label>Region</label>
                <input 
                  type="text" 
                  className="input"
                  placeholder="Maharashtra, India" 
                  value={form.region}
                  onChange={e => setForm({...form, region: e.target.value})}
                  required
                />
              </div>
              <div className="grid-2" style={{ gap: '16px' }}>
                <div className="form-row">
                  <label>Currency</label>
                  <select 
                    className="input"
                    value={form.currency} 
                    onChange={e => setForm({...form, currency: e.target.value})}
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
                <div className="form-row">
                  <label>Base Multiplier</label>
                  <input 
                    type="number" 
                    step="0.1"
                    className="input"
                    value={form.baseMultiplier}
                    onChange={e => setForm({...form, baseMultiplier: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <button type="submit" className="btn primary" style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}>
                Create Rate Card
              </button>
            </form>
          </div>
        </div>

        <div className="panel" style={{ gridColumn: 'span 2' }}>
          <div className="panel-head">
            <h3>Configured Rate Cards</h3>
            <span className="hint">{rateCards.length} profiles</span>
          </div>
          <div className="panel-body">
            {loading ? <p>Loading...</p> : (
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Region</th>
                    <th>Currency</th>
                    <th className="num">Multiplier</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rateCards.map(rc => (
                    <tr key={rc.id}>
                      <td style={{ fontWeight: '500' }}>{rc.name}</td>
                      <td>{rc.region}</td>
                      <td>{rc.currency}</td>
                      <td className="num">{rc.baseMultiplier}x</td>
                      <td>
                        {rc.isActive ? (
                          <span className="badge signed">Active Default</span>
                        ) : (
                          <span className="badge text-dim">Inactive</span>
                        )}
                      </td>
                      <td>
                        {!rc.isActive && (
                          <button 
                            className="btn" 
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            onClick={() => handleActivate(rc.id)}
                          >
                            Set Active
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {rateCards.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-dim text-center">No rate cards configured.</td>
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

export default Settings;
