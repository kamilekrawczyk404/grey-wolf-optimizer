import {BenchmarkFunctions} from "@/types/types";
import {benchmarkFunctions} from "@/utils/benchmarks";

const getColor = (value: number) => {
    // Invert the value to get the correlated color
    // value: 0 -> (minimum) 240 blue
    // value: 1 -> (maximum) 0 red
    const hue = (1 - value) * 240;

    return `hsl(${hue}, 100%, 50%)`;
}

export const generateHeatmapTexture = (
    funcName: BenchmarkFunctions,
    bounds: {min: number, max: number},
    resolution: number = 100
): HTMLCanvasElement | null => {
    if (!funcName || !benchmarkFunctions[funcName]) {
        console.error("Invalid function name:", funcName);
        return null;
    }

    const benchmarkFunction = benchmarkFunctions[funcName];

    const canvas = document.createElement('canvas');
    canvas.width = resolution;
    canvas.height = resolution;
    const ctx = canvas.getContext("2d");

    if (!ctx) return null;

    const values: number[] = [];

    let minZ = Infinity;
    let maxZ = -Infinity
    // const step = (bounds.max - bounds.min) / resolution;

    const range = (bounds.max - bounds.min);

    for (let py = 0; py < resolution; py++) {
        for (let px = 0; px < resolution; px++) {
            const x = bounds.min + (px / resolution) * range
            // Values on y-axis grows from up do down
            const y = bounds.max - (py / resolution) * range

            const z = benchmarkFunction(x, y);
            values.push(z);

            if (z < minZ) minZ = z;
            if (z > maxZ) maxZ = z;
        }
    }

    // For better scaling bigger values
    const logRange = Math.log(maxZ - minZ + 1);

    // Prevent delivering by 0
    if (Math.abs(maxZ - minZ) < 0.000001) maxZ = minZ + 1;

    let i = 0;
    for (let py = 0; py < resolution; py++) {
        for (let px = 0; px < resolution; px++) {
            const z = values[i++];

            const normalized = Math.log(z - minZ + 1) / logRange;

            ctx.fillStyle = getColor(normalized);
            ctx.fillRect(px, py, 1, 1 );
        }
    }

    return canvas;
}