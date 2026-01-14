import React, { useCallback, useEffect, useMemo, useState } from "react";
import Container from "./Container";
import TestsPreview from "./TestsPreview";
import CanvasConfigConfigure from "./canvas/CanvasConfigConfigure";
import GwoCanvas, { CanvasConfig, defaultConfig } from "./canvas/GwoCanvas";
import { ExperimentRecord, UserLocalFile } from "../types/types";
import { AnimationStatus } from "../App";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import TestFileUploader from "@/components/TestFileUploader";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  PlayCircle,
  ChevronRight,
  FileJson,
  Loader2,
} from "lucide-react";
import {
  useTestStore,
  TestSession,
  SessionStatus,
  MultiTestResult,
  SingleTestResult,
  FunctionComparisonResult,
} from "@/stores/test-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { InfoBanner } from "@/components/ui/info-banner";

const SessionStatusBadge = ({ status }: { status: SessionStatus }) => {
  switch (status) {
    case "completed":
      return (
        <Badge
          variant="outline"
          className="bg-green-950/30 text-green-400 border-green-800 gap-1"
        >
          <CheckCircle2 className="h-3 w-3" /> Success
        </Badge>
      );
    case "error":
      return (
        <Badge
          variant="outline"
          className="bg-red-950/30 text-red-400 border-red-800 gap-1"
        >
          <XCircle className="h-3 w-3" /> Error
        </Badge>
      );
    case "cancelled":
      return (
        <Badge
          variant="outline"
          className="bg-yellow-950/30 text-yellow-400 border-yellow-800 gap-1"
        >
          <AlertCircle className="h-3 w-3" /> Cancelled
        </Badge>
      );
    case "running":
      return (
        <Badge
          variant="outline"
          className="bg-blue-950/30 text-blue-400 border-blue-800 gap-1"
        >
          <Loader2 className="h-3 w-3 animate-spin" /> Running
        </Badge>
      );
    default:
      return (
        <Badge
          variant="outline"
          className="bg-neutral-800 text-neutral-400 border-neutral-700 gap-1"
        >
          <Clock className="h-3 w-3" /> Idle
        </Badge>
      );
  }
};

const Presenter = () => {
  const [animationStatus, setAnimationStatus] = useState<AnimationStatus>({
    isCompleted: false,
    isRunning: false,
  });
  const [currentTest, setCurrentTest] = useState<ExperimentRecord | null>(null);
  const [currentIteration, setCurrentIteration] = useState<number>(-1);
  const [canvasConfig, setCanvasConfig] = useState<CanvasConfig>(defaultConfig);
  const [userExternalFiles, setUserExternalFiles] = useState<UserLocalFile[]>(
    []
  );
  const [isExternalData, setIsExternalData] = useState<boolean>(false);

  const { sessions, setActiveTab, activeTab } = useTestStore();

  const pauseAnimation = useCallback(() => {
    setAnimationStatus((prev) => ({ ...prev, isRunning: false }));
  }, []);

  const startAnimation = useCallback(() => {
    setAnimationStatus({ isCompleted: false, isRunning: true });

    if (currentTest) {
      const totalIterations = currentTest.properties.history.length;

      if (currentIteration >= totalIterations) {
        setCurrentIteration(0);
      }
    }
  }, [currentTest, currentIteration]);

  const changeIteration = useCallback((nextIteration: number) => {
    setCurrentIteration(nextIteration);
  }, []);

  const handleSingleFileLoaded = useCallback(
    (localTestFile: UserLocalFile, isLast: boolean) => {
      setIsExternalData(true);
      setUserExternalFiles((prev) => [...prev, localTestFile]);
      setCurrentIteration(0);

      if (isLast) {
        setCurrentTest({
          description: localTestFile.description,
          properties: {
            history: localTestFile.history,
            ...localTestFile.properties,
          },
        });
      }

      toast.success("External data loaded successfully");
    },
    []
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

  const runPresenter = (session: TestSession) => {
    if (!session.presenterData) {
      toast.warning("This session doesn't have any data to present yet");
      return;
    }

    setIsExternalData(false);
    setUserExternalFiles([]);

    setCurrentTest(session.presenterData[0]);

    toast.success(`Loaded results for ${session.name}`);
  };

  const singleTests = useMemo(
    () =>
      sessions.filter((s) => s.mode === "single" && s.presenterData.length > 0),
    [sessions]
  );
  const multiTests = useMemo(
    () =>
      sessions.filter((s) => s.mode === "multi" && s.presenterData.length > 0),
    [sessions]
  );

  const displayedTests = useMemo<ExperimentRecord[]>(() => {
    if (isExternalData) {
      return userExternalFiles.map(
        (file) => {
          const functionName = file.properties.benchmarkFunction;

          return {
            description: file.description,
            properties: {
              ...file.properties,
              history: file.history,
              // Assuming that function name is on the first place
              benchmarkFunction:
                  functionName.indexOf(" ") === -1
                      ? functionName
                      : functionName.substring(0, functionName.indexOf(' ')),
            },
          } as ExperimentRecord
        }
      );
    }

    return sessions
      .filter((s) => s.id === activeTab && s.presenterData.length > 0)
      .flatMap((s) => s.presenterData);
  }, [isExternalData, userExternalFiles, sessions, activeTab]);

  const SessionRow = ({ session }: { session: TestSession }) => {
    const getTrialsCount = (): number | null => {
      if ("trials" in session.config) {
        return session.config.trials;
      }
      return null;
    };

    return (
      <div
        onClick={() => runPresenter(session)}
        className={cn(
          "group flex items-center justify-between p-3 rounded-md border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800 hover:border-neutral-700 transition-all cursor-pointer mb-2",
          session.status === "completed" && "hover:border-green-800/50"
        )}
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-neutral-200 text-sm">
              {session.name}
            </span>
            <SessionStatusBadge status={session.status} />
            {getTrialsCount() && getTrialsCount()! > 1 && (
              <Badge
                variant="outline"
                className="bg-orange-950/30 text-orange-400 border-orange-800 text-xs"
              >
                {getTrialsCount()} trials
              </Badge>
            )}
          </div>
          {session.status === "completed" && (
            <div className="text-xs text-neutral-500 flex flex-col gap-1">
              {session.mode === "multi" && session.result?.type === "multi" && (
                <>
                  <span>
                    Benchmark function:{" "}
                    {(session.result as MultiTestResult).benchmarkFunction}
                  </span>
                  <div>
                    <span>Compared algorithms: </span>
                    <div className={"inline-flex items-center gap-1"}>
                      {(session.result as MultiTestResult).results
                        .sort((a, b) => a.algorithm.localeCompare(b.algorithm))
                        .map((r, index) => (
                          <div key={`${r.algorithm}-${index}`}>
                            {r.algorithm}
                            {index <
                              (session.result as MultiTestResult).results
                                .length -
                                1 && <span> •</span>}
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              )}

              {session.mode === "multi" &&
                session.result?.type === "function-comparison" && (
                  <>
                    <span>
                      Algorithm:{" "}
                      {(session.result as FunctionComparisonResult).algorithm}
                    </span>
                    <div>
                      <span>Compared functions: </span>
                      <div className={"inline-flex items-center gap-1"}>
                        {(session.result as FunctionComparisonResult).results
                          .sort((a, b) =>
                            a.benchmarkFunction.localeCompare(
                              b.benchmarkFunction
                            )
                          )
                          .map((r, index) => (
                            <div key={`${r.benchmarkFunction}-${index}`}>
                              {r.benchmarkFunction}
                              {index <
                                (session.result as FunctionComparisonResult)
                                  .results.length -
                                  1 && <span> •</span>}
                            </div>
                          ))}
                      </div>
                    </div>
                  </>
                )}

              {session.mode === "single" && (
                <>
                  <span>
                    Algorithm: {(session.result as SingleTestResult).algorithm}
                  </span>
                  <span>
                    Benchmark function:{" "}
                    {(session.result as SingleTestResult).benchmarkFunction}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="text-neutral-600 group-hover:text-neutral-300 transition-colors">
          {session.status === "completed" ? (
            <PlayCircle className="h-5 w-5" />
          ) : (
            <ChevronRight className="h-5 w-5" />
          )}
        </div>
      </div>
    );
  };

  return (
    <Card
      className={`bg-neutral-900 border-neutral-800 h-full overflow-hidden flex flex-col sm:max-w-7xl ${
        currentTest ? "" : "p-0"
      }`}
    >
      {currentTest ? (
        <div className="grid lg:grid-cols-2 grid-cols-1 h-full gap-2 p-2">
          <Container className={"flex flex-col gap-2 p-2"}>
            {/*<button>Back</button>*/}

            <TestsPreview
              isRunning={animationStatus.isRunning}
              tests={displayedTests}
              onTestChange={setCurrentTest}
            />
            <CanvasConfigConfigure
              isRunning={animationStatus.isRunning}
              config={canvasConfig}
              updateConfig={setCanvasConfig}
              iterations={currentTest.properties.iterations}
            />
          </Container>
          <Container>
            <GwoCanvas
              key={currentTest.description + (isExternalData ? "-ext" : "-int")}
              properties={currentTest.properties}
              iteration={currentIteration}
              onAnimationPause={pauseAnimation}
              onAnimationStart={startAnimation}
              onIterationChange={changeIteration}
              animationStatus={animationStatus}
              options={canvasConfig}
            />
          </Container>
        </div>
      ) : (
        <div className="flex h-full sm:flex-row flex-col">
          <div className="flex-1 flex flex-col h-full min-w-[400px] border-neutral-800 border-r">
            <div className="p-6 pb-2 space-y-1">
              <CardTitle className="text-2xl text-white">
                Session History
              </CardTitle>
              <CardDescription className="text-neutral-400">
                Select a completed session to visualize results or configure a
                draft.
              </CardDescription>
            </div>

            <ScrollArea className="flex-1 px-6 py-4">
              <div className="mb-6">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-300 mb-3 px-1">
                  <Activity className="h-4 w-4 text-blue-400" />
                  Single Optimization Tests
                  <span className="text-neutral-600 font-normal ml-auto text-xs">
                    {singleTests.length} sessions
                  </span>
                </h3>
                {singleTests.length > 0 ? (
                  singleTests.map((session) => (
                    <SessionRow key={session.id} session={session} />
                  ))
                ) : (
                  <div className="text-center py-8 border border-dashed border-neutral-800 rounded-md text-neutral-500 text-sm">
                    No single tests found.
                  </div>
                )}
              </div>

              <div className="mb-6">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-300 mb-3 px-1">
                  <BarChart3 className="h-4 w-4 text-purple-400" />
                  Comparative Analysis
                  <span className="text-neutral-600 font-normal ml-auto text-xs">
                    {multiTests.length} sessions
                  </span>
                </h3>
                {multiTests.length > 0 ? (
                  multiTests.map((session) => (
                    <SessionRow key={session.id} session={session} />
                  ))
                ) : (
                  <div className="text-center py-8 border border-dashed border-neutral-800 rounded-md text-neutral-500 text-sm">
                    No comparison tests found.
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="sm:w-[350px] bg-neutral-900/50 p-6 flex flex-col border-b border-neutral-800 h-fit sm:items-start items-center w-full">
            <div className="mb-6 space-y-1">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <FileJson className="h-5 w-5 text-neutral-400" />
                Load External Data
              </h3>
              <p className="text-sm text-neutral-500">
                Drag & drop JSON result files here to visualize them without
                saving to session history.
              </p>
            </div>

            <div className="flex flex-col justify-center">
              <TestFileUploader onSingleFileLoaded={handleSingleFileLoaded} />
            </div>

            <InfoBanner className="mt-6" title="Information">
              Completed sessions are automatically saved in your browser's
              storage. Use the uploader only for imported data.
            </InfoBanner>
          </div>
        </div>
      )}
    </Card>
  );
};

export default Presenter;
