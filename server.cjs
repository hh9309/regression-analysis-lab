var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json());
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
      contextDescription
    } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    const summaryDataText = `
--- \u7EBF\u6027\u56DE\u5F52\u6A21\u578B\u8BCA\u65AD\u6570\u636E ---
\u3010\u6848\u4F8B\u540D\u79F0/\u80CC\u666F\u3011: ${caseTitle || "\u6C99\u76D2\u81EA\u5B9A\u4E49\u6570\u636E\u96C6"}
\u3010\u6837\u672C\u5BB9\u91CF n\u3011: ${n}
\u3010\u62DF\u5408\u6307\u6807\u3011: R\xB2 = ${r2?.toFixed(4)}, Adj R\xB2 = ${adjR2?.toFixed(4)}
\u3010\u62DF\u5408\u53C2\u6570\u3011: \u622A\u8DDD \u03B2\u2080 = ${intercept?.toFixed(4)}, \u659C\u7387 \u03B2\u2081 = ${slope?.toFixed(4)} (t\u68C0\u9A8C p\u503C = ${pSlope?.toExponential(3)})
\u3010\u6574\u4F53 F \u68C0\u9A8C\u3011: p\u503C = ${fPvalue?.toExponential(3)}
\u3010\u6B8B\u5DEE\u6B63\u6001\u6027\u68C0\u9A8C (Shapiro-Wilk)\u3011: p\u503C = ${shapiroP?.toFixed(4)}
\u3010\u6B8B\u5DEE\u7B49\u65B9\u5DEE\u6027\u68C0\u9A8C (Breusch-Pagan)\u3011: p\u503C = ${bpP?.toFixed(4)}
\u3010\u81EA\u76F8\u5173\u68C0\u9A8C (Durbin-Watson)\u3011: DW = ${dwStat?.toFixed(3)} (\u7406\u60F3\u503C\u63A5\u8FD1 2.0)
\u3010\u5F71\u54CD\u70B9\u8BCA\u65AD\u3011: \u6700\u5927 Cook \u8DDD\u79BB = ${maxCook?.toFixed(4)} (\u754C\u9650 0.5/1.0), \u9AD8\u6760\u6746\u79BB\u7FA4\u70B9\u6570 = ${outlierCount}
\u3010\u6570\u636E\u7279\u5F81\u8BF4\u660E\u3011: ${contextDescription || "\u65E0\u7279\u522B\u8BF4\u660E"}
`;
    if (!apiKey) {
      const warnings = [];
      const recommendations = [];
      if (r2 < 0.3) {
        warnings.push("\u62DF\u5408\u4F18\u5EA6 R\xB2 \u8F83\u4F4E\uFF0C\u53D8\u91CF\u95F4\u7684\u7EBF\u6027\u89E3\u91CA\u529B\u4E0D\u8DB3\u3002");
        recommendations.push("\u8003\u8651\u5C1D\u8BD5\u975E\u7EBF\u6027\u53D8\u6362\uFF08\u5982\u5BF9\u6570\u3001\u591A\u9879\u5F0F\uFF09\u6216\u5F15\u5165\u66F4\u591A\u89E3\u91CA\u53D8\u91CF\u3002");
      } else if (r2 > 0.85) {
        warnings.push("\u6A21\u578B\u62DF\u5408\u4F18\u5EA6\u6781\u9AD8\uFF0C\u6574\u4F53\u7EBF\u6027\u5173\u7CFB\u663E\u8457\u3002");
      }
      if (shapiroP !== void 0 && shapiroP < 0.05) {
        warnings.push("\u6B8B\u5DEE Shapiro-Wilk \u68C0\u9A8C\u663E\u8457 (p < 0.05)\uFF0C\u8FDD\u80CC\u4E86\u6B8B\u5DEE\u6B63\u6001\u6027\u5047\u8BBE\u3002");
        recommendations.push("\u5EFA\u8BAE\u5BF9\u56E0\u53D8\u91CF Y \u8FDB\u884C Box-Cox \u53D8\u6362\u6216 Log \u5BF9\u6570\u53D8\u6362\uFF0C\u6216\u8005\u68C0\u67E5\u662F\u5426\u5B58\u5728\u672A\u5254\u9664\u7684\u5F02\u5E38\u79BB\u7FA4\u70B9\u3002");
      }
      if (bpP !== void 0 && bpP < 0.05) {
        warnings.push("\u6B8B\u5DEE\u5B58\u5728\u663E\u8457\u5F02\u65B9\u5DEE\u6027 (Breusch-Pagan p < 0.05)\u3002");
        recommendations.push("\u867D\u7136 OLS \u659C\u7387\u4F30\u8BA1\u91CF\u4ECD\u65E0\u504F\uFF0C\u4F46\u6807\u51C6\u8BEF\u88AB\u6B6A\u66F2\u3002\u5EFA\u8BAE\u4F7F\u7528 HC3 \u7A33\u5065\u6807\u51C6\u8BEF (Robust Standard Errors) \u6216\u52A0\u6743\u6700\u5C0F\u4E8C\u4E58\u6CD5 (WLS) \u8FDB\u884C\u4FEE\u6B63\u3002");
      }
      if (maxCook > 0.5) {
        warnings.push(`\u68C0\u6D4B\u5230\u9AD8\u5F71\u54CD\u6760\u6746\u70B9 (Cook's Distance max = ${maxCook.toFixed(2)} > 0.5)\u3002`);
        recommendations.push("\u6781\u7AEF\u7684\u6760\u6746\u70B9\u53EF\u80FD\u5F3A\u884C\u7275\u62C9\u56DE\u5F52\u7EBF\u65B9\u5411\u3002\u5EFA\u8BAE\u5BF9\u6BD4\u5254\u9664\u8BE5\u70B9\u540E\u7684\u654F\u611F\u6027\u5206\u6790 (Sensitivity Analysis)\u3002");
      }
      if (warnings.length === 0) {
        warnings.push("\u6A21\u578B\u7B26\u5408 OLS \u5168\u90E8\u4E09\u5927\u57FA\u672C\u5047\u8BBE\uFF08\u6B63\u6001\u3001\u540C\u65B9\u5DEE\u3001\u72EC\u7ACB\uFF09\uFF0C\u7EBF\u6027\u62DF\u5408\u6548\u679C\u826F\u597D\u3002");
        recommendations.push("\u53EF\u4EE5\u5B89\u5168\u4F7F\u7528\u8BE5\u6A21\u578B\u8FDB\u884C\u603B\u4F53\u5747\u503C\u7684\u4F30\u8BA1\u4E0E\u65B0\u6837\u672C\u7684\u533A\u95F4\u9884\u6D4B\u3002");
      }
      return res.json({
        success: true,
        isFallback: true,
        diagnosisText: `### \u{1F916} AI \u667A\u80FD\u8BCA\u65AD\u5224\u5B9A\u62A5\u544A (\u5185\u7F6E\u5F15\u64CE)

#### 1. \u62DF\u5408\u4F18\u5EA6\u4E0E\u53C2\u6570\u663E\u8457\u6027
* **\u6A21\u578B\u89E3\u91CA\u529B**: $R^2 = ${r2?.toFixed(3)}$\uFF0C\u8BF4\u660E\u6A21\u578B\u89E3\u91CA\u4E86\u53D8\u91CF **${((r2 || 0) * 100).toFixed(1)}%** \u7684\u53D8\u5F02\u3002
* **\u659C\u7387\u68C0\u9A8C**: \u659C\u7387 $\\beta_1 = ${slope?.toFixed(3)}$\uFF0Ct \u68C0\u9A8C $p = ${pSlope?.toExponential(3)}$\uFF0C${(pSlope || 1) < 0.05 ? "X \u4E0E Y \u5B58\u5728\u7EDF\u8BA1\u5B66\u663E\u8457\u7684\u7EBF\u6027\u903B\u8F91\u5173\u7CFB" : "\u672A\u8FBE\u5230\u7EDF\u8BA1\u663E\u8457\u6027"}\u3002

#### 2. \u6B8B\u5DEE\u5047\u8BBE\u68C0\u9A8C\u8BCA\u65AD
* **\u6B63\u6001\u6027**: Shapiro-Wilk $p = ${shapiroP?.toFixed(4)}$ ${shapiroP < 0.05 ? "\u274C \u62D2\u7EDD\u6B63\u6001\u5047\u8BBE" : "\u2705 \u6EE1\u8DB3\u6B63\u6001\u5047\u8BBE"}\u3002
* **\u7B49\u65B9\u5DEE\u6027**: Breusch-Pagan $p = ${bpP?.toFixed(4)}$ ${bpP < 0.05 ? "\u274C \u5B58\u5728\u5F02\u65B9\u5DEE" : "\u2705 \u65B9\u5DEE\u9F50\u6027\u6210\u7ACB"}\u3002
* **\u72EC\u7ACB\u6027**: Durbin-Watson $DW = ${dwStat?.toFixed(2)}$ ${dwStat >= 1.5 && dwStat <= 2.5 ? "\u2705 \u65E0\u660E\u663E\u81EA\u76F8\u5173" : "\u26A0\uFE0F \u5B58\u5728\u6F5C\u5728\u81EA\u76F8\u5173"}\u3002

#### 3. \u98CE\u9669\u63D0\u793A\u4E0E\u6539\u8FDB\u5EFA\u8BAE (Actionable Suggestions)
${warnings.map((w) => `* **\u26A0\uFE0F \u98CE\u9669\u8BC6\u522B**: ${w}`).join("\n")}
${recommendations.map((r) => `* **\u{1F4A1} \u4E13\u5BB6\u5EFA\u8BAE**: ${r}`).join("\n")}
`
      });
    }
    try {
      const ai = new import_genai.GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      const prompt = `\u4F60\u662F\u4E00\u4F4D\u8D44\u6DF1\u8BA1\u91CF\u7ECF\u6D4E\u5B66\u4E0E\u6570\u636E\u79D1\u5B66\u4E13\u5BB6\u3002\u8BF7\u9488\u5BF9\u4EE5\u4E0B\u4E00\u5143 OLS \u56DE\u5F52\u6A21\u578B\u7684\u8BCA\u65AD\u6307\u6807\uFF0C\u8F93\u51FA\u4E00\u4EFD\u7ED3\u6784\u4E25\u8C28\u3001\u903B\u8F91\u6E05\u6670\u3001\u5E26\u6709\u4E13\u4E1A Markdown \u683C\u5F0F\u7684 AI \u51B3\u5B9A\u62A5\u544A\u3002

${summaryDataText}

\u8BF7\u6309\u7167\u4EE5\u4E0B\u7ED3\u6784\u7EC4\u7EC7\u56DE\u7B54\uFF1A
1. **\u6A21\u578B\u6982\u89C8\u4E0E\u62DF\u5408\u8BC4\u4EF7**: \u8BC4\u4EF7 R\xB2\u3001\u659C\u7387 \u03B2\u2081 \u7684\u5B9E\u9645\u7269\u7406/\u7ECF\u6D4E\u542B\u4E49\u4E0E\u663E\u8457\u6027\u3002
2. **\u6B8B\u5DEE\u5047\u8BBE\u68C0\u9A8C\u8BCA\u65AD (\u5173\u952E)**:
   - \u6B63\u6001\u6027\u68C0\u9A8C\u5224\u8BFB (Shapiro-Wilk)
   - \u5F02\u65B9\u5DEE\u6027\u68C0\u9A8C\u5224\u8BFB (Breusch-Pagan)\u3002\u5982\u679C bpP < 0.05\uFF0C\u5FC5\u987B\u660E\u786E\u7ED9\u51FA\uFF1A\u201C\u6B8B\u5DEE\u5B58\u5728\u663E\u8457\u5F02\u65B9\u5DEE\uFF0C\u867D\u7136\u659C\u7387\u4F30\u8BA1\u91CF\u65E0\u504F\uFF0C\u4F46\u6807\u51C6\u8BEF\u504F\u79BB\uFF0C\u5EFA\u8BAE\u91C7\u7528 Robust \u7A33\u5065\u6807\u51C6\u8BEF\uFF08HC3\uFF09\u6216 WLS \u52A0\u6743\u6700\u5C0F\u4E8C\u4E58\u6CD5\u8FDB\u884C\u4FEE\u6B63\u3002\u201D
   - \u6760\u6746\u70B9\u4E0E Cook \u8DDD\u79BB\u5224\u8BFB
3. **\u7EDF\u8BA1\u51B3\u7B56\u4E0E\u6539\u8FDB\u65B9\u6848 (Actionable Advice)**: \u63D0\u4F9B\u5177\u4F53\u7684\u540E\u7EED\u6570\u636E\u5904\u7406\u6216\u6A21\u578B\u4FEE\u6B63\u5EFA\u8BAE\uFF08\u5982\u5BF9\u6570\u53D8\u6362\u3001\u5254\u9664\u6760\u6746\u70B9\u3001WLS\u7B49\uFF09\u3002

\u4F7F\u7528\u7B80\u6D01\u4E13\u4E1A\u4E14\u6E29\u6696\u4F18\u96C5\u7684\u4E2D\u6587\u7B80\u4F53 Markdown \u8F93\u51FA\u3002`;
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt
      });
      res.json({
        success: true,
        isFallback: false,
        diagnosisText: response.text || "\u672A\u80FD\u751F\u6210 AI \u8BCA\u65AD\uFF0C\u8BF7\u91CD\u8BD5\u3002"
      });
    } catch (err) {
      console.error("Gemini API Error:", err);
      res.status(500).json({
        success: false,
        error: err.message || "AI \u8BCA\u65AD\u63A5\u53E3\u8C03\u7528\u5F02\u5E38"
      });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
//# sourceMappingURL=server.cjs.map
