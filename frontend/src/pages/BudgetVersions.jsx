import React, { useState, useEffect } from 'react';
import { fetchBudgetVersions, createBudgetSnapshot, lockBudgetVersion, fetchVarianceReport } from '../api';
import useSSE from '../hooks/useSSE';

const BudgetVersions = ({ productionId }) => {
  const [versions, setVersions] = useState([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [newVersion, setNewVersion] = useState({ label: '', notes: '' });
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [varianceReport, setVarianceReport] = useState([]);

  // Real-time updates
  const event = useSSE(productionId, ['budget_locked']);

  useEffect(() => {
    if (event) {
      console.log("Real-time budget update:", event);
      loadVersions();
    }
  }, [event]);

  useEffect(() => {
    if (productionId) {
      loadVersions();
    }
  }, [productionId]);

  const loadVersions = async () => {
    try {
      const res = await fetchBudgetVersions(productionId);
      setVersions(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSnapshot = async () => {
    try {
      await createBudgetSnapshot(productionId, newVersion);
      setModalOpen(false);
      loadVersions();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLock = async (id) => {
    try {
      await lockBudgetVersion(id);
      loadVersions();
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewVariance = async (id) => {
    setSelectedVersion(id);
    try {
      const res = await fetchVarianceReport(id);
      setVarianceReport(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="screen">
      <div className="page-head">
        <div>
          <div className="page-title">Budget Versions</div>
          <div className="page-subtitle">Manage snapshots and compare actuals against locked budgets.</div>
        </div>
        <button className="btn primary" onClick={() => setModalOpen(true)}>Create Snapshot</button>
      </div>

      <div className="grid-2">
        <div className="panel p-0">
          <div className="panel-head">
            <h3 className="panel-title">Version History</h3>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Label</th>
                <th>Status</th>
                <th>Created</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {versions.map(v => (
                <tr key={v.id} className={selectedVersion === v.id ? 'active' : ''} onClick={() => v.status === 'locked' && handleViewVariance(v.id)} style={{cursor: v.status === 'locked' ? 'pointer' : 'default'}}>
                  <td><b>{v.versionLabel}</b></td>
                  <td><span className={`badge ${v.status === 'locked' ? 'success' : 'warning'}`}>{v.status}</span></td>
                  <td>{new Date(v.createdAt).toLocaleDateString()}</td>
                  <td className="text-right">
                    {v.status === 'draft' ? (
                      <button className="btn sm danger" onClick={(e) => { e.stopPropagation(); handleLock(v.id); }}>Lock</button>
                    ) : (
                      <span className="text-faint mono text-sm">Locked</span>
                    )}
                  </td>
                </tr>
              ))}
              {versions.length === 0 && (
                <tr><td colSpan="4" className="text-center" style={{padding:'32px', color:'var(--text-faint)'}}>No versions created yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="panel p-0">
          <div className="panel-head">
            <h3 className="panel-title">Variance Report</h3>
          </div>
          {selectedVersion ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Line Item</th>
                  <th className="text-right">Locked Est.</th>
                  <th className="text-right">Actuals</th>
                  <th className="text-right">Variance</th>
                </tr>
              </thead>
              <tbody>
                {varianceReport.map((v, i) => (
                  <tr key={i}>
                    <td>
                      <div>{v.description}</div>
                      <div className="text-sm text-faint">{v.budgetLine} / {v.department}</div>
                    </td>
                    <td className="text-right mono">${v.lockedEst.toLocaleString()}</td>
                    <td className="text-right mono">${v.currentActual.toLocaleString()}</td>
                    <td className={`text-right mono ${v.variance < 0 ? 'text-danger' : 'text-success'}`}>
                      {v.variance < 0 ? '-' : '+'}${Math.abs(v.variance).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center" style={{padding: '64px 32px', color: 'var(--text-faint)'}}>
              Select a <b>Locked</b> budget version on the left to view its variance report.
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal" style={{maxWidth: '400px'}}>
            <div className="modal-head">
              <h3 className="modal-title">Create Budget Snapshot</h3>
              <button className="icon-btn" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <div className="modal-body form-grid">
              <div className="form-group">
                <label>Version Label</label>
                <input type="text" className="input" placeholder="e.g. v2-locked" value={newVersion.label} onChange={e => setNewVersion({...newVersion, label: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea className="input" rows="3" value={newVersion.notes} onChange={e => setNewVersion({...newVersion, notes: e.target.value})}></textarea>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn primary" onClick={handleCreateSnapshot}>Save Snapshot</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetVersions;
