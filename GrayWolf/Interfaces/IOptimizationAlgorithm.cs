using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GrayWolf.Interfaces
{
    public interface IOptimizationAlgorithm
    {
        string Name { get; set; }

        double Solve(CancellationToken cancellationToken = default);

        double[] XBest { get; set; }

        double FBest { get; set; }

        int NumberOfEvaluationFitnessFunction { get; set; }
    }
}