import React, { useCallback, useEffect, useState } from "react";
import "./App.css";
import Container from "./components/Container";
import { OptimizationTest } from "./types/types";
import GwoCanvas, {
    CanvasConfig,
    defaultConfig,
} from "./components/canvas/GwoCanvas";
import CanvasConfigConfigure from "./components/canvas/CanvasConfigConfigure";
import TestsPreview from "./components/TestsPreview";
import TestsNotFound from "./components/TestsNotFound";
import { layoutColors } from "./colors";
import TestView from "./components/Tester/TestView";
//import Parameters from "./components/Tester/Parameters";


export type AnimationStatus = { isCompleted: boolean; isRunning: boolean };

function App() {
    const [animationStatus, setAnimationStatus] = useState<AnimationStatus>({
        isCompleted: false,
        isRunning: false,
    });
    const [tests, setTests] = useState<OptimizationTest[]>([]);
    const [currentTest, setCurrentTest] = useState<OptimizationTest | null>(null);
    const [currentIteration, setCurrentIteration] = useState<number>(-1);
    const [canvasConfig, setCanvasConfig] = useState<CanvasConfig>(defaultConfig);

    //stan zak³adek
    const [activeTab, setActiveTab] = useState<"test" | "wizualizator">("test");

    const pauseAnimation = useCallback(() => {
        setAnimationStatus((prev) => ({ ...prev, isRunning: false }));
    }, []);

    const startAnimation = useCallback(() => {
        setAnimationStatus({ isCompleted: false, isRunning: true });

        if (
            currentTest &&
            currentIteration === currentTest.properties.history.length - 1
        ) {
            setCurrentIteration(0);
        }
    }, [currentIteration, currentTest]);

    const changeIteration = useCallback((nextIteration: number) => {
        setCurrentIteration(nextIteration);
    }, []);

    const handleSingleFileLoaded = useCallback(
        (userTests: OptimizationTest[], isLast: boolean) => {
            const newTests = [...tests, ...userTests];
            setTests(newTests);

            if (isLast) {
                setCurrentTest(newTests[0]);
            }
        },
        [tests],
    );

    useEffect(() => {
        if (currentTest === null || !animationStatus.isRunning) return;

        const animation = setInterval(() => {
            const length = currentTest.properties.history.length;

            setCurrentIteration((prev) => {
                if (prev + 1 >= length) {
                    setAnimationStatus({ isRunning: false, isCompleted: true });
                    return prev;
                } else {
                    return prev + 1;
                }
            });
        }, canvasConfig.animationDuration);

        return () => clearInterval(animation);
    }, [animationStatus, currentTest, canvasConfig.animationDuration]);

    useEffect(() => {
        setCurrentIteration(0);
        setAnimationStatus({ isRunning: false, isCompleted: false });
    }, [currentTest]);

    return (
        <div
            className={
                "relative bg-neutral-950 w-full min-h-screen flex flex-col items-center justify-start p-4"
            }
        >
            {/* Zak³adki */}
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

            {/* !!!!!!!!!!!!!!!!!ZAK£ADKA TEST VIEW!!!!!!!!!!!! */}
            {activeTab === "test" && <TestView />}

            {activeTab === "wizualizator" && (
                <div
                    className={`w-full h-full lg:max-w-7xl mx-auto grid grid-auto-rows gap-2 ${layoutColors.neutral.text.primary
                        } ${currentTest ? "lg:grid-cols-2 grid-cols-1" : "grid-cols-1"}`}
                >
                    <Container className={"flex flex-col gap-2 p-2"}>
                        {currentTest ? (
                            <TestsPreview
                                isRunning={animationStatus.isRunning}
                                tests={tests}
                                onTestChange={setCurrentTest}
                            />
                        ) : (
                            <TestsNotFound onSingleFileLoaded={handleSingleFileLoaded} />
                        )}

                        {currentTest && (
                            <CanvasConfigConfigure
                                isRunning={animationStatus.isRunning}
                                config={canvasConfig}
                                updateConfig={setCanvasConfig}
                                iterations={currentTest.properties.iterations}
                            />
                        )}
                    </Container>
                    {currentTest !== null && (
                        <Container className={"content-center"}>
                            <GwoCanvas
                                history={currentTest.properties.history}
                                iteration={currentIteration}
                                properties={currentTest.properties}
                                options={canvasConfig}
                                onAnimationStart={startAnimation}
                                onAnimationPause={pauseAnimation}
                                onIterationChange={changeIteration}
                                animationStatus={animationStatus}
                            />
                        </Container>
                    )}
                </div>
            )}
        </div>
    );
}

export default App;
