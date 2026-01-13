import {
  Algorithms,
  BenchmarkFunctions,
  ComparisionRow,
  multiTestFormSchema,
  MultiTestFormValues,
  TestSession,
  useTestStore,
  hasAlgorithmProgress,
  isAlgorithmComparison,
  TrialStatistics,
  MultiTrialResponse,
} from "@/stores/test-store";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useEffect } from "react";
import { BENCHMARK_CONFIGS } from "@/stores/benchmark-configs";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Activity, BarChart3, Play, RotateCcw } from "lucide-react";
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
import { useRef } from "react";

export interface MultiAlgorithmsConfigurationFormProps {
  session: TestSession;
}

export const MultiAlgorithmConfigurationForm = ({
  session,
}: MultiAlgorithmsConfigurationFormProps) => {
  const {
    activeTab,
    setSessionStatus,
    setTestResult,
    updateSession,
    updateSessionConfig,
  } = useTestStore();
  const previousTabRef = useRef<string>(activeTab);

  const defaultValues: MultiTestFormValues = {
    benchmarkFunction: BenchmarkFunctions.Rastrigin,
    selectedAlgorithms: [],
    populationSize: 30,
    dimensions: 10,
    iterations: 100,
    lowerBound: -5.12,
    upperBound: 5.12,
    trials: 1,
  };

  const form = useForm<MultiTestFormValues>({
    resolver: zodResolver(multiTestFormSchema),
    defaultValues: isAlgorithmComparison(session.config)
      ? {
          ...session.config,
          trials: (session.config as MultiTestFormValues).trials ?? 1,
        }
      : {
          benchmarkFunction: BenchmarkFunctions.Rastrigin,
          selectedAlgorithms: [Algorithms.GWO, Algorithms.Aquila],
          populationSize: 30,
          dimensions: 10,
          iterations: 100,
          lowerBound: -5.12,
          upperBound: 5.12,
          trials: 1,
        },
  });

  useEffect(() => {
    if (previousTabRef.current !== activeTab && session.id === activeTab) {
      requestAnimationFrame(() => {
        if (isAlgorithmComparison(session.config)) {
          form.reset(session.config, {
            keepDefaultValues: false,
          });
        }
      });
      previousTabRef.current = activeTab;
    }
  }, [activeTab, session, form]);

  const watchBenchmarkFunction = form.watch("benchmarkFunction");

  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (name === "benchmarkFunction" && type === "change") {
        const benchmarkConfig =
          BENCHMARK_CONFIGS[value.benchmarkFunction as BenchmarkFunctions];

        if (benchmarkConfig) {
          form.setValue("lowerBound", benchmarkConfig.lowerBound);
          form.setValue("upperBound", benchmarkConfig.upperBound);
          form.setValue("dimensions", benchmarkConfig.dimensions);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [form]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (session.id === activeTab) {
        const values = form.getValues();
        updateSessionConfig(activeTab, values);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [
    form.watch("benchmarkFunction"),
    form.watch("selectedAlgorithms"),
    form.watch("populationSize"),
    form.watch("dimensions"),
    form.watch("iterations"),
    form.watch("lowerBound"),
    form.watch("upperBound"),
    form.watch("trials"),
    activeTab,
    session.id,
  ]);

  const hasProgress =
    session.multiTestProgress &&
    hasAlgorithmProgress(session.multiTestProgress) &&
    session.multiTestProgress.completedAlgorithms.length > 0;

  const canResume = !!(session.runId && session.status === "idle");

  const onSubmit = async (values: MultiTestFormValues, isResume = false) => {
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

    let algorithmsToRun: Algorithms[];
    let partialResults: ComparisionRow[] = [];

    if (!values.selectedAlgorithms || values.selectedAlgorithms.length < 2) {
      toast.error("At least two algorithms required", {
        description: "Comparison requires at least two algorithms",
      });

      setSessionStatus(activeTab, "idle", {
        endTime: Date.now(),
      });

      return;
    }

    if (
      isResume &&
      session.multiTestProgress &&
      hasAlgorithmProgress(session.multiTestProgress)
    ) {
      const progress = session.multiTestProgress;
      // Przypadek 1: Resume z multiTestProgress - mamy info które algorytmy się wykonały
      algorithmsToRun = values.selectedAlgorithms.filter(
        (algo) => !progress.completedAlgorithms.includes(algo)
      );
      partialResults = [...progress.partialResults];

      console.log("Resuming multi-test with progress:", {
        completed: progress.completedAlgorithms,
        remaining: algorithmsToRun,
        partialResults: partialResults.length,
      });

      if (algorithmsToRun.length === 0) {
        toast.error("All algorithms already completed", {
          description: "No algorithms left to process",
        });

        setSessionStatus(activeTab, "idle", {
          endTime: Date.now(),
        });

        return;
      }

      toast.info(
        `Resuming comparison - ${algorithmsToRun.length} algorithm${
          algorithmsToRun.length > 1 ? "s" : ""
        } remaining`,
        {
          description: `${session.multiTestProgress.completedAlgorithms.length} already completed`,
        }
      );
    } else if (isResume && session.runId && !session.multiTestProgress) {
      // Przypadek 2: Resume tylko z runId (po refresh) - backend ma checkpoint
      // Nie wiemy który algorytm był wykonywany, ale możemy spróbować wznowić PIERWSZY algorytm
      // Backend sprawdzi czy checkpoint istnieje i wznowi od odpowiedniej iteracji

      console.log(
        "Resuming multi-test after refresh - attempting to resume first algorithm"
      );

      algorithmsToRun = values.selectedAlgorithms;
      partialResults = [];

      updateSession(activeTab, {
        multiTestProgress: {
          mode: "algorithms",
          completedAlgorithms: [],
          partialResults: [],
          currentAlgorithm: undefined,
        },
      });

      toast.info("Resuming comparison from checkpoint", {
        description: "Starting with first algorithm",
      });
    } else {
      // Przypadek 3: Nowy test
      algorithmsToRun = values.selectedAlgorithms;

      updateSession(activeTab, {
        multiTestProgress: {
          mode: "algorithms",
          completedAlgorithms: [],
          partialResults: [],
          currentAlgorithm: undefined,
        },
      });
    }

    let hasError = false;

    for (const algo of algorithmsToRun) {
      try {
        const algoStartTime = Date.now();

        const currentSession = useTestStore
          .getState()
          .sessions.find((s) => s.id === activeTab);

        if (
          currentSession?.multiTestProgress &&
          hasAlgorithmProgress(currentSession.multiTestProgress)
        ) {
          updateSession(activeTab, {
            multiTestProgress: {
              mode: "algorithms",
              completedAlgorithms:
                currentSession.multiTestProgress.completedAlgorithms || [],
              partialResults:
                currentSession.multiTestProgress.partialResults || [],
              currentAlgorithm: algo,
            },
          });
        }

        const requestBody = {
          RunId: runId,
          Algorithm: algo,
          PopulationSize: values.populationSize,
          Dimensions: values.dimensions,
          Iterations: values.iterations,
          LowerBound: values.lowerBound,
          UpperBound: values.upperBound,
          Function: values.benchmarkFunction,
          Trials: values.trials,
          GenerateReport: false, // osobny endpoint
        };

        console.log(`Starting algorithm ${algo} with session RunId: ${runId}`);

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
            `Algorithm ${algo} paused. Progress saved (${partialResults.length}/${values.selectedAlgorithms.length} completed)`,
            {
              description: "You can resume from this tab",
            }
          );
          return;
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.Error || `API error for ${algo}`);
        }

        const data = await response.json();
        const algoDuration = (Date.now() - algoStartTime) / 1000;

        let result: ComparisionRow;

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
            algorithm: algo,
            duration: algoDuration,
            bestSolution: stats.bestSolution,
            bestFitness: stats.bestFitness,
            // pozniej do zmiany solution
            solution: stats.allTrials?.[0]?.bestSolution
              ? [stats.allTrials[0].bestSolution]
              : undefined,
            statistics: cleanedStats,
            historyJson: stats.allTrials?.[0]?.historyLogs,
          };
        } else {
          // Odpowiedź dla trials = 1
          result = {
            status: "success",
            algorithm: algo,
            duration: algoDuration,
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
          hasAlgorithmProgress(updatedSession.multiTestProgress)
        ) {
          updateSession(activeTab, {
            multiTestProgress: {
              mode: "algorithms",
              completedAlgorithms: [
                ...updatedSession.multiTestProgress.completedAlgorithms,
                algo,
              ],
              partialResults: [...partialResults],
              currentAlgorithm: undefined,
            },
          });
        }

        console.log(
          `Completed algorithm ${algo}, total results: ${partialResults.length}`
        );
      } catch (e) {
        console.error(`Error executing ${algo}:`, e);

        if (e instanceof Error && e.name === "AbortError") {
          console.log("Multi-test cancelled - progress saved");

          setSessionStatus(activeTab, "idle", {
            endTime: Date.now(),
          });

          toast.info(
            `Comparison cancelled. Progress saved (${partialResults.length}/${values.selectedAlgorithms.length} completed)`,
            {
              description: "You can resume from this tab",
            }
          );
          return;
        }

        hasError = true;

        partialResults.push({
          algorithm: algo,
          status: "failed",
          error: e instanceof Error ? e.message : "Connection failed",
          duration: 0,
        });

        toast.error(`Algorithm ${algo} failed`, {
          description: e instanceof Error ? e.message : "Unknown error",
        });
      }
    }

    //  GENEROWANIE RAPORTU
    console.log("🎯 All algorithms completed. Generating comparison report...");

    try {
      const reportEndpoint =
        values.trials > 1
          ? "http://localhost:5000/api/optimizer/compare-multitrial"
          : "http://localhost:5000/api/optimizer/compare";

      let reportRequestBody: any;

      if (values.trials > 1) {
        // Request body dla multitrial
        reportRequestBody = {
          functionName: values.benchmarkFunction,
          results: partialResults
            .filter((r) => r.status === "success" && r.statistics)
            .map((r) => ({
              algorithmName: r.algorithm,
              trialsCount: r.statistics!.totalTrials,
              bestFitness: r.statistics!.bestFitness,
              worstFitness: r.statistics!.worstFitness,
              meanFitness: r.statistics!.meanFitness,
              medianFitness: r.statistics!.medianFitness,
              stdDevFitness: r.statistics!.stdDevFitness,
              coeffOfVariationFitness: r.statistics!.coeffOfVariationFitness,
              bestSolution: r.statistics!.bestSolution,
            })),
        };
      } else {
        // Request body dla single trial
        reportRequestBody = {
          functionName: values.benchmarkFunction,
          results: partialResults
            .filter((r) => r.status === "success")
            .map((r) => ({
              algorithmName: r.algorithm,
              bestFitness: r.bestFitness,
              iterations: values.iterations,
              bestSolution: r.bestSolution,
            })),
        };
      }

      console.log(`Calling ${reportEndpoint} with:`, reportRequestBody);

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
        console.warn("Failed to generate report:", errorText);
        toast.warning("Comparison completed but report generation failed", {
          description: errorText,
        });
      }
    } catch (reportError) {
      console.error("Error generating report:", reportError);
      toast.warning("Comparison completed but report generation failed");
    }

    const algorithmsNames =
      values.selectedAlgorithms.length > 1
        ? values.selectedAlgorithms.join(", ")
        : values.selectedAlgorithms[0];

    setTestResult(activeTab, {
      type: "multi",
      benchmarkFunction: values.benchmarkFunction,
      results: partialResults,
      message: `Comparison of ${algorithmsNames} completed`,
    });

    setSessionStatus(activeTab, hasError ? "error" : "completed", {
      endTime: Date.now(),
      runId: undefined,
    });

    updateSession(activeTab, {
      multiTestProgress: undefined,
    });

    const totalDuration = partialResults.reduce(
      (sum, val) => (sum += val.duration),
      0
    );

    const isPlural = values.selectedAlgorithms.length > 1;

    if (!hasError) {
      toast.success(`Comparison completed successfully`, {
        description: `${values.selectedAlgorithms.length} algorithm${
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
      console.log(`Deleted checkpoint: ${session.runId}`);
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
            <BarChart3 className="text-purple-400" />
            Multi-Algorithm Comparison
          </span>
          {canResume && (
            <Badge
              variant="outline"
              className="bg-orange-950/50 text-orange-400 border-orange-900"
            >
              {hasProgress && hasAlgorithmProgress(session.multiTestProgress)
                ? `${session.multiTestProgress.completedAlgorithms.length}/${
                    values.selectedAlgorithms?.length || 0
                  } Completed`
                : "Checkpoint Available"}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Run multiple optimization algorithms on the same function to compare
          their performance.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => onSubmit(values, false))}
            className="space-y-6"
          >
            <FormField
              control={form.control}
              name="benchmarkFunction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-neutral-300">
                    Benchmark Function
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={canResume}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white">
                        <SelectValue placeholder="Select function" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-neutral-800 border-neutral-700">
                      {Object.values(BenchmarkFunctions).map((func) => (
                        <SelectItem key={func} value={func}>
                          {func}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* SEKCJA 2: Wybór Algorytmów (Multi-select) */}
            <FormField
              control={form.control}
              name="selectedAlgorithms"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-neutral-300">
                      Select Algorithms to Compare
                    </FormLabel>
                    <FormDescription>
                      Choose at least two algorithms for comparison.
                    </FormDescription>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.values(Algorithms).map((algo) => (
                      <FormField
                        key={algo}
                        control={form.control}
                        name="selectedAlgorithms"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={algo}
                              className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-neutral-700 p-4"
                            >
                              <FormControl>
                                <Checkbox
                                  disabled={canResume}
                                  checked={field.value?.includes(algo)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, algo])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== algo
                                          )
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal text-white cursor-pointer">
                                {algo} Optimizer
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

            <div className="border-t border-neutral-800 my-4" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <FormField
                control={form.control}
                name="dimensions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-neutral-300">
                      Dimensions
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
                    Number of independent runs per algorithm.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                    hasAlgorithmProgress(session.multiTestProgress) ? (
                      <>
                        Resume Comparison (
                        {(() => {
                          const currentValues = form.getValues();
                          return isAlgorithmComparison(currentValues)
                            ? (currentValues.selectedAlgorithms?.length || 0) -
                                (session.multiTestProgress.completedAlgorithms
                                  .length || 0)
                            : 0;
                        })()}{" "}
                        remaining)
                      </>
                    ) : (
                      "Resume Comparison"
                    )}
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
