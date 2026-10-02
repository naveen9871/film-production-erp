import React, { useState } from 'react';
import api from '../api';
import { Film, Lock, User, ChevronRight, Loader2, Moon, Sun } from 'lucide-react';

const Login = ({ onLogin, theme, onToggleTheme }) => {
  const [username, setUsername] = useState('producer');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/login', { username, password });
      localStorage.setItem('token', res.data.token);
      onLogin(res.data.user);
    } catch (err) {
      setError('Invalid credentials');
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh', 
      background: 'var(--bg)',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Theme Toggle Button */}
      <button 
        onClick={onToggleTheme} 
        style={{ position: 'absolute', top: '24px', right: '32px', zIndex: 50, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text)' }}
      >
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      {/* Background aesthetic blobs */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, var(--primary-soft) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%', filter: 'blur(60px)' }} />
      <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '60vw', height: '60vw', background: 'radial-gradient(circle, var(--violet-soft) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%', filter: 'blur(80px)' }} />

      <div style={{ 
        position: 'relative',
        zIndex: 10,
        width: '420px', 
        padding: '48px 40px',
        background: 'var(--surface)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--border)',
        borderRadius: '24px',
        boxShadow: 'var(--shadow-lg)'
      }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
          <div style={{ 
            width: '64px', height: '64px', 
            borderRadius: '16px', 
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--violet) 100%)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            marginBottom: '20px',
            boxShadow: '0 10px 20px -5px var(--primary-soft)'
          }}>
            <Film size={32} color="white" strokeWidth={1.5} />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: '-0.5px' }}>
            Film Production ERP
          </h2>
          <p style={{ color: 'var(--text-faint)', fontSize: '14px', marginTop: '8px' }}>
            Intelligent hierarchical cost estimation
          </p>
        </div>

        {error && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#f87171', 
            padding: '12px 16px', 
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 500,
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f87171' }} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }}>
                <User size={18} />
              </div>
              <input 
                type="text" 
                placeholder="producer" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                style={{ 
                  width: '100%', padding: '14px 16px 14px 44px', 
                  background: 'var(--surface-sunk)', 
                  border: '1px solid var(--border)', 
                  borderRadius: '12px',
                  color: 'var(--text)',
                  fontSize: '15px',
                  transition: 'all 0.2s',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }}>
                <Lock size={18} />
              </div>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                style={{ 
                  width: '100%', padding: '14px 16px 14px 44px', 
                  background: 'var(--surface-sunk)', 
                  border: '1px solid var(--border)', 
                  borderRadius: '12px',
                  color: 'var(--text)',
                  fontSize: '15px',
                  transition: 'all 0.2s',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              marginTop: '12px',
              padding: '14px', 
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--violet) 100%)', 
              color: 'white', 
              border: 'none', 
              borderRadius: '12px', 
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '15px',
              fontWeight: 600,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              opacity: loading ? 0.8 : 1,
              boxShadow: '0 4px 12px var(--primary-soft)'
            }}
            onMouseOver={e => { if(!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px var(--primary-soft)'; } }}
            onMouseOut={e => { if(!loading) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px var(--primary-soft)'; } }}
            onMouseDown={e => { if(!loading) e.currentTarget.style.transform = 'translateY(1px)' }}
            onMouseUp={e => { if(!loading) e.currentTarget.style.transform = 'translateY(-1px)' }}
          >
            {loading ? <Loader2 size={18} className="spin" /> : (
              <>
                Access System <ChevronRight size={18} />
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '12px', color: 'var(--text-faint)' }}>
          Secure Enterprise Production Portal
        </div>
      </div>
      
      {/* CSS for loader animation */}
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
};

export default Login;
