using GrayWolf.Interfaces;
using GrayWolf.Model;
using GrayWolf.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Security.Cryptography;
using System.Runtime.Intrinsics.Arm;
using System.Threading;//Do cancelation Tokena

namespace GrayWolf.Algorithms
{
    public class SsaOptimizer: BaseOptimizer
    {
        // własności interfejsu
        public override string Name { get; set; } = "Salp Swarm Optimizer";

        // konstruktor
        public SsaOptimizer(int n, int D, int IterNum, IBenchmarkFunc funkcja, double min_range, double max_range,
            string stateFilePath, Dictionary<string, double>? parameters = null)
           : base(n, D, IterNum, funkcja, min_range, max_range, stateFilePath, parameters)
        {
        }


        // metody abstrakcyjne do implementacji w klasach pochodnych
        protected override void RunIteration(int iteration, CancellationToken ct)
        {
            double c1 = 2.0 * Math.Exp(-Math.Pow(4.0 * iteration / IterNum, 2));
            for (int i = 0; i < N; i++) 
            {
                ct.ThrowIfCancellationRequested();
                double[] currentSalp = Population[i];
                double[] previousSalp = (i > 0) ? Population[i - 1] : null;

                for(int d = 0;d<Dim; d++)
                {
                    if (i == 0)
                    {
                        double c2 = RandomGenerator.NextDouble();
                        double c3 = RandomGenerator.NextDouble();

                        if (c3 >= 0.5)
                        {
                            currentSalp[d] = XBest[d] + c1 * ((MaxRange - MinRange) * c2 + MinRange);
                        }
                        else
                        {
                            currentSalp[d] = XBest[d] - c1 * ((MaxRange - MinRange) * c2 + MinRange);
                        }
                    }
                    else 
                    {
                        currentSalp[d] = (currentSalp[d] + previousSalp[d]) / 2;
                    }

                    if (currentSalp[d] < MinRange)
                    {
                        currentSalp[d] = MinRange;
                    }
                    else if (currentSalp[d] > MaxRange)
                    {
                        currentSalp[d] = MaxRange;
                    }
                }

                double newFitnessValues = Function.Calculate_Value(currentSalp);

                if (newFitnessValues < FBest) 
                {
                    FBest = newFitnessValues;
                    XBest = (double[])currentSalp.Clone();
                }
            }
        }
        protected override void InitializeLeaders(double[][] pop, double[] fit)
        {
            SortPopulation();

            XBest = (double[])Population[0].Clone();
            FBest = FitnessValues[0];

        }
        protected override string GetSpecificStateJson()
        {
            var specificData = new SsaSpecificData
            {
                FoodPosition = XBest,
                FoodFitness = FBest,
            };

            return JsonSerializer.Serialize(specificData);
        }

        protected override void LoadSpecificState(string json)
        {
            var ssaData = JsonSerializer.Deserialize<SsaSpecificData>(json);
            XBest = ssaData.FoodPosition;
            FBest = ssaData.FoodFitness;
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
                    IsLeader = (k == 0),
                    Role = k == 0 ? "Leader" : "Follower"
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

