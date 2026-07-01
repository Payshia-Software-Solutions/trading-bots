import { useState, useEffect, useRef } from 'react';
import { fetchTickerData, fetchKlines } from '../utils/binance';
import {
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateAverage,
  detectCandlePattern,
  findNearestSwingLevels,
  calculateEMAArray,
  calculateRSIFullArray
} from '../utils/indicators';

export function useBinanceData(symbol, mode) {
  const [data, setData] = useState({
    ticker: null,
    indicators: null,
    scoreData: null,
    btcData: null,
    loading: true,
    error: null,
    lastUpdate: null,
  });

  const [activeTrade, setActiveTrade] = useState(null);
  const [signalHistory, setSignalHistory] = useState([]);
  const lastSignalTimes = useRef({});

  useEffect(() => {
    const savedTrade = localStorage.getItem('activeTrade');
    if (savedTrade) {
      try { setActiveTrade(JSON.parse(savedTrade)); } catch (e) {}
    }
    const fetchSignals = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? `http://${window.location.hostname}/trading-bots/crypto-analyzer-web/server/public` : 'http://localhost/trading-bots/crypto-analyzer-web/server/public');
        const res = await fetch(`${apiUrl}/api/signals`);
        if (res.ok) {
          const apiSignals = await res.json();
          setSignalHistory(apiSignals);
        }
      } catch (err) {
        console.error("Failed to fetch signals from DB", err);
      }
    };
    fetchSignals();
  }, []);

  const saveSignal = async (newSignal) => {
    try {
      const payload = {
        pair: newSignal.pair,
        mode: newSignal.mode,
        current_price: newSignal.entryPrice,
        buy_target: newSignal.targets.buyLimit,
        sell_target: newSignal.targets.sellTarget,
        stop_loss: newSignal.targets.stopLoss,
        rr_ratio: parseFloat(newSignal.targets.rrRatio),
        score: newSignal.score,
        status: newSignal.status
      };

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? `http://${window.location.hostname}/trading-bots/crypto-analyzer-web/server/public` : 'http://localhost/trading-bots/crypto-analyzer-web/server/public');
      const res = await fetch(`${apiUrl}/api/signals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const saved = await res.json();
        const apiSignalObj = { ...newSignal, id: saved.signal.id };
        setSignalHistory(prev => [apiSignalObj, ...prev].slice(0, 50));
      }
    } catch (err) {
      console.error("Failed to save signal to DB", err);
      // Fallback to local state if DB fails
      setSignalHistory(prev => [newSignal, ...prev].slice(0, 50));
    }
  };

  const updateSignalStatus = (id, status) => {
    setSignalHistory(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, status } : s);
      localStorage.setItem('signalHistory', JSON.stringify(updated));
      return updated;
    });
  };

  const runAnalysis = async () => {
    try {
      const ticker = await fetchTickerData(symbol);
      if (!ticker) throw new Error("Ticker fetch failed");
      const livePrice = parseFloat(ticker.lastPrice);

      const candles15m = await fetchKlines(symbol, '15m', 100);
      const candles1h = await fetchKlines(symbol, '1h', 50);
      const candles4h = await fetchKlines(symbol, '4h', 50);
      const btcCandles15m = await fetchKlines('BTCUSDT', '15m', 30);
      const btcCandles1h = await fetchKlines('BTCUSDT', '1h', 30);

      if (!candles15m || !candles1h || !candles4h || !btcCandles15m || !btcCandles1h) {
        throw new Error("Klines fetch failed");
      }

      const scalpCandles = mode === 'scalp' ? candles15m : candles1h;
      const currentPrice = livePrice || scalpCandles[scalpCandles.length - 1].close;
      
      // Use all candles including the live forming one, and inject the exact live tick price
      const closes = scalpCandles.map(c => c.close);
      closes[closes.length - 1] = currentPrice;
      
      const volumes = scalpCandles.map(c => c.volume);

      const rsiArr = calculateRSIFullArray(closes, 14);
      const rsiVal = rsiArr[rsiArr.length - 1];
      const previousRsiVal = rsiArr[rsiArr.length - 2];
      const ema9 = calculateEMA(closes, 9);
      const ema21 = calculateEMA(closes, 21);
      
      const closes1h = candles1h.slice(0, -1).map(c => c.close);
      const closes4h = candles4h.slice(0, -1).map(c => c.close);
      const ema50_1h = calculateEMA(closes1h, 50);
      const ema50_4h = calculateEMA(closes4h, 50);

      const { macd, signal: macdSignal } = calculateMACD(closes);
      const volAvg = calculateAverage(volumes.slice(-21, -1));
      const volCurrent = volumes[volumes.length - 1];
      const isVolumeSpike = volCurrent >= volAvg * 1.5;
      const pattern = detectCandlePattern(scalpCandles.slice(-4));

      const minGainPct = mode === 'scalp' ? 1.5 : 3.0;
      const srCandles = mode === 'scalp' ? candles1h.slice(0, -1) : candles4h.slice(0, -1);
      const { support, resistance, targetType } = findNearestSwingLevels(srCandles, currentPrice, minGainPct);

      // BTC Health
      const btcLivePrice = btcCandles15m[btcCandles15m.length - 1].close;
      const btcPrevPrice = btcCandles1h[btcCandles1h.length - 2].close;
      const btc15mPct = ((btcLivePrice - btcPrevPrice) / btcPrevPrice) * 100;
      
      let btcHealth = 0;
      let btcReason = "";
      
      const btcMomentumCandles = btcCandles15m.slice(-6, -1);
      const isBtcMomentumUp = calculateAverage(btcMomentumCandles.map(c => c.close - c.open)) > 0;
      if (isBtcMomentumUp) btcHealth++;
      
      const btc1hCloses = btcCandles1h.slice(0, -1).map(c => c.close);
      const btcEma9 = calculateEMA(btc1hCloses, 9);
      const btcEma21 = calculateEMA(btc1hCloses, 21);
      if (btcEma9 > btcEma21) btcHealth++;
      
      const btcRsi = calculateRSI(btcCandles15m.slice(0, -1).map(c => c.close), 14);
      if (btcRsi > 35 && btcRsi < 72) btcHealth++;
      
      const lastBtcCandle = btcCandles15m[btcCandles15m.length - 2];
      const liveBtcCandle = btcCandles15m[btcCandles15m.length - 1];
      const prevDrop = (lastBtcCandle.open - lastBtcCandle.close) / lastBtcCandle.open;
      const liveDrop = (liveBtcCandle.open - liveBtcCandle.close) / liveBtcCandle.open;
      const liveCrash = (liveBtcCandle.high - liveBtcCandle.close) / liveBtcCandle.high;
      
      const isBtcPanic = prevDrop > 0.008 || liveDrop > 0.008 || liveCrash > 0.01;
      if (!isBtcPanic) {
        btcHealth++;
      } else {
        btcHealth = 0;
        btcReason = "DUMP DETECTED";
      }

      const btcIsSafe = btcHealth >= 1;
      const btcIsStrong = btcHealth >= 3;

      // Score
      let score = 0;
      const checks = {
        support: currentPrice <= support * 1.015,
        rsi: rsiVal < 42,
        ema: ema9 > ema21,
        macd: macd > macdSignal,
        volume: isVolumeSpike,
        pattern: pattern !== "None",
        trend: currentPrice > ema50_1h && currentPrice > ema50_4h,
        btc: btcIsSafe
      };

      if (checks.support) score++;
      if (checks.rsi) score++;
      if (checks.ema) score++;
      if (checks.macd) score++;
      if (checks.volume) score++;
      if (checks.pattern) score++;
      if (checks.trend) score++;
      if (checks.btc && btcIsStrong) score++; // bonus
      
      if (!checks.btc) score = 0; // Hard block

      // Traditional Mode Logic
      const ema25 = calculateEMA(closes, 25);
      
      const lastTickOpen = scalpCandles[scalpCandles.length - 1].open;
      const isGreenCandle = currentPrice > lastTickOpen;
      const isOversold = previousRsiVal < 35;
      const rsiBendingUp = rsiVal > previousRsiVal;

      const isSetupActive = currentPrice < ema25 && isOversold && rsiBendingUp && isGreenCandle;

      const traditionalSupport = currentPrice;
      const traditionalStopLoss = traditionalSupport * 0.985;
      const traditionalTP1 = ema25;
      const traditionalTP2 = traditionalSupport * 1.03;

      const traditionalRisk = currentPrice - traditionalStopLoss;
      const traditionalReward = traditionalTP2 - currentPrice;
      const traditionalRR = traditionalRisk > 0 ? (traditionalReward / traditionalRisk) : 0;
      
      let waitReason = "";
      if (!isSetupActive) {
        if (rsiVal >= 35 && currentPrice >= ema25) waitReason = " (RSI > 35 & Price > EMA25)";
        else if (rsiVal >= 35) waitReason = " (RSI > 35)";
        else if (currentPrice >= ema25) waitReason = " (Price > EMA25)";
      }

      const traditionalBuyStatus = isSetupActive ? "BUY ACTIVE" : `WAITING FOR SETUP${waitReason}`;
      const traditionalSellStatus = isSetupActive ? "WAITING SELL" : "WAITING BUY";

      let newSignalAlert = null;
      if (isSetupActive) {
        const now = Date.now();
        const lastTime = lastSignalTimes.current[symbol] || 0;
        if (now - lastTime > 900000) { // 15 minutes cooldown
          lastSignalTimes.current[symbol] = now;
          
          const autoSignal = {
            pair: symbol,
            mode: 'traditional',
            entryPrice: currentPrice,
            targets: {
              buyLimit: currentPrice,
              sellTarget: traditionalTP2, // Using TP2 for max RR
              stopLoss: traditionalStopLoss,
              rrRatio: traditionalRR
            },
            score: 10, // Max score for strict logic
            status: 'BUY ACTIVE',
            tp1: traditionalTP1,
            tp2: traditionalTP2
          };
          
          // Fire and forget save to DB
          saveSignal(autoSignal).catch(e => console.error("Auto save failed", e));
          
          newSignalAlert = autoSignal;
        }
      }

      // Determine Overall AI Recommendation (Kept for historical reasons or small widgets)
      let aiRecommendation = { status: "NEUTRAL", reason: "Consolidating or weak volume. Avoid entries here." };
      if (score >= 6) {
        aiRecommendation = { status: "STRONG BUY", reason: "Excellent setup! Strong confluence across indicators." };
      } else if (score >= 4) {
        aiRecommendation = { status: "MODERATE BUY", reason: "Good setup, but manage risk carefully." };
      } else if (!checks.ema && !checks.macd) {
        aiRecommendation = { status: "BEARISH PULLBACK", reason: "Market is dropping. Wait for price to hit support before buying." };
      } else if (score <= 3) {
        aiRecommendation = { status: "WEAK / NEUTRAL", reason: "Market lacks strong momentum. Wait for a better setup." };
      }
      if (!btcIsSafe) {
        aiRecommendation = { status: "NO TRADE ZONE", reason: "BTC is dumping or highly volatile. Trading paused." };
      }

      const plans = {
        traditional: {
          support: traditionalSupport,
          resistance: traditionalTP2, // Max TP
          tp1: traditionalTP1,
          tp2: traditionalTP2,
          stopLoss: traditionalStopLoss,
          rrRatio: traditionalRR,
          distanceToSupport: 0,
          distanceToResistance: ((traditionalTP2 - currentPrice) / currentPrice * 100),
          buyStatus: traditionalBuyStatus,
          sellStatus: traditionalSellStatus,
          isSetupActive: isSetupActive,
          rsi: rsiVal,
          ema25: ema25,
          currentPrice: currentPrice,
          conditions: {
            discountPrice: currentPrice < ema25,
            oversold: isOversold,
            rsiBendingUp: rsiBendingUp,
            greenCandle: isGreenCandle
          }
        }
      };
      // Generate Analysis Log
      const analysisLog = [];
      if (checks.support) analysisLog.push("Price within 1.5% of Support Floor.");
      if (checks.ema) analysisLog.push("EMA9 crossed above EMA21 (Bullish Crossover).");
      if (checks.rsi) analysisLog.push("RSI recovering from oversold region.");
      if (checks.macd) analysisLog.push("MACD showing bullish momentum.");
      if (checks.volume) analysisLog.push("Significant volume spike detected.");
      if (checks.trend) analysisLog.push("Macro Trend is Bullish (1H & 4H).");
      if (!checks.trend) analysisLog.push("Macro Trend is Bearish.");
      if (checks.btc && btcIsSafe) analysisLog.push(`BTC Health ${btcHealth}/4 — market safe for entries.`);
      if (!btcIsSafe) analysisLog.push("BTC Market unsafe. Entries paused.");

      const formatCandles = (candles) => candles.map(c => ({
        time: Math.floor(c.time / 1000),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close
      }));

      const getChartBundle = (candles) => {
        return {
          candles: formatCandles(candles),
          ema7: calculateEMAArray(candles, 7),
          ema25: calculateEMAArray(candles, 25),
          ema99: calculateEMAArray(candles, 99)
        };
      };

      const chartData = {
        '15m': getChartBundle(candles15m),
        '1h': getChartBundle(candles1h),
        '4h': getChartBundle(candles4h)
      };

      setData({
        ticker: { ...ticker, currentPrice, symbol },
        indicators: {
          rsiVal, ema9, ema21, ema50_1h, ema50_4h, macd, signal: macdSignal, volAvg, volCurrent, pattern
        },
        scoreData: {
          score, checks, aiRecommendation, analysisLog, plans
        },
        btcData: {
          price: btcLivePrice, health: btcHealth, isSafe: btcIsSafe, momentumUp: isBtcMomentumUp, reason: btcReason
        },
        chartData,
        newSignalAlert,
        loading: false,
        error: null,
        lastUpdate: new Date().toLocaleTimeString(),
      });

    } catch (err) {
      console.error(err);
      setData(prev => ({ ...prev, error: err.message, loading: false }));
    }
  };

  useEffect(() => {
    if (!symbol) return;
    setData(prev => ({ ...prev, loading: true }));
    runAnalysis();
    const interval = setInterval(runAnalysis, 5000);
    return () => clearInterval(interval);
  }, [symbol, mode]);

  return { data, activeTrade, setActiveTrade, signalHistory, saveSignal, updateSignalStatus, runAnalysis };
}
