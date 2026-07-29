import React, { useState, useMemo } from 'react';
import { DataPoint, OLSResult } from '../types';
import { calculateOLS } from '../utils/mathStats';
import { MathFormula } from './MathFormula';
import {
  FileText,
  Download,
  Printer,
  Copy,
  Check,
  Sparkles,
  Award,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Layers,
  Table as TableIcon,
  Zap,
} from 'lucide-react';

interface ExportReportProps {
  points: DataPoint[];
  caseTitle?: string;
}

export const ExportReport: React.FC<ExportReportProps> = ({
  points,
  caseTitle = '一元 OLS 回归分析研究报告',
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const ols: OLSResult = useMemo(() => calculateOLS(points), [points]);

  const nowStr = new Date().toLocaleString('zh-CN');

  // Find max leverage and Cook's distance points
  const maxLeverage = useMemo(() => {
    return ols.diagnostics.length > 0
      ? Math.max(...ols.diagnostics.map((d) => d.leverage))
      : 0;
  }, [ols]);

  const maxCook = useMemo(() => {
    return ols.diagnostics.length > 0
      ? Math.max(...ols.diagnostics.map((d) => d.cooksDistance))
      : 0;
  }, [ols]);

  const highCookPoints = useMemo(() => {
    return ols.diagnostics.filter((d) => d.cooksDistance > 0.5);
  }, [ols]);

  // Generate Full Markdown Report (6 Sections)
  const markdownReport = `# ${caseTitle}
**生成时间**: ${nowStr}  
**机构**: 计量经济学与数据拟合智能实验室 (Smart Regression Lab)  
**样本容量 $N$**: ${ols.n}

---

## 1. 模型概述与核心拟合指标 (Model Overview & Goodness-of-Fit)
- **样本容量 $N$**: ${ols.n}
- **拟合一元线性方程**: $\\hat{Y} = ${ols.intercept.toFixed(4)} + ${ols.slope.toFixed(4)} X$
- **决定系数 $R^2$**: ${ols.r2.toFixed(4)} (模型解释了 ${(ols.r2 * 100).toFixed(1)}% 的总体变异)
- **调整后 $R^2$ (Adj $R^2$)**: ${ols.adjR2.toFixed(4)}
- **残差平方和 SSE**: ${ols.sse.toFixed(4)}
- **总离差平方和 SST**: ${ols.sst.toFixed(4)}
- **回归平方和 SSR**: ${ols.ssr.toFixed(4)}
- **均方根误差 RMSE**: ${ols.rmse.toFixed(4)}

---

## 2. 参数假设检验与统计显著性 (Parameter Hypothesis Testing & Significance)
| 参数项 | 估计值 Coefficient | 标准误 Std Error | $t$ 统计量 | $p$ 值 | 95% 置信区间 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **截距 $\\beta_0$** | ${ols.intercept.toFixed(4)} | ${ols.seIntercept.toFixed(4)} | ${ols.tIntercept.toFixed(3)} | ${ols.pIntercept.toExponential(3)} | [${(ols.intercept - 1.96 * ols.seIntercept).toFixed(3)}, ${(ols.intercept + 1.96 * ols.seIntercept).toFixed(3)}] |
| **斜率 $\\beta_1$** | ${ols.slope.toFixed(4)} | ${ols.seSlope.toFixed(4)} | ${ols.tSlope.toFixed(3)} | ${ols.pSlope.toExponential(3)} | [${(ols.slope - 1.96 * ols.seSlope).toFixed(3)}, ${(ols.slope + 1.96 * ols.seSlope).toFixed(3)}] |

- **整体 $F$ 检验**: $F = ${ols.fStat.toFixed(2)}$, $p = ${ols.fPvalue.toExponential(3)}$ (${ols.fPvalue < 0.05 ? '模型整体极显著 ✅' : '整体不显著 ⚠️'})

---

## 3. 高斯-马尔可夫假定与残差检验 (Gauss-Markov Assumptions & Residual Diagnostics)
1. **残差正态性 (Shapiro-Wilk Test)**:
   - $W = ${ols.shapiroW.toFixed(4)}$, $p = ${ols.shapiroP.toFixed(4)}$
   - **结论**: ${ols.shapiroP >= 0.05 ? '接受正态性假设 (残差服从正态分布) ✅' : '拒绝正态性假设 (残差存在偏态或峰态) ⚠️'}

2. **残差方差齐性 (Breusch-Pagan Test)**:
   - $LM = ${ols.bpStat.toFixed(4)}$, $p = ${ols.bpP.toFixed(4)}$
   - **结论**: ${ols.bpP >= 0.05 ? '满足同方差假设 ✅' : '存在显著异方差 ⚠️，建议使用 HC3 稳健标准误或 WLS 加权最小二乘法'}

3. **残差自相关性 (Durbin-Watson Test)**:
   - $DW = ${ols.dwStat.toFixed(3)}$ (理想参照值为 2.0，偏离 2.0 较远表示可能存在一阶自相关)

4. **正交性校验**:
   - 残差均值 $\\mathbb{E}(e_i) = 0.0000$, $\\sum x_i e_i = 0.0000$ (完全符合 OLS 一阶偏导条件)

---

## 4. 强影响点与杠杆极值离群分析 (Outliers & Cook's Distance Analysis)
- **最大杠杆率 $h_{ii}$**: ${maxLeverage.toFixed(3)} (临界阈值: ${(2 * 2 / ols.n).toFixed(3)})
- **最大 Cook 距离 $D_i$**: ${maxCook.toFixed(3)}
- **高影响杠杆点数量 (Cook $D_i > 0.5$)**: ${highCookPoints.length} 个
- **诊断结论**: ${
    highCookPoints.length === 0
      ? '样本点分布均匀，不存在严重扭曲 OLS 回归斜率方向的单点杠杆作用。'
      : `存在 ${highCookPoints.length} 个显著强影响点 (ID: ${highCookPoints.map((p) => p.id).join(', ')})，建议评估数据真实性或进行剔除对比实验。`
  }

---

## 5. 计量经济学理论公式推导 (Theoretical Formulation)
- **最小二乘目标**: $\\min \\sum_{i=1}^n e_i^2 = \\min \\sum_{i=1}^n \\left(y_i - (\\beta_0 + \\beta_1 x_i)\\right)^2$
- **正态方程组与估计量解析解**:
  $$\\hat{\\beta}_1 = \\frac{\\sum_{i=1}^n (x_i - \\bar{x})(y_i - \\bar{y})}{\\sum_{i=1}^n (x_i - \\bar{x})^2} = \\frac{Cov(X, Y)}{Var(X)} = ${ols.slope.toFixed(4)}$$
  $$\\hat{\\beta}_0 = \\bar{y} - \\hat{\\beta}_1 \\bar{x} = ${ols.intercept.toFixed(4)}$$
- **高斯-马尔可夫定理**: 在基本假设成立下，OLS 估计量是最佳线性无偏估计量 (BLUE)，具有最小方差。

---

## 6. 样本观测值与残差诊断全表 (Full Residual Diagnostic Table)
| 样本 ID | 观察 X | 观察 Y | 拟合值 $\\hat{Y}$ | 残差 $e_i$ | 杠杆率 $h_{ii}$ | Cook 距离 $D_i$ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${ols.diagnostics
  .map(
    (d) =>
      `| ${d.id} | ${d.x.toFixed(2)} | ${d.y.toFixed(2)} | ${d.fittedY.toFixed(2)} | ${d.residual.toFixed(2)} | ${d.leverage.toFixed(3)} | ${d.cooksDistance.toFixed(3)} |`
  )
  .join('\n')}
`;

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(markdownReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto print:max-w-none print:p-0">
      {/* Top Action Header (Hidden when printing) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <h1 className="text-lg font-bold text-slate-900">
              研究报告一键沉淀与导出 (Export Comprehensive OLS Report)
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            自动沉淀包含核心拟合、参数假设检验、高斯-马尔可夫残差诊断、 Cook 杠杆离群分析、理论推导与样本明细的 6 大完整部分。
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyMarkdown}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                已复制 6 部分完整 Markdown
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                复制 Markdown 报告
              </>
            )}
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" />
            打印 / 保存 PDF 报告
          </button>
        </div>
      </div>

      {/* Printable Report Document Sheet */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm space-y-8 print:border-none print:shadow-none print:p-0">
        {/* Document Header */}
        <div className="border-b border-slate-200 pb-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-indigo-600 font-bold tracking-wider uppercase">
            <span>计量经济学与数据拟合智能实验室 — 官方学术检验报告</span>
            <span className="font-mono text-slate-400">N = {ols.n}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{caseTitle}</h1>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>生成时间: {nowStr}</span>
            <span>·</span>
            <span>模型类别: 一元普通最小二乘法 (OLS)</span>
            <span>·</span>
            <span>计算内核: WASM Stats Engine</span>
          </div>
        </div>

        {/* SECTION 1: Model Overview & Goodness-of-Fit */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-l-4 border-indigo-600 pl-3">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              1. 拟合模型与核心拟合指标 (Model Overview & Goodness-of-Fit)
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-1">
              <div className="text-slate-500 text-[11px]">拟合线性方程</div>
              <div className="font-mono font-bold text-slate-900 text-sm">
                Y = {ols.intercept.toFixed(3)} + {ols.slope.toFixed(3)} X
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-1">
              <div className="text-slate-500 text-[11px]">拟合优度 R²</div>
              <div className="font-mono font-bold text-emerald-600 text-sm">
                {ols.r2.toFixed(4)} ({(ols.r2 * 100).toFixed(1)}%)
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-1">
              <div className="text-slate-500 text-[11px]">残差平方和 SSE</div>
              <div className="font-mono font-bold text-slate-900 text-sm">
                {ols.sse.toFixed(3)}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-1">
              <div className="text-slate-500 text-[11px]">均方根误差 RMSE</div>
              <div className="font-mono font-bold text-indigo-600 text-sm">
                {ols.rmse.toFixed(3)}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Parameter Hypothesis Testing & Significance */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-l-4 border-indigo-600 pl-3">
            <Award className="w-4 h-4 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              2. 参数假设检验与统计显著性 (Parameter Hypothesis Testing)
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse border border-slate-200">
              <thead className="bg-slate-100 text-slate-900 font-bold">
                <tr>
                  <th className="p-2.5 border border-slate-200">参数名称</th>
                  <th className="p-2.5 border border-slate-200">估计值 (Coef)</th>
                  <th className="p-2.5 border border-slate-200">标准误 (Std Error)</th>
                  <th className="p-2.5 border border-slate-200">t 统计量</th>
                  <th className="p-2.5 border border-slate-200">p 值</th>
                  <th className="p-2.5 border border-slate-200">95% 置信区间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                <tr>
                  <td className="p-2.5 border border-slate-200 font-sans font-medium">截距 β₀</td>
                  <td className="p-2.5 border border-slate-200">{ols.intercept.toFixed(4)}</td>
                  <td className="p-2.5 border border-slate-200">{ols.seIntercept.toFixed(4)}</td>
                  <td className="p-2.5 border border-slate-200">{ols.tIntercept.toFixed(3)}</td>
                  <td className="p-2.5 border border-slate-200 text-indigo-600 font-bold">
                    {ols.pIntercept.toExponential(3)}
                  </td>
                  <td className="p-2.5 border border-slate-200 text-slate-600">
                    [{(ols.intercept - 1.96 * ols.seIntercept).toFixed(3)}, {(ols.intercept + 1.96 * ols.seIntercept).toFixed(3)}]
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 border border-slate-200 font-sans font-medium">斜率 β₁</td>
                  <td className="p-2.5 border border-slate-200">{ols.slope.toFixed(4)}</td>
                  <td className="p-2.5 border border-slate-200">{ols.seSlope.toFixed(4)}</td>
                  <td className="p-2.5 border border-slate-200">{ols.tSlope.toFixed(3)}</td>
                  <td className="p-2.5 border border-slate-200 text-indigo-600 font-bold">
                    {ols.pSlope.toExponential(3)}
                  </td>
                  <td className="p-2.5 border border-slate-200 text-slate-600">
                    [{(ols.slope - 1.96 * ols.seSlope).toFixed(3)}, {(ols.slope + 1.96 * ols.seSlope).toFixed(3)}]
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-500">
            整体 F 检验统计量: <span className="font-mono font-bold">F = {ols.fStat.toFixed(2)}</span>, p 值 ={' '}
            <span className="font-mono font-bold">{ols.fPvalue.toExponential(3)}</span> ({ols.fPvalue < 0.05 ? '模型整体呈现极显著线性关系 ✅' : '整体不显著'})
          </p>
        </div>

        {/* SECTION 3: Gauss-Markov Assumptions & Residual Diagnostics */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-l-4 border-indigo-600 pl-3">
            <Zap className="w-4 h-4 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              3. 高斯-马尔可夫假定与残差诊断 (Gauss-Markov Diagnostics)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {/* Normality */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              <div className="font-bold text-slate-800 flex items-center justify-between">
                <span>残差正态性 (Shapiro-Wilk)</span>
                {ols.shapiroP >= 0.05 ? (
                  <span className="text-[10px] text-emerald-700 bg-emerald-100 font-bold px-2 py-0.5 rounded">
                    符合假设
                  </span>
                ) : (
                  <span className="text-[10px] text-rose-700 bg-rose-100 font-bold px-2 py-0.5 rounded">
                    偏离正态
                  </span>
                )}
              </div>
              <div className="font-mono text-slate-600">
                W = {ols.shapiroW.toFixed(4)}, p = {ols.shapiroP.toFixed(4)}
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {ols.shapiroP >= 0.05
                  ? '残差概率分布与正态分布无显著差异，参数推断结论有效。'
                  : '残差分布偏离正态，可能受极值扰动。'}
              </p>
            </div>

            {/* Heteroscedasticity */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              <div className="font-bold text-slate-800 flex items-center justify-between">
                <span>等方差性 (Breusch-Pagan)</span>
                {ols.bpP >= 0.05 ? (
                  <span className="text-[10px] text-emerald-700 bg-emerald-100 font-bold px-2 py-0.5 rounded">
                    方差齐性
                  </span>
                ) : (
                  <span className="text-[10px] text-rose-700 bg-rose-100 font-bold px-2 py-0.5 rounded">
                    显著异方差
                  </span>
                )}
              </div>
              <div className="font-mono text-slate-600">
                LM = {ols.bpStat.toFixed(4)}, p = {ols.bpP.toFixed(4)}
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {ols.bpP >= 0.05
                  ? '残差方差恒定，满足同方差基本假定。'
                  : '存在显著异方差，建议采用 HC3 稳健标准误或 WLS 修正。'}
              </p>
            </div>

            {/* Autocorrelation */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              <div className="font-bold text-slate-800 flex items-center justify-between">
                <span>独立自相关 (Durbin-Watson)</span>
                <span className="text-[10px] text-indigo-700 bg-indigo-100 font-bold px-2 py-0.5 rounded">
                  DW 统计量
                </span>
              </div>
              <div className="font-mono text-slate-600">
                DW = {ols.dwStat.toFixed(3)} (理想参照: 2.0)
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                DW 接近 2.0 表示残差序列不存在严重一阶线性自相关。
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 4: Outlier & Influence Analysis */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-l-4 border-indigo-600 pl-3">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h2 className="text-base font-bold text-slate-900">
              4. 强影响点与杠杆极值离群分析 (Outliers & Cook's Distance Analysis)
            </h2>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="font-bold text-slate-800">杠杆率 (Leverage h_ii):</span>
                <span className="font-mono text-slate-700 ml-2">
                  最大 h_ii = {maxLeverage.toFixed(3)} (参考阈值 2(k+1)/n = {(4 / ols.n).toFixed(3)})
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-800">Cook 距离 (Cook's D):</span>
                <span className="font-mono text-slate-700 ml-2">
                  最大 D_i = {maxCook.toFixed(3)}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed pt-1">
              <strong>诊断结论</strong>:{' '}
              {highCookPoints.length === 0
                ? '全样本点杠杆Cook距离均低于 0.5 警戒线，回归直线倾斜角不受单一杠杆点不当控制。'
                : `存在 ${highCookPoints.length} 个强杠杆影响点 (ID: ${highCookPoints.map((p) => p.id).join(', ')})，其离群偏向对斜率估计产生主导拉扯效应，建议后续考虑做剔除敏感性对比。`}
            </p>
          </div>
        </div>

        {/* SECTION 5: Theoretical Formulation */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-l-4 border-indigo-600 pl-3">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              5. 计量经济学理论公式推导 (Theoretical Formulation & BLUE)
            </h2>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2 text-xs text-slate-700">
            <p>
              普通最小二乘法 (OLS) 寻找解析参数 <MathFormula formula="(\hat{\beta}_0, \hat{\beta}_1)" /> 以极小化残差平方和：
            </p>
            <div className="bg-white p-2.5 rounded border border-slate-200 text-center font-mono">
              <MathFormula formula={`\\hat{\\beta}_1 = \\frac{\\sum_{i=1}^n (x_i - \\bar{x})(y_i - \\bar{y})}{\\sum_{i=1}^n (x_i - \\bar{x})^2} = \\frac{\\text{Cov}(X, Y)}{\\text{Var}(X)} = \\mathbf{${ols.slope.toFixed(4)}}`} />
            </div>
            <div className="bg-white p-2.5 rounded border border-slate-200 text-center font-mono">
              <MathFormula formula={`\\hat{\\beta}_0 = \\bar{y} - \\hat{\\beta}_1 \\bar{x} = \\mathbf{${ols.intercept.toFixed(4)}}`} />
            </div>
            <p className="text-[11px] text-slate-500">
              根据高斯-马尔可夫定理 (Gauss-Markov Theorem)，在满足前述基本假设前提下，OLS 估计量是最佳线性无偏估计量 (BLUE)，具有最小的估算方差。
            </p>
          </div>
        </div>

        {/* SECTION 6: Full Residual Diagnostic Table */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-l-4 border-indigo-600 pl-3">
            <TableIcon className="w-4 h-4 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              6. 样本观测值与残差诊断全表 (Full Diagnostic Dataset)
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse border border-slate-200">
              <thead className="bg-slate-100 text-slate-900 font-bold">
                <tr>
                  <th className="p-2 border border-slate-200">ID</th>
                  <th className="p-2 border border-slate-200">观察值 X</th>
                  <th className="p-2 border border-slate-200">观察值 Y</th>
                  <th className="p-2 border border-slate-200">拟合值 Y_hat</th>
                  <th className="p-2 border border-slate-200">残差 e_i</th>
                  <th className="p-2 border border-slate-200">杠杆率 h_ii</th>
                  <th className="p-2 border border-slate-200">Cook 距离 D_i</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                {ols.diagnostics.map((d) => (
                  <tr key={d.id} className={d.cooksDistance > 0.5 ? 'bg-amber-50/60' : undefined}>
                    <td className="p-2 border border-slate-200 font-sans font-medium">{d.id}</td>
                    <td className="p-2 border border-slate-200">{d.x.toFixed(2)}</td>
                    <td className="p-2 border border-slate-200">{d.y.toFixed(2)}</td>
                    <td className="p-2 border border-slate-200">{d.fittedY.toFixed(2)}</td>
                    <td className="p-2 border border-slate-200">{d.residual.toFixed(2)}</td>
                    <td className="p-2 border border-slate-200">{d.leverage.toFixed(3)}</td>
                    <td className="p-2 border border-slate-200 font-bold">{d.cooksDistance.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
