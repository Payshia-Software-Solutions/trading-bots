export const generateGeminiReport = async (apiKey, symbol, data, timeStr) => {
  if (!apiKey) throw new Error("API Key is missing");

  const prompt = `You are an expert crypto trader. Analyze this live market data and give a highly detailed, friendly analytical report in Sinhala, exactly like this format: "මචං, චාර්ට් එක දැක්කාම...". Use emojis. 
Be highly analytical, mentioning geometric patterns, moving average pressure, BTC correlation, and order hits. Emphasize that the user should be patient for the sniper entry.
Data at ${timeStr}:
Coin: ${symbol}
Current Price: ${data?.chartData?.['15m']?.candles ? data.chartData['15m'].candles[data.chartData['15m'].candles.length - 1].close : (data?.ticker?.currentPrice || 'Unknown')}
Trend (1H/4H): ${data?.scoreData?.checks?.trend ? 'BULLISH' : 'BEARISH'}
MACD: ${data?.scoreData?.checks?.macd ? 'BULLISH' : 'BEARISH'}
EMA Crossover: ${data?.scoreData?.checks?.ema ? 'BULLISH' : 'BEARISH'}
Sniper Buy Limit: ${data?.scoreData?.plans?.sniper?.support || 'N/A'}
Current distance to Buy Limit: ${
  data?.ticker?.currentPrice && data?.scoreData?.plans?.sniper?.support 
    ? (((parseFloat(data.ticker.currentPrice) - parseFloat(data.scoreData.plans.sniper.support)) / parseFloat(data.ticker.currentPrice)) * 100).toFixed(2)
    : 'Unknown'
}% away
BTC Market Status: ${data?.btcData?.isSafe ? 'Safe' : 'Dumping'}
BTC Health: ${data?.btcData?.health}/4

Make the report sound like a real, experienced Sri Lankan crypto trader talking to a friend.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    
    const json = await response.json();
    if (json.error) {
      throw new Error(json.error.message);
    }
    return json.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("Gemini Error:", error);
    const models = await fetchModelsList(apiKey);
    if (models.length > 0) {
      throw new Error(`${error.message}. Supported models: ${models.join(', ')}`);
    } else {
      throw new Error(`${error.message}. (No models returned. Verify if Generative Language API is enabled on your API Key)`);
    }
  }
};

const fetchModelsList = async (apiKey) => {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const json = await res.json();
    if (json.models) {
      return json.models.map(m => m.name.replace("models/", ""));
    }
    return [];
  } catch (e) {
    return [];
  }
};

export const getGeminiTradeTargets = async (apiKey, symbol, data, timeStr) => {
  if (!apiKey) throw new Error("API Key is missing");

  // Format recent candles for AI
  const recentCandles = data?.chartData?.['15m']?.candles ? data.chartData['15m'].candles.slice(-20) : [];
  const candleStr = recentCandles.map(c => `[H: ${c.high.toFixed(4)}, L: ${c.low.toFixed(4)}, C: ${c.close.toFixed(4)}]`).join(", ");

  const prompt = `You are a highly advanced quantitative trading AI acting for a Top 1% Pro Trader Quant Fund. 
Your task is to analyze the technical data for ${symbol} and output the absolute best Trade Setup.
You MUST output ONLY a valid JSON object. Do not include any markdown formatting, backticks, or extra text.

Input Data:
Time of Analysis: ${timeStr}
Current Price: ${data?.chartData?.['15m']?.candles ? data.chartData['15m'].candles[data.chartData['15m'].candles.length - 1].close : 'Unknown'}
Trend (1H/4H): ${data?.scoreData?.checks?.trend ? 'BULLISH' : 'BEARISH'}
MACD: ${data?.scoreData?.checks?.macd ? 'BULLISH' : 'BEARISH'}
EMA Crossover: ${data?.scoreData?.checks?.ema ? 'BULLISH' : 'BEARISH'}
RSI: ${data?.scoreData?.checks?.rsi ? 'OVERSOLD' : 'NORMAL'}
BTC Market Status: ${data?.btcData?.isSafe ? 'Safe' : 'Dumping'}
BTC Price: $${data?.btcData?.price || 'Unknown'}
BTC Health: ${data?.btcData?.health}/4
Last 20 Candles (15m): ${candleStr}

CRITICAL RULES (PRO TRADER FRAMEWORK):
1. MACRO & DXY: Factor in the general US Dollar impact and global market conditions based on the current time and BTC stability.
2. SESSIONS: Determine the active trading session (Asian, London, NY) using ${timeStr} (in Sri Lanka time UTC+5:30) and explain its impact on volatility.
3. LIQUIDITY HUNTS: Identify where retail stop losses are likely pooled. Set your "support" entry slightly BELOW these retail pools to catch the sweep (The Magnet Effect).
4. STRICT 1:2 R:R: Your calculated "support" (Entry), "resistance" (TP), and "stopLoss" (SL) MUST yield at least a 1:2 Risk-to-Reward Ratio. No exceptions.
5. NO FOMO: If the market is too extended or conditions are bad, place the entry extremely conservatively. 

Based on this strict criteria, calculate and output:
1. "support": The exact best sniper entry price.
2. "resistance": The take profit target.
3. "stopLoss": The strict stop loss level.
4. "trend": Explain the current trend context in Sinhala.
5. "btc": Explain the BTC market status impact on this coin in Sinhala.
6. "indicators": Explain the technical indicators confluence in Sinhala.
7. "math": Mathematically explain WHY you chose the EXACT support level in Sinhala.
8. "sellReason": Explain the reasoning behind your chosen resistance target level in Sinhala.
9. "timeframe": Predict the estimated timeframe to reach the targets in Sinhala.
10. "pricePath": Describe the expected price path and volatility in Sinhala.
11. "liquidity": Explain where liquidity/stop-loss pools are resting and how whales might hunt them in Sinhala.
12. "session": State the current trading session and its impact on volume in Sinhala.
13. "dxyImpact": Briefly state the expected macroeconomic/DXY influence in Sinhala.

IMPORTANT: Write all text values as single continuous strings on ONE LINE. Do not use raw carriage returns or newlines.
CRITICAL: DO NOT use double quotes (") inside your Sinhala text values. Use single quotes (') if needed. Your output MUST be perfectly valid JSON.

Output format MUST be EXACTLY:
{"support": 1.8300, "resistance": 1.8600, "stopLoss": 1.8000, "trend": "සිංහලෙන් trend එක...", "btc": "සිංහලෙන් BTC...", "indicators": "සිංහලෙන් indicators...", "math": "සිංහලෙන් ඇයි 1.8300...", "sellReason": "සිංහලෙන් tp එක...", "timeframe": "සිංහලෙන් වෙලාව...", "pricePath": "සිංහලෙන් price path එක...", "liquidity": "සිංහලෙන් liquidity pools...", "session": "සිංහලෙන් session එක...", "dxyImpact": "සිංහලෙන් DXY බලපෑම..."}`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2, // Low temp for more analytical/math precision
          responseMimeType: "application/json"
        }
      })
    });
    
    const json = await response.json();
    if (json.error) {
      throw new Error(json.error.message);
    }
    const textResp = json.candidates[0].content.parts[0].text;
    
    // Robust JSON extraction using Regex
    const jsonMatch = textResp.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON structure found in Gemini response: " + textResp);
    }
    
    let cleanedText = jsonMatch[0];
    
    const parsed = JSON.parse(cleanedText);
    return {
      support: parseFloat(parsed.support),
      resistance: parseFloat(parsed.resistance),
      stopLoss: parseFloat(parsed.stopLoss),
      trend: parsed.trend || "",
      btc: parsed.btc || "",
      indicators: parsed.indicators || "",
      math: parsed.math || "",
      sellReason: parsed.sellReason || "",
      timeframe: parsed.timeframe || "",
      pricePath: parsed.pricePath || "",
      liquidity: parsed.liquidity || "",
      session: parsed.session || "",
      dxyImpact: parsed.dxyImpact || ""
    };
  } catch (error) {
    console.error("Gemini Target Error:", error);
    const models = await fetchModelsList(apiKey);
    if (models.length > 0) {
      throw new Error(`${error.message}. Supported models: ${models.join(', ')}`);
    } else {
      throw new Error(`${error.message}. (No models returned. Verify if Generative Language API is enabled on your API Key)`);
    }
  }
};
