using UnityEngine;
using UnityEngine.UI;
using TMPro;
using SkyBattle.Player;

namespace SkyBattle.UI
{
    public class HUDManager : MonoBehaviour
    {
        [Header("Bars")]
        [SerializeField] private Slider healthBar;
        [SerializeField] private Slider fuelBar;
        [SerializeField] private Image fuelBarFill;

        [Header("Text")]
        [SerializeField] private TextMeshProUGUI ammoText;
        [SerializeField] private TextMeshProUGUI timerText;
        [SerializeField] private TextMeshProUGUI killFeedText;

        [Header("Colors")]
        public Color NormalFuelColor = Color.orange;
        public Color LowFuelColor = Color.red;

        private PlayerController localPlayer;

        public void SetLocalPlayer(PlayerController player)
        {
            localPlayer = player;
        }

        private void Update()
        {
            if (localPlayer == null) return;

            // Update Health
            healthBar.value = localPlayer.Health / 100f; // Simplified

            // Update Fuel
            fuelBar.value = localPlayer.Fuel / 100f;
            fuelBarFill.color = localPlayer.Fuel < 20f ? LowFuelColor : NormalFuelColor;

            // Flash if low fuel (Micro-animation)
            if (localPlayer.Fuel < 20f)
            {
                float pulse = 0.5f + Mathf.PingPong(Time.time * 5f, 0.5f);
                fuelBarFill.color = new Color(LowFuelColor.r, LowFuelColor.g, LowFuelColor.b, pulse);
            }
        }

        public void ShowKill(string killer, string victim, int weaponId)
        {
            // Simple kill feed update
            killFeedText.text = $"{killer} killed {victim}";
            Invoke("ClearKillFeed", 4f);
        }

        private void ClearKillFeed()
        {
            killFeedText.text = "";
        }
    }
}
