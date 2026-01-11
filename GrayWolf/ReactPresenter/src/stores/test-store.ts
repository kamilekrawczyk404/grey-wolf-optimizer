import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { z } from "zod";
import { BENCHMARK_CONFIGS, ALGORITHM_CONFIGS } from "./benchmark-configs";
import {
  Algorithms,
  BenchmarkFunctions,
  ExperimentRecord,
  IterationSnapshot,
} from "../types/types";

export type SessionStatus =
  | "idle"
  | "running"
  | "completed"
  | "error"
  | "cancelled";
export { Algorithms, BenchmarkFunctions };

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
});

export type SingleTestFormValues = z.infer<typeof singleTestFormSchema>;
export type MultiTestFormValues = z.infer<typeof multiTestFormSchema>;

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
}

export interface MultiTestResult {
  type: "multi";
  benchmarkFunction: BenchmarkFunctions;
  results: ComparisionRow[];
  message?: string;
}

export type TestFormValues = SingleTestFormValues | MultiTestFormValues;

export type TestResult = SingleTestResult | MultiTestResult;

export interface TestSession {
  id: string;
  mode: TestMode;
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

  multiTestProgress?: {
    completedAlgorithms: Algorithms[]; // Lista już wykonanych algorytmów
    currentAlgorithm?: Algorithms; // Aktualnie wykonywany algorytm
    partialResults: ComparisionRow[]; // Częściowe wyniki
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
  setTestResult: (id: string, result: TestResult) => void;
  markResultsSeen: (id: string) => void;
  hydrate: () => void;
  syncCheckpoints: () => Promise<void>;
}

function getDefaultConfig(mode: "single" | "multi"): TestFormValues {
  // Domyślna konfiguracja dla GWO + Rastrigin
  const defaultAlgorithm = Algorithms.GWO;
  const defaultBenchmark = BenchmarkFunctions.Rastrigin;
  const defaultCompare = [Algorithms.GWO, Algorithms.Aquila];

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
      };

    case "multi":
      return {
        selectedAlgorithms: defaultCompare,
        populationSize: algorithmConfig.populationSize,
        dimensions: benchmarkConfig.dimensions,
        iterations: algorithmConfig.iterations,
        benchmarkFunction: defaultBenchmark,
        lowerBound: benchmarkConfig.lowerBound,
        upperBound: benchmarkConfig.upperBound,
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
          name: "Comparison 1",
          config: getDefaultConfig("multi"),
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
          name:
            mode === "single"
              ? `Single Test ${
                  get().sessions.filter((s) => s.mode === "single").length + 1
                }`
              : `Comparision ${
                  get().sessions.filter((s) => s.mode === "multi").length + 1
                }`,
          config: getDefaultConfig(mode),
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

      setTestResult: (id: string, result: TestResult) => {
        const session = get().sessions.find((s) => s.id === id);
        if (!session) return;

        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== id) return s;

            const {
              dimensions,
              lowerBound,
              upperBound,
              populationSize,
              iterations,
            } = s.config;

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

                  restoredMultiTestProgress = {
                    completedAlgorithms: [], // Nie wiemy które algorytmy się wykonały
                    partialResults: [], // Nie mamy częściowych wyników
                    currentAlgorithm: undefined,
                  };
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
