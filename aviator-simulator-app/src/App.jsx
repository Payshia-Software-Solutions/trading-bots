import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldAlert, 
  Database, 
  BarChart3, 
  History, 
  Percent,
  Camera,
  Compass,
  Lightbulb,
  Activity
} from 'lucide-react';
import Tesseract from 'tesseract.js';

function App() {
  // Data State
  const [multiplierInput, setMultiplierInput] = useState("");
  const [multipliers, setMultipliers] = useState([]);
  
  // OCR State
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState("");

  // Analysis States
  const [stats, setStats] = useState({
    total: 0,
    avg: 0,
    median: 0,
    max: 0,
    dist: [0, 0, 0, 0] // <1.2, 1.2-2.0, 2.0-5.0, 5.0+
  });

  const [probabilities, setProbabilities] = useState({
    p12: 0,
    p15: 0,
    p20: 0,
    p30: 0,
    p50: 0
  });

  const [patternSignals, setPatternSignals] = useState({
    currentColdStreak: 0,
    recentHighOdd: null,
    riskLevel: "N/A",
    recommendedTarget: 0.00,
    highOddsStrikeEstimate: "",
    highOddsStrikeRound: 0,
    roundsSinceHighOdd: 0
  });

  // High Odds frequency & gap analysis
  const [highOddsStats, setHighOddsStats] = useState(null);
  const [highOddsThreshold, setHighOddsThreshold] = useState(8);

  const [nextRoundsForecast, setNextRoundsForecast] = useState([]);
  const [predictorMode, setPredictorMode] = useState("safe");
  // Detected pattern info for display
  const [detectedPattern, setDetectedPattern] = useState(null);

  // Provably Fair Verifier State
  const [pfServerSeed, setPfServerSeed] = useState("");
  const [pfClientSeed, setPfClientSeed] = useState("");
  const [pfNonce, setPfNonce] = useState("");
  const [pfResult, setPfResult] = useState(null);
  const [pfLoading, setPfLoading] = useState(false);

  // Visual Canvas OCR state
  const ocrCanvasRef = useRef(null);
  const [showOcrPreview, setShowOcrPreview] = useState(false);

  // Chrome Extension Sync State
  const [extensionConnected, setExtensionConnected] = useState(false);
  const [extensionLastUpdated, setExtensionLastUpdated] = useState(null);
  const [extensionSourceUrl, setExtensionSourceUrl] = useState("");

  // Process OCR image function
  const processOcrImage = async (imageSource) => {
    setOcrLoading(true);
    setOcrProgress("Loading screenshot...");
    setShowOcrPreview(true);

    const img = new Image();
    const reader = new FileReader();
    
    reader.onload = (e) => {
      img.onload = () => {
        const canvas = ocrCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        // Draw raw image at 3x scale — NO pixel manipulation
        // Tesseract works best on the raw image. Any canvas filtering we apply
        // risks destroying text pixels and reducing accuracy.
        const scale = 3;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        setOcrProgress("Reading screenshot...");
        
        // Use PSM 11 = Sparse text mode
        // PSM 11 finds as much text as possible in no particular order, without requiring layout assumptions.
        // It is specifically ideal for detecting floating labels (like multiplier badges) scattered across an image.
        Tesseract.recognize(
          canvas,
          'eng',
          {
            logger: m => {
              if (m.status === 'recognizing text') {
                setOcrProgress(`Reading: ${(m.progress * 100).toFixed(0)}%`);
              }
            },
            tessedit_pageseg_mode: '11',
            tessedit_char_whitelist: '0123456789.,xX '
          }
        ).then(({ data: { text, words } }) => {
          setOcrLoading(false);
          setOcrProgress("");
          
          // ── OCR Multiplier Parser ──────────────────────────────────────
          // Problem: Tesseract sometimes splits "45.03x" → "4" + "5.03x"
          //           or "1,520.87x" → "1" + "520.87x" due to badge layout.
          // Solution: 
          //   1. Find all raw tokens that end with 'x' (including number+x)
          //   2. Also collect bare digit tokens that appear just before a number+x
          //   3. If prefix+main yields a plausible Aviator multiplier, merge them
          // ──────────────────────────────────────────────────────────────

          // Step 1: tokenize the raw OCR output into words
          const tokens = text.trim().split(/\s+/);
          const foundOdds = [];

          for (let ti = 0; ti < tokens.length; ti++) {
            const tok = tokens[ti];

            // Case A: token contains digits followed by x — e.g. "5.03x", "10.02x", "45.03x"
            const mainMatch = tok.match(/^(\d+(?:[.,]\d+)?)\s*x$/i);
            if (mainMatch) {
              let numStr = mainMatch[1].replace(/,/g, '');
              // Fix double-dot: "1.520.87" → "1520.87"
              const dots = (numStr.match(/\./g) || []).length;
              if (dots > 1) {
                const parts = numStr.split('.');
                const last = parts.pop();
                numStr = parts.join('') + '.' + last;
              }
              let val = parseFloat(numStr);
              if (isNaN(val)) continue;

              // Check if the PREVIOUS token is a bare integer prefix (1–3 digits)
              // and merging gives a plausible Aviator multiplier
              if (ti > 0) {
                const prevTok = tokens[ti - 1];
                const prevMatch = prevTok.match(/^(\d{1,3})$/);
                if (prevMatch) {
                  const merged = parseFloat(prevMatch[1] + numStr.replace('.', ''));
                  // Reconstruct: prefix digits + the decimal portion
                  const mergedStr = prevMatch[1] + numStr;
                  const mergedVal = parseFloat(mergedStr);
                  // Accept merge if the merged value is a plausible Aviator multiplier
                  // and larger than the unmerged value (confirms prefix adds magnitude)
                  if (!isNaN(mergedVal) && mergedVal >= 10 && mergedVal <= 999999 && mergedVal > val) {
                    // Mark prev token as consumed so we don't double-count it
                    tokens[ti - 1] = '__used__';
                    val = mergedVal;
                  }
                }
              }

              // Final validity check: Aviator multipliers are always >= 1.00
              if (val >= 1.0 && val <= 999999) {
                foundOdds.push(val);
              }
              continue;
            }

            // Case B: token is a bare integer like "45" with an 'x' appended without space
            // e.g. "45x" (whole-number crash rounds in some games)
            const bareXMatch = tok.match(/^(\d{1,7})x$/i);
            if (bareXMatch) {
              const val = parseFloat(bareXMatch[1]);
              if (!isNaN(val) && val >= 1 && val <= 999999) {
                foundOdds.push(val);
              }
            }
          }
          
          // Draw bounding boxes on canvas safely if words array is returned
          if (words && Array.isArray(words)) {
            words.forEach(word => {
              const wordText = word.text;
              const isMatch = /(\d+(?:\.\d+)?)\s*x/gi.test(wordText);
              if (isMatch) {
                // Draw bounding box
                ctx.strokeStyle = '#10b981'; // Green box
                ctx.lineWidth = 3;
                ctx.strokeRect(word.bbox.x0, word.bbox.y0, word.bbox.x1 - word.bbox.x0, word.bbox.y1 - word.bbox.y0);
                
                // Draw small text label
                ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
                ctx.fillRect(word.bbox.x0, word.bbox.y0 - 20, 55, 20);
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 11px Arial';
                ctx.fillText(wordText.toLowerCase(), word.bbox.x0 + 4, word.bbox.y0 - 5);
              }
            });
          }

          if (foundOdds.length > 0) {
            setMultiplierInput(foundOdds.join(', '));
          } else {
            alert("OCR Complete, but no multipliers ending with 'x' (like 1.25x) were detected on the screenshot.");
          }
        }).catch(err => {
          console.error(err);
          setOcrLoading(false);
          setOcrProgress("");
          alert("OCR error: " + err.message);
        });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(imageSource);
  };

  // Paste handler
  useEffect(() => {
    const handleGlobalPaste = (e) => {
      const clipboardData = e.clipboardData || window.clipboardData;
      if (!clipboardData) return;
      const items = clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          processOcrImage(blob);
          e.preventDefault();
          break;
        }
      }
    };
    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, []);

  // Chrome Extension communication bridge
  useEffect(() => {
    const handleExtensionMessages = (event) => {
      if (event.source !== window) return;
      if (event.data && (event.data.type === 'EXTENSION_DATA' || event.data.type === 'EXTENSION_DATA_UPDATE')) {
        const { odds, time, url } = event.data;
        if (odds && odds.length > 0) {
          setMultiplierInput(odds.join(', '));
          setExtensionConnected(true);
          setExtensionSourceUrl(url);
          setExtensionLastUpdated(time ? new Date(time).toLocaleTimeString() : new Date().toLocaleTimeString());
        }
      }
    };

    window.addEventListener('message', handleExtensionMessages);

    // Periodically poll storage bridge via the content script
    const requestInterval = setInterval(() => {
      window.postMessage({ type: 'REQUEST_EXTENSION_DATA' }, '*');
    }, 2000);

    return () => {
      window.removeEventListener('message', handleExtensionMessages);
      clearInterval(requestInterval);
    };
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) processOcrImage(file);
  };

  // Parse and analyze multipliers
  const analyzeData = () => {
    const parsed = multiplierInput
      .split(/[\s,;\n]+/)
      .map(v => parseFloat(v))
      .filter(v => !isNaN(v) && v >= 1.0);

    if (parsed.length === 0) {
      setMultipliers([]);
      setStats({
        total: 0,
        avg: 0,
        median: 0,
        max: 0,
        dist: [0, 0, 0, 0]
      });
      setProbabilities({
        p12: 0,
        p15: 0,
        p20: 0,
        p30: 0,
        p50: 0
      });
      setPatternSignals({
        currentColdStreak: 0,
        recentHighOdd: null,
        riskLevel: "N/A",
        recommendedTarget: 0.00,
        highOddsStrikeEstimate: "",
        highOddsStrikeRound: 0,
        roundsSinceHighOdd: 0
      });
      setNextRoundsForecast([]);
      return;
    }

    // Use all accumulated rounds continuously
    const data = parsed;
    setMultipliers(data);

    // Calculate core statistics
    const total = data.length;
    const max = Math.max(...data);
    const sum = data.reduce((a, b) => a + b, 0);
    const avg = sum / total;
    
    const sorted = [...data].sort((a, b) => a - b);
    let median = 0;
    if (total % 2 === 0) {
      median = (sorted[total / 2 - 1] + sorted[total / 2]) / 2;
    } else {
      median = sorted[Math.floor(total / 2)];
    }

    let cat1 = 0;
    let cat2 = 0;
    let cat3 = 0;
    let cat4 = 0;

    data.forEach(val => {
      if (val < 1.2) cat1++;
      else if (val < 2.0) cat2++;
      else if (val < 5.0) cat3++;
      else cat4++;
    });

    setStats({
      total,
      avg,
      median,
      max,
      dist: [
        ((cat1 / total) * 100).toFixed(0),
        ((cat2 / total) * 100).toFixed(0),
        ((cat3 / total) * 100).toFixed(0),
        ((cat4 / total) * 100).toFixed(0)
      ]
    });

    // Probability of targets
    const c12 = data.filter(v => v >= 1.2).length;
    const c15 = data.filter(v => v >= 1.5).length;
    const c20 = data.filter(v => v >= 2.0).length;
    const c30 = data.filter(v => v >= 3.0).length;
    const c50 = data.filter(v => v >= 5.0).length;

    setProbabilities({
      p12: ((c12 / total) * 100).toFixed(0),
      p15: ((c15 / total) * 100).toFixed(0),
      p20: ((c20 / total) * 100).toFixed(0),
      p30: ((c30 / total) * 100).toFixed(0),
      p50: ((c50 / total) * 100).toFixed(0)
    });

    // Pattern recognition (reading backward from the last round)
    let coldStreak = 0;
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i] < 2.0) {
        coldStreak++;
      } else {
        break;
      }
    }

    // Find if a high multiplier happened recently (in the last 8 rounds)
    let highOdd = null;
    const recentRounds = data.slice(-8);
    for (let i = recentRounds.length - 1; i >= 0; i--) {
      if (recentRounds[i] >= 10.0) {
        highOdd = recentRounds[i];
        break;
      }
    }

    // Find how many rounds have passed since the last high odd (10x+) in the dataset
    let roundsSinceHighOdd = 0;
    let foundHighOdd = false;
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i] >= 10.0) {
        foundHighOdd = true;
        break;
      }
      roundsSinceHighOdd++;
    }
    if (!foundHighOdd) roundsSinceHighOdd = 99;

    // Recommended Target & Risk Level
    let risk = "Medium";
    let target = 1.50;

    if (predictorMode === "high") {
      // High Odds Hunter Mode (targets 5x to 10x+)
      if (roundsSinceHighOdd >= 18) {
        risk = "High Yield Hunt (10x+ Overdue)";
        target = 10.00;
      } else if (roundsSinceHighOdd >= 10) {
        risk = "Impending High Odd (5x+ Target)";
        target = 5.00;
      } else {
        risk = "Cooldown Phase (Min High Probability)";
        target = 2.50;
      }
    } else {
      // Safe Mode (default logic)
      if (coldStreak >= 5) {
        risk = "Low Risk (Recovery Overdue)";
        target = 1.80;
      } else if (coldStreak >= 3) {
        risk = "Medium-Low Risk";
        target = 1.60;
      } else if (highOdd !== null) {
        risk = "Extreme High Risk (Post-Mega Crash)";
        target = 1.15;
      } else {
        risk = "Standard Risk";
        target = 1.40;
      }
    }

    // Calculate when the next high odd (10x+) is expected
    // Statistically expected every 12 to 18 rounds. Let's use 15 as the sweet spot.
    let highOddsStrikeEstimate = "";
    let highOddsStrikeRound = 0; // 0 means not in the next 5 rounds
    if (roundsSinceHighOdd >= 15) {
      highOddsStrikeEstimate = "OVERDUE: High probability of a 10x+ hit in the next 1-2 rounds!";
      highOddsStrikeRound = 1;
    } else {
      const remaining = 15 - roundsSinceHighOdd;
      highOddsStrikeRound = remaining <= 5 ? remaining : 0;
      highOddsStrikeEstimate = `Expected to strike in approximately ${remaining} round${remaining > 1 ? 's' : ''} (around Round +${remaining}).`;
    }

    setPatternSignals({
      currentColdStreak: coldStreak,
      recentHighOdd: highOdd,
      riskLevel: risk,
      recommendedTarget: target,
      highOddsStrikeEstimate,
      highOddsStrikeRound,
      roundsSinceHighOdd
    });

    // ============================================================
    // 8x+ HIGH ODDS FREQUENCY & GAP ANALYSIS
    // Find every round where multiplier >= 8.0
    // Calculate gaps between consecutive high-odd rounds
    // ============================================================
    const HIGH_THRESHOLD = highOddsThreshold;
    const highOddIndices = data.reduce((acc, v, i) => { if (v >= HIGH_THRESHOLD) acc.push(i); return acc; }, []);
    const highOddValues  = highOddIndices.map(i => data[i]);

    // Gaps between consecutive 8x+ hits
    const gaps = [];
    for (let k = 1; k < highOddIndices.length; k++) {
      gaps.push(highOddIndices[k] - highOddIndices[k - 1]);
    }

    const avgGap    = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : null;
    const minGap    = gaps.length > 0 ? Math.min(...gaps) : null;
    const maxGap    = gaps.length > 0 ? Math.max(...gaps) : null;

    // Rounds since the last 8x+ hit
    let roundsSince8x = null;
    if (highOddIndices.length > 0) {
      roundsSince8x = data.length - 1 - highOddIndices[highOddIndices.length - 1];
    }

    // Estimated rounds until next 8x+ (if avg gap is known)
    let estimatedNextIn = null;
    if (avgGap !== null && roundsSince8x !== null) {
      estimatedNextIn = Math.max(0, Math.round(avgGap - roundsSince8x));
    }

    // Status flag
    let highOddsStatus = 'unknown';
    if (roundsSince8x === null) highOddsStatus = 'none-in-history';
    else if (roundsSince8x === 0) highOddsStatus = 'just-hit';
    else if (estimatedNextIn !== null && estimatedNextIn <= 0) highOddsStatus = 'overdue';
    else if (estimatedNextIn !== null && estimatedNextIn <= 3) highOddsStatus = 'imminent';
    else highOddsStatus = 'waiting';

    setHighOddsStats({
      count: highOddIndices.length,
      values: highOddValues,
      gaps,
      avgGap: avgGap !== null ? Math.round(avgGap * 10) / 10 : null,
      minGap,
      maxGap,
      roundsSince8x,
      estimatedNextIn,
      highOddsStatus,
      lastValue: highOddValues.length > 0 ? highOddValues[highOddValues.length - 1] : null
    });

    // ============================================================
    // HISTORICAL PATTERN MATCHING FORECAST
    //
    // How it works:
    //   1. State-encode all 60 rounds into 4 states (Crash/Low/Good/High)
    //   2. Take the last N rounds as the "current context window"
    //   3. Scan all of history for IDENTICAL state sequences
    //   4. For every match found, record what came AFTER it
    //   5. Predict each of the next 5 rounds from that historical evidence
    //
    // This is NOT averaging — it uses what actually happened after
    // the exact same pattern appeared before.
    // ============================================================
    const getState = (v) => v < 1.2 ? 0 : v < 2.0 ? 1 : v < 5.0 ? 2 : 3;
    const stateNames = ['Crash', 'Low', 'Good', 'High'];
    const stateLabels = ['Crash Risk', 'Low Target', 'Recovery Target', 'High Odds'];
    const stateRanges = ['< 1.2x', '1.2–2.0x', '2.0–5.0x', '5.0x+'];

    // Compute real historical mean for each state bucket
    const stateAvgs = [0, 1, 2, 3].map(s => {
      const vals = data.filter(v => getState(v) === s);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length
                         : [1.07, 1.55, 3.00, 8.50][s];
    });

    const stateSeq = data.map(getState); // [0,1,2,0,1,0,3,...]

    let forecast = [];
    let patternInfoOut = null;

    // Try to find matching patterns, starting with 4-round context, down to 2
    for (let ctxLen = 4; ctxLen >= 2; ctxLen--) {
      const context = stateSeq.slice(-ctxLen);         // last ctxLen states
      const occurrences = [];                           // [{afterVals: [...], startIdx}]

      // Scan history for the same state sequence (exclude last ctxLen itself)
      for (let i = 0; i <= stateSeq.length - ctxLen - 1; i++) {
        // Don't match against the very tail (current rounds)
        if (i > stateSeq.length - ctxLen - 1) continue;
        const candidate = stateSeq.slice(i, i + ctxLen);
        const matches = candidate.every((s, j) => s === context[j]);
        if (matches) {
          // What actually followed this pattern?
          const afterVals = data.slice(i + ctxLen, i + ctxLen + 5);
          if (afterVals.length >= 1) {
            occurrences.push({ afterVals, age: stateSeq.length - (i + ctxLen) }); // age = how long ago
          }
        }
      }

      if (occurrences.length >= 2) {
        // We have enough historical evidence — predict from it
        patternInfoOut = {
          contextLen: ctxLen,
          matchCount: occurrences.length,
          patternDesc: context.map(s => stateNames[s]).join(' → '),
          method: 'Pattern Match'
        };

        for (let r = 0; r < 5; r++) {
          // Collect all historical values at this offset after the pattern
          const roundVals = occurrences
            .map(occ => occ.afterVals[r])
            .filter(v => v !== undefined);

          if (roundVals.length === 0) break;

          // Tally votes per state (most common outcome wins)
          const stateCounts = [0, 0, 0, 0];
          roundVals.forEach(v => stateCounts[getState(v)]++);
          const dominantState = stateCounts.reduce((best, c, i) => c > stateCounts[best] ? i : best, 0);
          const confidence = stateCounts[dominantState] / roundVals.length;

          forecast.push({
            roundOffset: `Round +${r + 1}`,
            target: stateAvgs[dominantState],
            risk: stateLabels[dominantState],
            probability: Math.round(confidence * 100),
            range: stateRanges[dominantState],
            votes: `${stateCounts[dominantState]}/${roundVals.length} matches`
          });
        }

        if (forecast.length >= 1) break; // we have predictions, stop trying shorter contexts
      }
    }

    // Fallback: if not enough historical pattern matches, use single-step transition frequencies
    if (forecast.length < 5) {
      patternInfoOut = {
        contextLen: 1,
        matchCount: 0,
        patternDesc: stateNames[getState(data[data.length - 1])],
        method: 'Frequency Fallback (not enough history for pattern match)'
      };

      // Count how often each state follows each other state
      const txCount = Array.from({length: 4}, () => [0, 0, 0, 0]);
      for (let i = 0; i < data.length - 1; i++) {
        txCount[getState(data[i])][getState(data[i + 1])]++;
      }
      const txMatrix = txCount.map(row => {
        const s = row.reduce((a, b) => a + b, 0) + 4;
        return row.map(c => (c + 1) / s);
      });

      let curState = getState(data[data.length - 1]);
      for (let r = forecast.length; r < 5; r++) {
        const probs = txMatrix[curState];
        const next  = probs.reduce((bi, p, i) => p > probs[bi] ? i : bi, 0);
        forecast.push({
          roundOffset: `Round +${r + 1}`,
          target: stateAvgs[next],
          risk: stateLabels[next],
          probability: Math.round(probs[next] * 100),
          range: stateRanges[next],
          votes: 'Fallback'
        });
        curState = next;
      }
    }

    setDetectedPattern(patternInfoOut);
    setNextRoundsForecast(forecast);
  };

  // ============================================================
  // Provably Fair Verifier — Spribe Aviator formula
  // SHA512(serverSeed + clientSeed + nonce) → multiplier
  // ============================================================
  const verifyProvablyFair = async () => {
    if (!pfServerSeed.trim()) return;
    setPfLoading(true);
    setPfResult(null);
    try {
      // Combine seeds as Spribe does: serverSeed + ":" + clientSeed + ":" + nonce
      const combined = pfServerSeed.trim() + (pfClientSeed.trim() ? ':' + pfClientSeed.trim() : '') + (pfNonce.trim() ? ':' + pfNonce.trim() : '');
      const msgBuffer = new TextEncoder().encode(combined);
      const hashBuffer = await crypto.subtle.digest('SHA-512', msgBuffer);
      const hashArray  = Array.from(new Uint8Array(hashBuffer));
      const hashHex    = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Aviator uses first 8 hex chars (32-bit value) to derive multiplier
      const first8hex  = hashHex.slice(0, 8);
      const intVal     = parseInt(first8hex, 16);  // 0 to 2^32-1

      // Spribe formula: crash = floor(100 * 2^32 / (2^32 - intVal)) / 100 * 0.97 (3% house edge)
      const DIVISOR  = Math.pow(2, 32);
      const raw      = Math.floor((DIVISOR * 100) / (DIVISOR - intVal)) / 100;
      const multiplier = Math.max(1.00, Math.floor(raw * 0.97 * 100) / 100);

      setPfResult({
        hashHex,
        first8hex,
        intVal,
        multiplier,
        combined
      });
    } catch (err) {
      setPfResult({ error: String(err) });
    }
    setPfLoading(false);
  };

  useEffect(() => {
    analyzeData();
  }, [multiplierInput, predictorMode, highOddsThreshold]);

  return (
    <div className="app-container">
      {/* Header */}
      <header>
        <div className="logo-container">
          <span className="logo-icon">✈️</span>
          <div className="logo-text">
            <h1>Aviator Pattern Bot</h1>
            <p>Advanced OCR Odds Predictor & Strategy Advisor</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {extensionConnected && (
            <span className="badge" style={{ 
              background: 'rgba(16, 185, 129, 0.15)', 
              color: '#34d399', 
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
              Chrome Sync Active ({extensionLastUpdated})
            </span>
          )}
          <span className="badge"><Activity size={14} /> Pattern Recognition Mode</span>
        </div>
      </header>

      {/* Warning Box */}
      <div className="info-box">
        <ShieldAlert size={24} />
        <div>
          <div className="info-box-title">Statistical Reality Warning</div>
          <p>
            This tool performs statistical analysis and patterns detection on your past 60 rounds. 
            Remember: Aviator outcomes are generated via a cryptographic RNG. Streaks do not guarantee future hits, 
            but this predictor provides you with the mathematically safest cashout targets based on historical odds.
          </p>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="dashboard-grid">
        
        {/* Left Sidebar - Inputs */}
        <div className="sidebar">
          
          <div className="card">
            <div className="card-title">
              <Database size={18} /> Upload History Screenshot
            </div>

            {/* Drag/Paste Zone */}
            <div className="form-group">
              <label>Screenshot Paste Zone</label>
              <div 
                className="paste-zone" 
                style={{
                  border: '2px dashed var(--border-color)',
                  borderRadius: '8px',
                  padding: '2.5rem 1rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onClick={() => document.getElementById('ocr-file-input').click()}
              >
                <input 
                  type="file" 
                  id="ocr-file-input" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                  style={{ display: 'none' }} 
                />
                {ocrLoading ? (
                  <>
                    <span className="logo-icon" style={{ fontSize: '1.5rem' }}>⏳</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--accent-red)', fontWeight: '600' }}>
                      {ocrProgress}
                    </span>
                  </>
                ) : (
                  <>
                    <Camera size={32} style={{ color: 'var(--text-secondary)', marginBottom: '4px' }} />
                    <div>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '600' }}>
                        Ctrl + V to Paste Screenshot
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Or click to upload image file
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Predictor Mode</label>
              <select value={predictorMode} onChange={(e) => setPredictorMode(e.target.value)}>
                <option value="safe">Safe Probability Mode (Target 1.2x - 2.0x)</option>
                <option value="high">High Odds Hunter Mode (Target 3.0x - 10.0x+)</option>
              </select>
            </div>

            {/* OCR Detection Visual Canvas Preview */}
            {showOcrPreview && (
              <div className="form-group">
                <label>Screenshot Detection Preview</label>
                <div style={{ 
                  position: 'relative', 
                  width: '100%', 
                  overflowX: 'auto', 
                  borderRadius: '8px', 
                  border: '1px solid var(--border-color)', 
                  backgroundColor: '#000',
                  padding: '6px'
                }}>
                  <canvas 
                    ref={ocrCanvasRef} 
                    style={{ height: '140px', width: 'auto', display: 'block', borderRadius: '4px' }}
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Parsed Odds (Raw History)</label>
              <textarea 
                rows="5" 
                value={multiplierInput} 
                onChange={(e) => setMultiplierInput(e.target.value)}
                placeholder="Upload/Paste screenshot to parse values..."
              />
              <span className="input-hint">Values are auto-extracted from your pasted screenshot. You can also edit manually.</span>
            </div>

            <button className="btn btn-primary" onClick={analyzeData}>
              <BarChart3 size={16} /> Run Pattern Analyzer
            </button>
          </div>

          {/* Quick Statistics card */}
          {multipliers.length > 0 && (
            <div className="card">
              <div className="card-title">
                <Percent size={18} /> Round Stats (Last {multipliers.length})
              </div>
              <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div className="stat-box" style={{ padding: '0.8rem' }}>
                  <div className="stat-label" style={{ fontSize: '0.7rem' }}>Average</div>
                  <div className="stat-value" style={{ fontSize: '1.2rem' }}>{stats.avg.toFixed(2)}x</div>
                </div>
                <div className="stat-box" style={{ padding: '0.8rem' }}>
                  <div className="stat-label" style={{ fontSize: '0.7rem' }}>Median</div>
                  <div className="stat-value" style={{ fontSize: '1.2rem' }}>{stats.median.toFixed(2)}x</div>
                </div>
                <div className="stat-box" style={{ padding: '0.8rem' }}>
                  <div className="stat-label" style={{ fontSize: '0.7rem' }}>Highest</div>
                  <div className="stat-value" style={{ fontSize: '1.2rem' }}>{stats.max.toFixed(2)}x</div>
                </div>
                <div className="stat-box" style={{ padding: '0.8rem' }}>
                  <div className="stat-label" style={{ fontSize: '0.7rem' }}>Total Reads</div>
                  <div className="stat-value" style={{ fontSize: '1.2rem' }}>{stats.total}</div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right Main Dashboard - Predictor & Strategy Signals */}
        <div className="main-content">
          
          {multipliers.length === 0 ? (
            <div className="card" style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '100%', 
              minHeight: '400px',
              textAlign: 'center', 
              border: '1.5px dashed var(--border-color)',
              padding: '3rem'
            }}>
              <Camera size={48} style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }} />
              <h2 style={{ color: '#fff', fontSize: '1.4rem', fontWeight: '700', marginBottom: '0.5rem' }}>Awaiting Screenshot...</h2>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', fontSize: '0.9rem', lineHeight: '1.6' }}>
                Take a screenshot of the <strong>Round History</strong> row of your game screen, then press <strong>Ctrl + V</strong> anywhere on this page (or use the upload zone on the left) to start analyzing the patterns.
              </p>
            </div>
          ) : (
            <>
              {/* Signal / Predictor Card */}
              <div className="card" style={{ borderLeft: '5px solid var(--accent-red)' }}>
                <div className="card-title">
                  <Compass size={18} /> Predictor Output & Signals
                </div>

                <div className="stats-grid" style={{ 
                  gridTemplateColumns: predictorMode === "high" ? 'repeat(4, 1fr)' : '1.5fr 1fr 1fr',
                  gap: '12px'
                }}>
                  
                  {/* Target Recommendation */}
                  <div className="stat-box green" style={{ padding: '1.5rem 1rem' }}>
                    <div className="stat-label">Recommended Next Cashout</div>
                    <div className="stat-value" style={{ fontSize: '2.5rem', color: '#10b981' }}>
                      {patternSignals.recommendedTarget.toFixed(2)}x
                    </div>
                    <div className="stat-sub" style={{ fontSize: '0.8rem' }}>Safe probability exit zone</div>
                  </div>

                  {/* Current Risk Level */}
                  <div className="stat-box" style={{ padding: '1.5rem 1rem' }}>
                    <div className="stat-label">Next Round Risk</div>
                    <div className="stat-value" style={{ 
                      fontSize: '1.35rem', 
                      color: patternSignals.riskLevel.includes("Extreme") ? '#ef4444' : '#f59e0b',
                      marginTop: '10px'
                    }}>
                      {patternSignals.riskLevel}
                    </div>
                  </div>

                  {/* Consecutive Loss Streak */}
                  <div className="stat-box" style={{ padding: '1.5rem 1rem' }}>
                    <div className="stat-label">Consecutive Lows (&lt;2x)</div>
                    <div className="stat-value" style={{ fontSize: '2.5rem', color: '#3b82f6' }}>
                      {patternSignals.currentColdStreak}
                    </div>
                    <div className="stat-sub" style={{ fontSize: '0.8rem' }}>Rounds since a 2.00x+ hit</div>
                  </div>

                  {/* Next 10x+ High Odds Strike Forecast */}
                  {predictorMode === "high" && (
                    <div className="stat-box red" style={{ 
                      padding: '1.5rem 1rem', 
                      border: '1.5px solid rgba(239, 68, 68, 0.4)', 
                      background: 'rgba(239, 68, 68, 0.08)' 
                    }}>
                      <div className="stat-label" style={{ color: '#f87171', fontWeight: '700' }}>Next 10x+ Strike</div>
                      <div className="stat-value" style={{ 
                        fontSize: patternSignals.roundsSinceHighOdd >= 15 ? '1.8rem' : '2.5rem', 
                        color: '#ef4444',
                        fontWeight: '900',
                        marginTop: patternSignals.roundsSinceHighOdd >= 15 ? '8px' : '0'
                      }}>
                        {patternSignals.roundsSinceHighOdd >= 15 ? (
                          "💥 OVERDUE"
                        ) : (
                          `Round +${15 - patternSignals.roundsSinceHighOdd}`
                        )}
                      </div>
                      <div className="stat-sub" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {patternSignals.roundsSinceHighOdd >= 15 ? (
                          "High probability now"
                        ) : (
                          `In ${15 - patternSignals.roundsSinceHighOdd} rounds`
                        )}
                      </div>
                    </div>
                  )}

                </div>

                {/* Pattern Signals Explanations */}
                <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  <div className="info-box" style={{ margin: 0, backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <Lightbulb size={20} style={{ color: '#f59e0b' }} />
                    <div>
                      <div style={{ fontWeight: '700', color: '#fff' }}>Pattern Recognition Logic:</div>
                      <ul style={{ paddingLeft: '20px', fontSize: '0.82rem', marginTop: '4px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <li>
                          {patternSignals.currentColdStreak >= 3 ? (
                            <span style={{ color: '#60a5fa', fontWeight: '600' }}>
                              ⚠️ Overdue Alert: {patternSignals.currentColdStreak} consecutive rounds have crashed under 2.0x. A multiplier recovery is statistically overdue.
                            </span>
                          ) : (
                            <span>Standard Trend: Multipliers are alternating inside historical probability bands.</span>
                          )}
                        </li>
                        <li>
                          {patternSignals.recentHighOdd ? (
                            <span style={{ color: '#ef4444', fontWeight: '600' }}>
                              🚨 High-Odd Cooldown: A massive multiplier ({patternSignals.recentHighOdd.toFixed(2)}x) occurred in the last 8 rounds. Expect crash filters to activate (odds below 1.30x).
                            </span>
                          ) : (
                            <span>Normal Multiplier Distribution: No massive high odds in the immediate past 8 rounds. Safe target active.</span>
                          )}
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5-Round Forecast Advisor Card */}
              <div className="card">
                <div className="card-title" style={{ justifyContent: 'space-between', display: 'flex', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Activity size={18} /> 5-Round Predictive Strategy Sequence
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Standard/Actual Flow
                  </span>
                </div>
                
                {/* Standard Sequence Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: predictorMode === "high" ? '1.5rem' : '0' }}>
                  {nextRoundsForecast.map((fc, idx) => {
                    const isHigh   = fc.risk === "High Odds";
                    const isGood   = fc.risk === "Recovery Target";
                    const isCrash  = fc.risk === "Crash Risk";
                    const isMid    = fc.risk === "Mid Target";
                    const topColor = isHigh ? '#a855f7' : isGood ? '#3b82f6' : isCrash ? '#ef4444' : isMid ? '#f59e0b' : '#10b981';
                    const valColor = isHigh ? '#c084fc' : isGood ? '#60a5fa' : isCrash ? '#f87171' : '#e5e7eb';
                    return (
                    <div 
                      key={idx} 
                      style={{
                        background: isHigh ? 'rgba(168,85,247,0.07)' : isGood ? 'rgba(59,130,246,0.07)' : isCrash ? 'rgba(239,68,68,0.07)' : 'rgba(20, 22, 27, 0.6)',
                        border: `1px solid ${topColor}44`,
                        borderRadius: '12px',
                        padding: '1rem 0.5rem',
                        textAlign: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                        borderTop: `3px solid ${topColor}`
                      }}
                    >
                      <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                        {fc.roundOffset}
                      </div>
                      <div style={{ fontSize: '1.6rem', fontWeight: '800', color: valColor, margin: '8px 0' }}>
                        {fc.target.toFixed(2)}x
                      </div>
                      <div style={{ fontSize: '0.72rem', fontWeight: '700', color: fc.probability >= 50 ? '#10b981' : fc.probability >= 35 ? '#f59e0b' : '#ef4444' }}>
                        Prob: {fc.probability}%
                      </div>
                      <div style={{ fontSize: '0.65rem', color: topColor, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}>
                        {fc.risk}
                      </div>
                      {fc.range && (
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {fc.range}
                        </div>
                      )}
                      {fc.votes && (
                        <div style={{ fontSize: '0.58rem', color: topColor, marginTop: '3px', opacity: 0.75 }}>
                          {fc.votes}
                        </div>
                      )}
                    </div>
                  )})}
                </div>

                {/* Detected Pattern Info Banner */}
                {detectedPattern && (
                  <div style={{
                    marginTop: '1rem',
                    background: detectedPattern.method === 'Pattern Match' ? 'rgba(59,130,246,0.08)' : 'rgba(245,158,11,0.06)',
                    border: `1px solid ${detectedPattern.method === 'Pattern Match' ? 'rgba(59,130,246,0.3)' : 'rgba(245,158,11,0.25)'}`,
                    borderRadius: '10px',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ fontSize: '1.2rem' }}>
                      {detectedPattern.method === 'Pattern Match' ? '🔍' : '⚠️'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: '700', color: detectedPattern.method === 'Pattern Match' ? '#60a5fa' : '#f59e0b' }}>
                        {detectedPattern.method === 'Pattern Match'
                          ? `Pattern Detected (${detectedPattern.contextLen}-round window)`
                          : 'Frequency Fallback'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {detectedPattern.method === 'Pattern Match' ? (
                          <>
                            <span style={{ fontFamily: 'monospace', color: '#a5b4fc' }}>{detectedPattern.patternDesc}</span>
                            {' '}&mdash; found{' '}
                            <span style={{ color: '#10b981', fontWeight: '700' }}>{detectedPattern.matchCount} times</span>
                            {' '}in the last 60 rounds. Prediction is based on what followed those instances.
                          </>
                        ) : (
                          'Not enough repeating sequences in history. Using overall transition frequencies.'
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Additional High Odds strike line */}
                {predictorMode === "high" && (
                  <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '1.25rem' }}>
                    <div className="card-title" style={{ fontSize: '0.85rem', color: 'var(--accent-red)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🔥</span> High Odds Hunt Strike Forecast (10.00x+ Hunt Tracker)
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
                      {[1, 2, 3, 4, 5].map((offset) => {
                        const simulatedRoundsSince = patternSignals.roundsSinceHighOdd + offset;
                        let hTarget = 2.50;
                        let hProb = 12;
                        let hLabel = "Cooldown";
                        let hBorder = "rgba(255, 255, 255, 0.05)";
                        let hTextCol = "var(--text-muted)";
                        
                        if (simulatedRoundsSince >= 18) {
                          hTarget = 12.00 + (simulatedRoundsSince - 18) * 1.50;
                          hProb = Math.min(95, 45 + (simulatedRoundsSince - 18) * 8);
                          hLabel = "🔥 STRIKE ZONE";
                          hBorder = "#ef4444";
                          hTextCol = "#f87171";
                        } else if (simulatedRoundsSince >= 12) {
                          hTarget = 6.00 + (simulatedRoundsSince - 12) * 0.80;
                          hProb = Math.min(45, 20 + (simulatedRoundsSince - 12) * 5);
                          hLabel = "⚠️ BUILDUP ZONE";
                          hBorder = "#f59e0b";
                          hTextCol = "#fbbf24";
                        } else {
                          hTarget = 1.50 + (simulatedRoundsSince * 0.15);
                          hProb = Math.min(18, 5 + simulatedRoundsSince * 1.5);
                          hLabel = "❄️ COOLDOWN";
                          hBorder = "rgba(255, 255, 255, 0.1)";
                          hTextCol = "var(--text-muted)";
                        }

                        return (
                          <div 
                            key={offset}
                            style={{
                              background: 'rgba(239, 68, 68, 0.03)',
                              border: `1px solid ${hBorder}`,
                              borderRadius: '12px',
                              padding: '1rem 0.5rem',
                              textAlign: 'center',
                              position: 'relative',
                              overflow: 'hidden',
                              borderTop: `3px solid ${hBorder}`
                            }}
                          >
                            <div style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                              Round +{offset}
                            </div>
                            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: hTextCol, margin: '6px 0' }}>
                              {hTarget.toFixed(2)}x
                            </div>
                            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: hProb >= 40 ? '#f87171' : hProb >= 20 ? '#fbbf24' : 'var(--text-muted)' }}>
                              Prob: {hProb.toFixed(0)}%
                            </div>
                            <div style={{ fontSize: '0.62rem', fontWeight: '700', color: hTextCol, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              {hLabel}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ marginTop: '0.85rem', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>ℹ️</span> 
                      <strong>Tracker Status:</strong> Last high odd (10x+) was <strong>{patternSignals.roundsSinceHighOdd}</strong> round(s) ago. {patternSignals.highOddsStrikeEstimate}
                    </div>
                  </div>
                )}
              </div>

              {/* ─── 8x+ High Odds Frequency & Gap Analysis Card ─── */}
              {highOddsStats && (
                <div className="card" style={{ borderLeft: `4px solid ${
                  highOddsStats.highOddsStatus === 'overdue' ? '#ef4444' :
                  highOddsStats.highOddsStatus === 'imminent' ? '#f59e0b' :
                  highOddsStats.highOddsStatus === 'just-hit' ? '#a855f7' : '#10b981'
                }` }}>
                  {/* Card title row */}
                  <div className="card-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.1rem' }}>⚡</span>
                      {highOddsThreshold}x+ High Odds — Frequency &amp; Gap Analysis
                    </div>
                    {/* Status badge */}
                    <span style={{
                      padding: '3px 12px',
                      borderRadius: '20px',
                      fontSize: '0.72rem',
                      fontWeight: '800',
                      letterSpacing: '0.5px',
                      background:
                        highOddsStats.highOddsStatus === 'overdue'   ? 'rgba(239,68,68,0.15)'  :
                        highOddsStats.highOddsStatus === 'imminent'  ? 'rgba(245,158,11,0.15)' :
                        highOddsStats.highOddsStatus === 'just-hit'  ? 'rgba(168,85,247,0.15)' :
                        'rgba(16,185,129,0.12)',
                      color:
                        highOddsStats.highOddsStatus === 'overdue'   ? '#f87171' :
                        highOddsStats.highOddsStatus === 'imminent'  ? '#fbbf24' :
                        highOddsStats.highOddsStatus === 'just-hit'  ? '#c084fc' : '#34d399',
                      border: `1px solid ${
                        highOddsStats.highOddsStatus === 'overdue'   ? 'rgba(239,68,68,0.3)'  :
                        highOddsStats.highOddsStatus === 'imminent'  ? 'rgba(245,158,11,0.3)' :
                        highOddsStats.highOddsStatus === 'just-hit'  ? 'rgba(168,85,247,0.3)' :
                        'rgba(16,185,129,0.25)'
                      }`
                    }}>
                      {highOddsStats.highOddsStatus === 'overdue'  ? '🔴 OVERDUE'   :
                       highOddsStats.highOddsStatus === 'imminent' ? '🟡 IMMINENT'  :
                       highOddsStats.highOddsStatus === 'just-hit' ? '🟣 JUST HIT'  :
                       highOddsStats.highOddsStatus === 'none-in-history' ? '⚪ NOT SEEN' : '🟢 WAITING'}
                    </span>
                  </div>

                  {/* Threshold selector */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Track threshold:</span>
                    {[3, 5, 8, 10, 15, 20].map(t => (
                      <button
                        key={t}
                        onClick={() => setHighOddsThreshold(t)}
                        style={{
                          padding: '4px 14px',
                          borderRadius: '20px',
                          border: highOddsThreshold === t ? '2px solid #a855f7' : '1px solid rgba(255,255,255,0.1)',
                          background: highOddsThreshold === t ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.04)',
                          color: highOddsThreshold === t ? '#c084fc' : 'var(--text-secondary)',
                          fontWeight: highOddsThreshold === t ? '800' : '500',
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {t}x+
                      </button>
                    ))}
                  </div>

                  {highOddsStats.count === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem 0' }}>
                      No {highOddsThreshold}x+ round found in the loaded data.
                    </div>
                  ) : (
                    <>
                      {/* ── Top stat grid ── */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '1.25rem' }}>
                        
                        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '0.9rem', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Total {highOddsThreshold}x+ Hits</div>
                          <div style={{ fontSize: '2rem', fontWeight: '900', color: '#a855f7' }}>{highOddsStats.count}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>in {multipliers.length} rounds</div>
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '0.9rem', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Avg Gap Between</div>
                          <div style={{ fontSize: '2rem', fontWeight: '900', color: '#60a5fa' }}>
                            {highOddsStats.avgGap !== null ? highOddsStats.avgGap : '—'}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>rounds between {highOddsThreshold}x+</div>
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '0.9rem', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Rounds Since Last</div>
                          <div style={{ fontSize: '2rem', fontWeight: '900', color:
                            highOddsStats.roundsSince8x === 0 ? '#a855f7' :
                            highOddsStats.estimatedNextIn !== null && highOddsStats.estimatedNextIn <= 0 ? '#ef4444' :
                            highOddsStats.estimatedNextIn !== null && highOddsStats.estimatedNextIn <= 3 ? '#f59e0b' : '#10b981'
                          }}>
                            {highOddsStats.roundsSince8x}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            last was {highOddsStats.lastValue !== null ? `${highOddsStats.lastValue.toFixed(2)}x` : '—'}
                          </div>
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '0.9rem', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Est. Next In</div>
                          <div style={{ fontSize: '2rem', fontWeight: '900', color:
                            highOddsStats.estimatedNextIn !== null && highOddsStats.estimatedNextIn <= 0 ? '#ef4444' :
                            highOddsStats.estimatedNextIn !== null && highOddsStats.estimatedNextIn <= 3 ? '#f59e0b' : '#34d399'
                          }}>
                            {highOddsStats.estimatedNextIn !== null
                              ? highOddsStats.estimatedNextIn <= 0 ? 'NOW' : `~${highOddsStats.estimatedNextIn}`
                              : '—'}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>rounds (based on avg gap)</div>
                        </div>
                      </div>

                      {/* ── Gap range ── */}
                      {highOddsStats.gaps.length > 0 && (
                        <div style={{ marginBottom: '1rem', fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                          <span>📉 <strong style={{ color: '#34d399' }}>Min gap:</strong> {highOddsStats.minGap} rounds</span>
                          <span>📈 <strong style={{ color: '#f87171' }}>Max gap:</strong> {highOddsStats.maxGap} rounds</span>
                          <span>📊 <strong style={{ color: '#60a5fa' }}>Avg gap:</strong> {highOddsStats.avgGap} rounds</span>
                        </div>
                      )}

                      {/* ── Gap history dots ── */}
                      {highOddsStats.gaps.length > 0 && (
                        <div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Gap History (rounds between each 8x+ hit)
                          </div>
                          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', flexWrap: 'wrap' }}>
                            {highOddsStats.gaps.map((g, gi) => {
                              const maxG = highOddsStats.maxGap || 1;
                              const barH = Math.max(20, Math.round((g / maxG) * 70));
                              const barCol = g <= highOddsStats.avgGap ? '#10b981' : g > highOddsStats.avgGap * 1.5 ? '#ef4444' : '#f59e0b';
                              return (
                                <div key={gi} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                                  <div style={{ fontSize: '0.58rem', color: barCol, fontWeight: '700' }}>{g}</div>
                                  <div style={{ width: '22px', height: `${barH}px`, background: barCol, borderRadius: '4px 4px 0 0', opacity: 0.8 }} />
                                </div>
                              );
                            })}
                            {/* Current "open gap" (rounds since last hit) */}
                            {highOddsStats.roundsSince8x > 0 && (() => {
                              const maxG = highOddsStats.maxGap || 1;
                              const g = highOddsStats.roundsSince8x;
                              const barH = Math.max(20, Math.round((g / maxG) * 70));
                              const isOverdue = highOddsStats.estimatedNextIn !== null && highOddsStats.estimatedNextIn <= 0;
                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                                  <div style={{ fontSize: '0.58rem', color: isOverdue ? '#ef4444' : '#f59e0b', fontWeight: '700' }}>{g}…</div>
                                  <div style={{
                                    width: '22px', height: `${barH}px`,
                                    background: isOverdue ? '#ef4444' : '#f59e0b',
                                    borderRadius: '4px 4px 0 0',
                                    opacity: 0.5,
                                    border: `2px dashed ${isOverdue ? '#f87171' : '#fbbf24'}`,
                                    boxSizing: 'border-box'
                                  }} />
                                </div>
                              );
                            })()}
                          </div>
                          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                            🟩 Below avg &nbsp;|&nbsp; 🟡 Above avg &nbsp;|&nbsp; 🔴 Significantly long &nbsp;|&nbsp; <span style={{ opacity: 0.6 }}>░ Current open gap</span>
                          </div>
                        </div>
                      )}

                      {/* ── Hit values list ── */}
                      <div style={{ marginTop: '1rem' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          All 8x+ Values Seen
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {highOddsStats.values.map((v, vi) => (
                            <span key={vi} style={{
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '0.78rem',
                              fontWeight: '700',
                              background: v >= 20 ? 'rgba(168,85,247,0.2)' : v >= 10 ? 'rgba(59,130,246,0.2)' : 'rgba(16,185,129,0.15)',
                              color: v >= 20 ? '#c084fc' : v >= 10 ? '#60a5fa' : '#34d399',
                              border: `1px solid ${v >= 20 ? 'rgba(168,85,247,0.4)' : v >= 10 ? 'rgba(59,130,246,0.3)' : 'rgba(16,185,129,0.3)'}`
                            }}>
                              {v.toFixed(2)}x
                            </span>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Probability Gauge Cards */}
              <div className="card">
                <div className="card-title">
                  <Percent size={18} /> Next Round Target Probabilities (Last 60 Rounds)
                </div>

                <div className="dist-container" style={{ gap: '1rem' }}>
                  <div className="dist-row">
                    <span className="dist-label" style={{ width: '120px' }}>Reach 1.20x+</span>
                    <div className="dist-bar-wrapper" style={{ height: '18px' }}>
                      <div className="dist-bar level-4" style={{ width: `${probabilities.p12}%`, background: '#10b981' }}></div>
                    </div>
                    <span className="dist-value" style={{ width: '50px' }}>{probabilities.p12}%</span>
                  </div>

                  <div className="dist-row">
                    <span className="dist-label" style={{ width: '120px' }}>Reach 1.50x+</span>
                    <div className="dist-bar-wrapper" style={{ height: '18px' }}>
                      <div className="dist-bar level-3" style={{ width: `${probabilities.p15}%`, background: '#3b82f6' }}></div>
                    </div>
                    <span className="dist-value" style={{ width: '50px' }}>{probabilities.p15}%</span>
                  </div>

                  <div className="dist-row">
                    <span className="dist-label" style={{ width: '120px' }}>Reach 2.00x+</span>
                    <div className="dist-bar-wrapper" style={{ height: '18px' }}>
                      <div className="dist-bar level-2" style={{ width: `${probabilities.p20}%`, background: '#f59e0b' }}></div>
                    </div>
                    <span className="dist-value" style={{ width: '50px' }}>{probabilities.p20}%</span>
                  </div>

                  <div className="dist-row">
                    <span className="dist-label" style={{ width: '120px' }}>Reach 3.00x+</span>
                    <div className="dist-bar-wrapper" style={{ height: '18px' }}>
                      <div className="dist-bar level-1" style={{ width: `${probabilities.p30}%`, background: '#ef4444' }}></div>
                    </div>
                    <span className="dist-value" style={{ width: '50px' }}>{probabilities.p30}%</span>
                  </div>

                  <div className="dist-row">
                    <span className="dist-label" style={{ width: '120px' }}>Reach 5.00x+</span>
                    <div className="dist-bar-wrapper" style={{ height: '18px' }}>
                      <div className="dist-bar level-1" style={{ width: `${probabilities.p50}%`, background: '#b91c1c' }}></div>
                    </div>
                    <span className="dist-value" style={{ width: '50px' }}>{probabilities.p50}%</span>
                  </div>
                </div>
              </div>

              {/* Clean History Grid (Last 60 Rounds) */}
              <div className="card">
                <div className="card-title">
                  <History size={18} /> Clean Round History Grid (Last {multipliers.length} Rounds)
                </div>
                
                <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: '8px', padding: '4px' }}>
                    {multipliers.map((val, idx) => (
                      <div 
                        key={idx} 
                        style={{
                          padding: '8px 4px',
                          borderRadius: '8px',
                          textAlign: 'center',
                          fontWeight: '700',
                          fontSize: '0.85rem',
                          backgroundColor: val < 1.2 ? 'rgba(239,68,68,0.1)' : val < 2.0 ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.1)',
                          color: val < 1.2 ? '#f87171' : val < 2.0 ? '#60a5fa' : '#34d399',
                          border: '1px solid',
                          borderColor: val < 1.2 ? 'rgba(239,68,68,0.2)' : val < 2.0 ? 'rgba(59,130,246,0.2)' : 'rgba(16,185,129,0.2)'
                        }}
                      >
                        <div>R{multipliers.length - idx}</div>
                        <div style={{ marginTop: '2px', fontSize: '0.9rem' }}>{val.toFixed(2)}x</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

        </div>

      </div>

      {/* ─── Provably Fair Verifier ─── */}
      <div style={{ padding: '0 2rem 2rem' }}>
        <div className="card" style={{ marginTop: '2rem' }}>
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldAlert size={20} style={{ color: '#10b981' }} />
            Provably Fair Round Verifier
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto', fontWeight: '400' }}>
              Paste values from Aviator's round history → verify the exact multiplier
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Server Seed
              </label>
              <input
                id="pf-server-seed"
                type="text"
                placeholder="9LTA95idrdiiPRCfHF6sL..."
                value={pfServerSeed}
                onChange={e => setPfServerSeed(e.target.value)}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '0.82rem', boxSizing: 'border-box', fontFamily: 'monospace' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Combined Client Seed (optional)
              </label>
              <input
                id="pf-client-seed"
                type="text"
                placeholder="sk2okZl5VlaxZKs7Srb0..."
                value={pfClientSeed}
                onChange={e => setPfClientSeed(e.target.value)}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '0.82rem', boxSizing: 'border-box', fontFamily: 'monospace' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Nonce
              </label>
              <input
                id="pf-nonce"
                type="text"
                placeholder="Round #"
                value={pfNonce}
                onChange={e => setPfNonce(e.target.value)}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '0.82rem', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <button
            id="pf-verify-btn"
            onClick={verifyProvablyFair}
            disabled={pfLoading || !pfServerSeed.trim()}
            style={{
              padding: '10px 28px',
              borderRadius: '8px',
              border: 'none',
              background: pfLoading ? '#374151' : 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff',
              fontWeight: '700',
              fontSize: '0.9rem',
              cursor: pfLoading || !pfServerSeed.trim() ? 'not-allowed' : 'pointer',
              opacity: !pfServerSeed.trim() ? 0.5 : 1
            }}
          >
            {pfLoading ? 'Computing…' : '🔐 Verify Hash'}
          </button>

          {pfResult && !pfResult.error && (
            <div style={{ marginTop: '1.5rem', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', padding: '1.2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Computed Multiplier</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: '900', color: pfResult.multiplier >= 5 ? '#a855f7' : pfResult.multiplier >= 2 ? '#3b82f6' : '#10b981' }}>
                    {pfResult.multiplier.toFixed(2)}x
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>First 8 Hex Chars</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#f59e0b', fontFamily: 'monospace' }}>{pfResult.first8hex}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>→ {pfResult.intVal.toLocaleString()}</div>
                </div>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                <strong style={{ color: 'var(--text-secondary)' }}>SHA-512:</strong>{' '}
                <span style={{ fontFamily: 'monospace', wordBreak: 'break-all', fontSize: '0.65rem' }}>
                  <span style={{ color: '#f59e0b' }}>{pfResult.hashHex.slice(0, 8)}</span>{pfResult.hashHex.slice(8)}
                </span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                <strong style={{ color: 'var(--text-secondary)' }}>Formula:</strong> SHA512(<code style={{ color: '#60a5fa' }}>{pfResult.combined.slice(0, 60)}{pfResult.combined.length > 60 ? '…' : ''}</code>)
              </div>
            </div>
          )}

          {pfResult && pfResult.error && (
            <div style={{ marginTop: '1rem', color: '#f87171', fontSize: '0.85rem' }}>⚠️ {pfResult.error}</div>
          )}
        </div>
      </div>

    </div>
  );
}

export default App;
