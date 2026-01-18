using GrayWolf.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;

namespace GrayWolf
{
    public class TransformerFunc : IBenchmarkFunc
    {
        ObjectiveFunction _of;
        public TransformerFunc()
        {
            _of = new ObjectiveFunction();
        }

        public double Calculate_Value(double[] value)
        {
            return _of.FunkcjaCelu.Wartosc(value);
        }

        public override string ToString()
        {
            return "Transformer Function (minimum globalne - gdzieś na pewno)";
        }
        public double[][] GlobalMinimum => new[] { new double[] { 1.0, 1.0, 1.0 } };
        //public double[][] GlobalMinimum = new[] { new double[] { -2137, 2137 } };
    }



    //FunkcjaCelu12.cs
    class FunkcjaCelu12
    {
        double R25 = 15;
        double R75 = 25;


        private Transforamtor12 t12;
        double pierwiastek = Math.Sqrt(3.0);
        private double[,] u;
        private int n;
        private double deltaT;
        public FunkcjaCelu12(double[,] u, int n, Transforamtor12 t12, double deltaT)
        {
            //t12 = new Transforamtor12(n);
            this.t12 = t12;
            this.u = u;
            this.n = n;
            this.deltaT = deltaT;

        }

        private double WartoscSkuteczna(double[] v, double krok)
        {
            int n = v.Length;
            double s = 0.0;
            for (int i = 0; i < n; i++)
            {
                s += v[i] * v[i];
            }

            return Math.Sqrt(s / n);



        }

        public string DrukujWSkuteczne(double[] x)
        {
            var napis = "";
            var v = Wartosc(x);
            double[][] pK = new double[6][];
            double[,] p = t12.Prady;



            for (int i = 0; i < 6; i++)
            {
                pK[i] = new double[n];
                for (int j = 0; j < n; j++)
                    pK[i][j] = p[j, i];

            }


            for (int i = 0; i < 6; i++)
            {
                napis += $"{i} {WartoscSkuteczna(pK[i], deltaT)}";
                napis += Environment.NewLine;
            }
            return napis;
        }

        public double Wartosc()
        {
            double wU;
            if (t12.R > R75) wU = 1.0;
            else if (t12.R > R25) wU = (t12.R - R25) / (R75 - R25);
            else wU = 0.0;

            double wI = 1.0 - wU;



            double[] v = t12.Symulacja(u, n);
            double[,] p = t12.Prady;

            double pierw3 = Math.Sqrt(3);

            double[] p0 = new double[n];
            double[] p1 = new double[n];
            double[] p2 = new double[n];
            double[] p3 = new double[n];
            double[] p4 = new double[n];
            double[] p5 = new double[n];

            double suma = 0.0;
            for (int i = 0; i < n; i++)
            {
                // suma += Math.Abs(p[i, 1] - p[i, 0]) + Math.Abs(p[i, 2] - p[i, 0]) + Math.Abs(p[i, 2] - p[i, 1]);
                // suma += Math.Abs(p[i, 4] - p[i, 3]) + Math.Abs(p[i, 5] - p[i, 3]) + Math.Abs(p[i, 5] - p[i, 4]);
                p0[i] = p[i, 0];
                p1[i] = p[i, 1];
                p2[i] = p[i, 2];
                p3[i] = p[i, 3];
                p4[i] = p[i, 4];
                p5[i] = p[i, 5];
            }



            suma += Math.Abs(WartoscSkuteczna(p1, deltaT) - WartoscSkuteczna(p0, deltaT));
            suma += Math.Abs(WartoscSkuteczna(p2, deltaT) - WartoscSkuteczna(p0, deltaT));
            suma += Math.Abs(WartoscSkuteczna(p2, deltaT) - WartoscSkuteczna(p1, deltaT));
            suma += Math.Abs(WartoscSkuteczna(p4, deltaT) - WartoscSkuteczna(p3, deltaT));
            suma += Math.Abs(WartoscSkuteczna(p5, deltaT) - WartoscSkuteczna(p3, deltaT));
            suma += Math.Abs(WartoscSkuteczna(p5, deltaT) - WartoscSkuteczna(p4, deltaT));

            suma += Math.Abs(pierw3 - WartoscSkuteczna(p3, deltaT) / WartoscSkuteczna(p0, deltaT));
            suma += Math.Abs(pierw3 - WartoscSkuteczna(p4, deltaT) / WartoscSkuteczna(p1, deltaT));
            suma += Math.Abs(pierw3 - WartoscSkuteczna(p5, deltaT) / WartoscSkuteczna(p2, deltaT));


            //return suma;

            double min = v[0];
            double max = v[0];
            for (int i = 1; i < n; i++)
            {
                if (min > v[i]) min = v[i];
                else
                if (max < v[i]) max = v[i];
            }
            return wU * (max - min) + wI * suma;

        }

        public double Wartosc(params double[] x)
        {
            //obliczenia napięć 
            for (int i = 0; i <= 2; i++)
            {
                for (int j = 0; j < n; j++)
                {
                    u[i + 3, j] = x[i] * u[i, j] / pierwiastek;
                }
            }

            return Wartosc();
        }


        public double[] V(params double[] x)
        {
            for (int i = 0; i <= 2; i++)
            {
                for (int j = 0; j < n; j++)
                {
                    u[i + 3, j] = x[i] * u[i, j] / pierwiastek;
                }
            }
            return t12.Symulacja(u, n);
        }
    }


    class ObjectiveFunction
    {
        private const int n = 401;
        private double deltaT = 0.00005;

        private double omega = 100 * Math.PI;
        private double alpha = 2.0 * Math.PI / 3.0;
        private double wsp = Math.Sin(7.5 * Math.PI / 180.0) / Math.Sin(52.5 * Math.PI / 180.0);
        private double[][] uabc = new double[n][];


        private void GenerujNapiecieSieci2(params double[] param)
        {
            double t = 0.0;// 27218*(deltaT-1);
            string res = "";
            for (int i = 0; i < n; i++)
            {
                uabc[i] = new double[3];

                uabc[i][0] = param[0] * Math.Sin(omega * t) +
                                    param[3] * Math.Sin(2 * (omega * t + param[9])) +
                                    param[4] * Math.Sin(3 * (omega * t + param[10])) +
                                    param[5] * Math.Sin(5 * (omega * t + param[11])) +
                                    param[6] * Math.Sin(7 * (omega * t + param[12])) +
                                    param[7] * Math.Sin(11 * (omega * t + param[13])) +
                                    param[8] * Math.Sin(13 * (omega * t + param[14]))
                                    ;
                uabc[i][1] = param[1] * Math.Sin(omega * t + alpha) +
                                    param[3] * Math.Sin(2 * (omega * t + param[9])) +
                                    param[4] * Math.Sin(3 * (omega * t + param[10])) +
                                    param[5] * Math.Sin(5 * (omega * t + param[11] + alpha)) +
                                    param[6] * Math.Sin(7 * (omega * t + param[12] + alpha)) +
                                    param[7] * Math.Sin(11 * (omega * t + param[13] + alpha)) +
                                    param[8] * Math.Sin(13 * (omega * t + param[14] + alpha))
                                    ;
                uabc[i][2] = param[2] * Math.Sin(omega * t + 2.0 * alpha) +
                                    param[3] * Math.Sin(2 * (omega * t + param[9])) +
                                    param[4] * Math.Sin(3 * (omega * t + param[10])) +
                                    param[5] * Math.Sin(5 * (omega * t + param[11] + 2.0 * alpha)) +
                                    param[6] * Math.Sin(7 * (omega * t + param[12] + 2.0 * alpha)) +
                                    param[7] * Math.Sin(11 * (omega * t + param[13] + 2.0 * alpha)) +
                                    param[8] * Math.Sin(13 * (omega * t + param[14] + 2.0 * alpha))
                                    ;
                t += deltaT;
                // res += $"{u[i][0]} {u[i][1]} {u[i][2]}" + Environment.NewLine;
            }
            //File.WriteAllText("\\zasilanie.txt", res);
        }


        Transforamtor12 t12 = new Transforamtor12(n);

        double[,] u = new double[6, n];
        double t = 0;


        public FunkcjaCelu12 FunkcjaCelu { get; }

        public ObjectiveFunction()
        {
            t12.R = 15;

            GenerujNapiecieSieci2(100.0, 100.0, 100.0, 1.5, 2.3, 1.2, 2.2, 0.5, 1.1, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0);

            for (int i = 0; i < n; i++)
            {
                u[0, i] = uabc[i][0];
                u[1, i] = uabc[i][1];
                u[2, i] = uabc[i][2];
                u[3, i] = u[0, i] / Math.Sqrt(3.0);
                u[4, i] = u[1, i] / Math.Sqrt(3.0);
                u[5, i] = u[2, i] / Math.Sqrt(3.0);
                t += deltaT;
            }

            var a = new[] { 0.5, 0.5, 0.5 };
            var b = new[] { 1.5, 1.5, 1.5 };

            FunkcjaCelu = new FunkcjaCelu12(u, 401, t12, deltaT);

        }

    }

        //transformator12.cs


    class Transforamtor12
    {

        int iloscPulsow = 12;
        const double blokowanie = 10_000.0;
        const double przewodzenie = 0.01;
        const double spadek = 0.5;


        double[] Rz = new[] { 1.0, 1.0, 1.0, 0.33, 0.33, 0.33 };

        public double R { get; set; } = 25.0;

        double[] d = new double[12];
        double[,] a = new double[8, 8];
        double[] w = new double[8];
        double[] uD = new double[12];
        double[] i = new double[6];
        double[] v;
        private int iloscKrokow;
        double[,] prady;

        public double[,] Prady => prady;

        public double V { get { return v[7]; } }

        bool zmiana = false;

        public Transforamtor12(int n)
        {
            for (int i = 0; i < 8; i++)
                for (int j = 0; j < 8; j++)
                    a[i, j] = 0.0;
            iloscKrokow = n;
            prady = new double[iloscKrokow, 6];

        }

        private double[] GaussElimination(double[,] A, double[] b, int n)
        {
            double[] x = new double[n];

            double[,] tmpA = new double[n, n + 1];

            for (int i = 0; i < n; i++)
            {
                for (int j = 0; j < n; j++)
                {
                    tmpA[i, j] = A[i, j];
                }
                tmpA[i, n] = b[i];
            }
            //ZapiszMacierz(tmpA, "start");

            double tmp = 0;

            for (int k = 0; k < n - 1; k++)
            {
                for (int i = k + 1; i < n; i++)
                {
                    tmp = tmpA[i, k] / tmpA[k, k];
                    for (int j = k; j < n + 1; j++)
                    {
                        tmpA[i, j] -= tmp * tmpA[k, j];
                    }
                }
                //ZapiszMacierz(tmpA, k.ToString());
            }
            //ZapiszMacierz(tmpA, "35");

            for (int k = n - 1; k >= 0; k--)
            {
                tmp = 0;
                for (int j = k + 1; j < n; j++)
                {
                    tmp += tmpA[k, j] * x[j];
                }
                x[k] = (tmpA[k, n] - tmp) / tmpA[k, k];
            }

            return x;
        }

        private void LiczAdmitancje()
        {

            a[0, 0] = 1 / Rz[3] + 1 / Rz[4] + 1 / Rz[5];
            a[0, 1] = -1 / Rz[3];
            a[0, 2] = -1 / Rz[4];
            a[0, 3] = -1 / Rz[5];

            a[1, 0] = -1 / Rz[3];
            a[1, 1] = 1 / Rz[3] + 1 / d[0] + 1 / d[1];
            a[1, 7] = -1 / d[0];

            a[2, 0] = -1 / Rz[4];
            a[2, 2] = 1 / Rz[4] + 1 / d[2] + 1 / d[3];
            a[2, 7] = -1 / d[2];

            a[3, 0] = -1 / Rz[5];
            a[3, 3] = 1 / Rz[5] + 1 / d[4] + 1 / d[5];
            a[3, 7] = -1 / d[4];

            a[4, 4] = 1 / Rz[0] + 1 / Rz[2] + 1 / d[6] + 1 / d[7];
            a[4, 5] = -1 / Rz[0];
            a[4, 6] = -1 / Rz[2];
            a[4, 7] = -1 / d[6];


            a[5, 4] = -1 / Rz[0];
            a[5, 5] = 1 / Rz[0] + 1 / Rz[1] + 1 / d[8] + 1 / d[9];
            a[5, 6] = -1 / Rz[1];
            a[5, 7] = -1 / d[8];

            a[6, 4] = -1 / Rz[2];
            a[6, 5] = -1 / Rz[1];
            a[6, 6] = 1 / Rz[2] + 1 / Rz[1] + 1 / d[10] + 1 / d[11];
            a[6, 7] = -1 / d[10];

            a[7, 1] = -1 / d[0];
            a[7, 2] = -1 / d[2];
            a[7, 3] = -1 / d[4];
            a[7, 4] = -1 / d[6];
            a[7, 5] = -1 / d[8];
            a[7, 6] = -1 / d[10];
            a[7, 7] = 1 / d[0] + 1 / d[2] + 1 / d[4] + 1 / d[6] + 1 / d[8] + 1 / d[10] + 1 / R;

        }
        private void LiczWymuszenia(double[] u)
        {
            w[0] = -u[3] / Rz[3] - u[4] / Rz[4] - u[5] / Rz[5];
            w[1] = u[3] / Rz[3];
            w[2] = u[4] / Rz[4];
            w[3] = u[5] / Rz[5];
            w[4] = u[0] / Rz[0] - u[2] / Rz[2];
            w[5] = u[1] / Rz[1] - u[0] / Rz[0];
            w[6] = u[2] / Rz[2] - u[1] / Rz[1];
            w[7] = 0.0;

        }

        private void LiczUD(double[] v)
        {
            uD[0] = v[1] - v[7];
            uD[1] = -v[1];
            uD[2] = v[2] - v[7];
            uD[3] = -v[2];
            uD[4] = v[3] - v[7];
            uD[5] = -v[3];
            uD[6] = v[4] - v[7];
            uD[7] = -v[4];
            uD[8] = v[5] - v[7];
            uD[9] = -v[5];
            uD[10] = v[6] - v[7];
            uD[11] = -v[6];
        }

        private bool Test()
        {
            for (int i = 0; i < iloscPulsow; i++)
            {
                if (uD[i] > spadek && d[i] == blokowanie) return false;
                else
                if (uD[i] < 0.0 && d[i] == przewodzenie) return false;
            }
            return true;
        }

        public void Iteracja(double[] u)
        {
            //zamkniecie wszystkich diod
            for (int i = 0; i < iloscPulsow; i++)
                d[i] = blokowanie;

            var it = 0;

            LiczAdmitancje();
            LiczWymuszenia(u);
            v = GaussElimination(a, w, 8);
            LiczUD(v);

            while (!Test() && it++ <= iloscPulsow + 1)
            {
                zmiana = false;
                //sprawdzenie czy nie ma tu za dużo otwartych
                for (int i = 0; i < iloscPulsow; i++)
                    if (uD[i] < 0.0 && d[i] == przewodzenie)
                    {
                        d[i] = blokowanie;
                        zmiana = true;
                    }

                //wlaczanie najbardziej dodatnich
                if (!zmiana)
                {
                    int indeks = 0;
                    double max = uD[0];
                    for (int i = 1; i < iloscPulsow; i++)
                    {
                        if (uD[i] > max)
                        {
                            max = uD[i];
                            indeks = i;
                        }
                    }
                    //odblokowanie wszystkich z maksymalną wartością
                    for (int i = 0; i < iloscPulsow; i++)
                    {
                        if (Math.Abs(uD[i] - max) < 0.0001 && uD[i] > spadek)
                        {
                            d[i] = przewodzenie;
                        }

                    }

                }

                //nowe wyznaczenie Admintancji i Wymuszenia
                LiczAdmitancje();
                LiczWymuszenia(u);

                v = GaussElimination(a, w, 8);
                LiczUD(v);

            }



        }

        public double[] Symulacja(double[,] u, int n)
        {
            double[] vtmp = new double[n];
            double[] utk = new double[6];
            for (int i = 0; i < n; i++)
            {
                utk[0] = u[0, i];
                utk[1] = u[1, i];
                utk[2] = u[2, i];
                utk[3] = u[3, i];
                utk[4] = u[4, i];
                utk[5] = u[5, i];
                Iteracja(utk);
                vtmp[i] = V;
                LiczPrad(utk, i);

            }
            return vtmp;

        }



        public void LiczPrad(double[] u, int k)
        {
            prady[k, 0] = (v[5] + u[0] - v[4]) / Rz[0];
            prady[k, 1] = (v[6] + u[1] - v[5]) / Rz[1];
            prady[k, 2] = (v[4] + u[2] - v[6]) / Rz[2];
            prady[k, 3] = (v[0] + u[3] - v[1]) / Rz[3];
            prady[k, 4] = (v[0] + u[4] - v[2]) / Rz[4];
            prady[k, 5] = (v[0] + u[5] - v[3]) / Rz[5];

        }

        //niepotrzebne
        //public void ZapiszPrady(string plik)
        //{
        //    string napis = "";
        //    for (int i = 0; i < iloscKrokow; i++)
        //    {
        //        napis += prady[i, 0] + " ";
        //        for (int j = 1; j < 6; j++)
        //        {
        //            napis += prady[i, j] + " ";
        //        }
        //        napis += Environment.NewLine;
        //    }
        //    System.IO.File.WriteAllText(plik, napis);
        //}
    }
}

    


