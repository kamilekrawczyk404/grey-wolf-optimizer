using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GrayWolf
{
    internal class SphereFunc: IBenchmarkFunc
    {
        public SphereFunc() { }

        public double Calculate_Value(double[] value)
        {
            double wynik = 0.0;
            int n = value.Length;
            for (int i = 0; i < n; i++)
            {
                wynik += value[i] * value[i];
            }
            return wynik;
        }

        public override string ToString()
        {
            return "Sphere Function (minimum globalne = 0 w punkcie [0,0,...,0])";
        }
    }
}
