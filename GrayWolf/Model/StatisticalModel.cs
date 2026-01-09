using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GrayWolf.Model
{
    public class TrialResult
    {
        public int TrialNumber { get; set; }
        public double[] BestSolution { get; set; }
        public double BestFitness { get; set; }
        public int EvaluationsCount { get; set; }
        public List<IterationLog> HistoryLogs { get; set; }
    }

    public class StatisticalSummary
    {
        // best and worst
        public double BestFitness { get; set; }
        public double WorstFitness { get; set; }
        public double[] BestSolution { get; set; }
        public double[] WorstSolution { get; set; }

        // fitness stats
        public double MeanFitness { get; set; }
        public double MedianFitness { get; set; }
        public double StdDevFitness { get; set; }
        public double CoeffOfVariationFitness { get; set; }

        // result params stats
        public double[] MeanSolution { get; set; }
        public double[] StdDevSolution { get; set; }
        public double[] CoeffOfVariationSolution { get; set; }

        // additional info
        public int TotalTrials { get; set; }
        public int TrialsUsedForStats { get; set; } // excluding worst if applicable
        public List<double> AllFitnessValues { get; set; }
        public List<TrialResult> AllTrials { get; set; }
    }

    public class MultipleTrialsResult
    {
        public string RunId { get; set; }
        public string AlgorithmName { get; set; }
        public string FunctionName { get; set; }
        public StatisticalSummary Statistics { get; set; }
        public string Message { get; set; }
    }
}
