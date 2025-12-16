using GrayWolf;
using GrayWolf.Interfaces;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using System.Text.Json;
using System.IO;
using GrayWolf.Algorithms; 

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
    try
    {
        Console.WriteLine("Otrzymano request do /api/optimizer/run");

        var optimizerRequest = await JsonSerializer.DeserializeAsync<OptimizerRequest>(request.Body);

        if (optimizerRequest == null)
        {
            return Results.BadRequest("Invalid request body");
        }

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
                    optimizerRequest.UpperBound
                );
                stateFileName = "aquila_state.json";
                break;

            case "GWO":
            default:
                optimizer = new GWOptimizer(
                    optimizerRequest.PopulationSize,
                    optimizerRequest.Dimensions,
                    optimizerRequest.Iterations,
                    function,
                    optimizerRequest.LowerBound,
                    optimizerRequest.UpperBound
                );
                stateFileName = "gwo_state.json";
                break;
        }

        
        if (File.Exists(stateFileName)) File.Delete(stateFileName);

        optimizer.Solve();

        var bestSolution = optimizer.XBest;

        
        string historyJson = "{}";
        if (File.Exists(stateFileName))
        {
            historyJson = await File.ReadAllTextAsync(stateFileName);
        }

        Console.WriteLine("Test (API) zakończony sukcesem.");

        //RAPORTOWANIE
        try
        {
            RaportingSystem raportingSystem = new RaportingSystem(
                optimizerRequest.PopulationSize,
                optimizerRequest.Dimensions,
                optimizerRequest.Iterations,
                function,
                optimizerRequest.LowerBound,
                optimizerRequest.UpperBound
            );
            raportingSystem.InitializeTest();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Błąd w RaportingSystem: {ex.Message}");
        }

        return Results.Ok(new
        {
            BestSolution = bestSolution,
            HistoryJson = historyJson,
            Message = $"Test algorytmu {optimizer.Name} przeprowadzono pomyślnie."
        });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Wystąpił błąd krytyczny: {ex.Message}");
        return Results.Problem(ex.Message);
    }
});

app.Urls.Add("http://localhost:5000");
app.Run();


public class OptimizerRequest
{
    public string Algorithm { get; set; } //nowe pole dla wyboru algorytmu
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
            _ => new Rastrigin()
        };
    }
}