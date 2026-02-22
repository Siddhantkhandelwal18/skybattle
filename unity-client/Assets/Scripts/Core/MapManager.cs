using UnityEngine;
using SkyBattle.Networking;
using System.Collections.Generic;

namespace SkyBattle.Core
{
    public class MapManager : MonoBehaviour
    {
        public static MapManager Instance { get; private set; }

        [SerializeField] private MapConfig activeMap;
        [SerializeField] private GameObject pickupPrefab;

        private Dictionary<int, GameObject> activePickups = new Dictionary<int, GameObject>();

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
            }
            else
            {
                Destroy(gameObject);
            }
        }

        public void LoadMap(MapConfig config)
        {
            activeMap = config;
            // In a real implementation, we would instantiate the TilemapPrefab here
            Debug.Log($"Map {config.MapName} loaded.");
            
            InitializePickups();
        }

        private void InitializePickups()
        {
            foreach (var spawn in activeMap.PickupSpawns)
            {
                GameObject pickup = Instantiate(pickupPrefab, spawn.Position, Quaternion.identity);
                pickup.name = $"Pickup_{spawn.ID}";
                activePickups[spawn.ID] = pickup;
                
                // Configure pickup visuals based on type (Logic to be added in Pickup script)
            }
        }

        public void UpdatePickupState(int id, bool isActive)
        {
            if (activePickups.TryGetValue(id, out GameObject pickup))
            {
                pickup.SetActive(isActive);
            }
        }

        public Vector2 GetRandomSpawn()
        {
            if (activeMap == null || activeMap.SpawnPoints.Count == 0) return Vector2.zero;
            return activeMap.SpawnPoints[Random.Range(0, activeMap.SpawnPoints.Count)];
        }
    }
}
