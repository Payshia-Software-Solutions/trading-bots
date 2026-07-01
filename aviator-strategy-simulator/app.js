// Presets containing realistic simulated data sequences
const presets = {
    "normal-random": [
        1.85, 1.12, 2.40, 1.05, 1.00, 3.12, 1.45, 8.90, 1.20, 1.02,
        4.50, 1.62, 1.15, 2.10, 1.33, 15.40, 1.08, 1.95, 1.50, 1.10,
        2.80, 1.01, 1.40, 5.20, 1.30, 1.07, 7.80, 1.25, 2.20, 1.12,
        1.60, 24.30, 1.18, 1.03, 3.40, 1.70, 1.11, 1.90, 1.00, 4.80,
        1.55, 1.22, 1.35, 1.06, 9.20, 1.40, 2.05, 1.14, 1.02, 3.10,
        1.65, 12.00, 1.10, 1.28, 1.45, 1.03, 2.90, 1.75, 1.15, 2.50,
        1.38, 1.01, 5.80, 1.20, 1.50, 1.11, 3.30, 1.68, 1.09, 1.98,
        1.42, 38.50, 1.16, 1.05, 2.65, 1.82, 1.13, 2.15, 1.26, 1.04,
        6.40, 1.35, 1.90, 1.08, 4.10, 1.52, 1.24, 1.10, 11.50, 1.48,
        1.72, 1.03, 3.20, 1.58, 1.19, 2.85, 1.34, 1.02, 5.10, 1.60
    ],
    "high-crash": [
        1.05, 1.12, 1.01, 1.20, 1.08, 1.03, 1.95, 1.02, 1.15, 1.10,
        1.00, 1.35, 1.06, 1.04, 1.52, 1.11, 1.02, 2.10, 1.07, 1.09,
        1.18, 1.01, 1.03, 1.30, 1.05, 1.14, 1.02, 1.60, 1.10, 1.08,
        1.01, 1.00, 1.25, 1.04, 1.12, 2.50, 1.03, 1.09, 1.06, 1.15
    ],
    "high-multiplier": [
        2.50, 12.30, 1.05, 4.80, 22.40, 1.60, 8.90, 1.20, 15.00, 3.40,
        7.10, 52.00, 1.15, 6.20, 18.50, 1.90, 2.10, 32.00, 1.40, 9.50,
        4.30, 14.80, 1.10, 8.50, 25.00, 2.30, 6.70, 11.00, 1.50, 75.00
    ]
};

// Global chart variable
let balanceChart = null;

// DOM Elements
const selectPreset = document.getElementById('data-preset');
const txtAreaMultiplier = document.getElementById('multiplier-input');
const btnParseData = document.getElementById('btn-parse-data');

const selectStrategy = document.getElementById('sim-strategy');
const inputBalance = document.getElementById('sim-balance');
const inputBaseBet = document.getElementById('sim-base-bet');
const inputTargetOdd = document.getElementById('sim-target-odd');
const inputMartingaleMultiplier = document.getElementById('sim-martingale-multiplier');
const btnRunSimulation = document.getElementById('btn-run-simulation');

// Statistics UI Elements
const statTotal = document.getElementById('stat-total');
const statAvg = document.getElementById('stat-avg');
const statMedian = document.getElementById('stat-median');
const statMax = document.getElementById('stat-max');

const dist1 = document.getElementById('dist-1');
const dist2 = document.getElementById('dist-2');
const dist3 = document.getElementById('dist-3');
const dist4 = document.getElementById('dist-4');

const distVal1 = document.getElementById('dist-val-1');
const distVal2 = document.getElementById('dist-val-2');
const distVal3 = document.getElementById('dist-val-3');
const distVal4 = document.getElementById('dist-val-4');

const multipliersContainer = document.getElementById('multipliers-container');

// Simulation Results UI
const simResBalance = document.getElementById('sim-result-balance');
const simResProfit = document.getElementById('sim-result-profit');
const simResWinLoss = document.getElementById('sim-result-winloss');
const simResStreak = document.getElementById('sim-result-streak');
const simLog = document.getElementById('sim-log');

// Load initial preset
function loadPreset(presetName) {
    if (presets[presetName]) {
        txtAreaMultiplier.value = presets[presetName].join(', ');
        calculateStats();
    }
}

// Parse input text to array of numbers
function getParsedMultipliers() {
    let rawText = txtAreaMultiplier.value;
    // Remove thousands separator commas (commas followed by exactly 3 digits)
    rawText = rawText.replace(/,(\d{3})(?=\.|\s|$|x|,|;)/gi, '$1');
    // Remove any trailing 'x' from elements before splitting
    rawText = rawText.replace(/x/gi, ' ');
    return rawText
        .split(/[\s,;\n]+/)
        .map(v => parseFloat(v))
        .filter(v => !isNaN(v) && v >= 1.0);
}

// Calculate and render statistics for the loaded data
function calculateStats() {
    const data = getParsedMultipliers();
    
    if (data.length === 0) {
        alert("Please enter or load valid numeric multipliers.");
        return null;
    }

    // Sort to calculate median
    const sorted = [...data].sort((a, b) => a - b);
    
    // Core stats
    const total = data.length;
    const max = Math.max(...data);
    const sum = data.reduce((a, b) => a + b, 0);
    const avg = sum / total;
    
    let median = 0;
    if (total % 2 === 0) {
        median = (sorted[total / 2 - 1] + sorted[total / 2]) / 2;
    } else {
        median = sorted[Math.floor(total / 2)];
    }

    // Update UI Stats
    statTotal.textContent = total;
    statAvg.textContent = avg.toFixed(2) + 'x';
    statMedian.textContent = median.toFixed(2) + 'x';
    statMax.textContent = max.toFixed(2) + 'x';

    // Calculate distributions
    let cat1 = 0; // < 1.2
    let cat2 = 0; // 1.2 - 2.0
    let cat3 = 0; // 2.0 - 5.0
    let cat4 = 0; // > 5.0

    data.forEach(val => {
        if (val < 1.2) cat1++;
        else if (val < 2.0) cat2++;
        else if (val < 5.0) cat3++;
        else cat4++;
    });

    const pct1 = ((cat1 / total) * 100).toFixed(0);
    const pct2 = ((cat2 / total) * 100).toFixed(0);
    const pct3 = ((cat3 / total) * 100).toFixed(0);
    const pct4 = ((cat4 / total) * 100).toFixed(0);

    // Update Progress Bars UI
    dist1.style.width = pct1 + '%';
    distVal1.textContent = pct1 + '%';

    dist2.style.width = pct2 + '%';
    distVal2.textContent = pct2 + '%';

    dist3.style.width = pct3 + '%';
    distVal3.textContent = pct3 + '%';

    dist4.style.width = pct4 + '%';
    distVal4.textContent = pct4 + '%';

    // Populate historical tags visual log
    multipliersContainer.innerHTML = '';
    data.forEach(val => {
        const span = document.createElement('span');
        span.className = 'multiplier-tag';
        if (val < 1.2) {
            span.classList.add('crash-low');
        } else if (val < 2.0) {
            span.classList.add('crash-mid');
        } else {
            span.classList.add('crash-high');
        }
        span.textContent = val.toFixed(2) + 'x';
        multipliersContainer.appendChild(span);
    });

    return data;
}

// Generate Fibonacci Sequence
function getFibonacciSequence(length) {
    let seq = [1, 1];
    for (let i = 2; i < length; i++) {
        seq.push(seq[i - 1] + seq[i - 2]);
    }
    return seq;
}

// Run simulation logic
function runSimulation() {
    const data = calculateStats();
    if (!data) return;

    // Retrieve settings
    const strategy = selectStrategy.value;
    const startBalance = parseFloat(inputBalance.value) || 1000;
    const baseBet = parseFloat(inputBaseBet.value) || 10;
    const targetOdd = parseFloat(inputTargetOdd.value) || 2.0;
    const martingaleMultiplier = parseFloat(inputMartingaleMultiplier.value) || 2.0;

    let balance = startBalance;
    let currentBet = baseBet;
    let wins = 0;
    let losses = 0;
    let maxConsecutiveLoss = 0;
    let currentLossStreak = 0;
    
    // For tracking balance path
    let balanceHistory = [startBalance];
    let roundLabels = ['Start'];
    
    // Clear log box
    simLog.innerHTML = '';

    // Fibonacci prep
    const fibSeq = getFibonacciSequence(data.length + 5);
    let fibIndex = 0;

    // Simulation loop
    for (let i = 0; i < data.length; i++) {
        const roundOdd = data[i];
        const roundNum = i + 1;

        if (balance <= 0) {
            logMessage(`Round ${roundNum}: BUSTED! Balance hit $0.00. Simulation halted.`, 'log-fail log-bold');
            break;
        }

        if (balance < currentBet) {
            logMessage(`Round ${roundNum}: Bet size of $${currentBet.toFixed(2)} exceeds remaining balance $${balance.toFixed(2)}. Reduced bet to max balance.`, 'log-neutral');
            currentBet = balance;
        }

        const isWin = roundOdd >= targetOdd;
        let profitLoss = 0;

        if (isWin) {
            profitLoss = currentBet * (targetOdd - 1);
            balance += profitLoss;
            wins++;
            currentLossStreak = 0;

            logMessage(`Round ${roundNum}: Bet $${currentBet.toFixed(2)} on target ${targetOdd.toFixed(2)}x. Won! Flight landed at ${roundOdd.toFixed(2)}x. Net: +$${profitLoss.toFixed(2)} (Bal: $${balance.toFixed(2)})`, 'log-success');
            
            // Adjust bets based on strategy
            if (strategy === 'martingale') {
                currentBet = baseBet; // Reset
            } else if (strategy === 'fibonacci') {
                fibIndex = Math.max(0, fibIndex - 2); // Step back two steps
                currentBet = baseBet * fibSeq[fibIndex];
            } else {
                currentBet = baseBet; // Fixed
            }
        } else {
            profitLoss = -currentBet;
            balance += profitLoss;
            losses++;
            currentLossStreak++;
            if (currentLossStreak > maxConsecutiveLoss) {
                maxConsecutiveLoss = currentLossStreak;
            }

            logMessage(`Round ${roundNum}: Bet $${currentBet.toFixed(2)} on target ${targetOdd.toFixed(2)}x. Lost! Crashed early at ${roundOdd.toFixed(2)}x. Net: -$${currentBet.toFixed(2)} (Bal: $${balance.toFixed(2)})`, 'log-fail');
            
            // Adjust bets based on strategy
            if (strategy === 'martingale') {
                currentBet = currentBet * martingaleMultiplier;
            } else if (strategy === 'fibonacci') {
                fibIndex++;
                currentBet = baseBet * fibSeq[fibIndex];
            } else {
                currentBet = baseBet; // Fixed
            }
        }

        balanceHistory.push(parseFloat(balance.toFixed(2)));
        roundLabels.push(`R${roundNum}`);
    }

    // Update Simulation summary UI
    simResBalance.textContent = `$${balance.toFixed(2)}`;
    const netProfit = balance - startBalance;
    simResProfit.textContent = (netProfit >= 0 ? '+' : '') + `$${netProfit.toFixed(2)}`;
    simResProfit.parentElement.className = 'stat-box ' + (netProfit >= 0 ? 'green' : '');
    simResWinLoss.textContent = `${wins} W / ${losses} L`;
    simResStreak.textContent = maxConsecutiveLoss;

    // Draw Chart
    drawChart(roundLabels, balanceHistory);
}

// Log message generator helper
function logMessage(text, className = '') {
    const div = document.createElement('div');
    div.className = `log-entry ${className}`;
    div.textContent = text;
    simLog.appendChild(div);
    simLog.scrollTop = simLog.scrollHeight;
}

// Draw/Update Chart.js balance progression
function drawChart(labels, dataPoints) {
    const ctx = document.getElementById('balanceChart').getContext('2d');
    
    if (balanceChart) {
        balanceChart.destroy();
    }

    // Determine color based on final balance
    const isProfit = dataPoints[dataPoints.length - 1] >= dataPoints[0];
    const chartColor = isProfit ? '#10b981' : '#e02424';
    const chartGlow = isProfit ? 'rgba(16, 185, 129, 0.1)' : 'rgba(224, 36, 36, 0.1)';

    balanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Simulation Balance',
                data: dataPoints,
                borderColor: chartColor,
                borderWidth: 3,
                backgroundColor: chartGlow,
                fill: true,
                tension: 0.3,
                pointRadius: dataPoints.length > 50 ? 0 : 3,
                pointHoverRadius: 6,
                pointBackgroundColor: chartColor
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#14161b',
                    titleColor: '#fff',
                    bodyColor: '#e5e7eb',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            return 'Balance: $' + context.raw.toFixed(2);
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255,255,255,0.02)',
                        borderColor: 'rgba(255,255,255,0.05)'
                    },
                    ticks: {
                        color: '#9ca3af',
                        font: {
                            family: 'Outfit'
                        }
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255,255,255,0.02)',
                        borderColor: 'rgba(255,255,255,0.05)'
                    },
                    ticks: {
                        color: '#9ca3af',
                        font: {
                            family: 'Outfit'
                        },
                        callback: function(value) {
                            return '$' + value;
                        }
                    }
                }
            }
        }
    });
}

// Event Listeners
selectPreset.addEventListener('change', (e) => {
    loadPreset(e.target.value);
});

btnParseData.addEventListener('click', () => {
    calculateStats();
});

btnRunSimulation.addEventListener('click', () => {
    runSimulation();
});

// Strategy Change logic: Enable/disable martingale multiplier input
selectStrategy.addEventListener('change', (e) => {
    if (e.target.value === 'martingale') {
        inputMartingaleMultiplier.disabled = false;
        inputMartingaleMultiplier.parentElement.style.opacity = '1';
    } else {
        inputMartingaleMultiplier.disabled = true;
        inputMartingaleMultiplier.parentElement.style.opacity = '0.5';
    }
});

// Page Initialization
window.addEventListener('DOMContentLoaded', () => {
    loadPreset('normal-random');
    runSimulation();
});
