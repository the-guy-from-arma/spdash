using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;

namespace SeapowerMultiplayer.Launcher.Services
{
    public class LauncherSettings
    {
        public string? GameDirectory { get; set; }
        public string Transport { get; set; } = "Steam";
        public bool IsHost { get; set; } = true;
        public string HostIP { get; set; } = "0.0.0.0";
        public int Port { get; set; } = 7777;
        public bool AutoConnect { get; set; } = false;
        public bool TimeVote { get; set; } = false;
        public bool PvP { get; set; } = false;
        public int MissileStateHz { get; set; } = 20;
        public int UnitStateHz { get; set; } = 10;
        public string? AcknowledgedVersion { get; set; }
        public string RegistryUrl { get; set; } = "https://tb-studios.up.railway.app";
        public string HostKey { get; set; } = Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N");
        public string ServerName { get; set; } = "Sea Power Fleet";
        public string PublicIp { get; set; } = "";
        public string ScenarioName { get; set; } = "";
        public string ScenarioHash { get; set; } = "";
        public string RequiredModsRaw { get; set; } = "";
        public string Region { get; set; } = "";
        public int PlayerCount { get; set; } = 1;
        public int MaxPlayers { get; set; } = 4;
        public string? LastRegistryServerId { get; set; }
    }

    public class ConfigManager
    {
        private static readonly string ConfigDir =
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                         "SeapowerMultiplayer");

        private static readonly string ConfigPath =
            Path.Combine(ConfigDir, "launcher.json");

        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            WriteIndented = true,
        };

        public LauncherSettings Settings { get; private set; } = new();

        public void Load()
        {
            try
            {
                if (File.Exists(ConfigPath))
                {
                    var json = File.ReadAllText(ConfigPath);
                    Settings = JsonSerializer.Deserialize<LauncherSettings>(json, JsonOptions)
                               ?? new LauncherSettings();
                }
                EnsureDefaults();
            }
            catch
            {
                Settings = new LauncherSettings();
                EnsureDefaults();
            }
        }

        private void EnsureDefaults()
        {
            if (string.IsNullOrWhiteSpace(Settings.HostKey) || Settings.HostKey.Length < 24)
                Settings.HostKey = Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N");
            if (string.IsNullOrWhiteSpace(Settings.RegistryUrl))
                Settings.RegistryUrl = "https://tb-studios.up.railway.app";
            if (string.IsNullOrWhiteSpace(Settings.ServerName))
                Settings.ServerName = "Sea Power Fleet";
            if (Settings.MaxPlayers < 1)
                Settings.MaxPlayers = 4;
        }

        public void Save()
        {
            Directory.CreateDirectory(ConfigDir);
            var json = JsonSerializer.Serialize(Settings, JsonOptions);
            File.WriteAllText(ConfigPath, json);
        }

        /// <summary>
        /// Write the BepInEx config file that the mod reads on startup.
        /// Uses the exact INI format BepInEx expects.
        /// </summary>
        public static void WriteBepInExConfig(string gameDir, LauncherSettings settings)
        {
            var configDir = Path.Combine(gameDir, "BepInEx", "config");
            Directory.CreateDirectory(configDir);

            var configPath = Path.Combine(configDir, "com.seapowermultiplayer.plugin.cfg");
            var content = $"""
                [Network]

                ## Network transport: LiteNetLib (direct IP) or Steam (P2P with invites)
                # Setting type: String
                # Default value: LiteNetLib
                Transport = {settings.Transport}

                ## Are you the host?
                # Setting type: Boolean
                # Default value: true
                IsHost = {settings.IsHost.ToString().ToLower()}

                ## Host IP address to connect to (client only)
                # Setting type: String
                # Default value: 127.0.0.1
                HostIP = {settings.HostIP}

                ## Network port
                # Setting type: Int32
                # Default value: 7777
                Port = {settings.Port}

                ## PvP mode: players control opposing sides
                # Setting type: Boolean
                # Default value: false
                PvP = {settings.PvP.ToString().ToLower()}

                ## Automatically connect on game start
                # Setting type: Boolean
                # Default value: false
                AutoConnect = {settings.AutoConnect.ToString().ToLower()}

                ## Time vote mode: both players must agree on time compression changes
                # Setting type: Boolean
                # Default value: false
                TimeVote = {settings.TimeVote.ToString().ToLower()}

                [Sync]

                ## Host missile state stream rate in Hz (1-60, default 20)
                # Setting type: Int32
                # Default value: 20
                MissileStateHz = {settings.MissileStateHz}

                ## Host unit/torpedo state stream rate in Hz (1-60, default 10)
                # Setting type: Int32
                # Default value: 10
                UnitStateHz = {settings.UnitStateHz}

                """;

            File.WriteAllText(configPath, content);
        }

        public static void WriteRegistrySession(string gameDir, RegistrySessionInfo session)
        {
            var configDir = Path.Combine(gameDir, "BepInEx", "config");
            Directory.CreateDirectory(configDir);

            var configPath = Path.Combine(configDir, "seapower-mp-registry-session.json");
            var options = new JsonSerializerOptions
            {
                WriteIndented = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };
            File.WriteAllText(configPath, JsonSerializer.Serialize(session, options));
        }
    }
}
