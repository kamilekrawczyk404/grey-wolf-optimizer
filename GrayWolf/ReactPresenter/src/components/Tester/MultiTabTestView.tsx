import { useEffect, useRef, useState } from "react";
import { useTestStore } from "@/stores/test-store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { toast } from "sonner";
import { TestConfigurationForm } from "./TestConfigurationForm";
import { RunningTestView } from "./RunningTestView";
import { TestResultsDialog } from "./TestResultsDialog";

export function MultiTabTestRunner() {
    const {
        sessions: testSessions,
        activeTab,
        setActiveTab,
        addSession,
        removeSession,
    } = useTestStore();

    const [editingTabId, setEditingTabId] = useState<string | null>(null);
    const [editingTabName, setEditingTabName] = useState("");
    const [showResultsDialog, setShowResultsDialog] = useState(false);
    const activeTabRef = useRef<HTMLButtonElement>(null);
    const editInputRef = useRef<HTMLInputElement>(null);
    const shownDialogsRef = useRef<Set<string>>(new Set());

    const activeSession = testSessions.find((s) => s.id === activeTab);

    // Initialize activeTab on mount
    useEffect(() => {
        if (!activeTab && testSessions.length > 0) {
            setActiveTab(testSessions[0].id);
        }
    }, [activeTab, testSessions, setActiveTab]);

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

    const addNewTestSession = () => {
        addSession();
    };

    const removeTestSession = (id: string) => {
        if (testSessions.length === 1) {
            toast.error("Cannot remove the last test session");
            return;
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
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
                {/* Tab Navigation */}
                <div className="flex items-center gap-2">
                    {/* Previous Tab Button */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => navigateTab("prev")}
                                disabled={testSessions.findIndex((s) => s.id === activeTab) === 0}
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
                            {testSessions.map((session) => (
                                <TabsTrigger
                                    key={session.id}
                                    value={session.id}
                                    className="relative group data-[state=active]:bg-neutral-700 whitespace-nowrap"
                                    ref={session.id === activeTab ? activeTabRef : null}
                                    onDoubleClick={() =>
                                        handleTabDoubleClick(session.id, session.name)
                                    }
                                >
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
                                        <>
                                            <span className="text-white">{session.name}</span>

                                            {/* Running indicator */}
                                            {session.status === "running" && (
                                                    <Loader2 className="h-3 w-3 animate-spin text-blue-400" />
                                            )}

                                            {/* Completion indicator */}
                                            {(session.status === "completed" ||
                                                session.status === "error") &&
                                                !session.resultsSeen && (
                                                        session.status === "completed" ? (
                                                            <CheckCircle2 className="h-3 w-3 text-green-400" />
                                                        ) : (
                                                            <XCircle className="h-3 w-3 text-red-400" />
                                                        )
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
                                        </>
                                    )}
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
                                onClick={addNewTestSession}
                                className="bg-neutral-800 border-neutral-700 text-white hover:bg-neutral-700 flex-shrink-0"
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>New Tab</TooltipContent>
                    </Tooltip>
                </div>

                {/* Tab Content */}
                {testSessions.map((session) => (
                    <TabsContent key={session.id} value={session.id} className="mt-0">
                        {session.status === "running" ? (
                            <RunningTestView session={session} />
                        ) : (
                            <TestConfigurationForm session={session} />
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
            </div >
        </TooltipProvider>
    );
}