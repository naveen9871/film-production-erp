import React, { useState, useEffect } from 'react';
import { fetchDistributionAgreements, createDistributionAgreement, fetchDistributors } from '../api';
import { Plus } from 'lucide-react';

const Revenue = ({ productionId }) => {
  const [agreements, setAgreements] = useState([]);
  const [distributors, setDistributors] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ distributorId: '', territory: '', rightsType: 'Theatrical', agreedAmount: '' });

  useEffect(() => {
    if (productionId) {
      loadData();
    }
  }, [productionId]);

  const loadData = async () => {
    try {
      const [agrRes, distRes] = await Promise.all([
        fetchDistributionAgreements(productionId),
        fetchDistributors()
      ]);
      setAgreements(agrRes.data || []);
      setDistributors(distRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createDistributionAgreement(productionId, {
        distributorId: parseInt(formData.distributorId),
        territory: formData.territory,
        rightsType: formData.rightsType,
        agreedAmount: parseFloat(formData.agreedAmount)
      });
      setShowModal(false);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const totalRevenue = agreements.reduce((sum, a) => sum + a.agreedAmount, 0);

  return (
    <div className="screen active">
      <div className="page-head">
        <div>
          <div className="page-title">Distribution & Revenue</div>
          <div className="page-sub">Territory-wise P&L and Rights Management</div>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> New Agreement
          </button>
        </div>
      </div>

      <div className="grid-3 mb-4">
        <div className="stat-card">
          <div className="stat-title">Total Recovered (Committed)</div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>
            ₹{(totalRevenue / 100000).toFixed(2)}L
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Active Deals</div>
          <div className="stat-value">{agreements.length}</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>Distribution Deals</h3>
        </div>
        <div className="panel-body p-0">
          <table className="table">
            <thead>
              <tr>
                <th>Distributor ID</th>
                <th>Territory</th>
                <th>Rights Type</th>
                <th>Agreed Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {agreements.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center text-dim py-4">No active agreements found.</td>
                </tr>
              ) : (
                agreements.map((a) => (
                  <tr key={a.id}>
                    <td>#{a.distributorId}</td>
                    <td>{a.territory}</td>
                    <td><span className="badge">{a.rightsType}</span></td>
                    <td className="fw-500">₹{(a.agreedAmount / 100000).toFixed(2)}L</td>
                    <td>{a.status || 'Signed'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-head">
              <h3>New Distribution Deal</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Distributor</label>
                  <select 
                    required
                    value={formData.distributorId} 
                    onChange={e => setFormData({...formData, distributorId: e.target.value})}
                  >
                    <option value="">Select Distributor...</option>
                    {distributors.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.platformType})</option>
                    ))}
                  </select>
                  {distributors.length === 0 && <small className="text-dim">Warning: No distributors exist yet. Go to global settings to add one.</small>}
                </div>
                <div className="form-group">
                  <label>Territory</label>
                  <input 
                    type="text" required 
                    placeholder="e.g., Nizam, Overseas, Global"
                    value={formData.territory} 
                    onChange={e => setFormData({...formData, territory: e.target.value})} 
                  />
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label>Rights Type</label>
                    <select value={formData.rightsType} onChange={e => setFormData({...formData, rightsType: e.target.value})}>
                      <option value="Theatrical">Theatrical</option>
                      <option value="OTT">OTT / Streaming</option>
                      <option value="Satellite">Satellite / TV</option>
                      <option value="Audio">Audio / Music</option>
                      <option value="Remake">Remake Rights</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Amount (₹)</label>
                    <input 
                      type="number" required 
                      value={formData.agreedAmount} 
                      onChange={e => setFormData({...formData, agreedAmount: e.target.value})} 
                    />
                  </div>
                </div>
              </div>
              <div className="modal-foot">
                <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn primary">Sign Deal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Revenue;
