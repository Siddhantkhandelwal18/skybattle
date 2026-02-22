using UnityEngine;
using UnityEngine.UI;
using TMPro;
using SkyBattle.Core;
using System.Collections.Generic;

namespace SkyBattle.UI
{
    public class LobbyScreen : UIScreen
    {
        [Header("UI Elements")]
        public TMP_Text MatchInfoText;
        public Transform PlayerListContainer;
        public GameObject PlayerEntryPrefab;
        public Button ReadyButton;
        public Button StartButton;
        public Button LeaveButton;

        private List<GameObject> activeEntries = new List<GameObject>();

        private void Start()
        {
            ReadyButton.onClick.AddListener(() => LobbyManager.Instance.ToggleReady());
            StartButton.onClick.AddListener(() => StartMatch());
            LeaveButton.onClick.AddListener(() => {
                LobbyManager.Instance.LeaveLobby();
                UIManager.Instance.ShowScreen("MainMenu");
            });

            LobbyManager.Instance.OnLobbyUpdated += UpdateUI;
        }

        public override void OnOpen()
        {
            base.OnOpen();
            UpdateUI();
        }

        private void UpdateUI()
        {
            MatchInfoText.text = $"Map: {LobbyManager.Instance.CurrentMap} | ID: {LobbyManager.Instance.CurrentMatchID}";

            // Clear old entries
            foreach (var entry in activeEntries)
            {
                Destroy(entry);
            }
            activeEntries.Clear();

            foreach (var player in LobbyManager.Instance.Players)
            {
                GameObject entryObj = Instantiate(PlayerEntryPrefab, PlayerListContainer);
                activeEntries.Add(entryObj);

                var texts = entryObj.GetComponentsInChildren<TMP_Text>();
                if (texts.Length >= 2)
                {
                    texts[0].text = player.name;
                    texts[1].text = player.ready ? "<color=green>READY</color>" : "<color=red>NOT READY</color>";
                }
            }

            // Only host can start match (simplified check for Phase 1)
            // StartButton.gameObject.SetActive(IsHost && LobbyManager.Instance.AllReady);
            StartButton.interactable = LobbyManager.Instance.AllReady;
        }

        private void StartMatch()
        {
            Debug.Log("Starting Match from Lobby...");
            // Trigger server command or transition to game scene
        }
    }
}
