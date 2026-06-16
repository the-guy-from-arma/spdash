using System;
using Microsoft.Win32;

namespace SeapowerMultiplayer.Launcher.Services
{
    public static class ProtocolRegistrar
    {
        internal const string Scheme = "seapowermp";

        public static void Register()
        {
            var exePath = Environment.ProcessPath;
            if (string.IsNullOrWhiteSpace(exePath)) return;

            using var key = Registry.CurrentUser.CreateSubKey($@"Software\Classes\{Scheme}");
            key.SetValue("", "URL:Sea Power Multiplayer");
            key.SetValue("URL Protocol", "");

            using var command = key.CreateSubKey(@"shell\open\command");
            command.SetValue("", $"\"{exePath}\" \"%1\"");
        }
    }

    public sealed class ProtocolConnectRequest
    {
        public string ServerId { get; init; } = "";
        public string RegistryUrl { get; init; } = "";

        public static ProtocolConnectRequest? TryParse(string value)
        {
            if (!Uri.TryCreate(value, UriKind.Absolute, out var uri)) return null;
            if (!uri.Scheme.Equals(ProtocolRegistrar.Scheme, StringComparison.OrdinalIgnoreCase)) return null;
            if (!uri.Host.Equals("connect", StringComparison.OrdinalIgnoreCase)) return null;

            var query = ParseQuery(uri.Query);
            if (!query.TryGetValue("serverId", out var serverId) || string.IsNullOrWhiteSpace(serverId))
                return null;

            query.TryGetValue("registry", out var registryUrl);
            return new ProtocolConnectRequest
            {
                ServerId = serverId,
                RegistryUrl = registryUrl ?? ""
            };
        }

        private static System.Collections.Generic.Dictionary<string, string> ParseQuery(string query)
        {
            var result = new System.Collections.Generic.Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            var trimmed = query.TrimStart('?');
            if (string.IsNullOrWhiteSpace(trimmed)) return result;

            foreach (var part in trimmed.Split('&', StringSplitOptions.RemoveEmptyEntries))
            {
                var pieces = part.Split('=', 2);
                var key = Uri.UnescapeDataString(pieces[0]);
                var value = pieces.Length == 2 ? Uri.UnescapeDataString(pieces[1]) : "";
                result[key] = value;
            }

            return result;
        }
    }
}
