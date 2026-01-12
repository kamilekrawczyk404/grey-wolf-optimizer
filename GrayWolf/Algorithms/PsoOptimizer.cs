using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using GrayWolf.Interfaces;
using GrayWolf.Model;

namespace GrayWolf.Algorithms
{
    public class PsoOptimizer : BaseOptimizer
    {
        public override string Name { get; set; } = "PSO";

        private  double w = 0.7;
        private  double c1 = 1.5; //Cognitive coefficient
        private  double c2 = 1.5; //Social coefficient


        private double[][] Velocities;
        private double[][] PersonalBestPositions; 
        private double[] PersonalBestFitnesses;

        public PsoOptimizer(int n, int dim, int iterNum, IBenchmarkFunc function, double minRange, double maxRange, string stateFilePath)
            : base(n, dim, iterNum, function, minRange, maxRange, stateFilePath)
        {
            Velocities = new double[N][];
            PersonalBestPositions = new double[N][];
            PersonalBestFitnesses = new double[N];

            for (int i = 0; i < N; i++)
            {
                Velocities[i] = new double[Dim];
                PersonalBestPositions[i] = new double[Dim];
            }
        }

        protected override void InitializeLeaders(double[][] pop, double[] fit)
        {
            SortPopulation();
            FBest = FitnessValues[0];
            XBest = (double[])Population[0].Clone();

            for (int i = 0; i < N; i++)
            {
                PersonalBestPositions[i] = (double[])Population[i].Clone();
                PersonalBestFitnesses[i] = FitnessValues[i];

                double range = MaxRange - MinRange;
                for (int d = 0; d < Dim; d++)
                {
                    Velocities[i][d] = RandomGenerator.NextDouble() * 2.0 * range - range;
                }
            }
        }

        protected override void RunIteration(int iteration, CancellationToken ct)
        {
            for(int i = 0; i<N;i++)
            {
                ct.ThrowIfCancellationRequested();
                double [] currentParticle = Population[i];

                for(int d = 0;d < Dim; d++)
                {
                    double r1 = RandomGenerator.NextDouble();
                    double r2 = RandomGenerator.NextDouble();

                    double cognitive = c1 * r1 * (PersonalBestPositions[i][d] - currentParticle[d]);
                    double social = c2 * r2 * (XBest[d] - currentParticle[d]);

                    Velocities[i][d] = (w* Velocities[i][d]) + cognitive + social;

                    currentParticle[d] = currentParticle[d]+Velocities[i][d]; 
                }
                CheckBounds(currentParticle);
                double newFitness = Function.Calculate_Value(currentParticle);
                FitnessValues[i] = newFitness;
                NumberOfEvaluationFitnessFunction++;

                if(newFitness < PersonalBestFitnesses[i])
                {
                    PersonalBestFitnesses[i] = newFitness;
                    PersonalBestPositions[i] = (double[])currentParticle.Clone();
                }

                if (newFitness < FBest)
                {
                    FBest = newFitness;
                    XBest = (double[])currentParticle.Clone();
                }
            }
        }

        protected override string GetSpecificStateJson()
        {
            var data = new PsoSpecificData
            {
                BestPosition = XBest,
                BestFitness =FBest,
                Velocities = Velocities,
                PersonalBestPositions = PersonalBestPositions,
                PersonalBestFitnesses = PersonalBestFitnesses,
            };
            return JsonSerializer.Serialize(data);
        }

        protected override void LoadSpecificState(string json)
        {
            if (string.IsNullOrEmpty(json)) return;
            try
            {
                var data = JsonSerializer.Deserialize<PsoSpecificData>(json);
                Velocities = data.Velocities;
                PersonalBestPositions = data.PersonalBestPositions;
                PersonalBestFitnesses = data.PersonalBestFitnesses;
                FBest = data.BestFitness;
                XBest = data.BestPosition;
            }
            catch { /* Ignoruj błędy deserializacji */ }
        }

        protected override void LogHistory(int iteration)
        {
            var psoLog = new List<EntityLog>();
            for (int k = 0; k < N; k++)
            {
                bool isLeader = (FitnessValues[k] == FBest);
                psoLog.Add(new EntityLog
                {
                    Position = (double[])Population[k].Clone(),
                    Fitness = FitnessValues[k],
                    Role = isLeader ? "GlobalBest" : "Particle",
                    IsLeader = isLeader
                });
            }
            FullHistory.Add(new IterationLog { Iteration = iteration, Entities = psoLog });
        }
    }
}