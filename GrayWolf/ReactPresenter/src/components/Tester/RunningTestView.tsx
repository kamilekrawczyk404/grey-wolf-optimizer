import { useEffect, useState } from "react";
import { TestSession, useTestStore } from "@/stores/test-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, X, Clock } from "lucide-react";
import { toast } from "sonner";

interface RunningTestViewProps {
  session: TestSession;
}

export function RunningTestView({ session }: RunningTestViewProps) {
  const { cancelSession } = useTestStore();
  const [, setTick] = useState(0);

  // Force re-render every second to update elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatElapsedTime = (startTime: number) => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleCancel = () => {
    cancelSession(session.id);
  };

  return (
    <Card className="bg-neutral-900 border-neutral-800">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            Running Test
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleCancel}
            className="bg-red-600 hover:bg-red-500"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Algorithm Info */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-neutral-400">Algorithm:</span>
          <Badge variant="secondary" className="bg-neutral-800">
            {session.config.algorithm}
          </Badge>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-neutral-400">Benchmark:</span>
          <Badge variant="secondary" className="bg-neutral-800">
            {session.config.benchmarkFunction}
          </Badge>
        </div>

        {/* Progress Indicator */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-neutral-400">
            <span>Running optimization...</span>
          </div>
          <Progress value={undefined} className="h-2" />
        </div>

        {/* Elapsed Time */}
        <div className="flex items-center gap-2 text-sm text-neutral-400">
          <Clock className="h-4 w-4" />
          <span>
            Elapsed:{" "}
            {session.startTime ? formatElapsedTime(session.startTime) : "0:00"}
          </span>
        </div>

        {/* Configuration Summary */}
        <div className="mt-4 p-4 bg-neutral-800 rounded-md space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-400">Population Size:</span>
            <span className="text-white">{session.config.populationSize}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">Dimensions:</span>
            <span className="text-white">{session.config.dimensions}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">Iterations:</span>
            <span className="text-white">{session.config.iterations}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">Range:</span>
            <span className="text-white">
              [{session.config.lowerBound}, {session.config.upperBound}]
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
