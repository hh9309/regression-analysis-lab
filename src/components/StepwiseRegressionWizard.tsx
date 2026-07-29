import React, { useState, useMemo } from 'react';
import { MathFormula } from './MathFormula';
import {
  SlidersHorizontal,
  CheckSquare,
  Square,
  Sparkles,
  TrendingUp,
  BarChart3,
  Layers,
  HelpCircle,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Filter,
} from 'lucide-react';

interface Point {
  id: string;
  x: number;
  y: number;
  isOutlier?: boolean;
}

// Benchmark sample dataset for stepwise regression wizard
const BASE_POINTS: Point[] = [
  { id: '1', x: 1.0, y: 2.1 },
  { id: '2', x: 2.0, y: 3.8 },
  { id: '3', x: 3.0, y: 5.2 },
  { id: '4', x: 4.0, y: 7.5 },
  { id: '5', x: 5.0, y: 9.1 },
  { id: '6', x: 6.0, y: 12.3 },
  { id: '7', x: 7.0, y: 14.8 },
  { id: '8', x: 8.0, y: 19.5 }, // Non-linear acceleration point
  { id: '9', x: 9.0, y: 23.2 },
  { id: '10', x: 10.0, y: 28.0 },
  { id: '11', x: 8.5, y: 5.0, isOutlier: true }, // Strong leverage outlier point
];

/**
 * Least-Squares solver for general design matrix A (N x K) and target vector Y (N)
 */
function solveLeastSquares(A: number[][], Y: number[]): number[] {
  const N = A.length;
  if (N === 0) return [];
  const K = A[0].length;
  if (K === 0) return [];

  const M: number[][] = Array.from({ length: K }, () => Array(K).fill(0));
  const V: number[] = Array(K).fill(0);

  for (let i = 0; i < N; i++) {
    for (let r = 0; r < K; r++) {
      V[r] += A[i][r] * Y[i];
      for (let c = 0; c < K; c++) {
        M[r][c] += A[i][r] * A[i][c];
      }
    }
  }

  // Solve M * beta = V using Gaussian Elimination with Partial Pivoting
  for (let i = 0; i < K; i++) {
    let maxRow = i;
    for (let r = i + 1; r < K; r++) {
      if (Math.abs(M[r][i]) > Math.abs(M[maxRow][i])) {
        maxRow = r;
      }
    }
    [M[i], M[maxRow]] = [M[maxRow], M[i]];
    [V[i], V[maxRow]] = [V[maxRow], V[i]];

    if (Math.abs(M[i][i]) < 1e-12) continue;

    for (let r = i + 1; r < K; r++) {
      const factor = M[r][i] / M[i][i];
      V[r] -= factor * V[i];
      for (let c = i; c < K; c++) {
        M[r][c] -= factor * M[i][c];
      }
    }
  }

  const beta = Array(K).fill(0);
  for (let i = K - 1; i >= 0; i--) {
    let sum = V[i];
    for (let c = i + 1; c < K; c++) {
      sum -= M[i][c] * beta[c];
    }
    beta[i] = Math.abs(M[i][i]) > 1e-12 ? sum / M[i][i] : 0;
  }

  return beta;
}

export const StepwiseRegressionWizard: React.FC = () => {
  // Term selection states
  const [includeIntercept, setIncludeIntercept] = useState<boolean>(true);
  const [includeLinear, setIncludeLinear] = useState<boolean>(true);
  const [includeQuadratic, setIncludeQuadratic] = useState<boolean>(false);
  const [includeLog, setIncludeLog] = useState<boolean>(false);
  const [filterOutlier, setFilterOutlier] = useState<boolean>(false);

  // Active dataset
  const activePoints = useMemo(() => {
    return filterOutlier ? BASE_POINTS.filter((p) => !p.isOutlier) : BASE_POINTS;
  }, [filterOutlier]);

  // Model calculation
  const modelResult = useMemo(() => {
    const N = activePoints.length;
    const Y = activePoints.map((p) => p.y);

    // Build list of active feature definitions
    const activeTerms: Array<{
      id: string;
      label: string;
      latexSymbol: string;
      evaluate: (x: number) => number;
    }> = [];

    if (includeIntercept) {
      activeTerms.push({
        id: 'intercept',
        label: '常数项 β₀',
        latexSymbol: '\\beta_0',
        evaluate: () => 1,
      });
    }

    if (includeLinear) {
      activeTerms.push({
        id: 'linear',
        label: '一阶线性项 β₁ X',
        latexSymbol: '\\beta_1 X',
        evaluate: (x) => x,
      });
    }

    if (includeQuadratic) {
      activeTerms.push({
        id: 'quadratic',
        label: '二次曲线项 β₂ X²',
        latexSymbol: '\\beta_2 X^2',
        evaluate: (x) => x * x,
      });
    }

    if (includeLog) {
      activeTerms.push({
        id: 'log',
        label: '对数变换项 β₃ ln(X)',
        latexSymbol: '\\beta_3 \\ln(X)',
        evaluate: (x) => Math.log(Math.max(x, 0.001)),
      });
    }

    const K = activeTerms.length;

    if (K === 0) {
      // Empty model
      const sst = Y.reduce((sum, y) => sum + (y - 0) ** 2, 0);
      return {
        activeTerms,
        beta: [],
        sse: sst,
        sst,
        r2: 0,
        adjR2: 0,
        rmse: Math.sqrt(sst / N),
        predict: (_x: number) => 0,
        latexFormula: '\\hat{Y} = 0',
      };
    }

    // Build design matrix A
    const A: number[][] = activePoints.map((p) =>
      activeTerms.map((term) => term.evaluate(p.x))
    );

    const beta = solveLeastSquares(A, Y);

    const predict = (x: number) => {
      return activeTerms.reduce((sum, term, idx) => {
        return sum + beta[idx] * term.evaluate(x);
      }, 0);
    };

    // Calculate SSE, SST, R2
    const meanY = Y.reduce((a, b) => a + b, 0) / N;
    let sse = 0;
    let sst = 0;

    activePoints.forEach((p) => {
      const pred = predict(p.x);
      sse += (p.y - pred) ** 2;
      sst += (p.y - meanY) ** 2;
    });

    const r2 = sst > 0 ? Math.max(0, 1 - sse / sst) : 0;
    const dfRes = N - K;
    const dfTot = N - 1;
    const adjR2 = dfRes > 0 && dfTot > 0 ? Math.max(0, 1 - (sse / dfRes) / (sst / dfTot)) : 0;
    const rmse = Math.sqrt(sse / Math.max(1, dfRes));

    // Construct LaTeX Formula
    let latex = '\\hat{Y} = ';
    const parts: string[] = [];

    activeTerms.forEach((term, idx) => {
      const val = beta[idx];
      const absVal = Math.abs(val).toFixed(3);
      const isFirst = idx === 0;
      const sign = val >= 0 ? (isFirst ? '' : ' + ') : ' - ';

      if (term.id === 'intercept') {
        parts.push(`${sign}${absVal}`);
      } else if (term.id === 'linear') {
        parts.push(`${sign}${absVal} X`);
      } else if (term.id === 'quadratic') {
        parts.push(`${sign}${absVal} X^2`);
      } else if (term.id === 'log') {
        parts.push(`${sign}${absVal} \\ln(X)`);
      }
    });

    latex += parts.join('');

    return {
      activeTerms,
      beta,
      sse,
      sst,
      r2,
      adjR2,
      rmse,
      predict,
      latexFormula: latex,
    };
  }, [
    activePoints,
    includeIntercept,
    includeLinear,
    includeQuadratic,
    includeLog,
  ]);

  // SVG Chart bounds
  const SVG_W = 500;
  const SVG_H = 320;
  const PAD = { top: 25, right: 25, bottom: 40, left: 45 };

  const plotMinX = 0;
  const plotMaxX = 11;
  const plotMinY = 0;
  const plotMaxY = 32;

  const toSx = (x: number) =>
    PAD.left + ((x - plotMinX) / (plotMaxX - plotMinX)) * (SVG_W - PAD.left - PAD.right);
  const toSy = (y: number) =>
    PAD.top + (1 - (y - plotMinY) / (plotMaxY - plotMinY)) * (SVG_H - PAD.top - PAD.bottom);

  // Generate smooth fitted curve path
  const curvePath = useMemo(() => {
    if (modelResult.activeTerms.length === 0) return '';
    const pointsCount = 80;
    const step = (plotMaxX - plotMinX) / pointsCount;
    let d = '';

    for (let i = 0; i <= pointsCount; i++) {
      const x = plotMinX + i * step;
      const y = modelResult.predict(x);
      const sx = toSx(x);
      const sy = toSy(Math.min(plotMaxY, Math.max(plotMinY, y)));

      if (i === 0) {
        d += `M ${sx.toFixed(1)} ${sy.toFixed(1)}`;
      } else {
        d += ` L ${sx.toFixed(1)} ${sy.toFixed(1)}`;
      }
    }
    return d;
  }, [modelResult, plotMinX, plotMaxX, plotMinY, plotMaxY]);

  // Presets
  const handlePresetLinear = () => {
    setIncludeIntercept(true);
    setIncludeLinear(true);
    setIncludeQuadratic(false);
    setIncludeLog(false);
  };

  const handlePresetPolynomial = () => {
    setIncludeIntercept(true);
    setIncludeLinear(true);
    setIncludeQuadratic(true);
    setIncludeLog(false);
  };

  const handlePresetLogarithmic = () => {
    setIncludeIntercept(true);
    setIncludeLinear(false);
    setIncludeQuadratic(false);
    setIncludeLog(true);
  };

  const handlePresetFull = () => {
    setIncludeIntercept(true);
    setIncludeLinear(true);
    setIncludeQuadratic(true);
    setIncludeLog(true);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
      {/* Header Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              交互式‘逐步回归’向导 (Stepwise Regression Wizard)
            </h2>
            <p className="text-xs text-slate-500">
              通过勾选不同回归参数与非线性变换项，实时在右侧推导公式并显示对应的动态拟合曲线。
            </p>
          </div>
        </div>

        {/* Preset Quick Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <span className="text-slate-400 font-medium text-[11px] mr-1">常用模型:</span>
          <button
            onClick={handlePresetLinear}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 text-[11px] font-medium transition-colors"
          >
            一元线性
          </button>
          <button
            onClick={handlePresetPolynomial}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 text-[11px] font-medium transition-colors"
          >
            二次多项式
          </button>
          <button
            onClick={handlePresetLogarithmic}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 text-[11px] font-medium transition-colors"
          >
            对数回归
          </button>
          <button
            onClick={handlePresetFull}
            className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-700 font-bold hover:bg-indigo-200 text-[11px] transition-colors"
          >
            全特征混合
          </button>
        </div>
      </div>

      {/* Main Grid: Left Controls vs Right Live Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Parameter Toggles (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-900 border-b border-slate-200/60 pb-2">
              <span className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                1. 勾选回归方程特征项 (Term Selection)
              </span>
              <span className="font-mono text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                K = {modelResult.activeTerms.length} 项
              </span>
            </div>

            {/* Parameter Checkboxes */}
            <div className="space-y-2.5 text-xs">
              {/* Checkbox 1: Intercept */}
              <label
                onClick={() => setIncludeIntercept(!includeIntercept)}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  includeIntercept
                    ? 'bg-white border-indigo-500 shadow-xs ring-1 ring-indigo-500/20'
                    : 'bg-slate-100/50 border-slate-200 opacity-60 hover:opacity-100'
                }`}
              >
                <div className="mt-0.5 text-indigo-600">
                  {includeIntercept ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <div className="space-y-0.5 flex-1">
                  <div className="font-bold text-slate-900 flex items-center justify-between">
                    <span>常数项截距 (<MathFormula formula="\beta_0" />)</span>
                    <span className="text-[10px] text-slate-400 font-mono">基准线 Y = β₀</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    允许回归线上下全局平移，提供非零切点基准。
                  </p>
                </div>
              </label>

              {/* Checkbox 2: Linear */}
              <label
                onClick={() => setIncludeLinear(!includeLinear)}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  includeLinear
                    ? 'bg-white border-indigo-500 shadow-xs ring-1 ring-indigo-500/20'
                    : 'bg-slate-100/50 border-slate-200 opacity-60 hover:opacity-100'
                }`}
              >
                <div className="mt-0.5 text-indigo-600">
                  {includeLinear ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <div className="space-y-0.5 flex-1">
                  <div className="font-bold text-slate-900 flex items-center justify-between">
                    <span>一阶线性项 (<MathFormula formula="\beta_1 X" />)</span>
                    <span className="text-[10px] text-indigo-600 font-mono font-bold">基本线性斜率</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    引入一阶主导倾斜趋势，刻画 $X$ 对 $Y$ 的常数边际影响。
                  </p>
                </div>
              </label>

              {/* Checkbox 3: Quadratic */}
              <label
                onClick={() => setIncludeQuadratic(!includeQuadratic)}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  includeQuadratic
                    ? 'bg-white border-purple-500 shadow-xs ring-1 ring-purple-500/20'
                    : 'bg-slate-100/50 border-slate-200 opacity-60 hover:opacity-100'
                }`}
              >
                <div className="mt-0.5 text-purple-600">
                  {includeQuadratic ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <div className="space-y-0.5 flex-1">
                  <div className="font-bold text-slate-900 flex items-center justify-between">
                    <span>二次凸凹项 (<MathFormula formula="\beta_2 X^2" />)</span>
                    <span className="text-[10px] text-purple-600 font-mono font-bold">抛物线弯曲</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    使回归曲线具备二次弧度弯曲能力，适应非线性加速增长或递减。
                  </p>
                </div>
              </label>

              {/* Checkbox 4: Log */}
              <label
                onClick={() => setIncludeLog(!includeLog)}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  includeLog
                    ? 'bg-white border-amber-500 shadow-xs ring-1 ring-amber-500/20'
                    : 'bg-slate-100/50 border-slate-200 opacity-60 hover:opacity-100'
                }`}
              >
                <div className="mt-0.5 text-amber-600">
                  {includeLog ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <div className="space-y-0.5 flex-1">
                  <div className="font-bold text-slate-900 flex items-center justify-between">
                    <span>对数变换项 (<MathFormula formula="\beta_3 \ln X" />)</span>
                    <span className="text-[10px] text-amber-600 font-mono font-bold">边际递减对数</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    刻画前快后慢的对数饱和效应曲线（如边际效用递减）。
                  </p>
                </div>
              </label>

              {/* Checkbox 5: Filter Outlier */}
              <label
                onClick={() => setFilterOutlier(!filterOutlier)}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  filterOutlier
                    ? 'bg-emerald-50 border-emerald-500 shadow-xs'
                    : 'bg-slate-100/50 border-slate-200 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="mt-0.5 text-emerald-600">
                  {filterOutlier ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <div className="space-y-0.5 flex-1">
                  <div className="font-bold text-slate-900 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Filter className="w-3.5 h-3.5 text-emerald-600" />
                      剔除强杠杆离群点 (Outlier Filter)
                    </span>
                    <span className="text-[10px] text-emerald-700 font-mono font-bold">
                      {filterOutlier ? '已剔除 (N=10)' : '未剔除 (N=11)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    测试过滤异常点 (8.5, 5.0) 后，曲线参数与拟合优度 $R^2$ 的跃升效应。
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Model Statistics Panel */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-2.5">
            <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                模型实时统计量 (Regression Metrics)
              </span>
              <span className="font-mono text-[11px] text-indigo-300">
                N = {activePoints.length}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 space-y-0.5">
                <div className="text-[10px] text-slate-400 font-sans">决定系数 R²</div>
                <div className="text-emerald-400 font-bold text-sm">
                  {modelResult.r2.toFixed(4)}
                </div>
              </div>
              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 space-y-0.5">
                <div className="text-[10px] text-slate-400 font-sans">调整 Adj R²</div>
                <div className="text-indigo-300 font-bold text-sm">
                  {modelResult.adjR2.toFixed(4)}
                </div>
              </div>
              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 space-y-0.5">
                <div className="text-[10px] text-slate-400 font-sans">残差平方和 SSE</div>
                <div className="text-slate-200 font-bold text-xs">
                  {modelResult.sse.toFixed(3)}
                </div>
              </div>
              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 space-y-0.5">
                <div className="text-[10px] text-slate-400 font-sans">均方根误差 RMSE</div>
                <div className="text-slate-200 font-bold text-xs">
                  {modelResult.rmse.toFixed(3)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Formula & SVG Curve Chart (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Dynamic LaTeX Formula Card */}
          <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-4 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs text-indigo-900 font-bold">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                实时推导拟合曲线方程 (Fitted Equation)
              </span>
              <span className="text-[10px] bg-indigo-600 text-white font-mono font-bold px-2 py-0.5 rounded-full">
                {modelResult.activeTerms.length === 0 ? '无已知参数' : 'OLS 解析推导'}
              </span>
            </div>

            <div className="bg-white rounded-xl border border-indigo-100 p-3.5 text-center shadow-xs">
              <MathFormula formula={modelResult.latexFormula} block />
            </div>
          </div>

          {/* SVG Scatterplot & Fitted Curve */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-800 font-bold">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                2. 样本散点与动态拟合曲线 (Scatter & Fitted Curve)
              </span>
              <span className="font-mono text-[11px] text-slate-500">
                X ∈ [0, 11], Y ∈ [0, 32]
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200/60 rounded-xl overflow-hidden">
              <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-auto">
                {/* Grid Lines */}
                {[5, 10, 15, 20, 25, 30].map((y) => (
                  <line
                    key={`grid-y-${y}`}
                    x1={PAD.left}
                    y1={toSy(y)}
                    x2={SVG_W - PAD.right}
                    y2={toSy(y)}
                    stroke="#e2e8f0"
                    strokeDasharray="2 2"
                    strokeWidth="1"
                  />
                ))}
                {[2, 4, 6, 8, 10].map((x) => (
                  <line
                    key={`grid-x-${x}`}
                    x1={toSx(x)}
                    y1={PAD.top}
                    x2={toSx(x)}
                    y2={SVG_H - PAD.bottom}
                    stroke="#e2e8f0"
                    strokeDasharray="2 2"
                    strokeWidth="1"
                  />
                ))}

                {/* Axes */}
                <line
                  x1={PAD.left}
                  y1={SVG_H - PAD.bottom}
                  x2={SVG_W - PAD.right}
                  y2={SVG_H - PAD.bottom}
                  stroke="#64748b"
                  strokeWidth="1.5"
                />
                <line
                  x1={PAD.left}
                  y1={PAD.top}
                  x2={PAD.left}
                  y2={SVG_H - PAD.bottom}
                  stroke="#64748b"
                  strokeWidth="1.5"
                />

                {/* Vertical Residual Dashed Lines */}
                {modelResult.activeTerms.length > 0 &&
                  activePoints.map((p) => {
                    const predY = modelResult.predict(p.x);
                    return (
                      <line
                        key={`res-line-${p.id}`}
                        x1={toSx(p.x)}
                        y1={toSy(p.y)}
                        x2={toSx(p.x)}
                        y2={toSy(Math.min(plotMaxY, Math.max(plotMinY, predY)))}
                        stroke="#94a3b8"
                        strokeDasharray="2 2"
                        strokeWidth="1.2"
                      />
                    );
                  })}

                {/* Fitted Curve Path */}
                {curvePath && (
                  <path
                    d={curvePath}
                    fill="none"
                    stroke="#4f46e5"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                )}

                {/* Scatter Points */}
                {BASE_POINTS.map((p) => {
                  const isFiltered = filterOutlier && p.isOutlier;
                  const sx = toSx(p.x);
                  const sy = toSy(p.y);

                  if (isFiltered) {
                    return (
                      <g key={`pt-${p.id}`}>
                        <circle
                          cx={sx}
                          cy={sy}
                          r="5"
                          fill="#cbd5e1"
                          stroke="#94a3b8"
                          strokeDasharray="2 2"
                          strokeWidth="1.5"
                        />
                        <text
                          x={sx + 8}
                          y={sy + 4}
                          className="text-[9px] fill-slate-400 font-mono"
                        >
                          已滤离群点
                        </text>
                      </g>
                    );
                  }

                  return (
                    <circle
                      key={`pt-${p.id}`}
                      cx={sx}
                      cy={sy}
                      r={p.isOutlier ? '6' : '4.5'}
                      fill={p.isOutlier ? '#f43f5e' : '#2563eb'}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                  );
                })}
              </svg>
            </div>

            {/* Dynamic Step Explanation Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5 text-xs">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-indigo-600" />
                逐步回归形态与统计解释
              </div>

              <div className="text-slate-600 leading-relaxed space-y-1 text-[11px]">
                {modelResult.activeTerms.length === 0 && (
                  <p className="text-rose-600">
                    ⚠️ 当前未勾选任何特征项，拟合方程为常数 0，残差平方和 <MathFormula formula="SSE" /> 达到最大极值。请勾选左侧参数项。
                  </p>
                )}
                {includeIntercept && !includeLinear && !includeQuadratic && !includeLog && (
                  <p>
                    仅选择常数项 <MathFormula formula="\beta_0" /> 时，拟合线为水平基准线 <MathFormula formula="\hat{Y} = \bar{Y}" />，其决定系数 <MathFormula formula="R^2 = 0" />。
                  </p>
                )}
                {includeLinear && !includeQuadratic && !includeLog && (
                  <p>
                    标准一元 OLS 线性回归：捕捉到主导正向倾斜趋势，决定系数 <MathFormula formula={`R^2 = ${modelResult.r2.toFixed(3)}`} />。
                  </p>
                )}
                {includeQuadratic && (
                  <p className="text-purple-700 font-medium">
                    ✨ 引入二次项 <MathFormula formula="\beta_2 X^2" /> 后，拟合线产生弧度弯曲，成功拟合了尾部加速上升趋势，残差平方和 <MathFormula formula="SSE" /> 进一步显著下降。
                  </p>
                )}
                {includeLog && (
                  <p className="text-amber-700 font-medium">
                    ✨ 引入对数项 <MathFormula formula="\beta_3 \ln(X)" /> 后，回归模型对前期的快速攀升提供了边际递减的曲线弹性调节。
                  </p>
                )}
                {filterOutlier && (
                  <p className="text-emerald-700 font-medium">
                    🌿 剔除强杠杆离群点后，模型拟合优度 <MathFormula formula={`R^2 = ${modelResult.r2.toFixed(4)}`} />，避免了异常值强行拉扯回归斜率。
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
