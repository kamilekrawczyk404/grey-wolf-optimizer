import { useEffect, useState } from "react";
import {
  MultiTestFormValues,
  SingleTestFormValues,
  TestSession,
  useTestStore,
  isAlgorithmComparison,
  isFunctionComparison,
  FunctionComparisonFormValues,
  hasAlgorithmProgress,
  hasFunctionProgress,
} from "@/stores/test-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, X, Clock } from "lucide-react";
import { toast } from "sonner";

interface RunningTestViewProps {
  session: TestSession;
}

export function RunningTestView({ session }: RunningTestViewProps) {
  const { cancelSession } = useTestStore();
  const [, setTick] = useState(0);

  const isAlgorithmComparisonMode = isAlgorithmComparison(session.config);
  const isFunctionComparisonMode = isFunctionComparison(session.config);
  const isMultiTest = isAlgorithmComparisonMode || isFunctionComparisonMode;

  // Force re-render every second to update elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getProgressPercentage = (): number | undefined => {
    if (!session.multiTestProgress) return undefined;

    if (hasAlgorithmProgress(session.multiTestProgress)) {
      // Algorithm comparison
      const completed = session.multiTestProgress.completedAlgorithms.length;
      const total = isAlgorithmComparison(session.config)
        ? (session.config as MultiTestFormValues).selectedAlgorithms?.length ||
          0
        : 0;

      if (total === 0) return undefined;
      return Math.round((completed / total) * 100);
    }

    if (hasFunctionProgress(session.multiTestProgress)) {
      // Function comparison
      const completed = session.multiTestProgress.completedFunctions.length;
      const total = isFunctionComparison(session.config)
        ? (session.config as FunctionComparisonFormValues)
            .selectedBenchmarkFunctions?.length || 0
        : 0;

      if (total === 0) return undefined;
      return Math.round((completed / total) * 100);
    }

    return undefined;
  };

  const getProgressText = (): string => {
    if (!session.multiTestProgress) {
      if (isAlgorithmComparisonMode && isAlgorithmComparison(session.config)) {
        return `Processing ${
          session.config.selectedAlgorithms?.length || 0
        } algorithms sequentially...`;
      }
      if (isFunctionComparisonMode && isFunctionComparison(session.config)) {
        return `Processing ${
          session.config.selectedBenchmarkFunctions?.length || 0
        } functions sequentially...`;
      }
      return "Running optimization...";
    }

    if (hasAlgorithmProgress(session.multiTestProgress)) {
      const completed = session.multiTestProgress.completedAlgorithms.length;
      const total = isAlgorithmComparison(session.config)
        ? (session.config as MultiTestFormValues).selectedAlgorithms?.length ||
          0
        : 0;
      const current = session.multiTestProgress.currentAlgorithm;

      if (current) {
        return `Processing ${current} (${completed + 1}/${total})...`;
      }
      return `${completed}/${total} algorithms completed`;
    }

    if (hasFunctionProgress(session.multiTestProgress)) {
      const completed = session.multiTestProgress.completedFunctions.length;
      const total = isFunctionComparison(session.config)
        ? (session.config as FunctionComparisonFormValues)
            .selectedBenchmarkFunctions?.length || 0
        : 0;
      const current = session.multiTestProgress.currentFunction;

      if (current) {
        return `Processing ${current} (${completed + 1}/${total})...`;
      }
      return `${completed}/${total} functions completed`;
    }

    return "Running optimization...";
  };

  const formatElapsedTime = (startTime: number) => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleCancel = () => {
    cancelSession(session.id);
  };

  const getDimensionsDisplay = () => {
    if ("dimensions" in session.config) {
      return session.config.dimensions;
    }
    const configs = (session.config as FunctionComparisonFormValues)
      .functionConfigs;
    if (configs && configs.length > 0) {
      const dims = configs.map((c) => c.dimensions);
      const uniqueDims = Array.from(new Set(dims));
      if (uniqueDims.length === 1) {
        return uniqueDims[0];
      }
      return `${Math.min(...dims)}-${Math.max(...dims)}`;
    }
    return "N/A";
  };

  const getBoundsDisplay = () => {
    if ("lowerBound" in session.config && "upperBound" in session.config) {
      return `[${session.config.lowerBound}, ${session.config.upperBound}]`;
    }
    const configs = (session.config as FunctionComparisonFormValues)
      .functionConfigs;
    if (configs && configs.length > 0) {
      const lowerBounds = configs.map((c) => c.lowerBound);
      const upperBounds = configs.map((c) => c.upperBound);
      const uniqueLower = Array.from(new Set(lowerBounds));
      const uniqueUpper = Array.from(new Set(upperBounds));

      if (uniqueLower.length === 1 && uniqueUpper.length === 1) {
        return `[${uniqueLower[0]}, ${uniqueUpper[0]}]`;
      }

      return `[${Math.min(...lowerBounds)}, ${Math.max(...upperBounds)}]`;
    }
    return "N/A";
  };

  const progressPercentage = getProgressPercentage();

  return (
    <Card className="bg-neutral-900 border-neutral-800">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            {isMultiTest ? "Running Comparision" : "Running Test"}
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleCancel}
            className="bg-red-600 hover:bg-red-500"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Algorithm Info */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-neutral-400">
            {isAlgorithmComparisonMode ? "Algorithms:" : "Algorithm:"}
          </span>
          {isAlgorithmComparisonMode &&
          isAlgorithmComparison(session.config) ? (
            <div className={"flex flex-wrap gap-1 justify-end max-w-[70%]"}>
              {session.config.selectedAlgorithms?.map((algo: string) => (
                <Badge
                  key={algo}
                  variant={"outline"}
                  className={
                    "bg-neutral-800 border-neutral-700 text-neutral-300"
                  }
                >
                  {algo}
                </Badge>
              ))}
            </div>
          ) : isFunctionComparisonMode &&
            isFunctionComparison(session.config) ? (
            <Badge variant="secondary" className="bg-neutral-800">
              {session.config.algorithm}
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-neutral-800">
              {session.config.algorithm}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-neutral-400">
            {isFunctionComparisonMode ? "Functions:" : "Benchmark:"}
          </span>
          {isFunctionComparisonMode && isFunctionComparison(session.config) ? (
            <div className={"flex flex-wrap gap-1 justify-end max-w-[70%]"}>
              {session.config.selectedBenchmarkFunctions?.map(
                (func: string) => (
                  <Badge
                    key={func}
                    variant={"outline"}
                    className={
                      "bg-neutral-800 border-neutral-700 text-neutral-300"
                    }
                  >
                    {func}
                  </Badge>
                )
              )}
            </div>
          ) : isAlgorithmComparisonMode &&
            isAlgorithmComparison(session.config) ? (
            <Badge variant="secondary" className="bg-neutral-800">
              {session.config.benchmarkFunction}
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-neutral-800">
              {"benchmarkFunction" in session.config
                ? session.config.benchmarkFunction
                : "N/A"}
            </Badge>
          )}
        </div>

        {/* Progress Indicator */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-neutral-400">
            <span>{getProgressText()}</span>
            {progressPercentage !== undefined && (
              <span className="text-blue-400 font-medium">
                {progressPercentage}%
              </span>
            )}
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Elapsed Time */}
        <div className="flex items-center gap-2 text-sm text-neutral-400">
          <Clock className="h-4 w-4" />
          <span>
            Elapsed:{" "}
            {session.startTime ? formatElapsedTime(session.startTime) : "0:00"}
          </span>
        </div>

        {/* Configuration Summary */}
        <div className="mt-4 p-4 bg-neutral-800 rounded-md space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-400">Population Size:</span>
            <span className="text-white">{session.config.populationSize}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">Dimensions:</span>
            <span className="text-white">{getDimensionsDisplay()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">Iterations:</span>
            <span className="text-white">{session.config.iterations}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">Range:</span>
            <span className="text-white">{getBoundsDisplay()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
