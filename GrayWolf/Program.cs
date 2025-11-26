using GrayWolf;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
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
    try
    {
        Console.WriteLine("Otrzymano request do /api/optimizer/run");


        var optimizerRequest = await JsonSerializer.DeserializeAsync<OptimizerRequest>(request.Body);

        if (optimizerRequest == null)
        {
            Console.WriteLine("Błąd: Niepoprawne body requestu");
            return Results.BadRequest("Invalid request body");
        }

        Console.WriteLine($"Parametry testu: PopulationSize={optimizerRequest.PopulationSize}, Dimensions={optimizerRequest.Dimensions}, Iterations={optimizerRequest.Iterations}, LowerBound={optimizerRequest.LowerBound}, UpperBound={optimizerRequest.UpperBound}, Function={optimizerRequest.Function}");

        var function = BenchmarkFactory.GetFunction(optimizerRequest.Function);

        GWOptimizer optimizer = new GWOptimizer(
            optimizerRequest.PopulationSize,
            optimizerRequest.Dimensions,
            optimizerRequest.Iterations,
            function,
            optimizerRequest.LowerBound,
            optimizerRequest.UpperBound
        );

        var (bestSolution, historyJson) = optimizer.Optimise();

        Console.WriteLine("Test został przeprowadzony pomyślnie!");
        Console.WriteLine($"Najlepsze rozwiązanie: {string.Join(", ", bestSolution)}");


        int n = optimizerRequest.PopulationSize;
        int D = optimizerRequest.Dimensions;
        int IterNum = optimizerRequest.Iterations;
        IBenchmarkFunc funkcja = BenchmarkFactory.GetFunction(optimizerRequest.Function);
        double min = optimizerRequest.LowerBound;
        double max = optimizerRequest.UpperBound;

        RaportingSystem raportingSystem = new RaportingSystem(n, D, IterNum, funkcja, min, max);
        raportingSystem.InitializeTest();


        Console.WriteLine("RaportingSystem został utworzony i test zainicjalizowany.");

        //zwrot wyników, może kiedyś się przydać
        return Results.Ok(new
        {
            BestSolution = bestSolution,
            HistoryJson = historyJson,
            Message = "Test przeprowadzono pomyślnie i zapisano wynik"
        });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Wystąpił błąd: {ex.Message}");
        return Results.Problem(ex.Message);
    }
});


app.Urls.Add("http://localhost:5000");
app.Run();


public class OptimizerRequest
{
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
