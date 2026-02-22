using UnityEngine;

namespace SkyBattle.Core
{
    public class Pickup : MonoBehaviour
    {
        [Header("Animation")]
        public float BobSpeed = 2f;
        public float BobAmount = 0.2f;
        public float RotationSpeed = 50f;

        private Vector3 startPos;

        private void Start()
        {
            startPos = transform.position;
        }

        private void Update()
        {
            // Simple Bobbing animation
            float newY = startPos.y + Mathf.Sin(Time.time * BobSpeed) * BobAmount;
            transform.position = new Vector3(startPos.x, newY, startPos.z);

            // Rotating animation
            transform.Rotate(Vector3.up, RotationSpeed * Time.deltaTime);
        }
    }
}
