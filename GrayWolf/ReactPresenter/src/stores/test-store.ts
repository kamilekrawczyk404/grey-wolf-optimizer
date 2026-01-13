import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { z } from "zod";
import { BENCHMARK_CONFIGS, ALGORITHM_CONFIGS } from "./benchmark-configs";
import {
  Algorithms,
  BenchmarkFunctions,
  ExperimentRecord,
  IterationSnapshot,
  AlgorithmParameters,
  AlgorithmParameterInfo,
} from "../types/types";

export type SessionStatus =
  | "idle"
  | "running"
  | "completed"
  | "error"
  | "cancelled";
export { Algorithms, BenchmarkFunctions };

export type MultiTestMode = "algorithms" | "functions";

export interface TrialStatistics {
  bestFitness: number;
  worstFitness: number;
  bestSolution: number[];
  worstSolution: number[];
  meanFitness: number;
  medianFitness: number;
  stdDevFitness: number;
  coeffOfVariationFitness: number;
  meanSolution: number[];
  stdDevSolution: number[];
  coeffOfVariationSolution: number[];
  totalTrials: number;
  trialsUsedForStats: number;
  allFitnessValues: number[];
  allTrials: {
    trialNumber: number;
    bestSolution: number[];
    bestFitness: number;
    evaluationsCount: number;
    historyLogs: IterationSnapshot[];
  }[];
}

export interface MultiTrialResponse {
  runId: string;
  algorithmName: string;
  functionName: string;
  statistics: TrialStatistics;
}

export interface FunctionConfig {
  function: BenchmarkFunctions;
  dimensions: number;
  lowerBound: number;
  upperBound: number;
}

// Schema Zod
export const singleTestFormSchema = z
  .object({
    algorithm: z.nativeEnum(Algorithms),
    populationSize: z.number().min(10).max(1000),
    dimensions: z.number().min(1).max(100),
    iterations: z.number().min(10).max(10000),
    lowerBound: z.number(),
    upperBound: z.number(),
    benchmarkFunction: z.nativeEnum(BenchmarkFunctions),
    selectedAlgorithms: z.array(z.nativeEnum(Algorithms)).optional(),
    trials: z.number().min(1).max(100),
    parameters: z.record(z.string(), z.number()).optional(),
  })
  .refine((data) => data.upperBound > data.lowerBound, {
    message: "Upper bound must be greater than lower bound",
    path: ["upperBound"],
  });

export const multiTestFormSchema = z.object({
  algorithm: z.nativeEnum(Algorithms).optional(),
  benchmarkFunction: z.nativeEnum(BenchmarkFunctions),
  selectedAlgorithms: z
    .array(z.nativeEnum(Algorithms))
    .refine((value) => value.length > 1, {
      message: "You must select at least two algorithms to compare",
    }),
  populationSize: z.number().min(10).max(1000),
  dimensions: z.number().min(2).max(100),
  iterations: z.number().min(10).max(10000),
  lowerBound: z.number(),
  upperBound: z.number(),
  trials: z.number().min(1).max(100),
  parameters: z.record(z.string(), z.number()).optional(),
});

export const functionComparisonSchema = z.object({
  algorithm: z.nativeEnum(Algorithms),
  selectedBenchmarkFunctions: z
    .array(z.nativeEnum(BenchmarkFunctions))
    .refine((value) => value.length > 1, {
      message: "You must select at least two benchmark functions to compare",
    }),
  populationSize: z.number().min(10).max(1000),
  iterations: z.number().min(10).max(10000),
  trials: z.number().min(1).max(100),
  functionConfigs: z.array(
    z.object({
      function: z.nativeEnum(BenchmarkFunctions),
      dimensions: z.number().min(2).max(100),
      lowerBound: z.number(),
      upperBound: z.number(),
    })
  ),
  parameters: z.record(z.string(), z.number()).optional(),
});

export type SingleTestFormValues = z.infer<typeof singleTestFormSchema>;
export type MultiTestFormValues = z.infer<typeof multiTestFormSchema>;
export type FunctionComparisonFormValues = z.infer<
  typeof functionComparisonSchema
>;

export type TestMode = "single" | "multi";

export interface SingleTestResult {
  type: "single";
  algorithm: Algorithms;
  benchmarkFunction: BenchmarkFunctions;
  duration: number;
  bestSolution?: number[];
  bestFitness?: number;
  solution?: number[][];
  historyJson?: IterationSnapshot[];
  message?: string;
  error?: string;
}

export interface ComparisionRow {
  algorithm: Algorithms;
  duration: number;
  status: "success" | "failed";
  bestSolution?: number[];
  bestFitness?: number;
  solution?: number[][];
  error?: string;
  historyJson?: IterationSnapshot[];
  statistics?: TrialStatistics;
}

export interface FunctionComparisonRow {
  benchmarkFunction: BenchmarkFunctions;
  duration: number;
  status: "success" | "failed";
  bestSolution?: number[];
  bestFitness?: number;
  solution?: number[][];
  error?: string;
  historyJson?: IterationSnapshot[];
  statistics?: TrialStatistics;
}

export interface MultiTestResult {
  type: "multi";
  benchmarkFunction: BenchmarkFunctions;
  results: ComparisionRow[];
  message?: string;
}

export interface FunctionComparisonResult {
  type: "function-comparison";
  algorithm: Algorithms;
  results: FunctionComparisonRow[];
  message?: string;
}

export type TestFormValues =
  | SingleTestFormValues
  | MultiTestFormValues
  | FunctionComparisonFormValues;

export type TestResult =
  | SingleTestResult
  | MultiTestResult
  | FunctionComparisonResult;

export interface TestSession {
  id: string;
  mode: TestMode;
  multiTestMode?: MultiTestMode;
  name: string;
  config: TestFormValues;
  status: SessionStatus;
  result: TestResult | null;
  presenterData: ExperimentRecord[];
  startTime?: number;
  endTime?: number;
  resultsSeen: boolean;
  abortController?: AbortController;
  runId?: string;

  multiTestProgress?:
    | {
        mode: "algorithms";
        completedAlgorithms: Algorithms[];
        currentAlgorithm?: Algorithms;
        partialResults: ComparisionRow[];
      }
    | {
        mode: "functions";
        completedFunctions: BenchmarkFunctions[];
        currentFunction?: BenchmarkFunctions;
        partialResults: FunctionComparisonRow[];
      };
}

export interface TestStore {
  sessions: TestSession[];
  activeTab: string;
  getActiveSession: () => TestSession | null;
  getPresenterData: (id: string) => ExperimentRecord[] | null;
  addSession: (mode: TestMode) => void;
  removeSession: (id: string) => void;
  updateSession: (id: string, updates: Partial<TestSession>) => void;
  setActiveTab: (id: string) => void;
  updateSessionConfig: (id: string, config: TestFormValues) => void;
  setSessionStatus: (
    id: string,
    status: SessionStatus,
    updates?: Partial<TestSession>
  ) => void;
  cancelSession: (id: string) => void;
  setMultiTestMode: (sessionId: string, mode: MultiTestMode) => void;
  setTestResult: (id: string, result: TestResult) => void;
  markResultsSeen: (id: string) => void;
  hydrate: () => void;
  syncCheckpoints: () => Promise<void>;
}

export function isAlgorithmComparison(
  config: TestFormValues
): config is MultiTestFormValues {
  return (
    "selectedAlgorithms" in config && config.selectedAlgorithms !== undefined
  );
}

export function isFunctionComparison(
  config: TestFormValues
): config is FunctionComparisonFormValues {
  return (
    "selectedBenchmarkFunctions" in config &&
    config.selectedBenchmarkFunctions !== undefined
  );
}

export function hasAlgorithmProgress(
  progress: TestSession["multiTestProgress"]
): progress is {
  mode: "algorithms";
  completedAlgorithms: Algorithms[];
  currentAlgorithm?: Algorithms;
  partialResults: ComparisionRow[];
} {
  return progress?.mode === "algorithms";
}

export function hasFunctionProgress(
  progress: TestSession["multiTestProgress"]
): progress is {
  mode: "functions";
  completedFunctions: BenchmarkFunctions[];
  currentFunction?: BenchmarkFunctions;
  partialResults: FunctionComparisonRow[];
} {
  return progress?.mode === "functions";
}

export function getDefaultParametersForAlgorithm(
  algorithm: Algorithms
): AlgorithmParameters {
  const config = ALGORITHM_CONFIGS[algorithm];
  const defaults: AlgorithmParameters = {};

  config.parameters.forEach((param: AlgorithmParameterInfo) => {
    defaults[param.name] = param.defaultValue;
  });

  return defaults;
}

function getDefaultConfig(
  mode: "single" | "multi",
  multiTestMode: MultiTestMode = "algorithms"
): TestFormValues {
  // Domyślna konfiguracja dla GWO + Rastrigin
  const defaultAlgorithm = Algorithms.GWO;
  const defaultBenchmark = BenchmarkFunctions.Rastrigin;
  const defaultCompare = [Algorithms.GWO, Algorithms.Aquila];
  const defaultFunctions = [
    BenchmarkFunctions.Rastrigin,
    BenchmarkFunctions.Sphere,
  ];

  const algorithmConfig = ALGORITHM_CONFIGS[defaultAlgorithm];
  const benchmarkConfig = BENCHMARK_CONFIGS[defaultBenchmark];

  switch (mode) {
    case "single":
      return {
        algorithm: defaultAlgorithm,
        populationSize: algorithmConfig.populationSize,
        dimensions: benchmarkConfig.dimensions,
        iterations: algorithmConfig.iterations,
        lowerBound: benchmarkConfig.lowerBound,
        upperBound: benchmarkConfig.upperBound,
        benchmarkFunction: defaultBenchmark,
        trials: 1,
      };

    case "multi":
      if (multiTestMode === "functions") {
        return {
          algorithm: defaultAlgorithm,
          selectedBenchmarkFunctions: defaultFunctions,
          populationSize: algorithmConfig.populationSize,
          iterations: algorithmConfig.iterations,
          trials: 1,
          functionConfigs: defaultFunctions.map((func) => {
            const config = BENCHMARK_CONFIGS[func];
            return {
              function: func,
              dimensions: config.dimensions,
              lowerBound: config.lowerBound,
              upperBound: config.upperBound,
            };
          }),
        };
      }

      // Domyślnie algorithms
      return {
        selectedAlgorithms: defaultCompare,
        benchmarkFunction: defaultBenchmark,
        populationSize: algorithmConfig.populationSize,
        dimensions: benchmarkConfig.dimensions,
        iterations: algorithmConfig.iterations,
        lowerBound: benchmarkConfig.lowerBound,
        upperBound: benchmarkConfig.upperBound,
        trials: 1,
      };
  }
}

// Funkcja pomocnicza do aktualizacji konfiguracji przy zmianie funkcji/algorytmu
export function getConfigForBenchmarkAndAlgorithm(
  algorithm: Algorithms,
  benchmark: BenchmarkFunctions,
  currentConfig: TestFormValues
): TestFormValues {
  const algorithmConfig = ALGORITHM_CONFIGS[algorithm];
  const benchmarkConfig = BENCHMARK_CONFIGS[benchmark];

  return {
    ...currentConfig,
    algorithm,
    benchmarkFunction: benchmark,
    populationSize: algorithmConfig.populationSize,
    iterations: algorithmConfig.iterations,
    lowerBound: benchmarkConfig.lowerBound,
    upperBound: benchmarkConfig.upperBound,
    dimensions: benchmarkConfig.dimensions,
  };
}

export const useTestStore = create<TestStore>()(
  persist(
    (set, get) => ({
      sessions: [
        {
          id: crypto.randomUUID(),
          mode: "single",
          name: "Single Test 1",
          config: getDefaultConfig("single"),
          status: "idle",
          result: null,
          resultsSeen: true,
          presenterData: [],
        },
        {
          id: crypto.randomUUID(),
          mode: "multi",
          multiTestMode: "algorithms",
          name: "Comparison 1",
          config: getDefaultConfig("multi", "algorithms"),
          status: "idle",
          result: null,
          resultsSeen: true,
          presenterData: [],
        },
      ],

      getActiveSession: () => {
        const { sessions, activeTab } = get();

        const foundSession = sessions.find((s) => s.id === activeTab);

        if (!foundSession) return null;

        return foundSession;
      },

      getPresenterData: (id: string) => {
        const session = get().sessions.find((s) => s.id === id);

        if (!session) return null;

        return session.presenterData;
      },

      activeTab: "",

      hydrate: () => {
        const sessions = get().sessions;

        if (!get().activeTab && sessions.length > 0) {
          set({ activeTab: sessions[0].id });
        }
      },

      addSession: (mode: TestMode = "single") => {
        const newSession: TestSession = {
          id: crypto.randomUUID(),
          mode,
          multiTestMode: mode === "multi" ? "algorithms" : undefined,
          name:
            mode === "single"
              ? `Single Test ${
                  get().sessions.filter((s) => s.mode === "single").length + 1
                }`
              : `Comparision ${
                  get().sessions.filter((s) => s.mode === "multi").length + 1
                }`,
          config: getDefaultConfig(
            mode,
            mode === "multi" ? "algorithms" : undefined
          ),
          status: "idle",
          result: null,
          resultsSeen: true,
          presenterData: [],
        };

        set((state) => ({
          sessions: [...state.sessions, newSession],
          activeTab: newSession.id,
        }));
      },

      removeSession: (id: string) => {
        const sessions = get().sessions;
        if (sessions.length === 1) {
          console.warn("Cannot remove last session");
          return;
        }

        const filtered = sessions.filter((s) => s.id !== id);
        const wasActive = get().activeTab === id;

        set({
          sessions: filtered,
          activeTab: wasActive ? filtered[0].id : get().activeTab,
        });
      },

      updateSession: (id: string, updates: Partial<TestSession>) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        }));
      },

      setActiveTab: (id: string) => set({ activeTab: id }),

      updateSessionConfig: (id: string, config: TestFormValues) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? { ...s, config } : s
          ),
        }));
      },

      setSessionStatus: (
        id: string,
        status: SessionStatus,
        updates: Partial<TestSession> = {}
      ) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id
              ? {
                  ...s,
                  status,
                  ...updates,
                  abortController:
                    status === "running" ? new AbortController() : undefined,
                }
              : s
          ),
        }));
      },

      cancelSession: (id: string) => {
        const session = get().sessions.find((s) => s.id === id);
        session?.abortController?.abort();

        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id
              ? {
                  ...s,
                  status: "idle" as SessionStatus,
                  endTime: Date.now(),
                  abortController: undefined,
                }
              : s
          ),
        }));
      },

      setMultiTestMode: (sessionId: string, mode: MultiTestMode) =>
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId) return s;

            const newConfig = getDefaultConfig("multi", mode);

            return {
              ...s,
              multiTestMode: mode,
              config: newConfig,
              // Resetuj progress jeśli zmieniamy tryb
              multiTestProgress: undefined,
              runId: undefined,
              status: "idle" as SessionStatus,
            };
          }),
        })),

      setTestResult: (id: string, result: TestResult) => {
        const session = get().sessions.find((s) => s.id === id);
        if (!session) return;

        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== id) return s;

            let dimensions: number;
            let lowerBound: number;
            let upperBound: number;
            const { populationSize, iterations } = s.config;
            const parameters =
              "parameters" in s.config ? s.config.parameters || {} : {};

            // Dla single test i algorithm comparison
            if ("dimensions" in s.config) {
              dimensions = s.config.dimensions;
              lowerBound = s.config.lowerBound;
              upperBound = s.config.upperBound;
            } else {
              // Dla function comparison - użyj pierwszej funkcji jako domyślnej
              // (w zasadzie nie używamy tych wartości dla function-comparison)
              const firstConfig = (s.config as FunctionComparisonFormValues)
                .functionConfigs?.[0];
              dimensions = firstConfig?.dimensions ?? 10;
              lowerBound = firstConfig?.lowerBound ?? -5;
              upperBound = firstConfig?.upperBound ?? 5;
            }

            switch (s.mode) {
              case "single": {
                if (result.type !== "single") return s;

                const {
                  solution,
                  bestSolution,
                  algorithm,
                  bestFitness,
                  benchmarkFunction,
                  historyJson,
                } = result;

                if (
                  solution === undefined ||
                  bestSolution === undefined ||
                  bestFitness === undefined ||
                  historyJson === undefined
                ) {
                  return { ...s, status: "error" };
                }

                const preparedData = {
                  description: s.name,
                  properties: {
                    algorithm,
                    benchmarkFunction,
                    iterations,
                    bestSolution,
                    bestFitness,
                    dimensions,
                    populationSize,
                    lowerBound,
                    upperBound,
                    history: historyJson,
                    solution,
                    parameters,
                  },
                };

                return {
                  ...s,
                  status: "completed",
                  result: { ...result, historyJson: undefined },
                  presenterData: [preparedData],
                };
              }

              case "multi": {
                if (result.type === "function-comparison") {
                  const presenterRecords: ExperimentRecord[] = [];

                  const algorithm = result.algorithm;
                  const functionConfigs =
                    (s.config as FunctionComparisonFormValues)
                      .functionConfigs || [];

                  const processedResults = result.results.map((row) => {
                    if (
                      row.status === "success" &&
                      row.historyJson &&
                      row.bestFitness !== undefined &&
                      row.bestSolution &&
                      row.solution
                    ) {
                      const funcConfig = functionConfigs.find(
                        (c) => c.function === row.benchmarkFunction
                      );

                      const funcDimensions =
                        funcConfig?.dimensions ?? dimensions;
                      const funcLowerBound =
                        funcConfig?.lowerBound ?? lowerBound;
                      const funcUpperBound =
                        funcConfig?.upperBound ?? upperBound;

                      presenterRecords.push({
                        description: `${row.benchmarkFunction}`,
                        properties: {
                          algorithm,
                          benchmarkFunction: row.benchmarkFunction,
                          iterations,
                          bestSolution: row.bestSolution,
                          bestFitness: row.bestFitness,
                          dimensions: funcDimensions,
                          populationSize,
                          lowerBound: funcLowerBound,
                          upperBound: funcUpperBound,
                          history: row.historyJson,
                          solution: row.solution,
                          // parameters: parameters,
                        },
                      });
                    }

                    return {
                      ...row,
                      historyJson: undefined,
                    };
                  });

                  return {
                    ...s,
                    status: "completed",
                    result: {
                      ...result,
                      results: processedResults,
                    },
                    presenterData: presenterRecords,
                  };
                }

                if (result.type !== "multi") return s;

                const presenterRecords: ExperimentRecord[] = [];

                const benchmarkFunction = result.benchmarkFunction;

                const processedResults = result.results.map((row) => {
                  if (
                    row.status === "success" &&
                    row.historyJson &&
                    row.bestFitness !== undefined &&
                    row.bestSolution &&
                    row.solution
                  ) {
                    presenterRecords.push({
                      description: `${row.algorithm}`,
                      properties: {
                        algorithm: row.algorithm,
                        benchmarkFunction,
                        iterations,
                        bestSolution: row.bestSolution,
                        bestFitness: row.bestFitness,
                        dimensions,
                        populationSize,
                        lowerBound,
                        upperBound,
                        history: row.historyJson,
                        solution: row.solution,
                        // parameters,
                      },
                    });
                  }

                  return {
                    ...row,
                    historyJson: undefined,
                  };
                });

                return {
                  ...s,
                  status: "completed",
                  result: {
                    ...result,
                    results: processedResults,
                  },
                  presenterData: presenterRecords,
                };
              }

              default:
                return {
                  ...s,
                  status: "completed",
                  result,
                };
            }
          }),
        }));
      },

      markResultsSeen: (id: string) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? { ...s, resultsSeen: true } : s
          ),
        }));
      },

      syncCheckpoints: async () => {
        try {
          console.log("Syncing checkpoints with backend...");

          const response = await fetch(
            "http://localhost:5000/api/optimizer/checkpoints"
          );

          if (!response.ok) {
            console.error("Failed to fetch checkpoints from backend");
            return;
          }

          const checkpoints = await response.json();
          console.log("Available checkpoints from backend:", checkpoints);

          set((state) => ({
            sessions: state.sessions.map((session) => {
              // Jeśli sesja nie ma runId, pomiń
              if (!session.runId) return session;

              // Sprawdź czy checkpoint nadal istnieje w backendzie
              const checkpointExists = checkpoints.some(
                (cp: any) => cp.runId === session.runId
              );

              if (!checkpointExists) {
                // Checkpoint został usunięty - wyczyść runId
                console.log(
                  `Checkpoint ${session.runId} no longer exists - clearing from session ${session.id}`
                );
                return {
                  ...session,
                  runId: undefined,
                  status: "idle" as SessionStatus,
                  multiTestProgress: undefined,
                };
              }

              if (
                session.status === "running" ||
                session.status === "error" ||
                session.status === "cancelled"
              ) {
                console.log(
                  `Session ${session.id} was ${session.status} but checkpoint exists - setting to idle with runId ${session.runId}`
                );

                let restoredMultiTestProgress = session.multiTestProgress;

                if (session.mode === "multi" && !session.multiTestProgress) {
                  console.log(
                    `Multi-test session ${session.id} missing multiTestProgress - creating empty one`
                  );

                  if (isAlgorithmComparison(session.config)) {
                    restoredMultiTestProgress = {
                      mode: "algorithms",
                      completedAlgorithms: [],
                      partialResults: [],
                      currentAlgorithm: undefined,
                    };
                  } else if (isFunctionComparison(session.config)) {
                    restoredMultiTestProgress = {
                      mode: "functions",
                      completedFunctions: [],
                      partialResults: [],
                      currentFunction: undefined,
                    };
                  }
                }

                return {
                  ...session,
                  status: "idle" as SessionStatus,
                  abortController: undefined,
                  multiTestProgress: restoredMultiTestProgress,
                  // runId zostaje!
                };
              }

              return session;
            }),
          }));

          console.log("Checkpoints synced successfully");
        } catch (error) {
          console.error("Failed to sync checkpoints:", error);
        }
      },
    }),

    {
      name: "optimizer-test-sessions",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sessions: state.sessions.map((s) => {
          let formattedResult;

          if (s.mode === "single") {
            formattedResult = (s.result as SingleTestResult)
              ? {
                  ...s.result,
                  historyJson: undefined,
                }
              : null;
          } else if (s.mode === "multi") {
            formattedResult = (s.result as MultiTestResult)
              ? {
                  ...s.result,
                  results: (s.result as MultiTestResult).results.map((r) => ({
                    ...r,
                    historyJson: undefined,
                  })),
                }
              : null;
          }

          return {
            ...s,
            status:
              s.status === "running"
                ? s.runId || s.multiTestProgress
                  ? "idle"
                  : s.status
                : s.status,
            abortController: undefined,
            runId: s.runId,
            result: formattedResult,
            presenterData: [],
            multiTestProgress: s.multiTestProgress
              ? {
                  ...s.multiTestProgress,
                  partialResults: s.multiTestProgress.partialResults.map(
                    (r) => ({
                      ...r,
                      historyJson: undefined,
                    })
                  ),
                }
              : undefined,
          };
        }),
        activeTab: state.activeTab,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hydrate();
          state.syncCheckpoints();
        }
      },
    }
  )
);
