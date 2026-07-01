import React, { useState, useEffect } from 'react';
import { Percent, ShieldCheck, DollarSign } from 'lucide-react';

export default function RiskCalculator() {
  const [balance, setBalance] = useState(1000);
  const [riskPercent, setRiskPercent] = useState(1);
  const [entryPrice, setEntryPrice] = useState(50000);
  const [stopLoss, setStopLoss] = useState(48500);
  
  const [result, setResult] = useState({
    amountAtRisk: 0,
    positionSize: 0,
    requiredTokens: 0,
    percentageDistance: 0
  });

  useEffect(() => {
    const amountAtRisk = balance * (riskPercent / 100);
    const priceDiff = Math.abs(entryPrice - stopLoss);
    
    if (priceDiff > 0 && entryPrice > 0) {
      const percentageDistance = (priceDiff / entryPrice) * 100;
      const requiredTokens = amountAtRisk / priceDiff;
      const positionSize = requiredTokens * entryPrice;

      setResult({
        amountAtRisk: amountAtRisk.toFixed(2),
        positionSize: positionSize.toFixed(2),
        requiredTokens: requiredTokens.toFixed(5),
        percentageDistance: percentageDistance.toFixed(2)
      });
    } else {
      setResult({
        amountAtRisk: amountAtRisk.toFixed(2),
        positionSize: 0,
        requiredTokens: 0,
        percentageDistance: 0
      });
    }
  }, [balance, riskPercent, entryPrice, stopLoss]);

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <ShieldCheck size={24} className="text-glow-green" />
        <h2 style={{ margin: 0, color: 'var(--text-bright)' }}>Risk & Position Sizer</h2>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem', textAlign: 'left' }}>
        Crucial tool to prevent liquidation. Calculate exactly how much money to buy based on your stop loss.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Account Balance */}
        <div style={{ textAlign: 'left' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
            Account Balance (USDT)
          </label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>$</span>
            <input
              type="number"
              value={balance}
              onChange={(e) => setBalance(parseFloat(e.target.value) || 0)}
              style={{
                width: '100%',
                padding: '0.5rem 0.5rem 0.5rem 2rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'rgba(0,0,0,0.3)',
                color: 'var(--text-bright)',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Risk Percentage */}
        <div style={{ textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Risk Per Trade (%)
            </label>
            <span style={{ fontSize: '0.8rem', color: 'var(--neon-green)', fontWeight: 'bold' }}>{riskPercent}%</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="5"
            step="0.5"
            value={riskPercent}
            onChange={(e) => setRiskPercent(parseFloat(e.target.value) || 0)}
            style={{ width: '100%', accentColor: 'var(--neon-green)' }}
          />
        </div>

        {/* Entry and Stop Loss Prices */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div style={{ textAlign: 'left' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
              Entry Price (USDT)
            </label>
            <input
              type="number"
              value={entryPrice}
              onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'rgba(0,0,0,0.3)',
                color: 'var(--text-bright)',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ textAlign: 'left' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
              Stop Loss (USDT)
            </label>
            <input
              type="number"
              value={stopLoss}
              onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'rgba(0,0,0,0.3)',
                color: 'var(--text-bright)',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Results Panel */}
        <div className="glass-card" style={{ padding: '1rem', marginTop: '0.5rem', background: 'rgba(0,255,135,0.03)', border: '1px solid rgba(0,255,135,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Max Amount Risked:</span>
            <span style={{ color: 'var(--neon-red)', fontWeight: 'bold' }}>${result.amountAtRisk} USDT</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Stop Loss Distance:</span>
            <span style={{ color: 'var(--neon-yellow)', fontWeight: 'bold' }}>{result.percentageDistance}%</span>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.75rem 0' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', textAlign: 'left' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--neon-green)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Recommended Position Size
            </span>
            <span style={{ fontSize: '1.4rem', color: 'var(--text-bright)', fontWeight: 'bold' }}>
              ${result.positionSize} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>USDT</span>
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Buy quantity: <strong>{result.requiredTokens}</strong> tokens.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
