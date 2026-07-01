import { EMA, RSI, MACD } from 'technicalindicators';

export function calculateEMA(closes, period) {
  if (closes.length < period) return 0;
  const emaArr = EMA.calculate({ period: period, values: closes });
  return emaArr.length > 0 ? emaArr[emaArr.length - 1] : 0;
}

export function calculateEMAArray(candles, period) {
  const closes = candles.map(c => c.close);
  if (closes.length < period) return [];
  
  const emaArr = EMA.calculate({ period: period, values: closes });
  const result = [];
  
  // The package returns an array that is shorter than 'closes' by 'period - 1' elements.
  // The first value in emaArr corresponds to closes[period - 1].
  const offset = period - 1;
  for (let i = 0; i < emaArr.length; i++) {
    result.push({
      time: Math.floor(candles[i + offset].time / 1000),
      value: emaArr[i]
    });
  }
  return result;
}

export function calculateRSI(closes, period = 14) {
  if (closes.length < period + 1) return 50;
  const rsiArr = RSI.calculate({ period: period, values: closes });
  return rsiArr.length > 0 ? rsiArr[rsiArr.length - 1] : 50;
}

export function calculateRSIFullArray(closes, period = 14) {
  if (closes.length < period + 1) return [50, 50];
  const rsiArr = RSI.calculate({ period: period, values: closes });
  return rsiArr.length > 1 ? rsiArr : [50, 50];
}

export function calculateMACD(closes, fast = 12, slow = 26, signalPeriod = 9) {
  if (closes.length < slow + signalPeriod) return { macd: 0, signal: 0, hist: 0 };
  
  const macdArr = MACD.calculate({
    values: closes,
    fastPeriod: fast,
    slowPeriod: slow,
    signalPeriod: signalPeriod,
    SimpleMAOscillator: false,
    SimpleMASignal: false
  });
  
  if (macdArr.length > 0) {
    const last = macdArr[macdArr.length - 1];
    return {
      macd: last.MACD || 0,
      signal: last.signal || 0,
      hist: last.histogram || 0
    };
  }
  return { macd: 0, signal: 0, hist: 0 };
}

export function calculateAverage(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function detectCandlePattern(lastCandles) {
  if (lastCandles.length < 3) return "None";
  const [c1, c2, c3] = lastCandles;
  
  const isBullish = c => c.close > c.open;
  const isBearish = c => c.close < c.open;
  
  // Engulfing
  if (isBearish(c2) && isBullish(c3) && c3.close > c2.open && c3.open < c2.close) return "Bullish Engulfing";
  
  // Hammer
  const body = Math.abs(c3.close - c3.open);
  const lowerWick = isBullish(c3) ? c3.open - c3.low : c3.close - c3.low;
  const upperWick = isBullish(c3) ? c3.high - c3.close : c3.high - c3.open;
  if (lowerWick > body * 2 && upperWick < body * 0.5) return "Hammer";
  
  // Morning Star
  if (isBearish(c1) && Math.abs(c2.close - c2.open) < (c1.open - c1.close) * 0.3 && isBullish(c3) && c3.close > (c1.open + c1.close) / 2) {
    return "Morning Star";
  }
  
  return "None";
}

export function findNearestSwingLevels(candles, currentPrice, minGainPct = 1.5) {
  let support = 0;
  let resistance = Infinity;
  let targetType = 'SWING';

  for (let i = 1; i < candles.length - 1; i++) {
    const prev = candles[i - 1];
    const curr = candles[i];
    const next = candles[i + 1];

    if (curr.low < prev.low && curr.low < next.low) {
      if (curr.low < currentPrice && curr.low > support) {
        support = curr.low;
      }
    }
    if (curr.high > prev.high && curr.high > next.high) {
      if (curr.high > currentPrice && curr.high < resistance) {
        resistance = curr.high;
      }
    }
  }

  if (support === 0) support = currentPrice * 0.95;
  if (resistance === Infinity) resistance = currentPrice * 1.05;

  const potentialGain = ((resistance - currentPrice) / currentPrice) * 100;
  if (potentialGain < minGainPct) {
    resistance = currentPrice * (1 + (minGainPct / 100));
    targetType = 'PROJECTED';
  }

  return { support, resistance, targetType };
}
