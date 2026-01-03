using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GrayWolf.Interfaces
{
    public interface IBenchmarkFunc
    {
        double Calculate_Value(double[] value);
        double[][] GlobalMinimum { get; }
    }
}
