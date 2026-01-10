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
    internal class GWOptimizer : BaseOptimizer
    {
        public override string Name { get; set; } = "Gray Wolf Optimizer";
        public double[] X_alpha { get; set; }// jest to wektor
        public double[] X_beta { get; set; }
        public double[] X_delta { get; set; }
        public double f_alpha { get; set; }

        public GWOptimizer(int n, int D, int IterNum, IBenchmarkFunc funkcja, double min_range, double max_range, string stateFilePath)
            : base(n, D, IterNum, funkcja, min_range, max_range, stateFilePath)
        {
        }

        protected override void InitializeLeaders(double[][] pop, double[] fit)
        {
            SortPopulation();
            X_alpha = (double[])Population[0].Clone();
            X_beta = (double[])Population[1].Clone();
            X_delta = (double[])Population[2].Clone();
            f_alpha = FitnessValues[0];

            XBest = X_alpha ?? new double[Dim];
            FBest = f_alpha;
        }

        protected override void RunIteration(int iteration, CancellationToken ct)
        {
            double a = 2.0 - 2.0 * iteration / IterNum;

            for (int i = 0; i < N; i++)
            {
                ct.ThrowIfCancellationRequested();
                double[] GrayWolf = Population[i];
                for (int d = 0; d < Dim; d++)
                {
                    double r1 = RandomGenerator.NextDouble();
                    double r2 = RandomGenerator.NextDouble();
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
                    CheckBounds(GrayWolf);
                }
                FitnessValues[i] = Function.Calculate_Value(GrayWolf);
                NumberOfEvaluationFitnessFunction++;
            }

            SortPopulation();

            X_alpha = Population[0];
            X_beta = Population[1];
            X_delta = Population[2];
            f_alpha = FitnessValues[0];

            XBest = X_alpha;
            FBest = f_alpha;
        }

        protected override string GetSpecificStateJson()
        {
            var specificData = new GwoSpecificData
            {
                AlphaPosition = X_alpha,
                AlphaScore = f_alpha,
                BetaPosition = X_beta,
                BetaScore = FitnessValues[1],
                DeltaPosition = X_delta,
                DeltaScore = FitnessValues[2],
            };
            return JsonSerializer.Serialize(specificData);
        }

        protected override void LoadSpecificState(string json)
        {
            var gwoData = JsonSerializer.Deserialize<GwoSpecificData>(json);
            X_alpha = gwoData.AlphaPosition;
            f_alpha = gwoData.AlphaScore;
            X_beta = gwoData.BetaPosition;
            X_delta = gwoData.DeltaPosition;
        }

        protected override void LogHistory(int iteration)
        {
            var entitiesLog = new List<EntityLog>();
            for (int k = 0; k < Population.Length; k++)
            {
                double[] posCopy = (double[])Population[k].Clone();
                entitiesLog.Add(new EntityLog
                {
                    Position = posCopy,
                    Fitness = FitnessValues[k],
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
    }
}