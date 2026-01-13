using GrayWolf.Interfaces;
using GrayWolf.Model.GrayWolf.Model;
using GrayWolf.Model;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Text.Json;

namespace GrayWolf.Algorithms
{
    public class BoaOptimizer:BaseOptimizer
    {
        public override string Name { get; set; } = "Butterfly Optimization Algorithm";

        private double p = 0.8;
        private double c = 0.01;
        private double a;

        private bool a_dynamic = true;
        private double a_static = 0.1;

        private double _p;
        private double _c;
        private double _a;

        private double[] Fragrance;
        public BoaOptimizer(int n, int dim, int iterNum, IBenchmarkFunc function, double minRange, double maxRange,
            string stateFilePath, Dictionary<string, double>? parameters)
            : base(n, dim, iterNum, function, minRange, maxRange, stateFilePath, parameters)
        {
            _p = Parameters.ContainsKey("p") ? Parameters["p"] : 0.8;
            _c = Parameters.ContainsKey("c") ? Parameters["c"] : 0.01;
            _a = Parameters.ContainsKey("a") ? Parameters["a"] : 0.1;

            Fragrance = new double[N];
        }

        protected override void InitializeLeaders(double[][] pop, double[] fit)
        {
            SortPopulation();
            XBest = (double[])Population[0].Clone();
            FBest = FitnessValues[0];

            CalculateFragrance();
        }

        private void CalculateFragrance()
        {
            for (int i = 0; i < N; i++)
            {
                double safeFitness = Math.Max(FitnessValues[i], 1e-290);

                Fragrance[i] = _c * Math.Pow(safeFitness, _a);
            }
        }

        protected override void RunIteration(int iteration, CancellationToken ct)
        {
            if (a_dynamic)
            {
                double maxIterDivisor = (IterNum <= 1) ? 1.0 : (double)(IterNum - 1);
                _a = 0.1 + (0.3 - 0.1) * (iteration / maxIterDivisor);
            }
            else
            {
                _a = a_static;
            }

            CalculateFragrance();

            for (int i = 0; i < N; i++)
            {
                ct.ThrowIfCancellationRequested();

                double[] currentButterfly = Population[i];
                double[] newPosition = new double[Dim];

                double r_switch = RandomGenerator.NextDouble();

                if (r_switch < _p)
                {
                    double r_step = RandomGenerator.NextDouble();
                    for (int d = 0; d < Dim; d++)
                    {
                        double step = (Math.Pow(r_step, 2) * XBest[d] - currentButterfly[d]) * Fragrance[i];
                        newPosition[d] = currentButterfly[d] + step;
                    }
                }
                else
                {
                    int j = RandomGenerator.Next(0, N);
                    int k = RandomGenerator.Next(0, N);

                    while (j == k) k = RandomGenerator.Next(0, N);

                    double r_step = RandomGenerator.NextDouble();
                    for (int d = 0; d < Dim; d++)
                    {
                        double step = (Math.Pow(r_step, 2) * (Population[j][d] - Population[k][d])) * Fragrance[i];
                        newPosition[d] = currentButterfly[d] + step;
                    }
                }

                CheckBounds(newPosition);

                double newFitness = Function.Calculate_Value(newPosition);
                NumberOfEvaluationFitnessFunction++;

                Population[i] = newPosition;
                FitnessValues[i] = newFitness;

                if (newFitness < FBest)
                {
                    FBest = newFitness;
                    XBest = (double[])newPosition.Clone();
                }
            }
        }

        protected override string GetSpecificStateJson()
        {
            var data = new BoaSpecificData
            {
                BestPosition = XBest,
                BestFitness = FBest,
                Fragrance = Fragrance
            };
            return JsonSerializer.Serialize(data);
        }

        protected override void LoadSpecificState(string json)
        {
            if (string.IsNullOrEmpty(json)) return;

            var data = JsonSerializer.Deserialize<BoaSpecificData>(json);
            if (data != null)
            {
                XBest = data.BestPosition;
                FBest = data.BestFitness;
                Fragrance = data.Fragrance ?? new double[N];
            }
        }

        protected override void LogHistory(int iteration)
        {
            var entitiesLog = new List<EntityLog>();
            for (int k = 0; k < N; k++)
            {
                bool isLeader = (FitnessValues[k] == FBest);
                entitiesLog.Add(new EntityLog
                {
                    Position = (double[])Population[k].Clone(),
                    Fitness = FitnessValues[k],
                    IsLeader = isLeader,
                    Role = "Butterfly"
                });
            }
            FullHistory.Add(new IterationLog
            {
                Iteration = iteration,
                Entities = entitiesLog
            });
        }
    }
}
