// SKYBATTLE — Physics Validator
// Server-side checks to prevent cheating and physics anomalies
package physics

import (
	"math"
	"time"
	"github.com/siddhantkhandelwal18/skybattle/game-server/internal/game"
)

const (
	MaxPositionDeltaPerTick = 0.8 // max units a player can move in one tick (at 30 TPS)
	MaxFireRateTolerance    = 1.1 // allow 10% clock tolerance
)

// ValidateMove checks if a player's claimed new position is physically possible.
// Returns true if valid, false if cheating/anomaly detected.
func ValidateMove(oldPos, newPos game.Vec2, oldVel, newVel game.Vec2, deltaTime float32) bool {
	// Max displacement check based on max speed + delta time
	maxDisplacement := (game.MaxSpeedX + game.MaxSpeedY) * float64(deltaTime) * 1.1 // 10% tolerance
	dist := oldPos.Distance(newPos)
	return dist <= maxDisplacement
}

// ValidateFireRate checks a player hasn't fired faster than their weapon allows.
// Returns true if fire is valid.
func ValidateFireRate(weaponID game.WeaponID, lastFireTime time.Time) bool {
	spec, ok := game.Weapons[weaponID]
	if !ok || spec.FireRatePerSec <= 0 {
		return true // unknown weapon or non-firing weapon — pass
	}
	if lastFireTime.IsZero() {
		return true // first shot ever
	}
	minIntervalMs := float64(1000) / float64(spec.FireRatePerSec) / MaxFireRateTolerance
	elapsed := time.Since(lastFireTime).Milliseconds()
	return float64(elapsed) >= minIntervalMs
}

// ValidateJetpackFuel checks that the fuel drain event is reasonable.
func ValidateJetpackFuel(claimedFuel, serverFuel float32) bool {
	diff := math.Abs(float64(claimedFuel - serverFuel))
	return diff <= 5.0 // allow 5 fuel units of drift
}

// ValidateAimAngle checks aim angle is within valid range.
func ValidateAimAngle(deg float32) bool {
	return deg >= -360 && deg <= 360
}

// ValidateDamage checks that claimed damage matches weapon spec.
func ValidateDamage(weaponID game.WeaponID, claimedDamage int) bool {
	spec, ok := game.Weapons[weaponID]
	if !ok { return false }
	maxDamage := int(spec.DamagePerShot * 1.1) // allow 10% float tolerance
	return claimedDamage > 0 && claimedDamage <= maxDamage
}
