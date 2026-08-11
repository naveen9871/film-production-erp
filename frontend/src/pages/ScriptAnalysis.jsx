import React, { useState, useEffect } from 'react';
import { uploadScript, fetchEntities } from '../api';
import { UploadCloud, FileText, CheckCircle2, Loader2 } from 'lucide-react';

const ScriptAnalysis = ({ productionId }) => {
  const [file, setFile] = useState(null);
  const [elements, setElements] = useState([]);
  const [status, setStatus] = useState('idle'); // idle, uploading, analyzing, complete, error
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (productionId) {
      loadElements();
    }
  }, [productionId]);

  const loadElements = async () => {
    try {
      const res = await fetchEntities(productionId);
      setElements(res.data || []);
      if (res.data && res.data.length > 0) {
        setStatus('complete');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus('uploading');
    setProgress(10);
    
    const formData = new FormData();
    formData.append('script', file);
    
    try {
      setProgress(30);
      setStatus('analyzing');
      
      // Simulate progress for the parallel AI pipeline
      const progressInterval = setInterval(() => {
        setProgress(p => {
          if (p >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return p + Math.random() * 15;
        });
      }, 800);

      await uploadScript(productionId, formData);
      
      clearInterval(progressInterval);
      setProgress(100);
      setStatus('complete');
      
      await loadElements();
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  return (
    <div className="screen active" id="script-analysis">
      <div className="page-head">
        <div>
          <div className="page-title">Script Intelligence</div>
          <div className="page-sub">Upload script for AI-powered scene segmentation and entity extraction</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel" style={{ gridColumn: 'span 1' }}>
          <div className="panel-head">
            <h3>Upload Script (.txt)</h3>
          </div>
          <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px' }}>
            
            <div style={{ 
              width: '100%', padding: '40px 20px', 
              border: '2px dashed var(--border)', borderRadius: 'var(--radius)',
              background: 'var(--surface-sunk)', cursor: 'pointer'
            }}>
              <UploadCloud size={48} color="var(--primary)" style={{ marginBottom: '16px' }} />
              <input 
                type="file" 
                onChange={(e) => setFile(e.target.files[0])} 
                accept=".txt" 
                style={{ display: 'block', margin: '0 auto 16px auto' }}
              />
              <p className="text-dim">Supports plain text script exports</p>
            </div>
            
            <button 
              className="btn primary" 
              onClick={handleUpload} 
              disabled={!file || status === 'uploading' || status === 'analyzing'}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {status === 'idle' && 'Start AI Analysis'}
              {status === 'uploading' && 'Uploading...'}
              {status === 'analyzing' && 'Running AI Extraction Pipeline...'}
              {status === 'complete' && 'Re-Analyze Script'}
              {status === 'error' && 'Retry Analysis'}
            </button>
            
          </div>
        </div>

        <div className="panel" style={{ gridColumn: 'span 2' }}>
          <div className="panel-head">
            <h3>Extraction Progress</h3>
          </div>
          <div className="panel-body">
            {status === 'idle' && (
              <div className="text-dim text-center" style={{ padding: '40px 0' }}>
                <FileText size={48} opacity={0.2} style={{ display: 'block', margin: '0 auto 16px' }} />
                Upload a script to begin AI extraction.
              </div>
            )}
            
            {(status === 'analyzing' || status === 'uploading') && (
              <div style={{ padding: '20px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '500' }}>AI Orchestrator Running...</span>
                  <span className="text-dim">{Math.round(progress)}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'var(--border-soft)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.3s' }}></div>
                </div>
                <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: progress > 20 ? 'var(--success)' : 'var(--text)' }}>
                    {progress > 20 ? <CheckCircle2 size={16} /> : <Loader2 size={16} className="spinner" />} Stage 1: Scene Parsing & Segmentation
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: progress > 40 ? 'var(--success)' : (progress > 20 ? 'var(--text)' : 'var(--text-faint)') }}>
                    {progress > 40 ? <CheckCircle2 size={16} /> : (progress > 20 ? <Loader2 size={16} className="spinner" /> : <div style={{width:'16px',height:'16px',borderRadius:'50%',border:'1px solid var(--border)'}}/>)} Stage 2: Initial Prompt Generation
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: progress > 70 ? 'var(--success)' : (progress > 40 ? 'var(--text)' : 'var(--text-faint)') }}>
                    {progress > 70 ? <CheckCircle2 size={16} /> : (progress > 40 ? <Loader2 size={16} className="spinner" /> : <div style={{width:'16px',height:'16px',borderRadius:'50%',border:'1px solid var(--border)'}}/>)} Stage 3: Parallel Batch AI Processing
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: progress > 90 ? 'var(--success)' : (progress > 70 ? 'var(--text)' : 'var(--text-faint)') }}>
                    {progress > 90 ? <CheckCircle2 size={16} /> : (progress > 70 ? <Loader2 size={16} className="spinner" /> : <div style={{width:'16px',height:'16px',borderRadius:'50%',border:'1px solid var(--border)'}}/>)} Stage 4: Fuzzy String Deduplication
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: progress === 100 ? 'var(--success)' : (progress > 90 ? 'var(--text)' : 'var(--text-faint)') }}>
                    {progress === 100 ? <CheckCircle2 size={16} /> : (progress > 90 ? <Loader2 size={16} className="spinner" /> : <div style={{width:'16px',height:'16px',borderRadius:'50%',border:'1px solid var(--border)'}}/>)} Stage 5: Database Commit
                  </div>
                </div>
              </div>
            )}

            {status === 'complete' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', marginBottom: '24px', fontWeight: '500' }}>
                  <CheckCircle2 size={20} /> Analysis Complete. {elements.length} entities extracted.
                </div>
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Name</th>
                        <th>Category</th>
                        <th className="num">Mentions</th>
                        <th className="num">Est. Days</th>
                      </tr>
                    </thead>
                    <tbody>
                      {elements.slice(0, 10).map(el => (
                        <tr key={el.id}>
                          <td><span className="badge">{el.type}</span></td>
                          <td style={{ fontWeight: '500' }}>{el.name}</td>
                          <td className="text-dim">{el.subCategory || '-'}</td>
                          <td className="num">{el.mentions}</td>
                          <td className="num">{el.estimatedDays}</td>
                        </tr>
                      ))}
                      {elements.length > 10 && (
                        <tr>
                          <td colSpan="5" className="text-center text-dim">
                            + {elements.length - 10} more. Head over to Scene Builder to review.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScriptAnalysis;
