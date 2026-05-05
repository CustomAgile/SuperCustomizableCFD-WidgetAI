/**
 * Copyright (c) 2026 Custom Agile LLC. All rights reserved.
 */

import React, { useRef, useState, useId } from 'react';
import type { CfdData } from '../types';

// Colorblind-safe palette (blue family). No yellow/green adjacency.
const SERIES_COLORS = [
  '#E5E7EB', // lightest gray  — early states
  '#93C5FD', // light blue
  '#3B82F6', // medium blue
  '#1E3A8A', // dark blue
  '#6366F1', // indigo
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#F59E0B', // amber (isolated)
];

// Accessibility pattern overlays (symbol + color per Charles's a11y needs)
const PATTERNS = ['none', 'dots', 'lines-h', 'lines-d', 'cross', 'dots', 'lines-h', 'lines-d'];

interface CFDChartProps {
  data: CfdData;
  metricLabel: string;
}

const M = { top: 24, right: 16, bottom: 48, left: 56 };
const W = 800;
const H = 400;
const IW = W - M.left - M.right;
const IH = H - M.top - M.bottom;

export function CFDChart({ data, metricLabel }: CFDChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; date: string; values: Array<{ series: string; value: number }> }>({ visible: false, x: 0, y: 0, date: '', values: [] });
  const patId = useId();

  const { points, series } = data;
  const n = points.length;

  if (n === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ca-text-secondary)', fontSize: 'var(--ca-font-size-sm)' }}>
        No data to display for the selected date range.
      </div>
    );
  }

  // Stacked cumulative totals per point
  const stacked = points.map((pt) => {
    const cum: Record<string, number> = {};
    let running = 0;
    for (const s of series) { running += pt.values[s] ?? 0; cum[s] = running; }
    return { date: pt.date, cum, raw: pt.values };
  });

  const maxTotal = Math.max(1, ...stacked.map((p) => series.reduce((sum, s) => sum + (p.raw[s] ?? 0), 0)));

  const xScale = (i: number) => M.left + (n === 1 ? IW / 2 : (i / (n - 1)) * IW);
  const yScale = (v: number) => M.top + IH - (v / maxTotal) * IH;

  function areaPath(si: number): string {
    const s = series[si];
    const prev = si > 0 ? series[si - 1] : null;
    const top = stacked.map((p, i) => `${i === 0 ? 'M' : 'L'}${xScale(i).toFixed(1)},${yScale(p.cum[s] ?? 0).toFixed(1)}`).join(' ');
    const bot = stacked.map((p, i) => ({ p, i })).reverse().map(({ p, i }) => `L${xScale(i).toFixed(1)},${(prev ? yScale(p.cum[prev] ?? 0) : yScale(0)).toFixed(1)}`).join(' ');
    return `${top} ${bot} Z`;
  }

  function linePath(si: number): string {
    const s = series[si];
    return stacked.map((p, i) => `${i === 0 ? 'M' : 'L'}${xScale(i).toFixed(1)},${yScale(p.cum[s] ?? 0).toFixed(1)}`).join(' ');
  }

  const yTicks = Array.from({ length: 6 }, (_, i) => Math.round((maxTotal / 5) * i));
  const xStep = Math.max(1, Math.floor(n / 8));

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = (e.clientX - rect.left) * (W / rect.width);
    const i = Math.max(0, Math.min(n - 1, Math.round(((svgX - M.left) / IW) * (n - 1))));
    const pt = stacked[i];
    setTooltip({
      visible: true,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      date: pt.date,
      values: series.map((s) => ({ series: s, value: pt.raw[s] ?? 0 })).reverse(),
    });
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: '100%', display: 'block' }}
        role="img"
        aria-label="Cumulative Flow Diagram"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip((t) => ({ ...t, visible: false }))}
      >
        <defs>
          <pattern id={`${patId}-dots`} width="4" height="4" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="0.8" fill="rgba(0,0,0,0.18)" />
          </pattern>
          <pattern id={`${patId}-lines-h`} width="4" height="4" patternUnits="userSpaceOnUse">
            <line x1="0" y1="2" x2="4" y2="2" stroke="rgba(0,0,0,0.18)" strokeWidth="0.8" />
          </pattern>
          <pattern id={`${patId}-lines-d`} width="4" height="4" patternUnits="userSpaceOnUse">
            <line x1="0" y1="4" x2="4" y2="0" stroke="rgba(0,0,0,0.18)" strokeWidth="0.8" />
          </pattern>
          <pattern id={`${patId}-cross`} width="6" height="6" patternUnits="userSpaceOnUse">
            <line x1="3" y1="0" x2="3" y2="6" stroke="rgba(0,0,0,0.18)" strokeWidth="0.8" />
            <line x1="0" y1="3" x2="6" y2="3" stroke="rgba(0,0,0,0.18)" strokeWidth="0.8" />
          </pattern>
        </defs>

        {yTicks.map((tick) => {
          const y = yScale(tick);
          return (
            <g key={tick}>
              <line x1={M.left} y1={y} x2={M.left + IW} y2={y} stroke="var(--ca-border-default)" strokeWidth="0.5" strokeDasharray="3,3" />
              <text x={M.left - 6} y={y + 4} textAnchor="end" fontSize="10" fill="var(--ca-text-secondary)">{tick}</text>
            </g>
          );
        })}

        <text x={12} y={M.top + IH / 2} textAnchor="middle" fontSize="10" fill="var(--ca-text-secondary)" transform={`rotate(-90, 12, ${M.top + IH / 2})`}>
          {metricLabel}
        </text>

        {series.map((s, i) => {
          const color = SERIES_COLORS[i % SERIES_COLORS.length];
          const pat = PATTERNS[i % PATTERNS.length];
          return (
            <g key={s}>
              <path d={areaPath(i)} fill={color} opacity={0.85} />
              {pat !== 'none' && <path d={areaPath(i)} fill={`url(#${patId}-${pat})`} />}
              <path d={linePath(i)} fill="none" stroke={color} strokeWidth="1.5" />
            </g>
          );
        })}

        {points.map((pt, i) => {
          if (i % xStep !== 0 && i !== n - 1) return null;
          const label = new Date(pt.date + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
          return (
            <text key={pt.date} x={xScale(i)} y={H - M.bottom + 16} textAnchor="middle" fontSize="10" fill="var(--ca-text-secondary)">
              {label}
            </text>
          );
        })}

        <line x1={M.left} y1={M.top + IH} x2={M.left + IW} y2={M.top + IH} stroke="var(--ca-border-default)" strokeWidth="1" />
        <line x1={M.left} y1={M.top} x2={M.left} y2={M.top + IH} stroke="var(--ca-border-default)" strokeWidth="1" />
      </svg>

      {tooltip.visible && (
        <div role="tooltip" style={{ position: 'absolute', left: tooltip.x + 12, top: tooltip.y - 8, backgroundColor: 'var(--ca-surface-card)', border: '1px solid var(--ca-border-default)', borderRadius: 'var(--ca-radius-sm)', padding: '6px 10px', fontSize: 12, color: 'var(--ca-text-primary)', pointerEvents: 'none', boxShadow: 'var(--ca-shadow-md)', zIndex: 10, whiteSpace: 'nowrap' }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{tooltip.date}</div>
          {tooltip.values.map(({ series: s, value }) => (
            <div key={s} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ color: 'var(--ca-text-secondary)', minWidth: 80 }}>{s}:</span>
              <span style={{ fontWeight: 500 }}>{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
