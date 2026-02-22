// SKYBATTLE — Room Manager
// Manages game rooms (lobbies, in-progress matches), 30 TPS server-side tick loop
package room

import (
	"fmt"
	"log"
	"math"
	"math/rand"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/siddhantkhandelwal18/skybattle/game-server/internal/game"
)

type RoomState string

const (
	StateWaiting    RoomState = "WAITING"
	StateCountdown  RoomState = "COUNTDOWN"
	StateInProgress RoomState = "IN_PROGRESS"
	StateFinished   RoomState = "FINISHED"
)

type Room struct {
	mu sync.RWMutex

	ID          string
	GameMode    string
	MapID       string
	State       RoomState
	Players     map[int]*game.Player
	Pickups     []*game.Pickup
	Projectiles []*game.Projectile
	StartedAt   time.Time
	MaxPlayers  int
	TimeLimitSec int
	KillLimit    int
	TickRate     int
	NextPlayerID int
	SpawnPoints  []game.Vec2

	// Kill feed for match events
	Events []game.MatchEvent

	broadcastFunc func(roomID string, tick int, players []*game.Player, pickups []*game.Pickup, events []game.MatchEvent)

	Bots []*game.BotController

	stopCh chan struct{}
}

// Outpost map — spawn points (from doc 15)
var outpostSpawns = []game.Vec2{
	{X: 3, Y: 12}, {X: 21, Y: 12}, {X: 12, Y: 7}, {X: 6, Y: 4}, {X: 18, Y: 4},
	{X: 9, Y: 15}, {X: 15, Y: 15}, {X: 3, Y: 17}, {X: 21, Y: 17}, {X: 12, Y: 2},
}

var outpostPickups = []game.Pickup{
	{ID: 1, Type: game.PickupWeapon, WeaponID: game.WeaponShotgun,        Position: game.Vec2{X: 5, Y: 14}, IsActive: true},
	{ID: 2, Type: game.PickupWeapon, WeaponID: game.WeaponSniperRifle,    Position: game.Vec2{X: 19, Y: 14}, IsActive: true},
	{ID: 3, Type: game.PickupWeapon, WeaponID: game.WeaponRocketLauncher, Position: game.Vec2{X: 12, Y: 9}, IsActive: true},
	{ID: 4, Type: game.PickupHealth, Position: game.Vec2{X: 8, Y: 16}, HealAmount: 50, IsActive: true},
	{ID: 5, Type: game.PickupHealth, Position: game.Vec2{X: 16, Y: 16}, HealAmount: 50, IsActive: true},
	{ID: 6, Type: game.PickupHealth, Position: game.Vec2{X: 12, Y: 4}, HealAmount: 50, IsActive: true},
	{ID: 7, Type: game.PickupWeapon, WeaponID: game.WeaponFlamethrower,   Position: game.Vec2{X: 3, Y: 6}, IsActive: true},
	{ID: 8, Type: game.PickupWeapon, WeaponID: game.WeaponLaserGun,       Position: game.Vec2{X: 21, Y: 6}, IsActive: true},
}

func NewRoom(gameMode, mapID string, tickRate int) *Room {
	r := &Room{
		ID:           uuid.New().String(),
		GameMode:     gameMode,
		MapID:        mapID,
		State:        StateWaiting,
		Players:      make(map[int]*game.Player),
		TickRate:     tickRate,
		MaxPlayers:   10,
		TimeLimitSec: 300, // 5 min default
		KillLimit:    20,
		NextPlayerID: 1,
		stopCh:       make(chan struct{}),
	}

	// Load map data
	switch mapID {
	case "outpost":
		r.SpawnPoints = outpostSpawns
		for i := range outpostPickups {
			p := outpostPickups[i]
			r.Pickups = append(r.Pickups, &p)
		}
	default:
		r.SpawnPoints = outpostSpawns
	}

	return r
}

func (r *Room) AddPlayer(userID, displayName string) (*game.Player, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if len(r.Players) >= r.MaxPlayers {
		return nil, fmt.Errorf("room full")
	}
	if r.State != StateWaiting {
		return nil, fmt.Errorf("match already in progress")
	}

	team := "RED"
	if len(r.Players)%2 == 1 {
		team = "BLUE"
	}

	playerID := r.NextPlayerID
	r.NextPlayerID++
	spawn := r.SpawnPoints[playerID%len(r.SpawnPoints)]

	p := game.NewPlayer(playerID, userID, displayName, team)
	p.Position = spawn
	p.SpawnX = spawn.X
	p.SpawnY = spawn.Y
	r.Players[playerID] = p

	log.Printf("Room %s: player %s joined (id=%d)", r.ID, displayName, playerID)
	return p, nil
}

func (r *Room) RemovePlayer(playerID int) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.Players, playerID)
	// Also remove from bots if it was a bot
	for i, b := range r.Bots {
		if b.Player.ID == playerID {
			r.Bots = append(r.Bots[:i], r.Bots[i+1:]...)
			break
		}
	}
	if len(r.Players) == 0 && r.State == StateInProgress {
		r.State = StateFinished
	}
}

func (r *Room) SpawnBots(count int) {
	for i := 0; i < count; i++ {
		name := fmt.Sprintf("Bot_%d", i+1)
		p, err := r.AddPlayer("bot_uid", name)
		if err == nil {
			r.mu.Lock()
			r.Bots = append(r.Bots, game.NewBotController(p, 0.5+rand.Float32()*0.5))
			r.mu.Unlock()
		}
	}
}

func (r *Room) Start() {
	r.mu.Lock()
	r.State = StateInProgress
	r.StartedAt = time.Now()
	r.mu.Unlock()

	tickInterval := time.Second / time.Duration(r.TickRate)
	ticker := time.NewTicker(tickInterval)
	defer ticker.Stop()

	currentTick := 0
	log.Printf("Room %s: match started (%s on %s, %d players)", r.ID, r.GameMode, r.MapID, len(r.Players))

	nextBroadcast := time.Now()
	broadcastInterval := time.Second / time.Duration(r.TickRate)

	for {
		select {
		case <-r.stopCh:
			log.Printf("Room %s: stopped", r.ID)
			return
		case <-ticker.C:
			currentTick++
			deltaTime := float32(tickInterval.Seconds())
			r.tick(currentTick, deltaTime)

			// Broadcast world state every tick
			if time.Now().After(nextBroadcast) {
				r.BroadcastWorldState(currentTick)
				nextBroadcast = nextBroadcast.Add(broadcastInterval)
			}
		}
	}
}

func (r *Room) tick(tick int, deltaTime float32) {
	r.mu.Lock()
	
	// Process Bot updates first to generate inputs
	for _, b := range r.Bots {
		input := b.Update(deltaTime, r.Players)
		// Internal call to HandlePlayerInput
		r.processPlayerInput(b.Player.ID, input)
	}

	r.mu.Unlock()

	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()
	gravity := float32(-20.0) // units/sec^2

	// Update all players
	for _, p := range r.Players {
		p.Lock()
		if !p.IsAlive {
			p.Unlock()
			if now.After(p.RespawnAt) {
				spawn := r.safeSpawnPoint(p)
				p.Respawn(spawn.X, spawn.Y)
			}
			continue
		}

		// Apply gravity if not grounded and not flying
		if !p.IsGrounded && !p.IsFlying {
			p.Velocity.Y += gravity * deltaTime
			if p.Velocity.Y < -game.MaxSpeedY {
				p.Velocity.Y = -game.MaxSpeedY
			}
		}

		// Move player
		p.Position.X += p.Velocity.X * deltaTime
		p.Position.Y += p.Velocity.Y * deltaTime

		// Simple ground collision (Y=0 as floor for Outpost Phase 1)
		if p.Position.Y <= 0 {
			p.Position.Y = 0
			p.Velocity.Y = 0
			p.IsGrounded = true
		} else {
			p.IsGrounded = false
		}

		p.Unlock()
		p.UpdateFuel(deltaTime)
	}

	// Update projectiles
	for _, proj := range r.Projectiles {
		if !proj.Active {
			continue
		}
		// Age check
		if time.Since(proj.SpawnTime).Seconds() > float64(proj.MaxLifeSec) {
			proj.Active = false
			continue
		}
		// Move projectile
		proj.Position.X += proj.Velocity.X * deltaTime
		proj.Position.Y += proj.Velocity.Y * deltaTime

		// Check collisions with players
		spec := game.Weapons[proj.WeaponID]
		for _, p := range r.Players {
			if !p.IsAlive || p.ID == proj.OwnerID {
				continue
			}
			dist := proj.Position.Distance(p.Position)
			hitRadius := 0.6
			if spec.BlastRadius > 0 {
				hitRadius = float64(spec.BlastRadius)
			}
			if dist <= hitRadius {
				proj.Active = false
				damage := int(spec.DamagePerShot)
				p.TakeDamage(damage)
				if !p.IsAlive {
					if shooter, ok := r.Players[proj.OwnerID]; ok {
						shooter.Kills++
						shooter.DamageDealt += damage
						r.Events = append(r.Events, game.MatchEvent{
							Tick: tick, Type: "KILL",
							ActorID: proj.OwnerID, TargetID: p.ID,
							WeaponID: proj.WeaponID, OccurredAt: now,
						})
						// Check kill limit
						if shooter.Kills >= r.KillLimit {
							r.State = StateFinished
						}
					}
				}
				break
			}
		}
	}

	// Check time limit
	if r.State == StateInProgress && time.Since(r.StartedAt).Seconds() >= float64(r.TimeLimitSec) {
		r.State = StateFinished
		r.Events = append(r.Events, game.MatchEvent{Tick: tick, Type: "MATCH_END", OccurredAt: now})
	}

	// Respawn pickups
	for _, pk := range r.Pickups {
		if !pk.IsActive && now.After(pk.RespawnAt) {
			pk.IsActive = true
		}
	}
}

// safeSpawnPoint picks a spawn point that is not too close to enemies
func (r *Room) safeSpawnPoint(player *game.Player) game.Vec2 {
	bestSpawn := r.SpawnPoints[rand.Intn(len(r.SpawnPoints))]
	bestMinDist := 0.0

	for _, spawn := range r.SpawnPoints {
		minEnemyDist := 999.0
		for _, p := range r.Players {
			if p.ID == player.ID || !p.IsAlive {
				continue
			}
			d := spawn.Distance(p.Position)
			if d < minEnemyDist {
				minEnemyDist = d
			}
		}
		if minEnemyDist > bestMinDist {
			bestMinDist = minEnemyDist
			bestSpawn = spawn
		}
	}
	return bestSpawn
}

func (r *Room) HandlePlayerInput(playerID int, input game.PlayerInput) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.processPlayerInput(playerID, input)
}

func (r *Room) processPlayerInput(playerID int, input game.PlayerInput) {
	p, ok := r.Players[playerID]

	if !ok || !p.IsAlive {
		return
	}

	p.Lock()
	defer p.Unlock()

	// Authoritative movement logic (simplified for Phase 1)
	// In production, we would use physics.ValidateMove
	p.Velocity.X = input.Horizontal * game.MaxSpeedX
	if input.IsFlying && p.JetpackFuel > 0 {
		p.Velocity.Y = input.Vertical * game.MaxSpeedY
		p.IsFlying = true
	} else {
		p.IsFlying = false
		// Gravity would be applied in tick()
	}

	p.Position.X += p.Velocity.X * (1.0 / 30.0) // fixed timestep for input processing
	p.Position.Y += p.Velocity.Y * (1.0 / 30.0)
	p.AimAngleDeg = input.AimAngle
	p.LastInputSeq = input.Sequence

	// Weapon fire logic
	if input.Firing && game.Weapons[game.WeaponID(input.WeaponID)].ID != 0 {
		// Verify fire rate in production
		spec := game.Weapons[game.WeaponID(input.WeaponID)]
		
		if spec.IsHitscan {
			// Raycast logic (simplified: check all players in line of sight)
			// For Phase 1, we'll just log and let clients handle visual hitscan
			// while server validates damage if client claims a hit via separate packet
		} else {
			// Projectile logic: Spawn projectile
			proj := &game.Projectile{
				ID:         len(r.Projectiles) + 1,
				OwnerID:    p.ID,
				WeaponID:   game.WeaponID(input.WeaponID),
				Position:   p.Position,
				Velocity:   game.Vec2{
					X: float32(math.Cos(float64(p.AimAngleDeg) * math.Pi / 180.0)) * spec.ProjectileSpeed,
					Y: float32(math.Sin(float64(p.AimAngleDeg) * math.Pi / 180.0)) * spec.ProjectileSpeed,
				},
				SpawnTime:  time.Now(),
				MaxLifeSec: 5.0,
				Active:     true,
			}
			r.Projectiles = append(r.Projectiles, proj)
		}
	}
}

// SetBroadcastFunc registers the network callback for sending state to clients
func (r *Room) SetBroadcastFunc(f func(roomID string, tick int, players []*game.Player, pickups []*game.Pickup, events []game.MatchEvent)) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.broadcastFunc = f
}

func (r *Room) BroadcastWorldState(tick int) {
	r.mu.RLock()
	if r.broadcastFunc == nil {
		r.mu.RUnlock()
		return
	}
	
	players := make([]*game.Player, 0, len(r.Players))
	for _, p := range r.Players {
		players = append(players, p)
	}

	r.mu.RUnlock()
	r.broadcastFunc(r.ID, tick, players, r.Pickups, r.Events)
}

func (r *Room) Stop() {
	close(r.stopCh)
}

// Manager manages all active rooms
type Manager struct {
	mu            sync.RWMutex
	rooms         map[string]*Room
	maxRooms      int
	tickRate      int
}

func NewManager(maxRooms, tickRate int) *Manager {
	return &Manager{
		rooms:    make(map[string]*Room),
		maxRooms: maxRooms,
		tickRate: tickRate,
	}
}

func (m *Manager) CreateRoom(gameMode, mapID string) (*Room, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if len(m.rooms) >= m.maxRooms {
		return nil, fmt.Errorf("server at max room capacity")
	}
	r := NewRoom(gameMode, mapID, m.tickRate)
	m.rooms[r.ID] = r
	return r, nil
}

func (m *Manager) GetRoom(id string) (*Room, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	r, ok := m.rooms[id]
	return r, ok
}

func (m *Manager) RemoveRoom(id string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if r, ok := m.rooms[id]; ok {
		r.Stop()
		delete(m.rooms, id)
	}
}

func (m *Manager) ListRooms() []*Room {
	m.mu.RLock()
	defer m.mu.RUnlock()
	list := make([]*Room, 0, len(m.rooms))
	for _, r := range m.rooms {
		list = append(list, r)
	}
	return list
}
