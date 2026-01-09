import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { z } from "zod";
import { BENCHMARK_CONFIGS, ALGORITHM_CONFIGS } from "./benchmark-configs";
import { Algorithms, BenchmarkFunctions } from "../types/types";

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
    .refine((value) => value.length > 0, {
      message: "You must select at least one algorithm",
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
  algorithm: string;
  benchmarkFunction: string;
  bestSolution: number[];
  duration: number;
  historyJson?: string;
  message?: string;
  error?: string;
}

export interface ComparisionRow {
  algorithm: string;
  duration: number;
  bestSolution: number[];
  status: "success" | "failed";
  error?: string;
}

export interface MultiTestResult {
  type: "multi";
  benchmarkFunction: string;
  results: ComparisionRow[];
  message?: string;
}

export type TestFormValues = SingleTestFormValues | MultiTestFormValues;

export type TestResult = SingleTestResult | MultiTestResult;

export interface TestSession {
  id: string;
  mode: TestMode;
  config: TestFormValues;
  name: string;
  status: SessionStatus;
  result: TestResult | null;
  startTime?: number;
  endTime?: number;
  resultsSeen: boolean;
  abortController?: AbortController;
  runId?: string;
}

interface TestStore {
  sessions: TestSession[];
  activeTab: string;

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

// Domyślna konfiguracja dla GWO + Rastrigin
const defaultAlgorithm = Algorithms.GWO;
const defaultBenchmark = BenchmarkFunctions.Rastrigin;

function getDefaultConfig(): TestFormValues {
  // Domyślna konfiguracja dla GWO + Rastrigin
  const defaultAlgorithm = Algorithms.GWO;
  const defaultBenchmark = BenchmarkFunctions.Rastrigin;

  const algorithmConfig = ALGORITHM_CONFIGS[defaultAlgorithm];
  const benchmarkConfig = BENCHMARK_CONFIGS[defaultBenchmark];

  return {
    algorithm: defaultAlgorithm,
    populationSize: algorithmConfig.populationSize,
    dimensions: benchmarkConfig.dimensions,
    iterations: algorithmConfig.iterations,
    lowerBound: benchmarkConfig.lowerBound,
    upperBound: benchmarkConfig.upperBound,
    benchmarkFunction: defaultBenchmark,
  };
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
          name: "Single Test 1",
          config: getDefaultConfig(),
          mode: "single",
          status: "idle",
          result: null,
          resultsSeen: true,
        },
      ],
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
          config: getDefaultConfig(),
          status: "idle",
          result: null,
          resultsSeen: true,
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
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? { ...s, result } : s
          ),
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
                };
              }

              if (
                session.status === "running" ||
                session.status === "cancelled"
              ) {
                console.log(
                  `Session ${session.id} was ${session.status} but checkpoint exists - setting to idle with runId ${session.runId}`
                );
                return {
                  ...session,
                  status: "idle" as SessionStatus,
                  abortController: undefined,
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
        sessions: state.sessions.map((s) => ({
          ...s,
          abortController: undefined,
          runId: s.runId,
          result: s.result
            ? {
                ...s.result,
                historyJson: undefined,
              }
            : null,
        })),
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
