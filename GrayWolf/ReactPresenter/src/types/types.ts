import { HTMLAttributes } from "react";

export type WolfHistory = {
  isAlpha: boolean;
  isBeta: boolean;
  isGamma: boolean;
  fitness: number[];
  position: number[];
  iteration?: number;
};

export type IterationHistory = {
  wolves: WolfHistory[];
  iteration: number;
};

export type OptimizationProperties = {
  iterations: number;
  lowerBound: number[];
  upperBound: number[];
  bestFitness: number[];
  solution?: number[];
  dimensions: number;
  history: IterationHistory[];
};

export type OptimizationTest = {
  description: string;
  properties: OptimizationProperties;
};

/**
 * Checks if an object is a valid array of numbers.
 * @param arr The object to check.
 * @returns True if the object is an array of numbers.
 */
function isNumberArray(arr: any): arr is number[] {
  return Array.isArray(arr) && arr.every((item) => typeof item === "number");
}

/**
 * Type guard to check if an object conforms to the WolfHistory interface.
 * @param obj The object to validate.
 * @returns A boolean indicating if the object is a valid WolfHistory type.
 */
export function isWolfHistory(obj: any): obj is WolfHistory {
  if (!obj || typeof obj !== "object") {
    return false;
  }

  return (
      typeof obj.isAlpha === "boolean" &&
      typeof obj.isBeta === "boolean" &&
      typeof obj.isGamma === "boolean" &&
      isNumberArray(obj.fitness) &&
      isNumberArray(obj.position) &&
      (!("iteration" in obj) || typeof obj.iteration === "number") // Check optional property
  );
}

/**
 * Type guard to check if an object conforms to the IterationHistory interface.
 * @param obj The object to validate.
 * @returns A boolean indicating if the object is a valid IterationHistory type.
 */
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

/**
 * Type guard to check if an object conforms to the OptimizationProperties interface.
 * @param obj The object to validate.
 * @returns A boolean indicating if the object is a valid OptimizationProperties type.
 */
export function isOptimizationProperties(
    obj: any,
): obj is OptimizationProperties {
  if (!obj || typeof obj !== "object") {
    return false;
  }

  return (
      typeof obj.iterations === "number" &&
      typeof obj.dimensions === "number" &&
      isNumberArray(obj.bestFitness) &&
      isNumberArray(obj.upperBound) &&
      isNumberArray(obj.lowerBound) &&
      Array.isArray(obj.history) &&
      obj.history.every(isIterationHistory) // Validate every item in history
  );
}

/**
 * Type guard to check if an object conforms to the OptimizationTest interface.
 * @param obj The object to validate.
 * @returns A boolean indicating if the object is a valid OptimizationTest type.
 */
export function isOptimizationTest(obj: any): obj is OptimizationTest {
  if (!obj || typeof obj !== "object") {
    return false;
  }

  return (
      typeof obj.description === "string" &&
      isOptimizationProperties(obj.properties) // Validate the nested properties object
  );
}

/**
 * NEW: Top-level type guard to check if an object is an array of OptimizationTest objects.
 * @param obj The object to validate.
 * @returns A boolean indicating if the object is a valid array of OptimizationTest.
 */
export function isOptimizationTestArray(obj: any): obj is OptimizationTest[] {
  return Array.isArray(obj) && obj.every(isOptimizationTest);
}

export type HeaderProps = HTMLAttributes<HTMLHeadingElement> & {
  accent?: boolean;
};
