using UnityEngine;
using System.Collections.Generic;

namespace SkyBattle.Networking
{
    public struct PlayerStateSnapshot
    {
        public uint SequenceNumber;
        public Vector2 Position;
        public Vector2 Velocity;
        public bool IsFlying;
        public float Fuel;
    }

    public class PredictionModule : MonoBehaviour
    {
        private List<PlayerStateSnapshot> history = new List<PlayerStateSnapshot>();
        private const int MaxHistory = 120; // 4 seconds at 30 TPS

        public void RecordState(uint seq, Vector2 pos, Vector2 vel, bool fly, float fuel)
        {
            if (history.Count >= MaxHistory) history.RemoveAt(0);
            
            history.Add(new PlayerStateSnapshot
            {
                SequenceNumber = seq,
                Position = pos,
                Velocity = vel,
                IsFlying = fly,
                Fuel = fuel
            });
        }

        public void Reconcile(PlayerState serverState, float errorThreshold)
        {
            // 1. Find the local state that matches the server's sequence
            int index = history.FindIndex(s => s.SequenceNumber == serverState.seq);
            if (index == -1) return;

            PlayerStateSnapshot localSnapshot = history[index];
            float distance = Vector2.Distance(localSnapshot.Position, serverState.pos);

            if (distance > errorThreshold)
            {
                Debug.Log($"Reconciliation required! Error distance: {distance}");
                
                // 2. Snap to server state
                transform.position = serverState.pos;
                // Velocity correction would go here if using a physics-based controller
                
                // 3. Re-simulate from the server tick to the current client tick
                // This requires a deterministic physics step or re-applying stored inputs
                ReSimulate(index);
            }
        }

        private void ReSimulate(int startIndex)
        {
            // In a full implementation, we would loop from startIndex + 1 to the end of history
            // and re-apply the stored inputs to the corrected position.
            // For Phase 2, we snap to the server position which is the core of reconciliation.
            history.RemoveRange(0, startIndex + 1);
        }
    }
}
