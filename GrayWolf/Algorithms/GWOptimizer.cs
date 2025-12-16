using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using GrayWolf.Interfaces;
using System.Linq;

namespace GrayWolf.Algorithms
{
    public class ReactReport
    {
        public string Description { get; set; } = "Gray Wolf Optimization Test";
        public ReportProperties Properties { get; set; }
    }

    public class ReportProperties
    {
        public int Iterations { get; set; }
        public double LowerBound { get; set; }
        public double UpperBound { get; set; }
        public int Dimensions { get; set; }
        public string BenchmarkFunction { get; set; }
        public int PopulationSize { get; set; }
        public double[] BestSolution { get; set; }
        public double BestFitness { get; set; }
        public List<IterationLog> History { get; set; }
    }

    public class IterationLog
    {
        public int Iteration { get; set; }
        public List<WolfLog> Wolves { get; set; }
    }

    public class WolfLog
    {
        public bool IsAlpha { get; set; }
        public bool IsBeta { get; set; }
        public bool IsDelta { get; set; }
        public double Fitness { get; set; }
        public double[] Position { get; set; }
    }

    public class GwoState
    {
        public int Iteration { get; set; }
        public double[][] Population { get; set; }
        public double[] FitnessValues { get; set; }
        public double[] Alpha { get; set; }
        public double[] Beta { get; set; }
        public double[] Delta { get; set; }
        public double FAlpha { get; set; }
        public int EvaluationCount { get; set; }
    }

    internal class GWOptimizer : IOptimizationAlgorithm
    {
        public string Name { get; set; } = "Gray Wolf Optimizer";
        public double[] XBest { get; set; }
        public double FBest { get; set; }
        public int NumberOfEvaluationFitnessFunction { get; set; }

        int n { get; set; }
        int Dim { get; set; }
        int IterNum { get; set; }
        IBenchmarkFunc funkcja { get; set; }
        double min_range { get; set; }
        double max_range { get; set; }

        double[] X_alpha { get; set; }// jest to wektor
        double[] X_beta { get; set; }
        double[] X_delta { get; set; }
        double f_alpha { get; set; }

        private const string StateFile = "gwo_state.json";
        public List<IterationLog> FullHistory { get; set; } = new List<IterationLog>();

        public GWOptimizer(int n, int D, int IterNum, IBenchmarkFunc funkcja, double min_range, double max_range)
        {
            this.n = n;
            Dim = D;
            this.IterNum = IterNum;
            this.funkcja = funkcja;
            this.min_range = min_range;
            this.max_range = max_range;
        }

        public double Solve()
        {
            Random random = new Random(); // aby oszczędzać moc

            double[][] population;
            double[] y_values;
            int startIter = 0;

            if (File.Exists(StateFile))
            {
                try
                {
                    string jsonString = File.ReadAllText(StateFile);
                    GwoState state = JsonSerializer.Deserialize<GwoState>(jsonString);

                    if (state != null && state.Population != null)
                    {
                        startIter = state.Iteration;
                        population = state.Population;
                        y_values = state.FitnessValues;
                        X_alpha = state.Alpha;
                        X_beta = state.Beta;
                        X_delta = state.Delta;
                        f_alpha = state.FAlpha;
                        NumberOfEvaluationFitnessFunction = state.EvaluationCount;
                    }
                    else
                    {
                        throw new Exception();
                    }
                }
                catch
                {
                    population = GeneratePopulation();
                    y_values = Calculate(population);
                    SortPopulationAndValues(ref population, ref y_values);

                    X_alpha = population[0];
                    X_beta = population[1];
                    X_delta = population[2];
                    f_alpha = y_values[0];
                    NumberOfEvaluationFitnessFunction = n;
                }
            }
            else
            {
                population = GeneratePopulation();
                y_values = Calculate(population);
                SortPopulationAndValues(ref population, ref y_values);

                X_alpha = population[0];
                X_beta = population[1];
                X_delta = population[2];
                f_alpha = y_values[0];
                NumberOfEvaluationFitnessFunction = n;
            }

            XBest = X_alpha ?? new double[Dim];
            FBest = f_alpha;

            for (int i = startIter; i < IterNum; i++)
            {
                LogHistory(i, population, y_values);

                double a = 2.0 - 2.0 * i / IterNum;
                int j = 0;//licznik wilków

                foreach (double[] GrayWolf in population)
                {
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
                    NumberOfEvaluationFitnessFunction++;
                    j++;
                }

                SortPopulationAndValues(ref population, ref y_values);
                X_alpha = population[0];
                X_beta = population[1];
                X_delta = population[2];
                f_alpha = y_values[0];

                XBest = X_alpha;
                FBest = f_alpha;

                GwoState state = new GwoState
                {
                    Iteration = i + 1,
                    Population = population,
                    FitnessValues = y_values,
                    Alpha = X_alpha,
                    Beta = X_beta,
                    Delta = X_delta,
                    FAlpha = f_alpha,
                    EvaluationCount = NumberOfEvaluationFitnessFunction
                };

                string jsonState = JsonSerializer.Serialize(state);
                File.WriteAllText(StateFile, jsonState);
            }

            GenerateReactJson();

            return f_alpha;
        }

        public double[][] GeneratePopulation()
        {
            Random random = new Random();
            double[][] population = new double[n][];

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
            double[] values = new double[n];
            int i = 0;
            foreach (double[] vector in population)
            {
                double wynik = funkcja.Calculate_Value(vector);
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

            var paired = population.Zip(y_values, (pop, val) => new { Population = pop, Value = val })
                                     .OrderBy(pair => pair.Value)
                                     .ToArray();

            for (int i = 0; i < n; i++)
            {
                population[i] = paired[i].Population;
                y_values[i] = paired[i].Value;
            }
        }

        public void CutRange(double[] GrayWolf, int d)
        {
            if (GrayWolf[d] >= max_range) GrayWolf[d] = max_range;
            else if (GrayWolf[d] <= min_range) GrayWolf[d] = min_range;
        }

        private void LogHistory(int iteration, double[][] population, double[] fitness)
        {
            var wolvesLog = new List<WolfLog>();
            for (int k = 0; k < population.Length; k++)
            {
                double[] posCopy = (double[])population[k].Clone();

                wolvesLog.Add(new WolfLog
                {
                    Position = posCopy,
                    Fitness = fitness[k],
                    IsAlpha = k == 0,
                    IsBeta = k == 1,
                    IsDelta = k == 2
                });
            }

            FullHistory.Add(new IterationLog
            {
                Iteration = iteration,
                Wolves = wolvesLog
            });
        }

        private void GenerateReactJson()
        {
            var report = new ReactReport
            {
                Description = $"GWO Test - {funkcja}",
                Properties = new ReportProperties
                {
                    Dimensions = Dim,
                    Iterations = IterNum,
                    LowerBound = min_range,
                    UpperBound = max_range,
                    BenchmarkFunction = funkcja.ToString(),
                    PopulationSize = n,
                    BestFitness = FBest,
                    BestSolution = XBest,
                    History = FullHistory
                }
            };

            var outputList = new List<ReactReport> { report };

            var options = new JsonSerializerOptions
            {
                WriteIndented = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };

            string json = JsonSerializer.Serialize(outputList, options);
            File.WriteAllText(StateFile, json);
        }
    }
}