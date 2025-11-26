// components/Tester/Parameters.tsx
import React, { useState } from "react";
import SectionContainer from "../SectionContainer";
import Container from "../Container";

const Parameters: React.FC = () => {
    const [iterations, setIterations] = useState<number>(80);
    const [lowerBound, setLowerBound] = useState<number>(-5.12);
    const [upperBound, setUpperBound] = useState<number>(5.12);
    const [dimensions, setDimensions] = useState<number>(2);
    const [benchmarkFunction, setBenchmarkFunction] = useState<string>("Rastrigin");
    const [populationSize, setPopulationSize] = useState<number>(80);
    const [loading, setLoading] = useState<boolean>(false);
    const [result, setResult] = useState<{
        BestSolution?: number[];
        HistoryJson?: any;
        Message?: string;
        Error?: string;
    }>({});

    const benchmarkOptions = ["Rastrigin", "Sphere", "Ackley", "Griewank"];

    const runOptimizer = async () => {
        setLoading(true);
        setResult({}); //reset poprzednich wartości

        const requestBody = {
            PopulationSize: populationSize,
            Dimensions: dimensions,
            Iterations: iterations,
            LowerBound: lowerBound,
            UpperBound: upperBound,
            Function: benchmarkFunction
        };

        console.log("Wysyłanie requesta do backendu:", requestBody);
        //debuggini, bo początkowo były błędy
        try {
            const response = await fetch("http://localhost:5000/api/optimizer/run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Backend zwrócił błąd:", errorText);
                setResult({ Error: errorText });
                return;
            }

            const data = await response.json();
            console.log("Otrzymano odpowiedź z backendu:", data);

            setResult({
                BestSolution: data.BestSolution,
                HistoryJson: data.HistoryJson,
                Message: data.Message
            });
        } catch (error) {
            console.error("Błąd fetch:", error);
            setResult({ Error: (error as Error).message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container className="max-w-3xl mx-auto space-y-4">
            <SectionContainer header="Optimization parameters">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ParameterInput label="Iterations" value={iterations} onChange={setIterations} />
                    <div className="flex gap-2">
                        <ParameterInput label="Lower Bound" value={lowerBound} onChange={setLowerBound} />
                        <ParameterInput label="Upper Bound" value={upperBound} onChange={setUpperBound} />
                    </div>
                    <ParameterInput label="Dimensions" value={dimensions} onChange={setDimensions} />
                    <ParameterSelect
                        label="Benchmark Function"
                        options={benchmarkOptions}
                        value={benchmarkFunction}
                        onChange={setBenchmarkFunction}
                    />
                    <ParameterInput label="Population Size" value={populationSize} onChange={setPopulationSize} />
                </div>

                <button
                    onClick={runOptimizer}
                    disabled={loading}
                    className={`mt-4 px-4 py-2 rounded ${loading ? "bg-neutral-700 cursor-not-allowed" : "bg-cyan-600 hover:bg-cyan-500 text-white"
                        }`}
                >
                    {loading ? "Running..." : "Run Optimizer"}
                </button>
            </SectionContainer>

            {result.Message && (
                <SectionContainer header="Info">
                    <div>{result.Message}</div>
                </SectionContainer>
            )}

            {result.BestSolution && (
                <SectionContainer header="Result">
                    <div>Best Solution: {result.BestSolution.join(", ")}</div>
                </SectionContainer>
            )}

            {result.Error && (
                <SectionContainer header="Error">
                    <div className="text-red-500">{result.Error}</div>
                </SectionContainer>
            )}
        </Container>
    );
};

const ParameterInput = ({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string | number;
    onChange: (val: any) => void;
}) => {
    return (
        <div className="flex flex-col gap-1 flex-1">
            <span className="text-xs text-neutral-300 font-medium">{label}</span>
            <input
                className="p-2 rounded bg-neutral-800 text-white w-full"
                value={value}
                onChange={(e) =>
                    onChange(isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value))
                }
            />
        </div>
    );
};

const ParameterSelect = ({
    label,
    value,
    onChange,
    options,
}: {
    label: string;
    value: string;
    onChange: (val: string) => void;
    options: string[];
}) => {
    return (
        <div className="flex flex-col gap-1">
            <span className="text-xs text-neutral-300 font-medium">{label}</span>
            <select
                className="p-2 rounded bg-neutral-800 text-white w-full"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            >
                {options.map((opt) => (
                    <option key={opt} value={opt}>
                        {opt}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default Parameters;
