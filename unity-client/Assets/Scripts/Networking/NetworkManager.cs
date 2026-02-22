using UnityEngine;
using System.Net;
using System.Net.Sockets;
using SkyBattle.Core;
using System;

namespace SkyBattle.Networking
{
    public class NetworkManager : MonoBehaviour
    {
        public static NetworkManager Instance { get; private set; }

        [SerializeField] private GameConfig config;

        private UdpClient udpClient;
        private IPEndPoint serverEndPoint;

        public event Action<WorldStatePacket> OnWorldStateReceived;
        public event Action<AuthAckPacket> OnAuthAckReceived;
        public event Action<MatchInitPacket> OnMatchInitReceived;

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                DontDestroyOnLoad(gameObject);
            }
            else
            {
                Destroy(gameObject);
            }
        }

        public void Connect()
        {
            udpClient = new UdpClient();
            serverEndPoint = new IPEndPoint(IPAddress.Parse(config.ServerIp), config.ServerPort);
            
            Debug.Log($"Connecting to Game Server at {config.ServerIp}:{config.ServerPort}");
            
            // Start listening thread or use async pattern
            ReceivePackets();
        }

        private async void ReceivePackets()
        {
            try
            {
                while (true)
                {
                    var result = await udpClient.ReceiveAsync();
                    HandlePacket(result.Buffer);
                }
            }
            catch (Exception e)
            {
                Debug.LogError($"Network receive error: {e.Message}");
            }
        }

        private void HandlePacket(byte[] data)
        {
            if (data.Length < 1) return;

            byte type = data[0];
            byte[] payload = new byte[data.Length - 1];
            Array.Copy(data, 1, payload, 0, payload.Length);

            // In production, use MessagePack to deserialize
            // For Phase 1 demo, we'll use JsonUtility as a placeholder 
            // but real logic will be MessagePack
            
            switch ((ServerPacketType)type)
            {
                case ServerPacketType.AuthAck:
                    var ack = JsonUtility.FromJson<AuthAckPacket>(System.Text.Encoding.UTF8.GetString(payload));
                    OnAuthAckReceived?.Invoke(ack);
                    break;
                case ServerPacketType.MatchInit:
                    var init = JsonUtility.FromJson<MatchInitPacket>(System.Text.Encoding.UTF8.GetString(payload));
                    OnMatchInitReceived?.Invoke(init);
                    break;
                case ServerPacketType.WorldState:
                    var state = JsonUtility.FromJson<WorldStatePacket>(System.Text.Encoding.UTF8.GetString(payload));
                    OnWorldStateReceived?.Invoke(state);
                    break;
            }
        }

        public void SendPacket<T>(PacketType type, T packet)
        {
            // Serialize and send
            string json = JsonUtility.ToJson(packet);
            byte[] payload = System.Text.Encoding.UTF8.GetBytes(json);
            
            byte[] data = new byte[payload.Length + 1];
            data[0] = (byte)type;
            Array.Copy(payload, 0, data, 1, payload.Length);

            udpClient.SendAsync(data, data.Length, serverEndPoint);
        }

        private void OnDestroy()
        {
            udpClient?.Close();
        }
    }
}
