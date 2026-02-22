// SKYBATTLE — Game Entities (Players, Projectiles, Weapons)
package game

import (
	"math"
	"sync"
	"time"
)

// ── Weapon Definitions ────────────────────────────────────────────────────────

type WeaponID int

const (
	WeaponAssaultRifle  WeaponID = 1
	WeaponSniperRifle   WeaponID = 2
	WeaponShotgun       WeaponID = 3
	WeaponRocketLauncher WeaponID = 4
	WeaponFlamethrower  WeaponID = 5
	WeaponSMG           WeaponID = 6
	WeaponDualPistols   WeaponID = 7
	WeaponLaserGun      WeaponID = 8
	WeaponProximityMine WeaponID = 9
	WeaponGrenade       WeaponID = 10
)

type WeaponSpec struct {
	ID             WeaponID
	Name           string
	DamagePerShot  float32
	FireRatePerSec float32 // shots per second
	MaxAmmo        int
	ReloadTimeSec  float32
	IsHitscan      bool   // true = raycast, false = projectile
	ProjectileSpeed float32 // only for non-hitscan
	BlastRadius    float32 // for explosive weapons
}

// Weapon specs from doc 18 — weapon balance sheet
var Weapons = map[WeaponID]WeaponSpec{
	WeaponAssaultRifle:  {1, "Assault Rifle", 12, 8, 30, 1.8, true, 0, 0},
	WeaponSniperRifle:   {2, "Sniper Rifle", 80, 0.5, 5, 2.5, true, 0, 0},
	WeaponShotgun:       {3, "Shotgun", 6, 1.5, 8, 1.5, true, 0, 0}, // 8 pellets × 6 = 48 total
	WeaponRocketLauncher:{4, "Rocket Launcher", 120, 0.4, 4, 3.0, false, 18, 3.0},
	WeaponFlamethrower:  {5, "Flamethrower", 8, 10, 100, 2.0, false, 8, 0},
	WeaponSMG:           {6, "SMG", 8, 12, 45, 1.5, true, 0, 0},
	WeaponDualPistols:   {7, "Dual Pistols", 12, 4, 24, 1.0, true, 0, 0},
	WeaponLaserGun:      {8, "Laser Gun", 25, 3, 20, 2.0, true, 0, 0},
	WeaponProximityMine: {9, "Proximity Mine", 90, 0, 3, 0, false, 0, 2.5},
	WeaponGrenade:       {10, "Grenade", 80, 0, 2, 0, false, 12, 3.5},
}

// ── Player ────────────────────────────────────────────────────────────────────

type Vec2 struct {
	X float32 `msgpack:"x"`
	Y float32 `msgpack:"y"`
}

func (v Vec2) Distance(other Vec2) float64 {
	dx := float64(v.X - other.X)
	dy := float64(v.Y - other.Y)
	return math.Sqrt(dx*dx + dy*dy)
}

type Player struct {
	mu sync.RWMutex

	ID              int     `msgpack:"id"`
	UserID          string  `msgpack:"uid"`
	DisplayName     string  `msgpack:"name"`
	Team            string  `msgpack:"team"` // "RED", "BLUE", or ""
	Position        Vec2    `msgpack:"pos"`
	Velocity        Vec2    `msgpack:"vel"`
	AimAngleDeg     float32 `msgpack:"aim"`
	Health          int     `msgpack:"hp"`
	MaxHealth       int     `msgpack:"mhp"`
	JetpackFuel     float32 `msgpack:"fuel"`
	MaxFuel         float32 `msgpack:"mfuel"`
	IsGrounded      bool    `msgpack:"grnd"`
	IsFlying        bool    `msgpack:"fly"`
	PrimaryWeapon   WeaponID `msgpack:"wpn1"`
	SecondaryWeapon WeaponID `msgpack:"wpn2"`
	PrimaryAmmo     int     `msgpack:"ammo1"`
	SecondaryAmmo   int     `msgpack:"ammo2"`
	Kills           int     `msgpack:"-"`
	Deaths          int     `msgpack:"-"`
	DamageDealt     int     `msgpack:"-"`
	LastFireTime    time.Time `msgpack:"-"`
	LastInputSeq    uint32  `msgpack:"seq"`
	IsAlive         bool    `msgpack:"alive"`
	RespawnAt       time.Time `msgpack:"-"`
	SpawnX          float32 `msgpack:"-"`
	SpawnY          float32 `msgpack:"-"`
}

const (
	MaxHealth   = 100
	MaxFuel     = 100.0
	FuelDrainPerSec   = 15.0
	FuelRechargePerSec = 10.0
	MaxSpeedX   = 12.0 // units/sec
	MaxSpeedY   = 15.0
	RespawnDelaySec = 3.0
)

func NewPlayer(id int, userID, displayName, team string) *Player {
	return &Player{
		ID:          id,
		UserID:      userID,
		DisplayName: displayName,
		Team:        team,
		Health:      MaxHealth,
		MaxHealth:   MaxHealth,
		JetpackFuel: MaxFuel,
		MaxFuel:     MaxFuel,
		IsAlive:     true,
		PrimaryWeapon: WeaponAssaultRifle,
		PrimaryAmmo: Weapons[WeaponAssaultRifle].MaxAmmo,
	}
}

func (p *Player) TakeDamage(amount int) {
	p.mu.Lock()
	defer p.mu.Unlock()
	if !p.IsAlive { return }
	p.Health -= amount
	if p.Health <= 0 {
		p.Health = 0
		p.IsAlive = false
		p.Deaths++
		p.RespawnAt = time.Now().Add(RespawnDelaySec * time.Second)
	}
}

func (p *Player) Respawn(spawnX, spawnY float32) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.Health = MaxHealth
	p.JetpackFuel = MaxFuel
	p.IsAlive = true
	p.Position = Vec2{X: spawnX, Y: spawnY}
	p.Velocity = Vec2{}
	p.IsFlying = false
	p.IsGrounded = false
}

// UpdateFuel updates fuel based on flying state. Called each tick.
func (p *Player) UpdateFuel(deltaTime float32) {
	p.mu.Lock()
	defer p.mu.Unlock()
	if p.IsFlying && p.IsAlive {
		p.JetpackFuel -= FuelDrainPerSec * deltaTime
		if p.JetpackFuel < 0 {
			p.JetpackFuel = 0
			p.IsFlying = false
		}
	} else if p.IsGrounded && p.JetpackFuel < p.MaxFuel {
		p.JetpackFuel += FuelRechargePerSec * deltaTime
		if p.JetpackFuel > p.MaxFuel {
			p.JetpackFuel = p.MaxFuel
		}
	}
}

type PlayerInput struct {
	Horizontal float32 `msgpack:"h"`
	Vertical   float32 `msgpack:"v"`
	AimAngle   float32 `msgpack:"aim"`
	IsFlying   bool    `msgpack:"fly"`
	Firing     bool    `msgpack:"fire"`
	WeaponID   uint8   `msgpack:"wpn"`
	Sequence   uint32  `msgpack:"seq"`
}

func (p *Player) Lock()   { p.mu.Lock() }
func (p *Player) Unlock() { p.mu.Unlock() }

// ── Projectile ────────────────────────────────────────────────────────────────

type Projectile struct {
	ID         int
	OwnerID    int
	WeaponID   WeaponID
	Position   Vec2
	Velocity   Vec2
	SpawnTime  time.Time
	MaxLifeSec float32
	Active     bool
}

// MatchEvent defines a game event like a kill or pickup
type MatchEvent struct {
	Tick       int           `msgpack:"tick"`
	Type       string        `msgpack:"type"` // "KILL", "PICKUP", "MATCH_END"
	ActorID    int           `msgpack:"actor"`
	TargetID   int           `msgpack:"target"`
	WeaponID   WeaponID      `msgpack:"wpn"`
	OccurredAt time.Time     `msgpack:"-"`
}

// ── Pickup ────────────────────────────────────────────────────────────────────

type PickupType string

const (
	PickupWeapon     PickupType = "WEAPON"
	PickupHealth     PickupType = "HEALTH"
	PickupFuelBoost  PickupType = "FUEL"
)

type Pickup struct {
	ID          int
	Type        PickupType
	WeaponID    WeaponID  // only for WEAPON pickups
	Position    Vec2
	HealAmount  int       // for HEALTH pickups
	IsActive    bool
	RespawnAt   time.Time
}
