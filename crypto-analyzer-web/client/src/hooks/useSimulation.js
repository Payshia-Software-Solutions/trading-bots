import { useState, useEffect, useRef } from 'react';

export function useSimulation() {
  const [demoBalance, setDemoBalance] = useState(10000);
  const [activeDemoTrades, setActiveDemoTrades] = useState([]);
  const [closedDemoTrades, setClosedDemoTrades] = useState([]);
  const [tradeSize, setTradeSize] = useState(100);

  useEffect(() => {
    // Load state from localStorage on mount
    const savedBalance = localStorage.getItem('sim_balance');
    const savedActive = localStorage.getItem('sim_active');
    const savedClosed = localStorage.getItem('sim_closed');
    const savedSize = localStorage.getItem('sim_trade_size');

    if (savedBalance) setDemoBalance(parseFloat(savedBalance));
    if (savedActive) setActiveDemoTrades(JSON.parse(savedActive));
    if (savedClosed) setClosedDemoTrades(JSON.parse(savedClosed));
    if (savedSize) setTradeSize(parseFloat(savedSize));
  }, []);

  const updateTradeSize = (size) => {
    setTradeSize(size);
    localStorage.setItem('sim_trade_size', size.toString());
  };

  const saveState = (balance, active, closed) => {
    localStorage.setItem('sim_balance', balance.toString());
    localStorage.setItem('sim_active', JSON.stringify(active));
    localStorage.setItem('sim_closed', JSON.stringify(closed));
  };

  const openSimTrade = (signal) => {
    // Basic deduplication: synchronously check localStorage to prevent race conditions with rapid signals
    const currentActive = JSON.parse(localStorage.getItem('sim_active') || '[]');
    if (currentActive.find(t => t.pair === signal.pair)) return;
    
    // Not enough balance
    if (demoBalance < tradeSize) return;

    const newTrade = {
      id: Date.now().toString(),
      pair: signal.pair,
      entryPrice: signal.entryPrice,
      qty: tradeSize / signal.entryPrice,
      invested: tradeSize,
      mode: signal.mode,
      tp1: signal.tp1 || signal.targets?.sellTarget,
      tp2: signal.tp2 || signal.targets?.sellTarget,
      sl: signal.targets?.stopLoss,
      status: 'OPEN',
      openTime: new Date().toISOString(),
      currentPnl: 0
    };

    const newBalance = demoBalance - tradeSize;
    const newActive = [...currentActive, newTrade];

    setDemoBalance(newBalance);
    setActiveDemoTrades(newActive);
    saveState(newBalance, newActive, closedDemoTrades);
  };

  const updateSimLivePrice = (pair, currentPrice) => {
    let hasChanges = false;
    let newBalance = demoBalance;
    let newActive = [...activeDemoTrades];
    let newClosed = [...closedDemoTrades];

    newActive = newActive.filter(trade => {
      if (trade.pair !== pair) return true;

      const pnl = (currentPrice - trade.entryPrice) * trade.qty;
      trade.currentPnl = pnl;
      hasChanges = true;

      // Check SL / TP
      let closeReason = null;
      if (currentPrice <= trade.sl) closeReason = 'SL_HIT';
      else if (currentPrice >= trade.tp2) closeReason = 'TP2_HIT'; // Wait for Max TP for simplicity

      if (closeReason) {
        trade.status = closeReason;
        trade.closePrice = currentPrice;
        trade.closeTime = new Date().toISOString();
        trade.finalPnl = pnl;
        
        // Return invested capital + profit/loss
        newBalance += (trade.invested + pnl);
        newClosed = [trade, ...newClosed].slice(0, 50); // Keep last 50
        return false; // Remove from active
      }

      return true; // Keep in active
    });

    if (hasChanges) {
      setDemoBalance(newBalance);
      setActiveDemoTrades(newActive);
      setClosedDemoTrades(newClosed);
      saveState(newBalance, newActive, newClosed);
    }
  };
  
  const resetSimulation = () => {
    setDemoBalance(10000);
    setActiveDemoTrades([]);
    setClosedDemoTrades([]);
    saveState(10000, [], []);
  }

  return {
    demoBalance,
    activeDemoTrades,
    closedDemoTrades,
    openSimTrade,
    updateSimLivePrice,
    resetSimulation,
    tradeSize,
    updateTradeSize
  };
}
