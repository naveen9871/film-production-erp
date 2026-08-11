import React, { useState, useEffect } from 'react';
import { fetchExpenses, logExpense, fetchBudget } from '../api';

const Expenses = ({ productionId }) => {
  const [expenses, setExpenses] = useState([]);
  const [budgetItems, setBudgetItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ 
    budgetItemId: '', 
    amount: '', 
    taxAmount: '0',
    vendor: '', 
    description: '',
    status: 'Paid'
  });

  useEffect(() => {
    if (productionId) {
      loadData();
    }
  }, [productionId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [expRes, budRes] = await Promise.all([
        fetchExpenses(productionId),
        fetchBudget(productionId)
      ]);
      setExpenses(expRes.data || []);
      setBudgetItems(budRes.data || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      await logExpense(productionId, {
        budgetItemId: Number(form.budgetItemId),
        amount: Number(form.amount),
        taxAmount: Number(form.taxAmount),
        vendor: form.vendor,
        description: form.description,
        status: form.status,
        date: new Date().toISOString()
      });
      setForm({ budgetItemId: '', amount: '', taxAmount: '0', vendor: '', description: '', status: 'Paid' });
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const formatINR = (amt) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt || 0);

  return (
    <div className="screen active" id="expenses">
      <div className="page-head">
        <div>
          <div className="page-title">Expense Ledger</div>
          <div className="page-sub">Track actual spending against budget line items</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel" style={{ gridColumn: 'span 1' }}>
          <div className="panel-head">
            <h3>Log New Expense</h3>
          </div>
          <div className="panel-body">
            <form onSubmit={handleAddExpense} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-row">
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
              <div className="form-row">
                <label>Vendor</label>
                <input 
                  type="text" 
                  className="input"
                  placeholder="Vendor Name" 
                  value={form.vendor}
                  onChange={e => setForm({...form, vendor: e.target.value})}
                  required
                />
              </div>
              <div className="form-row">
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
                <div className="form-row">
                  <label>Base Amount (₹)</label>
                  <input 
                    type="number" 
                    className="input"
                    placeholder="0" 
                    value={form.amount}
                    onChange={e => setForm({...form, amount: e.target.value})}
                    required
                  />
                </div>
                <div className="form-row">
                  <label>Tax Amount (₹)</label>
                  <input 
                    type="number" 
                    className="input"
                    placeholder="0" 
                    value={form.taxAmount}
                    onChange={e => setForm({...form, taxAmount: e.target.value})}
                  />
                </div>
              </div>
              <div className="form-row">
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
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Vendor & Desc</th>
                    <th>Status</th>
                    <th className="num">Tax</th>
                    <th className="num">Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(exp => (
                    <tr key={exp.id}>
                      <td className="text-dim">{new Date(exp.date).toLocaleDateString()}</td>
                      <td>
                        <div style={{ fontWeight: '500' }}>{exp.vendor}</div>
                        <div className="text-dim" style={{ fontSize: '12px' }}>{exp.description}</div>
                      </td>
                      <td>
                        <span className={`badge ${exp.status === 'Paid' ? 'signed' : (exp.status === 'Pending' ? 'negotiating' : '')}`}>
                          {exp.status}
                        </span>
                      </td>
                      <td className="num text-dim">{formatINR(exp.taxAmount)}</td>
                      <td className="num" style={{ fontWeight: '600' }}>{formatINR(exp.amount + (exp.taxAmount || 0))}</td>
                    </tr>
                  ))}
                  {expenses.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-dim text-center">No expenses logged yet.</td>
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

export default Expenses;
