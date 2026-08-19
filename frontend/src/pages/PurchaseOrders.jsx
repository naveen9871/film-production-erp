import React, { useState, useEffect } from 'react';
import { fetchPOs, raisePO, approvePO, fetchVendors, fetchBudget } from '../api';
import useSSE from '../hooks/useSSE';

const PurchaseOrders = ({ productionId }) => {
  const [pos, setPos] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [budgetItems, setBudgetItems] = useState([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [newPO, setNewPO] = useState({ vendorId: '', budgetItemId: '', amount: 0, taxAmount: 0, description: '' });

  // Real-time updates
  const event = useSSE(productionId, ['po_created', 'po_approved', 'po_rejected', 'po_closed']);

  useEffect(() => {
    if (event) {
      console.log("Real-time PO update:", event);
      loadData();
    }
  }, [event]);

  useEffect(() => {
    if (productionId) {
      loadData();
    }
  }, [productionId]);

  const loadData = async () => {
    try {
      const [poRes, vendorRes, budgetRes] = await Promise.all([
        fetchPOs(productionId),
        fetchVendors(),
        fetchBudget(productionId)
      ]);
      setPos(poRes.data);
      setVendors(vendorRes.data);
      setBudgetItems(budgetRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRaise = async () => {
    try {
      await raisePO(productionId, {
        ...newPO,
        vendorId: parseInt(newPO.vendorId),
        budgetItemId: parseInt(newPO.budgetItemId),
        amount: parseFloat(newPO.amount),
        taxAmount: parseFloat(newPO.taxAmount)
      });
      setModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleApprove = async (id) => {
    try {
      await approvePO(id);
      loadData();
    } catch (err) {
      alert("Failed to approve PO. Make sure you have the required role.");
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      'draft': 'warning',
      'approved': 'success',
      'rejected': 'danger',
      'closed': 'info'
    };
    return `badge ${map[status] || ''}`;
  };

  const getVendorName = (id) => {
    const v = vendors.find(x => x.id === id);
    return v ? v.name : 'Unknown Vendor';
  };

  return (
    <div className="screen">
      <div className="page-head">
        <div>
          <div className="page-title">Purchase Orders</div>
          <div className="page-subtitle">Raise POs and manage approvals.</div>
        </div>
        <button className="btn primary" onClick={() => setModalOpen(true)}>Raise PO</button>
      </div>

      <div className="panel p-0">
        <table className="table">
          <thead>
            <tr>
              <th>PO Number</th>
              <th>Vendor</th>
              <th>Description</th>
              <th className="text-right">Amount</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pos.map(po => (
              <tr key={po.id}>
                <td className="mono">{po.poNumber}</td>
                <td>{getVendorName(po.vendorId)}</td>
                <td>{po.description}</td>
                <td className="text-right mono">${(po.amount + po.taxAmount).toLocaleString()}</td>
                <td><span className={getStatusBadge(po.status)}>{po.status}</span></td>
                <td className="text-right">
                  {po.status === 'draft' && (
                    <button className="btn sm success" onClick={() => handleApprove(po.id)}>Approve</button>
                  )}
                </td>
              </tr>
            ))}
            {pos.length === 0 && (
              <tr><td colSpan="6" className="text-center" style={{padding:'32px', color:'var(--text-faint)'}}>No Purchase Orders found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal" style={{maxWidth: '500px'}}>
            <div className="modal-head">
              <h3 className="modal-title">Raise Purchase Order</h3>
              <button className="icon-btn" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <div className="modal-body form-grid">
              <div className="form-group">
                <label>Budget Line Item</label>
                <select className="input" value={newPO.budgetItemId} onChange={e => setNewPO({...newPO, budgetItemId: e.target.value})}>
                  <option value="">Select Line Item...</option>
                  {budgetItems.map(b => (
                    <option key={b.id} value={b.id}>{b.department} - {b.description} (Available: ${(b.estimatedCost - b.actualCost).toLocaleString()})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Vendor</label>
                <select className="input" value={newPO.vendorId} onChange={e => setNewPO({...newPO, vendorId: e.target.value})}>
                  <option value="">Select Vendor...</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Description</label>
                <input type="text" className="input" value={newPO.description} onChange={e => setNewPO({...newPO, description: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Base Amount</label>
                <input type="number" className="input mono" value={newPO.amount} onChange={e => setNewPO({...newPO, amount: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Tax Amount</label>
                <input type="number" className="input mono" value={newPO.taxAmount} onChange={e => setNewPO({...newPO, taxAmount: e.target.value})} />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn primary" onClick={handleRaise}>Submit PO</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrders;
