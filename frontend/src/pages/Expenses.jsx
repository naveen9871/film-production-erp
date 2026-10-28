import React, { useState, useEffect, useMemo } from 'react';
import { fetchExpenses, logExpense, fetchBudget, fetchVendors, fetchPOs } from '../api';
import api from '../api';
import useSSE from '../hooks/useSSE';

const Expenses = ({ productionId }) => {
  const [activeTab, setActiveTab] = useState('ledger'); // 'ledger' | 'pettyCash'
  
  // Real-time updates via SSE
  const event = useSSE(productionId, ['expense_added', 'po_approved', 'po_closed']);

  useEffect(() => {
    if (event) {
      loadData();
    }
  }, [event]);

  // Ledger state
  const [expenses, setExpenses] = useState([]);
  const [budgetItems, setBudgetItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [pos, setPOs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'Paid' | 'Pending'

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
      console.error("Failed to load expenses data", err);
    }
    setLoading(false);
  };

  const loadFloats = async () => {
    try {
      const res = await api.get(`/productions/${productionId}/petty-cash/floats`);
      const list = res.data || [];
      setFloats(list);
      if (list.length > 0 && !selectedFloat) {
        handleSelectFloat(list[0]);
      }
    } catch (e) {
      console.error("Failed to load floats", e);
    }
  };

  const handlePOSelect = (poId) => {
    if (!poId) {
      setForm({ ...form, poId: '' });
      return;
    }
    const po = pos.find(p => p.id === parseInt(poId, 10));
    if (po) {
      setForm({
        ...form,
        poId: po.id,
        budgetItemId: po.budgetItemId || form.budgetItemId,
        vendorId: po.vendorId || form.vendorId,
        amount: po.amount || '',
        taxAmount: po.taxAmount || '0',
        description: po.description || form.description
      });
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!form.budgetItemId) {
      alert("Please select a budget line item.");
      return;
    }
    const v = vendors.find(x => x.id === parseInt(form.vendorId, 10));
    const vendorName = v ? v.name : 'Direct Expense';

    setSubmitting(true);
    try {
      await logExpense(productionId, {
        productionId: Number(productionId),
        budgetItemId: Number(form.budgetItemId),
        poId: form.poId ? Number(form.poId) : 0,
        amount: Number(form.amount),
        taxAmount: Number(form.taxAmount) || 0,
        taxRate: Number(form.taxRate) || 0,
        taxType: form.taxType,
        vendor: vendorName,
        description: form.description,
        status: form.status,
        date: new Date().toISOString()
      });
      setForm({ 
        budgetItemId: '', 
        poId: '', 
        amount: '', 
        taxAmount: '0', 
        taxRate: '0', 
        taxType: 'None', 
        vendorId: '', 
        description: '', 
        status: 'Paid' 
      });
      await loadData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Failed to log expense.");
    }
    setSubmitting(false);
  };

  const handleIssueFloat = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post(`/productions/${productionId}/petty-cash/floats`, {
        issuedTo: floatForm.issuedTo,
        amount: Number(floatForm.amount),
        notes: floatForm.notes
      });
      setFloatForm({ issuedTo: '', amount: '', notes: '' });
      await loadFloats();
      if (res.data) handleSelectFloat(res.data);
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
      handleSelectFloat(selectedFloat);
      loadFloats();
    } catch (err) {
      alert("Failed to log receipt");
    }
  };

  const handleReconcile = async () => {
    if (!selectedFloat) return;
    if (!window.confirm(`Reconciling will close float "${selectedFloat.issuedTo}" and commit all receipts into the main ledger. Proceed?`)) return;
    try {
      await api.post(`/petty-cash/floats/${selectedFloat.id}/reconcile`);
      await loadFloats();
      await loadData();
      setSelectedFloat(null);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to reconcile float");
    }
  };

  // Helper formatting
  const formatINR = (amt) => new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amt || 0);

  // Financial KPI calculations
  const totalBaseSpend = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalTaxSpend = expenses.reduce((sum, e) => sum + (e.taxAmount || 0), 0);
  const totalGrossSpend = totalBaseSpend + totalTaxSpend;
  const activeFloatsBalance = floats.filter(f => f.status === 'Active').reduce((sum, f) => sum + (f.balance || 0), 0);

  // Filtered transactions
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      if (statusFilter !== 'ALL' && exp.status !== statusFilter) return false;
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        exp.vendor?.toLowerCase().includes(q) ||
        exp.description?.toLowerCase().includes(q) ||
        exp.status?.toLowerCase().includes(q) ||
        (exp.poId && `po-${exp.poId}`.includes(q))
      );
    });
  }, [expenses, statusFilter, searchTerm]);

  // Total preview for the active form
  const previewTotal = (Number(form.amount) || 0) + (Number(form.taxAmount) || 0);

  return (
    <div className="screen active" id="expenses" style={{ paddingBottom: '60px' }}>
      {/* Header */}
      <div className="page-head" style={{ marginBottom: '16px' }}>
        <div>
          <div className="page-title">Expense &amp; Spend Ledger</div>
          <div className="page-sub">Track actual production spending against script budget lines, POs, and cash floats.</div>
        </div>

        {/* Tab Switcher */}
        <div className="toggle-row" style={{ margin: 0 }}>
          <div 
            className={`toggle-opt ${activeTab === 'ledger' ? 'active' : ''}`}
            onClick={() => setActiveTab('ledger')}
          >
            💳 Main Ledger ({expenses.length})
          </div>
          <div 
            className={`toggle-opt ${activeTab === 'pettyCash' ? 'active' : ''}`}
            onClick={() => setActiveTab('pettyCash')}
          >
            💵 Petty Cash Floats ({floats.length})
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="kpi-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '22px' }}>
        <div className="kpi">
          <div className="kpi-top">
            <div className="kpi-icon violet">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.5"/></svg>
            </div>
            <span className="badge muted">{expenses.length} Records</span>
          </div>
          <div className="kpi-label">Gross Production Spend</div>
          <div className="kpi-value">{formatINR(totalGrossSpend)}</div>
          <div className="text-xs text-faint" style={{ marginTop: '8px' }}>
            Base costs + taxes across all departments
          </div>
        </div>

        <div className="kpi">
          <div className="kpi-top">
            <div className="kpi-icon blue">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <span className="badge info">Net Invoices</span>
          </div>
          <div className="kpi-label">Base Invoice Cost</div>
          <div className="kpi-value">{formatINR(totalBaseSpend)}</div>
          <div className="text-xs text-faint" style={{ marginTop: '8px' }}>
            Direct charges applied to budget items
          </div>
        </div>

        <div className="kpi">
          <div className="kpi-top">
            <div className="kpi-icon green">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <span className="badge success">Tax Input (ITC)</span>
          </div>
          <div className="kpi-label">Logged Taxes (GST/TDS)</div>
          <div className="kpi-value good">{formatINR(totalTaxSpend)}</div>
          <div className="text-xs text-faint" style={{ marginTop: '8px' }}>
            Eligible for GST Input Tax Credit
          </div>
        </div>

        <div className="kpi">
          <div className="kpi-top">
            <div className="kpi-icon violet">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            </div>
            <span className="badge muted">{floats.filter(f => f.status === 'Active').length} Active</span>
          </div>
          <div className="kpi-label">On-Set Cash Floats</div>
          <div className="kpi-value">{formatINR(activeFloatsBalance)}</div>
          <div className="text-xs text-faint" style={{ marginTop: '8px' }}>
            Unreconciled cash in field wallets
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'ledger' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '20px', alignItems: 'start' }}>
          
          {/* Left: Log Expense Form Card */}
          <div className="panel" style={{ margin: 0 }}>
            <div className="panel-head">
              <h3>Log New Expense</h3>
              <span className="hint">Direct Spend</span>
            </div>
            <div className="panel-body">
              <form onSubmit={handleAddExpense} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                {/* PO Link */}
                <div className="form-row" style={{ margin: 0 }}>
                  <label>Link to Purchase Order (Optional)</label>
                  <select 
                    value={form.poId} 
                    onChange={e => handlePOSelect(e.target.value)}
                  >
                    <option value="">None (Direct Invoice / Cash)</option>
                    {pos.filter(p => p.status === 'approved').map(po => (
                      <option key={po.id} value={po.id}>
                        PO #{po.id}: {po.description} ({formatINR(po.amount)})
                      </option>
                    ))}
                  </select>
                  <div className="text-xs text-faint" style={{ marginTop: '4px' }}>
                    Selecting an approved PO automatically populates budget item &amp; vendor.
                  </div>
                </div>

                {/* Budget Item */}
                <div className="form-row" style={{ margin: 0 }}>
                  <label>Budget Line Item *</label>
                  <select 
                    value={form.budgetItemId} 
                    onChange={e => setForm({ ...form, budgetItemId: e.target.value })}
                    required
                  >
                    <option value="">Choose Budget Line...</option>
                    {budgetItems.map(item => (
                      <option key={item.id} value={item.id}>
                        [{item.department}] {item.description} (Est: {formatINR(item.estimatedCost)})
                      </option>
                    ))}
                  </select>
                  <div className="text-xs text-faint" style={{ marginTop: '4px' }}>
                    Updates the actual spend on this specific script element.
                  </div>
                </div>

                {/* Vendor */}
                <div className="form-row" style={{ margin: 0 }}>
                  <label>Vendor / Payee *</label>
                  <select 
                    value={form.vendorId} 
                    onChange={e => setForm({ ...form, vendorId: e.target.value })}
                    required
                  >
                    <option value="">Select Vendor...</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.category || 'General'})</option>
                    ))}
                    {vendors.length === 0 && <option value="1">Direct Production Payee</option>}
                  </select>
                </div>

                {/* Description */}
                <div className="form-row" style={{ margin: 0 }}>
                  <label>Expense Description *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Day 1 Camera Rental, Set Props Invoice #412" 
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    required
                  />
                </div>

                {/* Amounts & Tax Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-row" style={{ margin: 0 }}>
                    <label>Base Amount (₹) *</label>
                    <input 
                      type="number" 
                      className="mono"
                      placeholder="0" 
                      value={form.amount}
                      onChange={e => {
                        const amt = Number(e.target.value) || 0;
                        const rate = Number(form.taxRate) || 0;
                        const tax = rate > 0 ? Math.round(amt * (rate / 100)) : form.taxAmount;
                        setForm({ ...form, amount: e.target.value, taxAmount: String(tax) });
                      }}
                      required
                      min="0"
                    />
                  </div>

                  <div className="form-row" style={{ margin: 0 }}>
                    <label>Tax Type</label>
                    <select 
                      value={form.taxType} 
                      onChange={e => {
                        const type = e.target.value;
                        let rate = 0;
                        if (type === 'CGST_SGST') rate = 18;
                        if (type === 'IGST') rate = 18;
                        if (type === 'TDS') rate = 10;
                        const amt = Number(form.amount) || 0;
                        const tax = rate > 0 ? Math.round(amt * (rate / 100)) : 0;
                        setForm({ ...form, taxType: type, taxRate: String(rate), taxAmount: String(tax) });
                      }}
                    >
                      <option value="None">None (Exempt)</option>
                      <option value="CGST_SGST">GST 18% (CGST+SGST)</option>
                      <option value="IGST">IGST 18% (Interstate)</option>
                      <option value="TDS">TDS 10% (Withheld)</option>
                    </select>
                  </div>
                </div>

                {/* Tax Breakdown */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-row" style={{ margin: 0 }}>
                    <label>Tax Rate (%)</label>
                    <input 
                      type="number" 
                      className="mono"
                      value={form.taxRate}
                      onChange={e => {
                        const rate = Number(e.target.value) || 0;
                        const amt = Number(form.amount) || 0;
                        const tax = rate > 0 ? Math.round(amt * (rate / 100)) : 0;
                        setForm({ ...form, taxRate: e.target.value, taxAmount: String(tax) });
                      }}
                    />
                  </div>

                  <div className="form-row" style={{ margin: 0 }}>
                    <label>Tax Amount (₹)</label>
                    <input 
                      type="number" 
                      className="mono"
                      value={form.taxAmount}
                      onChange={e => setForm({ ...form, taxAmount: e.target.value })}
                    />
                  </div>
                </div>

                {/* Total Preview Pill */}
                <div style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface-sunk)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span className="text-xs text-faint" style={{ fontWeight: 600 }}>Total Disbursement:</span>
                  <span className="mono" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
                    {formatINR(previewTotal)}
                  </span>
                </div>

                {/* Status */}
                <div className="form-row" style={{ margin: 0 }}>
                  <label>Disbursement Status</label>
                  <select 
                    value={form.status} 
                    onChange={e => setForm({ ...form, status: e.target.value })}
                    required
                  >
                    <option value="Paid">Paid (Settled)</option>
                    <option value="Pending">Pending Approval</option>
                    <option value="Reimbursable">Reimbursable to Crew</option>
                  </select>
                </div>

                {/* Submit */}
                <button 
                  type="submit" 
                  className="btn primary" 
                  disabled={submitting}
                  style={{ width: '100%', justifyContent: 'center', padding: '10px', marginTop: '6px' }}
                >
                  {submitting ? 'Recording...' : '+ Log Expense to Ledger'}
                </button>
              </form>
            </div>
          </div>

          {/* Right: Transactions Table Card */}
          <div className="panel" style={{ margin: 0 }}>
            <div className="panel-head" style={{ flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3>Expense Transactions</h3>
                <span className="hint">({filteredExpenses.length} of {expenses.length} records)</span>
              </div>

              {/* Search & Status Filters */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="toggle-row" style={{ margin: 0 }}>
                  <div 
                    className={`toggle-opt ${statusFilter === 'ALL' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('ALL')}
                    style={{ padding: '4px 10px', fontSize: '11px' }}
                  >
                    All
                  </div>
                  <div 
                    className={`toggle-opt ${statusFilter === 'Paid' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('Paid')}
                    style={{ padding: '4px 10px', fontSize: '11px' }}
                  >
                    Paid
                  </div>
                  <div 
                    className={`toggle-opt ${statusFilter === 'Pending' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('Pending')}
                    style={{ padding: '4px 10px', fontSize: '11px' }}
                  >
                    Pending
                  </div>
                </div>

                <div style={{ position: 'relative', width: '200px' }}>
                  <input 
                    type="text"
                    placeholder="Search vendor, desc..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 8px 6px 28px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      fontSize: '11.5px',
                      outline: 'none'
                    }}
                  />
                  <svg 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    strokeWidth="2" 
                    stroke="var(--text-faint)"
                    style={{ position: 'absolute', left: '8px', top: '7px', width: '13px', height: '13px' }}
                  >
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </div>
              </div>
            </div>

            <div className="panel-body" style={{ padding: 0 }}>
              {loading ? (
                <div style={{ padding: '40px', textAlign: 'center' }} className="text-dim">
                  Loading transaction ledger...
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: '100px' }}>Date</th>
                        <th>Vendor &amp; Description</th>
                        <th>Linked Budget Item</th>
                        <th>Status</th>
                        <th className="text-right">Base (₹)</th>
                        <th className="text-right">Tax (₹)</th>
                        <th className="text-right">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExpenses.map(exp => {
                        const linkedItem = budgetItems.find(b => b.id === exp.budgetItemId);
                        const grossAmt = (exp.amount || 0) + (exp.taxAmount || 0);

                        return (
                          <tr key={exp.id}>
                            <td className="text-dim text-xs mono">
                              {exp.date ? new Date(exp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Today'}
                              {exp.poId ? (
                                <div style={{ marginTop: '3px' }}>
                                  <span className="badge info" style={{ fontSize: '10px', padding: '1px 6px' }}>PO #{exp.poId}</span>
                                </div>
                              ) : null}
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, color: 'var(--text)' }}>{exp.vendor}</div>
                              <div className="text-dim text-xs" style={{ marginTop: '2px' }}>{exp.description}</div>
                            </td>
                            <td>
                              {linkedItem ? (
                                <div>
                                  <span className="badge loc" style={{ fontSize: '10.5px' }}>{linkedItem.department}</span>
                                  <div className="text-xs text-faint" style={{ marginTop: '2px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {linkedItem.description}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-faint text-xs">Direct / Overhead</span>
                              )}
                            </td>
                            <td>
                              <span className={`badge ${exp.status === 'Paid' ? 'success' : (exp.status === 'Pending' ? 'warning' : 'muted')}`}>
                                {exp.status || 'Paid'}
                              </span>
                            </td>
                            <td className="num mono">
                              {formatINR(exp.amount)}
                            </td>
                            <td className="num mono text-dim text-xs">
                              {exp.taxAmount > 0 ? (
                                <div>
                                  <div>{formatINR(exp.taxAmount)}</div>
                                  <div className="text-faint" style={{ fontSize: '9.5px' }}>{exp.taxType || 'Tax'}</div>
                                </div>
                              ) : (
                                <span className="text-faint">—</span>
                              )}
                            </td>
                            <td className="num mono" style={{ fontWeight: 700, color: 'var(--text)' }}>
                              {formatINR(grossAmt)}
                            </td>
                          </tr>
                        );
                      })}

                      {filteredExpenses.length === 0 && (
                        <tr>
                          <td colSpan="7" style={{ padding: '48px 20px', textAlign: 'center' }}>
                            <div className="text-dim" style={{ marginBottom: '8px' }}>No expenses found matching the criteria.</div>
                            <span className="text-xs text-faint">Use the form on the left to record your first vendor invoice.</span>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Petty Cash Floats Tab */
        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '20px', alignItems: 'start' }}>
          
          {/* Left: Floats List & Issue Float Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Active Floats List */}
            <div className="panel" style={{ margin: 0 }}>
              <div className="panel-head">
                <h3>Issued Cash Floats</h3>
                <span className="hint">{floats.length} floats</span>
              </div>
              <div className="panel-body" style={{ padding: 0 }}>
                {floats.map(f => {
                  const isSelected = selectedFloat?.id === f.id;
                  const isOverspent = (f.balance || 0) < 0;

                  return (
                    <div 
                      key={f.id}
                      onClick={() => handleSelectFloat(f)}
                      style={{ 
                        padding: '14px 16px', 
                        borderBottom: '1px solid var(--border-soft)', 
                        cursor: 'pointer',
                        background: isSelected ? 'var(--primary-soft)' : 'transparent',
                        borderLeft: isSelected ? '3px solid var(--primary)' : '3px solid transparent',
                        transition: 'background 0.1s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text)' }}>{f.issuedTo}</span>
                        <span className={`badge ${f.status === 'Active' ? 'info' : 'success'}`} style={{ fontSize: '10.5px' }}>
                          {f.status}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-dim)' }}>
                        <span>Float: <b className="mono">{formatINR(f.amount)}</b></span>
                        <span>Bal: <b className={`mono ${isOverspent ? 'text-danger' : 'text-success'}`}>{formatINR(f.balance)}</b></span>
                      </div>
                      {f.notes && (
                        <div className="text-xs text-faint" style={{ marginTop: '4px' }}>{f.notes}</div>
                      )}
                    </div>
                  );
                })}

                {floats.length === 0 && (
                  <div className="text-dim text-center" style={{ padding: '32px 16px', fontSize: '13px' }}>
                    No petty cash floats issued yet.
                  </div>
                )}
              </div>
            </div>

            {/* Issue New Float Card */}
            <div className="panel" style={{ margin: 0 }}>
              <div className="panel-head">
                <h3>Issue New Cash Float</h3>
              </div>
              <div className="panel-body">
                <form onSubmit={handleIssueFloat} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="form-row" style={{ margin: 0 }}>
                    <label>Recipient / Department Head *</label>
                    <input 
                      placeholder="e.g. Line Producer, Art Director" 
                      value={floatForm.issuedTo}
                      onChange={e => setFloatForm({ ...floatForm, issuedTo: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-row" style={{ margin: 0 }}>
                    <label>Float Cash Amount (₹) *</label>
                    <input 
                      type="number"
                      className="mono" 
                      placeholder="e.g. 50000" 
                      value={floatForm.amount}
                      onChange={e => setFloatForm({ ...floatForm, amount: e.target.value })}
                      required
                      min="1"
                    />
                  </div>
                  <div className="form-row" style={{ margin: 0 }}>
                    <label>Purpose / Shoot Days</label>
                    <input 
                      placeholder="e.g. Neo-Bengaluru Night Shoot emergency float" 
                      value={floatForm.notes}
                      onChange={e => setFloatForm({ ...floatForm, notes: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="btn primary" style={{ justifyContent: 'center', marginTop: '4px' }}>
                    Issue Cash Float
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Right: Selected Float Receipts & Quick Add */}
          <div className="panel" style={{ margin: 0 }}>
            <div className="panel-head" style={{ justifyContent: 'space-between' }}>
              <div>
                <h3>{selectedFloat ? `Float: ${selectedFloat.issuedTo}` : 'Float Receipts'}</h3>
                <span className="hint">Field Receipts</span>
              </div>
              {selectedFloat && selectedFloat.status === 'Active' && (
                <button 
                  className="btn primary" 
                  onClick={handleReconcile}
                  style={{ background: 'var(--success)', borderColor: 'var(--success)', color: '#fff', fontSize: '12px' }}
                >
                  ✓ Reconcile Float to Ledger
                </button>
              )}
            </div>

            <div className="panel-body">
              {!selectedFloat ? (
                <div className="text-dim text-center" style={{ padding: '60px 20px' }}>
                  Select a cash float on the left to review logged receipts or log on-set expenses.
                </div>
              ) : (
                <div>
                  {/* Float Summary Banner */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '16px',
                    padding: '16px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--surface-sunk)',
                    border: '1px solid var(--border)',
                    marginBottom: '20px'
                  }}>
                    <div>
                      <div className="text-xs text-faint">Float Issued To</div>
                      <div style={{ fontSize: '15px', fontWeight: 700, marginTop: '2px' }}>{selectedFloat.issuedTo}</div>
                    </div>
                    <div>
                      <div className="text-xs text-faint">Original Advance</div>
                      <div className="mono" style={{ fontSize: '15px', fontWeight: 700, marginTop: '2px' }}>{formatINR(selectedFloat.amount)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-faint">Available Balance</div>
                      <div 
                        className={`mono ${selectedFloat.balance < 0 ? 'text-danger' : 'text-success'}`}
                        style={{ fontSize: '15px', fontWeight: 800, marginTop: '2px' }}
                      >
                        {formatINR(selectedFloat.balance)}
                      </div>
                    </div>
                  </div>

                  {/* Add Receipt Form (if active) */}
                  {selectedFloat.status === 'Active' && (
                    <div style={{
                      padding: '16px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px dashed var(--border)',
                      background: 'var(--surface)',
                      marginBottom: '20px'
                    }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>+ Log Field Receipt</div>
                      <form onSubmit={handleLogReceipt} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="form-row" style={{ margin: 0 }}>
                          <label>Budget Item *</label>
                          <select 
                            value={receiptForm.budgetItemId}
                            onChange={e => setReceiptForm({ ...receiptForm, budgetItemId: e.target.value })}
                            required
                          >
                            <option value="">Select Item...</option>
                            {budgetItems.map(item => (
                              <option key={item.id} value={item.id}>
                                [{item.department}] {item.description}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="form-row" style={{ margin: 0 }}>
                          <label>Payee / Vendor *</label>
                          <input 
                            placeholder="e.g. Local Hardware, Fuel, Snacks" 
                            value={receiptForm.vendor} 
                            onChange={e => setReceiptForm({ ...receiptForm, vendor: e.target.value })} 
                            required 
                          />
                        </div>

                        <div className="form-row" style={{ margin: 0 }}>
                          <label>Receipt Description *</label>
                          <input 
                            placeholder="e.g. Generator diesel receipt #91" 
                            value={receiptForm.description} 
                            onChange={e => setReceiptForm({ ...receiptForm, description: e.target.value })} 
                            required 
                          />
                        </div>

                        <div className="form-row" style={{ margin: 0 }}>
                          <label>Amount (₹) *</label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input 
                              type="number" 
                              className="mono" 
                              placeholder="0" 
                              value={receiptForm.amount} 
                              onChange={e => setReceiptForm({ ...receiptForm, amount: e.target.value })} 
                              required 
                              min="1"
                              style={{ flex: 1 }}
                            />
                            <button type="submit" className="btn primary" style={{ minWidth: '80px', justifyContent: 'center' }}>
                              Add
                            </button>
                          </div>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Receipts Table */}
                  <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Payee / Vendor</th>
                          <th>Description</th>
                          <th className="text-right">Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {floatReceipts.map(r => (
                          <tr key={r.id}>
                            <td className="text-dim text-xs mono">
                              {r.transactionDate ? new Date(r.transactionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Today'}
                            </td>
                            <td style={{ fontWeight: 600 }}>{r.vendor}</td>
                            <td>{r.description}</td>
                            <td className="num mono" style={{ fontWeight: 700 }}>
                              {formatINR(r.amount)}
                            </td>
                          </tr>
                        ))}

                        {floatReceipts.length === 0 && (
                          <tr>
                            <td colSpan="4" className="text-center text-dim" style={{ padding: '36px' }}>
                              No field receipts recorded against this float yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
