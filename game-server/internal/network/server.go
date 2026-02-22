// SKYBATTLE — UDP Server Implementation
package network

import (
	"bytes"
	"fmt"
	"log"
	"net"
	"sync"
	"time"

	"github.com/vmihailenco/msgpack/v5"
	"github.com/siddhantkhandelwal18/skybattle/game-server/internal/config"
	"github.com/siddhantkhandelwal18/skybattle/game-server/internal/game"
	"github.com/siddhantkhandelwal18/skybattle/game-server/internal/room"
)

type ClientSession struct {
	Addr     *net.UDPAddr
	PlayerID int
	RoomID   string
	LastSeen time.Time
}

type Server struct {
	cfg      *config.Config
	conn     *net.UDPConn
	manager  *room.Manager
	sessions sync.Map // map[string]*ClientSession (key: addr.String())
}

func NewServer(cfg *config.Config) *Server {
	return &Server{
		cfg:     cfg,
		manager: room.NewManager(cfg.MaxRoomsPerServer, cfg.TickRate),
	}
}

func (s *Server) Start() error {
	addr, err := net.ResolveUDPAddr("udp", fmt.Sprintf(":%d", s.cfg.Port))
	if err != nil {
		return err
	}

	conn, err := net.ListenUDP("udp", addr)
	if err != nil {
		return err
	}
	s.conn = conn
	defer s.conn.Close()

	// Initial room for Phase 1 testing
	_, _ = s.manager.CreateRoom("FFA", "outpost")

	buf := make([]byte, 2048)
	for {
		n, clientAddr, err := s.conn.ReadFromUDP(buf)
		if err != nil {
			log.Printf("Error reading from UDP: %v", err)
			continue
		}

		s.handlePacket(clientAddr, buf[:n])
	}
}

func (s *Server) handlePacket(addr *net.UDPAddr, data []byte) {
	if len(data) < 1 {
		return
	}

	packetType := PacketType(data[0])
	payload := data[1:]

	switch packetType {
	case PacketAuth:
		s.handleAuth(addr, payload)
	case PacketRequestJoin:
		s.handleJoin(addr, payload)
	case PacketInput:
		s.handleInput(addr, payload)
	case PacketPing:
		s.sendTo(addr, []byte{byte(PacketPong)})
	}
}

func (s *Server) handleAuth(addr *net.UDPAddr, payload []byte) {
	var p AuthPacket
	if err := msgpack.Unmarshal(payload, &p); err != nil {
		return
	}

	// In Phase 1, we trust the token or simplified auth for local dev
	// Real auth logic would verify JWT here
	
	session := &ClientSession{
		Addr:     addr,
		LastSeen: time.Now(),
	}
	s.sessions.Store(addr.String(), session)

	ack := AuthAckPacket{Success: true, Message: "Authenticated"}
	s.sendPacket(addr, PacketAuthAck, ack)
}

func (s *Server) handleJoin(addr *net.UDPAddr, payload []byte) {
	var p JoinPacket
	if err := msgpack.Unmarshal(payload, &p); err != nil {
		return
	}

	val, ok := s.sessions.Load(addr.String())
	if !ok {
		return
	}
	session := val.(*ClientSession)

	// In Phase 1, just join the first available room if none specified
	rooms := s.manager.ListRooms() // Need to implement ListRooms in manager
	var targetRoom *room.Room
	if p.MatchID != "" {
		targetRoom, _ = s.manager.GetRoom(p.MatchID)
	} else if len(rooms) > 0 {
		targetRoom = rooms[0]
	}

	if targetRoom == nil {
		return
	}

	player, err := targetRoom.AddPlayer("temp_uid", "Player")
	if err != nil {
		return
	}

	session.PlayerID = player.ID
	session.RoomID = targetRoom.ID

	init := MatchInitPacket{
		MatchID:  targetRoom.ID,
		MapID:    targetRoom.MapID,
		TickRate: targetRoom.TickRate,
		Spawns:   targetRoom.SpawnPoints,
	}
	s.sendPacket(addr, PacketMatchInit, init)

	// Set broadcast callback
	targetRoom.SetBroadcastFunc(func(roomID string, tick int, players []*game.Player, pickups []*game.Pickup, events []game.MatchEvent) {
		s.broadcastToRoom(roomID, tick, players, pickups, events)
	})

	// Start room loop if not already started
	if targetRoom.State == room.StateWaiting {
		go targetRoom.Start()
	}
}

func (s *Server) handleInput(addr *net.UDPAddr, payload []byte) {
	var p InputPacket
	if err := msgpack.Unmarshal(payload, &p); err != nil {
		return
	}

	val, ok := s.sessions.Load(addr.String())
	if !ok {
		return
	}
	session := val.(*ClientSession)
	session.LastSeen = time.Now()

	if session.RoomID == "" {
		return
	}

	r, ok := s.manager.GetRoom(session.RoomID)
	if !ok {
		return
	}

	// Update player state in room (authoritative logic)
	r.HandlePlayerInput(session.PlayerID, room.PlayerInput{
		Horizontal: p.Horizontal,
		Vertical:   p.Vertical,
		AimAngle:   p.AimAngleDeg,
		IsFlying:   p.IsFlying,
		Firing:     p.Firing,
		WeaponID:   p.WeaponID,
		Sequence:   p.Sequence,
	})
}

func (s *Server) broadcastToRoom(roomID string, tick int, players []*game.Player, pickups []*game.Pickup, events []game.MatchEvent) {
	// 1. Construct WorldStatePacket
	state := WorldStatePacket{
		Tick:    tick,
		Players: make([]game.Player, len(players)),
		Pickups: make([]game.Pickup, len(pickups)),
		Events:  make([]game.MatchEvent, len(events)),
	}
	for i, p := range players {
		state.Players[i] = *p
	}
	for i, p := range pickups {
		state.Pickups[i] = *p
	}
	for i, event := range events {
		state.Events[i] = event
	}

	// 2. Find all sessions in this room
	s.sessions.Range(func(key, value interface{}) bool {
		sess := value.(*ClientSession)
		if sess.RoomID == roomID {
			s.sendPacket(sess.Addr, PacketWorldState, state)
		}
		return true
	})
}

func (s *Server) sendPacket(addr *net.UDPAddr, t ServerPacketType, payload interface{}) {
	var buf bytes.Buffer
	buf.WriteByte(byte(t))
	
	enc := msgpack.NewEncoder(&buf)
	if err := enc.Encode(payload); err != nil {
		log.Printf("Error encoding packet: %v", err)
		return
	}
	
	s.sendTo(addr, buf.Bytes())
}

func (s *Server) sendTo(addr *net.UDPAddr, data []byte) {
	_, _ = s.conn.WriteToUDP(data, addr)
}
