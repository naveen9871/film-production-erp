import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchStudioDocument, saveStudioDocument, commitDocumentToProduction } from '../api';
import ScreenplayEditor from '../components/ScreenplayEditor';
import AICopilot from '../components/AICopilot';
import { ArrowLeft, CheckCircle, Save, Loader } from 'lucide-react';

const WritersRoom = ({ productionId }) => {
  const { docId } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  useEffect(() => {
    loadDocument();
  }, [docId]);

  const loadDocument = async () => {
    setLoading(true);
    try {
      const res = await fetchStudioDocument(docId);
      setDocument(res.data);
      setLastSaved(new Date());
    } catch (err) {
      console.error(err);
      alert("Failed to load document");
    } finally {
      setLoading(false);
    }
  };

  const handleEditorUpdate = useCallback((contentJSON, textContent) => {
    // We could implement auto-save debouncing here
    setDocument(prev => ({ ...prev, contentJson: JSON.stringify(contentJSON) }));
  }, []);

  const handleSave = async () => {
    if (!document) return;
    setSaving(true);
    try {
      await saveStudioDocument(docId, {
        contentJson: document.contentJson,
        title: document.title,
        genre: document.genre,
        tone: document.tone,
      });
      setLastSaved(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleCommit = async () => {
    if (!window.confirm("Commit this draft to Production? This will extract budget and schedule items.")) return;
    try {
      await handleSave(); // Save first
      const res = await commitDocumentToProduction(docId);
      alert(`Committed! Generated ${res.data.scenes} scenes and extracted ${res.data.elements} elements.`);
      navigate(`/budget`);
    } catch (err) {
      console.error(err);
      alert("Failed to commit document");
    }
  };

  if (loading) return <div className="p-8 text-center"><Loader className="spin text-dim" /> Loading Studio...</div>;
  if (!document) return <div className="p-8">Document not found</div>;

  return (
    <div className="screen active" style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: 0 }}>
      {/* Studio Topbar */}
      <div className="studio-topbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="btn-icon" onClick={() => navigate('/studio')} title="Back to Studio">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ fontWeight: '600' }}>{document.title || 'Untitled Draft'}</div>
            <div className="text-sm text-dim">
              {saving ? 'Saving...' : lastSaved ? `Last saved at ${lastSaved.toLocaleTimeString()}` : ''}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn" onClick={handleSave} disabled={saving}>
            <Save size={14} style={{ marginRight: '6px' }} /> Save Draft
          </button>
          <button className="btn primary" onClick={handleCommit}>
            <CheckCircle size={14} style={{ marginRight: '6px' }} /> Commit to Production
          </button>
        </div>
      </div>

      {/* Main Studio Area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Editor Container */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <div style={{ width: '100%', maxWidth: '850px' }}>
            <ScreenplayEditor 
              initialContent={document.contentJson ? JSON.parse(document.contentJson) : null}
              onUpdate={handleEditorUpdate} 
            />
          </div>
        </div>

        {/* AI Co-Pilot & Comments Sidebar */}
        <div style={{ width: '380px', borderLeft: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column' }}>
          <AICopilot 
            documentId={docId}
            genre={document.genre}
            tone={document.tone}
            onUpdateDoc={(updates) => setDocument(prev => ({ ...prev, ...updates }))}
          />
        </div>
      </div>
    </div>
  );
};

export default WritersRoom;
