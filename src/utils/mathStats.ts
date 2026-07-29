import { DataPoint, OLSResult, PointDiagnostic } from '../types';

/**
 * Approximate Student's t-distribution two-tailed p-value
 */
export function getStudentTPvalue(t: number, df: number): number {
  if (isNaN(t) || df <= 0) return 1.0;
  const absT = Math.abs(t);
  // Approximation for two-tailed Student t test
  const x = df / (df + absT * absT);
  const p = incompleteBeta(df / 2, 0.5, x);
  return Math.min(1.0, Math.max(0.0, p));
}

/**
 * Approximate Chi-Square p-value with df degrees of freedom
 */
export function getChiSquarePvalue(chi2: number, df: number): number {
  if (isNaN(chi2) || chi2 <= 0) return 1.0;
  // Approximation using regularized gamma function
  const k = df / 2;
  const x = chi2 / 2;
  return Math.min(1.0, Math.max(0.0, 1 - gammp(k, x)));
}

/**
 * Regularized Incomplete Beta function (for t-distribution p-value)
 */
function incompleteBeta(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const BT = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x)
  );

  if (x < (a + 1) / (a + b + 2)) {
    return (BT * betaContinuedFraction(a, b, x)) / a;
  } else {
    return 1 - (BT * betaContinuedFraction(b, a, 1 - x)) / b;
  }
}

function betaContinuedFraction(a: number, b: number, x: number): number {
  const maxIter = 100;
  const eps = 3e-7;
  let qab = a + b;
  let qap = a + 1;
  let qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= maxIter; m++) {
    let m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    let del = d * c;
    h *= del;
    if (Math.abs(del - 1) < eps) break;
  }
  return h;
}

function logGamma(z: number): number {
  const c = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.001208650973866179, -0.000005395239384953,
  ];
  let x = z;
  let y = z;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) {
    y += 1;
    ser += c[j] / y;
  }
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

function gammp(a: number, x: number): number {
  if (x < 0 || a <= 0) return 0;
  if (x < a + 1) {
    return gser(a, x);
  } else {
    return 1 - gcf(a, x);
  }
}

function gser(a: number, x: number): number {
  let sum = 1 / a;
  let del = sum;
  let ap = a;
  const gln = logGamma(a);
  for (let n = 1; n <= 100; n++) {
    ap += 1;
    del *= x / ap;
    sum += del;
    if (Math.abs(del) < Math.abs(sum) * 3e-7) break;
  }
  return sum * Math.exp(-x + a * Math.log(x) - gln);
}

function gcf(a: number, x: number): number {
  const gln = logGamma(a);
  let b = x + 1 - a;
  let c = 1 / 1e-30;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i <= 100; i++) {
    let an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = b + an / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    let del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 3e-7) break;
  }
  return Math.exp(-x + a * Math.log(x) - gln) * h;
}

/**
 * Calculates complete OLS regression and residual diagnostics for given points
 */
export function calculateOLS(points: DataPoint[]): OLSResult {
  const n = points.length;

  if (n < 3) {
    // Default dummy result if less than 3 points
    return {
      n,
      slope: 0,
      intercept: 0,
      r2: 0,
      adjR2: 0,
      sse: 0,
      sst: 0,
      ssr: 0,
      mse: 0,
      rmse: 0,
      seSlope: 0,
      seIntercept: 0,
      tSlope: 0,
      tIntercept: 0,
      pSlope: 1,
      pIntercept: 1,
      fStat: 0,
      fPvalue: 1,
      meanX: 0,
      meanY: 0,
      sumSxx: 1,
      diagnostics: [],
      shapiroP: 0.5,
      shapiroW: 1.0,
      bpP: 0.5,
      bpStat: 0,
      dwStat: 2.0,
    };
  }

  let sumX = 0;
  let sumY = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let sumSxx = 0;
  let sumSxy = 0;
  let sumSyy = 0;

  for (const p of points) {
    const dx = p.x - meanX;
    const dy = p.y - meanY;
    sumSxx += dx * dx;
    sumSxy += dx * dy;
    sumSyy += dy * dy;
  }

  // Prevent divide by zero if all X are identical
  const safeSxx = sumSxx === 0 ? 1e-9 : sumSxx;
  const slope = sumSxy / safeSxx;
  const intercept = meanY - slope * meanX;

  // Calculate SSE & SSR
  let sse = 0;
  let ssr = 0;

  const rawDiagnostics: {
    point: DataPoint;
    fittedY: number;
    residual: number;
  }[] = [];

  for (const p of points) {
    const fittedY = intercept + slope * p.x;
    const residual = p.y - fittedY;
    sse += residual * residual;
    ssr += (fittedY - meanY) * (fittedY - meanY);
    rawDiagnostics.push({ point: p, fittedY, residual });
  }

  const sst = sumSyy === 0 ? 1e-9 : sumSyy;
  const r2 = Math.min(1.0, Math.max(0.0, 1 - sse / sst));
  const dfResidual = Math.max(1, n - 2);
  const dfTotal = n - 1;
  const adjR2 = Math.max(0.0, 1 - (sse / dfResidual) / (sst / dfTotal));

  const mse = sse / dfResidual;
  const rmse = Math.sqrt(mse);

  const seSlope = Math.sqrt(mse / safeSxx);
  const seIntercept = Math.sqrt(mse * (1 / n + (meanX * meanX) / safeSxx));

  const tSlope = seSlope === 0 ? 0 : slope / seSlope;
  const tIntercept = seIntercept === 0 ? 0 : intercept / seIntercept;

  const pSlope = getStudentTPvalue(tSlope, dfResidual);
  const pIntercept = getStudentTPvalue(tIntercept, dfResidual);

  const fStat = mse === 0 ? 0 : (ssr / 1) / mse;
  const fPvalue = getStudentTPvalue(Math.sqrt(fStat), dfResidual);

  // Compute Leverages h_ii and Cook's Distance D_i
  const diagnostics: PointDiagnostic[] = rawDiagnostics.map(({ point, fittedY, residual }) => {
    const leverage = 1 / n + Math.pow(point.x - meanX, 2) / safeSxx;
    const denom = mse * (1 - Math.min(0.999, leverage));
    const stdResidual = denom > 0 ? residual / Math.sqrt(denom) : 0;
    
    // Cook's distance
    const cooksDistance =
      leverage < 0.999
        ? 0.5 * Math.pow(stdResidual, 2) * (leverage / (1 - leverage))
        : 5.0;

    return {
      id: point.id,
      x: point.x,
      y: point.y,
      fittedY,
      residual,
      stdResidual,
      leverage,
      cooksDistance,
    };
  });

  // Calculate Durbin-Watson statistic
  let dwSumNumerator = 0;
  for (let i = 1; i < diagnostics.length; i++) {
    const diff = diagnostics[i].residual - diagnostics[i - 1].residual;
    dwSumNumerator += diff * diff;
  }
  const dwStat = sse === 0 ? 2.0 : dwSumNumerator / sse;

  // Breusch-Pagan Test
  const bpResult = calculateBreuschPagan(diagnostics, points, meanX, safeSxx, sse, n);

  // Shapiro-Wilk Test Approximation
  const shapiroResult = calculateShapiroWilk(diagnostics.map((d) => d.residual));

  return {
    n,
    slope,
    intercept,
    r2,
    adjR2,
    sse,
    sst,
    ssr,
    mse,
    rmse,
    seSlope,
    seIntercept,
    tSlope,
    tIntercept,
    pSlope,
    pIntercept,
    fStat,
    fPvalue,
    meanX,
    meanY,
    sumSxx: safeSxx,
    diagnostics,
    dwStat,
    shapiroP: shapiroResult.p,
    shapiroW: shapiroResult.w,
    bpP: bpResult.p,
    bpStat: bpResult.stat,
  };
}

/**
 * Breusch-Pagan Test for Heteroscedasticity
 */
function calculateBreuschPagan(
  diagnostics: PointDiagnostic[],
  points: DataPoint[],
  meanX: number,
  sumSxx: number,
  sse: number,
  n: number
) {
  if (n < 4 || sse === 0) return { stat: 0, p: 0.5 };

  const sigma2 = sse / n;
  const g = diagnostics.map((d) => d.residual * d.residual / sigma2);
  const meanG = g.reduce((a, b) => a + b, 0) / n;

  let sumG_dx = 0;
  for (let i = 0; i < n; i++) {
    sumG_dx += (g[i] - meanG) * (points[i].x - meanX);
  }

  const slopeG = sumG_dx / sumSxx;
  let ssrG = 0;
  for (let i = 0; i < n; i++) {
    const fitG = meanG + slopeG * (points[i].x - meanX);
    ssrG += (fitG - meanG) * (fitG - meanG);
  }

  const LM = 0.5 * ssrG;
  const p = getChiSquarePvalue(LM, 1);
  return { stat: LM, p };
}

/**
 * Shapiro-Wilk Normal Test Approximation
 */
function calculateShapiroWilk(residuals: number[]) {
  const n = residuals.length;
  if (n < 3) return { w: 1, p: 0.5 };

  const sorted = [...residuals].sort((a, b) => a - b);
  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  const ss = sorted.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0);

  if (ss === 0) return { w: 1, p: 0.5 };

  // Generate normal order statistics weights (Blom's formula approximation)
  const a: number[] = [];
  for (let i = 1; i <= n; i++) {
    const ui = (i - 0.375) / (n + 0.25);
    // Inverse normal approximation (probit)
    a.push(normalQuantile(ui));
  }

  // Normalize weights
  const sumA2 = a.reduce((sum, v) => sum + v * v, 0);
  const normA = a.map((v) => v / Math.sqrt(sumA2));

  let bSum = 0;
  for (let i = 0; i < n; i++) {
    bSum += normA[i] * sorted[i];
  }

  const W = Math.min(1.0, Math.max(0.0, (bSum * bSum) / ss));

  // Approximate p-value for W
  // Using Royston transformation approximation for log(1-W)
  const y = Math.log(1 - W + 1e-9);
  let mu = -2.273 + 0.459 * Math.log(n);
  let sigma = Math.exp(-0.4803 + 0.082 * Math.log(n));
  const z = (y - mu) / sigma;
  const p = 1 - normalCDF(z);

  return { w: W, p: Math.min(1.0, Math.max(0.0001, p)) };
}

/**
 * Standard Normal Quantile function (probit)
 */
function normalQuantile(p: number): number {
  if (p <= 0) return -3.5;
  if (p >= 1) return 3.5;
  // Wichura approximation
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239e0];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];

  const q = p - 0.5;
  if (Math.abs(q) <= 0.42) {
    const r = q * q;
    return (
      (q * (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5])) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  }
  const r = p < 0.5 ? p : 1 - p;
  const s = Math.log(-Math.log(r));
  let t = 0.3374754822761478 + s * (0.9761643820667715 + s * (0.1607979714918209 + s * 0.0276438810333863));
  return p < 0.5 ? -t : t;
}

function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

/**
 * Calculates Confidence and Prediction Intervals at value x
 */
export function getRegressionIntervals(
  x: number,
  ols: OLSResult,
  confidenceLevel: number = 0.95
) {
  const { slope, intercept, meanX, sumSxx, mse, n } = ols;
  const fittedY = intercept + slope * x;

  if (n <= 2 || mse <= 0) {
    return { fittedY, ciLower: fittedY, ciUpper: fittedY, piLower: fittedY, piUpper: fittedY };
  }

  // Critical t-value approximation for 95% CI (df = n - 2)
  const df = n - 2;
  const tCritical = df > 30 ? 1.96 : 2.0 + 3.0 / df;

  const dx2 = Math.pow(x - meanX, 2);
  const seFit = Math.sqrt(mse * (1 / n + dx2 / sumSxx));
  const sePred = Math.sqrt(mse * (1 + 1 / n + dx2 / sumSxx));

  return {
    fittedY,
    ciLower: fittedY - tCritical * seFit,
    ciUpper: fittedY + tCritical * seFit,
    piLower: fittedY - tCritical * sePred,
    piUpper: fittedY + tCritical * sePred,
  };
}
