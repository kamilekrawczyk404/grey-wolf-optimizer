import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useEffect, useRef } from "react";
import {
  type TestSession,
  useTestStore,
  Algorithms,
  BenchmarkFunctions,
  SingleTestFormValues,
  SingleTestResult,
  singleTestFormSchema,
  MultiTrialResponse,
  TrialStatistics,
  getDefaultParametersForAlgorithm,
} from "@/stores/test-store";
import {
  BENCHMARK_CONFIGS,
  ALGORITHM_CONFIGS,
} from "@/stores/benchmark-configs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Activity, BarChart3, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { OptimizerDTO } from "@/types/types";
import { AlgorithmParametersPanel } from "./AlgorithmParametersPanel";

export interface TestConfigurationFormProps {
  session: TestSession;
}

export function TestConfigurationForm({ session }: TestConfigurationFormProps) {
  const {
    activeTab,
    updateSessionConfig,
    setSessionStatus,
    setTestResult,
    updateSession, // Dodane dla obsługi runId
  } = useTestStore();
  const previousTabRef = useRef<string>(activeTab);

  const form = useForm<SingleTestFormValues>({
    resolver: zodResolver(singleTestFormSchema),
    defaultValues: {
      ...session.config,
      trials: (session.config as SingleTestFormValues).trials ?? 1,
      parameters: (session.config as SingleTestFormValues).parameters ?? {},
    },
  });

  // Reset form when switching tabs
  useEffect(() => {
    if (previousTabRef.current !== activeTab && session.id === activeTab) {
      requestAnimationFrame(() => {
        form.reset(
          {
            ...session.config,
            parameters:
              (session.config as SingleTestFormValues).parameters ?? {},
          },
          {
            keepDefaultValues: false,
          }
        );
      });
      previousTabRef.current = activeTab;
    }
  }, [activeTab, session, form]);

  // Watch for benchmark function changes
  const watchBenchmarkFunction = form.watch("benchmarkFunction");
  const watchAlgorithm = form.watch("algorithm");

  // Automatyczne ustawianie domyślnych parametrów gdy zmienia się algorytm
  useEffect(() => {
    const algorithmConfig = ALGORITHM_CONFIGS[watchAlgorithm];

    if (algorithmConfig.parameters.length > 0) {
      const currentParams = form.getValues("parameters") || {};

      // Ustaw domyślne parametry tylko jeśli nie ma żadnych wartości dla tego algorytmu
      if (Object.keys(currentParams).length === 0) {
        const defaultParams = getDefaultParametersForAlgorithm(watchAlgorithm);
        form.setValue("parameters", defaultParams);
      }
    } else {
      // Jeśli algorytm nie ma parametrów, wyczyść
      form.setValue("parameters", {});
    }
  }, [watchAlgorithm, form]);

  // Auto-fill configuration when benchmark function changes
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

      if (name === "algorithm" && type === "change") {
        const algorithmConfig =
          ALGORITHM_CONFIGS[value.algorithm as Algorithms];

        if (algorithmConfig) {
          form.setValue("populationSize", algorithmConfig.populationSize);
          form.setValue("iterations", algorithmConfig.iterations);
        }
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
    form.watch("populationSize"),
    form.watch("dimensions"),
    form.watch("iterations"),
    form.watch("lowerBound"),
    form.watch("upperBound"),
    form.watch("benchmarkFunction"),
    form.watch("trials"),
    form.watch("parameters"),
    activeTab,
    session.id,
    updateSessionConfig,
  ]);

  // Sprawdź czy istnieje checkpoint (zapisany runId w stanie idle)
  const hasCheckpoint = !!(session.runId && session.status === "idle");

  console.log(hasCheckpoint);

  const onSubmit = async (values: SingleTestFormValues, isResume = false) => {
    const startTime = Date.now();

    try {
      // Generuj nowe ID lub użyj istniejącego przy wznawianiu
      const runId =
        isResume && session.runId ? session.runId : crypto.randomUUID();

      // Jeśli to nowy test, zapisz runId od razu w sesji (przed fetch)
      if (!isResume || !session.runId) {
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

      const requestBody = {
        RunId: runId, // Przekazujemy RunId do backendu
        Algorithm: values.algorithm,
        PopulationSize: values.populationSize,
        Dimensions: values.dimensions,
        Iterations: values.iterations,
        LowerBound: values.lowerBound,
        UpperBound: values.upperBound,
        Function: values.benchmarkFunction,
        Trials: values.trials,
        GenerateReport: true,
        Parameters: values.parameters || {},
      };

      const response = await fetch("http://localhost:5000/api/optimizer/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal,
      });

      // Obsługa Checkpointu (kod 499 z backendu)
      if (response.status === 499) {
        console.log(
          "Backend cancelled (499), checkpoint saved with RunId:",
          runId
        );
        setSessionStatus(activeTab, "idle", {
          endTime: Date.now(),
          // Nie czyścimy runId, bo chcemy pozwolić na Resume
        });
        toast.info("Test paused/cancelled. Progress saved.", {
          description: "You can resume calculations from this point.",
        });
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Request failed");
      }

      const data = await response.json();
      const duration = (Date.now() - startTime) / 1000;

      let result: SingleTestResult;

      if (data.statistics) {
        const stats = data.statistics as TrialStatistics;

        result = {
          type: "single",
          algorithm: values.algorithm,
          benchmarkFunction: values.benchmarkFunction,
          bestSolution: stats.bestSolution,
          bestFitness: stats.bestFitness,
          // dla solution jak go ni ma można dodać jakieś getSolutionByAlgo czy coś
          solution: stats.allTrials?.[0]?.bestSolution
            ? [stats.allTrials[0].bestSolution]
            : undefined,
          duration,
          historyJson: stats.allTrials?.[0]?.historyLogs,
          message: `Completed ${stats.totalTrials} trials (used ${stats.trialsUsedForStats} for statistics)`,
        };
      } else {
        // Odpowiedź dla trials = 1 (standardowa)
        result = {
          type: "single",
          algorithm: values.algorithm,
          benchmarkFunction: values.benchmarkFunction,
          bestSolution: data.bestSolution || [],
          bestFitness: data.bestFitness,
          solution: data.solution,
          duration,
          historyJson: data.historyJson,
          message: data.message || "Completed",
        };
      }

      setTestResult(activeTab, result);

      // Sukces - czyścimy runId (checkpoint nie jest już potrzebny)
      setSessionStatus(activeTab, "completed", {
        endTime: Date.now(),
        runId: undefined,
      });

      toast.success(
        isResume ? "Test resumed and finished!" : "Test completed successfully",
        {
          description: `${values.algorithm} finished in ${duration.toFixed(
            2
          )}s`,
        }
      );
    } catch (error) {
      // Obsługa ręcznego anulowania (AbortController)
      if (error instanceof Error && error.name === "AbortError") {
        const currentSession = useTestStore
          .getState()
          .sessions.find((s) => s.id === activeTab);

        // Jeśli anulowano, ale mamy runId, traktujemy to jako checkpoint
        if (currentSession?.runId) {
          toast.info("Test cancelled. You can resume it from this tab.");
        }
        return;
      }

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      setTestResult(activeTab, {
        type: "single",
        algorithm: values.algorithm,
        benchmarkFunction: values.benchmarkFunction,
        bestSolution: [],
        duration: (Date.now() - startTime) / 1000,
        error: errorMessage,
      });

      setSessionStatus(activeTab, "error", {
        endTime: Date.now(),
      });

      toast.error("Test execution failed", {
        description: errorMessage,
      });
    }
  };

  const handleNewTest = async () => {
    if (!session.runId) return;

    try {
      // Opcjonalnie: Poinformuj backend o usunięciu checkpointu
      await fetch(
        `http://localhost:5000/api/optimizer/checkpoint/${session.runId}`,
        {
          method: "DELETE",
        }
      );
    } catch (err) {
      console.error("Failed to delete old checkpoint:", err);
    }

    // Reset sesji
    updateSession(activeTab, { runId: undefined });
    setSessionStatus(activeTab, "idle", {
      endTime: undefined,
    });
  };

  // Only render form for active tab
  if (session.id !== activeTab) {
    return null;
  }

  return (
    <Card className="bg-neutral-900 border-neutral-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <span className={"inline-flex items-center gap-2"}>
            <Activity className="text-blue-400" /> Test Configuration
          </span>
          {hasCheckpoint && (
            <Badge
              variant="outline"
              className="bg-orange-950/50 text-orange-400 border-orange-900"
            >
              Checkpoint Available
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Run single algorithm on a specified benchmark function.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            // Domyślny submit to "Nowy test" (isResume = false), ale przyciski niżej to nadpisują
            onSubmit={form.handleSubmit((values) => onSubmit(values, false))}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="algorithm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-neutral-300">
                      Algorithm
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={hasCheckpoint} // Zablokuj edycję jeśli jest checkpoint
                    >
                      <FormControl>
                        <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white focus:border-blue-500">
                          <SelectValue />
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
                      disabled={hasCheckpoint}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white focus:border-blue-500">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-neutral-800 border-neutral-700">
                        <SelectItem value={BenchmarkFunctions.Rastrigin}>
                          Rastrigin
                        </SelectItem>
                        <SelectItem value={BenchmarkFunctions.Sphere}>
                          Sphere
                        </SelectItem>
                        <SelectItem value={BenchmarkFunctions.Beale}>
                          Beale
                        </SelectItem>
                        <SelectItem value={BenchmarkFunctions.RosenBrock}>
                          Rosenbrock
                        </SelectItem>
                        <SelectItem value={BenchmarkFunctions.BukinN6}>
                          Bukin N.6
                        </SelectItem>
                        <SelectItem value={BenchmarkFunctions.Transformer}>
                          Transformer (12-pulse)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                        className="bg-neutral-800 border-neutral-700 text-white focus:border-blue-500"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        disabled={hasCheckpoint}
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
                        className="bg-neutral-800 border-neutral-700 text-white focus:border-blue-500"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        disabled={hasCheckpoint}
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
                        className="bg-neutral-800 border-neutral-700 text-white focus:border-blue-500"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        disabled={hasCheckpoint}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                        className="bg-neutral-800 border-neutral-700 text-white focus:border-blue-500"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        disabled={hasCheckpoint}
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
                <FormField
                  control={form.control}
                  name="lowerBound"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel className="text-neutral-300">
                        Lower Bound
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          className="bg-neutral-800 border-neutral-700 text-white focus:border-blue-500"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                          disabled={hasCheckpoint}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="upperBound"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel className="text-neutral-300">
                        Upper Bound
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          className="bg-neutral-800 border-neutral-700 text-white focus:border-blue-500"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                          disabled={hasCheckpoint}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <AlgorithmParametersPanel
              parameters={ALGORITHM_CONFIGS[watchAlgorithm].parameters}
              values={form.watch("parameters") || {}}
              onChange={(newParams) => form.setValue("parameters", newParams)}
              disabled={hasCheckpoint}
            />

            {/* Warunkowe renderowanie przycisków */}
            <div className="flex gap-2 mt-4">
              {hasCheckpoint ? (
                <>
                  <Button
                    type="button"
                    onClick={form.handleSubmit((values) =>
                      onSubmit(values, true)
                    )}
                    className="flex-1 bg-orange-600 hover:bg-orange-500 text-white"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Resume Test
                  </Button>
                  <Button
                    type="button"
                    onClick={handleNewTest}
                    variant="outline"
                    className="flex-1 bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-neutral-300"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    New Test (Discard Checkpoint)
                  </Button>
                </>
              ) : (
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Run Test
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
