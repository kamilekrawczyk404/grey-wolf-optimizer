using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.IO;
using Microsoft.Win32;


namespace GrayWolf
{
    internal class RaportingSystem
    {
        int n { get; set; } // rozmiar populacji
        int D { get; set; }
        int IterNum { get; set; }
        IBenchmarkFunc funkcja { get; set; }
        double min { get; set; }
        double max { get; set; }

        int testAmount { get; set; }

        string jsonString { get; set; } = string.Empty;

        public RaportingSystem(int n, int D, int IterNum, IBenchmarkFunc funkcja, double min_range, double max_range, int testAmount)
        {
            this.n = n;
            this.D = D;
            this.IterNum = IterNum;
            this.funkcja = funkcja;
            this.min = min_range;
            this.max = max_range;
            this.testAmount = testAmount;
        }
        public void InitializeTest()
        {
            int algorithmRunsAmount = 0; // całkowita liczba wywołań funkcji algorytmu
            List<double[]> allSolutionVectors = new List<double[]>(); // przechowa wektory rozwiązań ze wszystkich przebiegów
            List<double> allObjFuncValues = new List<double>(); // przechowa wartości funkcji celu ze wszystkich przebiegów

            string bestJsonString = ""; // przechowa JSON z najlepszego przebiegu
            double bestOverallScore = double.MaxValue; 


            for (int j = 0; j < testAmount; j++)
            {
                GWOptimizer optimizer = new GWOptimizer(n, D, IterNum, funkcja, min, max);
                (double[] najlepszy, string jsonString, algorithmRunsAmount) = optimizer.Optimise();

                double objectiveScore = funkcja.Calculate_Value(najlepszy);

                allSolutionVectors.Add(najlepszy);
                allObjFuncValues.Add(objectiveScore);

                if (objectiveScore < bestOverallScore) // aktualizacja najlepszego wyniku
                {
                    bestOverallScore = objectiveScore;
                    bestJsonString = jsonString;
                }
            }

            // obliczanie statystyk

            double bestScore = allObjFuncValues.Min();
            double worstScore = allObjFuncValues.Max();
            int bestIndex = allObjFuncValues.IndexOf(bestScore);
            int worstIndex = allObjFuncValues.IndexOf(worstScore);
            double[] bestVector = allSolutionVectors[bestIndex]; // wektor z najlepszego przebiegu
            double[] worstVector = allSolutionVectors[worstIndex]; // wektor z najgorszego przebiegu


            double meanObjective = CalculateMean(allObjFuncValues);
            double stdDevObjective = CalculateStdDev(allObjFuncValues, meanObjective);
            string coeffOfVarObjectiveReport;

            // Obsługa specjalnego przypadku (gdy średnia ≈ 0)
            if (Math.Abs(meanObjective) < 1e-10)
            {
                coeffOfVarObjectiveReport = $"Średnia bliska zeru (Odch. Std. = {stdDevObjective:G5})";
            }
            else
            {
                double coeffOfVarObjective = (stdDevObjective / meanObjective) * 100.0;
                coeffOfVarObjectiveReport = $"{coeffOfVarObjective:F2}% (Średnia = {meanObjective:G5}, Odch. Std.= {stdDevObjective:G5})";
            }

            string[] coeffOfVarCoordReport = new string[D];
            for (int i = 0; i < D; i++)
            {
                List<double> coord_i_values = allSolutionVectors.Select(vec => vec[i]).ToList();

                double meanCoord = CalculateMean(coord_i_values);
                double stdDevCoord = CalculateStdDev(coord_i_values, meanCoord);

                if (Math.Abs(meanCoord) < 1e-10)
                {
                    coeffOfVarCoordReport[i] = $"Średnia bliska zeru (Odch. Std. = {stdDevCoord:G5})";
                }
                else
                {
                    double coeffOfVarCoord = (stdDevCoord / meanCoord) * 100.0;
                    coeffOfVarCoordReport[i] = $"{coeffOfVarCoord:F2}% (Średnia = {meanCoord:G5}, Odch. Std. = {stdDevCoord:G5})";
                }
            }

            StringBuilder strBuilder = new StringBuilder();

            strBuilder.Append($"=== TEST (Na podstawie n = {testAmount} uruchomień) ===\n\n");
            strBuilder.Append($"Użyta funkcja: {funkcja}\n");
            strBuilder.Append("--- Parametry Algorytmu ---\n");
            strBuilder.Append($"Liczba wymiarów (D): {D}\n");
            strBuilder.Append($"Wielkość populacji (N): {n}\n");
            strBuilder.Append($"Liczba iteracji (I): {IterNum}\n");
            strBuilder.Append($"Zakres wartości: [{min}, {max}]\n\n");
            strBuilder.Append($"Liczba wywołań funkcji algorytmu: {algorithmRunsAmount}\n");
            strBuilder.Append("--------------------------------------------------\n");

            strBuilder.Append("Najlepszy wynik:\n");
            strBuilder.Append($"   Wartość funkcji celu: {bestScore:G10}\n");
            strBuilder.Append("   Poszukiwane parametry:\n");
            for (int i = 0; i < bestVector.Length; i++)
            {
                strBuilder.Append($"     x[{i}] = {bestVector[i]:G10}\n");
            }

            strBuilder.Append("\nNajgorszy wynik:\n");
            strBuilder.Append($"   Wartość funkcji celu: {worstScore:G10}\n");
            strBuilder.Append("   Poszukiwane parametry:\n");
            for (int i = 0; i < worstVector.Length; i++)
            {
                strBuilder.Append($"     x[{i}] = {worstVector[i]:G10}\n");
            }

            strBuilder.Append("\nWspółczynnik zmienności (WZ):\n");
            strBuilder.Append($"   Dla wartości funkcji celu: {coeffOfVarObjectiveReport}\n");
            strBuilder.Append("   Dla współrzędnych wektora:\n");
            for (int i = 0; i < coeffOfVarCoordReport.Length; i++)
            {
                strBuilder.Append($"     WZ dla (x[{i}]): {coeffOfVarCoordReport[i]}\n");
            }
            strBuilder.Append("--------------------------------------------------\n");



            // Tworzymy raport tekstowy i JSON

            if (SaveData(strBuilder)) // zapisujemy raport do pliku .txt
            {
                Console.WriteLine("Raport został zapisany na Pulpicie.");
            }
            else
            {
                Console.WriteLine("\nNie udało się zapisać raportu.");
            }

            if (SaveJson(jsonString)) // zapisujemy raport do pliku .json
            {
                Console.WriteLine("Plik JSON został zapisany na Pulpicie.");
            }
            else
            {
                Console.WriteLine("Nie udało się zapisać pliku JSON.");
            }
        }
        private double CalculateMean(List<double> values)
        {
            if (values.Count == 0) return 0;
            return values.Average();
        }
        private double CalculateStdDev(List<double> values, double mean)
        {
            if (values.Count == 0) return 0;

            // Suma kwadratów różnic od średniej
            double sumOfSquares = values.Select(val => (val - mean) * (val - mean)).Sum();

            // Zgodnie z Twoim wzorem: sqrt( Sum( (xi-µ)^2 ) / n )
            return Math.Sqrt(sumOfSquares / values.Count);
        }

        private bool SaveData(StringBuilder data)
        {
            string defaultPath = Environment.GetFolderPath(Environment.SpecialFolder.Desktop); // ścieżka do pulpitu
            string fileName = $"GWO_Raport_{DateTime.Now.ToString("MM-dd-yyyy HH-mm-ss")}.txt";

            string fullPath = Path.Combine(defaultPath, fileName);

            try 
            {
                File.WriteAllText(fullPath, data.ToString());
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine("Błąd podczas zapisywania pliku '.txt': " + ex.Message);
                return false;
            }
        }

        private bool SaveJson(string jsonString)
        {
            string defaultPath = Environment.GetFolderPath(Environment.SpecialFolder.Desktop); // ścieżka do pulpitu
            string fileName = $"GWO_JSON-Raport_{DateTime.Now.ToString("MM-dd-yyyy HH-mm-ss")}.json";
            string fullPath = Path.Combine(defaultPath, fileName);
            try
            {
                File.WriteAllText(fullPath, jsonString);
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine("Błąd podczas zapisywania pliku '.json': " + ex.Message);
                return false;
            }
        }
    }
}