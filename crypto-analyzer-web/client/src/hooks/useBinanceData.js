import { useState, useEffect, useRef } from 'react';
import { 
  calculateEMA, calculateAverage, calculateRSI, calculateRSIFullArray, 
  calculateMACD, detectCandlePattern, findNearestSwingLevels, 
  findSwingLow, findSwingHigh, calculateConfidenceScore, getConfidenceLabel, 
  calculateRiskLevel, calculateEMAArray 
} from '../utils/indicators';
import { fetchTickerData, fetchKlines } from '../utils/binance';

// Export calculations to be used by background scanner without modifying core logic
export function performCalculations({
  symbol, mode, riskMode, ticker,
  candles15m, candles1h, candles4h,
  btcCandles15m, btcCandles1h,
  modelWeights = {}, // Optional calibration weights from DB
  signalHistory = [], // Optional list of signals to lock prediction when trade is active
  predictionSnapshots = [] // Optional prediction snapshots to fetch targets
}) {
  const livePrice = parseFloat(ticker.lastPrice);
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

  // SCORE SYSTEM
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

  // TRADITIONAL SIGNAL LOGIC
  const lastTickOpen = scalpCandles[scalpCandles.length - 1].open;
  const isGreenCandle = currentPrice > lastTickOpen;
  
  const rsiThreshold = riskMode === 'aggressive' ? 45 : 38;
  const isOversold = previousRsiVal < rsiThreshold;
  const rsiBendingUp = rsiVal > previousRsiVal;
  
  const isMacroTrendUp = ema9_1h > ema21_1h;
  
  const minBtcHealth = riskMode === 'aggressive' ? 1 : 2;
  const isBtcSafeForTrading = btcHealth >= minBtcHealth;

  const swingLowSL = findSwingLow(scalpCandles, currentPrice, 20);
  const swingHighTP1 = findSwingHigh(scalpCandles, currentPrice, 30);
  const tp1Distance = swingHighTP1 - currentPrice;
  const swingHighTP2 = swingHighTP1 + tp1Distance * 0.5;

  const tradeRisk = currentPrice - swingLowSL;
  const tradeRewardTP1 = swingHighTP1 - currentPrice;
  const tradeRewardTP2 = swingHighTP2 - currentPrice;
  const rrRatioTP1 = tradeRisk > 0 ? tradeRewardTP1 / tradeRisk : 0;
  const rrRatioTP2 = tradeRisk > 0 ? tradeRewardTP2 / tradeRisk : 0;

  const hasMinRR = rrRatioTP1 >= 1.5;

  const prevCandle = scalpCandles[scalpCandles.length - 2];
  const refLevel = swingLowSL;

  const isBodyBreak = prevCandle.close < refLevel;

  const isRejectionWick =
    prevCandle.low < refLevel &&
    prevCandle.close > refLevel &&
    prevCandle.close > prevCandle.open;

  const prevVol = volumes[volumes.length - 2];
  const volAtLevel = prevVol > volAvg * 1.3;

  const condition6 = !isBodyBreak;
  const condition1 = currentPrice < ema25;
  const condition2 = isOversold && rsiBendingUp;
  const condition3 = isMacroTrendUp || (riskMode === 'aggressive' && isRejectionWick);
  const condition4 = isBtcSafeForTrading;
  const condition5 = isGreenCandle;

  const isSetupActive = condition1 && condition2 && condition3 && condition4 && condition5 && condition6;

  const confidenceScore = calculateConfidenceScore({
    rsiVal, previousRsiVal, macd, macdSignal,
    volCurrent, volAvg, btcHealth, isVolumeSpike,
    ema50_4h, currentPrice, pattern,
    isRejectionWick, volAtLevel
  });
  const confidenceLabel = getConfidenceLabel(confidenceScore);
  const riskLevel = calculateRiskLevel(rrRatioTP2, btcHealth);

  const failedConditions = [];
  if (!condition1) failedConditions.push(`Price above EMA25 (${ema25.toFixed(4)})`);
  if (!condition2) {
    if (!isOversold) failedConditions.push(`RSI not oversold (${rsiVal.toFixed(1)} > ${rsiThreshold})`);
    if (!rsiBendingUp) failedConditions.push('RSI still falling');
  }
  if (!condition3) failedConditions.push(riskMode === 'aggressive' ? '1H Bearish & No Rejection Wick' : '1H Bearish Structure (EMA9 < EMA21)');
  if (!condition4) failedConditions.push(`BTC too weak (Health: ${btcHealth}/4, Min: ${minBtcHealth})`);
  if (!condition5) failedConditions.push('No green candle');
  if (!condition6) failedConditions.push('⚠️ Support Level Body Break — Level Invalid');
  if (isSetupActive && !hasMinRR) failedConditions.push(`R:R too low (${rrRatioTP1.toFixed(2)} < 1.5)`);

  const rejectionWickInfo = isRejectionWick
    ? `✅ Rejection Wick at ${refLevel.toFixed(4)} — Buyers defended level` + (volAtLevel ? ' (HIGH VOLUME)' : '')
    : '';
  const bodyBreakInfo = isBodyBreak
    ? `🔴 Body Break at ${refLevel.toFixed(4)} — Support broken, trade invalid`
    : '';

  const waitReason = failedConditions.length > 0 ? failedConditions[0] : "";
  const traditionalBuyStatus = (isSetupActive && hasMinRR) ? "BUY ACTIVE" : `WAITING${waitReason ? ` — ${waitReason}` : ""}`;

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
    riskMode: riskMode
  };

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
        rejectionWick: isRejectionWick,
      },
      thresholds: {
        rsi: rsiThreshold,
        btcHealth: minBtcHealth,
        macroTrendLabel: riskMode === 'aggressive' ? '1H Bullish OR Rejection Wick' : '1H Macro Bullish (EMA9 > EMA21)',
      },
      failedConditions,
    }
  };

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

  const dayMs = 24 * 60 * 60 * 1000;
  const lastTime = scalpCandles[scalpCandles.length - 1].time;
  
  // Apply model calibration weights (default 1.0 = no adjustment)
  const bw1 = modelWeights.bullish_wave1_mult ?? 1.0;
  const bw3 = modelWeights.bullish_wave3_mult ?? 1.0;
  const bw5 = modelWeights.bullish_wave5_mult ?? 1.0;
  const brw1 = modelWeights.bearish_wave1_mult ?? 1.0;
  const brw3 = modelWeights.bearish_wave3_mult ?? 1.0;

  let projectedPath = [];
  let direction = 'BEARISH';
  let wavePoints = {};

  if (score >= 4) {
    direction = 'BULLISH';
    const wave1Val = (currentPrice + (swingHighTP1 - currentPrice)) * bw1;
    const wave2Val = currentPrice + (swingHighTP1 - currentPrice) * 0.3;
    const wave3Val = (currentPrice + (swingHighTP2 - currentPrice)) * bw3;
    const wave4Val = wave3Val - (wave3Val - wave2Val) * 0.3;
    const wave5Val = (currentPrice + (swingHighTP2 + (swingHighTP2 - currentPrice) * 0.4 - currentPrice)) * bw5;

    wavePoints = {
      wave1: { time: Math.floor((lastTime + dayMs * 1.5) / 1000), value: wave1Val },
      wave2: { time: Math.floor((lastTime + dayMs * 2.5) / 1000), value: wave2Val },
      wave3: { time: Math.floor((lastTime + dayMs * 4.5) / 1000), value: wave3Val },
      wave4: { time: Math.floor((lastTime + dayMs * 5.5) / 1000), value: wave4Val },
      wave5: { time: Math.floor((lastTime + dayMs * 7.0) / 1000), value: wave5Val },
    };

    projectedPath = [
      { time: Math.floor(lastTime / 1000), value: currentPrice },
      wavePoints.wave1,
      wavePoints.wave2,
      wavePoints.wave3,
      wavePoints.wave4,
      wavePoints.wave5,
    ];
  } else {
    direction = 'BEARISH';
    const wave1Val = swingLowSL * brw1;
    const wave2Val = swingLowSL + (currentPrice - swingLowSL) * 0.4;
    const wave3Val = (swingLowSL - (currentPrice - swingLowSL) * 1.2) * brw3;
    const wave4Val = wave3Val + (wave2Val - wave3Val) * 0.3;
    const wave5Val = wave3Val - (currentPrice - swingLowSL) * 1.5;

    wavePoints = {
      wave1: { time: Math.floor((lastTime + dayMs * 1.5) / 1000), value: wave1Val },
      wave2: { time: Math.floor((lastTime + dayMs * 2.5) / 1000), value: wave2Val },
      wave3: { time: Math.floor((lastTime + dayMs * 4.5) / 1000), value: wave3Val },
      wave4: { time: Math.floor((lastTime + dayMs * 5.5) / 1000), value: wave4Val },
      wave5: { time: Math.floor((lastTime + dayMs * 7.0) / 1000), value: wave5Val },
    };

    projectedPath = [
      { time: Math.floor(lastTime / 1000), value: currentPrice },
      wavePoints.wave1,
      wavePoints.wave2,
      wavePoints.wave3,
      wavePoints.wave4,
      wavePoints.wave5,
    ];
  }



  const activeTfKey = mode === 'scalp' ? '15m' : '1h';
  if (chartData[activeTfKey]) {
    chartData[activeTfKey].projectedPath = projectedPath;
  }

  return {
    isSetupActive,
    hasMinRR,
    autoSignal,
    direction,
    wavePoints,   // For snapshot saving
    projectedPath, // For chart display
    data: {
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
    }
  };
}

export function useBinanceData(symbol, mode, riskMode = 'safe') {
  const [data, setData] = useState({
    ticker: null,
    indicators: null,
    scoreData: null,
    btcData: null,
    chartData: null,
    newSignalAlert: null,
    loading: true,
    error: null,
    lastUpdate: null,
  });

  const [activeTrade, setActiveTrade] = useState(null);
  const [signalHistory, setSignalHistory] = useState([]);
  const [modelWeights, setModelWeights] = useState({});
  const [predictionSnapshots, setPredictionSnapshots] = useState([]);
  const [sysSettings, setSysSettings] = useState({ max_signals_per_coin: 1 });
  const [activePattern, setActivePattern] = useState(null);
  const lastSignalTimes = useRef({});
  const lastSnapshotTimes = useRef({});

  const apiUrl = typeof window !== 'undefined'
    ? `http://${window.location.hostname}/trading-bots/crypto-analyzer-web/server/public`
    : 'http://localhost/trading-bots/crypto-analyzer-web/server/public';

  const fetchSnapshots = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/predictions`);
      if (res.ok) {
        const fetched = await res.json();
        setPredictionSnapshots(fetched);
      }
    } catch(e) {
      console.error('Failed to fetch prediction snapshots:', e);
    }
  };

  // Load model calibration weights, settings, and snapshots on mount
  useEffect(() => {
    fetch(`${apiUrl}/api/predictions/weights`)
      .then(r => r.json())
      .then(w => setModelWeights(w))
      .catch(() => {});
    fetch(`${apiUrl}/api/settings`)
      .then(r => r.json())
      .then(s => {
        if (s.max_signals_per_coin) {
          setSysSettings(s);
        }
      })
      .catch(() => {});
    fetchSnapshots();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('signalHistory');
    if (saved) {
      try { setSignalHistory(JSON.parse(saved)); } catch(e) {}
    }
    const fetchSignals = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? `http://${window.location.hostname}/trading-bots/crypto-analyzer-web/server/public` : 'http://localhost/trading-bots/crypto-analyzer-web/server/public');
        const res = await fetch(`${apiUrl}/api/signals`);
        if (res.ok) {
          const fetched = await res.json();
          setSignalHistory(fetched);
        }
      } catch(e) {}
    };
    fetchSignals();
  }, []);

  const saveSignal = async (newSignal) => {
    try {
      const payload = {
        pair: newSignal.pair,
        mode: newSignal.mode,
        risk_mode: newSignal.riskMode || 'safe',
        current_price: newSignal.entryPrice,
        buy_target: newSignal.targets.buyLimit,
        tp1: newSignal.targets.tp1,
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

  const savePredictionSnapshot = async (results, currentSymbol, currentMode, currentRisk) => {
    try {
      const wp = results.wavePoints;
      const res = await fetch(`${apiUrl}/api/predictions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pair: currentSymbol,
          mode: currentMode,
          risk_mode: currentRisk,
          direction: results.direction,
          score: results.data?.scoreData?.score ?? 0,
          entry_price: results.data?.ticker?.currentPrice ?? 0,
          wave1_price: wp.wave1?.value, wave1_time: wp.wave1?.time,
          wave2_price: wp.wave2?.value, wave2_time: wp.wave2?.time,
          wave3_price: wp.wave3?.value, wave3_time: wp.wave3?.time,
          wave4_price: wp.wave4?.value, wave4_time: wp.wave4?.time,
          wave5_price: wp.wave5?.value, wave5_time: wp.wave5?.time,
        })
      });
      if (res.ok) {
        fetchSnapshots();
      }
    } catch(e) {
      console.error('Failed to save prediction snapshot:', e);
    }
  };

  const runAnalysis = async () => {
    try {
      const ticker = await fetchTickerData(symbol);
      if (!ticker) throw new Error("Ticker fetch failed");

      const candles15m = await fetchKlines(symbol, '15m', 500);
      const candles1h = await fetchKlines(symbol, '1h', 200);
      const candles4h = await fetchKlines(symbol, '4h', 200);
      const btcCandles15m = await fetchKlines('BTCUSDT', '15m', 100);
      const btcCandles1h = await fetchKlines('BTCUSDT', '1h', 100);

      if (!candles15m || !candles1h || !candles4h || !btcCandles15m || !btcCandles1h) {
        throw new Error("Klines fetch failed");
      }

      const results = performCalculations({
        symbol, mode, riskMode, ticker,
        candles15m, candles1h, candles4h,
        btcCandles15m, btcCandles1h,
        modelWeights,
        signalHistory,
        predictionSnapshots
      });

      let newSignalAlert = null;
      if (results.isSetupActive && results.hasMinRR) {
        const now = Date.now();
        const lastTime = lastSignalTimes.current[symbol] || 0;
        
        // Check if there are already active (PENDING or BUY ACTIVE) signals for this coin
        const activeCount = signalHistory.filter(sig => sig.pair === symbol && (sig.status === 'PENDING' || sig.status === 'BUY ACTIVE')).length;
        const maxAllowed = parseInt(sysSettings.max_signals_per_coin || 1, 10);

        // Only fire if 15min cooldown passed AND we haven't reached the max allowed concurrent signals for this coin
        if (now - lastTime > 900000 && activeCount < maxAllowed) { 
          lastSignalTimes.current[symbol] = now;
          saveSignal(results.autoSignal).catch(e => console.error("Auto save failed", e));
          newSignalAlert = results.autoSignal;

          // Auto-save prediction snapshot (6-hour cooldown per symbol)
          const lastSnapTime = lastSnapshotTimes.current[symbol] || 0;
          if (now - lastSnapTime > 6 * 60 * 60 * 1000) {
            lastSnapshotTimes.current[symbol] = now;
            savePredictionSnapshot(results, symbol, mode, riskMode);
          }
        }
      }

      // ---- PATTERN PREDICTION LOCKING LOGIC ----
      const isPatternDetected = results.isSetupActive && results.hasMinRR;
      const now = Date.now();
      const scalpCandles = mode === 'scalp' ? candles15m : candles1h;
      const currentCandleTime = scalpCandles[scalpCandles.length - 1].time;
      const currentPrice = results.data?.ticker?.currentPrice || (scalpCandles[scalpCandles.length - 1].close);
      
      let currentPattern = activePattern;
      
      const isExpired = currentPattern && (now - currentPattern.timestamp > 48 * 60 * 60 * 1000); // 2 days expiration
      const isDifferent = currentPattern && (currentPattern.symbol !== symbol || currentPattern.mode !== mode);
      
      if (!currentPattern || isExpired || isDifferent) {
        if (isPatternDetected) {
          currentPattern = {
            symbol,
            mode,
            timestamp: now,
            detectTime: currentCandleTime,
            entryPrice: currentPrice,
            targets: {
              support: results.data.plans.traditional.support,
              tp1: results.data.plans.traditional.tp1,
              tp2: results.data.plans.traditional.tp2,
              stopLoss: results.data.plans.traditional.stopLoss,
              rrRatio: results.data.plans.traditional.rrRatio
            },
            projectedPath: results.projectedPath,
            wavePoints: results.wavePoints,
            direction: results.direction
          };
          setActivePattern(currentPattern);
        } else {
          if (currentPattern) {
            setActivePattern(null);
            currentPattern = null;
          }
        }
      } else {
        // We have a pattern lock. If a new pattern is detected on a different candle, 
        // AND the old locked pattern is at least 24 hours old, we overwrite it.
        if (isPatternDetected && currentCandleTime !== currentPattern.detectTime && (now - currentPattern.timestamp > 24 * 60 * 60 * 1000)) {
          currentPattern = {
            symbol,
            mode,
            timestamp: now,
            detectTime: currentCandleTime,
            entryPrice: currentPrice,
            targets: {
              support: results.data.plans.traditional.support,
              tp1: results.data.plans.traditional.tp1,
              tp2: results.data.plans.traditional.tp2,
              stopLoss: results.data.plans.traditional.stopLoss,
              rrRatio: results.data.plans.traditional.rrRatio
            },
            projectedPath: results.projectedPath,
            wavePoints: results.wavePoints,
            direction: results.direction
          };
          setActivePattern(currentPattern);
        }
      }
      
      // Override active results with the locked pattern if active
      if (currentPattern) {
        const activeTfKey = mode === 'scalp' ? '15m' : '1h';
        
        // Override projectedPath in chartData
        if (results.data && results.data.chartData && results.data.chartData[activeTfKey]) {
          results.data.chartData[activeTfKey].projectedPath = currentPattern.projectedPath;
        }
        
        // Override traditional plan targets
        if (results.data && results.data.plans && results.data.plans.traditional) {
          const trad = results.data.plans.traditional;
          trad.support = currentPattern.targets.support;
          trad.tp1 = currentPattern.targets.tp1;
          trad.tp2 = currentPattern.targets.tp2;
          trad.stopLoss = currentPattern.targets.stopLoss;
          trad.rrRatio = currentPattern.targets.rrRatio;
          
          // Re-calculate live distance metrics to the locked targets
          const livePrice = results.data.ticker.currentPrice;
          trad.distanceToSupport = ((livePrice - trad.support) / livePrice * 100);
          trad.distanceToTP1 = ((trad.tp1 - livePrice) / livePrice * 100);
          trad.distanceToTP2 = ((trad.tp2 - livePrice) / livePrice * 100);
          
          // Set locked status label
          const hrsLeft = Math.max(0, Math.ceil((48 * 60 * 60 * 1000 - (now - currentPattern.timestamp)) / (60 * 60 * 1000)));
          trad.buyStatus = `PREDICTION LOCKED (${hrsLeft}h left)`;
        }
      }

      // Filter and format saved prediction snapshots for the active coin and mode
      const symbolSnaps = predictionSnapshots
        .filter(s => s.pair === symbol && s.mode === mode)
        .slice(0, 3) // Show last 3 saved paths to keep chart clean
        .map(snap => {
          const startSeconds = parseInt(snap.wave1_time) - (1.5 * 24 * 60 * 60);
          return [
            { time: startSeconds, value: parseFloat(snap.entry_price) },
            { time: parseInt(snap.wave1_time), value: parseFloat(snap.wave1_price) },
            { time: parseInt(snap.wave2_time), value: parseFloat(snap.wave2_price) },
            { time: parseInt(snap.wave3_time), value: parseFloat(snap.wave3_price) },
            { time: parseInt(snap.wave4_time), value: parseFloat(snap.wave4_price) },
            { time: parseInt(snap.wave5_time), value: parseFloat(snap.wave5_price) },
          ];
        });

      // Inject snapshots into the active chart data configurations
      if (results.data && results.data.chartData) {
        Object.keys(results.data.chartData).forEach(tf => {
          if (results.data.chartData[tf]) {
            results.data.chartData[tf].snapshots = symbolSnaps;
          }
        });
      }

      setData({
        ...results.data,
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
  }, [symbol, mode, riskMode]);

  const resetPatternLock = () => {
    setActivePattern(null);
  };

  return { 
    data, activeTrade, setActiveTrade, signalHistory, saveSignal, 
    updateSignalStatus, runAnalysis, savePredictionSnapshot, modelWeights,
    activePattern, resetPatternLock
  };
}
