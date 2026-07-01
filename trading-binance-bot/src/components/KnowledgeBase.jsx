import React, { useState } from 'react';
import { BookOpen, TrendingUp, ShieldAlert, Award, Compass, HelpCircle } from 'lucide-react';

export default function KnowledgeBase() {
  const [activeTopic, setActiveTopic] = useState('rsi');

  const topics = {
    rsi: {
      title: 'RSI (Relative Strength Index)',
      icon: <TrendingUp className="text-glow-cyan" size={20} />,
      badge: 'Momentum Indicator',
      shortDesc: 'Measures the speed and change of price movements between 0 and 100.',
      explanation: 'RSI helps you identify if an asset is overbought (too expensive) or oversold (too cheap). For beginners, it is one of the most reliable indicators to avoid buying at the absolute peak.',
      rules: [
        'RSI > 70: Overbought (Asset might be overvalued, high risk of drop).',
        'RSI < 30: Oversold (Asset might be undervalued, potential buying opportunity).',
        'RSI at 50: Neutral momentum.'
      ],
      tip: 'Do not buy immediately just because RSI is < 30. Wait for the RSI to start turning back upwards as confirmation!'
    },
    macd: {
      title: 'MACD (Moving Average Convergence Divergence)',
      icon: <BookOpen className="text-glow-purple" size={20} />,
      badge: 'Trend-Following momentum',
      shortDesc: 'Shows the relationship between two moving averages of an asset\'s price.',
      explanation: 'MACD consists of a MACD line, a Signal line, and a histogram. It shows whether a trend is gaining strength or losing momentum. When these lines cross, they generate powerful signals.',
      rules: [
        'Bullish Crossover: MACD line crosses above the Signal line (Buy signal).',
        'Bearish Crossover: MACD line crosses below the Signal line (Sell signal).',
        'Histogram above zero: Bullish momentum is growing.'
      ],
      tip: 'MACD is great for spotting when a trend starts, but it is a lagging indicator. Combine it with RSI for faster reactions.'
    },
    riskManagement: {
      title: 'Risk Management 101',
      icon: <ShieldAlert className="text-glow-red" size={20} />,
      badge: 'Survival Skills',
      shortDesc: 'The rules that prevent you from losing all your trading capital.',
      explanation: 'Trading is about managing probability, not predicting the future with 100% accuracy. The best traders in the world fail 40-50% of the time, but they stay profitable because they lose small and win big.',
      rules: [
        'The 1% Rule: Never risk more than 1% to 2% of your total account value on a single trade.',
        'Always Use a Stop Loss: Set an automatic exit point if the market moves against you.',
        'Risk-to-Reward Ratio: Aim for at least a 1:2 ratio (Risk $10 to make $20).'
      ],
      tip: 'If you lose 50% of your account, you will need a 100% gain just to get back to even. Protect your capital first!'
    },
    tradingPsychology: {
      title: 'Trading Psychology',
      icon: <Award className="text-glow-green" size={20} />,
      badge: 'Mindset Mastery',
      shortDesc: 'Controlling Fear, Greed, and FOMO (Fear Of Missing Out).',
      explanation: 'Beginners usually lose money not because of bad charts, but because of emotions. Greed causes them to buy when prices are skyrocketing (FOMO), and fear causes them to sell at the exact bottom.',
      rules: [
        'Don\'t FOMO: If you missed a huge pump, wait for a pullback. There will always be another trade.',
        'Accept Losses: A loss is just a business expense. Don\'t hold a losing trade hoping it will recover.',
        'Stick to the Plan: Write down your entry and exit targets before starting the trade.'
      ],
      tip: 'Treat trading like a business, not a casino. Keep a trading journal to track your emotions.'
    },
    coinSelection: {
      title: 'Which Coin to Trade?',
      icon: <Compass className="text-glow-cyan" size={20} />,
      badge: 'Asset Selection Guide',
      shortDesc: 'How to pick the safest coins on Binance to practice on.',
      explanation: 'Binance list thousands of coins. 95% of them are extremely risky altcoins. As a beginner, you must start only with highly liquid, stable coins paired with USDT.',
      rules: [
        'Trade USDT Pairs: Focus on pairs ending in /USDT (e.g., BTC/USDT). USDT is equal to $1 USD, which makes calculating gains/losses very simple.',
        'Stick to the Top 3: BTC (Bitcoin), ETH (Ethereum), and SOL (Solana). These have massive volumes and are less prone to sudden 90% crashes.',
        'Avoid Low-Cap & Meme Coins: Avoid coins like DOGE, PEPE, or newly listed tokens. They are extremely volatile and easy for whales to manipulate.'
      ],
      tip: 'Always trade SPOT first. Avoid Futures trading (which uses leverage) as it can liquidate and wipe out your account in seconds!'
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <Compass size={24} className="text-glow-cyan" />
        <h2 style={{ margin: 0, color: 'var(--text-bright)' }}>Beginner Knowledge Base</h2>
      </div>
      
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', textAlign: 'left' }}>
        Learn technical indicators and risk principles. Click on any topic to explore the logic used by our prediction bot:
      </p>

      {/* Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {Object.keys(topics).map((key) => (
          <button
            key={key}
            onClick={() => setActiveTopic(key)}
            style={{
              padding: '0.75rem 0.5rem',
              borderRadius: '8px',
              border: activeTopic === key ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.05)',
              background: activeTopic === key ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.2)',
              color: activeTopic === key ? 'var(--text-bright)' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.8rem',
              fontWeight: activeTopic === key ? 'bold' : 'normal',
              transition: 'all 0.2s ease'
            }}
          >
            {topics[key].icon}
            <span>{topics[key].title.split(' ')[0] === 'Which' ? 'Coin selection' : topics[key].title.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* Active content */}
      <div 
        className="glass-card" 
        style={{ 
          padding: '1.25rem', 
          textAlign: 'left',
          backgroundColor: 'rgba(0,0,0,0.15)',
          borderLeft: `4px solid ${
            activeTopic === 'rsi' ? 'var(--neon-cyan)' :
            activeTopic === 'macd' ? 'var(--neon-purple)' :
            activeTopic === 'riskManagement' ? 'var(--neon-red)' :
            activeTopic === 'coinSelection' ? 'var(--neon-yellow)' :
            'var(--neon-green)'
          }`
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ 
            fontSize: '0.75rem', 
            textTransform: 'uppercase', 
            letterSpacing: '0.05em',
            padding: '2px 8px',
            borderRadius: '4px',
            backgroundColor: 'rgba(255,255,255,0.05)',
            color: 'var(--text-muted)'
          }}>
            {topics[activeTopic].badge}
          </span>
        </div>
        
        <h3 style={{ margin: '0 0 0.75rem 0', color: 'var(--text-bright)', fontSize: '1.1rem' }}>
          {topics[activeTopic].title}
        </h3>
        
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: '1.4' }}>
          {topics[activeTopic].explanation}
        </p>

        <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-bright)', fontSize: '0.9rem' }}>Key Rules to Remember:</h4>
        <ul style={{ paddingLeft: '1.25rem', margin: '0 0 1rem 0', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
          {topics[activeTopic].rules.map((rule, idx) => (
            <li key={idx} style={{ marginBottom: '0.25rem' }}>{rule}</li>
          ))}
        </ul>

        <div style={{ 
          padding: '0.75rem', 
          borderRadius: '8px', 
          backgroundColor: 'rgba(255, 210, 0, 0.05)', 
          border: '1px dashed rgba(255, 210, 0, 0.2)',
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'flex-start'
        }}>
          <HelpCircle size={16} style={{ color: 'var(--neon-yellow)', flexShrink: 0, marginTop: '2px' }} />
          <p style={{ fontSize: '0.8rem', color: 'var(--neon-yellow)', margin: 0, lineHeight: '1.4' }}>
            <strong>Pro Tip: </strong>{topics[activeTopic].tip}
          </p>
        </div>
      </div>
    </div>
  );
}
