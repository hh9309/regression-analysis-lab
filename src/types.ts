export interface DataPoint {
  id: string;
  x: number;
  y: number;
  label?: string;
  group?: string;
  isOutlier?: boolean;
}

export interface PointDiagnostic {
  id: string;
  x: number;
  y: number;
  fittedY: number;
  residual: number;
  stdResidual: number;
  leverage: number; // h_ii
  cooksDistance: number; // D_i
}

export interface OLSResult {
  n: number;
  slope: number; // \beta_1
  intercept: number; // \beta_0
  r2: number;
  adjR2: number;
  sse: number; // Sum of Squared Errors
  sst: number; // Total Sum of Squares
  ssr: number; // Regression Sum of Squares
  mse: number; // Mean Squared Error = sse / (n - 2)
  rmse: number;
  seSlope: number;
  seIntercept: number;
  tSlope: number;
  tIntercept: number;
  pSlope: number;
  pIntercept: number;
  fStat: number;
  fPvalue: number;
  meanX: number;
  meanY: number;
  sumSxx: number;
  diagnostics: PointDiagnostic[];
  
  // Statistical Tests
  shapiroP: number;
  shapiroW: number;
  bpP: number;
  bpStat: number;
  dwStat: number;
}

export interface CaseStudyPreset {
  id: string;
  title: string;
  category: 'advertising' | 'simpson' | 'anscombe' | 'heteroscedasticity';
  description: string;
  insights: string;
  points: DataPoint[];
  groups?: { [key: string]: { name: string; color: string } };
  anscombeGroup?: 1 | 2 | 3 | 4;
}

export type ActiveTab =
  | 'guide'
  | 'sandbox'
  | 'cases'
  | 'diagnostics'
  | 'python'
  | 'ai'
  | 'export';
