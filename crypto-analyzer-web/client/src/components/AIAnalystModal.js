import React, { useState, useEffect } from 'react';
import { X, Sparkles, Loader, AlertCircle } from 'lucide-react';

export default function AIAnalystModal({ symbol, data, onClose }) {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    generateReport();
  }, []);

  const generateReport = async () => {
    try {
      setLoading(true);
      setError('');
      
      const apiKey = localStorage.getItem('gemini_api_key');
      if (!apiKey) {
        setError('Please set your Gemini API Key in the Settings first.');
        setLoading(false);
        return;
      }

      if (!data || !data.ticker || !data.indicators) {
        setError('Waiting for chart data to load...');
        setLoading(false);
        return;
      }

      // Build Prompt
      const p = data.ticker.currentPrice;
      const rsi = data.indicators.rsiVal;
      const macd = data.indicators.macd;
      const ema9 = data.indicators.ema9;
      const ema50 = data.indicators.ema50_1h;
      const vol = data.indicators.volCurrent;
      
      const prompt = `You are an expert Crypto Trading AI Analyst. 
The user is viewing the ${symbol} chart.
Here is the real-time live data for ${symbol}:
- Live Price: ${p}
- RSI (14): ${rsi ? rsi.toFixed(2) : 'N/A'}
- MACD: ${macd ? macd.toFixed(4) : 'N/A'}
- EMA 9: ${ema9 ? ema9.toFixed(4) : 'N/A'}
- EMA 50 (1H): ${ema50 ? ema50.toFixed(4) : 'N/A'}
- Current Volume: ${vol ? vol.toFixed(2) : 'N/A'}

Based on these technical indicators, give a deep market structure analysis in Sinhala.
Tell the user what the market is doing right now, if it's bullish or bearish, what to watch out for, and a short term prediction.
Use clear, easy to understand conversational Sinhala language mixed with common crypto terms (like support, resistance, pump, dump).
Keep it concise but highly analytical.`;

      // Call Gemini API natively via fetch
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      });

      const resData = await response.json();
      
      if (resData.error) {
        throw new Error(resData.error.message);
      }

      const generatedText = resData.candidates[0].content.parts[0].text;
      setReport(generatedText);
      
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to generate report. Please check your API key.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, 
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      backdropFilter: 'blur(4px)', padding: '20px'
    }}>
      <div className="card glass" style={{ 
        width: '100%', maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        position: 'relative', border: '1px solid var(--accent-blue)', borderRadius: '12px', overflow: 'hidden'
      }}>
        
        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: 'var(--accent-blue)' }}>
            <Sparkles size={18} /> AI Market Analyst
          </h3>
          <button 
            onClick={onClose} 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <Loader className="spin" size={32} style={{ color: 'var(--accent-blue)', marginBottom: '16px' }} />
              <div style={{ fontSize: '14px' }}>Analyzing {symbol} Market Structure...</div>
            </div>
          ) : error ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 0', color: 'var(--neon-red)' }}>
              <AlertCircle size={32} style={{ marginBottom: '12px' }} />
              <div style={{ textAlign: 'center', fontSize: '14px' }}>{error}</div>
              <button 
                onClick={generateReport}
                className="btn primary-btn" style={{ marginTop: '20px' }}
              >
                Try Again
              </button>
            </div>
          ) : (
            <div style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
              {report}
            </div>
          )}

        </div>
        
        {/* Footer */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
          Generated by Gemini 2.5 Flash API based on real-time {symbol} data.
        </div>

      </div>
    </div>
  );
}
