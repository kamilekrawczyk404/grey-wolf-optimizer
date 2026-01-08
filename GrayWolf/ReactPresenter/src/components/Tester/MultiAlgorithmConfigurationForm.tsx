import {
    BenchmarkFunctions, multiTestFormSchema,
    MultiTestFormValues,
    TestSession,
    useTestStore
} from "@/stores/test-store";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {useEffect} from "react";
import {BENCHMARK_CONFIGS} from "@/stores/benchmark-configs";
import {toast} from "sonner";

export interface MultiAlgorithmsConfigurationFromProps {
    session: TestSession
}

export const MultiAlgorithmConfigurationForm = ({session}: MultiAlgorithmsConfigurationFromProps) => {
    const {activeTab, setSessionStatus, setTestResult} = useTestStore();

    const defaultValues: MultiTestFormValues = {
        benchmarkFunction: BenchmarkFunctions.Rastrigin,
        selectedAlgorithms: [],
        populationSize: 30,
        dimensions: 10,
        iterations: 100,
        lowerBound: -5.12,
        upperBound: 5.12
    };

    const form = useForm<MultiTestFormValues>({
        resolver: zodResolver(multiTestFormSchema),
        defaultValues
    });

    useEffect(() => {
        const subscription = form.watch((value, {name}) => {
            if (name === 'benchmarkFunction') {
                const config = BENCHMARK_CONFIGS[value.benchmarkFunction as BenchmarkFunctions];

                if (config) {
                    form.setValue('lowerBound', config.lowerBound);
                    form.setValue('upperBound', config.upperBound);
                    form.setValue('dimensions', config.dimensions);
                }
            }
        });

        return () => subscription.unsubscribe();
    }, [form])

    const onSubmit = async (values: MultiTestFormValues) => {
        const startTime = Date.now();

        setSessionStatus(activeTab, "running", {
            startTime,
            result: null,
            resultsSeen: false
        });

        const comparisionResults: any[] = [];
        let hasError = false;

        toast.info('Starting comparision benchmark...');

        for (const algo of values.selectedAlgorithms) {
            try {
                const requestBody = {
                    Algorithm: algo,
                    PopulationSize: values.populationSize,
                    Dimensions: values.dimensions,
                    Iterations: values.iterations,
                    LowerBound: values.lowerBound,
                    UpperBound: values.upperBound,
                    Function: values.benchmarkFunction
                };

                const response = await fetch("http://localhost:5000/api/optimizer/run", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(requestBody)
                });

                if (!response.ok) throw new Error(`API error for ${algo}`);

                const data = await response.json();

                comparisionResults.push({
                    algorithm: algo,
                    bestSolution: data.bestSolution,
                    duration: (Date.now() - startTime) / 1000,
                    status: "success"
                    // fitness: data.
                });

            } catch(e) {
                console.error(e);
                hasError = true;
                comparisionResults.push({
                    algorithm: algo,
                    status: "failed",
                    error: "Connection failed"
                });
            }
        }

        setTestResult(activeTab, {
            type: "multi",
            benchmarkFunction: values.benchmarkFunction,
            // results: comparisionResults.map(r => ({
            //     algorithm: r.algorithm,
            //     duration: r.duration,
            //     bestSolution: r.
            // }))
            results: comparisionResults,
            message: `Comparision of ${values.selectedAlgorithms.join(", ")} completed`
        })

    }
}