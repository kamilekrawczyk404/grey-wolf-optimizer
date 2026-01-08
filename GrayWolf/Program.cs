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
app.MapPost("/api/optimizer/run", async (HttpRequest request) =>
{
    string? runId = null;
    try
    {
        Console.WriteLine("Otrzymano request do /api/optimizer/run");

        var optimizerRequest = await JsonSerializer.DeserializeAsync<OptimizerRequest>(request.Body);

        if (optimizerRequest == null)
        {
            return Results.BadRequest("Invalid request body");
        }

        runId = string.IsNullOrEmpty(optimizerRequest.RunId) ? Guid.NewGuid().ToString() : optimizerRequest.RunId;
        string uniqueStateFileName = $"chckpnt_{optimizerRequest.Algorithm.ToLower()}_state_{runId}.json";

        Console.WriteLine($"RunId: {runId}");
        Console.WriteLine($"Unikalny plik stanu: {uniqueStateFileName}");

        Console.WriteLine($"Algorytm: {optimizerRequest.Algorithm}, Pop={optimizerRequest.PopulationSize}, Iter={optimizerRequest.Iterations}");

        var function = BenchmarkFactory.GetFunction(optimizerRequest.Function);

        //Wybór algorytmu i pliku stanu
        IOptimizationAlgorithm optimizer;
        string stateFileName;

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

        optimizer.Solve();

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
            HistoryJson = historyLogs,
            Message = $"Test algorytmu {optimizer.Name} przeprowadzono pomyślnie."
        });
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
            string runId = fileName.Replace("_", "");

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