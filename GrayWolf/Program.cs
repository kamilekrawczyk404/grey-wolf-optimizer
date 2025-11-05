// See https://aka.ms/new-console-template for more information
using System;
using GrayWolf;//bez tego błąd

Console.WriteLine("=== Gray Wolf Optimizer ===\n");

//funkcja testowa
IBenchmarkFunc funkcja = new Rastrigin();

int n = 10;        // liczba wilków
int D = 2;         // liczba wymiarów
int IterNum = 5; // liczba iteracji
double min = -5.12;
double max = 5.12;
int testAmount = 10; // liczba testów

//algorytm + raportowanie

RaportingSystem raportingSystem = new RaportingSystem(n, D, IterNum, funkcja, min, max, testAmount);

raportingSystem.InitializeTest();

Console.WriteLine("\n=== KONIEC PROGRAMU ===");