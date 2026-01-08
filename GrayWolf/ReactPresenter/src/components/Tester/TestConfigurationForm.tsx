import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect, useRef } from "react";
import {
  type TestSession,
  type TestFormValues,
  type TestResult,
  useTestStore,
  testFormSchema,
  Algorithms,
  BenchmarkFunctions,
} from "@/stores/test-store";
import {
  BENCHMARK_CONFIGS,
  ALGORITHM_CONFIGS,
} from "@/stores/benchmark-configs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
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
import { Input } from "@/components/ui/input";
import { Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export interface TestConfigurationFormProps {
  session: TestSession;
}

export function TestConfigurationForm({ session }: TestConfigurationFormProps) {
  const {
    activeTab,
    updateSessionConfig,
    setSessionStatus,
    setTestResult,
    updateSession,
  } = useTestStore();
  const previousTabRef = useRef<string>(activeTab);

  const form = useForm<TestFormValues>({
    resolver: zodResolver(testFormSchema),
    defaultValues: session.config,
  });

  // Reset form when switching tabs
  useEffect(() => {
    if (previousTabRef.current !== activeTab && session.id === activeTab) {
      requestAnimationFrame(() => {
        form.reset(session.config, {
          keepDefaultValues: false,
        });
      });
      previousTabRef.current = activeTab;
    }
  }, [activeTab, session, form]);

  // Watch for benchmark function changes
  const watchBenchmarkFunction = form.watch("benchmarkFunction");
  const watchAlgorithm = form.watch("algorithm");

  // Auto-fill configuration when benchmark function changes
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (name === "benchmarkFunction" && type === "change") {
        const benchmarkConfig =
          BENCHMARK_CONFIGS[value.benchmarkFunction as BenchmarkFunctions];

        if (benchmarkConfig) {
          // Aktualizuj tylko pola zwi�zane z benchmark function
          form.setValue("lowerBound", benchmarkConfig.lowerBound);
          form.setValue("upperBound", benchmarkConfig.upperBound);
          form.setValue("dimensions", benchmarkConfig.dimensions);
        }
      }

      if (name === "algorithm" && type === "change") {
        const algorithmConfig =
          ALGORITHM_CONFIGS[value.algorithm as Algorithms];

        if (algorithmConfig) {
          // Aktualizuj tylko pola zwi�zane z algorytmem
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
    activeTab,
    session.id,
    updateSessionConfig,
  ]);

  const hasCheckpoint = !!(session.runId && session.status === "idle");

  const onSubmit = async (values: TestFormValues, isResume = false) => {
    const startTime = Date.now();

    try {
      const runId =
        isResume && session.runId ? session.runId : crypto.randomUUID();

      if (!isResume || !session.runId) {
        console.log("Saving new RunId before fetch:", runId);
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
        RunId: runId,
        Algorithm: values.algorithm,
        PopulationSize: values.populationSize,
        Dimensions: values.dimensions,
        Iterations: values.iterations,
        LowerBound: values.lowerBound,
        UpperBound: values.upperBound,
        Function: values.benchmarkFunction,
      };

      console.log(
        isResume ? "Resuming with RunId:" : "Starting new test with RunId:",
        runId
      );

      const response = await fetch("http://localhost:5000/api/optimizer/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal,
      });

      console.log("Response status:", response.status);

      let data;
      try {
        data = await response.json();
        console.log("Response data:", data);
      } catch (jsonError) {
        console.error("Failed to parse response:", jsonError);
        throw jsonError;
      }

      if (response.status === 499) {
        console.log(
          "Backend cancelled (499), checkpoint saved with RunId:",
          runId
        );
        setSessionStatus(activeTab, "idle", {
          endTime: Date.now(),
        });
        toast.info("Test cancelled. You can resume it from this tab.");
        return;
      }

      if (!response.ok) {
        throw new Error(data.Error || "Request failed");
      }

      const duration = (Date.now() - startTime) / 1000;

      const result: TestResult = {
        algorithm: values.algorithm,
        benchmarkFunction: values.benchmarkFunction,
        bestSolution: data.bestSolution || [],
        duration,
        historyJson: JSON.stringify(data.historyJson || []),
        message: data.message || "Completed",
      };

      setTestResult(activeTab, result);
      setSessionStatus(activeTab, "completed", {
        endTime: Date.now(),
        runId: undefined,
      });

      toast.success(
        isResume
          ? "Test resumed and completed!"
          : "Test completed successfully!",
        {
          description: `${values.algorithm} finished in ${duration.toFixed(
            2
          )}s`,
        }
      );
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log("AbortError caught");

        const currentSession = useTestStore
          .getState()
          .sessions.find((s) => s.id === activeTab);

        if (currentSession?.runId) {
          console.log("✅ RunId was saved before abort:", currentSession.runId);
          toast.info("Test cancelled. You can resume it from this tab.");
        } else {
          console.error(
            "This shouldn't happen - RunId should always be saved!"
          );
        }

        return;
      }

      setSessionStatus(activeTab, "error", {
        endTime: Date.now(),
      });

      toast.error("Test failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleNewTest = async () => {
    if (!session.runId) return;

    console.log("New test clicked - clearing checkpoint:", session.runId);

    try {
      await fetch(
        `http://localhost:5000/api/optimizer/checkpoint/${session.runId}`,
        { method: "DELETE" }
      );
      console.log("Old checkpoint deleted successfully");
    } catch (err) {
      console.error("Failed to delete old checkpoint:", err);
    }

    // Wyczyść runId i wróć do stanu "idle"
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
          <span>Test Configuration</span>
          {hasCheckpoint && (
            <Badge variant="outline" className="bg-orange-900 text-orange-200">
              Checkpoint Available
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
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
                      disabled={hasCheckpoint}
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

            {/* Przyciski Run/Resume */}
            <div className="flex gap-2 mt-4">
              {session.runId && session.status === "idle" ? (
                <>
                  <Button
                    type="button"
                    onClick={() =>
                      form.handleSubmit((values) => onSubmit(values, true))()
                    }
                    className="flex-1 bg-orange-600 hover:bg-orange-500 text-white"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Resume Test
                  </Button>
                  <Button
                    type="button"
                    onClick={handleNewTest}
                    variant="outline"
                    className="flex-1 bg-neutral-800 border-blue-600/50 hover:bg-blue-950/50 hover:border-blue-500 hover:text-blue-300 transition-colors"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    New Test
                  </Button>
                </>
              ) : (
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500"
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
