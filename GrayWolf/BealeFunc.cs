using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GrayWolf
{
    internal class BealeFunc: IBenchmarkFunc
    {
        public BealeFunc() { }

        public double Calculate_Value(double[] value)
        {
            double x = value[0];
            double y = value[1];
            double term1 = Math.Pow((1.5 - x + x * y), 2);
            double term2 = Math.Pow((2.25 - x + x * y * y), 2);
            double term3 = Math.Pow((2.625 - x + x * y * y * y), 2);
            double wynik = term1 + term2 + term3;
            return wynik;
        }

        public override string ToString()
        {
            return "Beale Function (minimum globalne = 0 w punkcie [3,0.5])";
        }
    }
}
