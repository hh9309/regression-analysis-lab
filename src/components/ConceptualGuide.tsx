import React, { useState } from 'react';
import { MathFormula } from './MathFormula';
import { StepwiseRegressionWizard } from './StepwiseRegressionWizard';
import {
  BookOpen,
  CheckCircle2,
  Layers,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export const ConceptualGuide: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(1);

  const steps = [
    {
      id: 1,
      title: '1. OLS 优化目标',
      subtitle: '残差平方和极小化 (Minimizing SSE)',
      formula: '\\min_{\\beta_0, \\beta_1} Q(\\beta_0, \\beta_1) = \\sum_{i=1}^n (y_i - (\\beta_0 + \\beta_1 x_i))^2',
      content: (
        <div className="space-y-3 text-slate-700 text-sm leading-relaxed">
          <p>
            <strong>普通最小二乘法 (Ordinary Least Squares, OLS)</strong>{' '}
            的基本思想是在二维平面上寻找一条最佳直线{' '}
            <MathFormula formula="\hat{y}_i = \beta_0 + \beta_1 x_i" />，使得所有数据点在{' '}
            <strong className="text-indigo-600">垂直方向上的残差 (Residual)</strong>{' '}
            <MathFormula formula="e_i = y_i - \hat{y}_i" /> 的平方和达到绝对最小值。
          </p>
          <div className="bg-indigo-50/80 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-900 space-y-1.5">
            <div className="font-semibold flex items-center gap-1.5 text-indigo-700">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              为什么选择残差“平方和”而不是“绝对值和”？
            </div>
            <ul className="list-disc pl-4 space-y-1 text-slate-600">
              <li><strong>消除正负抵消</strong>: 残差有正有负，平方能确保所有偏差均转化为正数。</li>
              <li><strong>极值处处可导</strong>: 平方函数二次可导，能够通过微积分一阶偏导数为 0 推出闭式代数解 (Closed-form Solution)。</li>
              <li><strong>放大较大偏差</strong>: 对离群巨幅偏差惩罚更重，符合高斯分布假设下的最大似然估计。</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 2,
      title: '2. 方差分解定理',
      subtitle: 'SST = SSR + SSE',
      formula: '\\sum (y_i - \\bar{y})^2 = \\sum (\\hat{y}_i - \\bar{y})^2 + \\sum (y_i - \\hat{y}_i)^2',
      content: (
        <div className="space-y-3 text-slate-700 text-sm leading-relaxed">
          <p>
            因变量 <MathFormula formula="Y" /> 的总方差波动称为 <strong>总离差平方和 (<MathFormula formula="SST" />)</strong>，它可以精确地拆解为两部分：
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-2">
            <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl">
              <div className="font-semibold text-emerald-800 text-xs mb-1">
                回归平方和 (<MathFormula formula="SSR" />)
              </div>
              <div className="text-xs text-emerald-900/80">
                模型通过解释变量 <MathFormula formula="X" /> 成功捕捉并“解释”掉的变异部分。
              </div>
            </div>
            <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-xl">
              <div className="font-semibold text-rose-800 text-xs mb-1">
                残差平方和 (<MathFormula formula="SSE" />)
              </div>
              <div className="text-xs text-rose-900/80">
                模型未能捕捉到的随机噪音与非线性遗漏误差。
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-600">
            <strong>拟合优度 (Coefficient of Determination <MathFormula formula="R^2" />)</strong> 即为 SSR 占 SST 的比例：
            <MathFormula formula="R^2 = \frac{SSR}{SST} = 1 - \frac{SSE}{SST}" />
          </p>
        </div>
      ),
    },
    {
      id: 3,
      title: '3. 偏导求解闭式解',
      subtitle: '正规方程组一阶偏导求极小',
      formula: '\\begin{cases} \\frac{\\partial Q}{\\partial \\beta_0} = -2 \\sum (y_i - \\beta_0 - \\beta_1 x_i) = 0 \\\\[6pt] \\frac{\\partial Q}{\\partial \\beta_1} = -2 \\sum x_i (y_i - \\beta_0 - \\beta_1 x_i) = 0 \\end{cases}',
      content: (
        <div className="space-y-3 text-slate-700 text-sm leading-relaxed">
          <p>
            令残差平方和目标函数 <MathFormula formula="Q(\beta_0, \beta_1)" /> 分别对截距 <MathFormula formula="\beta_0" /> 和斜率 <MathFormula formula="\beta_1" /> 求偏导数并使其等于零，得到著名的<strong>正规方程组 (Normal Equations)</strong>。
          </p>
          <p className="text-xs text-slate-600">
            化简后可得参数的封闭形式代数解：
          </p>
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold">斜率公式</span>
              <MathFormula formula="\\hat{\\beta}_1 = \\frac{\\sum (x_i - \\bar{x})(y_i - \\bar{y})}{\\sum (x_i - \\bar{x})^2} = \\frac{S_{xy}}{S_{xx}}" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold">截距公式</span>
              <MathFormula formula="\\hat{\\beta}_0 = \\bar{y} - \\hat{\\beta}_1 \\bar{x}" />
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 4,
      title: '4. 斜率 t 检验与标准误',
      subtitle: '推断斜率是否具有统计显著性',
      formula: 't = \\frac{\\hat{\\beta}_1 - 0}{SE(\\hat{\\beta}_1)}, \\quad SE(\\hat{\\beta}_1) = \\sqrt{\\frac{MSE}{\\sum (x_i - \\bar{x})^2}}',
      content: (
        <div className="space-y-3 text-slate-700 text-sm leading-relaxed">
          <p>
            为了判断样本算出的斜率 <MathFormula formula="\hat{\beta}_1" /> 是否只是零假设 <MathFormula formula="H_0: \beta_1 = 0" /> 下随机抽样波动产生的，我们需要进行 <strong>Student t 检验</strong>。
          </p>
          <ul className="list-disc pl-4 space-y-1 text-xs text-slate-600">
            <li><strong>自由度</strong>: <MathFormula formula="df = n - 2" /> (损失了估计截距和斜率的 2 个自由度)</li>
            <li><strong>P 值判读</strong>: 若 <MathFormula formula="p < 0.05" />，则在 95% 置信水平下拒绝原假设，认定 <MathFormula formula="X" /> 与 <MathFormula formula="Y" /> 存在显著的线性依存关系。</li>
          </ul>
        </div>
      ),
    },
  ];

  const assumptions = [
    {
      title: '1. 线性假设 (Linearity)',
      desc: (
        <span>
          总体回归模型必须是参数 <MathFormula formula="\beta_0, \beta_1" /> 的线性函数。
        </span>
      ),
      violation: '曲线形态非线性导致模型系统性偏误。',
      status: '残差 vs 拟合值图应随机均匀分布',
    },
    {
      title: '2. 独立性假设 (Independence)',
      desc: (
        <span>
          任意两个残差项 <MathFormula formula="e_i, e_j" /> 互相独立，无序列自相关。
        </span>
      ),
      violation: '标准误被严重低估，显著性检验虚高。',
      status: 'Durbin-Watson 统计量建议接近 2.0',
    },
    {
      title: '3. 等方差性假设 (Homoscedasticity)',
      desc: (
        <span>
          随机误差项 <MathFormula formula="e_i" /> 对所有的 <MathFormula formula="x_i" /> 具有恒定的方差 <MathFormula formula="\sigma^2" />。
        </span>
      ),
      violation: 'OLS 仍然无偏，但不再是最佳线性无偏估计量 (BLUE)，标准误偏离。',
      status: 'Breusch-Pagan 检验 p > 0.05',
    },
    {
      title: '4. 残差正态性 (Normality)',
      desc: (
        <span>
          误差项服从均值为 0，方差为 <MathFormula formula="\sigma^2" /> 的正态分布 <MathFormula formula="e \sim N(0, \sigma^2)" />。
        </span>
      ),
      violation: '小样本下 t 检验与置信区间估计失效。',
      status: 'Normal Q-Q 图数据点紧贴 45° 直线',
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none translate-x-12 -translate-y-8">
          <TrendingUp className="w-96 h-96" />
        </div>
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 text-xs font-medium">
            <BookOpen className="w-3.5 h-3.5" />
            一元 OLS 核心数学理论与假设引导
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            一元最小二乘法 (OLS) 数学理论拆解与理论判读
          </h1>
          <p className="text-slate-300 text-xs md:text-sm max-w-3xl leading-relaxed">
            从最小化残差平方和的目标函数推导，到变异分解 (<MathFormula formula="SST = SSR + SSE" />) 与高斯-马尔可夫定理下的残差四大基本假设。
          </p>
        </div>
      </div>

      {/* Interactive Step-by-Step Derivation */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              OLS 代数推导与理论步步拆解
            </h2>
          </div>
          <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full font-mono">
            步骤 {activeStep} / {steps.length}
          </span>
        </div>

        {/* Step Navigation Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {steps.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveStep(s.id)}
              className={`p-3 rounded-xl border text-left transition-all ${
                activeStep === s.id
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="text-xs font-bold">{s.title}</div>
              <div
                className={`text-[11px] truncate mt-0.5 ${
                  activeStep === s.id ? 'text-indigo-100' : 'text-slate-500'
                }`}
              >
                {s.subtitle}
              </div>
            </button>
          ))}
        </div>

        {/* Step Detail Box */}
        {steps.map((s) => {
          if (s.id !== activeStep) return null;
          return (
            <div
              key={s.id}
              className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 space-y-4 animate-fadeIn"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {s.title} — {s.subtitle}
                </h3>
              </div>

              {/* KaTeX Formula Box */}
              <div className="bg-white border border-indigo-100 rounded-xl p-4 shadow-sm text-center">
                <MathFormula formula={s.formula} block />
              </div>

              {/* Content Explanation */}
              {s.content}
            </div>
          );
        })}
      </div>

      {/* Interactive Stepwise Regression Wizard */}
      <StepwiseRegressionWizard />

      {/* Residual Basic Assumptions */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-bold text-slate-900">
              高斯-马尔可夫定理：残差四大基本假设 (Gauss-Markov Assumptions)
            </h2>
          </div>
          <span className="text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full font-medium border border-amber-200">
            OLS 为最佳线性无偏估计 (BLUE) 的前提
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assumptions.map((item, idx) => (
            <div
              key={idx}
              className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 space-y-2 hover:border-indigo-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs text-slate-900">
                  {item.title}
                </h3>
              </div>
              <div className="text-xs text-slate-600 leading-relaxed">
                {item.desc}
              </div>
              <div className="pt-2 border-t border-slate-200/60 space-y-1 text-[11px]">
                <div className="text-rose-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>假设违背危害: {item.violation}</span>
                </div>
                <div className="text-indigo-600 flex items-center gap-1 font-medium">
                  <ArrowRight className="w-3 h-3 shrink-0" />
                  <span>诊断标志: {item.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
