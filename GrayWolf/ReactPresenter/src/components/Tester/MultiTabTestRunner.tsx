import React, { useEffect, useMemo, useRef, useState } from "react";
import { TestMode, useTestStore } from "@/stores/test-store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  BarChart3,
  Activity,
  CirclePause,
  FlaskConical,
} from "lucide-react";
import { toast } from "sonner";
import { TestConfigurationForm } from "./TestConfigurationForm";
import { RunningTestView } from "./RunningTestView";
import { TestResultsDialog } from "./TestResultsDialog";
import { MultiAlgorithmConfigurationForm } from "@/components/Tester/MultiAlgorithmConfigurationForm";
import { NavigationTab, useNavigationStore } from "@/stores/navigation-store";
import { MultiFunctionConfigurationForm } from "./MultiFunctionConfigurationForm";

export function MultiTabTestRunner() {
  const {
    sessions: testSessions,
    activeTab,
    setActiveTab,
    addSession,
    removeSession,
    syncCheckpoints,
    cancelSession,
    setMultiTestMode,
  } = useTestStore();

  const { activeNavigationTab } = useNavigationStore();

  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTabName, setEditingTabName] = useState("");
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const activeTabRef = useRef<HTMLButtonElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const shownDialogsRef = useRef<Set<string>>(new Set());

  const filteredSessions = useMemo(
    () =>
      testSessions.filter((s) => {
        if (activeNavigationTab === NavigationTab.Test)
          return s.mode === "single";
        else if (activeNavigationTab === NavigationTab.Comparison)
          return s.mode === "multi";
      }),
    [activeNavigationTab, testSessions]
  );

  const activeSession = testSessions.find((s) => s.id === activeTab);

  // Initialize activeTab on mount
  useEffect(() => {
    const isCurrentTabVisible = filteredSessions.some(
      (s) => s.id === activeTab
    );

    if (isCurrentTabVisible) return;

    if (filteredSessions.length > 0) {
      setActiveTab(filteredSessions[0].id);
    }
  }, [activeNavigationTab, filteredSessions, activeTab, setActiveTab]);

  // Auto-scroll to active tab
  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [activeTab]);

  // Auto-focus edit input
  useEffect(() => {
    if (editingTabId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingTabId]);

  // Show results dialog when test completes
  useEffect(() => {
    const session = testSessions.find((s) => s.id === activeTab);

    console.log("Dialog check:", {
      sessionId: session?.id,
      sessionName: session?.name,
      status: session?.status,
      resultType: session?.result?.type,
      resultsSeen: session?.resultsSeen,
      endTime: session?.endTime,
      hasResult: !!session?.result,
      hasInCache: session?.endTime
        ? shownDialogsRef.current.has(`${session?.id}-${session?.endTime}`)
        : false,
    });

    if (
      session &&
      (session.status === "completed" ||
        session.status === "error" ||
        session.status === "cancelled") &&
      !session.resultsSeen &&
      session.endTime &&
      !shownDialogsRef.current.has(`${session.id}-${session.endTime}`)
    ) {
      setShowResultsDialog(true);
      shownDialogsRef.current.add(`${session.id}-${session.endTime}`);
    }
  }, [activeTab, testSessions]);

  // Cleanup removed sessions from shown dialogs
  useEffect(() => {
    const currentSessionIds = new Set(testSessions.map((s) => s.id));
    const toRemove: string[] = [];

    shownDialogsRef.current.forEach((key) => {
      const sessionId = key.split("-")[0];
      if (!currentSessionIds.has(sessionId)) {
        toRemove.push(key);
      }
    });

    toRemove.forEach((key) => shownDialogsRef.current.delete(key));
  }, [testSessions]);

  useEffect(() => {
    syncCheckpoints();
  }, []);

  const addNewTestSession = (mode: TestMode) => {
    addSession(mode);
  };

  const removeTestSession = async (id: string) => {
    if (testSessions.length === 1) {
      toast.error("Cannot remove the last test session");
      return;
    }

    const sessionToRemove = testSessions.find((s) => s.id === id);

    if (sessionToRemove?.status === "running") {
      console.log(`Cancelling running test before removal: ${id}`);
      cancelSession(id);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Dla multi-test usuń WSZYSTKIE checkpointy z tym runId (mogą być checkpointy wielu algorytmów)
    if (sessionToRemove?.runId) {
      try {
        const checkResponse = await fetch(
          "http://localhost:5000/api/optimizer/checkpoints"
        );

        if (checkResponse.ok) {
          const checkpoints = await checkResponse.json();

          const checkpointsToDelete = checkpoints.filter(
            (cp: any) => cp.runId === sessionToRemove.runId
          );

          console.log(
            `Found ${checkpointsToDelete.length} checkpoint(s) for runId ${sessionToRemove.runId}:`,
            checkpointsToDelete.map((cp: any) => cp.algorithm)
          );

          for (const checkpoint of checkpointsToDelete) {
            try {
              const deleteResponse = await fetch(
                `http://localhost:5000/api/optimizer/checkpoint/${checkpoint.runId}`,
                { method: "DELETE" }
              );

              if (deleteResponse.ok) {
                console.log(
                  `Deleted checkpoint for algorithm ${checkpoint.algorithm}: ${checkpoint.runId}`
                );
              } else {
                console.warn(
                  `Failed to delete checkpoint for ${checkpoint.algorithm}`
                );
              }
            } catch (err) {
              console.error(
                `Failed to delete checkpoint for ${checkpoint.algorithm}:`,
                err
              );
            }
          }

          if (checkpointsToDelete.length === 0) {
            console.log(
              `No checkpoints found for runId ${sessionToRemove.runId} (already cleaned up)`
            );
          }
        }
      } catch (err) {
        console.error(
          `Failed to check/delete checkpoints for ${sessionToRemove.runId}:`,
          err
        );
      }
    }

    removeSession(id);
  };

  const navigateTab = (direction: "prev" | "next") => {
    const currentIndex = testSessions.findIndex((s) => s.id === activeTab);

    if (direction === "prev" && currentIndex > 0) {
      setActiveTab(testSessions[currentIndex - 1].id);
    } else if (direction === "next" && currentIndex < testSessions.length - 1) {
      setActiveTab(testSessions[currentIndex + 1].id);
    }
  };

  const handleTabDoubleClick = (sessionId: string, currentName: string) => {
    setEditingTabId(sessionId);
    setEditingTabName(currentName);
  };

  const handleTabNameSubmit = () => {
    if (editingTabId && editingTabName.trim()) {
      useTestStore.getState().updateSession(editingTabId, {
        name: editingTabName.trim(),
      });
    }
    setEditingTabId(null);
    setEditingTabName("");
  };

  const handleTabNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleTabNameSubmit();
    } else if (e.key === "Escape") {
      setEditingTabId(null);
      setEditingTabName("");
    }
  };

  return (
    <TooltipProvider>
      <div className="container mx-auto p-8 max-w-2xl">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full space-y-4"
        >
          {/* Tab Navigation */}
          <div className="flex items-center gap-2">
            {/* Previous Tab Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateTab("prev")}
                  disabled={
                    filteredSessions.findIndex((s) => s.id === activeTab) === 0
                  }
                  className="bg-neutral-800 border-neutral-700 text-white hover:bg-neutral-700 flex-shrink-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Previous Tab</TooltipContent>
            </Tooltip>

            {/* Scrollable Tab List */}
            <ScrollArea className="flex-1 min-w-0">
              <TabsList className="inline-flex w-auto bg-neutral-800 h-auto">
                {filteredSessions.map((session) => (
                  <TabsTrigger
                    key={session.id}
                    value={session.id}
                    className="relative group data-[state=active]:bg-neutral-700 whitespace-nowrap"
                    ref={session.id === activeTab ? activeTabRef : null}
                    onDoubleClick={() =>
                      handleTabDoubleClick(session.id, session.name)
                    }
                  >
                    <div className={"flex items-center gap-2"}>
                      {session.mode === "multi" ? (
                        session.multiTestMode === "functions" ? (
                          <FlaskConical className={"h-3 w-3 text-cyan-400"} />
                        ) : (
                          <BarChart3 className={"h-3 w-3 text-purple-400"} />
                        )
                      ) : (
                        <Activity className={"h-3 w-3 text-blue-400"} />
                      )}

                      {editingTabId === session.id ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editingTabName}
                          onChange={(e) => setEditingTabName(e.target.value)}
                          onBlur={handleTabNameSubmit}
                          onKeyDown={handleTabNameKeyDown}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-transparent border-b border-primary outline-none w-24 px-1 text-white"
                        />
                      ) : (
                        <span className="text-white">{session.name}</span>
                      )}
                    </div>

                    <div className={"flex items-center"}>
                      {/* Running indicator */}
                      {session.status === "running" && (
                        <Loader2 className="h-3 w-3 animate-spin text-blue-400" />
                      )}

                      {/* Completion indicator */}
                      {(session.status === "completed" ||
                        session.status === "error") &&
                        !session.resultsSeen &&
                        (session.status === "completed" ? (
                          <CheckCircle2 className="h-3 w-3 text-green-400" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-400" />
                        ))}

                      {/* Resume available */}
                      {session.status === "idle" && session.runId && (
                        <CirclePause className="h-3 w-3 text-orange-200" />
                      )}

                      {/* Close button */}
                      {testSessions.length > 1 && (
                        <span
                          role="button"
                          tabIndex={0}
                          className="ml-2 h-5 w-5 md:opacity-0 md:group-hover:opacity-100 transition-opacity inline-flex items-center justify-center rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeTestSession(session.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.stopPropagation();
                              e.preventDefault();
                              removeTestSession(session.id);
                            }
                          }}
                        >
                          <X className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>

            {/* Next Tab Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateTab("next")}
                  disabled={
                    testSessions.findIndex((s) => s.id === activeTab) ===
                    testSessions.length - 1
                  }
                  className="bg-neutral-800 border-neutral-700 text-white hover:bg-neutral-700 flex-shrink-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Next Tab</TooltipContent>
            </Tooltip>

            {/* Add New Tab Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    addNewTestSession(
                      activeNavigationTab === NavigationTab.Test
                        ? "single"
                        : "multi"
                    )
                  }
                  className="bg-neutral-800 border-neutral-700 text-white hover:bg-neutral-700 flex-shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New Tab</TooltipContent>
            </Tooltip>
          </div>

          {/* Tab Content */}
          {filteredSessions.map((session) => (
            <TabsContent key={session.id} value={session.id} className="mt-0">
              {session.status === "running" ? (
                <RunningTestView session={session} />
              ) : session.mode === "single" ? (
                <TestConfigurationForm session={session} />
              ) : (
                <Tabs
                  value={session.multiTestMode || "algorithms"}
                  onValueChange={(v) =>
                    setMultiTestMode(
                      session.id,
                      v as "algorithms" | "functions"
                    )
                  }
                >
                  {(() => {
                    const canResume = !!(
                      session.runId && session.status === "idle"
                    );

                    return (
                      <>
                        <TabsList className="grid w-full grid-cols-2 bg-neutral-800 mb-4">
                          <TabsTrigger
                            value="algorithms"
                            disabled={canResume}
                            className="data-[state=active]:bg-purple-600 data-[state=active]:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <BarChart3 className="h-4 w-4 mr-2" />
                            Compare Algorithms
                          </TabsTrigger>
                          <TabsTrigger
                            value="functions"
                            disabled={canResume}
                            className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <FlaskConical className="h-4 w-4 mr-2" />
                            Compare Functions
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="algorithms">
                          <MultiAlgorithmConfigurationForm session={session} />
                        </TabsContent>

                        <TabsContent value="functions">
                          <MultiFunctionConfigurationForm session={session} />
                        </TabsContent>
                      </>
                    );
                  })()}
                </Tabs>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Results Dialog */}
        <TestResultsDialog
          open={showResultsDialog}
          onOpenChange={setShowResultsDialog}
          session={activeSession}
        />
      </div>
    </TooltipProvider>
  );
}
