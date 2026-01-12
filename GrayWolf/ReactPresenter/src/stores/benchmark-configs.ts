import { Algorithms, BenchmarkFunctions } from "../types/types";

export interface BenchmarkConfig {
  lowerBound: number;
  upperBound: number;
  dimensions: number;
  optimalSolution?: number[];
}

export interface AlgorithmConfig {
  populationSize: number;
  iterations: number;
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
};

// Konfiguracje dla algorytm�w
export const ALGORITHM_CONFIGS: Record<Algorithms, AlgorithmConfig> = {
  [Algorithms.GWO]: {
    populationSize: 30,
    iterations: 500,
  },
  [Algorithms.Aquila]: {
    populationSize: 50,
    iterations: 300,
  },
  [Algorithms.SSA]: {
     populationSize: 40,
     iterations: 100,
    },
   [Algorithms.BA]: {
     populationSize: 30,
     iterations: 100,
    },
    [Algorithms.GA]: {
        populationSize: 50,
        iterations: 100,
    }
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
