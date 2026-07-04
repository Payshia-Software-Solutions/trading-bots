"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Activity, X, ChevronLeft, Calendar, ArrowRight, ShieldCheck, AlertTriangle, TrendingUp, HelpCircle, Loader, Trash2 } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { verifySignalWithKlines, parseDateUTC } from "../../utils/signalValidator";
import "./history.css";

function HistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCoin = searchParams.get("coin") || "all";

  // State
  const [signalHistory, setSignalHistory] = useState([]);
  const [filteredSignals, setFilteredSignals] = useState([]);
  const [coinFilter, setCoinFilter] = useState(initialCoin);
  const [timeFilter, setTimeFilter] = useState("7d"); // 24h, 7d, 30d, custom
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [riskFilter, setRiskFilter] = useState("all"); // all, safe, aggressive
  const [modeFilter, setModeFilter] = useState("all"); // all, traditional, geminiai, mytrade
  const [allLivePrices, setAllLivePrices] = useState({});
  const [stats, setStats] = useState({ wins: 0, losses: 0, pending: 0, winRate: 0, netPnlPercent: 0, netPnlUSDT: 0 });
  const [viewSignalModal, setViewSignalModal] = useState(null);
  const { user, loading: authLoading } = useAuth();

  const [accuracyTarget, setAccuracyTarget] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accuracyTarget') || 'TP2';
    }
    return 'TP2';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accuracyTarget', accuracyTarget);
    }
  }, [accuracyTarget]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Fetch signals on load
  const fetchSignals = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? `http://${window.location.hostname}/trading-bots/crypto-analyzer-web/server/public` : 'http://localhost/trading-bots/crypto-analyzer-web/server/public');
      const res = await fetch(`${apiUrl}/api/signals`);
      if (res.ok) {
        const data = await res.json();
        setSignalHistory(data);
      }
    } catch (e) {
      console.error("Failed to fetch signals:", e);
    }
  };

  const updateSignalStatus = async (id, newStatus) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? `http://${window.location.hostname}/trading-bots/crypto-analyzer-web/server/public` : 'http://localhost/trading-bots/crypto-analyzer-web/server/public');
      const res = await fetch(`${apiUrl}/api/signals/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
      });
      if (res.ok) {
        fetchSignals();
      }
    } catch (e) {
      console.error("Failed to update status:", e);
    }
  };

  const deleteSignal = async (id) => {
    if (!window.confirm("Are you sure you want to delete this signal? This action cannot be undone.")) return;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? `http://${window.location.hostname}/trading-bots/crypto-analyzer-web/server/public` : 'http://localhost/trading-bots/crypto-analyzer-web/server/public');
      const res = await fetch(`${apiUrl}/api/signals/delete?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchSignals();
      } else {
        alert("Failed to delete signal");
      }
    } catch (e) {
      console.error("Failed to delete signal:", e);
    }
  };

  useEffect(() => {
    fetchSignals();
  }, []);

  // Fetch live prices periodically from Binance
  useEffect(() => {
    const fetchLivePrices = async () => {
      try {
        const res = await fetch('https://api.binance.com/api/v3/ticker/price');
        if (res.ok) {
          const data = await res.json();
          const priceMap = {};
          data.forEach(item => {
            priceMap[item.symbol] = item.price;
          });
          setAllLivePrices(priceMap);
        }
      } catch(e) {}
    };
    fetchLivePrices();
    const interval = setInterval(fetchLivePrices, 15000);
    return () => clearInterval(interval);
  }, [filteredSignals]);

  // Auto-evaluate ALL Active Signals in the background against allLivePrices
  useEffect(() => {
    if (!signalHistory || signalHistory.length === 0 || !allLivePrices || Object.keys(allLivePrices).length === 0) return;

    signalHistory.forEach(sig => {
      if (sig.status !== 'WON' && sig.status !== 'LOST') {
        const livePrice = parseFloat(allLivePrices[sig.pair]);
        if (!livePrice) return;

        const tp1 = parseFloat(sig.tp1);
        const tp2 = parseFloat(sig.sell_target);
        const sl = parseFloat(sig.stop_loss);

        // Check TP2 hit (WON)
        if (livePrice >= tp2) {
          updateSignalStatus(sig.id, 'TP2 HIT');
        }
        // Check TP1 hit
        else if (tp1 && livePrice >= tp1 && sig.status !== 'PARTIAL WIN' && sig.status !== 'TP1 HIT') {
          updateSignalStatus(sig.id, 'TP1 HIT');
        }
        // Check Stop Loss hit (LOST)
        else if (livePrice <= sl) {
          updateSignalStatus(sig.id, 'LOST');
        }
      }
    });
  }, [allLivePrices, signalHistory]);

  // Secondary Background Evaluator: Check Klines (Wicks) every 60s
  useEffect(() => {
    if (!signalHistory || signalHistory.length === 0) return;

    const validateWithKlines = () => {
      signalHistory.forEach(sig => {
        if (sig.status !== 'WON' && sig.status !== 'LOST') {
          verifySignalWithKlines(sig, updateSignalStatus);
        }
      });
    };

    const initialTimer = setTimeout(validateWithKlines, 5000);
    const interval = setInterval(validateWithKlines, 60000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [signalHistory]);

  const getSignalCurrentPrice = (sig) => {
    if (sig.status === 'WON' || sig.status === 'TP2 HIT') return parseFloat(sig.sell_target);
    if (sig.status === 'LOST') return parseFloat(sig.stop_loss);
    if (allLivePrices[sig.pair]) return parseFloat(allLivePrices[sig.pair]);
    return parseFloat(sig.current_price);
  };

  const getSignalPnL = (sig) => {
    const entry = parseFloat(sig.current_price);
    if (!entry) return 0;
    const current = getSignalCurrentPrice(sig);
    return ((current - entry) / entry) * 100;
  };

  // Get unique pairs for dropdown
  const uniquePairs = Array.from(new Set(signalHistory.map(s => s.pair))).sort();

  // Apply filters
  useEffect(() => {
    let filtered = [...signalHistory];

    // 1. Coin Filter
    if (coinFilter !== "all") {
      filtered = filtered.filter(s => s.pair === coinFilter);
    }

    // 2. Risk Filter
    if (riskFilter !== "all") {
      filtered = filtered.filter(s => (s.risk_mode || 'safe') === riskFilter);
    }

    // 3. Trade Mode Filter
    if (modeFilter !== "all") {
      filtered = filtered.filter(s => s.mode === modeFilter);
    }

    // 4. Timeframe Filter
    const now = new Date();
    if (timeFilter === "24h") {
      const past24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      filtered = filtered.filter(s => parseDateUTC(s.created_at) >= past24h);
    } else if (timeFilter === "7d") {
      const past7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(s => parseDateUTC(s.created_at) >= past7d);
    } else if (timeFilter === "30d") {
      const past30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(s => parseDateUTC(s.created_at) >= past30d);
    } else if (timeFilter === "custom") {
      if (customStart) {
        const start = new Date(customStart);
        filtered = filtered.filter(s => parseDateUTC(s.created_at) >= start);
      }
      if (customEnd) {
        // Set end time to end of that day
        const end = new Date(customEnd);
        end.setHours(23, 59, 59, 999);
        filtered = filtered.filter(s => parseDateUTC(s.created_at) <= end);
      }
    }

    setFilteredSignals(filtered);

    // Calculate Stats
    let w = 0, l = 0, p = 0, o = 0;
    let tp1HitsCount = 0;
    let tp2HitsCount = 0;
    let netPnlPercent = 0;
    let tp1PnlPercent = 0;
    let tp2PnlPercent = 0;
    const SIM_USDT = 100;

    filtered.forEach(s => {
      const entry = parseFloat(s.current_price);
      const tp1 = parseFloat(s.tp1);
      const tp2 = parseFloat(s.sell_target);
      const sl = parseFloat(s.stop_loss);
      const live = allLivePrices[s.pair] ? parseFloat(allLivePrices[s.pair]) : entry;

      const hasHitTp1 = s.tp1_hit_at !== null || s.status === 'PARTIAL WIN' || s.status === 'WON';
      const hasHitTp2 = s.tp2_hit_at !== null || s.status === 'WON';

      if (hasHitTp1) tp1HitsCount++;
      if (hasHitTp2) tp2HitsCount++;

      if (accuracyTarget === 'TP1') {
        if (hasHitTp1) {
          w++;
          if (entry > 0 && tp1 > 0) {
            const pnl = ((tp1 - entry) / entry) * 100;
            netPnlPercent += pnl;
            tp1PnlPercent += pnl;
          }
        } else if (s.status === 'LOST') {
          l++;
          if (entry > 0) {
            const pnl = ((sl - entry) / entry) * 100;
            netPnlPercent += pnl;
          }
        } else if (s.status === 'PENDING') {
          p++;
        } else {
          // BUY ACTIVE (not yet hit TP1 or SL)
          o++;
          if (entry > 0 && live > 0) {
            const pnl = ((live - entry) / entry) * 100;
            netPnlPercent += pnl;
          }
        }
      } else {
        // TP2 Mode
        if (hasHitTp2) {
          w++;
          if (entry > 0 && tp2 > 0) {
            const pnl = ((tp2 - entry) / entry) * 100;
            netPnlPercent += pnl;
            tp2PnlPercent += pnl;
          }
        } else if (s.status === 'LOST') {
          l++;
          if (entry > 0) {
            const pnl = ((sl - entry) / entry) * 100;
            netPnlPercent += pnl;
          }
        } else if (s.status === 'PENDING') {
          p++;
        } else {
          // OPEN: BUY ACTIVE or PARTIAL WIN
          o++;
          if (entry > 0 && live > 0) {
            const pnl = ((live - entry) / entry) * 100;
            netPnlPercent += pnl;
            if (hasHitTp1 && tp1 > 0) {
              const tp1Pnl = ((tp1 - entry) / entry) * 100;
              tp1PnlPercent += tp1Pnl;
            }
          }
        }
      }
    });

    const total = w + l;
    const netPnlUSDT = (SIM_USDT * netPnlPercent) / 100;

    setStats({
      wins: w,
      losses: l,
      pending: p,
      open: o,
      tp1Hits: tp1HitsCount,
      tp2Hits: tp2HitsCount,
      winRate: total > 0 ? ((w / total) * 100).toFixed(1) : 0,
      netPnlPercent: netPnlPercent.toFixed(2),
      tp1PnlPercent: tp1PnlPercent.toFixed(2),
      tp2PnlPercent: tp2PnlPercent.toFixed(2),
      netPnlUSDT: netPnlUSDT.toFixed(2)
    });

  }, [signalHistory, coinFilter, timeFilter, customStart, customEnd, riskFilter, modeFilter, accuracyTarget, allLivePrices]);

  if (authLoading || !user) {
    return <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', zIndex: 9999 }}><Loader className="spin" size={32} /></div>;
  }

  return (
    <div className="history-page">
      {/* Header */}
      <header className="history-header">
        <div className="history-header-left">
          <Link href="/" className="icon-btn" style={{ padding: '7px', background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--text-primary)', display: 'flex' }}>
            <ChevronLeft size={18} />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={22} className="text-primary" />
            <h1 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>Full view & <span className="text-primary">Accuracy</span> Dashboard</h1>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="history-container">
        
        {/* Filters Panel */}
        <section className="filters-panel">
          <h2 style={{ fontSize: '14px', fontWeight: '800', margin: '0 0 4px 0', textTransform: 'uppercase', color: 'var(--accent-blue)' }}>Filters</h2>
          <div className="filters-row">
            
            <div className="filter-group">
              <label>Timeframe</label>
              <select className="filter-control" value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="all">All Time</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Coin Pair</label>
              <select className="filter-control" value={coinFilter} onChange={(e) => setCoinFilter(e.target.value)}>
                <option value="all">All Coins</option>
                {uniquePairs.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Risk Mode</label>
              <select className="filter-control" value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}>
                <option value="all">All Modes</option>
                <option value="safe">Safe (Sniper)</option>
                <option value="aggressive">Aggressive</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Trade Mode</label>
              <select className="filter-control" value={modeFilter} onChange={(e) => setModeFilter(e.target.value)}>
                <option value="all">All Strategies</option>
                <option value="traditional">Traditional Checkpoint</option>
                <option value="geminiai">Gemini AI Target</option>
                <option value="mytrade">Manual Trade</option>
              </select>
            </div>

            <div className="filter-group" style={{ minWidth: '120px' }}>
              <label>Target Goal</label>
              <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: '6px', padding: '2px', border: '1px solid var(--card-border)' }}>
                <button
                  onClick={() => setAccuracyTarget('TP1')}
                  style={{
                    background: accuracyTarget === 'TP1' ? 'var(--color-success)' : 'transparent',
                    color: accuracyTarget === 'TP1' ? '#000' : 'var(--text-secondary)',
                    border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold', flex: 1
                  }}
                >TP1</button>
                <button
                  onClick={() => setAccuracyTarget('TP2')}
                  style={{
                    background: accuracyTarget === 'TP2' ? 'var(--accent-blue)' : 'transparent',
                    color: accuracyTarget === 'TP2' ? '#000' : 'var(--text-secondary)',
                    border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold', flex: 1
                  }}
                >TP2</button>
              </div>
            </div>
          </div>

          {timeFilter === "custom" && (
            <div className="custom-range-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Start Date:</span>
                <input type="date" className="date-picker" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>End Date:</span>
                <input type="date" className="date-picker" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
              </div>
            </div>
          )}
        </section>

        {/* Stats Grid */}
        <section className="stats-grid">
          <div className="stat-card">
            <div style={{ fontSize: '32px', fontWeight: '900', color: stats.winRate >= 50 ? 'var(--color-success)' : 'var(--color-warning)' }}>{stats.winRate}%</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', marginTop: '4px' }}>ACCURACY / WIN RATE</div>
          </div>
          <div className="stat-card">
            <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--color-success)' }}>{stats.wins}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', marginTop: '4px' }}>
              {accuracyTarget === 'TP1' ? `WINS (TP1: ${stats.tp1Hits || 0})` : `WINS (TP2: ${stats.tp2Hits || 0})`}
            </div>
          </div>
          <div className="stat-card">
            <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--color-warning)' }}>{stats.open}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', marginTop: '4px' }}>
              {accuracyTarget === 'TP1' ? 'OPEN (Active)' : `OPEN (TP1 Hit: ${stats.tp1Hits || 0})`}
            </div>
          </div>
          <div className="stat-card">
            <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--color-danger)' }}>{stats.losses}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', marginTop: '4px' }}>LOSSES</div>
          </div>
          <div className="stat-card">
            <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--accent-blue)' }}>{stats.pending}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', marginTop: '4px' }}>PENDING</div>
          </div>
          <div className={`stat-card net-profit-card ${stats.netPnlPercent >= 0 ? '' : 'loss'}`}>
            <div style={{ fontSize: '20px', fontWeight: '900', color: stats.netPnlPercent >= 0 ? 'var(--neon-green)' : 'var(--neon-red)', lineHeight: '1.2' }}>
              {stats.netPnlPercent >= 0 ? '+' : ''}{stats.netPnlPercent}%
              <span style={{ fontSize: '12px', marginLeft: '6px', opacity: 0.8, fontWeight: '700' }}>
                ({stats.netPnlPercent >= 0 ? '+' : ''}{stats.netPnlUSDT} USDT)
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', marginTop: '6px' }}>
              NET PROFIT/LOSS
            </div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px', marginTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
              <span>{accuracyTarget} Wins: <strong style={{ color: 'var(--neon-green)' }}>{accuracyTarget === 'TP1' ? stats.tp1PnlPercent : stats.tp2PnlPercent}%</strong></span>
              <span>$100/trade</span>
            </div>
          </div>
        </section>

        {/* Signals List */}
        <section className="signals-list-section">
          <h2 style={{ fontSize: '14px', fontWeight: '800', margin: '10px 0 0 0', textTransform: 'uppercase', color: 'var(--text-primary)' }}>Signals ({filteredSignals.length})</h2>
          
          {filteredSignals.length === 0 ? (
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No signals found matching the active filters.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '40px' }}>
              {filteredSignals.map(sig => {
                const pnl = getSignalPnL(sig);
                const isWon = sig.status === 'WON' || sig.status === 'PARTIAL WIN' || sig.status === 'TP1 HIT' || sig.status === 'TP2 HIT';
                const isLost = sig.status === 'LOST';
                const isPending = sig.status === 'PENDING' || sig.status === 'BUY ACTIVE';
                const live = getSignalCurrentPrice(sig);
                const profitUSDT = (100 * pnl) / 100;

                return (
                  <div key={sig.id} className="signal-row-card" style={{ borderLeft: `4px solid ${isWon ? 'var(--color-success)' : isLost ? 'var(--color-danger)' : 'var(--accent-blue)'}` }}>
                    
                    {/* Meta info */}
                    <div className="signal-meta">
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ fontSize: '16px', color: 'var(--text-primary)' }}>{sig.pair}</strong>
                          <span style={{ background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '10px', fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)', border: '1px solid var(--card-border)' }}>
                            {sig.mode}
                          </span>
                          <span style={{ 
                            background: (sig.risk_mode || 'safe') === 'aggressive' ? 'rgba(255,85,85,0.1)' : 'rgba(0,255,136,0.1)', 
                            padding: '2px 8px', 
                            borderRadius: '10px', 
                            fontSize: '9px', 
                            fontWeight: '800', 
                            textTransform: 'uppercase', 
                            color: (sig.risk_mode || 'safe') === 'aggressive' ? '#ff5555' : 'var(--neon-green)',
                            border: `1px solid ${(sig.risk_mode || 'safe') === 'aggressive' ? 'rgba(255,85,85,0.2)' : 'rgba(0,255,136,0.2)'}`
                          }}>
                            {sig.risk_mode || 'safe'}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'right' }}>
                          <div><span style={{ opacity: 0.6 }}>Open:</span> {parseDateUTC(sig.created_at).toLocaleString()}</div>
                          {sig.tp1_hit_at && (
                            <div><span style={{ opacity: 0.6 }}>TP1 Hit:</span> <span style={{ color: 'var(--color-success)' }}>{parseDateUTC(sig.tp1_hit_at).toLocaleString()}</span></div>
                          )}
                          {sig.tp2_hit_at && (
                            <div><span style={{ opacity: 0.6 }}>TP2 Hit:</span> <span style={{ color: 'var(--color-success)' }}>{parseDateUTC(sig.tp2_hit_at).toLocaleString()}</span></div>
                          )}
                          {sig.closed_at && !sig.tp1_hit_at && !sig.tp2_hit_at && (
                            <div><span style={{ opacity: 0.6 }}>Closed:</span> <span style={{ color: isWon ? 'var(--color-success)' : isLost ? 'var(--color-danger)' : 'var(--text-muted)' }}>{parseDateUTC(sig.closed_at).toLocaleString()}</span></div>
                          )}
                          {sig.closed_at && isLost && (
                            <div><span style={{ opacity: 0.6 }}>Stopped:</span> <span style={{ color: 'var(--color-danger)' }}>{parseDateUTC(sig.closed_at).toLocaleString()}</span></div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Technical values */}
                    <div style={{ display: 'flex', gap: '16px', fontSize: '12px', flexWrap: 'wrap', margin: '8px 0' }}>
                      <div><span style={{ color: 'var(--text-muted)' }}>Entry:</span> <strong style={{ color: 'var(--text-primary)' }}>${parseFloat(sig.current_price).toFixed(4)}</strong></div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Live:</span> <strong style={{ color: 'var(--accent-blue)' }}>${live.toFixed(4)}</strong></div>
                      {sig.tp1 && (() => {
                        const isTp1Hit = sig.status === 'PARTIAL WIN' || sig.status === 'TP1 HIT' || sig.status === 'TP2 HIT' || sig.status === 'WON' || (live >= parseFloat(sig.tp1));
                        const tp1Val = parseFloat(sig.tp1);
                        const entryVal = parseFloat(sig.current_price);
                        const tp1Pct = entryVal > 0 ? (((tp1Val - entryVal) / entryVal) * 100).toFixed(2) : 0;
                        return (
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>TP1:</span>{' '}
                            <strong style={{ color: isTp1Hit ? 'var(--color-success)' : 'var(--text-primary)', opacity: isTp1Hit ? 1 : 0.6 }}>
                              ${tp1Val.toFixed(4)} <span style={{fontSize: '9px', color: isTp1Hit ? 'var(--color-success)' : 'var(--text-muted)'}}>(+{tp1Pct}%)</span>
                              {isTp1Hit && <span style={{ fontSize: '9px', marginLeft: '2px' }}>✅</span>}
                            </strong>
                          </div>
                        );
                      })()}
                      {(() => {
                        const isTp2Hit = sig.status === 'TP2 HIT' || sig.status === 'WON' || (live >= parseFloat(sig.sell_target));
                        const tp2Val = parseFloat(sig.sell_target);
                        const entryVal = parseFloat(sig.current_price);
                        const tp2Pct = entryVal > 0 ? (((tp2Val - entryVal) / entryVal) * 100).toFixed(2) : 0;
                        return (
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>TP2:</span>{' '}
                            <strong style={{ color: isTp2Hit ? 'var(--color-success)' : 'var(--text-primary)', opacity: isTp2Hit ? 1 : 0.6 }}>
                              ${tp2Val.toFixed(4)} <span style={{fontSize: '9px', color: isTp2Hit ? 'var(--color-success)' : 'var(--text-muted)'}}>(+{tp2Pct}%)</span>
                              {isTp2Hit && <span style={{ fontSize: '9px', marginLeft: '2px' }}>✅</span>}
                            </strong>
                          </div>
                        );
                      })()}
                      <div><span style={{ color: 'var(--text-muted)' }}>SL:</span> <strong style={{ color: 'var(--color-danger)' }}>${parseFloat(sig.stop_loss).toFixed(4)}</strong></div>
                      <div><span style={{ color: 'var(--text-muted)' }}>R:R:</span> <strong style={{ color: 'var(--color-warning)' }}>1:{parseFloat(sig.rr_ratio).toFixed(2)}</strong></div>
                    </div>

                    {/* P&L & Status buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
                      <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
                        <span className="status-badge" style={{ 
                          background: isWon ? 'rgba(16,185,129,0.1)' : isLost ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)',
                          color: isWon ? 'var(--color-success)' : isLost ? 'var(--color-danger)' : 'var(--accent-blue)',
                          marginRight: '8px'
                        }}>
                          {sig.status}
                        </span>
                        <span style={{ color: pnl >= 0 ? 'var(--neon-green)' : 'var(--neon-red)' }}>
                          {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}% ({pnl >= 0 ? '+' : ''}{profitUSDT.toFixed(2)} USDT)
                        </span>
                      </div>
                      
                      <div className="btn-group">
                        <button 
                          onClick={() => {
                            if (sig.status === 'PARTIAL WIN' || sig.status === 'TP1 HIT') {
                              updateSignalStatus(sig.id, 'PENDING');
                            } else {
                              updateSignalStatus(sig.id, 'TP1 HIT');
                            }
                          }} 
                          style={{ background: (sig.status === 'PARTIAL WIN' || sig.status === 'TP1 HIT' || sig.status === 'WON' || sig.status === 'TP2 HIT') ? 'var(--color-success)' : 'transparent', color: (sig.status === 'PARTIAL WIN' || sig.status === 'TP1 HIT' || sig.status === 'WON' || sig.status === 'TP2 HIT') ? '#000' : 'var(--color-success)', border: '1px solid var(--color-success)', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          TP1 HIT
                        </button>
                        <button 
                          onClick={() => {
                            if (sig.status === 'WON' || sig.status === 'TP2 HIT') {
                              updateSignalStatus(sig.id, 'TP1 HIT');
                            } else {
                              updateSignalStatus(sig.id, 'TP2 HIT');
                            }
                          }} 
                          className="action-btn" 
                          style={{ 
                            borderColor: 'var(--accent-blue)', 
                            color: (sig.status === 'TP2 HIT' || sig.status === 'WON') ? '#000' : 'var(--accent-blue)', 
                            background: (sig.status === 'TP2 HIT' || sig.status === 'WON') ? 'var(--accent-blue)' : 'transparent',
                            borderWidth: '1px',
                            borderStyle: 'solid'
                          }}
                        >
                          TP2 HIT
                        </button>
                        <button 
                          onClick={() => {
                            if (sig.status === 'LOST') {
                              updateSignalStatus(sig.id, 'PENDING');
                            } else {
                              updateSignalStatus(sig.id, 'LOST');
                            }
                          }} 
                          className="action-btn" 
                          style={{ 
                            borderColor: 'var(--color-danger)', 
                            color: isLost ? '#000' : 'var(--color-danger)', 
                            background: isLost ? 'var(--color-danger)' : 'transparent',
                            borderWidth: '1px',
                            borderStyle: 'solid'
                          }}
                        >
                          LOST
                        </button>
                        <button 
                          onClick={() => updateSignalStatus(sig.id, 'PENDING')} 
                          className="action-btn" 
                          style={{ 
                            borderColor: 'var(--text-muted)', 
                            color: isPending ? '#000' : 'var(--text-muted)', 
                            background: isPending ? 'rgba(255,255,255,0.08)' : 'transparent',
                            borderWidth: '1px',
                            borderStyle: 'solid'
                          }}
                        >
                          PENDING
                        </button>
                        <button onClick={() => setViewSignalModal(sig)} className="action-btn" style={{ 
                          borderColor: 'var(--text-muted)', 
                          color: 'var(--text-primary)', 
                          background: 'transparent',
                          borderWidth: '1px',
                          borderStyle: 'solid'
                        }}>
                          VIEW
                        </button>
                        <button onClick={() => deleteSignal(sig.id)} className="action-btn" style={{ 
                          borderColor: 'var(--color-danger)', 
                          color: 'var(--color-danger)', 
                          background: 'transparent',
                          borderWidth: '1px',
                          borderStyle: 'solid',
                          padding: '6px'
                        }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>

      {/* View Signal Modal */}
      {viewSignalModal && (
        <div className="modal-overlay" style={{zIndex: 9999, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center'}} onClick={() => setViewSignalModal(null)}>
          <div className="modal-content glass" onClick={e => e.stopPropagation()} style={{maxWidth: '400px', width: '90%', border: `2px solid ${viewSignalModal.status === 'WON' ? 'var(--color-success)' : viewSignalModal.status === 'LOST' ? 'var(--color-danger)' : 'var(--accent-blue)'}`, background: 'var(--bg-primary)', padding: 0, borderRadius: '8px', overflow: 'hidden'}}>
            <div className="modal-header" style={{background: viewSignalModal.status === 'WON' ? 'var(--color-success)' : viewSignalModal.status === 'LOST' ? 'var(--color-danger)' : 'var(--accent-blue)', color: '#000', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h3 style={{margin: 0, fontSize: '16px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px'}}>
                <Activity size={20} /> SIGNAL DETAILS
              </h3>
              <button className="icon-btn" style={{width: '28px', height: '28px', color: '#000', background: 'transparent', border: 'none', cursor: 'pointer'}} onClick={() => setViewSignalModal(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{padding: '24px'}}>
              <div style={{textAlign: 'center', marginBottom: '20px'}}>
                <div style={{fontSize: '36px', fontWeight: '900', color: 'var(--text-primary)'}}>{viewSignalModal.pair}</div>
                <div style={{fontSize: '14px', color: viewSignalModal.status === 'WON' ? 'var(--color-success)' : viewSignalModal.status === 'LOST' ? 'var(--color-danger)' : 'var(--accent-blue)', fontWeight: '700', marginTop: '4px'}}>
                  {viewSignalModal.mode} Mode - {viewSignalModal.risk_mode || 'safe'}
                </div>
              </div>
              
              <div style={{display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <span style={{color: 'var(--text-muted)', fontWeight: '600'}}>Entry Price:</span>
                  <strong style={{color: 'var(--text-primary)', fontSize: '18px'}}>${parseFloat(viewSignalModal.current_price).toFixed(4)}</strong>
                </div>
                {viewSignalModal.tp1 && (
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <span style={{color: 'var(--text-muted)', fontWeight: '600'}}>TP1 (Safe):</span>
                    <strong style={{color: 'var(--color-success)', fontSize: '18px'}}>${parseFloat(viewSignalModal.tp1).toFixed(4)}</strong>
                  </div>
                )}
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <span style={{color: 'var(--text-muted)', fontWeight: '600'}}>TP2 (Max):</span>
                  <strong style={{color: 'var(--color-success)', fontSize: '18px'}}>${parseFloat(viewSignalModal.sell_target).toFixed(4)}</strong>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--card-border)', paddingTop: '12px'}}>
                  <span style={{color: 'var(--text-muted)', fontWeight: '600'}}>Stop Loss:</span>
                  <strong style={{color: 'var(--color-danger)', fontSize: '18px'}}>${parseFloat(viewSignalModal.stop_loss).toFixed(4)}</strong>
                </div>
              </div>

              <div style={{marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div style={{color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600'}}>Confidence: <span style={{color: 'var(--text-primary)'}}>{viewSignalModal.confidence_level || 'MODERATE'}</span></div>
                <div style={{color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600'}}>Score: <span style={{color: 'var(--neon-green)'}}>{viewSignalModal.score}/100</span></div>
              </div>

              <button 
                className="btn primary-btn" 
                style={{width: '100%', marginTop: '20px', padding: '14px', fontSize: '16px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--card-border)', fontWeight: '800', cursor: 'pointer', borderRadius: '8px'}}
                onClick={() => setViewSignalModal(null)}
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', color: 'var(--text-muted)' }}>
        Loading Accuracy Dashboard...
      </div>
    }>
      <HistoryContent />
    </Suspense>
  );
}
