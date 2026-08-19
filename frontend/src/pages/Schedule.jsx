import React, { useState, useEffect } from 'react';
import { fetchSchedule, fetchDOOD } from '../api';
import api from '../api';
import useSSE from '../hooks/useSSE';

const Schedule = ({ productionId }) => {
  const [schedule, setSchedule] = useState([]);
  const [dood, setDood] = useState([]);
  const [activeTab, setActiveTab] = useState('calendar'); // 'calendar' | 'dood' | 'callsheet'
  
  // Real-time updates
  const event = useSSE(productionId, ['schedule_updated']);

  useEffect(() => {
    if (event) {
      console.log("Real-time schedule update:", event);
      loadData();
      if (activeTab === 'callsheet' && csDate) {
        generateCallSheet();
      }
    }
  }, [event]);

  // Call sheet state
  const [csDate, setCsDate] = useState(new Date().toISOString().split('T')[0]);
  const [callSheet, setCallSheet] = useState(null);
  const [csLoading, setCsLoading] = useState(false);

  useEffect(() => {
    if (productionId) {
      loadData();
    }
  }, [productionId]);

  const loadData = async () => {
    try {
      const [schedRes, doodRes] = await Promise.all([
        fetchSchedule(productionId),
        fetchDOOD(productionId)
      ]);
      setSchedule(schedRes.data);
      setDood(doodRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const generateCallSheet = async () => {
    setCsLoading(true);
    try {
      const res = await api.get(`/productions/${productionId}/schedule/call-sheet?date=${csDate}`);
      setCallSheet(res.data);
    } catch (err) {
      alert("Failed to fetch call sheet");
      console.error(err);
    }
    setCsLoading(false);
  };

  return (
    <div className="screen active">
      <div className="page-head">
        <div>
          <div className="page-title">Shooting Schedule</div>
          <div className="page-subtitle">Manage shoot days and Day-Out-Of-Days (DOOD) reports.</div>
        </div>
        <div className="btn-group">
          <button className={`btn ${activeTab === 'calendar' ? 'active' : ''}`} onClick={() => setActiveTab('calendar')}>Schedule List</button>
          <button className={`btn ${activeTab === 'dood' ? 'active' : ''}`} onClick={() => setActiveTab('dood')}>DOOD Report</button>
          <button className={`btn ${activeTab === 'callsheet' ? 'active' : ''}`} onClick={() => setActiveTab('callsheet')}>Digital Call Sheet</button>
        </div>
      </div>

      <div className="panel p-0">
        {activeTab === 'calendar' && (
          <table className="table">
            <thead>
              <tr>
                <th>Day #</th>
                <th>Date</th>
                <th>Scene ID</th>
                <th>Call Time</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map(s => (
                <tr key={s.id}>
                  <td><b>D{String(s.dayNumber).padStart(2, '0')}</b></td>
                  <td>{new Date(s.scheduledDate).toLocaleDateString()}</td>
                  <td>Scene {s.sceneId}</td>
                  <td className="mono">{s.callTime}</td>
                  <td><span className={`badge ${s.status === 'shot' ? 'success' : s.status === 'cancelled' ? 'danger' : 'info'}`}>{s.status}</span></td>
                  <td className="text-right">
                    <button className="btn sm">Edit</button>
                  </td>
                </tr>
              ))}
              {schedule.length === 0 && (
                <tr><td colSpan="6" className="text-center" style={{padding:'32px', color:'var(--text-faint)'}}>No shoot days scheduled yet. Generate a schedule from the Scene Builder.</td></tr>
              )}
            </tbody>
          </table>
        )}
        
        {activeTab === 'dood' && (
          <div style={{padding: '32px'}}>
            <p className="text-faint">DOOD Matrix will appear here. This visualizes which Cast and Crew members are working on which shoot days (W = Work, S = Start, F = Finish, H = Hold).</p>
            <table className="table" style={{marginTop: '16px'}}>
              <thead>
                <tr>
                  <th>Entity ID</th>
                  <th>D01</th>
                  <th>D02</th>
                  <th>D03</th>
                  <th>D04</th>
                </tr>
              </thead>
              <tbody>
                {/* Simplified DOOD view for MVP */}
                {dood.slice(0, 5).map((d, i) => (
                  <tr key={i}>
                    <td>Element {d.elementId}</td>
                    <td className="text-success"><b>SW</b></td>
                    <td className="text-success"><b>W</b></td>
                    <td className="text-warning"><b>H</b></td>
                    <td className="text-danger"><b>WF</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'callsheet' && (
          <div style={{padding: '32px'}}>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ margin: 0, width: '250px' }}>
                <label>Select Shoot Date</label>
                <input 
                  type="date" 
                  className="input" 
                  value={csDate} 
                  onChange={e => setCsDate(e.target.value)} 
                />
              </div>
              <button className="btn primary" onClick={generateCallSheet} disabled={csLoading}>
                {csLoading ? 'Generating...' : 'Generate Call Sheet'}
              </button>
            </div>

            {callSheet && (
              <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ background: 'var(--surface-sunken)', padding: '24px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
                  <h2 style={{ margin: '0 0 8px 0' }}>Daily Call Sheet</h2>
                  <div className="text-dim">Shoot Date: {new Date(callSheet.date).toLocaleDateString()}</div>
                </div>

                <div className="grid-2" style={{ gap: 0 }}>
                  <div style={{ padding: '24px', borderRight: '1px solid var(--border)' }}>
                    <h4 style={{ marginBottom: '16px', color: 'var(--accent)' }}>Scenes to Shoot</h4>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {callSheet.scenes && callSheet.scenes.map((sc, i) => (
                        <li key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                          <div style={{ fontWeight: 500 }}>{sc.name}</div>
                          <div className="text-xs text-dim">Call: {sc.callTime}</div>
                        </li>
                      ))}
                      {(!callSheet.scenes || callSheet.scenes.length === 0) && <li className="text-dim" style={{padding: '8px 0'}}>No scenes scheduled.</li>}
                    </ul>

                    <h4 style={{ marginTop: '32px', marginBottom: '16px', color: 'var(--accent)' }}>Locations</h4>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {callSheet.locations && callSheet.locations.map((loc, i) => (
                        <li key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                          <div style={{ fontWeight: 500 }}>{loc.name}</div>
                          <div className="text-xs text-dim">Call: {loc.callTime}</div>
                        </li>
                      ))}
                      {(!callSheet.locations || callSheet.locations.length === 0) && <li className="text-dim" style={{padding: '8px 0'}}>No locations scheduled.</li>}
                    </ul>
                  </div>

                  <div style={{ padding: '24px' }}>
                    <h4 style={{ marginBottom: '16px', color: 'var(--accent)' }}>Cast Call Times</h4>
                    <table className="table" style={{ width: '100%', marginBottom: '32px' }}>
                      <tbody>
                        {callSheet.cast && callSheet.cast.map((c, i) => (
                          <tr key={i}>
                            <td>
                              <div style={{ fontWeight: 500 }}>{c.name}</div>
                              <div className="text-xs text-dim">{c.role}</div>
                            </td>
                            <td className="text-right mono font-medium">{c.callTime}</td>
                          </tr>
                        ))}
                        {(!callSheet.cast || callSheet.cast.length === 0) && <tr><td colSpan="2" className="text-dim" style={{padding: '8px 0'}}>No cast scheduled.</td></tr>}
                      </tbody>
                    </table>

                    <h4 style={{ marginBottom: '16px', color: 'var(--accent)' }}>Crew Call Times</h4>
                    <table className="table" style={{ width: '100%' }}>
                      <tbody>
                        {callSheet.crew && callSheet.crew.map((c, i) => (
                          <tr key={i}>
                            <td>
                              <div style={{ fontWeight: 500 }}>{c.name}</div>
                              <div className="text-xs text-dim">{c.role}</div>
                            </td>
                            <td className="text-right mono font-medium">{c.callTime}</td>
                          </tr>
                        ))}
                        {(!callSheet.crew || callSheet.crew.length === 0) && <tr><td colSpan="2" className="text-dim" style={{padding: '8px 0'}}>No crew scheduled.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Schedule;
