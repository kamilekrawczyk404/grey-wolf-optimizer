import React, {useCallback, useEffect, useState} from 'react'
import {layoutColors} from "../colors";
import Container from "./Container";
import TestsPreview from "./TestsPreview";
import TestsNotFound from "./TestsNotFound";
import CanvasConfigConfigure from "./canvas/CanvasConfigConfigure";
import GwoCanvas, {CanvasConfig, defaultConfig} from "./canvas/GwoCanvas";
import {OptimizationTest} from "../types/types";
import {AnimationStatus} from "../App";

const Presenter = () => {
    const [animationStatus, setAnimationStatus] = useState<AnimationStatus>({
        isCompleted: false,
        isRunning: false,
    });
    const [tests, setTests] = useState<OptimizationTest[]>([]);
    const [currentTest, setCurrentTest] = useState<OptimizationTest | null>(null);
    const [currentIteration, setCurrentIteration] = useState<number>(-1);
    const [canvasConfig, setCanvasConfig] = useState<CanvasConfig>(defaultConfig);

    const pauseAnimation = useCallback(() => {
        setAnimationStatus((prev) => ({ ...prev, isRunning: false }));
    }, []);

    const startAnimation = useCallback(() => {
        setAnimationStatus({ isCompleted: false, isRunning: true });

        if (currentTest) {
            setCurrentIteration(0);
        }
    }, [currentTest]);

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
                if (prev + 1 > length) {
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
                    <TestsNotFound onSingleFileLoaded={handleSingleFileLoaded}/>
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
    )
}

export default Presenter