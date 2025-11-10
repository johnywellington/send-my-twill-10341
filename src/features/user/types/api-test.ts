export interface TestResult {
  id: string;
  timestamp: Date;
  functionName: string;
  status: "success" | "error";
  request: any;
  response: any;
  latency: number;
}
