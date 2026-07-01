import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, RefreshCw, BarChart2, TrendingUp, TrendingDown, Info, Zap } from 'lucide-react';

export default function Predictor() {
  const [selectedCoin, setSelectedCoin] = useState('BTC');
  const [priceHistory, setPriceHistory] = useState([]);
  const [isRunning, setIsRunning] = useState(true);
  const [strategy, setStrategy] = useState('EMA_RSI');
  
  // Bot statistics
  const [botTrades, setBotTrades] = useState([]);
  const [botBalance, setBotBalance] = useState(1000); // starts with 1000 USDT
  const [botPosition, setBotPosition] = useState(null); // null, or { entryPrice, amount, type: 'BUY' }
  const [totalProfit, setTotalProfit] = useState(0);

  // Generate initial historical data
  const generateInitialData = (coin) => {
    let startPrice = coin === 'BTC' ? 56000 : coin === 'ETH' ? 3200 : 140;
    const data = [];
    let currentPrice = startPrice;
    
    for (let i = 0; i < 50; i++) {
      const change = (Math.random() - 0.49) * (currentPrice * 0.006);
      currentPrice += change;
      data.push({
        time: i,
        price: currentPrice,
        rsi: 30 + Math.random() * 40,
        ema9: currentPrice * (0.995 + Math.random() * 0.01),
        ema21: currentPrice * (0.993 + Math.random() * 0.01)
      });
    }
    return data;
  };

  // Initialize data on component mount or coin change
  useEffect(() => {
    setPriceHistory(generateInitialData(selectedCoin));
    setBotTrades([]);
    setBotBalance(1000);
    setBotPosition(null);
    setTotalProfit(0);
  }, [selectedCoin]);

  // Live simulation tick
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setPriceHistory((prev) => {
        const lastItem = prev[prev.length - 1];
        const newTime = lastItem.time + 1;
        
        // Simulating price movement
        const changePercent = (Math.random() - 0.49) * 0.008; // slight upward bias
        const newPrice = lastItem.price * (1 + changePercent);

        // Simple calculations for indicators
        const alpha9 = 2 / (9 + 1);
        const alpha21 = 2 / (21 + 1);
        const newEma9 = newPrice * alpha9 + lastItem.ema9 * (1 - alpha9);
        const newEma21 = newPrice * alpha21 + lastItem.ema21 * (1 - alpha21);

        // Simple RSI simulation based on price movement
        let newRsi = lastItem.rsi;
        if (changePercent > 0) {
          newRsi = Math.min(85, lastItem.rsi + Math.random() * 5);
        } else {
          newRsi = Math.max(15, lastItem.rsi - Math.random() * 5);
        }

        const newDataPoint = {
          time: newTime,
          price: newPrice,
          ema9: newEma9,
          ema21: newEma21,
          rsi: newRsi
        };

        const updatedHistory = [...prev.slice(1), newDataPoint];
        
        // Execute Bot Decision logic
        evaluateBotSignal(newDataPoint, updatedHistory);

        return updatedHistory;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [isRunning, priceHistory, botPosition, botBalance]);

  // Analyze indicators and output recommendation
  const getTechnicalSignal = (current, history) => {
    if (history.length < 2) return { signal: 'HOLD', reason: 'Analyzing market data...' };

    const prev = history[history.length - 2];
    const isEmaBullishCross = current.ema9 > current.ema21 && prev.ema9 <= prev.ema21;
    const isEmaBearishCross = current.ema9 < current.ema21 && prev.ema9 >= prev.ema21;

    if (current.rsi < 32 || isEmaBullishCross) {
      return {
        signal: 'BUY',
        reason: current.rsi < 32 
          ? `RSI is oversold (${current.rsi.toFixed(1)}), suggesting sellers are exhausted.` 
          : `EMA 9 crossed above EMA 21, indicating a short-term bullish reversal.`
      };
    } else if (current.rsi > 68 || isEmaBearishCross) {
      return {
        signal: 'SELL',
        reason: current.rsi > 68 
          ? `RSI is overbought (${current.rsi.toFixed(1)}), suggesting the price is stretched too high.` 
          : `EMA 9 crossed below EMA 21, showing bearish momentum starting to take over.`
      };
    }

    return {
      signal: 'HOLD',
      reason: `Market trend is neutral. RSI is stable at ${current.rsi.toFixed(1)} and EMA trends are parallel.`
    };
  };

  const currentData = priceHistory[priceHistory.length - 1] || { price: 0, rsi: 50, ema9: 0, ema21: 0 };
  const signalInfo = getTechnicalSignal(currentData, priceHistory);

  // Auto Bot trading simulator execution
  const evaluateBotSignal = (current, history) => {
    const decision = getTechnicalSignal(current, history);
    
    if (decision.signal === 'BUY' && !botPosition && botBalance > 10) {
      // Execute Buy
      const entryPrice = current.price;
      const amount = botBalance / entryPrice;
      setBotPosition({ entryPrice, amount });
      setBotBalance(0);
      setBotTrades(prev => [
        {
          type: 'BUY',
          price: entryPrice,
          time: new Date().toLocaleTimeString(),
          id: Math.random().toString(36).substr(2, 9)
        },
        ...prev
      ]);
    } else if (decision.signal === 'SELL' && botPosition) {
      // Execute Sell
      const exitPrice = current.price;
      const profit = (exitPrice - botPosition.entryPrice) * botPosition.amount;
      const newBal = botPosition.amount * exitPrice;
      
      setBotBalance(newBal);
      setBotPosition(null);
      setTotalProfit(prev => prev + profit);
      setBotTrades(prev => [
        {
          type: 'SELL',
          price: exitPrice,
          profit: profit.toFixed(2),
          time: new Date().toLocaleTimeString(),
          id: Math.random().toString(36).substr(2, 9)
        },
        ...prev
      ]);
    }
  };

  // SVG Chart rendering calculations
  const prices = priceHistory.map(d => d.price);
  const minPrice = Math.min(...prices) * 0.998;
  const maxPrice = Math.max(...prices) * 1.002;
  const priceRange = maxPrice - minPrice;

  const getSvgCoordinates = (index, val) => {
    const x = (index / 49) * 100; // percent width
    const y = 100 - ((val - minPrice) / priceRange) * 100; // percent height (inverted)
    return `${x}%,${y}%`;
  };

  const getPointsString = (dataList) => {
    return dataList.map((val, idx) => {
      const x = (idx / 49) * 550; // SVG viewBox width is 600
      const y = 250 - ((val - minPrice) / priceRange) * 200; // SVG viewBox height is 250
      return `${x},${y}`;
    }).join(' ');
  };

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <BarChart2 size={24} className="text-glow-cyan" />
          <h2 style={{ margin: 0, color: 'var(--text-bright)' }}>AI Predictor Bot Dashboard</h2>
        </div>
        
        {/* Token selection */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['BTC', 'ETH', 'SOL'].map((coin) => (
            <button
              key={coin}
              onClick={() => setSelectedCoin(coin)}
              style={{
                padding: '4px 12px',
                borderRadius: '6px',
                border: selectedCoin === coin ? '1px solid var(--neon-cyan)' : '1px solid var(--border-color)',
                background: selectedCoin === coin ? 'rgba(0,240,255,0.1)' : 'rgba(0,0,0,0.2)',
                color: selectedCoin === coin ? 'var(--neon-cyan)' : 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 'bold'
              }}
            >
              {coin}
            </button>
          ))}
        </div>
      </div>

      {/* Main Terminal Price Ticker */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '0.75rem', textAlign: 'left' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>LIVE PRICE</span>
          <div style={{ fontSize: '1.4rem', color: 'var(--text-bright)', fontWeight: 'bold', marginTop: '0.25rem' }}>
            ${currentData.price ? currentData.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.25rem' }}> USDT</span>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '0.75rem', textAlign: 'left' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>RSI MOMENTUM</span>
          <div style={{ 
            fontSize: '1.4rem', 
            color: currentData.rsi < 35 ? 'var(--neon-green)' : currentData.rsi > 65 ? 'var(--neon-red)' : 'var(--text-bright)', 
            fontWeight: 'bold', 
            marginTop: '0.25rem' 
          }}>
            {currentData.rsi ? currentData.rsi.toFixed(2) : '50.00'}
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.25rem' }}>
              {currentData.rsi < 35 ? ' (Oversold)' : currentData.rsi > 65 ? ' (Overbought)' : ' (Neutral)'}
            </span>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '0.75rem', textAlign: 'left' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SIGNAL DECISION</span>
          <div style={{ 
            fontSize: '1.4rem', 
            color: signalInfo.signal === 'BUY' ? 'var(--neon-green)' : signalInfo.signal === 'SELL' ? 'var(--neon-red)' : 'var(--neon-cyan)', 
            fontWeight: 'bold', 
            marginTop: '0.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}>
            {signalInfo.signal === 'BUY' && <TrendingUp size={20} />}
            {signalInfo.signal === 'SELL' && <TrendingDown size={20} />}
            {signalInfo.signal}
          </div>
        </div>
      </div>

      {/* SVG Real-time Chart */}
      <div className="glass-card" style={{ padding: '1rem', background: '#0e111a', position: 'relative', marginBottom: '1.5rem' }}>
        <div style={{ position: 'absolute', top: '10px', left: '15px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="glow-dot green"></span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>LIVE CHARTS (EMA 9 vs EMA 21)</span>
        </div>
        <div style={{ position: 'absolute', top: '10px', right: '15px', display: 'flex', gap: '0.75rem', fontSize: '0.7rem' }}>
          <span style={{ color: 'var(--neon-cyan)' }}>● Price</span>
          <span style={{ color: 'var(--neon-yellow)' }}>● EMA 9</span>
          <span style={{ color: 'var(--neon-purple)' }}>● EMA 21</span>
        </div>

        <svg viewBox="0 0 550 250" style={{ width: '100%', height: '200px', overflow: 'visible', marginTop: '1.5rem' }}>
          {/* Grid lines */}
          <line x1="0" y1="50" x2="550" y2="50" stroke="rgba(255,255,255,0.03)" />
          <line x1="0" y1="125" x2="550" y2="125" stroke="rgba(255,255,255,0.03)" />
          <line x1="0" y1="200" x2="550" y2="200" stroke="rgba(255,255,255,0.03)" />

          {/* EMA 21 line */}
          <polyline
            fill="none"
            stroke="var(--neon-purple)"
            strokeWidth="1.5"
            opacity="0.6"
            points={getPointsString(priceHistory.map(d => d.ema21))}
          />

          {/* EMA 9 line */}
          <polyline
            fill="none"
            stroke="var(--neon-yellow)"
            strokeWidth="1.5"
            opacity="0.7"
            points={getPointsString(priceHistory.map(d => d.ema9))}
          />

          {/* Main Price line */}
          <polyline
            fill="none"
            stroke="var(--neon-cyan)"
            strokeWidth="2.5"
            points={getPointsString(prices)}
          />
        </svg>
      </div>

      {/* Beginner Explanation Widget */}
      <div 
        style={{ 
          padding: '1rem', 
          borderRadius: '12px', 
          background: 'rgba(0,240,255,0.03)', 
          border: '1px solid rgba(0,240,255,0.1)',
          textAlign: 'left',
          marginBottom: '1.5rem'
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem' }}>
          <Info size={16} className="text-glow-cyan" />
          <span style={{ fontSize: '0.8rem', color: 'var(--neon-cyan)', fontWeight: 'bold', textTransform: 'uppercase' }}>Why this signal?</span>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
          {signalInfo.reason}
        </p>
      </div>

      {/* Simulated Bot Performance */}
      <div className="glass-card" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap size={18} className="text-glow-green" />
            <span style={{ fontSize: '0.9rem', color: 'var(--text-bright)', fontWeight: 'bold' }}>Simulated Bot Trades Tracker</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status:</span>
            <button 
              onClick={() => setIsRunning(!isRunning)}
              style={{
                background: isRunning ? 'rgba(255,59,105,0.15)' : 'rgba(0,255,135,0.15)',
                color: isRunning ? 'var(--neon-red)' : 'var(--neon-green)',
                border: `1px solid ${isRunning ? 'var(--neon-red)' : 'var(--neon-green)'}`,
                padding: '2px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              {isRunning ? <Square size={10} /> : <Play size={10} />}
              {isRunning ? 'Pause' : 'Start'}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ textAlign: 'left', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>BOT BALANCE</span>
            <div style={{ fontSize: '1.1rem', color: 'var(--text-bright)', fontWeight: 'bold' }}>
              ${botBalance > 0 ? botBalance.toFixed(2) : (botPosition ? (botPosition.amount * currentData.price).toFixed(2) : '0.00')} USDT
            </div>
          </div>
          <div style={{ textAlign: 'left', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>TOTAL PROFIT</span>
            <div style={{ fontSize: '1.1rem', color: totalProfit >= 0 ? 'var(--neon-green)' : 'var(--neon-red)', fontWeight: 'bold' }}>
              {totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)} USDT
            </div>
          </div>
        </div>

        {/* Trade Logs */}
        <div style={{ maxHeight: '110px', overflowY: 'auto', textAlign: 'left' }}>
          {botTrades.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              Waiting for trade signals to execute...
            </div>
          ) : (
            botTrades.map((t) => (
              <div 
                key={t.id} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  fontSize: '0.75rem', 
                  padding: '4px 0', 
                  borderBottom: '1px solid rgba(255,255,255,0.03)' 
                }}
              >
                <div>
                  <span style={{ 
                    color: t.type === 'BUY' ? 'var(--neon-green)' : 'var(--neon-red)', 
                    fontWeight: 'bold',
                    marginRight: '0.5rem'
                  }}>
                    {t.type}
                  </span>
                  <span style={{ color: 'var(--text-bright)' }}>${t.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                <div>
                  {t.profit && (
                    <span style={{ 
                      color: parseFloat(t.profit) >= 0 ? 'var(--neon-green)' : 'var(--neon-red)',
                      marginRight: '0.5rem',
                      fontWeight: 'bold'
                    }}>
                      ({parseFloat(t.profit) >= 0 ? '+' : ''}${t.profit})
                    </span>
                  )}
                  <span style={{ color: 'var(--text-muted)' }}>{t.time}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
