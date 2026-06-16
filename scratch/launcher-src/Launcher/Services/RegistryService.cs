using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;

namespace SeapowerMultiplayer.Launcher.Services
{
    public sealed class RegistryService
    {
        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNameCaseInsensitive = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        };

        private static readonly HttpClient Http = new()
        {
            Timeout = TimeSpan.FromSeconds(12),
            DefaultRequestHeaders =
            {
                { "User-Agent", "SeapowerMultiplayerLauncher" }
            }
        };

        public async Task<IReadOnlyList<RegistryServer>> GetServersAsync(string registryUrl, CancellationToken cancellationToken = default)
        {
            var response = await Http.GetFromJsonAsync<RegistryServerListResponse>(
                $"{NormalizeBaseUrl(registryUrl)}/api/servers", JsonOptions, cancellationToken);
            return response?.Servers ?? new List<RegistryServer>();
        }

        public async Task<RegistryServer?> GetServerAsync(string registryUrl, string serverId, CancellationToken cancellationToken = default)
        {
            var response = await Http.GetFromJsonAsync<RegistryServerDetailResponse>(
                $"{NormalizeBaseUrl(registryUrl)}/api/servers/{Uri.EscapeDataString(serverId)}",
                JsonOptions,
                cancellationToken);
            return response?.Server;
        }

        public async Task<RegistryHeartbeatResponse> SendHeartbeatAsync(LauncherSettings settings, CancellationToken cancellationToken = default)
        {
            var payload = BuildHeartbeatPayload(settings);
            using var response = await Http.PostAsJsonAsync(
                $"{NormalizeBaseUrl(settings.RegistryUrl)}/api/servers/heartbeat",
                payload,
                JsonOptions,
                cancellationToken);

            response.EnsureSuccessStatusCode();
            return await response.Content.ReadFromJsonAsync<RegistryHeartbeatResponse>(JsonOptions, cancellationToken)
                   ?? new RegistryHeartbeatResponse();
        }

        public async Task StopServerAsync(LauncherSettings settings, string serverId, CancellationToken cancellationToken = default)
        {
            var payload = BuildHeartbeatPayload(settings);
            using var response = await Http.PostAsJsonAsync(
                $"{NormalizeBaseUrl(settings.RegistryUrl)}/api/servers/{Uri.EscapeDataString(serverId)}/stop",
                payload,
                JsonOptions,
                cancellationToken);
            response.EnsureSuccessStatusCode();
        }

        public static string NormalizeBaseUrl(string registryUrl)
        {
            var value = string.IsNullOrWhiteSpace(registryUrl)
                ? "https://spdash-production.up.railway.app"
                : registryUrl.Trim();
            return value.TrimEnd('/');
        }

        public static List<RegistryModInfo> ParseRequiredMods(string raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return new List<RegistryModInfo>();

            return raw
                .Split(new[] { '\r', '\n', ';' }, StringSplitOptions.RemoveEmptyEntries)
                .Select(ParseRequiredMod)
                .Where(mod => !string.IsNullOrWhiteSpace(mod.Name) || !string.IsNullOrWhiteSpace(mod.WorkshopId))
                .Take(80)
                .ToList();
        }

        private static RegistryModInfo ParseRequiredMod(string line)
        {
            var value = line.Trim();
            var parts = value.Split('|', 2, StringSplitOptions.TrimEntries);
            if (parts.Length == 2)
            {
                return new RegistryModInfo
                {
                    Name = parts[0],
                    WorkshopId = parts[1],
                    Required = true
                };
            }

            return new RegistryModInfo
            {
                Name = value,
                Required = true
            };
        }

        public static RegistrySessionInfo CreateClientSession(string registryUrl, RegistryServer server, string launcherStatus)
        {
            return new RegistrySessionInfo
            {
                RegistryUrl = NormalizeBaseUrl(registryUrl),
                ServerId = server.Id,
                ServerName = server.Name,
                LauncherStatus = launcherStatus,
                VerificationStatus = server.Status,
                Visibility = server.Visibility,
                Mode = server.Mode,
                Transport = server.Transport,
                PublicIp = server.PublicIp,
                Port = server.Port,
                PluginVersion = server.PluginVersion,
                GameVersion = server.GameVersion,
                ScenarioName = server.ScenarioName,
                ScenarioHash = server.ScenarioHash,
                IsPublicListed = server.Visibility == "public",
                RequiredMods = server.RequiredMods ?? new List<RegistryModInfo>(),
                MissingMods = new List<string>()
            };
        }

        public static RegistrySessionInfo CreateHostSession(LauncherSettings settings, string serverId, string status)
        {
            return new RegistrySessionInfo
            {
                RegistryUrl = NormalizeBaseUrl(settings.RegistryUrl),
                ServerId = serverId,
                ServerName = settings.ServerName,
                LauncherStatus = "Hosting",
                VerificationStatus = status,
                Visibility = "public",
                Mode = settings.PvP ? "pvp" : "coop",
                Transport = settings.Transport,
                PublicIp = settings.PublicIp,
                Port = settings.Port,
                PluginVersion = LauncherVersions.PluginVersion,
                GameVersion = "unknown",
                ScenarioName = settings.ScenarioName,
                ScenarioHash = settings.ScenarioHash,
                IsPublicListed = true,
                RequiredMods = ParseRequiredMods(settings.RequiredModsRaw),
                MissingMods = new List<string>()
            };
        }

        private static object BuildHeartbeatPayload(LauncherSettings settings)
        {
            return new
            {
                hostKey = settings.HostKey,
                name = string.IsNullOrWhiteSpace(settings.ServerName) ? "Sea Power Fleet" : settings.ServerName.Trim(),
                publicIp = settings.PublicIp?.Trim() ?? "",
                port = settings.Port,
                mode = settings.PvP ? "pvp" : "coop",
                transport = settings.Transport == "Steam" ? "Steam" : "LiteNetLib",
                pluginVersion = LauncherVersions.PluginVersion,
                gameVersion = "unknown",
                scenarioName = settings.ScenarioName?.Trim() ?? "",
                scenarioHash = settings.ScenarioHash?.Trim() ?? "",
                requiredMods = ParseRequiredMods(settings.RequiredModsRaw),
                visibility = "public",
                region = settings.Region?.Trim() ?? "",
                playerCount = Math.Clamp(settings.PlayerCount, 0, 32),
                maxPlayers = Math.Clamp(settings.MaxPlayers, 1, 32)
            };
        }
    }

    public static class LauncherVersions
    {
        public const string LauncherVersion = "0.4.0";
        public const string PluginVersion = "0.3.0";
    }

    public sealed class RegistryServerListResponse
    {
        public int TtlSeconds { get; set; }
        public List<RegistryServer> Servers { get; set; } = new();
    }

    public sealed class RegistryServerDetailResponse
    {
        public RegistryServer? Server { get; set; }
    }

    public sealed class RegistryHeartbeatResponse
    {
        public bool Ok { get; set; }
        public string ServerId { get; set; } = "";
        public string Status { get; set; } = "";
        public DateTimeOffset? LastSeen { get; set; }
    }

    public sealed class RegistryServer
    {
        public string Id { get; set; } = "";
        public string Name { get; set; } = "";
        public string Visibility { get; set; } = "";
        public string Mode { get; set; } = "";
        public string Transport { get; set; } = "";
        public string PublicIp { get; set; } = "";
        public int Port { get; set; }
        public string PluginVersion { get; set; } = "";
        public string GameVersion { get; set; } = "";
        public string ScenarioName { get; set; } = "";
        public string ScenarioHash { get; set; } = "";
        public List<RegistryModInfo>? RequiredMods { get; set; }
        public string Region { get; set; } = "";
        public int PlayerCount { get; set; }
        public int MaxPlayers { get; set; }
        public string Status { get; set; } = "";
        public DateTimeOffset? LastSeen { get; set; }

        [JsonIgnore]
        public string DisplayName
        {
            get
            {
                var players = MaxPlayers > 0 ? $"{PlayerCount}/{MaxPlayers}" : $"{PlayerCount}/?";
                var scenario = string.IsNullOrWhiteSpace(ScenarioName) ? "No scenario" : ScenarioName;
                return $"{Name}  |  {players}  |  {Mode}/{Transport}  |  {scenario}";
            }
        }
    }

    public sealed class RegistryModInfo
    {
        public string Name { get; set; } = "";
        public string? WorkshopId { get; set; }
        public bool Required { get; set; } = true;
        public string? Version { get; set; }
        public string? Hash { get; set; }
    }

    public sealed class RegistrySessionInfo
    {
        public string RegistryUrl { get; set; } = "";
        public string ServerId { get; set; } = "";
        public string ServerName { get; set; } = "";
        public string LauncherStatus { get; set; } = "";
        public string VerificationStatus { get; set; } = "";
        public string Visibility { get; set; } = "";
        public string Mode { get; set; } = "";
        public string Transport { get; set; } = "";
        public string PublicIp { get; set; } = "";
        public int Port { get; set; }
        public string PluginVersion { get; set; } = "";
        public string GameVersion { get; set; } = "";
        public string ScenarioName { get; set; } = "";
        public string ScenarioHash { get; set; } = "";
        public bool IsPublicListed { get; set; }
        public List<RegistryModInfo> RequiredMods { get; set; } = new();
        public List<string> MissingMods { get; set; } = new();
    }
}
