import {
    MultiTestFormValues,
    MultiTestResult,
    SingleTestFormValues,
    SingleTestResult,
    TestSession,
    useTestStore
} from "@/stores/test-store";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    CheckCircle2,
    XCircle,
    AlertCircle,
    Clock,
    Activity,
    Users, BarChart3,
} from "lucide-react";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";

interface TestResultsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    session: TestSession | undefined;
}

export function TestResultsDialog({
    open,
    onOpenChange,
    session,
}: TestResultsDialogProps) {
    const { markResultsSeen } = useTestStore();

    if (!session || !session.result) return null;

    const handleClose = () => {
        markResultsSeen(session.id);
        onOpenChange(false);
    };

    const formatDuration = (duration: number) => {
        if (duration < 60) {
            return `${duration.toFixed(2)}s`;
        }
        const minutes = Math.floor(duration / 60);
        const seconds = (duration % 60).toFixed(0);
        return `${minutes}m ${seconds}s`;
    };

    const getStatusIcon = () => {
        switch (session.status) {
            case "completed":
                return <CheckCircle2 className="h-5 w-5 text-green-500" />;
            case "cancelled":
                return <AlertCircle className="h-5 w-5 text-yellow-500" />;
            case "error":
                return <XCircle className="h-5 w-5 text-red-500" />;
            default:
                return null;
        }
    };

    const getStatusTitle = () => {
        switch (session.status) {
            case "completed":
                return "Test Completed Successfully";
            case "cancelled":
                return "Test Cancelled";
            case "error":
                return "Test Failed";
            default:
                return "Test Status";
        }
    };

    const getStatusDescription = () => {
        const processedObject = result.type === 'single' ? (session.config as SingleTestFormValues).algorithm : (session.config as MultiTestFormValues).benchmarkFunction

        switch (session.status) {
            case "completed":
                return `${processedObject} optimization completed for ${session.name}`;
            case "cancelled":
                return `Test execution was cancelled for ${session.name}`;
            case "error":
                return `Test encountered an error for ${session.name}`;
            default:
                return "";
        }
    };

    if (session.result.type === 'multi') {
        const result = session.result as MultiTestResult;

        return (
            <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
                <DialogContent className="max-w-5xl bg-neutral-900 border-neutral-800">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-white">
                            <BarChart3 className="text-blue-500" />
                            Algorithm Comparison Results
                        </DialogTitle>
                        <DialogDescription>
                            Benchmark: {result.benchmarkFunction} | Iterations: {session.config.iterations}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="border border-neutral-700 rounded-md overflow-hidden">
                        <Table>
                            <TableHeader className="bg-neutral-800">
                                <TableRow className="border-neutral-700 hover:bg-neutral-800">
                                    <TableHead className="text-neutral-300">Algorithm</TableHead>
                                    <TableHead className="text-neutral-300">Status</TableHead>
                                    <TableHead className="text-neutral-300">Duration (s)</TableHead>
                                    <TableHead className="text-neutral-300">Result (Fitness)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {result.results.map((row, idx) => (
                                    <TableRow key={idx} className="border-neutral-800 hover:bg-neutral-800/50">
                                        <TableCell className="font-medium text-white">{row.algorithm}</TableCell>
                                        <TableCell>
                                            {row.status === 'success'
                                                ? <Badge className="bg-green-900 text-green-300 hover:bg-green-900">Success</Badge>
                                                : <Badge className="bg-red-900 text-red-300 hover:bg-red-900">Failed</Badge>
                                            }
                                        </TableCell>
                                        <TableCell className="text-neutral-300">{row.duration.toFixed(3)}s</TableCell>
                                        <TableCell className="font-mono text-blue-300">
                                            <ScrollArea className="h-[120px] min-h-0 rounded-md border border-neutral-700 p-3 bg-neutral-950">
                                                <div className="text-sm text-white font-mono leading-relaxed space-y-1">
                                                    {row.status === 'success' ? row.bestSolution!.map((value, index) => (
                                                        <div key={index} className="flex justify-between py-1 border-b border-neutral-800 last:border-0">
                                                            <span className="text-neutral-500">x[{index}]</span>
                                                            <span className="text-green-400">
                                                        {typeof value === 'number' ? value.toExponential(6) : value}
                                                    </span>
                                                        </div>
                                                    )) : <p className={'text-red-400'}>Data unavailable</p>}
                                                </div>
                                            </ScrollArea>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <DialogFooter>
                        <Button onClick={handleClose} variant="outline" className="border-neutral-700 text-white">Close</Button>

                        {result.results.some(r => r.historyJson && r.historyJson.length > 0) && (
                            <Button
                                variant="default"
                                onClick={() => {
                                    // TODO: Przekierowanie do wizualizatora z historyJson
                                    // console.log("HistoryJson:", result?.historyJson);
                                    handleClose();
                                }}
                                className="bg-blue-600 hover:bg-blue-500 text-white"
                            >
                                View Visualization
                            </Button>
                        )}
                    </DialogFooter>


                </DialogContent>
            </Dialog>
        )
    }

    const result = session.result as SingleTestResult

    return (
        <Dialog
            open={open}
            onOpenChange={(open) => {
                if (!open) {
                    handleClose();
                }
                onOpenChange(open);
            }}
        >
            <DialogContent className="max-w-3xl max-h-[90vh] bg-neutral-900 border-neutral-800 flex flex-col p-0">
                {/* Header - fixed at top */}
                <DialogHeader className="px-6 pt-6 pb-0">
                    <DialogTitle className="flex items-center gap-2 text-white">
                        {getStatusIcon()}
                        {getStatusTitle()}
                    </DialogTitle>
                    <DialogDescription className="text-neutral-400">
                        {getStatusDescription()}
                    </DialogDescription>
                </DialogHeader>

                {/* Scrollable content */}
                <ScrollArea className="h-[500px] border rounded-md p-4 m-4">
                    <div className="space-y-4 pr-4">
                        {/* Summary Statistics */}
                        <div className="grid grid-cols-3 gap-4">
                            <Card className="bg-neutral-800 border-neutral-700">
                                <CardContent className="pt-6">
                                    <div className="text-center">
                                        <Clock className="h-5 w-5 mx-auto mb-2 text-blue-400" />
                                        <div className="text-2xl font-bold text-white">
                                            {result.duration
                                                ? formatDuration(result.duration)
                                                : "N/A"}
                                        </div>
                                        <div className="text-sm text-neutral-400">Execution Time</div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-neutral-800 border-neutral-700">
                                <CardContent className="pt-6">
                                    <div className="text-center">
                                        <Activity className="h-5 w-5 mx-auto mb-2 text-purple-400" />
                                        <div className="text-2xl font-bold text-white">
                                            {session.config.iterations}
                                        </div>
                                        <div className="text-sm text-neutral-400">Iterations</div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-neutral-800 border-neutral-700">
                                <CardContent className="pt-6">
                                    <div className="text-center">
                                        <Users className="h-5 w-5 mx-auto mb-2 text-green-400" />
                                        <div className="text-2xl font-bold text-white">
                                            {session.config.populationSize}
                                        </div>
                                        <div className="text-sm text-neutral-400">Population</div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Configuration Summary */}
                        <Card className="bg-neutral-800 border-neutral-700">
                            <CardContent className="pt-4">
                                <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                                    <Badge variant="outline" className="bg-neutral-700">
                                        Configuration
                                    </Badge>
                                </h4>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="flex justify-between items-center p-2 rounded bg-neutral-900/50">
                                        <span className="text-neutral-400">Algorithm:</span>
                                        <Badge variant="secondary" className="bg-blue-600/20 text-blue-400 border-blue-600">
                                            {result.algorithm}
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between items-center p-2 rounded bg-neutral-900/50">
                                        <span className="text-neutral-400">Function:</span>
                                        <Badge variant="secondary" className="bg-purple-600/20 text-purple-400 border-purple-600">
                                            {result.benchmarkFunction}
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between items-center p-2 rounded bg-neutral-900/50">
                                        <span className="text-neutral-400">Dimensions:</span>
                                        <span className="text-white font-mono">{session.config.dimensions}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-2 rounded bg-neutral-900/50">
                                        <span className="text-neutral-400">Range:</span>
                                        <span className="text-white font-mono text-xs">
                                            [{session.config.lowerBound}, {session.config.upperBound}]
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Best Solution */}
                        {result && !result.error && result.bestSolution && result.bestSolution.length > 0 && (
                            <Card className="bg-neutral-800 border-neutral-700">
                                <CardContent className="pt-4">
                                    <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                                        <Badge variant="outline" className="bg-neutral-700">
                                            Best Solution
                                        </Badge>
                                        <span className="text-xs text-neutral-400">
                                            ({result.bestSolution.length} dimensions)
                                        </span>
                                    </h4>
                                    <ScrollArea className="h-[120px] min-h-0 rounded-md border border-neutral-700 p-3 bg-neutral-950">
                                        <div className="text-sm text-white font-mono leading-relaxed space-y-1">
                                            {result.bestSolution.map((value, index) => (
                                                <div key={index} className="flex justify-between py-1 border-b border-neutral-800 last:border-0">
                                                    <span className="text-neutral-500">x[{index}]</span>
                                                    <span className="text-green-400">
                                                        {typeof value === 'number' ? value.toExponential(6) : value}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        )}

                        {/* Error Message */}
                        {result?.error && (
                            <Card className="bg-red-900/20 border-red-800">
                                <CardContent className="pt-4">
                                    <div className="flex items-start gap-2">
                                        <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <h4 className="text-sm font-medium text-red-400 mb-1">
                                                Error Details
                                            </h4>
                                            <p className="text-sm text-red-300 font-mono bg-red-950/50 p-2 rounded break-all">
                                                {result.error}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Additional Info */}
                        {result?.message && (
                            <Card className="bg-blue-900/20 border-blue-800">
                                <CardContent className="pt-4">
                                    <div className="flex items-start gap-2">
                                        <CheckCircle2 className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="text-sm font-medium text-blue-400 mb-1">
                                                Status
                                            </h4>
                                            <p className="text-sm text-blue-300">{result.message}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </ScrollArea>

                {/* Footer - fixed at bottom */}
                <DialogFooter className="px-6 pb-6 pt-4 border-t border-neutral-800">
                    <div className="flex gap-2 w-full justify-end">
                        <Button
                            variant="outline"
                            onClick={handleClose}
                            className="bg-neutral-800 border-neutral-700 text-white hover:bg-neutral-700"
                        >
                            Close
                        </Button>
                        {result?.historyJson && (
                            <Button
                                variant="default"
                                onClick={() => {
                                    // TODO: Przekierowanie do wizualizatora z historyJson
                                    console.log("HistoryJson:", result?.historyJson);
                                    handleClose();
                                }}
                                className="bg-blue-600 hover:bg-blue-500 text-white"
                            >
                                View Visualization
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}