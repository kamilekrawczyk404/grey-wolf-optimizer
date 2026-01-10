using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.IO;
using GrayWolf.Interfaces;
using GrayWolf.Algorithms;
using System.Text.Json;
using GrayWolf.Model;

namespace GrayWolf.Services
{
    internal class RaportingSystem
    {
        public void GenerateReport(string algorithmName, IBenchmarkFunc function, double[] bestSolution,double bestFitness, List<IterationLog> historyLogs,
            int iterations, int populationSize, int dim, double lowerBound, double upperBound)
        {
            StringBuilder strBuilder = new StringBuilder();

            strBuilder.Append($"\n\n=== RAPORT KOŃCOWY: {algorithmName} ===\n");
            strBuilder.Append($"\nUżyta funkcja: {function}\n");

            if (bestSolution != null)
            {
                strBuilder.Append($"\nNajlepsze rozwiązanie (Fitness: {bestFitness}):");
                for (int i = 0; i < bestSolution.Length; i++)
                {
                    strBuilder.Append($"\nx[{i}] = {bestSolution[i]}");
                }
                strBuilder.Append("\n\nWartość funkcji celu: " + function.Calculate_Value(bestSolution) + "\n\n");
            }
            else
            {
                strBuilder.Append("\n\nNie udało się pobrać najlepszego rozwiązania (wynik jest null).\n\n");
            }

            SaveData(strBuilder, algorithmName);

            var vizualizerData = new FinalVisualizerReport
            {
                Description = $"{algorithmName} Test - {function}",
                Properties = new ReportProperties
                {
                    Algorithm = algorithmName,
                    Dimensions = dim,
                    PopulationSize = populationSize,
                    Iterations = iterations,
                    LowerBound = lowerBound,
                    UpperBound = upperBound,
                    BenchmarkFunction = function.ToString(),
                    BestFitness = bestFitness,
                    BestSolution = bestSolution,
                    Solution = function.GlobalMinimum
                },
                History = historyLogs
            };

            string jsonContent = JsonSerializer.Serialize(vizualizerData, new JsonSerializerOptions
            {
                WriteIndented = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });

            SaveJson(jsonContent, algorithmName);
        }

        public void GenerateMultiTrialReport(string algorithmName, IBenchmarkFunc function, StatisticalSummary stats,
            int iterations, int populationSize, int dim, double lowerBound, double upperBound)
        {
            StringBuilder strBuilder = new StringBuilder();
            strBuilder.Append($"\n\n=== RAPORT WIELOPRÓBOWY: {algorithmName} ===\n");
            strBuilder.Append($"\nData: {DateTime.Now}\n");
            strBuilder.Append($"\nUżyta funkcja: {function}\n\n");
            strBuilder.Append($"Liczba prób: {stats.TotalTrials}\n");
            strBuilder.Append($"Liczba wymiarów: {dim}\n");
            strBuilder.Append($"Wielkość populacji: {populationSize}\n");
            strBuilder.Append($"Liczba iteracji: {iterations}\n");
            strBuilder.Append($"Zakres wartości: [{lowerBound}, {upperBound}]\n\n");
            strBuilder.Append(new string('-', 90) + "\n");

            strBuilder.Append(StatisticsService.FormatStats(stats, algorithmName, function.ToString()));

            strBuilder.Append("\nSzczegóły wszystkich prób:\n");
            for (int i = 0; i < stats.AllTrials.Count; i++)
            {
                var trial = stats.AllTrials[i];
                strBuilder.Append($"\n--- Próba {trial.TrialNumber} ---\n");
                strBuilder.Append($"Funkcja celu w najlepszym rozwiązaniu: {trial.BestFitness:F6}\n");
                strBuilder.Append($"Najlepsze rozwiązanie: [");
                strBuilder.Append(string.Join(", ", trial.BestSolution.Select(x => x.ToString("F5"))));
                strBuilder.AppendLine("]");
                strBuilder.AppendLine($"Najlepsza wartość funkcji celu: {trial.BestFitness:F6}");
                strBuilder.AppendLine($"Liczba ewaluacji: {trial.EvaluationsCount}");
            }

            SaveData(strBuilder, algorithmName + "_MultiTrial");

            // generujemy jsona do wizualizera z najlepszej próby
            var bestTrial = stats.AllTrials.OrderBy(t => t.BestFitness).First();
            var vizualizerData = new FinalVisualizerReport
            {
                Description = $"{algorithmName} Multi-Trial Test - {function} (Best of {stats.TotalTrials})",
                Properties = new ReportProperties
                {
                    Algorithm = algorithmName,
                    Dimensions = dim,
                    PopulationSize = populationSize,
                    Iterations = iterations,
                    LowerBound = lowerBound,
                    UpperBound = upperBound,
                    BenchmarkFunction = function.ToString(),
                    BestFitness = bestTrial.BestFitness,
                    BestSolution = bestTrial.BestSolution,
                    Solution = function.GlobalMinimum
                },
                History = bestTrial.HistoryLogs
            };

            string jsonContent = JsonSerializer.Serialize(vizualizerData, new JsonSerializerOptions
            {
                WriteIndented = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });

            SaveJson(jsonContent, algorithmName + "_MultiTrial_Best");
        }

        // TO-DO: uzunąć to później, jeśli nie będzie potrzebne??
        public void GenerateComparisonReport(string functionName, List<ComparisonResult> results)
        {
            StringBuilder strBuilder = new StringBuilder();
            strBuilder.Append($"\n\n=== RAPORT PORÓWNAWCZY DLA FUNKCJI: {functionName} ===\n");
            strBuilder.Append($"Data: {DateTime.Now}\n\n");
            strBuilder.Append(new string('-', 90) + "\n");
            strBuilder.Append($"{"Algorytm",-20} {"Najlepszy Fitness",-20} {"Czas (ms)",-15} {"Ilość Iteracji",-15}\n");
            strBuilder.Append(new string('-', 90) + "\n");

            foreach(var result in results.OrderBy(x => x.BestFitness))
            {
                strBuilder.Append($"{result.AlgorithmName,-20} {result.BestFitness,-20:F4} {result.Iterations,-15}\n");
            }

            strBuilder.Append(new string('-', 90) + "\n");
            strBuilder.Append("Szczegóły poszczególnych uruchomień\n");

            foreach(var result in results)
            {
                strBuilder.Append($"\n--- {result.AlgorithmName} ---\n");
                strBuilder.Append("Pozycja: [");
                strBuilder.Append(string.Join(", ", result.BestSolution.Select(x => x.ToString("F5"))));
                strBuilder.AppendLine("]");
            }

            string path = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Desktop), $"Comparison_Report_{functionName}_{DateTime.Now:yyyy-MM-dd_HH-mm-ss}.txt");

            File.WriteAllText(path, strBuilder.ToString());
        }

        private bool SaveData(StringBuilder data, string algName)
        {
            string path = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Desktop), $"{algName}_Raport_{DateTime.Now:yyyy-MM-dd_HH-mm-ss}.txt");
            try { File.WriteAllText(path, data.ToString()); return true; }
            catch { return false; }
        }

        private bool SaveJson(string json, string algName)
        {
            string path = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Desktop), $"{algName}_Visualizer_{DateTime.Now:yyyy-MM-dd_HH-mm-ss}.json");
            try { File.WriteAllText(path, json); return true; }
            catch { return false; }
        }
    }
}