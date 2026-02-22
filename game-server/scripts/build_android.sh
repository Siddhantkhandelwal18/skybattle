#!/bin/bash
# SKYBATTLE — Go Server Cross-Compilation Script for Android/Unity

mkdir -p build/android

echo "Building for Android ARM64..."
GOOS=android GOARCH=arm64 go build -o build/android/skybattle-server-arm64 cmd/server/main.go

echo "Building for Android x86_64..."
GOOS=android GOARCH=amd64 go build -o build/android/skybattle-server-x86_64 cmd/server/main.go

echo "Done. Binaries located in build/android/"
