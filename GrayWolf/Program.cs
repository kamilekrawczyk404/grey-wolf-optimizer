using GrayWolf;
using GrayWolf.Algorithms;
using GrayWolf.Interfaces;
using GrayWolf.Model;
using GrayWolf.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using System.Diagnostics; // only for Debug.WriteLine
using System.IO;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

app.UseCors();

//ENDPOINT
app.MapPost("/api/optimizer/run", async (HttpRequest request, CancellationToken ct) =>
{
    string? runId = null;
    try
    {
        Console.WriteLine("Otrzymano request do /api/optimizer/run");

        var optimizerRequest = await JsonSerializer.DeserializeAsync<OptimizerRequest>(request.Body, cancellationToken: ct);

        if (optimizerRequest == null)
        {
            return Results.BadRequest("Invalid request body");
        }

        runId = string.IsNullOrEmpty(optimizerRequest.RunId) ? Guid.NewGuid().ToString() : optimizerRequest.RunId;
        

        Console.WriteLine($"RunId: {runId}");

        Console.WriteLine($"Algorytm: {optimizerRequest.Algorithm}, Pop={optimizerRequest.PopulationSize}, Iter={optimizerRequest.Iterations}");

        var function = BenchmarkFactory.GetFunction(optimizerRequest.Function);

        if (optimizerRequest.Trials < 1)
        {
            return Results.BadRequest("Liczba prób musi być co najmniej 1.");
        }



        if (optimizerRequest.Trials == 1)
        {
            // Wybór algorytmu na podstawie pola Algorithm w optimizerRequest oraz utworzenie unikalnej nazwy pliku checkpoint
            IOptimizationAlgorithm optimizer;
            string uniqueStateFileName = $"chckpnt_{optimizerRequest.Algorithm.ToLower()}_state_{runId}.json";

            switch (optimizerRequest.Algorithm)
            {
                case "Aquila":
                    optimizer = new AquilaOptimizer(
                        optimizerRequest.PopulationSize,
                        optimizerRequest.Dimensions,
                        optimizerRequest.Iterations,
                        function,
                        optimizerRequest.LowerBound,
                        optimizerRequest.UpperBound,
                        uniqueStateFileName
                    );
                    break;

                case "GWO":
                default:
                    optimizer = new GWOptimizer(
                        optimizerRequest.PopulationSize,
                        optimizerRequest.Dimensions,
                        optimizerRequest.Iterations,
                        function,
                        optimizerRequest.LowerBound,
                        optimizerRequest.UpperBound,
                        uniqueStateFileName
                    );
                    break;
            }

            optimizer.Solve(ct);

            Console.WriteLine("Test (API) zakończony sukcesem.");

            var reportingSystem = new RaportingSystem();

            List<IterationLog> historyLogs = new List<IterationLog>();
            if (optimizer is GWOptimizer gwo) historyLogs = gwo.FullHistory;
            else if (optimizer is AquilaOptimizer aquila) historyLogs = aquila.FullHistory;

            reportingSystem.GenerateReport(
                optimizer.Name,
                function,
                optimizer.XBest,
                optimizer.FBest,
                historyLogs,
                optimizerRequest.Iterations,
                optimizerRequest.PopulationSize,
                optimizerRequest.Dimensions,
                optimizerRequest.LowerBound,
                optimizerRequest.UpperBound
            );

            return Results.Ok(new
            {
                RunId = runId,
                BestSolution = optimizer.XBest,
                BestFitness = optimizer.FBest,
                Solution = function.GlobalMinimum,
                HistoryJson = historyLogs,
                Message = $"Test algorytmu {optimizer.Name} przeprowadzono pomyślnie."
            });
        }
        else
        {
            // TO-DO: checkpointing dla wielu prób, jeśli potrzebne
            Console.WriteLine($"Rozpoczynanie {optimizerRequest.Trials} prób dla algorytmu {optimizerRequest.Algorithm}");

            var trials = new List<TrialResult>();

            for (int trialNum = 1; trialNum <= optimizerRequest.Trials; trialNum++)
            {
                ct.ThrowIfCancellationRequested();

                Console.WriteLine($"Rozpoczynanie próby {trialNum}/{optimizerRequest.Trials}...");

                // dla wielu prób nie mamy checkpointingu, więc używamy tymczasowej nazwy pliku

                string tempStateFileName = $"temp_chckpnt_{optimizerRequest.Algorithm.ToLower()}_{runId}_trial{trialNum}.json";

                IOptimizationAlgorithm optimizer;

                switch (optimizerRequest.Algorithm)
                {
                    case "Aquila":
                        optimizer = new AquilaOptimizer(
                            optimizerRequest.PopulationSize,
                            optimizerRequest.Dimensions,
                            optimizerRequest.Iterations,
                            function,
                            optimizerRequest.LowerBound,
                            optimizerRequest.UpperBound,
                            tempStateFileName
                        );
                        break;
                    case "GWO":
                    default:
                        optimizer = new GWOptimizer(
                            optimizerRequest.PopulationSize,
                            optimizerRequest.Dimensions,
                            optimizerRequest.Iterations,
                            function,
                            optimizerRequest.LowerBound,
                            optimizerRequest.UpperBound,
                            tempStateFileName
                        );
                        break;
                }

                optimizer.Solve(ct);

                List<IterationLog> historyLogs = new List<IterationLog>();
                if (optimizer is GWOptimizer gwo) historyLogs = gwo.FullHistory;
                else if (optimizer is AquilaOptimizer aquila) historyLogs = aquila.FullHistory;

                trials.Add(new TrialResult
                {
                    TrialNumber = trialNum,
                    BestSolution = optimizer.XBest,
                    BestFitness = optimizer.FBest,
                    EvaluationsCount = optimizer.NumberOfEvaluationFitnessFunction,
                    HistoryLogs = historyLogs
                });

                // usuwamy tymczasowy plik checkpoint po zakończeniu próby
                CheckpointService.ClearCheckpoint(tempStateFileName);
                Console.WriteLine($"Próba {trialNum} zakończona. Najlepszy fitness: {optimizer.FBest}");
            }

            var stats = StatisticsService.CalculateStats(trials);

            var reportingSystem = new RaportingSystem();
            reportingSystem.GenerateMultiTrialReport(
                optimizerRequest.Algorithm,
                function,
                stats,
                optimizerRequest.Iterations,
                optimizerRequest.PopulationSize,
                optimizerRequest.Dimensions,
                optimizerRequest.LowerBound,
                optimizerRequest.UpperBound
            );

            return Results.Ok(new
            {
                RunId = runId,
                AlgorithmName = optimizerRequest.Algorithm,
                FunctionName = optimizerRequest.Function,
                Statistics = stats,
                Message = $"Przeprowadzono {optimizerRequest.Trials} prób algorytmu {optimizerRequest.Algorithm} pomyślnie."
            });
        }
    }
    // jeśli użytkownik anulował request (np. zamknął przeglądarkę)
    catch (OperationCanceledException)
    {
        Console.WriteLine("Optymalizacja została anulowana przez klienta.");
        return Results.Json(new
        {
            RunId = runId,
            Message = "Optymalizacja została anulowana przez klienta."
        }, statusCode: 499); // 499 Client Closed Request
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Wystąpił błąd krytyczny: {ex.Message}");
        // zwracamy RunID (GUID) nawet w przypadku błędu, aby frontend mógł powiązać błąd z sesją
        return Results.Json(new
        {
            RunId = runId,
            Error = ex.Message
        }, statusCode: 500);
    }
});

// ENDPOINT - pobieranie aktywnych/nie zakończonych sesji optymalizacyjnych
app.MapGet("/api/optimizer/checkpoints", () =>
{
    // pobieramy wszystkie pliki zaczynające się od "chckpnt_" i kończące na ".json"
    var checkpointFiles = Directory.GetFiles(Directory.GetCurrentDirectory(), "chckpnt_*.json");

    var activeSessions = new List<object>();

    foreach (var file in checkpointFiles)
    {
        try
        {
            // odczytujemy podstawowe dane z pliku checkpoint
            var content = File.ReadAllText(file);
            var checkpointData = JsonSerializer.Deserialize<CheckpointData>(content);

            // wyciągamy RunId (GUID) z nazwy pliku
            string fileName = Path.GetFileNameWithoutExtension(file);
            string runId = fileName.Split("_").Last();

            activeSessions.Add(new
            {
                RunId = runId,
                Algorithm = checkpointData.AlgorithmName,
                Function = checkpointData.FunctionName,
                PopulationSize = checkpointData.PopulationSize,
                Dimensions = checkpointData.Dimensions,
                CurrentIteration = checkpointData.CurrentIteration,
                GlobalBestFitness = checkpointData.GlobalBestFitness,
                EvaluationsCount = checkpointData.EvaluationsCount,
                LastUpdated = File.GetLastWriteTime(file)
            });
        }
        catch
        {
            // plik może być obecnie używany lub uszkodzony, pomijamy go
            continue;
        }
    }

    return Results.Ok(activeSessions);
});

// ENDPOINT - dla generowania raportu porównawczego (wielu algorytmów na tej samej funkcji)
app.MapPost("/api/optimizer/compare", (GenerateComparisonRequest request) =>
{
    try
    {
        Console.WriteLine("Otrzymano request do /api/optimizer/compare");

        var reportingSystem = new RaportingSystem();
        reportingSystem.GenerateComparisonReport(request.FunctionName, request.Results);
        Console.WriteLine("Raport porównawczy wygenerowany pomyślnie.");
        return Results.Ok(new
        {
            Message = "Raport porównawczy wygenerowany pomyślnie.",
            ReportType = "Regular Comparison"
        });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Wystąpił błąd krytyczny podczas generowania raportu porównawczego: {ex.Message}");
        return Results.Json(new
        {
            Error = ex.Message
        }, statusCode: 500);
    }
});

// ENDPOINT - porównanie wielu prób danego algorytmu
app.MapPost("/api/optimizer/compare-multitrial", (GenerateMultiTrialComparisonRequest request) =>
{
    try
    {
        Console.WriteLine("Otrzymano request do /api/optimizer/multi-trial-report");

        if (request.Results == null || request.Results.Count == 0)
        {
            return Results.BadRequest("Brak wyników prób do porównania.");
        }

        var reportingSystem = new RaportingSystem();
        reportingSystem.GenerateMultiTrialComparisonReport(request.FunctionName, request.Results);
        Console.WriteLine("Raport z wielu prób wygenerowany pomyślnie.");
        return Results.Ok(new
        {
            Message = $"Raport porównawczy dla {request.Results.Count} algorytmów wygenerowany pomyślnie.",
            AlgorithmsCompared = request.Results.Select(r => r.AlgorithmName).ToList(),
            ReportType = "Multi-Trial Comparison"
        });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Wystąpił błąd krytyczny podczas generowania raportu z wielu prób: {ex.Message}");
        return Results.Json(new
        {
            Error = ex.Message
        }, statusCode: 500);
    }
});

// ENDPOINT - porównanie funkcji dla danego algorytmu
app.MapPost("/api/optimizer/compare-functions", (GenerateFunctionComparisonRequest request) =>
{
    try
    {
        Console.WriteLine("Otrzymano request do /api/optimizer/compare-functions");

        if (request.Results == null || request.Results.Count == 0)
        {
            return Results.BadRequest("Brak wyników funkcji do porównania.");
        }

        var reportingSystem = new RaportingSystem();
        reportingSystem.GenerateFunctionComparisonReport(request.AlgorithmName, request.Results, request.PopulationSize, request.Iterations, request.Dimensions, request.LowerBound, request.UpperBound);
        Console.WriteLine("Raport porównawczy funkcji wygenerowany pomyślnie.");
        return Results.Ok(new
        {
            Message = "Raport porównawczy funkcji wygenerowany pomyślnie.",
            ReportType = "Function Comparison"
        });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Wystąpił błąd krytyczny podczas generowania raportu porównawczego funkcji: {ex.Message}");
        return Results.Json(new
        {
            Error = ex.Message
        }, statusCode: 500);
    }
});

// ENDPOINT - porównanie wielu prób funkcji dla danego algorytmu
app.MapPost("/api/optimizer/compare-functions-multitrial", (GenerateMultiTrialFunctionComparisonRequest request) =>
{
    try
    {
        Console.WriteLine("Otrzymano request do /api/optimizer/compare-functions-multitrial");
        if (request.Results == null || request.Results.Count == 0)
        {
            return Results.BadRequest("Brak wyników funkcji do porównania.");
        }
        var reportingSystem = new RaportingSystem();
        reportingSystem.GenerateMultiTrialFunctionComparisonReport(request.AlgorithmName, request.Results, request.PopulationSize, request.Iterations, request.Dimensions, request.LowerBound, request.UpperBound);
        Console.WriteLine("Raport porównawczy wielu prób funkcji wygenerowany pomyślnie.");
        return Results.Ok(new
        {
            Message = "Raport porównawczy wielu prób funkcji wygenerowany pomyślnie.",
            ReportType = "Multi-Trial Function Comparison"
        });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Wystąpił błąd krytyczny podczas generowania raportu porównawczego wielu prób funkcji: {ex.Message}");
        return Results.Json(new
        {
            Error = ex.Message
        }, statusCode: 500);
    }
});

// ENDPOINT - usuwanie checkpointu
app.MapDelete("/api/optimizer/checkpoint/{runId}", (string runId) =>
{
    try
    {
        string fileNamePattern = $"chckpnt_*_{runId}.json";
        var files = Directory.GetFiles(Directory.GetCurrentDirectory(), fileNamePattern);
        if (files.Length == 0)
        {
            return Results.NotFound(new { Message = "Checkpoint not found." });
        }
        foreach (var file in files)
        {
            File.Delete(file);
        }
        return Results.Ok(new { Message = "Checkpoint deleted successfully." });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error deleting checkpoint: {ex.Message}");
        return Results.Json(new
        {
            Error = ex.Message
        }, statusCode: 500);
    }
});

app.Urls.Add("http://localhost:5000");
app.Run();


public class OptimizerRequest
{
    public string Algorithm { get; set; } //nowe pole dla wyboru algorytmu
    public string? RunId { get; set; } //opcjonalne pole dla identyfikatora uruchomienia, jeśli dostajemy je z frontendu
    // w przeciwnym razie genjerujemy nowe
    public int PopulationSize { get; set; }
    public int Dimensions { get; set; }
    public int Iterations { get; set; }
    public double LowerBound { get; set; }
    public double UpperBound { get; set; }
    public string Function { get; set; }
    public int Trials { get; set; } = 1; //liczba niezależnych prób
}

public static class BenchmarkFactory
{
    public static IBenchmarkFunc GetFunction(string name)
    {
        return name switch
        {
            "Rastrigin" => new Rastrigin(),
            "Sphere" => new SphereFunc(),
            "Beale" => new BealeFunc(),
            "RosenBrock" => new Rosenbrock(),
            "BukinN6" => new BukinFuncN6(),
            _ => new Rastrigin()
        };
    }
}