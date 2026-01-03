using GrayWolf.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GrayWolf
{
    internal class Rosenbrock: IBenchmarkFunc
    {
        public Rosenbrock() { }

        public double Calculate_Value(double[] value)
        {
            double wynik = 0.0;
            int n = value.Length;
            for (int i = 0; i < n - 1; i++)
            {
                wynik += 100 * Math.Pow((value[i + 1] - value[i] * value[i]), 2) + Math.Pow((value[i] - 1), 2);
            }
            return wynik;
        }

        public override string ToString()
        {
            return "Rosenbrock (minimum globalne = 0 w punkcie [1,1,...,1])";
        }

        public double[][] GlobalMinimum => new[] { new double[] { 1.0, 1.0 } };
    }
}
