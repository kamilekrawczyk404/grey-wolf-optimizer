// See https://aka.ms/new-console-template for more information
using System;
using GrayWolf;//bez tego błąd

Console.WriteLine("=== Gray Wolf Optimizer ===\n");

//funkcja testowa
IBenchmarkFunc funkcja = new Rastrigin();

int n = 20;        // liczba wilków
int D = 2;         // liczba wymiarów
int IterNum = 10; // liczba iteracji
// w przpadku funkcji Rastrigin i podobnych zakresy są jednakowe dla wszystkich wymiarów
// dlatego w takich przypadkach: Enumerable.Repeat(-5.12, D).ToArray();
double[] min = Enumerable.Repeat(-5.12, D).ToArray();
double[] max = Enumerable.Repeat(5.12, D).ToArray();
int testAmount = 10; // liczba testów

//algorytm + raportowanie

RaportingSystem raportingSystem = new RaportingSystem(n, D, IterNum, funkcja, min, max, testAmount);

raportingSystem.InitializeTest();

Console.WriteLine("\n=== KONIEC PROGRAMU ===");