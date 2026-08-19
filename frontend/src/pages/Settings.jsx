import React, { useState, useEffect } from 'react';
import { fetchRateCards, createRateCard, updateRateCard, activateRateCard, fetchFXRates, addFXRate } from '../api';

const Settings = () => {
  const [rateCards, setRateCards] = useState([]);
  const [fxRates, setFxRates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', region: '', currency: 'INR', baseMultiplier: 1.0 });
  const [fxForm, setFxForm] = useState({ baseCurrency: 'USD', toCurrency: 'INR', rate: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rcRes, fxRes] = await Promise.all([
        fetchRateCards(),
        fetchFXRates()
      ]);
      setRateCards(rcRes.data || []);
      setFxRates(fxRes.data || []);
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
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleActivate = async (id) => {
    try {
      await activateRateCard(id);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddFX = async (e) => {
    e.preventDefault();
    try {
      await addFXRate({
        baseCurrency: fxForm.baseCurrency,
        toCurrency: fxForm.toCurrency,
        rate: Number(fxForm.rate)
      });
      setFxForm({ baseCurrency: 'USD', toCurrency: 'INR', rate: '' });
      await loadData();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="screen active" id="settings">
      <div className="page-head">
        <div>
          <div className="page-title">Settings & Configuration</div>
          <div className="page-subtitle">Manage global defaults, users, rate cards, and exchange rates.</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel" style={{ gridColumn: 'span 1' }}>
          <div className="panel-head">
            <h3>Create New Rate Card</h3>
          </div>
          <div className="panel-body">
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
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
              <div className="form-group">
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
                <div className="form-group">
                  <label>Currency</label>
                  <select 
                    className="input"
                    value={form.currency} 
                    onChange={e => setForm({...form, currency: e.target.value})}
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Base Multiplier</label>
                  <input 
                    type="number" 
                    step="0.1"
                    className="input mono"
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
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Region</th>
                    <th>Currency</th>
                    <th className="text-right">Multiplier</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rateCards.map(rc => (
                    <tr key={rc.id}>
                      <td style={{ fontWeight: '500' }}>{rc.name}</td>
                      <td>{rc.region}</td>
                      <td>{rc.currency}</td>
                      <td className="text-right mono">{rc.baseMultiplier}x</td>
                      <td>
                        {rc.isActive ? (
                          <span className="badge success">Active Default</span>
                        ) : (
                          <span className="badge info">Inactive</span>
                        )}
                      </td>
                      <td className="text-right">
                        {!rc.isActive && (
                          <button 
                            className="btn sm" 
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
                      <td colSpan="6" className="text-dim text-center" style={{padding: '32px'}}>No rate cards configured.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
      
      <div className="grid-2" style={{marginTop: '24px'}}>
        <div className="panel" style={{ gridColumn: 'span 1' }}>
          <div className="panel-head">
            <h3>Add Manual FX Rate</h3>
          </div>
          <div className="panel-body">
            <form onSubmit={handleAddFX} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="grid-2" style={{ gap: '16px' }}>
                <div className="form-group">
                  <label>Base Currency</label>
                  <select className="input" value={fxForm.baseCurrency} onChange={e => setFxForm({...fxForm, baseCurrency: e.target.value})}>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="INR">INR</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>To Currency</label>
                  <select className="input" value={fxForm.toCurrency} onChange={e => setFxForm({...fxForm, toCurrency: e.target.value})}>
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Exchange Rate</label>
                <input 
                  type="number" 
                  step="0.0001"
                  className="input mono"
                  placeholder="e.g. 82.50" 
                  value={fxForm.rate}
                  onChange={e => setFxForm({...fxForm, rate: e.target.value})}
                  required
                />
              </div>
              <button type="submit" className="btn primary" style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}>
                Add FX Rate
              </button>
            </form>
          </div>
        </div>

        <div className="panel" style={{ gridColumn: 'span 2' }}>
          <div className="panel-head">
            <h3>Exchange Rates History</h3>
          </div>
          <div className="panel-body">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Pair</th>
                  <th className="text-right">Rate</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {fxRates.map(fx => (
                  <tr key={fx.id}>
                    <td>{new Date(fx.effectiveDate).toLocaleDateString()}</td>
                    <td>{fx.baseCurrency} to {fx.toCurrency}</td>
                    <td className="text-right mono">{fx.rate}</td>
                    <td><span className="badge">{fx.source}</span></td>
                  </tr>
                ))}
                {fxRates.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-dim text-center" style={{padding: '32px'}}>No exchange rates found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
