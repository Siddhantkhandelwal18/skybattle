using UnityEngine;
using SkyBattle.Networking;
using System.Collections.Generic;
using System;

namespace SkyBattle.Core
{
    public class LobbyManager : MonoBehaviour
    {
        public static LobbyManager Instance { get; private set; }

        public string CurrentMatchID { get; private set; }
        public string CurrentMap { get; private set; }
        public List<LobbyPlayerData> Players { get; private set; } = new List<LobbyPlayerData>();
        public bool AllReady { get; private set; }

        public event Action OnLobbyUpdated;

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

        private void Start()
        {
            NetworkManager.Instance.OnLobbyStateReceived += HandleLobbyState;
        }

        private void HandleLobbyState(LobbyStatePacket packet)
        {
            CurrentMatchID = packet.mid;
            CurrentMap = packet.map;
            Players = new List<LobbyPlayerData>(packet.players);
            AllReady = packet.allReady;

            OnLobbyUpdated?.Invoke();
        }

        public void ToggleReady()
        {
            // Find local player and toggle (simulation for now)
            // In real logic, send a packet to server
            Debug.Log("Toggling Ready status...");
            NetworkManager.Instance.SendPacket(PacketType.LobbyReady, new { ready = true });
        }

        public void ChangeTeam(int team)
        {
            Debug.Log($"Changing to team {team}...");
            // Send packet to server
        }

        public void LeaveLobby()
        {
            Debug.Log("Leaving Lobby...");
            NetworkManager.Instance.Disconnect(); // To be implemented in NetworkManager
            Players.Clear();
        }
    }
}
