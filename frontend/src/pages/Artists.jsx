import React, { useState, useEffect } from 'react';
import { fetchArtistContracts, addArtistContract, fetchArtistPayments, logArtistPayment, fetchEntities } from '../api';
import { UserPlus, IndianRupee, Activity } from 'lucide-react';

const Artists = ({ productionId }) => {
  const [contracts, setContracts] = useState([]);
  const [elements, setElements] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ elementId: '', totalFee: '', advancePaid: '' });

  useEffect(() => {
    if (productionId) {
      loadData();
    }
  }, [productionId]);

  const loadData = async () => {
    try {
      const [contRes, elemRes] = await Promise.all([
        fetchArtistContracts(productionId),
        fetchEntities(productionId, 'Character')
      ]);
      setContracts(contRes.data || []);
      setElements(elemRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await addArtistContract(productionId, {
        productionElementId: parseInt(formData.elementId),
        totalFee: parseFloat(formData.totalFee),
        advancePaid: parseFloat(formData.advancePaid)
      });
      setShowModal(false);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const totalFees = contracts.reduce((sum, c) => sum + c.totalFee, 0);
  const totalAdvances = contracts.reduce((sum, c) => sum + c.advancePaid, 0);

  return (
    <div className="screen active">
      <div className="page-head">
        <div>
          <div className="page-title">Artist Advances & Contracts</div>
          <div className="page-sub">Track total fees, signing amounts, and shoot day earnings</div>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={() => setShowModal(true)}>
            <UserPlus size={16} /> New Contract
          </button>
        </div>
      </div>

      <div className="grid-3 mb-4">
        <div className="stat-card">
          <div className="stat-title">Total Artist Fees</div>
          <div className="stat-value">
            ₹{(totalFees / 100000).toFixed(2)}L
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Advances Paid</div>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>
            ₹{(totalAdvances / 100000).toFixed(2)}L
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Outstanding</div>
          <div className="stat-value" style={{ color: 'var(--red)' }}>
            ₹{((totalFees - totalAdvances) / 100000).toFixed(2)}L
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>Active Contracts</h3>
        </div>
        <div className="panel-body p-0">
          <table className="table">
            <thead>
              <tr>
                <th>Element ID</th>
                <th>Total Fee</th>
                <th>Advance Paid</th>
                <th>Advance %</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {contracts.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center text-dim py-4">No artist contracts found.</td>
                </tr>
              ) : (
                contracts.map((c) => {
                  const pct = (c.advancePaid / c.totalFee) * 100;
                  return (
                    <tr key={c.id}>
                      <td>#{c.productionElementId}</td>
                      <td className="fw-500">₹{(c.totalFee / 100000).toFixed(2)}L</td>
                      <td className="fw-500 text-dim">₹{(c.advancePaid / 100000).toFixed(2)}L</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '100px', height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: 'var(--accent)' }}></div>
                          </div>
                          <span className="text-sm">{pct.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td>{c.status || 'Active'}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-head">
              <h3>New Artist Contract</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Artist / Character</label>
                  <select 
                    required
                    value={formData.elementId} 
                    onChange={e => setFormData({...formData, elementId: e.target.value})}
                  >
                    <option value="">Select Character...</option>
                    {elements.map(e => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label>Total Fee (₹)</label>
                    <input 
                      type="number" required 
                      value={formData.totalFee} 
                      onChange={e => setFormData({...formData, totalFee: e.target.value})} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Advance Amount (₹)</label>
                    <input 
                      type="number" required 
                      value={formData.advancePaid} 
                      onChange={e => setFormData({...formData, advancePaid: e.target.value})} 
                    />
                  </div>
                </div>
              </div>
              <div className="modal-foot">
                <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn primary">Create Contract</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Artists;
