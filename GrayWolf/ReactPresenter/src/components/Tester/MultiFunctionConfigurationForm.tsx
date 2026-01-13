import {
  Algorithms,
  BenchmarkFunctions,
  FunctionComparisonRow,
  functionComparisonSchema,
  FunctionComparisonFormValues,
  TestSession,
  useTestStore,
  hasFunctionProgress,
  isFunctionComparison,
  TrialStatistics,
  FunctionConfig,
  getDefaultParametersForAlgorithm,
} from "@/stores/test-store";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useEffect, useRef } from "react";
import {
  BENCHMARK_CONFIGS,
  ALGORITHM_CONFIGS,
} from "@/stores/benchmark-configs";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FlaskConical, Play, RotateCcw } from "lucide-react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { OptimizerDTO } from "@/types/types";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlgorithmParametersPanel } from "./AlgorithmParametersPanel";

export interface MultiFunctionConfigurationFormProps {
  session: TestSession;
}

export const MultiFunctionConfigurationForm = ({
  session,
}: MultiFunctionConfigurationFormProps) => {
  const {
    activeTab,
    setSessionStatus,
    setTestResult,
    updateSession,
    updateSessionConfig,
  } = useTestStore();
  const previousTabRef = useRef<string>(activeTab);

  const form = useForm<FunctionComparisonFormValues>({
    resolver: zodResolver(functionComparisonSchema),
    defaultValues: isFunctionComparison(session.config)
      ? {
          ...session.config,
          trials: (session.config as FunctionComparisonFormValues).trials ?? 1,
          parameters:
            (session.config as FunctionComparisonFormValues).parameters ?? {},
          selectedBenchmarkFunctions: (
            session.config as FunctionComparisonFormValues
          ).selectedBenchmarkFunctions || [
            BenchmarkFunctions.Rastrigin,
            BenchmarkFunctions.Sphere,
          ],
          functionConfigs:
            (session.config as FunctionComparisonFormValues).functionConfigs ||
            [BenchmarkFunctions.Rastrigin, BenchmarkFunctions.Sphere].map(
              (func) => {
                const config = BENCHMARK_CONFIGS[func];
                return {
                  function: func,
                  dimensions: config.dimensions,
                  lowerBound: config.lowerBound,
                  upperBound: config.upperBound,
                };
              }
            ),
        }
      : {
          algorithm: Algorithms.GWO,
          selectedBenchmarkFunctions: [
            BenchmarkFunctions.Rastrigin,
            BenchmarkFunctions.Sphere,
          ],
          populationSize: 30,
          iterations: 100,
          trials: 1,
          parameters: {},
          functionConfigs: [
            BenchmarkFunctions.Rastrigin,
            BenchmarkFunctions.Sphere,
          ].map((func) => {
            const config = BENCHMARK_CONFIGS[func];
            return {
              function: func,
              dimensions: config.dimensions,
              lowerBound: config.lowerBound,
              upperBound: config.upperBound,
            };
          }),
        },
  });

  const selectedFunctions = form.watch("selectedBenchmarkFunctions");
  const watchAlgorithm = form.watch("algorithm");

  useEffect(() => {
    const currentConfigs = form.getValues("functionConfigs") || [];

    const filteredConfigs = currentConfigs.filter((config) =>
      selectedFunctions.includes(config.function)
    );

    const newConfigs = selectedFunctions
      .filter((func) => !filteredConfigs.some((c) => c.function === func))
      .map((func) => {
        const config = BENCHMARK_CONFIGS[func];
        return {
          function: func,
          dimensions: config.dimensions,
          lowerBound: config.lowerBound,
          upperBound: config.upperBound,
        };
      });

    const updatedConfigs = [...filteredConfigs, ...newConfigs].sort((a, b) => {
      return (
        selectedFunctions.indexOf(a.function) -
        selectedFunctions.indexOf(b.function)
      );
    });

    form.setValue("functionConfigs", updatedConfigs);
  }, [selectedFunctions]);

  // Reset form when switching tabs
  useEffect(() => {
    if (previousTabRef.current !== activeTab && session.id === activeTab) {
      requestAnimationFrame(() => {
        if (isFunctionComparison(session.config)) {
          form.reset(session.config, {
            keepDefaultValues: false,
          });
        }
      });
      previousTabRef.current = activeTab;
    }
  }, [activeTab, session, form]);

  useEffect(() => {
    const algorithmConfig = ALGORITHM_CONFIGS[watchAlgorithm];

    if (algorithmConfig.parameters.length > 0) {
      const currentParams = form.getValues("parameters") || {};

      // Ustaw domyślne parametry tylko jeśli nie ma żadnych wartości
      if (Object.keys(currentParams).length === 0) {
        const defaultParams = getDefaultParametersForAlgorithm(watchAlgorithm);
        form.setValue("parameters", defaultParams);
      }
    } else {
      // Jeśli algorytm nie ma parametrów, wyczyść
      form.setValue("parameters", {});
    }
  }, [watchAlgorithm, form]);
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (name === "algorithm" && type === "change") {
      }
    });

    return () => subscription.unsubscribe();
  }, [form]);

  // Debounced auto-save
  useEffect(() => {
    const handler = setTimeout(() => {
      if (session.id === activeTab) {
        const values = form.getValues();
        updateSessionConfig(activeTab, values);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [
    form.watch("algorithm"),
    form.watch("selectedBenchmarkFunctions"),
    form.watch("populationSize"),
    form.watch("iterations"),
    form.watch("trials"),
    form.watch("functionConfigs"),
    form.watch("parameters"),
    activeTab,
    session.id,
  ]);

  const hasProgress =
    session.multiTestProgress &&
    hasFunctionProgress(session.multiTestProgress) &&
    session.multiTestProgress.completedFunctions.length > 0;

  const canResume = !!(session.runId && session.status === "idle");

  const onSubmit = async (
    values: FunctionComparisonFormValues,
    isResume = false
  ) => {
    const startTime = Date.now();

    const runId =
      isResume && session.runId ? session.runId : crypto.randomUUID();

    if (!isResume || !session.runId) {
      console.log("Saving new RunId:", runId);
      updateSession(activeTab, { runId });
    }

    setSessionStatus(activeTab, "running", {
      startTime,
      result: null,
      resultsSeen: false,
    });

    const sessionState = useTestStore
      .getState()
      .sessions.find((s) => s.id === activeTab);
    const signal = sessionState?.abortController?.signal;

    let functionsToRun: BenchmarkFunctions[];
    let partialResults: FunctionComparisonRow[] = [];

    if (
      !values.selectedBenchmarkFunctions ||
      values.selectedBenchmarkFunctions.length < 2
    ) {
      toast.error("At least two functions required", {
        description: "Comparison requires at least two benchmark functions",
      });

      setSessionStatus(activeTab, "idle", {
        endTime: Date.now(),
      });

      return;
    }

    if (
      isResume &&
      session.multiTestProgress &&
      hasFunctionProgress(session.multiTestProgress)
    ) {
      // Resume z progress
      const progress = session.multiTestProgress;

      functionsToRun = values.selectedBenchmarkFunctions.filter(
        (func) => !progress.completedFunctions.includes(func)
      );
      partialResults = [...progress.partialResults];

      console.log("Resuming function-comparison with progress:", {
        completed: progress.completedFunctions,
        remaining: functionsToRun,
        partialResults: partialResults.length,
      });

      if (functionsToRun.length === 0) {
        toast.error("All functions already completed", {
          description: "No functions left to process",
        });

        setSessionStatus(activeTab, "idle", {
          endTime: Date.now(),
        });

        return;
      }

      toast.info(
        `Resuming comparison - ${functionsToRun.length} function${
          functionsToRun.length > 1 ? "s" : ""
        } remaining`,
        {
          description: `${session.multiTestProgress.completedFunctions.length} already completed`,
        }
      );
    } else if (isResume && session.runId && !session.multiTestProgress) {
      // Resume po refresh
      console.log("Resuming function-comparison after refresh");

      functionsToRun = values.selectedBenchmarkFunctions;
      partialResults = [];

      updateSession(activeTab, {
        multiTestProgress: {
          mode: "functions",
          completedFunctions: [],
          partialResults: [],
          currentFunction: undefined,
        },
      });

      toast.info("Resuming comparison from checkpoint", {
        description: `Starting with ${functionsToRun.length} functions`,
      });
    } else {
      // Nowy test
      functionsToRun = values.selectedBenchmarkFunctions;

      updateSession(activeTab, {
        multiTestProgress: {
          mode: "functions",
          completedFunctions: [],
          partialResults: [],
          currentFunction: undefined,
        },
      });
    }

    let hasError = false;

    for (const func of functionsToRun) {
      try {
        const funcStartTime = Date.now();

        const currentSession = useTestStore
          .getState()
          .sessions.find((s) => s.id === activeTab);

        if (
          currentSession?.multiTestProgress &&
          currentSession.multiTestProgress.mode === "functions"
        ) {
          updateSession(activeTab, {
            multiTestProgress: {
              ...currentSession.multiTestProgress,
              currentFunction: func,
            },
          });
        }

        const funcConfig = values.functionConfigs.find(
          (c) => c.function === func
        );

        if (!funcConfig) {
          throw new Error(`Configuration not found for function ${func}`);
        }

        const requestBody = {
          RunId: runId,
          Algorithm: values.algorithm,
          PopulationSize: values.populationSize,
          Dimensions: funcConfig.dimensions,
          Iterations: values.iterations,
          LowerBound: funcConfig.lowerBound,
          UpperBound: funcConfig.upperBound,
          Function: func,
          Trials: values.trials,
          GenerateReport: false,
          Parameters: values.parameters || {},
        };

        console.log(`Starting function ${func} with session RunId: ${runId}`);

        const response = await fetch(
          "http://localhost:5000/api/optimizer/run",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
            signal,
          }
        );

        if (response.status === 499) {
          console.log("Backend cancelled (499), checkpoint saved");

          setSessionStatus(activeTab, "idle", {
            endTime: Date.now(),
          });

          toast.info(
            `Function ${func} paused. Progress saved (${partialResults.length}/${values.selectedBenchmarkFunctions.length} completed)`,
            {
              description: "You can resume from this tab",
            }
          );
          return;
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.Error || `API error for ${func}`);
        }

        const data = await response.json();
        const funcDuration = (Date.now() - funcStartTime) / 1000;

        let result: FunctionComparisonRow;

        if (data.statistics) {
          // Odpowiedź dla trials > 1
          const stats = data.statistics as TrialStatistics;

          const cleanedStats: TrialStatistics = {
            ...stats,
            allTrials: stats.allTrials.map((trial) => ({
              ...trial,
              historyLogs: [],
            })),
          };

          result = {
            status: "success",
            benchmarkFunction: func,
            duration: funcDuration,
            bestSolution: stats.bestSolution,
            bestFitness: stats.bestFitness,
            solution: stats.allTrials?.[0]?.bestSolution
              ? [stats.allTrials[0].bestSolution]
              : undefined,
            historyJson: stats.allTrials?.[0]?.historyLogs,
            statistics: cleanedStats,
          };
        } else {
          // Odpowiedź dla trials = 1
          result = {
            status: "success",
            benchmarkFunction: func,
            duration: funcDuration,
            bestSolution: data.bestSolution,
            bestFitness: data.bestFitness,
            solution: data.solution,
            historyJson: data.historyJson,
          };
        }

        partialResults.push(result);

        const updatedSession = useTestStore
          .getState()
          .sessions.find((s) => s.id === activeTab);

        if (
          updatedSession?.multiTestProgress &&
          updatedSession.multiTestProgress.mode === "functions"
        ) {
          updateSession(activeTab, {
            multiTestProgress: {
              ...updatedSession.multiTestProgress,
              completedFunctions: [
                ...updatedSession.multiTestProgress.completedFunctions,
                func,
              ],
              partialResults: [...partialResults],
              currentFunction: undefined,
            },
          });
        }

        console.log(
          `Completed function ${func}, total results: ${partialResults.length}`
        );
      } catch (e) {
        console.error(`Error executing ${func}:`, e);

        if (e instanceof Error && e.name === "AbortError") {
          console.log("Function-comparison cancelled - progress saved");

          setSessionStatus(activeTab, "idle", {
            endTime: Date.now(),
          });

          toast.info(
            `Comparison cancelled. Progress saved (${partialResults.length}/${values.selectedBenchmarkFunctions.length} completed)`,
            {
              description: "You can resume from this tab",
            }
          );
          return;
        }

        hasError = true;

        partialResults.push({
          benchmarkFunction: func,
          status: "failed",
          error: e instanceof Error ? e.message : "Connection failed",
          duration: 0,
        });

        toast.error(`Function ${func} failed`, {
          description: e instanceof Error ? e.message : "Unknown error",
        });
      }
    }

    //  GENEROWANIE RAPORTU
    console.log("🎯 All functions completed. Generating comparison report...");

    try {
      const reportEndpoint =
        values.trials > 1
          ? "http://localhost:5000/api/optimizer/compare-functions-multitrial"
          : "http://localhost:5000/api/optimizer/compare-functions";

      let reportRequestBody: any;

      if (values.trials > 1) {
        // Request body dla multitrial
        reportRequestBody = {
          algorithmName: values.algorithm,
          populationSize: values.populationSize,
          iterations: values.iterations,
          results: partialResults
            .filter((r) => r.status === "success" && r.statistics)
            .map((r) => {
              const funcConfig = values.functionConfigs.find(
                (c) => c.function === r.benchmarkFunction
              );

              return {
                functionName: r.benchmarkFunction,
                trialsCount: r.statistics!.totalTrials,
                bestFitness: r.statistics!.bestFitness,
                worstFitness: r.statistics!.worstFitness,
                meanFitness: r.statistics!.meanFitness,
                medianFitness: r.statistics!.medianFitness,
                stdDevFitness: r.statistics!.stdDevFitness,
                coeffOfVariationFitness: r.statistics!.coeffOfVariationFitness,
                bestSolution: r.statistics!.bestSolution,
                dimensions: funcConfig?.dimensions,
                lowerBound: funcConfig?.lowerBound,
                upperBound: funcConfig?.upperBound,
              };
            }),
        };
      } else {
        // Request body dla single trial
        reportRequestBody = {
          algorithmName: values.algorithm,
          populationSize: values.populationSize,
          iterations: values.iterations,
          results: partialResults
            .filter((r) => r.status === "success")
            .map((r) => {
              // ✅ POPRAWKA: Zadeklaruj funcConfig wewnątrz map
              const funcConfig = values.functionConfigs.find(
                (c) => c.function === r.benchmarkFunction
              );

              return {
                functionName: r.benchmarkFunction,
                bestFitness: r.bestFitness,
                bestSolution: r.bestSolution,
                evaluationsCount: values.populationSize * values.iterations,
                dimensions: funcConfig?.dimensions,
                lowerBound: funcConfig?.lowerBound,
                upperBound: funcConfig?.upperBound,
              };
            }),
        };
      }

      console.log(`📤 Calling ${reportEndpoint} with:`, reportRequestBody);

      const reportResponse = await fetch(reportEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reportRequestBody),
      });

      if (reportResponse.ok) {
        const reportResult = await reportResponse.json();
        console.log("✅ Report generated successfully:", reportResult);
        toast.success("Comparison report generated", {
          description: "Check your desktop for the report file",
        });
      } else {
        const errorText = await reportResponse.text();
        console.error("❌ Report generation failed:", errorText);
        toast.warning("Comparison completed but report generation failed", {
          description: errorText,
        });
      }
    } catch (reportError) {
      console.error("❌ Error generating report:", reportError);

      if (reportError instanceof Error) {
        console.error("Error message:", reportError.message);
        console.error("Error stack:", reportError.stack);
      }

      toast.warning("Comparison completed but report generation failed");
    }

    const functionsNames =
      values.selectedBenchmarkFunctions.length > 1
        ? values.selectedBenchmarkFunctions.join(", ")
        : values.selectedBenchmarkFunctions[0];

    updateSession(activeTab, {
      multiTestProgress: undefined,
    });

    setTestResult(activeTab, {
      type: "function-comparison",
      algorithm: values.algorithm,
      results: partialResults,
      message: `Comparison of ${functionsNames} completed`,
    });

    console.log(
      "Result set. Current session state:",
      useTestStore.getState().sessions.find((s) => s.id === activeTab)
    );

    setSessionStatus(activeTab, hasError ? "error" : "completed", {
      endTime: Date.now(),
      runId: undefined,
    });

    const totalDuration = partialResults.reduce(
      (sum, val) => (sum += val.duration),
      0
    );

    const isPlural = values.selectedBenchmarkFunctions.length > 1;

    if (!hasError) {
      toast.success(`Comparison completed successfully`, {
        description: `${values.selectedBenchmarkFunctions.length} function${
          isPlural ? "s" : ""
        } finished in ${totalDuration.toFixed(2)}s`,
      });
    } else {
      toast.warning("Comparison completed with some errors.");
    }
  };

  const handleNewComparison = async () => {
    if (!session.runId) {
      console.log("No runId to clear");
      return;
    }

    console.log("New comparison clicked - clearing checkpoint:", session.runId);

    try {
      await fetch(
        `http://localhost:5000/api/optimizer/checkpoint/${session.runId}`,
        { method: "DELETE" }
      );
      console.log(`✅ Deleted checkpoint: ${session.runId}`);
    } catch (err) {
      console.error(`Failed to delete checkpoint ${session.runId}:`, err);
    }

    updateSession(activeTab, {
      multiTestProgress: undefined,
      runId: undefined,
      status: "idle",
    });

    toast.success("Progress cleared. Ready for new comparison.");
  };

  if (session.id !== activeTab) return null;

  const values = form.getValues();

  return (
    <Card className="bg-neutral-900 border-neutral-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <span className="inline-flex items-center gap-2">
            <FlaskConical className="text-cyan-400" />
            Multi-Function Comparison
          </span>
          {canResume && (
            <Badge
              variant="outline"
              className="bg-orange-950/50 text-orange-400 border-orange-900"
            >
              {hasProgress && session.multiTestProgress?.mode === "functions"
                ? `${session.multiTestProgress.completedFunctions.length}/${
                    (session.config as FunctionComparisonFormValues)
                      .selectedBenchmarkFunctions?.length || 0
                  } Completed`
                : "Checkpoint Available"}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Run one algorithm on multiple benchmark functions to compare their
          performance.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => onSubmit(values, false))}
            className="space-y-6"
          >
            {/* Algorithm Selection */}
            <FormField
              control={form.control}
              name="algorithm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-neutral-300">Algorithm</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={canResume}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white">
                        <SelectValue placeholder="Select algorithm" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-neutral-800 border-neutral-700">
                      <SelectItem value={Algorithms.GWO}>
                        Gray Wolf Optimizer
                      </SelectItem>
                      <SelectItem value={Algorithms.Aquila}>
                        Aquila Optimizer
                      </SelectItem>
                      <SelectItem value={Algorithms.SSA}>
                        Salp Swarm Optimizer
                      </SelectItem>
                      <SelectItem value={Algorithms.BA}>
                        Bat Algorithm
                      </SelectItem>
                      <SelectItem value={Algorithms.GA}>
                        Genetic Algorithm
                      </SelectItem>
                      <SelectItem value={Algorithms.PSO}>
                        Particle Swarm Optimization
                      </SelectItem>
                      <SelectItem value={Algorithms.BOA}>
                        Butterfly Optimization Algorithm
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <AlgorithmParametersPanel
              parameters={ALGORITHM_CONFIGS[watchAlgorithm].parameters}
              values={form.watch("parameters") || {}}
              onChange={(newParams) => form.setValue("parameters", newParams)}
              disabled={canResume}
            />

            {/* Benchmark Functions Selection */}
            <FormField
              control={form.control}
              name="selectedBenchmarkFunctions"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-neutral-300">
                      Select Benchmark Functions to Compare
                    </FormLabel>
                    <FormDescription>
                      Choose at least two benchmark functions for comparison.
                    </FormDescription>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.values(BenchmarkFunctions).map((func) => (
                      <FormField
                        key={func}
                        control={form.control}
                        name="selectedBenchmarkFunctions"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={func}
                              className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-neutral-700 p-4"
                            >
                              <FormControl>
                                <Checkbox
                                  disabled={canResume}
                                  checked={field.value?.includes(func)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, func])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== func
                                          )
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal cursor-pointer">
                                {func}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {selectedFunctions.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-neutral-300">
                  Function Configurations
                </h3>
                <div className="space-y-3">
                  {selectedFunctions.map((func, index) => {
                    const funcConfig = values.functionConfigs?.find(
                      (c: FunctionConfig) => c.function === func
                    );
                    const configIndex = values.functionConfigs?.findIndex(
                      (c: FunctionConfig) => c.function === func
                    );

                    if (configIndex === -1 || configIndex === undefined)
                      return null;

                    return (
                      <div
                        key={func}
                        className="p-4 bg-neutral-800 rounded-lg space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-white">
                            {func}
                          </h4>
                          <span className="text-xs text-neutral-400">
                            Default: {BENCHMARK_CONFIGS[func].dimensions}D
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <FormField
                            control={form.control}
                            name={`functionConfigs.${configIndex}.dimensions`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-neutral-300 text-xs">
                                  Dimensions
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    className="bg-neutral-700 border-neutral-600 text-white h-9"
                                    {...field}
                                    onChange={(e) =>
                                      field.onChange(+e.target.value)
                                    }
                                    disabled={canResume}
                                    min={2}
                                    max={100}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`functionConfigs.${configIndex}.lowerBound`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-neutral-300 text-xs">
                                  Lower Bound
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    className="bg-neutral-700 border-neutral-600 text-white h-9"
                                    {...field}
                                    onChange={(e) =>
                                      field.onChange(+e.target.value)
                                    }
                                    disabled={canResume}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`functionConfigs.${configIndex}.upperBound`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-neutral-300 text-xs">
                                  Upper Bound
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    className="bg-neutral-700 border-neutral-600 text-white h-9"
                                    {...field}
                                    onChange={(e) =>
                                      field.onChange(+e.target.value)
                                    }
                                    disabled={canResume}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <Separator />

            {/* Configuration Parameters */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="populationSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-neutral-300">
                      Population Size
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        className="bg-neutral-800 border-neutral-700 text-white"
                        {...field}
                        onChange={(e) => field.onChange(+e.target.value)}
                        disabled={canResume}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="iterations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-neutral-300">
                      Iterations
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        className="bg-neutral-800 border-neutral-700 text-white"
                        {...field}
                        onChange={(e) => field.onChange(+e.target.value)}
                        disabled={canResume}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="trials"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-neutral-300">
                    Number of Trials
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      className="bg-neutral-800 border-neutral-700 text-white"
                      {...field}
                      onChange={(e) => field.onChange(+e.target.value)}
                      disabled={canResume}
                      min={1}
                      max={100}
                    />
                  </FormControl>
                  <FormDescription className="text-neutral-500 text-xs">
                    Number of independent runs per function.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Buttons */}
            <div className="flex gap-2">
              {canResume ? (
                <>
                  <Button
                    type="button"
                    onClick={() =>
                      form.handleSubmit((values) => onSubmit(values, true))()
                    }
                    className="flex-1 bg-orange-600 hover:bg-orange-500 text-white"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    {hasProgress &&
                    session.multiTestProgress?.mode === "functions"
                      ? `Resume Comparison (${
                          (session.config as FunctionComparisonFormValues)
                            .selectedBenchmarkFunctions?.length || 0
                        } - ${
                          session.multiTestProgress.completedFunctions.length
                        } remaining)`
                      : "Resume Comparison"}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleNewComparison}
                    variant="outline"
                    className="flex-1 bg-neutral-800 border-neutral-600 text-neutral-200 hover:bg-neutral-700 hover:border-neutral-500 hover:text-white transition-colors"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    New Comparison
                  </Button>
                </>
              ) : (
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Run Comparison
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
