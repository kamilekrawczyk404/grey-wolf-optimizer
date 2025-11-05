using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GrayWolf
{
    internal class BukinFuncN6: IBenchmarkFunc
    {
        public BukinFuncN6() { }
        public double Calculate_Value(double[] value)
        {
            double x = value[0];
            double y = value[1];
            double term1 = 100 * Math.Sqrt(Math.Abs(y - 0.01 * x * x));
            double term2 = 0.01 * Math.Abs(x + 10);
            double wynik = term1 + term2;
            return wynik;
        }
        public override string ToString()
        {
            return "BukinN.6 Function (minimum globalne = 0 w punkcie [-10,1])";
        }
    }
}
