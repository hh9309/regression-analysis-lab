import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API endpoint for AI diagnosis & decision engine
  app.post("/api/ai-diagnose", async (req, res) => {
    const {
      n,
      r2,
      adjR2,
      slope,
      intercept,
      pSlope,
      fPvalue,
      shapiroP,
      bpP,
      dwStat,
      maxCook,
      outlierCount,
      caseTitle,
      contextDescription,
    } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;

    const summaryDataText = `
--- 线性回归模型诊断数据 ---
【案例名称/背景】: ${caseTitle || "沙盒自定义数据集"}
【样本容量 n】: ${n}
【拟合指标】: R² = ${r2?.toFixed(4)}, Adj R² = ${adjR2?.toFixed(4)}
【拟合参数】: 截距 β₀ = ${intercept?.toFixed(4)}, 斜率 β₁ = ${slope?.toFixed(4)} (t检验 p值 = ${pSlope?.toExponential(3)})
【整体 F 检验】: p值 = ${fPvalue?.toExponential(3)}
【残差正态性检验 (Shapiro-Wilk)】: p值 = ${shapiroP?.toFixed(4)}
【残差等方差性检验 (Breusch-Pagan)】: p值 = ${bpP?.toFixed(4)}
【自相关检验 (Durbin-Watson)】: DW = ${dwStat?.toFixed(3)} (理想值接近 2.0)
【影响点诊断】: 最大 Cook 距离 = ${maxCook?.toFixed(4)} (界限 0.5/1.0), 高杠杆离群点数 = ${outlierCount}
【数据特征说明】: ${contextDescription || "无特别说明"}
`;

    if (!apiKey) {
      // Local fallback rule-based AI diagnosis
      const warnings: string[] = [];
      const recommendations: string[] = [];

      if (r2 < 0.3) {
        warnings.push("拟合优度 R² 较低，变量间的线性解释力不足。");
        recommendations.push("考虑尝试非线性变换（如对数、多项式）或引入更多解释变量。");
      } else if (r2 > 0.85) {
        warnings.push("模型拟合优度极高，整体线性关系显著。");
      }

      if (shapiroP !== undefined && shapiroP < 0.05) {
        warnings.push("残差 Shapiro-Wilk 检验显著 (p < 0.05)，违背了残差正态性假设。");
        recommendations.push("建议对因变量 Y 进行 Box-Cox 变换或 Log 对数变换，或者检查是否存在未剔除的异常离群点。");
      }

      if (bpP !== undefined && bpP < 0.05) {
        warnings.push("残差存在显著异方差性 (Breusch-Pagan p < 0.05)。");
        recommendations.push("虽然 OLS 斜率估计量仍无偏，但标准误被歪曲。建议使用 HC3 稳健标准误 (Robust Standard Errors) 或加权最小二乘法 (WLS) 进行修正。");
      }

      if (maxCook > 0.5) {
        warnings.push(`检测到高影响杠杆点 (Cook's Distance max = ${maxCook.toFixed(2)} > 0.5)。`);
        recommendations.push("极端的杠杆点可能强行牵拉回归线方向。建议对比剔除该点后的敏感性分析 (Sensitivity Analysis)。");
      }

      if (warnings.length === 0) {
        warnings.push("模型符合 OLS 全部三大基本假设（正态、同方差、独立），线性拟合效果良好。");
        recommendations.push("可以安全使用该模型进行总体均值的估计与新样本的区间预测。");
      }

      return res.json({
        success: true,
        isFallback: true,
        diagnosisText: `### 🤖 AI 智能诊断判定报告 (内置引擎)

#### 1. 拟合优度与参数显著性
* **模型解释力**: $R^2 = ${r2?.toFixed(3)}$，说明模型解释了变量 **${((r2 || 0) * 100).toFixed(1)}%** 的变异。
* **斜率检验**: 斜率 $\\beta_1 = ${slope?.toFixed(3)}$，t 检验 $p = ${pSlope?.toExponential(3)}$，${(pSlope || 1) < 0.05 ? "X 与 Y 存在统计学显著的线性逻辑关系" : "未达到统计显著性"}。

#### 2. 残差假设检验诊断
* **正态性**: Shapiro-Wilk $p = ${shapiroP?.toFixed(4)}$ ${shapiroP < 0.05 ? "❌ 拒绝正态假设" : "✅ 满足正态假设"}。
* **等方差性**: Breusch-Pagan $p = ${bpP?.toFixed(4)}$ ${bpP < 0.05 ? "❌ 存在异方差" : "✅ 方差齐性成立"}。
* **独立性**: Durbin-Watson $DW = ${dwStat?.toFixed(2)}$ ${dwStat >= 1.5 && dwStat <= 2.5 ? "✅ 无明显自相关" : "⚠️ 存在潜在自相关"}。

#### 3. 风险提示与改进建议 (Actionable Suggestions)
${warnings.map((w) => `* **⚠️ 风险识别**: ${w}`).join("\n")}
${recommendations.map((r) => `* **💡 专家建议**: ${r}`).join("\n")}
`,
      });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const prompt = `你是一位资深计量经济学与数据科学专家。请针对以下一元 OLS 回归模型的诊断指标，输出一份结构严谨、逻辑清晰、带有专业 Markdown 格式的 AI 决定报告。

${summaryDataText}

请按照以下结构组织回答：
1. **模型概览与拟合评价**: 评价 R²、斜率 β₁ 的实际物理/经济含义与显著性。
2. **残差假设检验诊断 (关键)**:
   - 正态性检验判读 (Shapiro-Wilk)
   - 异方差性检验判读 (Breusch-Pagan)。如果 bpP < 0.05，必须明确给出：“残差存在显著异方差，虽然斜率估计量无偏，但标准误偏离，建议采用 Robust 稳健标准误（HC3）或 WLS 加权最小二乘法进行修正。”
   - 杠杆点与 Cook 距离判读
3. **统计决策与改进方案 (Actionable Advice)**: 提供具体的后续数据处理或模型修正建议（如对数变换、剔除杠杆点、WLS等）。

使用简洁专业且温暖优雅的中文简体 Markdown 输出。`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
      });

      res.json({
        success: true,
        isFallback: false,
        diagnosisText: response.text || "未能生成 AI 诊断，请重试。",
      });
    } catch (err: any) {
      console.error("Gemini API Error:", err);
      res.status(500).json({
        success: false,
        error: err.message || "AI 诊断接口调用异常",
      });
    }
  });

  // Vite middleware in dev mode
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
