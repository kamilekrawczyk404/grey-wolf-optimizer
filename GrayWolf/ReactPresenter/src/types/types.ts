import { HTMLAttributes } from "react";

export type WolfHistory = {
  isAlpha: boolean;
  isBeta: boolean;
  // isGamma: boolean;
  isDelta: boolean;
  // fitness: number[];
  fitness: number;
  position: number[];
  iteration?: number;
};

export type IterationHistory = {
  wolves: WolfHistory[];
  iteration: number;
};

export type OptimizationProperties = {
  iterations: number;
  lowerBound: number;
  upperBound: number;
  bestFitness: number;
  bestSolution: number[];
  solution: number[];
  dimensions: number;
  benchmarkFunction: string;
  history: IterationHistory[];
};

export type OptimizationTest = {
  description: string;
  properties: OptimizationProperties;
};

function isNumberArray(arr: any): arr is number[] {
  return Array.isArray(arr) && arr.every((item) => typeof item === "number");
}

export function isWolfHistory(obj: any): obj is WolfHistory {
  if (!obj || typeof obj !== "object") {
    return false;
  }

  return (
    typeof obj.isAlpha === "boolean" &&
    typeof obj.isBeta === "boolean" &&
    typeof obj.isDelta === "boolean" &&
    // isNumberArray(obj.fitness) &&
    typeof obj.fitness === "number" &&
    isNumberArray(obj.position) &&
    (!("iteration" in obj) || typeof obj.iteration === "number") // Check optional property
  );
}

export function isIterationHistory(obj: any): obj is IterationHistory {
  if (!obj || typeof obj !== "object") {
    return false;
  }

  return (
    typeof obj.iteration === "number" &&
    Array.isArray(obj.wolves) &&
    obj.wolves.every(isWolfHistory) // Validate every wolf in the array
  );
}

export function isOptimizationProperties(
  obj: any
): obj is OptimizationProperties {
  if (!obj || typeof obj !== "object") {
    return false;
  }

  return (
    typeof obj.iterations === "number" &&
    typeof obj.lowerBound === "number" &&
    typeof obj.upperBound === "number" &&
    typeof obj.dimensions === "number" &&
    typeof obj.bestFitness === "number" &&
    isNumberArray(obj.bestSolution) &&
    Array.isArray(obj.history) &&
    obj.history.every(isIterationHistory) // Validate every item in history
  );
}

export function isOptimizationTest(obj: any): obj is OptimizationTest {
  if (!obj || typeof obj !== "object") {
    return false;
  }

  return (
    typeof obj.description === "string" &&
    isOptimizationProperties(obj.properties) // Validate the nested properties object
  );
}

export function isOptimizationTestArray(obj: any): obj is OptimizationTest[] {
  return Array.isArray(obj) && obj.every(isOptimizationTest);
}

export type HeaderProps = HTMLAttributes<HTMLHeadingElement> & {
  accent?: boolean;
};
export enum Algorithms {
  GWO = "GWO",
  Aquila = "Aquila",
}

export enum BenchmarkFunctions {
  Rastrigin = "Rastrigin",
  Sphere = "Sphere",
  Beale = "Beale",
  RosenBrock = "RosenBrock",
  BukinN6 = "BukinN6",
}
