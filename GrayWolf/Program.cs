// See https://aka.ms/new-console-template for more information
using System;
using GrayWolf;//bez tego błąd

Console.WriteLine("=== Gray Wolf Optimizer ===\n");

//funkcja testowa
IBenchmarkFunc funkcja = new Rastrigin();


int n = 30;        // liczba wilków
int D = 2;         // liczba wymiarów
int IterNum = 500; // liczba iteracji
double min = -5.12;
double max = 5.12;

//algorytm
GWOptimizer optimizer = new GWOptimizer(n, D, IterNum, funkcja, min, max);
double[] najlepszy = optimizer.Optimise();  


Console.WriteLine("\nNajlepsza pozycja (X_alpha):");
for (int i = 0; i < najlepszy.Length; i++)
{
    Console.WriteLine($"x[{i}] = {najlepszy[i]}");
}

Console.WriteLine("\nUżyta funkcja: " + funkcja);
Console.WriteLine("\n=== KONIEC PROGRAMU ===");
