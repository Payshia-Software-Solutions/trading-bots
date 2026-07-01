import React, { useState } from 'react';
import Predictor from './components/Predictor';
import RiskCalculator from './components/RiskCalculator';
import KnowledgeBase from './components/KnowledgeBase';
import ManualAnalyzer from './components/ManualAnalyzer';
import { ShieldAlert, Cpu, GraduationCap, Sparkles, Activity } from 'lucide-react';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('live'); // 'live' or 'manual'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minHeight: '100vh', boxSizing: 'border-box' }}>
      {/* Header */}
      <header className="glass-panel" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Cpu className="text-glow-cyan" size={32} />
          <div style={{ textAlign: 'left' }}>
            <h1 style={{ margin: 0, fontSize: '1.5rem', letterSpacing: '-0.5px', color: 'var(--text-bright)', lineHeight: '1.2' }}>
              Binance Trading Bot <span style={{ color: 'var(--neon-cyan)', fontSize: '0.8rem', paddingLeft: '5px' }}>v1.1-Sim</span>
            </h1>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>AI Technical Analysis Predictor for Beginners</span>
          </div>
        </div>

        {/* Navigation Switcher */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <button
            onClick={() => setActiveTab('live')}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'live' ? 'var(--neon-cyan)' : 'transparent',
              color: activeTab === 'live' ? 'black' : 'var(--text-muted)',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.2s ease'
            }}
          >
            <Activity size={14} /> Live Sim Ticker
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'manual' ? 'var(--neon-purple)' : 'transparent',
              color: activeTab === 'manual' ? 'white' : 'var(--text-muted)',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.2s ease'
            }}
          >
            <Sparkles size={14} /> Real Screenshot Analyzer
          </button>
        </div>

        {/* Global Status Info */}
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }} className="desktop-only">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
            <span className="glow-dot cyan"></span>
            <span style={{ color: 'var(--text-muted)' }}>App Online</span>
          </div>
        </div>
      </header>

      {/* Main Dashboard Grid */}
      <main className="dashboard-grid">
        {/* Left Side - Dynamic Tab panel */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {activeTab === 'live' ? <Predictor /> : <ManualAnalyzer />}
        </section>

        {/* Right Side - Risk Sizer & Knowledge Base (Always visible for helper functions) */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <RiskCalculator />
          <KnowledgeBase />
        </section>
      </main>

      {/* Footer / Risk Disclaimer */}
      <footer className="glass-panel" style={{ padding: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start', textAlign: 'left', marginTop: 'auto' }}>
        <ShieldAlert size={20} className="text-glow-red" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-bright)', display: 'block', marginBottom: '0.15rem' }}>
            Risk Warning & Educational Disclaimer
          </span>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4', margin: 0 }}>
            Crypto trading carries high risk. This dashboard operates as an educational simulator helper utilizing technical indicators (RSI & Moving Averages). It is designed to teach beginners trade sizing, risk management, and indicator signals. Never risk money you cannot afford to lose.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
