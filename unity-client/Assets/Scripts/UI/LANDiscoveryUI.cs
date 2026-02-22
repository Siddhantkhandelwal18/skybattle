using UnityEngine;
using UnityEngine.UI;
using TMPro;
using System.Collections.Generic;
using SkyBattle.Networking;

namespace SkyBattle.UI
{
    public class LANDiscoveryUI : UIScreen
    {
        [Header("UI Elements")]
        public Transform ServerListContainer;
        public GameObject ServerEntryPrefab;
        public Button BackButton;
        public Button ScanButton;
        public TMP_Text StatusText;

        private List<GameObject> activeEntries = new List<GameObject>();

        private void Start()
        {
            BackButton.onClick.AddListener(() => {
                LANDiscovery.Instance.StopDiscovery();
                UIManager.Instance.ShowScreen("MainMenu");
            });

            ScanButton.onClick.AddListener(() => {
                LANDiscovery.Instance.StartScanning();
                StatusText.text = "Scanning for matches...";
            });

            LANDiscovery.Instance.OnServersUpdated += UpdateServerList;
        }

        public override void OnOpen()
        {
            base.OnOpen();
            LANDiscovery.Instance.StartScanning();
            StatusText.text = "Scanning for matches...";
        }

        private void UpdateServerList(List<LANServerData> servers)
        {
            // Clear old entries
            foreach (var entry in activeEntries)
            {
                Destroy(entry);
            }
            activeEntries.Clear();

            if (servers.Count == 0)
            {
                StatusText.text = "No local matches found. Try hosting one!";
                return;
            }

            StatusText.text = $"Found {servers.Count} local matches.";

            foreach (var server in servers)
            {
                GameObject entryObj = Instantiate(ServerEntryPrefab, ServerListContainer);
                activeEntries.Add(entryObj);

                // Assuming prefab has a simple script or just finding components
                var texts = entryObj.GetComponentsInChildren<TMP_Text>();
                // index 0: HostName, index 1: Map/Players, etc.
                if (texts.Length >= 2)
                {
                    texts[0].text = server.HostName;
                    texts[1].text = $"{server.MapName} | {server.PlayerCount}/{server.MaxPlayers}";
                }

                var joinBtn = entryObj.GetComponentInChildren<Button>();
                if (joinBtn != null)
                {
                    joinBtn.onClick.AddListener(() => JoinServer(server));
                }
            }
        }

        private void JoinServer(LANServerData server)
        {
            Debug.Log($"Joining LAN Server: {server.IPAddress}:{server.Port}");
            
            LANDiscovery.Instance.StopDiscovery();
            
            // Connect to host
            NetworkManager.Instance.Connect(server.IPAddress, server.Port);
            
            // Send Join Request (Simplified for Phase 1/2)
            NetworkManager.Instance.SendPacket(PacketType.RequestJoin, new { name = "Player_" + UnityEngine.Random.Range(100, 999) });

            // Transition to Lobby
            UIManager.Instance.ShowScreen("Lobby");
        }
    }
}
