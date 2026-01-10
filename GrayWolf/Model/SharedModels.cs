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

    // TO-DO: uzunąć to później, jeśli nie będzie potrzebne??
    public class ComparisonResult
    {
        public string AlgorithmName { get; set; }
        public double BestFitness { get; set; }
        public double[] BestSolution { get; set; }
        public int Iterations { get; set; }
    }

    // TO-DO: uzunąć to później, jeśli nie będzie potrzebne??
    public class GenerateComparisonRequest
    {
        public string FunctionName { get; set; }
        public List<ComparisonResult> Results { get; set; }
    }
}
