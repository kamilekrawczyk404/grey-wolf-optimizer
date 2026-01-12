import * as React from "react";
import { useState } from "react";
import SectionContainer from "../SectionContainer";


const ParameterInput = ({ label, value, onChange }: { label: string; value: string | number; onChange: (val: any) => void; }) => (
    <div className="flex flex-col gap-1 flex-1">
        <span className="text-xs text-neutral-300 font-medium">{label}</span>
        <input
            className="p-2 rounded bg-neutral-800 text-white w-full border border-neutral-700 focus:border-green-500 outline-none"
            value={value}
            onChange={(e) => onChange(isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value))}
        />
    </div>
);

const ParameterSelect = ({ label, value, onChange, options }: { label: string; value: string; onChange: (val: string) => void; options: string[]; }) => (
    <div className="flex flex-col gap-1">
        <span className="text-xs text-neutral-300 font-medium">{label}</span>
        <select
            className="p-2 rounded bg-neutral-800 text-white w-full border border-neutral-700 focus:border-green-500 outline-none"
            value={value}
            onChange={(e) => onChange(e.target.value)}
        >
            {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
    </div>
);

const SsaParameters: React.FC = () => {
    const [iterations, setIterations] = useState<number>(100);
    const [lowerBound, setLowerBound] = useState<number>(-10);
    const [upperBound, setUpperBound] = useState<number>(10);
    const [dimensions, setDimensions] = useState<number>(2);
    const [benchmarkFunction, setBenchmarkFunction] = useState<string>("Rastrigin");
    const [populationSize, setPopulationSize] = useState<number>(50);
    const [loading, setLoading] = useState<boolean>(false);
    const [result, setResult] = useState<{
        BestSolution?: number[];
        HistoryJson?: any;
        Message?: string;
        Error?: string;
    }>({});

    const benchmarkOptions = ["Rastrigin", "Sphere", "Beale", "RosenBrock"];

    const runOptimizer = async () => {
        setLoading(true);
        setResult({});

        const requestBody = {
            Algorithm: "SSA",
            PopulationSize: populationSize,
            Dimensions: dimensions,
            Iterations: iterations,
            LowerBound: lowerBound,
            UpperBound: upperBound,
            Function: benchmarkFunction
        };

        try {
            const response = await fetch("http://localhost:5000/api/optimizer/run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorText = await response.text();
                setResult({ Error: errorText });
                return;
            }

            const data = await response.json();
            setResult({
                BestSolution: data.BestSolution,
                HistoryJson: data.HistoryJson,
                Message: data.Message
            });
        } catch (error) {
            setResult({ Error: (error as Error).message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <SectionContainer header="Salp Swarm Parameters">
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
                    className={`mt-4 px-4 py-2 rounded ${loading ? "bg-neutral-700 cursor-not-allowed" : "bg-green-600 hover:bg-green-500 text-white"}`}
                >
                    {loading ? "Running SSA..." : "Run SSA"}
                </button>
            </SectionContainer>

            {result.Message && (
                <SectionContainer header="SSA Info">
                    <div>{result.Message}</div>
                </SectionContainer>
            )}
            {result.BestSolution && (
                <SectionContainer header="SSA Result">
                    <div className="break-all">Best Solution: {result.BestSolution.join(", ")}</div>
                </SectionContainer>
            )}
            {result.Error && (
                <SectionContainer header="Error">
                    <div className="text-red-500">{result.Error}</div>
                </SectionContainer>
            )}
        </div>
    );
};

export default SsaParameters;