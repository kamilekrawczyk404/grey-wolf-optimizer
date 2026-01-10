using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using GrayWolf.Interfaces;
using GrayWolf.Model;
using GrayWolf.Services;

namespace GrayWolf.Algorithms
{
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

    internal class AquilaOptimizer : BaseOptimizer// credits to Krzysztof Chrobok
    {
        public override string Name { get; set; } = "Aquila Optimizer";
        private AquilaMath _aquilaMath;

        public AquilaOptimizer(int n, int D, int IterNum, IBenchmarkFunc funkcja, double min_range, double max_range, string stateFilePath)
            : base(n, D, IterNum, funkcja, min_range, max_range, stateFilePath)
        {
            _aquilaMath = new AquilaMath(D);
        }

        protected override void InitializeLeaders(double[][] pop, double[] fit)
        {
            double minFit = fit[0];
            int minIdx = 0;
            for (int i = 1; i < N; i++)
            {
                if (fit[i] < minFit)
                {
                    minFit = fit[i];
                    minIdx = i;
                }
            }
            FBest = minFit;
            XBest = (double[])pop[minIdx].Clone();
        }

        protected override void RunIteration(int iteration, CancellationToken ct)
        {
            List<double> xMean = CalculateMeanPopulation(Population);
            List<double> xBestList = XBest.ToList();
            List<double> upperBounds = Enumerable.Repeat(MaxRange, Dim).ToList();
            List<double> lowerBounds = Enumerable.Repeat(MinRange, Dim).ToList();

            for (int i = 0; i < N; i++)
            {
                ct.ThrowIfCancellationRequested();
                List<double> xCurrent = Population[i].ToList();
                double currentFitness = FitnessValues[i];

                double rand = RandomGenerator.NextDouble();
                List<double> candidate = null;
                int T = IterNum;
                int currentT = iteration + 1;

                if (currentT <= (2.0 / 3.0) * T)
                {
                    if (rand <= 0.5)
                    {
                        candidate = _aquilaMath.ExpandedExploration(xBestList, xMean, currentT, T);
                    }
                    else
                    {
                        int randIdx = RandomGenerator.Next(N);
                        candidate = _aquilaMath.NarrowedExploration(xBestList, Population[randIdx].ToList());
                    }
                }
                else
                {
                    if (rand <= 0.5)
                    {
                        candidate = _aquilaMath.ExpandedExploitation(xBestList, xMean, upperBounds, lowerBounds);
                    }
                    else
                    {
                        candidate = _aquilaMath.NarrowedExploitation(xBestList, xCurrent, currentT, T);
                    }
                }

                if (candidate != null)
                {
                    double[] candidateArray = candidate.ToArray();
                    CheckBounds(candidateArray);
                    double candidateFitness = Function.Calculate_Value(candidateArray);
                    NumberOfEvaluationFitnessFunction++;

                    if (candidateFitness < currentFitness)
                    {
                        Population[i] = candidateArray;
                        FitnessValues[i] = candidateFitness;

                        if (candidateFitness < FBest)
                        {
                            FBest = candidateFitness;
                            XBest = (double[])candidateArray.Clone();
                            xBestList = XBest.ToList();
                        }
                    }
                }
            }
        }

        protected override string GetSpecificStateJson()
        {
            var aquilaSpecificData = new AquilaSpecificData
            {
                // Populate with any Aquila-specific data if needed
                BestPosition = XBest,
                BestScore = FBest
            };
            return JsonSerializer.Serialize(aquilaSpecificData);
        }

        protected override void LoadSpecificState(string json)
        {
            if (!string.IsNullOrEmpty(json))
            {
                try
                {
                    var specificData = JsonSerializer.Deserialize<AquilaSpecificData>(json);
                    // if Aquila had specific data, load it here
                    XBest = specificData.BestPosition;
                    FBest = specificData.BestScore;
                }
                catch
                {
                    // Handle deserialization errors if necessary
                }
            }
        }

        protected override void LogHistory(int iteration)
        {
            var aquilaLog = new List<EntityLog>();
            int bestIndex = -1;
            double bestVal = double.MaxValue;

            for (int k = 0; k < N; k++)
            {
                if (FitnessValues[k] < bestVal)
                {
                    bestVal = FitnessValues[k];
                    bestIndex = k;
                }
            }

            for (int k = 0; k < Population.Length; k++)
            {
                double[] posCopy = (double[])Population[k].Clone();
                aquilaLog.Add(new EntityLog
                {
                    Position = posCopy,
                    Fitness = FitnessValues[k],
                    Role = (k == bestIndex) ? "Best" : "Hawk", // Mark the best solution
                    IsLeader = (k == bestIndex) // Only the best is leader
                });
            }
            FullHistory.Add(new IterationLog
            {
                Iteration = iteration,
                Entities = aquilaLog
            });
        }

        private List<double> CalculateMeanPopulation(double[][] population)
        {
            List<double> mean = new List<double>();
            for (int d = 0; d < Dim; d++)
            {
                double sum = 0.0;
                for (int r = 0; r < N; r++)
                {
                    sum += population[r][d];
                }
                mean.Add(sum / N);
            }
            return mean;
        }



        
    }
}