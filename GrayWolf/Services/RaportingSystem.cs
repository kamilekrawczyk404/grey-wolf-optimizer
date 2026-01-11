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

        public void GenerateFunctionComparisonReport(string algorithmName, List<SingleTrialFunctionResult> results,
            int iterations, int populationSize, int dimensions, double lowerBound, double upperBound)
        {
            StringBuilder strBuilder = new StringBuilder();
            strBuilder.Append($"\n\n{'=',80}\n");
            strBuilder.Append($"RAPORT PORÓWNAWCZY FUNKCJI DLA ALGORYTMU: {algorithmName}\n");
            strBuilder.Append($"{'=',80}\n");
            strBuilder.Append($"Data: {DateTime.Now}\n");
            strBuilder.Append($"Liczba funkcji testowych: {results.Count}\n");
            strBuilder.Append($"Parametry testu:\n");
            strBuilder.Append($"  - Wielkość populacji: {populationSize}\n");
            strBuilder.Append($"  - Liczba iteracji: {iterations}\n");
            strBuilder.Append($"  - Liczba wymiarów: {dimensions}\n");
            strBuilder.Append($"  - Zakres: [{lowerBound}, {upperBound}]\n\n");

            // podsumowanie wyników funkcji
            strBuilder.Append("PODSUMOWANIE (posortowane według najlepszego wyniku):\n");
            strBuilder.Append(new string('-', 100) + "\n");
            strBuilder.Append($"{"Funkcja testowa",-30} {"Najlepszy Fitness",-25} {"Liczba ewaluacji",-20} {"Ranga",-10}\n");
            strBuilder.Append(new string('-', 100) + "\n");

            var sortedResults = results.OrderBy(r => r.BestFitness).ToList();
            int rank = 1;
            foreach (var result in sortedResults)
            {
                strBuilder.Append($"{result.FunctionName,-30} ");
                strBuilder.Append($"{result.BestFitness,-25:E6} ");
                strBuilder.Append($"{result.EvaluationsCount,-20} ");
                strBuilder.AppendLine($"{rank,-10}");
                rank++;
            }

            strBuilder.Append(new string('-', 100) + "\n\n");

            strBuilder.Append("SZCZEGÓŁOWE WYNIKI FUNKCJI:\n\n");

            foreach (var result in sortedResults)
            {
                strBuilder.Append($"{'=',80}\n");
                strBuilder.Append($"Funkcja: {result.FunctionName}\n");
                strBuilder.Append($"{'=',80}\n");
                strBuilder.Append($"Najlepsza wartość funkcji celu: {result.BestFitness:E6}\n");
                strBuilder.Append($"Liczba ewaluacji: {result.EvaluationsCount}\n\n");

                strBuilder.Append("Najlepsze rozwiązanie:\n");
                strBuilder.Append("  [");
                strBuilder.Append(string.Join(", ", result.BestSolution.Select(x => x.ToString("F6"))));
                strBuilder.AppendLine("]\n");
            }

            // analiza wyników
            strBuilder.Append(new string('-', 80) + "\n");
            strBuilder.Append("ANALIZA:\n");
            strBuilder.Append(new string('-', 80) + "\n");

            var bestResult = sortedResults.First();
            var worstResult = sortedResults.Last();

            strBuilder.AppendLine($"Najlepsza wydajność na funkcji: {bestResult.FunctionName}");
            strBuilder.AppendLine($"  Fitness: {bestResult.BestFitness:E6}\n");

            strBuilder.AppendLine($"Najgorsza wydajność na funkcji: {worstResult.FunctionName}");
            strBuilder.AppendLine($"  Fitness: {worstResult.BestFitness:E6}\n");

            double avgFitness = sortedResults.Average(r => r.BestFitness);
            strBuilder.AppendLine($"Średnia wartość fitness na wszystkich funkcjach: {avgFitness:E6}");

            string path = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.Desktop),
                $"{algorithmName}_Function_Comparison_{DateTime.Now:yyyy-MM-dd_HH-mm-ss}.txt"
            );

            File.WriteAllText(path, strBuilder.ToString());
            Console.WriteLine($"Raport porównawczy funkcji zapisany: {path}");
        }

        public void GenerateMultiTrialFunctionComparisonReport(string algorithmName, List<MultiTrialFunctionResult> results,
            int iterations, int populationSize, int dimensions, double lowerBound, double upperBound)
        {
            StringBuilder strBuilder = new StringBuilder();
            strBuilder.Append($"\n\n{'=',80}\n");
            strBuilder.Append($"RAPORT PORÓWNAWCZY WIELOPRÓBOWY FUNKCJI DLA ALGORYTMU: {algorithmName}\n");
            strBuilder.Append($"{'=',80}\n");
            strBuilder.Append($"Data: {DateTime.Now}\n");
            strBuilder.Append($"Liczba funkcji testowych: {results.Count}\n");

            if (results.Count > 0)
            {
                strBuilder.Append($"Liczba prób na funkcję: {results.First().TrialsCount}\n");
            }

            strBuilder.Append($"Parametry testu:\n");
            strBuilder.Append($"  - Wielkość populacji: {populationSize}\n");
            strBuilder.Append($"  - Liczba iteracji: {iterations}\n");
            strBuilder.Append($"  - Liczba wymiarów: {dimensions}\n");
            strBuilder.Append($"  - Zakres: [{lowerBound}, {upperBound}]\n\n");

            // Summary table sorted by best fitness
            strBuilder.Append("PODSUMOWANIE (posortowane według najlepszego wyniku):\n");
            strBuilder.Append(new string('-', 130) + "\n");
            strBuilder.Append($"{"Funkcja",-25} {"Najlepszy",-15} {"Najgorszy",-15} {"Średni",-15} {"Mediana",-15} {"Odch.std",-15} {"Wsp.zm",-10} {"Ranga",-10}\n");
            strBuilder.Append(new string('-', 130) + "\n");

            var sortedResults = results.OrderBy(r => r.BestFitness).ToList();
            int rank = 1;

            foreach (var result in sortedResults)
            {
                strBuilder.Append($"{result.FunctionName,-25} ");
                strBuilder.Append($"{result.BestFitness,-15:E6} ");
                strBuilder.Append($"{result.WorstFitness,-15:E6} ");
                strBuilder.Append($"{result.MeanFitness,-15:E6} ");
                strBuilder.Append($"{result.MedianFitness,-15:E6} ");
                strBuilder.Append($"{result.StdDevFitness,-15:E6} ");
                strBuilder.Append($"{result.CoeffOfVariationFitness,-10:F2}% ");
                strBuilder.AppendLine($"{rank,-10}");
                rank++;
            }

            strBuilder.Append(new string('-', 130) + "\n\n");

            // Detailed results for each function
            strBuilder.Append("SZCZEGÓŁOWE WYNIKI DLA POSZCZEGÓLNYCH FUNKCJI:\n\n");

            foreach (var result in sortedResults)
            {
                strBuilder.Append($"{'=',80}\n");
                strBuilder.Append($"Funkcja: {result.FunctionName}\n");
                strBuilder.Append($"{'=',80}\n");
                strBuilder.Append($"Liczba prób: {result.TrialsCount}\n\n");

                strBuilder.Append("Statystyki wartości funkcji celu:\n");
                strBuilder.Append($"  Najlepsza wartość:       {result.BestFitness:E6}\n");
                strBuilder.Append($"  Najgorsza wartość:       {result.WorstFitness:E6}\n");
                strBuilder.Append($"  Średnia wartość:         {result.MeanFitness:E6}\n");
                strBuilder.Append($"  Mediana:                 {result.MedianFitness:E6}\n");
                strBuilder.Append($"  Odchylenie standardowe:  {result.StdDevFitness:E6}\n");
                strBuilder.Append($"  Współczynnik zmienności: {result.CoeffOfVariationFitness:F2}%\n\n");

                strBuilder.Append("Najlepsze rozwiązanie:\n");
                strBuilder.Append("  [");
                strBuilder.Append(string.Join(", ", result.BestSolution.Select(x => x.ToString("F6"))));
                strBuilder.AppendLine("]\n");
            }

            // Statistical analysis
            strBuilder.Append(new string('-', 80) + "\n");
            strBuilder.Append("ANALIZA STATYSTYCZNA:\n");
            strBuilder.Append(new string('-', 80) + "\n");

            var bestResult = sortedResults.First();
            var worstResult = sortedResults.Last();
            var mostConsistent = results.OrderBy(r => r.CoeffOfVariationFitness).First();

            strBuilder.AppendLine($"Najlepsza wydajność (według najlepszego wyniku): {bestResult.FunctionName}");
            strBuilder.AppendLine($"   Fitness: {bestResult.BestFitness:E6}\n");

            strBuilder.AppendLine($"Najbardziej spójna wydajność (najniższy CV): {mostConsistent.FunctionName}");
            strBuilder.AppendLine($"   Współczynnik zmienności: {mostConsistent.CoeffOfVariationFitness:F2}%\n");

            strBuilder.AppendLine($"Najgorsza wydajność: {worstResult.FunctionName}");
            strBuilder.AppendLine($"   Fitness: {worstResult.BestFitness:E6}\n");

            double avgBestFitness = results.Average(r => r.BestFitness);
            double avgMeanFitness = results.Average(r => r.MeanFitness);

            strBuilder.AppendLine($"Średnia najlepszych wyników ze wszystkich funkcji: {avgBestFitness:E6}");
            strBuilder.AppendLine($"Średnia średnich wyników ze wszystkich funkcji: {avgMeanFitness:E6}");

            // Recommendations
            strBuilder.Append("\n" + new string('-', 80) + "\n");
            strBuilder.Append("REKOMENDACJE:\n");
            strBuilder.Append(new string('-', 80) + "\n");

            strBuilder.AppendLine($"Algorytm {algorithmName} najlepiej radzi sobie z funkcją {bestResult.FunctionName}.");

            if (bestResult.FunctionName == mostConsistent.FunctionName)
            {
                strBuilder.AppendLine($"Dodatkowo, wyniki na tej funkcji są najbardziej konsekwentne.");
            }
            else
            {
                strBuilder.AppendLine($"Jednak najbardziej przewidywalne wyniki uzyskano na funkcji {mostConsistent.FunctionName}.");
            }

            strBuilder.AppendLine($"\nAlgorytm ma największe trudności z funkcją {worstResult.FunctionName}.");

            // Function difficulty ranking
            strBuilder.AppendLine($"\nRanking funkcji wg trudności dla algorytmu {algorithmName}:");
            strBuilder.AppendLine("(1 = najłatwiejsza, im wyższa ranga tym trudniejsza funkcja)");

            for (int i = 0; i < sortedResults.Count; i++)
            {
                strBuilder.AppendLine($"  {i + 1}. {sortedResults[i].FunctionName} (fitness: {sortedResults[i].BestFitness:E6})");
            }

            string path = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.Desktop),
                $"{algorithmName}_MultiTrial_Function_Comparison_{DateTime.Now:yyyy-MM-dd_HH-mm-ss}.txt"
            );

            File.WriteAllText(path, strBuilder.ToString());
            Console.WriteLine($"Raport porównawczy wielopróbowy funkcji zapisany: {path}");
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