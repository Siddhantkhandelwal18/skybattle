using UnityEngine;
using System.Collections.Generic;

namespace SkyBattle.Weapon
{
    [System.Serializable]
    public struct WeaponData
    {
        public int ID;
        public string Name;
        public float DamagePerShot;
        public float FireRate;
        public int MaxAmmo;
        public float ReloadTime;
        public bool IsHitscan;
        public float ProjectileSpeed;
        public float BlastRadius;
        public Sprite WeaponSprite;
        public GameObject ProjectilePrefab;
    }

    [CreateAssetMenu(fileName = "WeaponRegistry", menuName = "SkyBattle/WeaponRegistry")]
    public class WeaponRegistry : ScriptableObject
    {
        public List<WeaponData> Weapons;

        public WeaponData GetWeapon(int id)
        {
            return Weapons.Find(w => w.ID == id);
        }
    }
}
