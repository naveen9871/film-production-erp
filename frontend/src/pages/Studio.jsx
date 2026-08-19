import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchStudioDocuments, createStudioDocument } from '../api';
import { FileText, Plus, Edit3 } from 'lucide-react';

const Studio = () => {
  const [documents, setDocuments] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const res = await fetchStudioDocuments();
      setDocuments(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async () => {
    try {
      const res = await createStudioDocument({ title: 'New Untitled Draft' });
      navigate(`/studio/${res.data.id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to create document");
    }
  };

  return (
    <div className="screen active">
      <div className="page-head">
        <div>
          <div className="page-title">Writer's Room</div>
          <div className="page-sub">Creative Studio for Scripts and Treatments</div>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={handleCreate}>
            <Plus size={16} /> New Document
          </button>
        </div>
      </div>

      <div className="grid-3 mt-4">
        {documents.map(doc => (
          <div key={doc.id} className="stat-card" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }} onClick={() => navigate(`/studio/${doc.id}`)}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ padding: '8px', background: 'var(--border)', borderRadius: '8px' }}>
                  <FileText size={20} className="text-dim" />
                </div>
                <div>
                  <div className="fw-500">{doc.title || 'Untitled'}</div>
                  <div className="text-sm text-dim">Last edited {new Date(doc.updatedAt).toLocaleDateString()}</div>
                </div>
              </div>
              <span className={`badge ${doc.status === 'Committed' ? 'active' : ''}`}>{doc.status}</span>
            </div>
            
            <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <div className="text-sm text-dim">{doc.genre || 'No genre'}</div>
              <div className="text-sm text-dim" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Edit3 size={14} /> Open Editor
              </div>
            </div>
          </div>
        ))}
        {documents.length === 0 && (
          <div className="panel" style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center' }}>
            <FileText size={48} className="text-dim" style={{ margin: '0 auto 16px' }} />
            <h3 className="mb-2">Your Writer's Room is empty</h3>
            <p className="text-dim mb-4">Start drafting a new story or screenplay right here in the platform.</p>
            <button className="btn primary" onClick={handleCreate}>Start Writing</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Studio;
