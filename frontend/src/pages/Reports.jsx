import React, { useState } from 'react';
import { FileDown, FileSpreadsheet, FileText } from 'lucide-react';
import api, { fetchGSTITCReport } from '../api';

const Reports = ({ productionId }) => {
  const [dcrDate, setDcrDate] = useState(new Date().toISOString().split('T')[0]);
  const [dcrData, setDcrData] = useState(null);
  const [dcrLoading, setDcrLoading] = useState(false);
  const [gstData, setGstData] = useState(null);
  const [gstLoading, setGstLoading] = useState(false);

  const handleFetchDCR = async () => {
    setDcrLoading(true);
    try {
      const res = await api.get(`/productions/${productionId}/report/dcr?date=${dcrDate}`);
      setDcrData(res.data);
    } catch (err) {
      console.error("Failed to fetch DCR", err);
      alert("Failed to load DCR");
    } finally {
      setDcrLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await api.get(`/productions/${productionId}/report/pdf`, {
        responseType: 'blob' 
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Budget_Report_${productionId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error("Failed to download PDF", err);
      alert("PDF Generation is not yet implemented on the backend.");
    }
  };

  const handleDownloadCSV = () => {
    alert("CSV Export is not yet implemented on the backend.");
  };

  const handleFetchGST = async () => {
    setGstLoading(true);
    try {
      const res = await fetchGSTITCReport();
      setGstData(res.data || []);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch GST ITC Report");
    } finally {
      setGstLoading(false);
    }
  };

  return (
    <div className="screen active" id="reports">
      <div className="page-head">
        <div>
          <div className="page-title">Reporting & Exports</div>
          <div className="page-sub">Generate and download comprehensive reports for your production</div>
        </div>
      </div>
      
      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <h3>Budget Summary Report</h3>
          </div>
          <div className="panel-body">
            <p className="text-dim" style={{ marginBottom: '24px' }}>
              Download a complete PDF report of your production budget, including department breakdowns, rate card configurations, and variances.
            </p>
            <button 
              className="btn primary"
              onClick={handleDownloadPDF}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <FileDown size={18} style={{ marginRight: '8px' }} />
              Download PDF Report
            </button>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3>Raw Data Export</h3>
          </div>
          <div className="panel-body">
            <p className="text-dim" style={{ marginBottom: '24px' }}>
              Export all line items, tracked expenses, and extracted entities as a CSV file for analysis in Excel or other tools.
            </p>
            <button 
              className="btn"
              onClick={handleDownloadCSV}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <FileSpreadsheet size={18} style={{ marginRight: '8px' }} />
              Export CSV Data
            </button>
          </div>
        </div>
      </div>
      
      <div className="panel" style={{ marginTop: '24px' }}>
        <div className="panel-head">
          <h3>Daily Cost Report (DCR)</h3>
        </div>
        <div className="panel-body">
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ margin: 0, flex: 1 }}>
              <label>Select Shoot Date</label>
              <input 
                type="date" 
                value={dcrDate} 
                onChange={e => setDcrDate(e.target.value)} 
                className="input"
              />
            </div>
            <button className="btn primary" onClick={handleFetchDCR} disabled={dcrLoading}>
              {dcrLoading ? 'Loading...' : 'Generate Report'}
            </button>
          </div>
          
          {dcrData && (
            <div className="dcr-results">
              <div className="stat-cards" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div className="stat-card" style={{ padding: '16px', background: 'var(--surface-sunken)', borderRadius: '8px' }}>
                  <div className="stat-label" style={{ color: 'var(--text-dim)', fontSize: '13px' }}>Estimated for Today</div>
                  <div className="stat-value" style={{ fontSize: '24px', fontWeight: 'bold' }}>₹{dcrData.totalEstimated?.toLocaleString() || 0}</div>
                </div>
                <div className="stat-card" style={{ padding: '16px', background: 'var(--surface-sunken)', borderRadius: '8px' }}>
                  <div className="stat-label" style={{ color: 'var(--text-dim)', fontSize: '13px' }}>Actual for Today</div>
                  <div className="stat-value" style={{ fontSize: '24px', fontWeight: 'bold' }}>₹{dcrData.totalActual?.toLocaleString() || 0}</div>
                </div>
                <div className="stat-card" style={{ padding: '16px', background: 'var(--surface-sunken)', borderRadius: '8px' }}>
                  <div className="stat-label" style={{ color: 'var(--text-dim)', fontSize: '13px' }}>Daily Variance</div>
                  <div className="stat-value" style={{ fontSize: '24px', fontWeight: 'bold', color: dcrData.totalVariance < 0 ? 'var(--red)' : 'var(--green)' }}>
                    ₹{Math.abs(dcrData.totalVariance || 0).toLocaleString()} 
                    {dcrData.totalVariance < 0 ? ' Over' : ' Under'}
                  </div>
                </div>
              </div>
              
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '12px', borderBottom: '1px solid var(--border)' }}>Department</th>
                    <th style={{ textAlign: 'right', padding: '12px', borderBottom: '1px solid var(--border)' }}>Budgeted</th>
                    <th style={{ textAlign: 'right', padding: '12px', borderBottom: '1px solid var(--border)' }}>Actual</th>
                    <th style={{ textAlign: 'right', padding: '12px', borderBottom: '1px solid var(--border)' }}>Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {dcrData.departments && dcrData.departments.length > 0 ? (
                    dcrData.departments.map(d => (
                      <tr key={d.department}>
                        <td style={{ padding: '12px', borderBottom: '1px solid var(--border)' }}>{d.department}</td>
                        <td style={{ textAlign: 'right', padding: '12px', borderBottom: '1px solid var(--border)' }}>₹{d.estimated?.toLocaleString() || 0}</td>
                        <td style={{ textAlign: 'right', padding: '12px', borderBottom: '1px solid var(--border)' }}>₹{d.actual?.toLocaleString() || 0}</td>
                        <td style={{ textAlign: 'right', padding: '12px', borderBottom: '1px solid var(--border)', color: d.variance < 0 ? 'var(--red)' : 'var(--green)' }}>
                          {d.variance < 0 ? '-' : '+'}₹{Math.abs(d.variance || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)' }}>
                        No costs found for this date.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="panel mt-4">
        <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>GST Input Tax Credit (ITC) Reconciliation</h3>
          <button className="btn" onClick={handleFetchGST} disabled={gstLoading}>
            {gstLoading ? 'Loading...' : 'Run GSTR-2A Report'}
          </button>
        </div>
        <div className="panel-body p-0">
          {!gstData ? (
             <div className="text-center text-dim" style={{ padding: '40px' }}>
               <FileText size={48} opacity={0.2} style={{ display: 'block', margin: '0 auto 16px' }} />
               Click 'Run GSTR-2A Report' to fetch eligible ITC
             </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>GSTIN</th>
                  <th>Tax Type</th>
                  <th>Total Invoice Value</th>
                  <th>Eligible ITC (Tax Amount)</th>
                </tr>
              </thead>
              <tbody>
                {gstData.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center text-dim py-4">No GST ITC data available.</td>
                  </tr>
                ) : (
                  gstData.map((row, i) => (
                    <tr key={i}>
                      <td className="fw-500">{row.vendorName}</td>
                      <td><code>{row.gstin}</code></td>
                      <td><span className="badge active">{row.taxType}</span></td>
                      <td>₹{row.totalValue.toLocaleString()}</td>
                      <td className="fw-500" style={{ color: 'var(--green)' }}>₹{row.totalTax.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
