import React from 'react';
import { Wallet, TrendingUp, TrendingDown, Clock, History, BarChart2, Activity, Target } from 'lucide-react';

export default function SimulationDashboard({ sim }) {
  const { demoBalance, activeDemoTrades, closedDemoTrades, resetSimulation, tradeSize, updateTradeSize } = sim;

  // Calculate total equity
  const unrealizedPnL = activeDemoTrades.reduce((acc, t) => acc + (t.currentPnl || 0), 0);
  const totalEquity = demoBalance + activeDemoTrades.reduce((acc, t) => acc + t.invested, 0) + unrealizedPnL;
  
  const totalPnL = totalEquity - 10000;
  const pnlPercent = (totalPnL / 10000) * 100;

  // Analytics
  const totalTrades = closedDemoTrades.length;
  const wonTrades = closedDemoTrades.filter(t => t.finalPnl > 0).length;
  const winRate = totalTrades > 0 ? ((wonTrades / totalTrades) * 100).toFixed(1) : 0;
  
  const bestTrade = closedDemoTrades.length > 0 
    ? closedDemoTrades.reduce((max, t) => t.finalPnl > max.finalPnl ? t : max, closedDemoTrades[0]) 
    : null;
    
  const worstTrade = closedDemoTrades.length > 0 
    ? closedDemoTrades.reduce((min, t) => t.finalPnl < min.finalPnl ? t : min, closedDemoTrades[0]) 
    : null;

  const getDuration = (open, close) => {
    if (!open || !close) return 'N/A';
    const diff = new Date(close) - new Date(open);
    const m = Math.floor(diff / 60000);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    return `${m}m`;
  };

  return (
    <>
      <div className="card glass" style={{ marginBottom: '16px' }}>
      <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--card-border)', flexWrap: 'wrap', gap: '12px' }}>
        <h3 className="section-title" style={{ margin: 0 }}><Activity size={16} /> SIGNAL EVALUATOR (DEMO)</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--card-border)' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Status:</span>
            <span style={{ fontSize: '11px', color: 'var(--neon-green)', fontWeight: 'bold' }}>LIVE</span>
          </div>
          <button 
            onClick={() => {
              if (window.confirm('Are you sure you want to reset the simulation balance to $10,000?')) {
                resetSimulation();
              }
            }}
            style={{ background: 'transparent', border: '1px solid var(--card-border)', color: 'var(--text-muted)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
          >
            Reset Balance
          </button>
        </div>
      </div>
      
      
      {/* Analytics Panel */}
      <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--card-border)' }}>
        
        {/* Capital Breakdown */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase' }}>Available Balance</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
              ${demoBalance.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </div>
          </div>
          <div style={{ flex: 1, borderLeft: '1px solid var(--card-border)', paddingLeft: '16px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase' }}>In Trades (Margin)</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--accent-blue)' }}>
              ${(totalEquity - demoBalance - unrealizedPnL).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </div>
          </div>
          <div style={{ flex: 1, borderLeft: '1px solid var(--card-border)', paddingLeft: '16px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase' }}>Total Equity</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
              ${totalEquity.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </div>
            <div style={{ fontSize: '11px', color: totalPnL >= 0 ? 'var(--neon-green)' : 'var(--neon-red)' }}>
              {totalPnL >= 0 ? '+$' : '-$'}{Math.abs(totalPnL).toFixed(2)} ({totalPnL >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
          <div style={{ flex: 1, minWidth: '120px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase' }}>Win Rate</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--accent-blue)' }}>
              {winRate}%
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {wonTrades} W / {totalTrades - wonTrades} L
            </div>
          </div>

          <div style={{ flex: 1, minWidth: '120px', borderLeft: '1px solid var(--card-border)', paddingLeft: '16px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase' }}>Best Trade</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--neon-green)' }}>
              {bestTrade ? `+$${bestTrade.finalPnl.toFixed(2)}` : '-'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{bestTrade ? bestTrade.pair : '-'}</div>
          </div>
          
          <div style={{ flex: 1, minWidth: '120px', borderLeft: '1px solid var(--card-border)', paddingLeft: '16px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase' }}>Worst Trade</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--neon-red)' }}>
              {worstTrade ? `-$${Math.abs(worstTrade.finalPnl).toFixed(2)}` : '-'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{worstTrade ? worstTrade.pair : '-'}</div>
          </div>
        </div>
      </div>
    </div>

    <div>
      {activeDemoTrades.length > 0 && (
        <div className="card glass" style={{ marginBottom: '16px', padding: '16px' }}>
          <h4 style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Target size={14} /> LIVE TRADE TRACKER
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activeDemoTrades.map(trade => {
              // Calculate progress
              const totalDistance = trade.tp2 - trade.sl;
              const currentDistance = (trade.entryPrice + (trade.currentPnl / trade.qty)) - trade.sl;
              let progressPct = (currentDistance / totalDistance) * 100;
              progressPct = Math.max(0, Math.min(100, progressPct)); // Clamp between 0-100
              
              const currentPrice = trade.entryPrice + (trade.currentPnl / trade.qty);

              return (
                <div key={trade.id} style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div>
                      <span style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--text-primary)' }}>{trade.pair}</span>
                      <span style={{ fontSize: '10px', background: 'var(--bg-primary)', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px', color: 'var(--text-muted)' }}>{trade.mode.toUpperCase()}</span>
                    </div>
                    <div style={{ fontWeight: 'bold', fontSize: '14px', color: trade.currentPnl >= 0 ? 'var(--neon-green)' : 'var(--neon-red)' }}>
                      {trade.currentPnl >= 0 ? '+' : ''}${trade.currentPnl.toFixed(2)} 
                    </div>
                  </div>
                  
                  {/* Progress Bar Visualizer */}
                  <div style={{ position: 'relative', height: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginTop: '16px', display: 'flex', alignItems: 'center' }}>
                    {/* SL Marker */}
                    <div style={{ position: 'absolute', left: 0, top: '-18px', fontSize: '10px', color: 'var(--neon-red)' }}>SL: {parseFloat(trade.sl).toFixed(4)}</div>
                    
                    {/* Entry Marker */}
                    <div style={{ position: 'absolute', left: `${((trade.entryPrice - trade.sl) / totalDistance) * 100}%`, top: '-18px', fontSize: '10px', color: 'var(--text-muted)', transform: 'translateX(-50%)' }}>Entry: {parseFloat(trade.entryPrice).toFixed(4)}</div>
                    
                    {/* TP Marker */}
                    <div style={{ position: 'absolute', right: 0, top: '-18px', fontSize: '10px', color: 'var(--neon-green)' }}>TP: {parseFloat(trade.tp2).toFixed(4)}</div>
                    
                    {/* The Bar */}
                    <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${progressPct}%`, background: trade.currentPnl >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', borderRadius: '4px 0 0 4px', borderRight: `2px solid ${trade.currentPnl >= 0 ? 'var(--neon-green)' : 'var(--neon-red)'}` }}></div>
                    
                    {/* Current Price Dot */}
                    <div style={{ position: 'absolute', left: `${progressPct}%`, width: '8px', height: '8px', background: 'var(--text-primary)', borderRadius: '50%', transform: 'translate(-50%, 0)', boxShadow: '0 0 8px rgba(255,255,255,0.5)' }}></div>
                  </div>
                  
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
                    Live Price: ${currentPrice.toFixed(4)} ({((trade.currentPnl / trade.invested) * 100).toFixed(2)}%)
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {closedDemoTrades.length > 0 && (
        <div style={{ padding: '0 16px 16px' }}>
          <h4 style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <History size={14} /> SIGNAL ACCURACY HISTORY
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {closedDemoTrades.slice(0, 10).map(trade => (
              <div key={trade.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg-primary)', borderRadius: '6px', borderLeft: `3px solid ${trade.finalPnl >= 0 ? 'var(--neon-green)' : 'var(--neon-red)'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '4px', background: trade.finalPnl >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }}>
                    {trade.finalPnl >= 0 ? <TrendingUp size={18} color="var(--neon-green)" /> : <TrendingDown size={18} color="var(--neon-red)" />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{trade.pair} <span style={{fontSize: '9px', padding: '2px 4px', background: 'var(--bg-secondary)', borderRadius: '2px', marginLeft: '4px', color: 'var(--text-muted)'}}>{trade.status}</span></div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '8px' }}>
                      <span>In: ${parseFloat(trade.entryPrice).toFixed(4)}</span>
                      <span>Out: ${parseFloat(trade.closePrice).toFixed(4)}</span>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', color: trade.finalPnl >= 0 ? 'var(--neon-green)' : 'var(--neon-red)' }}>
                    {trade.finalPnl >= 0 ? '+' : ''}${trade.finalPnl.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Dur: {getDuration(trade.openTime, trade.closeTime)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    </>
  );
}
