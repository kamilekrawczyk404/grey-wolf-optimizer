using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using GrayWolf.Model;
using System.Text.Json;

namespace GrayWolf.Services
{
    public static class CheckpointService
    {
        private static readonly JsonSerializerOptions _jsonOptions = new JsonSerializerOptions
        {
            WriteIndented = true
        };

        public static void SaveCheckpoint(string fileName, CheckpointData checkpointData)
        {
            try
            {
                string jsonData = JsonSerializer.Serialize(checkpointData, _jsonOptions);
                File.WriteAllText(fileName, jsonData);
            }
            catch (Exception ex)
            {
                // TO-DO: Handle exceptions (e.g., log the error)
                Console.WriteLine($"Error saving checkpoint: {ex.Message}");
            }
        }

        public static CheckpointData LoadCheckpoint(string fileName)
        {
            if (!File.Exists(fileName)) return null;
            try
            {
                string jsonData = File.ReadAllText(fileName);
                CheckpointData checkpointData = JsonSerializer.Deserialize<CheckpointData>(jsonData, _jsonOptions);
                return checkpointData;
            }
            catch (Exception ex)
            {
                // TO-DO: Handle exceptions (e.g., log the error)
                Console.WriteLine($"Error loading checkpoint: {ex.Message}");
                return null;
            }
        }

        public static void SaveMultiTrialCheckpoint(string fileName, MultiTrialCheckpointData checkpointData)
        {
            try
            {
                checkpointData.LastUpdated = DateTime.Now;
                string jsonData = JsonSerializer.Serialize(checkpointData, _jsonOptions);
                File.WriteAllText(fileName, jsonData);
                Console.WriteLine($"[MultiTrial Checkpoint] Saved: {checkpointData.CompletedTrials}/{checkpointData.TotalTrials} trials completed");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error saving multi-trial checkpoint: {ex.Message}");
            }
        }

        public static MultiTrialCheckpointData LoadMultiTrialCheckpoint(string fileName)
        {
            if (!File.Exists(fileName)) return null;

            try
            {
                string jsonData = File.ReadAllText(fileName);
                MultiTrialCheckpointData checkpointData = JsonSerializer.Deserialize<MultiTrialCheckpointData>(jsonData, _jsonOptions);
                Console.WriteLine($"[MultiTrial Checkpoint] Loaded: {checkpointData.CompletedTrials}/{checkpointData.TotalTrials} trials already completed");
                return checkpointData;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading multi-trial checkpoint: {ex.Message}");
                return null;
            }
        }

        public static bool ValidateMultiTrialCheckpoint(MultiTrialCheckpointData checkpoint, OptimizerRequest request, string algorithmName, string functionName)
        {
            if (checkpoint == null) return false;

            bool isValid = checkpoint.AlgorithmName == algorithmName &&
                   checkpoint.FunctionName == functionName &&
                   checkpoint.PopulationSize == request.PopulationSize &&
                   checkpoint.Dimensions == request.Dimensions &&
                   checkpoint.Iterations == request.Iterations &&
                   Math.Abs(checkpoint.LowerBound - request.LowerBound) < 0.0001 &&
                   Math.Abs(checkpoint.UpperBound - request.UpperBound) < 0.0001 &&
                   checkpoint.TotalTrials == request.Trials;

            if (!isValid)
            {
                Console.WriteLine("[MultiTrial Checkpoint] Validation failed - configuration mismatch");
            }

            return isValid;
        }

        public static void ClearCheckpoint(string fileName)
        {
            try
            {
                if (File.Exists(fileName))
                {
                    File.Delete(fileName);
                }
            }
            catch (Exception ex)
            {
                // TO-DO: Handle exceptions (e.g., log the error)
                Console.WriteLine($"Error clearing checkpoint: {ex.Message}");
            }
        }
    }
}
