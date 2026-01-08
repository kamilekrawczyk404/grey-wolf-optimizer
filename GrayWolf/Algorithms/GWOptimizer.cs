using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using GrayWolf.Interfaces;
using System.Linq;
using GrayWolf.Model;
using GrayWolf.Services;
using System.Diagnostics;

namespace GrayWolf.Algorithms
{
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

        private readonly string _stateFilePath;
        public List<IterationLog> FullHistory { get; set; } = new List<IterationLog>();

        public GWOptimizer(int n, int D, int IterNum, IBenchmarkFunc funkcja, double min_range, double max_range, string stateFilePath)
        {
            this.n = n;
            Dim = D;
            this.IterNum = IterNum;
            this.funkcja = funkcja;
            this.min_range = min_range;
            this.max_range = max_range;
            _stateFilePath = stateFilePath;
        }

        public double Solve(CancellationToken cancellationToken = default)
        {
            Random random = new Random(); // aby oszczędzać moc

            double[][] population;
            double[] y_values;
            int startIter = 0;

            var checkpoint = CheckpointService.LoadCheckpoint(_stateFilePath);

            if (checkpoint != null && checkpoint.AlgorithmName == Name && checkpoint.FunctionName == funkcja.ToString())
            {
                startIter = checkpoint.CurrentIteration;
                population = checkpoint.Population;
                y_values = checkpoint.FitnessValues;
                FullHistory = checkpoint.HistoryLogs ?? new List<IterationLog>();
                NumberOfEvaluationFitnessFunction = checkpoint.EvaluationsCount;

                XBest = checkpoint.GlobalBestPosition;
                FBest = checkpoint.GlobalBestFitness;

                // Wyciąganie specyficznych danych GWO z checkpointu
                var gwoData = JsonSerializer.Deserialize<GwoSpecificData>(checkpoint.AlgorithmSpecificDataJson);
                X_alpha = gwoData.AlphaPosition;
                X_beta = gwoData.BetaPosition;
                X_delta = gwoData.DeltaPosition;
                f_alpha = gwoData.AlphaScore;
            }
            else
            // jeśli nie ma checkpointu, to inicjalizujemy populację
            {
                population = GeneratePopulation();
                y_values = Calculate(population);
                SortPopulationAndValues(ref population, ref y_values);
                X_alpha = (double[])population[0].Clone(); // klonowanie, aby uniknąć referencji
                X_beta = (double[])population[1].Clone();
                X_delta = (double[])population[2].Clone();
                f_alpha = y_values[0];

                XBest = X_alpha ?? new double[Dim];
                FBest = f_alpha;
                NumberOfEvaluationFitnessFunction = n;
            }

            for (int i = startIter; i < IterNum; i++)
            {
                // sprawdzanie anulowania
                cancellationToken.ThrowIfCancellationRequested();
                LogHistory(i, population, y_values);

                double a = 2.0 - 2.0 * i / IterNum;
                int j = 0;//licznik wilków

                foreach (double[] GrayWolf in population)
                {
                    cancellationToken.ThrowIfCancellationRequested();
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
                // TO-DO: or should it be clones?
                X_alpha = population[0];
                X_beta = population[1];
                X_delta = population[2];
                f_alpha = y_values[0];

                XBest = X_alpha;
                FBest = f_alpha;

                if (i % 10 == 0 || i == IterNum - 1)
                {
                    cancellationToken.ThrowIfCancellationRequested();
                    var gwoSpecificData = new GwoSpecificData
                    {
                        AlphaPosition = X_alpha,
                        AlphaScore = f_alpha,
                        BetaPosition = X_beta,
                        BetaScore = y_values[1],
                        DeltaPosition = X_delta,
                        DeltaScore = y_values[2],

                    };

                    var checkpointAutoSave = new CheckpointData
                    {
                        AlgorithmName = Name,
                        FunctionName = funkcja.ToString(),
                        CurrentIteration = i + 1,
                        Population = population,
                        FitnessValues = y_values,
                        GlobalBestPosition = X_alpha,
                        GlobalBestFitness = f_alpha,
                        EvaluationsCount = NumberOfEvaluationFitnessFunction,
                        HistoryLogs = FullHistory,

                        Dimensions = Dim,
                        PopulationSize = n,

                        AlgorithmSpecificDataJson = JsonSerializer.Serialize(gwoSpecificData),
                    };

                    CheckpointService.SaveCheckpoint(_stateFilePath, checkpointAutoSave);
                }

                // string jsonState = JsonSerializer.Serialize(state);
                // File.WriteAllText(StateFile, jsonState);
            }
            // if checkpoint was successfully loaded, we can delete it after completing the optimization
            // but we also can save it for future resumption
            CheckpointService.ClearCheckpoint(_stateFilePath);

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
            var entitiesLog = new List<EntityLog>();
            for (int k = 0; k < population.Length; k++)
            {
                double[] posCopy = (double[])population[k].Clone();
                entitiesLog.Add(new EntityLog
                {
                    Position = posCopy,
                    Fitness = fitness[k],
                    IsLeader = k < 3,
                    Role = k == 0 ? "Alpha" : k == 1 ? "Beta" : k == 2 ? "Delta" : "Wolf"
                });
            }
            FullHistory.Add(new IterationLog
            {
                Iteration = iteration,
                Entities = entitiesLog
            });
        }

        //private void LogHistory(int iteration, double[][] population, double[] fitness)
        //{
        //    var wolvesLog = new List<WolfLog>();
        //    for (int k = 0; k < population.Length; k++)
        //    {
        //        double[] posCopy = (double[])population[k].Clone();

        //        wolvesLog.Add(new WolfLog
        //        {
        //            Position = posCopy,
        //            Fitness = fitness[k],
        //            IsAlpha = k == 0,
        //            IsBeta = k == 1,
        //            IsDelta = k == 2
        //        });
        //    }

        //    FullHistory.Add(new IterationLog
        //    {
        //        Iteration = iteration,
        //        Wolves = wolvesLog
        //    });
        //}

        // TO-DO: delete this method later, since we transferred it to Program.cs
        //private void GenerateReactJson()
        //{
        //    var report = new ReactReport
        //    {
        //        Description = $"GWO Test - {funkcja}",
        //        Properties = new ReportProperties
        //        {
        //            Dimensions = Dim,
        //            Iterations = IterNum,
        //            LowerBound = min_range,
        //            UpperBound = max_range,
        //            BenchmarkFunction = funkcja.ToString(),
        //            PopulationSize = n,
        //            BestFitness = FBest,
        //            BestSolution = XBest,
        //            History = FullHistory
        //        }
        //    };

        //    var outputList = new List<ReactReport> { report };

        //    var options = new JsonSerializerOptions
        //    {
        //        WriteIndented = true,
        //        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        //    };

        //    string json = JsonSerializer.Serialize(outputList, options);
        //    File.WriteAllText(StateFile, json);
        //}
    }
}