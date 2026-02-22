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
            // Integration with NetworkClient to connect to this IP/Port
            LANDiscovery.Instance.StopDiscovery();
            UIManager.Instance.HideAllScreens();
            // Start game loading logic...
        }
    }
}
