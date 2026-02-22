using UnityEngine;
using System.Collections.Generic;

namespace SkyBattle.Core
{
    [System.Serializable]
    public struct PickupSpawnData
    {
        public int ID;
        public string Type; // WEAPON, HEALTH, FUEL
        public int WeaponID;
        public Vector2 Position;
    }

    [CreateAssetMenu(fileName = "MapConfig", menuName = "SkyBattle/MapConfig")]
    public class MapConfig : ScriptableObject
    {
        public string MapID;
        public string MapName;
        public List<Vector2> SpawnPoints;
        public List<PickupSpawnData> PickupSpawns;
        public GameObject TilemapPrefab;
        public Vector2 MapBoundsSize;
    }
}
