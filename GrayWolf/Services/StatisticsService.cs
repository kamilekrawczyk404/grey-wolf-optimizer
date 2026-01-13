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
            double coeffOfVariationFitness;
            if (Math.Abs(meanFitness) < 1e-12)
            {
                coeffOfVariationFitness = double.NaN; // undefined
            }
            else
            {
                coeffOfVariationFitness = (stdDevFitness / Math.Abs(meanFitness)) * 100.0;
            }


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

                if (Math.Abs(meanSolution[dim]) < 1e-12)
                {
                    coeffOfVariationSolution[dim] = double.NaN;
                }
                else
                {
                    coeffOfVariationSolution[dim] =
                        (stdDevSolution[dim] / Math.Abs(meanSolution[dim])) * 100.0;
                }
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
            strBuilder.AppendLine($"  Najlepsza wartość: {NumberFormatter.Format(stats.BestFitness)}");
            strBuilder.AppendLine($"  Najgorsza wartość: {NumberFormatter.Format(stats.WorstFitness)}");
            strBuilder.AppendLine($"  Średnia wartość: {NumberFormatter.Format(stats.MeanFitness)}");
            strBuilder.AppendLine($"  Mediana wartości: {NumberFormatter.Format(stats.MedianFitness)}");
            strBuilder.AppendLine($"  Odchylenie standardowe: {NumberFormatter.Format(stats.StdDevFitness)}");
            strBuilder.AppendLine($"  Współczynnik zmienności: {NumberFormatter.FormatPercent(stats.CoeffOfVariationFitness)}");
            strBuilder.AppendLine();

            strBuilder.AppendLine("Statystyki parametrów rozwiązania:");
            strBuilder.AppendLine("  Wymiar |   Średnia   | Odchylenie std | Współczynnik zmienności");
            strBuilder.AppendLine("--------|-------------|----------------|---------------------");
            for (int i = 0; i < stats.MeanSolution.Length; i++)
            {
                // Note: Padding is applied after the number formatting
                strBuilder.AppendLine($"   {i + 9}    | {NumberFormatter.Format(stats.MeanSolution[i]),13} | {NumberFormatter.Format(stats.StdDevSolution[i]),13} | {NumberFormatter.FormatPercent(stats.CoeffOfVariationSolution[i]),8}");
            }
            strBuilder.AppendLine();
            strBuilder.Append("Najlepsze rozwiązanie znalezione w próbie:");
            strBuilder.Append("  [");
            strBuilder.Append(string.Join(", ", stats.BestSolution.Select(x => NumberFormatter.Format(x))));
            strBuilder.AppendLine("]");
            strBuilder.AppendLine();

            strBuilder.AppendLine("Wszystkie wartości funkcji celu z prób (posortowane):");
            strBuilder.Append("  ");
            strBuilder.AppendLine(string.Join(", ", stats.AllFitnessValues.Select(x => NumberFormatter.Format(x))));

            return strBuilder.ToString();
        }
    }
}