// SKYBATTLE — Network Protocols
// Defines packet structures for client-server communication using MessagePack
package network

import (
	"github.com/siddhantkhandelwal18/skybattle/game-server/internal/game"
)

// ── Client to Server Packets ──────────────────────────────────────────────────

type PacketType uint8

const (
	PacketAuth        PacketType = 1
	PacketInput       PacketType = 2
	PacketPing        PacketType = 3
	PacketRequestJoin PacketType = 4
	PacketLobbyReady  PacketType = 5
)

type AuthPacket struct {
	Token string `msgpack:"token"`
}

type JoinPacket struct {
	MatchID string `msgpack:"mid"`
}

type InputPacket struct {
	Sequence    uint32  `msgpack:"seq"`
	Horizontal  float32 `msgpack:"h"`
	Vertical    float32 `msgpack:"v"`
	AimAngleDeg float32 `msgpack:"aim"`
	IsFlying    bool    `msgpack:"fly"`
	Firing      bool    `msgpack:"fire"`
	WeaponID    uint8   `msgpack:"wpn"`
}

// ── Server to Client Packets ──────────────────────────────────────────────────

type ServerPacketType uint8

const (
	PacketWorldState ServerPacketType = 10
	PacketAuthAck    ServerPacketType = 11
	PacketMatchInit  ServerPacketType = 12
	PacketPong       ServerPacketType = 13
	PacketLobbyState  ServerPacketType = 14
)

type WorldStatePacket struct {
	Tick      int                    `msgpack:"tick"`
	Players   []game.Player          `msgpack:"players"`
	Pickups   []game.Pickup          `msgpack:"pickups"`
	Events    []game.MatchEvent      `msgpack:"events"` // Using game.MatchEvent if defined or define here
}

type AuthAckPacket struct {
	Success  bool   `msgpack:"ok"`
	PlayerID int    `msgpack:"id"`
	Message  string `msgpack:"msg"`
}

type MatchInitPacket struct {
	MatchID  string      `msgpack:"mid"`
	MapID    string      `msgpack:"map"`
	TickRate int         `msgpack:"rate"`
	Spawns   []game.Vec2 `msgpack:"spawns"`
}

type LobbyStatePacket struct {
	MatchID  string            `msgpack:"mid"`
	MapID    string            `msgpack:"map"`
	Players  []LobbyPlayerData `msgpack:"players"`
	AllReady bool              `msgpack:"allReady"`
}

type LobbyPlayerData struct {
	ID    int    `msgpack:"id"`
	Name  string `msgpack:"name"`
	Ready bool   `msgpack:"ready"`
	Team  int    `msgpack:"team"` // 0=RED, 1=BLUE for example
}
