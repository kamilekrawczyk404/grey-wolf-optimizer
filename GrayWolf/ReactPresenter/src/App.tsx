import React, { useState } from "react";
import "./App.css";
import TestView from "./components/Tester/TestView";
import Presenter from "./components/Presenter";


export type AnimationStatus = { isCompleted: boolean; isRunning: boolean };

function App() {
    //stan zak�adek
    const [activeTab, setActiveTab] = useState<"test" | "wizualizator">("test");

    return (
        <div
            className={
                "relative bg-neutral-950 w-full min-h-screen flex flex-col items-center justify-start p-4"
            }
        >
            {/* Zak�adki */}
            <div className="flex gap-4 mb-4">
                <button
                    className={`px-4 py-2 rounded ${activeTab === "test"
                            ? "bg-cyan-600 text-white"
                            : "bg-neutral-700 text-neutral-300"
                        }`}
                    onClick={() => setActiveTab("test")}
                >
                    Test
                </button>
                <button
                    className={`px-4 py-2 rounded ${activeTab === "wizualizator"
                            ? "bg-cyan-600 text-white"
                            : "bg-neutral-700 text-neutral-300"
                        }`}
                    onClick={() => setActiveTab("wizualizator")}
                >
                    Wizualizator
                </button>
            </div>

            {/* !!!!!!!!!!!!!!!!!ZAK�ADKA TEST VIEW!!!!!!!!!!!! */}
            {activeTab === "test" && <TestView />}

            {activeTab === "wizualizator" && <Presenter/>}
        </div>
    );
}

export default App;
