"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { ChevronLeft, Activity, RefreshCw, CheckCircle, Clock, Target, TrendingUp, TrendingDown } from "lucide-react";

function AuditContent() {
  const [snapshots, setSnapshots] = useState([]);
  const [weights, setWeights] = useState({});
  const [auditingId, setAuditingId] = useState(null);

  const apiUrl = typeof window !== 'undefined'
    ? `http://${window.location.hostname}/trading-bots/crypto-analyzer-web/server/public`
    : 'http://localhost/trading-bots/crypto-analyzer-web/server/public';

  const fetchData = async () => {
    try {
      const [snapsRes, wRes] = await Promise.all([
        fetch(`${apiUrl}/api/predictions`),
        fetch(`${apiUrl}/api/predictions/weights`)
      ]);
      if (snapsRes.ok) setSnapshots(await snapsRes.json());
      if (wRes.ok) setWeights(await wRes.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData(); }, []);

  // Fetch real Binance price at a specific timestamp for a given pair
  const fetchActualPriceAt = async (pair, unixTs) => {
    try {
      const startMs = unixTs * 1000;
      const endMs = startMs + 60 * 60 * 1000; // 1 hour window
      const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${pair}&interval=1h&startTime=${startMs}&endTime=${endMs}&limit=1`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          return parseFloat(data[0][4]); // close price
        }
      }
      return null;
    } catch (e) { return null; }
  };

  const runAudit = async (snap) => {
    setAuditingId(snap.id);
    try {
      const now = Date.now() / 1000;

      // Fetch actual prices at each wave timestamp
      const actuals = {};
      for (const w of ['wave1', 'wave2', 'wave3', 'wave4', 'wave5']) {
        const wTime = snap[`${w}_time`];
        if (wTime && wTime < now) {
          const price = await fetchActualPriceAt(snap.pair, wTime);
          if (price) actuals[w] = price;
        }
      }

      if (Object.keys(actuals).length === 0) {
        alert("Prediction window hasn't completed yet — come back later!");
        setAuditingId(null);
        return;
      }

      const res = await fetch(`${apiUrl}/api/predictions/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: snap.id, actuals })
      });

      if (res.ok) {
        await fetchData();
      }
    } catch (e) { console.error(e); }
    setAuditingId(null);
  };

  const avgAccuracy = snapshots.filter(s => s.overall_accuracy !== null)
    .reduce((sum, s, _, arr) => sum + parseFloat(s.overall_accuracy) / arr.length, 0);

  const auditedSnaps = snapshots.filter(s => s.audit_status === 'AUDITED');
  
  // Calculate average accuracy for TP1 (Wave 1)
  const tp1Accuracies = auditedSnaps
    .map(s => {
      const predicted = parseFloat(s.wave1_price);
      const actual = s.wave1_actual ? parseFloat(s.wave1_actual) : null;
      return actual && predicted > 0 ? Math.max(0, 100 - Math.abs(predicted - actual) / predicted * 100) : null;
    })
    .filter(acc => acc !== null);
    
  const avgTp1Accuracy = tp1Accuracies.length > 0
    ? tp1Accuracies.reduce((sum, val) => sum + val, 0) / tp1Accuracies.length
    : null;

  // Calculate average accuracy for TP2 (Wave 3)
  const tp2Accuracies = auditedSnaps
    .map(s => {
      const predicted = parseFloat(s.wave3_price);
      const actual = s.wave3_actual ? parseFloat(s.wave3_actual) : null;
      return actual && predicted > 0 ? Math.max(0, 100 - Math.abs(predicted - actual) / predicted * 100) : null;
    })
    .filter(acc => acc !== null);
    
  const avgTp2Accuracy = tp2Accuracies.length > 0
    ? tp2Accuracies.reduce((sum, val) => sum + val, 0) / tp2Accuracies.length
    : null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', background: 'var(--card-bg)', borderBottom: '1px solid var(--card-border)', position: 'sticky', top: 0, zIndex: 40 }}>
        <Link href="/" style={{ padding: '7px', background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--text-primary)', display: 'flex' }}>
          <ChevronLeft size={18} />
        </Link>
        <Activity size={20} style={{ color: 'var(--accent-blue)' }} />
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>AI Prediction <span style={{ color: 'var(--accent-blue)' }}>Audit Center</span></h1>
      </header>

      <div style={{ maxWidth: '1100px', margin: '20px auto', padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Summary Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '900', color: avgAccuracy >= 70 ? 'var(--neon-green)' : 'var(--color-warning)' }}>
              {snapshots.filter(s => s.overall_accuracy !== null).length > 0 ? `${avgAccuracy.toFixed(1)}%` : 'N/A'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', marginTop: '4px' }}>AVG OVERALL ACCURACY</div>
          </div>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '900', color: avgTp1Accuracy !== null && avgTp1Accuracy >= 70 ? 'var(--neon-green)' : 'var(--color-warning)' }}>
              {avgTp1Accuracy !== null ? `${avgTp1Accuracy.toFixed(1)}%` : 'N/A'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', marginTop: '4px' }}>AVG TP1 (WAVE 1) ACCURACY</div>
          </div>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '900', color: avgTp2Accuracy !== null && avgTp2Accuracy >= 70 ? 'var(--neon-green)' : 'var(--color-warning)' }}>
              {avgTp2Accuracy !== null ? `${avgTp2Accuracy.toFixed(1)}%` : 'N/A'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', marginTop: '4px' }}>AVG TP2 (WAVE 3) ACCURACY</div>
          </div>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--accent-blue)' }}>{snapshots.length}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', marginTop: '4px' }}>TOTAL SNAPSHOTS</div>
          </div>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--color-success)' }}>{snapshots.filter(s => s.audit_status === 'AUDITED').length}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', marginTop: '4px' }}>AUDITED</div>
          </div>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--color-warning)' }}>{snapshots.filter(s => s.audit_status === 'PENDING').length}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', marginTop: '4px' }}>AWAITING AUDIT</div>
          </div>
        </div>

        {/* Model Weights */}
        {Object.keys(weights).length > 0 && (
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '20px' }}>
            <h2 style={{ margin: '0 0 14px 0', fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--accent-blue)' }}>
              🤖 Self-Calibration Model Weights
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {Object.entries(weights).map(([k, v]) => (
                <div key={k} style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '10px 14px', border: '1px solid var(--card-border)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>{k.replace(/_/g, ' ')}</div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: Math.abs(v - 1) < 0.01 ? 'var(--text-primary)' : 'var(--neon-green)' }}>{v.toFixed(4)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Snapshots List */}
        <h2 style={{ margin: '0', fontSize: '14px', fontWeight: '800', textTransform: 'uppercase' }}>Prediction Snapshots</h2>

        {snapshots.length === 0 ? (
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No prediction snapshots saved yet. They will appear automatically when a Buy Signal fires.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '40px' }}>
            {snapshots.map(snap => {
              const isAudited = snap.audit_status === 'AUDITED';
              const acc = parseFloat(snap.overall_accuracy);
              const isBullish = snap.direction === 'BULLISH';

              return (
                <div key={snap.id} style={{
                  background: 'var(--card-bg)',
                  border: `1px solid ${isAudited ? (acc >= 70 ? 'rgba(0,255,136,0.3)' : 'rgba(255,85,85,0.3)') : 'var(--card-border)'}`,
                  borderLeft: `4px solid ${isBullish ? 'var(--neon-green)' : 'var(--neon-red)'}`,
                  borderRadius: '10px',
                  padding: '16px'
                }}>
                  {/* Header row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {isBullish ? <TrendingUp size={16} color="var(--neon-green)" /> : <TrendingDown size={16} color="var(--neon-red)" />}
                      <strong style={{ fontSize: '16px' }}>{snap.pair}</strong>
                      <span style={{ background: isBullish ? 'rgba(0,255,136,0.1)' : 'rgba(255,85,85,0.1)', color: isBullish ? 'var(--neon-green)' : 'var(--neon-red)', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '800' }}>
                        {snap.direction}
                      </span>
                      <span style={{ background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700' }}>
                        SCORE: {snap.score}/8
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {isAudited ? (
                        <span style={{ fontSize: '14px', fontWeight: '900', color: acc >= 70 ? 'var(--neon-green)' : 'var(--color-warning)' }}>
                          {acc.toFixed(1)}% Accuracy
                        </span>
                      ) : (
                        <button
                          onClick={() => runAudit(snap)}
                          disabled={auditingId === snap.id}
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--accent-blue)', color: '#000', border: 'none', padding: '6px 14px', borderRadius: '6px', fontWeight: '800', fontSize: '12px', cursor: 'pointer', opacity: auditingId === snap.id ? 0.7 : 1 }}
                        >
                          <RefreshCw size={12} style={{ animation: auditingId === snap.id ? 'spin 1s linear infinite' : 'none' }} />
                          {auditingId === snap.id ? 'Auditing...' : 'Run Audit'}
                        </button>
                      )}
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(snap.created_at).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Entry price */}
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                    Entry Price: <strong style={{ color: 'var(--text-primary)' }}>${parseFloat(snap.entry_price).toFixed(4)}</strong>
                  </div>

                  {/* Wave comparison table */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {['wave1', 'wave2', 'wave3', 'wave4', 'wave5'].map((w, i) => {
                      const predicted = parseFloat(snap[`${w}_price`]);
                      const actual = snap[`${w}_actual`] ? parseFloat(snap[`${w}_actual`]) : null;
                      const wTime = snap[`${w}_time`];
                      const wDate = wTime ? new Date(wTime * 1000).toLocaleDateString() : '—';
                      const wAcc = actual && predicted > 0 ? Math.max(0, 100 - Math.abs(predicted - actual) / predicted * 100) : null;

                      return (
                        <div key={w} style={{ flex: 1, minWidth: '100px', background: 'var(--bg-secondary)', borderRadius: '8px', padding: '10px', border: `1px solid ${wAcc !== null ? (wAcc >= 70 ? 'rgba(0,255,136,0.2)' : 'rgba(255,85,85,0.2)') : 'var(--card-border)'}` }}>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Wave {i + 1}</div>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px' }}>${predicted.toFixed(4)}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{wDate}</div>
                          {actual && (
                            <>
                              <div style={{ fontSize: '11px', color: 'var(--accent-blue)', marginTop: '4px' }}>Actual: ${actual.toFixed(4)}</div>
                              <div style={{ fontSize: '11px', fontWeight: '800', color: wAcc >= 70 ? 'var(--neon-green)' : 'var(--color-warning)', marginTop: '2px' }}>{wAcc.toFixed(1)}%</div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function AuditPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', color: 'var(--text-muted)' }}>Loading Audit Center...</div>}>
      <AuditContent />
    </Suspense>
  );
}
