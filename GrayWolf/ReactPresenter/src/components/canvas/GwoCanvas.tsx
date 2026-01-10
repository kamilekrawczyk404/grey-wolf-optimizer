import React, { useEffect, useMemo, useRef } from "react";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {IterationSnapshot, OptimizationRun} from "@/types/types";
import {Slider} from "@/components/ui/slider";

type Point = {
  x: number;
  y: number;
};

export type CanvasConfig = {
  animationDuration: number;
  visibleIterations: number;
  solutionSize: number;
  agentRadius: number;
  colors: {
    solution: { r: number, g: number, b: number };
    agents: {
      leader: { r: number, g: number, b: number };
      follower: { r: number, g: number, b: number };
    };
  };
};

export const defaultConfig: CanvasConfig = {
  animationDuration: 20,
  visibleIterations: 10,
  solutionSize: 15,
  agentRadius: 5,
  colors: {
    solution: { r: 34, g: 197, b: 94 },
    agents: {
      leader: { r: 234, g: 179, b: 8 },
      follower: { r: 59, g: 130, b: 246 }
    }
  }
};

const getRgbaString = (color: { r: number; g: number; b: number }, alpha: number) => {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
};

const valToCanvas = (val: number, min: number, range: number, size: number, isY: boolean = false) => {
  const ratio = (val - min) / range;
  // y-axis grows in opposite direction than in standard cartesian plane, it needs to be rotated
  if (isY) return size - (ratio * size);
  return ratio * size;
};

const preparePointForCanvas = (
    position: number[],
    bounds: { min: number; max: number },
    canvasSize: number
): Point => {
  if (!position || position.length < 2) return { x: 0, y: 0 };
  const range = bounds.max - bounds.min;
  if (range === 0) return { x: canvasSize / 2, y: canvasSize / 2 };

  const canvasX = valToCanvas(position[0], bounds.min, range, canvasSize, false);
  const canvasY = valToCanvas(position[1], bounds.min, range, canvasSize, true);

  return { x: canvasX, y: canvasY };
};

type GwoCanvasProps = {
  properties: OptimizationRun;
  iteration: number;
  animationStatus: { isRunning: boolean; isCompleted: boolean };
  onAnimationStart: () => void;
  onAnimationPause: () => void;
  onIterationChange: (nextIteration: number) => void;
  options?: CanvasConfig;
  size?: number;
};

const GwoCanvas = ({
                     onAnimationStart,
                     onAnimationPause,
                     onIterationChange,
                     animationStatus,
                     iteration,
                     properties,
                     options = defaultConfig,
                     size = 600,
                   }: GwoCanvasProps) => {

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const bounds = useMemo(() => {
    const min = properties.lowerBound ?? -100;
    const max = properties.upperBound ?? 100;

    return { min, max };
  }, [properties]);


  const optimizationHistory = properties.history;

  useEffect(() => {
    // Canvas elements
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // Clear canvas area
    ctx.clearRect(0, 0, size, size);

    // Canvas styling definition
    const gridColor = "#333333";
    const axisColor = "#525252";
    const textColor = "#a3a3a3";

    ctx.lineWidth = 1;
    ctx.font = "10px monospace";
    ctx.strokeStyle = gridColor;

    const range = bounds.max - bounds.min;
    const startX = Math.ceil(bounds.min);

    // Other axis (distance 1 unit)
    ctx.beginPath();
    for (let x = startX; x <= bounds.max; x += 1) {
      if (x === 0) continue;

      const pixX = valToCanvas(x, bounds.min, range, size, false);
      ctx.moveTo(pixX, 0);
      ctx.lineTo(pixX, size);
    }

    const startY = Math.ceil(bounds.min);
    for (let y = startY; y <= bounds.max; y += 1) {
      if (y === 0) continue;

      const pixY = valToCanvas(y, bounds.min, range, size, true);
      ctx.moveTo(0, pixY);
      ctx.lineTo(size, pixY);
    }
    ctx.stroke();

    const originX = valToCanvas(0, bounds.min, range, size, false);
    const originY = valToCanvas(0, bounds.min, range, size, true);

    // Main axis
    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 2; // Highlight the main axis
    ctx.beginPath();

    if (bounds.min <= 0 && bounds.max >= 0) {
      ctx.moveTo(originX, 0);
      ctx.lineTo(originX, size);
    }

    if (bounds.min <= 0 && bounds.max >= 0) {
      ctx.moveTo(0, originY);
      ctx.lineTo(size, originY);
    }
    ctx.stroke();

    // If animation is not started or there is no history to display, we end up with only plain plane
    if (!properties.history || iteration < 0) return;

    // Getting the visible iterations
    const startIndex = Math.max(0, iteration - options.visibleIterations);
    const relevantHistory = optimizationHistory.slice(startIndex, iteration + 1);

    // Casting those points to 2D, adding the snapshotIteration for easier calculation of opacity
    const pointsToDraw = relevantHistory.flatMap((snapshot) => {
      return snapshot.entities.map((agent) => ({
        ...agent,
        snapshotIteration: snapshot.iteration
      }));
    });

    // Drawing the agents
    pointsToDraw.forEach((agent) => {
      // Calculating opacity
      const age = agent.snapshotIteration - startIndex;
      const windowSize = Math.max(1, iteration - startIndex);
      const opacity = Math.max(0.1, age / windowSize); // Min 0.1, żeby nie zniknęły całkowicie

      // Wybór koloru (Leader vs Follower)
      const baseColor = agent.isLeader
          ? options.colors.agents.leader
          : options.colors.agents.follower;

      const fillStyle = getRgbaString(baseColor, opacity);

      const { x, y } = preparePointForCanvas(agent.position, bounds, size);

      ctx.beginPath();

      const radius = options.agentRadius;

      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = fillStyle;
      ctx.fill();

      // Highlight the newest iteration
      if (agent.snapshotIteration === iteration) {
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });

    // Drawing the global solutions
    if (properties.solution) {
      properties.solution.map(s => {
        const solution = preparePointForCanvas(s, bounds, size);
        const solSize = options.solutionSize;
        const solColor = getRgbaString(options.colors.solution, 1);

        ctx.fillStyle = solColor;

        ctx.fillRect(solution.x - solSize / 2, solution.y - 1, solSize, 2);
        ctx.fillRect(solution.x - 1, solution.y - solSize / 2, 2, solSize);

        ctx.beginPath();
        ctx.arc(solution.x, solution.y, solSize / 4, 0, 2 * Math.PI);
        ctx.fill();
      })
    }

    // Bounds
    ctx.fillStyle = textColor;
    ctx.textAlign = "start";
    ctx.textBaseline = "bottom";

    // Min (bottom left)
    ctx.fillText(`(${bounds.min.toFixed(1)}, ${bounds.min.toFixed(1)})`, 5, size - 5);

    // Max (top right)
    ctx.textAlign = "end";
    ctx.textBaseline = "top";
    ctx.fillText(`(${bounds.max.toFixed(1)}, ${bounds.max.toFixed(1)})`, size - 5, 5);
  }, [
    iteration,
    properties,
    options,
    size,
    bounds
  ]);

  return (
      <div className="flex flex-col gap-3 w-full max-w-[600px] mx-auto">
        <div className="relative rounded-lg overflow-hidden border border-neutral-800 bg-neutral-950 shadow-2xl">
          <canvas
              ref={canvasRef}
              width={size}
              height={size}
              className="block w-full h-auto"
              style={{ aspectRatio: "1/1" }}
          />

          <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm px-2 py-1 rounded text-xs text-white font-mono border border-white/10">
            Iteration: {iteration} / {optimizationHistory.length}
          </div>
        </div>

        <AnimationsControls
            length={optimizationHistory.length}
            iteration={iteration}
            animationStatus={animationStatus}
            onAnimationPause={onAnimationPause}
            onAnimationStart={onAnimationStart}
            onIterationChange={onIterationChange}
        />
      </div>
  );
};

const AnimationsControls = ({
                              iteration,
                              length,
                              animationStatus,
                              onAnimationStart,
                              onAnimationPause,
                              onIterationChange,
                            }: {
  length: number;
  iteration: number;
  animationStatus: { isRunning: boolean };
  onAnimationPause: () => void;
  onAnimationStart: () => void;
  onIterationChange: (nextIteration: number) => void;
}) => {
  return (
      <div className="flex flex-col gap-2 p-3 bg-neutral-900 border border-neutral-800 rounded-md">
        <div className="w-full flex items-center gap-3">
          <span className="text-xs text-neutral-500 font-mono min-w-[30px] text-right">0</span>


          <Slider
              min={0}
              max={length}
              step={1}
              value={[iteration]}
              onMouseDown={onAnimationPause}
              onValueChange={(vals) => onIterationChange(vals[0])}
              className="flex-1 h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400"
          />

          <span className="text-xs text-neutral-500 font-mono min-w-[30px]">{length}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-neutral-400 font-medium">
            Status: <span className={animationStatus.isRunning ? "text-green-400" : "text-yellow-400"}>
                        {animationStatus.isRunning ? "Playing" : "Paused"}
                    </span>
          </div>

          <div className="flex items-center gap-1">
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-neutral-400 hover:text-white hover:bg-neutral-800"
                onClick={() => onIterationChange(Math.max(0, iteration - 1))}
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            <Button
                variant={animationStatus.isRunning ? "secondary" : "default"}
                size="sm"
                className={cn(
                    "h-8 px-4 gap-2 transition-all",
                    animationStatus.isRunning
                        ? "bg-neutral-800 text-white border border-neutral-700"
                        : "bg-blue-600 hover:bg-blue-500 text-white"
                )}
                onClick={animationStatus.isRunning ? onAnimationPause : onAnimationStart}
            >
              {animationStatus.isRunning ? (
                  <>
                    <Pause className="h-4 w-4" /> Pause
                  </>
              ) : (
                  <>
                    <Play className="h-4 w-4" /> Play
                  </>
              )}
            </Button>

            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-neutral-400 hover:text-white hover:bg-neutral-800"
                onClick={() => onIterationChange(Math.min(length, iteration + 1))}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
  );
};

export default GwoCanvas;