using UnityEngine;

namespace SkyBattle.Core
{
    [CreateAssetMenu(fileName = "GameConfig", menuName = "SkyBattle/GameConfig")]
    public class GameConfig : ScriptableObject
    {
        [Header("API Settings")]
        public string ApiBaseUrl = "http://localhost:3001";
        public string MatchmakingUrl = "http://localhost:3002";
        public string ProfileUrl = "http://localhost:3003";
        public string StoreUrl = "http://localhost:3004";

        [Header("Game Server Settings")]
        public string ServerIp = "127.0.0.1";
        public int ServerPort = 7001;
        public int TickRate = 30;

        [Header("Gameplay Constants")]
        public float MaxHealth = 100f;
        public float MaxFuel = 100f;
        public float FuelDrainRate = 15f;
        public float FuelRechargeRate = 10f;
        
        [Header("Version")]
        public string Version = "0.1.0-alpha";
    }
}
