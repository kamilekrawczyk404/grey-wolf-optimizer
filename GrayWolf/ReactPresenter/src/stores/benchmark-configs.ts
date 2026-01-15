import {
  Algorithms,
  BenchmarkFunctions,
  AlgorithmParameterInfo,
} from "../types/types";

export interface BenchmarkConfig {
  lowerBound: number;
  upperBound: number;
  dimensions: number;
  optimalSolution?: number[];
}

export interface AlgorithmConfig {
  populationSize: number;
  iterations: number;
  parameters: AlgorithmParameterInfo[];
}

// Konfiguracje dla funkcji benchmark
export const BENCHMARK_CONFIGS: Record<BenchmarkFunctions, BenchmarkConfig> = {
  [BenchmarkFunctions.Rastrigin]: {
    lowerBound: -5.12,
    upperBound: 5.12,
    dimensions: 10,
    optimalSolution: Array(10).fill(0),
  },
  [BenchmarkFunctions.Sphere]: {
    lowerBound: -5.12,
    upperBound: 5.12,
    dimensions: 20,
    optimalSolution: Array(30).fill(0),
  },
  [BenchmarkFunctions.Beale]: {
    lowerBound: -4.5,
    upperBound: 4.5,
    dimensions: 2, // Beale jest zawsze 2D
    optimalSolution: [3, 0.5],
  },
  [BenchmarkFunctions.RosenBrock]: {
    lowerBound: -5,
    upperBound: 10,
    dimensions: 10,
    optimalSolution: Array(10).fill(1),
  },
  [BenchmarkFunctions.BukinN6]: {
    lowerBound: -15,
    upperBound: 5,
    dimensions: 2, // BukinN6 jest zawsze 2D
    optimalSolution: [-10, 1],
    },
    [BenchmarkFunctions.Transformer]: {
        dimensions: 3,//zawsze w 3D
        lowerBound: 0.5,
        upperBound: 1.5,
    },
};

// Konfiguracje dla algorytm�w
export const ALGORITHM_CONFIGS: Record<Algorithms, AlgorithmConfig> = {
  [Algorithms.GWO]: {
    populationSize: 20,
    iterations: 100,
    parameters: [],
  },
  [Algorithms.Aquila]: {
    populationSize: 30,
    iterations: 100,
    parameters: [],
  },
  [Algorithms.SSA]: {
    populationSize: 40,
    iterations: 100,
    parameters: [],
  },
  [Algorithms.BA]: {
    populationSize: 30,
    iterations: 100,
    parameters: [
      {
        name: "Qmin",
        description: "Min frequency",
        min: 0.0,
        max: 5.0,
        step: 0.1,
        defaultValue: 0.0,
      },
      {
        name: "Qmax",
        description: "Max frequency",
        min: 0.0,
        max: 5.0,
        step: 0.1,
        defaultValue: 2.0,
      },
      {
        name: "Alpha",
        description: "Loudness decay constant",
        min: 0.0,
        max: 1.0,
        step: 0.01,
        defaultValue: 0.9,
      },
      {
        name: "Gamma",
        description: "Pulse rate growth constant",
        min: 0.0,
        max: 1.0,
        step: 0.01,
        defaultValue: 0.9,
      },
    ],
  },
  [Algorithms.GA]: {
    populationSize: 50,
    iterations: 100,
    parameters: [
      {
        name: "CrossoverProbability",
        description: "Crossover probability",
        min: 0.0,
        max: 1.0,
        step: 0.01,
        defaultValue: 0.8,
      },
      {
        name: "MutationRate",
        description: "Mutation rate",
        min: 0.0,
        max: 1.0,
        step: 0.01,
        defaultValue: 0.05,
      },
      {
        name: "MutationStrength",
        description: "Mutation strength",
        min: 0.0,
        max: 1.0,
        step: 0.01,
        defaultValue: 0.01,
      },
      {
        name: "TournamentSize",
        description: "Tournament size",
        min: 1,
        max: 10,
        step: 1,
        defaultValue: 3,
      },
    ],
  },
  [Algorithms.PSO]: {
    populationSize: 40,
    iterations: 100,
    parameters: [
      {
        name: "w",
        description: "Inertia weight",
        min: 0.0,
        max: 1.0,
        step: 0.01,
        defaultValue: 0.7,
      },
      {
        name: "c1",
        description: "Cognitive coefficient",
        min: 0.0,
        max: 4.0,
        step: 0.1,
        defaultValue: 1.5,
      },
      {
        name: "c2",
        description: "Social coefficient",
        min: 0.0,
        max: 4.0,
        step: 0.1,
        defaultValue: 1.5,
      },
    ],
  },
  [Algorithms.BOA]: {
    populationSize: 30,
    iterations: 100,
    parameters: [
      {
        name: "p",
        description: "Switch probability",
        min: 0.0,
        max: 1.0,
        step: 0.01,
        defaultValue: 0.8,
      },
      {
        name: "c",
        description: "Sensor modality",
        min: 0.0,
        max: 1.0,
        step: 0.01,
        defaultValue: 0.01,
      },
      {
        name: "a",
        description: "Power exponent",
        min: 0.0,
        max: 1.0,
        step: 0.01,
        defaultValue: 0.1,
      },
    ],
  },
};

// Funkcja pomocnicza do uzyskania pe�nej konfiguracji
export function getDefaultConfigForBenchmark(
  benchmark: BenchmarkFunctions
): BenchmarkConfig {
  return BENCHMARK_CONFIGS[benchmark];
}

export function getDefaultConfigForAlgorithm(
  algorithm: Algorithms
): AlgorithmConfig {
  return ALGORITHM_CONFIGS[algorithm];
}
