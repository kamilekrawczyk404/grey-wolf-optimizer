import React, { useEffect, useMemo, useRef } from "react";
import {
  IterationHistory,
  OptimizationProperties,
  WolfHistory,
} from "../../types/types";
import { addAlphaToRgb } from "../../utils/colorConverter";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPause, faPlay } from "@fortawesome/free-solid-svg-icons";
import { AnimationStatus } from "../../App";
import { layoutColors } from "../../colors";
import Slider from "../form/Slider";
import RangeInput from "../form/RangeInput";

export type Wolf = "alpha" | "beta" | "delta" | "gamma";

export type CanvasColors = {
  wolfs: Record<Wolf, string>;
  grid: string;
  text: string;
  axis: string;
  solution: string;
};

const DEFAULT_COLORS: CanvasColors = {
  wolfs: {
    alpha: "rgba(251, 191, 36, 1)",
    beta: "rgba(168, 162, 158, 1)",
    delta: "rgba(120, 113, 108, 1)",
    gamma: "rgba(64, 64, 64, 0.8)",
  },
  solution: "oklch(78.9% 0.154 211.53)",
  grid: "oklch(26.9% 0 0)",
  axis: "oklch(37.1% 0 0)",
  text: "#f1f1f1",
};

type Point = {
  x: number;
  y: number;
};

const flattenPointTo2D = (position: number[]): Point => {
  if (position.length < 2)
    throw new Error(
      "Cannot flatten array that has dimension lower than 2 dimensions",
    );

  return { x: position[0], y: position[1] };
};

const mapX = ({rangeX, lowerBound, size, value}: {value: number,  rangeX: number, lowerBound: number[], size: number }): number => {
  if (rangeX === 0) return size / 2;
  return ((value - lowerBound[0]) / rangeX) * size;
};

const mapY = ({rangeY, lowerBound, size, value}: {value: number,  rangeY: number, lowerBound: number[], size: number }): number => {
  if (rangeY === 0) return size / 2;
  return (1 - ((value - lowerBound[1]) / rangeY)) * size;
};

const preparePointForCanvas = (
  position: number[],
  properties: { lowerBound: number[]; upperBound: number[] },
  canvasSize: number,
): Point => {
  const flatPoint = flattenPointTo2D(position);
  const { lowerBound, upperBound } = properties;

  const rangeX = upperBound[0] - lowerBound[0];
  const rangeY = upperBound[1] - lowerBound[1];

  const canvasX = mapX({rangeX, lowerBound, size: canvasSize, value: flatPoint.x})
  const canvasY = mapY({rangeY, lowerBound, size: canvasSize, value: flatPoint.y})

  return { x: canvasX, y: canvasY };
};

const getSortingWolfRank = (wolf: WolfHistory): number => {
  if (wolf.isAlpha) return 4;
  if (wolf.isBeta) return 3;
  if (wolf.isGamma) return 2;
  return 1;
};

export type CanvasConfig = {
  colors: CanvasColors;
  animationDuration: number;
  size: number;
  wolfRadius: number;
  solutionSize: number;
  gridLines: number;
  visibleIterations: number;
};

export const defaultConfig: CanvasConfig = {
  colors: DEFAULT_COLORS,
  size: 600,
  solutionSize: 20,
  wolfRadius: 10,
  gridLines: 15,
  visibleIterations: 3,
  animationDuration: 50,
};

type GwoCanvasProps = {
  history: IterationHistory[];
  iteration: number;
  properties: OptimizationProperties;
  options: CanvasConfig;
  animationStatus: AnimationStatus;
  onAnimationStart: () => any;
  onAnimationPause: () => any;
  onIterationChange: (nextIteration: number) => any;
};

const GwoCanvas = ({
  onAnimationStart,
  onAnimationPause,
  onIterationChange,
  animationStatus,
  history,
  iteration,
  properties,
  options,
}: GwoCanvasProps) => {
  const bounds = useMemo(() => {
    let lower: number, upper: number;
    lower = upper = history[0].wolves[0].position[0];

    history[0].wolves.forEach((wolf) => {
      const lowerCandidate = Math.min(...wolf.position);
      const upperCandidate = Math.max(...wolf.position);

      if (lowerCandidate < lower) {
        lower = lowerCandidate;
      }
      if (upperCandidate > upper) {
        upper = upperCandidate;
      }
    });

    return { upper, lower };
  }, [history]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const { size, gridLines, wolfRadius, colors, visibleIterations } = options;

  useEffect(() => {
    if (
      size === undefined ||
      gridLines === undefined ||
      wolfRadius === undefined ||
      colors === undefined
    )
      return;

    const canvas = canvasRef?.current;
    const ctx = canvas?.getContext("2d");

    if (!ctx) return;

    ctx.clearRect(0, 0, size, size);

    const { lowerBound, upperBound } = properties;
    const rangeX = upperBound[0] - lowerBound[0];
    const rangeY = upperBound[1] - lowerBound[1];

    // drawing grid
    ctx.fillStyle = colors.text;
    ctx.font = "12px Monaco";
    ctx.lineWidth = 1;
    ctx.strokeStyle = colors.grid;

    const stepX = rangeX / gridLines;
    const stepY = rangeY / gridLines;

    // Draw vertical grid lines
    for (let i = 0; i <= gridLines; i++) {
      const valueX = lowerBound[0] + stepX * i;
      const pixelX = mapX({rangeX, lowerBound, size, value: valueX});
      ctx.beginPath();
      ctx.moveTo(pixelX, 0);
      ctx.lineTo(pixelX, size);
      ctx.stroke();
    }
    // Draw horizontal grid lines
    for (let i = 0; i <= gridLines; i++) {
      const valueY = lowerBound[1] + stepY * i;
      const pixelY = mapY({rangeY, lowerBound, size, value: valueY});
      ctx.beginPath();
      ctx.moveTo(0, pixelY);
      ctx.lineTo(size, pixelY);
      ctx.stroke();
    }

    // drawing axis
    ctx.strokeStyle = colors.axis;
    ctx.lineWidth = 2; // Make axes thicker

    // Draw X-Axis (where Y=0)
    if (0 >= lowerBound[1] && 0 <= upperBound[1]) {
      const yPixelForXAxis = mapY({rangeY, lowerBound, size, value: 0});
      ctx.beginPath();
      ctx.moveTo(0, yPixelForXAxis);
      ctx.lineTo(size, yPixelForXAxis);
      ctx.stroke();
    }
    // Draw Y-Axis (where X=0)
    if (0 >= lowerBound[0] && 0 <= upperBound[0]) {
      const xPixelForYAxis = mapX({rangeX, lowerBound, size, value: 0});
      ctx.beginPath();
      ctx.moveTo(xPixelForYAxis, 0);
      ctx.lineTo(xPixelForYAxis, size);
      ctx.stroke();
    }
    ctx.lineWidth = 1; // Reset line width

    if (iteration < 0) {
      return;
    }

    // drawing wolves
    if (history) {
      const currentIterations = history
        .slice(
          iteration > visibleIterations ? iteration - visibleIterations : 0,
          iteration,
        );

      currentIterations
        // assign to each wolf his iteration number
        .map((h) => h.wolves.map((w) => ({ ...w, iteration: h.iteration })))
        // flat to achieve one array
        .flat()
        // sort them, to display them by the rank
        .sort((a, b) => {
          const rankDifference = getSortingWolfRank(a) - getSortingWolfRank(b);

          return (
              rankDifference + (!rankDifference ? a.iteration - b.iteration : 0)
          );
        })
        .forEach((wolf) => {
        // based on the previous iterations, make the points to be less visible, so user can follow wolves position easier
        const colorOpacity =
            (visibleIterations < iteration ? (Math.abs((iteration - wolf.iteration) - visibleIterations) + 1) : wolf.iteration + 1) /
            currentIterations.length;

        if (wolf.position.length < 2) return;

        // prepare point for canvas bounds
        const { x, y } = preparePointForCanvas(
            wolf.position,
            properties,
            size,
        );

        // based on the wolf role, assign proper color for easier distinguishing
        const { alpha, beta, delta, gamma } = Object.fromEntries(
            Object.entries(colors.wolfs).map(([wolfType, rgbColor]) => [
              wolfType,
              addAlphaToRgb(rgbColor, colorOpacity),
            ]),
        );

        let color = delta;
        if (wolf.isAlpha) color = alpha;
        else if (wolf.isBeta) color = beta;
        else if (wolf.isGamma) {
          color = gamma;
        }

        ctx.beginPath();
        ctx.arc(x, y, wolfRadius, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    }

    // adding bounds text (positioned relative to axes)
    ctx.fillStyle = colors.text;
    const yPixelForXAxis = 0 >= lowerBound[1] && 0 <= upperBound[1] ? mapY({rangeY, lowerBound, size, value: 0}) : size - 10;
    const xPixelForYAxis = 0 >= lowerBound[0] && 0 <= upperBound[0] ? mapX({rangeX, lowerBound, size, value: 0}) : 10;

    ctx.textAlign = "left";
    ctx.fillText(properties.lowerBound[0].toString(), 2, yPixelForXAxis + 20);
    ctx.textAlign = "right";
    ctx.fillText(properties.upperBound[0].toString(), size - 2, yPixelForXAxis + 20);

    ctx.textAlign = "center";
    ctx.fillText(properties.lowerBound[1].toString(), xPixelForYAxis, size - 6);
    ctx.fillText(properties.upperBound[1].toString(), xPixelForYAxis, 15);


    // drawing solution
    const solutionPoint = flattenPointTo2D(properties.solution ?? [0, 0]);
    // Map solution using NEW mappers
    const solution = { x: mapX({rangeX, lowerBound, size, value: solutionPoint.x}), y: mapY({rangeY, size, lowerBound, value: solutionPoint.y}) };

    ctx.fillStyle = colors.solution;
    ctx.beginPath();
    ctx.rect(
        solution.x - options.solutionSize / 6,
        solution.y - options.solutionSize / 2,
        options.solutionSize / 3,
        options.solutionSize,
    );
    ctx.fill();
    ctx.beginPath();
    ctx.rect(
        solution.x - options.solutionSize / 2,
        solution.y - options.solutionSize / 6,
        options.solutionSize,
        options.solutionSize / 3,
    );
    ctx.fill();
  }, [history, properties, options, iteration, bounds]);

  return (
    <div className={"flex flex-col gap-2"}>
      {size && (
        <canvas
          className={"bg-neutral-900 rounded-md"}
          ref={canvasRef}
          height={size}
          width={size}
        />
      )}
      <AnimationsControls
        length={history.length}
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
  animationStatus: AnimationStatus;
  onAnimationPause: () => any;
  onAnimationStart: () => any;
  onIterationChange: (nextIteration: number) => any;
}) => {
  return (
    <div
      className={`flex items-center gap-2 !z-[10] h-10 w-full px-2 rounded-md ${layoutColors.neutral.background.light}`}
    >
      <button
        onClick={() =>
          animationStatus.isRunning ? onAnimationPause() : onAnimationStart()
        }
      >
        <FontAwesomeIcon icon={animationStatus.isRunning ? faPause : faPlay} />
      </button>
      <span
        style={{ width: `${(length.toString().length * 2 + 1) * 9}px` }}
        className={"font-mono text-xs"}
      >
        {iteration}/{length}
      </span>
      <RangeInput
        step={1}
        min={0}
        max={length}
        value={iteration}
        onMouseDown={() => onAnimationPause()}
        onChange={(e) => onIterationChange(parseInt(e.target.value))}
      />
    </div>
  );
};

export default GwoCanvas;
