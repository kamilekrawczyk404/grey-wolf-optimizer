using System;
using System.Collections.Generic;
using System.Linq;
using System.Numerics;
using System.Text;
using System.Threading.Tasks;
using System.Linq; //sortowanie
using System.Text.Json;

namespace GrayWolf
{
    internal class GWOptimizer
    {
        int n { get; set; }
        int Dim {  get; set; }
        int IterNum {  get; set; }
        IBenchmarkFunc funkcja { get; set; }
        double min_range { get; set; }
        double max_range { get; set; }

        double [] X_alpha { get; set; }// jest to wektor
        double f_alpha { get; set; }

        public GWOptimizer(int n, int D, int IterNum, IBenchmarkFunc funkcja, double min_range, double max_range)
        {
            this.n = n;
            this.Dim = D;
            this.IterNum = IterNum;
            this.funkcja = funkcja;
            this.min_range = min_range;
            this.max_range = max_range;
        }

        public (double[], string, int) Optimise()
        {
            int algorithmRunsAmount = 0;
            Random random = new Random(); // aby oszczędzać moc

            var outerJsonList = new List<Dictionary<string, object>>(); // główna lista do przechowywania wszystkich testów

            var properties = new Dictionary<string, object>
            {
                ["iterations"] = IterNum,
                ["lowerBound"] = min_range,
                ["upperBound"] = max_range,
                ["dimensions"] = Dim,
                ["benchmarkFunction"] = funkcja.ToString(),
                ["populationSize"] = n,
                ["bestFitness"] = 0.0,
                ["history"] = new List<Dictionary<string, object>>() // inicjalizujemy listę historii
            };

            double[][] population = this.GeneratePopulation();

            double[] y_values = this.Calculate(population);
            SortPopulationAndValues(ref population, ref y_values);

            X_alpha = population[0];
            double [] X_beta = population[1];
            double[] X_delta = population[2];
            f_alpha = y_values[0];

            for (int i = 0; i < IterNum; i++)
            {
                algorithmRunsAmount++;

                double a = 2.0 - (2.0 * i / IterNum);
                int j = 0;//licznik wilków

                var wolves = new List<Dictionary<string, object>>(); // lista do przechowywania informacji o wilkach w tej iteracji

                foreach (double[] GrayWolf in population)
                {
                    double[] wolfCopy = (double[])GrayWolf.Clone();
                    // Console.WriteLine(wolfCopy[0]);

                    for (int d = 0; d < Dim; d++)
                    {
                        double r1 = random.NextDouble();
                        double r2 = random.NextDouble();

                        double A1 = 2 * a * r1 - a;
                        double C1 = 2 * r2;
                        double D_alpha = Math.Abs(C1 * X_alpha[d] - GrayWolf[d]);
                        double X1 = X_alpha[d] - A1 * D_alpha;

                        double A2 = 2 * a * r1 - a;
                        double C2 = 2 * r2;
                        double D_beta = Math.Abs(C2 * X_beta[d] - GrayWolf[d]);
                        double X2 = X_beta[d] - A2 * D_beta;

                        double A3 = 2 * a * r1 - a;
                        double C3 = 2 * r2;
                        double D_delta = Math.Abs(C3 * X_delta[d] - GrayWolf[d]);
                        double X3 = X_delta[d] - A3 * D_delta;


                        GrayWolf[d] = (X1 + X2 + X3) / 3;

                        CutRange(GrayWolf, d);// jest to tablica, a więc nie trzeba przekazywać adresu pamięci
                    }

                    y_values[j] = funkcja.Calculate_Value(GrayWolf);

                    bool isAlpha = ReferenceEquals(GrayWolf, X_alpha);
                    bool isBeta = ReferenceEquals(GrayWolf, X_beta);
                    bool isGamma = ReferenceEquals(GrayWolf, X_delta);

                    wolves.Add(new Dictionary<string, object>
                    {
                        ["isAlpha"] = isAlpha,
                        ["isBeta"] = isBeta,
                        ["isGamma"] = isGamma,
                        ["fitness"] = X_alpha,
                        ["position"] = wolfCopy
                    }); // dodajemy informacje o wilku do listy

                    j++;
                }

                var iterationEntry = new Dictionary<string, object>
                {
                    ["iteration"] = i,
                    ["wolves"] = wolves
                }; // tworzymy wpis dla tej iteracji

                ((List<Dictionary<string, object>>)properties["history"]).Add(iterationEntry); // dodajemy wpis do historii

                SortPopulationAndValues(ref population, ref y_values); // sortujemy populację i wartości
                X_alpha = population[0];
                X_beta = population[1];
                X_delta = population[2];
                f_alpha = y_values[0];
            }

            properties["bestFitness"] = X_alpha;

            var testEntry = new Dictionary<string, object>
            {
                ["description"] = "Test ...",
                ["properties"] = properties
            };

            outerJsonList.Add(testEntry); // dodajemy wpis testu do głównej listy

            string json = JsonSerializer.Serialize(outerJsonList, new JsonSerializerOptions { WriteIndented = true }); // ładne formatowanie

            return (X_alpha, json, algorithmRunsAmount);
        }

        public double[][] GeneratePopulation()
        {
            Random random = new Random();
            double[][] population = new double[n][];

            // D wymiarowy wektor
            for (int i = 0; i < n; i++)
            {
                population[i] = new double[Dim];
                for (int j = 0; j < Dim; j++)
                {
                    //losowe wartości od minimum do maximum
                    population[i][j] = min_range + (max_range - min_range) * random.NextDouble();
                }
            }

            return population;
        }

        public double[] Calculate(double[][] population)
        {
            double[] values = new double[this.n];
            int i = 0;
            foreach (double[] vector in population)
            {
                double wynik = this.funkcja.Calculate_Value(vector);
                values[i] = wynik;
                i++;
            }
            return values;
        }

        public void SortPopulationAndValues(ref double[][] population, ref double[] y_values) //sprawdzie czy jest poprawne,
        {
            if (population.Length != y_values.Length || population.Length != n)
            {
                throw new ArgumentException("Population and y_values must have length equal to n.");
            }

            // LINQ do sortowania
            var paired = population.Zip(y_values, (pop, val) => new { Population = pop, Value = val })
                                  .OrderBy(pair => pair.Value)
                                  .ToArray();


            // aby wszystko dobrze działało
            for (int i = 0; i < n; i++)
            {
                population[i] = paired[i].Population;
                y_values[i] = paired[i].Value;
            }
        }

        public void CutRange(double[] GrayWolf, int d)
        {
            if (GrayWolf[d]>= this.max_range)
            {
                GrayWolf[d] = this.max_range;
            }
            else if(GrayWolf[d] <= this.min_range)
            {
                GrayWolf[d] = this.min_range;
            }
        }
    }
}
