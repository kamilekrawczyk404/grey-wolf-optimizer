using GrayWolf.Model;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GrayWolf.Services
{
    public static class StatisticsService
    {
        public static StatisticalSummary CalculateStats(List<TrialResult> trials)
        {
            if (trials == null || trials.Count == 0)
                throw new ArgumentException("Trials list cannot be null or empty.");

            var sortedTrials = trials.OrderBy(t => t.BestFitness).ToList();

            // determine if we should exclude the worst trial
            int trialsToExclude = trials.Count > 2 ? 2 : 0;
            int trialsForStatsInt = trials.Count - trialsToExclude;

            var trialsForStats = sortedTrials.Take(trialsForStatsInt).ToList();

            // get fitness values
            var fitnessValues = trialsForStats.Select(t => t.BestFitness).ToList();
            var allFitnessValues = sortedTrials.Select(t => t.BestFitness).ToList();

            // best and worst
            var bestTrial = sortedTrials.First();
            var worstTrial = sortedTrials.Last();

            // calculate fitness stats
            double meanFitness = fitnessValues.Average();
            double medianFitness = CalculateMedian(fitnessValues);
            double stdDevFitness = CalculateStandardDeviation(fitnessValues, meanFitness);
            double coeffOfVariationFitness = meanFitness != 0 ? (stdDevFitness / Math.Abs(meanFitness)) * 100 : 0;

            if (meanFitness < 0.0001 && meanFitness > -0.0001)
                coeffOfVariationFitness = 0;

            // calculate solution params stats
            int dimension = bestTrial.BestSolution.Length;
            double[] meanSolution = new double[dimension];
            double[] stdDevSolution = new double[dimension];
            double[] coeffOfVariationSolution = new double[dimension];

            for (int dim = 0; dim < dimension; dim++)
            {
                var dimValues = trialsForStats.Select(t => t.BestSolution[dim]).ToList();
                meanSolution[dim] = dimValues.Average();
                stdDevSolution[dim] = CalculateStandardDeviation(dimValues, meanSolution[dim]);
                double dimCoeffOfVariation = meanSolution[dim] != 0 ? (stdDevSolution[dim] / Math.Abs(meanSolution[dim])) * 100 : 0;
                if (meanSolution[dim] < 0.0001 && meanSolution[dim] > -0.0001)
                    dimCoeffOfVariation = 0;
            }

            return new StatisticalSummary
            {
                BestFitness = bestTrial.BestFitness,
                WorstFitness = worstTrial.BestFitness,
                BestSolution = bestTrial.BestSolution,
                WorstSolution = worstTrial.BestSolution,

                MeanFitness = meanFitness,
                MedianFitness = medianFitness,
                StdDevFitness = stdDevFitness,
                CoeffOfVariationFitness = coeffOfVariationFitness,

                MeanSolution = meanSolution,
                StdDevSolution = stdDevSolution,
                CoeffOfVariationSolution = coeffOfVariationSolution,

                TotalTrials = trials.Count,
                TrialsUsedForStats = trialsForStatsInt,
                AllFitnessValues = allFitnessValues,
                AllTrials = sortedTrials
            };
        }

        private static double CalculateMedian(List<double> values)
        {
            var sorted = values.OrderBy(v => v).ToList();
            int count = sorted.Count;

            if (count % 2 == 0)
            {
                return (sorted[count / 2 - 1] + sorted[count / 2]) / 2.0;
            }
            else
            {
                return sorted[count / 2];
            }
        }

        private static double CalculateStandardDeviation(List<double> values, double mean)
        {
            if (values.Count <= 1) return 0;

            double sumSquaredDiff = values.Sum(v => Math.Pow(v - mean, 2));
            return Math.Sqrt(sumSquaredDiff / (values.Count - 1)); // Sample std dev
        }

        public static string FormatStats(StatisticalSummary stats, string algorithmName, string functionName)
        {
            var strBuilder = new StringBuilder();

            strBuilder.AppendLine($"\n=== STATYSTYKI DLA: {algorithmName} na funkcji {functionName} ===");
            strBuilder.AppendLine($"Liczba prób: {stats.TotalTrials}");
            strBuilder.AppendLine($"Liczba prób użytych do statystyk: {stats.TrialsUsedForStats}");
            strBuilder.AppendLine();

            strBuilder.AppendLine("Statystyki wartości funkcji celu:");
            strBuilder.AppendLine($"  Najlepsza wartość: {stats.BestFitness:F6}");
            strBuilder.AppendLine($"  Najgorsza wartość: {stats.WorstFitness:F6}");
            strBuilder.AppendLine($"  Średnia wartość: {stats.MeanFitness:F6}");
            strBuilder.AppendLine($"  Mediana wartości: {stats.MedianFitness:F6}");
            strBuilder.AppendLine($"  Odchylenie standardowe: {stats.StdDevFitness:F6}");
            strBuilder.AppendLine($"  Współczynnik zmienności: {stats.CoeffOfVariationFitness:F2}%");
            strBuilder.AppendLine();

            strBuilder.AppendLine("Statystyki parametrów rozwiązania:");
            strBuilder.AppendLine("  Wymiar |   Średnia   | Odchylenie std | Współczynnik zmienności");
            strBuilder.AppendLine("--------|-------------|----------------|---------------------");
            for (int i = 0; i < stats.MeanSolution.Length; i++)
            {
                strBuilder.AppendLine($"   {i + 9}   | {stats.MeanSolution[i],13:F6} | {stats.StdDevSolution[i],13:F6} | {stats.CoeffOfVariationSolution[i],8:F2}%");
            }
            strBuilder.AppendLine();
            strBuilder.Append("Najlepsze rozwiązanie znalezione w próbie:");
            strBuilder.Append("  [");
            strBuilder.Append(string.Join(", ", stats.BestSolution.Select(x => x.ToString("F6"))));
            strBuilder.AppendLine("]");
            strBuilder.AppendLine();

            strBuilder.AppendLine("Wszystkie wartości funkcji celu z prób (posortowane):");
            strBuilder.Append("  ");
            strBuilder.AppendLine(string.Join(", ", stats.AllFitnessValues.Select(x => x.ToString("F6"))));

            return strBuilder.ToString();
        }
    }
}
