import React from 'react';
import { FileDown, FileSpreadsheet } from 'lucide-react';
import api from '../api';

const Reports = ({ productionId }) => {
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
    </div>
  );
};

export default Reports;
