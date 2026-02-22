using UnityEngine;
using System;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Collections.Generic;
using System.Threading;

namespace SkyBattle.Networking
{
    [Serializable]
    public class LANServerData
    {
        public string HostName;
        public string MapName;
        public int PlayerCount;
        public int MaxPlayers;
        public int Port;
        public string IPAddress;
        public long LastSeen;
    }

    public class LANDiscovery : MonoBehaviour
    {
        public static LANDiscovery Instance { get; private set; }

        [Header("Settings")]
        public int DiscoveryPort = 7002;
        public float BroadcastInterval = 2.0f;
        public float TimeoutThreshold = 5.0f;

        private UdpClient udpClient;
        private Thread receiveThread;
        private bool isScanning;
        private bool isBroadcasting;

        private Dictionary<string, LANServerData> discoveredServers = new Dictionary<string, LANServerData>();
        private LANServerData localServerData;

        public event Action<List<LANServerData>> OnServersUpdated;

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                DontDestroyOnLoad(gameObject);
            }
            else
            {
                Destroy(gameObject);
            }
        }

        private void OnDestroy()
        {
            StopDiscovery();
        }

        public void StartBroadcasting(string hostName, string mapName, int players, int maxPlayers, int gamePort)
        {
            StopDiscovery();

            localServerData = new LANServerData
            {
                HostName = hostName,
                MapName = mapName,
                PlayerCount = players,
                MaxPlayers = maxPlayers,
                Port = gamePort
            };

            isBroadcasting = true;
            try {
                udpClient = new UdpClient();
                udpClient.EnableBroadcast = true;
                InvokeRepeating(nameof(Broadcast), 0, BroadcastInterval);
            } catch (Exception e) {
                Debug.LogError($"Failed to start broadcasting: {e.Message}");
            }
        }

        public void StartScanning()
        {
            StopDiscovery();

            discoveredServers.Clear();
            isScanning = true;

            try {
                udpClient = new UdpClient(DiscoveryPort);
                receiveThread = new Thread(new ThreadStart(ReceivePackets));
                receiveThread.IsBackground = true;
                receiveThread.Start();
                
                InvokeRepeating(nameof(CheckTimeouts), TimeoutThreshold, TimeoutThreshold);
            } catch (Exception e) {
                Debug.LogError($"Failed to start scanning: {e.Message}");
            }
        }

        public void StopDiscovery()
        {
            CancelInvoke();
            isBroadcasting = false;
            isScanning = false;

            if (receiveThread != null && receiveThread.IsAlive)
                receiveThread.Abort();

            if (udpClient != null)
            {
                udpClient.Close();
                udpClient = null;
            }
        }

        private void Broadcast()
        {
            if (!isBroadcasting || udpClient == null) return;

            try {
                string json = JsonUtility.ToJson(localServerData);
                byte[] data = Encoding.UTF8.GetBytes(json);
                IPEndPoint endPoint = new IPEndPoint(IPAddress.Broadcast, DiscoveryPort);
                udpClient.Send(data, data.Length, endPoint);
            } catch (Exception e) {
                Debug.LogWarning($"Broadcast error: {e.Message}");
            }
        }

        private void ReceivePackets()
        {
            IPEndPoint remoteEP = new IPEndPoint(IPAddress.Any, DiscoveryPort);

            while (isScanning)
            {
                try {
                    byte[] data = udpClient.Receive(ref remoteEP);
                    string json = Encoding.UTF8.GetString(data);
                    LANServerData server = JsonUtility.FromJson<LANServerData>(json);

                    if (server != null)
                    {
                        server.IPAddress = remoteEP.Address.ToString();
                        server.LastSeen = DateTime.Now.Ticks;

                        lock (discoveredServers)
                        {
                            discoveredServers[server.IPAddress] = server;
                        }
                    }
                } catch (SocketException) {
                    // Normal when closed
                } catch (Exception e) {
                    Debug.LogWarning($"Receive error: {e.Message}");
                }
            }
        }

        private void Update()
        {
            if (isScanning && Time.frameCount % 30 == 0) // Update UI periodically
            {
                lock (discoveredServers)
                {
                    OnServersUpdated?.Invoke(new List<LANServerData>(discoveredServers.Values));
                }
            }
        }

        private void CheckTimeouts()
        {
            lock (discoveredServers)
            {
                long now = DateTime.Now.Ticks;
                List<string> toRemove = new List<string>();

                foreach (var kvp in discoveredServers)
                {
                    if (new TimeSpan(now - kvp.Value.LastSeen).TotalSeconds > TimeoutThreshold)
                    {
                        toRemove.Add(kvp.Key);
                    }
                }

                foreach (var key in toRemove)
                {
                    discoveredServers.Remove(key);
                }
            }
        }
    }
}
