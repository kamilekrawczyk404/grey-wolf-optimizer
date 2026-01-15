using GrayWolf;
using GrayWolf.Algorithms;
using GrayWolf.Interfaces;
using GrayWolf.Model;
using GrayWolf.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using System.Diagnostics; // only for Debug.WriteLine
using System.IO;
using System.Text.Json;
using RaportingSystem = GrayWolf.Services.RaportingSystem;
using Microsoft.AspNetCore.Hosting;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 262_144_000; // 200 MB

});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.WebHost.ConfigureKestrel(serverOptions =>
{
    serverOptions.Limits.MaxRequestBodySize = 262_144_000; // 200 MB
    serverOptions.Limits.KeepAliveTimeout = TimeSpan.FromMinutes(20); // Zwiększ timeout
    serverOptions.Limits.RequestHeadersTimeout = TimeSpan.FromMinutes(20);
});

var app = builder.Build();

app.UseCors();

app.Use(async (context, next) =>
{
    context.Features.Get<IHttpMaxRequestBodySizeFeature>()!.MaxRequestBodySize = 100_000_000;
    await next.Invoke();
});

// ENDPOINT - metadane dotyczące parametrów algorytmu (dla UI)
app.MapGet("/api/optimizer/parameters", () =>
{
    var metadata = new List<AlgorithmMetadata>
    {
        new AlgorithmMetadata
        {
            AlgorithmName = "GA",
            Parameters = new List<AlgorithmParameterInfo>
            {
                new() { Name = "CrossoverProbability", Description = "Prawdopodobieństwo krzyżowania", Min = 0.0, Max = 1.0, Step = 0.01, DefaultValue = 0.8 },
                new() { Name = "MutationRate", Description = "Szansa na mutację", Min = 0.0, Max = 1.0, Step = 0.01, DefaultValue = 0.05 },
                new() { Name = "MutationStrength", Description = "Siła mutacji", Min = 0.0, Max = 1.0, Step = 0.01, DefaultValue = 0.01 },
                new() { Name = "TournamentSize", Description = "Rozmiar turnieju", Min = 1, Max = 10, Step = 1, DefaultValue = 3 }
            }
        },
        new AlgorithmMetadata
        {
            AlgorithmName = "BA",
            Parameters = new List<AlgorithmParameterInfo>
            {
                new() { Name = "Qmin", Description = "Min częstotliwość", Min = 0.0, Max = 5.0, Step = 0.1, DefaultValue = 0.0 },
                new() { Name = "Qmax", Description = "Max częstotliwość", Min = 0.0, Max = 5.0, Step = 0.1, DefaultValue = 2.0 },
                new() { Name = "Alpha", Description = "Stała zaniku głośności", Min = 0.0, Max = 1.0, Step = 0.01, DefaultValue = 0.9 },
                new() { Name = "Gamma", Description = "Stała wzrostu impulsów", Min = 0.0, Max = 1.0, Step = 0.01, DefaultValue = 0.9 }
            }
        },
        new AlgorithmMetadata
        {
            AlgorithmName = "PSO",
            Parameters = new List<AlgorithmParameterInfo>
            {
                new() { Name = "w", Description = "Waga inercji", Min = 0.0, Max = 1.0, Step = 0.01, DefaultValue = 0.7 },
                new() { Name = "c1", Description = "Współczynnik kognitywny", Min = 0.0, Max = 4.0, Step = 0.1, DefaultValue = 1.5 },
                new() { Name = "c2", Description = "Współczynnik socjalny", Min = 0.0, Max = 4.0, Step = 0.1, DefaultValue = 1.5 }
            }
        },
        new AlgorithmMetadata
        {
            AlgorithmName = "BOA",
            Parameters = new List<AlgorithmParameterInfo>
            {
                new() { Name = "p", Description = "Prawdopodobieństwo przełączenia", Min = 0.0, Max = 1.0, Step = 0.01, DefaultValue = 0.8 },
                new() { Name = "c", Description = "Modalność sensora", Min = 0.0, Max = 1.0, Step = 0.01, DefaultValue = 0.01 },
                new() { Name = "a", Description = "Wykładnik potęgowy", Min = 0.0, Max = 1.0, Step = 0.01, DefaultValue = 0.1 }
            }
        },
        // algorytmy bez określonych parametrów mają puste listy
        new AlgorithmMetadata { AlgorithmName = "GWO", Parameters = new List<AlgorithmParameterInfo>() },
        new AlgorithmMetadata { AlgorithmName = "Aquila", Parameters = new List<AlgorithmParameterInfo>() },
        new AlgorithmMetadata { AlgorithmName = "SSA", Parameters = new List<AlgorithmParameterInfo>() }


    };

    return Results.Ok(metadata);
});

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
                case "SSA":
                    optimizer = new SsaOptimizer(
                        optimizerRequest.PopulationSize,
                        optimizerRequest.Dimensions,
                        optimizerRequest.Iterations,
                        function,
                        optimizerRequest.LowerBound,
                        optimizerRequest.UpperBound,
                        uniqueStateFileName,
                        optimizerRequest.Parameters
                        );
                    break;
                case "GA":
                    optimizer = new GaOptimizer(
                        optimizerRequest.PopulationSize,
                        optimizerRequest.Dimensions,
                        optimizerRequest.Iterations,
                        function,
                        optimizerRequest.LowerBound,
                        optimizerRequest.UpperBound,
                        uniqueStateFileName,
                        optimizerRequest.Parameters
                        );
                    break;
                case "PSO":
                    optimizer = new PsoOptimizer(
                        optimizerRequest.PopulationSize,
                        optimizerRequest.Dimensions,
                        optimizerRequest.Iterations,
                        function,
                        optimizerRequest.LowerBound,
                        optimizerRequest.UpperBound,
                        uniqueStateFileName,
                        optimizerRequest.Parameters
                    );
                    break;

                case "BOA":
                    optimizer = new BoaOptimizer(
                        optimizerRequest.PopulationSize,
                        optimizerRequest.Dimensions,
                        optimizerRequest.Iterations,
                        function,
                        optimizerRequest.LowerBound,
                        optimizerRequest.UpperBound,
                        uniqueStateFileName,
                        optimizerRequest.Parameters
                    );
                    break;
                case "BA":
                    optimizer = new BaOptimizer(
                        optimizerRequest.PopulationSize,
                        optimizerRequest.Dimensions,
                        optimizerRequest.Iterations,
                        function,
                        optimizerRequest.LowerBound,
                        optimizerRequest.UpperBound,
                        uniqueStateFileName,
                        optimizerRequest.Parameters
                        );
                    break;
                case "Aquila":
                    optimizer = new AquilaOptimizer(
                        optimizerRequest.PopulationSize,
                        optimizerRequest.Dimensions,
                        optimizerRequest.Iterations,
                        function,
                        optimizerRequest.LowerBound,
                        optimizerRequest.UpperBound,
                        uniqueStateFileName,
                        optimizerRequest.Parameters
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
                        uniqueStateFileName,
                        optimizerRequest.Parameters
                    );
                    break;
            }

            optimizer.Solve(ct);

            Console.WriteLine("Test (API) zakończony sukcesem.");

            List<IterationLog> historyLogs = new List<IterationLog>();
            if (optimizer is GWOptimizer gwo) historyLogs = gwo.FullHistory;
            else if (optimizer is AquilaOptimizer aquila) historyLogs = aquila.FullHistory;
            else if (optimizer is SsaOptimizer ssa) historyLogs = ssa.FullHistory;
            else if (optimizer is BaOptimizer ba) historyLogs = ba.FullHistory;
            else if (optimizer is GaOptimizer ga) historyLogs = ga.FullHistory;
            else if (optimizer is PsoOptimizer pso) historyLogs = pso.FullHistory;
            else if (optimizer is BoaOptimizer boa) historyLogs = boa.FullHistory;

            var reportingSystem = new RaportingSystem();

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
                optimizerRequest.UpperBound,
                optimizerRequest.GenerateReport,
                optimizerRequest.Parameters
                );

            return Results.Ok(new
            {
                RunId = runId,
                BestSolution = optimizer.XBest,
                BestFitness = optimizer.FBest,
                EvaluationsCount = optimizer.NumberOfEvaluationFitnessFunction,
                Solution = function.GlobalMinimum,
                HistoryJson = historyLogs,
                ReportGenerated = optimizerRequest.GenerateReport,
                Message = $"Test algorytmu {optimizer.Name} przeprowadzono pomyślnie."
            });
        }
        else
        {
            // Multi-trial z checkpointami
            Console.WriteLine($"Rozpoczynanie {optimizerRequest.Trials} prób dla algorytmu {optimizerRequest.Algorithm}");

            // Plik kontrolny wielu prób
            string multiTrialCheckpointFile = $"chckpnt_multitrial_{optimizerRequest.Algorithm.ToLower()}_{runId}.json";

            // Probujemy wczytać istniejący checkpoint wielu prób
            var multiTrialCheckpoint = CheckpointService.LoadMultiTrialCheckpoint(multiTrialCheckpointFile);

            List<TrialResult> trials = new List<TrialResult>();
            int startTrialNum = 1;

            // Sprawdzamy poprawność i wznawiamy od checkpointu, jeśli jest dostępny
            if (multiTrialCheckpoint != null)
            {
                if (CheckpointService.ValidateMultiTrialCheckpoint(multiTrialCheckpoint, optimizerRequest, optimizerRequest.Algorithm, function.ToString()))
                {
                    Console.WriteLine($"[MultiTrial] Wznowienie: {multiTrialCheckpoint.CompletedTrials} prób już ukończonych");
                    trials = multiTrialCheckpoint.CompletedTrialResults ?? new List<TrialResult>();
                    startTrialNum = multiTrialCheckpoint.CompletedTrials + 1;

                    if (startTrialNum > optimizerRequest.Trials)
                    {
                        Console.WriteLine("[MultiTrial] Wszystkie próby już ukończone!");
                        var existingStats = StatisticsService.CalculateStats(trials);

                        // Clean up checkpoint after returning results
                        CheckpointService.ClearCheckpoint(multiTrialCheckpointFile);

                        return Results.Ok(new
                        {
                            RunId = runId,
                            AlgorithmName = optimizerRequest.Algorithm,
                            FunctionName = optimizerRequest.Function,
                            Statistics = existingStats,
                            Message = $"Wszystkie {optimizerRequest.Trials} prób zostały już ukończone (wczytano z checkpointu)."
                        });
                    }
                }
                else
                {
                    Console.WriteLine("[MultiTrial] Checkpoint nie pasuje do żądania. Rozpoczynanie od nowa.");
                    trials.Clear();
                    startTrialNum = 1;
                }
            }

            // Przeprowadzamy pozostałe próby
            for (int trialNum = startTrialNum; trialNum <= optimizerRequest.Trials; trialNum++)
            {
                ct.ThrowIfCancellationRequested();

                Console.WriteLine($"[MultiTrial] Rozpoczynanie próby {trialNum}/{optimizerRequest.Trials}...");

                // Każda indywidualna próba otrzymuje własny plik z checkpointem
                string trialCheckpointFile = $"chckpnt_{optimizerRequest.Algorithm.ToLower()}_trial{trialNum}_{runId}.json";

                IOptimizationAlgorithm optimizer;

                switch (optimizerRequest.Algorithm)
                {
                    case "SSA":
                        optimizer = new SsaOptimizer(
                            optimizerRequest.PopulationSize,
                            optimizerRequest.Dimensions,
                            optimizerRequest.Iterations,
                            function,
                            optimizerRequest.LowerBound,
                            optimizerRequest.UpperBound,
                            trialCheckpointFile,
                            optimizerRequest.Parameters
                        );
                        break;
                    case "Aquila":
                        optimizer = new AquilaOptimizer(
                            optimizerRequest.PopulationSize,
                            optimizerRequest.Dimensions,
                            optimizerRequest.Iterations,
                            function,
                            optimizerRequest.LowerBound,
                            optimizerRequest.UpperBound,
                            trialCheckpointFile,
                            optimizerRequest.Parameters
                        );
                        break;
                    case "PSO":
                        optimizer = new PsoOptimizer(
                            optimizerRequest.PopulationSize,
                            optimizerRequest.Dimensions,
                            optimizerRequest.Iterations,
                            function,
                            optimizerRequest.LowerBound,
                            optimizerRequest.UpperBound,
                            trialCheckpointFile,
                            optimizerRequest.Parameters
                        );
                        break;
                    case "BOA":
                        optimizer = new BoaOptimizer(
                            optimizerRequest.PopulationSize,
                            optimizerRequest.Dimensions,
                            optimizerRequest.Iterations,
                            function,
                            optimizerRequest.LowerBound,
                            optimizerRequest.UpperBound,
                            trialCheckpointFile,
                            optimizerRequest.Parameters
                        );
                        break;
                    case "GA":
                        optimizer = new GaOptimizer(
                            optimizerRequest.PopulationSize,
                            optimizerRequest.Dimensions,
                            optimizerRequest.Iterations,
                            function,
                            optimizerRequest.LowerBound,
                            optimizerRequest.UpperBound,
                            trialCheckpointFile,
                            optimizerRequest.Parameters
                        );
                        break;
                    case "BA":
                        optimizer = new BaOptimizer(
                            optimizerRequest.PopulationSize,
                            optimizerRequest.Dimensions,
                            optimizerRequest.Iterations,
                            function,
                            optimizerRequest.LowerBound,
                            optimizerRequest.UpperBound,
                            trialCheckpointFile,
                            optimizerRequest.Parameters
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
                            trialCheckpointFile,
                            optimizerRequest.Parameters
                        );
                        break;
                }

                try
                {
                    optimizer.Solve(ct);

                    List<IterationLog> historyLogs = new List<IterationLog>();
                    if (optimizer is GWOptimizer gwo) historyLogs = gwo.FullHistory;
                    else if (optimizer is AquilaOptimizer aquila) historyLogs = aquila.FullHistory;
                    else if (optimizer is SsaOptimizer ssa) historyLogs = ssa.FullHistory;
                    else if (optimizer is BaOptimizer ba) historyLogs = ba.FullHistory;
                    else if (optimizer is GaOptimizer ga) historyLogs = ga.FullHistory;
                    else if (optimizer is PsoOptimizer pso) historyLogs = pso.FullHistory;
                    else if (optimizer is BoaOptimizer boa) historyLogs = boa.FullHistory;

                    var trialResult = new TrialResult
                    {
                        TrialNumber = trialNum,
                        BestSolution = optimizer.XBest,
                        BestFitness = optimizer.FBest,
                        EvaluationsCount = optimizer.NumberOfEvaluationFitnessFunction,
                        HistoryLogs = historyLogs
                    };

                    trials.Add(trialResult);

                    Console.WriteLine($"[MultiTrial] Próba {trialNum} zakończona. Fitness: {optimizer.FBest:E6}");

                    // Save multi-trial checkpoint after each completed trial
                    var multiTrialCheckpointData = new MultiTrialCheckpointData
                    {
                        RunId = runId,
                        AlgorithmName = optimizerRequest.Algorithm,
                        FunctionName = function.ToString(),
                        TotalTrials = optimizerRequest.Trials,
                        CompletedTrials = trialNum,
                        CompletedTrialResults = trials,
                        PopulationSize = optimizerRequest.PopulationSize,
                        Dimensions = optimizerRequest.Dimensions,
                        Iterations = optimizerRequest.Iterations,
                        LowerBound = optimizerRequest.LowerBound,
                        UpperBound = optimizerRequest.UpperBound,
                        Parameters = optimizerRequest.Parameters
                    };

                    CheckpointService.SaveMultiTrialCheckpoint(multiTrialCheckpointFile, multiTrialCheckpointData);

                    // Clean up individual trial checkpoint after successful completion
                    CheckpointService.ClearCheckpoint(trialCheckpointFile);
                }
                catch (OperationCanceledException)
                {
                    // User cancelled - keep both checkpoints for resumption
                    Console.WriteLine($"[MultiTrial] Próba {trialNum} anulowana. Checkpointy zachowane.");
                    throw; // Re-throw to outer handler
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[MultiTrial] Błąd w próbie {trialNum}: {ex.Message}");
                    // Keep multi-trial checkpoint but clean up failed trial
                    CheckpointService.ClearCheckpoint(trialCheckpointFile);
                    throw;
                }
            }

            // Wszystkie próby zakończone powodzeniem
            Console.WriteLine($"[MultiTrial] Wszystkie {optimizerRequest.Trials} prób zakończone pomyślnie!");

            var stats = StatisticsService.CalculateStats(trials);

            Console.WriteLine(StatisticsService.FormatStats(stats, optimizerRequest.Algorithm, function.ToString()));

            // W razie potrzeby generujemy raport
            if (optimizerRequest.GenerateReport)
            {
                var reportingSystem = new RaportingSystem();
                reportingSystem.GenerateMultiTrialReport(
                    optimizerRequest.Algorithm,
                    function,
                    stats,
                    optimizerRequest.Iterations,
                    optimizerRequest.PopulationSize,
                    optimizerRequest.Dimensions,
                    optimizerRequest.LowerBound,
                    optimizerRequest.UpperBound,
                    optimizerRequest.Parameters
                );
            }

            CheckpointService.ClearCheckpoint(multiTrialCheckpointFile);

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
    try
    {
        var currentDir = Directory.GetCurrentDirectory();
        Console.WriteLine($"[Checkpoints] Searching in: {currentDir}");

        var activeSessions = new List<object>();

        // pobieramy wszystkie pliki checkpointów (trials=1 lub indywidualne checkpointy w trakcie multitrial testu)
        // zaczynające się od "chckpnt_" i kończące na ".json"
        var singleRunFiles = Directory.GetFiles(currentDir, "chckpnt_*.json")
            .Where(f => !Path.GetFileName(f).StartsWith("chckpnt_multitrial_"))
            .ToArray();

        Console.WriteLine($"[Checkpoints] Found {singleRunFiles.Length} single-run checkpoint files");

        foreach (var file in singleRunFiles)
        {
            try
            {
                var content = File.ReadAllText(file);
                var checkpointData = JsonSerializer.Deserialize<CheckpointData>(content);

                string fileName = Path.GetFileNameWithoutExtension(file);

                // Extract RunId and trial number if present
                // Format: chckpnt_gwo_trial5_runId OR chckpnt_gwo_state_runId
                var parts = fileName.Split('_');
                string runId = parts.Last();
                string checkpointType = "Single Run";
                int? trialNumber = null;

                // Check if this is a trial checkpoint
                if (parts.Length > 3 && parts[^2].StartsWith("trial"))
                {
                    checkpointType = "Multi-Trial (Individual Trial)";
                    string trialStr = parts[^2].Replace("trial", "");
                    if (int.TryParse(trialStr, out int trial))
                    {
                        trialNumber = trial;
                    }
                }

                var session = new
                {
                    RunId = runId,
                    Type = checkpointType,
                    TrialNumber = trialNumber,
                    Algorithm = checkpointData.AlgorithmName,
                    Function = checkpointData.FunctionName,
                    PopulationSize = checkpointData.PopulationSize,
                    Dimensions = checkpointData.Dimensions,
                    CurrentIteration = checkpointData.CurrentIteration,
                    TotalIterations = checkpointData.PopulationSize > 0 ?
                        (checkpointData.HistoryLogs?.Count ?? 0) : 0,
                    GlobalBestFitness = checkpointData.GlobalBestFitness,
                    EvaluationsCount = checkpointData.EvaluationsCount,
                    LastUpdated = File.GetLastWriteTime(file),
                    CanResume = true
                };

                activeSessions.Add(session);
                Console.WriteLine($"[Checkpoints] Processed: {checkpointType} - {checkpointData.AlgorithmName} (RunId: {runId})");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Checkpoints] Error processing {Path.GetFileName(file)}: {ex.Message}");
                continue;
            }
        }
        // 2. Get multi-trial master checkpoints
        var multiTrialFiles = Directory.GetFiles(currentDir, "chckpnt_multitrial_*.json");
        Console.WriteLine($"[Checkpoints] Found {multiTrialFiles.Length} multi-trial checkpoint files");

        foreach (var file in multiTrialFiles)
        {
            try
            {
                var content = File.ReadAllText(file);
                var checkpointData = JsonSerializer.Deserialize<MultiTrialCheckpointData>(content);

                double? bestFitnessSoFar = checkpointData.CompletedTrialResults?.Any() == true
                    ? checkpointData.CompletedTrialResults.Min(t => t.BestFitness)
                    : null;

                var session = new
                {
                    RunId = checkpointData.RunId,
                    Type = "Multi-Trial (Master)",
                    TrialNumber = (int?)null,
                    Algorithm = checkpointData.AlgorithmName,
                    Function = checkpointData.FunctionName,
                    PopulationSize = checkpointData.PopulationSize,
                    Dimensions = checkpointData.Dimensions,
                    CurrentIteration = checkpointData.Iterations, // Total iterations per trial
                    CompletedTrials = checkpointData.CompletedTrials,
                    TotalTrials = checkpointData.TotalTrials,
                    Progress = $"{checkpointData.CompletedTrials}/{checkpointData.TotalTrials}",
                    BestFitnessSoFar = bestFitnessSoFar,
                    LastUpdated = checkpointData.LastUpdated,
                    CanResume = checkpointData.CompletedTrials < checkpointData.TotalTrials
                };

                activeSessions.Add(session);
                Console.WriteLine($"[Checkpoints] Processed: Multi-Trial Master - {checkpointData.AlgorithmName} ({checkpointData.CompletedTrials}/{checkpointData.TotalTrials})");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Checkpoints] Error processing {Path.GetFileName(file)}: {ex.Message}");
                continue;
            }
        }

        Console.WriteLine($"[Checkpoints] Returning {activeSessions.Count} total sessions");
        return Results.Ok(activeSessions);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[Checkpoints] Critical error: {ex.Message}");
        return Results.Problem($"Error fetching checkpoints: {ex.Message}");
    }
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

// ENDPOINT - usuwanie checkpointu/checkpointów z odpowiednim 'runId'
app.MapDelete("/api/optimizer/checkpoint/{runId}", (string runId) =>
{
    try
    {
        int deletedCount = 0;

        // 1. Delete single-run checkpoints
        string singleRunPattern = $"chckpnt_*_{runId}.json";
        var singleRunFiles = Directory.GetFiles(Directory.GetCurrentDirectory(), singleRunPattern)
            .Where(f => !Path.GetFileName(f).Contains("multitrial"))
            .ToArray();

        foreach (var file in singleRunFiles)
        {
            File.Delete(file);
            deletedCount++;
            Console.WriteLine($"[Delete] Removed: {Path.GetFileName(file)}");
        }

        // 2. Delete multi-trial master checkpoint
        string multiTrialPattern = $"chckpnt_multitrial_*_{runId}.json";
        var multiTrialFiles = Directory.GetFiles(Directory.GetCurrentDirectory(), multiTrialPattern);

        foreach (var file in multiTrialFiles)
        {
            File.Delete(file);
            deletedCount++;
            Console.WriteLine($"[Delete] Removed: {Path.GetFileName(file)}");
        }

        // 3. Delete individual trial checkpoints (pattern: chckpnt_algo_trial#_runId.json)
        var allCheckpoints = Directory.GetFiles(Directory.GetCurrentDirectory(), "chckpnt_*.json");
        var trialCheckpoints = allCheckpoints.Where(f =>
        {
            string fileName = Path.GetFileNameWithoutExtension(f);
            return fileName.EndsWith(runId) && fileName.Contains("_trial");
        }).ToArray();

        foreach (var file in trialCheckpoints)
        {
            File.Delete(file);
            deletedCount++;
            Console.WriteLine($"[Delete] Removed trial checkpoint: {Path.GetFileName(file)}");
        }

        if (deletedCount == 0)
        {
            return Results.NotFound(new { Message = $"No checkpoints found for RunId: {runId}" });
        }

        Console.WriteLine($"[Delete] Deleted {deletedCount} checkpoint file(s) for RunId: {runId}");
        return Results.Ok(new
        {
            Message = $"Deleted {deletedCount} checkpoint file(s) successfully.",
            DeletedCount = deletedCount
        });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[Delete] Error deleting checkpoint: {ex.Message}");
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
    public bool GenerateReport { get; set; } = false; // czy generować raport po zakończeniu

    // Przechowuje określone parametry, np {"c1": 1.5, "w": 0.7}
    public Dictionary<string, double>? Parameters { get; set; }
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
            "Transformer" => new TransformerFunc(),
            _ => new Rastrigin()
        };
    }
}