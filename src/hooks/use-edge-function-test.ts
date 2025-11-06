import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TestResult } from "@/pages/ApiTest";

export const useEdgeFunctionTest = (functionName: string) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const test = async (params: any): Promise<TestResult> => {
    setLoading(true);
    const startTime = Date.now();

    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: params,
      });

      const endTime = Date.now();
      const latency = endTime - startTime;

      const testResult: TestResult = {
        id: `${functionName}-${Date.now()}`,
        timestamp: new Date(),
        functionName,
        status: error ? "error" : "success",
        request: params,
        response: error || data,
        latency,
      };

      setResult(testResult);
      return testResult;
    } catch (err) {
      const endTime = Date.now();
      const latency = endTime - startTime;

      const testResult: TestResult = {
        id: `${functionName}-${Date.now()}`,
        timestamp: new Date(),
        functionName,
        status: "error",
        request: params,
        response: err instanceof Error ? err.message : "Unknown error",
        latency,
      };

      setResult(testResult);
      return testResult;
    } finally {
      setLoading(false);
    }
  };

  return { test, loading, result };
};
