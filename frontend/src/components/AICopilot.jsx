import React, { useState } from 'react';
import { getAISuggestion } from '../api';
import { Sparkles, Tag, Users, AlignLeft, MessageSquare } from 'lucide-react';

const AICopilot = ({ documentId, genre, tone, onUpdateDoc }) => {
  const [loadingAction, setLoadingAction] = useState(null);
  const [suggestion, setSuggestion] = useState('');

  const handleAIAction = async (action) => {
    setLoadingAction(action);
    setSuggestion('');
    try {
      const res = await getAISuggestion(documentId, { action, context: '' });
      
      if (action === 'analyze_genre') {
        const parts = res.data.suggestion.split('/');
        onUpdateDoc({ genre: parts[0]?.trim(), tone: parts[1]?.trim() });
      } else {
        setSuggestion(res.data.suggestion);
      }
    } catch (err) {
      console.error(err);
      setSuggestion("AI failed to respond.");
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <Sparkles size={18} style={{ color: 'var(--accent)' }} />
          AI Studio Co-Pilot
        </h3>
      </div>
      
      <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
        
        {/* Document Meta (Genre/Tone) */}
        <div className="mb-4">
          <div className="text-sm fw-500 mb-2">Story Analysis</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {genre ? (
              <>
                <span className="badge active"><Tag size={12} style={{marginRight: '4px'}}/> {genre}</span>
                <span className="badge"><Users size={12} style={{marginRight: '4px'}}/> {tone}</span>
              </>
            ) : (
              <span className="text-sm text-dim">No analysis yet.</span>
            )}
          </div>
        </div>

        {/* AI Actions */}
        <div className="text-sm fw-500 mb-2 mt-4">Writing Tools</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button 
            className="btn" 
            style={{ width: '100%', justifyContent: 'flex-start' }}
            onClick={() => handleAIAction('analyze_genre')}
            disabled={loadingAction !== null}
          >
            {loadingAction === 'analyze_genre' ? 'Analyzing...' : 'Analyze Genre & Tone'}
          </button>
          
          <button 
            className="btn" 
            style={{ width: '100%', justifyContent: 'flex-start' }}
            onClick={() => handleAIAction('suggest_dialogue')}
            disabled={loadingAction !== null}
          >
            <MessageSquare size={14} style={{ marginRight: '6px' }} />
            {loadingAction === 'suggest_dialogue' ? 'Thinking...' : 'Suggest Dialogue Options'}
          </button>

          <button 
            className="btn" 
            style={{ width: '100%', justifyContent: 'flex-start' }}
            onClick={() => handleAIAction('expand_scene')}
            disabled={loadingAction !== null}
          >
            <AlignLeft size={14} style={{ marginRight: '6px' }} />
            {loadingAction === 'expand_scene' ? 'Writing...' : 'Expand Scene Action'}
          </button>
        </div>

        {/* Output Panel */}
        {suggestion && (
          <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div className="text-sm fw-500 mb-2" style={{ color: 'var(--accent)' }}>AI Suggestion</div>
            <div style={{ fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
              {suggestion}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AICopilot;
