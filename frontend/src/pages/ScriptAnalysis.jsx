import React, { useState, useEffect } from 'react';
import api from '../api';

const ScriptAnalysis = ({ productionId }) => {
  const [file, setFile] = useState(null);
  const [elements, setElements] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (productionId) {
      fetchElements();
    }
  }, [productionId]);

  const fetchElements = async () => {
    try {
      const res = await api.get(`/productions/${productionId}/elements`);
      setElements(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('script', file);
    try {
      await api.post(`/productions/${productionId}/script`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchElements();
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="animate-fade-in glass-card">
      <h1>Script Analysis</h1>
      
      <div style={{ margin: '2rem 0', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <input type="file" onChange={(e) => setFile(e.target.files[0])} accept=".txt" />
        <button 
          onClick={handleUpload} 
          disabled={!file || loading}
          style={{ padding: '0.5rem 1rem', background: 'var(--color-accent)', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          {loading ? 'Analyzing with AI...' : 'Upload & Analyze Script'}
        </button>
      </div>

      {elements.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
          <thead>
            <tr style={{ background: '#f0f0f0', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem' }}>Type</th>
              <th style={{ padding: '0.75rem' }}>Name</th>
              <th style={{ padding: '0.75rem' }}>Mentions</th>
              <th style={{ padding: '0.75rem' }}>Est. Days</th>
            </tr>
          </thead>
          <tbody>
            {elements.map(el => (
              <tr key={el.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.75rem' }}>{el.type}</td>
                <td style={{ padding: '0.75rem' }}>{el.name}</td>
                <td style={{ padding: '0.75rem' }}>{el.mentions}</td>
                <td style={{ padding: '0.75rem' }}>{el.estimatedDays}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ScriptAnalysis;
