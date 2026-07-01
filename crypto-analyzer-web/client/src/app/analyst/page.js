"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useBinanceData } from "../../hooks/useBinanceData";
import { Activity, Sparkles, Loader, AlertCircle, Home as HomeIcon, CheckCircle2, Moon, Sun, Settings, ChevronLeft, ArrowRight, Clock } from "lucide-react";
import './analyst.css';

function AnalystContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialSymbol = searchParams.get("coin") || "BTCUSDT";
  
  const [symbol, setSymbol] = useState(initialSymbol);
  const [theme, setTheme] = useState("dark");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [selectedReportId, setSelectedReportId] = useState(null);

  const { data } = useBinanceData(symbol, 'scalp');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setTheme(savedTheme);
    }
    const saved = JSON.parse(localStorage.getItem('ai_reports') || '[]');
    setHistory(saved);
    if (saved.length > 0) {
      // If there's a recent report for this symbol, maybe select it?
      const recentForSymbol = saved.find(h => h.symbol === initialSymbol);
      if (recentForSymbol) {
        setSelectedReportId(recentForSymbol.id);
      } else {
        setSelectedReportId(saved[0].id);
      }
    }
  }, [initialSymbol]);

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

  const generateReport = async () => {
    try {
      setLoading(true);
      setError('');
      
      const apiKey = localStorage.getItem('geminiKey');
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
      
      // Build data from traditional plan if available
      const traditionalPlan = data?.scoreData?.plans?.traditional;
      const swingLow = traditionalPlan?.stopLoss;
      const swingHighTP1 = traditionalPlan?.tp1;
      const swingHighTP2 = traditionalPlan?.tp2;
      const rrRatio = traditionalPlan?.rrRatio;
      const btcHealth = data?.btcData?.health;
      const pattern = data?.indicators?.pattern;
      const ema25 = data?.indicators?.ema25;
      const ema9_1h = data?.indicators?.ema9_1h;
      const ema21_1h = data?.indicators?.ema21_1h;

      const prompt = `You are an expert Crypto Trading Analyst. Give a STRUCTURED trading report for ${symbol}.

## LIVE MARKET DATA:
- Symbol: ${symbol}
- Live Price: ${p}
- RSI (14): ${rsi ? rsi.toFixed(2) : 'N/A'}
- MACD: ${macd ? macd.toFixed(4) : 'N/A'}
- EMA 9: ${ema9 ? ema9.toFixed(4) : 'N/A'}
- EMA 25: ${ema25 ? ema25.toFixed(4) : 'N/A'}
- EMA 50 (1H): ${ema50 ? ema50.toFixed(4) : 'N/A'}
- 1H EMA9: ${ema9_1h ? ema9_1h.toFixed(4) : 'N/A'}
- 1H EMA21: ${ema21_1h ? ema21_1h.toFixed(4) : 'N/A'}
- Current Volume: ${vol ? vol.toFixed(2) : 'N/A'}
- BTC Health: ${btcHealth ?? 'N/A'}/4
- Candle Pattern: ${pattern || 'None'}

## TECHNICAL LEVELS (from algorithm):
- Swing Low / Stop Loss: ${swingLow ? swingLow.toFixed(6) : 'N/A'}
- TP1 (First Target): ${swingHighTP1 ? swingHighTP1.toFixed(6) : 'N/A'}
- TP2 (Extended Target): ${swingHighTP2 ? swingHighTP2.toFixed(6) : 'N/A'}
- Risk:Reward Ratio: ${rrRatio ? rrRatio.toFixed(2) : 'N/A'}

Write the analysis in Sinhala (mixed with crypto terms like support, resistance, entry zone, stop loss, take profit).

Format your response EXACTLY like this (use these EXACT headings):

## Market Structure
[2-3 sentences: What the market is doing now. Bullish or Bearish? Why?]

## Entry Zone
[Specific price entry recommendation. Where to buy. Should I buy now or wait? What price range to enter?]

## Take Profit Targets
TP1: ${swingHighTP1 ? swingHighTP1.toFixed(4) : '[price]'} - [why exit here, e.g. "mehidi 50% sell karanna"]
TP2: ${swingHighTP2 ? swingHighTP2.toFixed(4) : '[price]'} - [why exit here, e.g. "TP1 hit unoth balance hold karanna"]

## Stop Loss
SL: ${swingLow ? swingLow.toFixed(4) : '[price]'} - [why this level, e.g. "Swing Low break unoth trade invalid"]

## Risk Assessment
[2-3 sentences: What are the risks? BTC correlation? Volume concerns? Any warning signs?]

## Short-Term Prediction
[1-2 sentences: What will likely happen in the next few hours?]

Be specific with prices. Use the technical levels provided above. Write in conversational Sinhala.`;


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
      
      const saved = JSON.parse(localStorage.getItem('ai_reports') || '[]');
      const newId = Date.now();
      const newEntry = { 
        id: newId, symbol, text: generatedText, 
        price: p, swingLow, swingHighTP1, swingHighTP2, rrRatio,
        date: new Date().toLocaleString() 
      };
      const updatedHistory = [newEntry, ...saved].slice(0, 50); // Keep last 50
      localStorage.setItem('ai_reports', JSON.stringify(updatedHistory));
      setHistory(updatedHistory);
      setSelectedReportId(newId);
      
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to generate report. Please check your API key.');
    } finally {
      setLoading(false);
    }
  };

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const selectedReport = history.find(h => h.id === selectedReportId);

  return (
    <div className="analyst-page">

      {/* ── Header ── */}
      <header className="analyst-header">
        <div className="analyst-header-left">
          <button
            onClick={() => router.back()}
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '7px', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex' }}
          >
            <ChevronLeft size={18} />
          </button>
          <div className="logo">
            <Activity size={22} className="text-primary" />
            <h1>AI <span>Analyst</span></h1>
          </div>
        </div>
        <div className="analyst-header-right">
          <div className="analyst-symbol-chip">
            <Sparkles size={14} color="var(--neon-purple)" />
            <span>{symbol}</span>
          </div>
          <button
            className="analyst-mobile-toggle"
            onClick={() => setSidebarCollapsed(p => !p)}
          >
            <Clock size={14} /> {sidebarCollapsed ? 'Show History' : 'Hide History'}
          </button>
          <button onClick={toggleTheme} className="icon-btn" style={{ padding: '7px' }}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="analyst-body">

        {/* Sidebar */}
        <div className={`analyst-sidebar${sidebarCollapsed ? ' collapsed' : ''}`}>
          <div className="analyst-sidebar-header">
            <Clock size={15} /> History
          </div>
          <div className="analyst-sidebar-list">
            {history.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', marginTop: '20px', padding: '0 8px' }}>
                No reports yet.
              </div>
            ) : history.map(item => (
              <div
                key={item.id}
                onClick={() => { setSelectedReportId(item.id); setSidebarCollapsed(true); }}
                className={`analyst-history-item${selectedReportId === item.id ? ' active' : ''}`}
              >
                <div className="analyst-history-item-top">
                  <span style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '13px' }}>{item.symbol}</span>
                  <ArrowRight size={12} color="var(--text-muted)" />
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{item.date}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="analyst-content">

          {/* Report header */}
          <div className="analyst-report-header">
            <div>
              <h2 className="analyst-report-title">
                <Sparkles size={18} color="var(--neon-purple)" />
                {selectedReport ? `Analysis for ${selectedReport.symbol}` : `Generate Report for ${symbol}`}
              </h2>
              {selectedReport && <div className="analyst-report-date">Generated on {selectedReport.date}</div>}
            </div>
            <button
              onClick={generateReport}
              className="btn primary-btn"
              style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 14px', background: 'var(--neon-purple)', fontSize: '13px', flexShrink: 0 }}
              disabled={loading}
            >
              {loading ? <Loader size={15} className="spin" /> : <Sparkles size={15} />}
              {loading ? 'Analyzing...' : 'Generate New'}
            </button>
          </div>

          {/* Report body */}
          <div className="analyst-report-body">
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: 'var(--text-muted)' }}>
                <Loader className="spin" size={44} style={{ color: 'var(--neon-purple)', marginBottom: '20px' }} />
                <div style={{ fontSize: '15px' }}>Analyzing Market Structure...</div>
                <div style={{ fontSize: '12px', marginTop: '8px', opacity: 0.7 }}>This usually takes a few seconds</div>
              </div>
            ) : error ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: 'var(--neon-red)' }}>
                <AlertCircle size={44} style={{ marginBottom: '16px' }} />
                <div style={{ textAlign: 'center', fontSize: '15px', maxWidth: '360px' }}>{error}</div>
              </div>
            ) : selectedReport ? (
              <div style={{ maxWidth: '860px', margin: '0 auto', width: '100%' }}>

                {/* Trading Plan Cards */}
                {(selectedReport.swingLow || selectedReport.swingHighTP1) && (
                  <div className="analyst-plan-grid">
                    <div className="analyst-plan-card" style={{ background: 'rgba(0,200,255,0.08)', border: '1px solid rgba(0,200,255,0.3)' }}>
                      <div className="analyst-plan-card-label" style={{ color: 'var(--accent-blue)' }}>🎯 ENTRY</div>
                      <div className="analyst-plan-card-price" style={{ color: 'var(--text-primary)' }}>${parseFloat(selectedReport.price || 0).toFixed(4)}</div>
                      <div className="analyst-plan-card-sub">Live Price at Report</div>
                    </div>
                    <div className="analyst-plan-card" style={{ background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.3)' }}>
                      <div className="analyst-plan-card-label" style={{ color: 'var(--neon-green)' }}>✅ TP1</div>
                      <div className="analyst-plan-card-price" style={{ color: 'var(--neon-green)' }}>${parseFloat(selectedReport.swingHighTP1 || 0).toFixed(4)}</div>
                      <div className="analyst-plan-card-sub">50% Exit Here</div>
                    </div>
                    <div className="analyst-plan-card" style={{ background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.15)' }}>
                      <div className="analyst-plan-card-label" style={{ color: 'var(--neon-green)' }}>🚀 TP2</div>
                      <div className="analyst-plan-card-price" style={{ color: 'var(--neon-green)' }}>${parseFloat(selectedReport.swingHighTP2 || 0).toFixed(4)}</div>
                      <div className="analyst-plan-card-sub">Full Exit / Max</div>
                    </div>
                    <div className="analyst-plan-card" style={{ background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.3)' }}>
                      <div className="analyst-plan-card-label" style={{ color: '#ff5555' }}>🛡️ STOP LOSS</div>
                      <div className="analyst-plan-card-price" style={{ color: '#ff5555' }}>${parseFloat(selectedReport.swingLow || 0).toFixed(4)}</div>
                      <div className="analyst-plan-card-sub">Exit if broken</div>
                    </div>
                    {selectedReport.rrRatio && (
                      <div className="analyst-plan-card" style={{ background: 'rgba(255,200,0,0.08)', border: '1px solid rgba(255,200,0,0.3)' }}>
                        <div className="analyst-plan-card-label" style={{ color: '#f5c842' }}>⚖️ R:R</div>
                        <div className="analyst-plan-card-price" style={{ color: '#f5c842' }}>1:{parseFloat(selectedReport.rrRatio).toFixed(2)}</div>
                        <div className="analyst-plan-card-sub">Reward per risk</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Divider */}
                <div style={{ height: '1px', background: 'var(--card-border)', marginBottom: '20px' }} />

                {/* Report text */}
                <div className="analyst-text">
                  {selectedReport.text.split('\n').map((line, i) => {
                    if (line.startsWith('## ')) {
                      return <div key={i} className="analyst-section-heading">{line.replace('## ', '')}</div>;
                    }
                    const tpMatch = line.match(/^(TP[12]):\s*\$?([\d.]+)/);
                    const slMatch = line.match(/^SL:\s*\$?([\d.]+)/);
                    if (tpMatch) {
                      return (
                        <div key={i} className="analyst-tp-row">
                          <span style={{ fontWeight: '900', color: 'var(--neon-green)', minWidth: '32px', fontSize: '12px' }}>{tpMatch[1]}</span>
                          <span style={{ color: 'var(--neon-green)', fontWeight: '800', fontSize: '13px', minWidth: '80px' }}>${tpMatch[2]}</span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '13px', flex: 1 }}>{line.replace(/^TP[12]:\s*\$?[\d.]+\s*[-—]\s*/, '')}</span>
                        </div>
                      );
                    }
                    if (slMatch) {
                      return (
                        <div key={i} className="analyst-sl-row">
                          <span style={{ fontWeight: '900', color: '#ff5555', minWidth: '32px', fontSize: '12px' }}>SL</span>
                          <span style={{ color: '#ff5555', fontWeight: '800', fontSize: '13px', minWidth: '80px' }}>${slMatch[1]}</span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '13px', flex: 1 }}>{line.replace(/^SL:\s*\$?[\d.]+\s*[-—]\s*/, '')}</span>
                        </div>
                      );
                    }
                    if (line.startsWith('**') && line.endsWith('**')) {
                      return <div key={i}><strong style={{ color: 'var(--text-primary)', fontWeight: '800' }}>{line.slice(2, -2)}</strong></div>;
                    }
                    return <div key={i}>{line}</div>;
                  })}
                </div>

              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
                <Sparkles size={56} style={{ color: 'var(--card-border)', marginBottom: '20px' }} />
                <div style={{ fontSize: '16px', color: 'var(--text-muted)', marginBottom: '12px', textAlign: 'center' }}>Select a report from history or generate a new one</div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Mobile Dock */}
      <nav className="mobile-dock">
        <Link href="/" className="dock-item">
          <div className="dock-icon-wrapper"><HomeIcon size={20} /></div>
          <span>Home</span>
        </Link>
        <Link href={`/demo?symbol=${symbol}`} className="dock-item">
          <div className="dock-icon-wrapper"><CheckCircle2 size={20} /></div>
          <span>Demo</span>
        </Link>
        <Link href={`/analyst?coin=${symbol}`} className="dock-item active">
          <div className="dock-icon-wrapper" style={{ background: 'var(--neon-purple)', color: '#fff', boxShadow: '0 0 10px rgba(180, 90, 255, 0.5)' }}>
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

export default function AnalystPage() {
  return (
    <Suspense fallback={<div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-primary)'}}><Loader className="spin" size={32} color="var(--neon-purple)" /></div>}>
      <AnalystContent />
    </Suspense>
  );
}


