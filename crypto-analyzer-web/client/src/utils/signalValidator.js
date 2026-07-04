export const parseDateUTC = (dateStr) => {
  if (!dateStr) return null;
  if (dateStr.includes('Z') || dateStr.includes('+') || dateStr.includes('T')) {
    return new Date(dateStr);
  }
  // Convert "YYYY-MM-DD HH:MM:SS" from MySQL (UTC) into valid ISO-8601 UTC string
  return new Date(dateStr.replace(' ', 'T') + 'Z');
};

export const verifySignalWithKlines = async (sig, updateSignalStatus) => {
  if (sig.status === 'WON' || sig.status === 'LOST') return;

  try {
    const symbol = sig.pair;
    const startTime = parseDateUTC(sig.created_at).getTime();
    
    // Fetch 15m klines to capture spikes safely for up to 10 days
    const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=15m&startTime=${startTime}&limit=1000`);
    if (!res.ok) return;
    
    const klines = await res.json();
    
    const tp1 = parseFloat(sig.tp1);
    const tp2 = parseFloat(sig.sell_target);
    const sl = parseFloat(sig.stop_loss);

    let highestHigh = 0;
    let lowestLow = Infinity;
    let tp1Hit = false;
    let tp2Hit = false;
    let slHit = false;

    for (const candle of klines) {
      const high = parseFloat(candle[2]);
      const low = parseFloat(candle[3]);

      if (high > highestHigh) highestHigh = high;
      if (low < lowestLow) lowestLow = low;

      // Sequential evaluation: Check SL first if we want strict risk management, 
      // but usually if it wicked TP2 we count it. 
      // For simplicity, we just check if it reached the price.
      if (high >= tp2) tp2Hit = true;
      if (tp1 && high >= tp1) tp1Hit = true;
      if (low <= sl) slHit = true;
    }

    if (tp2Hit && sig.status !== 'WON') {
      await updateSignalStatus(sig.id, 'TP2 HIT');
    } else if (tp1Hit && sig.status !== 'PARTIAL WIN' && sig.status !== 'TP1 HIT' && sig.status !== 'WON') {
      await updateSignalStatus(sig.id, 'TP1 HIT');
    } else if (slHit && sig.status !== 'LOST') {
      await updateSignalStatus(sig.id, 'LOST');
    }

  } catch (e) {
    console.error("Kline validation failed for", sig.pair, e);
  }
};
