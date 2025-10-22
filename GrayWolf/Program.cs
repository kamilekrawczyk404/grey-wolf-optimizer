// See https://aka.ms/new-console-template for more information
using System;
using GrayWolf;//bez tego błąd

Console.WriteLine("=== Gray Wolf Optimizer ===\n");

//funkcja testowa
IBenchmarkFunc funkcja = new Rosenbrock();


int n = 500;        // liczba wilków
int D = 3;         // liczba wymiarów
int IterNum = 2000; // liczba iteracji
double min = -10;
double max = 10;

//algorytm + raportowanie

RaportingSystem raportingSystem = new RaportingSystem(n, D, IterNum, funkcja, min, max, 5);

raportingSystem.InitializeTest();


Console.WriteLine("\n=== KONIEC PROGRAMU ===");
