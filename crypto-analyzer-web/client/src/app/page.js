"use client";

import { useState, useEffect } from "react";
import { useBinanceData } from "../hooks/useBinanceData";
import { useSimulation } from "../hooks/useSimulation";
import { fetchAllUSDTPairs } from "../utils/binance";
import { generateGeminiReport, getGeminiTradeTargets } from "../utils/gemini";
import { t } from "../utils/translations";
import { 
  Activity, BarChart2, Bitcoin, CheckCircle2, ChevronRight, 
  Clock, LineChart, Moon, Sun, TrendingUp, XCircle, Zap, Star, AlertTriangle, ShieldCheck, List, X, Home as HomeIcon, Settings, Sparkles, Loader
} from "lucide-react";
import TradingChart from "../components/TradingChart";
import Link from 'next/link';

export default function Home() {
  const [symbol, setSymbol] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('coin')?.toUpperCase() || "BTCUSDT";
    }
    return "BTCUSDT";
  });
  const [inputSymbol, setInputSymbol] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('coin')?.toUpperCase() || "BTCUSDT";
    }
    return "BTCUSDT";
  });
  const [mode, setMode] = useState("scalp"); // 'scalp' | 'swing'
  const [theme, setTheme] = useState("dark");
  const [lang, setLang] = useState("en");
  const [chartTimeframe, setChartTimeframe] = useState("15m");
  const [activePlan, setActivePlan] = useState("traditional"); // 'traditional' | 'geminiai' | 'mytrade'
  const [myEntry, setMyEntry] = useState("");
  const [isMarketModalOpen, setIsMarketModalOpen] = useState(false);
  const [coinList, setCoinList] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [marketTab, setMarketTab] = useState("all"); // 'all' | 'fav'
  const [marketSearch, setMarketSearch] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [geminiTargets, setGeminiTargets] = useState(null);
  const [isGeneratingTargets, setIsGeneratingTargets] = useState(false);
  const [geminiError, setGeminiError] = useState("");
  const [activeSignalModal, setActiveSignalModal] = useState(null);
  const [signalHistory, setSignalHistory] = useState([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyStats, setHistoryStats] = useState({ wins: 0, losses: 0, pending: 0, winRate: 0, netPnlPercent: 0 });
  const [allLivePrices, setAllLivePrices] = useState({});

  const fetchSignals = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? `http://${window.location.hostname}/trading-bots/crypto-analyzer-web/server/public` : 'http://localhost/trading-bots/crypto-analyzer-web/server/public');
      const res = await fetch(`${apiUrl}/api/signals`);
      if (res.ok) {
        const data = await res.json();
        setSignalHistory(data);
        calculateStats(data);
      }
    } catch (e) {
      console.error("Failed to fetch signals:", e);
    }
  };

  const calculateStats = (signals) => {
    let w = 0, l = 0, p = 0;
    let netPnlPercent = 0;

    signals.forEach(s => {
      const entry = parseFloat(s.current_price);
      const tp = parseFloat(s.sell_target);
      const sl = parseFloat(s.stop_loss);

      if (s.status === 'WON') {
        w++;
        if (entry > 0) netPnlPercent += ((tp - entry) / entry) * 100;
      }
      else if (s.status === 'LOST') {
        l++;
        if (entry > 0) netPnlPercent += ((sl - entry) / entry) * 100;
      }
      else p++;
    });
    const total = w + l;
    setHistoryStats({
      wins: w,
      losses: l,
      pending: p,
      winRate: total > 0 ? ((w / total) * 100).toFixed(1) : 0,
      netPnlPercent: netPnlPercent.toFixed(2)
    });
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
      console.error("Failed to update signal:", e);
    }
  };

  const getSignalCurrentPrice = (sig) => {
    let current = null;
    if (sig.status === 'WON') current = parseFloat(sig.sell_target);
    else if (sig.status === 'LOST') current = parseFloat(sig.stop_loss);
    else if (allLivePrices[sig.pair]) {
      current = parseFloat(allLivePrices[sig.pair]);
    }
    else if (sig.pair === symbol && data?.ticker?.currentPrice) {
      current = parseFloat(data.ticker.currentPrice);
    }
    return current;
  };

  const getSignalPnL = (sig) => {
    const entry = parseFloat(sig.current_price);
    if (!entry) return null;
    
    const current = getSignalCurrentPrice(sig);
    if (!current) return null;
    
    const pnl = ((current - entry) / entry) * 100;
    return pnl;
  };

  useEffect(() => {
    fetchAllUSDTPairs().then(pairs => {
      if (pairs && pairs.length > 0) setCoinList(pairs);
    });
    const savedFavs = localStorage.getItem('favCoins');
    if (savedFavs) {
      try { setFavorites(JSON.parse(savedFavs)); } catch (e) {}
    }
    const savedGemini = localStorage.getItem('geminiKey');
    if (savedGemini) {
      setGeminiKey(savedGemini);
    }
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setTheme(savedTheme);
    }
    fetchSignals();

    // URL checking is now handled by useState lazy initialization
    // to prevent fetching BTC data before the URL parameter is read.
  }, []);

  useEffect(() => {
    let interval;
    if (isHistoryModalOpen) {
      const fetchPrices = async () => {
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
      fetchPrices();
      interval = setInterval(fetchPrices, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isHistoryModalOpen]);

  const toggleFavorite = (e, coin) => {
    e.stopPropagation();
    let newFavs = [...favorites];
    if (newFavs.includes(coin)) {
      newFavs = newFavs.filter(c => c !== coin);
    } else {
      newFavs.push(coin);
    }
    setFavorites(newFavs);
    localStorage.setItem('favCoins', JSON.stringify(newFavs));
  };

  const displayedCoins = coinList.filter(c => {
    if (marketTab === 'fav' && !favorites.includes(c)) return false;
    if (marketSearch && !c.toLowerCase().includes(marketSearch.toLowerCase())) return false;
    return true;
  });

  const { data, activeTrade, setActiveTrade, runAnalysis } = useBinanceData(symbol, mode);
  const sim = useSimulation();

  useEffect(() => {
    if (data?.ticker?.currentPrice) {
      sim.updateSimLivePrice(symbol, parseFloat(data.ticker.currentPrice));
    }
  }, [data?.ticker?.currentPrice, symbol]);

  // Auto-evaluate Signal History Win/Loss
  useEffect(() => {
    if (!data?.ticker?.currentPrice || !signalHistory || signalHistory.length === 0) return;
    
    // PREVENT RACE CONDITION: Only evaluate if the fetched data matches the selected symbol
    if (data.ticker.symbol !== symbol) return;

    const currentPrice = parseFloat(data.ticker.currentPrice);

    signalHistory.forEach(sig => {
      if (sig.pair === symbol && sig.status !== 'WON' && sig.status !== 'LOST') {
        const tp = parseFloat(sig.sell_target);
        const sl = parseFloat(sig.stop_loss);
        
        if (currentPrice >= tp) {
          updateSignalStatus(sig.id, 'WON');
        } else if (currentPrice <= sl) {
          updateSignalStatus(sig.id, 'LOST');
        }
      }
    });
  }, [data?.ticker?.currentPrice, symbol, signalHistory]);

  useEffect(() => {
    if (data?.newSignalAlert) {
      setActiveSignalModal(data.newSignalAlert);
      sim.openSimTrade(data.newSignalAlert); // Auto-open mock trade
      
      // Optional: Play a sound
      try {
        const audio = new Audio('/alert.mp3');
        audio.play().catch(e => {}); // Ignore if blocked by browser
      } catch (e) {}
    }
  }, [data?.newSignalAlert]);

  useEffect(() => {
    if (theme === "light") document.body.classList.add("light");
    else document.body.classList.remove("light");
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', next);
      return next;
    });
  };

  useEffect(() => {
    if (data?.ticker?.currentPrice) {
      const price = parseFloat(data.ticker.currentPrice);
      // Format dynamically based on price magnitude
      const formattedPrice = price < 0.1 ? price.toFixed(6) : price < 10 ? price.toFixed(4) : price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
      document.title = `${formattedPrice} | ${symbol} | Crypto Analyzer`;
    } else {
      document.title = "Crypto Analyzer - Premium Web";
    }
  }, [data?.ticker?.currentPrice, symbol]);


  const handleWatch = (selectedCoin) => {
    const coinToSet = typeof selectedCoin === 'string' ? selectedCoin : inputSymbol.trim().toUpperCase();
    setSymbol(coinToSet);
    setInputSymbol(coinToSet);
    setIsMarketModalOpen(false);

    // Update URL without page reload
    if (typeof window !== 'undefined') {
      const url = new URL(window.location);
      url.searchParams.set('coin', coinToSet);
      window.history.pushState({}, '', url);
    }
  };

  const scoreText = (score) => {
    if (score >= 6) return "STRONG";
    if (score >= 4) return "MODERATE";
    return "WEAK";
  };

  const btcStatusColor = (health) => {
    if (health >= 3) return "var(--neon-green)";
    if (health >= 1) return "var(--neon-yellow)";
    return "var(--neon-red)";
  };

  let activePlanData = data?.scoreData?.plans?.[activePlan] || null;
  const currentPrice = data?.chartData?.['15m']?.candles ? data.chartData['15m'].candles[data.chartData['15m'].candles.length - 1].close : null;

  if (activePlan === 'mytrade' && currentPrice) {
    const entryPrice = parseFloat(myEntry);
    if (!isNaN(entryPrice) && entryPrice > 0) {
      const resistance = entryPrice * 1.025; // 2.5% take profit
      const stopLoss = entryPrice * 0.98; // 2% stop loss
      const risk = entryPrice - stopLoss;
      const reward = resistance - entryPrice;
      const rrRatio = risk > 0 ? reward / risk : 0;
      const pnlPct = ((currentPrice - entryPrice) / entryPrice) * 100;
      
      activePlanData = {
        support: entryPrice,
        resistance: resistance,
        stopLoss: stopLoss,
        rrRatio: rrRatio,
        pnlPct: pnlPct,
        buyStatus: 'MY_TRADE',
        sellStatus: 'WAITING SELL'
      };
    } else {
      activePlanData = {
        support: 0, resistance: 0, stopLoss: 0, rrRatio: 0, pnlPct: 0, buyStatus: 'MY_TRADE', sellStatus: 'WAITING SELL'
      };
    }
  }

  if (activePlan === 'geminiai' && currentPrice) {
    if (geminiTargets) {
      const risk = currentPrice - geminiTargets.stopLoss;
      const reward = geminiTargets.resistance - currentPrice;
      const rrRatio = risk > 0 ? reward / risk : 0;
      const distSupport = ((currentPrice - geminiTargets.support) / geminiTargets.support) * 100;
      const distResist = ((geminiTargets.resistance - currentPrice) / currentPrice) * 100;
      
      activePlanData = {
        support: geminiTargets.support,
        resistance: geminiTargets.resistance,
        stopLoss: geminiTargets.stopLoss,
        rrRatio: rrRatio,
        distanceToSupport: distSupport,
        distanceToResistance: distResist,
        buyStatus: currentPrice <= geminiTargets.support * 1.001 ? "BUY ACTIVE" : "WAITING SUPPORT",
        sellStatus: currentPrice <= geminiTargets.support * 1.001 ? "WAITING SELL" : "WAITING BUY"
      };
    } else {
      activePlanData = null; // We need to fetch
    }
  }

  return (
    <div className="dashboard-layout">
      {/* Header */}
      <header className="header">
        <div className="logo-area">
          <Activity className="logo-icon pulse" size={28} />
          <h1>Crypto <span>Analyzer Web</span></h1>
        </div>
        <div className="pair-selector" style={{display: 'flex', gap: '8px'}}>
          <button 
            onClick={() => setIsMarketModalOpen(true)} 
            className="btn" 
            style={{background:'var(--bg-secondary)', color:'var(--text-primary)', padding: '8px 12px'}}
          >
            <List size={20} /> <span className="hide-mobile">Markets</span>
          </button>
          <input 
            type="text" 
            list="coin-options"
            value={inputSymbol} 
            onChange={e => {
              setInputSymbol(e.target.value.toUpperCase());
            }} 
            placeholder="e.g. NEARUSDT"
            onKeyDown={e => e.key === 'Enter' && handleWatch()}
            style={{flex: 1, minWidth: '120px'}}
          />
          <datalist id="coin-options">
            {coinList.map(coin => <option key={coin} value={coin} />)}
          </datalist>
          <button onClick={handleWatch} className="btn primary-btn">Watch</button>
        </div>
        <div className="header-actions">
          <button 
            onClick={() => setLang(lang === 'en' ? 'si' : 'en')} 
            className="btn" 
            style={{background:'var(--bg-secondary)', color:'var(--text-primary)'}}
          >
            {lang === 'en' ? 'සිංහල' : 'EN'}
          </button>
          <button onClick={toggleTheme} className="icon-btn">
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          <Link href={`/demo?symbol=${symbol}&mode=${mode}`}>
            <button className="btn" style={{background: 'var(--color-warning)', color: '#000', fontSize: '12px'}}>
              <CheckCircle2 size={14} /> Demo Trading
            </button>
          </Link>
          
          <div className="status-badge connected">
            <div className="pulse-dot"></div>
            {t('liveApi', lang)}
          </div>
          <div style={{display: 'flex', alignItems: 'center', marginLeft: '12px'}}>
            <input 
              type="password" 
              value={geminiKey} 
              onChange={e => {
                setGeminiKey(e.target.value);
                localStorage.setItem('geminiKey', e.target.value);
              }}
              placeholder="Gemini API Key"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--card-border)',
                color: 'var(--text-primary)',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                width: '120px'
              }}
            />
          </div>
        </div>
        <div className="pulse-line"></div>
      </header>

      <div className="dashboard-grid" style={{ position: 'relative' }}>
        
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

        {/* Left Column */}
        <div className="col">
          <div className="mode-selector card">
            <button 
              className={`btn-mode ${mode === 'scalp' ? 'active' : ''}`}
              onClick={() => setMode('scalp')}
            ><Zap size={16} /> SCALP (15m)</button>
            <button 
              className={`btn-mode ${mode === 'swing' ? 'active' : ''}`}
              onClick={() => setMode('swing')}
            ><TrendingUp size={16} /> SWING (4h)</button>
          </div>

          <div className="card price-card glass">
            <div className="card-header">
              <span className="pair-name"><Bitcoin size={24} className="text-warning" /> {symbol.replace("USDT", "/USDT")}</span>
              <div className="live-indicator">
                <span className="update-tag"><Clock size={14} /> {data.loading ? "Fetching..." : data.lastUpdate}</span>
              </div>
            </div>
            <div className="price-display">
              <span className="currency-symbol">$</span>
              <span className="price-value">{data.ticker?.currentPrice ? parseFloat(data.ticker.currentPrice).toLocaleString('en-US', {minimumFractionDigits: 4, maximumFractionDigits: 4}) : "0.0000"}</span>
            </div>
            <div className="price-stats">
              <div className="stat-col">
                <span className="stat-lbl">24h High</span>
                <span className="stat-val" style={{color: '#a4ffd4'}}>${parseFloat(data.ticker?.highPrice || 0).toLocaleString('en-US', {minimumFractionDigits: 4, maximumFractionDigits: 4})}</span>
              </div>
              <div className="stat-col">
                <span className="stat-lbl">24h Low</span>
                <span className="stat-val" style={{color: '#ffa4a4'}}>${parseFloat(data.ticker?.lowPrice || 0).toLocaleString('en-US', {minimumFractionDigits: 4, maximumFractionDigits: 4})}</span>
              </div>
              <div className="stat-col">
                <span className="stat-lbl">Volume</span>
                <span className="stat-val">{parseFloat(data.ticker?.volume || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
                  <div className="card checklist-card glass">
            <h3 className="section-title"><CheckCircle2 size={16} /> Entry Setup Confirmation</h3>
            <ul className="checklist-items">
              {activePlan === 'traditional' ? (
                <>
                  <li className={`chk-item ${activePlanData?.conditions?.discountPrice ? 'met' : ''}`}>
                    {activePlanData?.conditions?.discountPrice ? <CheckCircle2 className="chk-icon" /> : <XCircle className="chk-icon" />} Discount Price (Live &lt; EMA 25)
                  </li>
                  <li className={`chk-item ${activePlanData?.conditions?.oversold ? 'met' : ''}`}>
                    {activePlanData?.conditions?.oversold ? <CheckCircle2 className="chk-icon" /> : <XCircle className="chk-icon" />} Deep Oversold (Prev RSI &lt; 35)
                  </li>
                  <li className={`chk-item ${activePlanData?.conditions?.rsiBendingUp ? 'met' : ''}`}>
                    {activePlanData?.conditions?.rsiBendingUp ? <CheckCircle2 className="chk-icon" /> : <XCircle className="chk-icon" />} Momentum Shift (RSI Bending Up)
                  </li>
                  <li className={`chk-item ${activePlanData?.conditions?.greenCandle ? 'met' : ''}`}>
                    {activePlanData?.conditions?.greenCandle ? <CheckCircle2 className="chk-icon" /> : <XCircle className="chk-icon" />} Buyers Entered (Green Candle)
                  </li>
                </>
              ) : (
                <>
                  <li className={`chk-item ${data.scoreData?.checks.support ? 'met' : ''}`}>
                    {data.scoreData?.checks.support ? <CheckCircle2 className="chk-icon" /> : <XCircle className="chk-icon" />} Price near Support Zone
                  </li>
                  <li className={`chk-item ${data.scoreData?.checks.rsi ? 'met' : ''}`}>
                    {data.scoreData?.checks.rsi ? <CheckCircle2 className="chk-icon" /> : <XCircle className="chk-icon" />} RSI Oversold Recovery (&lt;42)
                  </li>
                  <li className={`chk-item ${data.scoreData?.checks.ema ? 'met' : ''}`}>
                    {data.scoreData?.checks.ema ? <CheckCircle2 className="chk-icon" /> : <XCircle className="chk-icon" />} EMA Golden Cross (9 &gt; 21)
                  </li>
                  <li className={`chk-item ${data.scoreData?.checks.macd ? 'met' : ''}`}>
                    {data.scoreData?.checks.macd ? <CheckCircle2 className="chk-icon" /> : <XCircle className="chk-icon" />} MACD Bullish Crossover
                  </li>
                  <li className={`chk-item ${data.scoreData?.checks.volume ? 'met' : ''}`}>
                    {data.scoreData?.checks.volume ? <CheckCircle2 className="chk-icon" /> : <XCircle className="chk-icon" />} Volume Spike (&gt;1.5x avg)
                  </li>
                </>
              )}
            </ul>
          </div>

          <div className="card checklist-card glass" style={{ marginTop: '16px', padding: '16px' }}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
              <h3 className="section-title" style={{ fontSize: '13px', margin: 0 }}><Activity size={16} /> Analysis Reasoning</h3>
              <Link 
                href={`/analyst?coin=${symbol}`}
                className="btn primary-btn"
                style={{padding: '4px 8px', fontSize: '11px', minHeight: '24px', background: 'var(--neon-purple)', color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center'}}
              >
                <Zap size={12} style={{marginRight: '4px'}} />
                AI Report
              </Link>
            </div>
            
            {/* We no longer render geminiReport here inline. It's rendered in a Modal at the bottom of the page. */}
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', listStyleType: 'none', padding: 0, margin: 0 }}>
                {data.scoreData?.analysisLog?.length > 0 ? (
                  data.scoreData.analysisLog.map((log, i) => (
                    <li key={i} style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                      <span style={{ color: log.includes('unsafe') || log.includes('Bearish') ? 'var(--color-danger)' : 'var(--color-success)', marginTop: '2px' }}>
                        {log.includes('unsafe') || log.includes('Bearish') ? '❌' : '✅'}
                      </span> {log}
                    </li>
                  ))
                ) : (
                  <li style={{ color: 'var(--text-muted)' }}>Waiting for clear signals...</li>
                )}
              </ul>
          </div>
        </div>

        {/* Center Column */}
        <div className="col" style={{ flex: 1.5 }}>
          <div className="card glass" style={{ padding: '16px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 className="section-title" style={{margin: 0}}><LineChart size={16} /> CHART & LEVELS</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['15m', '1h', '4h'].map(tf => (
                  <button 
                    key={tf}
                    className={`btn ${chartTimeframe === tf ? 'primary-btn' : ''}`}
                    style={{ 
                      padding: '4px 12px', 
                      fontSize: '11px', 
                      minHeight: '24px',
                      background: chartTimeframe !== tf ? 'var(--bg-secondary)' : undefined, 
                      color: chartTimeframe !== tf ? 'var(--text-primary)' : undefined,
                      border: chartTimeframe !== tf ? '1px solid var(--card-border)' : 'none'
                    }}
                    onClick={() => setChartTimeframe(tf)}
                  >
                    {tf.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <TradingChart data={data.chartData ? data.chartData[chartTimeframe] : null} targets={activePlanData} theme={theme} />
          </div>

          <div style={{display: 'flex', gap: '16px', flexDirection: 'row', flexWrap: 'wrap'}}>
            <div className="card score-card glass" style={{flex: 1}}>
              <div className="score-header">
                <span className="section-title"><BarChart2 size={16} /> Signal Confluence Score</span>
                <div className="score-badge-wrap">
                  <span className="score-value">{data.scoreData?.score || 0}</span>
                  <span className="score-max">/8</span>
                </div>
              </div>
              <div className="score-bar-wrap">
                <div 
                  className="score-bar-fill" 
                  style={{
                    width: `${((data.scoreData?.score || 0) / 8) * 100}%`,
                    background: (data.scoreData?.score >= 6) ? 'var(--neon-green)' : (data.scoreData?.score >= 4) ? 'var(--neon-yellow)' : 'var(--neon-red)'
                  }}
                ></div>
              </div>
              <div className="score-label-row">
                <span style={{color: 'var(--neon-red)'}}>WEAK</span>
                <span style={{color: 'var(--neon-yellow)'}}>MODERATE</span>
                <span style={{color: 'var(--neon-green)'}}>STRONG</span>
              </div>
            </div>

            <div className="card glass" style={{ flex: 1, textAlign: 'center', padding: '16px 12px' }}>
              <span className="section-title" style={{justifyContent: 'center', marginBottom: '8px'}}>{t('aiRecommendation', lang)}</span>
              <div style={{
                fontSize: '24px', 
                fontWeight: '800', 
                textTransform: 'uppercase', 
                color: data.scoreData?.aiRecommendation?.status.includes('BUY') ? 'var(--color-success)' : 'var(--color-danger)'
              }}>
                {data.scoreData?.aiRecommendation?.status || "NEUTRAL"}
              </div>
              <p style={{color: 'var(--text-muted)', fontSize: '13px', marginTop: '8px'}}>
                {data.scoreData?.aiRecommendation?.reason || "Waiting for data..."}
              </p>
            </div>
          </div>



          <div className="card signals-card glass">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
              <h3 className="section-title" style={{margin: 0}}><Activity size={16} /> {t('aiTargets', lang)}</h3>
              <div className="card-tabs" style={{display: 'flex', gap: '8px', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '8px'}}>
                <button 
                  className={`btn ${activePlan === 'geminiai' ? 'primary-btn' : ''}`}
                  style={{ padding: '4px 12px', fontSize: '11px', minHeight: '24px', background: activePlan !== 'geminiai' ? 'transparent' : undefined, color: activePlan !== 'geminiai' ? 'var(--neon-purple)' : 'var(--neon-purple)', border: 'none', fontWeight: 'bold' }}
                  onClick={() => setActivePlan('geminiai')}
                >
                  GEMINI AI
                </button>
                <button 
                  className={`btn ${activePlan === 'traditional' ? 'primary-btn' : ''}`}
                  style={{ padding: '4px 12px', fontSize: '11px', minHeight: '24px', background: activePlan !== 'traditional' ? 'transparent' : undefined, color: activePlan !== 'traditional' ? 'var(--text-primary)' : undefined, border: 'none' }}
                  onClick={() => setActivePlan('traditional')}
                >
                  TRADITIONAL ⚡
                </button>
                <button 
                  className={`btn ${activePlan === 'mytrade' ? 'primary-btn' : ''}`}
                  style={{ padding: '4px 12px', fontSize: '11px', minHeight: '24px', background: activePlan !== 'mytrade' ? 'transparent' : undefined, color: activePlan !== 'mytrade' ? 'var(--text-primary)' : undefined, border: 'none' }}
                  onClick={() => setActivePlan('mytrade')}
                >
                  MY TRADE
                </button>
              </div>
            </div>
            
            <div className="target-grid">
              <div className="target-box buy-box">
                <span className="target-title">{activePlan === 'mytrade' ? 'MY ENTRY PRICE' : activePlan === 'geminiai' ? 'GEMINI ENTRY' : t('buyLimit', lang)}</span>
                <div className="target-price" style={{marginTop: activePlan === 'mytrade' ? '4px' : '0'}}>
                  {activePlan === 'mytrade' ? (
                    <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                      <input 
                        type="number" 
                        value={myEntry} 
                        onChange={e => setMyEntry(e.target.value)}
                        placeholder="e.g. 1.8420"
                        style={{
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--card-border)',
                          color: 'var(--text-primary)',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          fontSize: '18px',
                          fontWeight: '800',
                          width: '100%',
                          outline: 'none'
                        }}
                      />
                    </div>
                  ) : activePlan === 'geminiai' && !geminiTargets ? (
                    <div style={{width: '100%'}}>
                      <button 
                        onClick={async () => {
                          if (!geminiKey) return alert("Please enter your Gemini API Key in the top right corner.");
                          setIsGeneratingTargets(true);
                          setGeminiError("");
                          try {
                            const timeStr = new Date().toLocaleTimeString();
                            const tgts = await getGeminiTradeTargets(geminiKey, symbol, data, timeStr);
                            setGeminiTargets(tgts);
                          } catch(e) {
                            setGeminiError(e.message);
                            console.error("Gemini targets failed:", e);
                          } finally {
                            setIsGeneratingTargets(false);
                          }
                        }}
                        className="btn primary-btn"
                        style={{padding: '6px 12px', fontSize: '12px', width: '100%', marginTop: '4px', background: 'var(--neon-purple)', color: 'white'}}
                        disabled={isGeneratingTargets}
                      >
                        <Zap size={14} style={{marginRight: '4px'}} />
                        {isGeneratingTargets ? "Asking Gemini..." : "Ask Gemini ✨"}
                      </button>
                      {geminiError && (
                        <div style={{color: 'var(--color-danger)', fontSize: '11px', marginTop: '6px', textAlign: 'left', lineHeight: '1.4', wordBreak: 'break-all'}}>
                          ⚠️ {geminiError}
                        </div>
                      )}
                    </div>
                  ) : (
                    activePlanData?.support ? `$${parseFloat(activePlanData.support).toLocaleString('en-US', {minimumFractionDigits: 4, maximumFractionDigits: 4})}` : t('calculating', lang)
                  )}
                </div>
                <div style={{fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginTop: '8px'}}>
                  {activePlan === 'mytrade' ? (
                    activePlanData?.support > 0 ? (
                      <span style={{color: activePlanData.pnlPct >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}}>
                        {activePlanData.pnlPct >= 0 ? '📈 Profit: ' : '📉 Loss: '} 
                        {activePlanData.pnlPct > 0 ? '+' : ''}{activePlanData.pnlPct.toFixed(2)}%
                      </span>
                    ) : (
                      <span>Enter your position entry</span>
                    )
                  ) : activePlan === 'geminiai' && !geminiTargets ? (
                    <span>Powered by Gemini</span>
                  ) : (
                    <>
                      {t(activePlanData?.buyStatus === 'BUY ACTIVE' ? 'buyNow' : 'waitingSupport', lang)}
                      {activePlanData?.buyStatus !== 'BUY ACTIVE' && activePlanData?.distanceToSupport !== undefined && (
                        <span style={{color: 'var(--color-warning)', marginLeft: '4px'}}>({Math.max(0, activePlanData.distanceToSupport).toFixed(2)}% away)</span>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="target-box sell-box">
                <span className="target-title">{activePlan === 'traditional' ? 'SELL TARGETS (TP1 & TP2)' : t('sellTarget', lang)}</span>
                <div className="target-price">
                  {activePlan === 'traditional' && activePlanData?.tp1 && activePlanData?.tp2 ? (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '16px'}}>
                      <div><span style={{color: 'var(--text-muted)', fontSize: '12px'}}>TP1 (Safe):</span> ${parseFloat(activePlanData.tp1).toLocaleString('en-US', {minimumFractionDigits: 4, maximumFractionDigits: 4})}</div>
                      <div><span style={{color: 'var(--text-muted)', fontSize: '12px'}}>TP2 (Max):</span> ${parseFloat(activePlanData.tp2).toLocaleString('en-US', {minimumFractionDigits: 4, maximumFractionDigits: 4})}</div>
                    </div>
                  ) : (
                    activePlanData?.resistance ? `$${parseFloat(activePlanData.resistance).toLocaleString('en-US', {minimumFractionDigits: 4, maximumFractionDigits: 4})}` : t('calculating', lang)
                  )}
                </div>
                <div style={{fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginTop: '4px'}}>
                  {t(activePlanData?.sellStatus === 'WAITING SELL' ? 'waitingSell' : 'waitingBuy', lang)}
                  {activePlanData?.sellStatus === 'WAITING SELL' && activePlanData?.distanceToResistance !== undefined && (
                    <span style={{color: 'var(--accent-blue)', marginLeft: '4px'}}>({Math.max(0, activePlanData.distanceToResistance).toFixed(2)}% to max target)</span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Risk Reward Row */}
            <div style={{display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '8px', marginTop: '12px'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-danger)', fontSize: '13px', fontWeight: '600'}}>
                <AlertTriangle size={16} />
                <span>{t('stopLoss', lang)}:</span>
                <span>${activePlanData?.stopLoss ? parseFloat(activePlanData.stopLoss).toLocaleString('en-US', {minimumFractionDigits: 4, maximumFractionDigits: 4}) : "0.0000"}</span>
              </div>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600'}}>
                <ShieldCheck size={16} className="text-success" />
                <span>{t('rrRatio', lang)}:</span>
                <span style={{color: 'var(--color-warning)'}}>1:{activePlanData?.rrRatio?.toFixed(2) || "0.00"}</span>
              </div>
            </div>

            {activePlan === 'traditional' && activePlanData && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '12px',
                marginTop: '12px'
              }}>
                {/* Live Status Column */}
                <div style={{
                  background: 'var(--bg-secondary)',
                  padding: '12px',
                  borderRadius: '8px',
                  borderLeft: '4px solid var(--accent-blue)',
                  fontSize: '12px',
                  color: 'var(--text-primary)',
                  lineHeight: '1.5'
                }}>
                  <h4 style={{margin: '0 0 10px 0', fontSize: '11px', fontWeight: '800', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '6px'}}>
                    <Activity size={14} /> LIVE ALGORITHM STATUS
                  </h4>
                  {/* Confidence + Risk Badges */}
                  {activePlanData.confidenceLabel && (
                    <div style={{display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap'}}>
                      <span style={{
                        padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '800',
                        background: activePlanData.confidenceLabel === 'HIGH' ? 'rgba(0,255,136,0.15)' : activePlanData.confidenceLabel === 'MODERATE' ? 'rgba(255,200,0,0.15)' : 'rgba(255,60,60,0.15)',
                        color: activePlanData.confidenceLabel === 'HIGH' ? 'var(--neon-green)' : activePlanData.confidenceLabel === 'MODERATE' ? 'var(--neon-yellow, #f5c842)' : 'var(--neon-red)',
                        border: `1px solid ${activePlanData.confidenceLabel === 'HIGH' ? 'var(--neon-green)' : activePlanData.confidenceLabel === 'MODERATE' ? '#f5c842' : 'var(--neon-red)'}`,
                      }}>
                        {activePlanData.confidenceLabel === 'HIGH' ? '🟢' : activePlanData.confidenceLabel === 'MODERATE' ? '🟡' : '🔴'} CONFIDENCE: {activePlanData.confidenceLabel} ({activePlanData.confidenceScore}/10)
                      </span>
                      <span style={{
                        padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '800',
                        background: activePlanData.riskLevel === 'LOW' ? 'rgba(0,255,136,0.15)' : activePlanData.riskLevel === 'MEDIUM' ? 'rgba(255,200,0,0.15)' : 'rgba(255,60,60,0.15)',
                        color: activePlanData.riskLevel === 'LOW' ? 'var(--neon-green)' : activePlanData.riskLevel === 'MEDIUM' ? '#f5c842' : 'var(--neon-red)',
                        border: `1px solid ${activePlanData.riskLevel === 'LOW' ? 'var(--neon-green)' : activePlanData.riskLevel === 'MEDIUM' ? '#f5c842' : 'var(--neon-red)'}`,
                      }}>
                        {activePlanData.riskLevel === 'LOW' ? '🟢' : activePlanData.riskLevel === 'MEDIUM' ? '🟡' : '🔴'} RISK: {activePlanData.riskLevel}
                      </span>
                    </div>
                  )}
                  <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <span style={{color: 'var(--text-muted)', fontWeight: '600'}}>Current Price:</span>
                      <strong style={{color: 'var(--text-primary)'}}>${activePlanData.currentPrice?.toFixed(4)}</strong>
                    </div>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <span style={{color: 'var(--text-muted)', fontWeight: '600'}}>EMA (25) Level:</span>
                      <strong style={{color: activePlanData.currentPrice < activePlanData.ema25 ? 'var(--color-success)' : 'var(--color-warning)'}}>
                        ${activePlanData.ema25?.toFixed(4)} {activePlanData.currentPrice < activePlanData.ema25 ? '(✅ Valid)' : '(⏳ Wait for dip)'}
                      </strong>
                    </div>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <span style={{color: 'var(--text-muted)', fontWeight: '600'}}>RSI (14) Value:</span>
                      <strong style={{color: activePlanData.rsi < 38 ? 'var(--color-success)' : 'var(--color-warning)'}}>
                        {activePlanData.rsi?.toFixed(2)} {activePlanData.rsi < 38 ? '(✅ Oversold)' : '(⏳ Wait for < 38)'}
                      </strong>
                    </div>
                    {/* Condition Checklist */}
                    <div style={{marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)'}}>
                      <div style={{fontSize: '10px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '800', letterSpacing: '0.5px'}}>5-CONDITION GATE</div>
                      {[
                        {label: 'Price < EMA25 (Discount)', ok: activePlanData.conditions?.discountPrice},
                        {label: 'RSI Oversold & Recovering', ok: activePlanData.conditions?.oversold},
                        {label: '1H Macro Bullish (EMA9 > EMA21)', ok: activePlanData.conditions?.macroTrend},
                        {label: 'BTC Health ≥ 2/4', ok: activePlanData.conditions?.btcSafe},
                        {label: 'Green Candle (Buyers In)', ok: activePlanData.conditions?.greenCandle},
                      ].map((c, i) => (
                        <div key={i} style={{display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px', fontSize: '11px'}}>
                          <span>{c.ok ? '✅' : '❌'}</span>
                          <span style={{color: c.ok ? 'var(--text-primary)' : 'var(--text-muted)'}}>{c.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Simulation Column */}
                {activePlanData.support > 0 && (
                  <div style={{
                    background: 'var(--bg-secondary)',
                    padding: '12px',
                    borderRadius: '8px',
                    borderLeft: '4px solid var(--neon-green)',
                    fontSize: '12px',
                    color: 'var(--text-primary)',
                    lineHeight: '1.5'
                  }}>
                    <h4 style={{margin: '0 0 10px 0', fontSize: '11px', fontWeight: '800', color: 'var(--neon-green)', display: 'flex', alignItems: 'center', gap: '6px'}}>
                      💰 $100 INVESTMENT SIMULATION
                    </h4>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <span style={{color: 'var(--text-muted)', fontWeight: '600'}}>Entry:</span>
                        <strong style={{color: 'var(--text-primary)'}}>$100.00 USDT</strong>
                      </div>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <span style={{color: 'var(--text-muted)', fontWeight: '600'}}>Potential TP1 Profit:</span>
                        <strong style={{color: 'var(--color-success)'}}>
                          +${((100 / activePlanData.support) * activePlanData.tp1 - 100).toFixed(2)} 
                          <span style={{fontSize: '9px', marginLeft: '4px'}}>({(((activePlanData.tp1 - activePlanData.support) / activePlanData.support) * 100).toFixed(2)}%)</span>
                        </strong>
                      </div>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <span style={{color: 'var(--text-muted)', fontWeight: '600'}}>Potential TP2 Profit:</span>
                        <strong style={{color: 'var(--color-success)'}}>
                          +${((100 / activePlanData.support) * activePlanData.tp2 - 100).toFixed(2)}
                          <span style={{fontSize: '9px', marginLeft: '4px'}}>({(((activePlanData.tp2 - activePlanData.support) / activePlanData.support) * 100).toFixed(2)}%)</span>
                        </strong>
                      </div>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <span style={{color: 'var(--text-muted)', fontWeight: '600'}}>Max Risk (Stop Loss):</span>
                        <strong style={{color: 'var(--color-danger)'}}>
                          -${(100 - (100 / activePlanData.support) * activePlanData.stopLoss).toFixed(2)}
                          <span style={{fontSize: '9px', marginLeft: '4px'}}>(-1.50%)</span>
                        </strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activePlan === 'geminiai' && geminiTargets && (
              <div style={{
                marginTop: '16px',
                background: 'var(--bg-secondary)',
                padding: '16px',
                borderRadius: '8px',
                borderLeft: '4px solid var(--neon-purple)',
                fontSize: '13px',
                color: 'var(--text-primary)',
                lineHeight: '1.6',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <h4 style={{margin: '0 0 4px 0', fontSize: '14px', fontWeight: '800', color: 'var(--neon-purple)', display: 'flex', alignItems: 'center', gap: '6px'}}>
                  <Zap size={16} /> 100% ACCURATE AI ANALYSIS & PROJECTIONS
                </h4>
                
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                  {geminiTargets.trend && (
                    <div>
                      <strong style={{color: 'var(--neon-yellow)'}}>📈 Market Trend Analysis:</strong>
                      <div style={{color: 'var(--text-secondary)', paddingLeft: '12px', marginTop: '2px'}}>{geminiTargets.trend}</div>
                    </div>
                  )}
                  
                  {geminiTargets.btc && (
                    <div>
                      <strong style={{color: 'var(--accent-blue)'}}>🧡 BTC Market Impact:</strong>
                      <div style={{color: 'var(--text-secondary)', paddingLeft: '12px', marginTop: '2px'}}>{geminiTargets.btc}</div>
                    </div>
                  )}

                  {geminiTargets.dxyImpact && (
                    <div>
                      <strong style={{color: 'var(--color-danger)'}}>💵 Macro & DXY Impact:</strong>
                      <div style={{color: 'var(--text-secondary)', paddingLeft: '12px', marginTop: '2px'}}>{geminiTargets.dxyImpact}</div>
                    </div>
                  )}

                  {geminiTargets.session && (
                    <div>
                      <strong style={{color: 'var(--color-warning)'}}>⏰ Session & Volatility:</strong>
                      <div style={{color: 'var(--text-secondary)', paddingLeft: '12px', marginTop: '2px'}}>{geminiTargets.session}</div>
                    </div>
                  )}

                  {geminiTargets.liquidity && (
                    <div>
                      <strong style={{color: 'var(--neon-purple)'}}>💧 Liquidity & Whale Traps:</strong>
                      <div style={{color: 'var(--text-secondary)', paddingLeft: '12px', marginTop: '2px'}}>{geminiTargets.liquidity}</div>
                    </div>
                  )}
                  
                  {geminiTargets.indicators && (
                    <div>
                      <strong style={{color: 'var(--neon-green)'}}>📊 Technical Confluence:</strong>
                      <div style={{color: 'var(--text-secondary)', paddingLeft: '12px', marginTop: '2px'}}>{geminiTargets.indicators}</div>
                    </div>
                  )}
                  
                  {geminiTargets.math && (
                    <div>
                      <strong style={{color: 'var(--color-warning)'}}>🎯 Level Justification (Why Entry is ${geminiTargets.support.toFixed(4)}):</strong>
                      <div style={{color: 'var(--text-secondary)', paddingLeft: '12px', marginTop: '2px'}}>{geminiTargets.math}</div>
                    </div>
                  )}
                  
                  {geminiTargets.sellReason && (
                    <div>
                      <strong style={{color: 'var(--accent-blue)'}}>🎯 Target Justification (Why TP is ${geminiTargets.resistance.toFixed(4)}):</strong>
                      <div style={{color: 'var(--text-secondary)', paddingLeft: '12px', marginTop: '2px'}}>{geminiTargets.sellReason}</div>
                    </div>
                  )}

                  {geminiTargets.timeframe && (
                    <div>
                      <strong style={{color: 'var(--neon-green)'}}>⏱️ Estimated Timeframe:</strong>
                      <div style={{color: 'var(--text-secondary)', paddingLeft: '12px', marginTop: '2px'}}>{geminiTargets.timeframe}</div>
                    </div>
                  )}

                  {geminiTargets.pricePath && (
                    <div>
                      <strong style={{color: 'var(--neon-purple)'}}>📉 Expected Price Path & Fluctuations:</strong>
                      <div style={{color: 'var(--text-secondary)', paddingLeft: '12px', marginTop: '2px'}}>{geminiTargets.pricePath}</div>
                    </div>
                  )}
                </div>

                <div style={{
                  borderTop: '1px solid var(--card-border)',
                  paddingTop: '12px',
                  marginTop: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'rgba(168, 85, 247, 0.05)',
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px dashed rgba(168, 85, 247, 0.2)'
                }}>
                  <div style={{fontSize: '28px'}}>💰</div>
                  <div>
                    <div style={{fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)'}}>
                      SPOT TRADE PROFIT PROJECTION
                    </div>
                    <div style={{fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px'}}>
                      If you invest <strong style={{color: 'var(--text-primary)'}}>$100.00</strong> on this trade setup:
                      <br />
                      Estimated Profit: <strong style={{color: 'var(--neon-green)', fontSize: '13px'}}>${(((geminiTargets.resistance - geminiTargets.support) / geminiTargets.support) * 100).toFixed(2)}</strong> 
                      <span style={{marginLeft: '4px'}}>
                        (+{(((geminiTargets.resistance - geminiTargets.support) / geminiTargets.support) * 100).toFixed(2)}% target gain)
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{marginTop: '16px'}}>
                  <button 
                    onClick={async () => {
                      if (!geminiKey) return alert("Please enter your Gemini API Key in the top right corner.");
                      setIsGeneratingTargets(true);
                      setGeminiError("");
                      try {
                        const timeStr = new Date().toLocaleTimeString();
                        const tgts = await getGeminiTradeTargets(geminiKey, symbol, data, timeStr);
                        setGeminiTargets(tgts);
                      } catch(e) {
                        setGeminiError(e.message);
                        console.error("Gemini targets failed:", e);
                      } finally {
                        setIsGeneratingTargets(false);
                      }
                    }}
                    className="btn primary-btn"
                    style={{padding: '8px 16px', fontSize: '13px', width: '100%', background: 'var(--neon-purple)', color: 'white', fontWeight: 'bold'}}
                    disabled={isGeneratingTargets}
                  >
                    <Zap size={14} style={{marginRight: '6px'}} />
                    {isGeneratingTargets ? "Asking Gemini..." : "Ask Gemini Again 🔄"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="col">
          <div className="card glass" style={{ marginBottom: '16px' }}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
              <h3 className="section-title" style={{margin: 0}}><Activity size={16} /> {t('signalAccuracy', lang)}</h3>
              <div style={{fontSize: '14px', fontWeight: '800', color: historyStats.winRate >= 50 ? 'var(--color-success)' : 'var(--color-warning)'}}>
                {historyStats.winRate}% WR
              </div>
            </div>
            <div style={{display: 'flex', gap: '12px'}}>
              <div style={{flex: 1, background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', textAlign: 'center'}}>
                <div style={{fontSize: '24px', fontWeight: '700', color: 'var(--color-success)'}}>{historyStats.wins}</div>
                <div style={{fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600'}}>{t('wins', lang)}</div>
              </div>
              <div style={{flex: 1, background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', textAlign: 'center'}}>
                <div style={{fontSize: '24px', fontWeight: '700', color: 'var(--color-danger)'}}>{historyStats.losses}</div>
                <div style={{fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600'}}>{t('losses', lang)}</div>
              </div>
              <div style={{flex: 1, background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', textAlign: 'center'}}>
                <div style={{fontSize: '24px', fontWeight: '700', color: 'var(--accent-blue)'}}>{historyStats.pending}</div>
                <div style={{fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600'}}>{t('pending', lang)}</div>
              </div>
            </div>
            <button 
              className="btn primary-btn" 
              style={{width: '100%', marginTop: '12px', padding: '8px', fontSize: '12px'}}
              onClick={() => setIsHistoryModalOpen(true)}
            >
              <List size={14} style={{marginRight: '6px'}} /> View Signal History
            </button>
          </div>

          <div className="card btc-card glass">
            <div className="btc-row">
              <span className="btc-label"><Bitcoin size={20} /> {t('btcMarket', lang)}</span>
              <span className="btc-price">${data.btcData?.price?.toLocaleString() || "—"}</span>
              <span 
                className="btc-status-badge" 
                style={{
                  background: 'var(--bg-primary)',
                  color: btcStatusColor(data.btcData?.health || 0),
                  border: `1px solid ${btcStatusColor(data.btcData?.health || 0)}`
                }}
              >
                {data.btcData?.health >= 3 ? t('strongBull', lang) : data.btcData?.health >= 1 ? t('bullish', lang) : t('bearish', lang)}
              </span>
            </div>
          </div>

          <div className="card indicators-card glass">
            <h3 className="section-title"><LineChart size={16} /> {t('techIndicators', lang)}</h3>
            
            <div className="indicator-row" style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', width: '100%'}}>
                <span className="ind-name" style={{fontSize: '13px', fontWeight: '700'}}>RSI (14)</span>
                <span style={{fontSize: '11px', fontWeight: '800', color: (data.indicators?.rsiVal > 60) ? 'var(--color-danger)' : (data.indicators?.rsiVal < 40) ? 'var(--color-success)' : 'var(--color-warning)'}}>
                  {(data.indicators?.rsiVal > 60) ? 'OVERBOUGHT' : (data.indicators?.rsiVal < 40) ? 'OVERSOLD' : 'NEUTRAL'}
                </span>
              </div>
              <div style={{width: '100%', height: '6px', background: 'var(--bg-primary)', borderRadius: '4px', position: 'relative'}}>
                <div style={{position: 'absolute', left: '30%', width: '1px', height: '10px', background: 'var(--text-muted)', top: '-2px'}}></div>
                <div style={{position: 'absolute', left: '70%', width: '1px', height: '10px', background: 'var(--text-muted)', top: '-2px'}}></div>
                <div style={{
                  position: 'absolute', 
                  left: `${Math.min(Math.max(data.indicators?.rsiVal || 0, 0), 100)}%`, 
                  width: '10px', height: '10px', background: 'var(--accent-blue)', borderRadius: '50%', top: '-2px', transform: 'translateX(-50%)'
                }}></div>
              </div>
              <span className="ind-value" style={{fontSize: '12px'}}>{data.indicators?.rsiVal?.toFixed(1) || "—"}</span>
            </div>

            <div className="indicator-row" style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', width: '100%'}}>
                <span className="ind-name" style={{fontSize: '13px', fontWeight: '700'}}>EMA Crossover</span>
                <span style={{fontSize: '11px', fontWeight: '800', color: (data.indicators?.ema9 > data.indicators?.ema21) ? 'var(--color-success)' : 'var(--color-danger)'}}>
                  {(data.indicators?.ema9 > data.indicators?.ema21) ? 'BULLISH' : 'BEARISH'}
                </span>
              </div>
              <div style={{display: 'flex', gap: '8px', width: '100%'}}>
                <div style={{flex: 1, background: 'var(--bg-primary)', padding: '4px', borderRadius: '4px', textAlign: 'center', fontSize: '11px'}}>
                  <span style={{color: 'var(--text-muted)'}}>EMA9:</span> <strong style={{color: 'var(--text-primary)'}}>{data.indicators?.ema9?.toFixed(4) || "—"}</strong>
                </div>
                <div style={{flex: 1, background: 'var(--bg-primary)', padding: '4px', borderRadius: '4px', textAlign: 'center', fontSize: '11px'}}>
                  <span style={{color: 'var(--text-muted)'}}>EMA21:</span> <strong style={{color: 'var(--text-primary)'}}>{data.indicators?.ema21?.toFixed(4) || "—"}</strong>
                </div>
                <div style={{flex: 1, background: 'var(--bg-primary)', padding: '4px', borderRadius: '4px', textAlign: 'center', fontSize: '11px'}}>
                  <span style={{color: 'var(--text-muted)'}}>EMA50:</span> <strong style={{color: 'var(--text-primary)'}}>{data.indicators?.ema50_1h?.toFixed(4) || "—"}</strong>
                </div>
              </div>
            </div>

            <div className="indicator-row" style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', width: '100%'}}>
                <span className="ind-name" style={{fontSize: '13px', fontWeight: '700'}}>MACD</span>
                <span style={{fontSize: '11px', fontWeight: '800', color: (data.indicators?.macd > data.indicators?.signal) ? 'var(--color-success)' : 'var(--color-danger)'}}>
                  {(data.indicators?.macd > data.indicators?.signal) ? 'BULLISH' : 'BEARISH'}
                </span>
              </div>
              <div style={{display: 'flex', gap: '8px', width: '100%'}}>
                <div style={{flex: 1, background: 'var(--bg-primary)', padding: '4px', borderRadius: '4px', textAlign: 'center', fontSize: '11px'}}>
                  <span style={{color: 'var(--text-muted)'}}>MACD:</span> <strong style={{color: 'var(--text-primary)'}}>{data.indicators?.macd?.toFixed(4) || "—"}</strong>
                </div>
                <div style={{flex: 1, background: 'var(--bg-primary)', padding: '4px', borderRadius: '4px', textAlign: 'center', fontSize: '11px'}}>
                  <span style={{color: 'var(--text-muted)'}}>Signal:</span> <strong style={{color: 'var(--text-primary)'}}>{data.indicators?.signal?.toFixed(4) || "—"}</strong>
                </div>
              </div>
            </div>
            
            <div className="indicator-row" style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', width: '100%'}}>
                <span className="ind-name" style={{fontSize: '13px', fontWeight: '700'}}>Volume vs Avg</span>
                <span style={{fontSize: '11px', fontWeight: '800', color: (data.indicators?.volCurrent > data.indicators?.volAvg * 1.5) ? 'var(--color-success)' : 'var(--color-warning)'}}>
                  {(data.indicators?.volCurrent > data.indicators?.volAvg * 1.5) ? 'HIGH' : 'NORMAL'}
                </span>
              </div>
              <div style={{display: 'flex', gap: '8px', width: '100%'}}>
                <div style={{flex: 1, background: 'var(--bg-primary)', padding: '4px', borderRadius: '4px', textAlign: 'center', fontSize: '11px'}}>
                  <span style={{color: 'var(--text-muted)'}}>Current:</span> <strong style={{color: 'var(--text-primary)'}}>{(data.indicators?.volCurrent/1000).toFixed(1) || "0"}K</strong>
                </div>
                <div style={{flex: 1, background: 'var(--bg-primary)', padding: '4px', borderRadius: '4px', textAlign: 'center', fontSize: '11px'}}>
                  <span style={{color: 'var(--text-muted)'}}>Avg(20):</span> <strong style={{color: 'var(--text-primary)'}}>{(data.indicators?.volAvg/1000).toFixed(1) || "0"}K</strong>
                </div>
              </div>
            </div>
            
            <div className="indicator-row" style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', width: '100%'}}>
                <span className="ind-name" style={{fontSize: '13px', fontWeight: '700'}}>Candle Pattern</span>
                <span style={{fontSize: '11px', fontWeight: '800', color: data.indicators?.pattern ? 'var(--color-success)' : 'var(--color-warning)'}}>
                  {data.indicators?.pattern ? 'DETECTED' : 'SCANNING...'}
                </span>
              </div>
              <div style={{width: '100%', background: 'var(--bg-primary)', padding: '8px', borderRadius: '4px', textAlign: 'center', fontSize: '12px', fontWeight: '600'}}>
                Pattern: {data.indicators?.pattern || "None"}
              </div>
            </div>

          </div>
        </div>
        </div>

      {/* Market Modal */}
      {isMarketModalOpen && (
        <div className="modal-overlay" onClick={() => setIsMarketModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="section-title" style={{margin: 0}}><List size={18} /> Browse Markets</h3>
              <button className="icon-btn" style={{width: '32px', height: '32px'}} onClick={() => setIsMarketModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{padding: 0}}>
              <div className="card market-list-card" style={{border: 'none', boxShadow: 'none', padding: '16px', height: '60vh'}}>
                <div className="market-tabs">
                  <button 
                    className={`market-tab ${marketTab === 'all' ? 'active' : ''}`}
                    onClick={() => setMarketTab('all')}
                  >All Markets</button>
                  <button 
                    className={`market-tab ${marketTab === 'fav' ? 'active' : ''}`}
                    onClick={() => setMarketTab('fav')}
                  >Favorites</button>
                </div>
                <input 
                  type="text"
                  className="market-search"
                  placeholder="Search coin..."
                  value={marketSearch}
                  onChange={e => setMarketSearch(e.target.value)}
                />
                <div className="market-items">
                  {displayedCoins.map(c => (
                    <div 
                      key={c} 
                      className={`market-item ${symbol === c ? 'active' : ''}`}
                      onClick={() => handleWatch(c)}
                    >
                      <span className="market-symbol">{c}</span>
                      <button 
                        className={`market-fav-btn ${favorites.includes(c) ? 'is-fav' : ''}`}
                        onClick={(e) => toggleFavorite(e, c)}
                      >
                        <Star size={16} fill={favorites.includes(c) ? "currentColor" : "none"} />
                      </button>
                    </div>
                  ))}
                  {displayedCoins.length === 0 && (
                    <div style={{textAlign:'center', color:'var(--text-muted)', fontSize:'12px', marginTop:'20px'}}>
                      No coins found.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {isHistoryModalOpen && (
        <div className="modal-overlay" onClick={() => setIsHistoryModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth: '800px', width: '90%'}}>
            <div className="modal-header">
              <h3 className="section-title" style={{margin: 0}}><Activity size={18} /> Signal History & Accuracy Monitor</h3>
              <button className="icon-btn" style={{width: '32px', height: '32px'}} onClick={() => setIsHistoryModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{padding: '16px'}}>
              <div style={{display: 'flex', gap: '16px', marginBottom: '20px'}}>
                <div style={{flex: 1, background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', textAlign: 'center'}}>
                  <div style={{fontSize: '32px', fontWeight: '800', color: historyStats.winRate >= 50 ? 'var(--color-success)' : 'var(--color-warning)'}}>{historyStats.winRate}%</div>
                  <div style={{fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', marginTop: '4px'}}>OVERALL WIN RATE</div>
                </div>
                <div style={{flex: 2, display: 'flex', gap: '12px'}}>
                  <div style={{flex: 1, background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
                    <div style={{fontSize: '20px', fontWeight: '700', color: 'var(--color-success)'}}>{historyStats.wins}</div>
                    <div style={{fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600'}}>WINS</div>
                  </div>
                  <div style={{flex: 1, background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', textAlign: 'center'}}>
                  <div style={{fontSize: '24px', fontWeight: '800', color: 'var(--color-danger)'}}>{historyStats.losses}</div>
                  <div style={{fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', marginTop: '4px'}}>LOSSES</div>
                </div>
                <div style={{flex: 1, background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', textAlign: 'center'}}>
                  <div style={{fontSize: '24px', fontWeight: '800', color: 'var(--accent-blue)'}}>{historyStats.pending}</div>
                  <div style={{fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', marginTop: '4px'}}>PENDING</div>
                </div>
                <div style={{flex: 1.2, background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', textAlign: 'center'}}>
                  <div style={{fontSize: '24px', fontWeight: '800', color: historyStats.netPnlPercent >= 0 ? 'var(--neon-green)' : 'var(--neon-red)'}}>
                    {historyStats.netPnlPercent >= 0 ? '+' : ''}{historyStats.netPnlPercent}%
                  </div>
                  <div style={{fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', marginTop: '4px'}}>NET P&L (CLOSED)</div>
                </div>
                </div>
              </div>
              
              <div style={{overflowY: 'auto', maxHeight: '50vh', paddingRight: '8px'}}>
                {signalHistory.length === 0 ? (
                  <div style={{textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0'}}>
                    No signal history found.
                  </div>
                ) : (
                  <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                    {signalHistory.map(sig => (
                      <div key={sig.id} style={{background: 'var(--bg-secondary)', borderRadius: '8px', padding: '12px', borderLeft: `4px solid ${sig.status === 'WON' ? 'var(--color-success)' : sig.status === 'LOST' ? 'var(--color-danger)' : 'var(--accent-blue)'}`}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                            <strong style={{fontSize: '16px', color: 'var(--text-primary)'}}>{sig.pair}</strong>
                            <span style={{background: 'var(--bg-primary)', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)'}}>{sig.mode}</span>
                          </div>
                          <div style={{fontSize: '11px', color: 'var(--text-muted)'}}>
                            {new Date(sig.created_at).toLocaleString()}
                          </div>
                        </div>
                        
                        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '12px', flexWrap: 'wrap', gap: '8px'}}>
                          <div><span style={{color: 'var(--text-muted)'}}>Entry:</span> <strong style={{color: 'var(--text-primary)'}}>${parseFloat(sig.current_price).toFixed(4)}</strong></div>
                          {getSignalCurrentPrice(sig) !== null && (
                            <div><span style={{color: 'var(--text-muted)'}}>Live:</span> <strong style={{color: 'var(--accent-blue)'}}>${getSignalCurrentPrice(sig).toFixed(4)}</strong></div>
                          )}
                          <div><span style={{color: 'var(--text-muted)'}}>Target:</span> <strong style={{color: 'var(--color-success)'}}>${parseFloat(sig.sell_target).toFixed(4)}</strong></div>
                          <div><span style={{color: 'var(--text-muted)'}}>Stop:</span> <strong style={{color: 'var(--color-danger)'}}>${parseFloat(sig.stop_loss).toFixed(4)}</strong></div>
                          <div><span style={{color: 'var(--text-muted)'}}>RR:</span> <strong style={{color: 'var(--color-warning)'}}>1:{parseFloat(sig.rr_ratio).toFixed(2)}</strong></div>
                        </div>
                        
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--card-border)', paddingTop: '8px'}}>
                          <div style={{fontSize: '11px', fontWeight: 'bold', color: sig.status === 'WON' ? 'var(--color-success)' : sig.status === 'LOST' ? 'var(--color-danger)' : 'var(--accent-blue)'}}>
                            STATUS: {sig.status} 
                            {getSignalPnL(sig) !== null && (
                              <span style={{marginLeft: '8px', color: getSignalPnL(sig) >= 0 ? 'var(--neon-green)' : 'var(--neon-red)'}}>
                                ({getSignalPnL(sig) >= 0 ? '+' : ''}{getSignalPnL(sig).toFixed(2)}%)
                              </span>
                            )}
                          </div>
                          
                          <div style={{display: 'flex', gap: '8px'}}>
                            <button 
                              onClick={() => updateSignalStatus(sig.id, 'WON')}
                              style={{background: sig.status === 'WON' ? 'var(--color-success)' : 'transparent', color: sig.status === 'WON' ? '#000' : 'var(--color-success)', border: '1px solid var(--color-success)', padding: '4px 12px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold'}}
                            >
                              WON
                            </button>
                            <button 
                              onClick={() => updateSignalStatus(sig.id, 'LOST')}
                              style={{background: sig.status === 'LOST' ? 'var(--color-danger)' : 'transparent', color: sig.status === 'LOST' ? '#000' : 'var(--color-danger)', border: '1px solid var(--color-danger)', padding: '4px 12px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold'}}
                            >
                              LOST
                            </button>
                            <button 
                              onClick={() => updateSignalStatus(sig.id, 'PENDING')}
                              style={{background: sig.status === 'PENDING' ? 'var(--accent-blue)' : 'transparent', color: sig.status === 'PENDING' ? '#000' : 'var(--accent-blue)', border: '1px solid var(--accent-blue)', padding: '4px 12px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold'}}
                            >
                              PENDING
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
        </div>
      )}

      {/* Auto-Trigger Signal Modal */}
      {activeSignalModal && (
        <div className="modal-overlay" style={{zIndex: 9999}} onClick={() => setActiveSignalModal(null)}>
          <div className="modal-content glass" onClick={e => e.stopPropagation()} style={{maxWidth: '400px', width: '90%', border: '2px solid var(--neon-green)', background: 'var(--bg-primary)', padding: 0}}>
            <div className="modal-header" style={{background: 'var(--neon-green)', color: '#000', padding: '16px', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h3 style={{margin: 0, fontSize: '16px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px'}}>
                <Activity size={20} /> NEW BUY SIGNAL DETECTED!
              </h3>
              <button className="icon-btn" style={{width: '28px', height: '28px', color: '#000'}} onClick={() => setActiveSignalModal(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{padding: '24px'}}>
              <div style={{textAlign: 'center', marginBottom: '20px'}}>
                <div style={{fontSize: '36px', fontWeight: '900', color: 'var(--text-primary)'}}>{activeSignalModal.pair}</div>
                <div style={{fontSize: '14px', color: 'var(--color-success)', fontWeight: '700', marginTop: '4px'}}>Traditional Mode Setup Active</div>
              </div>
              
              <div style={{display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <span style={{color: 'var(--text-muted)', fontWeight: '600'}}>Entry Price:</span>
                  <strong style={{color: 'var(--text-primary)', fontSize: '18px'}}>${activeSignalModal.entryPrice?.toFixed(4)}</strong>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <span style={{color: 'var(--text-muted)', fontWeight: '600'}}>TP1 (Safe):</span>
                  <strong style={{color: 'var(--color-success)', fontSize: '18px'}}>${(activeSignalModal.tp1 || activeSignalModal.targets?.sellTarget)?.toFixed(4)}</strong>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <span style={{color: 'var(--text-muted)', fontWeight: '600'}}>TP2 (Max):</span>
                  <strong style={{color: 'var(--color-success)', fontSize: '18px'}}>${(activeSignalModal.tp2 || activeSignalModal.targets?.sellTarget)?.toFixed(4)}</strong>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--card-border)', paddingTop: '12px'}}>
                  <span style={{color: 'var(--text-muted)', fontWeight: '600'}}>Stop Loss:</span>
                  <strong style={{color: 'var(--color-danger)', fontSize: '18px'}}>${activeSignalModal.targets?.stopLoss?.toFixed(4)}</strong>
                </div>
              </div>

              <div style={{marginTop: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600'}}>
                ✅ This signal has been automatically saved to your Database.
              </div>

              <button 
                className="btn primary-btn" 
                style={{width: '100%', marginTop: '20px', padding: '14px', fontSize: '16px', background: 'var(--neon-green)', color: '#000', fontWeight: '800'}}
                onClick={() => setActiveSignalModal(null)}
              >
                ACKNOWLEDGE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Dock Menu */}
      <nav className="mobile-dock">
        <Link href="/" className="dock-item active">
          <div className="dock-icon-wrapper">
            <HomeIcon size={20} />
          </div>
          <span>Home</span>
        </Link>
        <Link href={`/demo?symbol=${symbol}&mode=${mode}`} className="dock-item">
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
