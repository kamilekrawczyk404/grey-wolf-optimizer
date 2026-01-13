using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GrayWolf.Services
{
    internal static class NumberFormatter
    {
        private const double ScientificThreshold = 1e-8;
        private const double LargeNumberThreshold = 1e6;

        public static string Format(double value, int fixedDecimals = 6)
        {
            if (double.IsNaN(value) || double.IsInfinity(value))
                return value.ToString();

            double abs = Math.Abs(value);

            if ((abs > 0 && abs < ScientificThreshold) || abs >= LargeNumberThreshold)
            {
                return value.ToString("E6"); // scientific notation
            }

            return value.ToString($"F{fixedDecimals}");
        }

        public static string FormatPercent(double value)
        {
            if (double.IsNaN(value) || double.IsInfinity(value))
                return "N/A";

            return value.ToString("F2") + "%";
        }
    }

}
