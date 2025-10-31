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

        StringBuilder strBuilder { get; set; } = new StringBuilder();

        string jsonString { get; set; } = string.Empty;

        public RaportingSystem(int n, int D, int IterNum, IBenchmarkFunc funkcja, double min_range, double max_range)
        {
            this.n = n;
            this.D = D;
            this.IterNum = IterNum;
            this.funkcja = funkcja;
            this.min = min_range;
            this.max = max_range;
        }
        public void InitializeTest()
        {
            strBuilder.Append($"\n\n=== TEST ===\n");

            strBuilder.Append($"\nLiczba wymiarów: {D}");
            strBuilder.Append($"\nLiczba wilków (rozmiar populacji): {n}");
            strBuilder.Append($"\nLiczba iteracji: {IterNum}");
            strBuilder.Append($"\nZakres wartości: [{min}, {max}]\n");

            GWOptimizer optimizer = new GWOptimizer(n, D, IterNum, funkcja, min, max);
            (double[] najlepszy, jsonString) = optimizer.Optimise();
            strBuilder.Append("\nNajlepsza pozycja (X_alpha):");

            for (int i = 0; i < najlepszy.Length; i++)
            {
                strBuilder.Append($"\nx[{i}] = {najlepszy[i]}");
            }

            strBuilder.Append("\n\nWartość funkcji celu: " + funkcja.Calculate_Value(najlepszy) + "\n\n");

            strBuilder.Append("\nUżyta funkcja: " + funkcja + "\n");

            if (SaveData(strBuilder)) // zapisujemy raport do pliku .txt
            {
                Console.WriteLine("\nRaport został zapisany na Pulpicie.");
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

        public bool SaveData(StringBuilder data)
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

        public bool SaveJson(string jsonString)
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