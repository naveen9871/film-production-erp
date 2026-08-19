import React, { useEffect, useState } from 'react';
import { fetchDashboard, fetchExpenses, fetchBudget } from '../api';

const Dashboard = ({ productionId }) => {
  const [stats, setStats] = useState({
    totalBudget: 0,
    totalEstimatedCost: 0,
    totalActualCost: 0,
    totalVariance: 0,
    totalExpectedRevenue: 0,
    totalActualRevenue: 0,
  });
  const [budget, setBudget] = useState([]);
  const [expenses, setExpenses] = useState([]);

  useEffect(() => {
    if (productionId) {
      fetchDashboardData();
    }
  }, [productionId]);

  const fetchDashboardData = async () => {
    try {
      const [dashRes, expRes, budgetRes] = await Promise.all([
        fetchDashboard(productionId),
        fetchExpenses(productionId),
        fetchBudget(productionId)
      ]);
      setStats(dashRes.data || {});
      setExpenses(expRes.data || []);
      setBudget(budgetRes.data || []);
    } catch (error) {
      console.error("Failed to load dashboard data", error);
    }
  };

  const remainingBudget = stats.totalEstimatedCost - stats.totalActualCost;
  const isOverBudget = remainingBudget < 0;

  // Formatting helper
  const formatINR = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Group budget by department for the bar chart
  const deptBudgets = budget.reduce((acc, curr) => {
    if (!acc[curr.department]) acc[curr.department] = { est: 0, actual: 0 };
    acc[curr.department].est += curr.estimatedCost;
    acc[curr.department].actual += curr.actualCost;
    return acc;
  }, {});

  const projectedROI = stats.totalExpectedRevenue - stats.totalEstimatedCost;
  const roiPercentage = stats.totalEstimatedCost > 0 ? ((projectedROI / stats.totalEstimatedCost) * 100).toFixed(1) : 0;

  return (
    <div className="screen active" id="dashboard">
      <div className="page-head">
        <div>
          <div className="page-title">Executive Summary</div>
          <div className="page-sub">Financial health of production</div>
        </div>
        <button className="btn primary">+ Log Expense</button>
      </div>

      <div className="kpi-row">
        <div className="kpi">
          <div className="kpi-top">
            <div className="kpi-icon violet">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
            </div>
          </div>
          <div className="kpi-label">Total Estimated Budget</div>
          <div className="kpi-value">{formatINR(stats.totalEstimatedCost)}</div>
          <svg className="kpi-spark" viewBox="0 0 100 28" preserveAspectRatio="none"><polyline points="0,20 15,18 30,19 45,14 60,15 75,9 100,7" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".55"/></svg>
        </div>
        <div className="kpi">
          <div className="kpi-top">
            <div className="kpi-icon red">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            {isOverBudget && <div className="kpi-delta up-bad">▲ Over</div>}
          </div>
          <div className="kpi-label">Total Spent</div>
          <div className={`kpi-value ${isOverBudget ? 'alert' : ''}`}>{formatINR(stats.totalActualCost)}</div>
          <svg className="kpi-spark" viewBox="0 0 100 28" preserveAspectRatio="none"><polyline points="0,22 15,20 30,16 45,17 60,10 75,11 100,3" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".55"/></svg>
        </div>
        <div className="kpi">
          <div className="kpi-top">
            <div className="kpi-icon red">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><path d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>
            </div>
          </div>
          <div className="kpi-label">Remaining Budget</div>
          <div className={`kpi-value ${isOverBudget ? 'alert' : ''}`}>
            {remainingBudget < 0 ? `−${formatINR(Math.abs(remainingBudget))}` : formatINR(remainingBudget)}
          </div>
          {isOverBudget && <div className="kpi-delta up-bad" style={{marginTop: '9px', display: 'inline-flex'}}>Deficit — flagged</div>}
        </div>
        <div className="kpi">
          <div className="kpi-top">
            <div className="kpi-icon green">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><path d="M3 17l6-6 4 4 8-8" strokeLinecap="round" strokeLinejoin="round"/><path d="M15 7h6v6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div className={`kpi-delta ${projectedROI >= 0 ? 'up-good' : 'up-bad'}`}>
              {projectedROI >= 0 ? '+' : ''}{roiPercentage}%
            </div>
          </div>
          <div className="kpi-label">Projected ROI</div>
          <div className={`kpi-value ${projectedROI >= 0 ? 'good' : 'alert'}`}>{formatINR(projectedROI)}</div>
          <svg className="kpi-spark" viewBox="0 0 100 28" preserveAspectRatio="none"><polyline points="0,24 15,20 30,21 45,15 60,13 75,8 100,4" fill="none" stroke={projectedROI >= 0 ? 'var(--success)' : 'var(--danger)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".55"/></svg>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head"><h3>Spend by Department</h3><span className="link-txt">View budget →</span></div>
          <div className="panel-body">
            {Object.keys(deptBudgets).length > 0 ? Object.entries(deptBudgets).map(([dept, vals]) => {
              const pct = vals.est > 0 ? (vals.actual / vals.est) * 100 : 0;
              return (
                <div className="bar-row" key={dept}>
                  <div className="bar-label">{dept}</div>
                  <div className="bar-track">
                    <div className={`bar-fill ${pct > 100 ? 'over' : ''}`} style={{width: `${Math.min(pct, 100)}%`}}></div>
                  </div>
                  <div className="bar-amt">{formatINR(vals.est)}</div>
                </div>
              );
            }) : (
              <div className="text-dim">No budget data available</div>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><h3>Recent Expenses</h3><span className="link-txt">View ledger →</span></div>
          <div className="panel-body">
            <table>
              <tbody>
                {expenses.length > 0 ? expenses.slice(0, 5).map((exp, idx) => (
                  <tr key={idx}>
                    <td><span className="row-icon">💸</span>{exp.description} — {exp.vendor}</td>
                    <td className="num">{formatINR(exp.amount)}</td>
                  </tr>
                )) : (
                  <>
                    <tr><td><span className="row-icon">☕</span>Cafe Rental — Coffee Shop</td><td className="num">₹15,000</td></tr>
                    <tr><td><span className="row-icon">🎥</span>Steadicam hire, 2 days</td><td className="num">₹2,40,000</td></tr>
                    <tr><td><span className="row-icon">👗</span>Lead costume fitting</td><td className="num">₹68,500</td></tr>
                    <tr><td><span className="row-icon">👥</span>Junior artists (40)</td><td className="num">₹3,20,000</td></tr>
                    <tr><td><span className="row-icon">📍</span>Location permit — Marine Drive</td><td className="num">₹1,10,000</td></tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
