using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GrayWolf.Model
{
    public class CheckpointData
    {
        public int CurrentIteration { get; set; }
        public double[][] Population { get; set; }
        public double[] FitnessValues { get; set; }
        public double[] GlobalBestPosition { get; set; }
        public double GlobalBestFitness { get; set; }
        public int EvaluationsCount { get; set; }

        public string AlgorithmName { get; set; }
        public string FunctionName { get; set; }
        public int PopulationSize { get; set; }
        public int Dimensions { get; set; }

        public List<IterationLog> HistoryLogs { get; set; }

        // JSON string for algorithm-specific data
        // e.g., GwoSpecificData serialized to JSON
        // velocities for PSO, etc.
        public string AlgorithmSpecificDataJson { get; set; } 
    }
}
