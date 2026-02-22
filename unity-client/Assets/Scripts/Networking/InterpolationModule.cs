using UnityEngine;
using System.Collections.Generic;

namespace SkyBattle.Networking
{
    public class InterpolationModule : MonoBehaviour
    {
        private struct RemoteState
        {
            public float Timestamp;
            public Vector2 Position;
        }

        private List<RemoteState> stateBuffer = new List<RemoteState>();
        private float interpolationDelay = 0.1f; // 100ms buffer

        public void AddState(Vector2 pos)
        {
            stateBuffer.Add(new RemoteState { Timestamp = Time.time, Position = pos });
            if (stateBuffer.Count > 20) stateBuffer.RemoveAt(0);
        }

        private void Update()
        {
            if (stateBuffer.Count < 2) return;

            float renderTime = Time.time - interpolationDelay;

            // Find the two states to interpolate between
            for (int i = 0; i < stateBuffer.Count - 1; i++)
            {
                if (stateBuffer[i].Timestamp <= renderTime && stateBuffer[i + 1].Timestamp >= renderTime)
                {
                    float t = (renderTime - stateBuffer[i].Timestamp) / (stateBuffer[i + 1].Timestamp - stateBuffer[i].Timestamp);
                    transform.position = Vector2.Lerp(stateBuffer[i].Position, stateBuffer[i + 1].Position, t);
                    return;
                }
            }
        }
    }
}
