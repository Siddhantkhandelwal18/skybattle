using UnityEngine;
using SkyBattle.Networking;
using SkyBattle.Core;

namespace SkyBattle.Player
{
    public class PlayerController : MonoBehaviour
    {
        [Header("Settings")]
        [SerializeField] private GameConfig config;
        [SerializeField] private bool isLocalPlayer = false;

        [Header("Components")]
        [SerializeField] private Rigidbody2D rb;
        [SerializeField] private Transform graphics;
        [SerializeField] private Transform aimPivot;

        [Header("Runtime State")]
        public int PlayerID;
        public float Fuel;
        public int Health;
        public bool IsFlying;
        public float AimAngle;

        private uint sequence = 0;
        private Vector2 moveInput;
        private Vector2 aimInput;
        private bool isFiring;

        private void Start()
        {
            if (rb == null) rb = GetComponent<Rigidbody2D>();
            Fuel = config.MaxFuel;
            Health = (int)config.MaxHealth;
        }

        private void Update()
        {
            if (!isLocalPlayer) return;

            // Gather Input (Simplified for prototype, real logic will use New Input System)
            moveInput = new Vector2(Input.GetAxisRaw("Horizontal"), Input.GetAxisRaw("Vertical"));
            aimInput = new Vector2(Input.GetAxis("Mouse X"), Input.GetAxis("Mouse Y")); // Placeholder
            
            // Aim logic
            if (aimInput.sqrMagnitude > 0.1f)
            {
                AimAngle = Mathf.Atan2(aimInput.y, aimInput.x) * Mathf.Rad2Deg;
                if (aimPivot != null) aimPivot.rotation = Quaternion.Euler(0, 0, AimAngle);
            }

            IsFlying = Input.GetKey(KeyCode.Space) && Fuel > 0;
            isFiring = Input.GetMouseButton(0);

            // Send Input Packet to Server
            SendInput();
        }

        private void FixedUpdate()
        {
            if (isLocalPlayer)
            {
                // Client-side prediction would go here
            }
        }

        private void SendInput()
        {
            sequence++;
            var packet = new InputPacket
            {
                seq = sequence,
                h = moveInput.x,
                v = moveInput.y,
                aim = AimAngle,
                fly = IsFlying,
                fire = isFiring,
                wpn = 1 // Default Assault Rifle
            };

            NetworkManager.Instance.SendPacket(PacketType.Input, packet);
        }

        public void UpdateState(PlayerState state)
        {
            if (isLocalPlayer)
            {
                // Reconciliation logic here
                // For now, just sync fuel and health
                Fuel = state.fuel;
                Health = state.hp;
            }
            else
            {
                // Interpolate remote player
                transform.position = Vector3.Lerp(transform.position, state.pos, Time.deltaTime * 10f);
                rb.velocity = state.vel;
                AimAngle = state.aim;
                if (aimPivot != null) aimPivot.rotation = Quaternion.Euler(0, 0, AimAngle);
                IsFlying = state.fly;
            }
        }
    }
}
