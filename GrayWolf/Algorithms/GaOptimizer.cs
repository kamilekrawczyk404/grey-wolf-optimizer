using GrayWolf.Interfaces;
using GrayWolf.Model;
using Microsoft.AspNetCore.Mvc.RazorPages;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using System.Text.Json;
using System.Text.Json.Serialization;//PAMIĘTAJ O TYM

namespace GrayWolf.Algorithms
{
    public class GaOptimizer :BaseOptimizer
    {
        public override string Name { get; set; } = "Genetic Algorithm";

        double CrossoverProbability= 0.8;
        double MutationRate = 0.05;
        double MutationStrength = 0.01;
        int TournamentSize = 3;

        private double _crossoverProb;
        private double _mutationRate;
        private double _mutationStrength;
        private int _tournamentSize;

        public GaOptimizer(int n, int dim, int iterNum, IBenchmarkFunc function, double minRange, double maxRange,
            string stateFilePath, Dictionary<string, double>? parameters)
            : base(n, dim, iterNum, function, minRange, maxRange, stateFilePath, parameters)
        {
            _crossoverProb = Parameters.ContainsKey("CrossoverProbability") ? Parameters["CrossoverProbability"] : 0.8;
            _mutationRate = Parameters.ContainsKey("MutationRate") ? Parameters["MutationRate"] : 0.05;
            _mutationStrength = Parameters.ContainsKey("MutationStrength") ? Parameters["MutationStrength"] : 0.01;
            _tournamentSize = (int)(Parameters.ContainsKey("TournamentSize") ? Parameters["TournamentSize"] : 3);
        }

        protected override void InitializeLeaders(double[][] pop, double[] fit)
        {
            SortPopulation();
            XBest = (double[])Population[0].Clone();
            FBest = FitnessValues[0];
        }

        protected override void RunIteration(int iteration, CancellationToken ct)
        {
            double[][] nextGeneration = new double[N][];
            double[] nextFitness = new double[N];

            for (int i = 0; i < N; i++)
            {
                double[] parent1 = Selection();
                double[] parent2 = Selection();
                double[] child = new double[Dim];

                if (RandomGenerator.NextDouble() < _crossoverProb)
                {
                    for (int d = 0; d < Dim; d++)
                    {
                        if (RandomGenerator.NextDouble() < 0.5)
                        {
                            child[d] = parent1[d];
                        }
                        else
                        {
                            child[d] = parent2[d];
                        }

                    }

                }
                else 
                {
                    child = (double[])parent1.Clone();
                }

                //mutacja
                for(int d = 0;d < Dim; d++)
                {
                    if(RandomGenerator.NextDouble()< _mutationRate)
                    {
                        child[d] +=  (RandomGenerator.NextDouble() * 2.0 - 1.0) * (MaxRange - MinRange) * _mutationStrength;
                    }
                }

                CheckBounds(child);
                double childFitness = Function.Calculate_Value(child);
                NumberOfEvaluationFitnessFunction++;

                nextGeneration[i] = child;
                nextFitness[i] = childFitness;

                if(childFitness < FBest)
                {
                    FBest = childFitness;
                    XBest = (double[])child.Clone();
                }

            }

            Population = nextGeneration;
            FitnessValues = nextFitness;
        }



        private double[] Selection()
        {
            int bestIdx = -1;
            double bestVal = double.MaxValue;

            
            for (int k = 0; k < _tournamentSize; k++)
            {
                int randIdx = RandomGenerator.Next(0, N);
                if (FitnessValues[randIdx] < bestVal)
                {
                    bestVal = FitnessValues[randIdx];
                    bestIdx = randIdx;
                }
            }
            
            return Population[bestIdx];
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
                    IsLeader = (FitnessValues[k] == FBest),
                    Role = "Chromosome"
                });
            }
            FullHistory.Add(new IterationLog
            {
                Iteration = iteration,
                Entities = entitiesLog
            });
        }

        protected override string GetSpecificStateJson()
        {
            var data = new GaSpecificData
            {
                BestPosition = XBest,
                BestFitness = FBest,

            };
            return JsonSerializer.Serialize(data);
        }

        // Odczyt stanu
        protected override void LoadSpecificState(string json)
        {
            if (string.IsNullOrEmpty(json)) return;

            var data = JsonSerializer.Deserialize<GaSpecificData>(json);
            if (data != null)
            {
                XBest = data.BestPosition;
                FBest = data.BestFitness;

            }
        }
    }
}
