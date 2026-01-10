import {
    Algorithms,
    BenchmarkFunctions, ComparisionRow, multiTestFormSchema,
    MultiTestFormValues,
    TestSession,
    useTestStore
} from "@/stores/test-store";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import React, {useEffect} from "react";
import {BENCHMARK_CONFIGS} from "@/stores/benchmark-configs";
import {toast} from "sonner";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Activity, BarChart3, Play} from "lucide-react";
import {Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Checkbox} from "@/components/ui/checkbox";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {OptimizerDTO} from "@/types/types";

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

        const sessionState = useTestStore.getState().sessions.find((s) => s.id === activeTab);
        const signal = sessionState?.abortController?.signal;

        const comparisionResults: ComparisionRow[] = [];
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
                    body: JSON.stringify(requestBody),
                    signal
                });

                if (!response.ok) throw new Error(`API error for ${algo}`);

                const { historyJson, bestFitness, bestSolution, solution} = await response.json() as OptimizerDTO;

                comparisionResults.push({
                    status: "success",
                    duration: (Date.now() - startTime) / 1000,
                    algorithm: algo,
                    historyJson,
                    bestSolution,
                    bestFitness,
                    solution
                });

            } catch(e) {
                console.error(e);
                hasError = true;
                comparisionResults.push({
                    algorithm: algo,
                    status: "failed",
                    error: "Connection failed",
                    duration: (Date.now() - startTime) / 1000,
                });
            }
        }

        const algorithmsNames = values.selectedAlgorithms.length > 1 ? values.selectedAlgorithms.join(", ") : values.selectedAlgorithms[0]

        setTestResult(activeTab, {
            type: "multi",
            benchmarkFunction: values.benchmarkFunction,
            results: comparisionResults,
            message: `Comparision of ${algorithmsNames} completed`
        })

        setSessionStatus(activeTab, hasError ? "error" : "completed", { endTime: Date.now() });

        const isPlural = values.selectedAlgorithms.length > 1;
        const totalDuration = comparisionResults.reduce((sum, val) => sum += val.duration, 0);

        if (!hasError) {
            toast.success(`Comparison completed successfully` , {
                description: `${values.selectedAlgorithms.length} algorithm${isPlural ? 's' : ''} finished in ${totalDuration.toFixed(2)}s`
            });
        } else {
            toast.warning("Benchmark completed with some errors.");
        }
    }

    if (session.id !== activeTab) return null;

    return (
        <Card className="bg-neutral-900 border-neutral-800">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <BarChart3 className="text-purple-400" />
                    Multi-Algorithm Comparison
                </CardTitle>
                <CardDescription>
                    Run multiple optimization algorithms on the same function to compare their performance.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="benchmarkFunction"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-neutral-300">Benchmark Function</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white">
                                                <SelectValue placeholder="Select function" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="bg-neutral-800 border-neutral-700">
                                            {Object.values(BenchmarkFunctions).map((func) => (
                                                <SelectItem key={func} value={func}>{func}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* SEKCJA 2: Wybór Algorytmów (Multi-select) */}
                        <FormField
                            control={form.control}
                            name="selectedAlgorithms"
                            render={() => (
                                <FormItem>
                                    <div className="mb-4">
                                        <FormLabel className="text-neutral-300">Select Algorithms to Compare</FormLabel>
                                        <FormDescription>
                                            Choose at least one algorithm.
                                        </FormDescription>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {Object.values(Algorithms).map((algo) => (
                                            <FormField
                                                key={algo}
                                                control={form.control}
                                                name="selectedAlgorithms"
                                                render={({ field }) => {
                                                    return (
                                                        <FormItem
                                                            key={algo}
                                                            className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-neutral-700 p-4"
                                                        >
                                                            <FormControl>
                                                                <Checkbox
                                                                    checked={field.value?.includes(algo)}
                                                                    onCheckedChange={(checked) => {
                                                                        return checked
                                                                            ? field.onChange([...field.value, algo])
                                                                            : field.onChange(
                                                                                field.value?.filter(
                                                                                    (value) => value !== algo
                                                                                )
                                                                            )
                                                                    }}
                                                                />
                                                            </FormControl>
                                                            <FormLabel className="font-normal text-white cursor-pointer">
                                                                {algo} Optimizer
                                                            </FormLabel>
                                                        </FormItem>
                                                    )
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="border-t border-neutral-800 my-4" />

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField
                                control={form.control}
                                name="populationSize"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-neutral-300">Population Size</FormLabel>
                                        <FormControl>
                                            <Input type="number" className="bg-neutral-800 border-neutral-700 text-white" {...field} onChange={e => field.onChange(+e.target.value)} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="iterations"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-neutral-300">Iterations</FormLabel>
                                        <FormControl>
                                            <Input type="number" className="bg-neutral-800 border-neutral-700 text-white" {...field} onChange={e => field.onChange(+e.target.value)} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="dimensions"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-neutral-300">Dimensions</FormLabel>
                                        <FormControl>
                                            <Input type="number" className="bg-neutral-800 border-neutral-700 text-white" {...field} onChange={e => field.onChange(+e.target.value)} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white">
                            <Play className="mr-2 h-4 w-4" />
                            Run Comparison
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}