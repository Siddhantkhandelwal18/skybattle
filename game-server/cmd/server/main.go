// SKYBATTLE Game Server — Main Entry Point
// Authoritative UDP server, 30 TPS, handles up to 50 rooms
package main

import (
	"log"
	"os"
	"github.com/siddhantkhandelwal18/skybattle/game-server/internal/config"
	"github.com/siddhantkhandelwal18/skybattle/game-server/internal/network"
)

func main() {
	cfg := config.Load()
	log.Printf("🚀 SKYBATTLE Game Server starting on UDP :%d (tick rate: %d TPS)", cfg.Port, cfg.TickRate)
	
	srv := network.NewServer(cfg)
	if err := srv.Start(); err != nil {
		log.Fatalf("❌ Server failed: %v", err)
	}
}

func init() {
	if os.Getenv("GO_ENV") != "production" {
		log.SetFlags(log.Ldate | log.Ltime | log.Lshortfile)
	}
}
