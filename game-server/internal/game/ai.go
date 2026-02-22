package game

import (
	"math"
	"math/rand"
	"time"
)

type BotState string

const (
	StatePatrol BotState = "PATROL"
	StateChase  BotState = "CHASE"
	StateAttack BotState = "ATTACK"
)

type BotController struct {
	Player      *Player
	State       BotState
	Target      *Player
	TargetPos   Vec2
	LastUpdate  time.Time
	TargetTick  int
	Difficulty  float32 // 0.0 to 1.0
}

func NewBotController(player *Player, difficulty float32) *BotController {
	return &BotController{
		Player:     player,
		State:      StatePatrol,
		Difficulty: difficulty,
		LastUpdate: time.Now(),
	}
}

func (b *BotController) Update(deltaTime float32, players map[int]*Player) PlayerInput {
	b.Player.Lock()
	defer b.Player.Unlock()

	if !b.Player.IsAlive {
		return PlayerInput{}
	}

	input := PlayerInput{
		Sequence: b.Player.LastInputSeq + 1,
		WeaponID: uint8(b.Player.PrimaryWeapon),
	}

	// 1. Perception: Find closest enemy
	var closestEnemy *Player
	minDist := 20.0 // Detection range

	for _, p := range players {
		if p.ID == b.Player.ID || !p.IsAlive || p.Team == b.Player.Team {
			continue
		}
		dist := b.Player.Position.Distance(p.Position)
		if dist < minDist {
			minDist = dist
			closestEnemy = p
		}
	}

	// 2. Decision Making (FSM)
	switch b.State {
	case StatePatrol:
		if closestEnemy != nil {
			b.State = StateChase
			b.Target = closestEnemy
		} else {
			// Random movement
			if time.Since(b.LastUpdate).Seconds() > 2.0 {
				b.TargetPos = Vec2{
					X: b.Player.Position.X + (rand.Float32()*10 - 5),
					Y: b.Player.Position.Y + (rand.Float32()*10 - 5),
				}
				b.LastUpdate = time.Now()
			}
			b.moveTowards(b.TargetPos, &input)
		}

	case StateChase:
		if closestEnemy == nil {
			b.State = StatePatrol
			b.Target = nil
		} else {
			b.Target = closestEnemy
			dist := b.Player.Position.Distance(b.Target.Position)
			if dist < 8.0 {
				b.State = StateAttack
			} else {
				b.moveTowards(b.Target.Position, &input)
			}
		}

	case StateAttack:
		if closestEnemy == nil || !closestEnemy.IsAlive {
			b.State = StatePatrol
			b.Target = nil
		} else {
			b.Target = closestEnemy
			dist := b.Player.Position.Distance(b.Target.Position)
			if dist > 12.0 {
				b.State = StateChase
			} else {
				// Aim and Fire
				dx := b.Target.Position.X - b.Player.Position.X
				dy := b.Target.Position.Y - b.Player.Position.Y
				input.AimAngle = float32(math.Atan2(float64(dy), float64(dx)) * 180 / math.Pi)
				
				// Simulate reaction time and accuracy
				if rand.Float32() < 0.8 * b.Difficulty {
					input.Firing = true
				}
				
				// Small hops if target is higher
				if dy > 2.0 && b.Player.JetpackFuel > 20 {
					input.Vertical = 1.0
					input.IsFlying = true
				}
			}
		}
	}

	return input
}

func (b *BotController) moveTowards(target Vec2, input *PlayerInput) {
	dx := target.X - b.Player.Position.X
	if math.Abs(float64(dx)) > 0.5 {
		if dx > 0 {
			input.Horizontal = 1.0
		} else {
			input.Horizontal = -1.0
		}
	}

	dy := target.Y - b.Player.Position.Y
	if dy > 1.0 && b.Player.JetpackFuel > 30 {
		input.Vertical = 1.0
		input.IsFlying = true
	}
}
