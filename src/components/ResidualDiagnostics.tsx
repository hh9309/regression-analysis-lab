import React, { useMemo } from 'react';
import { DataPoint, OLSResult, PointDiagnostic } from '../types';
import { calculateOLS } from '../utils/mathStats';
import { MathFormula } from './MathFormula';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldCheck,
  Zap,
  BarChart2,
  TrendingUp,
} from 'lucide-react';

interface ResidualDiagnosticsProps {
  points: DataPoint[];
}

export const ResidualDiagnostics: React.FC<ResidualDiagnosticsProps> = ({
  points,
}) => {
  const ols: OLSResult = useMemo(() => calculateOLS(points), [points]);

  // Sorting for Q-Q plot quantiles
  const sortedDiagnostics = useMemo(() => {
    const copy = [...ols.diagnostics];
    copy.sort((a, b) => a.residual - b.residual);
    const n = copy.length;

    return copy.map((item, idx) => {
      // Blom's plotting position for normal quantile
      const p = (idx + 1 - 0.375) / (n + 0.25);
      // Approximation for standard normal quantile z
      const z =
        Math.sign(p - 0.5) *
        Math.sqrt(-2 * Math.log(0.5 - Math.abs(p - 0.5) + 1e-9));
      return { ...item, theoreticalQuantile: z };
    });
  }, [ols]);

  // Histogram and Normal Density calculation
  const histogramData = useMemo(() => {
    const residuals = ols.diagnostics.map((d) => d.residual);
    if (residuals.length === 0) {
      return { bins: [], curvePoints: [], minX: -3, maxX: 3, maxY: 1, std: 1 };
    }

    const minR = Math.min(...residuals);
    const maxR = Math.max(...residuals);
    const std = ols.rmse || 1;
    const mean = 0; // OLS mean residual is 0

    // Expand range for visual aesthetics
    const pad = Math.max(std * 0.8, (maxR - minR) * 0.2 || 0.5);
    const minX = Math.min(minR - pad, -2.8 * std);
    const maxX = Math.max(maxR + pad, 2.8 * std);

    // Dynamic bin count based on sample size
    const binCount = Math.min(8, Math.max(5, Math.ceil(Math.sqrt(residuals.length)) + 1));
    const binWidth = (maxX - minX) / binCount;

    const bins = Array.from({ length: binCount }, (_, i) => {
      const start = minX + i * binWidth;
      const end = start + binWidth;
      const mid = (start + end) / 2;
      const count = residuals.filter(
        (r) => r >= start && (i === binCount - 1 ? r <= end : r < end)
      ).length;
      const density = count / (residuals.length * binWidth || 1);
      return { start, end, mid, count, density };
    });

    const maxBinDensity = Math.max(...bins.map((b) => b.density), 0.001);

    // Normal probability density curve points
    const steps = 60;
    const curvePoints: { x: number; density: number }[] = [];
    let maxCurveDensity = 0;

    for (let i = 0; i <= steps; i++) {
      const x = minX + (i / steps) * (maxX - minX);
      const density =
        (1 / (std * Math.sqrt(2 * Math.PI))) *
        Math.exp(-0.5 * Math.pow((x - mean) / std, 2));
      if (density > maxCurveDensity) maxCurveDensity = density;
      curvePoints.push({ x, density });
    }

    const maxY = Math.max(maxBinDensity, maxCurveDensity) * 1.15;

    return { bins, curvePoints, minX, maxX, maxY, std, mean, residuals };
  }, [ols]);

  const SVG_W = 300;
  const SVG_H = 220;
  const PAD = { top: 20, right: 20, bottom: 35, left: 40 };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Title Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            <h1 className="text-lg font-bold text-slate-900">
              残差诊断图与假设检验 (Residual Diagnostics & Normal Fit)
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            诊断一元回归模型是否满足 OLS 核心假设：线性、正态性分布、同方差性与强杠杆影响点。
          </p>
        </div>

        {/* Statistical Test Badges */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div
            className={`px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 ${
              ols.shapiroP >= 0.05
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {ols.shapiroP >= 0.05 ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            )}
            <span>Shapiro-Wilk 正态性 p = {ols.shapiroP.toFixed(3)}</span>
          </div>

          <div
            className={`px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 ${
              ols.bpP >= 0.05
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {ols.bpP >= 0.05 ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            )}
            <span>Breusch-Pagan 等方差 p = {ols.bpP.toFixed(3)}</span>
          </div>
        </div>
      </div>

      {/* 6-Panel Diagnostic Charts Grid (3x2 Balanced Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Plot 1: Residual Histogram & Normal Density Curve Overlay */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-2 border-l-4 border-l-indigo-600">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5 text-indigo-600" />
              1. 残差分布直方图 & 正态曲线
            </span>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-mono">
              N(0, {ols.rmse.toFixed(2)}²)
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200/60 rounded-xl overflow-hidden relative">
            <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-auto">
              {/* Zero Residual Line */}
              <line
                x1={PAD.left + ((0 - histogramData.minX) / (histogramData.maxX - histogramData.minX || 1)) * (SVG_W - PAD.left - PAD.right)}
                y1={PAD.top}
                x2={PAD.left + ((0 - histogramData.minX) / (histogramData.maxX - histogramData.minX || 1)) * (SVG_W - PAD.left - PAD.right)}
                y2={SVG_H - PAD.bottom}
                stroke="#94a3b8"
                strokeDasharray="2 2"
              />

              {/* Histogram Bars */}
              {histogramData.bins.map((bin, idx) => {
                const xStart =
                  PAD.left +
                  ((bin.start - histogramData.minX) /
                    (histogramData.maxX - histogramData.minX || 1)) *
                    (SVG_W - PAD.left - PAD.right);
                const xEnd =
                  PAD.left +
                  ((bin.end - histogramData.minX) /
                    (histogramData.maxX - histogramData.minX || 1)) *
                    (SVG_W - PAD.left - PAD.right);
                const barWidth = Math.max(1, xEnd - xStart - 1.5);
                const barY =
                  SVG_H -
                  PAD.bottom -
                  (bin.density / (histogramData.maxY || 1)) *
                    (SVG_H - PAD.top - PAD.bottom);
                const barHeight = Math.max(
                  0,
                  SVG_H - PAD.bottom - barY
                );

                return (
                  <rect
                    key={`hist-bar-${idx}`}
                    x={xStart + 0.75}
                    y={barY}
                    width={barWidth}
                    height={barHeight}
                    fill="#818cf8"
                    fillOpacity="0.45"
                    stroke="#6366f1"
                    strokeWidth="1"
                    rx="2"
                  />
                );
              })}

              {/* Normal Density Curve Overlay */}
              {histogramData.curvePoints.length > 0 && (
                <path
                  d={histogramData.curvePoints
                    .map((pt, idx) => {
                      const sx =
                        PAD.left +
                        ((pt.x - histogramData.minX) /
                          (histogramData.maxX - histogramData.minX || 1)) *
                          (SVG_W - PAD.left - PAD.right);
                      const sy =
                        SVG_H -
                        PAD.bottom -
                        (pt.density / (histogramData.maxY || 1)) *
                          (SVG_H - PAD.top - PAD.bottom);
                      return `${idx === 0 ? 'M' : 'L'} ${sx.toFixed(1)} ${sy.toFixed(1)}`;
                    })
                    .join(' ')}
                  fill="none"
                  stroke="#4f46e5"
                  strokeWidth="2.5"
                />
              )}

              {/* Residual Rug Plot Ticks */}
              {histogramData.residuals.map((r, idx) => {
                const rx =
                  PAD.left +
                  ((r - histogramData.minX) /
                    (histogramData.maxX - histogramData.minX || 1)) *
                    (SVG_W - PAD.left - PAD.right);
                return (
                  <line
                    key={`rug-${idx}`}
                    x1={rx}
                    y1={SVG_H - PAD.bottom}
                    x2={rx}
                    y2={SVG_H - PAD.bottom - 6}
                    stroke="#0f172a"
                    strokeWidth="1.5"
                  />
                );
              })}
            </svg>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-indigo-300 border border-indigo-500 rounded-xs inline-block" />
              <span>残差频数柱</span>
              <span className="w-3 h-0.5 bg-indigo-600 inline-block ml-1" />
              <span>正态密度拟合线</span>
            </div>
          </div>
        </div>

        {/* Plot 2: Residuals vs Fitted */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="font-bold text-xs text-slate-900">
              2. 残差 vs 拟合值图 (Residuals vs Fitted)
            </span>
            <span className="text-[10px] text-slate-400">检验非线性与异方差</span>
          </div>

          <div className="bg-slate-50 border border-slate-200/60 rounded-xl overflow-hidden">
            <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-auto">
              {/* Zero Residual Line */}
              <line
                x1={PAD.left}
                y1={PAD.top + (SVG_H - PAD.top - PAD.bottom) / 2}
                x2={SVG_W - PAD.right}
                y2={PAD.top + (SVG_H - PAD.top - PAD.bottom) / 2}
                stroke="#64748b"
                strokeDasharray="3 3"
              />

              {/* Scatter Points */}
              {ols.diagnostics.map((d) => {
                const minFit = Math.min(...ols.diagnostics.map((i) => i.fittedY));
                const maxFit = Math.max(...ols.diagnostics.map((i) => i.fittedY));
                const maxRes = Math.max(
                  3,
                  ...ols.diagnostics.map((i) => Math.abs(i.residual))
                );

                const sx =
                  PAD.left +
                  ((d.fittedY - minFit) / (maxFit - minFit || 1)) *
                    (SVG_W - PAD.left - PAD.right);
                const sy =
                  PAD.top +
                  (1 - (d.residual + maxRes) / (2 * maxRes)) *
                    (SVG_H - PAD.top - PAD.bottom);

                return (
                  <circle
                    key={`rvf-${d.id}`}
                    cx={sx}
                    cy={sy}
                    r="4.5"
                    fill={d.cooksDistance > 0.5 ? '#f43f5e' : '#2563eb'}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                );
              })}
            </svg>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            理想状态：数据点无规律均匀散布于 0 水平线两侧，没有弧形喇叭扩增形态。
          </p>
        </div>

        {/* Plot 3: Normal Q-Q Plot */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="font-bold text-xs text-slate-900">
              3. 正态 Q-Q 图 (Normal Q-Q)
            </span>
            <span className="text-[10px] text-slate-400">检验残差正态分布假设</span>
          </div>

          <div className="bg-slate-50 border border-slate-200/60 rounded-xl overflow-hidden">
            <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-auto">
              {/* 45-degree Reference Line */}
              <line
                x1={PAD.left}
                y1={SVG_H - PAD.bottom}
                x2={SVG_W - PAD.right}
                y2={PAD.top}
                stroke="#64748b"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />

              {/* Q-Q Points */}
              {sortedDiagnostics.map((d, i) => {
                const sx =
                  PAD.left +
                  ((d.theoreticalQuantile + 2.5) / 5) *
                    (SVG_W - PAD.left - PAD.right);
                const sy =
                  PAD.top +
                  (1 - (d.stdResidual + 2.5) / 5) *
                    (SVG_H - PAD.top - PAD.bottom);

                return (
                  <circle
                    key={`qq-${d.id}-${i}`}
                    cx={sx}
                    cy={sy}
                    r="4.5"
                    fill="#10b981"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                );
              })}
            </svg>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            理想状态：点紧密黏合在 45° 虚线对角线上，尾部无显著重尾偏离。
          </p>
        </div>

        {/* Plot 4: Scale-Location Plot */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="font-bold text-xs text-slate-900">
              4. 尺度-位置图 (Scale-Location)
            </span>
            <span className="text-[10px] text-slate-400">
              sqrt(|Std Residuals|) vs Fitted
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200/60 rounded-xl overflow-hidden">
            <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-auto">
              {/* Points */}
              {ols.diagnostics.map((d) => {
                const minFit = Math.min(...ols.diagnostics.map((i) => i.fittedY));
                const maxFit = Math.max(...ols.diagnostics.map((i) => i.fittedY));
                const sqrtStdRes = Math.sqrt(Math.abs(d.stdResidual));

                const sx =
                  PAD.left +
                  ((d.fittedY - minFit) / (maxFit - minFit || 1)) *
                    (SVG_W - PAD.left - PAD.right);
                const sy =
                  PAD.top +
                  (1 - sqrtStdRes / 2.2) * (SVG_H - PAD.top - PAD.bottom);

                return (
                  <circle
                    key={`sl-${d.id}`}
                    cx={sx}
                    cy={sy}
                    r="4.5"
                    fill="#8b5cf6"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                );
              })}
            </svg>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            理想状态：垂直方向扩散幅度平稳，红线保持平直横线。
          </p>
        </div>

        {/* Plot 5: Residuals vs Leverage with Cook's Distance */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="font-bold text-xs text-slate-900">
              5. 残差 vs 杠杆率 & Cook 距离
            </span>
            <span className="text-[10px] text-slate-400">识别强影响离群点</span>
          </div>

          <div className="bg-slate-50 border border-slate-200/60 rounded-xl overflow-hidden">
            <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-auto">
              {/* Leverage Points */}
              {ols.diagnostics.map((d) => {
                const maxLev = Math.max(
                  0.5,
                  ...ols.diagnostics.map((i) => i.leverage)
                );
                const sx =
                  PAD.left +
                  (d.leverage / maxLev) * (SVG_W - PAD.left - PAD.right);
                const sy =
                  PAD.top +
                  (1 - (d.stdResidual + 3) / 6) *
                    (SVG_H - PAD.top - PAD.bottom);

                const isHighCook = d.cooksDistance > 0.5;

                return (
                  <g key={`lev-${d.id}`}>
                    <circle
                      cx={sx}
                      cy={sy}
                      r={isHighCook ? '7' : '4.5'}
                      fill={isHighCook ? '#f43f5e' : '#64748b'}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                    {isHighCook && (
                      <text
                        x={sx + 8}
                        y={sy - 4}
                        fontSize="9"
                        fontWeight="bold"
                        fill="#e11d48"
                      >
                        Cook D={d.cooksDistance.toFixed(2)}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            理想状态：点均落在 Cook 距离边界线 (<MathFormula formula="D=0.5" />) 内，右上角无高杠杆极值点。
          </p>
        </div>

        {/* Plot 6: Raw Data Scatter & OLS Line */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-2 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              6. 原始数据散点 & OLS 回归线
            </span>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-mono font-bold">
              R² = {ols.r2.toFixed(3)}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200/60 rounded-xl overflow-hidden">
            <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-auto">
              {/* OLS Regression Line */}
              {points.length >= 2 && (() => {
                const xs = points.map((p) => p.x);
                const ys = points.map((p) => p.y);
                const minX = Math.min(...xs);
                const maxX = Math.max(...xs);
                const padX = (maxX - minX) * 0.15 || 1;
                const plotMinX = Math.min(0, minX - padX);
                const plotMaxX = maxX + padX;

                const lineY1 = ols.intercept + ols.slope * plotMinX;
                const lineY2 = ols.intercept + ols.slope * plotMaxX;

                const minY = Math.min(...ys, lineY1, lineY2);
                const maxY = Math.max(...ys, lineY1, lineY2);
                const padY = (maxY - minY) * 0.15 || 1;
                const plotMinY = Math.min(0, minY - padY);
                const plotMaxY = maxY + padY;

                const toSx = (x: number) => PAD.left + ((x - plotMinX) / (plotMaxX - plotMinX || 1)) * (SVG_W - PAD.left - PAD.right);
                const toSy = (y: number) => PAD.top + (1 - (y - plotMinY) / (plotMaxY - plotMinY || 1)) * (SVG_H - PAD.top - PAD.bottom);

                return (
                  <g>
                    {/* Vertical residual lines */}
                    {ols.diagnostics.map((d) => (
                      <line
                        key={`scat-res-${d.id}`}
                        x1={toSx(d.x)}
                        y1={toSy(d.y)}
                        x2={toSx(d.x)}
                        y2={toSy(d.fittedY)}
                        stroke="#94a3b8"
                        strokeDasharray="2 2"
                        strokeWidth="1"
                      />
                    ))}

                    {/* OLS Line */}
                    <line
                      x1={toSx(plotMinX)}
                      y1={toSy(lineY1)}
                      x2={toSx(plotMaxX)}
                      y2={toSy(lineY2)}
                      stroke="#4f46e5"
                      strokeWidth="2.5"
                    />

                    {/* Centroid Point (meanX, meanY) */}
                    <circle
                      cx={toSx(ols.meanX)}
                      cy={toSy(ols.meanY)}
                      r="5"
                      fill="#10b981"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />

                    {/* Scatter points */}
                    {ols.diagnostics.map((d) => {
                      const isCook = d.cooksDistance > 0.5;
                      return (
                        <circle
                          key={`scat-pt-${d.id}`}
                          cx={toSx(d.x)}
                          cy={toSy(d.y)}
                          r={isCook ? "5.5" : "4"}
                          fill={isCook ? "#f43f5e" : "#2563eb"}
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                      );
                    })}
                  </g>
                );
              })()}
            </svg>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            样本数据空间分布与 OLS 拟合主线，虚线连接拟合残差 <MathFormula formula="e_i" />，绿色点为重心 <MathFormula formula="(\bar{x}, \bar{y})" />。
          </p>
        </div>
      </div>
    </div>
  );
};

