using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GrayWolf.Model
{
    public class IterationLog
    {
        public int Iteration { get; set; }
        public List <EntityLog> Entities { get; set; }
    }

    public class EntityLog
    {
        public bool IsLeader { get; set; }
        public string Role { get; set; }
        public double Fitness { get; set; }
        public double[] Position { get; set; }
    }

    public class GwoSpecificData
    {
        public double[] AlphaPosition { get; set; }
        public double AlphaScore { get; set; }
        public double[] BetaPosition { get; set; }
        public double BetaScore { get; set; }
        public double[] DeltaPosition { get; set; }
        public double DeltaScore { get; set; }
    }

    public class AquilaSpecificData
    {
        public double[] BestPosition { get; set; }
        public double BestScore { get; set; }
    }

    public class FinalVisualizerReport
    {
        public string Description { get; set; }
        public ReportProperies Properies { get; set; }
        public List<IterationLog> History { get; set; }
    }

    public class ReportProperies
    {
        public int Iterations { get; set; }
        public double LowerBound { get; set; }
        public double UpperBound { get; set; }
        public int Dimensions { get; set; }
        public string BenchmarkFunction { get; set; }
        public int PopulationSize { get; set; }
        public double[] BestSolution { get; set; }
        public double BestFitness { get; set; }
        public double[][] GlobalMinimumCoords { get; set; }
    }

    // potrzebne do porównania algorytmów
    public class ComparisonResult
    {
        public string AlgorithmName { get; set; }
        public double BestFitness { get; set; }
        public double[] BestSolution { get; set; }
        public int Iterations { get; set; }
    }

    // potrzebne do porównania algorytmów
    public class GenerateComparisonRequest
    {
        public string FunctionName { get; set; }
        public List<ComparisonResult> Results { get; set; }
    }

    // potrzebne do porównania wielu prób danego algorytmu
    public class MultiTrialComparisonResult
    {
        public string AlgorithmName { get; set; }
        public double BestFitness { get; set; }
        public double WorstFitness { get; set; }
        public double MeanFitness { get; set; }
        public double MedianFitness { get; set; }
        public double StdDevFitness { get; set; }
        public double CoeffOfVariationFitness { get; set; }

        public double[] BestSolution { get; set; }
        public int TrialsCount { get; set; }
        public int IterationsCount { get; set; }
    }

    // potrzebne do porównania wielu prób danego algorytmu
    public class GenerateMultiTrialComparisonRequest
    {
        public string FunctionName { get; set; }
        public List<MultiTrialComparisonResult> Results { get; set; }
    }
}
