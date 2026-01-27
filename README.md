# GrayWolf Optimization Framework

Projekt zawiera framework do optymalizacji wykorzystujący różne algorytmy metaheurystyczne oraz interfejs webowy do wizualizacji wyników.

## Struktura projektu

- **Backend:** ASP.NET Core Web API (.NET 8)
- **Frontend:** React + TypeScript

## Wymagania

- .NET 8 SDK
- Node.js (wersja 14 lub nowsza)
- npm

---

## Uruchomienie projektu

### Backend (API)

```bash
# Przejdź do katalogu głównego projektu
cd GrayWolf

# Uruchom serwer API
dotnet run
```

API będzie dostępne pod adresem: [http://localhost:5000](http://localhost:5000)

---

### Frontend (React)

```bash
# Przejdź do katalogu frontendu
cd GrayWolf/ReactPresenter

# Zainstaluj zależności (tylko przy pierwszym uruchomieniu)
npm install

# Uruchom aplikację React
npm start
```

Aplikacja będzie dostępna pod adresem: [http://localhost:3000](http://localhost:3000)

---

## Dostępne algorytmy

- **GWO** (Grey Wolf Optimizer)
- **PSO** (Particle Swarm Optimization)
- **GA** (Genetic Algorithm)
- **BA** (Bat Algorithm)
- **BOA** (Butterfly Optimization Algorithm)
- **SSA** (Salp Swarm Algorithm)
- **Aquila** (Aquila Optimizer)

## Funkcje benchmarkowe

- Rastrigin
- Sphere
- Beale
- Rosenbrock
- Bukin N.6
- Transformer

---

## ⭐ Funkcjonalności

- **Konfigurowalne parametry:** Uruchamianie optymalizacji z pełną kontrolą parametrów.
- **Multi-trial:** Wsparcie dla wielu niezależnych prób.
- **Raporty:** Generowanie dokumentów z wynikami.
- **Porównywarka:** Porównywanie algorytmów i funkcji.
- **System checkpointów:** Wznawianie przerwanych obliczeń.
- **Wizualizacja live:** Podgląd wizualizacji wykonywania algorytmu w dedykowanym oknie.
