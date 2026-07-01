// Binance Public API Fetch Helpers

export async function fetchTickerData(symbol) {
  try {
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('API Error');
    return await res.json();
  } catch (err) {
    console.error("Ticker fetch error:", err);
    return null;
  }
}

export async function fetchKlines(symbol, interval, limit) {
  try {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('API Error');
    const data = await res.json();
    return data.map(d => ({
      time: d[0],
      open: parseFloat(d[1]),
      high: parseFloat(d[2]),
      low: parseFloat(d[3]),
      close: parseFloat(d[4]),
      volume: parseFloat(d[5]),
    }));
  } catch (err) {
    console.error("Klines fetch error:", err);
    return null;
  }
}

export async function fetchAllUSDTPairs() {
  try {
    const url = `https://api.binance.com/api/v3/exchangeInfo`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('API Error');
    const data = await res.json();
    return data.symbols
      .filter(s => s.quoteAsset === 'USDT' && s.status === 'TRADING')
      .map(s => s.symbol)
      .sort();
  } catch (err) {
    console.error("ExchangeInfo fetch error:", err);
    return [];
  }
}
