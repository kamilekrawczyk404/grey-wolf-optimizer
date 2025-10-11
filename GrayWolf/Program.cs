// See https://aka.ms/new-console-template for more information
using System;
using GrayWolf;//bez tego błąd

Console.WriteLine("=== Gray Wolf Optimizer ===\n");

//funkcja testowa
IBenchmarkFunc funkcja = new Rastrigin();


int n = 30;        // liczba wilków
int D = 2;         // liczba wymiarów
int IterNum = 300; // liczba iteracji
double min = -5.12;
double max = 5.12;

//algorytm + raportowanie

RaportingSystem raportingSystem = new RaportingSystem(n, D, IterNum, funkcja, min, max, 5);

raportingSystem.InitializeTest();


Console.WriteLine("\n=== KONIEC PROGRAMU ===");
