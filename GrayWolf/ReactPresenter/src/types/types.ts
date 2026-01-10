import { HTMLAttributes } from "react";

export interface OptimizerConfiguration {
  iterations: number,
  dimensions: number,
  lowerBound: number,
  upperBound: number,
  populationSize: number,
  benchmarkFunction: BenchmarkFunctions,
  algorithm: Algorithms
}

export interface AgentState {
  isLeader: boolean,
  role: string,
  fitness: number,
  position: number[]
}

export interface IterationSnapshot {
  iteration: number;
  entities: AgentState[]
}

export type OptimizationRun = {
  algorithm: Algorithms,
  benchmarkFunction: BenchmarkFunctions;
  populationSize: number,
  iterations: number;
  lowerBound: number;
  upperBound: number;
  bestFitness: number;
  bestSolution: number[];
  solution: number[][]
  dimensions: number;
  history: IterationSnapshot[];
};

export type ExperimentRecord = {
  description: string;
  properties: OptimizationRun;
};

export interface OptimizerDTO {
  bestSolution: number[],
  bestFitness: number,
  solution: number[][],
  historyJson: IterationSnapshot[],
  message?: string
}

function isNumberArray(arr: any): arr is number[] {
  return Array.isArray(arr) && arr.every((item) => typeof item === "number");
}

const isAgentState = (obj: any) => {
  if (!obj || typeof obj !== 'object') return false

  return isNumberArray(obj.position) &&
      typeof obj.fitness === 'number' &&
      typeof obj.role === 'string' &&
      typeof obj.isLeader === 'boolean'
}

export function isIterationSnapshot(obj: any): obj is IterationSnapshot {
  if (!obj || typeof obj !== "object") {
    return false;
  }

  return (
    typeof obj.iteration === "number" &&
    Array.isArray(obj.iterations) &&
    obj.iterations.every(isAgentState) // Validate each entity
  );
}

export function isOptimizationRun(
  obj: any,
): obj is OptimizationRun {
  if (!obj || typeof obj !== "object") {
    return false;
  }

  return (
    typeof obj.iterations === "number" &&
    typeof obj.lowerBound === "number" &&
    typeof obj.upperBound === "number" &&
    typeof obj.dimensions === "number" &&
    typeof obj.bestFitness === "number" &&
    typeof obj.benchmarkFunction === "string" &&
    isNumberArray(obj.globalMinimumCoords) &&
    isNumberArray(obj.bestSolution) &&
    Array.isArray(obj.history) &&
    obj.entities.every(isIterationSnapshot) // Validate every item in history
  );
}

export function isProcessedReportWithDescription(obj: any): obj is ExperimentRecord {
  if (!obj || typeof obj !== "object") {
    return false;
  }

  return (
    typeof obj.description === "string" &&
    isOptimizationRun(obj.properties) // Validate the nested properties object
  );
}

export function isExperimentRecord(obj: any): obj is ExperimentRecord[] {
  return Array.isArray(obj) && obj.every(isProcessedReportWithDescription);
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
}