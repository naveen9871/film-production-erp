import React, { useState, useEffect } from 'react';
import { fetchExpenses, logExpense, fetchBudget, fetchVendors, fetchPOs } from '../api';
import api from '../api';
import useSSE from '../hooks/useSSE';

const Expenses = ({ productionId }) => {
  const [activeTab, setActiveTab] = useState('ledger'); // 'ledger' | 'pettyCash'
  
  // Real-time updates
  const event = useSSE(productionId, ['expense_added', 'po_approved', 'po_closed']);

  useEffect(() => {
    if (event) {
      console.log("Real-time update received:", event);
      loadData();
    }
  }, [event]);

  // Ledger state
  const [expenses, setExpenses] = useState([]);
  const [budgetItems, setBudgetItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [pos, setPOs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ 
    budgetItemId: '', 
    poId: '',
    amount: '', 
    taxAmount: '0',
    taxType: 'None',
    taxRate: '0',
    vendorId: '', 
    description: '',
    status: 'Paid'
  });

  // Petty cash state
  const [floats, setFloats] = useState([]);
  const [floatForm, setFloatForm] = useState({ issuedTo: '', amount: '', notes: '' });
  const [selectedFloat, setSelectedFloat] = useState(null);
  const [floatReceipts, setFloatReceipts] = useState([]);
  const [receiptForm, setReceiptForm] = useState({ budgetItemId: '', amount: '', vendor: '', description: '' });

  useEffect(() => {
    if (productionId) {
      loadData();
      loadFloats();
    }
  }, [productionId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [expRes, budRes, venRes, poRes] = await Promise.all([
        fetchExpenses(productionId),
        fetchBudget(productionId),
        fetchVendors(),
        fetchPOs(productionId)
      ]);
      setExpenses(expRes.data || []);
      setBudgetItems(budRes.data || []);
      setVendors(venRes.data || []);
      setPOs(poRes.data || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const loadFloats = async () => {
    try {
      const res = await api.get(`/productions/${productionId}/petty-cash/floats`);
      setFloats(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePOSelect = (poId) => {
    if (!poId) {
      setForm({ ...form, poId: '' });
      return;
    }
    const po = pos.find(p => p.id === parseInt(poId));
    if (po) {
      setForm({
        ...form,
        poId: po.id,
        budgetItemId: po.budgetItemId,
        vendorId: po.vendorId,
        amount: po.amount,
        taxAmount: po.taxAmount,
        description: po.description
      });
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    const v = vendors.find(x => x.id === parseInt(form.vendorId));
    const vendorName = v ? v.name : 'Unknown';

    try {
      await logExpense(productionId, {
        budgetItemId: Number(form.budgetItemId),
        poId: form.poId ? Number(form.poId) : 0,
        amount: Number(form.amount),
        taxAmount: Number(form.taxAmount),
        taxRate: Number(form.taxRate),
        taxType: form.taxType,
        vendor: vendorName,
        description: form.description,
        status: form.status,
        date: new Date().toISOString()
      });
      setForm({ budgetItemId: '', poId: '', amount: '', taxAmount: '0', taxRate: '0', taxType: 'None', vendorId: '', description: '', status: 'Paid' });
      await loadData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Failed to log expense.");
    }
  };

  const handleIssueFloat = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/productions/${productionId}/petty-cash/floats`, {
        issuedTo: floatForm.issuedTo,
        amount: Number(floatForm.amount),
        notes: floatForm.notes
      });
      setFloatForm({ issuedTo: '', amount: '', notes: '' });
      loadFloats();
    } catch (err) {
      alert("Failed to issue float");
    }
  };

  const handleSelectFloat = async (float) => {
    setSelectedFloat(float);
    if (!float) return;
    try {
      const res = await api.get(`/petty-cash/floats/${float.id}/receipts`);
      setFloatReceipts(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogReceipt = async (e) => {
    e.preventDefault();
    if (!selectedFloat) return;
    try {
      await api.post(`/petty-cash/floats/${selectedFloat.id}/receipts`, {
        budgetItemId: Number(receiptForm.budgetItemId),
        amount: Number(receiptForm.amount),
        vendor: receiptForm.vendor,
        description: receiptForm.description,
        transactionDate: new Date().toISOString()
      });
      setReceiptForm({ budgetItemId: '', amount: '', vendor: '', description: '' });
      handleSelectFloat(selectedFloat); // reload receipts
      loadFloats(); // reload balances
    } catch (err) {
      alert("Failed to log receipt");
    }
  };

  const handleReconcile = async () => {
    if (!selectedFloat) return;
    if (!window.confirm("Reconciling will lock this float and push all receipts to the main ledger. Proceed?")) return;
    try {
      await api.post(`/petty-cash/floats/${selectedFloat.id}/reconcile`);
      setSelectedFloat(null);
      loadFloats();
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to reconcile float");
    }
  };

  const formatINR = (amt) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt || 0);

  return (
    <div className="screen active" id="expenses">
      <div className="page-head" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
        <div style={{ marginBottom: '16px' }}>
          <div className="page-title">Expense & Petty Cash Ledger</div>
          <div className="page-subtitle">Track actual spending and manage cash floats</div>
        </div>
        
        <div style={{ display: 'flex', gap: '24px' }}>
          <div 
            className={`tab-btn ${activeTab === 'ledger' ? 'active' : ''}`} 
            onClick={() => setActiveTab('ledger')}
            style={{ padding: '8px 4px', borderBottom: activeTab === 'ledger' ? '2px solid var(--accent)' : '2px solid transparent', cursor: 'pointer', fontWeight: 500, color: activeTab === 'ledger' ? 'var(--text)' : 'var(--text-dim)' }}
          >
            Main Ledger
          </div>
          <div 
            className={`tab-btn ${activeTab === 'pettyCash' ? 'active' : ''}`} 
            onClick={() => setActiveTab('pettyCash')}
            style={{ padding: '8px 4px', borderBottom: activeTab === 'pettyCash' ? '2px solid var(--accent)' : '2px solid transparent', cursor: 'pointer', fontWeight: 500, color: activeTab === 'pettyCash' ? 'var(--text)' : 'var(--text-dim)' }}
          >
            Petty Cash Floats
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 0' }}>
        {activeTab === 'ledger' ? (
          <div className="grid-2">
            <div className="panel" style={{ gridColumn: 'span 1' }}>
              <div className="panel-head">
                <h3>Log New Expense</h3>
              </div>
              <div className="panel-body">
                <form onSubmit={handleAddExpense} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group">
                    <label>Link to Purchase Order (Optional)</label>
                    <select 
                      className="input"
                      value={form.poId} 
                      onChange={e => handlePOSelect(e.target.value)}
                    >
                      <option value="">None (Manual Expense)</option>
                      {pos.filter(p => p.status === 'approved').map(po => (
                        <option key={po.id} value={po.id}>
                          {po.poNumber} - {po.description} ({formatINR(po.amount)})
                        </option>
                      ))}
                    </select>
                    <div className="text-xs text-faint" style={{marginTop:'4px'}}>Only 'Approved' POs can be expensed.</div>
                  </div>

                  <div className="form-group">
                    <label>Budget Line Item</label>
                    <select 
                      className="input"
                      value={form.budgetItemId} 
                      onChange={e => setForm({...form, budgetItemId: e.target.value})}
                      required
                    >
                      <option value="">Select Item...</option>
                      {budgetItems.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.department} / {item.category} / {item.description} (Est: {formatINR(item.estimatedCost)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Vendor</label>
                    <select 
                      className="input"
                      value={form.vendorId} 
                      onChange={e => setForm({...form, vendorId: e.target.value})}
                      required
                    >
                      <option value="">Select Vendor...</option>
                      {vendors.map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <input 
                      type="text" 
                      className="input"
                      placeholder="Expense Description" 
                      value={form.description}
                      onChange={e => setForm({...form, description: e.target.value})}
                      required
                    />
                  </div>
                  <div className="grid-2" style={{ gap: '16px' }}>
                    <div className="form-group">
                      <label>Base Amount (₹)</label>
                      <input 
                        type="number" 
                        className="input mono"
                        placeholder="0" 
                        value={form.amount}
                        onChange={e => setForm({...form, amount: e.target.value})}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Tax Type</label>
                      <select 
                        className="input"
                        value={form.taxType} 
                        onChange={e => setForm({...form, taxType: e.target.value})}
                      >
                        <option value="None">None</option>
                        <option value="CGST_SGST">CGST + SGST</option>
                        <option value="IGST">IGST</option>
                        <option value="TDS">TDS Deducted</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid-2" style={{ gap: '16px' }}>
                    <div className="form-group">
                      <label>Tax Rate (%)</label>
                      <input 
                        type="number" 
                        className="input mono"
                        placeholder="0" 
                        value={form.taxRate}
                        onChange={e => setForm({...form, taxRate: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label>Tax Amount (₹)</label>
                      <input 
                        type="number" 
                        className="input mono"
                        placeholder="0" 
                        value={form.taxAmount}
                        onChange={e => setForm({...form, taxAmount: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select 
                      className="input"
                      value={form.status} 
                      onChange={e => setForm({...form, status: e.target.value})}
                      required
                    >
                      <option>Paid</option>
                      <option>Pending</option>
                      <option>Reimbursable</option>
                    </select>
                  </div>
                  
                  <button type="submit" className="btn primary" style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}>
                    Log Expense
                  </button>
                </form>
              </div>
            </div>

            <div className="panel" style={{ gridColumn: 'span 2' }}>
              <div className="panel-head">
                <h3>Recent Transactions</h3>
                <span className="hint">{expenses.length} records</span>
              </div>
              <div className="panel-body">
                {loading ? <p>Loading...</p> : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>PO</th>
                        <th>Vendor & Desc</th>
                        <th>Status</th>
                        <th className="text-right">Tax</th>
                        <th className="text-right">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map(exp => (
                        <tr key={exp.id}>
                          <td className="text-dim">{new Date(exp.date).toLocaleDateString()}</td>
                          <td>
                            {exp.poId ? <span className="badge info">PO-{exp.poId}</span> : <span className="text-faint">-</span>}
                          </td>
                          <td>
                            <div style={{ fontWeight: '500' }}>{exp.vendor}</div>
                            <div className="text-dim" style={{ fontSize: '12px' }}>{exp.description}</div>
                          </td>
                          <td>
                            <span className={`badge ${exp.status === 'Paid' ? 'success' : (exp.status === 'Pending' ? 'warning' : 'info')}`}>
                              {exp.status}
                            </span>
                          </td>
                          <td className="text-right mono text-dim">{formatINR(exp.taxAmount)}</td>
                          <td className="text-right mono" style={{ fontWeight: '600' }}>{formatINR(exp.amount + (exp.taxAmount || 0))}</td>
                        </tr>
                      ))}
                      {expenses.length === 0 && (
                        <tr>
                          <td colSpan="6" className="text-dim text-center" style={{padding:'32px'}}>No expenses logged yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid-2">
            <div className="panel" style={{ gridColumn: 'span 1' }}>
              <div className="panel-head">
                <h3>Active Floats</h3>
              </div>
              <div className="panel-body" style={{ padding: 0 }}>
                {floats.map(f => (
                  <div 
                    key={f.id}
                    onClick={() => handleSelectFloat(f)}
                    style={{ 
                      padding: '16px', 
                      borderBottom: '1px solid var(--border)', 
                      cursor: 'pointer',
                      background: selectedFloat?.id === f.id ? 'var(--surface-sunken)' : 'transparent'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '15px' }}>{f.issuedTo}</strong>
                      <span className={`badge ${f.status === 'Active' ? 'info' : 'success'}`}>{f.status}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-dim)', fontSize: '13px' }}>
                      <span>Issued: {formatINR(f.amount)}</span>
                      <span>Bal: <b style={{ color: f.balance < 0 ? 'var(--red)' : 'var(--green)' }}>{formatINR(f.balance)}</b></span>
                    </div>
                  </div>
                ))}

                <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
                  <h4>Issue New Float</h4>
                  <form onSubmit={handleIssueFloat} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                    <input 
                      className="input" 
                      placeholder="Issued To (e.g. Art Dept)" 
                      value={floatForm.issuedTo}
                      onChange={e => setFloatForm({...floatForm, issuedTo: e.target.value})}
                      required
                    />
                    <input 
                      type="number"
                      className="input mono" 
                      placeholder="Amount (₹)" 
                      value={floatForm.amount}
                      onChange={e => setFloatForm({...floatForm, amount: e.target.value})}
                      required
                    />
                    <input 
                      className="input" 
                      placeholder="Notes" 
                      value={floatForm.notes}
                      onChange={e => setFloatForm({...floatForm, notes: e.target.value})}
                    />
                    <button type="submit" className="btn primary" style={{ justifyContent: 'center' }}>Issue Float</button>
                  </form>
                </div>
              </div>
            </div>

            <div className="panel" style={{ gridColumn: 'span 2' }}>
              <div className="panel-head">
                <h3>Float Details & Receipts</h3>
                {selectedFloat && selectedFloat.status === 'Active' && (
                  <button className="btn" onClick={handleReconcile} style={{ background: 'var(--accent)', color: '#fff', border: 'none' }}>
                    Reconcile Float
                  </button>
                )}
              </div>
              <div className="panel-body">
                {!selectedFloat ? (
                  <div className="text-dim text-center" style={{ padding: '40px' }}>Select a float from the left to view details or add receipts.</div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', padding: '16px', background: 'var(--surface-sunken)', borderRadius: '8px' }}>
                      <div>
                        <div className="text-dim" style={{ fontSize: '12px' }}>Issued To</div>
                        <div style={{ fontSize: '16px', fontWeight: 500 }}>{selectedFloat.issuedTo}</div>
                      </div>
                      <div>
                        <div className="text-dim" style={{ fontSize: '12px' }}>Original Amount</div>
                        <div className="mono">{formatINR(selectedFloat.amount)}</div>
                      </div>
                      <div>
                        <div className="text-dim" style={{ fontSize: '12px' }}>Remaining Balance</div>
                        <div className="mono" style={{ color: selectedFloat.balance < 0 ? 'var(--red)' : 'var(--green)' }}>{formatINR(selectedFloat.balance)}</div>
                      </div>
                    </div>

                    {selectedFloat.status === 'Active' && (
                      <form onSubmit={handleLogReceipt} style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'flex-start' }}>
                        <div className="form-group" style={{ margin: 0, flex: 2 }}>
                          <select 
                            className="input" 
                            value={receiptForm.budgetItemId}
                            onChange={e => setReceiptForm({...receiptForm, budgetItemId: e.target.value})}
                            required
                          >
                            <option value="">Select Budget Item...</option>
                            {budgetItems.map(item => (
                              <option key={item.id} value={item.id}>
                                {item.department} / {item.description}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group" style={{ margin: 0, flex: 1.5 }}>
                          <input className="input" placeholder="Vendor/Payee" value={receiptForm.vendor} onChange={e => setReceiptForm({...receiptForm, vendor: e.target.value})} required />
                        </div>
                        <div className="form-group" style={{ margin: 0, flex: 2 }}>
                          <input className="input" placeholder="Description" value={receiptForm.description} onChange={e => setReceiptForm({...receiptForm, description: e.target.value})} required />
                        </div>
                        <div className="form-group" style={{ margin: 0, flex: 1 }}>
                          <input type="number" className="input mono" placeholder="₹ Amount" value={receiptForm.amount} onChange={e => setReceiptForm({...receiptForm, amount: e.target.value})} required />
                        </div>
                        <button type="submit" className="btn primary" style={{ height: '40px' }}>Add</button>
                      </form>
                    )}

                    <table className="table" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Vendor</th>
                          <th>Description</th>
                          <th className="text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {floatReceipts.map(r => (
                          <tr key={r.id}>
                            <td className="text-dim">{new Date(r.transactionDate).toLocaleDateString()}</td>
                            <td>{r.vendor}</td>
                            <td>{r.description}</td>
                            <td className="text-right mono font-medium">{formatINR(r.amount)}</td>
                          </tr>
                        ))}
                        {floatReceipts.length === 0 && (
                          <tr>
                            <td colSpan="4" className="text-center text-dim" style={{ padding: '24px' }}>No receipts logged yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Expenses;
