import React, { useState, useEffect } from 'react';
import { X, Key, Save, Settings } from 'lucide-react';

export default function SettingsModal({ onClose }) {
  const [apiKey, setApiKey] = useState('');
  const [maxSignals, setMaxSignals] = useState(1);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const apiUrl = typeof window !== 'undefined'
    ? `http://${window.location.hostname}/trading-bots/crypto-analyzer-web/server/public`
    : 'http://localhost/trading-bots/crypto-analyzer-web/server/public';

  useEffect(() => {
    const existingKey = localStorage.getItem('gemini_api_key');
    if (existingKey) {
      setApiKey(existingKey);
    }
    
    // Fetch backend settings
    fetch(`${apiUrl}/api/settings`)
      .then(r => r.json())
      .then(s => {
        if (s.max_signals_per_coin) setMaxSignals(parseInt(s.max_signals_per_coin, 10));
        setLoading(false);
      })
      .catch(e => {
        console.error("Failed to fetch settings", e);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    localStorage.setItem('gemini_api_key', apiKey);
    
    try {
      await fetch(`${apiUrl}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_signals_per_coin: maxSignals.toString() })
      });
    } catch (e) {
      console.error("Failed to save backend settings", e);
    }

    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      // Optional: Close modal after saving
      // onClose();
    }, 2000);
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
        position: 'relative', border: '1px solid var(--accent-blue)',
        maxHeight: '90vh', overflowY: 'auto'
      }}>
        <button 
          onClick={onClose} 
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>

        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0, marginBottom: '24px', color: 'var(--text-primary)' }}>
          <Settings size={18} /> System Settings
        </h3>
        
        {loading ? (
          <div style={{color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px'}}>Loading settings...</div>
        ) : (
          <>
            <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--card-border)' }}>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-primary)', marginBottom: '8px', fontWeight: 'bold' }}>
                Gemini API Key (AI Analyst)
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
                Stored securely in your browser's local storage. Used to power the AI Analyst assistant.
              </p>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-primary)', marginBottom: '8px', fontWeight: 'bold' }}>
                Max Concurrent Active Signals (Per Coin)
              </label>
              <input 
                type="number" 
                min="1"
                max="10"
                value={maxSignals}
                onChange={(e) => setMaxSignals(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '6px',
                  background: 'var(--bg-primary)', border: '1px solid var(--card-border)',
                  color: 'var(--text-primary)', fontSize: '14px', outline: 'none'
                }}
              />
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.4 }}>
                Prevents duplicate signals. The bot will wait until active signals hit TP or SL before sending new ones for the same coin.
              </p>
            </div>

            <button 
              onClick={handleSave}
              className="btn primary-btn"
              style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '12px' }}
            >
              <Save size={16} /> {saved ? 'Saved Successfully!' : 'Save Settings'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
