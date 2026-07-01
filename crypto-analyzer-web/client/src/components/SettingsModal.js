import React, { useState, useEffect } from 'react';
import { X, Key, Save } from 'lucide-react';

export default function SettingsModal({ onClose }) {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const existingKey = localStorage.getItem('gemini_api_key');
    if (existingKey) {
      setApiKey(existingKey);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('gemini_api_key', apiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, 
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      backdropFilter: 'blur(4px)'
    }}>
      <div className="card glass" style={{ 
        width: '90%', maxWidth: '400px', padding: '24px', 
        position: 'relative', border: '1px solid var(--accent-blue)' 
      }}>
        <button 
          onClick={onClose} 
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>

        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0, marginBottom: '24px', color: 'var(--text-primary)' }}>
          <Key size={18} /> API Settings
        </h3>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Gemini API Key (For AI Analyst)
          </label>
          <input 
            type="password" 
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Paste your Gemini API Key here..."
            style={{
              width: '100%', padding: '10px 12px', borderRadius: '6px',
              background: 'var(--bg-primary)', border: '1px solid var(--card-border)',
              color: 'var(--text-primary)', fontSize: '14px', outline: 'none'
            }}
          />
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.4 }}>
            Your key is securely stored in your browser's local storage and is only used to directly query the Google Gemini API. It is never sent to our servers.
          </p>
        </div>

        <button 
          onClick={handleSave}
          className="btn primary-btn"
          style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '12px' }}
        >
          <Save size={16} /> {saved ? 'Saved Successfully!' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
