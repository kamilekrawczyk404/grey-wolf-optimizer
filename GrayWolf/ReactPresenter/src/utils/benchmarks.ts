import {BenchmarkFunctions} from "@/types/types";

export type BenchmarkFunctionSchema = (x: number, y: number) => number;

export const benchmarkFunctions: Record<BenchmarkFunctions, BenchmarkFunctionSchema> = {
    [BenchmarkFunctions.Beale]: (x, y) => {
        return (1.5 - x + x * y) ** 2 + (2.25 - x + x * y ** 2) ** 2 + (2.625 - x + x * y ** 3) ** 2;
    },
    [BenchmarkFunctions.Rastrigin]: (x, y) => {
        return 20 + x ** 2 - 10 * Math.cos(2 * Math.PI * x) + y ** 2 - 10 * Math.cos(2 * Math.PI * y);
    },
    [BenchmarkFunctions.Sphere]: (x, y) => {
        return x ** 2 + y ** 2;
    },
    [BenchmarkFunctions.BukinN6]: (x, y) => {
        return 100 * Math.sqrt(Math.abs(y - 0.01 * x ** 2)) + 0.01 * Math.abs(x + 10);
    },
    [BenchmarkFunctions.RosenBrock]: (x, y) => {
        return (1 - x) ** 2 + 100 * (y - x ** 2) ** 2
    },
}