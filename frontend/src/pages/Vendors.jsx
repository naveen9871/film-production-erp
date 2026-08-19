import React, { useState, useEffect } from 'react';
import { fetchVendors, createVendor } from '../api';

const Vendors = () => {
  const [vendors, setVendors] = useState([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [newVendor, setNewVendor] = useState({ name: '', category: 'crew', contactPerson: '', email: '', phone: '', gstNumber: '' });

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    try {
      const res = await fetchVendors();
      setVendors(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    try {
      await createVendor(newVendor);
      setModalOpen(false);
      loadVendors();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="screen">
      <div className="page-head">
        <div>
          <div className="page-title">Vendor Master</div>
          <div className="page-subtitle">Manage supplier details, tax info, and bank accounts.</div>
        </div>
        <button className="btn primary" onClick={() => setModalOpen(true)}>Add Vendor</button>
      </div>

      <div className="panel p-0">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Contact Person</th>
              <th>Tax ID</th>
              <th>Phone</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map(v => (
              <tr key={v.id}>
                <td><b>{v.name}</b></td>
                <td><span className="badge info">{v.category}</span></td>
                <td>{v.contactPerson || '-'}</td>
                <td>{v.gstNumber || '-'}</td>
                <td>{v.phone || '-'}</td>
                <td className="text-right">
                  <button className="btn sm">Edit</button>
                </td>
              </tr>
            ))}
            {vendors.length === 0 && (
              <tr><td colSpan="6" className="text-center" style={{padding:'32px', color:'var(--text-faint)'}}>No vendors found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal" style={{maxWidth: '500px'}}>
            <div className="modal-head">
              <h3 className="modal-title">Add Vendor</h3>
              <button className="icon-btn" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <div className="modal-body form-grid">
              <div className="form-group">
                <label>Vendor Name</label>
                <input type="text" className="input" value={newVendor.name} onChange={e => setNewVendor({...newVendor, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select className="input" value={newVendor.category} onChange={e => setNewVendor({...newVendor, category: e.target.value})}>
                  <option value="crew">Crew</option>
                  <option value="rental">Rental</option>
                  <option value="location">Location</option>
                  <option value="catering">Catering</option>
                  <option value="transport">Transport</option>
                </select>
              </div>
              <div className="form-group">
                <label>Contact Person</label>
                <input type="text" className="input" value={newVendor.contactPerson} onChange={e => setNewVendor({...newVendor, contactPerson: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Tax ID (GST/PAN)</label>
                <input type="text" className="input" value={newVendor.gstNumber} onChange={e => setNewVendor({...newVendor, gstNumber: e.target.value})} />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn primary" onClick={handleSave}>Save Vendor</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vendors;
