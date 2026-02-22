using UnityEngine;
using UnityEngine.UI;

namespace SkyBattle.UI
{
    public class MainMenuScreen : UIScreen
    {
        [Header("Buttons")]
        public Button PlayButton;
        public Button LANButton;
        public Button OfflineButton;
        public Button SettingsButton;
        public Button QuitButton;

        private void Start()
        {
            PlayButton?.onClick.AddListener(() => OnPlayClicked());
            LANButton?.onClick.AddListener(() => OnLANClicked());
            OfflineButton?.onClick.AddListener(() => OnOfflineClicked());
            SettingsButton?.onClick.AddListener(() => OnSettingsClicked());
            QuitButton?.onClick.AddListener(() => Application.Quit());
        }

        private void OnPlayClicked()
        {
            Debug.Log("Online Play triggered.");
            // Phase 3 implementation
        }

        private void OnLANClicked()
        {
            UIManager.Instance.ShowScreen("LANDiscovery");
        }

        private void OnOfflineClicked()
        {
            UIManager.Instance.ShowScreen("MatchSetup");
        }

        private void OnSettingsClicked()
        {
            UIManager.Instance.ShowScreen("Settings");
        }

        public override void OnOpen()
        {
            base.OnOpen();
            Debug.Log("Main Menu Opened");
        }
    }
}
