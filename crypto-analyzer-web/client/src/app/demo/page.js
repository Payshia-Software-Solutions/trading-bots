"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useBinanceData } from "../../hooks/useBinanceData";
import { fetchAllUSDTPairs } from "../../utils/binance";
import { useSimulation } from "../../hooks/useSimulation";
import { Activity, ChevronLeft, LineChart, Moon, Sun, Home, CheckCircle2, Settings } from "lucide-react";
import TradingChart from "../../components/TradingChart";
import SimulationDashboard from "../../components/SimulationDashboard";

function DemoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const symbol = searchParams.get("symbol") || "BTCUSDT";
  const mode = searchParams.get("mode") || "scalp";
  const [theme, setTheme] = useState("dark");
  const [chartTimeframe, setChartTimeframe] = useState("15m");
  const [signalHistory, setSignalHistory] = useState([]);
  const [coinList, setCoinList] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [marketSearch, setMarketSearch] = useState("");
  
  const { data, activeTrade } = useBinanceData(symbol, mode);
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

      <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: 0, height: '100%', overflow: 'hidden', width: '100%' }}>
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
                    <div key={sig.id} style={{background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid var(--accent-blue)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <div>
                        <div style={{fontSize: '14px', fontWeight: 'bold'}}>{sig.pair}</div>
                        <div style={{fontSize: '11px', color: 'var(--text-muted)'}}>{sig.mode.toUpperCase()}</div>
                      </div>
                      <div style={{textAlign: 'right'}}>
                        <div style={{fontSize: '13px', color: 'var(--color-success)', fontWeight: 'bold'}}>${parseFloat(sig.sell_target).toFixed(4)}</div>
                        <div style={{fontSize: '11px', color: 'var(--color-danger)', marginBottom: '6px'}}>Stop: ${parseFloat(sig.stop_loss).toFixed(4)}</div>
                        <button 
                          onClick={() => {
                            sim.openSimTrade({
                              pair: sig.pair,
                              entryPrice: parseFloat(sig.current_price),
                              mode: sig.mode,
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
                const filtered = coinList.filter(c => c.toLowerCase().includes(marketSearch.toLowerCase()));
                const favs = filtered.filter(c => favorites.includes(c));
                const others = filtered.filter(c => !favorites.includes(c));
                const sortedList = [...favs, ...others];

                return sortedList.map(c => {
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
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Dock Menu */}
      <nav className="mobile-dock">
        <Link href={`/?coin=${symbol}`} className="dock-item">
          <div className="dock-icon-wrapper">
            <Home size={20} />
          </div>
          <span>Home</span>
        </Link>
        <Link href="#" className="dock-item active">
          <div className="dock-icon-wrapper">
            <CheckCircle2 size={20} />
          </div>
          <span>Demo</span>
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
