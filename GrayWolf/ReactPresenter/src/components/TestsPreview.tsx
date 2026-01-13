import React, { useEffect, useMemo, useState } from "react";
import { ExperimentRecord, AlgorithmParameters } from "../types/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Maximize,
  RefreshCw,
  Target,
  Layers,
  ArrowLeftRight,
  Variable,
  Activity,
  Brackets,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTestStore } from "@/stores/test-store";
import { ALGORITHM_CONFIGS } from "@/stores/benchmark-configs";

type TestsPreviewProps = {
  tests: ExperimentRecord[];
  onTestChange?: (test: ExperimentRecord) => void;
  isRunning?: boolean;
};

const getIconForProperty = (property: string) => {
  const p = property.toLowerCase();
  if (p.includes("dimension"))
    return <Maximize className="h-4 w-4 text-blue-400" />;
  if (p.includes("iteration"))
    return <RefreshCw className="h-4 w-4 text-purple-400" />;
  if (p.includes("fitness"))
    return <Target className="h-4 w-4 text-green-400" />;
  if (p.includes("population"))
    return <Layers className="h-4 w-4 text-yellow-400" />;
  if (p.includes("bound"))
    return <ArrowLeftRight className="h-4 w-4 text-orange-400" />;
  if (p.includes("solution"))
    return <Brackets className="h-4 w-4 text-cyan-400" />;
  if (p.includes("function"))
    return <Activity className="h-4 w-4 text-pink-400" />;
  return <Variable className="h-4 w-4 text-neutral-500" />;
};

const formatTitle = (text: string) => {
  return text.replace(/([A-Z])/g, " $1").trim();
};

const TestsPreview = ({
  tests,
  onTestChange,
  isRunning,
}: TestsPreviewProps) => {
  const { getActiveSession } = useTestStore();

  const activeSession = useMemo(() => getActiveSession(), [tests]);

  const [selectedTestIndex, setSelectedTestIndex] = useState<number>(0);

  const selectedTest = tests[selectedTestIndex];

  const { history, ...restProperties } = selectedTest.properties;

  const algorithmParameters = useMemo(() => {
    if (
      "parameters" in selectedTest.properties &&
      selectedTest.properties.parameters
    ) {
      return selectedTest.properties.parameters as AlgorithmParameters;
    }
    return null;
  }, [selectedTest]);

  useEffect(() => {
    if (!tests || tests.length === 0) return;

    if (onTestChange) {
      onTestChange(tests[selectedTestIndex]);
    }
  }, [selectedTestIndex, onTestChange, tests]);

  if (!tests || tests.length === 0) {
    return (
      <Card className="bg-neutral-900 border-neutral-800 h-full flex items-center justify-center p-6">
        <span className="text-neutral-500">No test data available</span>
      </Card>
    );
  }

  return (
    <Card className="bg-neutral-900 border-neutral-800 h-full flex flex-col overflow-y max-h-[400px]">
      <div className="border-b border-neutral-800 bg-neutral-900/50">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex w-max space-x-2 px-4 pb-4">
            {tests.map((test, index) => {
              const isSelected = index === selectedTestIndex;

              return (
                <Button
                  key={index}
                  variant={isSelected ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => !isRunning && setSelectedTestIndex(index)}
                  disabled={isRunning}
                  className={cn(
                    "h-8 transition-all border-neutral-700",
                    isSelected
                      ? "bg-blue-600/20 text-blue-400 border-blue-600/50 hover:bg-blue-600/30"
                      : "bg-transparent text-neutral-400 hover:text-white hover:bg-neutral-800"
                  )}
                >
                  <span className="mr-2 text-xs opacity-70">#{index + 1}</span>
                  {activeSession!.mode === "single"
                    ? `Test ${index + 1}`
                    : `${test.properties.algorithm}`}
                </Button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" className="bg-neutral-800" />
        </ScrollArea>
      </div>

      <CardHeader className="px-4">
        <CardTitle className="flex items-center gap-2">
          <Variable className="h-4 w-4" />
          Optimization Parameters
        </CardTitle>
      </CardHeader>

      <CardContent>
        <ScrollArea className="flex-1 px-4 pb-4 h-[200px]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(restProperties)
              .filter(([key]) => key !== "parameters")
              .map(([property, value]) => (
                <ParameterItem
                  key={property}
                  property={property}
                  value={value}
                />
              ))}

            {algorithmParameters &&
              Object.keys(algorithmParameters).length > 0 && (
                <div className="md:col-span-2 lg:col-span-3">
                  <AlgorithmParametersSection
                    parameters={algorithmParameters}
                    algorithmName={selectedTest.properties.algorithm}
                  />
                </div>
              )}
          </div>
          <ScrollBar />
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

const AlgorithmParametersSection = ({
  parameters,
  algorithmName,
}: {
  parameters: AlgorithmParameters;
  algorithmName: string;
}) => {
  const algorithmConfig =
    ALGORITHM_CONFIGS[algorithmName as keyof typeof ALGORITHM_CONFIGS];

  return (
    <div className="flex flex-col gap-2 p-3 rounded-md border border-purple-800/50 bg-purple-950/20">
      <div className="flex items-center gap-2 mb-2">
        <Settings className="h-4 w-4 text-purple-400" />
        <span className="text-xs font-medium text-purple-300">
          Algorithm Parameters ({algorithmName})
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {Object.entries(parameters).map(([key, value]) => {
          // Znajdź opis parametru z konfiguracji
          const paramInfo = algorithmConfig?.parameters.find(
            (p) => p.name === key
          );

          return (
            <div
              key={key}
              className="flex flex-col gap-1 p-2 rounded border border-purple-700/30 bg-neutral-950/50"
            >
              <span className="text-xs text-purple-300">
                {paramInfo?.description || key}
              </span>
              <span className="text-sm font-mono font-semibold text-white">
                {typeof value === "number" ? value.toFixed(3) : String(value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ParameterItem = ({
  property,
  value,
}: {
  property: string;
  value: any;
}) => {
  const isArray = Array.isArray(value);

  let displayValue = value;
  if (property === "benchmarkFunction" && typeof value === "string") {
    displayValue = value.split(" ")[0];
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-1 p-3 rounded-md border border-neutral-800 bg-neutral-950/30",
        isArray && "md:col-span-2 lg:col-span-3"
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        {getIconForProperty(property)}
        <span className="text-xs font-medium text-neutral-400 capitalize">
          {formatTitle(property)}
          {property === "solution" && (
            <span className={"ml-1 text-xs lowercase"}>
              (Casted to 2 dimensions)
            </span>
          )}
        </span>
      </div>

      {isArray ? (
        <code className="text-xs text-cyan-300 font-mono bg-neutral-900 p-2 rounded border border-neutral-800 break-all leading-relaxed">
          [
          {property === "bestSolution" &&
            (value as number[])
              .map((n) => {
                const num = Number(n);

                return !isNaN(num) ? num.toFixed(4) : String(n);
              })
              .join(", ")}
          {property === "solution" &&
            (value as number[][])
              .map(
                (sol) => `[ ${sol.map((point) => point.toFixed()).join(", ")} ]`
              )
              .join(", ")}
          ]
        </code>
      ) : (
        <span
          className={cn(
            "text-sm font-semibold truncate",
            typeof value === "number"
              ? "font-mono text-white"
              : "text-neutral-200"
          )}
        >
          {typeof displayValue === "number"
            ? displayValue.toLocaleString("en-US", { maximumFractionDigits: 6 })
            : String(displayValue)}
        </span>
      )}
    </div>
  );
};

export default TestsPreview;
