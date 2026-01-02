using GrayWolf.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GrayWolf
{
    internal class Rastrigin : IBenchmarkFunc
    {
        public Rastrigin() { }

        public double Calculate_Value(double[] value)//wzór z internetu
        {
            int n = value.Length;
            double wynik = 10 * n; 

            for (int i = 0; i < n; i++)
            {
                wynik += (value[i] * value[i]) - 10 * Math.Cos(2 * Math.PI * value[i]);
            }

            return wynik;
        }
        public override string ToString()// wypisze nam poprawne wyniki
        {
            return "Rastrigin (minimum globalne = 0 w punkcie [0,0,...,0])";
        }

        public double[][] GlobalMinimum => new[] { new double[] { 0.0, 0.0 } };
    }
}
