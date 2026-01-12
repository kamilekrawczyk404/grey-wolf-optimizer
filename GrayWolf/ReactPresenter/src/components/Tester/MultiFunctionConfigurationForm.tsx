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
} from "@/stores/test-store";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useEffect, useRef } from "react";
import { BENCHMARK_CONFIGS } from "@/stores/benchmark-configs";
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
      ? session.config
      : {
          algorithm: Algorithms.GWO,
          selectedBenchmarkFunctions: [
            BenchmarkFunctions.Rastrigin,
            BenchmarkFunctions.Sphere,
          ],
          populationSize: 30,
          dimensions: 10,
          iterations: 100,
          lowerBound: -5.12,
          upperBound: 5.12,
        },
  });

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

  // Watch for algorithm changes
  const watchAlgorithm = form.watch("algorithm");

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
    form.watch("dimensions"),
    form.watch("iterations"),
    form.watch("lowerBound"),
    form.watch("upperBound"),
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

      if (
        !values.selectedBenchmarkFunctions ||
        values.selectedBenchmarkFunctions.length < 2
      ) {
        toast.error("Cannot resume - at least two functions required", {
          description: "Please select at least two benchmark functions",
        });

        setSessionStatus(activeTab, "idle", {
          endTime: Date.now(),
        });

        return;
      }

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

    if (!functionsToRun || functionsToRun.length < 2) {
      toast.error("At least two functions required", {
        description: "Comparison requires at least two benchmark functions",
      });

      setSessionStatus(activeTab, "idle", {
        endTime: Date.now(),
      });

      return;
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

        const benchmarkConfig = BENCHMARK_CONFIGS[func];

        const requestBody = {
          RunId: runId,
          Algorithm: values.algorithm,
          PopulationSize: values.populationSize,
          Dimensions: benchmarkConfig.dimensions,
          Iterations: values.iterations,
          LowerBound: benchmarkConfig.lowerBound,
          UpperBound: benchmarkConfig.upperBound,
          Function: func,
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

        const { historyJson, bestFitness, bestSolution, solution } =
          (await response.json()) as OptimizerDTO;

        const result: FunctionComparisonRow = {
          status: "success",
          duration: (Date.now() - funcStartTime) / 1000,
          benchmarkFunction: func,
          historyJson,
          bestSolution,
          bestFitness,
          solution,
        };

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
                           Particle Swarm Optimization</SelectItem>
                        <SelectItem value={Algorithms.BOA}>
                          Butterfly Optimization Algorithm
                        </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
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
