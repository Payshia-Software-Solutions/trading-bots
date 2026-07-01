// =====================================================
// Internationalization (i18n) — English / Sinhala
// =====================================================
let currentLang = 'en';

const TRANSLATIONS = {
  en: {
    appSub: 'Analyzer V2',
    connected: 'Connected', disconnected: 'Disconnected',
    warningTitle: 'No Active Binance Tab',
    warningDesc: 'Please open a Binance Spot Trading page in your browser to begin analysis.',
    modeScalp: '⚡ SCALP (15m)', modeSwing: '📈 SWING (4h)',
    fetching: 'Fetching...',
    high24: '24h High', low24: '24h Low', volume: 'Volume',
    scoreTitle: 'Signal Confluence Score',
    weak: 'WEAK', moderate: 'MODERATE', strong: 'STRONG',
    targetsTitle: 'AI ENTRY & EXIT TARGETS',
    buyTitle: 'BUY LIMIT ORDER', sellTitle: 'SELL TARGET',
    waiting: 'Waiting...',
    stopLoss: '🛑 Stop Loss', rrRatio: '📊 R/R Ratio',
    resistance: 'Resistance (Ceiling)', support: 'Support (Floor)',
    btcMarket: '₿ BTC Market',
    aiRecommend: 'Overall AI Recommendation',
    neutral: 'NEUTRAL',
    checklistTitle: 'Entry Setup Confirmation',
    chkSupport: 'Price near Support Zone',
    chkRsi: 'RSI Oversold Recovery (<42)',
    chkEma: 'EMA Golden Cross (9 > 21)',
    chkMacd: 'MACD Bullish Crossover',
    chkVolume: 'Volume Spike (>1.5x avg)',
    chkCandle: 'Strong Candle Pattern',
    chkTrend: 'Macro Trend is UP (1H & 4H)',
    chkBtc: 'BTC Market Safe',
    reasoningTitle: '📊 Analysis Reasoning',
    indicatorsTitle: 'Technical Indicators',
    emaCross: 'EMA Crossover (15m)',
    volVsAvg: 'Volume vs Avg',
    current: 'Current',
    candlePattern: 'Candle Pattern',
    pattern: 'Pattern', none: 'None',
    scanning: 'Scanning...',
    statusNeutral: 'Neutral', statusBullish: 'BULLISH', statusBearish: 'BEARISH',
    statusOversold: 'Oversold', statusOverbought: 'Overbought',
    statusSpike: 'SPIKE', statusNormal: 'NORMAL',
    statusDetected: 'DETECTED',
    btnReset: '🔄 Reset', btnSync: '⟳ Re-Sync Tab', btnRefresh: '📡 Refresh API',
    // Dynamic signal strings
    waitSupport: 'WAITING SUPPORT', waitBuy: 'WAITING BUY',
    entryFired: 'ENTRY FIRED', pendingExit: 'PENDING EXIT',
    profitTaken: 'PROFIT TAKEN', stoppedOut: 'STOPPED OUT',
    sentimentStrongBuy: 'STRONG BUY', sentimentBuy: 'ACCUMULATE',
    sentimentBearish: 'BEARISH / NEUTRAL', sentimentInTrade: 'IN TRADE',
    sentimentTakeProfit: 'TAKE PROFIT ✅', sentimentStopOut: 'STOP LOSS HIT',
    btcSafe: 'SAFE', btcDanger: 'DANGER',
    // Reasoning log strings
    logScore: 'CONFLUENCE SCORE',
    logNoSignals: '⚠ No strong buy signals yet.',
    logCurrentPrice: '📍 Current Price',
    logTradePlan: '📋 TRADE PLAN (Swing Pivot Levels)',
    logBuyLimit: '🟢 Buy  Limit',
    logBelowNow: '% below now',
    logSwingLow: '↳ Nearest swing LOW detected below current price',
    logSellTarget: '🔴 Sell Target',
    logFromNow: '% from now',
    logSwingHigh: '↳ Nearest swing HIGH detected above current price',
    logStopLoss: '🛑 Stop Loss',
    logFromEntry: '% from entry',
    logProfitZone: '📈 Profit Zone',
    logEntryToSell: 'entry → sell',
    logConfirmed: '▶ CONFIRMED: All conditions met. Place limit order now.',
    logSuspended: '⛔ SUSPENDED: BTC dropping. Wait for stability before entry.',
    logStandby: '⏳ STANDBY: Score {score}/8 — need 6+ to trigger. Monitoring...',
    logProfitHit: 'Target price hit! Lock in profit.',
    logStopHit: 'Stop loss executed to prevent further downside.',
    logInTrade: 'Buy entry triggered. Awaiting target exit price...',
    logStrongBuyReason: 'Confluence detected! Enter limit buy order near support floor.',
    logAccumulate: 'Market warming up. Wait for support bounce or bullish confirmation.',
    logBearish: 'Consolidating or weak volume. Avoid entries here.',
    logApiError: 'API Read error: {msg}\nCheck your internet connection.',
    // Accuracy tracker
    accuracyTitle: '📈 Signal Accuracy',
    accWins: 'Wins', accLosses: 'Losses', accPending: 'Pending', accWinRate: 'Win Rate',
    clearHistory: '🗑', noSignals: 'No signals recorded yet.',
    sigWin: 'WIN', sigLoss: 'LOSS', sigPending: 'PENDING',
    // BTC health labels
    btcStrongBull: 'STRONG BULL ⚡', btcBullish: 'BULLISH', btcNeutral: 'NEUTRAL',
    // Trade health monitor
    tradeHealthTitle: '📡 Trade Health Monitor',
    thCurrentScore: 'Current Score', thBtcStatus: 'BTC Status', thProgress: 'Progress to Target',
    thHealthy: 'HEALTHY', thCaution: 'CAUTION', thDanger: 'DANGER',
    thWarnCaution: '⚠️ Score dropped during trade. Market conditions weakening — watch closely.',
    thWarnBtcDanger: '🚨 BTC turning BEARISH! High risk of stop loss hit. Consider manual exit.',
    thWarnBothBad: '🚨 CRITICAL: Score low AND BTC bearish. Consider exiting now to protect capital.',
    thWarnGood: '✅ Trade conditions still strong. Hold position.',
    thInvested: 'Invested (USDT)', thCurrentPnl: 'Current PnL',
  },
  si: {
    appSub: 'විශ්ලේෂකය V2',
    connected: 'සම්බන්ධයි', disconnected: 'සම්බන්ධ නැත',
    warningTitle: 'Binance Tab ක් නොමැත',
    warningDesc: 'විශ්ලේෂණය ආරම්භ කිරීමට Binance Spot Trading පිටුවක් විවෘත කරන්න.',
    modeScalp: '⚡ ස්කල්ප් (15m)', modeSwing: '📈 ස්විං (4h)',
    fetching: 'ලබා ගනිමින්...',
    high24: '24ස ඉහළ', low24: '24ස පහළ', volume: 'ප්‍රමාණය',
    scoreTitle: 'සංඥා සම්මිශ්‍රණ ලකුණු',
    weak: 'දුර්වල', moderate: 'මධ්‍යම', strong: 'ශක්තිමත්',
    targetsTitle: 'AI ඇතුළු & පිටව යාමේ ඉලක්ක',
    buyTitle: 'මිලදී ගැනීමේ ඇණවුම', sellTitle: 'විකිණීමේ ඉලක්කය',
    waiting: 'රඳා සිටිනවා...',
    stopLoss: '🛑 හානි නතර', rrRatio: '📊 අවදානම/ලාභ',
    resistance: 'ප්‍රතිරෝධය (උඩ සීමාව)', support: 'ආධාරය (පහළ සීමාව)',
    btcMarket: '₿ BTC වෙළඳපොළ',
    aiRecommend: 'AI නිර්දේශය',
    neutral: 'උදාසීන',
    checklistTitle: 'ඇතුළු කොන්දේසි',
    chkSupport: 'මිල ආධාර ප්‍රදේශය ළඟ',
    chkRsi: 'RSI අධික විකිණීමෙන් යථා (<42)',
    chkEma: 'EMA රන් හරස් කැපීම (9 > 21)',
    chkMacd: 'MACD ශක්තිමත් හරස්',
    chkVolume: 'ප්‍රමාණය ඉහළ (>1.5x)',
    chkCandle: 'ශක්තිමත් කැන්ඩල් රටාව',
    chkTrend: 'මැක්‍රෝ ප්‍රවණතාව ඉහළයි (1H & 4H)',
    chkBtc: 'BTC වෙළඳපොළ ස්ථාවරයි',
    reasoningTitle: '📊 විශ්ලේෂණ හේතු',
    indicatorsTitle: 'තාක්ෂණික දර්ශක',
    emaCross: 'EMA හරස් කැපීම (15m)',
    volVsAvg: 'ප්‍රමාණය vs සාමාන්‍ය',
    current: 'වත්මන්',
    candlePattern: 'කැන්ඩල් රටාව',
    pattern: 'රටාව', none: 'නැත',
    scanning: 'සොයමින්...',
    statusNeutral: 'උදාසීන', statusBullish: 'ශක්තිමත්', statusBearish: 'දුර්වල',
    statusOversold: 'අධික විකිණීම', statusOverbought: 'අධික මිලදී ගැනීම',
    statusSpike: 'ඉහළ යාම', statusNormal: 'සාමාන්‍ය',
    statusDetected: 'හඳුනා ගත්තා',
    btnReset: '🔄 යළි සකසන්න', btnSync: '⟳ Tab සමමුහුර්ත', btnRefresh: '📡 API යළිලබා ගන්න',
    // Dynamic signal strings
    waitSupport: 'ආධාර රඳා සිටිමින්', waitBuy: 'මිලදී ගැනීමට රඳා',
    entryFired: 'ඇතුළු සක්‍රියයි', pendingExit: 'පිටවීමේ ආසන්නයේ',
    profitTaken: 'ලාභ ලැබිණ ✅', stoppedOut: 'නතර විය',
    sentimentStrongBuy: 'ශක්තිමත් ලෙස ගන්න', sentimentBuy: 'එකතු කරන්න',
    sentimentBearish: 'දුර්වල / උදාසීන', sentimentInTrade: 'ට්‍රේඩ් සිටිනවා',
    sentimentTakeProfit: 'ලාභ ලබා ගන්න ✅', sentimentStopOut: 'හානි නතර සිදු විය',
    btcSafe: 'සාමාන්‍යයි', btcDanger: 'අනතුරු!',
    // Reasoning log strings
    logScore: 'සම්මිශ්‍රණ ලකුණු',
    logNoSignals: '⚠ ශක්තිමත් සංඥා නොමැත.',
    logCurrentPrice: '📍 වත්මන් මිල',
    logTradePlan: '📋 ට්‍රේඩ් සැලැස්ම (Swing Pivot)',
    logBuyLimit: '🟢 මිලදී ගැනීම',
    logBelowNow: '% දැනට පහළ',
    logSwingLow: '↳ ළඟම swing LOW හඳුනා ගත්තා',
    logSellTarget: '🔴 විකිණීම',
    logFromNow: '% දැනට ඉහළ',
    logSwingHigh: '↳ ළඟම swing HIGH හඳුනා ගත්තා',
    logStopLoss: '🛑 හානි නතර',
    logFromEntry: '% ඇතුළු සිට',
    logProfitZone: '📈 ලාභ කලාපය',
    logEntryToSell: 'ඇතුළු → විකිණීම',
    logConfirmed: '▶ තහවුරු: සියලු කොන්දේසි සපුරා ඇත. Limit order ගන්න.',
    logSuspended: '⛔ අත්හිටුවා: BTC පහළ යනවා. ස්ථාවර වෙනකල් රඳා සිටින්න.',
    logStandby: '⏳ රඳා සිටිමින්: ලකුණු {score}/8 — 6+ ලකුණු අවශ්‍යයි...',
    logProfitHit: 'ඉලක්ක මිල ළඟා විය! ලාභ lock කරන්න.',
    logStopHit: 'හානි නතර ක්‍රියාත්මක විය.',
    logInTrade: 'ඇතුළු සංඥාව ක්‍රියාත්මකයි. ඉලක්ක මිලට රඳා...',
    logStrongBuyReason: 'සම්මිශ්‍රණය හඳුනා ගත්තා! ආධාර ළඟ Limit Buy order ගන්න.',
    logAccumulate: 'වෙළඳපොළ ශක්තිමත් වෙනවා. ආධාර bounce රඳා සිටින්න.',
    logBearish: 'දුර්වල volume. ඇතුළු වෙන්න එපා.',
    logApiError: 'API දෝෂය: {msg}\nඔබගේ internet සම්බන්ධතාව පරීක්ෂා කරන්න.',
    // Accuracy tracker
    accuracyTitle: '📈 සංඥා නිවැරදිතාව',
    accWins: 'ජය', accLosses: 'පරාජය', accPending: 'රඳා', accWinRate: 'ජය අනුපාතය',
    clearHistory: '🗑', noSignals: 'සංඥා නොමැත.',
    sigWin: 'ජය', sigLoss: 'පරාජය', sigPending: 'රඳා',
    // BTC health labels
    btcStrongBull: 'සමට් සයැඬ යනධා ⋆', btcBullish: 'සයැඬ', btcNeutral: 'සාමාන්ය',
    // Trade health monitor
    tradeHealthTitle: '📡 ට්‍රේඩ් සෞඛ්‍ය නිරීක්‍ෂණය',
    thCurrentScore: 'වත්මන් ලකුණු', thBtcStatus: 'BTC තත්ත්වය', thProgress: 'ඉලක්කයට ප්‍රගතිය',
    thHealthy: 'නිරෝගී', thCaution: 'අවධානයෙන්', thDanger: 'අන්තරාදායකයි',
    thWarnCaution: '⚠️ ට්‍රේඩ් එක අතරතුර ලකුණු අඩු විය. වෙළඳපොල තත්ත්වය දුර්වල වෙමින් පවතී.',
    thWarnBtcDanger: '🚨 BTC අවාසි සහගතයි! Loss වීමේ අවදානමක් ඇත. ඉක්මනින් ඉවත් වීම සලකා බලන්න.',
    thWarnBothBad: '🚨 බරපතලයි: ලකුණු අඩු වී BTC ද අවාසි සහගතයි! ප්‍රාග්ධනය රැක ගැනීමට දැන්ම ඉවත් වන්න.',
    thWarnGood: '✅ ට්‍රේඩ් තත්ත්වය තවමත් යහපත් මට්ටමේ පවතී. රැඳී සිටින්න.',
    thInvested: 'ආයෝජනය (USDT)', thCurrentPnl: 'වත්මන් ලාභය/පාඩුව',
  }
};

// Translation helper — returns current language string for a key
function t(key) {
  return (TRANSLATIONS[currentLang] && TRANSLATIONS[currentLang][key]) 
      || TRANSLATIONS['en'][key] 
      || key;
}

// Apply translations to all elements with data-i18n attribute
function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translation = t(key);
    if (translation) el.textContent = translation;
  });
  // Update the connection status badge dynamically too
  const statusEl = document.getElementById('connection-status');
  if (statusEl) {
    const isConnected = statusEl.classList.contains('connected');
    statusEl.textContent = isConnected ? t('connected') : t('disconnected');
  }
}

// Global State
let currentPair = null;
let activeTabId = null;
let pollInterval = null;
let currentMode = 'scalp'; // scalp or swing

// Trading Setup Locking
let lockedEntryPrice = null;
let lockedSellTarget = null;
let lockedStopLoss = null;
let tradeActive = false;

// =====================================================
// Signal History & Accuracy Tracker
// =====================================================
let signalHistory = []; // In-memory array — persisted to chrome.storage.local

// Load signal history and active trade from storage on startup
function loadSignalHistory() {
  chrome.storage.local.get(['signalHistory', 'activeTrade'], (result) => {
    signalHistory = result.signalHistory || [];

    // Restore active locked trade if extension was reopened mid-trade
    if (result.activeTrade) {
      const at = result.activeTrade;
      lockedEntryPrice = at.entryPrice;
      lockedSellTarget = at.sellTarget;
      lockedStopLoss   = at.stopLoss;
      tradeActive      = true;
    }

    renderSignalHistory();
    updateAccuracyUI();
  });
}

// Persist current signalHistory array to chrome.storage.local
function persistSignals() {
  chrome.storage.local.set({ signalHistory });
}

// Save a new PENDING signal when a strong buy fires
function saveSignal({ pair, score, entryPrice, sellTarget, stopLoss }) {
  const signal = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    pair,
    score,
    entryPrice,
    sellTarget,
    stopLoss,
    status: 'pending',   // 'pending' | 'win' | 'loss'
    closePrice: null,
    profitPct: null,
  };
  signalHistory.unshift(signal); // newest first
  persistSignals();
  renderSignalHistory();
  updateAccuracyUI();
  // Also persist active trade so it survives extension restarts
  chrome.storage.local.set({
    activeTrade: { entryPrice, sellTarget, stopLoss, signalId: signal.id }
  });
  return signal.id;
}

// Resolve the most recent pending signal as WIN or LOSS
function resolveSignal(status, closePrice) {
  // Find the latest pending signal for the current pair
  const pending = signalHistory.find(s => s.status === 'pending' && s.pair === currentPair);
  if (!pending) return;

  const profitPct = status === 'win'
    ? ((closePrice - pending.entryPrice) / pending.entryPrice * 100)
    : ((closePrice - pending.entryPrice) / pending.entryPrice * 100);

  pending.status     = status;
  pending.closePrice = closePrice;
  pending.profitPct  = profitPct;

  persistSignals();
  chrome.storage.local.remove('activeTrade');
  renderSignalHistory();
  updateAccuracyUI();
}

// Render the signal history list in the UI
function renderSignalHistory() {
  const listEl = document.getElementById('signal-history-list');
  if (!listEl) return;

  if (signalHistory.length === 0) {
    listEl.innerHTML = `<div class="no-signals-msg">${t('noSignals')}</div>`;
    return;
  }

  // Show latest 30 signals
  const toShow = signalHistory.slice(0, 30);
  listEl.innerHTML = toShow.map(sig => {
    const statusClass  = sig.status;
    const badgeLabel   = t(sig.status === 'win' ? 'sigWin' : sig.status === 'loss' ? 'sigLoss' : 'sigPending');
    const time = new Date(sig.timestamp).toLocaleString([], {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    const profitStr = sig.profitPct !== null
      ? `${sig.profitPct >= 0 ? '+' : ''}${sig.profitPct.toFixed(2)}%`
      : '—';
    const profitClass = sig.profitPct === null ? 'neu' : sig.profitPct >= 0 ? 'pos' : 'neg';

    return `
      <div class="signal-item ${statusClass}">
        <div class="signal-badge ${statusClass}">${badgeLabel}</div>
        <div class="signal-details">
          <span class="signal-pair">${sig.pair.replace('USDT','/USDT')}</span>
          <span class="signal-prices">
            E: $${sig.entryPrice.toFixed(4)} → T: $${sig.sellTarget.toFixed(4)}
            &nbsp;SL: $${sig.stopLoss.toFixed(4)}
          </span>
          <span class="signal-time">${time}</span>
        </div>
        <div class="signal-meta">
          <span class="signal-score">⚡${sig.score}/8</span>
          <span class="signal-profit ${profitClass}">${profitStr}</span>
        </div>
      </div>`;
  }).join('');
}

// Update accuracy stats bar and numbers
function updateAccuracyUI() {
  const wins    = signalHistory.filter(s => s.status === 'win').length;
  const losses  = signalHistory.filter(s => s.status === 'loss').length;
  const pending = signalHistory.filter(s => s.status === 'pending').length;
  const total   = wins + losses;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : null;

  const winsEl    = document.getElementById('acc-wins');
  const lossesEl  = document.getElementById('acc-losses');
  const pendingEl = document.getElementById('acc-pending');
  const rateEl    = document.getElementById('acc-winrate');
  const barEl     = document.getElementById('acc-bar-fill');

  if (winsEl)    winsEl.textContent   = wins;
  if (lossesEl)  lossesEl.textContent = losses;
  if (pendingEl) pendingEl.textContent = pending;
  if (rateEl)    rateEl.textContent   = winRate !== null ? `${winRate}%` : '—%';
  if (barEl)     barEl.style.width    = winRate !== null ? `${winRate}%` : '0%';

  // Color the win rate dynamically
  if (rateEl) {
    if (winRate === null) rateEl.style.color = 'var(--neon-blue)';
    else if (winRate >= 60) rateEl.style.color = 'var(--neon-green)';
    else if (winRate >= 40) rateEl.style.color = 'var(--neon-yellow)';
    else rateEl.style.color = 'var(--neon-red)';
  }
}

// Clear all signal history
function clearSignalHistory() {
  if (!confirm('Clear all signal history? This cannot be undone.')) return;
  signalHistory = [];
  persistSignals();
  chrome.storage.local.remove('activeTrade');
  lockedEntryPrice = null;
  lockedSellTarget = null;
  lockedStopLoss   = null;
  tradeActive      = false;
  renderSignalHistory();
  updateAccuracyUI();
}


// DOM Elements
const statusBadge = document.getElementById('connection-status');
const warningPanel = document.getElementById('connection-warning');
const analyzerPanel = document.getElementById('analyzer-panel');
const tradingPairEl = document.getElementById('trading-pair');

// Trade Health Monitor DOM references
const tradeHealthPanel = document.getElementById('trade-health-panel');
const thHealthBadge = document.getElementById('th-health-badge');
const thScoreVal = document.getElementById('th-score-val');
const thScoreDots = document.getElementById('th-score-dots');
const thBtcVal = document.getElementById('th-btc-val');
const thProgressVal = document.getElementById('th-progress-val');
const thProgressFill = document.getElementById('th-progress-fill');
const thWarningMsg = document.getElementById('th-warning-msg');
const thInvestedInput = document.getElementById('th-invested-input');
const thPnlVal = document.getElementById('th-pnl-val');

const currentPriceEl = document.getElementById('current-price');
const priceArrowEl = document.getElementById('price-arrow');
const priceChangeEl = document.getElementById('price-change');
const lastUpdateEl = document.getElementById('last-update');

const sessionHighEl = document.getElementById('session-high');
const sessionLowEl = document.getElementById('session-low');
const volume24hEl = document.getElementById('volume-24h');

const scoreValueEl = document.getElementById('score-value');
const scoreBarFillEl = document.getElementById('score-bar-fill');

const buyTargetPriceEl = document.getElementById('buy-target-price');
const buyTargetStatusEl = document.getElementById('buy-target-status');
const sellTargetPriceEl = document.getElementById('sell-target-price');
const sellTargetStatusEl = document.getElementById('sell-target-status');
const stopLossPriceEl = document.getElementById('stop-loss-price');
const rrRatioEl = document.getElementById('rr-ratio');

const resistanceValEl = document.getElementById('resistance-val');
const supportValEl = document.getElementById('support-val');
const levelPositionFillEl = document.getElementById('level-position-fill');

const btcPriceEl = document.getElementById('btc-price');
const btcMomentumEl = document.getElementById('btc-momentum');
const btcStatusEl = document.getElementById('btc-status');

const sentimentIndicator = document.getElementById('sentiment-indicator');
const sentimentReason = document.getElementById('sentiment-reason');
const reasoningLogEl = document.getElementById('reasoning-log');

// Indicator elements in sidebar
const rsiValEl = document.getElementById('rsi-val');
const rsiStatusEl = document.getElementById('rsi-status');
const rsiFillEl = document.getElementById('rsi-fill');

const emaStatusEl = document.getElementById('ema-status');
const emaShortValEl = document.getElementById('ema-short-val');
const emaLongValEl = document.getElementById('ema-long-val');
const ema50ValEl = document.getElementById('ema50-val');

const macdStatusEl = document.getElementById('macd-status');
const macdValEl = document.getElementById('macd-val');
const macdSignalValEl = document.getElementById('macd-signal-val');

const volumeStatusEl = document.getElementById('volume-status');
const volCurrentEl = document.getElementById('vol-current');
const volAvgEl = document.getElementById('vol-avg');

const patternStatusEl = document.getElementById('pattern-status');
const patternNameEl = document.getElementById('pattern-name');

// Control Buttons
const resetSessionBtn = document.getElementById('reset-session');
const reSyncBtn = document.getElementById('re-sync');
const forceRefreshBtn = document.getElementById('force-refresh');

const btnModeScalp = document.getElementById('btn-mode-scalp');
const btnModeSwing = document.getElementById('btn-mode-swing');

// Active checklist items
const chkSupport = document.getElementById('chk-support');
const chkRsi = document.getElementById('chk-rsi');
const chkEma = document.getElementById('chk-ema');
const chkMacd = document.getElementById('chk-macd');
const chkVolume = document.getElementById('chk-volume');
const chkCandle = document.getElementById('chk-candle');
const chkTrend1h = document.getElementById('chk-trend1h');
const chkBtc = document.getElementById('chk-btc');

// Initialize Extension Sidepanel
document.addEventListener('DOMContentLoaded', () => {
  checkActiveTab();
  loadSignalHistory(); // Load stored signals & restore active trade

  resetSessionBtn.addEventListener('click', resetSession);
  reSyncBtn.addEventListener('click', checkActiveTab);
  forceRefreshBtn.addEventListener('click', triggerManualUpdate);

  if (btnModeScalp) btnModeScalp.addEventListener('click', () => setMode('scalp'));
  if (btnModeSwing) btnModeSwing.addEventListener('click', () => setMode('swing'));

  // Clear signal history button
  const clearHistBtn = document.getElementById('clear-history-btn');
  if (clearHistBtn) clearHistBtn.addEventListener('click', clearSignalHistory);

  // Language Toggle — restore saved preference
  const langToggleBtn = document.getElementById('lang-toggle');
  chrome.storage.local.get(['lang'], (result) => {
    if (result.lang === 'si') {
      currentLang = 'si';
      langToggleBtn.textContent = '🇬🇧';
    }
    applyTranslations();
  });

  langToggleBtn.addEventListener('click', () => {
    currentLang = currentLang === 'en' ? 'si' : 'en';
    langToggleBtn.textContent = currentLang === 'si' ? '🇬🇧' : '🇱🇰';
    chrome.storage.local.set({ lang: currentLang });
    applyTranslations();
    renderSignalHistory(); // re-render in new language
  });

  // Theme Toggle — restore saved preference
  const themeToggleBtn = document.getElementById('theme-toggle');
  chrome.storage.local.get(['theme'], (result) => {
    if (result.theme === 'light') {
      document.body.classList.add('light');
      themeToggleBtn.textContent = '🌙';
    }
  });

  themeToggleBtn.addEventListener('click', () => {
    const isLight = document.body.classList.toggle('light');
    themeToggleBtn.textContent = isLight ? '🌙' : '☀️';
    chrome.storage.local.set({ theme: isLight ? 'light' : 'dark' });
  });

  // Restore invested amount from storage and listen to changes
  if (thInvestedInput) {
    chrome.storage.local.get(['investedAmount'], (result) => {
      if (result.investedAmount) thInvestedInput.value = result.investedAmount;
    });
    thInvestedInput.addEventListener('input', (e) => {
      chrome.storage.local.set({ investedAmount: e.target.value });
      // Instant visual update if trade is active
      if (tradeActive && lockedEntryPrice) {
        updateTradeHealth(
          parseInt(scoreValueEl.textContent.split('/')[0]) || 0,
          thBtcVal.textContent,
          thBtcVal.style.color !== 'var(--neon-red)',
          parseFloat(currentPriceEl.textContent.replace('$', '').replace(',', '')),
          lockedEntryPrice, lockedSellTarget, lockedStopLoss
        );
      }
    });
  }

  // Setup Web Pair change button
  document.getElementById('btn-change-pair').addEventListener('click', () => {
    checkActiveTab();
  });
  
  // Initial load
  checkActiveTab();
});



function setMode(mode) {
  if (currentMode === mode) return;
  currentMode = mode;
  resetSession();
  
  if (mode === 'scalp') {
    btnModeScalp.classList.add('active');
    btnModeSwing.classList.remove('active');
  } else {
    btnModeSwing.classList.add('active');
    btnModeScalp.classList.remove('active');
  }
  
  triggerManualUpdate();
}

async function checkActiveTab() {
  stopPolling();
  
  try {
    const pairInput = document.getElementById('manual-pair-input');
    const parsedPair = pairInput.value ? pairInput.value.trim().toUpperCase() : 'BTCUSDT';
    
    if (parsedPair) {
      showConnected();
      
      if (currentPair !== parsedPair) {
        currentPair = parsedPair;
        resetSession();
      }
      tradingPairEl.textContent = currentPair.replace('USDT', '/USDT');
      
      startPolling();
    } else {
      showDisconnected();
    }
  } catch (error) {
    console.error('Error parsing pair:', error);
    showDisconnected();
  }
}

function parsePairFromUrl(url) {
  // Deprecated in web version
  return null;
}

function showConnected() {
  if (statusBadge) {
    statusBadge.textContent = 'CONNECTED';
    statusBadge.className = "status-badge connected";
  }
}

function showDisconnected() {
  if (statusBadge) {
    statusBadge.textContent = 'DISCONNECTED';
    statusBadge.className = "status-badge disconnected";
  }
}

function startPolling() {
  // Update analysis immediately, then query Binance API and page data every 5 seconds
  runAnalysisWorkflow();
  pollInterval = setInterval(runAnalysisWorkflow, 5000);
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

async function triggerManualUpdate() {
  lastUpdateEl.textContent = "Updating...";
  await runAnalysisWorkflow();
}

function resetSession() {
  lockedEntryPrice = null;
  lockedSellTarget = null;
  lockedStopLoss = null;
  tradeActive = false;

  chrome.storage.local.remove('activeTrade');
  if (tradeHealthPanel) tradeHealthPanel.classList.add('hidden');

  // Clean up any stranded 'pending' signals for the current pair
  if (signalHistory) {
    signalHistory = signalHistory.filter(s => !(s.status === 'pending' && s.pair === currentPair));
    persistSignals();
    renderSignalHistory();
    updateAccuracyUI();
  }

  buyTargetPriceEl.textContent = 'Calculating...';
  buyTargetStatusEl.textContent = 'Waiting...';
  buyTargetStatusEl.className = 'target-status neutral';
  
  sellTargetPriceEl.textContent = 'Calculating...';
  sellTargetStatusEl.textContent = 'Waiting...';
  sellTargetStatusEl.className = 'target-status neutral';

  stopLossPriceEl.textContent = '—';
  rrRatioEl.textContent = '—';
  
  scoreValueEl.textContent = '0';
  scoreBarFillEl.style.width = '0%';
  scoreBarFillEl.style.background = 'var(--neon-red)';
  
  sentimentIndicator.textContent = 'NEUTRAL';
  sentimentIndicator.className = 'sentiment-value neutral';
  sentimentReason.textContent = 'Awaiting clean API data...';
  reasoningLogEl.textContent = 'Analysis reset. Fetching updated OHLCV candles...';
}

// ----------------------------------------------------
// Core Analysis & Prediction Engine V2
// ----------------------------------------------------
async function runAnalysisWorkflow() {
  if (!currentPair) return;

  try {
    const symbol = currentPair;
    
    // Fetch multi-timeframe candlestick data from public Binance endpoint
    const scalpInterval = currentMode === 'scalp' ? '15m' : '1h'; 
    const macroInterval = '4h';

    // 1. Fetch live coin ticker stats (24h high, low, current price)
    const ticker = await fetchTickerData(symbol);
    const livePrice = parseFloat(ticker.lastPrice);
    
    // 2. Fetch Multi-Timeframe Candle OHLCV arrays
    const candles15m = await fetchKlines(symbol, '15m', 100);
    const candles1h  = await fetchKlines(symbol, '1h', 50);
    const candles4h  = await fetchKlines(symbol, '4h', 50);
    // BTC multi-timeframe: 15m for momentum timing, 1h for trend direction
    const btcCandles15m = await fetchKlines('BTCUSDT', '15m', 30);
    const btcCandles1h  = await fetchKlines('BTCUSDT', '1h',  30);

    if (!candles15m || candles15m.length < 30 || !candles1h || !candles4h || !btcCandles15m || !btcCandles1h) {
      reasoningLogEl.textContent = "Incomplete API response. Retrying next cycle...";
      return;
    }

    // Set active candles based on mode
    const scalpCandles = currentMode === 'scalp' ? candles15m : candles1h;
    
    // Parse data feeds — exclude last (still-forming) candle from indicator inputs
    const closes = scalpCandles.slice(0, -1).map(c => c.close);
    const volumes = scalpCandles.slice(0, -1).map(c => c.volume);
    const currentPrice = livePrice || scalpCandles[scalpCandles.length - 1].close;
    
    // Update live indicators/prices on UI
    updateTickerUI(ticker, currentPrice);

    // 3. Technical Indicator Calculations (on primary timeframe)
    const rsiVal = calculateRSI(closes, 14);
    const ema9 = calculateEMA(closes, 9);
    const ema21 = calculateEMA(closes, 21);
    
    // Macro Trend calculations using actual 1H and 4H candles
    const closes1h = candles1h.slice(0, -1).map(c => c.close);
    const closes4h = candles4h.slice(0, -1).map(c => c.close);
    const ema50_1h = calculateEMA(closes1h, 50);
    const ema50_4h = calculateEMA(closes4h, 50);

    const { macd, signal } = calculateMACD(closes);
    
    const volAvg = calculateAverage(volumes.slice(-21, -1));
    const volCurrent = volumes[volumes.length - 1];
    const isVolumeSpike = volCurrent >= volAvg * 1.5;

    // Detect patterns in last 3 candles
    const pattern = detectCandlePattern(scalpCandles.slice(-4));

    // Find nearest real swing high/low levels to current price
    // Use 1H chart for Scalp S/R, and 4H chart for Swing S/R for stronger levels
    const minGainPct = currentMode === 'scalp' ? 1.5 : 3.0;
    const srCandles = currentMode === 'scalp' ? candles1h.slice(0, -1) : candles4h.slice(0, -1);
    const { support, resistance, targetType } = findNearestSwingLevels(srCandles, currentPrice, minGainPct);

    // Calculate BTC Multi-Timeframe Health Score (0–4)
    // BTC dominance ~60% means every BTC move flows into alt coins
    const btc15mCloses = btcCandles15m.slice(0, -1).map(c => c.close);
    const btc1hCloses  = btcCandles1h.slice(0, -1).map(c => c.close);
    const btcLivePrice = btcCandles15m[btcCandles15m.length - 1].close;

    // [A] 15m Momentum: average direction of last 5 candles (4 closed + 1 live)
    const btc15mMomentum = (() => {
      const last5 = btcCandles15m.slice(-5);
      const totalChange = last5.reduce((sum, c) => sum + (c.close - c.open), 0);
      return totalChange / last5.length; // positive = bullish, negative = bearish
    })();
    const btc15mPct = ((btcLivePrice - btc15mCloses[btc15mCloses.length - 5]) / btc15mCloses[btc15mCloses.length - 5]) * 100;

    // [B] 1h Trend: EMA9 vs EMA21 on 1h candles
    const btcEma9_1h  = calculateEMA(btc1hCloses, 9);
    const btcEma21_1h = calculateEMA(btc1hCloses, 21);
    const btc1hBullish = btcEma9_1h > btcEma21_1h;

    // [C] 15m RSI: not overextended in either direction
    const btcRsi15m = calculateRSI(btc15mCloses, 14);
    const btcRsiHealthy = btcRsi15m > 35 && btcRsi15m < 72;

    // [D] Panic guard: check both last closed AND live candle for sharp dumps
    const btcLastCandle15m = btcCandles15m[btcCandles15m.length - 2];
    const btcLiveCandle15m = btcCandles15m[btcCandles15m.length - 1];
    
    const btcLastChange = ((btcLastCandle15m.close - btcLastCandle15m.open) / btcLastCandle15m.open) * 100;
    const btcLiveChange = ((btcLiveCandle15m.close - btcLiveCandle15m.open) / btcLiveCandle15m.open) * 100;
    const btcLiveDrop   = ((btcLiveCandle15m.close - btcLiveCandle15m.high) / btcLiveCandle15m.high) * 100;

    // Hard danger if any candle drops > 0.8%, or if live price crashes > 1% from its high
    const btcNoPanic = btcLastChange > -0.8 && btcLiveChange > -0.8 && btcLiveDrop > -1.0;

    // Compute BTC Health Score (0–4)
    let btcHealth = 0;
    if (btc15mMomentum > 0)   btcHealth++; // 15m momentum positive
    if (btc1hBullish)          btcHealth++; // 1h EMA trend bullish
    if (btcRsiHealthy)         btcHealth++; // RSI in healthy range
    if (btcNoPanic)            btcHealth++; // no panic candle

    // Thresholds:
    //  3–4 = STRONG BULL  → alt score gets +1 bonus
    //  2   = BULLISH      → normal trading allowed
    //  1   = NEUTRAL      → allowed but cautious (no bonus)
    //  0   = BEARISH      → HARD BLOCK all buys
    const btcLabel = btcHealth >= 3 ? 'STRONG BULL' :
                     btcHealth === 2 ? 'BULLISH' :
                     btcHealth === 1 ? 'NEUTRAL' : 'BEARISH';
    const btcIsSafe = btcHealth >= 1;   // At least neutral to allow entry
    const btcIsStrong = btcHealth >= 3; // Bonus point if BTC is strongly bullish
    const btcChangePct = btc15mPct;     // used in reasoning log

    // 4. Update Indicators Board UI
    updateIndicatorsBoard(rsiVal, ema9, ema21, ema50_1h, macd, signal, volCurrent, volAvg, pattern);

    // 5. Evaluate Confluence Score (Max 8 Points)
    let score = 0;
    const details = [];

    // Rule 1: Price near support zone (Within 1.5% of support floor)
    const withinSupportZone = currentPrice <= support * 1.015;
    if (withinSupportZone) {
      score++;
      details.push("Price within 1.5% of Support Floor.");
    }
    updateChecklistItem(chkSupport, withinSupportZone, `Price near Support Floor (< $${(support * 1.015).toFixed(4)})`);

    // Rule 2: RSI oversold or recovering
    const rsiOversold = rsiVal < 42;
    if (rsiOversold) {
      score++;
      details.push(`RSI is low/recovering (${rsiVal.toFixed(1)}).`);
    }
    updateChecklistItem(chkRsi, rsiOversold, `RSI Oversold Recovery (${rsiVal.toFixed(1)} < 42)`);

    // Rule 3: EMA Golden Cross
    const emaCross = ema9 > ema21;
    if (emaCross) {
      score++;
      details.push("EMA9 crossed above EMA21 (Bullish Crossover).");
    }
    updateChecklistItem(chkEma, emaCross, `EMA Golden Cross (9 > 21)`);

    // Rule 4: MACD Bullish alignment
    const macdCross = macd > signal;
    if (macdCross) {
      score++;
      details.push("MACD histogram is bullish (MACD > Signal).");
    }
    updateChecklistItem(chkMacd, macdCross, `MACD Bullish Crossover`);

    // Rule 5: Volume Spike confirmation
    if (isVolumeSpike) {
      score++;
      details.push("Volume surge detected (> 1.5x 20-bar average).");
    }
    updateChecklistItem(chkVolume, isVolumeSpike, `Volume Spike (${(volCurrent/volAvg).toFixed(1)}x average)`);

    // Rule 6: Bullish candle patterns
    const hasPattern = pattern !== "None";
    if (hasPattern) {
      score++;
      details.push(`Bullish candlestick structure detected: ${pattern}.`);
    }
    updateChecklistItem(chkCandle, hasPattern, `Bullish Candle Pattern (${pattern})`);

    // Rule 7: Macro Trend alignment (1H and 4H)
    const trend1hBullish = currentPrice > ema50_1h;
    const trend4hBullish = currentPrice > ema50_4h;
    
    if (trend1hBullish && trend4hBullish) {
      score++;
      details.push("Overall Macro trend is Bullish (Price above 1H & 4H EMA50).");
    } else if (trend1hBullish) {
      details.push("1H Trend is Bullish, but 4H is Bearish. Missing Macro Confluence.");
    } else {
      details.push("Macro Trend is Bearish.");
    }
    updateChecklistItem(chkTrend1h, trend1hBullish && trend4hBullish, `Macro Trend is UP (Price > 1H & 4H EMA50)`);

    // Rule 8: BTC Health Filter (dominance ~60% — most important rule)
    if (btcIsSafe) {
      score++;
      details.push(`BTC Health ${btcHealth}/4 (${btcLabel}) — market safe for alt entries.`);
    }
    // Bonus: BTC STRONG BULL gives alt an extra point (rising tide lifts all boats)
    if (btcIsStrong) {
      score++;
      details.push(`BTC STRONG BULL boost: 1h trend + 15m momentum both bullish.`);
    }
    updateChecklistItem(chkBtc, btcIsSafe, `BTC ${btcLabel} (Health ${btcHealth}/4, 5c momentum ${btc15mPct >= 0 ? '+' : ''}${btc15mPct.toFixed(2)}%)`);

    // Update BTC status card — show multi-TF health
    btcPriceEl.textContent = `$${btcLivePrice.toLocaleString()}`;
    btcMomentumEl.textContent = `${btcChangePct >= 0 ? '+' : ''}${btcChangePct.toFixed(2)}% (5c)`;
    btcMomentumEl.style.color = btcChangePct >= 0 ? 'var(--neon-green)' : 'var(--neon-red)';

    const btcBadgeMap = {
      'STRONG BULL': { text: t('btcStrongBull') || 'STRONG BULL', cls: 'btc-status-badge strong-bull' },
      'BULLISH':     { text: t('btcBullish')    || 'BULLISH',     cls: 'btc-status-badge safe' },
      'NEUTRAL':     { text: t('btcNeutral')    || 'NEUTRAL',     cls: 'btc-status-badge neutral' },
      'BEARISH':     { text: t('btcDanger')     || 'BEARISH',     cls: 'btc-status-badge danger' },
    };
    const badge = btcBadgeMap[btcLabel];
    btcStatusEl.textContent = badge.text;
    btcStatusEl.className = badge.cls;
    // Show 1h EMA cross direction
    btcMomentumEl.title = `1h EMA9=${btcEma9_1h.toFixed(0)} vs EMA21=${btcEma21_1h.toFixed(0)} | RSI(15m)=${btcRsi15m.toFixed(1)} | Health: ${btcHealth}/4`;

    // 6. Signal Confluence UI Updates
    scoreValueEl.textContent = score;
    const scorePct = (score / 8) * 100;
    scoreBarFillEl.style.width = `${scorePct}%`;
    if (score >= 6) {
      scoreBarFillEl.style.background = 'var(--neon-green)';
    } else if (score >= 4) {
      scoreBarFillEl.style.background = 'var(--neon-yellow)';
    } else {
      scoreBarFillEl.style.background = 'var(--neon-red)';
    }

    // Update level meters
    resistanceValEl.textContent = `$${resistance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 4})}`;
    supportValEl.textContent = `$${support.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 4})}`;
    let positionPct = ((currentPrice - support) / (resistance - support || 1)) * 100;
    positionPct = Math.max(5, Math.min(95, positionPct));
    levelPositionFillEl.style.left = `${positionPct}%`;

    // 7. Entry/Exit Trade Strategy Execution
    const entryTarget = support;       // Buy limit at swing low (support floor)
    const exitTarget  = resistance;    // Sell target at qualifying swing high

    // Stop Loss: sized so that R/R is always ≥ 1.5
    // slPct = gainPct / 1.5  (e.g. 1.5% gain target ⇒ 1% SL, 3% gain ⇒ 2% SL)
    const actualGainPct = ((exitTarget - entryTarget) / entryTarget) * 100;
    const slPct = Math.min(actualGainPct / 1.5, currentMode === 'scalp' ? 1.2 : 2.5) / 100;
    const protectiveStop = entryTarget * (1 - slPct);
    const riskReward = ((exitTarget - entryTarget) / (entryTarget - protectiveStop || 1)).toFixed(2);

    // Logic for locking trade signals
    // Gate 1: confluence score >= 6/8 AND BTC safe
    // Gate 2: minimum R/R of 1.5 (gain must be 1.5x the risk)
    const rrNum = parseFloat(riskReward);
    const meetsRR = rrNum >= 1.5;
    if (!lockedEntryPrice) {
      if (score >= 6 && btcIsSafe && meetsRR) {
        lockedEntryPrice = entryTarget;
        lockedSellTarget = exitTarget;
        lockedStopLoss   = protectiveStop;
        tradeActive      = true;
        // 📌 Save signal to history as PENDING
        saveSignal({
          pair: currentPair,
          score,
          entryPrice: entryTarget,
          sellTarget: exitTarget,
          stopLoss:   protectiveStop
        });
      }
    }

    // Render Targets card
    if (tradeActive) {
      buyTargetPriceEl.textContent = `$${lockedEntryPrice.toFixed(4)}`;
      buyTargetStatusEl.textContent = t('entryFired');
      buyTargetStatusEl.className = "target-status active";

      sellTargetPriceEl.textContent = `$${lockedSellTarget.toFixed(4)}`;
      stopLossPriceEl.textContent = `$${lockedStopLoss.toFixed(4)}`;
      rrRatioEl.textContent = `1:${riskReward}`;

      if (currentPrice >= lockedSellTarget) {
        sellTargetStatusEl.textContent = t('profitTaken');
        sellTargetStatusEl.className = "target-status active";
        sentimentIndicator.textContent = t('sentimentTakeProfit');
        sentimentIndicator.className = "sentiment-value strong-buy";
        sentimentReason.textContent = t('logProfitHit');
        // ✅ Mark signal as WIN and reset lock for next signal
        resolveSignal('win', currentPrice);
        lockedEntryPrice = null; lockedSellTarget = null; lockedStopLoss = null; tradeActive = false;
        if (tradeHealthPanel) tradeHealthPanel.classList.add('hidden');
      } else if (currentPrice <= lockedStopLoss) {
        sellTargetStatusEl.textContent = t('stoppedOut');
        sellTargetStatusEl.className = "target-status alert";
        sentimentIndicator.textContent = t('sentimentStopOut');
        sentimentIndicator.className = "sentiment-value strong-sell";
        sentimentReason.textContent = t('logStopHit');
        // ❌ Mark signal as LOSS and reset lock for next signal
        resolveSignal('loss', currentPrice);
        lockedEntryPrice = null; lockedSellTarget = null; lockedStopLoss = null; tradeActive = false;
        if (tradeHealthPanel) tradeHealthPanel.classList.add('hidden');
      } else {
        sellTargetStatusEl.textContent = t('pendingExit');
        sellTargetStatusEl.className = "target-status neutral";
        sentimentIndicator.textContent = t('sentimentInTrade');
        sentimentIndicator.className = "sentiment-value buy";
        sentimentReason.textContent = t('logInTrade');
        // 📡 Update the live Trade Health Monitor
        updateTradeHealth(score, btcLabel, btcIsSafe, currentPrice, lockedEntryPrice, lockedSellTarget, lockedStopLoss);
      }
    } else {
      // Hide health panel when not in an active trade
      if (tradeHealthPanel) tradeHealthPanel.classList.add('hidden');

      // Render estimated/pending target setup
      buyTargetPriceEl.textContent = `$${entryTarget.toFixed(4)}`;
      buyTargetStatusEl.textContent = t('waitSupport');
      buyTargetStatusEl.className = "target-status neutral";

      sellTargetPriceEl.textContent = `$${exitTarget.toFixed(4)}`;
      sellTargetStatusEl.textContent = t('waitBuy');
      sellTargetStatusEl.className = "target-status neutral";

      stopLossPriceEl.textContent = `$${protectiveStop.toFixed(4)}`;
      rrRatioEl.textContent = `1:${riskReward}`;

      // Overall AI Sentiment status
      if (score >= 6 && btcIsSafe) {
        sentimentIndicator.textContent = t('sentimentStrongBuy');
        sentimentIndicator.className = "sentiment-value strong-buy";
        sentimentReason.textContent = t('logStrongBuyReason');
      } else if (score >= 4) {
        sentimentIndicator.textContent = t('sentimentBuy');
        sentimentIndicator.className = "sentiment-value buy";
        sentimentReason.textContent = t('logAccumulate');
      } else {
        sentimentIndicator.textContent = t('sentimentBearish');
        sentimentIndicator.className = "sentiment-value sell";
        sentimentReason.textContent = t('logBearish');
      }
    }


    // Build reasoning log
    buildReasoningLog(score, details, currentPrice, entryTarget, exitTarget, protectiveStop, btcIsSafe, targetType, riskReward);
    
    // Timestamp update
    const now = new Date();
    lastUpdateEl.textContent = now.toLocaleTimeString();

  } catch (error) {
    console.error("Analysis engine failed:", error);
    reasoningLogEl.textContent = t('logApiError').replace('{msg}', error.message);
  }
}

// ----------------------------------------------------
// DOM & UI Update Helpers
// ----------------------------------------------------
function updateTickerUI(ticker, currentPrice) {
  currentPriceEl.textContent = currentPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 4});
  
  const dailyHigh = parseFloat(ticker.highPrice);
  const dailyLow = parseFloat(ticker.lowPrice);
  const dailyVol = parseFloat(ticker.volume);

  sessionHighEl.textContent = `$${dailyHigh.toLocaleString()}`;
  sessionLowEl.textContent = `$${dailyLow.toLocaleString()}`;
  volume24hEl.textContent = formatVolume(dailyVol);

  const priceChange = parseFloat(ticker.priceChangePercent);
  priceChangeEl.textContent = `${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}%`;
  
  if (priceChange >= 0) {
    currentPriceEl.className = "price-value up";
    priceArrowEl.className = "price-arrow up";
    priceArrowEl.textContent = "▲";
    priceChangeEl.style.color = "var(--neon-green)";
  } else {
    currentPriceEl.className = "price-value down";
    priceArrowEl.className = "price-arrow down";
    priceArrowEl.textContent = "▼";
    priceChangeEl.style.color = "var(--neon-red)";
  }
}

function updateIndicatorsBoard(rsi, ema9, ema21, ema50, macd, signal, volCurrent, volAvg, pattern) {
  // RSI status
  rsiValEl.textContent = rsi.toFixed(1);
  rsiFillEl.style.width = `${rsi}%`;
  if (rsi < 40) {
    rsiStatusEl.textContent = t('statusOversold');
    rsiStatusEl.className = "ind-status buy";
    rsiFillEl.style.backgroundColor = "var(--neon-green)";
  } else if (rsi > 65) {
    rsiStatusEl.textContent = t('statusOverbought');
    rsiStatusEl.className = "ind-status sell";
    rsiFillEl.style.backgroundColor = "var(--neon-red)";
  } else {
    rsiStatusEl.textContent = t('statusNeutral');
    rsiStatusEl.className = "ind-status neutral";
    rsiFillEl.style.backgroundColor = "var(--neon-blue)";
  }

  // EMA Crossovers
  emaShortValEl.textContent = ema9.toFixed(3);
  emaLongValEl.textContent = ema21.toFixed(3);
  ema50ValEl.textContent = ema50.toFixed(3);
  if (ema9 > ema21) {
    emaStatusEl.textContent = t('statusBullish');
    emaStatusEl.className = "ind-status bullish";
  } else {
    emaStatusEl.textContent = t('statusBearish');
    emaStatusEl.className = "ind-status bearish";
  }

  // MACD status
  macdValEl.textContent = macd.toFixed(4);
  macdSignalValEl.textContent = signal.toFixed(4);
  if (macd > signal) {
    macdStatusEl.textContent = t('statusBullish');
    macdStatusEl.className = "ind-status bullish";
  } else {
    macdStatusEl.textContent = t('statusBearish');
    macdStatusEl.className = "ind-status bearish";
  }

  // Volume
  volCurrentEl.textContent = formatVolume(volCurrent);
  volAvgEl.textContent = formatVolume(volAvg);
  if (volCurrent > volAvg * 1.5) {
    volumeStatusEl.textContent = t('statusSpike');
    volumeStatusEl.className = "ind-status bullish";
  } else {
    volumeStatusEl.textContent = t('statusNormal');
    volumeStatusEl.className = "ind-status neutral";
  }

  // Pattern
  patternNameEl.textContent = pattern === 'None' ? t('none') : pattern;
  if (pattern !== "None") {
    patternStatusEl.textContent = t('statusDetected');
    patternStatusEl.className = "ind-status bullish";
  } else {
    patternStatusEl.textContent = t('scanning');
    patternStatusEl.className = "ind-status neutral";
  }
}

function updateChecklistItem(itemEl, confirmed, labelText) {
  if (!itemEl) return;
  if (confirmed) {
    itemEl.innerHTML = `✅ ${labelText}`;
    itemEl.style.color = "var(--neon-green)";
  } else {
    itemEl.innerHTML = `❌ ${labelText}`;
    itemEl.style.color = "var(--text-muted)";
  }
}

function buildReasoningLog(score, details, currentPrice, entryTarget, exitTarget, stopLoss, btcSafe, targetType = 'SWING', rrStr = '?') {
  const profitPct   = ((exitTarget - entryTarget) / entryTarget * 100).toFixed(2);
  const slPct       = ((entryTarget - stopLoss) / entryTarget * 100).toFixed(2);
  const distToEntry = ((currentPrice - entryTarget) / currentPrice * 100).toFixed(2);
  const distToSell  = ((exitTarget - currentPrice) / currentPrice * 100).toFixed(2);
  const rrNum       = parseFloat(rrStr);
  const rrOk        = rrNum >= 1.5;
  const targetLabel = targetType === 'SWING' ? '🟢 REAL SWING HIGH' : '🟡 PROJECTED (No swing found)';

  let log = `🎯 ${t('logScore')}: ${score}/8\n`;
  log += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;

  if (details.length > 0) {
    details.forEach(d => log += `✅ ${d}\n`);
  } else {
    log += `${t('logNoSignals')}\n`;
  }

  log += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  log += `${t('logCurrentPrice')}  : $${currentPrice.toFixed(4)}\n`;
  log += `\n${t('logTradePlan')}\n`;
  log += `  ${t('logBuyLimit')} : $${entryTarget.toFixed(4)}  (${distToEntry}${t('logBelowNow')})\n`;
  log += `       ${t('logSwingLow')}\n`;
  log += `  ${t('logSellTarget')} : $${exitTarget.toFixed(4)}  (+${distToSell}${t('logFromNow')})\n`;
  log += `       ${targetLabel}\n`;
  log += `  ${t('logStopLoss')}   : $${stopLoss.toFixed(4)}  (-${slPct}${t('logFromEntry')})\n`;
  log += `  ${t('logProfitZone')} : +${profitPct}%  |  R/R = 1:${rrStr}  ${rrOk ? '✅' : '⚠️ low R/R'}\n`;

  log += `\n`;
  if (!rrOk) {
    log += `⚠️ R/R ${rrStr} is below 1.5 minimum — signal blocked. Waiting for better setup.\n`;
  } else if (score >= 6 && btcSafe) {
    log += t('logConfirmed');
  } else if (!btcSafe) {
    log += t('logSuspended');
  } else {
    log += t('logStandby').replace('{score}', score);
  }

  reasoningLogEl.textContent = log;
}

// Update the real-time Trade Health Monitor UI when IN TRADE
function updateTradeHealth(score, btcLabel, btcIsSafe, currentPrice, entryPrice, sellTarget, stopLoss) {
  if (!tradeHealthPanel) return;
  tradeHealthPanel.classList.remove('hidden');

  // Score value
  if (thScoreVal) thScoreVal.textContent = `${score}/8`;

  // BTC status text coloring
  if (thBtcVal) {
    thBtcVal.textContent = btcLabel;
    if (btcLabel === 'BEARISH') {
      thBtcVal.style.color = 'var(--neon-red)';
    } else if (btcLabel === 'STRONG BULL') {
      thBtcVal.style.color = '#ffcc00';
    } else if (btcLabel === 'BULLISH') {
      thBtcVal.style.color = 'var(--neon-green)';
    } else {
      thBtcVal.style.color = 'var(--neon-yellow)';
    }
  }

  // Calculate percentage progress toward sell target
  const totalRange = sellTarget - entryPrice;
  const progressPct = totalRange > 0 ? Math.max(0, Math.min(100, ((currentPrice - entryPrice) / totalRange) * 100)) : 0;
  if (thProgressVal) thProgressVal.textContent = `${progressPct.toFixed(1)}%`;
  if (thProgressFill) thProgressFill.style.width = `${progressPct}%`;

  // Calculate current PnL based on invested amount
  if (thPnlVal && thInvestedInput) {
    const invested = parseFloat(thInvestedInput.value);
    if (!isNaN(invested) && invested > 0) {
      const coins = invested / entryPrice;
      const currentVal = coins * currentPrice;
      const pnl = currentVal - invested;
      const pnlPct = (pnl / invested) * 100;
      
      const pnlStr = (pnl >= 0 ? '+' : '') + pnl.toFixed(2) + ' USDT (' + (pnl >= 0 ? '+' : '') + pnlPct.toFixed(2) + '%)';
      thPnlVal.textContent = pnlStr;
      
      if (pnl > 0) {
        thPnlVal.className = 'th-val th-pnl positive';
      } else if (pnl < 0) {
        thPnlVal.className = 'th-val th-pnl negative';
      } else {
        thPnlVal.className = 'th-val th-pnl neutral';
      }
    } else {
      thPnlVal.textContent = '—';
      thPnlVal.className = 'th-val th-pnl neutral';
    }
  }

  // Determine health state & warning keys based on score and BTC health
  let healthState = 'Healthy';
  let warnKey = 'thWarnGood';

  if (!btcIsSafe || btcLabel === 'BEARISH') {
    if (score < 4) {
      healthState = 'Danger';
      warnKey = 'thWarnBothBad';
    } else {
      healthState = 'Danger';
      warnKey = 'thWarnBtcDanger';
    }
  } else if (score < 4) {
    healthState = 'Caution';
    warnKey = 'thWarnCaution';
  } else {
    healthState = 'Healthy';
    warnKey = 'thWarnGood';
  }

  // Update badge UI
  if (thHealthBadge) {
    thHealthBadge.textContent = t(`th${healthState}`);
    thHealthBadge.className = `th-badge th-${healthState.toLowerCase()}`;
  }

  // Update warning message
  if (thWarningMsg) {
    thWarningMsg.textContent = t(warnKey);
    thWarningMsg.className = `th-warning warn-${healthState === 'Healthy' ? 'ok' : healthState === 'Caution' ? 'caution' : 'danger'}`;
    thWarningMsg.classList.remove('hidden');
  }

  // Draw 8 score dots colored by current health state
  if (thScoreDots) {
    thScoreDots.innerHTML = '';
    const dotClass = healthState === 'Healthy' ? 'on-green' : healthState === 'Caution' ? 'on-yellow' : 'on-red';
    for (let i = 1; i <= 8; i++) {
      const dot = document.createElement('div');
      dot.className = `th-dot ${i <= score ? dotClass : ''}`;
      thScoreDots.appendChild(dot);
    }
  }
}



// ----------------------------------------------------
// Public Binance API Fetch Helpers
// ----------------------------------------------------
async function fetchTickerData(symbol) {
  const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Binance API ticker error: ${res.statusText}`);
  return await res.json();
}

async function fetchKlines(symbol, interval, limit) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Binance API klines error: ${res.statusText}`);
  const data = await res.json();
  
  // Format to clean OHLCV objects
  return data.map(item => ({
    openTime: item[0],
    open: parseFloat(item[1]),
    high: parseFloat(item[2]),
    low: parseFloat(item[3]),
    close: parseFloat(item[4]),
    volume: parseFloat(item[5])
  }));
}

// ----------------------------------------------------
// Technical Analysis Calculation Libraries
// ----------------------------------------------------
function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) return 50; // not enough data, return neutral
  let gains = 0;
  let losses = 0;

  // FIX: start from prices.length - period (not prices.length - period + 1)
  // so we compute `period` diffs from index [len-period] to [len-1]
  const start = prices.length - period;
  for (let i = start; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }

  if (losses === 0) return 100;
  const rs = (gains / period) / (losses / period);
  return 100 - (100 / (1 + rs));
}

function calculateEMA(prices, period) {
  const k = 2 / (period + 1);
  let ema = prices[0];
  for (let i = 1; i < prices.length; i++) {
    ema = (prices[i] * k) + (ema * (1 - k));
  }
  return ema;
}

function calculateMACD(prices) {
  // Fast EMA (12), Slow EMA (26)
  const emas12 = [];
  const emas26 = [];
  
  let ema12Val = prices[0];
  let ema26Val = prices[0];
  
  const k12 = 2 / 13;
  const k26 = 2 / 27;

  for (let i = 0; i < prices.length; i++) {
    ema12Val = (prices[i] * k12) + (ema12Val * (1 - k12));
    ema26Val = (prices[i] * k26) + (ema26Val * (1 - k26));
    emas12.push(ema12Val);
    emas26.push(ema26Val);
  }

  const macdLine = emas12.map((val, idx) => val - emas26[idx]);
  
  // Signal Line (9 EMA of MACD Line)
  let signalVal = macdLine[0];
  const k9 = 2 / 10;
  for (let i = 1; i < macdLine.length; i++) {
    signalVal = (macdLine[i] * k9) + (signalVal * (1 - k9));
  }

  return {
    macd: macdLine[macdLine.length - 1],
    signal: signalVal
  };
}

function calculateAverage(array) {
  const sum = array.reduce((acc, val) => acc + val, 0);
  return sum / (array.length || 1);
}

// Find the nearest REAL swing levels with MINIMUM PROFIT ENFORCEMENT.
// Entry  = nearest swing LOW below current price.
// Target = lowest swing HIGH that gives >= minGainPct profit from entry.
// If no real swing high qualifies, a mathematical projection is used as fallback.
//
// minGainPct: 1.5 for scalp, 3.0 for swing (prevents 0.5% micro-targets)
function findNearestSwingLevels(candles, currentPrice, minGainPct = 1.5) {
  const swingLows  = [];
  const swingHighs = [];

  // Need at least 3 candles to check both neighbours
  for (let i = 2; i < candles.length - 1; i++) {
    const prev = candles[i - 1];
    const curr = candles[i];
    const next = candles[i + 1];

    // Swing Low: local valley — both neighbours are higher
    if (curr.low < prev.low && curr.low < next.low) {
      swingLows.push(curr.low);
    }

    // Swing High: local peak — both neighbours are lower
    if (curr.high > prev.high && curr.high > next.high) {
      swingHighs.push(curr.high);
    }
  }

  // ── Support: nearest swing low BELOW current price (within 6% down) ──
  const validLows = swingLows
    .filter(low => low < currentPrice && low >= currentPrice * 0.94)
    .sort((a, b) => b - a); // descending: closest to current price first

  const support = validLows.length > 0 ? validLows[0] : currentPrice * 0.985;

  // ── Resistance: swing high that gives MIN gain from entry ──
  // minGainPct enforces that the bot only targets meaningful moves.
  const minTarget  = support * (1 + minGainPct / 100);
  const maxTarget  = support * 1.15;  // cap at 15% above entry to stay realistic

  // Filter swing highs: must be above minTarget and below maxTarget
  const qualifyingHighs = swingHighs
    .filter(high => high >= minTarget && high <= maxTarget)
    .sort((a, b) => a - b); // ascending: lowest qualifying high first

  let resistance;
  let targetType; // 'SWING' or 'PROJECTED'

  if (qualifyingHighs.length > 0) {
    // ✅ Real swing high that satisfies the minimum gain — use it
    resistance = qualifyingHighs[0];
    targetType = 'SWING';
  } else {
    // ⚠ No qualifying swing high in range — project a target mathematically
    // Use minGainPct + 0.5% buffer to ensure we beat fees
    resistance = support * (1 + (minGainPct + 0.5) / 100);
    targetType = 'PROJECTED';
  }

  return { support, resistance, targetType };
}


// Shim for Chrome Storage API in a standard web browser
if (!window.chrome) {
  window.chrome = {};
}
if (!window.chrome.storage) {
  window.chrome.storage = {
    local: {
      get: function(keys, callback) {
        let result = {};
        keys.forEach(k => {
          let val = localStorage.getItem(k);
          if (val !== null) {
            try { result[k] = JSON.parse(val); } catch(e) { result[k] = val; }
          }
        });
        if(callback) callback(result);
      },
      set: function(obj, callback) {
        for(let k in obj) {
          localStorage.setItem(k, JSON.stringify(obj[k]));
        }
        if(callback) callback();
      },
      remove: function(key, callback) {
        localStorage.removeItem(key);
        if(callback) callback();
      }
    }
  };
}

// ----------------------------------------------------
// Candlestick Pattern Recognition Engine
// ----------------------------------------------------
function detectCandlePattern(lastCandles) {
  if (lastCandles.length < 3) return "None";
  
  // Last closed candle
  const c1 = lastCandles[lastCandles.length - 2];
  // Previous closed candle
  const c2 = lastCandles[lastCandles.length - 3];
  
  const bodySize = Math.abs(c1.close - c1.open);
  const range = c1.high - c1.low || 0.0001;
  const isBullish = c1.close > c1.open;

  // 1. Hammer Pattern (Small body, long lower wick, tiny upper wick)
  const lowerWick = isBullish ? (c1.open - c1.low) : (c1.close - c1.low);
  const upperWick = isBullish ? (c1.high - c1.close) : (c1.high - c1.open);
  
  if (lowerWick > bodySize * 2 && upperWick < bodySize * 0.5) {
    return "Hammer (Bullish Reversal)";
  }

  // 2. Bullish Engulfing Pattern (Large green body swallows previous red body)
  const prevBodySize = Math.abs(c2.close - c2.open);
  const prevIsBearish = c2.close < c2.open;
  
  if (isBullish && prevIsBearish && bodySize > prevBodySize && c1.close > c2.open && c1.open < c2.close) {
    return "Engulfing";
  }

  // Doji = indecision, NOT a bullish signal — excluded from bullish pattern detection
  return "None";
}

function formatVolume(val) {
  if (!val) return "—";
  if (val >= 1.0e6) return (val / 1.0e6).toFixed(2) + 'M';
  if (val >= 1.0e3) return (val / 1.0e3).toFixed(1) + 'K';
  return val.toFixed(1);
}
