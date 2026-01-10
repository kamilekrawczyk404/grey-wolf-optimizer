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
                Properies = new ReportProperies
                {
                    Dimensions = dim,
                    PopulationSize = populationSize,
                    Iterations = iterations,
                    LowerBound = lowerBound,
                    UpperBound = upperBound,
                    BenchmarkFunction = function.ToString(),
                    BestFitness = bestFitness,
                    BestSolution = bestSolution,
                    GlobalMinimumCoords = function.GlobalMinimum
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
                Properies = new ReportProperies
                {
                    Dimensions = dim,
                    PopulationSize = populationSize,
                    Iterations = iterations,
                    LowerBound = lowerBound,
                    UpperBound = upperBound,
                    BenchmarkFunction = function.ToString(),
                    BestFitness = bestTrial.BestFitness,
                    BestSolution = bestTrial.BestSolution,
                    GlobalMinimumCoords = function.GlobalMinimum
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

        // potrzebne do generowania raportu porównawczego (między algorytmami)
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

        public void GenerateMultiTrialComparisonReport(string functionName, List<MultiTrialComparisonResult> results)
        {
            StringBuilder strBuilder = new StringBuilder();
            strBuilder.Append($"\n\n=== RAPORT PORÓWNAWCZY WIELOPRÓBOWY DLA FUNKCJI: {functionName} ===\n");
            strBuilder.Append($"Data: {DateTime.Now}\n\n");
            strBuilder.Append($"Liczba algorytmów porównywanych: {results.Count}\n\n");
            strBuilder.Append(new string('-', 120) + "\n");
            strBuilder.Append("PODSUMOWANIE (posortowane według najlepszego wyniku):\n");
            strBuilder.Append(new string('-', 120) + "\n");

            strBuilder.Append($"{"Algorytm",-20} {"Najlepszy",-15} {"Najgorszy",-15} {"Średni",-15} {"Mediana",-15} {"Odch.std",-15} {"Wsp zm",-10}\n");
            strBuilder.Append(new string('-', 120) + "\n");

            foreach (var result in results.OrderBy(x => x.BestFitness))
            {
                strBuilder.Append($"{result.AlgorithmName,-20} ");
                strBuilder.Append($"{result.BestFitness,-15:E6} ");
                strBuilder.Append($"{result.WorstFitness,-15:E6} ");
                strBuilder.Append($"{result.MeanFitness,-15:E6} ");
                strBuilder.Append($"{result.MedianFitness,-15:E6} ");
                strBuilder.Append($"{result.StdDevFitness,-15:E6} ");
                strBuilder.AppendLine($"{result.CoeffOfVariationFitness,-10:F2}%");
            }

            strBuilder.Append(new string('-', 120) + "\n");

            // Szczegóły poszczególnych algorytmów
            strBuilder.Append("SZCZEGÓŁOWE PORÓWNANIE ALGORYTMÓW:\n\n");

            foreach (var result in results.OrderBy(x => x.BestFitness))
            {
                strBuilder.Append($"{'=',80}\n");
                strBuilder.Append($"Algorytm: {result.AlgorithmName}\n");
                strBuilder.Append($"{'=',80}\n");
                strBuilder.Append($"Liczba prób: {result.TrialsCount}\n");
                strBuilder.Append($"Liczba iteracji na próbę: {result.TrialsCount}\n\n");

                strBuilder.Append($"Statystyki wartości funkcji celu:\n");
                strBuilder.Append($"  Najlepsza wartość: {result.BestFitness:E6}\n");
                strBuilder.Append($"  Najgorsza wartość: {result.WorstFitness:E6}\n");
                strBuilder.Append($"  Średnia wartość: {result.MeanFitness:E6}\n");
                strBuilder.Append($"  Mediana wartości: {result.MedianFitness:E6}\n");
                strBuilder.Append($"  Odchylenie standardowe: {result.StdDevFitness:E6}\n");
                strBuilder.Append($"  Współczynnik zmienności: {result.CoeffOfVariationFitness:F2}%\n\n");

                strBuilder.Append("Najlepsze rozwiązanie znalezione w próbie:\n");
                strBuilder.Append("  [");
                strBuilder.Append(string.Join(", ", result.BestSolution.Select(x => x.ToString("F6"))));
                strBuilder.AppendLine("]\n");
            }

            strBuilder.Append(new string('-', 120) + "\n");
            strBuilder.Append("Analiza statystyczna\n");
            strBuilder.Append(new string('-', 120) + "\n");

            var bestAlgorithm = results.OrderBy(x => x.BestFitness).First();
            var worstAlgorithm = results.OrderBy(x => x.BestFitness).Last();

            strBuilder.AppendLine($"Najlepszy algorytm (według najlepszego wyniku): {bestAlgorithm.AlgorithmName}");
            strBuilder.AppendLine($"Wynik najlepszego algorytmu: {bestAlgorithm.BestFitness:E6}\n");
            strBuilder.AppendLine($"Najgorszy algorytm (według najlepszego wyniku): {worstAlgorithm.AlgorithmName}");
            strBuilder.AppendLine($"Wynik najgorszego algorytmu: {worstAlgorithm.BestFitness:E6}\n");

            var mostConsistent = results.OrderBy(x => x.CoeffOfVariationFitness).First();
            strBuilder.AppendLine($"Najbardziej spójny algorytm (według współczynnika zmienności): {mostConsistent.AlgorithmName}");
            strBuilder.AppendLine($"Współczynnik zmienności najlepszego algorytmu: {mostConsistent.CoeffOfVariationFitness:F2}%\n");

            var bestMean = results.OrderBy(x => x.MeanFitness).First();
            strBuilder.AppendLine($"Algorytm o najlepszej średniej wartości: {bestMean.AlgorithmName}");
            strBuilder.AppendLine($"Średnia wartość najlepszego algorytmu: {bestMean.MeanFitness:E6}\n");

            // Rekomendacje
            strBuilder.Append(new string('-', 120) + "\n");
            strBuilder.Append("REKOMENDACJE:\n");
            strBuilder.Append(new string('-', 120) + "\n");

            if (bestAlgorithm.AlgorithmName == mostConsistent.AlgorithmName)
            {
                strBuilder.AppendLine($"Algorytm {bestAlgorithm.AlgorithmName} jest zarówno najlepszy pod względem wyniku, jak i spójności. Zalecany do dalszych zastosowań.");
            }
            else
            {
                strBuilder.AppendLine($"Algorytm {bestAlgorithm.AlgorithmName} osiągnął najlepszy wyniki, ale ma większą zmienność.");
                strBuilder.AppendLine($"Algorytm {mostConsistent.AlgorithmName} jest bardziej przewidywalny, ale osiągnął gorszy wynik.");
                strBuilder.AppendLine($"Jeśli stabilność jest kluczowa, zalecany jest {mostConsistent.AlgorithmName}. Jeśli priorytetem jest najlepszy wynik, zalecany jest {bestAlgorithm.AlgorithmName}.");
            }

            string path = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Desktop), $"MultiTrial_Comparison_Report_{functionName}_{DateTime.Now:yyyy-MM-dd_HH-mm-ss}.txt");
            File.WriteAllText(path, strBuilder.ToString());
            Console.WriteLine($"Raport porównawczy wielopróbowy zapisany na pulpicie: {path}");
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