import React, { useState, useMemo } from 'react';
import { CASE_PRESETS } from '../data/presets';
import { calculateOLS } from '../utils/mathStats';
import { DataPoint, OLSResult } from '../types';
import { MathFormula } from './MathFormula';
import {
  Compass,
  ArrowRight,
  Sparkles,
  Layers,
  AlertTriangle,
  BarChart2,
  CheckCircle2,
} from 'lucide-react';

interface ClassicCasesProps {
  onLoadPresetToSandbox: (points: DataPoint[]) => void;
}

export const ClassicCases: React.FC<ClassicCasesProps> = ({
  onLoadPresetToSandbox,
}) => {
  const [selectedCaseId, setSelectedCaseId] = useState<string>('anscombe-quartet');
  const [simpsonShowGroupLines, setSimpsonShowGroupLines] = useState<boolean>(true);

  // Filter Anscombe presets
  const anscombePresets = useMemo(() => {
    return CASE_PRESETS.filter((p) => p.category === 'anscombe');
  }, []);

  const selectedPreset = useMemo(() => {
    return CASE_PRESETS.find((p) => p.id === selectedCaseId) || CASE_PRESETS[0];
  }, [selectedCaseId]);

  // Anscombe 4 OLS calculations
  const anscombeOLSResults = useMemo(() => {
    return anscombePresets.map((preset) => ({
      preset,
      ols: calculateOLS(preset.points),
    }));
  }, [anscombePresets]);

  // Simpson's Paradox calculations
  const simpsonPreset = CASE_PRESETS.find((p) => p.id === 'simpsons-paradox')!;
  const simpsonOverallOLS = useMemo(
    () => calculateOLS(simpsonPreset.points),
    [simpsonPreset]
  );

  const simpsonGroupA = useMemo(
    () => simpsonPreset.points.filter((p) => p.group === 'group-a'),
    [simpsonPreset]
  );
  const simpsonGroupB = useMemo(
    () => simpsonPreset.points.filter((p) => p.group === 'group-b'),
    [simpsonPreset]
  );

  const simpsonOLSA = useMemo(() => calculateOLS(simpsonGroupA), [simpsonGroupA]);
  const simpsonOLSB = useMemo(() => calculateOLS(simpsonGroupB), [simpsonGroupB]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Title Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-indigo-600" />
            <h1 className="text-lg font-bold text-slate-900">
              经典案例与反例剖析 (Classic Case Studies & Counterexamples)
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            内置经典拟合场景与统计学佯谬，演示“为什么只看数值指标不行，看散点图形更重要”。
          </p>
        </div>

        {/* Case Switcher Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setSelectedCaseId('anscombe-quartet')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              selectedCaseId === 'anscombe-quartet'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Anscombe 四重奏
          </button>
          <button
            onClick={() => setSelectedCaseId('simpsons-paradox')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              selectedCaseId === 'simpsons-paradox'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            辛普森悖论
          </button>
          <button
            onClick={() => setSelectedCaseId('advertising-sales')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              selectedCaseId === 'advertising-sales'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            广告投入与销售额
          </button>
          <button
            onClick={() => setSelectedCaseId('heteroscedasticity')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              selectedCaseId === 'heteroscedasticity'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            异方差示例
          </button>
        </div>
      </div>

      {/* Case 1: Anscombe's Quartet 4-Panel Grid */}
      {selectedCaseId === 'anscombe-quartet' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-indigo-300 bg-indigo-500/20 px-2.5 py-1 rounded-full border border-indigo-400/30">
                F. J. Anscombe (1973) 统计学传奇经典
              </span>
              <button
                onClick={() =>
                  onLoadPresetToSandbox(anscombePresets[0].points)
                }
                className="flex items-center gap-1.5 text-xs bg-indigo-500 hover:bg-indigo-400 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
              >
                推送 Ⅰ 号曲线至沙盒 <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <h2 className="text-xl font-bold">Anscombe 四重奏 (Anscombe\'s Quartet)</h2>
            <p className="text-slate-300 text-xs leading-relaxed max-w-4xl">
              以下 4 组数据虽然散点分布形态完全不同（从完美直线、二次曲线，到带离群点与极值杠杆点），但通过方程算出的{' '}
              <strong className="text-indigo-200">
                均值 <MathFormula formula="\bar{x}=9.0, \bar{y}=7.5" />、OLS 斜率 <MathFormula formula="\beta_1 \approx 0.50" />、截距 <MathFormula formula="\beta_0 \approx 3.00" /> 与 <MathFormula formula="R^2 \approx 0.67" /> 几乎完全一致！
              </strong>
            </p>
          </div>

          {/* 4-Panel Canvas Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {anscombeOLSResults.map(({ preset, ols }, idx) => {
              const W = 320;
              const H = 220;
              const pad = { t: 20, r: 20, b: 30, l: 35 };

              const toSx = (x: number) =>
                pad.l + ((x - 2) / 18) * (W - pad.l - pad.r);
              const toSy = (y: number) =>
                pad.t + (1 - (y - 2) / 12) * (H - pad.t - pad.b);

              return (
                <div
                  key={preset.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3 hover:border-indigo-300 transition-colors"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-bold text-xs text-slate-900">
                      {preset.title}
                    </span>
                    <button
                      onClick={() => onLoadPresetToSandbox(preset.points)}
                      className="text-[11px] text-indigo-600 hover:underline font-medium"
                    >
                      载入此组
                    </button>
                  </div>

                  {/* SVG Chart */}
                  <div className="bg-slate-50/70 border border-slate-200/60 rounded-xl overflow-hidden">
                    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
                      {/* Grid */}
                      {[4, 8, 12, 16].map((xV) => (
                        <line
                          key={xV}
                          x1={toSx(xV)}
                          y1={pad.t}
                          x2={toSx(xV)}
                          y2={H - pad.b}
                          stroke="#cbd5e1"
                          strokeDasharray="2 2"
                        />
                      ))}
                      {[4, 8, 12].map((yV) => (
                        <line
                          key={yV}
                          x1={pad.l}
                          y1={toSy(yV)}
                          x2={W - pad.r}
                          y2={toSy(yV)}
                          stroke="#cbd5e1"
                          strokeDasharray="2 2"
                        />
                      ))}

                      {/* Regression Line */}
                      <line
                        x1={toSx(2)}
                        y1={toSy(ols.intercept + ols.slope * 2)}
                        x2={toSx(20)}
                        y2={toSy(ols.intercept + ols.slope * 20)}
                        stroke="#2563eb"
                        strokeWidth="2"
                      />

                      {/* Points */}
                      {preset.points.map((pt) => (
                        <circle
                          key={pt.id}
                          cx={toSx(pt.x)}
                          cy={toSy(pt.y)}
                          r={pt.isOutlier ? 6 : 4.5}
                          fill={pt.isOutlier ? '#f43f5e' : '#0f172a'}
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                      ))}
                    </svg>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    💡 <strong>形变特点</strong>: {preset.insights}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Unified Stats Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-indigo-600" />
              Anscombe 四组数据的统计指标精确对比表
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-700 border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 border-b border-slate-200">
                    <th className="p-2.5">数据组别</th>
                    <th className="p-2.5">均值 <MathFormula formula="\bar{x}" /></th>
                    <th className="p-2.5">均值 <MathFormula formula="\bar{y}" /></th>
                    <th className="p-2.5">OLS 斜率 (<MathFormula formula="\hat{\beta}_1" />)</th>
                    <th className="p-2.5">OLS 截距 (<MathFormula formula="\hat{\beta}_0" />)</th>
                    <th className="p-2.5">拟合优度 <MathFormula formula="R^2" /></th>
                    <th className="p-2.5">残差平方和 SSE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {anscombeOLSResults.map(({ preset, ols }) => (
                    <tr key={preset.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold font-sans text-slate-900">
                        {preset.title.split(':')[0]}
                      </td>
                      <td className="p-2.5">{ols.meanX.toFixed(2)}</td>
                      <td className="p-2.5">{ols.meanY.toFixed(2)}</td>
                      <td className="p-2.5 text-indigo-600 font-bold">
                        {ols.slope.toFixed(2)}
                      </td>
                      <td className="p-2.5 text-indigo-600 font-bold">
                        {ols.intercept.toFixed(2)}
                      </td>
                      <td className="p-2.5 font-bold text-emerald-600">
                        {(ols.r2 * 100).toFixed(1)}%
                      </td>
                      <td className="p-2.5">{ols.sse.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Case 2: Simpson's Paradox */}
      {selectedCaseId === 'simpsons-paradox' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                  分组与总体方向完全颠倒的惊人现象
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-1">
                  辛普森悖论 (Simpson\'s Paradox)
                </h2>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => setSimpsonShowGroupLines(!simpsonShowGroupLines)}
                  className={`px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                    simpsonShowGroupLines
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {simpsonShowGroupLines ? '显示组内独立拟合线' : '显示混合总体拟合线'}
                </button>
                <button
                  onClick={() => onLoadPresetToSandbox(simpsonPreset.points)}
                  className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg font-medium transition-colors"
                >
                  推送至沙盒
                </button>
              </div>
            </div>

            {/* Simpson Plot */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-xl p-3">
                <svg viewBox="0 0 500 320" className="w-full h-auto">
                  {/* Grid */}
                  {[2, 4, 6, 8, 10].map((x) => (
                    <line
                      key={x}
                      x1={40 + ((x - 0) / 11) * 440}
                      y1={20}
                      x2={40 + ((x - 0) / 11) * 440}
                      y2={280}
                      stroke="#e2e8f0"
                      strokeDasharray="2 2"
                    />
                  ))}

                  {/* Overall Pooled Regression Line (Negative Slope) */}
                  <line
                    x1={40 + ((1.0 - 0) / 11) * 440}
                    y1={20 + (1 - (simpsonOverallOLS.intercept + simpsonOverallOLS.slope * 1.0) / 35) * 260}
                    x2={40 + ((10.5 - 0) / 11) * 440}
                    y2={20 + (1 - (simpsonOverallOLS.intercept + simpsonOverallOLS.slope * 10.5) / 35) * 260}
                    stroke="#1e293b"
                    strokeWidth="3"
                    strokeDasharray={simpsonShowGroupLines ? '6 4' : 'none'}
                  />

                  {/* Group A Line (Blue - Positive Slope) */}
                  {simpsonShowGroupLines && (
                    <line
                      x1={40 + ((1.0 - 0) / 11) * 440}
                      y1={20 + (1 - (simpsonOLSA.intercept + simpsonOLSA.slope * 1.0) / 35) * 260}
                      x2={40 + ((5.5 - 0) / 11) * 440}
                      y2={20 + (1 - (simpsonOLSA.intercept + simpsonOLSA.slope * 5.5) / 35) * 260}
                      stroke="#2563eb"
                      strokeWidth="3"
                    />
                  )}

                  {/* Group B Line (Red - Positive Slope) */}
                  {simpsonShowGroupLines && (
                    <line
                      x1={40 + ((5.5 - 0) / 11) * 440}
                      y1={20 + (1 - (simpsonOLSB.intercept + simpsonOLSB.slope * 5.5) / 35) * 260}
                      x2={40 + ((10.5 - 0) / 11) * 440}
                      y2={20 + (1 - (simpsonOLSB.intercept + simpsonOLSB.slope * 10.5) / 35) * 260}
                      stroke="#e11d48"
                      strokeWidth="3"
                    />
                  )}

                  {/* Group Points */}
                  {simpsonPreset.points.map((p) => {
                    const sx = 40 + ((p.x - 0) / 11) * 440;
                    const sy = 20 + (1 - p.y / 35) * 260;
                    const isGroupA = p.group === 'group-a';

                    return (
                      <circle
                        key={p.id}
                        cx={sx}
                        cy={sy}
                        r="6"
                        fill={isGroupA ? '#2563eb' : '#e11d48'}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    );
                  })}
                </svg>
              </div>

              {/* Comparison Text Details */}
              <div className="lg:col-span-5 space-y-3 text-xs">
                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl space-y-1">
                  <div className="font-bold text-indigo-900">
                    全样本不分组回归 (Pooled Regression)
                  </div>
                  <div className="font-mono text-slate-700 flex items-center gap-1">
                    <span>斜率 <MathFormula formula="\hat{\beta}_1" /> =</span>
                    <span>{simpsonOverallOLS.slope.toFixed(2)} (负斜率!)</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    直观结论：投入越多，销售收益反而越低 ❌ (错误结论!)
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl space-y-1">
                  <div className="font-bold text-emerald-900">
                    组 A 独立回归 (Product Line A)
                  </div>
                  <div className="font-mono text-slate-700 flex items-center gap-1">
                    <span>斜率 <MathFormula formula="\hat{\beta}_1" /> =</span>
                    <span>{simpsonOLSA.slope.toFixed(2)} (正斜率!)</span>
                  </div>
                </div>

                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl space-y-1">
                  <div className="font-bold text-rose-900">
                    组 B 独立回归 (Product Line B)
                  </div>
                  <div className="font-mono text-slate-700 flex items-center gap-1">
                    <span>斜率 <MathFormula formula="\hat{\beta}_1" /> =</span>
                    <span>{simpsonOLSB.slope.toFixed(2)} (正斜率!)</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
                  💡 <strong>反转原因</strong>: 产品线 A 与 B 在基线客单价与投入基数上存在巨大差异（潜藏的混淆变量）。忽视分组直接做全局线性回归，会导致极度危险的反向误导！
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Case 3: Advertising & Sales or Heteroscedasticity */}
      {(selectedCaseId === 'advertising-sales' ||
        selectedCaseId === 'heteroscedasticity') && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {selectedPreset.title}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedPreset.description}
              </p>
            </div>
            <button
              onClick={() => onLoadPresetToSandbox(selectedPreset.points)}
              className="bg-indigo-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors"
            >
              在沙盒中进行交互微调
            </button>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              现实业务启示:
            </div>
            <p className="leading-relaxed">{selectedPreset.insights}</p>
          </div>
        </div>
      )}
    </div>
  );
};
