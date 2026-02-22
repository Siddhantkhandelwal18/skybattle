// SKYBATTLE — Game Server Config
package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port              int
	TickRate          int
	MaxRoomsPerServer int
	DatabaseURL       string
	RedisURL          string
	ProfileServiceURL string
	JWTAccessSecret   string
	ServerSecret      string
}

func Load() *Config {
	return &Config{
		Port:              getEnvInt("SERVER_PORT", 7001),
		TickRate:          getEnvInt("TICK_RATE", 30),
		MaxRoomsPerServer: getEnvInt("MAX_ROOMS_PER_SERVER", 50),
		DatabaseURL:       getEnv("DATABASE_URL", "postgresql://skybattle:localpass@localhost:5432/skybattle_dev"),
		RedisURL:          getEnv("REDIS_URL", "redis://localhost:6379"),
		ProfileServiceURL: getEnv("PROFILE_SERVICE_URL", "http://localhost:3003"),
		JWTAccessSecret:   getEnv("JWT_ACCESS_SECRET", ""),
		ServerSecret:      getEnv("SERVER_SECRET", "dev_server_secret"),
	}
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

func getEnvInt(key string, defaultVal int) int {
	if val := os.Getenv(key); val != "" {
		if n, err := strconv.Atoi(val); err == nil {
			return n
		}
	}
	return defaultVal
}
