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

type UserLocalFileProperties = Omit<OptimizationRun, 'history'>

export type UserLocalFile = {
  description: string;
  properties: UserLocalFileProperties;
  history: IterationSnapshot[]
}

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
    Array.isArray(obj.entities) &&
    obj.entities.every(isAgentState) // Validate each entity
  );
}

export function isOptimizationRunProperties(
  obj: any,
): obj is OptimizationRun {
  if (!obj || typeof obj !== "object") {
    return false;
  }

  return (
    typeof obj.algorithm === "string" &&
    typeof obj.benchmarkFunction === "string" &&
    typeof obj.iterations === "number" &&
    isNumberArray(obj.bestSolution) &&
    typeof obj.bestFitness === "number" &&
    typeof obj.dimensions === "number" &&
    typeof obj.populationSize === "number" &&
    typeof obj.lowerBound === "number" &&
    typeof obj.upperBound === "number" &&
    Array.isArray(obj.solution) &&
    obj.solution.every(isNumberArray)
  );
}

export function isExperimentRecord(obj: any): obj is UserLocalFile {
  if (!obj || typeof obj !== "object") {
    return false;
  }

  return (
      typeof obj.description === "string" &&
      isOptimizationRunProperties(obj.properties) && // Validate the nested properties object
      Array.isArray(obj.history) &&
      obj.history.every(isIterationSnapshot) // Validate every item in history
  );
}

export type HeaderProps = HTMLAttributes<HTMLHeadingElement> & {
  accent?: boolean;
};

export enum Algorithms {
    GWO = "GWO",
    Aquila = "Aquila",
    SSA = "SSA",
    BA = "BA",
    GA = "GA",
}

export enum BenchmarkFunctions {
    Rastrigin = "Rastrigin",
    Sphere = "Sphere",
    Beale = "Beale",
    RosenBrock = "RosenBrock",
    BukinN6 = "BukinN6"
}

export type OptimizationTest = UserLocalFile;

export function isOptimizationTestArray(obj: any): obj is UserLocalFile[] {
    return Array.isArray(obj) && obj.every(isExperimentRecord);
}