import React, { useState, useMemo, useEffect, useRef } from 'react';
import { DataPoint, OLSResult } from '../types';
import { calculateOLS } from '../utils/mathStats';
import { MathFormula } from './MathFormula';
import {
  Brain,
  Sparkles,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Settings,
  Key,
  Bot,
  Send,
  User,
  Eye,
  EyeOff,
  Check,
  X,
  MessageSquare,
  Cpu,
} from 'lucide-react';

interface AIDecisionEngineProps {
  points: DataPoint[];
  caseTitle?: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  modelName?: string;
}

export const AIDecisionEngine: React.FC<AIDecisionEngineProps> = ({
  points,
  caseTitle = '自定义沙盒数据集',
}) => {
  // Persistence for API Key and Selected Model
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('ai_decision_api_key') || '';
  });
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return localStorage.getItem('ai_decision_selected_model') || 'gemini-2.5-flash';
  });

  // Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [tempApiKey, setTempApiKey] = useState<string>(apiKey);
  const [tempModel, setTempModel] = useState<string>(selectedModel);
  const [showKeyText, setShowKeyText] = useState<boolean>(false);

  // Diagnosis State
  const [loading, setLoading] = useState<boolean>(false);
  const [aiReportText, setAiReportText] = useState<string | null>(null);
  const [reportModelUsed, setReportModelUsed] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // AI Chat Assistant State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'assistant',
      text: '你好！我是你的 OLS 回归与计量经济学 AI 智能助手。你可以询问关于残差检验、异方差修正、杠杆点 Cook 距离或模型拟合优度 R² 的任何统计学问题。',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelName: selectedModel === 'gemini-2.5-flash' ? 'Gemini 2.5 Flash' : 'DeepSeek-V4-Pro',
    },
  ]);
  const [inputQuestion, setInputQuestion] = useState<string>('');
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const ols: OLSResult = useMemo(() => calculateOLS(points), [points]);

  // Sync scroll for chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  // Count high cook's distance points
  const maxCook = useMemo(() => {
    return ols.diagnostics.length > 0
      ? Math.max(...ols.diagnostics.map((d) => d.cooksDistance))
      : 0;
  }, [ols]);

  const highCookCount = useMemo(() => {
    return ols.diagnostics.filter((d) => d.cooksDistance > 0.5).length;
  }, [ols]);

  // Save Settings Modal Handler
  const handleSaveSettings = () => {
    setApiKey(tempApiKey);
    setSelectedModel(tempModel);
    localStorage.setItem('ai_decision_api_key', tempApiKey.trim());
    localStorage.setItem('ai_decision_selected_model', tempModel);
    setIsSettingsOpen(false);
  };

  const getModelDisplayName = (modelKey: string) => {
    if (modelKey === 'deepseek-v4-pro') return 'DeepSeek-V4-Pro';
    return 'Gemini 2.5 Flash';
  };

  // Build Context Text for Prompt
  const buildContextPrompt = () => {
    return `--- 线性回归当前沙盒数据集及统计诊断指标 ---
【案例/数据背景】: ${caseTitle}
【样本容量 n】: ${ols.n}
【拟合指标】: R² = ${ols.r2.toFixed(4)}, Adj R² = ${ols.adjR2.toFixed(4)}
【方程估计】: Y = ${ols.intercept.toFixed(4)} + ${ols.slope.toFixed(4)} * X
【斜率显著性 (t 检验)】: t = ${ols.tSlope.toFixed(3)}, p = ${ols.pSlope.toExponential(3)}
【整体 F 检验】: F = ${ols.fStat.toFixed(2)}, p = ${ols.fPvalue.toExponential(3)}
【残差正态性 (Shapiro-Wilk)】: p = ${ols.shapiroP.toFixed(4)} ${ols.shapiroP >= 0.05 ? '(满足正态分布假设)' : '(拒绝正态分布假设)'}
【残差等方差性 (Breusch-Pagan)】: p = ${ols.bpP.toFixed(4)} ${ols.bpP >= 0.05 ? '(满足同方差假设)' : '(存在显著异方差)'}
【自相关 (Durbin-Watson)】: DW = ${ols.dwStat.toFixed(3)}
【杠杆点诊断】: 最大 Cook 距离 = ${maxCook.toFixed(4)}, Cook > 0.5 点数 = ${highCookCount}
`;
  };

  // Direct Client-Side API Call Handler for Diagnosis
  const handleFetchAiDiagnosis = async () => {
    // Check if API key is empty
    if (!apiKey.trim()) {
      setTempApiKey('');
      setIsSettingsOpen(true);
      setErrorMsg('未配置 API Key。项目部署在 GitHub 等前端环境，请先在右上角 ⚙️ 设置中填入您的 API Key。');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const contextText = buildContextPrompt();
    const prompt = `你是一位资深计量经济学与数据科学专家。请针对以下一元 OLS 回归模型的诊断指标，输出一份结构严谨、逻辑清晰、带有专业 Markdown 格式的 AI 决策报告。

${contextText}

请按照以下结构组织回答：
1. **模型概览与拟合评价**: 评价 R²、斜率 β₁ 的实际物理/经济含义与显著性。
2. **残差假设检验诊断 (关键)**:
   - 正态性检验判读 (Shapiro-Wilk)
   - 异方差性检验判读 (Breusch-Pagan)。如果 bpP < 0.05，必须明确给出：“残差存在显著异方差，虽然斜率估计量无偏，但标准误偏离，建议采用 Robust 稳健标准误（HC3）或 WLS 加权最小二乘法进行修正。”
   - 杠杆点与 Cook 距离判读
3. **统计决策与改进方案 (Actionable Advice)**: 提供具体的后续数据处理或模型修正建议（如对数变换、剔除杠杆点、WLS等）。

使用简洁专业且温暖优雅的中文简体 Markdown 输出。`;

    try {
      let resultText = '';

      if (selectedModel === 'deepseek-v4-pro') {
        // DeepSeek API Request
        const res = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey.trim()}`,
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              { role: 'system', content: '你是一位资深计量经济学与数据科学专家。' },
              { role: 'user', content: prompt },
            ],
            temperature: 0.3,
          }),
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error?.message || `DeepSeek API 调用失败 (HTTP ${res.status})`);
        }

        const data = await res.json();
        resultText = data.choices?.[0]?.message?.content || '未能从 DeepSeek 获取有效回复';
      } else {
        // Gemini API Request (Gemini 2.5 Flash / 2.0 Flash)
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey.trim()}`;
        const res = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error?.message || `Gemini API 调用失败 (HTTP ${res.status})`);
        }

        const data = await res.json();
        resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || '未能从 Gemini 获取有效回复';
      }

      setAiReportText(resultText);
      setReportModelUsed(getModelDisplayName(selectedModel));
    } catch (err: any) {
      console.error('AI API Direct Fetch Error:', err);
      setErrorMsg(`[${getModelDisplayName(selectedModel)} API 异常]: ${err.message || '网络连接超时或 API Key 无效'}`);
    } finally {
      setLoading(false);
    }
  };

  // Chat Q&A Handler
  const handleSendQuestion = async (customQuestion?: string) => {
    const q = customQuestion || inputQuestion;
    if (!q.trim() || chatLoading) return;

    if (!apiKey.trim()) {
      setIsSettingsOpen(true);
      setErrorMsg('使用 AI 智能对话助手必须先在 ⚙️ 设置中配置 API Key。');
      return;
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!customQuestion) setInputQuestion('');
    setChatLoading(true);

    const contextText = buildContextPrompt();
    const prompt = `你是一位计量经济学与统计学 AI 智能助手。请针对用户的提问，结合当前数据背景回答问题。

${contextText}

【用户提问】: ${q}

请用专业、通俗易懂且富有启发性的中文进行简明解答。可使用 Markdown 标记重点与公式。`;

    try {
      let answerText = '';

      if (selectedModel === 'deepseek-v4-pro') {
        const res = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey.trim()}`,
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              { role: 'system', content: '你是一位资深计量经济学与数据科学专家。' },
              { role: 'user', content: prompt },
            ],
          }),
        });
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error?.message || `DeepSeek 响应失败 (${res.status})`);
        }
        const data = await res.json();
        answerText = data.choices?.[0]?.message?.content || '未获取到回复';
      } else {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey.trim()}`;
        const res = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        });
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error?.message || `Gemini 响应失败 (${res.status})`);
        }
        const data = await res.json();
        answerText = data.candidates?.[0]?.content?.parts?.[0]?.text || '未获取到回复';
      }

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: answerText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelName: getModelDisplayName(selectedModel),
      };

      setChatMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorAiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: `⚠️ 对话调用失败: ${err.message || '请检查 API Key 或网络'}。可点击右上角 ⚙️ 齿轮重新设置 API Key。`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, errorAiMsg]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Title Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 text-xs font-medium">
              <Brain className="w-3.5 h-3.5 text-indigo-300" />
              AI 智能模型诊断与自动化决策判定引擎
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              AI 洞察与结果判定 (AI Decision Engine)
            </h1>
            <p className="text-slate-300 text-xs max-w-2xl leading-relaxed">
              支持 Shapiro-Wilk 残差正态性检验与 Breusch-Pagan 异方差检验，可一键调用 Gemini 2.5 Flash 或 DeepSeek-V4-Pro 大模型获取智能化专家诊断及模型修正方案。
            </p>
          </div>

          {/* Action Buttons & Gear Settings Icon */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleFetchAiDiagnosis}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>正在由 {getModelDisplayName(selectedModel)} 生成诊断...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>请求 AI 深度智能诊断</span>
                </>
              )}
            </button>

            {/* Gear Icon Button for Model Settings */}
            <button
              onClick={() => {
                setTempApiKey(apiKey);
                setTempModel(selectedModel);
                setIsSettingsOpen(true);
              }}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-indigo-200 hover:text-white transition-colors border border-indigo-500/30 shadow-xs flex items-center gap-1.5 text-xs font-medium"
              title="配置大模型 API Key 与 模型选择"
            >
              <Settings className="w-4 h-4 text-indigo-300 animate-spin-slow" />
              <span className="hidden sm:inline">大模型配置</span>
            </button>
          </div>
        </div>
      </div>

      {/* Model Active Info Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 px-4 py-2.5 shadow-xs flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-indigo-600" />
          <span>当前激活大模型:</span>
          <span className="font-bold text-indigo-900 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200">
            {getModelDisplayName(selectedModel)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Key className="w-3.5 h-3.5 text-slate-400" />
          <span>API Key 状态:</span>
          {apiKey ? (
            <span className="text-emerald-600 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> 已配置 (Browser Client)
            </span>
          ) : (
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="text-amber-600 font-bold hover:underline flex items-center gap-1"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> 未配置 (点击 ⚙️ 填入)
            </button>
          )}
        </div>
      </div>

      {/* Local Automated Rule Decision Engine Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Normality Test */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-slate-900">
              残差正态性 (Shapiro-Wilk)
            </span>
            {ols.shapiroP >= 0.05 ? (
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-200">
                符合假设
              </span>
            ) : (
              <span className="text-[10px] bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded border border-rose-200">
                违背假设
              </span>
            )}
          </div>
          <div className="text-sm font-bold font-mono text-slate-800">
            p = {ols.shapiroP.toFixed(4)}
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            {ols.shapiroP >= 0.05
              ? '残差分布服从正态分布，t 检验与置信区间推断结果可靠。'
              : '残差偏离正态分布，建议尝试 Log 对数变换或检查极值离群点。'}
          </p>
        </div>

        {/* Card 2: Heteroscedasticity Test */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-slate-900">
              方差齐性 (Breusch-Pagan)
            </span>
            {ols.bpP >= 0.05 ? (
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-200">
                方差齐性
              </span>
            ) : (
              <span className="text-[10px] bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded border border-rose-200">
                显著异方差
              </span>
            )}
          </div>
          <div className="text-sm font-bold font-mono text-slate-800">
            p = {ols.bpP.toFixed(4)}
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            {ols.bpP >= 0.05
              ? '残差方差恒定，满足等方差基本假设。'
              : '残差存在显著异方差，虽然斜率估计量无偏，但标准误偏离，建议采用 Robust 稳健标准误（HC3）或 WLS 加权最小二乘法进行修正。'}
          </p>
        </div>

        {/* Card 3: High Cook's Distance Outliers */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-slate-900">
              杠杆影响点 (Cook's Distance)
            </span>
            {highCookCount === 0 ? (
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-200">
                无高影响点
              </span>
            ) : (
              <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded border border-amber-200">
                {highCookCount} 个杠杆点
              </span>
            )}
          </div>
          <div className="text-sm font-bold font-mono text-slate-800">
            Max D = {maxCook.toFixed(3)}
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            {highCookCount === 0
              ? '没有发现主导回归线倾斜角度的极端杠杆离群点。'
              : '检测到 Cook 距离超标点，可能强行扭曲线性方向。'}
          </p>
        </div>
      </div>

      {/* Error Message Box */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-800 flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 transition-colors shrink-0"
          >
            设置 API Key
          </button>
        </div>
      )}

      {/* AI Generated Detailed Markdown Report */}
      {aiReportText && (
        <div className="bg-white rounded-2xl border border-indigo-100 p-6 shadow-sm space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              AI 智能诊断与决策建议报告
            </div>
            <span className="text-xs text-indigo-600 bg-indigo-50 font-bold px-2.5 py-0.5 rounded-full border border-indigo-200 font-mono">
              Model: {reportModelUsed}
            </span>
          </div>

          <div className="prose prose-slate max-w-none text-xs leading-relaxed space-y-2 text-slate-700 whitespace-pre-wrap">
            {aiReportText}
          </div>
        </div>
      )}

      {/* AI Interactive Chat Assistant Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-sm font-bold">AI 智能助手 / 问答对话功能</h2>
              <p className="text-[11px] text-slate-400">
                可实时询问关于当前回归数据的具体统计含义或计量经济学疑难概念
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded">
            {getModelDisplayName(selectedModel)}
          </span>
        </div>

        {/* Quick Question Chips */}
        <div className="p-3 bg-slate-50 border-b border-slate-200/60 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-slate-500 font-medium shrink-0 flex items-center gap-1">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> 快捷提问:
          </span>
          {[
            '怎么判断当前残差是否异方差？',
            '解释斜率估计量 β₁ 的物理与经济含义',
            '若 Cook 距离大于 0.5 应如何处理极值点？',
            '如何提高模型的拟合优度 R²？',
          ].map((promptText, idx) => (
            <button
              key={`chip-${idx}`}
              onClick={() => handleSendQuestion(promptText)}
              disabled={chatLoading}
              className="bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors text-[11px] shrink-0 disabled:opacity-50"
            >
              {promptText}
            </button>
          ))}
        </div>

        {/* Chat History Messages */}
        <div className="p-4 space-y-3 max-h-[360px] overflow-y-auto bg-slate-50/50 text-xs">
          {chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'assistant' && (
                <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[82%] rounded-2xl p-3 shadow-xs leading-relaxed space-y-1 ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] opacity-75 border-b border-current/10 pb-1 mb-1">
                  <span>{msg.sender === 'user' ? '您' : msg.modelName || 'AI 智能助手'}</span>
                  <span>{msg.timestamp}</span>
                </div>
                <div className="whitespace-pre-wrap">{msg.text}</div>
              </div>

              {msg.sender === 'user' && (
                <div className="w-7 h-7 rounded-xl bg-slate-800 text-slate-200 flex items-center justify-center shrink-0 shadow-xs">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {chatLoading && (
            <div className="flex gap-2.5 justify-start items-center text-slate-500 text-xs">
              <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                <span>AI 正在思考解答中...</span>
              </div>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Chat Input Bar */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
          <input
            type="text"
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendQuestion();
            }}
            placeholder="输入您想咨询的计量经济学或当前模型拟合问题..."
            disabled={chatLoading}
            className="flex-1 bg-slate-100/80 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          />
          <button
            onClick={() => handleSendQuestion()}
            disabled={!inputQuestion.trim() || chatLoading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>发送</span>
          </button>
        </div>
      </div>

      {/* Model Configuration Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                <Settings className="w-5 h-5 text-indigo-600" />
                大模型配置 (Model & API Key Settings)
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* 1. API Key Input */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-amber-500" />
                    1. 手工输入 API Key:
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    支持 Gemini / DeepSeek API Key
                  </span>
                </label>

                <div className="relative">
                  <input
                    type={showKeyText ? 'text' : 'password'}
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    placeholder="输入您的 Gemini 或 DeepSeek API Key..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 pr-10 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeyText((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showKeyText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed bg-amber-50/80 p-2.5 rounded-lg border border-amber-200/80">
                  💡 <strong>提示</strong>: 本项目部署至 GitHub Pages 与 Netlify 纯前端环境，您的 Key 仅保存在浏览器 localStorage 中直接向官方 API 发起请求，绝不会泄露到第三方服务器。
                </p>
              </div>

              {/* 2. Model Selection Radio Group */}
              <div className="space-y-2">
                <label className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-indigo-600" />
                  2. 选择大模型 (Model Selector):
                </label>

                <div className="grid grid-cols-1 gap-2.5">
                  {/* Gemini 2.5 Flash */}
                  <label
                    onClick={() => setTempModel('gemini-2.5-flash')}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      tempModel === 'gemini-2.5-flash'
                        ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-600'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                        Gemini 2.5 Flash
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Google 高速计量经济学诊断与复杂公式逻辑解析
                      </div>
                    </div>
                    {tempModel === 'gemini-2.5-flash' && (
                      <Check className="w-4 h-4 text-indigo-600 font-bold" />
                    )}
                  </label>

                  {/* DeepSeek-V4-Pro */}
                  <label
                    onClick={() => setTempModel('deepseek-v4-pro')}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      tempModel === 'deepseek-v4-pro'
                        ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-600'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <Brain className="w-4 h-4 text-purple-600" />
                        DeepSeek-V4-Pro
                      </div>
                      <div className="text-[11px] text-slate-500">
                        DeepSeek 深度概率推演与严密残差假设检验逻辑
                      </div>
                    </div>
                    {tempModel === 'deepseek-v4-pro' && (
                      <Check className="w-4 h-4 text-indigo-600 font-bold" />
                    )}
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-xs transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-indigo-100"
              >
                确认大模型选择与保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
