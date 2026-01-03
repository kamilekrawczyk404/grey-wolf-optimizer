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
