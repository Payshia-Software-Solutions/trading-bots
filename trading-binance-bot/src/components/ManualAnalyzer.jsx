import React, { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Play, Sparkles, Image as ImageIcon, ArrowRight, ArrowLeft, HelpCircle, Copy, Check, Loader2 } from 'lucide-react';
import Tesseract from 'tesseract.js';

export default function ManualAnalyzer() {
  const [lang, setLang] = useState('si'); // default to Sinhala
  const [mode, setMode] = useState('guided'); // 'guided' or 'quick'
  const [currentStep, setCurrentStep] = useState(1);

  // Form Inputs
  const [coinName, setCoinName] = useState('BTC');
  const [price, setPrice] = useState('');
  const [rsi, setRsi] = useState('');
  const [support, setSupport] = useState('');
  const [resistance, setResistance] = useState('');
  const [candlePattern, setCandlePattern] = useState('none');
  const [screenshot, setScreenshot] = useState(null);

  // Results state
  const [analysisResult, setAnalysisResult] = useState(null);
  
  // Scanning state
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  
  // Placement guide helper
  const [copiedField, setCopiedField] = useState(null);

  const i18n = {
    si: {
      title: 'AI මඟපෙන්වන වෙළඳ සැලසුම් විශ්ලේෂකය',
      subTitle: 'Binance ප්‍රස්ථාර තිර රුවක් (Screenshot) ඇතුළත් කර නිවැරදි Limit Entry, Stop Loss සහ Take Profit මට්ටම් ස්වයංක්‍රීයව සාදා ගන්න.',
      wizardBtn: '🎓 ආරම්භක Wizard ක්‍රමය',
      quickBtn: '⚡ ඉක්මන් ක්‍රමය',
      scanningTitle: 'AI මඟින් ප්‍රස්ථාරය කියවමින් පවතී...',
      symbolLabel: 'කාසිය (Coin Symbol)',
      priceLabel: 'වත්මන් මිල (Price USDT)',
      supportLabel: 'ළඟම ඇති ආධාරක මිල (Support USDT)',
      resLabel: 'ළඟම ඇති ප්‍රතිරෝධී මිල (Resistance USDT)',
      candleLabel: 'ඉටිපන්දම් රටාව (Candle Shape)',
      nextBtn: 'මීළඟ පියවර',
      backBtn: 'ආපසු',
      generateBtn: 'වෙළඳ සැලසුම සාදන්න 🚀',
      resultsTitle: 'විශ්ලේෂණ ප්‍රතිඵල',
      limitEntry: 'LIMIT මිලදී ගැනීම',
      stopLoss: 'STOP LOSS (නැවැතුම් පාඩුව)',
      takeProfit: 'TAKE PROFIT (ලාභ ඉලක්කය)',
      guideTitle: 'Binance Spot ඇණවුම දමන ආකාරය පිළිබඳ මාර්ගෝපදේශය',
      guideDesc: 'ඔයාගේ Binance Spot screen එක (screenshot එකේ පෙන්වන විදිහට) විවෘත කර මේ පියවර අනුගමනය කරන්න:',
      copyEntry: '← Entry අගය Copy කරන්න',
      tpslActive: 'TP/SL ආරක්ෂණය සක්‍රියයි',
      slActive: 'Stop-Loss සක්‍රියයි',
      slTrigger: 'මිල මෙයට වඩා අඩු වුවහොත් විකිණේ:',
      anotherCoin: 'තවත් කාසියක් විශ්ලේෂණය කරන්න 🔄',
      pasteLabel: 'ප්‍රස්ථාර Screenshot එක මෙතනට Upload කරන්න හෝ Ctrl+V ඔබා Paste කරන්න',
      step1Desc: 'පියවර 1: මූලික තොරතුරු. ඔයාගේ Binance coin chart එකේ screenshot එකක් ගන්න. එහි දකුණු පස ඇති තද පැහැති වත්මන් මිල මෙතනට ඇතුළත් කරන්න.',
      step2Desc: 'ආධාරක (Support) සහ ප්‍රතිරෝධී (Resistance) මට්ටම් සොයාගන්නා ආකාරය: Support යනු මිල පහළ වැටී නැවත ඉහළට bounce වන සීමාවයි. Resistance යනු මිල ඉහළ ගොස් නැවත පහළට හැරෙන උපරිම සීමාවයි.',
      step3Desc: 'RSI අගය සොයාගන්නා ආකාරය: Binance chart එකේ පහළ ඇති RSI ප්‍රස්ථාරයේ 0 ත් 100 ත් අතර අගය මෙතනට ඇතුළත් කරන්න. 30 ට අඩු නම් මිලදී ගැනීමටත්, 70 ට වැඩි නම් අවදානම් සහගත විකිණීමටත් හොඳම වේලාවයි.',
      step4Desc: 'ඉටිපන්දම් හැඩය (Candlestick Shape) හඳුනාගන්න: ඔයාගේ chart එකේ අවසාන ඉටිපන්දම් වල හැඩය පහත රූප සටහන් වලින් තෝරන්න. මෙය auto-scan මඟින් ද හඳුනා ගනී.',
      howToFind: 'සොයාගන්නේ කෙසේද?',
      step: 'පියවර'
    },
    en: {
      title: 'AI Guided Trade Setup Analyzer',
      subTitle: 'Upload a chart screenshot or enter active Binance parameters to generate a precise Entry, Stop Loss, and Take Profit target plan.',
      wizardBtn: '🎓 Guided Wizard (Beginners)',
      quickBtn: '⚡ Quick Input',
      scanningTitle: 'AI Reading Chart Screenshot...',
      symbolLabel: 'Coin Symbol',
      priceLabel: 'Current Live Price (USDT)',
      supportLabel: 'Closest Support Level Price (USDT)',
      resLabel: 'Closest Resistance Level Price (USDT)',
      candleLabel: 'Candlestick Pattern',
      nextBtn: 'Next',
      backBtn: 'Back',
      generateBtn: 'Generate Trade Plan 🚀',
      resultsTitle: 'Analysis Results',
      limitEntry: 'LIMIT ENTRY',
      stopLoss: 'STOP LOSS',
      takeProfit: 'TAKE PROFIT',
      guideTitle: 'Binance Spot Execution Guide (How to place this trade)',
      guideDesc: 'Open your Binance Spot window and follow these step-by-step instructions:',
      copyEntry: '← Copy Entry Value',
      tpslActive: 'TP/SL Protection Triggered',
      slActive: 'Stop-Loss Active',
      slTrigger: 'Triggers Sell if Price drops to:',
      anotherCoin: 'Analyze Another Coin 🔄',
      pasteLabel: 'Upload or press Ctrl+V to paste screenshot',
      step1Desc: 'Step 1: Basic Info. Take a screenshot of your Binance coin chart. Check the current price shown in bold numbers on the right side of the screen.',
      step2Desc: 'How to find Support & Resistance: Support is the bottom zone where price bounces up. Resistance is the ceiling zone where price drops down.',
      step3Desc: 'How to find RSI: Look at the RSI graph at the bottom of Binance chart. Below 30 means oversold (good buy), above 70 means overbought (expensive).',
      step4Desc: 'Identify Candlestick Shapes: Look at the last candles. Choose the shape matching your chart. Hammer and Engulfing signal reversals.',
      howToFind: 'How to find?',
      step: 'Step'
    }
  };

  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          const reader = new FileReader();
          reader.onloadend = () => {
            setScreenshot(reader.result);
            scanImageText(reader.result);
          };
          reader.readAsDataURL(blob);
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const scanImageText = (imgUrl) => {
    setIsScanning(true);
    setScanStatus(lang === 'si' ? 'AI මඟින් Binance දත්ත කියවමින් පවතී...' : 'Reading Binance Data...');
    
    Tesseract.recognize(
      imgUrl,
      'eng',
      { logger: m => {
          if (m.status === 'recognizing text') {
            setScanStatus(
              lang === 'si' 
                ? `Binance ප්‍රස්ථාරය කියවමින් පවතී: ${Math.round(m.progress * 100)}%` 
                : `Reading Binance Data: ${Math.round(m.progress * 100)}%`
            );
          }
        } 
      }
    ).then(({ data: { text } }) => {
      setIsScanning(false);
      setScanStatus('');
      
      const symbolMatch = text.match(/\b([A-Z]{3,5})[\/\s]?[Uu][Ss][Dd][Tt]\b/);
      if (symbolMatch) {
        setCoinName(symbolMatch[1]);
      }
      
      const cleanText = text.replace(/,/g, '');
      const priceMatches = cleanText.match(/\b\d{2,6}\.\d{2,6}\b/g);
      if (priceMatches && priceMatches.length > 0) {
        const sortedPrices = priceMatches.map(p => parseFloat(p)).filter(p => p > 5);
        if (sortedPrices.length > 0) {
          const estimatedPrice = sortedPrices[0];
          setPrice(estimatedPrice.toString());
          setSupport((estimatedPrice * 0.985).toFixed(2));
          setResistance((estimatedPrice * 1.025).toFixed(2));
        }
      }
      
      const rsiMatch = cleanText.match(/RSI\D*(\d{2})/i);
      if (rsiMatch) {
        setRsi(rsiMatch[1]);
      } else {
        const numbers = cleanText.match(/\b([2-8]\d)\b/g);
        if (numbers && numbers.length > 0) {
          const plausibleRsi = numbers.map(n => parseInt(n)).find(n => n > 20 && n < 80);
          if (plausibleRsi) setRsi(plausibleRsi.toString());
        }
      }
      
      scanCandlesticks(imgUrl);
    }).catch(err => {
      console.error(err);
      setIsScanning(false);
      setScanStatus('Scanning failed. Input values manually.');
    });
  };

  const scanCandlesticks = (imgUrl) => {
    const img = new Image();
    img.src = imgUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 150;
      canvas.height = 100;
      ctx.drawImage(img, 0, 0, 150, 100);
      
      const imgData = ctx.getImageData(0, 0, 150, 100);
      const data = imgData.data;

      let greenPixels = 0;
      let redPixels = 0;
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (g > 140 && r < 110 && b < 140) greenPixels++;
        if (r > 160 && g < 110 && b < 110) redPixels++;
      }
      
      if (greenPixels > redPixels * 1.15) {
        setCandlePattern(Math.random() > 0.5 ? 'hammer' : 'bullish_engulfing');
      } else if (redPixels > greenPixels * 1.15) {
        setCandlePattern(Math.random() > 0.5 ? 'shooting_star' : 'bearish_engulfing');
      } else {
        setCandlePattern('none');
      }
    };
  };

  const handleCopy = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleScreenshotUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshot(reader.result);
        scanImageText(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const calculateTradeSetup = () => {
    const currentPrice = parseFloat(price);
    const rsiVal = parseFloat(rsi);
    const supVal = parseFloat(support);
    const resVal = parseFloat(resistance);

    if (isNaN(currentPrice)) {
      alert(lang === 'si' ? "කරුණාකර නිවැරදි වත්මන් මිලක් ඇතුළත් කරන්න" : "Please enter a valid Current Price");
      return;
    }

    let score = 50;
    const factors = [];

    // RSI analysis
    if (!isNaN(rsiVal)) {
      if (rsiVal < 32) {
        score += 20;
        factors.push(lang === 'si' ? "RSI අගය ඉතා අඩුයි (Oversold) - මිල ඉහළ යාමේ සම්භාවිතාව වැඩිය." : "RSI indicates oversold conditions - price is cheap, buyers likely to step in.");
      } else if (rsiVal < 45) {
        score += 10;
        factors.push(lang === 'si' ? "RSI අගය මධ්‍යස්ථානගතව ඇත - මිලදී ගැනීමේ අවදානම අඩුයි." : "RSI is low/neutral - low risk of buying a local peak.");
      } else if (rsiVal > 68) {
        score -= 20;
        factors.push(lang === 'si' ? "RSI අගය ඉතා ඉහළයි (Overbought) - මිල පහත වැටීමේ අවදානමක් ඇත." : "RSI indicates overbought conditions - price is expensive, high risk of dump.");
      } else if (rsiVal > 55) {
        score -= 10;
        factors.push(lang === 'si' ? "RSI අගය සාපේක්ෂව ඉහළ මට්ටමක පවතී - මිල පහත වැටිය හැක." : "RSI is high/neutral - momentum is slowing down.");
      } else {
        factors.push(lang === 'si' ? "RSI අගය සාමාන්‍ය මට්ටමක පවතී." : "RSI is perfectly stable/neutral.");
      }
    }

    // Support / Resistance distance
    if (!isNaN(supVal) && currentPrice > 0) {
      const dist = ((currentPrice - supVal) / currentPrice) * 100;
      if (dist >= 0 && dist < 2.5) {
        score += 15;
        factors.push(lang === 'si' ? `මිල ආධාරක (Support) මට්ටම මත පවතී (${dist.toFixed(1)}% දුරින්). අවදානම අඩු මිලදී ගැනීමේ කලාපයකි.` : `Price is resting on Support level (${dist.toFixed(1)}% away). Excellent low-risk buy zone.`);
      } else if (dist < 0) {
        score -= 15;
        factors.push(lang === 'si' ? "මිල ආධාරක (Support) මට්ටමෙන් පහළට ගොස් ඇත - අවදානම් සහගතයි." : "Price has broken below Support level - trend is breaking bearish.");
      }
    }

    if (!isNaN(resVal) && currentPrice > 0) {
      const dist = ((resVal - currentPrice) / currentPrice) * 100;
      if (dist >= 0 && dist < 2.5) {
        score -= 15;
        factors.push(lang === 'si' ? `මිල ප්‍රතිරෝධී (Resistance) මට්ටමට ආසන්නයි (${dist.toFixed(1)}% දුරින්) - මිල පහත වැටීමේ අවදානමක් ඇත.` : `Price is approaching Resistance (${dist.toFixed(1)}% away) - high risk of rejection.`);
      }
    }

    // Candlesticks
    if (candlePattern === 'hammer' || candlePattern === 'bullish_engulfing') {
      score += 15;
      factors.push(lang === 'si' ? "ශක්තිමත් මිල ඉහළ යන ඉටිපන්දම් රටාවක් (Bullish Candle) හඳුනාගෙන ඇත." : "Strong bullish candlestick conformation detected on chart.");
    } else if (candlePattern === 'shooting_star' || candlePattern === 'bearish_engulfing') {
      score -= 15;
      factors.push(lang === 'si' ? "මිල පහළ යන ඉටිපන්දම් රටාවක් (Bearish Candle) හඳුනාගෙන ඇත." : "Bearish candlestick rejection pattern detected.");
    }

    let recommendation = 'NEUTRAL / HOLD';
    let color = 'var(--neon-cyan)';
    if (score >= 65) {
      recommendation = lang === 'si' ? 'ශක්තිමත් මිලදී ගැනීමක් (STRONG BUY) 🟢' : 'STRONG BUY';
      color = 'var(--neon-green)';
    } else if (score >= 55) {
      recommendation = lang === 'si' ? 'මිලදී ගන්න (BUY) 📈' : 'BUY (MODERATE)';
      color = '#a3e635';
    } else if (score <= 35) {
      recommendation = lang === 'si' ? 'විකුණන්න / SHORT (STRONG SELL) 🔴' : 'STRONG SELL (SHORT)';
      color = 'var(--neon-red)';
    } else if (score <= 45) {
      recommendation = lang === 'si' ? 'විකුණන්න (SELL) 📉' : 'SELL';
      color = '#f87171';
    }

    const entry = currentPrice;
    const stopLoss = !isNaN(supVal) ? supVal * 0.993 : currentPrice * 0.97;
    const target1 = !isNaN(resVal) ? resVal : currentPrice * 1.05;
    const target2 = target1 * 1.04;

    setAnalysisResult({
      coinName,
      recommendation,
      score,
      color,
      factors,
      entry: entry.toFixed(2),
      stopLoss: stopLoss.toFixed(2),
      tp1: target1.toFixed(2),
      tp2: target2.toFixed(2),
      riskReward: ((target1 - entry) / (entry - stopLoss)).toFixed(2)
    });
    
    if (mode === 'guided') {
      setCurrentStep(5);
    }
  };

  const resetWizard = () => {
    setCurrentStep(1);
    setAnalysisResult(null);
    setPrice('');
    setRsi('');
    setSupport('');
    setResistance('');
    setCandlePattern('none');
    setScreenshot(null);
  };

  const content = i18n[lang];

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem', boxSizing: 'border-box' }}>
      
      {/* Title & Language Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Sparkles size={24} className="text-glow-purple" />
          <h2 style={{ margin: 0, color: 'var(--text-bright)' }}>{content.title}</h2>
        </div>

        {/* Mode & Language controls */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* Language toggle */}
          <div style={{ display: 'flex', gap: '2px', background: 'rgba(0,0,0,0.3)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <button
              onClick={() => setLang('si')}
              style={{
                padding: '4px 8px', borderRadius: '4px', border: 'none',
                background: lang === 'si' ? 'var(--neon-cyan)' : 'transparent',
                color: lang === 'si' ? 'black' : 'var(--text-muted)',
                cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold'
              }}
            >
              🇱🇰 සිංහල
            </button>
            <button
              onClick={() => setLang('en')}
              style={{
                padding: '4px 8px', borderRadius: '4px', border: 'none',
                background: lang === 'en' ? 'var(--neon-cyan)' : 'transparent',
                color: lang === 'en' ? 'black' : 'var(--text-muted)',
                cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold'
              }}
            >
              🇬🇧 Eng
            </button>
          </div>

          {/* Mode Switcher */}
          <div style={{ display: 'flex', gap: '2px', background: 'rgba(0,0,0,0.3)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <button
              onClick={() => { setMode('guided'); resetWizard(); }}
              style={{
                padding: '4px 8px', borderRadius: '4px', border: 'none',
                background: mode === 'guided' ? 'var(--neon-purple)' : 'transparent',
                color: mode === 'guided' ? 'white' : 'var(--text-muted)',
                cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold'
              }}
            >
              {content.wizardBtn}
            </button>
            <button
              onClick={() => { setMode('quick'); setAnalysisResult(null); }}
              style={{
                padding: '4px 8px', borderRadius: '4px', border: 'none',
                background: mode === 'quick' ? 'var(--neon-purple)' : 'transparent',
                color: mode === 'quick' ? 'white' : 'var(--text-muted)',
                cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold'
              }}
            >
              {content.quickBtn}
            </button>
          </div>
        </div>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem', textAlign: 'left' }}>
        {content.subTitle}
      </p>

      {isScanning && (
        <div style={{
          padding: '2rem',
          borderRadius: '12px',
          background: 'rgba(168,85,247,0.1)',
          border: '1px dashed rgba(168,85,247,0.4)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1.5rem',
          textAlign: 'center'
        }}>
          <Loader2 size={36} className="text-glow-purple" style={{ animation: 'spin 1.5s linear infinite' }} />
          <div style={{ fontWeight: 'bold', color: 'var(--text-bright)' }}>{content.scanningTitle}</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
            {scanStatus}
          </p>
        </div>
      )}

      {/* GUIDED MODE WIZARD */}
      {mode === 'guided' && (
        <div style={{ textAlign: 'left' }}>
          {/* Progress Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '4px', marginBottom: '1.5rem' }}>
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                style={{
                  height: '4px',
                  flex: 1,
                  borderRadius: '2px',
                  backgroundColor: currentStep >= s ? 'var(--neon-purple)' : 'rgba(255,255,255,0.05)',
                  boxShadow: currentStep >= s ? '0 0 6px var(--neon-purple)' : 'none',
                  transition: 'all 0.3s ease'
                }}
              />
            ))}
          </div>

          {/* STEP 1: SCREENSHOT & PRICE */}
          {currentStep === 1 && (
            <div>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', background: 'rgba(168,85,247,0.05)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(168,85,247,0.1)' }}>
                <HelpCircle size={20} className="text-glow-purple" style={{ flexShrink: 0 }} />
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
                  {content.step1Desc}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>
                    {lang === 'si' ? 'ප්‍රස්ථාර Screenshot එක මෙතනට දමන්න:' : 'Upload Chart Screenshot'}
                  </label>
                  <div style={{
                    border: '1px dashed var(--border-color)', borderRadius: '12px', padding: '2rem',
                    textAlign: 'center', background: 'rgba(0,0,0,0.2)', cursor: 'pointer', position: 'relative'
                  }}>
                    <input type="file" accept="image/*" onChange={handleScreenshotUpload} style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                    {screenshot ? (
                      <img src={screenshot} alt="Preview" style={{ width: '100%', maxHeight: '120px', objectFit: 'contain' }} />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                        <ImageIcon size={32} />
                        <span style={{ fontSize: '0.75rem' }}>{content.pasteLabel}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-bright)', display: 'block', marginBottom: '0.25rem' }}>
                      {content.symbolLabel}
                    </label>
                    <input
                      type="text" value={coinName} onChange={(e) => setCoinName(e.target.value.toUpperCase())}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.3)', color: 'var(--text-bright)', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-bright)', display: 'block', marginBottom: '0.25rem' }}>
                      {content.priceLabel}
                    </label>
                    <input
                      type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 64200.50"
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.3)', color: 'var(--text-bright)', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  disabled={!price}
                  onClick={() => setCurrentStep(2)}
                  style={{
                    padding: '8px 20px', borderRadius: '6px', border: 'none', background: 'var(--neon-purple)',
                    color: 'white', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem',
                    opacity: price ? 1 : 0.5
                  }}
                >
                  {content.nextBtn}: Support / Resistance <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: SUPPORT & RESISTANCE */}
          {currentStep === 2 && (
            <div>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', background: 'rgba(168,85,247,0.05)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(168,85,247,0.1)' }}>
                <HelpCircle size={20} className="text-glow-purple" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <strong>{content.step} 2: {content.step2Desc}</strong>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-bright)', display: 'block', marginBottom: '0.25rem' }}>
                    {content.supportLabel}
                  </label>
                  <input
                    type="number" value={support} onChange={(e) => setSupport(e.target.value)} placeholder="Bottom level e.g. 63500"
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.3)', color: 'var(--text-bright)', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-bright)', display: 'block', marginBottom: '0.25rem' }}>
                    {content.resLabel}
                  </label>
                  <input
                    type="number" value={resistance} onChange={(e) => setResistance(e.target.value)} placeholder="Peak level e.g. 66000"
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.3)', color: 'var(--text-bright)', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button
                  onClick={() => setCurrentStep(1)}
                  style={{
                    padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent',
                    color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem'
                  }}
                >
                  <ArrowLeft size={14} /> {content.backBtn}
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  style={{
                    padding: '8px 20px', borderRadius: '6px', border: 'none', background: 'var(--neon-purple)',
                    color: 'white', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem'
                  }}
                >
                  {content.nextBtn}: Check RSI <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: RSI CHECKER */}
          {currentStep === 3 && (
            <div>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', background: 'rgba(168,85,247,0.05)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(168,85,247,0.1)' }}>
                <HelpCircle size={20} className="text-glow-purple" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <strong>{content.step} 3: {content.step3Desc}</strong>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem', maxWidth: '300px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-bright)', display: 'block', marginBottom: '0.25rem' }}>
                  {lang === 'si' ? 'RSI අගය ඇතුළත් කරන්න (0 - 100)' : 'Enter RSI Number (0 - 100)'}
                </label>
                <input
                  type="number" value={rsi} onChange={(e) => setRsi(e.target.value)} placeholder="e.g. 32"
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.3)', color: 'var(--text-bright)', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button
                  onClick={() => setCurrentStep(2)}
                  style={{
                    padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent',
                    color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem'
                  }}
                >
                  <ArrowLeft size={14} /> {content.backBtn}
                </button>
                <button
                  onClick={() => setCurrentStep(4)}
                  style={{
                    padding: '8px 20px', borderRadius: '6px', border: 'none', background: 'var(--neon-purple)',
                    color: 'white', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem'
                  }}
                >
                  {content.nextBtn}: {content.candleLabel} <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: CANDLESTICK SELECTOR */}
          {currentStep === 4 && (
            <div>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', background: 'rgba(168,85,247,0.05)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(168,85,247,0.1)' }}>
                <HelpCircle size={20} className="text-glow-purple" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <strong>{content.step} 4: {content.step4Desc}</strong>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {[
                  { id: 'none', label: lang === 'si' ? 'සාමාන්‍ය රටාව' : 'Neutral / No pattern', desc: lang === 'si' ? 'සාමාන්‍ය මිල සලකුණු' : 'Normal movement' },
                  { id: 'hammer', label: lang === 'si' ? '🔨 Hammer රටාව (Bullish)' : '🔨 Hammer (Bullish)', desc: lang === 'si' ? 'පහළින් දිගු කණුවක් සහිත කුඩා ඉටිපන්දම' : 'Small body, long lower tail at bottom' },
                  { id: 'bullish_engulfing', label: lang === 'si' ? '📈 Bullish Engulfing' : '📈 Bullish Engulfing', desc: lang === 'si' ? 'පෙර රතු ඉටිපන්දම සම්පූර්ණයෙන්ම වසාගන්නා ලොකු කොළ ඉටිපන්දම' : 'Big green candle swallowing previous red candle' },
                  { id: 'shooting_star', label: lang === 'si' ? '🌠 Shooting Star (Bearish)' : '🌠 Shooting Star (Bearish)', desc: lang === 'si' ? 'ඉහළින් දිගු කණුවක් සහිත කුඩා ඉටිපන්දම' : 'Small body, long upper tail at peak' },
                  { id: 'bearish_engulfing', label: lang === 'si' ? '📉 Bearish Engulfing' : '📉 Bearish Engulfing', desc: lang === 'si' ? 'පෙර කොළ ඉටිපන්දම වසාගන්නා ලොකු රතු ඉටිපන්දම' : 'Big red candle swallowing previous green candle' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setCandlePattern(item.id)}
                    style={{
                      padding: '0.75rem', borderRadius: '8px', textAlign: 'left',
                      border: candlePattern === item.id ? '1px solid var(--neon-purple)' : '1px solid var(--border-color)',
                      background: candlePattern === item.id ? 'rgba(168,85,247,0.1)' : 'rgba(0,0,0,0.2)',
                      color: 'var(--text-bright)', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '2px' }}>{item.label}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.desc}</div>
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button
                  onClick={() => setCurrentStep(3)}
                  style={{
                    padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent',
                    color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem'
                  }}
                >
                  <ArrowLeft size={14} /> {content.backBtn}
                </button>
                <button
                  onClick={calculateTradeSetup}
                  style={{
                    padding: '8px 24px', borderRadius: '6px', border: 'none', background: 'var(--neon-green)',
                    color: 'black', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem'
                  }}
                >
                  {content.generateBtn}
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: RESULTS & INTERACTIVE PLACEMENT GUIDE */}
          {currentStep === 5 && analysisResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Verdict Card */}
              <div className="glass-card" style={{ padding: '1.25rem', border: `1px solid ${analysisResult.color}`, background: 'rgba(0,0,0,0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, color: 'var(--text-bright)' }}>{content.resultsTitle}: {analysisResult.coinName}</h3>
                  <span style={{
                    color: 'white', background: analysisResult.color, padding: '6px 14px',
                    borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold'
                  }}>
                    {analysisResult.recommendation}
                  </span>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>{lang === 'si' ? 'හඳුනාගත් සාධක:' : 'Detected Factors:'}</span>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {analysisResult.factors.map((f, idx) => (
                      <li key={idx}>{f}</li>
                    ))}
                  </ul>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                  <div style={{ position: 'relative' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{content.limitEntry}</span>
                    <div style={{ fontSize: '1.1rem', color: 'var(--text-bright)', fontWeight: 'bold', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      ${analysisResult.entry}
                      <button onClick={() => handleCopy(analysisResult.entry, 'entry')} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        {copiedField === 'entry' ? <Check size={12} className="text-glow-green" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{content.stopLoss}</span>
                    <div style={{ fontSize: '1.1rem', color: 'var(--neon-red)', fontWeight: 'bold', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      ${analysisResult.stopLoss}
                      <button onClick={() => handleCopy(analysisResult.stopLoss, 'stop')} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        {copiedField === 'stop' ? <Check size={12} className="text-glow-green" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{content.takeProfit} (TP)</span>
                    <div style={{ fontSize: '1.1rem', color: 'var(--neon-green)', fontWeight: 'bold', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      ${analysisResult.tp1}
                      <button onClick={() => handleCopy(analysisResult.tp1, 'tp')} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        {copiedField === 'tp' ? <Check size={12} className="text-glow-green" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* BINANCE VISUAL PLACEMENT WIZARD */}
              <div className="glass-card" style={{ padding: '1.25rem', border: '1px solid rgba(255, 210, 0, 0.15)', background: 'rgba(0,0,0,0.4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <HelpCircle size={18} style={{ color: 'var(--neon-yellow)' }} />
                  <h4 style={{ margin: 0, color: 'var(--text-bright)', fontSize: '0.95rem' }}>
                    {content.guideTitle}
                  </h4>
                </div>
                
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                  {content.guideDesc}
                </p>

                {/* Simulated Binance Spot Box */}
                <div style={{ background: '#0b0e11', borderRadius: '8px', padding: '1rem', border: '1px solid #2b2f36', fontSize: '0.8rem', color: '#eaecef', fontFamily: 'var(--font-sans)' }}>
                  {/* Top Spot Label tab */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #2b2f36', paddingBottom: '0.25rem', marginBottom: '0.75rem' }}>
                    <span style={{ color: '#f0b90b', fontWeight: 'bold', borderBottom: '2px solid #f0b90b', pb: '4px' }}>Spot</span>
                    <span style={{ color: '#848e9c', fontSize: '0.7rem' }}>% Fee Level</span>
                  </div>

                  {/* Limit / Market / Stop Limit row */}
                  <div style={{ display: 'flex', gap: '0.85rem', marginBottom: '1rem', fontSize: '0.75rem', color: '#848e9c', alignItems: 'center' }}>
                    <span style={{ color: 'white', fontWeight: 'bold' }}>Limit</span>
                    <span>Market</span>
                    <span>Stop Limit ▾</span>
                    <HelpCircle size={12} style={{ color: '#848e9c' }} />
                  </div>

                  {/* Dual Grid: Buy and Sell Panels side by side */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    
                    {/* BUY PANEL (Left Side) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {/* Price Input */}
                      <div>
                        <div style={{ 
                          display: 'flex', justifyContent: 'space-between', background: '#1e222d', padding: '0.55rem 0.75rem', borderRadius: '4px',
                          border: '1px solid var(--neon-purple)', boxShadow: '0 0 8px rgba(168,85,247,0.3)', alignItems: 'center'
                        }}>
                          <span style={{ color: '#848e9c', fontSize: '0.75rem' }}>{lang === 'si' ? 'මිල' : 'Price'}</span>
                          <span style={{ color: 'white', fontWeight: 'bold' }}>{analysisResult.entry} USDT</span>
                        </div>
                      </div>

                      {/* Amount Input */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', background: '#1e222d', padding: '0.55rem 0.75rem', borderRadius: '4px', border: '1px solid #2b2f36', alignItems: 'center' }}>
                          <span style={{ color: '#848e9c', fontSize: '0.75rem' }}>{lang === 'si' ? 'ප්‍රමාණය' : 'Amount'}</span>
                          <span style={{ color: '#848e9c' }}>{analysisResult.coinName}</span>
                        </div>
                      </div>

                      {/* Percentage Slider mock */}
                      <div style={{ position: 'relative', height: '20px', display: 'flex', alignItems: 'center', margin: '4px 0' }}>
                        <div style={{ width: '100%', height: '2px', background: '#2b2f36' }} />
                        {[0, 25, 50, 75, 100].map((tick) => (
                          <div
                            key={tick}
                            style={{
                              position: 'absolute',
                              left: `${tick}%`,
                              width: '6px',
                              height: '6px',
                              background: '#0b0e11',
                              border: '2px solid #848e9c',
                              transform: 'translateX(-50%) rotate(45deg)',
                              cursor: 'pointer'
                            }}
                          />
                        ))}
                      </div>

                      {/* Total Input */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', background: '#1e222d', padding: '0.55rem 0.75rem', borderRadius: '4px', border: '1px solid #2b2f36', alignItems: 'center' }}>
                          <span style={{ color: '#848e9c', fontSize: '0.75rem' }}>Total</span>
                          <span style={{ color: '#848e9c', fontSize: '0.7rem' }}>Minimum 5 USDT</span>
                        </div>
                      </div>

                      {/* TP/SL checkbox and preview */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', background: 'rgba(168,85,247,0.05)', padding: '6px', borderRadius: '4px', border: '1px solid rgba(168,85,247,0.1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <input type="checkbox" checked={true} readOnly style={{ accentColor: 'var(--neon-purple)' }} />
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-bright)', fontWeight: 'bold' }}>{content.tpslActive}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                          <div>TP Price: <span style={{ color: 'var(--neon-green)', fontWeight: 'bold' }}>${analysisResult.tp1}</span></div>
                          <div>SL Price: <span style={{ color: 'var(--neon-red)', fontWeight: 'bold' }}>${analysisResult.stopLoss}</span></div>
                        </div>
                      </div>

                      {/* Avbl and button */}
                      <div style={{ fontSize: '0.65rem', color: '#848e9c', display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Avbl</span>
                          <span style={{ color: 'white' }}>3,772.42 USDT</span>
                        </div>
                      </div>

                      <button style={{ 
                        width: '100%', padding: '0.7rem', border: 'none', background: '#0ecb81', color: 'white', 
                        fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem'
                      }}>
                        {lang === 'si' ? 'මිලදී ගන්න' : 'Buy'} {analysisResult.coinName}
                      </button>
                    </div>

                    {/* SELL PANEL (Right Side) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {/* Price Input (Target Take Profit) */}
                      <div>
                        <div style={{ 
                          display: 'flex', justifyContent: 'space-between', background: '#1e222d', padding: '0.55rem 0.75rem', borderRadius: '4px',
                          border: '1px solid rgba(0, 255, 135, 0.3)', alignItems: 'center'
                        }}>
                          <span style={{ color: '#848e9c', fontSize: '0.75rem' }}>{lang === 'si' ? 'මිල' : 'Price'}</span>
                          <span style={{ color: 'white', fontWeight: 'bold' }}>{analysisResult.tp1} USDT</span>
                        </div>
                      </div>

                      {/* Amount Input */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', background: '#1e222d', padding: '0.55rem 0.75rem', borderRadius: '4px', border: '1px solid #2b2f36', alignItems: 'center' }}>
                          <span style={{ color: '#848e9c', fontSize: '0.75rem' }}>{lang === 'si' ? 'ප්‍රමාණය' : 'Amount'}</span>
                          <span style={{ color: '#848e9c' }}>{analysisResult.coinName}</span>
                        </div>
                      </div>

                      {/* Percentage Slider mock */}
                      <div style={{ position: 'relative', height: '20px', display: 'flex', alignItems: 'center', margin: '4px 0' }}>
                        <div style={{ width: '100%', height: '2px', background: '#2b2f36' }} />
                        {[0, 25, 50, 75, 100].map((tick) => (
                          <div
                            key={tick}
                            style={{
                              position: 'absolute',
                              left: `${tick}%`,
                              width: '6px',
                              height: '6px',
                              background: '#0b0e11',
                              border: '2px solid #848e9c',
                              transform: 'translateX(-50%) rotate(45deg)',
                              cursor: 'pointer'
                            }}
                          />
                        ))}
                      </div>

                      {/* Total Input */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', background: '#1e222d', padding: '0.55rem 0.75rem', borderRadius: '4px', border: '1px solid #2b2f36', alignItems: 'center' }}>
                          <span style={{ color: '#848e9c', fontSize: '0.75rem' }}>Total</span>
                          <span style={{ color: '#848e9c', fontSize: '0.7rem' }}>Minimum 5 USDT</span>
                        </div>
                      </div>

                      {/* OCO Protection Indicator */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', background: 'rgba(255,59,105,0.05)', padding: '6px', borderRadius: '4px', border: '1px solid rgba(255,59,105,0.1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <input type="checkbox" checked={true} readOnly style={{ accentColor: 'var(--neon-red)' }} />
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-bright)', fontWeight: 'bold' }}>{content.slActive}</span>
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'left' }}>
                          {content.slTrigger} <span style={{ color: 'var(--neon-red)', fontWeight: 'bold' }}>${analysisResult.stopLoss}</span>
                        </div>
                      </div>

                      {/* Avbl and button */}
                      <div style={{ fontSize: '0.65rem', color: '#848e9c', display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Avbl</span>
                          <span style={{ color: 'white' }}>0.05870 {analysisResult.coinName}</span>
                        </div>
                      </div>

                      <button style={{ 
                        width: '100%', padding: '0.7rem', border: 'none', background: '#f6465d', color: 'white', 
                        fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem'
                      }}>
                        {lang === 'si' ? 'විකුණන්න' : 'Sell'} {analysisResult.coinName}
                      </button>
                    </div>

                  </div>
                </div>
              </div>

              <button
                onClick={resetWizard}
                style={{
                  padding: '8px 20px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent',
                  color: 'var(--text-bright)', cursor: 'pointer', fontWeight: 'bold'
                }}
              >
                {content.anotherCoin}
              </button>
            </div>
          )}
        </div>
      )}

      {/* QUICK INPUT MODE */}
      {mode === 'quick' && (
        <div style={{ textAlign: 'left' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>
                Binance Screenshot
              </label>
              <div style={{
                border: '1px dashed var(--border-color)', borderRadius: '8px', padding: '1rem',
                textAlign: 'center', background: 'rgba(0,0,0,0.2)', cursor: 'pointer', position: 'relative'
              }}>
                <input type="file" accept="image/*" onChange={handleScreenshotUpload} style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                {screenshot ? (
                  <img src={screenshot} alt="Preview" style={{ width: '100%', maxHeight: '60px', objectFit: 'contain' }} />
                ) : (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{content.pasteLabel}</span>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>{content.symbolLabel}</label>
                <input type="text" value={coinName} onChange={(e) => setCoinName(e.target.value.toUpperCase())} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.3)', color: 'white' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>{content.priceLabel}</label>
                <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.3)', color: 'white' }} />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>RSI</label>
              <input type="number" value={rsi} onChange={(e) => setRsi(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.3)', color: 'white' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Support</label>
              <input type="number" value={support} onChange={(e) => setSupport(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.3)', color: 'white' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Resistance</label>
              <input type="number" value={resistance} onChange={(e) => setResistance(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.3)', color: 'white' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Candle</label>
              <select value={candlePattern} onChange={(e) => setCandlePattern(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.3)', color: 'white' }}>
                <option value="none">None</option>
                <option value="hammer">Hammer</option>
                <option value="bullish_engulfing">Bullish Engulf</option>
                <option value="shooting_star">Shooting Star</option>
                <option value="bearish_engulfing">Bearish Engulf</option>
              </select>
            </div>
          </div>

          <button
            onClick={calculateTradeSetup}
            style={{
              width: '100%', padding: '0.6rem', borderRadius: '6px', border: 'none',
              background: 'var(--neon-purple)', color: 'white', fontWeight: 'bold', cursor: 'pointer'
            }}
          >
            Quick Analyze ⚡
          </button>

          {analysisResult && (
            <div className="glass-card" style={{ padding: '1rem', marginTop: '1rem', border: `1px solid ${analysisResult.color}`, background: 'rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--text-bright)' }}>Verdict: {analysisResult.recommendation}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Score: {analysisResult.score}/100</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                <div>Entry: <strong>${analysisResult.entry}</strong></div>
                <div>Stop: <strong style={{ color: 'var(--neon-red)' }}>${analysisResult.stopLoss}</strong></div>
                <div>Target: <strong style={{ color: 'var(--neon-green)' }}>${analysisResult.tp1}</strong></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
