import React from 'react';
import { FileDown } from 'lucide-react';
import api from '../api';

const Reports = ({ productionId }) => {
  const handleDownloadPDF = async () => {
    try {
      const response = await api.get(`/productions/${productionId}/report/pdf`, {
        responseType: 'blob' // Important for handling file downloads
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
    }
  };

  return (
    <div className="animate-fade-in glass-card">
      <h1>Reports</h1>
      <p>Generate and download comprehensive reports for your production.</p>
      
      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
        <button 
          onClick={handleDownloadPDF}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 2rem', background: 'var(--color-accent)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1.1em' }}
        >
          <FileDown size={24} />
          Download Budget PDF
        </button>
      </div>
    </div>
  );
};

export default Reports;
