import React, {createContext, Dispatch, ReactNode, SetStateAction, useContext, useState} from 'react'
import {ExperimentRecord, IterationSnapshot, OptimizerConfiguration, OptimizerDTO} from "@/types/types";
import {TestSession} from "@/stores/test-store";

export interface PresenterContextValues {
    records: ExperimentRecord[],
    setRecords: Dispatch<SetStateAction<ExperimentRecord[]>>
}

const PresenterContext = createContext<PresenterContextValues | null>(null)

export const PresenterProvider = ({children}: {children: ReactNode}) => {
    const [records, setRecords] = useState<ExperimentRecord[]>([]);

    return <PresenterContext.Provider value={{records, setRecords}}>
        {children}
    </PresenterContext.Provider>
}

export const usePresenter = () => {
    const context = useContext(PresenterContext)

    if (!context) {
        throw new Error("usePresenter must be used within a PresenterProvider");
    }

    return context;
}

export const preparePresenterExperimentRecord = ({title, optimizerData, configuration}: {title: string, optimizerData: OptimizerDTO, configuration: OptimizerConfiguration}): ExperimentRecord => {
    const {dimensions, lowerBound, upperBound, algorithm, benchmarkFunction, populationSize, iterations} = configuration;
    const {solution, bestSolution, bestFitness, historyJson} = optimizerData;

    return {
        description: title,
        properties: {
            algorithm,
            benchmarkFunction,
            dimensions,
            lowerBound,
            upperBound,
            solution,
            populationSize,
            iterations,
            bestFitness,
            bestSolution,
            history: historyJson,
        }
    }
}