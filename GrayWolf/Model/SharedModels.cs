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
        public ReportProperties Properties { get; set; }
        public List<IterationLog> History { get; set; }
    }

    public class ReportProperties
    {
        public string Algorithm { get; set; }
        public int Iterations { get; set; }
        public double LowerBound { get; set; }
        public double UpperBound { get; set; }
        public int Dimensions { get; set; }
        public string BenchmarkFunction { get; set; }
        public int PopulationSize { get; set; }
        public double[] BestSolution { get; set; }
        public double BestFitness { get; set; }
        public double[][] Solution { get; set; }
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

    public class SingleTrialFunctionResult
    {
        public string FunctionName { get; set; }
        public double BestFitness { get; set; }
        public double[] BestSolution { get; set; }
        public int EvaluationsCount { get; set; }
    }

    public class GenerateFunctionComparisonRequest
    {
        public string AlgorithmName { get; set; }
        public List<SingleTrialFunctionResult> Results { get; set; }
        public int PopulationSize { get; set; }
        public int Iterations { get; set; }
        public int Dimensions { get; set; }
        public double LowerBound { get; set; }
        public double UpperBound { get; set; }
    }

    public class MultiTrialFunctionResult
    {
        public string FunctionName { get; set; }

        // statystyki z wielu prób
        public double BestFitness { get; set; }
        public double WorstFitness { get; set; }
        public double MeanFitness { get; set; }
        public double MedianFitness { get; set; }
        public double StdDevFitness { get; set; }
        public double CoeffOfVariationFitness { get; set; }

        public double[] BestSolution { get; set; }
        public int TrialsCount { get; set; }
        public int EvaluationsCount { get; set; }
    }

    public class GenerateMultiTrialFunctionComparisonRequest
    {
        public string AlgorithmName { get; set; }
        public List<MultiTrialFunctionResult> Results { get; set; }
        public int PopulationSize { get; set; }
        public int Iterations { get; set; }
        public int Dimensions { get; set; }
        public double LowerBound { get; set; }
        public double UpperBound { get; set; }
    }

    public class FunctionComparisonResponse
    {
        public string AlgorithmName { get; set; }
        public FunctionComparisonSummary Summary { get; set; }
        public List<FunctionPerformance> Functions { get; set; }
        public string Message { get; set; }
    }

    public class FunctionComparisonSummary
    {
        public string BestFunction { get; set; }  // Function where algorithm performed best
        public double BestFitness { get; set; }
        public string WorstFunction { get; set; }  // Function where algorithm performed worst
        public double WorstFitness { get; set; }
        public int FunctionsCompared { get; set; }
    }

    public class FunctionPerformance
    {
        public string FunctionName { get; set; }
        public double BestFitness { get; set; }
        public double[] BestSolution { get; set; }
        public int Rank { get; set; }  // Rank based on fitness (1 = best performance)
    }

    public class MultiTrialFunctionComparisonResponse
    {
        public string AlgorithmName { get; set; }
        public MultiTrialFunctionComparisonSummary Summary { get; set; }
        public List<MultiTrialFunctionPerformance> Functions { get; set; }
        public string Message { get; set; }
    }

    public class MultiTrialFunctionComparisonSummary
    {
        public string BestFunction { get; set; }
        public double BestFitness { get; set; }
        public string MostConsistentFunction { get; set; }
        public double MostConsistentCV { get; set; }
        public string WorstFunction { get; set; }
        public double WorstFitness { get; set; }
        public int FunctionsCompared { get; set; }
    }

    public class MultiTrialFunctionPerformance
    {
        public string FunctionName { get; set; }
        public double BestFitness { get; set; }
        public double WorstFitness { get; set; }
        public double MeanFitness { get; set; }
        public double MedianFitness { get; set; }
        public double StdDevFitness { get; set; }
        public double CoeffOfVariationFitness { get; set; }
        public double[] BestSolution { get; set; }
        public int TrialsCount { get; set; }
        public int Rank { get; set; }
    }
}
