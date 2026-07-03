"use client";
import React, { useEffect, useRef } from 'react';
import { createChart, CandlestickSeries, LineSeries } from 'lightweight-charts';

export default function TradingChart({ data, targets, theme = 'dark' }) {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const ema7Ref = useRef(null);
  const ema25Ref = useRef(null);
  const ema99Ref = useRef(null);
  const projectedPathRef = useRef(null);
  const snapshotSeriesRef = useRef([]);

  const [legend, setLegend] = React.useState(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create Chart
    const isDark = theme === 'dark';
    const textColor = isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)';

    const chart = createChart(chartContainerRef.current, {
      autoSize: true,
      layout: {
        background: { type: 'solid', color: 'transparent' },
        textColor: textColor,
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      crosshair: {
        mode: 0,
      },
      rightPriceScale: {
        borderColor: borderColor,
        autoScale: true,
      },
      timeScale: {
        borderColor: borderColor,
        timeVisible: true,
        fixLeftEdge: false,
        fixRightEdge: false,
        rightOffset: 15,
      },
    });

    // Add Candlestick Series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10B981',
      downColor: '#EF4444',
      borderDownColor: '#EF4444',
      borderUpColor: '#10B981',
      wickDownColor: '#EF4444',
      wickUpColor: '#10B981',
    });

    const ema7Series = chart.addSeries(LineSeries, { color: '#EAB308', lineWidth: 1, crosshairMarkerVisible: false, lastValueVisible: false, priceLineVisible: false });
    const ema25Series = chart.addSeries(LineSeries, { color: '#EC4899', lineWidth: 1, crosshairMarkerVisible: false, lastValueVisible: false, priceLineVisible: false });
    const ema99Series = chart.addSeries(LineSeries, { color: '#8B5CF6', lineWidth: 1, crosshairMarkerVisible: false, lastValueVisible: false, priceLineVisible: false });
    const projectedPathSeries = chart.addSeries(LineSeries, { 
      color: '#00ff88', 
      lineWidth: 2, 
      lineStyle: 3, // Dashed line (lightweight-charts uses numbers for style: 0=Solid, 1=Dotted, 2=Dashed, 3=LargeDashed)
      crosshairMarkerVisible: false, 
      lastValueVisible: true,
      title: 'AI Path'
    });

    // Save refs for updates
    chartRef.current = chart;
    seriesRef.current = candleSeries;
    ema7Ref.current = ema7Series;
    ema25Ref.current = ema25Series;
    ema99Ref.current = ema99Series;
    projectedPathRef.current = projectedPathSeries;

    // Crosshair update
    chart.subscribeCrosshairMove(param => {
      if (
        param.point === undefined ||
        !param.time ||
        param.point.x < 0 ||
        param.point.y < 0
      ) {
        setLegend(null);
        return;
      }
      
      const candleData = param.seriesData.get(candleSeries);
      const ema7Data = param.seriesData.get(ema7Series);
      const ema25Data = param.seriesData.get(ema25Series);
      const ema99Data = param.seriesData.get(ema99Series);

      if (candleData) {
        setLegend({
          time: param.time,
          open: candleData.open,
          high: candleData.high,
          low: candleData.low,
          close: candleData.close,
          ema7: ema7Data ? ema7Data.value : null,
          ema25: ema25Data ? ema25Data.value : null,
          ema99: ema99Data ? ema99Data.value : null,
        });
      }
    });

    return () => {
      chart.remove();
    };
  }, []); // Run once on mount, wait no, theme can change!

  // Update theme dynamically
  useEffect(() => {
    if (chartRef.current) {
      const isDark = theme === 'dark';
      const textColor = isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)';
      const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
      const borderColor = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)';

      chartRef.current.applyOptions({
        layout: { textColor: textColor },
        grid: {
          vertLines: { color: gridColor },
          horzLines: { color: gridColor },
        },
        rightPriceScale: { borderColor: borderColor },
        timeScale: { borderColor: borderColor },
      });
    }
  }, [theme]);

  useEffect(() => {
    if (!seriesRef.current || !data || !data.candles || data.candles.length === 0) return;
    
    // Calculate dynamic precision based on the current price
    const lastPrice = data.candles[data.candles.length - 1].close;
    let precision = 2;
    if (lastPrice < 0.001) precision = 7;
    else if (lastPrice < 1) precision = 5;
    else if (lastPrice < 100) precision = 4;
    else precision = 2;

    const minMove = 1 / Math.pow(10, precision);

    seriesRef.current.applyOptions({
      priceFormat: {
        type: 'price',
        precision: precision,
        minMove: minMove,
      }
    });

    // Update data when it changes
    seriesRef.current.setData(data.candles);
    if (data.ema7 && ema7Ref.current) ema7Ref.current.setData(data.ema7);
    if (data.ema25 && ema25Ref.current) ema25Ref.current.setData(data.ema25);
    if (data.ema99 && ema99Ref.current) ema99Ref.current.setData(data.ema99);
    if (projectedPathRef.current) {
      projectedPathRef.current.setData(data.projectedPath || []);
    }

    // Clean up old snapshot series
    if (snapshotSeriesRef.current) {
      snapshotSeriesRef.current.forEach(s => {
        try { chartRef.current.removeSeries(s); } catch (e) {}
      });
      snapshotSeriesRef.current = [];
    }

    // Draw saved prediction snapshots (frozen paths)
    if (data.snapshots && data.snapshots.length > 0 && chartRef.current) {
      data.snapshots.forEach((snapPath, index) => {
        const opacity = Math.max(0.2, 0.8 - index * 0.25);
        const series = chartRef.current.addSeries(LineSeries, {
          color: index === 0 ? '#38bdf8' : `rgba(56, 189, 248, ${opacity})`,
          lineWidth: index === 0 ? 2 : 1.5,
          lineStyle: 2, // Dashed line
          crosshairMarkerVisible: false,
          lastValueVisible: false,
          title: index === 0 ? 'Last AI Path' : `Saved AI Path ${index + 1}`
        });
        series.setData(snapPath);
        snapshotSeriesRef.current.push(series);
      });
    }
    
    // Set initial legend to last candle
    const last = data.candles[data.candles.length - 1];
    const lastEma7 = data.ema7 && data.ema7.length > 0 ? data.ema7[data.ema7.length - 1].value : null;
    const lastEma25 = data.ema25 && data.ema25.length > 0 ? data.ema25[data.ema25.length - 1].value : null;
    const lastEma99 = data.ema99 && data.ema99.length > 0 ? data.ema99[data.ema99.length - 1].value : null;
    
    setLegend({
      time: last.time,
      open: last.open,
      high: last.high,
      low: last.low,
      close: last.close,
      ema7: lastEma7,
      ema25: lastEma25,
      ema99: lastEma99
    });
  }, [data]);

  // Handle Price Lines Separately so they don't multiply
  const supportLineRef = useRef(null);
  const resistanceLineRef = useRef(null);
  const stopLossLineRef = useRef(null);

  useEffect(() => {
    if (!seriesRef.current) return;
    const series = seriesRef.current;

    if (!targets) {
      if (supportLineRef.current) { series.removePriceLine(supportLineRef.current); supportLineRef.current = null; }
      if (resistanceLineRef.current) { series.removePriceLine(resistanceLineRef.current); resistanceLineRef.current = null; }
      if (stopLossLineRef.current) { series.removePriceLine(stopLossLineRef.current); stopLossLineRef.current = null; }
      return;
    }

    // Support Line (Buy)
    if (targets.support) {
      if (supportLineRef.current) series.removePriceLine(supportLineRef.current);
      supportLineRef.current = series.createPriceLine({
        price: targets.support,
        color: '#10B981',
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'SUPPORT',
      });
    }

    // Resistance Line (Sell)
    if (targets.resistance) {
      if (resistanceLineRef.current) series.removePriceLine(resistanceLineRef.current);
      resistanceLineRef.current = series.createPriceLine({
        price: targets.resistance,
        color: '#3B82F6',
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'RESISTANCE',
      });
    }

    // Stop Loss Line
    if (targets.stopLoss) {
      if (stopLossLineRef.current) series.removePriceLine(stopLossLineRef.current);
      stopLossLineRef.current = series.createPriceLine({
        price: targets.stopLoss,
        color: '#EF4444',
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'STOP LOSS',
      });
    }

  }, [targets]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '500px', marginTop: '8px' }}>
      <div 
        ref={chartContainerRef} 
        style={{ width: '100%', height: '100%' }} 
      />
      {legend && (
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          zIndex: 10,
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '11px',
          fontFamily: 'monospace',
          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)',
          background: theme === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.8)',
          padding: '4px 8px',
          borderRadius: '4px',
          pointerEvents: 'none'
        }}>
          <span>O <span style={{color: legend.close >= legend.open ? '#10B981' : '#EF4444'}}>{legend.open.toFixed(4)}</span></span>
          <span>H <span style={{color: legend.close >= legend.open ? '#10B981' : '#EF4444'}}>{legend.high.toFixed(4)}</span></span>
          <span>L <span style={{color: legend.close >= legend.open ? '#10B981' : '#EF4444'}}>{legend.low.toFixed(4)}</span></span>
          <span>C <span style={{color: legend.close >= legend.open ? '#10B981' : '#EF4444'}}>{legend.close.toFixed(4)}</span></span>
          {legend.ema7 && <span><span style={{color: '#EAB308'}}>EMA(7)</span> {legend.ema7.toFixed(4)}</span>}
          {legend.ema25 && <span><span style={{color: '#EC4899'}}>EMA(25)</span> {legend.ema25.toFixed(4)}</span>}
          {legend.ema99 && <span><span style={{color: '#8B5CF6'}}>EMA(99)</span> {legend.ema99.toFixed(4)}</span>}
        </div>
      )}
    </div>
  );
}
