using System;
using System.IO;
using Microsoft.AspNetCore.Http;

namespace LaptopTracking.Api.Helpers;

/// <summary>
/// Validates uploaded Excel (.xlsx) files.
/// </summary>
public static class FileUploadValidator
{
    public static (bool IsValid, string? ErrorMessage) Validate(IFormFile? file)
    {
        if (file == null || file.Length == 0)
        {
            return (false, "Please select a valid Excel (.xlsx) file to upload.");
        }

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext != ".xlsx")
        {
            return (false, "Invalid file format. Only Excel (.xlsx) files are allowed.");
        }

        try
        {
            using var stream = file.OpenReadStream();
            byte[] header = new byte[8];
            int bytesRead = stream.Read(header, 0, Math.Min(8, (int)file.Length));
            if (bytesRead >= 4)
            {
                if (header[0] != 0x50 || header[1] != 0x4B)
                {
                    return (false, "Invalid Excel file content. File does not match .xlsx signature.");
                }
            }
        }
        catch
        {
            // Fallback to extension check if stream read fails
            //here we write a catch statement for File Exception handling also:
            // CSV Helper, Stream Reader
        }

        return (true, null);
    }
}
