"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useBinanceData } from "../../hooks/useBinanceData";
import { fetchAllUSDTPairs } from "../../utils/binance";
import { useSimulation } from "../../hooks/useSimulation";
import { Activity, ChevronLeft, LineChart, Moon, Sun, Home as HomeIcon, CheckCircle2, Settings, Sparkles, Loader } from "lucide-react";
import TradingChart from "../../components/TradingChart";
import SimulationDashboard from "../../components/SimulationDashboard";

function DemoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const symbol = searchParams.get("symbol") || "BTCUSDT";
  const mode = searchParams.get("mode") || "scalp";
  const riskMode = searchParams.get("risk") || "safe";
  const [theme, setTheme] = useState("dark");
  const [chartTimeframe, setChartTimeframe] = useState("15m");
  const [signalHistory, setSignalHistory] = useState([]);
  const [coinList, setCoinList] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [marketTab, setMarketTab] = useState("all");
  const [marketSearch, setMarketSearch] = useState("");
  const [tradeSizes, setTradeSizes] = useState({});
  
  const { data, activeTrade } = useBinanceData(symbol, mode, riskMode);
  const sim = useSimulation();

  useEffect(() => {
    fetchAllUSDTPairs().then(pairs => {
      if (pairs && pairs.length > 0) setCoinList(pairs);
    });

    const savedFavs = localStorage.getItem('favCoins');
    if (savedFavs) {
      try { setFavorites(JSON.parse(savedFavs)); } catch (e) {}
    }

    const fetchSignals = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? `http://${window.location.hostname}/trading-bots/crypto-analyzer-web/server/public` : 'http://localhost/trading-bots/crypto-analyzer-web/server/public');
        const res = await fetch(`${apiUrl}/api/signals`);
        if (res.ok) {
          const fetchedData = await res.json();
          if (Array.isArray(fetchedData)) {
            setSignalHistory(fetchedData);
          }
        }
      } catch (e) {
        console.error("Failed to fetch signals:", e);
      }
    };
    fetchSignals();
    const interval = setInterval(fetchSignals, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    if (theme === "light") document.body.classList.add("light");
    else document.body.classList.remove("light");
  }, [theme]);

  // Push live price updates into the simulation engine
  useEffect(() => {
    if (data?.ticker?.currentPrice && data?.ticker?.symbol) {
      sim.updateSimLivePrice(data.ticker.symbol, parseFloat(data.ticker.currentPrice));
    }
  }, [data?.ticker?.currentPrice, data?.ticker?.symbol]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="dashboard-layout">
      <header className="header">
        <div className="logo-area">
          <Activity size={24} className="logo-icon" />
          <h1>Crypto <span>Analyzer Web</span> - Demo Trading</h1>
        </div>
        
        <div className="header-actions">
          <Link href={`/demo?symbol=${symbol}&mode=${mode}&risk=${riskMode === 'safe' ? 'aggressive' : 'safe'}`}>
            <button className="btn" style={{background: 'var(--bg-secondary)', color: riskMode === 'aggressive' ? '#ff5555' : 'var(--neon-green)', fontSize: '12px', border: `1px solid ${riskMode === 'aggressive' ? 'rgba(255,85,85,0.3)' : 'rgba(0,255,136,0.3)'}`, marginRight: '8px'}}>
              {riskMode === 'aggressive' ? '🚀 AGGRESSIVE' : '🛡️ SAFE (Sniper)'}
            </button>
          </Link>
          <button onClick={toggleTheme} className="icon-btn">
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <Link href={`/?coin=${symbol}`}>
            <button className="btn" style={{background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '12px', border: '1px solid var(--card-border)'}}>
              <ChevronLeft size={14} /> Back to Analyzer
            </button>
          </Link>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: 0, height: '100%', overflow: 'hidden', width: '100%', position: 'relative' }}>
        
        {/* Preloader Overlay */}
        {data.loading && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
            background: 'rgba(var(--bg-primary-rgb, 10, 10, 15), 0.7)', 
            backdropFilter: 'blur(8px)', zIndex: 50,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)'
          }}>
            <Loader size={48} className="spin" style={{ color: 'var(--accent-blue)', marginBottom: '16px' }} />
            <h2 style={{ color: 'var(--text-primary)', margin: '0 0 8px 0', fontSize: '20px' }}>Analyzing {symbol}</h2>
            <div style={{ color: 'var(--text-muted)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={14} className="pulse" /> Fetching live market data...
            </div>
          </div>
        )}

        {/* Left Column: Chart */}
        <div className="col" style={{ flex: '2 1 0%', minWidth: '0' }}>
          <div className="card glass" style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 className="section-title" style={{margin: 0}}><LineChart size={16} /> LIVE TRADING CHART ({symbol})</h3>
              <div style={{display: 'flex', gap: '8px'}}>
                <button className={`btn ${chartTimeframe==='5m'?'primary-btn':''}`} style={{padding: '4px 8px', fontSize: '11px', background: chartTimeframe==='5m' ? '' : 'var(--bg-secondary)'}} onClick={()=>setChartTimeframe('5m')}>5m</button>
                <button className={`btn ${chartTimeframe==='15m'?'primary-btn':''}`} style={{padding: '4px 8px', fontSize: '11px', background: chartTimeframe==='15m' ? '' : 'var(--bg-secondary)'}} onClick={()=>setChartTimeframe('15m')}>15m</button>
                <button className={`btn ${chartTimeframe==='1h'?'primary-btn':''}`} style={{padding: '4px 8px', fontSize: '11px', background: chartTimeframe==='1h' ? '' : 'var(--bg-secondary)'}} onClick={()=>setChartTimeframe('1h')}>1h</button>
              </div>
            </div>
            <div style={{ flex: 1, minHeight: '500px', background: 'var(--bg-primary)', borderRadius: '8px', overflow: 'hidden' }}>
              <TradingChart data={data.chartData ? data.chartData[chartTimeframe] : null} targets={null} theme={theme} />
            </div>
          </div>
        </div>
        
        {/* Right Column: Dashboard & Active Signals */}
        <div className="col" style={{ flex: '1 1 0%', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <SimulationDashboard sim={sim} />
          
          <div className="card glass" style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', minHeight: '250px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 className="section-title" style={{margin: 0}}><Activity size={16} /> LIVE ALERTS</h3>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
              {signalHistory.filter(s => s.status !== 'WON' && s.status !== 'LOST').length === 0 ? (
                <div style={{textAlign: 'center', color: 'var(--text-muted)', marginTop: '20px', fontSize: '12px'}}>No active signals found.</div>
              ) : (
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                  {signalHistory.filter(s => s.status !== 'WON' && s.status !== 'LOST').map(sig => (
                    <div key={sig.id} style={{background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${sig.confidence_level === 'HIGH' ? 'var(--neon-green)' : sig.confidence_level === 'LOW' ? 'var(--neon-red)' : 'var(--accent-blue)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                      <div>
                        <div style={{fontSize: '14px', fontWeight: 'bold'}}>{sig.pair}</div>
                        <div style={{fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px'}}>{sig.mode?.toUpperCase()} - {sig.risk_mode ? sig.risk_mode.toUpperCase() : 'SAFE'}</div>
                        {/* Confidence + Risk Badges */}
                        <div style={{display: 'flex', gap: '4px', flexWrap: 'wrap'}}>
                          {sig.confidence_level && (
                            <span style={{
                              padding: '2px 6px', borderRadius: '10px', fontSize: '9px', fontWeight: '800',
                              background: sig.confidence_level === 'HIGH' ? 'rgba(0,255,136,0.15)' : sig.confidence_level === 'MODERATE' ? 'rgba(255,200,0,0.15)' : 'rgba(255,60,60,0.15)',
                              color: sig.confidence_level === 'HIGH' ? 'var(--neon-green)' : sig.confidence_level === 'MODERATE' ? '#f5c842' : 'var(--neon-red)',
                            }}>
                              {sig.confidence_level === 'HIGH' ? '🟢' : sig.confidence_level === 'MODERATE' ? '🟡' : '🔴'} {sig.confidence_level}
                            </span>
                          )}
                          {sig.risk_level && (
                            <span style={{
                              padding: '2px 6px', borderRadius: '10px', fontSize: '9px', fontWeight: '800',
                              background: sig.risk_level === 'LOW' ? 'rgba(0,255,136,0.15)' : sig.risk_level === 'MEDIUM' ? 'rgba(255,200,0,0.15)' : 'rgba(255,60,60,0.15)',
                              color: sig.risk_level === 'LOW' ? 'var(--neon-green)' : sig.risk_level === 'MEDIUM' ? '#f5c842' : 'var(--neon-red)',
                            }}>
                              ⚠️ Risk: {sig.risk_level}
                            </span>
                          )}
                          {sig.rr_ratio && (
                            <span style={{ padding: '2px 6px', borderRadius: '10px', fontSize: '9px', fontWeight: '800', background: 'rgba(100,180,255,0.1)', color: 'var(--accent-blue)' }}>
                              R:R {parseFloat(sig.rr_ratio).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{textAlign: 'right'}}>
                        <div style={{fontSize: '11px', color: 'var(--text-muted)'}}>TP2: <span style={{color: 'var(--color-success)', fontWeight: 'bold'}}>${parseFloat(sig.sell_target).toFixed(4)}</span></div>
                        <div style={{fontSize: '11px', color: 'var(--color-danger)', marginBottom: '8px'}}>SL: ${parseFloat(sig.stop_loss).toFixed(4)}</div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end'}}>
                          <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '6px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: 'var(--text-muted)' }}>$</span>
                            <input 
                              type="number"
                              value={tradeSizes[sig.id] || 100}
                              onChange={(e) => setTradeSizes({...tradeSizes, [sig.id]: Number(e.target.value) || 0})}
                              style={{ 
                                width: '55px', padding: '4px 4px 4px 14px', borderRadius: '4px', border: '1px solid var(--card-border)', 
                                background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '10px', outline: 'none'
                              }}
                            />
                          </div>
                          <button 
                            onClick={() => {
                              sim.openSimTrade({
                                pair: sig.pair,
                                entryPrice: parseFloat(sig.current_price),
                                mode: sig.mode,
                                tradeSize: tradeSizes[sig.id] || 100,
                                targets: { sellTarget: parseFloat(sig.sell_target), stopLoss: parseFloat(sig.stop_loss) }
                              });
                            }}
                            style={{
                              background: 'var(--accent-blue)', color: '#000', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer'
                            }}
                          >
                            Simulate Trade
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column 2: Coin Selector */}
        <div className="col" style={{ width: '300px', flex: 'none', display: 'flex', flexDirection: 'column' }}>
          <div className="card glass" style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 className="section-title" style={{margin: 0}}>MARKETS</h3>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', borderBottom: '1px solid var(--card-border)', paddingBottom: '8px' }}>
              <button 
                onClick={() => setMarketTab('fav')}
                style={{ background: 'transparent', border: 'none', color: marketTab === 'fav' ? 'var(--neon-yellow)' : 'var(--text-muted)', fontSize: '12px', fontWeight: marketTab === 'fav' ? 'bold' : 'normal', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                ★ Favorites
              </button>
              <button 
                onClick={() => setMarketTab('all')}
                style={{ background: 'transparent', border: 'none', color: marketTab === 'all' ? 'var(--accent-blue)' : 'var(--text-muted)', fontSize: '12px', fontWeight: marketTab === 'all' ? 'bold' : 'normal', cursor: 'pointer' }}
              >
                All USDT
              </button>
            </div>

            <input 
              type="text" 
              placeholder="Search coin..." 
              value={marketSearch}
              onChange={e => setMarketSearch(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--card-border)', 
                background: 'var(--bg-secondary)', color: 'var(--text-primary)', marginBottom: '12px', fontSize: '13px'
              }}
            />
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {(() => {
                let filtered = coinList.filter(c => c.toLowerCase().includes(marketSearch.toLowerCase()));
                if (marketTab === 'fav') {
                  filtered = filtered.filter(c => favorites.includes(c));
                }

                return filtered.map(c => {
                  const isActive = sim.activeDemoTrades.some(t => t.pair === c);
                  return (
                    <div 
                      key={c}
                      onClick={() => router.push(`/demo?symbol=${c}&mode=${mode}`)}
                      style={{
                        padding: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', 
                        borderRadius: '4px', background: c === symbol ? 'rgba(41, 98, 255, 0.15)' : 'transparent',
                        borderLeft: c === symbol ? '3px solid var(--accent-blue)' : (isActive ? '3px solid var(--color-success)' : '3px solid transparent')
                      }}
                      className="hover-bg"
                    >
                      <span style={{ fontSize: '13px', fontWeight: (c === symbol || favorites.includes(c)) ? 'bold' : 'normal', color: c === symbol ? 'var(--accent-blue)' : (favorites.includes(c) ? 'var(--neon-yellow)' : 'var(--text-primary)') }}>
                        {favorites.includes(c) ? '★ ' : ''}{c}
                      </span>
                      {isActive && <span style={{fontSize: '10px', background: 'var(--color-success)', color: '#000', padding: '2px 4px', borderRadius: '4px', fontWeight: 'bold'}}>ACTIVE</span>}
                    </div>
                  );
                });
              })()}
              {coinList.length === 0 && <div style={{textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)'}}>Loading...</div>}
              {marketTab === 'fav' && favorites.length === 0 && (
                <div style={{textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', marginTop: '20px'}}>No favorites added yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Dock Menu */}
      <nav className="mobile-dock">
        <Link href={`/?coin=${symbol}`} className="dock-item">
          <div className="dock-icon-wrapper">
            <HomeIcon size={20} />
          </div>
          <span>Home</span>
        </Link>
        <Link href={`/demo?symbol=${symbol}&mode=${mode}`} className="dock-item active">
          <div className="dock-icon-wrapper">
            <CheckCircle2 size={20} />
          </div>
          <span>Demo</span>
        </Link>
        <Link href={`/analyst?coin=${symbol}`} className="dock-item">
          <div className="dock-icon-wrapper" style={{ color: 'var(--neon-purple)' }}>
            <Sparkles size={20} />
          </div>
          <span>Analyst</span>
        </Link>
        <button className="dock-item" onClick={toggleTheme}>
          <div className="dock-icon-wrapper">
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </div>
          <span>Theme</span>
        </button>
      </nav>
    </div>
  );
}

export default function DemoPage() {
  return (
    <Suspense fallback={<div style={{padding: '20px'}}>Loading Demo...</div>}>
      <DemoContent />
    </Suspense>
  );
}
