import React, { useState, useEffect } from 'react';
import api from '../api';

const Expenses = ({ productionId }) => {
  const [expenses, setExpenses] = useState([]);
  const [budgetItems, setBudgetItems] = useState([]);
  const [form, setForm] = useState({ budgetItemId: '', amount: '', vendor: '', description: '' });

  useEffect(() => {
    if (productionId) {
      fetchData();
    }
  }, [productionId]);

  const fetchData = async () => {
    try {
      const [expRes, budRes] = await Promise.all([
        api.get(`/productions/${productionId}/expenses`),
        api.get(`/productions/${productionId}/budget`)
      ]);
      setExpenses(expRes.data || []);
      setBudgetItems(budRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/productions/${productionId}/expenses`, {
        productionId: Number(productionId),
        budgetItemId: Number(form.budgetItemId),
        amount: Number(form.amount),
        vendor: form.vendor,
        description: form.description,
        date: new Date().toISOString()
      });
      setForm({ budgetItemId: '', amount: '', vendor: '', description: '' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="animate-fade-in glass-card">
      <h1>Expenses</h1>
      
      <div style={{ margin: '2rem 0', padding: '1.5rem', background: '#f8f9fa', borderRadius: '8px' }}>
        <h3>Add Expense</h3>
        <form onSubmit={handleAddExpense} style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <select 
            value={form.budgetItemId} 
            onChange={e => setForm({...form, budgetItemId: e.target.value})}
            required
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', minWidth: '200px' }}
          >
            <option value="">Select Budget Item</option>
            {budgetItems.map(item => (
              <option key={item.id} value={item.id}>
                {item.department} - {item.description} (Est: ₹{item.estimatedCost})
              </option>
            ))}
          </select>
          <input 
            type="number" 
            placeholder="Amount (₹)" 
            value={form.amount}
            onChange={e => setForm({...form, amount: e.target.value})}
            required
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <input 
            type="text" 
            placeholder="Vendor" 
            value={form.vendor}
            onChange={e => setForm({...form, vendor: e.target.value})}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <input 
            type="text" 
            placeholder="Description" 
            value={form.description}
            onChange={e => setForm({...form, description: e.target.value})}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', flex: 1 }}
          />
          <button type="submit" style={{ padding: '0.5rem 1rem', background: 'var(--color-accent)', color: 'white', border: 'none', borderRadius: '4px' }}>
            Add
          </button>
        </form>
      </div>

      {expenses.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
          <thead>
            <tr style={{ background: '#f0f0f0', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem' }}>Date</th>
              <th style={{ padding: '0.75rem' }}>Budget Item ID</th>
              <th style={{ padding: '0.75rem' }}>Vendor</th>
              <th style={{ padding: '0.75rem' }}>Description</th>
              <th style={{ padding: '0.75rem', textAlign: 'right' }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map(exp => (
              <tr key={exp.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.75rem' }}>{new Date(exp.date).toLocaleDateString()}</td>
                <td style={{ padding: '0.75rem' }}>{exp.budgetItemId}</td>
                <td style={{ padding: '0.75rem' }}>{exp.vendor}</td>
                <td style={{ padding: '0.75rem' }}>{exp.description}</td>
                <td style={{ padding: '0.75rem', textAlign: 'right' }}>{exp.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Expenses;
