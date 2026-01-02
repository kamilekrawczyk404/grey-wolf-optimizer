# Multi-Tab Test Session Management System - Documentation

## Overview

This document describes a comprehensive React-based multi-tab test session management system designed for running independent metaheuristic algorithm tests in parallel. The system uses Zustand for global state management and provides an intuitive tabbed interface for managing multiple test configurations and results simultaneously.

## Table of Contents

1. Core Architecture
2. State Management
3. Key Implementation Patterns
4. Component Structure
5. User Interactions
6. Test Execution Flow
7. Results Management
8. Migration Guide

---

## Core Architecture

### Design Principles

- **Independent Sessions**: Each tab maintains isolated configuration and results
- **Persistent State**: Sessions survive page reloads (except running states)
- **Real-time Updates**: Live progress tracking for running tests
- **User-Friendly**: Intuitive navigation with keyboard shortcuts and visual feedback
- **Safe Operations**: Prevents data loss with automatic form saving

### Technology Stack

```typescript
- Zustand (with persist middleware) - Global state management
- React Hook Form + Zod - Form validation and management
- Radix UI Components - Accessible UI primitives
- TypeScript - Type safety
```

---

## State Management

### 1. Test Session Structure

```typescript
interface TestSession {
  id: string; // Unique session identifier (UUID)
  name: string; // User-editable session name
  config: TestFormValues; // Complete test configuration
  status: SessionStatus; // Current session state
  results: TestResult[]; // Accumulated test results
  startTime?: number; // Test execution start timestamp
  endTime?: number; // Test completion timestamp
  currentTest: number; // Index of currently running test
  totalTests: number; // Total number of tests in session
  resultsSeen: boolean; // Whether user viewed results dialog
  abortController?: AbortController; // For cancelling running tests
}

type SessionStatus = "idle" | "running" | "completed" | "error" | "cancelled";

interface TestResult {
  test_name: string;
  duration: number; // Execution time in seconds
  passed: boolean;
  score?: number;
}

interface TestFormValues {
  input_type: "algorithm" | "custom_bits";
  rng_id?: string;
  custom_bits?: string;
  test_type: "single" | "nist_suite" | "diehard_suite";
  single_test?: string;
  nist_tests?: string[];
  diehard_tests?: string[];
  samples_count: number;
  seed: number;
}
```

### 2. Zustand Store Implementation

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface TestStore {
  sessions: TestSession[];
  activeTab: string;

  // Session Management
  addSession: () => void;
  removeSession: (id: string) => void;
  updateSession: (id: string, updates: Partial<TestSession>) => void;
  setActiveTab: (id: string) => void;

  // Configuration Management
  updateSessionConfig: (id: string, config: TestFormValues) => void;

  // Execution Control
  setSessionStatus: (
    id: string,
    status: SessionStatus,
    updates?: object
  ) => void;
  incrementCurrentTest: (id: string) => void;
  cancelSession: (id: string) => void;

  // Results Management
  addTestResult: (id: string, result: TestResult) => void;
  markResultsSeen: (id: string) => void;
}

export const useTestStore = create<TestStore>()(
  persist(
    (set, get) => ({
      sessions: [
        {
          id: crypto.randomUUID(),
          name: "Test Session 1",
          config: getDefaultConfig(),
          status: "idle",
          results: [],
          currentTest: 0,
          totalTests: 0,
          resultsSeen: true,
        },
      ],
      activeTab: "",

      addSession: () => {
        const newSession: TestSession = {
          id: crypto.randomUUID(),
          name: `Test Session ${get().sessions.length + 1}`,
          config: getDefaultConfig(),
          status: "idle",
          results: [],
          currentTest: 0,
          totalTests: 0,
          resultsSeen: true,
        };

        set((state) => ({
          sessions: [...state.sessions, newSession],
          activeTab: newSession.id,
        }));
      },

      removeSession: (id: string) => {
        const sessions = get().sessions;
        if (sessions.length === 1) {
          console.warn("Cannot remove last session");
          return;
        }

        const filtered = sessions.filter((s) => s.id !== id);
        const wasActive = get().activeTab === id;

        set({
          sessions: filtered,
          activeTab: wasActive ? filtered[0].id : get().activeTab,
        });
      },

      updateSession: (id: string, updates: Partial<TestSession>) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        }));
      },

      setActiveTab: (id: string) => set({ activeTab: id }),

      updateSessionConfig: (id: string, config: TestFormValues) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? { ...s, config } : s
          ),
        }));
      },

      setSessionStatus: (id: string, status: SessionStatus, updates = {}) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id
              ? {
                  ...s,
                  status,
                  ...updates,
                  abortController:
                    status === "running" ? new AbortController() : undefined,
                }
              : s
          ),
        }));
      },

      incrementCurrentTest: (id: string) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? { ...s, currentTest: s.currentTest + 1 } : s
          ),
        }));
      },

      cancelSession: (id: string) => {
        const session = get().sessions.find((s) => s.id === id);
        session?.abortController?.abort();

        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id
              ? {
                  ...s,
                  status: "cancelled",
                  endTime: Date.now(),
                  abortController: undefined,
                }
              : s
          ),
        }));
      },

      addTestResult: (id: string, result: TestResult) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? { ...s, results: [...s.results, result] } : s
          ),
        }));
      },

      markResultsSeen: (id: string) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? { ...s, resultsSeen: true } : s
          ),
        }));
      },
    }),
    {
      name: "test-sessions-storage",
      partialize: (state) => ({
        sessions: state.sessions.map((s) => ({
          ...s,
          status: "idle", // Reset status on reload
          abortController: undefined, // Remove non-serializable
        })),
        activeTab: state.activeTab,
      }),
    }
  )
);

function getDefaultConfig(): TestFormValues {
  return {
    input_type: "algorithm",
    rng_id: "",
    custom_bits: "",
    test_type: "single",
    single_test: "frequency_test",
    nist_tests: [],
    diehard_tests: [],
    samples_count: 100000,
    seed: 42,
  };
}
```

---

## Key Implementation Patterns

### 1. Form Synchronization Pattern

**Problem**: Multiple tabs with separate forms need to maintain independent state while sharing a single React Hook Form instance.

**Solution**: Synchronize form state with store on tab switches and debounce auto-save.

```typescript
const form = useForm<TestFormValues>({
  resolver: zodResolver(testFormSchema),
  defaultValues: activeSession?.config,
});

const previousTabRef = useRef<string>(activeTab);

// Reset form when switching tabs
useEffect(() => {
  if (previousTabRef.current !== activeTab && activeSession) {
    requestAnimationFrame(() => {
      form.reset(activeSession.config, {
        keepDefaultValues: false,
      });
    });
    previousTabRef.current = activeTab;
  }
}, [activeTab, activeSession]);

// Debounced auto-save
useEffect(() => {
  const handler = setTimeout(() => {
    if (activeSession) {
      const values = form.getValues();
      updateSessionConfig(activeTab, values);
    }
  }, 500);

  return () => clearTimeout(handler);
}, [
  form.watch("input_type"),
  form.watch("test_type"),
  form.watch("samples_count"),
  // ... other watched fields
]);

// Save before switching tabs
const navigateTab = (direction: "prev" | "next") => {
  const currentFormData = form.getValues();
  updateSessionConfig(activeTab, currentFormData);

  const currentIndex = testSessions.findIndex((s) => s.id === activeTab);
  // ... navigation logic
};
```

**Key Points**:

- Use `requestAnimationFrame` for form reset to avoid React rendering conflicts
- Always save current form data before switching tabs
- Debounce auto-save to prevent excessive updates
- Track previous tab to detect actual switches

### 2. Conditional Form Rendering

**Problem**: Multiple forms with same field names cause React Hook Form conflicts.

**Solution**: Only render the active tab's form.

```typescript
{
  testSessions.map((session) => (
    <TabsContent key={session.id} value={session.id}>
      {session.status === "running" ? (
        <RunningTestsView session={session} />
      ) : (
        <Card>
          <CardContent>
            {/* Only render form for active tab */}
            {session.id === activeTab && (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  {/* Form fields */}
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      )}
    </TabsContent>
  ));
}
```

### 3. Results Dialog Management

**Problem**: Prevent showing the same results dialog multiple times when switching tabs.

**Solution**: Track shown dialogs with session ID and end time combination.

```typescript
const shownDialogsRef = useRef<Set<string>>(new Set());

useEffect(() => {
  const session = testSessions.find((s) => s.id === activeTab);

  if (
    session &&
    (session.status === "completed" || session.status === "error") &&
    !session.resultsSeen &&
    !shownDialogsRef.current.has(`${session.id}-${session.endTime}`)
  ) {
    setShowResultsDialog(true);
    if (session.endTime) {
      shownDialogsRef.current.add(`${session.id}-${session.endTime}`);
    }
  }
}, [activeTab, testSessions]);

// Cleanup removed sessions
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
```

### 4. Editable Tab Names

**Problem**: Users need ability to rename test sessions for better organization.

**Solution**: Double-click to edit with inline input.

```typescript
const [editingTabId, setEditingTabId] = useState<string | null>(null);
const [editingTabName, setEditingTabName] = useState("");
const editInputRef = useRef<HTMLInputElement>(null);

// Auto-focus and select on edit
useEffect(() => {
  if (editingTabId && editInputRef.current) {
    editInputRef.current.focus();
    editInputRef.current.select();
  }
}, [editingTabId]);

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

// In JSX
<TabsTrigger
  onDoubleClick={() => handleTabDoubleClick(session.id, session.name)}
>
  {editingTabId === session.id ? (
    <input
      ref={editInputRef}
      value={editingTabName}
      onChange={(e) => setEditingTabName(e.target.value)}
      onBlur={handleTabNameSubmit}
      onKeyDown={handleTabNameKeyDown}
      onClick={(e) => e.stopPropagation()}
    />
  ) : (
    <span>{session.name}</span>
  )}
</TabsTrigger>;
```

### 5. Auto-scroll Active Tab

**Problem**: Active tab may be off-screen in scrollable tab bar.

**Solution**: Auto-scroll to active tab on change.

```typescript
const activeTabRef = useRef<HTMLButtonElement>(null);

useEffect(() => {
  if (activeTabRef.current) {
    activeTabRef.current.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }
}, [activeTab]);

// In JSX
<TabsTrigger
  ref={session.id === activeTab ? activeTabRef : null}
  value={session.id}
>
  {/* Tab content */}
</TabsTrigger>;
```

### 6. Preventing Last Tab Removal

**Problem**: Application must always have at least one session.

**Solution**: Check session count before removal.

```typescript
const removeTestSession = (id: string) => {
  if (testSessions.length === 1) {
    toast.error("Cannot remove the last test session");
    return;
  }

  removeSession(id);
};
```

---

## Component Structure

### 1. Tab Navigation Bar

```tsx
<div className="flex items-center gap-2 mb-4">
  {/* Previous Tab Button */}
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="outline"
        size="icon"
        onClick={() => navigateTab("prev")}
        disabled={testSessions.findIndex((s) => s.id === activeTab) === 0}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>Previous Tab</TooltipContent>
  </Tooltip>

  {/* Scrollable Tab List */}
  <ScrollArea className="flex-1 min-w-0 w-full">
    <TabsList className="inline-flex w-auto">
      {testSessions.map((session) => (
        <TabsTrigger
          key={session.id}
          value={session.id}
          className="relative group"
          ref={session.id === activeTab ? activeTabRef : null}
          onDoubleClick={() => handleTabDoubleClick(session.id, session.name)}
        >
          {/* Editable name or status badges */}
          {editingTabId === session.id ? (
            <input /* ... */ />
          ) : (
            <>
              <span>{session.name}</span>

              {/* Running indicator */}
              {session.status === "running" && (
                <Badge variant="secondary">
                  <Loader2 className="h-3 w-3 animate-spin" />
                </Badge>
              )}

              {/* Completion indicator */}
              {(session.status === "completed" || session.status === "error") &&
                !session.resultsSeen && (
                  <Badge variant="secondary">
                    {session.status === "completed" ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    ) : (
                      <XCircle className="h-3 w-3 text-destructive" />
                    )}
                  </Badge>
                )}

              {/* Close button */}
              {testSessions.length > 1 && (
                <span
                  role="button"
                  className="ml-2 md:opacity-0 md:group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTestSession(session.id);
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
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>Next Tab</TooltipContent>
  </Tooltip>

  {/* Add New Tab Button */}
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="outline" size="icon" onClick={addNewTestSession}>
        <Plus className="h-4 w-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>New Tab</TooltipContent>
  </Tooltip>
</div>
```

### 2. Running Tests View

```tsx
{
  session.status === "running" && (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Running Tests
          </div>
          <Button variant="destructive" size="sm" onClick={cancelTests}>
            <X className="h-4 w-4" />
            Cancel
          </Button>
        </CardTitle>
        <CardDescription>
          Test {session.currentTest} of {session.totalTests}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>
              {Math.round((session.currentTest / session.totalTests) * 100)}%
            </span>
          </div>
          <Progress value={(session.currentTest / session.totalTests) * 100} />
        </div>

        {/* Elapsed Time */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>
            Elapsed:{" "}
            {session.startTime ? formatElapsedTime(session.startTime) : "0:00"}
          </span>
        </div>

        {/* Live Results */}
        {session.results.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Test Results</h4>
            <ScrollArea className="h-48 border rounded-md">
              <div className="p-4 space-y-2">
                {session.results.map((result, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      {result.passed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                      <span className="text-sm font-medium">
                        {formatTestName(result.test_name)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{result.duration.toFixed(2)}s</span>
                      {result.score !== undefined && (
                        <Badge variant="outline">
                          {result.score.toFixed(2)}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### 3. Results Summary Dialog

```tsx
<Dialog
  open={showResultsDialog}
  onOpenChange={(open) => {
    if (!open) handleDialogAction();
    setShowResultsDialog(open);
  }}
>
  <DialogContent className="max-w-2xl max-h-[80vh]">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        {completedSession?.status === "completed" ? (
          <>
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Tests Completed
          </>
        ) : completedSession?.status === "cancelled" ? (
          <>
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            Tests Cancelled
          </>
        ) : (
          <>
            <XCircle className="h-5 w-5 text-destructive" />
            Tests Failed
          </>
        )}
      </DialogTitle>
      <DialogDescription>
        {completedSession?.status === "completed"
          ? `All tests executed successfully for ${completedSession?.name}`
          : `Some tests encountered errors for ${completedSession?.name}`}
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-4">
      {/* Summary Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">
                {passedCount}
              </div>
              <div className="text-sm text-muted-foreground">Passed</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">
                {failedCount}
              </div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{totalTime}s</div>
              <div className="text-sm text-muted-foreground">Total Time</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Results List */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Test Results</h4>
        <ScrollArea className="h-[300px] border rounded-md">
          <div className="p-4 space-y-2">
            {completedSession?.results.map((result, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-md bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  {result.passed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {formatTestName(result.test_name)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {result.duration.toFixed(2)}s
                    </span>
                  </div>
                </div>
                {result.score !== undefined && (
                  <Badge variant="outline">
                    Score: {result.score.toFixed(4)}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>

    <DialogFooter>
      <Button variant="outline" onClick={handleDialogAction}>
        OK
      </Button>
      <Button asChild onClick={handleDialogAction}>
        <Link to="/results">View Results</Link>
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## User Interactions

### 1. Tab Management

**Creating New Tab**:

```typescript
const addNewTestSession = () => {
  // Save current tab first
  const currentFormData = form.getValues();
  updateSessionConfig(activeTab, currentFormData);

  // Add new session (store handles details)
  addSession();
};
```

**Removing Tab**:

```typescript
const removeTestSession = (id: string) => {
  if (testSessions.length === 1) {
    toast.error("Cannot remove the last test session");
    return;
  }

  removeSession(id);
  // Store automatically switches to first remaining tab
};
```

**Navigating Between Tabs**:

```typescript
const navigateTab = (direction: "prev" | "next") => {
  // Always save before switching
  const currentFormData = form.getValues();
  updateSessionConfig(activeTab, currentFormData);

  const currentIndex = testSessions.findIndex((s) => s.id === activeTab);

  if (direction === "prev" && currentIndex > 0) {
    setActiveTab(testSessions[currentIndex - 1].id);
  } else if (direction === "next" && currentIndex < testSessions.length - 1) {
    setActiveTab(testSessions[currentIndex + 1].id);
  }
};
```

**Renaming Tab**:

- Double-click tab to enter edit mode
- Type new name
- Press Enter to save or Escape to cancel
- Click outside to auto-save

### 2. Keyboard Shortcuts

| Key                    | Action         |
| ---------------------- | -------------- |
| Double-click tab       | Edit tab name  |
| Enter (while editing)  | Save tab name  |
| Escape (while editing) | Cancel editing |
| Click arrows           | Navigate tabs  |
| Click X on tab         | Close tab      |

---

## Test Execution Flow

### 1. Starting Tests

```typescript
const onSubmit = async (values: TestFormValues) => {
  const session = testSessions.find((s) => s.id === activeTab);
  if (!session) return;

  // Calculate total tests
  let totalTests = 0;
  if (values.test_type === "single") {
    totalTests = 1;
  } else if (values.test_type === "nist_suite") {
    totalTests = values.nist_tests?.length || 0;
  } else if (values.test_type === "diehard_suite") {
    totalTests = values.diehard_tests?.length || 0;
  }

  // Initialize running state
  setSessionStatus(activeTab, "running", {
    startTime: Date.now(),
    currentTest: 0,
    totalTests,
    results: [],
  });

  try {
    // Run tests sequentially
    if (values.test_type === "single" && values.single_test) {
      await runSingleTest(values, values.single_test, activeTab);
    } else if (values.test_type === "nist_suite" && values.nist_tests) {
      for (let i = 0; i < values.nist_tests.length; i++) {
        await runSingleTest(values, values.nist_tests[i], activeTab);
        incrementCurrentTest(activeTab);
      }
    } else if (values.test_type === "diehard_suite" && values.diehard_tests) {
      for (let i = 0; i < values.diehard_tests.length; i++) {
        await runSingleTest(values, values.diehard_tests[i], activeTab);
        incrementCurrentTest(activeTab);
      }
    }

    // Mark as completed
    setSessionStatus(activeTab, "completed", { endTime: Date.now() });

    // Show success toast
    const updatedSession = useTestStore
      .getState()
      .sessions.find((s) => s.id === activeTab);
    if (updatedSession) {
      const passed = updatedSession.results.filter((r) => r.passed).length;
      const failed = updatedSession.results.filter((r) => !r.passed).length;

      toast.success("Tests Completed", {
        description: `Passed: ${passed}, Failed: ${failed}`,
      });
    }
  } catch (error) {
    // Handle cancellation
    if (error instanceof Error && error.message === "Test cancelled") {
      toast.info("Tests cancelled");
      return;
    }

    // Handle errors
    setSessionStatus(activeTab, "error", { endTime: Date.now() });
    toast.error("Error", {
      description:
        error instanceof Error ? error.message : "Failed to run tests",
    });
  }
};
```

### 2. Running Individual Test

```typescript
const runSingleTest = async (
  values: TestFormValues,
  testName: string,
  sessionId: string
) => {
  const startTime = Date.now();

  // Get abort signal from session
  const session = useTestStore
    .getState()
    .sessions.find((s) => s.id === sessionId);
  const signal = session?.abortController?.signal;

  try {
    // API call with abort signal
    const response = await fetch("/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        test_name: testName,
        samples_count: values.samples_count,
        seed: values.seed,
      }),
      signal, // Pass abort signal
    });

    if (!response.ok) {
      throw new Error("Test execution failed");
    }

    const result = await response.json();
    const duration = (Date.now() - startTime) / 1000;

    // Add result to session
    addTestResult(sessionId, {
      test_name: testName,
      duration,
      passed: result.passed,
      score: result.score,
    });

    return result;
  } catch (error) {
    // Check if cancelled
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Test cancelled");
    }
    throw error;
  }
};
```

### 3. Cancelling Tests

```typescript
const cancelTests = () => {
  const { cancelSession } = useTestStore.getState();
  cancelSession(activeTab);
  toast.info("Tests cancelled");
};

// In store:
cancelSession: (id: string) => {
  const session = get().sessions.find((s) => s.id === id);
  session?.abortController?.abort(); // Abort fetch requests

  set((state) => ({
    sessions: state.sessions.map((s) =>
      s.id === id
        ? {
            ...s,
            status: "cancelled",
            endTime: Date.now(),
            abortController: undefined,
          }
        : s
    ),
  }));
};
```

### 4. Progress Updates

```typescript
// Real-time elapsed time formatting
const formatElapsedTime = (startTime: number) => {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

// Update UI every second (in component)
useEffect(() => {
  if (session?.status === "running" && session.startTime) {
    const interval = setInterval(() => {
      forceUpdate(); // Force re-render to update elapsed time
    }, 1000);

    return () => clearInterval(interval);
  }
}, [session?.status, session?.startTime]);
```

---

## Results Management

### 1. Automatic Dialog Display

```typescript
// Show dialog when tests complete
useEffect(() => {
  const session = testSessions.find((s) => s.id === activeTab);

  if (
    session &&
    (session.status === "completed" ||
      session.status === "error" ||
      session.status === "cancelled") &&
    !session.resultsSeen &&
    !shownDialogsRef.current.has(`${session.id}-${session.endTime}`)
  ) {
    setShowResultsDialog(true);
    if (session.endTime) {
      shownDialogsRef.current.add(`${session.id}-${session.endTime}`);
    }
  }
}, [activeTab, testSessions]);
```

### 2. Result Indicators

**Visual Status Badges**:

- 🔄 Running: Animated spinner
- ✅ Completed: Green checkmark (if not seen)
- ❌ Error: Red X (if not seen)
- ⚠️ Cancelled: Yellow warning

**Badge Component**:

```tsx
{
  session.status === "running" && (
    <Badge variant="secondary">
      <Loader2 className="h-3 w-3 animate-spin" />
    </Badge>
  );
}

{
  (session.status === "completed" || session.status === "error") &&
    !session.resultsSeen && (
      <Badge variant="secondary">
        {session.status === "completed" ? (
          <CheckCircle2 className="h-3 w-3 text-green-500" />
        ) : (
          <XCircle className="h-3 w-3 text-destructive" />
        )}
      </Badge>
    );
}
```

### 3. Marking Results as Seen

```typescript
const handleDialogAction = () => {
  markResultsSeen(activeTab);
  setShowResultsDialog(false);
};

// In store:
markResultsSeen: (id: string) => {
  set((state) => ({
    sessions: state.sessions.map((s) =>
      s.id === id ? { ...s, resultsSeen: true } : s
    ),
  }));
};
```

---

## Migration Guide

### Step 1: Install Dependencies

```bash
# State management
npm install zustand

# Form handling
npm install react-hook-form @hookform/resolvers zod

# UI components (Radix UI)
npm install @radix-ui/react-tabs
npm install @radix-ui/react-scroll-area
npm install @radix-ui/react-dialog
npm install @radix-ui/react-tooltip
npm install @radix-ui/react-progress

# Utility libraries
npm install sonner  # Toast notifications
npm install lucide-react  # Icons
```

### Step 2: Create Store Structure

1. Create `src/stores/test-store.ts`
2. Define your `TestSession` and `TestFormValues` types
3. Implement Zustand store with persist middleware
4. Add session management actions

### Step 3: Adapt Configuration Schema

Modify the test configuration schema for your metaheuristic tests:

```typescript
// Example: Algorithm optimization test
const testFormSchema = z.object({
  algorithm: z.enum(["genetic", "pso", "aco", "simulated_annealing"]),
  problem_type: z.enum(["tsp", "knapsack", "scheduling"]),
  population_size: z.number().min(10).max(1000),
  iterations: z.number().min(100).max(100000),
  crossover_rate: z.number().min(0).max(1),
  mutation_rate: z.number().min(0).max(1),
  // ... other parameters
});
```

### Step 4: Implement Core Components

1. **Tab Navigation Bar**: Copy navigation structure
2. **Configuration Form**: Adapt form fields for your tests
3. **Progress View**: Reuse progress tracking UI
4. **Results Dialog**: Customize for your result types

### Step 5: Integrate Test Execution

Adapt the test execution flow:

```typescript
const runSingleTest = async (config: TestFormValues, sessionId: string) => {
  const session = useTestStore
    .getState()
    .sessions.find((s) => s.id === sessionId);
  const signal = session?.abortController?.signal;

  try {
    const response = await fetch("/api/optimize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
      signal,
    });

    const result = await response.json();

    addTestResult(sessionId, {
      algorithm: config.algorithm,
      fitness: result.best_fitness,
      convergence_iteration: result.convergence_iteration,
      execution_time: result.execution_time,
    });

    return result;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Test cancelled");
    }
    throw error;
  }
};
```

### Step 6: Customize Result Display

Adapt the results dialog to show relevant metrics:

```tsx
// Example: Metaheuristic results
<div className="grid grid-cols-4 gap-4">
  <Card>
    <CardContent>
      <div className="text-center">
        <div className="text-2xl font-bold">{bestFitness.toFixed(4)}</div>
        <div className="text-sm">Best Fitness</div>
      </div>
    </CardContent>
  </Card>
  <Card>
    <CardContent>
      <div className="text-center">
        <div className="text-2xl font-bold">{convergenceIteration}</div>
        <div className="text-sm">Convergence</div>
      </div>
    </CardContent>
  </Card>
  <Card>
    <CardContent>
      <div className="text-center">
        <div className="text-2xl font-bold">{avgExecutionTime}s</div>
        <div className="text-sm">Avg Time</div>
      </div>
    </CardContent>
  </Card>
  <Card>
    <CardContent>
      <div className="text-center">
        <div className="text-2xl font-bold">{successRate}%</div>
        <div className="text-sm">Success Rate</div>
      </div>
    </CardContent>
  </Card>
</div>
```

---

## Best Practices

### 1. Always Save Before Actions

```typescript
// Before switching tabs
// Before adding new tab
// Before closing application
const currentFormData = form.getValues();
updateSessionConfig(activeTab, currentFormData);
```

### 2. Use requestAnimationFrame for Form Resets

```typescript
// Prevents React rendering conflicts
requestAnimationFrame(() => {
  form.reset(activeSession.config, {
    keepDefaultValues: false,
  });
});
```

### 3. Debounce Auto-Save

```typescript
// Prevent excessive updates
useEffect(() => {
  const handler = setTimeout(() => {
    // Save logic
  }, 500);

  return () => clearTimeout(handler);
}, [watchedFields]);
```

### 4. Clean Up Non-Serializable Data

```typescript
// In persist middleware
partialize: (state) => ({
  sessions: state.sessions.map(s => ({
    ...s,
    status: 'idle', // Reset on reload
    abortController: undefined, // Remove non-serializable
  })),
}),
```

### 5. Prevent Duplicate Dialogs

```typescript
// Track shown dialogs with unique keys
const dialogKey = `${session.id}-${session.endTime}`;
if (!shownDialogsRef.current.has(dialogKey)) {
  setShowResultsDialog(true);
  shownDialogsRef.current.add(dialogKey);
}
```

### 6. Handle Abort Gracefully

```typescript
try {
  // API call with signal
} catch (error) {
  if (error.name === "AbortError") {
    // Handle cancellation differently
    return;
  }
  // Handle other errors
}
```

---

## Common Pitfalls

### ❌ Don't: Render Multiple Forms Simultaneously

```typescript
// BAD: All forms rendered
{
  testSessions.map((session) => <Form {...form}>...</Form>);
}
```

### ✅ Do: Render Only Active Form

```typescript
// GOOD: Only active form rendered
{
  session.id === activeTab && <Form {...form}>...</Form>;
}
```

### ❌ Don't: Forget to Save Before Switching

```typescript
// BAD: Data loss
const switchTab = (newId) => {
  setActiveTab(newId);
};
```

### ✅ Do: Save Current Data First

```typescript
// GOOD: Data preserved
const switchTab = (newId) => {
  const data = form.getValues();
  updateSessionConfig(activeTab, data);
  setActiveTab(newId);
};
```

### ❌ Don't: Allow Empty Session List

```typescript
// BAD: No validation
const removeSession = (id) => {
  removeFromStore(id);
};
```

### ✅ Do: Validate Before Removal

```typescript
// GOOD: Always keep one session
const removeSession = (id) => {
  if (sessions.length === 1) {
    toast.error("Cannot remove last session");
    return;
  }
  removeFromStore(id);
};
```

---

## Summary

This multi-tab test session management system provides:

✅ **Independent Sessions**: Each tab maintains isolated state  
✅ **Persistent Storage**: Sessions survive page reloads  
✅ **Real-time Progress**: Live updates during test execution  
✅ **Cancellation Support**: AbortController for stopping tests  
✅ **User-Friendly UI**: Intuitive navigation and visual feedback  
✅ **Safe Operations**: Automatic saving prevents data loss  
✅ **Editable Tab Names**: Better organization of test sessions  
✅ **Smart Dialog Management**: No duplicate result notifications

The architecture is flexible and can be adapted for various testing scenarios while maintaining clean separation of concerns and excellent user experience.
