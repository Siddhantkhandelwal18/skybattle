using System;
using UnityEngine;

namespace SkyBattle.Networking
{
    // ── Client to Server Packet Types ──────────────────────────────────────────

    public enum PacketType : byte
    {
        Auth = 1,
        Input = 2,
        Ping = 3,
        RequestJoin = 4,
        LobbyReady = 5
    }

    [Serializable]
    public struct AuthPacket
    {
        public string token;
    }

    [Serializable]
    public struct JoinPacket
    {
        public string mid; // MatchID
    }

    [Serializable]
    public struct InputPacket
    {
        public uint seq;
        public float h;
        public float v;
        public float aim;
        public bool fly;
        public bool fire;
        public byte wpn;
    }

    // ── Server to Client Packet Types ──────────────────────────────────────────

    public enum ServerPacketType : byte
    {
        WorldState = 10,
        AuthAck = 11,
        MatchInit = 12,
        Pong = 13,
        LobbyState = 14
    }

    [Serializable]
    public struct WorldStatePacket
    {
        public int tick;
        public PlayerState[] players;
        public PickupState[] pickups;
        public MatchEvent[] events;
    }

    [Serializable]
    public struct PlayerState
    {
        public int id;
        public string name;
        public Vector2 pos;
        public Vector2 vel;
        public float aim;
        public int hp;
        public float fuel;
        public bool fly;
        public bool grnd;
        public uint seq;
        public bool alive;
    }

    [Serializable]
    public struct PickupState
    {
        public int id;
        public string type;
        public int wpnId;
        public Vector2 pos;
        public bool active;
    }

    [Serializable]
    public struct MatchEvent
    {
        public int tick;
        public string type;
        public int actor;
        public int target;
        public int wpn;
    }

    [Serializable]
    public struct AuthAckPacket
    {
        public bool ok;
        public int id;
        public string msg;
    }

    [Serializable]
    public struct MatchInitPacket
    {
        public string mid;
        public string map;
        public int rate;
        public Vector2[] spawns;
    }

    [Serializable]
    public struct LobbyStatePacket
    {
        public string mid;
        public string map;
        public LobbyPlayerData[] players;
        public bool allReady;
    }

    [Serializable]
    public struct LobbyPlayerData
    {
        public int id;
        public string name;
        public bool ready;
        public int team;
    }
}
