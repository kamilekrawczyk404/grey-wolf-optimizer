using GrayWolf.Interfaces;
using GrayWolf.Model;
using GrayWolf.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GrayWolf.Algorithms
{
    public abstract class BaseOptimizer : IOptimizationAlgorithm
    {
        // własności interfejsu
        public abstract string Name { get; set; }
        public double[] XBest { get; set; }
        public double FBest { get; set; }
        public int NumberOfEvaluationFitnessFunction { get; set; }

        // wspólne pola dla wszystkich optymalizatorów
        protected int N;
        protected int Dim;
        protected int IterNum;
        protected IBenchmarkFunc Function;
        protected double MinRange;
        protected double MaxRange;
        protected string StateFilePath;

        // dane stanu optymalizatora
        protected double[][] Population;
        protected double[] FitnessValues;
        public List<IterationLog> FullHistory { get; set; } = new List<IterationLog>();
        protected Random RandomGenerator = new Random();

        // konstruktor
        protected BaseOptimizer(int n, int dim, int iterNum, IBenchmarkFunc function, double minRange, double maxRange, string stateFilePath)
        {
            N = n;
            Dim = dim;
            IterNum = iterNum;
            Function = function;
            MinRange = minRange;
            MaxRange = maxRange;
            StateFilePath = stateFilePath;
            //XBest = new double[Dim];
            //FBest = double.MaxValue;
            //NumberOfEvaluationFitnessFunction = 0;
            //Population = new double[N][];
            //FitnessValues = new double[N];
        }

        // metoda abstrakcyjna do implementacji w klasach pochodnych
        public double Solve(CancellationToken cancellationToken = default)
        {
            int startIteration = 0;

            // jeśli istnieje plik stanu, wczytaj stan
            var checkpoint = CheckpointService.LoadCheckpoint(StateFilePath);

            if (checkpoint != null && checkpoint.AlgorithmName == Name && checkpoint.FunctionName == Function.ToString())
            {
                // wczytaj stan z checkpointu
                startIteration = checkpoint.CurrentIteration;
                Population = checkpoint.Population;
                FitnessValues = checkpoint.FitnessValues;
                XBest = checkpoint.GlobalBestPosition;
                FBest = checkpoint.GlobalBestFitness;
                NumberOfEvaluationFitnessFunction = checkpoint.EvaluationsCount;
                FullHistory = checkpoint.HistoryLogs ?? new List<IterationLog>();

                // przywróć stan specyficzny dla algorytmu
                LoadSpecificState(checkpoint.AlgorithmSpecificDataJson);
            }
            else
            {
                // zainicjuj populację od nowa
                Population = GeneratePopulation();
                FitnessValues = CalculateFitness(Population);

                // dla pewnych algorytmów inicjujemy liderów
                InitializeLeaders(Population, FitnessValues);
                NumberOfEvaluationFitnessFunction = N;
            }

            // obliczamy dynamiczny krok zapisywania stanu
            int checkpointStep = CalculateCheckpointInterval(IterNum);

            // główna pętla optymalizacji
            for (int iter = startIteration; iter < IterNum; iter++)
            {
                cancellationToken.ThrowIfCancellationRequested();

                LogHistory(iter);

                // wykonaj krok optymalizacji
                RunIteration(iter, cancellationToken);
                // zapisujemy stan co określoną liczbę iteracji
                if ((iter + 1) % checkpointStep == 0 || iter == IterNum - 1)
                {
                    cancellationToken.ThrowIfCancellationRequested();
                    SaveCheckpoint(iter + 1);
                }
            }

            CheckpointService.ClearCheckpoint(StateFilePath);
            return FBest;
        }

        // metoda obliczająca dynamiczny krok zapisywania stanu
        protected int CalculateCheckpointInterval(int totalIterations)
        {
            if (totalIterations < 20) return 1;

            // dzielimy przez 20, aby mieć około 20 zapisów
            double n = totalIterations / 20.0;

            // obliczamy współczynnik log10, który pomaga zwiększyć odstępy między zapisami wraz ze wzrostem liczby iteracji
            double logValue = Math.Log10(totalIterations);

            if (logValue < 1) logValue = 1; // unikanie dzielenia przez zero lub bardzo małych wartości

            double coeff = 1.0 / logValue;

            int step = (int)Math.Round(n * coeff);

            // upewniamy się, że krok jest liczbą parzystą
            if (step % 2 != 0) step++;

            return Math.Max(step, 1); // zapewniamy, że krok jest co najmniej 1
        }

        private void SaveCheckpoint(int currentIteration)
        {
            var specificDataJson = GetSpecificStateJson();

            var checkpoint = new CheckpointData
            {
                AlgorithmName = Name,
                FunctionName = Function.ToString(),
                CurrentIteration = currentIteration,
                Population = Population,
                FitnessValues = FitnessValues,
                GlobalBestPosition = XBest,
                GlobalBestFitness = FBest,
                EvaluationsCount = NumberOfEvaluationFitnessFunction,
                HistoryLogs = FullHistory,
                Dimensions = Dim,
                PopulationSize = N,
                AlgorithmSpecificDataJson = specificDataJson
            };
            CheckpointService.SaveCheckpoint(StateFilePath, checkpoint);
        }

        // helpers'y, więc nie ma potrzeby powtarzania ich w klasach pochodnych
        protected double[][] GeneratePopulation()
        {
            double[][] population = new double[N][];
            for (int i = 0; i < N; i++)
            {
                population[i] = new double[Dim];
                for (int d = 0; d < Dim; d++)
                {
                    population[i][d] = MinRange + (MaxRange - MinRange) * RandomGenerator.NextDouble();
                }
            }
            return population;
        }

        protected double[] CalculateFitness(double[][] population)
        {
            double[] fitnessValues = new double[N];
            for (int i = 0; i < N; i++)
            {
                fitnessValues[i] = Function.Calculate_Value(population[i]);
                NumberOfEvaluationFitnessFunction++;
            }
            return fitnessValues;
        }

        protected void SortPopulation()
        {
            var paired = Population.Zip(FitnessValues, (pos, fit) => new { Position = pos, Fitness = fit })
                               .OrderBy(item => item.Fitness).ToArray();

            for (int i = 0; i < N; i++)
            {
                Population[i] = paired[i].Position;
                FitnessValues[i] = paired[i].Fitness;
            }
        }

        protected void CheckBounds(double[] agent)
        {
            for (int d = 0; d < Dim; d++)
            {
                if (agent[d] < MinRange) agent[d] = MinRange;
                else if (agent[d] > MaxRange) agent[d] = MaxRange;
            }
        }

        // metody abstrakcyjne do implementacji w klasach pochodnych
        protected abstract void RunIteration(int iteration, CancellationToken ct);
        protected abstract void InitializeLeaders(double[][] pop, double[] fit);
        protected abstract string GetSpecificStateJson();
        protected abstract void LoadSpecificState(string json);
        protected abstract void LogHistory(int iteration);
    }
}
