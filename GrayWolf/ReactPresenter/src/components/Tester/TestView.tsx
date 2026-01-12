import React, { useState } from "react";
import Container from "../Container";
import SectionContainer from "../SectionContainer";
import GWOParameters from "./GWOParameters";
import AquilaParameters from "./AquilaParameters";
import SsaParameters from "./SsaParameters"; //PAMIĘTAJ o importcie
import BaParameters from "./BaParameters";
import GaParameters from "./GaParameters";

const TestView: React.FC = () => {
    const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>("GWO");

    const algorithms = ["GWO", "Aquila", "SSA", "BA", "GA"];

    return (
        <Container className="max-w-4xl mx-auto space-y-6">
            <SectionContainer header="Select Algorithm">
                <div className="flex gap-4 items-center p-4">
                    <span className="text-neutral-300">Algorithm:</span>
                    <select
                        className="p-2 rounded bg-neutral-800 text-white border border-neutral-600 focus:border-cyan-500 outline-none"
                        value={selectedAlgorithm}
                        onChange={(e) => setSelectedAlgorithm(e.target.value)}
                    >
                        {algorithms.map((algo) => (
                            <option key={algo} value={algo}>
                                {algo}
                            </option>
                        ))}
                    </select>
                </div>
            </SectionContainer>

            {/* Renderowanie odpowiedniego komponentu w zależności od wyboru */}
            <div className="mt-4">
                {selectedAlgorithm === "GWO" && <GWOParameters />}
                {selectedAlgorithm === "Aquila" && <AquilaParameters />}
                {selectedAlgorithm === "SSA" && <SsaParameters />}
                {selectedAlgorithm === "BA" && <BaParameters />}
                {selectedAlgorithm === "GA" && <GaParameters />}
            </div>
        </Container>
    );
};

export default TestView;