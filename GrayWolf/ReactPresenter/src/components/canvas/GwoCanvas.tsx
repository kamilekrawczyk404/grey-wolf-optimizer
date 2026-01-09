// import React, { useEffect, useMemo, useRef } from "react";
// import {
//   AgentState,
//   OptimizationRun, IterationSnapshot,
// } from "../../types/types";
// import { addAlphaToRgb } from "../../utils/colorConverter";
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import { faPause, faPlay } from "@fortawesome/free-solid-svg-icons";
// import { AnimationStatus } from "../../App";
// import { layoutColors } from "../../colors";
// import RangeInput from "../form/RangeInput";
//

export type CanvasConfig = {
  animationDuration: number;
  visibleIterations: number;
  gridLines: number;
  solutionSize: number;
  agentRadius: number; // Zmieniono z wolfRadius
  colors: {
    solution: { r: number, g: number, b: number }; // Global Best
    agents: {
      leader: { r: number, g: number, b: number };
      follower: { r: number, g: number, b: number };
    };
  };
};

export const defaultConfig: CanvasConfig = {
  animationDuration: 100,
  visibleIterations: 20,
  gridLines: 10,
  solutionSize: 8,
  agentRadius: 4,
  colors: {
    solution: { r: 34, g: 197, b: 94 },
    agents: {
      leader: { r: 234, g: 179, b: 8 },
      follower: { r: 59, g: 130, b: 246 }
    }
  }
};

// export type Wolf = "alpha" | "beta" | "delta" | "gamma";
//
// export type CanvasColors = {
//   wolfs: Record<Wolf, string>;
//   grid: string;
//   text: string;
//   axis: string;
//   solution: string;
// };
//
// const DEFAULT_COLORS: CanvasColors = {
//   wolfs: {
//     alpha: "rgba(251, 191, 36, 1)",
//     beta: "rgba(168, 162, 158, 1)",
//     delta: "rgba(120, 113, 108, 1)",
//     gamma: "rgba(64, 64, 64, 0.8)",
//   },
//   solution: "oklch(78.9% 0.154 211.53)",
//   grid: "oklch(26.9% 0 0)",
//   axis: "oklch(37.1% 0 0)",
//   text: "#f1f1f1",
// };
//
// type Point = {
//   x: number;
//   y: number;
// };
//
// const flattenPointTo2D = (position: number[]): Point => {
//   if (position.length < 2)
//     throw new Error(
//       "Cannot flatten array that has dimension lower than 2 dimensions",
//     );
//
//   return { x: position[0], y: position[1] };
// };
//
// const preparePointForCanvas = (
//   position: number[],
//   properties: { lowerBound: number; upperBound: number },
//   canvasSize: number,
// ): Point => {
//   const flatPoint = flattenPointTo2D(position);
//   const { lowerBound, upperBound } = properties;
//
//   const range = upperBound - lowerBound;
//
//   const canvasX = ((flatPoint.x - lowerBound) / range) * canvasSize;
//   const canvasY = ((flatPoint.y - lowerBound) / range) * canvasSize;
//
//   return { x: canvasX, y: canvasY };
// };
//
// const getSortingWolfRank = (wolf: AgentState): number => {
//   // if (wolf.isAlpha) return 4;
//   // if (wolf.isBeta) return 3;
//   // if (wolf.isDelta) return 2;
//   return 1;
// };
//
// // export type CanvasConfig = {
// //   colors: CanvasColors;
// //   animationDuration: number;
// //   size: number;
// //   wolfRadius: number;
// //   solutionSize: number;
// //   gridLines: number;
// //   visibleIterations: number;
// // };
//
// export type CanvasConfig = {
//   animationDuration: number;
//   visibleIterations: number;
//   gridLines: number;
//   solutionSize: number;
//   agentRadius: number; // Zmieniono z wolfRadius
//   colors: {
//     solution: { r: number, g: number, b: number }; // Global Best
//     agents: {
//       leader: { r: number, g: number, b: number };
//       follower: { r: number, g: number, b: number };
//     };
//   };
// };
//
// export const defaultConfig: CanvasConfig = {
//   colors: DEFAULT_COLORS,
//   size: 600,
//   solutionSize: 20,
//   wolfRadius: 10,
//   gridLines: 15,
//   visibleIterations: 3,
//   animationDuration: 50,
// };
//
// type GwoCanvasProps = {
//   history: IterationSnapshot[];
//   iteration: number;
//   properties: OptimizationRun;
//   options: CanvasConfig;
//   animationStatus: AnimationStatus;
//   onAnimationStart: () => any;
//   onAnimationPause: () => any;
//   onIterationChange: (nextIteration: number) => any;
// };
//
// const GwoCanvas = ({
//   onAnimationStart,
//   onAnimationPause,
//   onIterationChange,
//   animationStatus,
//   history,
//   iteration,
//   properties,
//   options,
// }: GwoCanvasProps) => {
//   const bounds = useMemo(() => {
//     let lower: number, upper: number;
//     lower = upper = 0;
//     // lower = upper = history[0].wolves[0].position[0];
//
//     // history[0].wolves.forEach((wolf) => {
//     //   const lowerCandidate = Math.min(...wolf.position);
//     //   const upperCandidate = Math.max(...wolf.position);
//     //
//     //   if (lowerCandidate < lower) {
//     //     lower = lowerCandidate;
//     //   }
//     //   if (upperCandidate > upper) {
//     //     upper = upperCandidate;
//     //   }
//     // });
//
//     return { upper, lower };
//   }, [history]);
//
//   const canvasRef = useRef<HTMLCanvasElement | null>(null);
//
//   // const { size, gridLines, wolfRadius, colors, visibleIterations } = options;
//
//   useEffect(() => {
//     // if (
//     //   size === undefined ||
//     //   gridLines === undefined ||
//     //   wolfRadius === undefined ||
//     //   colors === undefined
//     // )
//     //   return;
//
//     const canvas = canvasRef?.current;
//     const ctx = canvas?.getContext("2d");
//
//     if (!ctx) return;
//
//     ctx.clearRect(0, 0, size, size);
//
//     // drawing grid
//     ctx.fillStyle = colors.text;
//     ctx.font = "12px Monaco";
//     ctx.lineWidth = 1;
//
//     const step = size / gridLines;
//
//     ctx.strokeStyle = colors.grid;
//     for (let i = 0; i <= gridLines; i++) {
//       const pos = i * step;
//       ctx.beginPath();
//       ctx.moveTo(pos, 0);
//       ctx.lineTo(pos, size);
//       ctx.stroke();
//       ctx.beginPath();
//       ctx.moveTo(0, pos);
//       ctx.lineTo(size, pos);
//       ctx.stroke();
//     }
//
//     // drawing axis
//     ctx.strokeStyle = colors.axis;
//     ctx.beginPath();
//     ctx.moveTo(0, size / 2);
//     ctx.lineTo(size, size / 2);
//     ctx.stroke();
//
//     ctx.beginPath();
//     ctx.moveTo(size / 2, 0);
//     ctx.lineTo(size / 2, size);
//     ctx.stroke();
//
//     if (iteration < 0) {
//       return;
//     }
//
//     // drawing wolves
//     if (history) {
//       history
//         .slice(
//           iteration > visibleIterations ? iteration - visibleIterations : 0,
//           iteration,
//         )
//         // assign to each wolf his iteration number
//         // .map((h) => h.wolves.map((w) => ({ ...w, iteration: h.iteration })))
//         // flat to achieve one array
//         .flat()
//         // sort them, to display them by the rank
//         .sort((a, b) => {
//           // const rankDifference = getSortingWolfRank(a) - getSortingWolfRank(b);
//
//           return (
//               0
//             // rankDifference + (!rankDifference ? a.iteration - b.iteration : 0)
//           );
//         })
//         .forEach((wolf) => {
//           // based on the previous iterations, make the points to be less visible, so user can follow wolves position easier
//           const colorOpacity =
//             1 -
//             (wolf.iteration % (visibleIterations || 1)) /
//               (visibleIterations || 1);
//
//           // if (wolf.position.length < 2) return;
//
//           // prepare point for canvas bounds
//           // const { x, y } = preparePointForCanvas(
//           //   wolf.position,
//           //   properties,
//           //   size,
//           // );
//
//           // based on the wolf role, assign proper color for easier distinguishing
//           const { alpha, beta, delta, gamma } = Object.fromEntries(
//             Object.entries(colors.wolfs).map(([wolfType, rgbColor]) => [
//               wolfType,
//               addAlphaToRgb(rgbColor, colorOpacity),
//             ]),
//           );
//
//           let color = gamma;
//           // if (wolf.isAlpha) color = alpha;
//           // else if (wolf.isBeta) color = beta;
//           // else if (wolf.isDelta) color = delta;
//
//           ctx.beginPath();
//           // ctx.arc(x, y, wolfRadius, 0, 2 * Math.PI);
//           ctx.arc(0,0, wolfRadius, 0, 2 * Math.PI);
//           ctx.fillStyle = color;
//           ctx.fill();
//           ctx.strokeStyle = "#333";
//           ctx.lineWidth = 1;
//           ctx.stroke();
//         });
//     }
//
//     // adding bounds
//     ctx.fillStyle = colors.text;
//     ctx.fillText(properties.lowerBound.toString(), 2, size / 2 + 20);
//     ctx.fillText(
//       properties.lowerBound.toString(),
//       size / 2 - properties.lowerBound.toString().length * 10,
//       size - 6,
//     );
//
//     ctx.fillText(
//       properties.upperBound.toString(),
//       size / 2 - properties.lowerBound.toString().length * 8,
//       15,
//     );
//     ctx.fillText(
//       properties.upperBound.toString(),
//       size - properties.lowerBound.toString().length * 8,
//       size / 2 + 20,
//     );
//
//     // drawing solution
//     // for now min value of the function is located at point [0,0]
//     const solution = preparePointForCanvas(
//       // properties.solution,
//       [0, 0],
//       properties,
//       size,
//     );
//
//     ctx.fillStyle = colors.solution;
//     ctx.beginPath();
//     ctx.rect(
//       solution.x - options.solutionSize / 6,
//       solution.y - options.solutionSize / 2,
//       options.solutionSize / 3,
//       options.solutionSize,
//     );
//     ctx.fill();
//     ctx.beginPath();
//     ctx.rect(
//       solution.x - options.solutionSize / 2,
//       solution.y - options.solutionSize / 6,
//       options.solutionSize,
//       options.solutionSize / 3,
//     );
//     ctx.fill();
//   }, [history, properties, options, iteration, bounds]);
//
//   return (
//     <div className={"flex flex-col gap-2"}>
//       {size && (
//         <canvas
//           className={"bg-neutral-900 rounded-md"}
//           ref={canvasRef}
//           height={size}
//           width={size}
//         />
//       )}
//       <AnimationsControls
//         length={history.length}
//         iteration={iteration}
//         animationStatus={animationStatus}
//         onAnimationPause={onAnimationPause}
//         onAnimationStart={onAnimationStart}
//         onIterationChange={onIterationChange}
//       />
//     </div>
//   );
// };
//
// const AnimationsControls = ({
//   iteration,
//   length,
//   animationStatus,
//   onAnimationStart,
//   onAnimationPause,
//   onIterationChange,
// }: {
//   length: number;
//   iteration: number;
//   animationStatus: AnimationStatus;
//   onAnimationPause: () => any;
//   onAnimationStart: () => any;
//   onIterationChange: (nextIteration: number) => any;
// }) => {
//   return (
//     <div
//       className={`flex items-center gap-2 !z-[10] h-10 w-full px-2 rounded-md ${layoutColors.neutral.background.light}`}
//     >
//       <button
//         onClick={() =>
//           animationStatus.isRunning ? onAnimationPause() : onAnimationStart()
//         }
//       >
//         <FontAwesomeIcon icon={animationStatus.isRunning ? faPause : faPlay} />
//       </button>
//       <span
//         style={{ width: `${(length.toString().length * 2 + 1) * 9}px` }}
//         className={"font-mono text-xs"}
//       >
//         {iteration}/{length}
//       </span>
//       <RangeInput
//         step={1}
//         min={0}
//         max={length}
//         value={iteration}
//         onMouseDown={() => onAnimationPause()}
//         onChange={(e) => onIterationChange(parseInt(e.target.value))}
//       />
//     </div>
//   );
// };
//
// export default GwoCanvas;
