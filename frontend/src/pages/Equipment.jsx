import React, { useState, useEffect } from 'react';
import { fetchEquipmentRentals, addEquipmentRental, fetchVendors } from '../api';
import { Camera, Plus } from 'lucide-react';

const Equipment = ({ productionId }) => {
  const [rentals, setRentals] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ vendorId: '', equipment: '', startDate: '', billingType: 'Daily', rate: '' });

  useEffect(() => {
    if (productionId) {
      loadData();
    }
  }, [productionId]);

  const loadData = async () => {
    try {
      const [rentRes, vendRes] = await Promise.all([
        fetchEquipmentRentals(productionId),
        fetchVendors()
      ]);
      setRentals(rentRes.data || []);
      setVendors(vendRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await addEquipmentRental(productionId, {
        vendorId: parseInt(formData.vendorId),
        equipment: formData.equipment,
        startDate: new Date(formData.startDate).toISOString(),
        billingType: formData.billingType,
        rate: parseFloat(formData.rate)
      });
      setShowModal(false);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const activeRentals = rentals.filter(r => r.status !== 'Returned');

  return (
    <div className="screen active">
      <div className="page-head">
        <div>
          <div className="page-title">Equipment Rentals</div>
          <div className="page-sub">Track camera, lighting, and grip rentals and damages</div>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> New Rental
          </button>
        </div>
      </div>

      <div className="grid-3 mb-4">
        <div className="stat-card">
          <div className="stat-title">Active Rentals</div>
          <div className="stat-value">{activeRentals.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Total Equipment Logged</div>
          <div className="stat-value">{rentals.length}</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>Rental Log</h3>
        </div>
        <div className="panel-body p-0">
          <table className="table">
            <thead>
              <tr>
                <th>Equipment</th>
                <th>Vendor ID</th>
                <th>Start Date</th>
                <th>Billing</th>
                <th>Rate (₹)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rentals.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-dim py-4">No equipment rentals found.</td>
                </tr>
              ) : (
                rentals.map((r) => (
                  <tr key={r.id}>
                    <td className="fw-500">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Camera size={16} className="text-dim" />
                        {r.equipment}
                      </div>
                    </td>
                    <td>#{r.vendorId}</td>
                    <td>{new Date(r.startDate).toLocaleDateString()}</td>
                    <td>{r.billingType}</td>
                    <td>₹{r.rate.toLocaleString()}</td>
                    <td>
                      <span className={`badge ${r.status === 'Returned' ? '' : 'active'}`}>
                        {r.status || 'Active'}
                      </span>
                    </td>
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
              <h3>New Equipment Rental</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Equipment Description</label>
                  <input 
                    type="text" required 
                    placeholder="e.g., ARRI Alexa Mini LF Package"
                    value={formData.equipment} 
                    onChange={e => setFormData({...formData, equipment: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label>Rental Vendor</label>
                  <select 
                    required
                    value={formData.vendorId} 
                    onChange={e => setFormData({...formData, vendorId: e.target.value})}
                  >
                    <option value="">Select Vendor...</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Start Date</label>
                  <input 
                    type="date" required 
                    value={formData.startDate} 
                    onChange={e => setFormData({...formData, startDate: e.target.value})} 
                  />
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label>Billing Period</label>
                    <select value={formData.billingType} onChange={e => setFormData({...formData, billingType: e.target.value})}>
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="LumpSum">Lump Sum</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Rate (₹)</label>
                    <input 
                      type="number" required 
                      value={formData.rate} 
                      onChange={e => setFormData({...formData, rate: e.target.value})} 
                    />
                  </div>
                </div>
              </div>
              <div className="modal-foot">
                <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn primary">Start Rental</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Equipment;
