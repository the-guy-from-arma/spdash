using System;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using SeapowerMultiplayer.Launcher.Services;

namespace SeapowerMultiplayer.Launcher
{
    public partial class MainWindow : Window
    {
        private const string CurrentVersion = LauncherVersions.LauncherVersion;

        private readonly ConfigManager _config = new();
        private readonly RegistryService _registry = new();
        private bool _gameRunning;
        private UpdateInfo? _pendingUpdate;
        private string _lastIP = "0.0.0.0";
        private RegistryServer? _selectedServer;
        private string? _activeHostServerId;
        private CancellationTokenSource? _heartbeatCts;
        private Task? _heartbeatTask;

        public MainWindow()
        {
            InitializeComponent();
            TxtVersion.Text = $"v{CurrentVersion}";
            Loaded += OnLoaded;
            Closed += (_, _) => _ = StopHostListingAsync();
        }

        private async void OnLoaded(object sender, RoutedEventArgs e)
        {
            _config.Load();
            ApplyConfigToUI();

            try
            {
                ProtocolRegistrar.Register();
            }
            catch (Exception ex)
            {
                TxtStatus.Text = $"Protocol registration skipped: {ex.Message}";
            }

            if (string.IsNullOrEmpty(_config.Settings.GameDirectory) ||
                !GameDetector.IsValidGameDir(_config.Settings.GameDirectory))
            {
                var detected = GameDetector.AutoDetect();
                if (detected != null)
                {
                    _config.Settings.GameDirectory = detected;
                    _config.Save();
                }
            }

            TxtGamePath.Text = _config.Settings.GameDirectory ?? "";

            if (!string.IsNullOrEmpty(_config.Settings.GameDirectory))
                GameLauncher.CleanupProxy(_config.Settings.GameDirectory);

            UpdateInstallStatus();

            if (Environment.GetCommandLineArgs().Contains("--post-update"))
                _ = PostUpdateRepairAsync();

            _ = CheckForUpdateAsync();
            await RefreshServersAsync(false);
            await HandleProtocolLaunchAsync();
        }

        private async Task HandleProtocolLaunchAsync()
        {
            foreach (var arg in Environment.GetCommandLineArgs())
            {
                var request = ProtocolConnectRequest.TryParse(arg);
                if (request == null) continue;

                if (!string.IsNullOrWhiteSpace(request.RegistryUrl))
                    TxtRegistryUrl.Text = request.RegistryUrl;

                SaveUIToConfig();
                TxtStatus.Text = "Opening server from browser link...";

                try
                {
                    var server = await _registry.GetServerAsync(_config.Settings.RegistryUrl, request.ServerId);
                    if (server == null)
                    {
                        TxtStatus.Text = "Server is not active or has not been verified.";
                        return;
                    }

                    await ConnectToServerAsync(server);
                }
                catch (Exception ex)
                {
                    TxtStatus.Text = $"Browser connect failed: {ex.Message}";
                }

                return;
            }
        }

        private async Task PostUpdateRepairAsync()
        {
            var gameDir = _config.Settings.GameDirectory;
            if (string.IsNullOrEmpty(gameDir) || !GameDetector.IsValidGameDir(gameDir))
                return;

            var progress = new Progress<string>(msg => TxtStatus.Text = msg);
            try
            {
                await Installer.RepairAsync(gameDir, progress);
                TxtStatus.Text = "Update applied - mod reinstalled!";
                UpdateInstallStatus();
            }
            catch (Exception ex)
            {
                TxtStatus.Text = $"Post-update repair failed: {ex.Message}";
            }
        }

        private async Task CheckForUpdateAsync()
        {
            var update = await UpdateService.CheckForUpdateAsync(CurrentVersion);
            if (update != null)
            {
                _pendingUpdate = update;
                TxtUpdateInfo.Text = $"Update available: v{update.Version}";
                PnlUpdate.Visibility = Visibility.Visible;
            }
        }

        private async void BtnUpdate_Click(object sender, RoutedEventArgs e)
        {
            if (_pendingUpdate == null) return;
            SetControlsEnabled(false);
            BtnUpdate.IsEnabled = false;
            var progress = new Progress<string>(msg => TxtStatus.Text = msg);
            try
            {
                await UpdateService.ApplyUpdateAsync(_pendingUpdate, progress);
            }
            catch (Exception ex)
            {
                TxtStatus.Text = $"Update failed: {ex.Message}";
                SetControlsEnabled(true);
                BtnUpdate.IsEnabled = true;
            }
        }

        private void ApplyConfigToUI()
        {
            bool isSteam = _config.Settings.Transport == "Steam";
            RbSteam.IsChecked = isSteam;
            RbDirectIP.IsChecked = !isSteam;
            PnlDirectIP.Visibility = isSteam ? Visibility.Collapsed : Visibility.Visible;

            RbHost.IsChecked = _config.Settings.IsHost;
            RbClient.IsChecked = !_config.Settings.IsHost;
            TxtHostIP.Text = _config.Settings.HostIP;
            TxtPort.Text = _config.Settings.Port.ToString();
            ChkAutoConnect.IsChecked = _config.Settings.AutoConnect;
            ChkTimeVote.IsChecked = _config.Settings.TimeVote;
            ChkPvP.IsChecked = _config.Settings.PvP;
            TxtMissileHz.Text = _config.Settings.MissileStateHz.ToString();
            TxtUnitHz.Text = _config.Settings.UnitStateHz.ToString();
            TxtHostIP.IsEnabled = !_config.Settings.IsHost;

            TxtRegistryUrl.Text = _config.Settings.RegistryUrl;
            TxtServerName.Text = _config.Settings.ServerName;
            TxtPublicIp.Text = _config.Settings.PublicIp;
            TxtScenarioName.Text = _config.Settings.ScenarioName;
            TxtScenarioHash.Text = _config.Settings.ScenarioHash;
            TxtRequiredMods.Text = _config.Settings.RequiredModsRaw;
            TxtRegion.Text = _config.Settings.Region;
            TxtPlayerCount.Text = _config.Settings.PlayerCount.ToString();
            TxtMaxPlayers.Text = _config.Settings.MaxPlayers.ToString();
        }

        private void SaveUIToConfig()
        {
            _config.Settings.Transport = RbSteam.IsChecked == true ? "Steam" : "LiteNetLib";
            _config.Settings.IsHost = RbHost.IsChecked == true;
            _config.Settings.HostIP = TxtHostIP.Text.Trim();
            if (int.TryParse(TxtPort.Text.Trim(), out int port))
                _config.Settings.Port = port;
            _config.Settings.AutoConnect = ChkAutoConnect.IsChecked == true;
            _config.Settings.TimeVote = ChkTimeVote.IsChecked == true;
            _config.Settings.PvP = ChkPvP.IsChecked == true;
            if (int.TryParse(TxtMissileHz.Text.Trim(), out int missileHz))
                _config.Settings.MissileStateHz = Math.Clamp(missileHz, 1, 60);
            if (int.TryParse(TxtUnitHz.Text.Trim(), out int unitHz))
                _config.Settings.UnitStateHz = Math.Clamp(unitHz, 1, 60);

            _config.Settings.RegistryUrl = RegistryService.NormalizeBaseUrl(TxtRegistryUrl.Text);
            _config.Settings.ServerName = string.IsNullOrWhiteSpace(TxtServerName.Text)
                ? "Sea Power Fleet"
                : TxtServerName.Text.Trim();
            _config.Settings.PublicIp = TxtPublicIp.Text.Trim();
            _config.Settings.ScenarioName = TxtScenarioName.Text.Trim();
            _config.Settings.ScenarioHash = TxtScenarioHash.Text.Trim();
            _config.Settings.RequiredModsRaw = TxtRequiredMods.Text.Trim();
            _config.Settings.Region = TxtRegion.Text.Trim();
            _config.Settings.PlayerCount = ReadInt(TxtPlayerCount.Text, 1, 0, 32);
            _config.Settings.MaxPlayers = ReadInt(TxtMaxPlayers.Text, 4, 1, 32);
            _config.Save();
        }

        private static int ReadInt(string value, int fallback, int min, int max)
        {
            return int.TryParse(value.Trim(), out var parsed)
                ? Math.Clamp(parsed, min, max)
                : fallback;
        }

        private void UpdateInstallStatus()
        {
            var gameDir = TxtGamePath.Text;
            if (string.IsNullOrEmpty(gameDir) || !GameDetector.IsValidGameDir(gameDir))
            {
                StatusDot.Fill = FindResource("ErrorRed") as System.Windows.Media.SolidColorBrush;
                TxtInstallStatus.Text = "Game not found";
                BtnInstall.IsEnabled = false;
                BtnLaunch.IsEnabled = false;
                BtnHostPublic.IsEnabled = false;
                return;
            }

            BtnInstall.IsEnabled = true;

            bool bepinex = GameDetector.IsBepInExInstalled(gameDir);
            bool mod = GameDetector.IsModInstalled(gameDir);
            bool proxy = GameDetector.IsProxyStored(gameDir);

            if (bepinex && mod && proxy)
            {
                StatusDot.Fill = FindResource("SuccessGreen") as System.Windows.Media.SolidColorBrush;
                TxtInstallStatus.Text = "Installed";
                BtnInstall.Content = "Repair";
                BtnLaunch.IsEnabled = !_gameRunning;
                BtnHostPublic.IsEnabled = !_gameRunning;
            }
            else if (bepinex && !proxy)
            {
                StatusDot.Fill = FindResource("WarningOrange") as System.Windows.Media.SolidColorBrush;
                TxtInstallStatus.Text = "Needs repair (proxy not configured)";
                BtnInstall.Content = "Repair";
                BtnLaunch.IsEnabled = false;
                BtnHostPublic.IsEnabled = false;
            }
            else
            {
                StatusDot.Fill = FindResource("WarningOrange") as System.Windows.Media.SolidColorBrush;
                TxtInstallStatus.Text = "Not Installed";
                BtnInstall.Content = "Install";
                BtnLaunch.IsEnabled = false;
                BtnHostPublic.IsEnabled = false;
            }
        }

        private void Transport_Changed(object sender, RoutedEventArgs e)
        {
            if (PnlDirectIP != null)
            {
                if (RbSteam.IsChecked == true)
                {
                    PnlDirectIP.Visibility = Visibility.Collapsed;
                    if (!ValidInstall())
                        return;
                    BtnLaunch.IsEnabled = true;
                    TxtStatus.Text = "Ready";
                }
                else
                {
                    PnlDirectIP.Visibility = Visibility.Visible;
                    if (!ValidInstall())
                        return;
                    ValidateNetworkSettings();
                }
            }
        }

        private void Role_Changed(object sender, RoutedEventArgs e)
        {
            if (TxtHostIP != null)
            {
                if (TxtHostIP.Text != "0.0.0.0" && IsValidIP(TxtHostIP.Text))
                    _lastIP = TxtHostIP.Text;

                TxtHostIP.IsEnabled = RbClient.IsChecked == true;
                TxtHostIP.Text = RbHost.IsChecked == true ? "0.0.0.0" : _lastIP;
            }
            ValidateNetworkSettings();
        }

        private bool IsValidIP(string ip)
        {
            if (ip == "0.0.0.0") return true;
            return System.Net.IPAddress.TryParse(ip, out _) && ip.Count(c => c == '.') == 3;
        }

        private bool IsValidPort(string enteredPort)
        {
            if (int.TryParse(enteredPort, out var port))
                return port is >= 1 and <= 65535;
            return false;
        }

        private void TxtHostIP_TextChanged(object sender, System.Windows.Controls.TextChangedEventArgs e)
        {
            TxtHostIP.BorderBrush = string.IsNullOrEmpty(TxtHostIP.Text) || !IsValidIP(TxtHostIP.Text)
                ? System.Windows.Media.Brushes.Red
                : System.Windows.Media.Brushes.Green;
            ValidateNetworkSettings();
        }

        private void TxtPort_TextChanged(object sender, System.Windows.Controls.TextChangedEventArgs e)
        {
            TxtPort.BorderBrush = !IsValidPort(TxtPort.Text)
                ? System.Windows.Media.Brushes.Red
                : System.Windows.Media.Brushes.Green;
            ValidateNetworkSettings();
        }

        private void ValidateNetworkSettings()
        {
            if (BtnLaunch == null || TxtHostIP == null || TxtPort == null ||
                TxtMissileHz == null || TxtUnitHz == null || TxtStatus == null)
                return;
            if (IsValidIP(TxtHostIP.Text) && IsValidPort(TxtPort.Text)
                && IsValidHz(TxtMissileHz.Text) && IsValidHz(TxtUnitHz.Text))
            {
                BtnLaunch.IsEnabled = true;
                TxtStatus.Text = "Ready";
            }
            else
            {
                BtnLaunch.IsEnabled = false;
                TxtStatus.Text = "Invalid network configuration.";
            }
        }

        private bool IsValidHz(string entered)
        {
            return int.TryParse(entered.Trim(), out var hz) && hz is >= 1 and <= 60;
        }

        private void TxtHz_TextChanged(object sender, System.Windows.Controls.TextChangedEventArgs e)
        {
            if (sender is System.Windows.Controls.TextBox box)
            {
                box.BorderBrush = IsValidHz(box.Text)
                    ? System.Windows.Media.Brushes.Green
                    : System.Windows.Media.Brushes.Red;
            }
            ValidateNetworkSettings();
        }

        private bool ValidInstall()
        {
            var gameDir = TxtGamePath.Text;
            bool bepinex = GameDetector.IsBepInExInstalled(gameDir);
            bool mod = GameDetector.IsModInstalled(gameDir);
            bool proxy = GameDetector.IsProxyStored(gameDir);
            if (string.IsNullOrEmpty(gameDir) || !bepinex || !mod || !proxy)
            {
                UpdateInstallStatus();
                return false;
            }
            return true;
        }

        private void BtnDiscord_Click(object sender, RoutedEventArgs e)
        {
            Process.Start(new ProcessStartInfo("https://discord.gg/rMMnwJHc8w") { UseShellExecute = true });
        }

        private void BtnFeedback_Click(object sender, RoutedEventArgs e)
        {
            var window = new FeedbackWindow(TxtGamePath.Text);
            window.Owner = this;
            window.ShowDialog();
        }

        private void BtnBrowse_Click(object sender, RoutedEventArgs e)
        {
            var dialog = new Microsoft.Win32.OpenFileDialog
            {
                Title = "Select Sea Power.exe",
                Filter = "Sea Power|Sea Power.exe",
                FileName = "Sea Power.exe",
            };

            if (dialog.ShowDialog() == true)
            {
                var dir = System.IO.Path.GetDirectoryName(dialog.FileName)!;
                TxtGamePath.Text = dir;
                _config.Settings.GameDirectory = dir;
                _config.Save();
                UpdateInstallStatus();
            }
        }

        private async void BtnInstall_Click(object sender, RoutedEventArgs e)
        {
            var gameDir = TxtGamePath.Text;
            if (string.IsNullOrEmpty(gameDir)) return;

            SetControlsEnabled(false);
            var progress = new Progress<string>(msg => TxtStatus.Text = msg);

            try
            {
                bool alreadyInstalled = GameDetector.IsBepInExInstalled(gameDir)
                                     && GameDetector.IsProxyStored(gameDir);

                if (alreadyInstalled)
                    await Installer.RepairAsync(gameDir, progress);
                else
                    await Installer.InstallAsync(gameDir, progress);

                TxtStatus.Text = "Installation complete!";
            }
            catch (Exception ex)
            {
                TxtStatus.Text = $"Error: {ex.Message}";
                MessageBox.Show(ex.ToString(), "Installation Error",
                    MessageBoxButton.OK, MessageBoxImage.Error);
            }
            finally
            {
                SetControlsEnabled(true);
                UpdateInstallStatus();
            }
        }

        private async void BtnLaunch_Click(object sender, RoutedEventArgs e)
        {
            await LaunchGameAsync(null);
        }

        private async void BtnRefreshServers_Click(object sender, RoutedEventArgs e)
        {
            await RefreshServersAsync(true);
        }

        private async Task RefreshServersAsync(bool userRequested)
        {
            SaveUIToConfig();
            BtnRefreshServers.IsEnabled = false;
            try
            {
                TxtStatus.Text = "Fetching public servers...";
                var servers = await _registry.GetServersAsync(_config.Settings.RegistryUrl);
                LstServers.ItemsSource = servers;
                TxtStatus.Text = servers.Count == 1
                    ? "1 public server found."
                    : $"{servers.Count} public servers found.";
            }
            catch (Exception ex)
            {
                if (userRequested)
                    MessageBox.Show(ex.Message, "Registry Error", MessageBoxButton.OK, MessageBoxImage.Warning);
                TxtStatus.Text = $"Registry unavailable: {ex.Message}";
            }
            finally
            {
                BtnRefreshServers.IsEnabled = true;
            }
        }

        private void LstServers_SelectionChanged(object sender, System.Windows.Controls.SelectionChangedEventArgs e)
        {
            _selectedServer = LstServers.SelectedItem as RegistryServer;
            BtnConnectSelected.IsEnabled = _selectedServer != null;
            TxtSelectedServer.Text = _selectedServer == null
                ? "No server selected."
                : BuildSelectedServerText(_selectedServer);
        }

        private static string BuildSelectedServerText(RegistryServer server)
        {
            var mods = server.RequiredMods?.Count ?? 0;
            var endpoint = string.IsNullOrWhiteSpace(server.PublicIp)
                ? "endpoint pending"
                : $"{server.PublicIp}:{server.Port}";
            return $"{server.Name} - {endpoint} - {server.PlayerCount}/{server.MaxPlayers} players - {mods} mods";
        }

        private async void BtnConnectSelected_Click(object sender, RoutedEventArgs e)
        {
            if (_selectedServer == null) return;

            SaveUIToConfig();
            SetControlsEnabled(false);
            try
            {
                TxtStatus.Text = "Verifying selected server...";
                var server = await _registry.GetServerAsync(_config.Settings.RegistryUrl, _selectedServer.Id);
                if (server == null)
                {
                    TxtStatus.Text = "Server is not active or has not been verified.";
                    return;
                }

                await ConnectToServerAsync(server);
            }
            catch (Exception ex)
            {
                TxtStatus.Text = $"Connect failed: {ex.Message}";
                MessageBox.Show(ex.Message, "Connect Failed", MessageBoxButton.OK, MessageBoxImage.Warning);
            }
            finally
            {
                if (!_gameRunning)
                    SetControlsEnabled(true);
                UpdateInstallStatus();
            }
        }

        private async Task ConnectToServerAsync(RegistryServer server)
        {
            if (!ValidInstall())
            {
                MessageBox.Show("Install or repair the multiplayer mod before connecting.",
                    "Mod Required", MessageBoxButton.OK, MessageBoxImage.Information);
                return;
            }

            bool steam = server.Transport.Equals("Steam", StringComparison.OrdinalIgnoreCase);
            RbSteam.IsChecked = steam;
            RbDirectIP.IsChecked = !steam;
            RbClient.IsChecked = true;
            TxtHostIP.Text = string.IsNullOrWhiteSpace(server.PublicIp) ? "127.0.0.1" : server.PublicIp;
            TxtPort.Text = server.Port > 0 ? server.Port.ToString() : "7777";
            ChkAutoConnect.IsChecked = !steam;
            ChkPvP.IsChecked = server.Mode.Equals("pvp", StringComparison.OrdinalIgnoreCase);
            SaveUIToConfig();

            var session = RegistryService.CreateClientSession(_config.Settings.RegistryUrl, server,
                steam ? "Steam lobby selected" : "Ready");

            if (steam)
            {
                MessageBox.Show(
                    "This registry entry uses Steam transport. The launcher will write the server session and launch Sea Power, but Steam lobby/invite joining still happens inside the mod.",
                    "Steam Transport",
                    MessageBoxButton.OK,
                    MessageBoxImage.Information);
            }

            await LaunchGameAsync(session);
        }

        private async void BtnHostPublic_Click(object sender, RoutedEventArgs e)
        {
            if (!ValidInstall())
            {
                MessageBox.Show("Install or repair the multiplayer mod before hosting.",
                    "Mod Required", MessageBoxButton.OK, MessageBoxImage.Information);
                return;
            }

            RbDirectIP.IsChecked = true;
            RbHost.IsChecked = true;
            TxtHostIP.Text = "0.0.0.0";
            ChkAutoConnect.IsChecked = true;
            SaveUIToConfig();

            SetControlsEnabled(false);
            try
            {
                TxtStatus.Text = "Publishing server to Railway...";
                var heartbeat = await _registry.SendHeartbeatAsync(_config.Settings);
                _activeHostServerId = heartbeat.ServerId;
                _config.Settings.LastRegistryServerId = heartbeat.ServerId;
                _config.Save();

                StartHeartbeatLoop();

                var session = RegistryService.CreateHostSession(_config.Settings, heartbeat.ServerId, heartbeat.Status);
                TxtStatus.Text = heartbeat.Status == "verified"
                    ? "Server listed. Launching host..."
                    : "Server published pending owner verification. Launching host...";

                await LaunchGameAsync(session);
            }
            catch (Exception ex)
            {
                await StopHostListingAsync();
                TxtStatus.Text = $"Host publish failed: {ex.Message}";
                MessageBox.Show(ex.Message, "Host Publish Failed", MessageBoxButton.OK, MessageBoxImage.Warning);
            }
            finally
            {
                if (!_gameRunning)
                    SetControlsEnabled(true);
                UpdateInstallStatus();
            }
        }

        private void StartHeartbeatLoop()
        {
            _heartbeatCts?.Cancel();
            _heartbeatCts = new CancellationTokenSource();
            var token = _heartbeatCts.Token;

            _heartbeatTask = Task.Run(async () =>
            {
                while (!token.IsCancellationRequested)
                {
                    try
                    {
                        await Task.Delay(TimeSpan.FromSeconds(45), token);
                        if (token.IsCancellationRequested) break;
                        await _registry.SendHeartbeatAsync(_config.Settings, token);
                        Dispatcher.Invoke(() => TxtStatus.Text = "Host heartbeat sent.");
                    }
                    catch (OperationCanceledException)
                    {
                        break;
                    }
                    catch (Exception ex)
                    {
                        Dispatcher.Invoke(() => TxtStatus.Text = $"Heartbeat failed: {ex.Message}");
                    }
                }
            }, token);
        }

        private async Task StopHostListingAsync()
        {
            _heartbeatCts?.Cancel();
            _heartbeatCts = null;

            if (string.IsNullOrWhiteSpace(_activeHostServerId))
                return;

            try
            {
                await _registry.StopServerAsync(_config.Settings, _activeHostServerId);
            }
            catch
            {
                // The registry expires listings by TTL even if stop fails.
            }
            finally
            {
                _activeHostServerId = null;
            }
        }

        private async Task LaunchGameAsync(RegistrySessionInfo? session)
        {
            var gameDir = TxtGamePath.Text;
            if (!ValidInstall())
                return;

            if (_config.Settings.AcknowledgedVersion != CurrentVersion)
            {
                var disclaimer = new DisclaimerWindow { Owner = this };
                if (disclaimer.ShowDialog() != true)
                    return;

                _config.Settings.AcknowledgedVersion = CurrentVersion;
                _config.Save();
            }

            SaveUIToConfig();

            try
            {
                ConfigManager.WriteBepInExConfig(gameDir, _config.Settings);
                if (session != null)
                    ConfigManager.WriteRegistrySession(gameDir, session);

                TxtStatus.Text = "Launching game...";
                _gameRunning = true;
                BtnLaunch.IsEnabled = false;
                BtnHostPublic.IsEnabled = false;

                await GameLauncher.LaunchAsync(gameDir, () =>
                {
                    _ = StopHostListingAsync();
                    Dispatcher.Invoke(() =>
                    {
                        _gameRunning = false;
                        TxtStatus.Text = "Ready";
                        SetControlsEnabled(true);
                        UpdateInstallStatus();
                    });
                });

                TxtStatus.Text = "Game running...";
            }
            catch (Exception ex)
            {
                _gameRunning = false;
                await StopHostListingAsync();
                TxtStatus.Text = $"Launch error: {ex.Message}";
                UpdateInstallStatus();
            }
        }

        private void SetControlsEnabled(bool enabled)
        {
            BtnInstall.IsEnabled = enabled;
            BtnLaunch.IsEnabled = enabled;
            BtnBrowse.IsEnabled = enabled;
            RbSteam.IsEnabled = enabled;
            RbDirectIP.IsEnabled = enabled;
            RbHost.IsEnabled = enabled;
            RbClient.IsEnabled = enabled;
            TxtHostIP.IsEnabled = enabled && RbClient.IsChecked == true;
            TxtPort.IsEnabled = enabled;
            ChkAutoConnect.IsEnabled = enabled;
            ChkTimeVote.IsEnabled = enabled;
            ChkPvP.IsEnabled = enabled;
            TxtMissileHz.IsEnabled = enabled;
            TxtUnitHz.IsEnabled = enabled;
            TxtRegistryUrl.IsEnabled = enabled;
            TxtServerName.IsEnabled = enabled;
            TxtPublicIp.IsEnabled = enabled;
            TxtRegion.IsEnabled = enabled;
            TxtPlayerCount.IsEnabled = enabled;
            TxtMaxPlayers.IsEnabled = enabled;
            TxtScenarioName.IsEnabled = enabled;
            TxtScenarioHash.IsEnabled = enabled;
            TxtRequiredMods.IsEnabled = enabled;
            BtnRefreshServers.IsEnabled = enabled;
            BtnConnectSelected.IsEnabled = enabled && _selectedServer != null;
            BtnHostPublic.IsEnabled = enabled;
        }
    }
}
