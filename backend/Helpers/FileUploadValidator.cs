using System;
using System.IO;
using Microsoft.AspNetCore.Http;

namespace LaptopTracking.Api.Helpers;

/// <summary>
/// Validates uploaded spreadsheet files (.xlsx, .xls, .csv) for extension and file header magic bytes.
/// </summary>
public static class FileUploadValidator
{
    public static (bool IsValid, string? ErrorMessage) Validate(IFormFile? file)
    {
        if (file == null || file.Length == 0)
        {
            return (false, "Please select an Excel (.xlsx, .xls) or CSV (.csv) file to upload.");
        }

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext != ".xlsx" && ext != ".xls" && ext != ".csv")
        {
            return (false, "Invalid file format. Only Excel (.xlsx, .xls) or CSV (.csv) files are allowed.");
        }

        try
        {
            using var stream = file.OpenReadStream();
            byte[] header = new byte[8];
            int bytesRead = stream.Read(header, 0, Math.Min(8, (int)file.Length));
            if (bytesRead >= 4)
            {
                if (ext == ".xlsx")
                {
                    // ZIP / OpenXML magic bytes: PK (0x50, 0x4B)
                    if (header[0] != 0x50 || header[1] != 0x4B)
                    {
                        return (false, "Invalid Excel file content. File does not match .xlsx signature.");
                    }
                }
                else if (ext == ".xls")
                {
                    // Compound File Binary Format magic bytes (0xD0, 0xCF)
                    if (header[0] != 0xD0 || header[1] != 0xCF)
                    {
                        return (false, "Invalid Excel file content. File does not match .xls signature.");
                    }
                }
                else if (ext == ".csv")
                {
                    // Plain text CSV: reject null byte binary files
                    for (int i = 0; i < bytesRead; i++)
                    {
                        if (header[i] == 0x00)
                        {
                            return (false, "Invalid CSV file content. Binary data detected.");
                        }
                    }
                }
            }
        }
        catch
        {
            // Fallback to extension check if stream read fails
        }

        return (true, null);
    }
}
