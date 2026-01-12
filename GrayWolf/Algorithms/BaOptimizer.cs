using GrayWolf.Interfaces;
using GrayWolf.Model;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Text.Json;
using System.Text.Json.Serialization;//PAMIĘTAJ O TYM

namespace GrayWolf.Algorithms
{
    public class BaOptimizer : BaseOptimizer
    {
        public override string Name { get; set; } = "Bat Algorithm";

        private double Qmin = 0.0; //częstotliowść
        private double Qmax = 2.0;
        private double Alpha = 0.9;
        private double Gamma = 0.9;

        private double[][] Velocities;
        private double[] Loudness;    // A
        private double[] PulseRates;  // r
        private double[] InitialPulseRates;

        public BaOptimizer(int n, int dim, int iterNum, IBenchmarkFunc function, double minRange, double maxRange, string stateFilePath)
            : base(n, dim, iterNum, function, minRange, maxRange, stateFilePath)
        {
            Velocities = new double[N][];
            Loudness = new double[N];
            PulseRates = new double[N];
            InitialPulseRates = new double[N];

            for (int i = 0; i < N; i++)
            {
                Velocities[i] = new double[Dim];
            }
        }

        protected override void InitializeLeaders(double[][] pop, double[] fit)
        {
            SortPopulation();
            XBest = (double[])Population[0].Clone();
            FBest = FitnessValues[0];

            for(int i = 0; i<N;i++)
            {
                Loudness[i] = 0.9;
                PulseRates[i] = 0.1;
                InitialPulseRates[i] = 0.1;

                Array.Clear(Velocities[i], 0, Dim);
            }
        }

        protected override void RunIteration(int iteration, CancellationToken ct)
        {
            double avgLoudness = Loudness.Average();
            for(int i = 0;i<N;i++)
            {
                ct.ThrowIfCancellationRequested();

                double[] currentBat = Population[i];
                double[] newPosition = new double[Dim];

                double Q = Qmin + (Qmax - Qmin) * RandomGenerator.NextDouble();

                //aktualizacja każdej współrzędnej
                for(int d = 0; d<Dim;d++)
                {
                    Velocities[i][d] = Velocities[i][d] + (currentBat[d] - XBest[d]) * Q;
                    newPosition[d] = currentBat[d] + Velocities[i][d];
                }

                if(RandomGenerator.NextDouble() > PulseRates[i])
                {
                    for (int d = 0; d < Dim; d++)
                    {
                        double epsilon = RandomGenerator.NextDouble() * 2.0 - 1.0; // [-1, 1]   
                        newPosition[d] = XBest[d] + avgLoudness * epsilon;
                    }
                }

                CheckBounds(newPosition);
                NumberOfEvaluationFitnessFunction++;
                double newFitness = Function.Calculate_Value(newPosition);

                if(RandomGenerator.NextDouble() < Loudness[i] && newFitness< FitnessValues[i])
                {
                    Population[i] = newPosition;
                    FitnessValues[i] = newFitness;
                    Loudness[i] = Alpha * Loudness[i];
                    PulseRates[i] = InitialPulseRates[i] * (1.0 - Math.Exp(-Gamma * iteration));
                }

                if(newFitness<FBest)
                {
                    FBest = newFitness;
                    XBest = (double[])newPosition.Clone();//ciekawostka, jak nie ma (double []) to jest błąd, a jak usunie się .Clone() to działa bez (double [])
                }
            }
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
                    Role = "Bat"
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
            var data = new BaSpecificData
            {
                BestPosition = XBest,
                BestFitness = FBest,
                Velocities = Velocities,
                Loudness = Loudness,
                PulseRates = PulseRates,
                InitialPulseRates = InitialPulseRates
            };
            return JsonSerializer.Serialize(data);
        }

        // Odczyt stanu
        protected override void LoadSpecificState(string json)
        {
            if (string.IsNullOrEmpty(json)) return;

            var data = JsonSerializer.Deserialize<BaSpecificData>(json);
            if (data != null)
            {
                XBest = data.BestPosition;
                FBest = data.BestFitness;
                Velocities = data.Velocities;
                Loudness = data.Loudness;
                PulseRates = data.PulseRates;
                InitialPulseRates = data.InitialPulseRates;

                if (Velocities == null || Velocities.Length != N)
                {
                    Velocities = new double[N][];
                    for (int i = 0; i < N; i++) Velocities[i] = new double[Dim];
                }
            }
        }



    }
}
