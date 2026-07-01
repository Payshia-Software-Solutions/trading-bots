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
  calculateRSIFullArray,
  findSwingLow,
  findSwingHigh,
  calculateConfidenceScore,
  calculateRiskLevel,
  getConfidenceLabel,
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
        sell_target: newSignal.targets.tp2,
        stop_loss: newSignal.targets.stopLoss,
        rr_ratio: parseFloat(newSignal.targets.rrRatio),
        score: newSignal.confidenceScore,
        status: newSignal.status,
        confidence_level: newSignal.confidenceLabel,
        risk_level: newSignal.riskLevel,
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
      
      const closes = scalpCandles.map(c => c.close);
      closes[closes.length - 1] = currentPrice;
      
      const volumes = scalpCandles.map(c => c.volume);

      // ── RSI ──
      const rsiArr = calculateRSIFullArray(closes, 14);
      const rsiVal = rsiArr[rsiArr.length - 1];
      const previousRsiVal = rsiArr[rsiArr.length - 2];

      // ── EMAs ──
      const ema9 = calculateEMA(closes, 9);
      const ema21 = calculateEMA(closes, 21);
      const ema25 = calculateEMA(closes, 25);
      
      const closes1h = candles1h.slice(0, -1).map(c => c.close);
      const closes4h = candles4h.slice(0, -1).map(c => c.close);
      const ema9_1h  = calculateEMA(closes1h, 9);
      const ema21_1h = calculateEMA(closes1h, 21);
      const ema50_1h = calculateEMA(closes1h, 50);
      const ema50_4h = calculateEMA(closes4h, 50);

      // ── MACD ──
      const { macd, signal: macdSignal } = calculateMACD(closes);

      // ── Volume ──
      const volAvg = calculateAverage(volumes.slice(-21, -1));
      const volCurrent = volumes[volumes.length - 1];
      const isVolumeSpike = volCurrent >= volAvg * 1.5;

      // ── Candle Pattern ──
      const pattern = detectCandlePattern(scalpCandles.slice(-4));

      // ── Swing Levels (for score system) ──
      const minGainPct = mode === 'scalp' ? 1.5 : 3.0;
      const srCandles = mode === 'scalp' ? candles1h.slice(0, -1) : candles4h.slice(0, -1);
      const { support, resistance } = findNearestSwingLevels(srCandles, currentPrice, minGainPct);

      // ── BTC Health (4-point scale) ──
      const btcLivePrice = btcCandles15m[btcCandles15m.length - 1].close;
      const btcPrevPrice = btcCandles1h[btcCandles1h.length - 2].close;
      
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

      // ══════════════════════════════════════════════
      // SCORE SYSTEM (Secondary — kept for dashboard)
      // ══════════════════════════════════════════════
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
      if (checks.btc && btcIsStrong) score++;
      if (!checks.btc) score = 0;

      // ══════════════════════════════════════════════
      // TRADITIONAL SIGNAL LOGIC (Primary — 5-condition strict gate)
      // ══════════════════════════════════════════════
      const lastTickOpen = scalpCandles[scalpCandles.length - 1].open;
      const isGreenCandle = currentPrice > lastTickOpen;
      const isOversold = previousRsiVal < 38; // Stricter: was 35
      const rsiBendingUp = rsiVal > previousRsiVal;
      const isMacroTrendUp = ema9_1h > ema21_1h; // 1H EMA9 > EMA21
      const isBtcSafeForTrading = btcHealth >= 2; // HARD BLOCK: BTC must be >= 2/4

      // All 5 base conditions must pass
      const condition1 = currentPrice < ema25;          // Discount zone
      const condition2 = isOversold && rsiBendingUp;    // RSI oversold recovery
      const condition3 = isMacroTrendUp;                // 1H bullish structure
      const condition4 = isBtcSafeForTrading;           // BTC safety gate (HARD)
      const condition5 = isGreenCandle;                 // Buyers stepping in

      // ── Condition 6: Candle Body/Wick Break Analysis (Human Analyst Method) ──
      const prevCandle    = scalpCandles[scalpCandles.length - 2]; // last closed candle
      const currCandle    = scalpCandles[scalpCandles.length - 1]; // live candle
      const refLevel      = swingLowSL; // key support level

      // ❌ HARD BLOCK: If last CLOSED candle body closes BELOW support → level broken, don't buy
      const isBodyBreak = prevCandle.close < refLevel;

      // ✅ BULLISH SIGNAL: Wick dips below support but CLOSES back above (rejection wick)
      // e.g. wick: 1.78, close: 1.82 → buyers defended the level
      const isRejectionWick =
        prevCandle.low < refLevel &&              // wick touched/broke support
        prevCandle.close > refLevel &&            // but body closed above it
        prevCandle.close > prevCandle.open;       // green candle (buyers won)

      // ✅ Volume confirmation at the level (volume spike during rejection = strong)
      const prevVol     = volumes[volumes.length - 2];
      const volAtLevel  = prevVol > volAvg * 1.3; // at least 1.3x avg volume at this level

      // Condition 6: No body break allowed. Rejection wick is bonus (not mandatory)
      const condition6 = !isBodyBreak;

      const isSetupActive = condition1 && condition2 && condition3 && condition4 && condition5 && condition6;

      // ── Precise SL/TP using swing levels ──
      // SL: nearest swing low below current price (with 0.3% buffer)
      const swingLowSL = findSwingLow(scalpCandles, currentPrice, 20);
      // TP1: nearest swing high above current price
      const swingHighTP1 = findSwingHigh(scalpCandles, currentPrice, 30);
      // TP2: TP1 + 50% extension of TP1-entry distance
      const tp1Distance = swingHighTP1 - currentPrice;
      const swingHighTP2 = swingHighTP1 + tp1Distance * 0.5;

      const tradeRisk = currentPrice - swingLowSL;
      const tradeRewardTP1 = swingHighTP1 - currentPrice;
      const tradeRewardTP2 = swingHighTP2 - currentPrice;
      const rrRatioTP1 = tradeRisk > 0 ? tradeRewardTP1 / tradeRisk : 0;
      const rrRatioTP2 = tradeRisk > 0 ? tradeRewardTP2 / tradeRisk : 0;

      // Minimum R:R 1.5 required to fire
      const hasMinRR = rrRatioTP1 >= 1.5;

      // ── Confidence & Risk scores ──
      const confidenceScore = calculateConfidenceScore({
        rsiVal, previousRsiVal, macd, macdSignal,
        volCurrent, volAvg, btcHealth, isVolumeSpike,
        ema50_4h, currentPrice, pattern,
        isRejectionWick, volAtLevel
      });
      const confidenceLabel = getConfidenceLabel(confidenceScore);
      const riskLevel = calculateRiskLevel(rrRatioTP2, btcHealth);

      // ── Reason strings for wait state ──
      const failedConditions = [];
      if (!condition1) failedConditions.push(`Price above EMA25 (${ema25.toFixed(4)})`);
      if (!condition2) {
        if (!isOversold) failedConditions.push(`RSI not oversold (${rsiVal.toFixed(1)} > 38)`);
        if (!rsiBendingUp) failedConditions.push('RSI still falling');
      }
      if (!condition3) failedConditions.push('1H Bearish Structure (EMA9 < EMA21)');
      if (!condition4) failedConditions.push(`BTC too weak (Health: ${btcHealth}/4)`);
      if (!condition5) failedConditions.push('No green candle');
      if (!condition6) failedConditions.push('⚠️ Support Level Body Break — Level Invalid');
      if (isSetupActive && !hasMinRR) failedConditions.push(`R:R too low (${rrRatioTP1.toFixed(2)} < 1.5)`);

      // Rejection wick bonus info
      const rejectionWickInfo = isRejectionWick
        ? `✅ Rejection Wick at ${refLevel.toFixed(4)} — Buyers defended level` + (volAtLevel ? ' (HIGH VOLUME)' : '')
        : '';
      const bodyBreakInfo = isBodyBreak
        ? `🔴 Body Break at ${refLevel.toFixed(4)} — Support broken, trade invalid`
        : '';

      const waitReason = failedConditions.length > 0
        ? failedConditions[0] // Show the most important blocker
        : "";

      const traditionalBuyStatus = (isSetupActive && hasMinRR) ? "BUY ACTIVE" : `WAITING${waitReason ? ` — ${waitReason}` : ""}`;

      // ── Auto-fire signal ──
      let newSignalAlert = null;
      if (isSetupActive && hasMinRR) {
        const now = Date.now();
        const lastTime = lastSignalTimes.current[symbol] || 0;
        if (now - lastTime > 900000) { // 15 min cooldown
          lastSignalTimes.current[symbol] = now;
          
          const autoSignal = {
            pair: symbol,
            mode: 'traditional',
            entryPrice: currentPrice,
            targets: {
              buyLimit: currentPrice,
              tp1: swingHighTP1,
              tp2: swingHighTP2,
              stopLoss: swingLowSL,
              rrRatio: rrRatioTP2,
            },
            confidenceScore,
            confidenceLabel,
            riskLevel,
            score: confidenceScore,
            status: 'BUY ACTIVE',
          };
          
          saveSignal(autoSignal).catch(e => console.error("Auto save failed", e));
          newSignalAlert = autoSignal;
        }
      }

      // ── Overall AI Recommendation (Secondary widget) ──
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

      // ── Traditional plan object ──
      const plans = {
        traditional: {
          support: swingLowSL,
          tp1: swingHighTP1,
          tp2: swingHighTP2,
          stopLoss: swingLowSL,
          rrRatio: rrRatioTP2,
          rrRatioTP1,
          distanceToSupport: ((currentPrice - swingLowSL) / currentPrice * 100),
          distanceToTP1: ((swingHighTP1 - currentPrice) / currentPrice * 100),
          distanceToTP2: ((swingHighTP2 - currentPrice) / currentPrice * 100),
          buyStatus: traditionalBuyStatus,
          isSetupActive: isSetupActive && hasMinRR,
          rsi: rsiVal,
          ema25,
          currentPrice,
          confidenceScore,
          confidenceLabel,
          riskLevel,
          // Candle break analysis data
          isBodyBreak,
          isRejectionWick,
          volAtLevel,
          bodyBreakInfo,
          rejectionWickInfo,
          conditions: {
            discountPrice: condition1,
            oversold: condition2,
            macroTrend: condition3,
            btcSafe: condition4,
            greenCandle: condition5,
            noBodyBreak: condition6,
            rejectionWick: isRejectionWick, // bonus, not mandatory
          },
          failedConditions,
        }
      };

      // ── Analysis Log ──
      const analysisLog = [];
      if (checks.support) analysisLog.push("Price within 1.5% of Support Floor.");
      if (checks.ema) analysisLog.push("EMA9 crossed above EMA21 (Bullish Crossover).");
      if (checks.rsi) analysisLog.push("RSI recovering from oversold region.");
      if (checks.macd) analysisLog.push("MACD showing bullish momentum.");
      if (checks.volume) analysisLog.push("Significant volume spike detected.");
      if (checks.trend) analysisLog.push("Macro Trend is Bullish (1H & 4H).");
      if (!checks.trend) analysisLog.push("Macro Trend is Bearish.");
      if (checks.btc && btcIsStrong) analysisLog.push(`BTC Health ${btcHealth}/4 — market safe for entries.`);
      if (!btcIsSafe) analysisLog.push("BTC Market unsafe. Entries paused.");

      // ── Chart bundles ──
      const formatCandles = (candles) => candles.map(c => ({
        time: Math.floor(c.time / 1000),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close
      }));

      const getChartBundle = (candles) => ({
        candles: formatCandles(candles),
        ema7: calculateEMAArray(candles, 7),
        ema25: calculateEMAArray(candles, 25),
        ema99: calculateEMAArray(candles, 99)
      });

      const chartData = {
        '15m': getChartBundle(candles15m),
        '1h': getChartBundle(candles1h),
        '4h': getChartBundle(candles4h)
      };

      setData({
        ticker: { ...ticker, currentPrice, symbol },
        indicators: {
          rsiVal, ema9, ema21, ema25, ema50_1h, ema50_4h,
          ema9_1h, ema21_1h,
          macd, signal: macdSignal, volAvg, volCurrent, pattern
        },
        scoreData: {
          score, checks, aiRecommendation, analysisLog, plans
        },
        btcData: {
          price: btcLivePrice, health: btcHealth, isSafe: btcIsSafe,
          momentumUp: isBtcMomentumUp, reason: btcReason
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
