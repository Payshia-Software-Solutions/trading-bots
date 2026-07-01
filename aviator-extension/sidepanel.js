// sidepanel.js

let globalAccumulatedOdds = [];
let pendingForecasts = {}; // { index: { markov: {}, knn: {}, trend: {}, pareto: {}, nn: {}, threshold } }
let accuracyHistory = {
  markov: [],
  knn: [],
  trend: [],
  pareto: [],
  nn: []
};
let sequenceDirection = 'reversed'; // 'reversed' means newest at index 0, 'normal' means oldest at index 0
let globalBetSize = 10;
let isDailyTargetReached = false;
let predictionEngine = 'auto';
let activeEngineUsed = 'markov';

// Setup listeners on load
document.addEventListener('DOMContentLoaded', () => {
  // Load settings & accumulated data
  chrome.storage.local.get([
    'sidepanelMode', 
    'sidepanelDirection', 
    'sidepanelThreshold',
    'accumulatedOdds',
    'pendingForecasts',
    'accuracyHistory',
    'betSize',
    'sidepanelSafety',
    'sidepanelLossProtection',
    'sidepanelAutoSkip',
    'sidepanelDailyTarget',
    'predictionEngine'
  ], (res) => {
    if (res.sidepanelMode) {
      document.getElementById('sel-mode').value = res.sidepanelMode;
    }
    if (res.sidepanelDirection) {
      sequenceDirection = res.sidepanelDirection;
      updateDirectionButtons();
    }
    if (res.sidepanelThreshold) {
      document.getElementById('sel-threshold').value = res.sidepanelThreshold;
      syncThresholdPills(res.sidepanelThreshold);
    } else {
      syncThresholdPills(8); // default
    }
    if (res.accumulatedOdds) {
      globalAccumulatedOdds = res.accumulatedOdds.map(v => parseFloat(v)).filter(v => !isNaN(v));
    }
    if (res.pendingForecasts) {
      pendingForecasts = res.pendingForecasts;
    }
    if (res.accuracyHistory) {
      if (Array.isArray(res.accuracyHistory)) {
        // Migrate old array accuracyHistory to new structure
        accuracyHistory = {
          markov: res.accuracyHistory,
          knn: [],
          trend: [],
          pareto: [],
          nn: []
        };
      } else {
        accuracyHistory = res.accuracyHistory;
      }
    }
    // Defensive initialization
    if (!accuracyHistory.markov) accuracyHistory.markov = [];
    if (!accuracyHistory.knn) accuracyHistory.knn = [];
    if (!accuracyHistory.trend) accuracyHistory.trend = [];
    if (!accuracyHistory.pareto) accuracyHistory.pareto = [];
    if (!accuracyHistory.nn) accuracyHistory.nn = [];

    if (res.betSize !== undefined) {
      globalBetSize = parseFloat(res.betSize) || 10;
    }
    document.getElementById('input-bet-size').value = globalBetSize;
    if (res.sidepanelSafety) {
      document.getElementById('sel-safety').value = res.sidepanelSafety;
    }
    if (res.sidepanelLossProtection !== undefined) {
      document.getElementById('chk-loss-protection').checked = res.sidepanelLossProtection;
    }
    if (res.sidepanelAutoSkip !== undefined) {
      document.getElementById('chk-auto-skip').checked = res.sidepanelAutoSkip;
    }
    if (res.sidepanelDailyTarget !== undefined) {
      document.getElementById('input-daily-target').value = res.sidepanelDailyTarget;
    }
    if (res.predictionEngine) {
      predictionEngine = res.predictionEngine;
    }
    document.getElementById('sel-engine').value = predictionEngine;

    updatePanel();
  });

  // Action listeners
  document.getElementById('sel-engine').addEventListener('change', (e) => {
    chrome.storage.local.set({ predictionEngine: e.target.value }, updatePanel);
  });

  document.getElementById('sel-mode').addEventListener('change', (e) => {
    chrome.storage.local.set({ sidepanelMode: e.target.value }, updatePanel);
  });

  document.getElementById('sel-threshold').addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val >= 2) {
      syncThresholdPills(val);
      chrome.storage.local.set({ sidepanelThreshold: val }, updatePanel);
    }
  });

  // Threshold quick select pills listener
  document.querySelectorAll('.thresh-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const val = parseInt(pill.getAttribute('data-val'));
      document.getElementById('sel-threshold').value = val;
      syncThresholdPills(val);
      chrome.storage.local.set({ sidepanelThreshold: val }, updatePanel);
    });
  });

  document.getElementById('sel-safety').addEventListener('change', (e) => {
    chrome.storage.local.set({ sidepanelSafety: e.target.value }, updatePanel);
  });

  document.getElementById('chk-loss-protection').addEventListener('change', (e) => {
    chrome.storage.local.set({ sidepanelLossProtection: e.target.checked }, updatePanel);
  });

  document.getElementById('chk-auto-skip').addEventListener('change', (e) => {
    chrome.storage.local.set({ sidepanelAutoSkip: e.target.checked }, updatePanel);
  });

  document.getElementById('chk-filter-high-odds').addEventListener('change', () => {
    renderAccuracyUI();
  });

  ['max', 'high', 'standard', 'aggressive'].forEach(opt => {
    const el = document.getElementById(`compare-${opt}`);
    if (el) {
      el.addEventListener('click', () => {
        chrome.storage.local.set({ sidepanelSafety: opt }, updatePanel);
      });
    }
  });

  document.getElementById('input-bet-size').addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val >= 0) {
      globalBetSize = val;
      // Sync to planner bet input
      const pBet = document.getElementById('input-planner-bet');
      if (pBet) pBet.value = val;
      chrome.storage.local.set({ betSize: val }, () => {
        renderAccuracyUI();
      });
    }
  });

  document.getElementById('input-daily-target').addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    const targetVal = isNaN(val) ? 100 : val;
    // Sync to planner target input
    const pTarget = document.getElementById('input-planner-target');
    if (pTarget) pTarget.value = targetVal;
    chrome.storage.local.set({ sidepanelDailyTarget: targetVal }, () => {
      renderAccuracyUI();
      updatePanel();
    });
  });

  const btnDirRev = document.getElementById('btn-dir-rev');
  const btnDirNormal = document.getElementById('btn-dir-normal');

  btnDirRev.addEventListener('click', () => {
    sequenceDirection = 'reversed';
    updateDirectionButtons();
    chrome.storage.local.set({ sidepanelDirection: 'reversed' }, updatePanel);
  });

  btnDirNormal.addEventListener('click', () => {
    sequenceDirection = 'normal';
    updateDirectionButtons();
    chrome.storage.local.set({ sidepanelDirection: 'normal' }, updatePanel);
  });

  document.getElementById('btn-clear-stats').addEventListener('click', () => {
    if (confirm("Are you sure you want to clear all accumulated data and verification history?")) {
      globalAccumulatedOdds = [];
      pendingForecasts = {};
      accuracyHistory = {
        markov: [],
        knn: [],
        trend: [],
        pareto: [],
        nn: []
      };
      // Clear all extension storage keys
      chrome.storage.local.remove(['aviatorOdds', 'accumulatedOdds', 'pendingForecasts', 'accuracyHistory'], () => {
        updatePanel();
      });
    }
  });

  // --- Target Planner Tab Logic ---
  const btnTabPredictor = document.getElementById('btn-tab-predictor');
  const btnTabPlanner = document.getElementById('btn-tab-planner');
  const panelPredictor = document.getElementById('panel-predictor');
  const panelPlanner = document.getElementById('panel-planner');

  if (btnTabPredictor && btnTabPlanner && panelPredictor && panelPlanner) {
    btnTabPredictor.addEventListener('click', () => {
      btnTabPredictor.style.background = 'rgba(168, 85, 247, 0.12)';
      btnTabPredictor.style.borderColor = 'rgba(168, 85, 247, 0.25)';
      btnTabPredictor.style.color = '#c084fc';

      btnTabPlanner.style.background = 'transparent';
      btnTabPlanner.style.borderColor = 'transparent';
      btnTabPlanner.style.color = 'var(--text-secondary)';

      panelPredictor.style.display = 'block';
      panelPlanner.style.display = 'none';
    });

    btnTabPlanner.addEventListener('click', () => {
      btnTabPlanner.style.background = 'rgba(168, 85, 247, 0.12)';
      btnTabPlanner.style.borderColor = 'rgba(168, 85, 247, 0.25)';
      btnTabPlanner.style.color = '#c084fc';

      btnTabPredictor.style.background = 'transparent';
      btnTabPredictor.style.borderColor = 'transparent';
      btnTabPredictor.style.color = 'var(--text-secondary)';

      panelPredictor.style.display = 'none';
      panelPlanner.style.display = 'block';
      
      updatePlannerUI();
    });
  }

  // Load and sync planner bankroll, strategy & staking system
  chrome.storage.local.get(['plannerBankroll', 'plannerStrategyStyle', 'plannerStakingSystem'], (pRes) => {
    if (pRes.plannerBankroll !== undefined) {
      document.getElementById('input-planner-bankroll').value = pRes.plannerBankroll;
    }
    if (pRes.plannerStrategyStyle !== undefined) {
      document.getElementById('sel-planner-strategy').value = pRes.plannerStrategyStyle;
    }
    if (pRes.plannerStakingSystem !== undefined) {
      document.getElementById('sel-planner-staking').value = pRes.plannerStakingSystem;
    }
    
    // Sync planner bet & target values with predictor inputs initially
    chrome.storage.local.get(['betSize', 'sidepanelDailyTarget'], (sRes) => {
      const bSize = sRes.betSize !== undefined ? sRes.betSize : 10;
      const dTarget = sRes.sidepanelDailyTarget !== undefined ? sRes.sidepanelDailyTarget : 100;
      document.getElementById('input-planner-bet').value = bSize;
      document.getElementById('input-planner-target').value = dTarget;
      
      updatePlannerUI();
    });
  });

  // Sync inputs dynamically
  document.getElementById('input-planner-target').addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    const targetVal = isNaN(val) ? 100 : val;
    document.getElementById('input-daily-target').value = targetVal;
    chrome.storage.local.set({ sidepanelDailyTarget: targetVal }, () => {
      renderAccuracyUI();
      updatePlannerUI();
    });
  });

  document.getElementById('input-planner-bet').addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val >= 0) {
      globalBetSize = val;
      document.getElementById('input-bet-size').value = val;
      chrome.storage.local.set({ betSize: val }, () => {
        renderAccuracyUI();
        updatePlannerUI();
      });
    }
  });

  document.getElementById('input-planner-bankroll').addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val >= 0) {
      chrome.storage.local.set({ plannerBankroll: val }, () => {
        updatePlannerUI();
      });
    }
  });

  document.getElementById('sel-planner-strategy').addEventListener('change', (e) => {
    chrome.storage.local.set({ plannerStrategyStyle: e.target.value }, () => {
      updatePlannerUI();
    });
  });

  document.getElementById('sel-planner-staking').addEventListener('change', (e) => {
    chrome.storage.local.set({ plannerStakingSystem: e.target.value }, () => {
      updatePlannerUI();
    });
  });
});

function updateDirectionButtons() {
  const btnDirRev = document.getElementById('btn-dir-rev');
  const btnDirNormal = document.getElementById('btn-dir-normal');
  if (sequenceDirection === 'reversed') {
    btnDirRev.classList.add('active');
    btnDirNormal.classList.remove('active');
  } else {
    btnDirNormal.classList.add('active');
    btnDirRev.classList.remove('active');
  }
}

// React to storage changes from scraper
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && (changes.aviatorOdds || changes.lastScrapedTime)) {
    updatePanel();
  }
});

function updatePanel() {
  chrome.storage.local.get([
    'aviatorOdds', 
    'sidepanelMode', 
    'sidepanelThreshold',
    'sidepanelSafety',
    'sidepanelLossProtection',
    'sidepanelAutoSkip',
    'predictionEngine'
  ], (result) => {
    const rawOdds = result.aviatorOdds || [];
    const mode = result.sidepanelMode || 'safe';
    const threshold = parseInt(result.sidepanelThreshold) || 8;
    const safety = result.sidepanelSafety || 'standard';
    const lossProtection = result.sidepanelLossProtection !== undefined ? result.sidepanelLossProtection : true;
    const autoSkip = result.sidepanelAutoSkip !== undefined ? result.sidepanelAutoSkip : true;
    predictionEngine = result.predictionEngine || 'auto';

    // Sync select dropdowns in the UI with storage values to prevent DOM desynchronization
    document.getElementById('sel-mode').value = mode;
    document.getElementById('sel-threshold').value = threshold;
    document.getElementById('sel-safety').value = safety;
    document.getElementById('chk-loss-protection').checked = lossProtection;
    document.getElementById('chk-auto-skip').checked = autoSkip;
    document.getElementById('sel-engine').value = predictionEngine;

    // Parse incoming to chronological (oldest -> newest)
    let incomingChronological = [...rawOdds].map(v => parseFloat(v)).filter(v => !isNaN(v));
    if (sequenceDirection === 'reversed') {
      incomingChronological.reverse();
    }

    if (incomingChronological.length === 0) {
      verifyAccuracy();
      runCalculations(mode, threshold, safety, lossProtection, autoSkip);
      renderHistoryPills();
      return;
    }

    // Determine the delta (new rounds) by checking where our last 5-element suffix fits in the incoming data
    if (globalAccumulatedOdds.length < 5) {
      // First run (or after Reset): take the entire history currently visible on screen
      globalAccumulatedOdds = [...incomingChronological];
      chrome.storage.local.set({ accumulatedOdds: globalAccumulatedOdds });
    } else {
      // Get the last 5 elements of our accumulated history
      const accSuffix = globalAccumulatedOdds.slice(-5);
      let matchIdx = -1;

      // Scan incomingChronological from right to left to find where accSuffix matches contiguously
      for (let i = incomingChronological.length - 5; i >= 0; i--) {
        const candidate = incomingChronological.slice(i, i + 5);
        if (candidate.every((val, idx) => Math.abs(val - accSuffix[idx]) < 0.01)) {
          matchIdx = i;
          break;
        }
      }

      // If we found the suffix match, only append the elements that come after the matched suffix
      if (matchIdx !== -1) {
        const newElements = incomingChronological.slice(matchIdx + 5);
        if (newElements.length > 0) {
          globalAccumulatedOdds = globalAccumulatedOdds.concat(newElements);
          chrome.storage.local.set({ accumulatedOdds: globalAccumulatedOdds });
        }
      } else {
        // Absolute jump prevention: if there is no match (e.g. page switched or long disconnect),
        // we DO NOT append anything. This guarantees 0 jumps! The system will align on the next round.
      }
    }

    const lblStatus = document.getElementById('lbl-status');
    if (rawOdds.length > 0) {
      lblStatus.textContent = 'Live Connected';
      lblStatus.style.background = 'rgba(16, 185, 129, 0.12)';
      lblStatus.style.color = '#10b981';
      lblStatus.style.borderColor = 'rgba(16, 185, 129, 0.25)';
    } else {
      lblStatus.textContent = 'Searching...';
      lblStatus.style.background = 'rgba(239, 68, 68, 0.12)';
      lblStatus.style.color = '#ef4444';
      lblStatus.style.borderColor = 'rgba(239, 68, 68, 0.25)';
    }

    // Run verification of previous predictions against new actual rounds
    verifyAccuracy();

    // Re-calculate statistics and forecast
    runCalculations(mode, threshold, safety, lossProtection, autoSkip);
    renderHistoryPills();
  });
}

// Evaluates whether previous forecasts met the actual results
function verifyAccuracy() {
  let changed = false;
  
  try {
    // Look for any pending forecasts that we can resolve
    Object.keys(pendingForecasts).forEach(idxStr => {
      const idx = parseInt(idxStr);
      
      // If we have actual data for this round index
      if (idx < globalAccumulatedOdds.length) {
        const prediction = pendingForecasts[idx];
        
        if (prediction) {
          const actualVal = parseFloat(globalAccumulatedOdds[idx]);
          const thresholdVal = prediction.threshold !== undefined ? prediction.threshold : 8;
          
          // Support migration of old flat pending forecasts
          if (prediction.target !== undefined || prediction.isSkip !== undefined) {
            const markovPred = {
              target: prediction.target,
              uncappedTarget: prediction.uncappedTarget !== undefined ? prediction.uncappedTarget : prediction.target,
              label: prediction.label,
              isSkip: prediction.isSkip
            };
            prediction.markov = markovPred;
            prediction.knn = { isSkip: true };
            prediction.trend = { isSkip: true };
            prediction.pareto = { isSkip: true };
          }
          
          const engines = ['markov', 'knn', 'trend', 'pareto', 'nn'];
          engines.forEach(eng => {
            const enginePred = prediction[eng];
            if (!enginePred) return;
            
            if (!accuracyHistory[eng]) {
              accuracyHistory[eng] = [];
            }
            
            // Ensure we don't log duplicate indexes for this engine
            if (accuracyHistory[eng].some(h => h.index === idx)) {
              return;
            }
            
            if (enginePred.isSkip) {
              accuracyHistory[eng].push({
                index: idx,
                target: "SKIP",
                actual: actualVal,
                result: 'SKIP',
                threshold: thresholdVal
              });
            } else if (enginePred.target !== undefined) {
              const rawTarget = enginePred.target;
              // Check if this was a High Odds prediction where target is capped at threshold
              const isHighOddsPred = typeof rawTarget === 'number' && rawTarget >= thresholdVal;
              const evalTarget = isHighOddsPred ? thresholdVal : rawTarget;
              let result = actualVal >= evalTarget ? 'PASS' : 'FAIL';
              
              if (result === 'FAIL' && isHighOddsPred) {
                // Check 1 round early
                if (idx > 0 && globalAccumulatedOdds[idx - 1] >= evalTarget) {
                  result = 'NEAR_MISS_EARLY';
                }
              }
              
              // Check if the previous round index prediction (idx - 1) was a failed High Odds prediction,
              // and this round (idx) is a hit. If so, update the previous prediction to NEAR_MISS_LATE!
              const prevEntry = accuracyHistory[eng].find(h => h.index === idx - 1);
              if (prevEntry && prevEntry.result === 'FAIL') {
                const prevThreshold = prevEntry.threshold !== undefined ? prevEntry.threshold : 8;
                const prevIsHighOdds = (typeof prevEntry.rawTarget === 'number' && prevEntry.rawTarget >= prevThreshold) || 
                                       (typeof prevEntry.target === 'number' && prevEntry.target >= prevThreshold);
                if (prevIsHighOdds && actualVal >= prevEntry.target) {
                  prevEntry.result = 'NEAR_MISS_LATE';
                  changed = true;
                }
              }
              
              accuracyHistory[eng].push({
                index: idx,
                target: evalTarget,
                rawTarget: rawTarget,
                uncappedTarget: enginePred.uncappedTarget !== undefined ? enginePred.uncappedTarget : rawTarget,
                actual: actualVal,
                result: result,
                threshold: thresholdVal
              });
            }
          });
        }
        
        delete pendingForecasts[idx];
        changed = true;
      }
    });

    if (changed) {
      chrome.storage.local.set({ 
        pendingForecasts: pendingForecasts, 
        accuracyHistory: accuracyHistory 
      });
    }
  } catch (err) {
    console.error("Accuracy verification error: ", err);
  }

  // Draw Accuracy UI
  renderAccuracyUI();
}

function renderAccuracyUI() {
  const chkFilterHighOdds = document.getElementById('chk-filter-high-odds');
  const filterHighOdds = chkFilterHighOdds ? chkFilterHighOdds.checked : false;

  // Read selected threshold
  const thresholdEl = document.getElementById('sel-threshold');
  const threshold = thresholdEl ? (parseInt(thresholdEl.value) || 8) : 8;

  // Update checkbox label threshold text
  const lblFilterThresholdVal = document.getElementById('lbl-filter-threshold-val');
  if (lblFilterThresholdVal) {
    lblFilterThresholdVal.textContent = threshold + 'x';
  }

  // Auto routing logic to find best engine if set to auto based on active strategy mode (safe vs high odds)
  const modeEl = document.getElementById('sel-mode');
  const mode = modeEl ? modeEl.value : 'safe';

  if (predictionEngine === 'auto') {
    let bestEng = 'markov';
    let maxAcc = -1;
    const engines = ['markov', 'knn', 'trend', 'pareto', 'nn'];
    
    engines.forEach(eng => {
      const engHistory = accuracyHistory[eng] || [];
      let verifiedMatches = [];
      if (mode === 'high') {
        // Filter to only high odds bets for this engine
        verifiedMatches = engHistory.filter(h => {
          const predT = h.uncappedTarget !== undefined ? h.uncappedTarget : h.target;
          return h.result !== 'SKIP' && typeof predT === 'number' && predT >= threshold;
        }).slice(-20);
      } else {
        verifiedMatches = engHistory.filter(h => h.result === 'PASS' || h.result === 'FAIL' || (h.result && h.result.includes('NEAR_MISS'))).slice(-20);
      }
      
      const wins = verifiedMatches.filter(h => {
        if (mode === 'high') {
          return h.actual >= threshold;
        } else {
          return h.result === 'PASS';
        }
      }).length;
      
      const acc = verifiedMatches.length > 0 ? (wins / verifiedMatches.length) : 0.5; // default 50%
      if (acc > maxAcc) {
        maxAcc = acc;
        bestEng = eng;
      }
    });
    activeEngineUsed = bestEng;
  } else {
    activeEngineUsed = predictionEngine;
  }

  // Render individual engine accuracy labels in the comparison grid (reflects safe/high mode)
  const enginesList = ['markov', 'knn', 'trend', 'pareto', 'nn'];
  enginesList.forEach(eng => {
    const engHistory = accuracyHistory[eng] || [];
    let verifiedMatches = [];
    if (mode === 'high') {
      verifiedMatches = engHistory.filter(h => {
        const predT = h.uncappedTarget !== undefined ? h.uncappedTarget : h.target;
        return h.result !== 'SKIP' && typeof predT === 'number' && predT >= threshold;
      });
    } else {
      verifiedMatches = engHistory.filter(h => h.result === 'PASS' || h.result === 'FAIL' || (h.result && h.result.includes('NEAR_MISS')));
    }
    
    const wins = verifiedMatches.filter(h => {
      if (mode === 'high') {
        return h.actual >= threshold;
      } else {
        return h.result === 'PASS';
      }
    }).length;
    
    const totalPlay = verifiedMatches.length;
    const pct = totalPlay > 0 ? Math.round((wins / totalPlay) * 100) : 0;
    
    const labelEl = document.getElementById(`lbl-acc-${eng}`);
    if (labelEl) {
      labelEl.textContent = totalPlay > 0 ? `${pct}%` : '—';
      if (totalPlay > 0) {
        if (pct >= 75) labelEl.style.color = 'var(--accent-green)';
        else if (pct >= 50) labelEl.style.color = 'var(--accent-orange)';
        else labelEl.style.color = 'var(--accent-red)';
      } else {
        labelEl.style.color = 'var(--text-muted)';
      }
    }
  });

  // Filter history if simulation/filter mode is active for active model
  const activeHistory = accuracyHistory[activeEngineUsed] || [];
  let activeHistoryFiltered = [];
  if (filterHighOdds) {
    activeHistory.forEach(h => {
      const predTarget = h.uncappedTarget !== undefined ? h.uncappedTarget : h.target;
      if (h.result !== 'SKIP' && typeof predTarget === 'number' && predTarget >= threshold) {
        // Use the current slider threshold for evaluating outcomes
        const isPass = h.actual >= threshold;
        
        let res = isPass ? 'PASS' : 'FAIL';
        if (!isPass && h.result && h.result.includes('NEAR_MISS')) {
          res = h.result;
        }
        
        activeHistoryFiltered.push({
          index: h.index,
          target: threshold,
          actual: h.actual,
          result: res
        });
      }
    });
  } else {
    activeHistoryFiltered = activeHistory.map(h => ({
      index: h.index,
      target: h.target,
      actual: h.actual,
      result: h.result
    }));
  }

  const wins = activeHistoryFiltered.filter(h => h.result === 'PASS').length;
  const verifiedMatches = activeHistoryFiltered.filter(h => h.result === 'PASS' || h.result === 'FAIL' || (h.result && h.result.includes('NEAR_MISS')));
  const totalPlay = verifiedMatches.length;
  const pct = totalPlay > 0 ? Math.round((wins / totalPlay) * 100) : 0;
  const totalSkips = activeHistoryFiltered.filter(h => h.result === 'SKIP').length;

  document.getElementById('lbl-accuracy-pct').textContent = pct + '%';
  document.getElementById('accuracy-bar').style.width = pct + '%';
  document.getElementById('lbl-accuracy-wins').textContent = `Passed: ${wins} / Failed: ${totalPlay - wins}`;
  document.getElementById('lbl-accuracy-total').textContent = `Total Matches: ${totalPlay}` + (filterHighOdds ? '' : ` (Skipped: ${totalSkips})`);

  // Calculate and update High Odds Accuracy (target >= selected threshold) for active model
  const highOddsBets = activeHistory.filter(h => {
    const predTarget = h.uncappedTarget !== undefined ? h.uncappedTarget : h.target;
    return h.result !== 'SKIP' && typeof predTarget === 'number' && predTarget >= threshold;
  });
  const highOddsWins = highOddsBets.filter(h => h.actual >= threshold).length;
  const totalHighOddsBets = highOddsBets.length;
  const highOddsPct = totalHighOddsBets > 0 ? Math.round((highOddsWins / totalHighOddsBets) * 100) : 0;

  const lblHighOddsPct = document.getElementById('lbl-high-odds-accuracy-pct');
  const lblHighOddsWins = document.getElementById('lbl-high-odds-accuracy-wins');
  const lblHighOddsTotal = document.getElementById('lbl-high-odds-accuracy-total');

  if (lblHighOddsPct) {
    const sectionEl = document.getElementById('high-odds-accuracy-section');
    if (sectionEl) {
      const titleEl = sectionEl.querySelector('span');
      if (titleEl) titleEl.textContent = `High Odds Accuracy (≥ ${threshold}x):`;
    }

    lblHighOddsPct.textContent = highOddsPct + '%';
    if (highOddsPct >= 75) lblHighOddsPct.style.color = 'var(--accent-green)';
    else if (highOddsPct >= 50) lblHighOddsPct.style.color = 'var(--accent-orange)';
    else lblHighOddsPct.style.color = 'var(--accent-red)';
  }
  if (lblHighOddsWins) {
    lblHighOddsWins.textContent = `Passed: ${highOddsWins} / Failed: ${totalHighOddsBets - highOddsWins}`;
  }
  if (lblHighOddsTotal) {
    lblHighOddsTotal.textContent = `Total High Odds: ${totalHighOddsBets}`;
  }

  // Update accuracy directly in the High Odds Gap Analysis Card
  const lblGapAccThreshold = document.getElementById('lbl-gap-acc-threshold');
  const lblGapAccuracyVal = document.getElementById('lbl-gap-accuracy-val');
  if (lblGapAccThreshold) {
    lblGapAccThreshold.textContent = threshold + 'x';
  }
  if (lblGapAccuracyVal) {
    lblGapAccuracyVal.textContent = `${highOddsPct}% (${highOddsWins}/${totalHighOddsBets})`;
    if (highOddsPct >= 75) lblGapAccuracyVal.style.color = 'var(--accent-green)';
    else if (highOddsPct >= 50) lblGapAccuracyVal.style.color = 'var(--accent-orange)';
    else if (totalHighOddsBets > 0) lblGapAccuracyVal.style.color = 'var(--accent-red)';
    else lblGapAccuracyVal.style.color = 'var(--text-muted)';
  }

  // Change accuracy percentage color dynamically
  const pctLbl = document.getElementById('lbl-accuracy-pct');
  if (pct >= 75) pctLbl.style.color = 'var(--accent-green)';
  else if (pct >= 50) pctLbl.style.color = 'var(--accent-orange)';
  else pctLbl.style.color = 'var(--accent-red)';

  // Calculate and display P&L
  let totalPnl = 0;
  activeHistoryFiltered.forEach(h => {
    if (h.result === 'PASS') {
      totalPnl += globalBetSize * (h.target - 1);
    } else if (h.result === 'FAIL') {
      totalPnl -= globalBetSize;
    }
  });

  const pnlLbl = document.getElementById('lbl-pnl-val');
  if (pnlLbl) {
    pnlLbl.textContent = (totalPnl >= 0 ? '+' : '') + totalPnl.toFixed(2);
    if (totalPnl > 0) {
      pnlLbl.style.color = 'var(--accent-green)';
    } else if (totalPnl < 0) {
      pnlLbl.style.color = 'var(--accent-red)';
    } else {
      pnlLbl.style.color = 'var(--text-primary)';
    }
  }

  // Calculate total session P&L for daily target verification
  let sessionPnl = 0;
  activeHistory.forEach(h => {
    if (h.result === 'PASS') {
      sessionPnl += globalBetSize * (h.target - 1);
    } else if (h.result === 'FAIL') {
      sessionPnl -= globalBetSize;
    }
  });

  const dailyTargetEl = document.getElementById('input-daily-target');
  const dailyTarget = dailyTargetEl ? (parseFloat(dailyTargetEl.value) || 100) : 100;

  isDailyTargetReached = sessionPnl >= dailyTarget;

  const lblTargetStatus = document.getElementById('lbl-target-status');
  if (lblTargetStatus) {
    if (isDailyTargetReached) {
      lblTargetStatus.textContent = "REACHED 🛑";
      lblTargetStatus.style.color = "var(--accent-green)";
    } else {
      lblTargetStatus.textContent = "ACTIVE";
      lblTargetStatus.style.color = "var(--accent-blue)";
    }
  }

  // Render log elements in the verification table
  const tbody = document.getElementById('verif-log-tbody');
  if (tbody) {
    if (activeHistoryFiltered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 8px 0;">No matching rounds.</td></tr>';
    } else {
      tbody.innerHTML = '';
      const displayHistory = [...activeHistoryFiltered].reverse().slice(0, 10);
      displayHistory.forEach(h => {
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid rgba(255,255,255,0.03)';
        
        const isSkip = h.result === 'SKIP';
        const isPass = h.result === 'PASS';
        
        let color = 'var(--accent-red)';
        let resultText = 'FAILED';
        
        if (isSkip) {
          color = 'var(--text-muted)';
          resultText = 'SKIPPED';
        } else if (isPass) {
          color = 'var(--accent-green)';
          resultText = 'CORRECT';
        } else if (h.result === 'NEAR_MISS_EARLY') {
          color = 'var(--accent-orange)';
          resultText = 'NEAR MISS (-1 Rd)';
        } else if (h.result === 'NEAR_MISS_LATE') {
          color = 'var(--accent-orange)';
          resultText = 'NEAR MISS (+1 Rd)';
        }
        
        const targetText = isSkip ? 'SKIP' : (typeof h.target === 'number' ? h.target.toFixed(2) + 'x' : h.target);
        const predColor = isSkip ? 'var(--text-muted)' : '#60a5fa';
        
        row.innerHTML = `
          <td style="padding: 4px 6px; color: var(--text-muted);">#${h.index}</td>
          <td style="padding: 4px 6px; color: ${predColor}; font-weight: 700;">${targetText}</td>
          <td style="padding: 4px 6px; color: #fbbf24; font-weight: 700;">${h.actual.toFixed(2)}x</td>
          <td style="padding: 4px 6px; color: ${color}; font-weight: 700; text-align: right;">${resultText}</td>
        `;
        tbody.appendChild(row);
      });
    }
  }

  if (typeof updatePlannerUI === 'function') {
    updatePlannerUI();
  }
}

function renderHistoryPills() {
  const container = document.getElementById('history-pills');
  container.innerHTML = '';
  document.getElementById('history-count').textContent = globalAccumulatedOdds.length;

  if (globalAccumulatedOdds.length === 0) {
    container.innerHTML = `
      <div style="width: 100%; text-align: center; font-size: 0.8rem; color: var(--text-muted); padding: 12px 0;">
        Awaiting live round data...
      </div>
    `;
    return;
  }

  // Display newest first (reverse order for screen rendering)
  const displayList = [...globalAccumulatedOdds].slice(-40).reverse();
  displayList.forEach(val => {
    const numVal = typeof val === 'number' ? val : parseFloat(val);
    if (isNaN(numVal)) return;
    const pill = document.createElement('span');
    pill.className = 'pill';
    if (numVal >= 2.0) pill.className += ' high';
    else if (numVal < 1.2) pill.className += ' low';
    pill.textContent = numVal.toFixed(2) + 'x';
    container.appendChild(pill);
  });
}

function runCalculations(mode, threshold, safety = 'standard', lossProtection = true, autoSkip = true) {
  const data = globalAccumulatedOdds; // uses all continuous data
  if (data.length === 0) {
    resetOutputFields();
    return;
  }

  const activeVerifications = accuracyHistory[activeEngineUsed] || [];

  // Check if daily target is reached (Responsible Gaming Lockout)
  if (isDailyTargetReached) {
    // 1. Show target reached alert banner
    const targetAlertEl = document.getElementById('target-reached-alert');
    if (targetAlertEl) {
      targetAlertEl.style.display = 'block';
    }

    // 2. Hide other warning banners to avoid UI clutter
    const alertEl = document.getElementById('high-odds-alert');
    if (alertEl) alertEl.style.display = 'none';
    const riskAlertEl = document.getElementById('market-risk-alert');
    if (riskAlertEl) riskAlertEl.style.display = 'none';

    // 3. Override Hero Card to STOP state
    const heroCard = document.getElementById('hero-card');
    const heroVal = document.getElementById('hero-val');
    const heroSub = document.getElementById('hero-sub');
    const heroLbl = document.querySelector('.hero-lbl');

    if (heroVal) {
      heroVal.textContent = "STOP";
      heroVal.style.color = "var(--accent-green)";
      heroVal.style.textShadow = '0 0 20px rgba(16, 185, 129, 0.7)';
    }
    if (heroSub) {
      heroSub.textContent = "Daily profit target reached! Secure your profits and take a break today.";
    }
    if (heroLbl) {
      heroLbl.textContent = "DAILY TARGET COMPLETED! 🎉";
      heroLbl.style.color = "var(--accent-green)";
    }
    if (heroCard) {
      heroCard.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.22), rgba(5, 150, 105, 0.12))';
      heroCard.style.borderColor = 'var(--accent-green)';
    }

    // 4. Override comparison card values to STOP
    ['max', 'high', 'standard', 'aggressive'].forEach(s => {
      const valEl = document.getElementById(`compare-val-${s}`);
      if (valEl) {
        valEl.textContent = "STOP";
        valEl.style.color = "var(--accent-green)";
      }
    });

    ['markov', 'knn', 'trend', 'pareto', 'nn'].forEach(m => {
      const el = document.getElementById(`lbl-pred-${m}`);
      if (el) {
        el.textContent = "STOP";
        el.style.color = "var(--accent-green)";
      }
    });

    // 5. Run fallback stats/analyses to keep sidepanel graphs/analyses populated
    runGapAnalysis(data, threshold);
    runMegaOutliersAnalysis(data);

    // 6. Return early (do not queue new predictions)
    return;
  }

  // If daily target is NOT reached, ensure alert banner is hidden
  const targetAlertEl = document.getElementById('target-reached-alert');
  if (targetAlertEl) {
    targetAlertEl.style.display = 'none';
  }

  // 1. Calculate cold streak
  let coldStreak = 0;
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i] < 2.0) {
      coldStreak++;
    } else {
      break;
    }
  }
  document.getElementById('val-cold').textContent = coldStreak;

  // 2. High odd cooldown check (30x+ in recent rounds depending on safety level)
  let cooldownRoundsCount = 3;
  if (safety === 'max') cooldownRoundsCount = 6;
  else if (safety === 'high') cooldownRoundsCount = 4;
  else if (safety === 'standard') cooldownRoundsCount = 3;
  else if (safety === 'aggressive') cooldownRoundsCount = 1;

  let recentHighOdd = null;
  const recentRounds = data.slice(-cooldownRoundsCount);
  for (let i = recentRounds.length - 1; i >= 0; i--) {
    if (recentRounds[i] >= 30.0) {
      recentHighOdd = recentRounds[i];
      break;
    }
  }

  // 3. Rounds since last high odd (uses user-set threshold, not hardcoded 10x)
  let roundsSinceHighOdd = 0;
  let foundHighOdd = false;
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i] >= threshold) {
      foundHighOdd = true;
      break;
    }
    roundsSinceHighOdd++;
  }
  if (!foundHighOdd) roundsSinceHighOdd = Math.min(data.length, 99);

  // 4. Calculate gap indicators & high odd statistical boundaries
  let estNextStrikeIn = null;
  let avgGap = null;
  const indices = data.reduce((acc, v, i) => { if (v >= threshold) acc.push(i); return acc; }, []);
  let avgHighOdd = Math.max(8.50, threshold * 1.1);
  if (indices.length > 0) {
    const gaps = [];
    for (let k = 1; k < indices.length; k++) { gaps.push(indices[k] - indices[k - 1]); }
    avgGap = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : null;
    if (avgGap !== null) {
      const roundsSince = data.length - 1 - indices[indices.length - 1];
      estNextStrikeIn = avgGap - roundsSince;
    }
    const highOddsVals = data.filter(v => v >= threshold);
    const highOddsValsCapped = highOddsVals.map(v => v >= 1000.0 ? 50.0 : v);
    if (highOddsValsCapped.length > 0) {
      avgHighOdd = highOddsValsCapped.reduce((a, b) => a + b, 0) / highOddsValsCapped.length;
    }
  }

  const last20Data = data.slice(-20);
  const indices20 = last20Data.reduce((acc, v, i) => { if (v >= threshold) acc.push(i); return acc; }, []);
  // Only flag cold market if we have enough history (≥20 rounds) to make a reliable judgment
  const isMarketCold = data.length >= 20 && (
    (indices20.length === 0 && (avgGap === null || avgGap <= 15)) ||
    (avgGap !== null && roundsSinceHighOdd >= Math.max(20, avgGap * 2.5))
  );

  // 5. Generate forecasts across all models
  const markovForecasts = generateMarkovForecast(data, mode, safety, threshold);
  const knnForecasts = generateKNNForecast(data, mode, safety, threshold);
  const trendForecasts = generateVolatilityForecast(data, mode, safety, threshold);
  const paretoForecasts = generateParetoForecast(data, mode, safety, threshold);
  const nnForecasts = generateNNForecast(data, mode, safety, threshold);

  // Take the first projection step (offset = 1) for each model
  const markovRaw = markovForecasts && markovForecasts.length > 0 ? markovForecasts[0] : { target: 1.40, label: 'Standard Risk', prob: 50, range: '1.2-2.0x', color: 'var(--accent-blue)' };
  const knnRaw = knnForecasts && knnForecasts.length > 0 ? knnForecasts[0] : { target: 1.40, label: 'Standard Risk', prob: 50, range: '1.2-2.0x', color: 'var(--accent-blue)' };
  const trendRaw = trendForecasts && trendForecasts.length > 0 ? trendForecasts[0] : { target: 1.40, label: 'Standard Risk', prob: 50, range: '1.2-2.0x', color: 'var(--accent-blue)' };
  const paretoRaw = paretoForecasts && paretoForecasts.length > 0 ? paretoForecasts[0] : { target: 1.40, label: 'Standard Risk', prob: 50, range: '1.2-2.0x', color: 'var(--accent-blue)' };
  const nnRaw = nnForecasts && nnForecasts.length > 0 ? nnForecasts[0] : { target: 1.40, label: 'Standard Risk', prob: 50, range: '1.2-2.0x', color: 'var(--accent-blue)' };

  // Resolve safety overrides for all engines separately to isolate their prediction safety history
  const markovFinal = processSafetyOverrides(markovRaw, 'markov', data, mode, safety, threshold, isMarketCold, roundsSinceHighOdd, coldStreak, recentHighOdd, lossProtection, autoSkip, estNextStrikeIn, avgHighOdd);
  const knnFinal = processSafetyOverrides(knnRaw, 'knn', data, mode, safety, threshold, isMarketCold, roundsSinceHighOdd, coldStreak, recentHighOdd, lossProtection, autoSkip, estNextStrikeIn, avgHighOdd);
  const trendFinal = processSafetyOverrides(trendRaw, 'trend', data, mode, safety, threshold, isMarketCold, roundsSinceHighOdd, coldStreak, recentHighOdd, lossProtection, autoSkip, estNextStrikeIn, avgHighOdd);
  const paretoFinal = processSafetyOverrides(paretoRaw, 'pareto', data, mode, safety, threshold, isMarketCold, roundsSinceHighOdd, coldStreak, recentHighOdd, lossProtection, autoSkip, estNextStrikeIn, avgHighOdd);
  const nnFinal = processSafetyOverrides(nnRaw, 'nn', data, mode, safety, threshold, isMarketCold, roundsSinceHighOdd, coldStreak, recentHighOdd, lossProtection, autoSkip, estNextStrikeIn, avgHighOdd);

  // Select the prediction details of the active engine
  let activeFinal = markovFinal;
  let activeForecastsList = markovForecasts;
  if (activeEngineUsed === 'knn') {
    activeFinal = knnFinal;
    activeForecastsList = knnForecasts;
  } else if (activeEngineUsed === 'trend') {
    activeFinal = trendFinal;
    activeForecastsList = trendForecasts;
  } else if (activeEngineUsed === 'pareto') {
    activeFinal = paretoFinal;
    activeForecastsList = paretoForecasts;
  } else if (activeEngineUsed === 'nn') {
    activeFinal = nnFinal;
    activeForecastsList = nnForecasts;
  }

  // ── MULTI-ENGINE CONSENSUS CHECK ─────────────────────────────────────────
  // In High Odds mode: only allow a threshold+ prediction if ≥ 3/5 engines agree.
  // In Critical Hunt zone, allow escalation to threshold only when ≥ 4/5 agree + NN is confident.
  if (mode === 'high' && !activeFinal.isSkip) {
    const allFinals = [markovFinal, knnFinal, trendFinal, paretoFinal, nnFinal];
    const highOddsVotes = allFinals.filter(f =>
      !f.isSkip && (f.label === 'High Odds' || (typeof f.target === 'number' && f.target >= threshold))
    ).length;

    const nnRawForCheck = nnRaw || {};
    const nnHighConf = (nnRawForCheck.rawProbThresh || 0) >= 0.65;
    const isCriticalHunt = activeFinal.label === 'Critical Hunt (Overdue)';

    if (activeFinal.label === 'High Odds') {
      // Was predicted as High Odds — downgrade if consensus not met
      if (highOddsVotes < 3) {
        activeFinal = { ...activeFinal };
        activeFinal.target = 2.00;
        activeFinal.label = 'Recovery Target (No Consensus)';
        activeFinal.explanation = `⚠️ Engines split on High Odds (${highOddsVotes}/5 agree). Playing 2x recovery instead.`;
      }
    } else if (isCriticalHunt && highOddsVotes >= 4 && nnHighConf) {
      // Critical overdue zone + strong consensus (4/5) + NN >65% → escalate safely to threshold
      activeFinal = { ...activeFinal };
      activeFinal.target = threshold;
      activeFinal.label = 'High Odds (Consensus Override)';
      activeFinal.explanation = `🎯 Consensus HIGH ODDS! ${highOddsVotes}/5 engines agree + NN conf ${Math.round((nnRawForCheck.rawProbThresh || 0) * 100)}% — Bet ${threshold}x`;
    }
  }

  // 6. HERO TARGET RENDER
  const heroVal = document.getElementById('hero-val');
  const heroSub = document.getElementById('hero-sub');
  heroVal.textContent = typeof activeFinal.target === 'number' ? activeFinal.target.toFixed(2) + 'x' : activeFinal.target;

  let engineName = "Markov";
  if (activeEngineUsed === 'knn') engineName = "KNN";
  else if (activeEngineUsed === 'trend') engineName = "Volatility";
  else if (activeEngineUsed === 'pareto') engineName = "Pareto";
  else if (activeEngineUsed === 'nn') engineName = "NN AI";

  let feedbackText = "";
  const engHistory = accuracyHistory[activeEngineUsed] || [];
  const recentBetsForUI = engHistory.filter(h => h.result === 'PASS' || h.result === 'FAIL').slice(-5);
  if (recentBetsForUI.length >= 3) {
    const recentWinsForUI = recentBetsForUI.filter(h => h.result === 'PASS').length;
    const recentWinRateForUI = recentWinsForUI / recentBetsForUI.length;
    if (recentWinRateForUI <= 0.40) {
      feedbackText = " [Adaptive Safety: Ultra-Safe]";
    } else if (recentWinRateForUI < 0.70) {
      feedbackText = " [Adaptive Safety: Conservative]";
    } else if (recentWinRateForUI >= 0.80) {
      feedbackText = " [Adaptive Safety: Optimized]";
    }
  }

  let highOddsSubText = "";
  const upcomingHighForHero = activeForecastsList ? activeForecastsList.find(fc => fc.label === "High Odds" || fc.target >= threshold) : null;
  if (upcomingHighForHero && upcomingHighForHero.roundOffset === 1) {
    highOddsSubText = ` [🔥 High Odds: ${upcomingHighForHero.target.toFixed(2)}x]`;
  }

  const autoLabel = predictionEngine === 'auto' ? `Auto: ${engineName}` : engineName;
  heroSub.textContent = `${activeFinal.explanation}${feedbackText} (Risk: ${activeFinal.label}) [Engine: ${autoLabel}]${highOddsSubText}`;

  // Hero Card Styling and glowing effects
  const heroCard = document.getElementById('hero-card');
  const heroLbl = document.querySelector('.hero-lbl');
  heroCard.style.background = '';
  if (heroLbl) {
    heroLbl.textContent = "Next Round Prediction";
    heroLbl.style.color = "";
  }

  if (activeFinal.label === "High Odds" && !activeFinal.isSkip) {
    if (heroLbl) {
      heroLbl.textContent = "🔥 HIGH ODDS TARGET ROUND!";
      heroLbl.style.color = "#c084fc";
    }
    heroCard.style.background = 'linear-gradient(135deg, rgba(168, 85, 247, 0.22), rgba(244, 63, 94, 0.12))';
    heroCard.style.borderColor = 'var(--accent-purple)';
    heroVal.style.color = '#c084fc';
    heroVal.style.textShadow = '0 0 20px rgba(168, 85, 247, 0.7)';
  } else if (activeFinal.label.includes("Extreme") || activeFinal.label.includes("Critical") || activeFinal.label.includes("Crash")) {
    heroCard.style.borderColor = 'rgba(239, 68, 68, 0.4)';
    heroVal.style.color = 'var(--accent-red)';
    heroVal.style.textShadow = '0 0 15px rgba(239, 68, 68, 0.5)';
  } else if (activeFinal.label.includes("Buildup") || activeFinal.label.includes("Standard") || activeFinal.label.includes("Recovery")) {
    heroCard.style.borderColor = 'rgba(245, 158, 11, 0.4)';
    heroVal.style.color = 'var(--accent-orange)';
    heroVal.style.textShadow = '0 0 15px rgba(245, 158, 11, 0.5)';
  } else if (activeFinal.label.includes("Loss Protection")) {
    heroCard.style.borderColor = 'rgba(59, 130, 246, 0.4)';
    heroVal.style.color = 'var(--accent-blue)';
    heroVal.style.textShadow = '0 0 15px rgba(59, 130, 246, 0.5)';
  } else if (activeFinal.label.includes("No Bet")) {
    heroCard.style.borderColor = 'rgba(156, 163, 175, 0.4)';
    heroVal.style.color = 'var(--text-secondary)';
    heroVal.style.textShadow = 'none';
  } else {
    heroCard.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    heroVal.style.color = 'var(--accent-green)';
    heroVal.style.textShadow = '0 0 15px rgba(16, 185, 129, 0.5)';
  }

  // 7. Calculate safety comparison panel values for the active model
  const compareTargets = {};
  ['max', 'high', 'standard', 'aggressive'].forEach(s => {
    let fcList;
    if (activeEngineUsed === 'markov') fcList = generateMarkovForecast(data, mode, s, threshold);
    else if (activeEngineUsed === 'knn') fcList = generateKNNForecast(data, mode, s, threshold);
    else if (activeEngineUsed === 'trend') fcList = generateVolatilityForecast(data, mode, s, threshold);
    else if (activeEngineUsed === 'pareto') fcList = generateParetoForecast(data, mode, s, threshold);
    else if (activeEngineUsed === 'nn') fcList = generateNNForecast(data, mode, s, threshold);

    const fc = fcList && fcList.length > 0 ? fcList[0] : { target: 1.40, label: 'Standard Risk', prob: 50 };
    const finalComp = processSafetyOverrides(fc, activeEngineUsed, data, mode, s, threshold, isMarketCold, roundsSinceHighOdd, coldStreak, recentHighOdd, lossProtection, autoSkip, estNextStrikeIn, avgHighOdd);
    compareTargets[s] = finalComp.isSkip ? "SKIP" : finalComp.target;
  });

  ['max', 'high', 'standard', 'aggressive'].forEach(s => {
    const el = document.getElementById(`compare-${s}`);
    const valEl = document.getElementById(`compare-val-${s}`);
    if (valEl) {
      valEl.textContent = typeof compareTargets[s] === 'number' ? compareTargets[s].toFixed(2) + 'x' : compareTargets[s];
      valEl.style.color = compareTargets[s] === "SKIP" ? 'var(--text-secondary)' : '';
    }
    if (el) {
      if (s === safety) {
        el.style.background = 'rgba(59, 130, 246, 0.12)';
        el.style.borderColor = 'var(--accent-blue)';
        el.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.25)';
      } else {
        el.style.background = 'rgba(255, 255, 255, 0.02)';
        el.style.borderColor = 'var(--border-color)';
        el.style.boxShadow = 'none';
      }
    }
  });

  // 8. Queue ALL predicted targets in pendingForecasts for separate verification
  const nextRoundIdx = globalAccumulatedOdds.length;
  pendingForecasts[nextRoundIdx] = {
    markov: { target: markovFinal.target, uncappedTarget: markovFinal.uncappedTarget, label: markovFinal.label, isSkip: markovFinal.isSkip },
    knn: { target: knnFinal.target, uncappedTarget: knnFinal.uncappedTarget, label: knnFinal.label, isSkip: knnFinal.isSkip },
    trend: { target: trendFinal.target, uncappedTarget: trendFinal.uncappedTarget, label: trendFinal.label, isSkip: trendFinal.isSkip },
    pareto: { target: paretoFinal.target, uncappedTarget: paretoFinal.uncappedTarget, label: paretoFinal.label, isSkip: paretoFinal.isSkip },
    nn: { target: nnFinal.target, uncappedTarget: nnFinal.uncappedTarget, label: nnFinal.label, isSkip: nnFinal.isSkip },
    threshold: threshold
  };
  chrome.storage.local.set({ pendingForecasts: pendingForecasts });

  // Update prediction values for the individual models in the accuracy grid
  const updateModelPredUI = (id, finalPred) => {
    const el = document.getElementById(id);
    if (el) {
      if (finalPred.isSkip) {
        el.textContent = "SKIP";
        el.style.color = "var(--text-secondary)";
      } else {
        const val = typeof finalPred.target === 'number' ? finalPred.target.toFixed(2) + 'x' : finalPred.target;
        el.textContent = val;
        if (typeof finalPred.target === 'number' && finalPred.target >= threshold) {
          el.style.color = "var(--accent-purple)";
        } else {
          el.style.color = "var(--accent-blue)";
        }
      }
    }
  };

  updateModelPredUI('lbl-pred-markov', markovFinal);
  updateModelPredUI('lbl-pred-knn', knnFinal);
  updateModelPredUI('lbl-pred-trend', trendFinal);
  updateModelPredUI('lbl-pred-pareto', paretoFinal);
  updateModelPredUI('lbl-pred-nn', nnFinal);

  // 9. Gap Analysis
  runGapAnalysis(data, threshold);
  runMegaOutliersAnalysis(data);

  // 10. Glowing alert panel for imminent High Odds
  const alertEl = document.getElementById('high-odds-alert');
  if (alertEl) {
    const activeForecasts = activeForecastsList || [];
    const upcomingHigh = activeForecasts.find(fc => {
      if (!(fc.label === "High Odds" || fc.target >= threshold)) return false;
      if (fc.roundOffset > 2) return false;
      if (isMarketCold) return false;
      
      // Look up failure cooldown idx for active model
      let lastFailedHighOddsIdx = -1;
      const activeVerifications = accuracyHistory[activeEngineUsed] || [];
      const lastFailedVerif = [...activeVerifications].reverse().find(h => h.result === 'FAIL');
      if (lastFailedVerif) lastFailedHighOddsIdx = lastFailedVerif.index;
      
      if (lastFailedHighOddsIdx !== -1) {
        const roundsSinceFailed = (globalAccumulatedOdds.length + fc.roundOffset - 1) - lastFailedHighOddsIdx;
        if (roundsSinceFailed < 3) return false;
      }
      return true;
    });

    let lastFailedHighOddsIdx = -1;
    const lastFailedVerif = [...activeVerifications].reverse().find(h => h.result === 'FAIL');
    if (lastFailedVerif) lastFailedHighOddsIdx = lastFailedVerif.index;

    let isNearStrike = estNextStrikeIn !== null && estNextStrikeIn <= 2;
    if (isNearStrike) {
      if (isMarketCold) {
        isNearStrike = false;
      } else if (lastFailedHighOddsIdx !== -1) {
        const estOffset = Math.max(1, Math.round(estNextStrikeIn));
        const roundsSinceFailed = (globalAccumulatedOdds.length + estOffset - 1) - lastFailedHighOddsIdx;
        if (roundsSinceFailed < 3) {
          isNearStrike = false;
        }
      }
    }

    if (upcomingHigh || isNearStrike) {
      alertEl.style.display = 'block';
      const titleEl = document.getElementById('high-odds-alert-title');
      const valEl = document.getElementById('high-odds-alert-val');
      const highMinEl = document.getElementById('val-high-bound-min');
      const highSafeEl = document.getElementById('val-high-bound-safe');
      const highMaxEl = document.getElementById('val-high-bound-max');

      if (upcomingHigh) {
        if (upcomingHigh.roundOffset === 1) {
          if (titleEl) titleEl.textContent = `🚨 HIGH ODDS TARGET: NEXT ROUND! 🚀`;
        } else {
          if (titleEl) titleEl.textContent = `🚨 HIGH ODDS ALERT: Expected in Round +${upcomingHigh.roundOffset}`;
        }
        if (valEl) valEl.textContent = upcomingHigh.target.toFixed(2) + 'x';
        if (highMinEl) highMinEl.textContent = upcomingHigh.lowerBound !== undefined ? upcomingHigh.lowerBound.toFixed(2) + 'x' : '—';
        if (highSafeEl) highSafeEl.textContent = upcomingHigh.target !== undefined ? upcomingHigh.target.toFixed(2) + 'x' : '—';
        if (highMaxEl) highMaxEl.textContent = upcomingHigh.avgVal !== undefined ? upcomingHigh.avgVal.toFixed(2) + 'x' : '—';
      } else {
        const highOddsVals = data.filter(v => v >= threshold);
        const highOddsValsCapped = highOddsVals.map(v => v >= 1000.0 ? 50.0 : v);
        const avgHighOdd = highOddsValsCapped.length > 0 
          ? highOddsValsCapped.reduce((a, b) => a + b, 0) / highOddsValsCapped.length 
          : Math.max(8.50, threshold * 1.1);

        let sMargin = mode === "high" ? 0.50 : 0.25;
        if (safety === 'max') sMargin = mode === "high" ? 0.25 : 0.10;
        else if (safety === 'high') sMargin = mode === "high" ? 0.35 : 0.18;
        else if (safety === 'aggressive') sMargin = mode === "high" ? 0.70 : 0.40;

        let failRate = 0;
        const recentHighOddsBets = activeVerifications.filter(h => {
          const predTarget = h.uncappedTarget !== undefined ? h.uncappedTarget : h.target;
          return h.result !== 'SKIP' && typeof predTarget === 'number' && predTarget >= threshold;
        }).slice(-5);
        if (recentHighOddsBets.length > 0) {
          const fails = recentHighOddsBets.filter(h => h.result === 'FAIL' || (h.result && h.result.includes('NEAR_MISS'))).length;
          failRate = fails / recentHighOddsBets.length;
        }
        const activeBiasMult = 1.0 - 0.40 * failRate;

        let estTarget = threshold + (avgHighOdd - threshold) * sMargin;
        estTarget = estTarget * activeBiasMult;
        if (estTarget < threshold) {
          estTarget = threshold;
        }

        const roundText = estNextStrikeIn <= 0 ? "OVERDUE NOW!" : `Expected in ~${Math.round(estNextStrikeIn)} Rounds`;
        if (titleEl) titleEl.textContent = `🚨 HIGH ODDS STRIKE IMMINENT: ${roundText}`;
        if (valEl) valEl.textContent = estTarget.toFixed(2) + 'x';
        if (highMinEl) highMinEl.textContent = threshold.toFixed(2) + 'x';
        if (highSafeEl) highSafeEl.textContent = estTarget.toFixed(2) + 'x';
        if (highMaxEl) highMaxEl.textContent = avgHighOdd.toFixed(2) + 'x';
      }

      if (upcomingHigh && upcomingHigh.roundOffset === 1) {
        alertEl.style.background = 'linear-gradient(135deg, rgba(168, 85, 247, 0.45), rgba(239, 68, 68, 0.45))';
        alertEl.style.border = '1.5px solid #c084fc';
        alertEl.style.boxShadow = '0 0 20px rgba(168, 85, 247, 0.8)';
      } else if (upcomingHigh || (estNextStrikeIn !== null && estNextStrikeIn <= 0)) {
        alertEl.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.35), rgba(168, 85, 247, 0.35))';
        alertEl.style.border = '1.5px solid #ef4444';
        alertEl.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.35)';
      } else {
        alertEl.style.background = 'linear-gradient(135deg, rgba(245, 158, 11, 0.35), rgba(168, 85, 247, 0.35))';
        alertEl.style.border = '1.5px solid #f59e0b';
        alertEl.style.boxShadow = '0 0 15px rgba(245, 158, 11, 0.35)';
      }
    } else {
      alertEl.style.display = 'none';
    }
  }

  // 11. Market Risk alert banner (calculated on active engine history)
  const riskAlertEl = document.getElementById('market-risk-alert');
  if (riskAlertEl) {
    let showRiskAlert = false;
    let riskMessage = "";

    const recentBets = activeVerifications.filter(h => h.result === 'PASS' || h.result === 'FAIL').slice(-5);
    let recentWinRate = 1.0;
    if (recentBets.length >= 3) {
      const recentWins = recentBets.filter(h => h.result === 'PASS').length;
      recentWinRate = recentWins / recentBets.length;
      if (recentWinRate <= 0.40) {
        showRiskAlert = true;
        riskMessage = `⚠️ HIGH RISK: Low AI win rate (${Math.round(recentWinRate * 100)}%) recently. Stop betting and wait a bit!`;
      }
      const last3 = recentBets.slice(-3);
      if (last3.length === 3 && last3.every(h => h.result === 'FAIL')) {
        showRiskAlert = true;
        riskMessage = "⚠️ CRITICAL RISK: 3 consecutive prediction losses! Market is highly unstable. Pause betting now!";
      }
    }

    if (!showRiskAlert && data.length >= 5) {
      const last15 = data.slice(-15);
      const crashCount = last15.filter(v => v < 1.20).length;
      const crashRate = crashCount / last15.length;
      if (crashRate >= 0.40) {
        showRiskAlert = true;
        riskMessage = `⚠️ HIGH MARKET RISK: High crash density (${Math.round(crashRate * 100)}% < 1.20x) in recent rounds. Advised to wait a bit!`;
      } else if (coldStreak >= 5) {
        showRiskAlert = true;
        riskMessage = `⚠️ COLD RUN: ${coldStreak} consecutive rounds < 2.00x. Market is extremely cold. Take a break!`;
      }
    }

    if (showRiskAlert) {
      riskAlertEl.style.display = 'block';
      riskAlertEl.textContent = riskMessage;
    } else {
      riskAlertEl.style.display = 'none';
    }
  }
}

function generateMarkovForecast(data, mode, safety = 'standard', threshold = 8) {
  const getState = (v) => v < 1.2 ? 0 : v < 2.0 ? 1 : v < threshold ? 2 : 3;
  const stateLabels = ['Crash Risk', 'Low Target', 'Recovery Target', 'High Odds'];
  const stateRanges = ['< 1.2x', '1.2–2.0x', `2.0–${threshold}x`, `${threshold}x+` ];
  const stateColors = ['var(--accent-red)', 'var(--accent-blue)', 'var(--accent-orange)', '#a855f7'];

  const stateSeq = data.map(getState);
  let nextForecasts = [];

  // Determine safetyMargin based on selected safety level
  let safetyMargin = mode === "high" ? 0.50 : 0.25;
  if (safety === 'max') {
    safetyMargin = mode === "high" ? 0.25 : 0.10;
  } else if (safety === 'high') {
    safetyMargin = mode === "high" ? 0.35 : 0.18;
  } else if (safety === 'aggressive') {
    safetyMargin = mode === "high" ? 0.70 : 0.40;
  }

  // Dynamic Self-Correcting Feedback: Scale safetyMargin based on recent accuracy win rate (last 5 bets)
  const recentBets = (accuracyHistory.markov || []).filter(h => h.result === 'PASS' || h.result === 'FAIL').slice(-5);
  if (recentBets.length >= 3) {
    const recentWins = recentBets.filter(h => h.result === 'PASS').length;
    const recentWinRate = recentWins / recentBets.length;

    if (recentWinRate <= 0.40) {
      safetyMargin *= 0.60;
    } else if (recentWinRate < 0.70) {
      safetyMargin *= 0.80;
    } else if (recentWinRate >= 0.80) {
      safetyMargin *= 1.10;
    }
  }

  // Calculate overall state averages (capping 1000x+ outliers at 50x)
  const stateAvgs = [0, 1, 2, 3].map(s => {
    const vals = data.filter(v => getState(v) === s);
    const valsCapped = vals.map(v => v >= 1000.0 ? 50.0 : v);
    return valsCapped.length ? valsCapped.reduce((a, b) => a + b, 0) / valsCapped.length
                             : [1.07, 1.55, 3.00, Math.max(8.50, threshold * 1.1)][s];
  });

  // Calculate Markov Transition Matrix
  const txCount = Array.from({length: 4}, () => [0, 0, 0, 0]);
  for (let i = 0; i < stateSeq.length - 1; i++) {
    txCount[stateSeq[i]][stateSeq[i + 1]]++;
  }
  const txMatrix = txCount.map(row => {
    const s = row.reduce((a, b) => a + b, 0) + 4; // Add pseudo-counts for Laplace smoothing
    return row.map(c => (c + 1) / s);
  });

  // Empirical Gap Analysis for High Odds
  const highOddsIndices = data.reduce((acc, v, i) => {
    if (v >= threshold) acc.push(i);
    return acc;
  }, []);

  const gaps = [];
  for (let k = 1; k < highOddsIndices.length; k++) {
    gaps.push(highOddsIndices[k] - highOddsIndices[k - 1]);
  }
  const avgGap = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 8;

  // Current rounds elapsed since the last High Odds hit
  const currentRoundsSince = highOddsIndices.length > 0 
    ? (data.length - 1 - highOddsIndices[highOddsIndices.length - 1]) 
    : data.length;

  // Calculate recent High Odds prediction failure rate to scale down targets dynamically (Error Feedback)
  let failRate = 0;
  const recentHighOddsBets = (accuracyHistory.markov || []).filter(h => {
    const predTarget = h.uncappedTarget !== undefined ? h.uncappedTarget : h.target;
    return h.result !== 'SKIP' && typeof predTarget === 'number' && predTarget >= threshold;
  }).slice(-5);
  
  if (recentHighOddsBets.length > 0) {
    const fails = recentHighOddsBets.filter(h => h.result === 'FAIL' || (h.result && h.result.includes('NEAR_MISS'))).length;
    failRate = fails / recentHighOddsBets.length;
  }
  
  const biasMultiplier = 1.0 - 0.40 * failRate;

  let curState = stateSeq[stateSeq.length - 1];
  let curRoundsSince = currentRoundsSince;
  let tempSeq = [...stateSeq];

  // Predict next 5 rounds auto-regressively
  for (let r = 0; r < 5; r++) {
    let patternProb = [0, 0, 0, 0];
    let N = 0;

    // 1. Sequence Pattern Matching (5-round down to 2-round context window)
    for (let ctxLen = 5; ctxLen >= 2; ctxLen--) {
      const context = tempSeq.slice(-ctxLen);
      const occurrences = [];

      for (let i = 0; i <= stateSeq.length - ctxLen - 1; i++) {
        const candidate = stateSeq.slice(i, i + ctxLen);
        if (candidate.every((s, j) => s === context[j])) {
          occurrences.push({
            val: data[i + ctxLen],
            weight: i + 1
          });
        }
      }

      if (occurrences.length >= 2) {
        N = occurrences.length;
        const totalW = occurrences.reduce((sum, item) => sum + item.weight, 0);
        occurrences.forEach(item => {
          const sState = getState(item.val);
          patternProb[sState] += item.weight / totalW;
        });
        break; // Stop at the longest matching context pattern
      }
    }

    // 2. Markov Transition Matrix Probability
    const transitionProb = txMatrix[curState];

    // 3. Empirical Gap Hazard Probability
    const estRoundsSince = curRoundsSince + r;
    const countGreaterOrEqual = gaps.filter(g => g >= estRoundsSince).length;
    const countEqual = gaps.filter(g => g === estRoundsSince).length;
    let pGapHigh = countGreaterOrEqual > 0 ? (countEqual / countGreaterOrEqual) : (1 / avgGap);
    
    // Smooth pGapHigh to be realistic
    pGapHigh = Math.min(Math.max(pGapHigh, 0.02), 0.95);

    const gapProb = [0, 0, 0, 0];
    gapProb[3] = pGapHigh;
    
    // Distribute remaining probability proportionally using transition rates
    const sumNonHighTx = transitionProb[0] + transitionProb[1] + transitionProb[2];
    if (sumNonHighTx > 0) {
      gapProb[0] = (1 - pGapHigh) * (transitionProb[0] / sumNonHighTx);
      gapProb[1] = (1 - pGapHigh) * (transitionProb[1] / sumNonHighTx);
      gapProb[2] = (1 - pGapHigh) * (transitionProb[2] / sumNonHighTx);
    } else {
      gapProb[0] = (1 - pGapHigh) * 0.4;
      gapProb[1] = (1 - pGapHigh) * 0.4;
      gapProb[2] = (1 - pGapHigh) * 0.2;
    }

    // 4. Adaptive Bayesian Blending Weights
    let w1 = 0.0; // pattern
    let w2 = 0.6; // gap hazard
    let w3 = 0.4; // transition matrix
    
    if (N >= 5) {
      w1 = 0.5; w2 = 0.3; w3 = 0.2;
    } else if (N >= 3) {
      w1 = 0.3; w2 = 0.4; w3 = 0.3;
    } else if (N === 2) {
      w1 = 0.1; w2 = 0.5; w3 = 0.4;
    }

    const blendedProb = [0, 0, 0, 0];
    for (let s = 0; s < 4; s++) {
      blendedProb[s] = (w1 * patternProb[s]) + (w2 * gapProb[s]) + (w3 * transitionProb[s]);
    }

    // 5. Select Dominant State
    let dominantState = blendedProb.reduce((bi, p, i) => p > blendedProb[bi] ? i : bi, 0);
    let confidence = blendedProb[dominantState];
    
    // Scale confidence by error bias for High Odds predictions to trigger skip filter
    if (dominantState === 3) {
      confidence = confidence * biasMultiplier;
    }

    // Crash Probability & Combined Loss Filters
    // Use a more lenient threshold so genuine High Odds signals aren't suppressed
    if (dominantState === 3) {
      const crashProb = blendedProb[0];
      const lowTargetProb = blendedProb[1];
      const combinedLossProb = crashProb + lowTargetProb;
      // Old: 0.45 combined / 0.20 crash — too aggressive, suppressed valid signals
      // New: only downgrade if VERY strong crash evidence
      if (combinedLossProb > 0.60 || crashProb > 0.35) {
        dominantState = blendedProb[2] >= blendedProb[1] ? 2 : 1;
      }
    }

    const bounds = [1.00, 1.20, 2.00, threshold];
    const resolvedLowerBoundVal = bounds[dominantState];
    const avgVal = stateAvgs[dominantState];

    // Adaptive safety margin scaled by pattern confidence
    const confidenceScaler = 0.5 + (confidence * 0.5);
    const activeSafetyMargin = safetyMargin * confidenceScaler;
    let targetVal = resolvedLowerBoundVal + (avgVal - resolvedLowerBoundVal) * activeSafetyMargin;
    
    // Scale by error bias
    targetVal = targetVal * biasMultiplier;

    let finalLabel = stateLabels[dominantState];
    let finalRange = stateRanges[dominantState];
    let finalColor = stateColors[dominantState];

    // Capping / Safe Downgrading target checks
    if (dominantState === 3 && targetVal < threshold) {
      finalLabel = "Recovery Target";
      finalRange = `2.0–${threshold}x`;
      finalColor = "var(--accent-orange)";
      targetVal = Math.min(Math.max(2.00, 2.00 + (avgVal - 2.00) * activeSafetyMargin), threshold - 0.5);
    }

    // Clamp to state lower bounds only after downgrading check
    const resolvedLowerBoundClamped = (finalLabel === "Recovery Target") ? 2.00 : resolvedLowerBoundVal;
    if (targetVal < resolvedLowerBoundClamped && dominantState > 0) {
      targetVal = resolvedLowerBoundClamped;
    }

    nextForecasts.push({
      roundOffset: r + 1,
      target: targetVal,
      avgVal: avgVal,
      lowerBound: resolvedLowerBoundVal,
      label: finalLabel,
      prob: Math.round(confidence * 100),
      range: finalRange,
      color: finalColor
    });

    // Feed back into path for next offset projection
    tempSeq.push(dominantState);
    curState = dominantState;
    if (dominantState === 3) {
      curRoundsSince = 0;
    } else {
      curRoundsSince++;
    }
  }

  return nextForecasts;
}

function generateKNNForecast(data, mode, safety = 'standard', threshold = 8) {
  const nextForecasts = [];
  if (data.length < 5) {
    for (let r = 1; r <= 5; r++) {
      nextForecasts.push({
        roundOffset: r,
        target: 1.40,
        avgVal: 1.55,
        lowerBound: 1.20,
        label: 'Low Target',
        prob: 50,
        range: '1.2–2.0x',
        color: 'var(--accent-blue)'
      });
    }
    return nextForecasts;
  }

  // Cap at 50x (not 10x) so high-odds outcomes carry meaningful weight in distance calculations
  const capVal = (x) => Math.min(x, 50.0);
  let simulatedHistory = [...data];
  
  // Calculate rounds since last high-odds hit for gap boost
  const knnHighOddIndices = data.reduce((acc, v, i) => { if (v >= threshold) acc.push(i); return acc; }, []);
  const knnAvgGap = knnHighOddIndices.length > 1
    ? knnHighOddIndices.slice(1).reduce((s, v, i) => s + (v - knnHighOddIndices[i]), 0) / (knnHighOddIndices.length - 1)
    : Math.max(8, threshold * 1.4);
  const knnRoundsSince = knnHighOddIndices.length > 0
    ? (data.length - 1 - knnHighOddIndices[knnHighOddIndices.length - 1])
    : data.length;
  // Gap pressure: 0=no pressure, 1=fully overdue
  const knnGapPressure = Math.min(1.0, knnRoundsSince / Math.max(knnAvgGap, 1));
  
  for (let r = 1; r <= 5; r++) {
    const L = 4;
    const currentCtx = simulatedHistory.slice(-L);
    
    const matches = [];
    for (let i = 0; i <= data.length - L - 2; i++) {
      let dist = 0;
      for (let j = 0; j < L; j++) {
        dist += Math.abs(capVal(data[i + j]) - capVal(currentCtx[j]));
      }
      matches.push({ index: i, distance: dist, nextVal: data[i + L] });
    }
    
    matches.sort((a, b) => a.distance - b.distance);
    
    const K = Math.min(7, matches.length);
    const topNeighbors = matches.slice(0, K);
    const outcomes = topNeighbors.map(m => m.nextVal);
    outcomes.sort((a, b) => a - b);
    
    // Count how many neighbors had high-odds outcomes
    const highOddsNeighbors = outcomes.filter(v => v >= threshold).length;
    const highOddsNeighborRate = highOddsNeighbors / outcomes.length;

    let percentile = 0.35; 
    if (mode === 'high') {
      if (safety === 'max') percentile = 0.20;
      else if (safety === 'high') percentile = 0.30;
      else if (safety === 'standard') percentile = 0.45;
      else if (safety === 'aggressive') percentile = 0.60;
    } else {
      if (safety === 'max') percentile = 0.15;
      else if (safety === 'high') percentile = 0.25;
      else if (safety === 'standard') percentile = 0.35;
      else if (safety === 'aggressive') percentile = 0.50;
    }
    
    let idx = Math.floor(percentile * (outcomes.length - 1));
    if (idx < 0) idx = 0;
    let targetVal = outcomes.length > 0 ? outcomes[idx] : 1.40;
    
    // High-Odds Boost: if neighbors show high-odds pattern AND gap pressure building
    // → shift prediction toward threshold
    if (mode === 'high' && highOddsNeighborRate >= 0.30 && knnGapPressure >= 0.60) {
      // Blend the percentile prediction with threshold
      const boostWeight = Math.min(0.70, highOddsNeighborRate * knnGapPressure);
      targetVal = targetVal * (1 - boostWeight) + threshold * boostWeight;
    }
    
    let dominantState = 1; 
    if (targetVal < 1.20) dominantState = 0;
    else if (targetVal < 2.00) dominantState = 1;
    else if (targetVal < threshold) dominantState = 2;
    else dominantState = 3;
    
    const stateLabels = ['Crash Risk', 'Low Target', 'Recovery Target', 'High Odds'];
    const stateRanges = ['< 1.2x', '1.2–2.0x', `2.0–${threshold}x`, `${threshold}x+` ];
    const stateColors = ['var(--accent-red)', 'var(--accent-blue)', 'var(--accent-orange)', '#a855f7'];
    
    const avgDist = topNeighbors.reduce((sum, n) => sum + n.distance, 0) / K;
    const confidence = Math.max(0.40, Math.min(0.95, 0.95 - (avgDist / 15)));
    
    nextForecasts.push({
      roundOffset: r,
      target: targetVal,
      avgVal: outcomes.reduce((a, b) => a + b, 0) / outcomes.length,
      lowerBound: dominantState === 3 ? threshold : dominantState === 2 ? 2.00 : dominantState === 1 ? 1.20 : 1.00,
      label: stateLabels[dominantState],
      prob: Math.round(confidence * 100),
      range: stateRanges[dominantState],
      color: stateColors[dominantState]
    });
    
    simulatedHistory.push(targetVal);
  }
  
  return nextForecasts;
}

function generateVolatilityForecast(data, mode, safety = 'standard', threshold = 8) {
  const nextForecasts = [];
  
  const getStdDev = (arr, mean) => {
    const squareDiffs = arr.map(v => Math.pow(Math.min(v, 10.0) - Math.min(mean, 10.0), 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / arr.length;
    return Math.sqrt(avgSquareDiff);
  };

  const len = data.length;
  let simulatedHistory = [...data];

  for (let r = 1; r <= 5; r++) {
    const last15 = simulatedHistory.slice(-15);
    const last5 = simulatedHistory.slice(-5);
    
    const mean15 = last15.reduce((a, b) => a + b, 0) / last15.length;
    const mean5 = last5.reduce((a, b) => a + b, 0) / last5.length;
    
    const crashCount = last15.filter(v => v < 1.20).length;
    const crashRate = crashCount / last15.length;
    
    const recoveryCount = last15.filter(v => v >= 2.00).length;
    const recoveryRate = recoveryCount / last15.length;
    
    // Determine market state
    let marketState = 'stable';
    
    // Gap-hazard aware: compute rounds since last threshold hit in this engine
    const vfHighIndices = simulatedHistory.slice(0, simulatedHistory.length - r + 1)
      .reduce((acc, v, i) => { if (v >= threshold) acc.push(i); return acc; }, []);
    const vfAvgGap = vfHighIndices.length > 1
      ? vfHighIndices.slice(1).reduce((s, v, i) => s + (v - vfHighIndices[i]), 0) / (vfHighIndices.length - 1)
      : Math.max(8, threshold * 1.4);
    const vfSince = vfHighIndices.length > 0
      ? (simulatedHistory.length - 1 - vfHighIndices[vfHighIndices.length - 1])
      : simulatedHistory.length;
    const isOverdueForHigh = vfSince >= vfAvgGap * 0.85;  // Within 85% of expected gap
    
    if (crashRate >= 0.40) {
      marketState = 'cold';
    } else if (isOverdueForHigh || (recoveryRate >= 0.30 && mean5 > mean15)) {
      // Overdue gap OR recovering market with rising mean → hot signal
      marketState = 'hot';
    }
    
    let targetVal = 1.40;
    let prob = 70;
    let label = 'Low Target';
    
    let multiplierMultiplier = 0.5; 
    if (safety === 'max') multiplierMultiplier = 0.3;
    else if (safety === 'high') multiplierMultiplier = 0.4;
    else if (safety === 'standard') multiplierMultiplier = 0.5;
    else if (safety === 'aggressive') multiplierMultiplier = 0.7;

    if (marketState === 'cold') {
      targetVal = 1.15; 
      prob = 85;
      label = 'Crash Risk';
    } else if (marketState === 'hot') {
      if (mode === 'high') {
        targetVal = threshold;
        prob = 45;
        label = 'High Odds';
      } else {
        targetVal = Math.max(1.80, mean5 * multiplierMultiplier);
        prob = 60;
        label = 'Recovery Target';
      }
    } else {
      targetVal = mean5 * multiplierMultiplier;
      if (mode === 'high') {
        targetVal = Math.max(targetVal, 2.00);
        label = 'Recovery Target';
      } else {
        targetVal = Math.min(Math.max(targetVal, 1.20), 1.80);
        label = 'Low Target';
      }
      prob = 70;
    }
    
    let dominantState = 1;
    if (targetVal < 1.20) dominantState = 0;
    else if (targetVal < 2.00) dominantState = 1;
    else if (targetVal < threshold) dominantState = 2;
    else dominantState = 3;
    
    const stateLabels = ['Crash Risk', 'Low Target', 'Recovery Target', 'High Odds'];
    const stateRanges = ['< 1.2x', '1.2–2.0x', `2.0–${threshold}x`, `${threshold}x+` ];
    const stateColors = ['var(--accent-red)', 'var(--accent-blue)', 'var(--accent-orange)', '#a855f7'];

    nextForecasts.push({
      roundOffset: r,
      target: targetVal,
      avgVal: mean15,
      lowerBound: dominantState === 3 ? threshold : dominantState === 2 ? 2.00 : dominantState === 1 ? 1.20 : 1.00,
      label: stateLabels[dominantState],
      prob: prob,
      range: stateRanges[dominantState],
      color: stateColors[dominantState]
    });
    
    simulatedHistory.push(targetVal);
  }
  
  return nextForecasts;
}

function generateParetoForecast(data, mode, safety = 'standard', threshold = 8) {
  const nextForecasts = [];
  const len = data.length;
  const windowSize = Math.min(40, len);
  const recentData = data.slice(-windowSize);
  
  let logSum = 0;
  recentData.forEach(v => {
    const val = Math.max(v, 1.01);
    logSum += Math.log(val);
  });
  
  let alpha = logSum > 0 ? (recentData.length / logSum) : 1.44; 
  alpha = Math.max(0.3, Math.min(3.0, alpha));
  
  for (let r = 1; r <= 5; r++) {
    let targetSurvival = 0.70; 
    
    if (mode === 'high') {
      if (safety === 'max') targetSurvival = 0.35;
      else if (safety === 'high') targetSurvival = 0.40;
      else if (safety === 'standard') targetSurvival = 0.45;
      else if (safety === 'aggressive') targetSurvival = 0.50;
    } else {
      if (safety === 'max') targetSurvival = 0.85;
      else if (safety === 'high') targetSurvival = 0.78;
      else if (safety === 'standard') targetSurvival = 0.70;
      else if (safety === 'aggressive') targetSurvival = 0.60;
    }
    
    let targetVal = Math.pow(targetSurvival, -1.0 / alpha);
    if (targetVal < 1.01) targetVal = 1.01;
    
    let dominantState = 1;
    if (targetVal < 1.20) dominantState = 0;
    else if (targetVal < 2.00) dominantState = 1;
    else if (targetVal < threshold) dominantState = 2;
    else dominantState = 3;
    
    const stateLabels = ['Crash Risk', 'Low Target', 'Recovery Target', 'High Odds'];
    const stateRanges = ['< 1.2x', '1.2–2.0x', `2.0–${threshold}x`, `${threshold}x+` ];
    const stateColors = ['var(--accent-red)', 'var(--accent-blue)', 'var(--accent-orange)', '#a855f7'];
    
    nextForecasts.push({
      roundOffset: r,
      target: targetVal,
      avgVal: 1.0 + (1.0 / (alpha - 1.0)), 
      lowerBound: dominantState === 3 ? threshold : dominantState === 2 ? 2.00 : dominantState === 1 ? 1.20 : 1.00,
      label: stateLabels[dominantState],
      prob: Math.round(targetSurvival * 100),
      range: stateRanges[dominantState],
      color: stateColors[dominantState]
    });
    
    alpha = alpha * 0.98;
  }
  
  return nextForecasts;
}

function processSafetyOverrides(nextRoundRaw, eng, data, mode, safety, threshold, isMarketCold, roundsSinceHighOdd, coldStreak, recentHighOdd, lossProtection, autoSkip, estNextStrikeIn, avgHighOdd) {
  const nextRound = { ...nextRoundRaw };
  
  let isGapOverrideCooldown = false;
  let recentHighOddsFailRate = 0;
  let lastFailedHighOddsIdx = -1;

  const engHistory = accuracyHistory[eng] || [];
  const highOddsVerifications = engHistory.filter(h => {
    const predT = h.uncappedTarget !== undefined ? h.uncappedTarget : h.target;
    return h.result !== 'SKIP' && typeof predT === 'number' && predT >= threshold;
  });

  if (highOddsVerifications.length > 0) {
    const lastVerif = highOddsVerifications[highOddsVerifications.length - 1];
    if (lastVerif.result === 'FAIL') {
      const roundsSinceFailed = globalAccumulatedOdds.length - lastVerif.index;
      // Scale cooldown with threshold: higher threshold = rarer event = longer cooldown needed
      const failCooldownRounds = Math.max(3, Math.round(threshold / 2));
      if (roundsSinceFailed < failCooldownRounds) {
        isGapOverrideCooldown = true;
      }
    }

    const lastFailedVerif = [...highOddsVerifications].reverse().find(h => h.result === 'FAIL');
    if (lastFailedVerif) {
      lastFailedHighOddsIdx = lastFailedVerif.index;
    }
    
    if (highOddsVerifications.length >= 3) {
      const recent5Verifs = highOddsVerifications.slice(-5);
      const fails = recent5Verifs.filter(h => h.result === 'FAIL' || (h.result && h.result.includes('NEAR_MISS'))).length;
      recentHighOddsFailRate = fails / recent5Verifs.length;

      const roundsSinceLastBet = globalAccumulatedOdds.length - lastVerif.index;
      // Reset fail rate only after a long idle period (15+ rounds) to prevent fake-low readings
      if (roundsSinceLastBet >= 15) {
        recentHighOddsFailRate = 0;
      }
    }
  }

  if (estNextStrikeIn !== null && estNextStrikeIn <= 1 && nextRound.label !== "High Odds" && !isGapOverrideCooldown && !isMarketCold) {
    let sMargin = mode === "high" ? 0.50 : 0.25;
    if (safety === 'max') sMargin = mode === "high" ? 0.25 : 0.10;
    else if (safety === 'high') sMargin = mode === "high" ? 0.35 : 0.18;
    else if (safety === 'aggressive') sMargin = mode === "high" ? 0.70 : 0.40;

    let failRate = 0;
    const recentHighOddsBets = engHistory.filter(h => {
      const predTarget = h.uncappedTarget !== undefined ? h.uncappedTarget : h.target;
      return h.result !== 'SKIP' && typeof predTarget === 'number' && predTarget >= threshold;
    }).slice(-5);
    if (recentHighOddsBets.length > 0) {
      const fails = recentHighOddsBets.filter(h => h.result === 'FAIL' || (h.result && h.result.includes('NEAR_MISS'))).length;
      failRate = fails / recentHighOddsBets.length;
    }
    const activeBiasMult = 1.0 - 0.40 * failRate;

    let estTarget = threshold + (avgHighOdd - threshold) * sMargin;
    estTarget = estTarget * activeBiasMult;
    if (estTarget < threshold) {
      estTarget = threshold;
    }

    nextRound.label = "High Odds";
    nextRound.target = estTarget;
    nextRound.lowerBound = threshold;
    nextRound.avgVal = avgHighOdd;
    nextRound.prob = 65;
    nextRound.range = `${threshold}x+`;
    nextRound.color = "#a855f7";
  }

  let target = nextRound.target;
  let risk = nextRound.label;
  let explanation = `${nextRound.label} (${nextRound.range}) — Confidence: ${nextRound.prob}%`;
  if (eng === 'nn' && nextRoundRaw.rawProbThresh !== undefined) {
    explanation += ` [NN High-Odds Prob: ${Math.round(nextRoundRaw.rawProbThresh * 100)}%]`;
  }

  let isHighOddsDowngraded = false;
  if (nextRound.label === "High Odds") {
    if (isGapOverrideCooldown) {
      if (!autoSkip) {
        target = 2.00;
        risk = "Recovery Target (Failure Cooldown)";
        explanation = `🟠 High Odds target downgraded: Failure Cooldown Active`;
        isHighOddsDowngraded = true;
      }
    } else if (recentHighOddsFailRate >= 0.60) {
      if (!autoSkip) {
        target = 2.00;
        risk = "Recovery Target (High Fail Streak)";
        explanation = `🟠 High Odds target downgraded: High Fail Streak (${Math.round(recentHighOddsFailRate * 100)}%)`;
        isHighOddsDowngraded = true;
      }
    } else if (isMarketCold) {
      if (!autoSkip) {
        target = 2.00;
        risk = "Recovery Target (Cold Market)";
        explanation = `🟠 High Odds target downgraded: Cold Market (${roundsSinceHighOdd} Rds No Hits)`;
        isHighOddsDowngraded = true;
      }
    } else {
      let minConf = 40;
      if (safety === 'max') minConf = 50;
      else if (safety === 'high') minConf = 45;

      if (nextRound.prob < minConf) {
        if (!autoSkip) {
          target = 2.00;
          risk = "Recovery Target (Low Confidence High Odds)";
          explanation = `🟠 High Odds target downgraded due to low confidence (${nextRound.prob}%)`;
          isHighOddsDowngraded = true;
        }
      }
    }
  }

  if (!isHighOddsDowngraded) {
    if (mode === "high") {
      // Dynamic overdue thresholds based on historical avg gap between threshold events.
      // avgHighOdd is available as a param; derive estimatedGap from estNextStrikeIn context.
      // Fallback: estimate gap from threshold rarity (higher threshold = rarer = larger gap).
      const estimatedGap = (estNextStrikeIn !== null && roundsSinceHighOdd > 0)
        ? (roundsSinceHighOdd + Math.max(0, estNextStrikeIn))  // current gap so far + expected remaining
        : Math.max(7, Math.ceil(threshold * 1.4));             // heuristic: 5x→7, 10x→14
      const buildupAt = Math.max(5, Math.round(estimatedGap * 0.55));
      const criticalAt = Math.max(12, Math.round(estimatedGap * 1.15));

      if (roundsSinceHighOdd >= criticalAt) {
        risk = "Critical Hunt (Overdue)";
        // ALWAYS keep 2x recovery target in critical zone — only escalate via consensus check
        target = Math.min(target, 2.00);
        target = Math.max(target, 1.50);
        explanation = `🔥 Critical: ${roundsSinceHighOdd} rounds since last ${threshold}x+ (expected every ~${Math.round(estimatedGap)} rds) — Conf: ${nextRound.prob}%`;
      } else if (roundsSinceHighOdd >= buildupAt) {
        risk = "Buildup Zone";
        // ALWAYS cap at 2x in buildup — never go straight to threshold here
        target = Math.min(target, 2.00);
        target = Math.max(target, 1.40);
        explanation = `⚡ Buildup: ${roundsSinceHighOdd} rds since ${threshold}x+ (overdue at ~${criticalAt} rds) — Conf: ${nextRound.prob}%`;
      } else {
        risk = "High Cooldown";
        target = Math.min(target, 2.00);
        explanation = `❄️ Cooldown: ${roundsSinceHighOdd} rds since last ${threshold}x+ — Conf: ${nextRound.prob}%`;
      }
    } else {
      if (coldStreak >= 4) {
        risk = "Low Risk (Recovery)";
        target = Math.max(target, 1.35);
        explanation = `🟢 Recovery mode: crashes overdue — Confidence: ${nextRound.prob}%`;
      } else if (recentHighOdd !== null) {
        risk = "Extreme High Risk";
        target = 1.15;
        explanation = `⚠️ Post Mega-Odd filter active — Confidence: ${nextRound.prob}%`;
      } else {
        explanation = `${nextRound.label} (${nextRound.range}) — Confidence: ${nextRound.prob}%`;
      }
    }
  }

  if (mode === "safe") {
    let safeCap = 1.80;
    if (safety === 'max') safeCap = 1.30;
    else if (safety === 'high') safeCap = 1.50;
    else if (safety === 'standard') safeCap = 1.80;
    else if (safety === 'aggressive') safeCap = 2.20;

    target = Math.min(target, safeCap);

    if (nextRound.label === "High Odds" && !isHighOddsDowngraded) {
      explanation += ` [🔥 High Odd Potential: ${nextRound.target.toFixed(2)}x+ (Conf: ${nextRound.prob}%)]`;
    }
  }

  let activeLossProtection = false;
  if (lossProtection && engHistory.length >= 2) {
    const last2 = engHistory.slice(-2);
    if (last2.every(h => h.result === 'FAIL')) {
      activeLossProtection = true;
    }
  }

  if (activeLossProtection) {
    target = mode === "high" ? Math.min(target, 2.00) : 1.15;
    risk = "Loss Protection Active";
    explanation = `🛡️ Consecutive loss safety triggered — Confidence: 99%`;
  }

  let isSkip = false;
  let skipReason = "";
  if (autoSkip) {
    if (nextRound.label === "Crash Risk" && (safety === 'max' || safety === 'high')) {
      isSkip = true;
      skipReason = "Expected Crash Risk";
    } else {
      if (nextRound.label === "Crash Risk") {
        target = Math.min(target, 1.20);
        if (target < 1.15) target = 1.15;
      }

      if (nextRound.label === "High Odds") {
        if (isGapOverrideCooldown) {
          isSkip = true;
          skipReason = "High Odds Failure Cooldown";
        } else if (recentHighOddsFailRate >= 0.60) {
          isSkip = true;
          skipReason = "High Odds Failure Streak";
        } else if (isMarketCold) {
          isSkip = true;
          skipReason = `Cold Market (${roundsSinceHighOdd} Rds No Hits)`;
        } else {
          let minConf = 40;
          if (safety === 'max') minConf = 50;
          else if (safety === 'high') minConf = 45;

          if (nextRound.prob < minConf) {
            isSkip = true;
            skipReason = "Low High Odds Confidence";
          }
        }
      }

      if (mode === "high") {
        let highModeCooldown = 2;
        if (safety === 'max') highModeCooldown = 5;
        else if (safety === 'high') highModeCooldown = 3;
        else if (safety === 'standard') highModeCooldown = 2;
        else if (safety === 'aggressive') highModeCooldown = 1;

        if (roundsSinceHighOdd < highModeCooldown) {
          isSkip = true;
          skipReason = "Post-Strike Cooldown";
        } else {
          let confThreshold = 0;
          if (safety === 'max') confThreshold = 48;
          else if (safety === 'high') confThreshold = 42;
          
          if (nextRound.prob < confThreshold) {
            isSkip = true;
            skipReason = "Low Confidence";
          }
        }
      } else {
        // Post-Mega-Odd Cooldown only applies in conservative safety modes
        if (recentHighOdd !== null && (safety === 'max' || safety === 'high')) {
          isSkip = true;
          skipReason = "Post-Mega-Odd Cooldown";
        } else {
          let confThreshold = 0;
          if (safety === 'max') confThreshold = 52;
          else if (safety === 'high') confThreshold = 45;
          
          if (nextRound.prob < confThreshold) {
            isSkip = true;
            skipReason = "Low Confidence";
          }
        }
      }
    }
  }

  if (isSkip) {
    target = "SKIP";
    risk = "No Bet";
    explanation = `🛑 Skip Round — ${skipReason}`;
  }

  return {
    target: target,
    uncappedTarget: nextRound.target,
    label: risk,
    isSkip: target === "SKIP",
    explanation: explanation,
    color: nextRound.color
  };
}
function runGapAnalysis(data, threshold) {
  // Method 1: Overall dataset
  const indices = data.reduce((acc, v, i) => {
    if (v >= threshold) acc.push(i);
    return acc;
  }, []);

  const countEl = document.getElementById('gap-count');
  const avgEl = document.getElementById('gap-avg');
  const sinceEl = document.getElementById('gap-since');
  const badgeEl = document.getElementById('gap-badge');

  countEl.textContent = indices.length;

  if (indices.length === 0) {
    avgEl.textContent = '—';
    sinceEl.textContent = '—';
    badgeEl.textContent = 'WAITING';
    badgeEl.style.background = 'rgba(255,255,255,0.05)';
    badgeEl.style.color = 'var(--text-muted)';
  } else {
    const gaps = [];
    for (let k = 1; k < indices.length; k++) {
      gaps.push(indices[k] - indices[k - 1]);
    }

    const avgGap = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : null;
    avgEl.textContent = avgGap !== null ? Math.round(avgGap * 10) / 10 : '—';

    const roundsSince = data.length - 1 - indices[indices.length - 1];
    sinceEl.textContent = roundsSince + ' round' + (roundsSince === 1 ? '' : 's') + ' ago';

    let statusText = 'WAITING';
    let badgeCol = 'var(--text-secondary)';
    let badgeBg = 'rgba(255, 255, 255, 0.05)';
    let probVal = 0;

    if (roundsSince === 0) {
      statusText = '💥 JUST HIT';
      badgeCol = '#fff';
      badgeBg = 'var(--accent-purple)';
      probVal = 5;
    } else if (avgGap !== null) {
      const remaining = avgGap - roundsSince;
      
      // Calculate dynamic probability of hitting in the next round
      const baseline = 1 / avgGap;
      const countGreater = gaps.filter(g => g >= roundsSince).length;
      const countNext = gaps.filter(g => g === roundsSince + 1).length;
      const hazard = countGreater > 0 ? (countNext / countGreater) : 1.0;
      const blended = (hazard * 0.6) + (baseline * 0.4);
      let finalProb = blended;
      if (roundsSince > avgGap) {
        const overdueFactor = 1.0 + (roundsSince - avgGap) / avgGap;
        finalProb = Math.min(finalProb * overdueFactor, 0.99);
      }
      probVal = Math.min(Math.max(Math.round(finalProb * 100), 5), 99);

      if (remaining <= 0) {
        statusText = `🔴 OVERDUE (${probVal}%)`;
        badgeCol = '#fff';
        badgeBg = 'var(--accent-red)';
      } else if (remaining <= 3) {
        statusText = `🟡 IMMINENT (${probVal}%)`;
        badgeCol = '#000';
        badgeBg = 'var(--accent-orange)';
      } else {
        statusText = `🟢 WAITING (${probVal}%)`;
        badgeCol = '#fff';
        badgeBg = 'var(--accent-green)';
      }
    }

    badgeEl.textContent = statusText;
    badgeEl.style.background = badgeBg;
    badgeEl.style.color = badgeCol;
  }

  // Method 2: Last 20 rounds
  const last20Data = data.slice(-20);
  const indices20 = last20Data.reduce((acc, v, i) => {
    if (v >= threshold) acc.push(i);
    return acc;
  }, []);

  const countEl20 = document.getElementById('gap-count-20');
  const avgEl20 = document.getElementById('gap-avg-20');
  const sinceEl20 = document.getElementById('gap-since-20');
  const badgeEl20 = document.getElementById('gap-badge-20');

  countEl20.textContent = indices20.length;

  if (indices20.length === 0) {
    avgEl20.textContent = '—';
    sinceEl20.textContent = '—';
    badgeEl20.textContent = 'WAITING';
    badgeEl20.style.background = 'rgba(255,255,255,0.05)';
    badgeEl20.style.color = 'var(--text-muted)';
  } else {
    const gaps20 = [];
    for (let k = 1; k < indices20.length; k++) {
      gaps20.push(indices20[k] - indices20[k - 1]);
    }

    const avgGap20 = gaps20.length > 0 ? gaps20.reduce((a, b) => a + b, 0) / gaps20.length : null;
    avgEl20.textContent = avgGap20 !== null ? Math.round(avgGap20 * 10) / 10 : '—';

    const roundsSince20 = last20Data.length - 1 - indices20[indices20.length - 1];
    sinceEl20.textContent = roundsSince20 + ' round' + (roundsSince20 === 1 ? '' : 's') + ' ago';

    let statusText20 = 'WAITING';
    let badgeCol20 = 'var(--text-secondary)';
    let badgeBg20 = 'rgba(255, 255, 255, 0.05)';
    let probVal20 = 0;

    if (roundsSince20 === 0) {
      statusText20 = '💥 JUST HIT';
      badgeCol20 = '#fff';
      badgeBg20 = 'var(--accent-purple)';
      probVal20 = 5;
    } else if (avgGap20 !== null) {
      const remaining20 = avgGap20 - roundsSince20;

      // Calculate dynamic probability of hitting in the next round
      const baseline20 = 1 / avgGap20;
      const countGreater20 = gaps20.filter(g => g >= roundsSince20).length;
      const countNext20 = gaps20.filter(g => g === roundsSince20 + 1).length;
      const hazard20 = countGreater20 > 0 ? (countNext20 / countGreater20) : 1.0;
      const blended20 = (hazard20 * 0.6) + (baseline20 * 0.4);
      let finalProb20 = blended20;
      if (roundsSince20 > avgGap20) {
        const overdueFactor20 = 1.0 + (roundsSince20 - avgGap20) / avgGap20;
        finalProb20 = Math.min(finalProb20 * overdueFactor20, 0.99);
      }
      probVal20 = Math.min(Math.max(Math.round(finalProb20 * 100), 5), 99);

      if (remaining20 <= 0) {
        statusText20 = `🔴 OVERDUE (${probVal20}%)`;
        badgeCol20 = '#fff';
        badgeBg20 = 'var(--accent-red)';
      } else if (remaining20 <= 3) {
        statusText20 = `🟡 IMMINENT (${probVal20}%)`;
        badgeCol20 = '#000';
        badgeBg20 = 'var(--accent-orange)';
      } else {
        statusText20 = `🟢 WAITING (${probVal20}%)`;
        badgeCol20 = '#fff';
        badgeBg20 = 'var(--accent-green)';
      }
    }

    badgeEl20.textContent = statusText20;
    badgeEl20.style.background = badgeBg20;
    badgeEl20.style.color = badgeCol20;
  }
}

function runMegaOutliersAnalysis(data) {
  const threshold = 1000.0;
  const indices = data.reduce((acc, v, i) => {
    if (v >= threshold) acc.push(i);
    return acc;
  }, []);

  const countEl = document.getElementById('mega-count');
  const avgEl = document.getElementById('mega-avg');
  const sinceEl = document.getElementById('mega-since');
  const badgeEl = document.getElementById('mega-badge');

  if (!countEl) return;

  countEl.textContent = indices.length;

  if (indices.length === 0) {
    avgEl.textContent = '—';
    sinceEl.textContent = '—';
    badgeEl.textContent = 'WAITING';
    badgeEl.style.background = 'rgba(255,255,255,0.05)';
    badgeEl.style.color = 'var(--text-muted)';
  } else {
    const gaps = [];
    for (let k = 1; k < indices.length; k++) {
      gaps.push(indices[k] - indices[k - 1]);
    }

    const avgGap = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : null;
    avgEl.textContent = avgGap !== null ? Math.round(avgGap) + ' rds' : '—';

    const roundsSince = data.length - 1 - indices[indices.length - 1];
    sinceEl.textContent = roundsSince + ' rd' + (roundsSince === 1 ? '' : 's') + ' ago';

    let statusText = 'WAITING';
    let badgeCol = 'var(--text-secondary)';
    let badgeBg = 'rgba(255, 255, 255, 0.05)';

    if (roundsSince === 0) {
      statusText = '💥 JUST HIT!';
      badgeCol = '#fff';
      badgeBg = '#f43f5e';
    } else if (avgGap !== null) {
      const remaining = avgGap - roundsSince;
      if (remaining <= 0) {
        statusText = '🔥 OVERDUE';
        badgeCol = '#fff';
        badgeBg = 'var(--accent-red)';
      } else if (remaining <= 10) {
        statusText = '⚡ IMMINENT';
        badgeCol = '#000';
        badgeBg = 'var(--accent-orange)';
      } else {
        statusText = '🟢 WAITING';
        badgeCol = '#fff';
        badgeBg = 'var(--accent-green)';
      }
    }

    badgeEl.textContent = statusText;
    badgeEl.style.background = badgeBg;
    badgeEl.style.color = badgeCol;
  }
}

function resetOutputFields() {
  document.getElementById('hero-val').textContent = '1.40x';
  document.getElementById('hero-sub').textContent = 'Standard Exit';
  document.getElementById('val-cold').textContent = '0';
  document.getElementById('gap-count').textContent = '0';
  document.getElementById('gap-avg').textContent = '—';
  document.getElementById('gap-since').textContent = '—';
  document.getElementById('gap-badge').textContent = 'WAITING';
  document.getElementById('gap-badge').style.background = 'rgba(255, 255, 255, 0.05)';
  document.getElementById('gap-badge').style.color = 'var(--text-secondary)';

  document.getElementById('gap-count-20').textContent = '0';
  document.getElementById('gap-avg-20').textContent = '—';
  document.getElementById('gap-since-20').textContent = '—';
  document.getElementById('gap-badge-20').textContent = 'WAITING';
  document.getElementById('gap-badge-20').style.background = 'rgba(255, 255, 255, 0.05)';
  document.getElementById('gap-badge-20').style.color = 'var(--text-secondary)';

  document.getElementById('mega-count').textContent = '0';
  document.getElementById('mega-avg').textContent = '—';
  document.getElementById('mega-since').textContent = '—';
  document.getElementById('mega-badge').textContent = 'WAITING';
  document.getElementById('mega-badge').style.background = 'rgba(255, 255, 255, 0.05)';
  document.getElementById('mega-badge').style.color = 'var(--text-secondary)';

  ['markov', 'knn', 'trend', 'pareto', 'nn'].forEach(m => {
    const el = document.getElementById(`lbl-pred-${m}`);
    if (el) {
      el.textContent = "—";
      el.style.color = "var(--text-secondary)";
    }
  });
}

function syncThresholdPills(threshold) {
  const pills = document.querySelectorAll('.thresh-pill');
  pills.forEach(pill => {
    const pVal = parseInt(pill.getAttribute('data-val'));
    if (pVal === threshold) {
      pill.classList.add('active');
    } else {
      pill.classList.remove('active');
    }
  });
}

// ── NEURAL NETWORK PATTERN CLASSIFIER ENGINE ─────────────────────────────────

class SimpleNeuralNetwork {
  constructor(inputDim, hiddenDim, outputDim) {
    this.inputDim = inputDim;
    this.hiddenDim = hiddenDim;
    this.outputDim = outputDim;
    
    // Initialize weights randomly between -0.5 and 0.5
    this.wih = [];
    for (let i = 0; i < hiddenDim; i++) {
      this.wih[i] = [];
      for (let j = 0; j < inputDim; j++) {
        this.wih[i][j] = Math.random() - 0.5;
      }
    }
    
    this.who = [];
    for (let i = 0; i < outputDim; i++) {
      this.who[i] = [];
      for (let j = 0; j < hiddenDim; j++) {
        this.who[i][j] = Math.random() - 0.5;
      }
    }
    
    this.biasH = new Array(hiddenDim).fill(0).map(() => Math.random() - 0.5);
    this.biasO = new Array(outputDim).fill(0).map(() => Math.random() - 0.5);
  }
  
  sigmoid(x) {
    return 1.0 / (1.0 + Math.exp(-Math.max(-20.0, Math.min(20.0, x))));
  }
  
  feedforward(inputs) {
    // Hidden layer activations
    const hidden = [];
    for (let i = 0; i < this.hiddenDim; i++) {
      let sum = this.biasH[i];
      for (let j = 0; j < this.inputDim; j++) {
        sum += inputs[j] * this.wih[i][j];
      }
      hidden[i] = this.sigmoid(sum);
    }
    
    // Output layer activations
    const outputs = [];
    for (let i = 0; i < this.outputDim; i++) {
      let sum = this.biasO[i];
      for (let j = 0; j < this.hiddenDim; j++) {
        sum += hidden[j] * this.who[i][j];
      }
      outputs[i] = this.sigmoid(sum);
    }
    
    return { hidden, outputs };
  }
  
  train(inputs, targets, lr = 0.15) {
    const { hidden, outputs } = this.feedforward(inputs);
    
    // Output layer errors & gradients
    const outputErrors = [];
    const outputGradients = [];
    for (let i = 0; i < this.outputDim; i++) {
      outputErrors[i] = targets[i] - outputs[i];
      outputGradients[i] = outputErrors[i] * outputs[i] * (1.0 - outputs[i]);
    }
    
    // Hidden layer errors & gradients
    const hiddenErrors = [];
    const hiddenGradients = [];
    for (let i = 0; i < this.hiddenDim; i++) {
      let error = 0.0;
      for (let j = 0; j < this.outputDim; j++) {
        error += outputGradients[j] * this.who[j][i];
      }
      hiddenErrors[i] = error;
      hiddenGradients[i] = hiddenErrors[i] * hidden[i] * (1.0 - hidden[i]);
    }
    
    // Update who weights & biasO
    for (let i = 0; i < this.outputDim; i++) {
      this.biasO[i] += outputGradients[i] * lr;
      for (let j = 0; j < this.hiddenDim; j++) {
        this.who[i][j] += outputGradients[i] * hidden[j] * lr;
      }
    }
    
    // Update wih weights & biasH
    for (let i = 0; i < this.hiddenDim; i++) {
      this.biasH[i] += hiddenGradients[i] * lr;
      for (let j = 0; j < this.inputDim; j++) {
        this.wih[i][j] += hiddenGradients[i] * inputs[j] * lr;
      }
    }
  }
}

// Helper to extract 8 normalized features from historical data
function extractFeatures(data, idx, threshold) {
  const normVal = (v) => Math.min(v, 15.0) / 15.0;

  // 1. Last 4 multipliers
  const m1 = normVal(data[idx]);
  const m2 = normVal(data[idx - 1]);
  const m3 = normVal(data[idx - 2]);
  const m4 = normVal(data[idx - 3]);

  // 2. Crash density (last 10 rounds: count of rounds < 2.0x)
  let crashCount = 0;
  for (let j = 0; j < 10; j++) {
    if (data[idx - j] < 2.0) {
      crashCount++;
    }
  }
  const crashDensity = crashCount / 10.0;

  // 3. Short term average (last 5 rounds)
  let sum = 0;
  for (let j = 0; j < 5; j++) {
    sum += Math.min(data[idx - j], 15.0);
  }
  const avgVal = (sum / 5.0) / 15.0;

  // 4. Rounds since last strike (value >= threshold)
  let roundsSinceLast = 0;
  for (let j = 0; j <= idx; j++) {
    if (data[idx - j] >= threshold) {
      break;
    }
    roundsSinceLast++;
  }
  const normRoundsSinceLast = Math.min(30, roundsSinceLast) / 30.0;

  // 5. Max in last 5 rounds
  let maxVal = 0;
  for (let j = 0; j < 5; j++) {
    if (data[idx - j] > maxVal) {
      maxVal = data[idx - j];
    }
  }
  const normMaxVal = Math.min(maxVal, 15.0) / 15.0;

  return [m1, m2, m3, m4, crashDensity, avgVal, normRoundsSinceLast, normMaxVal];
}

let globalNN = null;

function generateNNForecast(data, mode, safety = 'standard', threshold = 8) {
  // We need at least 15 rounds of history for the 10-round features to be extractable safely
  if (data.length < 15) {
    return [{ target: 1.40, label: 'Standard Risk', prob: 50, range: '1.2-2.0x', color: 'var(--accent-blue)' }];
  }
  
  // Initialize NN if not already done, or reinitialize if input dim is mismatched
  if (!globalNN || globalNN.inputDim !== 8) {
    globalNN = new SimpleNeuralNetwork(8, 24, 2);
  }
  
  // Prepare training set from history (up to last 300 samples)
  const trainingData = [];
  const startIdx = Math.max(10, data.length - 300);
  for (let i = startIdx; i < data.length; i++) {
    const inputs = extractFeatures(data, i - 1, threshold);
    const nextVal = data[i];
    const isHighOdd = nextVal >= threshold;
    const targets = [
      nextVal >= 2.0 ? 1.0 : 0.0,
      isHighOdd ? 1.0 : 0.0
    ];
    
    trainingData.push({ inputs, targets });
    
    // Minority Class Oversampling: Duplicate high odds precursors in High strategy mode
    // This helps the neural network recognize rare high-odds precursor patterns strongly!
    if (isHighOdd && mode === 'high') {
      trainingData.push({ inputs, targets });
      trainingData.push({ inputs, targets });
      trainingData.push({ inputs, targets });
      trainingData.push({ inputs, targets });
    }
  }
  
  // Dynamic learning configurations for high odds optimization
  let epochs = 120;
  let lr = 0.15;
  if (mode === 'high') {
    epochs = 200; // Train for more epochs to refine high-odds patterns
    lr = 0.22;    // Increase learning rate to adapt faster to errors/misses
  }
  
  // Backprop training in background
  if (trainingData.length > 0) {
    for (let epoch = 0; epoch < epochs; epoch++) {
      const shuffled = [...trainingData].sort(() => Math.random() - 0.5);
      shuffled.forEach(sample => {
        globalNN.train(sample.inputs, sample.targets, lr);
      });
    }
  }
  
  // Predict offset = 1 (Next Round)
  const currentInputs = extractFeatures(data, data.length - 1, threshold);
  const { outputs } = globalNN.feedforward(currentInputs);
  
  const probOver2 = outputs[0];
  const probOverThresh = outputs[1];
  
  let targetVal = 1.40;
  let riskLabel = 'Standard Risk';
  let forecastColor = 'var(--accent-blue)';
  let rangeLabel = '1.2-2.0x';
  let conf = Math.round(probOver2 * 100);
  
  if (probOver2 < 0.45) {
    targetVal = 1.15;
    riskLabel = 'Crash Risk';
    forecastColor = 'var(--accent-red)';
    rangeLabel = '< 1.2x';
    conf = Math.round((1.0 - probOver2) * 100);
  } else if (probOverThresh >= 0.55 && mode === 'high') {
    // Require ≥55% NN confidence before declaring High Odds (was 38% — too aggressive)
    targetVal = threshold;
    riskLabel = 'High Odds';
    forecastColor = '#a855f7';
    rangeLabel = `${threshold}x+`;
    conf = Math.round(probOverThresh * 100);
  } else if (probOver2 >= 0.70) {
    targetVal = 2.00;
    riskLabel = 'Recovery Target';
    forecastColor = 'var(--accent-orange)';
    rangeLabel = `2.0-${threshold}x`;
    conf = Math.round(probOver2 * 100);
  } else {
    targetVal = 1.40;
    riskLabel = 'Low Target';
    forecastColor = 'var(--accent-blue)';
    rangeLabel = '1.2-2.0x';
    conf = Math.round(probOver2 * 100);
  }
  
  return [{
    target: targetVal,
    label: riskLabel,
    prob: conf,
    range: rangeLabel,
    color: forecastColor,
    rawProbThresh: probOverThresh
  }];
}

// Helper to simulate betting strategies historically step-by-step
function simulateStakingStrategy({
  history,
  baseBet,
  target,
  bankroll,
  strategy,
  staking,
  threshold,
  expectedWinRate
}) {
  let currentSessionPnl = 0;
  let consecutiveLosses = 0;
  let nextBet = baseBet;
  let stakingRuleText = '';

  const stopLoss = bankroll - (bankroll * 0.20); // 20% flat loss limit
  const multiplier = strategy === 'high' ? threshold : (strategy === 'balanced' ? 2.0 : 1.30);

  history.forEach(h => {
    if (h.result === 'SKIP') return;

    let betForRound = baseBet;

    if (staking === 'flat') {
      betForRound = baseBet;
    } else if (staking === 'kelly') {
      const p = expectedWinRate;
      const b = multiplier;
      const kFraction = (p * (b - 1) - (1 - p)) / (b - 1);
      const clampedFraction = Math.min(0.10, Math.max(0.01, kFraction * 0.10));
      const currentBankroll = bankroll + currentSessionPnl;
      betForRound = Math.max(1, Math.floor(currentBankroll * clampedFraction));
    } else if (staking === 'progression') {
      if (strategy === 'high') {
        if (consecutiveLosses >= 9) {
          betForRound = baseBet * 3.0;
        } else if (consecutiveLosses >= 6) {
          betForRound = baseBet * 2.0;
        } else if (consecutiveLosses >= 3) {
          betForRound = baseBet * 1.5;
        } else {
          betForRound = baseBet;
        }
      } else {
        if (consecutiveLosses >= 3) {
          betForRound = baseBet * 1.5;
        } else {
          betForRound = baseBet;
        }
      }
    } else if (staking === 'high_odds_smart') {
      const currentBankroll = bankroll + currentSessionPnl;
      const isStopLossTriggered = currentBankroll <= stopLoss;

      if (isStopLossTriggered) {
        betForRound = baseBet * 0.5;
      } else if (currentSessionPnl >= target * 0.8) {
        betForRound = baseBet * 0.25;
      } else if (currentSessionPnl >= target * 0.5) {
        betForRound = baseBet * 0.5;
      } else if (currentSessionPnl <= 0) {
        if (consecutiveLosses >= 10) {
          betForRound = baseBet * 3.0;
        } else if (consecutiveLosses >= 6) {
          betForRound = baseBet * 2.0;
        } else if (consecutiveLosses >= 3) {
          betForRound = baseBet * 1.5;
        } else {
          betForRound = baseBet;
        }
      } else {
        betForRound = baseBet;
      }
    }

    // Profit Lock-In Protection (applied to the bet size calculated above)
    const remaining = target - currentSessionPnl;
    if (remaining > 0 && remaining < betForRound * (multiplier - 1)) {
      const protectiveBet = Math.ceil(remaining / (multiplier - 1));
      if (protectiveBet < betForRound && protectiveBet >= 1) {
        betForRound = protectiveBet;
      }
    }

    betForRound = Math.max(1, betForRound);

    // Apply outcome
    const isWin = strategy === 'high' ? (h.actual >= threshold) : (h.result === 'PASS');
    if (isWin) {
      currentSessionPnl += betForRound * (multiplier - 1);
      consecutiveLosses = 0;
    } else {
      currentSessionPnl -= betForRound;
      if (strategy === 'high') {
        const predTarget = h.uncappedTarget !== undefined ? h.uncappedTarget : h.target;
        if (typeof predTarget === 'number' && predTarget >= threshold) {
          consecutiveLosses++;
        }
      } else {
        consecutiveLosses++;
      }
    }
  });

  // Calculate nextBet recommendation
  if (staking === 'flat') {
    nextBet = baseBet;
    stakingRuleText = `💡 <b>Staking Rule (Flat):</b> Keep bet constant at <b>Rs. ${nextBet.toFixed(2)}</b>. Safest approach for bankroll consistency.`;
  } else if (staking === 'kelly') {
    const p = expectedWinRate;
    const b = multiplier;
    const kFraction = (p * (b - 1) - (1 - p)) / (b - 1);
    const clampedFraction = Math.min(0.10, Math.max(0.01, kFraction * 0.10));
    const currentBankroll = bankroll + currentSessionPnl;
    nextBet = Math.max(1, Math.floor(currentBankroll * clampedFraction));
    stakingRuleText = `💡 <b>Staking Rule (Kelly):</b> Bet <b>Rs. ${nextBet.toFixed(2)}</b> (${(clampedFraction * 100).toFixed(1)}% of bankroll). Adjusts to bankroll to survive drawdowns.`;
  } else if (staking === 'progression') {
    if (strategy === 'high') {
      if (consecutiveLosses >= 9) {
        nextBet = baseBet * 3.0;
        stakingRuleText = `💡 <b>Staking Rule (Progression):</b> Scale bet to 3x: <b>Rs. ${nextBet.toFixed(2)}</b>. Loss streak is high (${consecutiveLosses} rounds). Ready for recovery.`;
      } else if (consecutiveLosses >= 6) {
        nextBet = baseBet * 2.0;
        stakingRuleText = `💡 <b>Staking Rule (Progression):</b> Scale bet to 2x: <b>Rs. ${nextBet.toFixed(2)}</b>. Loss streak is moderate (${consecutiveLosses} rounds).`;
      } else if (consecutiveLosses >= 3) {
        nextBet = baseBet * 1.5;
        stakingRuleText = `💡 <b>Staking Rule (Progression):</b> Scale bet to 1.5x: <b>Rs. ${nextBet.toFixed(2)}</b>. Loss streak started (${consecutiveLosses} rounds).`;
      } else {
        nextBet = baseBet;
        stakingRuleText = `💡 <b>Staking Rule (Progression):</b> Base bet: <b>Rs. ${nextBet.toFixed(2)}</b>. Loss streak is low (${consecutiveLosses} rounds).`;
      }
    } else {
      if (consecutiveLosses >= 3) {
        nextBet = baseBet * 1.5;
        stakingRuleText = `💡 <b>Staking Rule (Progression):</b> Scale bet to 1.5x: <b>Rs. ${nextBet.toFixed(2)}</b>. Loss streak is ${consecutiveLosses} rounds.`;
      } else {
        nextBet = baseBet;
        stakingRuleText = `💡 <b>Staking Rule (Progression):</b> Base bet: <b>Rs. ${nextBet.toFixed(2)}</b>. Loss streak is ${consecutiveLosses} rounds.`;
      }
    }
  } else if (staking === 'high_odds_smart') {
    const currentBankroll = bankroll + currentSessionPnl;
    const isStopLossTriggered = currentBankroll <= stopLoss;

    if (isStopLossTriggered) {
      nextBet = baseBet * 0.5;
      stakingRuleText = `⚠️ <b>High-Odds Smart (Safety Mode):</b> Bankroll has hit stop loss! De-escalating bet to 0.5x: <b>Rs. ${nextBet.toFixed(2)}</b> to protect remaining funds.`;
    } else if (currentSessionPnl >= target * 0.8) {
      nextBet = baseBet * 0.25;
      stakingRuleText = `🛡️ <b>High-Odds Smart (Profit Lock-In):</b> Target is 80%+ achieved! Reducing bet to 0.25x: <b>Rs. ${nextBet.toFixed(2)}</b> to protect profits.`;
    } else if (currentSessionPnl >= target * 0.5) {
      nextBet = baseBet * 0.5;
      stakingRuleText = `🛡️ <b>High-Odds Smart (Profit Protect):</b> Target is 50%+ achieved! Reducing bet to 0.5x: <b>Rs. ${nextBet.toFixed(2)}</b> to preserve gains.`;
    } else if (currentSessionPnl <= 0) {
      if (consecutiveLosses >= 10) {
        nextBet = baseBet * 3.0;
        stakingRuleText = `📈 <b>High-Odds Smart (Loss Recovery):</b> Scale bet to 3x: <b>Rs. ${nextBet.toFixed(2)}</b>. Streak is ${consecutiveLosses} losses. Net negative.`;
      } else if (consecutiveLosses >= 6) {
        nextBet = baseBet * 2.0;
        stakingRuleText = `📈 <b>High-Odds Smart (Loss Recovery):</b> Scale bet to 2x: <b>Rs. ${nextBet.toFixed(2)}</b>. Streak is ${consecutiveLosses} losses.`;
      } else if (consecutiveLosses >= 3) {
        nextBet = baseBet * 1.5;
        stakingRuleText = `📈 <b>High-Odds Smart (Loss Recovery):</b> Scale bet to 1.5x: <b>Rs. ${nextBet.toFixed(2)}</b>. Streak is ${consecutiveLosses} losses.`;
      } else {
        nextBet = baseBet;
        stakingRuleText = `💡 <b>High-Odds Smart:</b> Base bet: <b>Rs. ${nextBet.toFixed(2)}</b>. Session is at even/loss. Loss streak is ${consecutiveLosses}.`;
      }
    } else {
      nextBet = baseBet;
      stakingRuleText = `💡 <b>High-Odds Smart:</b> Base bet: <b>Rs. ${nextBet.toFixed(2)}</b>. Session in profit (+Rs. ${currentSessionPnl.toFixed(0)}), waiting for next big win.`;
    }
  }

  // Profit Lock-In Protection (applied to nextBet)
  const remaining = target - currentSessionPnl;
  if (remaining > 0 && remaining < nextBet * (multiplier - 1)) {
    const protectiveBet = Math.ceil(remaining / (multiplier - 1));
    if (protectiveBet < nextBet && protectiveBet >= 1) {
      nextBet = protectiveBet;
      stakingRuleText = `💡 <b>Profit Lock-In Activated:</b> Reduced next bet to <b>Rs. ${nextBet.toFixed(2)}</b>. This is exactly what's needed to hit your daily target without over-risking.`;
    }
  }

  nextBet = Math.max(1, nextBet);

  return {
    sessionPnl: currentSessionPnl,
    consecutiveLosses,
    nextBet,
    stakingRuleText,
    stopLoss,
    remaining: Math.max(0, remaining)
  };
}

// ── DAILY TARGET STRATEGY PLANNER ───────────────────────────────────────────

function updatePlannerUI() {
  const targetEl = document.getElementById('input-planner-target');
  const bankrollEl = document.getElementById('input-planner-bankroll');
  const betEl = document.getElementById('input-planner-bet');
  const strategyEl = document.getElementById('sel-planner-strategy');
  const stakingEl = document.getElementById('sel-planner-staking');

  if (!targetEl || !bankrollEl || !betEl || !strategyEl || !stakingEl) return;

  const target = parseFloat(targetEl.value) || 100;
  const bankroll = parseFloat(bankrollEl.value) || 10000;
  const bet = parseFloat(betEl.value) || 10;
  const strategy = strategyEl.value;
  const staking = stakingEl.value;

  // Read current threshold (default 8)
  const thresholdEl = document.getElementById('sel-threshold');
  const threshold = thresholdEl ? (parseInt(thresholdEl.value) || 8) : 8;

  const engines = ['markov', 'knn', 'trend', 'pareto', 'nn'];
  const engineNames = {
    markov: 'Blended Markov',
    knn: 'KNN Similarity',
    trend: 'Trend-Adaptive',
    pareto: 'Pareto Density',
    nn: 'Neural Network AI'
  };

  let bestEngine = 'nn';
  let bestEngineAccVal = -1;

  engines.forEach(eng => {
    const engHistory = accuracyHistory[eng] || [];
    let matches = [];
    let wins = 0;

    if (strategy === 'high') {
      matches = engHistory.filter(h => {
        const predT = h.uncappedTarget !== undefined ? h.uncappedTarget : h.target;
        return h.result !== 'SKIP' && typeof predT === 'number' && predT >= threshold;
      });
      wins = matches.filter(h => h.actual >= threshold).length;
    } else {
      matches = engHistory.filter(h => h.result === 'PASS' || h.result === 'FAIL' || (h.result && h.result.includes('NEAR_MISS')));
      wins = matches.filter(h => h.result === 'PASS').length;
    }

    const acc = matches.length > 0 ? (wins / matches.length) : 0.5; // default 50%
    if (acc > bestEngineAccVal) {
      bestEngineAccVal = acc;
      bestEngine = eng;
    }
  });

  const displayAccPercent = Math.round(bestEngineAccVal * 100);

  // Recommendations and variables based on strategy style
  let recModel = engineNames[bestEngine];
  let recTargetMult = 1.30;
  let recSetupText = 'Safe Multiplier Targets';
  let expectedWinRate = 0.80; // defaults

  if (strategy === 'safe') {
    recTargetMult = 1.30;
    expectedWinRate = Math.max(0.70, Math.min(0.95, bestEngineAccVal));
    recSetupText = 'Conservative Safe Mode';
  } else if (strategy === 'balanced') {
    recTargetMult = 2.00;
    expectedWinRate = Math.max(0.45, Math.min(0.70, bestEngineAccVal));
    recSetupText = 'Recovery 2x Target Setup';
  } else if (strategy === 'high') {
    recTargetMult = parseFloat(threshold) || 5.0;
    expectedWinRate = Math.max(0.12, Math.min(0.40, bestEngineAccVal));
    recSetupText = `High Odds Hunter (≥ ${threshold}x)`;
  }

  // Update recommendation labels
  document.getElementById('planner-rec-model').textContent = recModel;
  document.getElementById('planner-rec-accuracy').textContent = `${displayAccPercent}% (Live)`;
  document.getElementById('planner-rec-target').textContent = `${recTargetMult.toFixed(2)}x`;
  document.getElementById('planner-rec-setup').textContent = recSetupText;

  // Expected Betting Plan calculations
  // Expected Profit per round = (Bet * (Multiplier - 1) * WinRate) - (Bet * (1 - WinRate))
  const expProfitPerRound = (bet * (recTargetMult - 1) * expectedWinRate) - (bet * (1 - expectedWinRate));
  const roundsNeededEl = document.getElementById('planner-rounds-needed');
  
  if (expProfitPerRound <= 0) {
    roundsNeededEl.textContent = 'N/A';
    roundsNeededEl.style.color = 'var(--accent-red)';
  } else {
    const rounds = Math.ceil(target / expProfitPerRound);
    roundsNeededEl.textContent = `${rounds}`;
    roundsNeededEl.style.color = '#fff';
  }

  const activeHistory = accuracyHistory[activeEngineUsed] || [];

  // Call the staking simulator helper to compute dynamic progress, stop-loss and next recommendation
  const sim = simulateStakingStrategy({
    history: activeHistory,
    baseBet: bet,
    target: target,
    bankroll: bankroll,
    strategy: strategy,
    staking: staking,
    threshold: threshold,
    expectedWinRate: expectedWinRate
  });

  const sessionPnl = sim.sessionPnl;
  const remaining = sim.remaining;
  const nextBet = sim.nextBet;
  const stakingRuleText = sim.stakingRuleText;
  const stopLoss = sim.stopLoss;

  document.getElementById('planner-stop-loss').textContent = `${stopLoss.toFixed(0)}`;

  // Update DOM labels
  const nextBetValEl = document.getElementById('planner-next-bet-val');
  if (nextBetValEl) {
    nextBetValEl.textContent = `Rs. ${nextBet.toFixed(0)}`;
  }
  const stakingInstructEl = document.getElementById('planner-staking-instruction');
  if (stakingInstructEl) {
    stakingInstructEl.innerHTML = stakingRuleText;
  }

  // Calculate progress percentage
  const progressPct = target > 0 ? Math.min(100, Math.max(0, Math.round((sessionPnl / target) * 100))) : 0;
  document.getElementById('planner-progress-pct').textContent = `${progressPct}%`;
  document.getElementById('planner-progress-bar').style.width = `${progressPct}%`;

  document.getElementById('planner-current-profit').textContent = (sessionPnl >= 0 ? '+' : '') + sessionPnl.toFixed(2);
  document.getElementById('planner-current-profit').style.color = sessionPnl > 0 ? 'var(--accent-green)' : (sessionPnl < 0 ? 'var(--accent-red)' : 'var(--text-primary)');
  
  document.getElementById('planner-remaining-profit').textContent = `${remaining.toFixed(2)}`;

  // Update Status message card
  const statusMsgEl = document.getElementById('planner-status-message');
  if (sessionPnl >= target) {
    statusMsgEl.textContent = '🎉 GOAL ACHIEVED! STOP PLAYING TODAY! 🛑';
    statusMsgEl.style.background = 'rgba(16, 185, 129, 0.15)';
    statusMsgEl.style.borderColor = 'var(--accent-green)';
    statusMsgEl.style.color = '#34d399';
  } else {
    const coldValEl = document.getElementById('val-cold');
    const coldVal = coldValEl ? parseInt(coldValEl.textContent) || 0 : 0;
    if (coldVal >= 3) {
      statusMsgEl.textContent = '⚠️ MARKET IS COLD: PAUSE BETS NOW!';
      statusMsgEl.style.background = 'rgba(239, 68, 68, 0.15)';
      statusMsgEl.style.borderColor = 'var(--accent-red)';
      statusMsgEl.style.color = '#f87171';
    } else {
      statusMsgEl.textContent = '🚀 STATUS: PLAN ACTIVE - RUNNING ENGINE...';
      statusMsgEl.style.background = 'rgba(59, 130, 246, 0.1)';
      statusMsgEl.style.borderColor = 'var(--accent-blue)';
      statusMsgEl.style.color = '#93c5fd';
    }
  }
}
