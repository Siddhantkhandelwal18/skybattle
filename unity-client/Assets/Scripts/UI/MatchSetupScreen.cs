using UnityEngine;
using UnityEngine.UI;
using TMPro;
using SkyBattle.Core;
using System.Collections.Generic;

namespace SkyBattle.UI
{
    public class MatchSetupScreen : UIScreen
    {
        [Header("Inputs")]
        public TMP_Dropdown MapDropdown;
        public Slider BotCountSlider;
        public TMP_Text BotCountText;
        public TMP_Dropdown DifficultyDropdown;
        public Button StartButton;
        public Button BackButton;

        [Header("Data")]
        public List<MapConfig> AvailableMaps;

        private void Start()
        {
            InitializeMapDropdown();
            
            BotCountSlider.onValueChanged.AddListener((val) => {
                BotCountText.text = $"Bots: {val}";
            });

            StartButton.onClick.AddListener(() => StartOfflineMatch());
            BackButton.onClick.AddListener(() => UIManager.Instance.ShowScreen("MainMenu"));
        }

        private void InitializeMapDropdown()
        {
            MapDropdown.clearOptions();
            List<string> mapNames = new List<string>();
            foreach (var map in AvailableMaps)
            {
                mapNames.Add(map.MapName);
            }
            MapDropdown.AddOptions(mapNames);
        }

        private void StartOfflineMatch()
        {
            string selectedMap = AvailableMaps[MapDropdown.value].MapID;
            int botCount = (int)BotCountSlider.value;
            string difficulty = DifficultyDropdown.options[DifficultyDropdown.value].text;

            Debug.Log($"Starting Match: Map={selectedMap}, Bots={botCount}, Difficulty={difficulty}");
            
            // Logic to transition to Game Scene and notify LAN/Offline Manager (Phase 2)
            UIManager.Instance.HideAllScreens();
        }
    }
}
