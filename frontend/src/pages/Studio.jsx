import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchStudioDocuments, createStudioDocument } from '../api';
import { FileText, Plus, Edit3, Sparkles } from 'lucide-react';

const Studio = ({ productionId }) => {
  const [documents, setDocuments] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadDocuments();
  }, [productionId]);

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
      const res = await createStudioDocument({
        title: 'New Screenplay Draft',
        genre: 'Action/Thriller',
        contentJson: `INT. SCENE 1 - LOCATION - DAY\n\nCHARACTER A enters the room holding a PROP.`
      });
      navigate(`/studio/${res.data.id}`);
    } catch (err) {
      console.error(err);
      navigate('/studio/1');
    }
  };

  return (
    <div className="screen active">
      <div className="page-head">
        <div>
          <div className="page-title">Writer's Room AI</div>
          <div className="page-sub">Creative Screenplay Studio — Edit text live &amp; re-analyze script elements</div>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} /> New Draft
          </button>
        </div>
      </div>

      <div className="grid-3 mt-4">
        {documents.map(doc => (
          <div key={doc.id} className="stat-card" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }} onClick={() => navigate(`/studio/${doc.id}`)}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ padding: '8px', background: 'var(--primary-soft)', borderRadius: '8px' }}>
                  <FileText size={20} color="var(--primary)" />
                </div>
                <div>
                  <div className="fw-500">{doc.title || 'Master Screenplay'}</div>
                  <div className="text-sm text-dim">Last edited {new Date(doc.updatedAt || Date.now()).toLocaleDateString()}</div>
                </div>
              </div>
              <span className="badge active">Committed</span>
            </div>
            
            <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="text-sm text-dim">{doc.genre || 'Screenplay'}</div>
              <div className="text-sm text-dim" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', fontWeight: 600 }}>
                <Edit3 size={14} /> Open Screenplay Editor →
              </div>
            </div>
          </div>
        ))}
        {documents.length === 0 && (
          <div className="panel" style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center' }}>
            <Sparkles size={48} color="var(--primary)" style={{ margin: '0 auto 16px' }} />
            <h3 className="mb-2">Writer's Room Screenplay Editor</h3>
            <p className="text-dim mb-4">Edit script text live, add scenes/characters, and click Re-Analyze Script to extract production elements in real time.</p>
            <button className="btn primary" onClick={handleCreate}>Open Screenplay Editor</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Studio;
