import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { fetchStudioDocuments, saveStudioDocument, createStudioDocument } from '../api';
import {
  Sparkles, Save, RefreshCw, FileText, ChevronRight, AlertCircle,
  CheckCircle2, Loader2, AlignLeft, Hash, BarChart2, Edit3, Upload
} from 'lucide-react';

const countLines = (t) => t.split('\n').length;
const countSceneHeadings = (t) =>
  (t.match(/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/gim) || []).length;
const countCharacters = (t) =>
  new Set((t.match(/^[A-Z][A-Z\s]{2,}$/gm) || []).map((s) => s.trim())).size;

const PipelineStep = ({ label, status }) => {
  const colors = { done: 'var(--success)', active: 'var(--primary)', idle: 'var(--text-faint)' };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: colors[status] }}>
      {status === 'done' ? <CheckCircle2 size={15} />
        : status === 'active' ? <Loader2 size={15} className="spinner" />
        : <div style={{ width: 15, height: 15, borderRadius: '50%', border: '1.5px solid var(--border)' }} />}
      {label}
    </div>
  );
};

const WritersRoom = ({ productionId }) => {
  const navigate = useNavigate();
  const [doc, setDoc] = useState(null);
  const [scriptText, setScriptText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [lastSaved, setLastSaved] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [activeTab, setActiveTab] = useState('editor');
  const timerRef = useRef(null);

  useEffect(() => {
    loadScript();
    return () => clearInterval(timerRef.current);
  }, [productionId]);

  const loadScript = async () => {
    setLoading(true);
    try {
      const res = await fetchStudioDocuments();
      const docs = res.data || [];
      if (docs.length > 0) {
        setDoc(docs[0]);
        setScriptText(docs[0].contentJson || '');
        setLastSaved(new Date(docs[0].updatedAt || Date.now()));
      } else {
        const cr = await createStudioDocument({
          title: 'Master Screenplay Draft',
          genre: 'Action/Drama',
          contentJson: '',
        });
        setDoc(cr.data);
        setScriptText('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!doc) return;
    setSaving(true);
    setStatusMsg('');
    try {
      await saveStudioDocument(doc.id, {
        contentJson: scriptText,
        title: doc.title || 'Master Screenplay',
        genre: doc.genre || 'Action',
        tone: doc.tone || 'Tense',
      });
      setLastSaved(new Date());
      setStatusMsg('Draft saved \u2713');
    } catch {
      setStatusMsg('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleFileLoad = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setScriptText(ev.target.result || '');
      setStatusMsg('File loaded \u2014 click Save & Re-Analyze');
    };
    reader.readAsText(file);
  };

  const handleReAnalyze = async () => {
    if (!productionId) { alert('Please select a production first.'); return; }
    if (!scriptText.trim()) { alert('Script is empty \u2014 paste screenplay first.'); return; }

    setAnalyzing(true);
    setAnalyzeProgress(0);
    setStatusMsg('Running AI extraction pipeline\u2026');

    let stage = 0;
    timerRef.current = setInterval(() => {
      stage += 1;
      setAnalyzeProgress(stage);
      if (stage >= 4) clearInterval(timerRef.current);
    }, 900);

    try {
      await handleSave();
      const res = await api.post(`/scripts/${productionId}/analyze`, { scriptText });
      clearInterval(timerRef.current);
      setAnalyzeProgress(5);
      setAnalysisResult({
        scenes: res.data.scenes || 0,
        elements: res.data.elements || 0,
        predictedShootDays: res.data.predictedShootDays || 0,
        diff: res.data.diff || null,
      });
      setStatusMsg(`\u2713 Extracted ${res.data.elements || 0} entities across ${res.data.scenes || 0} scenes`);
      setActiveTab('result');
    } catch (err) {
      clearInterval(timerRef.current);
      console.error(err);
      setStatusMsg('Analysis failed \u2014 check console');
      setAnalyzeProgress(0);
    } finally {
      setAnalyzing(false);
    }
  };

  const stats = {
    lines: countLines(scriptText),
    scenes: countSceneHeadings(scriptText),
    chars: countCharacters(scriptText),
    words: scriptText.split(/\s+/).filter(Boolean).length,
  };

  const stages = [
    'Scene Parsing & Segmentation',
    'Initial Prompt Generation',
    'Parallel Batch AI Processing',
    'Fuzzy-String Deduplication',
    'Database Commit',
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--text-dim)', gap: '12px' }}>
        <Loader2 size={24} className="spinner" /> Loading Writer's Room AI...
      </div>
    );
  }

  return (
    <div className="screen active" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 70px)', padding: 0, overflow: 'hidden' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px', borderBottom: '1px solid var(--border)',
        background: 'var(--surface)', flexShrink: 0, gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '8px', background: 'var(--primary-soft)', borderRadius: '10px' }}>
            <Sparkles size={18} color="var(--primary)" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px' }}>{doc?.title || 'Master Screenplay Draft'}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
              {saving ? 'Saving...' : statusMsg || (lastSaved ? `Last saved ${lastSaved.toLocaleTimeString()}` : 'Unsaved')}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '7px 12px', borderRadius: 'var(--radius)',
            border: '1px solid var(--border)', background: 'var(--surface)',
            fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: 'var(--text-dim)',
          }}>
            <Upload size={13} /> Load .txt
            <input type="file" accept=".txt" onChange={handleFileLoad} style={{ display: 'none' }} />
          </label>

          <button className="btn" onClick={handleSave} disabled={saving || analyzing}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <Save size={13} /> Save Draft
          </button>

          <button onClick={handleReAnalyze} disabled={analyzing || !scriptText.trim()}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 16px', borderRadius: 'var(--radius)',
              background: 'linear-gradient(135deg, var(--primary), var(--violet))',
              color: '#fff', border: 'none', fontSize: '13px', fontWeight: 700,
              cursor: analyzing ? 'not-allowed' : 'pointer', opacity: analyzing ? 0.8 : 1,
              boxShadow: '0 2px 12px rgba(99,102,241,0.35)',
            }}>
            {analyzing ? (
              <><Loader2 size={15} className="spinner" /> Re-Analyzing...</>
            ) : (
              <><RefreshCw size={15} /> Save &amp; Re-Analyze</>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0, paddingLeft: '24px' }}>
        {[
          { id: 'editor', label: 'Script Editor', icon: Edit3 },
          { id: 'result', label: 'Analysis Result', icon: BarChart2 },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '10px 18px', border: 'none',
            borderBottom: activeTab === id ? '2px solid var(--primary)' : '2px solid transparent',
            background: 'transparent',
            color: activeTab === id ? 'var(--primary)' : 'var(--text-dim)',
            fontWeight: activeTab === id ? 700 : 500, fontSize: '12px', cursor: 'pointer', marginBottom: '-1px',
          }}>
            <Icon size={14} /> {label}
            {id === 'result' && analysisResult && (
              <span style={{ background: 'var(--primary)', color: '#fff', borderRadius: '999px', padding: '1px 7px', fontSize: '10px', marginLeft: '4px' }}>
                {analysisResult.elements}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* LEFT - main content */}
        <div style={{ flex: 1, overflowY: 'auto', background: 'var(--surface-sunk)', padding: '28px 32px', display: 'flex', justifyContent: 'center' }}>

          {activeTab === 'editor' && (
            <div style={{ width: '100%', maxWidth: '860px' }}>
              {/* Stats ribbon */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
                {[
                  { icon: AlignLeft, label: 'Lines', value: stats.lines },
                  { icon: Hash, label: 'Words', value: stats.words },
                  { icon: FileText, label: 'Scenes', value: stats.scenes },
                  { icon: Sparkles, label: 'Characters', value: stats.chars },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} style={{
                    display: 'flex', alignItems: 'center', gap: '7px',
                    padding: '6px 14px', borderRadius: '999px',
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)',
                  }}>
                    <Icon size={13} color="var(--primary)" />
                    <span style={{ color: 'var(--text)', marginLeft: '2px' }}>{value}</span> {label}
                  </div>
                ))}
              </div>

              {/* Script paper */}
              <div style={{
                background: '#fff', borderRadius: '14px', padding: '36px 40px',
                boxShadow: '0 8px 40px rgba(0,0,0,0.07)', border: '1px solid var(--border)', minHeight: '600px',
              }}>
                <div style={{
                  fontSize: '10px', color: 'var(--text-faint)', textTransform: 'uppercase',
                  letterSpacing: '1.2px', fontWeight: 700, marginBottom: '16px',
                  display: 'flex', justifyContent: 'space-between',
                }}>
                  <span>Live Screenplay Editor</span>
                  <span style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>Courier Prime 12pt</span>
                </div>

                {!scriptText && (
                  <div style={{
                    padding: '48px 20px', textAlign: 'center', color: 'var(--text-faint)', fontSize: '13px',
                    border: '2px dashed var(--border)', borderRadius: '10px', marginBottom: '16px', lineHeight: 1.7,
                  }}>
                    <FileText size={40} style={{ display: 'block', margin: '0 auto 12px', opacity: 0.2 }} />
                    <strong>No script loaded yet.</strong><br />
                    Upload a .txt script via "Load .txt" above, or paste screenplay text below.<br />
                    <span style={{ fontSize: '11px', opacity: 0.65 }}>Use INT./EXT. scene headings, CHARACTER names in CAPS, action lines.</span>
                  </div>
                )}

                <textarea
                  value={scriptText}
                  onChange={(e) => setScriptText(e.target.value)}
                  placeholder={'Paste screenplay here...\n\nExample:\nINT. POLICE STATION - NIGHT\n\nOFFICER PRIYA enters the interrogation room.\n\nPRIYA\nWhere were you on the night of the 12th?'}
                  style={{
                    width: '100%', minHeight: '520px', border: 'none', outline: 'none',
                    fontFamily: "'Courier Prime', 'Courier New', monospace",
                    fontSize: '14.5px', lineHeight: '1.75', resize: 'vertical',
                    background: 'transparent', color: '#111827',
                  }}
                />
              </div>
            </div>
          )}

          {activeTab === 'result' && (
            <div style={{ width: '100%', maxWidth: '860px' }}>
              {!analysisResult ? (
                <div style={{ background: 'var(--surface)', borderRadius: '14px', padding: '80px 40px', textAlign: 'center', border: '1px solid var(--border)' }}>
                  <BarChart2 size={48} style={{ opacity: 0.15, marginBottom: '16px' }} />
                  <div style={{ fontWeight: 600, marginBottom: '8px' }}>No analysis run yet</div>
                  <div style={{ color: 'var(--text-faint)', fontSize: '13px' }}>
                    Go to Script Editor, paste your screenplay, then click <strong>Save &amp; Re-Analyze</strong>.
                  </div>
                  <button onClick={() => setActiveTab('editor')} style={{
                    marginTop: '20px', padding: '8px 20px', borderRadius: 'var(--radius)',
                    background: 'var(--primary)', color: '#fff', border: 'none',
                    fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
                  }}>
                    <Edit3 size={14} /> Open Script Editor
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                    {[
                      { label: 'Scenes Detected', value: analysisResult.scenes, color: 'var(--primary)', bg: 'var(--primary-soft)' },
                      { label: 'Entities Extracted', value: analysisResult.elements, color: 'var(--violet)', bg: '#EDE9FE' },
                      { label: 'Predicted Shoot Days', value: analysisResult.predictedShootDays, color: 'var(--success)', bg: '#DCFCE7' },
                    ].map(({ label, value, color, bg }) => (
                      <div key={label} style={{ background: 'var(--surface)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border)' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '10px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                          <BarChart2 size={18} color={color} />
                        </div>
                        <div style={{ fontSize: '28px', fontWeight: 800, color }}>{value}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-faint)', fontWeight: 600 }}>{label}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '1px solid #86efac', borderRadius: '12px', padding: '18px 22px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <CheckCircle2 size={22} color="var(--success)" />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#166534' }}>AI Extraction Pipeline Complete</div>
                      <div style={{ fontSize: '12px', color: '#15803d', marginTop: '2px' }}>
                        {analysisResult.elements} production elements committed. Head to Scene Builder to review.
                      </div>
                    </div>
                  </div>

                  {analysisResult.diff && (
                    <div style={{ background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)', padding: '20px' }}>
                      <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '14px' }}>Revision Diff Report</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '10px', textAlign: 'center' }}>
                        {[
                          { label: 'Scenes +', value: '+' + analysisResult.diff.addedScenes, color: '#16a34a' },
                          { label: 'Scenes -', value: '-' + analysisResult.diff.removedScenes, color: '#dc2626' },
                          { label: 'Scenes ~', value: '~' + analysisResult.diff.modifiedScenes, color: '#d97706' },
                          { label: 'Elements +', value: '+' + analysisResult.diff.addedElements, color: '#16a34a' },
                          { label: 'Elements -', value: '-' + analysisResult.diff.removedElements, color: '#dc2626' },
                        ].map(({ label, value, color }) => (
                          <div key={label} style={{ padding: '12px', background: 'var(--surface-sunk)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-faint)', marginBottom: '4px' }}>{label}</div>
                            <div style={{ fontSize: '22px', fontWeight: 800, color }}>{value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button onClick={() => navigate('/scene-builder')} style={{
                    display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center',
                    padding: '12px', borderRadius: 'var(--radius)',
                    background: 'linear-gradient(135deg, var(--primary), var(--violet))',
                    color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '14px',
                  }}>
                    Open Scene Builder to Review Extracted Elements <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT sidebar */}
        <div style={{ width: '260px', borderLeft: '1px solid var(--border)', background: 'var(--surface)', padding: '22px 16px', overflowY: 'auto', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-faint)', marginBottom: '12px' }}>AI Pipeline</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
              {stages.map((label, i) => {
                const stageNum = i + 1;
                const status = analyzing
                  ? analyzeProgress >= stageNum ? 'done' : analyzeProgress === stageNum - 1 ? 'active' : 'idle'
                  : analysisResult && analyzeProgress >= 5 ? 'done' : 'idle';
                return <PipelineStep key={label} label={label} status={status} />;
              })}
            </div>
          </div>

          <div style={{ background: 'var(--primary-soft)', border: '1px solid #C7CCF5', borderRadius: 'var(--radius-sm)', padding: '14px', fontSize: '12px', color: 'var(--primary-strong)', lineHeight: 1.6 }}>
            <div style={{ fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={13} /> How It Works
            </div>
            1. Paste or load any screenplay<br />
            2. Edit live - stats update in real-time<br />
            3. Click <strong>Save &amp; Re-Analyze</strong> to run the NLP pipeline<br />
            4. Review entities in Scene Builder<br />
            5. Budget auto-generates from extracted elements
          </div>

          {!scriptText.trim() && (
            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 'var(--radius-sm)', padding: '12px', fontSize: '12px', color: '#9a3412', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>No script loaded. Use <strong>"Load .txt"</strong> or paste text into the editor.</span>
            </div>
          )}

          {analysisResult && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 'var(--radius-sm)', padding: '12px', fontSize: '12px', color: '#166534' }}>
              <div style={{ fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={13} /> Last Analysis
              </div>
              <div>{analysisResult.scenes} scenes / {analysisResult.elements} entities</div>
              <div>{analysisResult.predictedShootDays} predicted shoot days</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WritersRoom;
