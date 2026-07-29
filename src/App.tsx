import React, { useState } from 'react';
import { ActiveTab, DataPoint } from './types';
import { ConceptualGuide } from './components/ConceptualGuide';
import { FittingSandbox } from './components/FittingSandbox';
import { ClassicCases } from './components/ClassicCases';
import { ResidualDiagnostics } from './components/ResidualDiagnostics';
import { PythonSandbox } from './components/PythonSandbox';
import { AIDecisionEngine } from './components/AIDecisionEngine';
import { ExportReport } from './components/ExportReport';
import {
  BookOpen,
  Sliders,
  Compass,
  Activity,
  Code2,
  Brain,
  FileText,
  LineChart,
  Sparkles,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('guide');
  const [sandboxPoints, setSandboxPoints] = useState<DataPoint[]>([
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
  ]);

  const handleLoadPresetToSandbox = (points: DataPoint[]) => {
    setSandboxPoints(points);
    setActiveTab('sandbox');
  };

  const navItems = [
    {
      id: 'guide' as ActiveTab,
      label: '知识引导',
      desc: 'OLS算子与推导',
      icon: BookOpen,
    },
    {
      id: 'sandbox' as ActiveTab,
      label: '拖拽沙盒',
      desc: '动态拟合与残差线',
      icon: Sliders,
    },
    {
      id: 'cases' as ActiveTab,
      label: '经典案例',
      desc: 'Anscombe与辛普森',
      icon: Compass,
    },
    {
      id: 'diagnostics' as ActiveTab,
      label: '残差诊断',
      desc: '4联图与假设检验',
      icon: Activity,
    },
    {
      id: 'python' as ActiveTab,
      label: 'Python 验证',
      desc: 'Statsmodels代码',
      icon: Code2,
    },
    {
      id: 'ai' as ActiveTab,
      label: 'AI 决策引擎',
      desc: '自动化质量判断',
      icon: Brain,
    },
    {
      id: 'export' as ActiveTab,
      label: '报告导出',
      desc: '沉淀统计研究报告',
      icon: FileText,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Main Navigation Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-xs print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo Brand */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('guide')}>
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
                <LineChart className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm tracking-tight flex items-center gap-1.5">
                  回归分析与数据拟合智能实验室
                  <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200">
                    v2.5 Full
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  一元 OLS 回归推导 • 拖拽沙盒 • 4 联残差诊断 • AI 决策
                </div>
              </div>
            </div>

            {/* Quick Action Info */}
            <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500">
              <span className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-full text-[11px]">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                包含完整高斯-马尔可夫检验
              </span>
            </div>
          </div>

          {/* Module Navigation Slice Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-none border-t border-slate-100 pt-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-100 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'guide' && <ConceptualGuide />}
        {activeTab === 'sandbox' && (
          <FittingSandbox
            initialPoints={sandboxPoints}
            onPointsChange={setSandboxPoints}
          />
        )}
        {activeTab === 'cases' && (
          <ClassicCases onLoadPresetToSandbox={handleLoadPresetToSandbox} />
        )}
        {activeTab === 'diagnostics' && (
          <ResidualDiagnostics points={sandboxPoints} />
        )}
        {activeTab === 'python' && <PythonSandbox points={sandboxPoints} />}
        {activeTab === 'ai' && <AIDecisionEngine points={sandboxPoints} />}
        {activeTab === 'export' && <ExportReport points={sandboxPoints} />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-4 text-center text-xs text-slate-400 print:hidden">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            回归分析与数据拟合智能实验室 © 2026 — 计量经济学与数据科学交互教学平台
          </span>
          <span className="font-mono text-[11px]">
            Ordinary Least Squares (OLS) Interactive Sandbox
          </span>
        </div>
      </footer>
    </div>
  );
}
