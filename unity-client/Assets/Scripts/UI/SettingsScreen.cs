using UnityEngine;
using UnityEngine.UI;

namespace SkyBattle.UI
{
    public class SettingsScreen : UIScreen
    {
        [Header("Controls")]
        public Slider MasterVolumeSlider;
        public Slider SFXVolumeSlider;
        public Toggle MuteToggle;
        public Button BackButton;

        private void Start()
        {
            BackButton.onClick.AddListener(() => UIManager.Instance.ShowScreen("MainMenu"));
            
            MasterVolumeSlider.onValueChanged.AddListener((val) => Debug.Log($"Master Volume: {val}"));
            SFXVolumeSlider.onValueChanged.AddListener((val) => Debug.Log($"SFX Volume: {val}"));
            MuteToggle.onValueChanged.AddListener((val) => Debug.Log($"Mute: {val}"));
        }

        public override void OnOpen()
        {
            base.OnOpen();
            Debug.Log("Settings Opened");
        }
    }
}
