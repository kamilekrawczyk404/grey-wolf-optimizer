using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using GrayWolf.Interfaces;

namespace GrayWolf.Algorithms
{
    public class AquilaState
    {
        public int Iteration { get; set; }
        public double[][] Population { get; set; }
        public double[] FitnessValues { get; set; }
        public double[] BestPosition { get; set; }
        public double BestFitness { get; set; }
        public int EvaluationCount { get; set; }
    }

    public class AquilaMath
    {
        private readonly Random _random = new Random();
        private readonly int _dim;
        private readonly double _alpha;
        private readonly double _delta;

        private const double beta = 1.5;
        private const double s = 0.01;
        private const double bigU = 0.00565;
        private const double r1_param = 10;
        private const double omega = 0.005;

        private readonly double _sigma;

        public AquilaMath(int dim, double alpha = 0.1, double delta = 0.1)
        {
            _dim = dim;
            _alpha = alpha;
            _delta = delta;
            _sigma = 0.6966;
        }

        public List<double> ExpandedExploration(List<double> xBest, List<double> xMean, double t, double T)
        {
            var a1 = 1.0 - t / T;
            var a2 = _random.NextDouble();

            var result = new List<double>();
            for (int i = 0; i < _dim; i++)
            {
                double val = xBest[i] * a1 + (xMean[i] - xBest[i]) * a2;
                result.Add(val);
            }
            return result;
        }

        public List<double> NarrowedExploration(List<double> xBest, List<double> xRandom)
        {
            double levyStep = Levy();
            var a2 = _random.NextDouble();

            var result = new List<double>();
            for (int i = 0; i < _dim; i++)
            {
                double d_i = i + 1;

                double r = r1_param + bigU * d_i;
                double theta = -omega * d_i + (3.0 * Math.PI / 2.0);

                double spiralX = r * Math.Sin(theta);
                double spiralY = r * Math.Cos(theta);

                double val = xBest[i] * levyStep + xRandom[i] + (spiralY - spiralX) * a2;
                result.Add(val);
            }
            return result;
        }

        public List<double> ExpandedExploitation(List<double> xBest, List<double> xMean, List<double> upperBounds, List<double> lowerBounds)
        {
            var a1 = _random.NextDouble();
            var a2 = _random.NextDouble();

            var result = new List<double>();
            for (int i = 0; i < _dim; i++)
            {
                double lb = lowerBounds[i];
                double ub = upperBounds[i];

                double val = (xBest[i] - xMean[i]) * _alpha - a1 + ((ub - lb) * a2 + lb) * _delta;
                result.Add(val);
            }
            return result;
        }

        public List<double> NarrowedExploitation(List<double> xBest, List<double> xPrev, double t, double T)
        {
            double qf = Math.Pow(t, (2.0 * _random.NextDouble() - 1.0) / Math.Pow(1.0 - T, 2.0));

            double g1 = 2.0 * _random.NextDouble() - 1.0;
            double g2 = 2.0 * (1.0 - t / T);

            double a1 = _random.NextDouble();
            double a2 = Levy();
            double a3 = _random.NextDouble();

            var result = new List<double>();
            for (int i = 0; i < _dim; i++)
            {
                double val = qf * xBest[i] - g1 * xPrev[i] * a1 - g2 * a2 + a3 * g1;
                result.Add(val);
            }
            return result;
        }

        private double Levy()
        {
            double u = GenerateNormal(0, 1);
            double v = GenerateNormal(0, 1);

            double step = u * _sigma / Math.Pow(Math.Abs(v), 1.0 / beta);
            return s * step;
        }

        private double GenerateNormal(double mean, double stdDev)
        {
            double u1 = 1.0 - _random.NextDouble();
            double u2 = 1.0 - _random.NextDouble();
            double randStdNormal = Math.Sqrt(-2.0 * Math.Log(u1)) * Math.Sin(2.0 * Math.PI * u2);
            return mean + stdDev * randStdNormal;
        }
    }

    internal class AquilaOptimizer : IOptimizationAlgorithm// credits to Krzysztof Chrobok
    {
        public string Name { get; set; } = "Aquila Optimizer";
        public double[] XBest { get; set; }
        public double FBest { get; set; }
        public int NumberOfEvaluationFitnessFunction { get; set; }

        int n;
        int Dim;
        int IterNum;
        IBenchmarkFunc funkcja;
        double min_range;
        double max_range;

        private readonly double _alpha = 0.1;
        private readonly double _delta = 0.1;

        private const string StateFile = "aquila_state.json";
        public List<IterationLog> FullHistory { get; set; } = new List<IterationLog>();

        private AquilaMath _math;

        public AquilaOptimizer(int n, int D, int IterNum, IBenchmarkFunc funkcja, double min_range, double max_range)
        {
            this.n = n;
            this.Dim = D;
            this.IterNum = IterNum;
            this.funkcja = funkcja;
            this.min_range = min_range;
            this.max_range = max_range;

            _math = new AquilaMath(D, alpha: _alpha, delta: _delta);
        }

        public double Solve()
        {
            Random random = new Random();

            double[][] population;
            double[] y_values;
            int startIter = 0;

            if (File.Exists(StateFile))
            {
                try
                {
                    string jsonString = File.ReadAllText(StateFile);
                    AquilaState state = JsonSerializer.Deserialize<AquilaState>(jsonString);

                    if (state != null && state.Population != null)
                    {
                        startIter = state.Iteration;
                        population = state.Population;
                        y_values = state.FitnessValues;
                        XBest = state.BestPosition;
                        FBest = state.BestFitness;
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
                    UpdateBest(population, y_values);
                }
            }
            else
            {
                population = GeneratePopulation();
                y_values = Calculate(population);
                UpdateBest(population, y_values);
            }

            if (XBest == null)
            {
                XBest = new double[Dim];
                FBest = double.MaxValue;
                UpdateBest(population, y_values);
            }

            List<double> upperBounds = Enumerable.Repeat(max_range, Dim).ToList();
            List<double> lowerBounds = Enumerable.Repeat(min_range, Dim).ToList();

            for (int t = startIter; t < IterNum; t++)
            {
                LogHistory(t, population, y_values);

                List<double> xMean = CalculateMeanPopulation(population);
                List<double> xBestList = XBest.ToList();

                for (int i = 0; i < n; i++)
                {
                    List<double> xCurrent = population[i].ToList();
                    double currentFitness = y_values[i];

                    double rand = random.NextDouble();
                    List<double> candidate = null;
                    int T = IterNum;
                    int currentT = t + 1;

                    if (currentT <= (2.0 / 3.0) * T)
                    {
                        if (rand <= 0.5)
                        {
                            candidate = _math.ExpandedExploration(xBestList, xMean, currentT, T);
                        }
                        else
                        {
                            int randIdx = random.Next(n);
                            candidate = _math.NarrowedExploration(xBestList, population[randIdx].ToList());
                        }
                    }
                    else
                    {
                        if (rand <= 0.5)
                        {
                            candidate = _math.ExpandedExploitation(xBestList, xMean, upperBounds, lowerBounds);
                        }
                        else
                        {
                            candidate = _math.NarrowedExploitation(xBestList, xCurrent, currentT, T);
                        }
                    }

                    if (candidate != null)
                    {
                        CheckBounds(candidate);

                        double[] candidateArray = candidate.ToArray();
                        double candidateFitness = funkcja.Calculate_Value(candidateArray);
                        NumberOfEvaluationFitnessFunction++;

                        if (candidateFitness < currentFitness)
                        {
                            population[i] = candidateArray;
                            y_values[i] = candidateFitness;

                            if (candidateFitness < FBest)
                            {
                                FBest = candidateFitness;
                                XBest = (double[])candidateArray.Clone();
                                xBestList = XBest.ToList();
                            }
                        }
                    }
                }

                AquilaState state = new AquilaState
                {
                    Iteration = t + 1,
                    Population = population,
                    FitnessValues = y_values,
                    BestPosition = XBest,
                    BestFitness = FBest,
                    EvaluationCount = NumberOfEvaluationFitnessFunction
                };

                string jsonState = JsonSerializer.Serialize(state);
                File.WriteAllText(StateFile, jsonState);
            }

            GenerateReactJson();

            return FBest;
        }

        private double[][] GeneratePopulation()
        {
            Random random = new Random();
            double[][] population = new double[n][];
            NumberOfEvaluationFitnessFunction = 0;

            for (int i = 0; i < n; i++)
            {
                population[i] = new double[Dim];
                for (int j = 0; j < Dim; j++)
                {
                    population[i][j] = min_range + (max_range - min_range) * random.NextDouble();
                }
            }
            return population;
        }

        private double[] Calculate(double[][] population)
        {
            double[] values = new double[n];
            for (int i = 0; i < n; i++)
            {
                values[i] = funkcja.Calculate_Value(population[i]);
                NumberOfEvaluationFitnessFunction++;
            }
            return values;
        }

        private void UpdateBest(double[][] population, double[] fitness)
        {
            double minFit = fitness[0];
            int minIdx = 0;

            for (int i = 1; i < n; i++)
            {
                if (fitness[i] < minFit)
                {
                    minFit = fitness[i];
                    minIdx = i;
                }
            }

            FBest = minFit;
            XBest = (double[])population[minIdx].Clone();
        }

        private List<double> CalculateMeanPopulation(double[][] population)
        {
            List<double> mean = new List<double>();
            for (int d = 0; d < Dim; d++)
            {
                double sum = 0.0;
                for (int r = 0; r < n; r++)
                {
                    sum += population[r][d];
                }
                mean.Add(sum / n);
            }
            return mean;
        }

        private void CheckBounds(List<double> candidate)
        {
            for (int i = 0; i < candidate.Count; i++)
            {
                if (candidate[i] > max_range) candidate[i] = max_range;
                else if (candidate[i] < min_range) candidate[i] = min_range;
            }
        }

        private void LogHistory(int iteration, double[][] population, double[] fitness)
        {
            var wolvesLog = new List<WolfLog>();

            double currentMin = double.MaxValue;
            int bestIndex = -1;

            for (int k = 0; k < n; k++)
            {
                if (fitness[k] < currentMin)
                {
                    currentMin = fitness[k];
                    bestIndex = k;
                }
            }

            for (int k = 0; k < population.Length; k++)
            {
                double[] posCopy = (double[])population[k].Clone();

                wolvesLog.Add(new WolfLog
                {
                    Position = posCopy,
                    Fitness = fitness[k],
                    IsAlpha = (k == bestIndex),
                    IsBeta = false,
                    IsDelta = false
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
                Description = $"Aquila Test - {funkcja}",
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