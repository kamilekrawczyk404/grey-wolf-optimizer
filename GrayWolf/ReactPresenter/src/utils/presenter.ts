import {Algorithms, BenchmarkFunctions, ExperimentRecord, OptimizerConfiguration, OptimizerDTO} from "../types/types";
import {SingleTestResult, TestSession} from "../stores/test-store";
import {toast} from "sonner";

export const preparePresenterExperimentRecord = (session: TestSession): ExperimentRecord | null => {
    if (!session.result) {
        toast.warning("Test or comparision has been not started yet.")
        return null;
    }

    const { dimensions, lowerBound, upperBound, populationSize, iterations } = session.config;


    switch (session.mode) {
        case 'single':
            const {solution, bestSolution, algorithm, bestFitness, benchmarkFunction, historyJson} = session.result as SingleTestResult

            if (solution === undefined || bestSolution === undefined || bestFitness === undefined || historyJson === undefined) return null;

            return ({
                description: session.name,
                properties: {
                    lowerBound,
                    upperBound,
                    dimensions,
                    iterations,
                    populationSize,
                    history: historyJson,
                    solution,
                    bestSolution,
                    bestFitness,
                    benchmarkFunction: benchmarkFunction as BenchmarkFunctions,
                    algorithm: algorithm as Algorithms
                }
            })
        case 'multi':
            return null;
        default:
            return null;
    }
}