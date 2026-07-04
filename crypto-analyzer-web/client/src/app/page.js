"use client";

import { useState, useEffect, useRef } from "react";
import { useBinanceData, performCalculations } from "../hooks/useBinanceData";
import { useSimulation } from "../hooks/useSimulation";
import { fetchAllUSDTPairs, fetchTickerData, fetchKlines } from "../utils/binance";
import { generateGeminiReport, getGeminiTradeTargets } from "../utils/gemini";
import { t } from "../utils/translations";
import { 
  Activity, BarChart2, Bitcoin, CheckCircle2, ChevronRight, 
  Clock, LineChart, Moon, Sun, TrendingUp, XCircle, Zap, Star, AlertTriangle, ShieldCheck, List, X, Home as HomeIcon, Settings, Sparkles, Loader
} from "lucide-react";
import TradingChart from "../components/TradingChart";
import SettingsModal from "../components/SettingsModal";
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { verifySignalWithKlines, parseDateUTC } from '../utils/signalValidator';

export default function Home() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);
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
  const [mode, setMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('mode') || "scalp";
    }
    return "scalp";
  }); // 'scalp' | 'swing'
  const [riskMode, setRiskMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('risk') || "safe";
    }
    return "safe";
  }); // 'safe' | 'aggressive'
  const [theme, setTheme] = useState("dark");
  const [lang, setLang] = useState("en");
  const [chartTimeframe, setChartTimeframe] = useState("15m");
  const [activePlan, setActivePlan] = useState("traditional"); // 'traditional' | 'geminiai' | 'mytrade'
  const [myEntry, setMyEntry] = useState("");
  const [isMarketModalOpen, setIsMarketModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [coinList, setCoinList] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [marketTab, setMarketTab] = useState("all"); // 'all' | 'fav'
  const [marketSearch, setMarketSearch] = useState("");
  const [geminiTargets, setGeminiTargets] = useState(null);
  const [isGeneratingTargets, setIsGeneratingTargets] = useState(false);
  const [geminiError, setGeminiError] = useState("");
  const [activeSignalModal, setActiveSignalModal] = useState(null);
  const [signalHistory, setSignalHistory] = useState([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyTab, setHistoryTab] = useState('all'); // 'all' | 'current'
  const [historyStats, setHistoryStats] = useState({ wins: 0, losses: 0, pending: 0, winRate: 0, netPnlPercent: 0, netPnlUSDT: 0 });
  const [allLivePrices, setAllLivePrices] = useState({});
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

  // Automatically recalculate stats when history changes, tab switches, accuracy target or prices change
  useEffect(() => {
    calculateStats(signalHistory, historyTab === 'current' ? symbol : null);
  }, [signalHistory, historyTab, symbol, accuracyTarget, allLivePrices]);

  const calculateStats = (signals, filterPair = null) => {
    const filtered = filterPair ? signals.filter(s => s.pair === filterPair) : signals;
    let w = 0, l = 0, p = 0, o = 0;
    let netPnlPercent = 0;
    let tp1PnlPercent = 0;
    let tp2PnlPercent = 0;
    const SIM_USDT = 100; // $100 simulation base

    filtered.forEach(s => {
      const entry = parseFloat(s.current_price);
      const tp1 = parseFloat(s.tp1);
      const tp2 = parseFloat(s.sell_target);
      const sl = parseFloat(s.stop_loss);
      const live = allLivePrices[s.pair] ? parseFloat(allLivePrices[s.pair]) : entry;

      const hasHitTp1 = s.tp1_hit_at !== null || s.status === 'PARTIAL WIN' || s.status === 'WON';
      const hasHitTp2 = s.tp2_hit_at !== null || s.status === 'WON';

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
    setHistoryStats({
      wins: w,
      losses: l,
      pending: p,
      open: o,
      winRate: total > 0 ? ((w / total) * 100).toFixed(1) : 0,
      netPnlPercent: netPnlPercent.toFixed(2),
      tp1PnlPercent: tp1PnlPercent.toFixed(2),
      tp2PnlPercent: tp2PnlPercent.toFixed(2),
      netPnlUSDT: netPnlUSDT.toFixed(2),
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
    if (sig.status === 'WON' || sig.status === 'TP2 HIT') {
      current = parseFloat(sig.sell_target);
    } else if (sig.status === 'LOST') {
      current = parseFloat(sig.stop_loss);
    } else if (allLivePrices[sig.pair]) {
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
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setTheme(savedTheme);
    }
    fetchSignals();

    // URL checking is now handled by useState lazy initialization
    // to prevent fetching BTC data before the URL parameter is read.
  }, []);

  useEffect(() => {
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
    const interval = setInterval(fetchPrices, 10000);
    return () => clearInterval(interval);
  }, []);

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

  const { 
    data, activeTrade, setActiveTrade, runAnalysis, savePredictionSnapshot, 
    modelWeights, activePattern, resetPatternLock 
  } = useBinanceData(symbol, mode, riskMode);
  const sim = useSimulation();

  useEffect(() => {
    if (data?.ticker?.currentPrice) {
      sim.updateSimLivePrice(symbol, parseFloat(data.ticker.currentPrice));
    }
  }, [data?.ticker?.currentPrice, symbol]);

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

    // Run once on load after a short delay to let live prices settle
    const initialTimer = setTimeout(validateWithKlines, 5000);
    // Run every 60 seconds
    const interval = setInterval(validateWithKlines, 60000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [signalHistory]);

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

  // Background scanner for favorite coins list
  const backgroundLastSignalTimes = useRef({});

  useEffect(() => {
    if (!favorites || favorites.length === 0) return;

    let index = 0;
    const scanNextFavorite = async () => {
      const favSymbol = favorites[index];
      index = (index + 1) % favorites.length;

      // Skip scanning the active coin to avoid duplicate api requests and double triggers
      if (favSymbol === symbol) return;

      try {
        const ticker = await fetchTickerData(favSymbol);
        if (!ticker) return;

        const candles15m = await fetchKlines(favSymbol, '15m', 200);
        const candles1h = await fetchKlines(favSymbol, '1h', 100);
        const candles4h = await fetchKlines(favSymbol, '4h', 100);
        const btcCandles15m = await fetchKlines('BTCUSDT', '15m', 50);
        const btcCandles1h = await fetchKlines('BTCUSDT', '1h', 50);

        if (!candles15m || !candles1h || !candles4h || !btcCandles15m || !btcCandles1h) return;

        const results = performCalculations({
          symbol: favSymbol,
          mode: mode, 
          riskMode: riskMode, 
          ticker,
          candles15m,
          candles1h,
          candles4h,
          btcCandles15m,
          btcCandles1h
        });

        if (results.isSetupActive && results.hasMinRR) {
          const now = Date.now();
          const lastTime = backgroundLastSignalTimes.current[favSymbol] || 0;
          if (now - lastTime > 900000) { // 15 min cooldown
            backgroundLastSignalTimes.current[favSymbol] = now;
            
            // Save to DB
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? `http://${window.location.hostname}/trading-bots/crypto-analyzer-web/server/public` : 'http://localhost/trading-bots/crypto-analyzer-web/server/public');
            const saveRes = await fetch(`${apiUrl}/api/signals`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                pair: results.autoSignal.pair,
                mode: results.autoSignal.mode,
                risk_mode: results.autoSignal.riskMode,
                current_price: results.autoSignal.entryPrice,
                buy_target: results.autoSignal.targets.buyLimit,
                sell_target: results.autoSignal.targets.tp2,
                stop_loss: results.autoSignal.targets.stopLoss,
                rr_ratio: parseFloat(results.autoSignal.targets.rrRatio),
                score: results.autoSignal.confidenceScore,
                status: results.autoSignal.status,
                confidence_level: results.autoSignal.confidenceLabel,
                risk_level: results.autoSignal.riskLevel
              })
            });

            if (saveRes.ok) {
              const saved = await saveRes.json();
              const fullSignalObj = { ...results.autoSignal, id: saved.signal.id };
              
              // Trigger Alert Modal & Sound
              setActiveSignalModal(fullSignalObj);
              sim.openSimTrade(fullSignalObj);
              try {
                const audio = new Audio('/alert.mp3');
                audio.play().catch(e => {});
              } catch (e) {}

              // Refresh UI history
              fetchSignals();
            }
          }
        }
      } catch (err) {
        console.error(`Background scan failed for ${favSymbol}:`, err);
      }
    };

    // Scan one favorite coin every 8 seconds
    const scannerInterval = setInterval(scanNextFavorite, 8000);
    return () => clearInterval(scannerInterval);

  }, [favorites, symbol, mode, riskMode]);

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


  const handleModeChange = (newMode) => {
    setMode(newMode);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location);
      url.searchParams.set('mode', newMode);
      window.history.pushState({}, '', url);
    }
  };

  const handleRiskModeChange = (newRisk) => {
    setRiskMode(newRisk);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location);
      url.searchParams.set('risk', newRisk);
      window.history.pushState({}, '', url);
    }
  };

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
  if (authLoading || !user) {
    return <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', zIndex: 9999 }}><Loader className="spin" size={32} /></div>;
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
          
          <Link href={`/demo?symbol=${symbol}&mode=${mode}&risk=${riskMode}`}>
            <button className="btn" style={{background: 'var(--color-warning)', color: '#000', fontSize: '12px'}}>
              <CheckCircle2 size={14} /> Demo Trading
            </button>
          </Link>

          <Link href="/audit">
            <button className="btn" style={{background: 'rgba(100,100,255,0.12)', color: 'var(--accent-blue)', border: '1px solid var(--accent-blue)', fontSize: '12px'}}>
              🔬 Audit
            </button>
          </Link>
          
          <div className="status-badge connected">
            <div className="pulse-dot"></div>
            {t('liveApi', lang)}
          </div>
          <button 
            onClick={logout}
            className="btn" 
            style={{marginLeft: '12px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '12px'}}
            title="Log Out"
          >
            Logout
          </button>

          <button 
            onClick={() => setIsSettingsModalOpen(true)}
            className="icon-btn" 
            style={{marginLeft: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)'}}
            title="System Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {isSettingsModalOpen && (
        <SettingsModal onClose={() => setIsSettingsModalOpen(false)} />
      )}

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
              onClick={() => handleModeChange('scalp')}
            ><Zap size={16} /> SCALP (15m)</button>
            <button 
              className={`btn-mode ${mode === 'swing' ? 'active' : ''}`}
              onClick={() => handleModeChange('swing')}
            ><TrendingUp size={16} /> SWING (4h)</button>
          </div>

          <div className="mode-selector card" style={{ marginTop: '12px', background: 'rgba(255,255,255,0.02)' }}>
            <button 
              className={`btn-mode ${riskMode === 'safe' ? 'active' : ''}`}
              onClick={() => handleRiskModeChange('safe')}
              style={{ padding: '6px', fontSize: '11px', color: riskMode === 'safe' ? 'var(--neon-green)' : 'inherit', border: riskMode === 'safe' ? '1px solid rgba(0,255,136,0.3)' : 'none' }}
            >🛡️ SAFE (Sniper)</button>
            <button 
              className={`btn-mode ${riskMode === 'aggressive' ? 'active' : ''}`}
              onClick={() => handleRiskModeChange('aggressive')}
              style={{ padding: '6px', fontSize: '11px', color: riskMode === 'aggressive' ? '#ff5555' : 'inherit', border: riskMode === 'aggressive' ? '1px solid rgba(255,85,85,0.3)' : 'none' }}
            >🚀 AGGRESSIVE</button>
          </div>

          <div className="card price-card glass" style={{ marginTop: '12px' }}>
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
                  <li className={activePlanData?.conditions?.discountPrice ? "active" : ""}>
                    {activePlanData?.conditions?.discountPrice ? <CheckCircle2 className="chk-icon" /> : <XCircle className="chk-icon" />} Discount Price (Live &lt; EMA 25)
                  </li>
                  <li className={activePlanData?.conditions?.oversold ? "active" : ""}>
                    {activePlanData?.conditions?.oversold ? <CheckCircle2 className="chk-icon" /> : <XCircle className="chk-icon" />} Deep Oversold (Prev RSI &lt; {activePlanData?.thresholds?.rsi || 38})
                  </li>
                  <li className={activePlanData?.conditions?.macroTrend ? "active" : ""}>
                    {activePlanData?.conditions?.macroTrend ? <CheckCircle2 className="chk-icon" /> : <XCircle className="chk-icon" />} {activePlanData?.thresholds?.macroTrendLabel || 'Macro Trend'}
                  </li>
                  <li className={activePlanData?.conditions?.greenCandle ? "active" : ""}>
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
                          try {
                            const localGeminiKey = localStorage.getItem('gemini_api_key');
                            if (!localGeminiKey) return alert("Please set your Gemini API Key in System Settings (top right gear icon).");
                            
                            setIsGeneratingTargets(true);
                            setGeminiError(null);
                            const timeStr = chartTimeframe;
                            const tgts = await getGeminiTradeTargets(localGeminiKey, symbol, data, timeStr);
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
                  <h4 style={{margin: '0 0 10px 0', fontSize: '11px', fontWeight: '800', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'space-between'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                      <Activity size={14} /> LIVE ALGORITHM STATUS
                    </div>
                    {activePattern && (
                      <button 
                        onClick={resetPatternLock} 
                        style={{
                          background: 'rgba(255,255,255,0.08)', 
                          border: '1px solid var(--card-border)', 
                          color: 'var(--text-primary)', 
                          padding: '2px 8px', 
                          borderRadius: '4px', 
                          fontSize: '10px', 
                          fontWeight: '700',
                          cursor: 'pointer',
                          textTransform: 'uppercase'
                        }}
                      >
                        Recalculate
                      </button>
                    )}
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
                      <strong style={{color: activePlanData.rsi < (activePlanData.thresholds?.rsi || 38) ? 'var(--color-success)' : 'var(--color-warning)'}}>
                        {activePlanData.rsi?.toFixed(2)} {activePlanData.rsi < (activePlanData.thresholds?.rsi || 38) ? '(✅ Oversold)' : `(⏳ Wait for < ${activePlanData.thresholds?.rsi || 38})`}
                      </strong>
                    </div>
                    {/* Condition Checklist */}
                    <div style={{marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)'}}>
                      <div style={{fontSize: '10px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '800', letterSpacing: '0.5px'}}>6-CONDITION GATE</div>
                      {[
                        {label: 'Price < EMA25 (Discount)', ok: activePlanData.conditions?.discountPrice},
                        {label: `RSI Oversold (< ${activePlanData.thresholds?.rsi || 38}) & Recovering`, ok: activePlanData.conditions?.oversold},
                        {label: activePlanData.thresholds?.macroTrendLabel || '1H Macro Bullish (EMA9 > EMA21)', ok: activePlanData.conditions?.macroTrend},
                        {label: `BTC Health ≥ ${activePlanData.thresholds?.btcHealth || 2}/4`, ok: activePlanData.conditions?.btcSafe},
                        {label: 'Green Candle (Buyers In)', ok: activePlanData.conditions?.greenCandle},
                        {label: 'No Body Break (Level Valid)', ok: activePlanData.conditions?.noBodyBreak},
                      ].map((c, i) => (
                        <div key={i} style={{display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px', fontSize: '11px'}}>
                          <span>{c.ok ? '✅' : '❌'}</span>
                          <span style={{color: c.ok ? 'var(--text-primary)' : 'var(--text-muted)'}}>{c.label}</span>
                        </div>
                      ))}
                      {/* Candle Break Analysis */}
                      {(activePlanData.bodyBreakInfo || activePlanData.rejectionWickInfo) && (
                        <div style={{marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)'}}>
                          <div style={{fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '800', letterSpacing: '0.5px'}}>CANDLE BREAK ANALYSIS</div>
                          {activePlanData.bodyBreakInfo && (
                            <div style={{fontSize: '10px', color: '#ff5555', fontWeight: '700', padding: '4px 6px', background: 'rgba(255,50,50,0.08)', borderRadius: '4px', marginBottom: '4px'}}>
                              {activePlanData.bodyBreakInfo}
                            </div>
                          )}
                          {activePlanData.rejectionWickInfo && (
                            <div style={{fontSize: '10px', color: 'var(--neon-green)', fontWeight: '700', padding: '4px 6px', background: 'rgba(0,255,136,0.08)', borderRadius: '4px'}}>
                              {activePlanData.rejectionWickInfo}
                            </div>
                          )}
                        </div>
                      )}
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
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px'}}>
              <h3 className="section-title" style={{margin: 0}}><Activity size={16} /> {t('signalAccuracy', lang)}</h3>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                <div style={{display: 'flex', background: 'var(--bg-secondary)', borderRadius: '6px', padding: '2px', border: '1px solid var(--card-border)'}}>
                  <button 
                    onClick={() => setAccuracyTarget('TP1')} 
                    style={{
                      background: accuracyTarget === 'TP1' ? 'var(--color-success)' : 'transparent',
                      color: accuracyTarget === 'TP1' ? '#000' : 'var(--text-secondary)',
                      border: 'none', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold'
                    }}
                  >TP1</button>
                  <button 
                    onClick={() => setAccuracyTarget('TP2')} 
                    style={{
                      background: accuracyTarget === 'TP2' ? 'var(--accent-blue)' : 'transparent',
                      color: accuracyTarget === 'TP2' ? '#000' : 'var(--text-secondary)',
                      border: 'none', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold'
                    }}
                  >TP2</button>
                </div>
                <div style={{fontSize: '14px', fontWeight: '800', color: historyStats.winRate >= 50 ? 'var(--color-success)' : 'var(--color-warning)'}}>
                  {historyStats.winRate}% WR
                </div>
              </div>
            </div>
            <div style={{display: 'flex', gap: '12px'}}>
              <div style={{flex: 1, background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', textAlign: 'center'}}>
                <div style={{fontSize: '24px', fontWeight: '700', color: 'var(--color-success)'}}>{historyStats.wins}</div>
                <div style={{fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600'}}>
                  {accuracyTarget === 'TP1' ? 'WINS (TP1)' : 'WINS (TP2)'}
                </div>
              </div>
              <div style={{flex: 1, background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', textAlign: 'center'}}>
                <div style={{fontSize: '24px', fontWeight: '700', color: 'var(--color-danger)'}}>{historyStats.losses}</div>
                <div style={{fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600'}}>{t('losses', lang)}</div>
              </div>
              <div style={{flex: 1, background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', textAlign: 'center'}}>
                <div style={{fontSize: '24px', fontWeight: '700', color: 'var(--color-warning)'}}>{historyStats.open || 0}</div>
                <div style={{fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600'}}>
                  {accuracyTarget === 'TP1' ? 'OPEN (Active)' : 'OPEN'}
                </div>
              </div>
              <div style={{flex: 1, background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', textAlign: 'center'}}>
                <div style={{fontSize: '24px', fontWeight: '700', color: 'var(--accent-blue)'}}>{historyStats.pending}</div>
                <div style={{fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600'}}>{t('pending', lang)}</div>
              </div>
            </div>
            <div style={{display: 'flex', gap: '8px', marginTop: '12px'}}>
              <button 
                className="btn secondary-btn" 
                style={{flex: 1, padding: '8px', fontSize: '12px'}}
                onClick={() => setIsHistoryModalOpen(true)}
              >
                <List size={14} style={{marginRight: '6px'}} /> Quick History
              </button>
              <Link 
                href={`/history?coin=${symbol}`}
                className="btn primary-btn"
                style={{flex: 1, padding: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--accent-blue)', color: '#000'}}
              >
                <LineChart size={14} style={{marginRight: '6px'}} /> Full Dashboard
              </Link>
            </div>
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
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 className="section-title" style={{margin: 0}}><Activity size={18} /> Signal History & Accuracy Monitor</h3>
                <Link 
                  href={`/history?coin=${symbol}`}
                  style={{ fontSize: '11px', color: 'var(--accent-blue)', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px', fontWeight: 'bold' }}
                >
                  <LineChart size={12} /> Open Full View
                </Link>
              </div>
              <button className="icon-btn" style={{width: '32px', height: '32px'}} onClick={() => setIsHistoryModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{padding: '16px'}}>
              {/* Tab Filters and Target Selector */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setHistoryTab('all')}
                    style={{
                      background: historyTab === 'all' ? 'var(--accent-blue)' : 'transparent',
                      color: historyTab === 'all' ? '#000' : 'var(--text-primary)',
                      border: '1px solid var(--accent-blue)',
                      padding: '6px 16px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    All Coins
                  </button>
                  <button
                    onClick={() => setHistoryTab('current')}
                    style={{
                      background: historyTab === 'current' ? 'var(--accent-blue)' : 'transparent',
                      color: historyTab === 'current' ? '#000' : 'var(--text-primary)',
                      border: '1px solid var(--accent-blue)',
                      padding: '6px 16px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    Current Coin ({symbol})
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>TARGET GOAL:</span>
                  <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: '6px', padding: '2px', border: '1px solid var(--card-border)' }}>
                    <button
                      onClick={() => setAccuracyTarget('TP1')}
                      style={{
                        background: accuracyTarget === 'TP1' ? 'var(--color-success)' : 'transparent',
                        color: accuracyTarget === 'TP1' ? '#000' : 'var(--text-secondary)',
                        border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold'
                      }}
                    >TP1 Target</button>
                    <button
                      onClick={() => setAccuracyTarget('TP2')}
                      style={{
                        background: accuracyTarget === 'TP2' ? 'var(--accent-blue)' : 'transparent',
                        color: accuracyTarget === 'TP2' ? '#000' : 'var(--text-secondary)',
                        border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold'
                      }}
                    >TP2 Target</button>
                  </div>
                </div>
              </div>

              <div className="stats-grid" style={{ marginBottom: '20px', gap: '12px' }}>
                <div className="stat-card">
                  <div style={{fontSize: '26px', fontWeight: '900', color: historyStats.winRate >= 50 ? 'var(--color-success)' : 'var(--color-warning)'}}>{historyStats.winRate}%</div>
                  <div style={{fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', marginTop: '4px'}}>OVERALL WIN RATE</div>
                </div>
                <div className="stat-card">
                  <div style={{fontSize: '22px', fontWeight: '800', color: 'var(--color-success)'}}>{historyStats.wins}</div>
                  <div style={{fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', marginTop: '4px'}}>
                    {accuracyTarget === 'TP1' ? 'WINS (TP1)' : 'WINS (TP2)'}
                  </div>
                </div>
                <div className="stat-card">
                  <div style={{fontSize: '22px', fontWeight: '800', color: 'var(--color-danger)'}}>{historyStats.losses}</div>
                  <div style={{fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', marginTop: '4px'}}>LOSSES</div>
                </div>
                <div className="stat-card">
                  <div style={{fontSize: '22px', fontWeight: '800', color: 'var(--color-warning)'}}>{historyStats.open || 0}</div>
                  <div style={{fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', marginTop: '4px'}}>
                    {accuracyTarget === 'TP1' ? 'OPEN (Active)' : 'OPEN'}
                  </div>
                </div>
                <div className="stat-card">
                  <div style={{fontSize: '22px', fontWeight: '800', color: 'var(--accent-blue)'}}>{historyStats.pending}</div>
                  <div style={{fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', marginTop: '4px'}}>PENDING</div>
                </div>
                <div className={`stat-card net-profit-card ${historyStats.netPnlPercent >= 0 ? '' : 'loss'}`}>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: historyStats.netPnlPercent >= 0 ? 'var(--neon-green)' : 'var(--neon-red)', lineHeight: '1.2' }}>
                    {historyStats.netPnlPercent >= 0 ? '+' : ''}{historyStats.netPnlPercent}%
                    <span style={{ fontSize: '12px', marginLeft: '6px', opacity: 0.8, fontWeight: '700' }}>
                      ({historyStats.netPnlUSDT >= 0 ? '+' : ''}{historyStats.netPnlUSDT} USDT)
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', marginTop: '6px' }}>
                    NET PROFIT/LOSS
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px', marginTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{accuracyTarget} Wins: <strong style={{ color: 'var(--neon-green)' }}>{accuracyTarget === 'TP1' ? historyStats.tp1PnlPercent : historyStats.tp2PnlPercent}%</strong></span>
                    <span>$100/trade</span>
                  </div>
                </div>
              </div>
              
              <div style={{overflowY: 'auto', maxHeight: '50vh', paddingRight: '8px'}}>
                {(() => {
                  const filtered = historyTab === 'current' 
                    ? signalHistory.filter(s => s.pair === symbol)
                    : signalHistory;
                  
                  if (filtered.length === 0) {
                    return (
                      <div style={{textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0'}}>
                        No signal history found for this view.
                      </div>
                    );
                  }

                  return (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                      {filtered.map(sig => {
                        const pnlPct = getSignalPnL(sig);
                        const isWon = sig.status === 'WON' || sig.status === 'PARTIAL WIN' || sig.status === 'TP1 HIT' || sig.status === 'TP2 HIT';
                        const isLost = sig.status === 'LOST';
                        // Compute P&L on a $100 simulation basis
                        const simulatedProfit = pnlPct !== null ? (100 * pnlPct) / 100 : 0;
                        
                        return (
                          <div key={sig.id} style={{background: 'var(--bg-secondary)', borderRadius: '8px', padding: '12px', borderLeft: `4px solid ${isWon ? 'var(--color-success)' : isLost ? 'var(--color-danger)' : 'var(--accent-blue)'}`}}>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                              <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                <strong style={{fontSize: '16px', color: 'var(--text-primary)'}}>{sig.pair}</strong>
                                <span style={{background: 'var(--bg-primary)', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)'}}>{sig.mode}</span>
                              </div>
                              <div style={{fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right'}}>
                                <div><span style={{opacity: 0.6}}>Open:</span> {parseDateUTC(sig.created_at).toLocaleString()}</div>
                                {sig.tp1_hit_at && (
                                  <div><span style={{opacity: 0.6}}>TP1 Hit:</span> <span style={{color: 'var(--color-success)'}}>{parseDateUTC(sig.tp1_hit_at).toLocaleString()}</span></div>
                                )}
                                {sig.tp2_hit_at && (
                                  <div><span style={{opacity: 0.6}}>TP2 Hit:</span> <span style={{color: 'var(--color-success)'}}>{parseDateUTC(sig.tp2_hit_at).toLocaleString()}</span></div>
                                )}
                                {sig.closed_at && !sig.tp1_hit_at && !sig.tp2_hit_at && (
                                  <div><span style={{opacity: 0.6}}>Closed:</span> <span style={{color: isWon ? 'var(--color-success)' : isLost ? 'var(--color-danger)' : 'var(--text-muted)'}}>{parseDateUTC(sig.closed_at).toLocaleString()}</span></div>
                                )}
                                {sig.closed_at && isLost && (
                                  <div><span style={{opacity: 0.6}}>Stopped:</span> <span style={{color: 'var(--color-danger)'}}>{parseDateUTC(sig.closed_at).toLocaleString()}</span></div>
                                )}
                              </div>
                            </div>
                            
                            <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '12px', flexWrap: 'wrap', gap: '8px'}}>
                              <div><span style={{color: 'var(--text-muted)'}}>Entry:</span> <strong style={{color: 'var(--text-primary)'}}>${parseFloat(sig.current_price).toFixed(4)}</strong></div>
                              {getSignalCurrentPrice(sig) !== null && (
                                <div><span style={{color: 'var(--text-muted)'}}>Live:</span> <strong style={{color: 'var(--accent-blue)'}}>${getSignalCurrentPrice(sig).toFixed(4)}</strong></div>
                              )}
                              {sig.tp1 && (() => {
                                const isTp1Hit = sig.status === 'PARTIAL WIN' || sig.status === 'TP1 HIT' || sig.status === 'TP2 HIT' || sig.status === 'WON' || (getSignalCurrentPrice(sig) >= parseFloat(sig.tp1));
                                return (
                                  <div>
                                    <span style={{color: 'var(--text-muted)'}}>TP1:</span>{' '}
                                    <strong style={{color: isTp1Hit ? 'var(--color-success)' : 'var(--text-primary)', opacity: isTp1Hit ? 1 : 0.6}}>
                                      ${parseFloat(sig.tp1).toFixed(4)}
                                      {isTp1Hit && <span style={{fontSize: '9px', marginLeft: '2px'}}>✅</span>}
                                    </strong>
                                  </div>
                                );
                              })()}
                              {(() => {
                                const isTp2Hit = sig.status === 'TP2 HIT' || sig.status === 'WON' || (getSignalCurrentPrice(sig) >= parseFloat(sig.sell_target));
                                return (
                                  <div>
                                    <span style={{color: 'var(--text-muted)'}}>TP2:</span>{' '}
                                    <strong style={{color: isTp2Hit ? 'var(--color-success)' : 'var(--text-primary)', opacity: isTp2Hit ? 1 : 0.6}}>
                                      ${parseFloat(sig.sell_target).toFixed(4)}
                                      {isTp2Hit && <span style={{fontSize: '9px', marginLeft: '2px'}}>✅</span>}
                                    </strong>
                                  </div>
                                );
                              })()}
                              <div><span style={{color: 'var(--text-muted)'}}>Stop:</span> <strong style={{color: 'var(--color-danger)'}}>${parseFloat(sig.stop_loss).toFixed(4)}</strong></div>
                              <div><span style={{color: 'var(--text-muted)'}}>RR:</span> <strong style={{color: 'var(--color-warning)'}}>1:{parseFloat(sig.rr_ratio).toFixed(2)}</strong></div>
                            </div>
                            
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--card-border)', paddingTop: '8px'}}>
                              <div style={{fontSize: '11px', fontWeight: 'bold', color: isWon ? 'var(--color-success)' : isLost ? 'var(--color-danger)' : 'var(--accent-blue)'}}>
                                STATUS: {sig.status} 
                                {pnlPct !== null && (
                                  <span style={{marginLeft: '8px', color: pnlPct >= 0 ? 'var(--neon-green)' : 'var(--neon-red)'}}>
                                    ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}% | {pnlPct >= 0 ? '+' : ''}{simulatedProfit.toFixed(2)} USDT)
                                  </span>
                                )}
                              </div>
                              
                              <div style={{display: 'flex', gap: '6px'}}>
                                <button 
                                   onClick={() => {
                                     if (sig.status === 'PARTIAL WIN' || sig.status === 'TP1 HIT') {
                                       updateSignalStatus(sig.id, 'PENDING');
                                     } else {
                                       updateSignalStatus(sig.id, 'TP1 HIT');
                                     }
                                   }}
                                   style={{background: (sig.status === 'PARTIAL WIN' || sig.status === 'TP1 HIT' || sig.status === 'WON' || sig.status === 'TP2 HIT') ? 'var(--color-success)' : 'transparent', color: (sig.status === 'PARTIAL WIN' || sig.status === 'TP1 HIT' || sig.status === 'WON' || sig.status === 'TP2 HIT') ? '#000' : 'var(--color-success)', border: '1px solid var(--color-success)', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold'}}
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
                                   style={{background: (sig.status === 'TP2 HIT' || sig.status === 'WON') ? 'var(--accent-blue)' : 'transparent', color: (sig.status === 'TP2 HIT' || sig.status === 'WON') ? '#000' : 'var(--accent-blue)', border: '1px solid var(--accent-blue)', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold'}}
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
                                   style={{background: isLost ? 'var(--color-danger)' : 'transparent', color: isLost ? '#000' : 'var(--color-danger)', border: '1px solid var(--color-danger)', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold'}}
                                 >
                                   LOST
                                 </button>
                                <button 
                                  onClick={() => updateSignalStatus(sig.id, 'PENDING')}
                                  style={{background: sig.status === 'PENDING' ? 'rgba(255,255,255,0.08)' : 'transparent', color: sig.status === 'PENDING' ? '#fff' : 'var(--text-muted)', border: '1px solid var(--card-border)', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold'}}
                                >
                                  PENDING
                                </button>
                                <button 
                                  onClick={() => setActiveSignalModal(sig)}
                                  style={{background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--text-muted)', padding: '4px 12px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold'}}
                                >
                                  VIEW
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Trigger Signal Modal */}
      {activeSignalModal && (() => {
        const entry = activeSignalModal.entryPrice || activeSignalModal.current_price || activeSignalModal.buy_target;
        const tp1 = activeSignalModal.tp1 || activeSignalModal.targets?.tp1;
        const tp2 = activeSignalModal.tp2 || activeSignalModal.sell_target || activeSignalModal.targets?.tp2 || activeSignalModal.targets?.sellTarget;
        const sl = activeSignalModal.stop_loss || activeSignalModal.targets?.stopLoss;

        return (
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
                    <strong style={{color: 'var(--text-primary)', fontSize: '18px'}}>${parseFloat(entry || 0).toFixed(4)}</strong>
                  </div>
                  {tp1 && (
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <span style={{color: 'var(--text-muted)', fontWeight: '600'}}>TP1 (Safe):</span>
                      <strong style={{color: 'var(--color-success)', fontSize: '18px'}}>${parseFloat(tp1).toFixed(4)}</strong>
                    </div>
                  )}
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <span style={{color: 'var(--text-muted)', fontWeight: '600'}}>TP2 (Max):</span>
                    <strong style={{color: 'var(--color-success)', fontSize: '18px'}}>${parseFloat(tp2 || 0).toFixed(4)}</strong>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--card-border)', paddingTop: '12px'}}>
                    <span style={{color: 'var(--text-muted)', fontWeight: '600'}}>Stop Loss:</span>
                    <strong style={{color: 'var(--color-danger)', fontSize: '18px'}}>${parseFloat(sl || 0).toFixed(4)}</strong>
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
        );
      })()}

      {/* Mobile Dock Menu */}
      <nav className="mobile-dock">
        <Link href="/" className="dock-item active">
          <div className="dock-icon-wrapper">
            <HomeIcon size={20} />
          </div>
          <span>Home</span>
        </Link>
        <Link href={`/demo?symbol=${symbol}&mode=${mode}&risk=${riskMode}`} className="dock-item">
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
        <Link href="/audit" className="dock-item">
          <div className="dock-icon-wrapper" style={{ color: 'var(--accent-blue)' }}>
            <Activity size={20} />
          </div>
          <span>Audit</span>
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
