import React, { useState, useRef, useMemo, useEffect } from 'react';
import { DataPoint, OLSResult } from '../types';
import { calculateOLS, getRegressionIntervals } from '../utils/mathStats';
import { MathFormula } from './MathFormula';
import {
  Sliders,
  Plus,
  Trash2,
  RefreshCw,
  Eye,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Maximize2,
  Sparkles,
  Info,
  Layers,
  Play,
  Pause,
  RotateCcw,
  Award,
  TrendingUp,
  BookOpen,
  Zap,
} from 'lucide-react';

interface FittingSandboxProps {
  initialPoints?: DataPoint[];
  onPointsChange?: (points: DataPoint[]) => void;
}

const DEFAULT_SANDBOX_POINTS: DataPoint[] = [
  { id: 'p1', x: 1.5, y: 3.2 },
  { id: 'p2', x: 2.2, y: 4.8 },
  { id: 'p3', x: 3.0, y: 5.5 },
  { id: 'p4', x: 3.8, y: 7.0 },
  { id: 'p5', x: 4.5, y: 8.2 },
  { id: 'p6', x: 5.2, y: 9.8 },
  { id: 'p7', x: 6.0, y: 11.0 },
  { id: 'p8', x: 7.2, y: 13.5 },
  { id: 'p9', x: 8.0, y: 14.2 },
  { id: 'p10', x: 9.0, y: 17.0 },
];

export const FittingSandbox: React.FC<FittingSandboxProps> = ({
  initialPoints = DEFAULT_SANDBOX_POINTS,
  onPointsChange,
}) => {
  const [points, setPoints] = useState<DataPoint[]>(initialPoints);
  const [draggedPointId, setDraggedPointId] = useState<string | null>(null);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);

  // Toggle Controls
  const [showResidualLines, setShowResidualLines] = useState<boolean>(true);
  const [showManualLine, setShowManualLine] = useState<boolean>(false);
  const [showConfidenceBand, setShowConfidenceBand] = useState<boolean>(true);
  const [showPredictionBand, setShowPredictionBand] = useState<boolean>(false);
  const [showOutlierAlerts, setShowOutlierAlerts] = useState<boolean>(true);
  const [showMeanRefLines, setShowMeanRefLines] = useState<boolean>(true);
  const [showZeroSlopeLine, setShowZeroSlopeLine] = useState<boolean>(false);

  // Manual Regression Sliders
  const [manualSlope, setManualSlope] = useState<number>(1.8);
  const [manualIntercept, setManualIntercept] = useState<number>(1.0);

  // Fitting Animation States
  const [isAnimatingFit, setIsAnimatingFit] = useState<boolean>(false);
  const [animFrame, setAnimFrame] = useState<number>(0);
  const TOTAL_ANIM_FRAMES = 45;
  const [animSlope, setAnimSlope] = useState<number>(0);
  const [animIntercept, setAnimIntercept] = useState<number>(0);
  const [animSse, setAnimSse] = useState<number>(0);
  const [animGradB0, setAnimGradB0] = useState<number>(0);
  const [animGradB1, setAnimGradB1] = useState<number>(0);
  const [showOptimalityExplanation, setShowOptimalityExplanation] = useState<boolean>(true);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Synchronize points state
  useEffect(() => {
    if (onPointsChange) {
      onPointsChange(points);
    }
  }, [points, onPointsChange]);

  // Coordinate Bounds & Mapping
  const bounds = useMemo(() => {
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(0, ...xs);
    const maxX = Math.max(10, Math.max(...xs) + 1.5);
    const minY = Math.min(0, ...ys);
    const maxY = Math.max(20, Math.max(...ys) + 2.5);
    return { minX, maxX, minY, maxY };
  }, [points]);

  const SVG_WIDTH = 640;
  const SVG_HEIGHT = 440;
  const PADDING = { top: 30, right: 30, bottom: 40, left: 50 };

  const plotWidth = SVG_WIDTH - PADDING.left - PADDING.right;
  const plotHeight = SVG_HEIGHT - PADDING.top - PADDING.bottom;

  const toSvgX = (x: number) =>
    PADDING.left + ((x - bounds.minX) / (bounds.maxX - bounds.minX)) * plotWidth;

  const toSvgY = (y: number) =>
    PADDING.top +
    (1 - (y - bounds.minY) / (bounds.maxY - bounds.minY)) * plotHeight;

  const toDataX = (svgX: number) =>
    bounds.minX +
    ((svgX - PADDING.left) / plotWidth) * (bounds.maxX - bounds.minX);

  const toDataY = (svgY: number) =>
    bounds.minY +
    (1 - (svgY - PADDING.top) / plotHeight) * (bounds.maxY - bounds.minY);

  // OLS Calculation
  const ols: OLSResult = useMemo(() => calculateOLS(points), [points]);

  // Sync initial manual line to OLS when enabling manual mode
  useEffect(() => {
    if (showManualLine && ols.n >= 2) {
      setManualSlope(Number(ols.slope.toFixed(2)));
      setManualIntercept(Number(ols.intercept.toFixed(2)));
    }
  }, [showManualLine]);

  // Calculate Manual SSE
  const manualSse = useMemo(() => {
    return points.reduce((acc, p) => {
      const fit = manualIntercept + manualSlope * p.x;
      return acc + Math.pow(p.y - fit, 2);
    }, 0);
  }, [points, manualSlope, manualIntercept]);

  // SVG Mouse Event Handlers
  const handleSvgMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return; // Left click only
    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const clickSvgX = e.clientX - rect.left;
    const clickSvgY = e.clientY - rect.top;

    // Check if clicked close to an existing point
    const thresholdPixel = 14;
    const hit = points.find((p) => {
      const px = toSvgX(p.x);
      const py = toSvgY(p.y);
      const dist = Math.sqrt((px - clickSvgX) ** 2 + (py - clickSvgY) ** 2);
      return dist <= thresholdPixel;
    });

    if (hit) {
      setDraggedPointId(hit.id);
      setSelectedPointId(hit.id);
    } else {
      // Add a new point if within plot bounds
      if (
        clickSvgX >= PADDING.left &&
        clickSvgX <= SVG_WIDTH - PADDING.right &&
        clickSvgY >= PADDING.top &&
        clickSvgY <= SVG_HEIGHT - PADDING.bottom
      ) {
        const newX = Number(toDataX(clickSvgX).toFixed(2));
        const newY = Number(toDataY(clickSvgY).toFixed(2));
        const newPoint: DataPoint = {
          id: `p-${Date.now()}`,
          x: newX,
          y: newY,
        };
        setPoints((prev) => [...prev, newPoint]);
        setSelectedPointId(newPoint.id);
      }
    }
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!draggedPointId || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const moveSvgX = e.clientX - rect.left;
    const moveSvgY = e.clientY - rect.top;

    const clampedSvgX = Math.max(
      PADDING.left,
      Math.min(SVG_WIDTH - PADDING.right, moveSvgX)
    );
    const clampedSvgY = Math.max(
      PADDING.top,
      Math.min(SVG_HEIGHT - PADDING.bottom, moveSvgY)
    );

    const newX = Number(toDataX(clampedSvgX).toFixed(2));
    const newY = Number(toDataY(clampedSvgY).toFixed(2));

    setPoints((prev) =>
      prev.map((p) => (p.id === draggedPointId ? { ...p, x: newX, y: newY } : p))
    );
  };

  const handleSvgMouseUp = () => {
    setDraggedPointId(null);
  };

  const handleDeleteSelectedPoint = () => {
    if (!selectedPointId) return;
    setPoints((prev) => prev.filter((p) => p.id !== selectedPointId));
    setSelectedPointId(null);
  };

  const handleResetPoints = () => {
    setPoints(DEFAULT_SANDBOX_POINTS);
    setSelectedPointId(null);
  };

  const handleAddOutlier = () => {
    // Add a high leverage point at high X with extreme Y deviation
    const newPoint: DataPoint = {
      id: `outlier-${Date.now()}`,
      x: 9.8,
      y: 3.5,
      label: '高杠杆离群点',
      isOutlier: true,
    };
    setPoints((prev) => [...prev, newPoint]);
    setSelectedPointId(newPoint.id);
  };

  // Fitting Animation Runner Effect (Gradient Descent SSE Minimization)
  useEffect(() => {
    let timer: any;
    if (isAnimatingFit) {
      if (animFrame < TOTAL_ANIM_FRAMES) {
        timer = setTimeout(() => {
          const nextFrame = animFrame + 1;
          setAnimFrame(nextFrame);

          // Cubic Ease-out gradient convergence path towards OLS solution
          const progress = 1 - Math.pow(1 - nextFrame / TOTAL_ANIM_FRAMES, 3);

          const initSlope = 0;
          const initIntercept = ols.meanY;

          const currSlope = initSlope + (ols.slope - initSlope) * progress;
          const currIntercept = initIntercept + (ols.intercept - initIntercept) * progress;

          let sseSum = 0;
          let gB0 = 0;
          let gB1 = 0;

          points.forEach((p) => {
            const pred = currIntercept + currSlope * p.x;
            const res = p.y - pred;
            sseSum += res ** 2;
            gB0 += -2 * res;
            gB1 += -2 * res * p.x;
          });

          setAnimSlope(currSlope);
          setAnimIntercept(currIntercept);
          setAnimSse(sseSum);
          setAnimGradB0(gB0);
          setAnimGradB1(gB1);
        }, 40);
      } else {
        setIsAnimatingFit(false);
      }
    }
    return () => clearTimeout(timer);
  }, [isAnimatingFit, animFrame, ols, points, TOTAL_ANIM_FRAMES]);

  const handleStartAnimation = () => {
    setAnimFrame(0);
    setAnimSlope(0);
    setAnimIntercept(ols.meanY);
    let initSse = 0;
    let gB0 = 0;
    let gB1 = 0;
    points.forEach((p) => {
      const res = p.y - ols.meanY;
      initSse += res ** 2;
      gB0 += -2 * res;
      gB1 += -2 * res * p.x;
    });
    setAnimSse(initSse);
    setAnimGradB0(gB0);
    setAnimGradB1(gB1);
    setIsAnimatingFit(true);
  };

  const handleTogglePauseAnimation = () => {
    setIsAnimatingFit((prev) => !prev);
  };

  const handleResetAnimation = () => {
    setIsAnimatingFit(false);
    setAnimFrame(0);
  };

  // Generate Confidence & Prediction Band Paths
  const intervalBandPaths = useMemo(() => {
    if ((!showConfidenceBand && !showPredictionBand) || ols.n < 3) return null;

    const numSteps = 40;
    const stepSize = (bounds.maxX - bounds.minX) / numSteps;

    const ciTopPoints: { x: number; y: number }[] = [];
    const ciBottomPoints: { x: number; y: number }[] = [];
    const piTopPoints: { x: number; y: number }[] = [];
    const piBottomPoints: { x: number; y: number }[] = [];

    for (let i = 0; i <= numSteps; i++) {
      const xVal = bounds.minX + i * stepSize;
      const res = getRegressionIntervals(xVal, ols, 0.95);

      const sx = toSvgX(xVal);
      ciTopPoints.push({ x: sx, y: toSvgY(res.ciUpper) });
      ciBottomPoints.push({ x: sx, y: toSvgY(res.ciLower) });
      piTopPoints.push({ x: sx, y: toSvgY(res.piUpper) });
      piBottomPoints.push({ x: sx, y: toSvgY(res.piLower) });
    }

    // CI Polygon path
    let ciD = `M ${ciTopPoints[0].x} ${ciTopPoints[0].y}`;
    for (let i = 1; i < ciTopPoints.length; i++) {
      ciD += ` L ${ciTopPoints[i].x} ${ciTopPoints[i].y}`;
    }
    for (let i = ciBottomPoints.length - 1; i >= 0; i--) {
      ciD += ` L ${ciBottomPoints[i].x} ${ciBottomPoints[i].y}`;
    }
    ciD += ' Z';

    // PI Polygon path
    let piD = `M ${piTopPoints[0].x} ${piTopPoints[0].y}`;
    for (let i = 1; i < piTopPoints.length; i++) {
      piD += ` L ${piTopPoints[i].x} ${piTopPoints[i].y}`;
    }
    for (let i = piBottomPoints.length - 1; i >= 0; i--) {
      piD += ` L ${piBottomPoints[i].x} ${piBottomPoints[i].y}`;
    }
    piD += ' Z';

    return { ciD, piD };
  }, [bounds, ols, showConfidenceBand, showPredictionBand]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Title Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <h1 className="text-lg font-bold text-slate-900">
              动态拟合与拖拽沙盒 (Dynamic Fitting Sandbox)
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            点击画布添加点、抓取拖拽点实时观测 OLS 回归线重算、残差线 ($e_i$) 及高杠杆点对回归线的牵拉过程。
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Fitting Animation Button */}
          <button
            onClick={isAnimatingFit ? handleTogglePauseAnimation : handleStartAnimation}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all shadow-xs ${
              isAnimatingFit
                ? 'bg-cyan-600 text-white border border-cyan-600 animate-pulse'
                : 'bg-cyan-50 text-cyan-800 border border-cyan-200 hover:bg-cyan-100'
            }`}
            title="通过梯度下降动态旋转与平移回归线，直观演示 SSE 最小化过程"
          >
            {isAnimatingFit ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>暂停最优拟合动画</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-cyan-600 fill-cyan-200" />
                <span>演示最优拟合线</span>
              </>
            )}
          </button>
          <button
            onClick={handleAddOutlier}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-medium hover:bg-rose-100 transition-colors"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            强行加入杠杆离群点
          </button>
          <button
            onClick={handleDeleteSelectedPoint}
            disabled={!selectedPointId}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-medium hover:bg-slate-200 disabled:opacity-40 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            删除选中点
          </button>
          <button
            onClick={handleResetPoints}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium hover:bg-indigo-100 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            重置画布数据
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Interactive Canvas Panel (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm relative space-y-3">
            {/* Display Switches Header */}
            <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-3 flex-wrap gap-2">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-indigo-600" />
                可视化叠加控制:
              </span>
              <div className="flex items-center gap-3 flex-wrap text-[11px]">
                {/* Master Switch for Dual Interval Bands */}
                <button
                  type="button"
                  onClick={() => {
                    const enableBoth = !(showConfidenceBand && showPredictionBand);
                    setShowConfidenceBand(enableBoth);
                    setShowPredictionBand(enableBoth);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-medium transition-all ${
                    showConfidenceBand && showPredictionBand
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>同时渲染双区间 (置信带 + 预测带)</span>
                  <span
                    className={`ml-1 w-7 h-4 rounded-full transition-colors relative flex items-center p-0.5 ${
                      showConfidenceBand && showPredictionBand
                        ? 'bg-purple-300'
                        : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`w-3 h-3 rounded-full bg-white transition-transform ${
                        showConfidenceBand && showPredictionBand
                          ? 'translate-x-3'
                          : 'translate-x-0'
                      }`}
                    />
                  </span>
                </button>

                <div className="h-4 w-px bg-slate-200 mx-0.5" />

                <label className="flex items-center gap-1 cursor-pointer select-none text-slate-700">
                  <input
                    type="checkbox"
                    checked={showMeanRefLines}
                    onChange={(e) => setShowMeanRefLines(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-emerald-700 font-medium">均值重心线 (x̄, ȳ)</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer select-none text-slate-700">
                  <input
                    type="checkbox"
                    checked={showZeroSlopeLine}
                    onChange={(e) => setShowZeroSlopeLine(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-teal-700 font-medium">零斜率基线 (y=ȳ)</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer select-none text-slate-700">
                  <input
                    type="checkbox"
                    checked={showResidualLines}
                    onChange={(e) => setShowResidualLines(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>残差垂直线</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer select-none text-slate-700">
                  <input
                    type="checkbox"
                    checked={showConfidenceBand}
                    onChange={(e) => setShowConfidenceBand(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-indigo-700 font-medium">95% 置信带</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer select-none text-slate-700">
                  <input
                    type="checkbox"
                    checked={showPredictionBand}
                    onChange={(e) => setShowPredictionBand(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-purple-700 font-medium">95% 预测带</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer select-none text-slate-700">
                  <input
                    type="checkbox"
                    checked={showManualLine}
                    onChange={(e) => setShowManualLine(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-amber-700 font-medium">手动拟合线</span>
                </label>
              </div>
            </div>

            {/* SVG Interactive Canvas */}
            <div className="relative rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden select-none">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                className="w-full h-auto cursor-crosshair touch-none"
                onMouseDown={handleSvgMouseDown}
                onMouseMove={handleSvgMouseMove}
                onMouseUp={handleSvgMouseUp}
                onMouseLeave={handleSvgMouseUp}
              >
                {/* Background Grid Lines */}
                {[0, 2, 4, 6, 8, 10].map((xVal) => (
                  <g key={`grid-x-${xVal}`}>
                    <line
                      x1={toSvgX(xVal)}
                      y1={PADDING.top}
                      x2={toSvgX(xVal)}
                      y2={SVG_HEIGHT - PADDING.bottom}
                      stroke="#e2e8f0"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={toSvgX(xVal)}
                      y={SVG_HEIGHT - PADDING.bottom + 16}
                      fontSize="10"
                      fill="#64748b"
                      textAnchor="middle"
                    >
                      {xVal}
                    </text>
                  </g>
                ))}

                {[0, 5, 10, 15, 20].map((yVal) => (
                  <g key={`grid-y-${yVal}`}>
                    <line
                      x1={PADDING.left}
                      y1={toSvgY(yVal)}
                      x2={SVG_WIDTH - PADDING.right}
                      y2={toSvgY(yVal)}
                      stroke="#e2e8f0"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={PADDING.left - 8}
                      y={toSvgY(yVal) + 3}
                      fontSize="10"
                      fill="#64748b"
                      textAnchor="end"
                    >
                      {yVal}
                    </text>
                  </g>
                ))}

                {/* Axes */}
                <line
                  x1={PADDING.left}
                  y1={SVG_HEIGHT - PADDING.bottom}
                  x2={SVG_WIDTH - PADDING.right}
                  y2={SVG_HEIGHT - PADDING.bottom}
                  stroke="#475569"
                  strokeWidth="1.5"
                />
                <line
                  x1={PADDING.left}
                  y1={PADDING.top}
                  x2={PADDING.left}
                  y2={SVG_HEIGHT - PADDING.bottom}
                  stroke="#475569"
                  strokeWidth="1.5"
                />

                {/* Zero-Slope Baseline (y = meanY) */}
                {showZeroSlopeLine && ols.n >= 1 && (
                  <g key="zero-slope-baseline">
                    <line
                      x1={PADDING.left}
                      y1={toSvgY(ols.meanY)}
                      x2={SVG_WIDTH - PADDING.right}
                      y2={toSvgY(ols.meanY)}
                      stroke="#0d9488"
                      strokeWidth="2"
                      strokeDasharray="6 4"
                    />
                    <rect
                      x={SVG_WIDTH - PADDING.right - 105}
                      y={Math.min(SVG_HEIGHT - PADDING.bottom - 20, Math.max(PADDING.top + 4, toSvgY(ols.meanY) - 18))}
                      width="100"
                      height="16"
                      rx="4"
                      fill="#ccfbf1"
                      stroke="#0d9488"
                      strokeWidth="1"
                    />
                    <text
                      x={SVG_WIDTH - PADDING.right - 55}
                      y={Math.min(SVG_HEIGHT - PADDING.bottom - 8, Math.max(PADDING.top + 16, toSvgY(ols.meanY) - 6))}
                      fontSize="10"
                      fontWeight="bold"
                      fill="#0f766e"
                      textAnchor="middle"
                    >
                      零斜率基线 y = {ols.meanY.toFixed(2)}
                    </text>
                  </g>
                )}

                {/* Mean Reference Lines (x = meanX, y = meanY) & Centroid Point */}
                {showMeanRefLines && ols.n >= 1 && (
                  <g key="mean-ref-lines">
                    {/* Vertical Line x = meanX */}
                    <line
                      x1={toSvgX(ols.meanX)}
                      y1={PADDING.top}
                      x2={toSvgX(ols.meanX)}
                      y2={SVG_HEIGHT - PADDING.bottom}
                      stroke="#059669"
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                    />
                    {/* Horizontal Line y = meanY */}
                    <line
                      x1={PADDING.left}
                      y1={toSvgY(ols.meanY)}
                      x2={SVG_WIDTH - PADDING.right}
                      y2={toSvgY(ols.meanY)}
                      stroke="#059669"
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                    />
                    {/* Centroid Point (x_mean, y_mean) */}
                    <circle
                      cx={toSvgX(ols.meanX)}
                      cy={toSvgY(ols.meanY)}
                      r="6"
                      fill="#10b981"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    <circle
                      cx={toSvgX(ols.meanX)}
                      cy={toSvgY(ols.meanY)}
                      r="10"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                    />
                    {/* Centroid Label Badge */}
                    <g transform={`translate(${Math.min(SVG_WIDTH - PADDING.right - 125, Math.max(PADDING.left + 5, toSvgX(ols.meanX) + 12))}, ${Math.max(PADDING.top + 16, Math.min(SVG_HEIGHT - PADDING.bottom - 10, toSvgY(ols.meanY) - 12))})`}>
                      <rect
                        x="0"
                        y="-14"
                        width="122"
                        height="18"
                        rx="4"
                        fill="#ecfdf5"
                        stroke="#059669"
                        strokeWidth="1"
                      />
                      <text
                        x="61"
                        y="-2"
                        fontSize="10"
                        fontWeight="bold"
                        fill="#047857"
                        textAnchor="middle"
                      >
                        重心 (x̄={ols.meanX.toFixed(2)}, ȳ={ols.meanY.toFixed(2)})
                      </text>
                    </g>
                  </g>
                )}

                {/* 95% Prediction Interval Shading (Light Purple) */}
                {showPredictionBand && intervalBandPaths && (
                  <path
                    d={intervalBandPaths.piD}
                    fill="#a855f7"
                    fillOpacity="0.1"
                    stroke="#a855f7"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                )}

                {/* 95% Confidence Interval Shading (Indigo) */}
                {showConfidenceBand && intervalBandPaths && (
                  <path
                    d={intervalBandPaths.ciD}
                    fill="#6366f1"
                    fillOpacity="0.18"
                    stroke="#4f46e5"
                    strokeWidth="1"
                  />
                )}

                {/* OLS Regression Line */}
                {ols.n >= 2 && (
                  <line
                    x1={toSvgX(bounds.minX)}
                    y1={toSvgY(ols.intercept + ols.slope * bounds.minX)}
                    x2={toSvgX(bounds.maxX)}
                    y2={toSvgY(ols.intercept + ols.slope * bounds.maxX)}
                    stroke="#2563eb"
                    strokeWidth="3"
                  />
                )}

                {/* Manual Regression Line (Amber) & Manual Residual Lines */}
                {showManualLine && (
                  <g key="manual-fit-layer">
                    {/* Manual vertical residual lines */}
                    {showResidualLines &&
                      points.map((p) => {
                        const predY = manualIntercept + manualSlope * p.x;
                        return (
                          <line
                            key={`man-res-${p.id}`}
                            x1={toSvgX(p.x)}
                            y1={toSvgY(p.y)}
                            x2={toSvgX(p.x)}
                            y2={toSvgY(predY)}
                            stroke="#f59e0b"
                            strokeDasharray="2 2"
                            strokeWidth="1.2"
                            strokeOpacity="0.85"
                          />
                        );
                      })}
                    <line
                      x1={toSvgX(bounds.minX)}
                      y1={toSvgY(manualIntercept + manualSlope * bounds.minX)}
                      x2={toSvgX(bounds.maxX)}
                      y2={toSvgY(manualIntercept + manualSlope * bounds.maxX)}
                      stroke="#d97706"
                      strokeWidth="2.5"
                      strokeDasharray="6 3"
                    />
                  </g>
                )}

                {/* Animated Convergence Line (Cyan) */}
                {(isAnimatingFit || animFrame > 0) && (
                  <g key="animated-fit-line">
                    <line
                      x1={toSvgX(bounds.minX)}
                      y1={toSvgY(animIntercept + animSlope * bounds.minX)}
                      x2={toSvgX(bounds.maxX)}
                      y2={toSvgY(animIntercept + animSlope * bounds.maxX)}
                      stroke="#06b6d4"
                      strokeWidth="4"
                      strokeDasharray={animFrame < TOTAL_ANIM_FRAMES ? '6 3' : undefined}
                    />
                    {points.map((p) => {
                      const px = toSvgX(p.x);
                      const py = toSvgY(p.y);
                      const trialY = animIntercept + animSlope * p.x;
                      const trialPy = toSvgY(trialY);
                      return (
                        <line
                          key={`anim-res-${p.id}`}
                          x1={px}
                          y1={py}
                          x2={px}
                          y2={trialPy}
                          stroke="#0284c7"
                          strokeWidth="1.2"
                          strokeDasharray="2 2"
                        />
                      );
                    })}
                  </g>
                )}

                {/* Residual Vertical Lines */}
                {showResidualLines &&
                  ols.diagnostics.map((diag) => {
                    const px = toSvgX(diag.x);
                    const py = toSvgY(diag.y);
                    const fitPy = toSvgY(diag.fittedY);
                    const isHighCook = diag.cooksDistance > 0.5;

                    return (
                      <line
                        key={`res-${diag.id}`}
                        x1={px}
                        y1={py}
                        x2={px}
                        y2={fitPy}
                        stroke={isHighCook ? '#e11d48' : '#ef4444'}
                        strokeWidth={isHighCook ? '2' : '1.2'}
                        strokeDasharray="3 2"
                      />
                    );
                  })}

                {/* Data Points */}
                {ols.diagnostics.map((diag) => {
                  const px = toSvgX(diag.x);
                  const py = toSvgY(diag.y);
                  const isSelected = diag.id === selectedPointId;
                  const isHighCook = diag.cooksDistance > 0.5;

                  return (
                    <g key={`pt-${diag.id}`} className="cursor-pointer">
                      {/* High Cook Outer Halo */}
                      {isHighCook && showOutlierAlerts && (
                        <circle
                          cx={px}
                          cy={py}
                          r="14"
                          fill="none"
                          stroke="#e11d48"
                          strokeWidth="2"
                          strokeDasharray="3 3"
                          className="animate-pulse"
                        />
                      )}

                      {/* Point Circle */}
                      <circle
                        cx={px}
                        cy={py}
                        r={isSelected ? 7 : 5.5}
                        fill={
                          isSelected
                            ? '#3b82f6'
                            : isHighCook
                            ? '#f43f5e'
                            : '#1e293b'
                        }
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="transition-all hover:scale-125"
                      />

                      {/* Point Label if outlier or selected */}
                      {(isSelected || isHighCook) && (
                        <text
                          x={px + 9}
                          y={py - 8}
                          fontSize="10"
                          fontWeight="bold"
                          fill={isHighCook ? '#e11d48' : '#1e293b'}
                        >
                          ({diag.x.toFixed(1)}, {diag.y.toFixed(1)})
                          {isHighCook ? ' ⚠️杠杆点' : ''}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Canvas Watermark & Legend Badge Overlay */}
              <div className="absolute top-2 right-2 flex items-center gap-2 pointer-events-none">
                {(showConfidenceBand || showPredictionBand || showMeanRefLines || showZeroSlopeLine) && (
                  <div className="bg-white/90 backdrop-blur-xs border border-slate-200/80 rounded-lg p-1.5 shadow-xs text-[10px] space-y-1">
                    {showMeanRefLines && (
                      <div className="flex items-center gap-1.5 text-emerald-900 font-medium">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white inline-block" />
                        <span>均值重心 (x̄={ols.meanX.toFixed(2)}, ȳ={ols.meanY.toFixed(2)})</span>
                      </div>
                    )}
                    {showZeroSlopeLine && (
                      <div className="flex items-center gap-1.5 text-teal-900 font-medium">
                        <span className="w-3 h-0.5 bg-teal-600 inline-block stroke-dashed" />
                        <span>零斜率基线 y=ȳ (R²=0 参考)</span>
                      </div>
                    )}
                    {showConfidenceBand && (
                      <div className="flex items-center gap-1.5 text-indigo-900 font-medium">
                        <span className="w-3 h-2 rounded bg-indigo-500/30 border border-indigo-600 inline-block" />
                        <span>95% 置信区间 (均值 E(Y|X) 不确定性)</span>
                      </div>
                    )}
                    {showPredictionBand && (
                      <div className="flex items-center gap-1.5 text-purple-900 font-medium">
                        <span className="w-3 h-2 rounded bg-purple-500/20 border border-purple-500 stroke-dashed inline-block" />
                        <span>95% 预测区间 (新样本 Y_0 波动范围)</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="absolute bottom-2 left-2 pointer-events-none text-[10px] text-slate-400 bg-white/80 px-2 py-0.5 rounded border border-slate-200">
                提示: 点击空白区域增加点，抓取数据点拖拽，或直接点击点进行选取
              </div>
            </div>

            {/* Manual Line Sliders Panel (If Enabled) */}
            {showManualLine && (
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between text-amber-900 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-amber-600" />
                    手动斜率与截距干预线
                  </span>
                  <span className="font-mono text-[11px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                    手动 $SSE = {manualSse.toFixed(2)}$ vs OLS 最优 $SSE ={' '}
                    {ols.sse.toFixed(2)}$
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                      <span>手动斜率 (<MathFormula formula="\hat{\beta}_1" />): {manualSlope}</span>
                      <span className="text-blue-600">
                        (OLS: {ols.slope.toFixed(2)})
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-2.0"
                      max="4.0"
                      step="0.05"
                      value={manualSlope}
                      onChange={(e) => setManualSlope(parseFloat(e.target.value))}
                      className="w-full accent-amber-600"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                      <span>手动截距 (<MathFormula formula="\hat{\beta}_0" />): {manualIntercept}</span>
                      <span className="text-blue-600">
                        (OLS: {ols.intercept.toFixed(2)})
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-5.0"
                      max="15.0"
                      step="0.2"
                      value={manualIntercept}
                      onChange={(e) =>
                        setManualIntercept(parseFloat(e.target.value))
                      }
                      className="w-full accent-amber-600"
                    />
                  </div>
                </div>
              </div>
            )}
            {/* Animated Fitting Progress Banner */}
            {(isAnimatingFit || animFrame > 0) && (
              <div className="bg-cyan-950 text-cyan-100 border border-cyan-800 rounded-xl p-3 text-xs space-y-2 shadow-md">
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5 text-cyan-300">
                    <Sparkles className={`w-4 h-4 text-cyan-400 ${isAnimatingFit ? 'animate-spin' : ''}`} />
                    最优拟合线 (梯度下降 SSE 最小化过程 - 第 {animFrame} / {TOTAL_ANIM_FRAMES} 步)
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] bg-cyan-900/80 text-cyan-200 px-2 py-0.5 rounded border border-cyan-700">
                      实时 SSE: {animSse.toFixed(2)} → OLS 最优: {ols.sse.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={handleStartAnimation}
                      className="p-1 hover:bg-cyan-900 rounded text-cyan-300 transition-colors"
                      title="重新演示最优拟合线"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="w-full bg-cyan-900/80 h-2 rounded-full overflow-hidden border border-cyan-800">
                  <div
                    className="bg-cyan-400 h-full transition-all duration-100"
                    style={{ width: `${(animFrame / TOTAL_ANIM_FRAMES) * 100}%` }}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-cyan-200/90 font-mono pt-0.5">
                  <div className="flex items-center gap-2">
                    <span>当前回归线:</span>
                    <MathFormula formula={`\\hat{Y} = ${animIntercept.toFixed(2)} + ${animSlope.toFixed(2)} X`} />
                  </div>
                  <div className="flex items-center gap-2 justify-start md:justify-end">
                    <span>梯度向量:</span>
                    <MathFormula formula={`\\nabla_{\\beta_0, \\beta_1} = (${animGradB0.toFixed(1)}, ${animGradB1.toFixed(1)})`} />
                  </div>
                </div>

                <div className="text-[11px] pt-1 border-t border-cyan-900 flex items-center justify-between">
                  <span className="text-cyan-300/80">
                    沿负梯度方向 <MathFormula formula="-\\nabla \\text{SSE}" /> 旋转平移调整回归线
                  </span>
                  <span>
                    {animFrame === TOTAL_ANIM_FRAMES ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> 已完美收敛至 OLS 理论最优拟合线！
                      </span>
                    ) : (
                      <span className="text-cyan-300 flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 animate-pulse" /> 正在动态逼近 SSE 极小值...
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Stats & OLS Diagnostic Panel (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* OLS Realtime Metrics Summary Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                实时 OLS 最小二乘求解结果
              </h2>
              <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                n = {ols.n}
              </span>
            </div>

            {/* Regression Equation */}
            <div className="bg-indigo-50/80 border border-indigo-100 p-3 rounded-xl text-center">
              <div className="text-xs text-indigo-700 font-medium mb-1">
                最佳拟合线性方程 (OLS Fitted Equation)
              </div>
              <div className="text-sm font-mono font-bold text-indigo-900">
                <MathFormula
                  formula={`\\hat{Y} = ${ols.intercept.toFixed(
                    3
                  )} + ${ols.slope.toFixed(3)} X`}
                />
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="text-slate-500 text-[11px]">拟合优度 R²</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {(ols.r2 * 100).toFixed(1)}%
                </div>
                <div className="text-[10px] text-slate-400">
                  Adj R²: {(ols.adjR2 * 100).toFixed(1)}%
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="text-slate-500 text-[11px]">残差平方和 SSE</div>
                <div className="text-sm font-bold text-rose-600 mt-0.5">
                  {ols.sse.toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-400">
                  RMSE: {ols.rmse.toFixed(2)}
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="text-slate-500 text-[11px]">斜率检验 t 值</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {ols.tSlope.toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-400">
                  p: {ols.pSlope.toExponential(2)}
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="text-slate-500 text-[11px]">整体 F 检验</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {ols.fStat.toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-400">
                  p: {ols.fPvalue.toExponential(2)}
                </div>
              </div>
            </div>

            {/* Selected Point Diagnostic Detail */}
            {selectedPointId && (
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-1.5 text-xs">
                {(() => {
                  const ptDiag = ols.diagnostics.find(
                    (d) => d.id === selectedPointId
                  );
                  if (!ptDiag) return null;
                  const isHighCook = ptDiag.cooksDistance > 0.5;

                  return (
                    <>
                      <div className="flex items-center justify-between font-bold text-slate-800">
                        <span>选中样本数据点详情</span>
                        {isHighCook && (
                          <span className="text-rose-600 font-normal text-[11px]">
                            ⚠️ Cook 距离过高
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-600">
                        <div>坐标: ({ptDiag.x}, {ptDiag.y})</div>
                        <div>拟合值: {ptDiag.fittedY.toFixed(2)}</div>
                        <div>残差: {ptDiag.residual.toFixed(2)}</div>
                        <div>杠杆率: {ptDiag.leverage.toFixed(3)}</div>
                        <div className="col-span-2 font-mono text-slate-700">
                          Cook's Distance D_i: {ptDiag.cooksDistance.toFixed(3)}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Manual Fitting Sliders & SSE Comparison Card */}
          <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-amber-200/60 pb-2.5">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-700" />
                <h3 className="text-xs font-bold text-amber-900">
                  手动微调斜率/截距 (Manual Fit vs OLS)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowManualLine(!showManualLine)}
                className={`text-[10px] font-bold px-2 py-0.5 rounded transition-all ${
                  showManualLine
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-amber-800 border border-amber-300 hover:bg-amber-100'
                }`}
              >
                {showManualLine ? '已显示手动线' : '显示手动线'}
              </button>
            </div>

            {/* Manual Equation & SSE Metric Comparison */}
            <div className="bg-white rounded-xl border border-amber-200/80 p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600 font-medium">手动拟合方程:</span>
                <span className="font-mono font-bold text-amber-800">
                  <MathFormula
                    formula={`\\hat{Y}_{man} = ${manualIntercept.toFixed(2)} + ${manualSlope.toFixed(2)} X`}
                  />
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-center">
                <div className="p-2 rounded-lg bg-amber-50 border border-amber-100">
                  <div className="text-[10px] text-amber-800 font-medium">手动残差平方和 SSE</div>
                  <div className="text-sm font-bold text-amber-900 font-mono mt-0.5">
                    {manualSse.toFixed(2)}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-100">
                  <div className="text-[10px] text-indigo-800 font-medium">OLS 极小 SSE (最优)</div>
                  <div className="text-sm font-bold text-indigo-900 font-mono mt-0.5">
                    {ols.sse.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="text-[10px] pt-1 flex items-center justify-between text-slate-600">
                <span>残差增量 ΔSSE:</span>
                <span
                  className={`font-mono font-bold px-1.5 py-0.5 rounded ${
                    manualSse - ols.sse < 0.01
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {manualSse - ols.sse < 0.01
                    ? '已达 OLS 最优解 (ΔSSE ≈ 0)'
                    : `+${(manualSse - ols.sse).toFixed(2)} (+${(((manualSse - ols.sse) / (ols.sse || 1)) * 100).toFixed(1)}%)`}
                </span>
              </div>
            </div>

            {/* Sliders Controls */}
            <div className="space-y-2.5 text-xs">
              {/* Slope Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-slate-700 font-medium text-[11px]">
                  <span>斜率 (Slope β₁):</span>
                  <span className="font-mono font-bold text-amber-800">
                    {manualSlope.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="-3"
                  max="5"
                  step="0.05"
                  value={manualSlope}
                  onChange={(e) => {
                    setManualSlope(parseFloat(e.target.value));
                    if (!showManualLine) setShowManualLine(true);
                  }}
                  className="w-full accent-amber-600 cursor-pointer h-1.5 bg-amber-200/80 rounded-lg"
                />
                <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                  <span>-3.0</span>
                  <span className="text-indigo-600 font-bold">OLS 最优: {ols.slope.toFixed(2)}</span>
                  <span>+5.0</span>
                </div>
              </div>

              {/* Intercept Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-slate-700 font-medium text-[11px]">
                  <span>截距 (Intercept β₀):</span>
                  <span className="font-mono font-bold text-amber-800">
                    {manualIntercept.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="-5"
                  max="15"
                  step="0.1"
                  value={manualIntercept}
                  onChange={(e) => {
                    setManualIntercept(parseFloat(e.target.value));
                    if (!showManualLine) setShowManualLine(true);
                  }}
                  className="w-full accent-amber-600 cursor-pointer h-1.5 bg-amber-200/80 rounded-lg"
                />
                <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                  <span>-5.0</span>
                  <span className="text-indigo-600 font-bold">OLS 最优: {ols.intercept.toFixed(2)}</span>
                  <span>+15.0</span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setManualSlope(parseFloat(ols.slope.toFixed(3)));
                    setManualIntercept(parseFloat(ols.intercept.toFixed(3)));
                    setShowManualLine(true);
                  }}
                  className="flex-1 py-1.5 px-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors text-[11px] flex items-center justify-center gap-1 shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  一键对齐 OLS 最优解
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setManualSlope(0);
                    setManualIntercept(ols.meanY);
                    setShowManualLine(true);
                  }}
                  className="py-1.5 px-2 bg-white border border-amber-300 text-amber-800 font-medium hover:bg-amber-100 rounded-lg transition-colors text-[11px]"
                >
                  重置零斜率线
                </button>
              </div>
            </div>
          </div>

          {/* Theoretical Insight Box */}
          <div className="bg-indigo-900 text-white rounded-2xl p-4 space-y-2 text-xs shadow-md">
            <div className="font-bold flex items-center gap-1.5 text-indigo-200">
              <Info className="w-4 h-4 text-indigo-300" />
              沙盒观察要点 (Sandbox Key Observations)
            </div>
            <ul className="list-disc pl-4 space-y-1.5 text-indigo-100/90 leading-relaxed text-[11px]">
              <li>
                <strong>拉扯极端高杠杆点</strong>: 将 X 坐标极大 (例如 X=9.8) 的点沿纵轴上下大幅拉拽，观察蓝色的 OLS 回归线如何发生剧烈倾斜。
              </li>
              <li>
                <strong>残差平方和极小性</strong>: 开启“手动拟合线”，无论如何手动微调，手动线算出的 SSE 必定大于或等于 OLS 算出的最小值。
              </li>
              <li>
                <strong>置信带与预测带喇叭形状</strong>: 边缘处的置信带比均值处显著增宽，说明远离中心位置的预测不确定性更高。
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* OLS Optimality Theoretical Explanation Section */}
      <div className="bg-white rounded-2xl border border-indigo-100 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              为什么 OLS 回归曲线是唯一最优解？ (Why OLS Regression Curve is Strictly Optimal)
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setShowOptimalityExplanation((prev) => !prev)}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          >
            {showOptimalityExplanation ? '收起详解' : '展开详解'}
          </button>
        </div>

        {showOptimalityExplanation && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
            {/* Principle 1: SSE Minimization & Calculus */}
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 space-y-2">
              <div className="font-bold text-indigo-900 flex items-center gap-1.5 text-xs">
                <Zap className="w-4 h-4 text-indigo-600" />
                1. 极小化残差平方和原理 (SSE Minimization)
              </div>
              <p className="leading-relaxed text-[11px] text-slate-700">
                OLS 目标是寻找到最佳参数 <MathFormula formula="(\hat{\beta}_0, \hat{\beta}_1)" /> 使得样本点到直线的纵向误差平方和 <MathFormula formula="SSE = \sum e_i^2" /> 严格最小：
              </p>
              <div className="bg-white p-2 rounded border border-indigo-100 text-center font-mono text-[11px]">
                <MathFormula formula="SSE(\hat{\beta}_0, \hat{\beta}_1) = \sum_{i=1}^n \left(y_i - (\hat{\beta}_0 + \hat{\beta}_1 x_i)\right)^2" />
              </div>
              <p className="leading-relaxed text-[11px] text-slate-600">
                根据微积分求导极值条件，令偏导数 <MathFormula formula="\frac{\partial SSE}{\partial \hat{\beta}_0} = 0" /> 与 <MathFormula formula="\frac{\partial SSE}{\partial \hat{\beta}_1} = 0" />，得到唯一确定的正态方程解：
              </p>
              <div className="bg-white p-2 rounded border border-indigo-100 text-center font-mono text-[11px] text-indigo-900">
                <MathFormula formula="\sum e_i = 0 \quad \text{且} \quad \sum x_i e_i = 0" />
              </div>
            </div>

            {/* Principle 2: Gauss-Markov Theorem */}
            <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-4 space-y-2">
              <div className="font-bold text-purple-900 flex items-center gap-1.5 text-xs">
                <Award className="w-4 h-4 text-purple-600" />
                2. 高斯-马尔可夫定理 (Gauss-Markov Theorem & BLUE)
              </div>
              <p className="leading-relaxed text-[11px] text-slate-700">
                在经典线性回归假设（线性、外生性 <MathFormula formula="\mathbb{E}(e|X)=0" />、同方差 <MathFormula formula="Var(e|X)=\sigma^2" />、无自相关）成立前提下：
              </p>
              <div className="bg-white p-2 rounded border border-purple-100 text-center font-mono text-[11px] text-purple-900 font-bold">
                OLS 估计量是最佳线性无偏估计量 (BLUE)
              </div>
              <p className="leading-relaxed text-[11px] text-slate-600">
                “BLUE”意味着在所有对 <MathFormula formula="\beta_1" /> 的线性无偏估计量中，OLS 具有<strong>最小的方差 <MathFormula formula="Var(\hat{\beta}_1)" /></strong>，估计效率最高、预测误差波动最小。
              </p>
            </div>

            {/* Principle 3: Orthogonal Geometric Projection */}
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 space-y-2">
              <div className="font-bold text-blue-900 flex items-center gap-1.5 text-xs">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                3. 正交向量投影几何观 (Orthogonal Projection)
              </div>
              <p className="leading-relaxed text-[11px] text-slate-700">
                在 <MathFormula formula="n" /> 维欧式向量空间中，观察向量 <MathFormula formula="\mathbf{Y}" /> 向由特征列向量 <MathFormula formula="\mathbf{X}" /> 生成的列空间进行<strong>正交投影</strong>：
              </p>
              <div className="bg-white p-2 rounded border border-blue-100 text-center font-mono text-[11px] text-blue-900">
                <MathFormula formula="\hat{\mathbf{Y}} = \mathbf{X}\hat{\mathbf{\beta}} = \mathbf{X}(\mathbf{X}^T\mathbf{X})^{-1}\mathbf{X}^T\mathbf{Y}" />
              </div>
              <p className="leading-relaxed text-[11px] text-slate-600">
                垂足点 <MathFormula formula="\hat{\mathbf{Y}}" /> 使得残差向量 <MathFormula formula="\mathbf{e} = \mathbf{Y} - \hat{\mathbf{Y}}" /> 正交于 <MathFormula formula="\mathbf{X}" />，勾股定理保证了此正交投影线段欧氏距离最短。
              </p>
            </div>

            {/* Principle 4: Pass Through Sample Centroid */}
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 space-y-2">
              <div className="font-bold text-emerald-900 flex items-center gap-1.5 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                4. 必过样本重心 (Passes Through Centroid)
              </div>
              <p className="leading-relaxed text-[11px] text-slate-700">
                因为 <MathFormula formula="\sum e_i = 0" />，所以 OLS 截距满足 <MathFormula formula="\hat{\beta}_0 = \bar{y} - \hat{\beta}_1 \bar{x}" />，回归线严格通过样本物理重心 <MathFormula formula="(\bar{x}, \bar{y})" />：
              </p>
              <div className="bg-white p-2 rounded border border-emerald-100 text-center font-mono text-[11px] text-emerald-900 font-bold">
                <MathFormula formula="\bar{y} = \hat{\beta}_0 + \hat{\beta}_1 \bar{x}" />
              </div>
              <p className="leading-relaxed text-[11px] text-slate-600">
                任何偏离重心的旋转都会导致总体拟合偏差与残差平方和爆发式剧增，因此 OLS 回归线在数学与几何层面均具有<strong>唯一最优性</strong>。
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
